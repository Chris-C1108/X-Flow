import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem, FilterGroup, HeroRange } from './SiteAdapter';
import { parseTwitterHandleFromUrl, normalizeVideoUrl } from './Helper';

export class TwiigleAdapter implements SiteAdapter {
    id = 'twiigle';
    name = 'Twiigle (HTML Scraper)';

    private static readonly RANGE_MAP: Record<string, string> = {
        daily: 'index',
        weekly: '1w',
        monthly: '3d',
        all: 'best'
    };

    matches(hostname: string): boolean {
        return hostname.includes('twiigle.com');
    }

    getFilterGroups(isAnime: boolean): FilterGroup[] {
        return [
            {
                id: 'category',
                title: '分类 Category',
                type: 'category',
                options: [
                    { id: 'index', label: '24小时', en: '24 Hours' },
                    { id: '1w', label: '周榜', en: 'Weekly' },
                    { id: 'realtime', label: '实时', en: 'Realtime' },
                    { id: 'realtime2', label: '随机', en: 'Random' },
                    { id: 'popular', label: 'AV1', en: 'AV1' },
                    { id: 'trend', label: 'AV2', en: 'AV2' },
                    { id: 'new', label: '角色扮演', en: 'Cosplay' },
                    { id: 'best', label: '明星', en: 'Talent' },
                    { id: 'amature', label: '写真', en: 'Gravure' },
                    { id: 'hot', label: '里站', en: 'Underground' },
                    { id: 'secret', label: 'TikTok', en: 'TikTok' },
                    { id: '3d', label: '殿堂', en: 'Hall of Fame' },
                    { id: 'fera', label: '深喉', en: 'Blowjob' },
                    { id: 'ona', label: '自我满足', en: 'Masturbation' },
                    { id: 'ama', label: '素人', en: 'Amateur' },
                    { id: 'op', label: '私处', en: 'Genitals' }
                ]
            }
        ];
    }

    getHeroRanges(isAnime: boolean): HeroRange[] {
        return [
            { id: 'index', label: '24小时', en: '24 Hours', icon: '⏱' },
            { id: '1w', label: '周榜', en: 'Weekly', icon: '📅' },
            { id: '3d', label: '殿堂', en: 'Hall of Fame', icon: '🏆' }
        ];
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;

        const key = params.range || params.category || 'index';
        const mapped = TwiigleAdapter.RANGE_MAP[key] ?? key;
        const path = mapped.endsWith('.html') ? mapped : `/${mapped}.html`;

        const res = await runtime.http.request<string>({
            method: 'GET',
            url: `${origin}${path}`,
            headers: { Accept: 'text/html' },
            responseType: 'text',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300) {
            const doc = new DOMParser().parseFromString(res.text, 'text/html');
            const cards = doc.querySelectorAll('.art_li');
            const posts: UnifiedVideoItem[] = [];

            cards.forEach((card, i) => {
                const img = card.querySelector('.item_image img');
                const thumb = img?.getAttribute('src') || '';
                if (!thumb) return;

                const videoLink = card.querySelector('.item_image a');
                const videoHref = videoLink?.getAttribute('href') || '';
                
                // Parse direct MP4 URL from hash
                let videoUrl = '';
                if (videoHref.includes('#contents=')) {
                    videoUrl = videoHref.split('#contents=')[1] || '';
                }

                const twitterLink = card.querySelector('.tw_icon a');
                const twitterHref = twitterLink?.getAttribute('href') || '';
                const author = parseTwitterHandleFromUrl(twitterHref);

                const idMatch = twitterHref.match(/\/status\/(\d+)/) || videoUrl.match(/\/amplify_video\/(\d+)/) || thumb.match(/\/amplify_video_thumb\/(\d+)/);
                const id = idMatch ? idMatch[1] : `twiigle_${i}`;

                const rankingEl = card.querySelector('.item_ranking');
                const rankText = rankingEl?.textContent?.trim() || '';
                const title = rankText ? `${rankText} - @${author} 的推特视频` : `@${author} 的推特视频`;

                posts.push({
                    id,
                    url_cd: id,
                    thumbnail: thumb,
                    title,
                    tweet_account: author,
                    favorite: 0,
                    pv: 0,
                    duration: 0,
                    url: normalizeVideoUrl(videoUrl),
                    isDetailsLoaded: true, // Direct play!
                    originalUrl: twitterHref || undefined
                });
            });

            return {
                posts,
                nextCursor: '', // Static page, no cursor pagination
                hasMore: false
            };
        }

        throw new Error(`Twiigle Scrape Error: ${res.status}`);
    }

    async fetchDetailHtml(postId: string): Promise<string> {
        return '';
    }

    async resolveVideoUrl(videoPath: string): Promise<string> {
        return videoPath;
    }
}
