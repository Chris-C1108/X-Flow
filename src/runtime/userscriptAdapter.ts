import type { HttpRequestOptions, HttpResponse, RuntimeAdapter } from './adapter';

const getOrigin = () => {
    const frozen = (window as any).__XFLOW_ORIGIN__;
    if (typeof frozen === 'string' && frozen) return frozen;
    return window.location.origin || 'https://truvaze.com';
};

const parseStorageValue = <T>(raw: unknown, fallback: T): T => {
    if (raw === undefined || raw === null || raw === '') return fallback;
    if (typeof raw !== 'string') return raw as T;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return raw as T;
    }
};

export const userscriptAdapter: RuntimeAdapter = {
    env: {
        mode: 'userscript',
        apiBase: getOrigin(),
        isAnimeHost: Boolean((window as any).__XFLOW_IS_ANIME__ ?? window.location.hostname.includes('anime')),
    },
    http: {
        request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
            return new Promise((resolve, reject) => {
                try {
                    GM_xmlhttpRequest({
                        method: options.method,
                        url: options.url,
                        headers: options.headers,
                        data: options.body,
                        responseType: options.responseType === 'json' ? 'json' : undefined,
                        timeout: options.timeoutMs,
                        onload: (res) => {
                            resolve({
                                status: res.status,
                                data: (options.responseType === 'json' ? res.response : res.responseText) as T,
                                text: res.responseText || '',
                            });
                        },
                        onerror: (err) => reject(new Error(`GM_xmlhttpRequest failed: ${err.error || 'Network error'}`)),
                        ontimeout: () => reject(new Error(`Request timeout after ${options.timeoutMs || 0}ms`)),
                    });
                } catch (error) {
                    reject(error);
                }
            });
        },
    },
    storage: {
        get<T>(key: string, fallback: T): T {
            try {
                const raw = GM_getValue(key, '');
                return parseStorageValue(raw, fallback);
            } catch {
                return fallback;
            }
        },
        set<T>(key: string, value: T): void {
            try {
                GM_setValue(key, JSON.stringify(value));
            } catch {
            }
        },
    },
};
