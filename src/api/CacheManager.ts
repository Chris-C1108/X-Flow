import { log } from '../utils/Logger';

export interface QueryState {
    isAnimeOnly: boolean;
    range: string;
    sort: string;
    category?: string;
    perPage?: number;
    [key: string]: any;
}

export interface CacheEntry {
    items: any[];
    nextCursor: string;
    hasMore: boolean;
    updatedAt: number;
}

const DEFAULT_TTL = 5 * 60_000; // 5 minutes

export class CacheManager {
    private store = new Map<string, CacheEntry>();

    public makeKey(q: QueryState): string {
        const parts = [
            q.isAnimeOnly ? '1' : '0',
            q.range || 'daily',
            q.sort || 'favorite',
            q.category || '',
            q.perPage ?? 50,
        ];

        // Safely append any extra filter parameters in alphabetical order
        const extraKeys = Object.keys(q).filter(k => 
            k !== 'isAnimeOnly' && k !== 'range' && k !== 'sort' && 
            k !== 'category' && k !== 'perPage'
        ).sort();

        extraKeys.forEach(k => {
            if (q[k] !== undefined && q[k] !== null) {
                parts.push(`${k}:${q[k]}`);
            }
        });

        return parts.join('|');
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
        log(`Cache SET: ${key} (${entry.items.length} items, nextCursor=${entry.nextCursor})`);
        this.store.set(key, { ...entry, updatedAt: Date.now() });
    }

    public hasFresh(q: QueryState, ttlMs?: number): boolean {
        return !!this.get(q, ttlMs);
    }
}
