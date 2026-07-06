import { getRuntimeAdapter } from '../runtime';
import type { RuntimeAdapter } from '../runtime/adapter';

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
    private static readonly REQUEST_TIMEOUT = 8000;

    constructor(runtime: RuntimeAdapter = getRuntimeAdapter()) {
        this.runtime = runtime;
        this.baseUrl = runtime.env.apiBase;
        this.isAnime = runtime.env.isAnimeHost ? 1 : 0;
    }

    public setChannel(isAnimeChannel: boolean) {
        this.isAnime = isAnimeChannel ? 1 : 0;
    }

    /**
     * API range 参数映射：
     * twihub API 参数映射为 1d, 7d, 30d, realtime
     */
    private static readonly RANGE_MAP: Record<string, string> = {
        daily: '1d',
        weekly: '7d',
        monthly: '30d',
        all: '30d',
        realtime: 'realtime'
    };

    private buildMediaEndpoint() {
        const normalized = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
        if (normalized.endsWith('/api')) {
            return `${normalized}/v1/posts`;
        }
        return `${normalized}/api/v1/posts`;
    }

    public async fetchList(params: FetchParams = {}) {
        const mappedRange = ApiClient.RANGE_MAP[params.range || 'daily'] ?? params.range ?? '1d';
        const finalParams: Record<string, any> = {
            type: mappedRange,
            limit: (params.per_page || 80).toString(),
        };

        if (params.cursor) {
            finalParams.cursor = params.cursor;
        }

        const url = new URL(this.buildMediaEndpoint(), window.location.origin);
        Object.keys(finalParams).forEach((k) => {
            if (finalParams[k] !== undefined) {
                url.searchParams.append(k, finalParams[k].toString());
            }
        });

        const res = await this.runtime.http.request<any>({
            method: 'GET',
            url: url.toString(),
            headers: { Accept: 'application/json' },
            responseType: 'json',
            timeoutMs: ApiClient.REQUEST_TIMEOUT,
        });

        if (res.status >= 200 && res.status < 300) {
            return res.data;
        }
        throw new Error(`API Error: ${res.status}`);
    }

    public async fetchDetailHtml(postId: string): Promise<string> {
        const normalized = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
        let url: string;
        if (this.runtime.env.mode === 'web') {
            url = `${normalized}/posts-detail?id=${postId}`;
        } else {
            url = `${normalized}/posts/${postId}`;
        }

        const res = await this.runtime.http.request<string>({
            method: 'GET',
            url: url,
            headers: { Accept: 'text/html' },
            responseType: 'text',
            timeoutMs: ApiClient.REQUEST_TIMEOUT,
        });

        if (res.status >= 200 && res.status < 300) {
            return res.text;
        }
        throw new Error(`Detail HTML error: ${res.status}`);
    }

    public async resolveVideoUrl(videoPath: string): Promise<string> {
        const normalized = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
        let url: string;
        if (this.runtime.env.mode === 'web') {
            url = `${normalized}/video-resolve?path=${encodeURIComponent(videoPath)}`;
        } else {
            url = videoPath.startsWith('http') ? videoPath : `${normalized}${videoPath}`;
        }

        const res = await this.runtime.http.request<string>({
            method: 'GET',
            url: url,
            responseType: 'text',
            timeoutMs: ApiClient.REQUEST_TIMEOUT,
        });

        if (this.runtime.env.mode === 'web') {
            try {
                const data = JSON.parse(res.text);
                if (data && data.url) return data.url;
            } catch (_) {}
            return url;
        } else {
            return res.finalUrl || url;
        }
    }

    public getBaseUrl() {
        return this.baseUrl;
    }

    public getIsAnime(): boolean {
        return this.isAnime === 1;
    }
}
