import { log } from '../utils/Logger';
import { getRuntimeAdapter } from '../runtime';

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
const STORAGE_CACHE_PREFIX = 'xflow_cache_v3_';

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
        
        // 1. Try memory cache first
        let entry = this.store.get(key);
        
        // 2. Try persistent cache fallback
        if (!entry) {
            try {
                const runtime = getRuntimeAdapter();
                entry = runtime.storage.get<CacheEntry | null>(STORAGE_CACHE_PREFIX + key, null);
                if (entry) {
                    log(`CacheManager: Storage HIT for ${key}`);
                    this.store.set(key, entry);
                }
            } catch (err) {
                log(`CacheManager: Failed to read persistent cache: ${err}`);
            }
        }

        if (!entry) return null;

        // Expiration check
        if (Date.now() - entry.updatedAt > ttlMs) {
            log(`CacheManager: Cache expired for ${key}`);
            this.delete(q);
            return null;
        }
        return entry;
    }

    public set(q: QueryState, entry: CacheEntry): void {
        const key = this.makeKey(q);
        const newEntry = { ...entry, updatedAt: Date.now() };
        
        // Update memory
        this.store.set(key, newEntry);
        
        // Update persistent storage
        try {
            const runtime = getRuntimeAdapter();
            runtime.storage.set(STORAGE_CACHE_PREFIX + key, newEntry);
            log(`CacheManager: Persisted cache for ${key} (${entry.items.length} items)`);
        } catch (err) {
            log(`CacheManager: Failed to write persistent cache: ${err}`);
        }
    }

    public delete(q: QueryState): void {
        const key = this.makeKey(q);
        this.store.delete(key);
        try {
            const runtime = getRuntimeAdapter();
            runtime.storage.set(STORAGE_CACHE_PREFIX + key, null);
        } catch (_) {}
    }

    public hasFresh(q: QueryState, ttlMs?: number): boolean {
        return !!this.get(q, ttlMs);
    }
}
