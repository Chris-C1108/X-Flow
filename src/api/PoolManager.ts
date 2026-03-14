import { ApiClient, FetchParams } from './ApiClient';
import { CacheManager, QueryState, CacheEntry } from './CacheManager';
import { log } from '../utils/Logger';

export interface LoadResult {
    fromCache: boolean;
}

/**
 * 职责：
 * 1. 维护内存中的视频数据池
 * 2. 自动补充数据，防止用户刷到底部白屏
 * 3. 限制并发请求，避免原站 429
 * 4. CacheManager 集成：缓存已加载组合，支持秒开切换
 * 5. 后台预加载：预取相邻维度组合的第一页
 */
export class PoolManager {
    private api: ApiClient;
    private cache: CacheManager;
    private dataPool: any[] = [];
    private isLoading: boolean = false;
    private hasMore: boolean = true;
    private listeners: ((items: any[]) => void)[] = [];
    private activeRequestId: number = 0;
    private preloadInFlight = new Set<string>();

    // Current active query state
    private currentQuery: QueryState = {
        isAnimeOnly: false,
        range: 'daily',
        sort: 'favorite',
    };
    private currentPage: number = 1;

    constructor() {
        this.api = new ApiClient();
        this.cache = new CacheManager();
        // Sync initial channel from domain detection
        this.currentQuery.isAnimeOnly = this.api.getIsAnime();
    }

    /**
     * 加载初始数据。先查缓存，命中则秒开；否则 fetch page 1。
     */
    public async loadInitialData(params: Partial<QueryState> = {}): Promise<LoadResult> {
        const requestId = ++this.activeRequestId;

        // Merge incoming params into current query
        this.currentQuery = {
            ...this.currentQuery,
            ...params,
        };
        this.currentPage = 1;
        this.dataPool = [];
        this.hasMore = true;
        this.isLoading = false;

        // Sync channel to ApiClient
        this.api.setChannel(this.currentQuery.isAnimeOnly);

        log(`PoolManager: loadInitialData for ${this.cache.makeKey(this.currentQuery)}`);

        // Check cache
        const cached = this.cache.get(this.currentQuery);
        if (cached) {
            log(`PoolManager: Cache HIT — ${cached.items.length} items`);
            this.dataPool = [...cached.items];
            this.currentPage = cached.nextPage;
            this.hasMore = cached.hasMore;
            this.listeners.forEach(cb => cb(this.dataPool));
            return { fromCache: true };
        }

        // Cache miss → fetch from API
        log('PoolManager: Cache MISS — fetching page 1');
        await this.fetchPageInternal(requestId);
        return { fromCache: false };
    }

    /**
     * 加载下一页数据（分页续取）
     */
    public async fetchNextPage(): Promise<any[]> {
        if (this.isLoading || !this.hasMore) return [];
        const requestId = this.activeRequestId; // Use current request scope
        return this.fetchPageInternal(requestId);
    }

    /**
     * 内部 fetch 实现，带请求 ID 防竞态
     */
    private async fetchPageInternal(requestId: number): Promise<any[]> {
        if (this.isLoading) return [];
        this.isLoading = true;

        const queryKey = this.cache.makeKey(this.currentQuery);
        log(`PoolManager: Fetching page ${this.currentPage} for ${queryKey}`);

        try {
            const fetchParams: FetchParams = {
                range: this.currentQuery.range,
                sort: this.currentQuery.sort,
                category: this.currentQuery.category || '',
                page: this.currentPage,
                per_page: this.currentQuery.perPage || 50,
            };
            const data = await this.api.fetchList(fetchParams);

            // Stale response guard: ignore if a newer request has been issued
            if (requestId !== this.activeRequestId) {
                log('PoolManager: Stale response discarded');
                return [];
            }

            if (data?.items?.length > 0) {
                const newItems = data.items;
                this.dataPool = [...this.dataPool, ...newItems];
                this.currentPage += 1;

                if (newItems.length < 50) {
                    this.hasMore = false;
                }

                // Update cache with accumulated data
                this.cache.set(this.currentQuery, {
                    items: [...this.dataPool],
                    nextPage: this.currentPage,
                    hasMore: this.hasMore,
                    updatedAt: Date.now(),
                });

                this.listeners.forEach(cb => cb(newItems));
                return newItems;
            } else {
                this.hasMore = false;
                return [];
            }
        } catch (e) {
            log('加载更多数据失败', e);
            throw e;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 后台预加载指定维度组合的第一页（不影响当前 dataPool）
     */
    public async preload(query: QueryState): Promise<void> {
        if (this.cache.hasFresh(query)) return;

        const key = this.cache.makeKey(query);
        if (this.preloadInFlight.has(key)) return;

        this.preloadInFlight.add(key);
        log(`PoolManager: Preloading ${key}...`);

        try {
            // Use a fresh ApiClient to avoid mutating current channel state
            const tempApi = new ApiClient();
            tempApi.setChannel(query.isAnimeOnly);

            const data = await tempApi.fetchList({
                range: query.range,
                sort: query.sort,
                category: query.category || '',
                page: 1,
                per_page: query.perPage || 50,
            });

            const items = data?.items || [];
            this.cache.set(query, {
                items,
                nextPage: 2,
                hasMore: items.length >= 50,
                updatedAt: Date.now(),
            });
            log(`PoolManager: Preload done for ${key} (${items.length} items)`);
        } catch (e) {
            log(`PoolManager: Preload failed for ${key}`, e);
        } finally {
            this.preloadInFlight.delete(key);
        }
    }

    /**
     * 检查指定组合是否有新鲜缓存
     */
    public hasFreshCache(params: Partial<QueryState>): boolean {
        const query = { ...this.currentQuery, ...params };
        return this.cache.hasFresh(query);
    }

    public onDataAdded(cb: (items: any[]) => void) {
        this.listeners.push(cb);
    }

    public getIsLoading() {
        return this.isLoading;
    }

    public hasMoreData() {
        return this.hasMore;
    }

    public getDataPool() {
        return this.dataPool;
    }

    public getCurrentQuery(): QueryState {
        return { ...this.currentQuery };
    }

    public getApiClient(): ApiClient {
        return this.api;
    }
}
