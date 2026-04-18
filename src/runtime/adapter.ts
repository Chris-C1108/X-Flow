export type RuntimeMode = 'userscript' | 'web';

export interface RuntimeEnv {
    mode: RuntimeMode;
    apiBase: string;
    isAnimeHost: boolean;
}

export interface HttpRequestOptions {
    method: 'GET' | 'POST' | 'HEAD';
    url: string;
    headers?: Record<string, string>;
    body?: string;
    responseType?: 'json' | 'text';
    timeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
    status: number;
    data: T;
    text: string;
}

export interface RuntimeHttpAdapter {
    request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>>;
}

export interface RuntimeStorageAdapter {
    get<T>(key: string, fallback: T): T;
    set<T>(key: string, value: T): void;
}

export interface RuntimeAdapter {
    env: RuntimeEnv;
    http: RuntimeHttpAdapter;
    storage: RuntimeStorageAdapter;
}
