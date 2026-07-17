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

-- 低频交互事件表（下载/收藏/浏览开始/倍速/作者面板/批量复制/PiP/频道切换）
CREATE TABLE IF NOT EXISTS interactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    anon_id     TEXT    NOT NULL,
    video_id    TEXT    NOT NULL,
    action      TEXT    NOT NULL,   -- download|bookmark_add|bookmark_remove|view_start|speed_change|author_view|batch_copy|pip_enter|channel_switch
    ts          INTEGER NOT NULL,
    hour_of_day INTEGER NOT NULL DEFAULT 0,  -- 0-23
    channel     TEXT    NOT NULL DEFAULT 'real',  -- real|anime
    site_key    TEXT    NOT NULL DEFAULT '',  -- adapter 站点标识，如 pektino/twihub/nextapi 等，用于溯源视频
    author_id   TEXT    NOT NULL DEFAULT '',  -- 作者 ID（tweet_account），用于作者维度推荐
    version     TEXT    NOT NULL DEFAULT ''   -- 脚本版本信息（例如 6.2.7），用于行为版本分析
);
CREATE INDEX IF NOT EXISTS idx_interact_video  ON interactions(video_id, action);
CREATE INDEX IF NOT EXISTS idx_interact_user   ON interactions(anon_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_interact_ts     ON interactions(ts DESC);
CREATE INDEX IF NOT EXISTS idx_interact_author ON interactions(author_id);
CREATE INDEX IF NOT EXISTS idx_interact_site   ON interactions(site_key);

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
    channel     TEXT    NOT NULL DEFAULT 'real',
    version     TEXT    NOT NULL DEFAULT ''   -- 脚本版本信息
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
-- WHERE action IN ('download', 'bookmark_add', 'view_start')
-- GROUP BY anon_id, video_id, action;

-- 查询用户偏好作者（用于作者维度推荐）:
-- SELECT anon_id, author_id, COUNT(*) as cnt
-- FROM interactions
-- WHERE author_id != '' AND action IN ('author_view', 'bookmark_add', 'download')
-- GROUP BY anon_id, author_id;

-- 查询各站点流量分布:
-- SELECT site_key, COUNT(*) as cnt FROM interactions
-- WHERE site_key != '' GROUP BY site_key;

-- 查询活跃时段分布（用于用户画像）:
-- SELECT dominant_period, COUNT(*) as user_count
-- FROM users GROUP BY dominant_period;

-- ============================================================
-- 生产环境迁移语句（v8.4 升级时执行）
-- 执行方式：wrangler d1 execute xflow-telemetry --remote --command="<SQL>"
-- ============================================================

-- 1. 字段升级 (第一次迁移)
-- ALTER TABLE interactions ADD COLUMN site_key TEXT NOT NULL DEFAULT '';
-- ALTER TABLE interactions ADD COLUMN author_id TEXT NOT NULL DEFAULT '';
-- CREATE INDEX IF NOT EXISTS idx_interact_author ON interactions(author_id);
-- CREATE INDEX IF NOT EXISTS idx_interact_site ON interactions(site_key);

-- 2. 脚本版本号升级 (第二次迁移)
-- ALTER TABLE interactions ADD COLUMN version TEXT NOT NULL DEFAULT '';
-- ALTER TABLE play_sessions ADD COLUMN version TEXT NOT NULL DEFAULT '';
