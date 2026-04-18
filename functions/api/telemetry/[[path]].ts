interface ProxyEnv {
    TELEMETRY_ORIGIN?: string;
}

const UPSTREAM_TIMEOUT = 8000;

const SAFE_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
};

function errorBody(code: number, message: string): string {
    return JSON.stringify({ ok: false, code, message });
}

export const onRequestPost: PagesFunction<ProxyEnv> = async (context) => {
    const { request, env } = context;

    if (!env.TELEMETRY_ORIGIN) {
        return new Response(
            JSON.stringify({ ok: true }),
            { status: 200, headers: SAFE_HEADERS },
        );
    }

    const url = new URL(request.url);
    const upstream = new URL(url.pathname, env.TELEMETRY_ORIGIN);

    const token = request.headers.get('X-XFlow-Token') || '';
    const ts = request.headers.get('X-XFlow-Ts') || '';
    const body = await request.text();

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);

        const res = await fetch(upstream.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-XFlow-Token': token,
                'X-XFlow-Ts': ts,
            },
            body,
            signal: controller.signal,
        });

        clearTimeout(timer);

        const resBody = await res.text();

        return new Response(resBody, {
            status: res.status,
            headers: SAFE_HEADERS,
        });
    } catch {
        return new Response(
            JSON.stringify({ ok: true }),
            { status: 200, headers: SAFE_HEADERS },
        );
    }
};

export const onRequest: PagesFunction<ProxyEnv> = async (context) => {
    if (context.request.method !== 'POST') {
        return new Response(errorBody(405, 'Method not allowed'), {
            status: 405,
            headers: { ...SAFE_HEADERS, Allow: 'POST' },
        });
    }
    return onRequestPost(context);
};
