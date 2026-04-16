-- ============================================================
-- X-Flow Telemetry — D1 数据库 Schema
-- 执行方式：wrangler d1 execute xflow-telemetry --file=schema.sql
-- ============================================================

-- 用户匿名标识表
CREATE TABLE IF NOT EXISTS users (
    anon_id         TEXT    PRIMARY KEY,
    first_seen      INTEGER NOT NULL,           -- Unix ms timestamp
    last_seen       INTEGER NOT NULL,
    session_count   INTEGER NOT NULL DEFAULT 0,
    dominant_period TEXT    NOT NULL DEFAULT 'unknown'  -- morning/afternoon/evening/late_night/early_morning
);

-- 低频交互事件表（点赞/下载/收藏/浏览开始）
CREATE TABLE IF NOT EXISTS interactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    anon_id     TEXT    NOT NULL,
    video_id    TEXT    NOT NULL,
    action      TEXT    NOT NULL,   -- like|download|bookmark_add|bookmark_remove|view_start
    ts          INTEGER NOT NULL,
    hour_of_day INTEGER NOT NULL DEFAULT 0,  -- 0-23
    channel     TEXT    NOT NULL DEFAULT 'real'  -- real|anime
);
CREATE INDEX IF NOT EXISTS idx_interact_video  ON interactions(video_id, action);
CREATE INDEX IF NOT EXISTS idx_interact_user   ON interactions(anon_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_interact_ts     ON interactions(ts DESC);

-- 播放时间轴宽表（替代 R2，避免追加写竞争）
CREATE TABLE IF NOT EXISTS play_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    anon_id     TEXT    NOT NULL,
    video_id    TEXT    NOT NULL,
    session_ts  INTEGER NOT NULL,   -- 本次播放开始时间 (ms)
    duration    INTEGER NOT NULL DEFAULT 0,   -- 此次 session 总时长（秒）
    played_sec  INTEGER NOT NULL DEFAULT 0,   -- 有效播放帧的秒数
    buckets     TEXT    NOT NULL DEFAULT '{}',-- JSON: {bucket_index: play_count, ...}
    completion  REAL    NOT NULL DEFAULT 0,   -- 完播率 0.0-1.0
    channel     TEXT    NOT NULL DEFAULT 'real'
);
CREATE INDEX IF NOT EXISTS idx_sessions_video  ON play_sessions(video_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user   ON play_sessions(anon_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ts     ON play_sessions(session_ts DESC);

-- 推荐结果表（替代 KV，避免 1000次/天 KV 写入限制）
CREATE TABLE IF NOT EXISTS recommendations (
    anon_id         TEXT    PRIMARY KEY,
    rec_video_ids   TEXT    NOT NULL DEFAULT '[]',    -- JSON array of video IDs
    highlight_map   TEXT    NOT NULL DEFAULT '{}',    -- JSON: {video_id: [{start,end,score},...]}
    updated_at      INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 查询示例（Python 分析脚本使用）
-- ============================================================

-- 查询某视频的高热 bucket 分布（用于高光时刻计算）:
-- SELECT buckets, COUNT(*) as session_count
-- FROM play_sessions WHERE video_id = 'xxx'
-- GROUP BY video_id;

-- 查询用户行为矩阵（用于协同过滤）:
-- SELECT anon_id, video_id, action, COUNT(*) as weight
-- FROM interactions
-- WHERE action IN ('like', 'download', 'bookmark_add')
-- GROUP BY anon_id, video_id, action;

-- 查询活跃时段分布（用于用户画像）:
-- SELECT dominant_period, COUNT(*) as user_count
-- FROM users GROUP BY dominant_period;
