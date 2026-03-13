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

    public async fetchList(params: FetchParams = {}) {
        const finalParams: Record<string, any> = { 
            ...params, 
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