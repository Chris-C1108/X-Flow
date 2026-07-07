import { getRuntimeAdapter } from '../runtime';
import type { RuntimeAdapter } from '../runtime/adapter';
import { AdapterManager } from './adapters/AdapterManager';
import { FetchListResult } from './adapters/SiteAdapter';

export interface FetchParams {
    range?: string;
    cursor?: string;
    sort?: string;
    category?: string;
    per_page?: number;
    [key: string]: any;
}

/**
 * 基础 Fetch 封装 (限流、并发控制)
 */
export class ApiClient {
    private readonly baseUrl: string;
    private isAnime: number;
    private readonly runtime: RuntimeAdapter;

    constructor(runtime: RuntimeAdapter = getRuntimeAdapter()) {
        this.runtime = runtime;
        this.baseUrl = runtime.env.apiBase;
        this.isAnime = runtime.env.isAnimeHost ? 1 : 0;
    }

    public setChannel(isAnimeChannel: boolean) {
        this.isAnime = isAnimeChannel ? 1 : 0;
    }

    public async fetchList(params: FetchParams = {}): Promise<FetchListResult> {
        const adapter = AdapterManager.getInstance().getActiveAdapter();
        return adapter.fetchList(params, this.isAnime === 1);
    }

    public async fetchDetailHtml(postId: string): Promise<string> {
        const adapter = AdapterManager.getInstance().getActiveAdapter();
        if (adapter.fetchDetailHtml) {
            return adapter.fetchDetailHtml(postId);
        }
        return '';
    }

    public async resolveVideoUrl(videoPath: string): Promise<string> {
        const adapter = AdapterManager.getInstance().getActiveAdapter();
        if (adapter.resolveVideoUrl) {
            return adapter.resolveVideoUrl(videoPath);
        }
        return videoPath;
    }

    public getBaseUrl() {
        return this.baseUrl;
    }

    public getIsAnime(): boolean {
        return this.isAnime === 1;
    }
}

