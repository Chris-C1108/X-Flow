/**
 * EventCollector — X-Flow 遥测埋点模块
 *
 * 职责：
 *   1. 匿名用户 ID 生命周期管理（userscript/web 双运行时）
 *   2. 低频精准事件上报（下载、收藏、倍速、作者面板、批量复制、PiP、频道切换）
 *   3. 播放时间轴 bucket 收集（10s 粒度），30s 防抖批量发送
 *   4. 从 Workers API 拉取个人推荐与高光时刻
 *
 * 上报事件白名单（与 Worker validActions 保持一致）：
 *   download | bookmark_add | bookmark_remove | view_start
 *   speed_change | author_view | batch_copy | pip_enter | channel_switch
 */

import { getRuntimeAdapter } from '../runtime';
import type { RuntimeAdapter } from '../runtime/adapter';

// ── 配置 ──────────────────────────────────────────────────────────
const WORKER_URL_PRIMARY = 'https://telemetry.x-flow.ccwu.cc';
const WORKER_URL_FALLBACK = 'https://xflow-telemetry.chen-m1108.workers.dev';

// Token 盐值（与 Worker 端保持一致）
const TOKEN_SALT = 'XFLOW_v6_SECRET';

// 用户匿名 ID 的 storage key
const ANON_ID_STORAGE_KEY = 'xflow_anon_id_v1';

// ── 类型定义 ──────────────────────────────────────────────────────
export interface HighlightSegment {
    start: number;
    end: number;
    score: number;
}

export interface RecommendResult {
    rec: string[];
    highlights: Record<string, HighlightSegment[]>;
}

