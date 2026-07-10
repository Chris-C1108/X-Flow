import { loadJSON, saveJSON } from './Storage';

interface ProgressItem {
    time: number;       // 上次播放的 currentTime (秒)
    duration: number;   // 视频总时长
    updatedAt: number;  // 上次观看的时间戳（用于 LRU 和过期判断）
}

export class ProgressManager {
    private static instance: ProgressManager;
    private cache: Map<string, ProgressItem> = new Map();
    private readonly STORAGE_KEY = 'xflow_play_progress_lru';
    private readonly MAX_ENTRIES = 200;
    private readonly TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

    private constructor() {
        this.loadFromStorage();
    }

    public static getInstance(): ProgressManager {
        if (!ProgressManager.instance) {
            ProgressManager.instance = new ProgressManager();
        }
        return ProgressManager.instance;
    }

    private loadFromStorage() {
        const raw = loadJSON(this.STORAGE_KEY, {});
        const now = Date.now();
        for (const [id, item] of Object.entries(raw)) {
            const pItem = item as ProgressItem;
            // 过滤掉超过 7 天的记录
            if (now - pItem.updatedAt < this.TTL_MS) {
                this.cache.set(id, pItem);
            }
        }
    }

    private saveToStorage() {
        const obj: Record<string, ProgressItem> = {};
        for (const [id, item] of this.cache.entries()) {
            obj[id] = item;
        }
        saveJSON(this.STORAGE_KEY, obj);
    }

    private saveTimer: any = null;

    /**
     * 保存视频进度
     * @param immediate 是否立即写入 localStorage (暂停/切视频时传 true)
     */
    public saveProgress(videoId: string, time: number, duration: number, immediate = false) {
        if (!videoId || time <= 0 || !duration) return;

        // 如果进度已经播放到最后 2 秒内，视为已看完，清除该记录
        if (duration - time < 2) {
            this.clearProgress(videoId);
            return;
        }

        // LRU 驱逐：如果已经达到上限且是个新视频，先删除最久未观看的记录
        if (!this.cache.has(videoId) && this.cache.size >= this.MAX_ENTRIES) {
            let oldestId: string | null = null;
            let oldestTime = Infinity;

            for (const [id, item] of this.cache.entries()) {
                if (item.updatedAt < oldestTime) {
                    oldestTime = item.updatedAt;
                    oldestId = id;
                }
            }

            if (oldestId) {
                this.cache.delete(oldestId);
            }
        }

        this.cache.set(videoId, {
            time,
            duration,
            updatedAt: Date.now()
        });

        if (immediate) {
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
                this.saveTimer = null;
            }
            this.saveToStorage();
        } else {
            if (!this.saveTimer) {
                this.saveTimer = setTimeout(() => {
                    this.saveToStorage();
                    this.saveTimer = null;
                }, 2000); // 2秒节流写入
            }
        }
    }

    /**
     * 获取视频进度
     */
    public getProgress(videoId: string): number {
        const item = this.cache.get(videoId);
        if (!item) return 0;

        // 每次读取时更新 updatedAt，使其在 LRU 算法中置顶
        item.updatedAt = Date.now();
        this.saveToStorage();
        return item.time;
    }

    /**
     * 获取完整的进度项（包含总时长）
     */
    public getProgressItem(videoId: string): ProgressItem | undefined {
        const item = this.cache.get(videoId);
        if (!item) return undefined;

        item.updatedAt = Date.now();
        this.saveToStorage();
        return item;
    }

    /**
     * 清除单个视频进度
     */
    public clearProgress(videoId: string) {
        if (this.cache.delete(videoId)) {
            this.saveToStorage();
        }
    }
}
