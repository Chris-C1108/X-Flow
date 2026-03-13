import { ApiClient, FetchParams } from './ApiClient';
import { log } from '../utils/Logger';

/**
 * 职责：
 * 1. 维护内存中的视频数据池
 * 2. 自动补充数据，防止用户刷到底部白屏
 * 3. 限制并发请求，避免原站 429
 * 
 * 关注点：控制 page 翻页，确保 per_page=50，在喂给 UI 之前调用 Tracker 进行数据洗牌。
 */
export class PoolManager {
    private api: ApiClient;
    private context: FetchParams;
    private dataPool: any[] = [];
    private isLoading: boolean = false;
    private hasMore: boolean = true;
    private listeners: ((items: any[]) => void)[] = [];

    constructor() {
        this.api = new ApiClient();
        this.context = { range: 'daily', page: 1, sort: 'favorite', category: '' };
        this.dataPool = [];
    }

    public async loadInitialData(params: Partial<FetchParams> = {}) {
        log('PoolManager: Resetting pool for initial data...');
        this.context = { ...this.context, ...params, page: 1 };
        this.dataPool = [];
        this.hasMore = true;
        this.isLoading = false; // Reset lock to allow fresh load
        return this.fetchNextPage();
    }

    public async fetchNextPage() {
        if (this.isLoading || !this.hasMore) return [];
        this.isLoading = true;
        log(`PoolManager: Fetching page ${this.context.page} for channel ${this.api.getIsAnime() ? 'Anime' : 'Real'}`);
        
        try {
            const data = await this.api.fetchList(this.context);
            if (data?.items?.length > 0) {
                const newItems = data.items;
                this.dataPool = [...this.dataPool, ...newItems];
                this.context.page = (this.context.page || 1) + 1;
                // If we got fewer than 50 or it's empty, we might be at the end
                if (newItems.length < 50) {
                    this.hasMore = false;
                }
                
                // Notify listeners
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
    
    public getContext() {
        return this.context;
    }
    
    public getApiClient(): ApiClient {
        return this.api;
    }
}
