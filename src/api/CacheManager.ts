import { log } from '../utils/Logger';

export interface QueryState {
    isAnimeOnly: boolean;
    range: string;
    sort: string;
    category?: string;
    perPage?: number;
}

export interface CacheEntry {
    items: any[];
    nextPage: number;
    hasMore: boolean;
    updatedAt: number;
}

const DEFAULT_TTL = 5 * 60_000; // 5 minutes

export class CacheManager {
    private store = new Map<string, CacheEntry>();

    public makeKey(q: QueryState): string {
        return [
            q.isAnimeOnly ? 1 : 0,
            q.range || 'daily',
            q.sort || 'favorite',
        ].join('|');
    }

    public get(q: QueryState, ttlMs: number = DEFAULT_TTL): CacheEntry | null {
        const key = this.makeKey(q);
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() - entry.updatedAt > ttlMs) {
            this.store.delete(key);
            return null;
        }
        return entry;
    }

    public set(q: QueryState, entry: CacheEntry): void {
        const key = this.makeKey(q);
        log(`Cache SET: ${key} (${entry.items.length} items, nextPage=${entry.nextPage})`);
        this.store.set(key, { ...entry, updatedAt: Date.now() });
    }

    public hasFresh(q: QueryState, ttlMs?: number): boolean {
        return !!this.get(q, ttlMs);
    }
}
