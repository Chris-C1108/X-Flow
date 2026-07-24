-- ============================================================
-- X-Flow Telemetry — D1 数据库 Schema (v8.5 精简聚合架构)
-- 执行方式：wrangler d1 execute xflow-telemetry --file=schema.sql
-- ============================================================

-- 1. X-Flow 统一会话、行为与视频热度聚合宽表 (替换旧 users, interactions, play_sessions 表)
CREATE TABLE IF NOT EXISTS xf_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    anon_id         TEXT    NOT NULL,
    session_id      TEXT    NOT NULL UNIQUE,     -- xf_${anon_id}_${date}_${hour}
    date            TEXT    NOT NULL,            -- YYYY-MM-DD
    ts              INTEGER NOT NULL,            -- 最新更新时间戳 (Unix ms)
    channel         TEXT    NOT NULL DEFAULT 'real', -- real | anime
    site_key        TEXT    NOT NULL DEFAULT '', -- 适配器站点 key
    version         TEXT    NOT NULL DEFAULT '', -- 脚本版本
    total_play_sec  INTEGER NOT NULL DEFAULT 0,  -- 本 Session 累计观看时长 (秒)
    action_counts   TEXT    NOT NULL DEFAULT '{}',-- 交互计数 JSON: {"view_start":15, "download":2, "bookmark_add":1}
    video_heat      TEXT    NOT NULL DEFAULT '{}' -- 视频时间轴与热度 JSON: {"vid_123": {"played_sec":45, "buckets":{"0":3,"1":2}}}
);

CREATE INDEX IF NOT EXISTS idx_xf_events_date ON xf_events(date, channel);
CREATE INDEX IF NOT EXISTS idx_xf_events_user ON xf_events(anon_id, date);

-- 2. X-Flow AI 推荐结果与高光时刻表
CREATE TABLE IF NOT EXISTS xf_recommendations (
    anon_id         TEXT    PRIMARY KEY,
    rec_video_ids   TEXT    NOT NULL DEFAULT '[]', -- JSON 推荐视频 ID 列表
    highlight_map   TEXT    NOT NULL DEFAULT '{}', -- JSON: {video_id: [{start,end,score},...]}
    updated_at      INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Miss_Player Telemetry — D1 数据库 Schema
-- ============================================================

-- Miss_Player 匿名用户终端表 (基于浏览器指纹生成唯一 client_id)
CREATE TABLE IF NOT EXISTS mp_users (
    client_id       TEXT    PRIMARY KEY,
    first_seen      INTEGER NOT NULL,           -- Unix ms timestamp
    last_seen       INTEGER NOT NULL,           -- Unix ms timestamp
    session_count   INTEGER NOT NULL DEFAULT 0,
    dominant_period TEXT    NOT NULL DEFAULT 'unknown', -- morning/afternoon/evening/late_night/early_morning
    user_agent      TEXT    NOT NULL DEFAULT '',
    device_fp       TEXT    NOT NULL DEFAULT ''
);

-- Miss_Player 聚合会话/小时宽表 (降低 D1 写入量 98%+)
CREATE TABLE IF NOT EXISTS mp_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id       TEXT    NOT NULL,
    session_id      TEXT    NOT NULL UNIQUE,    -- 会话/小时唯一键 (${client_id}_${date}_${hour})
    date            TEXT    NOT NULL,           -- YYYY-MM-DD
    ts              INTEGER NOT NULL,           -- 最新更新时间戳 (Unix ms)
    hour_of_day     INTEGER NOT NULL DEFAULT 0, -- 0-23
    host            TEXT    NOT NULL DEFAULT '',
    site_category   TEXT    NOT NULL DEFAULT 'GENERIC',
    script_version  TEXT    NOT NULL DEFAULT '',
    device_type     TEXT    NOT NULL DEFAULT '',
    total_play_sec  INTEGER NOT NULL DEFAULT 0,  -- 累计观看时长(秒)
    event_counts    TEXT    NOT NULL DEFAULT '{}', -- 各事件交互次数 JSON: {"seek_click": 15, "rate_change": 4, ...}
    avcodes         TEXT    NOT NULL DEFAULT '[]', -- 观看过的番号 JSON: ["PRED-417", ...]
    details_json    TEXT    NOT NULL DEFAULT '{}'  -- 其它里程碑/详细 Payload JSON
);

CREATE INDEX IF NOT EXISTS idx_mp_sessions_date ON mp_sessions(date, site_category);
CREATE INDEX IF NOT EXISTS idx_mp_sessions_client ON mp_sessions(client_id, date);

-- Miss_Player 原始事件表 (保留作兼容)
CREATE TABLE IF NOT EXISTS mp_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id       TEXT    NOT NULL,
    ts              INTEGER NOT NULL,           -- Unix ms timestamp
    hour_of_day     INTEGER NOT NULL DEFAULT 0,  -- 0-23
    host            TEXT    NOT NULL DEFAULT '', -- window.location.hostname
    site_category   TEXT    NOT NULL DEFAULT 'GENERIC', -- MISSAV|JABLE|JAVLIBRARY|JAVDB|GENERIC
    avcode          TEXT    NOT NULL DEFAULT '', -- 番号 (如 IPX-123)
    event_type      TEXT    NOT NULL,           -- 事件类型 (如 button_show, player_open_success, seek_click, loop_toggle, comment_send, adblock_intercept, etc.)
    event_value     TEXT    NOT NULL DEFAULT '{}', -- 细节 JSON payload
    script_version  TEXT    NOT NULL DEFAULT '',
    device_type     TEXT    NOT NULL DEFAULT ''  -- Mobile_Portrait | Mobile_Landscape | PC_Landscape | PC_Portrait
);

CREATE INDEX IF NOT EXISTS idx_mp_events_client ON mp_events(client_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_mp_events_type   ON mp_events(event_type, ts DESC);
CREATE INDEX IF NOT EXISTS idx_mp_events_site   ON mp_events(site_category, host);
CREATE INDEX IF NOT EXISTS idx_mp_events_avcode ON mp_events(avcode);
CREATE INDEX IF NOT EXISTS idx_mp_events_ts     ON mp_events(ts DESC);

-- ============================================================
-- Miss_Player 分析查询示例
-- ============================================================

-- 1. 每日日活终端数 (DAU) & 站点分布
-- SELECT DATE(ts/1000, 'unixepoch', 'localtime') as day, site_category, COUNT(DISTINCT client_id) as dau
-- FROM mp_events
-- GROUP BY day, site_category
-- ORDER BY day DESC;

-- 2. 用户每日播放播放器总时长 (Daily Play Duration)
-- SELECT DATE(ts/1000, 'unixepoch', 'localtime') as day, client_id, SUM(CAST(json_extract(event_value, '$.duration_sec') AS INT)) as total_play_sec
-- FROM mp_events
-- WHERE event_type = 'player_close'
-- GROUP BY day, client_id;


