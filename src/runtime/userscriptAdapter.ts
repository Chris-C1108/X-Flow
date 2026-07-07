import type { HttpRequestOptions, HttpResponse, RuntimeAdapter } from './adapter';

const getOrigin = () => {
    const frozen = (window as any).__XFLOW_ORIGIN__;
    if (typeof frozen === 'string' && frozen) return frozen;
    return window.location.origin || 'https://twihub.net';
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

const gmRequest = <T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> => {
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
                        finalUrl: (res as any).finalUrl,
                    });
                },
                onerror: (err) => reject(new Error(`GM_xmlhttpRequest failed: ${err.error || 'Network error'}`)),
                ontimeout: () => reject(new Error(`Request timeout after ${options.timeoutMs || 0}ms`)),
            });
        } catch (error) {
            reject(error);
        }
    });
};

export const userscriptAdapter: RuntimeAdapter = {
    env: {
        mode: 'userscript',
        apiBase: getOrigin(),
        isAnimeHost: Boolean((window as any).__XFLOW_IS_ANIME__ ?? window.location.hostname.includes('anime')),
    },
    http: {
        request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
            // Check if the request is same-origin
            const isSameOrigin = (() => {
                try {
                    const u = new URL(options.url, window.location.origin);
                    return u.origin === window.location.origin;
                } catch {
                    return false;
                }
            })();

            if (isSameOrigin) {
                // Use native fetch to automatically inherit cookies (like cf_clearance) and bypass Cloudflare Turnstile/WAF
                const fetchOpts: RequestInit = {
                    method: options.method,
                    headers: options.headers as HeadersInit,
                    credentials: 'include', // Ensure cookies are sent
                };
                if (options.body && options.method !== 'GET' && options.method !== 'HEAD') {
                    fetchOpts.body = options.body;
                }

                return fetch(options.url, fetchOpts).then(async (res) => {
                    const text = await res.text();
                    let data: any = text;
                    if (options.responseType === 'json') {
                        try {
                            data = JSON.parse(text);
                        } catch {
                            // Suppress parse error and fall back to raw text
                        }
                    }
                    return {
                        status: res.status,
                        data: data as T,
                        text: text,
                        finalUrl: res.url,
                    };
                }).catch((err) => {
                    console.warn(`X-Flow: Native fetch failed, falling back to GM_xmlhttpRequest`, err);
                    return gmRequest<T>(options);
                });
            }

            return gmRequest<T>(options);
        }
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
