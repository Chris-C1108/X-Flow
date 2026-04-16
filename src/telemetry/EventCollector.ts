/**
 * EventCollector — X-Flow 遥测埋点模块
 *
 * 职责：
 *   1. 匿名用户 ID 生命周期管理（GM_setValue 跨域持久化）
 *   2. 低频精准事件上报（点赞、下载、收藏）
 *   3. 播放时间轴 bucket 收集（10s 粒度），30s 防抖批量发送
 *   4. 从 Workers API 拉取个人推荐与高光时刻
 *
 * 设计约束：
 *   - 全部网络请求使用 GM_xmlhttpRequest，绕过页面级 CSP connect-src
 *   - 静默失败：任何上报错误均不影响用户播放体验
 *   - Token 防爬：时间戳 + 盐值 hash，防止 API 被直接爆刷
 *   - 免费额度安全：低频事件立即发；高频时间轴 30s 合并一次
 */

// ── 配置 ──────────────────────────────────────────────────────────
// 🔧 部署 Cloudflare Worker 后，将此 URL 替换为真实地址
const WORKER_URL = 'https://loadingi.cloudns.be';

// Token 盐值（与 Worker 端保持一致）
const TOKEN_SALT = 'XFLOW_v6_SECRET';

// 用户匿名 ID 的 GM storage key
const ANON_ID_GM_KEY = 'xflow_anon_id_v1';

// ── 类型定义 ──────────────────────────────────────────────────────
export interface HighlightSegment {
    start: number;  // 秒
    end: number;    // 秒
    score: number;  // 热度倍数（相对平均值）
}

export interface RecommendResult {
    rec: string[];                              // 推荐视频 ID 列表
    highlights: Record<string, HighlightSegment[]>;  // video_id → 高光片段
}

// ── 工具函数 ──────────────────────────────────────────────────────

/**
 * 轻量防爬 Token：非密码学安全，仅增加爬虫成本
 * Worker 端使用相同算法验证
 */
function genToken(ts: number): string {
    const str = `${TOKEN_SALT}_${ts}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return Math.abs(hash).toString(36);
}

/**
 * 生成匿名用户 ID（UUID-lite）
 * 格式: xf_{timestamp_base36}_{random_6chars}
 */
function createAnonId(): string {
    return 'xf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * 获取或初始化匿名用户 ID
 * 优先使用 GM_setValue（跨 real/anime 两个域共享）
 * 降级至 localStorage（GM_getValue 不可用时）
 */
function getOrCreateAnonId(): string {
    try {
        let id = GM_getValue(ANON_ID_GM_KEY, '');
        if (!id) {
            id = createAnonId();
            GM_setValue(ANON_ID_GM_KEY, id);
        }
        return id as string;
    } catch {
        // GM_getValue 不可用时（理论上不会，降级保险）
        const lsKey = ANON_ID_GM_KEY;
        let id = localStorage.getItem(lsKey) || '';
        if (!id) {
            id = createAnonId();
            try { localStorage.setItem(lsKey, id); } catch { /* 无 LS 访问权限 */ }
        }
        return id;
    }
}

// ── 核心埋点发送 ──────────────────────────────────────────────────

/**
 * 向 Cloudflare Worker 发送 POST 请求（静默失败）
 */
function postToWorker(path: string, body: object): void {
    const ts = Date.now();
    try {
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${WORKER_URL}${path}`,
            headers: {
                'Content-Type': 'application/json',
                'X-XFlow-Token': genToken(ts),
                'X-XFlow-Ts': String(ts),
            },
            data: JSON.stringify(body),
            timeout: 8000,
            onload: () => { /* 成功，静默 */ },
            onerror: () => { /* 网络错误，静默 */ },
            ontimeout: () => { /* 超时，静默 */ },
        });
    } catch (e) {
        // GM_xmlhttpRequest 本身异常（极少），静默处理
    }
}

// ── EventCollector 主类 ───────────────────────────────────────────

export class EventCollector {
    private anonId: string;
    private channel: 'real' | 'anime' = 'real';

    // 播放 Session 状态
    private currentVideoId: string = '';
    private sessionStart: number = 0;
    /** 时间轴 bucket 计数器: bucket_index → 播放帧数 (每秒 ~1帧) */
    private playBuckets: Record<number, number> = {};
    private totalPlayedSec: number = 0;

    // 防抖定时器
    private flushTimer: ReturnType<typeof setInterval> | null = null;

    // ── 上报节流：防止同一 videoId 短时间重复上报 ──
    private lastInteractVideo: string = '';
    private lastInteractTs: number = 0;

    constructor() {
        this.anonId = getOrCreateAnonId();
    }

    // ── 频道设置 ─────────────────────────────────────────────────

