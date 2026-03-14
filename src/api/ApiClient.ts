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

    constructor() {
        this.baseUrl = window.location.origin;
        this.isAnime = this.baseUrl.includes('anime') ? 1 : 0;
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
        
        const res = await fetch(url.toString(), { headers: { 'accept': 'application/json' } });
        if (!res.ok) {
            throw new Error(`API Error: ${res.status}`);
        }
        return await res.json();
    }
    
    public getBaseUrl() {
        return this.baseUrl;
    }
    
    public getIsAnime(): boolean {
        return this.isAnime === 1;
    }
}