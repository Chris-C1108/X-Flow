import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem, FilterGroup, HeroRange } from './SiteAdapter';
import { parseDuration, parseViews } from './Helper';

export class XHotVideoAdapter implements SiteAdapter {
    id = 'xhotvideo';
    name = 'XHotVideo (HTML Scraper)';

    private static readonly RANGE_MAP: Record<string, string> = {
        daily: 'day',
        weekly: 'week',
        monthly: 'month',
        all: 'total',
        day: 'day',
        week: 'week',
        month: 'month',
        total: 'total'
    };

    matches(hostname: string): boolean {
        return hostname.includes('xhotvideo.com');
    }

    getFilterGroups(isAnime: boolean): FilterGroup[] {
        return [
            {
                id: 'range',
                title: '榜单 Period',
                type: 'range',
                options: [
                    { id: 'day', label: '今日热门', en: 'Daily' },
                    { id: 'week', label: '本周热门', en: 'Weekly' },
                    { id: 'month', label: '本月热门', en: 'Monthly' },
                    { id: 'all', label: '全部热门', en: 'All-Time' },
                    { id: 'total', label: '总热门', en: 'Total' }
                ]
            },
            {
                id: 'sort',
                title: '排序 Sort',
                type: 'sort',
                options: [
                    { id: 'views', label: '播放最多' },
                    { id: 'new', label: '最新发布' },
                    { id: 'duration', label: '时长最长' }
                ]
            },
            {
                id: 'duration',
                title: '时长 Duration',
                type: 'duration',
                options: [
                    { id: 'all', label: '全部时长' },
                    { id: 'short', label: '5 分钟内' },
                    { id: 'medium', label: '5-30 分钟' },
                    { id: 'long', label: '30 分钟以上' }
                ]
            },
            {
                id: 'tag',
                title: '标签 Tags',
                type: 'tag',
                options: [
                    { id: 'all', label: '全部标签' },
                    { id: 'anime', label: '动漫二次元' },
                    { id: 'jk', label: '女高中生' },
                    { id: 'kyonyu', label: '丰满胸部' },
                    { id: 'lolita', label: '少女萝莉' },
                    { id: 'shaved', label: '光滑白虎' },
                    { id: 'beautiful-girl', label: '美少女' },
                    { id: 'hamedori', label: '真实自拍' }
                ]
            }
        ];
    }

    getHeroRanges(isAnime: boolean): HeroRange[] {
        return [
            { id: 'day', label: '今日热门', en: 'Daily', icon: '⏱' },
            { id: 'week', label: '本周热门', en: 'Weekly', icon: '📅' },
            { id: 'month', label: '本月热门', en: 'Monthly', icon: '🗓' },
            { id: 'total', label: '总热门', en: 'Total', icon: '🏆' }
        ];
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        
        const page = params.cursor || '1';
        let path = '/videos';

        const tag = params.tag;
        const duration = params.duration;
        const sortKey = params.sort;
        const rangeKey = params.range;

        if (tag && tag !== 'all') {
            path = `/videos/tag/${tag}/page/${page}`;
        } else if (duration && duration !== 'all') {
            path = `/videos/duration/${duration}/page/${page}`;
        } else if (sortKey && sortKey !== 'views' && sortKey !== 'favorite' && sortKey !== 'pv') {
            path = `/videos/sort/${sortKey}/page/${page}`;
        } else if (rangeKey && rangeKey !== 'all') {
            const mappedRange = XHotVideoAdapter.RANGE_MAP[rangeKey] ?? rangeKey;
            if (mappedRange && mappedRange !== 'total') {
                path = `/videos/period/${mappedRange}/page/${page}`;
            } else {
                path = `/videos/page/${page}`;
            }
        } else {
            // Check default maps (from carousel or standard filters)
            if (sortKey === 'recent' || sortKey === 'new') {
                path = `/videos/sort/new/page/${page}`;
            } else if (rangeKey === 'daily' || rangeKey === 'day') {
                path = `/videos/period/day/page/${page}`;
            } else if (rangeKey === 'weekly' || rangeKey === 'week') {
                path = `/videos/period/week/page/${page}`;
            } else if (rangeKey === 'monthly' || rangeKey === 'month') {
                path = `/videos/period/month/page/${page}`;
            } else {
                path = `/videos/page/${page}`;
            }
        }

        const res = await runtime.http.request<string>({
            method: 'GET',
            url: `${origin}${path}`,
            headers: { Accept: 'text/html' },
            responseType: 'text',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300) {
            const doc = new DOMParser().parseFromString(res.text, 'text/html');
            const cards = doc.querySelectorAll('a.video-card');
            
            const posts: UnifiedVideoItem[] = [];
            cards.forEach(card => {
                const href = card.getAttribute('href') || '';
                const id = href.replace('/video/', '');
                if (!id) return;

                const img = card.querySelector('.thumb img');
                const thumb = img?.getAttribute('src') || '';
                
                const durationEl = card.querySelector('.thumb .duration');
                const durationStr = durationEl?.textContent?.trim() || '';
                const duration = parseDuration(durationStr);

                const titleEl = card.querySelector('.card-title');
                const title = titleEl?.textContent?.trim() || id;

                const metaEl = card.querySelector('.card-meta');
                const metaStr = metaEl?.textContent?.trim() || '';
                const pv = parseViews(metaStr);

                posts.push({
                    id,
                    url_cd: id,
                    thumbnail: thumb,
                    title,
                    tweet_account: 'unknown',
                    favorite: 0,
                    pv,
                    duration,
                    url: '', // Resolved lazy on detail load
                    isDetailsLoaded: false,
                    originalUrl: `https://xhotvideo.com/video/${id}`
                });
            });

            const nextPage = String(parseInt(page) + 1);
            return {
                posts,
                nextCursor: nextPage,
                hasMore: posts.length > 0
            };
        }

        throw new Error(`XHotVideo Scrape Error: ${res.status}`);
    }

    async fetchDetailHtml(postId: string): Promise<string> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        const url = `${origin}/video/${postId}`;

        const res = await runtime.http.request<string>({
            method: 'GET',
            url: url,
            headers: { Accept: 'text/html' },
            responseType: 'text',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300) {
            return res.text;
        }
        throw new Error(`Detail HTML error for ${postId}: ${res.status}`);
    }

    parseDetailHtml(html: string): { title?: string; tweetAccount?: string; videoPath?: string } {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const playerSource = doc.querySelector('video#mainPlayer source');
        const downloadAction = doc.querySelector('a.download-action');
        const videoPath = playerSource?.getAttribute('src') || downloadAction?.getAttribute('href') || '';
        
        const titleEl = doc.querySelector('h1') || doc.querySelector('.card-title');
        const title = titleEl?.textContent?.trim() || '';

        return {
            title,
            tweetAccount: 'unknown',
            videoPath
        };
    }

    async resolveVideoUrl(videoPath: string): Promise<string> {
        return videoPath;
    }
}
