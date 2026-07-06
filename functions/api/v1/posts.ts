interface ProxyEnv {
    UPSTREAM_ORIGIN: string;
}

const UPSTREAM_TIMEOUT = 8000;

const ALLOWED_PARAMS = new Set([
    'type',
    'cursor',
    'limit',
]);

const SAFE_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, s-maxage=60',
};

function errorBody(code: number, message: string): string {
    return JSON.stringify({ ok: false, code, message });
}

export const onRequest: PagesFunction<ProxyEnv> = async (context) => {
    const { request, env } = context;

    if (request.method !== 'GET') {
        return new Response(errorBody(405, 'Method not allowed'), {
            status: 405,
            headers: { ...SAFE_HEADERS, Allow: 'GET' },
        });
    }

    const upstreamBase = env.UPSTREAM_ORIGIN || 'https://twihub.net';
    const upstreamUrl = new URL('/api/v1/posts', upstreamBase);

    // Forward allowed query parameters
    const url = new URL(request.url);
    url.searchParams.forEach((value, key) => {
        if (ALLOWED_PARAMS.has(key)) {
            upstreamUrl.searchParams.set(key, value);
        }
    });

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);

        const res = await fetch(upstreamUrl.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            },
            signal: controller.signal,
        });

        clearTimeout(timer);

        const body = await res.text();

        return new Response(body, {
            status: res.status,
            headers: {
                ...SAFE_HEADERS,
                'X-Proxy-Upstream': upstreamUrl.origin,
            },
        });
    } catch (e: any) {
        const message = e?.name === 'AbortError' ? 'Upstream timeout' : 'Upstream unreachable';
        return new Response(errorBody(502, message), {
            status: 502,
            headers: SAFE_HEADERS,
        });
    }
};
