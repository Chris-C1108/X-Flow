interface ProxyEnv {
    UPSTREAM_ORIGIN: string;
}

const UPSTREAM_TIMEOUT = 8000;

export const onRequest: PagesFunction<ProxyEnv> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
        return new Response(JSON.stringify({ ok: false, message: 'Missing id parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const upstreamBase = env.UPSTREAM_ORIGIN || 'https://twihub.net';
    const upstreamUrl = new URL(`/posts/${id}`, upstreamBase);

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);

        const res = await fetch(upstreamUrl.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'text/html',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            },
            signal: controller.signal,
        });

        clearTimeout(timer);

        const body = await res.text();

        return new Response(body, {
            status: res.status,
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'public, s-maxage=60',
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
