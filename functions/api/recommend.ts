interface ProxyEnv {
    RECOMMEND_ORIGIN?: string;
}

const UPSTREAM_TIMEOUT = 5000;

const ALLOWED_PARAMS = new Set(['anon_id']);

const SAFE_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache',
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

    if (!env.RECOMMEND_ORIGIN) {
        return new Response(
            JSON.stringify({ rec: [], highlights: {} }),
            { status: 200, headers: SAFE_HEADERS },
        );
    }

    const url = new URL(request.url);
    const upstream = new URL('/api/recommend', env.RECOMMEND_ORIGIN);

    url.searchParams.forEach((value, key) => {
        if (ALLOWED_PARAMS.has(key)) {
            upstream.searchParams.set(key, value);
        }
    });

    const token = request.headers.get('X-XFlow-Token') || '';
    const ts = request.headers.get('X-XFlow-Ts') || '';

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);

        const res = await fetch(upstream.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-XFlow-Token': token,
                'X-XFlow-Ts': ts,
            },
            signal: controller.signal,
        });

        clearTimeout(timer);

        const body = await res.text();

        return new Response(body, {
            status: res.status,
            headers: SAFE_HEADERS,
        });
    } catch {
        return new Response(
            JSON.stringify({ rec: [], highlights: {} }),
            { status: 200, headers: SAFE_HEADERS },
        );
    }
};
