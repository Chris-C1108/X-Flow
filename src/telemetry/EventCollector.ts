/**
 * EventCollector — X-Flow 遥测埋点模块 v9.0
 *
 * 职责：
 *   1. 匿名用户 ID 生命周期管理（userscript/web 双运行时）
 *   2. 交互事件上报（下载、收藏、倍速、作者面板、批量复制、PiP、频道切换）
 *   3. 播放时间轴 10s 分桶热度收集
 *   4. 1小时定期 / 页面卸载 统一 Batch 上报 (POST /api/telemetry/unified)
 */

import { getRuntimeAdapter } from '../runtime';
import type { RuntimeAdapter } from '../runtime/adapter';

// ── 配置 ──────────────────────────────────────────────────────────
const WORKER_URL_PRIMARY  = 'https://telemetry.x-flow.ccwu.cc';
const WORKER_URL_FALLBACK = 'https://xflow-telemetry.chen-m1108.workers.dev';
const TOKEN_SALT          = 'XFLOW_v6_SECRET';
const ANON_ID_STORAGE_KEY = 'xflow_anon_id_v1';
const CACHE_STORAGE_KEY   = 'xflow_telemetry_cache_v3';
const ONE_HOUR_MS         = 60 * 60 * 1000;
const MIN_FLUSH_INTERVAL_MS = 15 * 60 * 1000;

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
    } catch (_) {
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
    return '6.3.3';
};

interface TelemetryCache {
    totalPlayedSec: number;
    actionCounts: Record<string, number>;
    videoHeat: Record<string, { total_sec: number; buckets: Record<string, number> }>;
    lastFlushTs: number;
}

export class EventCollector {
    private readonly runtime: RuntimeAdapter;
    private anonId: string;
    private channel: 'real' | 'anime' = 'real';
    private siteKey: string = '';
    private currentAuthorId: string = '';
    private currentVideoId: string = '';

    private actionCounts: Record<string, number> = {};
    private videoHeat: Record<string, { total_sec: number; buckets: Record<string, number> }> = {};
    private totalPlayedSec: number = 0;
    private lastFlushTs: number = 0;

    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private viewStartTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(runtime: RuntimeAdapter = getRuntimeAdapter()) {
        this.runtime = runtime;
        this.anonId = getOrCreateAnonId(runtime);
        this.loadCache();

        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flushSession(true));
            window.addEventListener('pagehide', () => this.flushSession(true));
        }
    }

    private loadCache(): void {
        try {
            const raw = this.runtime.storage.get<TelemetryCache | string>(CACHE_STORAGE_KEY, '');
            let cache: TelemetryCache | null = null;
            if (typeof raw === 'string' && raw) {
                cache = JSON.parse(raw);
            } else if (typeof raw === 'object' && raw) {
                cache = raw as TelemetryCache;
            }
            if (cache) {
                this.totalPlayedSec = cache.totalPlayedSec || 0;
                this.actionCounts = cache.actionCounts || {};
                this.videoHeat = cache.videoHeat || {};
                this.lastFlushTs = cache.lastFlushTs || 0;
            }
        } catch (_) {}
    }

    private saveCache(): void {
        try {
            this.runtime.storage.set(CACHE_STORAGE_KEY, JSON.stringify({
                totalPlayedSec: this.totalPlayedSec,
                actionCounts: this.actionCounts,
                videoHeat: this.videoHeat,
                lastFlushTs: this.lastFlushTs
            }));
        } catch (_) {}
    }

    private clearCache(): void {
        this.actionCounts = {};
        this.videoHeat = {};
        this.totalPlayedSec = 0;
        this.lastFlushTs = Date.now();
        this.saveCache();
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

    private sendInteract(_videoId: string, action: string, _extra: Record<string, unknown> = {}): void {
        if (!action) return;
        this.actionCounts[action] = (this.actionCounts[action] || 0) + 1;
        this.saveCache();
        this.checkPeriodicFlush();
    }

    // ── 播放会话追踪 ──────────────────────────────────────────────

    startSession(videoId: string): void {
        if (this.viewStartTimer) {
            clearTimeout(this.viewStartTimer);
            this.viewStartTimer = null;
        }

        this.currentVideoId = videoId;
        if (!this.flushTimer) {
            this.flushTimer = setInterval(() => this.checkPeriodicFlush(), 15 * 60 * 1000);
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
        this.saveCache();
    }

    private checkPeriodicFlush(): void {
        const now = Date.now();
        if (now - this.lastFlushTs >= ONE_HOUR_MS) {
            this.flushSession(false);
        }
    }

    flushSession(isForce: boolean = false): void {
        const hasActions = Object.keys(this.actionCounts).length > 0;
        const hasVideoHeat = Object.keys(this.videoHeat).length > 0;
        if (!hasActions && !hasVideoHeat && this.totalPlayedSec === 0) return;

        const now = Date.now();
        if (!isForce && now - this.lastFlushTs < ONE_HOUR_MS) return;
        if (isForce && now - this.lastFlushTs < MIN_FLUSH_INTERVAL_MS && this.totalPlayedSec < 30) return;

        const ts = Date.now();
        const dateObj = new Date(ts);
        const dateStr = dateObj.toISOString().slice(0, 10);
        const hourOfDay = dateObj.getHours();
        const sessionId = `xf_${this.anonId}_${dateStr}_${hourOfDay}`;

        const payload = {
            app_id: 'xflow',
            user_id: this.anonId,
            session_id: sessionId,
            date: dateStr,
            ts,
            hour_of_day: hourOfDay,
            site_key: this.siteKey,
            site_category: this.channel,
            version: getScriptVersion(),
            device_type: 'PC_Landscape',
            total_play_sec: this.totalPlayedSec,
            event_counts: { ...this.actionCounts },
            video_heat: { ...this.videoHeat }
        };

        this.clearCache();
        void this.postToWorker('/api/telemetry/unified', payload);
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
                    'X-Telemetry-Token': genToken(ts),
                    'X-Telemetry-Ts': String(ts),
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

    destroy(): void {
        this.flushSession(true);
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
