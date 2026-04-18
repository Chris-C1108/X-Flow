import { getRuntimeAdapter } from '../runtime';
import type { RuntimeAdapter } from '../runtime/adapter';

export interface FetchParams {
    range?: string;
    page?: number;
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
     * 后端 API 不识别 "daily"，日榜实际需传空字符串。
     * weekly / monthly / all 正常传递。
     */
    private static readonly RANGE_MAP: Record<string, string> = {
        daily: '',
        weekly: 'weekly',
        monthly: 'monthly',
        all: 'all',
    };

    private buildMediaEndpoint() {
        const normalized = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
        if (normalized.endsWith('/api')) {
            return `${normalized}/media`;
        }
        return `${normalized}/api/media`;
    }

    public async fetchList(params: FetchParams = {}) {
        const mappedRange = ApiClient.RANGE_MAP[params.range || 'daily'] ?? params.range ?? '';
        const finalParams: Record<string, any> = {
            ...params,
            range: mappedRange,
            isAnimeOnly: this.isAnime.toString(),
            per_page: (params.per_page || 50).toString(),
        };

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

    public getBaseUrl() {
        return this.baseUrl;
    }

    public getIsAnime(): boolean {
        return this.isAnime === 1;
    }
}
