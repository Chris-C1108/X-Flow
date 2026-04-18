/**
 * X-Flow Telemetry — Cloudflare Worker
 *
 * 路由:
 *   POST /api/telemetry/interact   低频精准事件 → D1 interactions 表
 *   POST /api/telemetry/session    播放时间轴   → D1 play_sessions 表
 *   GET  /api/recommend            推荐结果     ← D1 recommendations 表
 *   GET  /api/ping                 健康检查
 *
 * 安全:
 *   - IP Rate Limiting via KV (每 IP 每分钟 30 次)
 *   - 时间戳 Token 防爬（5 分钟窗口）
 *   - CORS 仅限目标域名
 */

export interface Env {
    DB: D1Database;         // D1 数据库
    KV: KVNamespace;        // KV (仅用于 Rate Limiting)
}

// ── 配置 ──────────────────────────────────────────────────────────
const TOKEN_SALT    = 'XFLOW_v6_SECRET';  // 与前端保持一致
const RATE_LIMIT    = 30;                  // 每 IP 每分钟请求上限
const TOKEN_WINDOW  = 5 * 60 * 1000;      // Token 时间窗口 5 分钟

const ALLOWED_ORIGINS = [
    'https://truvaze.com',
    'https://x-ero-anime.com',
    'https://app.x-flow.ccwu.cc',
    'http://localhost',
];

// ── CORS Headers ─────────────────────────────────────────────────
function getCorsHeaders(origin: string | null): HeadersInit {
    const allowed = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o))
        ? origin
        : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-XFlow-Token, X-XFlow-Ts',
        'Access-Control-Max-Age': '86400',
    };
}

// ── Token 验证 ────────────────────────────────────────────────────
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return Math.abs(hash).toString(36);
}

function isValidToken(token: string | null, tsStr: string | null): boolean {
    if (!token || !tsStr) return false;
    const ts = parseInt(tsStr);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > TOKEN_WINDOW) return false;
    const expected = simpleHash(`${TOKEN_SALT}_${ts}`);
    return token === expected;
}

// ── Rate Limiting ─────────────────────────────────────────────────
async function checkRateLimit(ip: string, kv: KVNamespace): Promise<boolean> {
    const key = `rl:${ip}`;
    const raw = await kv.get(key);
    const count = parseInt(raw || '0');
    if (count >= RATE_LIMIT) return false;  // 超限

    await kv.put(key, String(count + 1), { expirationTtl: 60 });
    return true;
}

// ── 参数校验工具 ──────────────────────────────────────────────────
function sanitizeStr(val: unknown, maxLen = 64): string {
    if (typeof val !== 'string') return '';
    return val.slice(0, maxLen).replace(/[^\w\-_.]/g, '');
}

function sanitizeInt(val: unknown, min = 0, max = 999999): number {
    const n = parseInt(String(val));
    return isNaN(n) ? 0 : Math.max(min, Math.min(max, n));
}

// ── 路由处理 ──────────────────────────────────────────────────────

