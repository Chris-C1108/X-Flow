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
    private baseUrl: string;
    private isAnime: number;
    private static readonly REQUEST_TIMEOUT = 8000;

    constructor() {
        // 使用 main.ts Phase 0a 冻结的 origin，防止核平后 location 变为 null
        this.baseUrl = (window as any).__XFLOW_ORIGIN__ || window.location.origin || 'https://twitter-ero-video-ranking.com';
        this.isAnime = (window as any).__XFLOW_IS_ANIME__ ?? this.baseUrl.includes('anime') ? 1 : 0;
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

    public async fetchList(params: FetchParams = {}) {
        const mappedRange = ApiClient.RANGE_MAP[params.range || 'daily'] ?? params.range ?? '';
        const finalParams: Record<string, any> = { 
            ...params, 
            range: mappedRange,
            isAnimeOnly: this.isAnime.toString(), 
            per_page: (params.per_page || 50).toString() 
        };
        const url = new URL(`${this.baseUrl}/api/media`);
        
        Object.keys(finalParams).forEach(k => {
            if (finalParams[k] !== undefined) {
                url.searchParams.append(k, finalParams[k].toString());
            }
        });
        
        return new Promise<any>((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url.toString(),
                headers: { 'Accept': 'application/json' },
                responseType: 'json',
                timeout: ApiClient.REQUEST_TIMEOUT,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        resolve(res.response);
                    } else {
                        reject(new Error(`API Error: ${res.status}`));
                    }
                },
                onerror: (err) => reject(new Error(`GM_xmlhttpRequest failed: ${err.error || 'Network error'}`)),
                ontimeout: () => reject(new Error(`API timeout after ${ApiClient.REQUEST_TIMEOUT}ms`)),
            });
        });
    }
    
    public getBaseUrl() {
        return this.baseUrl;
    }
    
    public getIsAnime(): boolean {
        return this.isAnime === 1;
    }
}