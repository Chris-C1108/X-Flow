/**
 * EventCollector — X-Flow 遥测埋点模块
 *
 * 职责：
 *   1. 匿名用户 ID 生命周期管理（userscript/web 双运行时）
 *   2. 低频精准事件上报（点赞、下载、收藏）
 *   3. 播放时间轴 bucket 收集（10s 粒度），30s 防抖批量发送
 *   4. 从 Workers API 拉取个人推荐与高光时刻
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

function createAnonId(): string {
    return 'xf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function getOrCreateAnonId(runtime: RuntimeAdapter): string {
    const existing = runtime.storage.get<string>(ANON_ID_STORAGE_KEY, '');
    if (existing) return existing;

    const newId = createAnonId();
    runtime.storage.set(ANON_ID_STORAGE_KEY, newId);
    return newId;
}

export class EventCollector {
    private readonly runtime: RuntimeAdapter;
    private anonId: string;
    private channel: 'real' | 'anime' = 'real';

    private currentVideoId: string = '';
    private sessionStart: number = 0;
    private playBuckets: Record<number, number> = {};
    private totalPlayedSec: number = 0;

    private flushTimer: ReturnType<typeof setInterval> | null = null;

    private lastInteractVideo: string = '';
    private lastInteractTs: number = 0;

    constructor(runtime: RuntimeAdapter = getRuntimeAdapter()) {
        this.runtime = runtime;
        this.anonId = getOrCreateAnonId(runtime);
    }

    setChannel(isAnime: boolean): void {
        this.channel = isAnime ? 'anime' : 'real';
    }

    getAnonId(): string {
        return this.anonId;
    }

    trackLike(videoId: string): void {
        this.sendInteract(videoId, 'like');
    }

    trackDownload(videoId: string): void {
        this.sendInteract(videoId, 'download');
    }

    trackBookmark(videoId: string, isAdding: boolean): void {
        this.sendInteract(videoId, isAdding ? 'bookmark_add' : 'bookmark_remove');
    }

    trackViewStart(videoId: string): void {
        if (videoId === this.lastInteractVideo && Date.now() - this.lastInteractTs < 5000) return;
        this.sendInteract(videoId, 'view_start');
    }

    private sendInteract(videoId: string, action: string): void {
        this.lastInteractVideo = videoId;
        this.lastInteractTs = Date.now();

        void this.postToWorker('/api/telemetry/interact', {
            anon_id: this.anonId,
            video_id: videoId,
            action,
            ts: this.lastInteractTs,
            hour_of_day: new Date().getHours(),
            channel: this.channel,
        });
    }

    startSession(videoId: string): void {
        this.flushSession();

        this.currentVideoId = videoId;
        this.sessionStart = Date.now();
        this.playBuckets = {};
        this.totalPlayedSec = 0;

        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => this.flushSession(), 30_000);
    }

    trackTimeUpdate(currentTimeSec: number, duration: number): void {
        if (!this.currentVideoId || !isFinite(currentTimeSec)) return;

        const bucketKey = Math.floor(currentTimeSec / 10);
        this.playBuckets[bucketKey] = (this.playBuckets[bucketKey] || 0) + 1;
        this.totalPlayedSec++;
    }

    flushSession(): void {
        if (!this.currentVideoId || Object.keys(this.playBuckets).length === 0) return;

        const duration = Math.round((Date.now() - this.sessionStart) / 1000);
        void this.postToWorker('/api/telemetry/session', {
            anon_id: this.anonId,
            video_id: this.currentVideoId,
            session_ts: this.sessionStart,
            duration,
            played_sec: this.totalPlayedSec,
            buckets: this.playBuckets,
            channel: this.channel,
        });

        this.playBuckets = {};
        this.totalPlayedSec = 0;
        this.currentVideoId = '';
    }

    private async postToWorker(path: string, body: object, isFallback = false): Promise<void> {
        const ts = Date.now();
        let baseUrl: string;
        if (this.runtime.env.mode === 'web') {
            baseUrl = window.location.origin;
        } else {
            baseUrl = isFallback ? WORKER_URL_FALLBACK : WORKER_URL_PRIMARY;
        }

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

            if (res.status !== 200 && !isFallback && this.runtime.env.mode !== 'web') {
                await this.postToWorker(path, body, true);
            }
        } catch {
            if (!isFallback && this.runtime.env.mode !== 'web') {
                await this.postToWorker(path, body, true);
            }
        }
    }

    async fetchRecommendations(): Promise<RecommendResult> {
        const empty: RecommendResult = { rec: [], highlights: {} };

        const doRequest = async (isFallback: boolean): Promise<RecommendResult> => {
            const ts = Date.now();
            let baseUrl: string;
            if (this.runtime.env.mode === 'web') {
                baseUrl = window.location.origin;
            } else {
                baseUrl = isFallback ? WORKER_URL_FALLBACK : WORKER_URL_PRIMARY;
            }

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
            if (this.runtime.env.mode === 'web') return empty;
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
    }
}

export const collector = new EventCollector();
