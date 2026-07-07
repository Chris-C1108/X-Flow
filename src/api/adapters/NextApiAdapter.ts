import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem } from './SiteAdapter';
import { normalizeVideoUrl } from './Helper';

export class NextApiAdapter implements SiteAdapter {
    id = 'nextapi';
    name = 'Next.js API (TwiKeep / TwiIdol)';

    private static readonly RANGE_MAP: Record<string, string> = {
        daily: '24h',
        weekly: '1w',
        monthly: '1m',
        all: '1y'
    };

    private static readonly METRIC_MAP: Record<string, string> = {
        favorite: 'likes',
        pv: 'views',
        recent: 'views'
    };

    matches(hostname: string): boolean {
        return hostname.includes('twikeep.com') || hostname.includes('twiidol.com');
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        
        const mappedRange = NextApiAdapter.RANGE_MAP[params.range || 'daily'] ?? '24h';
        const mappedMetric = NextApiAdapter.METRIC_MAP[params.sort || 'favorite'] ?? 'likes';
        const cursor = params.cursor || '0';

        let url: string;
        if (params.sort === 'recent') {
            // Use history endpoint for chronological recent downloads
            url = `${origin}/api/history?cursor=${encodeURIComponent(cursor)}`;
        } else {
            url = `${origin}/api/ranking?range=${mappedRange}&metric=${mappedMetric}&cursor=${encodeURIComponent(cursor)}`;
        }

        const res = await runtime.http.request<any>({
            method: 'GET',
            url: url,
            headers: { Accept: 'application/json' },
            responseType: 'json',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300 && res.data?.ok) {
            const rawItems = res.data.items || [];
            const posts: UnifiedVideoItem[] = rawItems.map((item: any) => {
                const tweetId = item.tweetId || item.mediaKey || String(Date.now());
                const username = item.userName || 'unknown';
                return {
                    id: tweetId,
                    url_cd: tweetId,
                    thumbnail: item.thumbnailUrl || '',
                    title: item.userDisplayName ? `${item.userDisplayName} (@${username})` : `@${username} 的视频`,
                    tweet_account: username,
                    authorDisplayName: item.userDisplayName || undefined,
                    favorite: Math.round(item.count || 0), // Next.js score
                    pv: Math.round(item.count || 0) * 10,  // Fake scale for display if raw pv missing
                    duration: 0,                           // Populated on play metadata load
                    url: normalizeVideoUrl(item.bestVideoUrl), // Direct MP4 URL!
                    isDetailsLoaded: !!item.bestVideoUrl,  // Instant load!
                    originalUrl: `https://x.com/${username}/status/${tweetId}`
                };
            });

            return {
                posts,
                nextCursor: res.data.nextCursor || '',
                hasMore: res.data.nextCursor !== null && res.data.nextCursor !== undefined && res.data.nextCursor !== ''
            };
        }

        throw new Error(`Next.js API Error: ${res.status}`);
    }

    async fetchAuthorVideos(username: string, cursor?: string): Promise<FetchListResult> {
        // TwiKeep/TwiIdol ranking API doesn't support querying specific user directly, 
        // but we can query them from their history or return empty to link directly to X.com
        return { posts: [], nextCursor: '', hasMore: false };
    }
}