    setChannel(isAnime: boolean): void {
        this.channel = isAnime ? 'anime' : 'real';
    }

    getAnonId(): string {
        return this.anonId;
    }

    // ── 低频精准事件（立即上报）───────────────────────────────────

    trackLike(videoId: string): void {
        this._sendInteract(videoId, 'like');
    }

    trackDownload(videoId: string): void {
        this._sendInteract(videoId, 'download');
    }

    trackBookmark(videoId: string, isAdding: boolean): void {
        this._sendInteract(videoId, isAdding ? 'bookmark_add' : 'bookmark_remove');
    }

    /** 视图开始事件（进入视频时上报一次，追踪 view_start 流量） */
    trackViewStart(videoId: string): void {
        // 限流：同一视频 5 秒内不重复上报 view_start
        if (videoId === this.lastInteractVideo &&
            Date.now() - this.lastInteractTs < 5000) return;
        this._sendInteract(videoId, 'view_start');
    }

    private _sendInteract(videoId: string, action: string): void {
        this.lastInteractVideo = videoId;
        this.lastInteractTs = Date.now();

        postToWorker('/api/telemetry/interact', {
            anon_id: this.anonId,
            video_id: videoId,
            action,
            ts: this.lastInteractTs,
            hour_of_day: new Date().getHours(),
            channel: this.channel,
        });
    }

    // ── 播放 Session 生命周期 ─────────────────────────────────────

    /**
     * 切换到新视频时调用
     * 会先 flush 上一个 session 再重置状态
     */
    startSession(videoId: string): void {
        this.flushSession();  // 先把上一个 session 数据发出去

        this.currentVideoId = videoId;
        this.sessionStart = Date.now();
        this.playBuckets = {};
        this.totalPlayedSec = 0;

        // 30s 防抖定时刷新（防止用户一直看同一视频导致数据丢失）
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => this.flushSession(), 30_000);
    }

    /**
     * 在 video.ontimeupdate 中调用（约每秒一次）
     * @param currentTimeSec 当前播放位置（秒）
     * @param duration 视频总时长（秒）
     */
    trackTimeUpdate(currentTimeSec: number, duration: number): void {
        if (!this.currentVideoId || !isFinite(currentTimeSec)) return;

        // 10 秒为一个 bucket
        const bucketKey = Math.floor(currentTimeSec / 10);
        this.playBuckets[bucketKey] = (this.playBuckets[bucketKey] || 0) + 1;
        this.totalPlayedSec++;
    }

    /**
     * 切换视频、关闭播放器、页面卸载时调用
     * 将当前 session 数据上报并清空状态
     */
    flushSession(): void {
        if (!this.currentVideoId || Object.keys(this.playBuckets).length === 0) return;

        const duration = Math.round((Date.now() - this.sessionStart) / 1000);
        postToWorker('/api/telemetry/session', {
            anon_id: this.anonId,
            video_id: this.currentVideoId,
            session_ts: this.sessionStart,
            duration,                            // 总 session 时长（秒）
            played_sec: this.totalPlayedSec,     // 实际有播放帧的秒数
            buckets: this.playBuckets,           // {bucket_index: count, ...}
            channel: this.channel,
        });

        // 清空 session 状态（保留 videoId 和 startTime 以防重复 flush）
        this.playBuckets = {};
        this.totalPlayedSec = 0;
        this.currentVideoId = '';
    }

    // ── 推荐结果拉取 ─────────────────────────────────────────────

    /**
     * 从 Worker 拉取该用户的推荐视频 + 高光时刻
     * 返回空值（不抛出），由调用方决定是否展示
     */
    fetchRecommendations(): Promise<RecommendResult> {
        const ts = Date.now();
        return new Promise<RecommendResult>((resolve) => {
            const empty: RecommendResult = { rec: [], highlights: {} };
            try {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `${WORKER_URL}/api/recommend?anon_id=${encodeURIComponent(this.anonId)}`,
                    headers: {
                        'X-XFlow-Token': genToken(ts),
                        'X-XFlow-Ts': String(ts),
                    },
                    responseType: 'json',
                    timeout: 5000,
                    onload: (res) => {
                        if (res.status === 200 && res.response) {
                            resolve(res.response as RecommendResult);
                        } else {
                            resolve(empty);
                        }
                    },
                    onerror: () => resolve(empty),
                    ontimeout: () => resolve(empty),
                });
            } catch {
                resolve(empty);
            }
        });
    }

    // ── 清理 ─────────────────────────────────────────────────────

    destroy(): void {
        this.flushSession();
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
}

// ── 单例导出（全局共享同一个 collector 实例）─────────────────────
export const collector = new EventCollector();