function genToken(ts: number): string {
    const str = `${TOKEN_SALT}_${ts}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return Math.abs(hash).toString(36);
}

function getDeviceFingerprintString(): string {
    const components: string[] = [];
    try {
        components.push(navigator.userAgent || '');
        components.push(navigator.language || '');
        components.push(String(navigator.hardwareConcurrency || 4));
        components.push(`${window.screen ? window.screen.width : 0}x${window.screen ? window.screen.height : 0}`);
        components.push(String(new Date().getTimezoneOffset()));
    } catch (e) {
        components.push('fp_err');
    }
    return components.join('||');
}

function simpleMd5(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return Math.abs(hash).toString(36);
}

function getOrCreateAnonId(runtime: RuntimeAdapter): string {
    const existing = runtime.storage.get<string>(ANON_ID_STORAGE_KEY, '');
    if (existing) return existing;

    const fpString = getDeviceFingerprintString();
    const newId = 'xf_' + simpleMd5(fpString) + '_' + Date.now().toString(36).slice(-4);
    runtime.storage.set(ANON_ID_STORAGE_KEY, newId);
    return newId;
}

const getScriptVersion = (): string => {
    try {
        if (typeof GM_info !== 'undefined' && GM_info?.script?.version) {
            return GM_info.script.version;
        }
    } catch (_) {}
    return '6.3.0';
};

export class EventCollector {
    private readonly runtime: RuntimeAdapter;
    private anonId: string;
    private channel: 'real' | 'anime' = 'real';
    private siteKey: string = '';          // 当前站点 adapter key，如 "pektino"
    private currentAuthorId: string = '';  // 当前视频的作者 ID

    private currentVideoId: string = '';
    private sessionStart: number = 0;
    private actionCounts: Record<string, number> = {};
    private videoHeat: Record<string, { total_sec: number; buckets: Record<number, number> }> = {};
    private totalPlayedSec: number = 0;

    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private viewStartTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(runtime: RuntimeAdapter = getRuntimeAdapter()) {
        this.runtime = runtime;
        this.anonId = getOrCreateAnonId(runtime);

        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flushSession());
            window.addEventListener('pagehide', () => this.flushSession());
        }
    }

    setChannel(isAnime: boolean): void {
        this.channel = isAnime ? 'anime' : 'real';
    }

    setSiteKey(siteKey: string): void {
        this.siteKey = siteKey;
    }

    setCurrentAuthor(authorId: string): void {
        this.currentAuthorId = authorId;
    }

    getAnonId(): string {
        return this.anonId;
    }

    // ── 交互事件追踪 ──────────────────────────────────────────────

    trackDownload(videoId: string): void {
        this.sendInteract(videoId, 'download');
    }

    trackBookmark(videoId: string, isAdding: boolean): void {
        this.sendInteract(videoId, isAdding ? 'bookmark_add' : 'bookmark_remove');
    }

    trackViewStart(videoId: string): void {
        if (this.viewStartTimer) {
            clearTimeout(this.viewStartTimer);
            this.viewStartTimer = null;
        }

        this.viewStartTimer = setTimeout(() => {
            this.sendInteract(videoId, 'view_start');
            this.viewStartTimer = null;
        }, 2000);
    }

    trackSpeedChange(videoId: string, rate: number): void {
        this.sendInteract(videoId, 'speed_change', { speed: rate });
    }

    trackAuthorView(authorId: string, videoId: string): void {
        this.sendInteract(videoId, 'author_view', { author_id: authorId });
    }

    trackBatchCopy(authorId: string, count: number): void {
        this.sendInteract('', 'batch_copy', { author_id: authorId, count });
    }

    trackPiP(videoId: string): void {
        this.sendInteract(videoId, 'pip_enter');
    }

    trackChannelSwitch(from: 'real' | 'anime', to: 'real' | 'anime'): void {
        this.sendInteract('', 'channel_switch', { from, to });
    }

    trackAppInit(siteKey: string): void {
        const storageKey = 'xflow_app_init_ts';
        const lastSent = parseInt(this.runtime.storage.get<string>(storageKey, '0') || '0', 10);
        const now = Date.now();
        if (now - lastSent < 6 * 3600 * 1000) return;
        this.runtime.storage.set(storageKey, String(now));
        this.setSiteKey(siteKey);
        this.sendInteract('', 'app_init');
    }

    private sendInteract(videoId: string, action: string, extra: Record<string, unknown> = {}): void {
        if (!action) return;
        this.actionCounts[action] = (this.actionCounts[action] || 0) + 1;

        if (action === 'app_init' || action === 'download' || action === 'bookmark_add') {
            setTimeout(() => this.flushSession(), 1000);
        } else if (this.actionCounts['view_start'] >= 10) {
            this.flushSession();
        }
    }

    // ── 播放会话追踪 ──────────────────────────────────────────────

    startSession(videoId: string): void {
        if (this.currentVideoId && this.currentVideoId !== videoId) {
            this.flushSession();
        }

        if (this.viewStartTimer) {
            clearTimeout(this.viewStartTimer);
            this.viewStartTimer = null;
        }

        this.currentVideoId = videoId;
        this.sessionStart = Date.now();

        if (!this.flushTimer) {
            this.flushTimer = setInterval(() => this.flushSession(), 15 * 60 * 1000); // 15分钟 Batch 刷写
        }
    }

    trackTimeUpdate(currentTimeSec: number): void {
        if (!this.currentVideoId || !isFinite(currentTimeSec)) return;

        const bucketKey = Math.floor(currentTimeSec / 10);
        if (!this.videoHeat[this.currentVideoId]) {
            this.videoHeat[this.currentVideoId] = { total_sec: 0, buckets: {} };
        }
        const vEntry = this.videoHeat[this.currentVideoId];
        vEntry.buckets[bucketKey] = (vEntry.buckets[bucketKey] || 0) + 1;
        vEntry.total_sec++;
        this.totalPlayedSec++;
    }

    flushSession(): void {
        const hasActions = Object.keys(this.actionCounts).length > 0;
        const hasVideoHeat = Object.keys(this.videoHeat).length > 0;
        if (!hasActions && !hasVideoHeat) return;

        const ts = Date.now();
        const dateObj = new Date(ts);
        const dateStr = dateObj.toISOString().slice(0, 10);
        const hourOfDay = dateObj.getHours();
        const sessionId = `xf_${this.anonId}_${dateStr}_${hourOfDay}`;

        const payload = {
            anon_id: this.anonId,
            session_id: sessionId,
            date: dateStr,
            ts,
            hour_of_day: hourOfDay,
            channel: this.channel,
            site_key: this.siteKey,
            version: getScriptVersion(),
            total_play_sec: this.totalPlayedSec,
            action_counts: { ...this.actionCounts },
            video_heat: { ...this.videoHeat }
        };

        // 清空内存缓冲区
        this.actionCounts = {};
        this.videoHeat = {};
        this.totalPlayedSec = 0;

        void this.postToWorker('/api/telemetry/batch', payload);
    }

    // ── 网络传输 ──────────────────────────────────────────────────

    private async postToWorker(path: string, body: object, isFallback = false): Promise<void> {
        const ts = Date.now();
        const baseUrl = isFallback ? WORKER_URL_FALLBACK : WORKER_URL_PRIMARY;

        try {
            const res = await this.runtime.http.request({
                method: 'POST',
                url: `${baseUrl}${path}`,
                headers: {
                    'Content-Type': 'application/json',
                    'X-XFlow-Token': genToken(ts),
                    'X-XFlow-Ts': String(ts),
                },
                body: JSON.stringify(body),
                timeoutMs: 8000,
            });

            if (res.status !== 200 && !isFallback) {
                await this.postToWorker(path, body, true);
            }
        } catch {
            if (!isFallback) {
                await this.postToWorker(path, body, true);
            }
        }
    }

    async fetchRecommendations(): Promise<RecommendResult> {
        const empty: RecommendResult = { rec: [], highlights: {} };

        const doRequest = async (isFallback: boolean): Promise<RecommendResult> => {
            const ts = Date.now();
            const baseUrl = isFallback ? WORKER_URL_FALLBACK : WORKER_URL_PRIMARY;

            const res = await this.runtime.http.request<RecommendResult>({
                method: 'GET',
                url: `${baseUrl}/api/recommend?anon_id=${encodeURIComponent(this.anonId)}`,
                headers: {
                    'X-XFlow-Token': genToken(ts),
                    'X-XFlow-Ts': String(ts),
                },
                responseType: 'json',
                timeoutMs: 5000,
            });

            if (res.status === 200 && res.data) {
                return res.data;
            }
            throw new Error(`recommend request failed: ${res.status}`);
        };

        try {
            return await doRequest(false);
        } catch {
            try {
                return await doRequest(true);
            } catch {
                return empty;
            }
        }
    }

    destroy(): void {
        this.flushSession();
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        if (this.viewStartTimer) {
            clearTimeout(this.viewStartTimer);
            this.viewStartTimer = null;
        }
    }
}

export const collector = new EventCollector();