/** POST /api/telemetry/interact — 低频精准事件 */
async function handleInteract(req: Request, env: Env): Promise<Response> {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return new Response('Bad JSON', { status: 400 });
    }

    const anonId   = sanitizeStr(body.anon_id, 32);
    const videoId  = sanitizeStr(body.video_id, 32);
    const action   = sanitizeStr(body.action, 32);
    const ts       = sanitizeInt(body.ts, 0, 9999999999999);
    const hourOfDay = sanitizeInt(body.hour_of_day, 0, 23);
    const channel  = body.channel === 'anime' ? 'anime' : 'real';

    if (!anonId || !videoId || !action) {
        return new Response('Missing fields', { status: 422 });
    }

    // 白名单事件类型
    const validActions = ['like', 'download', 'bookmark_add', 'bookmark_remove', 'view_start'];
    if (!validActions.includes(action)) {
        return new Response('Invalid action', { status: 422 });
    }

    // 更新/插入用户记录（UPSERT）
    const loginPeriod = hourOfDay >= 22 || hourOfDay < 2 ? 'late_night'
                      : hourOfDay < 6   ? 'early_morning'
                      : hourOfDay < 12  ? 'morning'
                      : hourOfDay < 18  ? 'afternoon'
                      : 'evening';

    await env.DB.batch([
        env.DB.prepare(`
            INSERT INTO users (anon_id, first_seen, last_seen, session_count, dominant_period)
            VALUES (?, ?, ?, 1, ?)
            ON CONFLICT(anon_id) DO UPDATE SET
                last_seen = excluded.last_seen,
                session_count = session_count + 1,
                dominant_period = excluded.dominant_period
        `).bind(anonId, ts, ts, loginPeriod),

        env.DB.prepare(`
            INSERT INTO interactions (anon_id, video_id, action, ts, hour_of_day, channel)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(anonId, videoId, action, ts, hourOfDay, channel),
    ]);

    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

/** POST /api/telemetry/session — 播放时间轴 session */
async function handleSession(req: Request, env: Env): Promise<Response> {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return new Response('Bad JSON', { status: 400 });
    }

    const anonId    = sanitizeStr(body.anon_id, 32);
    const videoId   = sanitizeStr(body.video_id, 32);
    const sessionTs = sanitizeInt(body.session_ts, 0, 9999999999999);
    const duration  = sanitizeInt(body.duration, 0, 86400);
    const playedSec = sanitizeInt(body.played_sec, 0, 86400);
    const channel   = body.channel === 'anime' ? 'anime' : 'real';

    if (!anonId || !videoId) {
        return new Response('Missing fields', { status: 422 });
    }

    // 验证并压缩 buckets（最多 360 个 bucket = 1小时视频，防止 payload 爆炸）
    let bucketsJson = '{}';
    if (body.buckets && typeof body.buckets === 'object') {
        const buckets: Record<string, number> = {};
        for (const [k, v] of Object.entries(body.buckets)) {
            const ki = parseInt(k);
            const vi = Math.min(parseInt(String(v)), 3600);
            if (!isNaN(ki) && ki >= 0 && ki < 360 && !isNaN(vi) && vi > 0) {
                buckets[ki] = vi;
            }
        }
        bucketsJson = JSON.stringify(buckets);
    }

    // completion：played_sec / (bucket数 * 10s)，粗略完播率
    const completion = duration > 0 ? Math.min(1, playedSec / duration) : 0;

    await env.DB.prepare(`
        INSERT INTO play_sessions
            (anon_id, video_id, session_ts, duration, played_sec, buckets, completion, channel)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(anonId, videoId, sessionTs, duration, playedSec, bucketsJson,
            Math.round(completion * 1000) / 1000, channel).run();

    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

/** GET /api/recommend — 拉取推荐结果 */
async function handleRecommend(req: Request, env: Env): Promise<Response> {
    const url    = new URL(req.url);
    const anonId = sanitizeStr(url.searchParams.get('anon_id') || '', 32);

    if (!anonId) {
        return new Response(JSON.stringify({ rec: [], highlights: {} }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const row = await env.DB.prepare(
        'SELECT rec_video_ids, highlight_map FROM recommendations WHERE anon_id = ?'
    ).bind(anonId).first<{ rec_video_ids: string; highlight_map: string }>();

    const result = {
        rec: row?.rec_video_ids ? JSON.parse(row.rec_video_ids) : [],
        highlights: row?.highlight_map ? JSON.parse(row.highlight_map) : {},
    };

    return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    });
}

// ── Main Handler ──────────────────────────────────────────────────
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const origin  = request.headers.get('Origin');
        const cors    = getCorsHeaders(origin);
        const method  = request.method;
        const url     = new URL(request.url);
        const path    = url.pathname;

        // OPTIONS preflight
        if (method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        // 健康检查（无需验证）
        if (path === '/api/ping') {
            return new Response(JSON.stringify({ status: 'ok', ts: Date.now() }), {
                headers: { 'Content-Type': 'application/json', ...cors },
            });
        }

        // Rate Limiting
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const allowed = await checkRateLimit(ip, env.KV);
        if (!allowed) {
            return new Response('Too Many Requests', { status: 429, headers: cors });
        }

        // Token 验证
        const token = request.headers.get('X-XFlow-Token');
        const ts    = request.headers.get('X-XFlow-Ts');
        if (!isValidToken(token, ts)) {
            return new Response('Unauthorized', { status: 401, headers: cors });
        }

        // 路由分发
        let resp: Response;
        try {
            if (path === '/api/telemetry/interact' && method === 'POST') {
                resp = await handleInteract(request, env);
            } else if (path === '/api/telemetry/session' && method === 'POST') {
                resp = await handleSession(request, env);
            } else if (path === '/api/recommend' && method === 'GET') {
                resp = await handleRecommend(request, env);
            } else {
                resp = new Response('Not Found', { status: 404 });
            }
        } catch (e: any) {
            console.error('Worker error:', e?.message);
            resp = new Response('Internal Error', { status: 500 });
        }

        // 注入 CORS headers
        const headers = new Headers(resp.headers);
        for (const [k, v] of Object.entries(cors)) {
            headers.set(k, v);
        }
        return new Response(resp.body, { status: resp.status, headers });
    },
};
