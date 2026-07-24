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
 *   - 时间戳 Token 防爬（5 分钟窗口）
 *   - CORS 仅限目标域名
 */

export interface Env {
    DB: D1Database;         // D1 数据库
}

// ── 配置 ──────────────────────────────────────────────────────────
const TOKEN_SALT    = 'XFLOW_v6_SECRET';  // 与前端保持一致
const TOKEN_WINDOW  = 5 * 60 * 1000;      // Token 时间窗口 5 分钟

const ALLOWED_ORIGINS = [
    'https://truvaze.com',
    'https://x-ero-anime.com',
    'https://x-flow.ccwu.cc',
    'http://localhost',
];

// ── CORS Headers ─────────────────────────────────────────────────
function getCorsHeaders(origin: string | null): HeadersInit {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-XFlow-Token, X-XFlow-Ts, X-MP-Token, X-MP-Ts',
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



// ── 参数校验工具 ──────────────────────────────────────────────────
function sanitizeStr(val: unknown, maxLen = 256): string {
    if (typeof val !== 'string') return '';
    return val.slice(0, maxLen).replace(/[^\w\-./@:=?]/g, '');
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
    const validActions = [
        'download', 'bookmark_add', 'bookmark_remove', 'view_start',
        'speed_change', 'author_view', 'batch_copy', 'pip_enter', 'channel_switch',
        'app_init',  // 脚本初始化心跳 — 用于统计日活终端数
    ];
    if (!validActions.includes(action)) {
        return new Response('Invalid action', { status: 422 });
    }

    // 更新/插入用户记录（UPSERT）
    const loginPeriod = hourOfDay >= 22 || hourOfDay < 2 ? 'late_night'
                      : hourOfDay < 6   ? 'early_morning'
                      : hourOfDay < 12  ? 'morning'
                      : hourOfDay < 18  ? 'afternoon'
                      : 'evening';

    const siteKey  = sanitizeStr(body.site_key, 32);
    const authorId = sanitizeStr(body.author_id, 64);
    const version  = sanitizeStr(body.version, 16);

    const sqls = [];

    // Only update/insert users table on app_init heartbeats to save D1 write limits
    if (action === 'app_init') {
        const loginPeriod = hourOfDay >= 22 || hourOfDay < 2 ? 'late_night'
                          : hourOfDay < 6   ? 'early_morning'
                          : hourOfDay < 12  ? 'morning'
                          : hourOfDay < 18  ? 'afternoon'
                          : 'evening';
        sqls.push(
            env.DB.prepare(`
                INSERT INTO users (anon_id, first_seen, last_seen, session_count, dominant_period)
                VALUES (?, ?, ?, 1, ?)
                ON CONFLICT(anon_id) DO UPDATE SET
                    last_seen = excluded.last_seen,
                    session_count = session_count + 1,
                    dominant_period = excluded.dominant_period
            `).bind(anonId, ts, ts, loginPeriod)
        );
    }

    sqls.push(
        env.DB.prepare(`
            INSERT INTO interactions (anon_id, video_id, action, ts, hour_of_day, channel, site_key, author_id, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(anonId, videoId, action, ts, hourOfDay, channel, siteKey, authorId, version)
    );

    if (sqls.length === 1) {
        await sqls[0].run();
    } else {
        await env.DB.batch(sqls);
    }

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
    const version   = sanitizeStr(body.version, 16);

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
            (anon_id, video_id, session_ts, duration, played_sec, buckets, completion, channel, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(anonId, videoId, sessionTs, duration, playedSec, bucketsJson,
            Math.round(completion * 1000) / 1000, channel, version).run();

    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

/** POST /api/telemetry/batch — X-Flow 聚合遥测上报 (1小时/Session 1行 UPSERT) */
async function handleXfBatch(req: Request, env: Env): Promise<Response> {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return new Response('Bad JSON', { status: 400 });
    }

    const anonId = sanitizeStr(body.anon_id, 48);
    const ts = sanitizeInt(body.ts || Date.now(), 0, 9999999999999);
    const dateStr = sanitizeStr(body.date || new Date(ts).toISOString().slice(0, 10), 10);
    const hourOfDay = sanitizeInt(body.hour_of_day ?? new Date(ts).getHours(), 0, 23);
    const sessionId = sanitizeStr(body.session_id || `xf_${anonId}_${dateStr}_${hourOfDay}`, 128);
    const channel = body.channel === 'anime' ? 'anime' : 'real';
    const siteKey = sanitizeStr(body.site_key, 32);
    const version = sanitizeStr(body.version, 16);
    const totalPlaySec = sanitizeInt(body.total_play_sec || 0, 0, 86400);

    if (!anonId) {
        return new Response('Missing anon_id', { status: 422 });
    }

    // 1. 读取数据库中已有的 session 数据 (避免覆盖同 session 内前序视频的历史热度与行为)
    const existing = await env.DB.prepare(
        `SELECT action_counts, video_heat FROM xf_events WHERE session_id = ?`
    ).bind(sessionId).first<{ action_counts: string; video_heat: string }>();

    let mergedActionCounts: Record<string, number> = {};
    let mergedVideoHeat: Record<string, { total_sec: number; buckets: Record<string, number> }> = {};

    if (existing) {
        try { mergedActionCounts = JSON.parse(existing.action_counts || '{}'); } catch (_) {}
        try { mergedVideoHeat = JSON.parse(existing.video_heat || '{}'); } catch (_) {}
    }

    // 2. 深度合并 incoming action_counts
    const incomingActionCounts = typeof body.action_counts === 'object' ? body.action_counts : {};
    for (const [k, v] of Object.entries(incomingActionCounts)) {
        const count = typeof v === 'number' ? v : 0;
        mergedActionCounts[k] = (mergedActionCounts[k] || 0) + count;
    }

    // 3. 深度合并 incoming video_heat (保留相对全路径 key，并累加 total_sec 与时间轴 buckets)
    const incomingVideoHeat = typeof body.video_heat === 'object' ? body.video_heat : {};
    for (const [vId, vObj] of Object.entries(incomingVideoHeat)) {
        if (!vObj || typeof vObj !== 'object') continue;
        const cleanVId = sanitizeStr(vId, 256);
        if (!cleanVId) continue;

        if (!mergedVideoHeat[cleanVId]) {
            mergedVideoHeat[cleanVId] = { total_sec: 0, buckets: {} };
        }
        const target = mergedVideoHeat[cleanVId];
        const totalSec = typeof (vObj as any).total_sec === 'number' ? (vObj as any).total_sec : 0;
        target.total_sec = (target.total_sec || 0) + totalSec;

        const buckets = (vObj as any).buckets;
        if (buckets && typeof buckets === 'object') {
            if (!target.buckets) target.buckets = {};
            for (const [bKey, bVal] of Object.entries(buckets)) {
                const bNum = typeof bVal === 'number' ? bVal : 0;
                target.buckets[bKey] = (target.buckets[bKey] || 0) + bNum;
            }
        }
    }

    const actionCountsStr = JSON.stringify(mergedActionCounts).slice(0, 8192);
    const videoHeatStr = JSON.stringify(mergedVideoHeat).slice(0, 32768);

    await env.DB.prepare(`
        INSERT INTO xf_events (anon_id, session_id, date, ts, channel, site_key, version, total_play_sec, action_counts, video_heat)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
            ts = excluded.ts,
            total_play_sec = xf_events.total_play_sec + excluded.total_play_sec,
            action_counts = excluded.action_counts,
            video_heat = excluded.video_heat
    `).bind(anonId, sessionId, dateStr, ts, channel, siteKey, version, totalPlaySec, actionCountsStr, videoHeatStr).run();

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

    let row = await env.DB.prepare(
        'SELECT rec_video_ids, highlight_map FROM xf_recommendations WHERE anon_id = ?'
    ).bind(anonId).first<{ rec_video_ids: string; highlight_map: string }>();

    if (!row || !row.rec_video_ids || JSON.parse(row.rec_video_ids).length === 0) {
        row = await env.DB.prepare(
            'SELECT rec_video_ids, highlight_map FROM xf_recommendations WHERE anon_id = ?'
        ).bind('GLOBAL_DEFAULT').first<{ rec_video_ids: string; highlight_map: string }>();
    }

    const result = {
        rec: row?.rec_video_ids ? JSON.parse(row.rec_video_ids) : [],
        highlights: row?.highlight_map ? JSON.parse(row.highlight_map) : {},
    };

    return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    });
}

/** POST /api/mp/telemetry/events — Miss_Player 遥测事件上报 */
async function handleMpEvents(req: Request, env: Env): Promise<Response> {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return new Response('Bad JSON', { status: 400 });
    }

    const events: any[] = Array.isArray(body) ? body : (body.events && Array.isArray(body.events)) ? body.events : [body];
    if (events.length === 0) {
        return new Response('Empty events', { status: 422 });
    }

    const sqls = [];
    const now = Date.now();

    for (const item of events) {
        if (!item || typeof item !== 'object') continue;
        const clientId     = sanitizeStr(item.client_id, 64);
        const ts           = sanitizeInt(item.ts || now, 0, 9999999999999);
        const hourOfDay    = sanitizeInt(item.hour_of_day ?? new Date(ts).getHours(), 0, 23);
        const host         = sanitizeStr(item.host, 64);
        const siteCategory = sanitizeStr(item.site_category, 32) || 'GENERIC';
        const avcode       = sanitizeStr(item.avcode, 32);
        const eventType    = sanitizeStr(item.event_type, 64);
        const scriptVersion = sanitizeStr(item.script_version, 16);
        const deviceType   = sanitizeStr(item.device_type, 32);

        let eventValueStr = '{}';
        if (item.event_value && typeof item.event_value === 'object') {
            eventValueStr = JSON.stringify(item.event_value).slice(0, 2048);
        } else if (typeof item.event_value === 'string') {
            eventValueStr = item.event_value.slice(0, 2048);
        }

        if (!clientId) continue;
        if (!item.is_session_summary && !item.session_id && !eventType) continue;

        const isAppInit = eventType === 'app_init' || (item.event_counts && item.event_counts.app_init > 0);

        // 仅在 App 初始化心跳时更新 mp_users 用户画像表，避免重复写库消耗 D1 配额
        if (isAppInit) {
            const loginPeriod = hourOfDay >= 22 || hourOfDay < 2 ? 'late_night'
                              : hourOfDay < 6   ? 'early_morning'
                              : hourOfDay < 12  ? 'morning'
                              : hourOfDay < 18  ? 'afternoon'
                              : 'evening';
            const ua = sanitizeStr(item.user_agent || '', 256);
            sqls.push(
                env.DB.prepare(`
                    INSERT INTO mp_users (client_id, first_seen, last_seen, session_count, dominant_period, user_agent, device_fp)
                    VALUES (?, ?, ?, 1, ?, ?, ?)
                    ON CONFLICT(client_id) DO UPDATE SET
                        last_seen = excluded.last_seen,
                        session_count = session_count + 1,
                        dominant_period = excluded.dominant_period,
                        user_agent = CASE WHEN excluded.user_agent != '' THEN excluded.user_agent ELSE mp_users.user_agent END
                `).bind(clientId, ts, ts, loginPeriod, ua, clientId)
            );
        }

        // 检查是否为合并的 Session / 聚合数据包
        if (item.is_session_summary || item.session_id) {
            const sessionId = sanitizeStr(item.session_id || `${clientId}_${new Date(ts).toISOString().slice(0, 10)}_${hourOfDay}`, 128);
            const dateStr = sanitizeStr(item.date || new Date(ts).toISOString().slice(0, 10), 10);
            const totalPlaySec = sanitizeInt(item.total_play_sec || 0, 0, 86400);
            const eventCountsStr = typeof item.event_counts === 'object' ? JSON.stringify(item.event_counts).slice(0, 4096) : (typeof item.event_counts === 'string' ? item.event_counts.slice(0, 4096) : '{}');
            const avcodesStr = Array.isArray(item.avcodes) ? JSON.stringify(item.avcodes).slice(0, 2048) : '[]';
            const detailsJsonStr = typeof item.details_json === 'object' ? JSON.stringify(item.details_json).slice(0, 8192) : '{}';

            sqls.push(
                env.DB.prepare(`
                    INSERT INTO mp_sessions (client_id, session_id, date, ts, hour_of_day, host, site_category, script_version, device_type, total_play_sec, event_counts, avcodes, details_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(session_id) DO UPDATE SET
                        ts = excluded.ts,
                        total_play_sec = mp_sessions.total_play_sec + excluded.total_play_sec,
                        event_counts = excluded.event_counts,
                        avcodes = excluded.avcodes,
                        details_json = excluded.details_json
                `).bind(clientId, sessionId, dateStr, ts, hourOfDay, host, siteCategory, scriptVersion, deviceType, totalPlaySec, eventCountsStr, avcodesStr, detailsJsonStr)
            );
        } else if (eventType) {
            // 单条原始事件（可选）
            sqls.push(
                env.DB.prepare(`
                    INSERT INTO mp_events (client_id, ts, hour_of_day, host, site_category, avcode, event_type, event_value, script_version, device_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(clientId, ts, hourOfDay, host, siteCategory, avcode, eventType, eventValueStr, scriptVersion, deviceType)
            );
        }
    }

    if (sqls.length > 0) {
        if (sqls.length === 1) {
            await sqls[0].run();
        } else {
            for (let i = 0; i < sqls.length; i += 50) {
                await env.DB.batch(sqls.slice(i, i + 50));
            }
        }
    }
    console.log(`[handleMpEvents] Received ${events.length} items, created ${sqls.length} SQLs`);

    return new Response(JSON.stringify({ ok: true, count: sqls.length }), {
        headers: { 'Content-Type': 'application/json' },
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

        // Token 验证
        const token = request.headers.get('X-XFlow-Token') || request.headers.get('X-MP-Token');
        const ts    = request.headers.get('X-XFlow-Ts') || request.headers.get('X-MP-Ts');
        if (!isValidToken(token, ts)) {
            return new Response('Unauthorized', { status: 401, headers: cors });
        }

        // 路由分发
        let resp: Response;
        try {
            if (path === '/api/telemetry/batch' && method === 'POST') {
                resp = await handleXfBatch(request, env);
            } else if (path === '/api/mp/telemetry/events' && method === 'POST') {
                resp = await handleMpEvents(request, env);
            } else if (path === '/api/telemetry/interact' && method === 'POST') {
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
