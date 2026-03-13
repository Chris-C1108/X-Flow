/**
 * IndexedDB/LocalStorage 持久�? */
export const STORAGE_KEYS = { WATCHED: 'xflow_watched_videos_v5', UNREAD_ONLY: 'xflow_unread_only', LOOP: 'xflow_loop', BOOKMARKS: 'xflow_bookmarks_v1', VOLUME: 'xflow_volume' };
export function loadJSON(key: string, fallback: any) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
export function saveJSON(key: string, value: any) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { } }
