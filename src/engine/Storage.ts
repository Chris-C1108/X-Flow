/**
 * 持久化存储 — localStorage + GM_setValue 双通道
 */
export const STORAGE_KEYS = {
    WATCHED: 'xflow_watched_videos_v5',
    UNREAD_ONLY: 'xflow_unread_only',
    LOOP: 'xflow_loop',
    BOOKMARKS: 'xflow_bookmarks_v1',
    BOOKMARKS_V2: 'xflow_bookmarks_v2',
    DOWNLOADED: 'xflow_downloaded_v1',
    LIKES: 'xflow_likes_v1',
    VOLUME: 'xflow_volume',
    PLAYBACK_RATE: 'xflow_playback_rate',
};

export interface BookmarkItem {
    bookmarkTime: number;         // 收藏时间
    authorId: string;             // X博主ID (tweet_account)
    videoUrl: string;             // 时评链接 (originalUrl)
    tweetTitle: string;           // 推文标题 (title)
    currentRankingSite: string;   // 当前排行榜站点
    
    // Additional fields for rendering and player compatibility:
    id: string;
    url_cd: string;
    thumbnail: string;
    duration: number;
    url: string;
    pv: number;
}

/** localStorage 读写（单域）*/
export function loadJSON(key: string, fallback: any) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
export function saveJSON(key: string, value: any) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { } }

/** GM_setValue 读写（跨域共享：real/anime 两域共用）*/
export function loadGM(key: string, fallback: any): any {
    try {
        const raw = GM_getValue(key, '');
        return raw ? JSON.parse(raw as string) : fallback;
    } catch { return fallback; }
}
export function saveGM(key: string, value: any): void {
    try { GM_setValue(key, JSON.stringify(value)); } catch { }
}
