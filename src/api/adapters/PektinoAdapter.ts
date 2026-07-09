import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem, FilterGroup, HeroRange } from './SiteAdapter';
import { normalizeVideoUrl } from './Helper';

export class PektinoAdapter implements SiteAdapter {
    id = 'pektino';
    name = 'Pektino (Next.js API)';

    private static readonly RANGE_MAP: Record<string, string> = {
        daily: '',
        weekly: 'weekly',
        monthly: 'monthly',
        all: 'all'
    };

    matches(hostname: string): boolean {
        return hostname.includes('pektino.com') ||
               hostname.includes('x-ero-anime.com') ||
               hostname.includes('truvaze.com') ||
               hostname.includes('twitter-ero-video-ranking.com');
    }

    getFilterGroups(isAnime: boolean): FilterGroup[] {
        return [
            {
                id: 'range',
                title: '范围 Range',
                type: 'range',
                options: [
                    { id: 'daily', label: '24小时', en: '24 Hours' },
                    { id: 'weekly', label: '周榜', en: 'Weekly' },
                    { id: 'monthly', label: '月榜', en: 'Monthly' },
                    { id: 'all', label: '总榜', en: 'All Time' }
                ]
            },
            {
                id: 'sort',
                title: '排序 Sort',
                type: 'sort',
                options: [
                    { id: 'favorite', label: '按点赞', en: 'Likes' },
                    { id: 'pv', label: '按观看数', en: 'Views' },
                    { id: 'time', label: '按时长', en: 'Duration' },
                    { id: 'created', label: '最近添加', en: 'Recently Added' }
                ]
            },
            {
                id: 'duration',
                title: '时长 Duration',
                type: 'tag',
                options: [
                    { id: '0,0', label: '全部', en: 'All' },
                    { id: '0,300', label: '0-5分钟', en: '0-5 min' },
                    { id: '300,900', label: '5-15分钟', en: '5-15 min' },
                    { id: '900,1800', label: '15-30分钟', en: '15-30 min' },
                    { id: '1800,3600', label: '30分钟-1小时', en: '30 min - 1 hr' },
                    { id: '3600,0', label: '1小时以上', en: 'Over 1 hr' }
                ]
            }
        ];
    }

    getHeroRanges(isAnime: boolean): HeroRange[] {
        return [
            { id: 'daily', label: '24小时', en: '24 Hours', icon: '⏱' },
            { id: 'weekly', label: '周榜', en: 'Weekly', icon: '📅' },
            { id: 'monthly', label: '月榜', en: 'Monthly', icon: '🗓' },
            { id: 'all', label: '总榜', en: 'All Time', icon: '🏆' }
        ];
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        
        const mappedRange = PektinoAdapter.RANGE_MAP[params.range || 'daily'] ?? '';
        const page = params.cursor || '1';
        const perPage = params.per_page || 50;

        const url = new URL('/api/media', origin);
        url.searchParams.append('page', page);
        url.searchParams.append('per_page', String(perPage));
        url.searchParams.append('isAnimeOnly', isAnime ? '1' : '0');
        
        if (mappedRange !== '') {
            url.searchParams.append('range', mappedRange);
        }
        
        if (params.sort) {
            url.searchParams.append('sort', params.sort);
        }

        // Apply duration filter
        if (params.duration && params.duration !== '0,0') {
            const [minTime, maxTime] = params.duration.split(',').map(Number);
            if (minTime > 0) {
                url.searchParams.append('min_time', String(minTime));
            }
            if (maxTime > 0) {
                url.searchParams.append('max_time', String(maxTime));
            }
        }

        const res = await runtime.http.request<any>({
            method: 'GET',
            url: url.toString(),
            headers: { Accept: 'application/json' },
            responseType: 'json',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300 && res.data) {
            const rawItems = res.data.items || [];
            const currentPage = Number(res.data.currentPage || 1);
            const lastPage = Number(res.data.lastPage || 1);

            const posts: UnifiedVideoItem[] = rawItems.map((item: any) => {
                const urlCd = String(item.url_cd || item.id);
                return {
                    id: urlCd,
                    url_cd: urlCd,
                    thumbnail: item.thumbnail || '',
                    title: item.anime_title || (item.tweet_account ? `@${item.tweet_account} 的视频` : '免费视频'),
                    tweet_account: item.tweet_account || 'unknown',
                    favorite: Math.round(Number(item.favorite || 0)),
                    pv: Math.round(Number(item.pv || 0)),
                    duration: Math.round(Number(item.time || 0)),
                    url: normalizeVideoUrl(item.url),
                    isDetailsLoaded: !!item.url, // Instant play since CDN URL is in response
                    originalUrl: item.tweet_url || `https://x.com/i/status/${urlCd}`
                };
            });

            return {
                posts,
                nextCursor: String(currentPage + 1),
                hasMore: currentPage < lastPage
            };
        }

        throw new Error(`Pektino API Error: ${res.status}`);
    }

    async fetchAuthorVideos(username: string, cursor?: string): Promise<FetchListResult> {
        return { posts: [], nextCursor: '', hasMore: false };
    }
}
