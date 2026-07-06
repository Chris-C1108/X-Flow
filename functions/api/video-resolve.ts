interface ProxyEnv {
    UPSTREAM_ORIGIN: string;
}

const UPSTREAM_TIMEOUT = 8000;

export const onRequest: PagesFunction<ProxyEnv> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.searchParams.get('path');

    if (!path) {
        return new Response(JSON.stringify({ ok: false, message: 'Missing path parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const upstreamBase = env.UPSTREAM_ORIGIN || 'https://twihub.net';
    const upstreamUrl = new URL(path, upstreamBase);

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);

        const res = await fetch(upstreamUrl.toString(), {
            method: 'HEAD',
            redirect: 'manual', // Do not follow redirect, just capture the Location header!
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            },
            signal: controller.signal,
        });

        clearTimeout(timer);

        const location = res.headers.get('Location');
        const resolvedUrl = location || upstreamUrl.toString();

        return new Response(JSON.stringify({ url: resolvedUrl }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=3600',
                'X-Proxy-Upstream': upstreamUrl.origin,
            },
        });
    } catch (e: any) {
        const message = e?.name === 'AbortError' ? 'Upstream timeout' : 'Upstream unreachable';
        return new Response(JSON.stringify({ ok: false, message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
