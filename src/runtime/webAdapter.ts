import type { HttpRequestOptions, HttpResponse, RuntimeAdapter } from './adapter';

const getApiBase = () => {
    const customBase = (window as any).__XFLOW_API_BASE__;
    if (typeof customBase === 'string' && customBase) return customBase;
    return '/api';
};

const parseStorageValue = <T>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return raw as T;
    }
};

const getIsAnimeHost = () => {
    const override = (window as any).__XFLOW_IS_ANIME__;
    if (typeof override === 'boolean') return override;
    return window.location.hostname.includes('anime');
};

export const webAdapter: RuntimeAdapter = {
    env: {
        mode: 'web',
        apiBase: getApiBase(),
        isAnimeHost: getIsAnimeHost(),
    },
    http: {
        async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
            const controller = new AbortController();
            const timeoutMs = options.timeoutMs || 0;
            const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

            try {
                const res = await fetch(options.url, {
                    method: options.method,
                    headers: options.headers,
                    body: options.body,
                    signal: controller.signal,
                });

                const text = await res.text();
                const data = options.responseType === 'json'
                    ? ((text ? JSON.parse(text) : null) as T)
                    : (text as T);

                return {
                    status: res.status,
                    data,
                    text,
                };
            } finally {
                if (timer) clearTimeout(timer);
            }
        },
    },
    storage: {
        get<T>(key: string, fallback: T): T {
            try {
                return parseStorageValue(localStorage.getItem(key), fallback);
            } catch {
                return fallback;
            }
        },
        set<T>(key: string, value: T): void {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {
            }
        },
    },
};
