import { ApiClient, FetchParams } from './ApiClient';
import { CacheManager, QueryState, CacheEntry } from './CacheManager';
import { log } from '../utils/Logger';
import { getRuntimeAdapter } from '../runtime';
import type { RuntimeAdapter } from '../runtime/adapter';

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
    private readonly runtime: RuntimeAdapter;

    // Current active query state
    private currentQuery: QueryState = {
        isAnimeOnly: false,
        range: 'daily',
        sort: 'favorite',
        perPage: 50,
    };
    private nextCursor: string = '';

    constructor(runtime: RuntimeAdapter = getRuntimeAdapter()) {
        this.runtime = runtime;
        this.api = new ApiClient(runtime);
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
        this.nextCursor = '';
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
            this.nextCursor = cached.nextCursor;
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
        log(`PoolManager: Fetching page for ${queryKey} with cursor ${this.nextCursor}`);

        try {
            const fetchParams: FetchParams = {
                range: this.currentQuery.range,
                sort: this.currentQuery.sort,
                category: this.currentQuery.category || '',
                cursor: this.nextCursor,
                per_page: this.currentQuery.perPage || 80,
            };
            const data = await this.api.fetchList(fetchParams);

            // Stale response guard: ignore if a newer request has been issued
            if (requestId !== this.activeRequestId) {
                log('PoolManager: Stale response discarded');
                return [];
            }

            if (data?.posts?.length > 0) {
                const rawItems = data.posts;
                const newItems = rawItems.map((item: any) => ({
                    id: item.postId,
                    url_cd: item.postId,
                    thumbnail: item.thumbnailUrl,
                    favorite: item.likesCount || 0,
                    duration: item.firstVideoDuration || 0,
                    title: 'Loading...',
                    tweet_account: 'loading',
                    url: '',
                    isDetailsLoaded: false,
                }));

                this.dataPool = [...this.dataPool, ...newItems];
                this.nextCursor = data.nextCursor || '';
                this.hasMore = data.hasMore || false;

                if (!this.nextCursor) {
                    this.hasMore = false;
                }

                // Update cache with accumulated data
                this.cache.set(this.currentQuery, {
                    items: [...this.dataPool],
                    nextCursor: this.nextCursor,
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
            const tempApi = new ApiClient(this.runtime);
            tempApi.setChannel(query.isAnimeOnly);

            const data = await tempApi.fetchList({
                range: query.range,
                sort: query.sort,
                category: query.category || '',
                cursor: '',
                per_page: query.perPage || 80,
            });

            const rawItems = data?.posts || [];
            const items = rawItems.map((item: any) => ({
                id: item.postId,
                url_cd: item.postId,
                thumbnail: item.thumbnailUrl,
                favorite: item.likesCount || 0,
                duration: item.firstVideoDuration || 0,
                title: 'Loading...',
                tweet_account: 'loading',
                url: '',
                isDetailsLoaded: false,
            }));

            this.cache.set(query, {
                items,
                nextCursor: data?.nextCursor || '',
                hasMore: data?.hasMore || false,
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
     * 解析详情 HTML 提取视频资源，作者及标题
     */
    private parseDetailHtml(html: string): { title: string; tweetAccount: string; videoPath: string } {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        const videoLinkEl = doc.getElementById('video-link');
        const videoPath = videoLinkEl?.getAttribute('href') || '';

        const authorEl = doc.getElementById('author-handle');
        const authorText = authorEl?.querySelector('span')?.textContent?.trim() || '';
        const tweetAccount = authorText.replace(/^@/, '');

        const titleEl = doc.querySelector('.mt-4 p.text-gray-200');
        const title = titleEl?.textContent?.trim() || '';

        return { title, tweetAccount, videoPath };
    }

    /**
     * 延迟加载视频详情（推特账号，标题，最终视频流地址）
     */
    public async loadDetails(item: any): Promise<any> {
        if (!item || item.isDetailsLoaded) return item;

        try {
            log(`PoolManager: Loading details for post ${item.id}`);
            const html = await this.api.fetchDetailHtml(item.id);
            const parsed = this.parseDetailHtml(html);

            item.title = parsed.title || `@${parsed.tweetAccount}`;
            item.tweet_account = parsed.tweetAccount || 'unknown';
            
            if (parsed.videoPath) {
                log(`PoolManager: Resolving video URL for ${parsed.videoPath}`);
                item.url = await this.api.resolveVideoUrl(parsed.videoPath);
            }
            item.isDetailsLoaded = true;
            log(`PoolManager: Loaded details for ${item.id}`);
        } catch (e) {
            log(`PoolManager: Failed to load details for ${item.id}`, e);
        }
        return item;
    }

    /**
     * 检查指定组合是否有新鲜缓存
     */
    public hasFreshCache(params: Partial<QueryState>): boolean {
        const query = { ...this.currentQuery, ...params };
        return this.cache.hasFresh(query);
    }

    /**
     * 从缓存层读取指定查询的数据（不影响当前 dataPool）。
     * 用于 Hero Carousel 等场景，与 TikTokMode 共享已缓冲视频数据。
     */
    public getCachedItems(params: Partial<QueryState>): any[] {
        const query = { ...this.currentQuery, ...params };
        const entry = this.cache.get(query);
        return entry?.items || [];
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
