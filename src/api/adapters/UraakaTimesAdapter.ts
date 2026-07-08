import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem, FilterGroup, HeroRange } from './SiteAdapter';
import { normalizeVideoUrl } from './Helper';

interface UraakaTweet {
    tweet_id: string;
    twitter_id: string;
    tweet: string;
    posted_text: string;
    tweet_time: string;
    views: number;
    favorite: number;
    seo_title: string | null;
    is_super_promoted: boolean;
    myfans_promote?: boolean;
    user: {
        twitter_id: string;
        twitter_name: string;
        user_thumbnail: string;
    };
    video: Array<{
        video_link: string;
        video_webp: string;
        video_thumbnail: string;
    }>;
    tags: Array<{ tag_name: string }>;
}

/**
 * 裏垢タイムズ (uraaka-times.com) Adapter
 * 
 * Public REST API: GET /api/tweets?sort={new|popular|recommend}&page={n}&limit={n}
 * Returns JSON array of tweet objects with direct video.twimg.com MP4 links.
 * 
 * Ad filtering: promoted items have non-numeric tweet_id (e.g. "promoted_10"),
 * is_super_promoted=true, or video_link pointing to mfcdn.jp / r2.dev instead of twimg.
 */
export class UraakaTimesAdapter implements SiteAdapter {
    id = 'uraaka-times';
    name = '裏垢タイムズ (REST API)';

    private static readonly SORT_MAP: Record<string, string> = {
        daily: 'popular',
        weekly: 'popular',
        monthly: 'popular',
        all: 'popular',
        new: 'new',
        popular: 'popular',
        recommend: 'recommend',
        favorite: 'popular',
        pv: 'popular'
    };

    matches(hostname: string): boolean {
        return hostname.includes('uraaka-times.com');
    }

    getFilterGroups(_isAnime: boolean): FilterGroup[] {
        return [
            {
                id: 'sort',
                title: '排序 Sort',
                type: 'sort',
                options: [
                    { id: 'popular', label: '人気', en: 'Popular' },
                    { id: 'new', label: '最新', en: 'Latest' },
                    { id: 'recommend', label: 'おすすめ', en: 'Recommend' }
                ]
            }
        ];
    }

    getHeroRanges(_isAnime: boolean): HeroRange[] {
        return []; // No time-range based rankings on this site
    }

    async fetchList(params: FetchParams, _isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;

        const sortKey = params.sort || params.range || 'new';
        const sort = UraakaTimesAdapter.SORT_MAP[sortKey] ?? 'new';
        const page = params.cursor || '1';
        const limit = String(params.per_page || 50);

        const url = `${origin}/api/tweets?sort=${sort}&page=${page}&limit=${limit}`;

        const res = await runtime.http.request<UraakaTweet[]>({
            method: 'GET',
            url: url,
            headers: { Accept: 'application/json' },
            responseType: 'json',
            timeoutMs: 10000,
        });

        if (res.status >= 200 && res.status < 300) {
            const rawItems: UraakaTweet[] = Array.isArray(res.data) ? res.data : [];

            const posts: UnifiedVideoItem[] = rawItems
                .filter(item => {
                    // Must have a video array with at least one entry
                    if (!item.video || item.video.length === 0) return false;
                    // Filter promoted/ad items: tweet_id must be purely numeric
                    if (!/^\d+$/.test(String(item.tweet_id))) return false;
                    // Filter promoted flags
                    if (item.is_super_promoted || item.myfans_promote) return false;
                    // Only keep video.twimg.com sources (skip MyFans HLS / R2 ads)
                    const videoLink = item.video[0].video_link || '';
                    if (!videoLink.includes('video.twimg.com')) return false;
                    return true;
                })
                .map(item => {
                    const vid = item.video[0];
                    const title = item.seo_title
                        || (item.tweet && item.tweet.length > 120
                            ? item.tweet.substring(0, 120) + '...'
                            : item.tweet)
                        || `@${item.twitter_id}`;

                    return {
                        id: String(item.tweet_id),
                        url_cd: String(item.tweet_id),
                        thumbnail: vid.video_thumbnail || '',
                        title: title,
                        tweet_account: item.user?.twitter_id || item.twitter_id || 'unknown',
                        authorDisplayName: item.user?.twitter_name,
                        favorite: item.favorite || 0,
                        pv: item.views || 0,
                        duration: 0,
                        url: normalizeVideoUrl(vid.video_link),
                        isDetailsLoaded: true, // Direct MP4 link, no lazy resolution needed
                        originalUrl: `https://x.com/${item.twitter_id}/status/${item.tweet_id}`
                    };
                });

            const nextPage = String(parseInt(page) + 1);
            return {
                posts,
                nextCursor: nextPage,
                hasMore: rawItems.length >= parseInt(limit)
            };
        }

        throw new Error(`UraakaTimes API Error: ${res.status}`);
    }

    async fetchAuthorVideos(_username: string, _cursor?: string): Promise<FetchListResult> {
        // Author-specific API not available on uraaka-times.com
        // Falls back to opening X.com profile via originalUrl
        return { posts: [], nextCursor: '', hasMore: false };
    }
}
