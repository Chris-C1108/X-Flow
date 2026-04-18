interface ProxyEnv {
    UPSTREAM_ORIGIN: string;
    UPSTREAM_ANIME_ORIGIN?: string;
}

const UPSTREAM_TIMEOUT = 8000;

const ALLOWED_PARAMS = new Set([
    'range',
    'sort',
    'category',
    'page',
    'per_page',
    'isAnimeOnly',
]);

const SAFE_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, s-maxage=60',
};

function errorBody(code: number, message: string): string {
    return JSON.stringify({ ok: false, code, message });
}

function buildUpstreamUrl(request: Request, env: ProxyEnv): URL {
    const url = new URL(request.url);
    const isAnime = url.searchParams.get('isAnimeOnly') === '1';
    const base = (isAnime && env.UPSTREAM_ANIME_ORIGIN)
        ? env.UPSTREAM_ANIME_ORIGIN
        : env.UPSTREAM_ORIGIN;

    const upstream = new URL('/api/media', base);

    url.searchParams.forEach((value, key) => {
        if (ALLOWED_PARAMS.has(key)) {
            upstream.searchParams.set(key, value);
        }
    });

    return upstream;
}

export const onRequest: PagesFunction<ProxyEnv> = async (context) => {
    const { request, env } = context;

    if (request.method !== 'GET') {
        return new Response(errorBody(405, 'Method not allowed'), {
            status: 405,
            headers: { ...SAFE_HEADERS, Allow: 'GET' },
        });
    }

    if (!env.UPSTREAM_ORIGIN) {
        return new Response(errorBody(500, 'UPSTREAM_ORIGIN not configured'), {
            status: 500,
            headers: SAFE_HEADERS,
        });
    }

    const upstreamUrl = buildUpstreamUrl(request, env);

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);

        const res = await fetch(upstreamUrl.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'X-Flow-Proxy/1.0',
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
