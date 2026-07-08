import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem, FilterGroup, HeroRange } from './SiteAdapter';

export class MonsnodeAdapter implements SiteAdapter {
    id = 'monsnode';
    name = 'Monsnode (HTML Scraper & Redirect resolver)';

    private static readonly RANGE_MAP: Record<string, string> = {
        daily: '24h',
        weekly: '3d',
        monthly: '7d',
        all: '7d',
        '24h': '24h',
        '3d': '3d',
        '7d': '7d'
    };

    matches(hostname: string): boolean {
        return hostname.includes('monsnode.com');
    }

    getFilterGroups(isAnime: boolean): FilterGroup[] {
        return [
            {
                id: 'range',
                title: '范围 Period',
                type: 'range',
                options: [
                    { id: '24h', label: '24小时榜', en: '24 Hours' },
                    { id: '3d', label: '3天榜', en: '3 Days' },
                    { id: '7d', label: '周榜', en: 'Weekly' }
                ]
            },
            {
                id: 'sort',
                title: '排序 Sort',
                type: 'sort',
                options: [
                    { id: 'pv', label: '综合排行' },
                    { id: 'favorite', label: '推荐排行' }
                ]
            }
        ];
    }

    getHeroRanges(isAnime: boolean): HeroRange[] {
        return [
            { id: '24h', label: '24小时榜', en: '24 Hours', icon: '⏱' },
            { id: '3d', label: '3天榜', en: '3 Days', icon: '📅' },
            { id: '7d', label: '周榜', en: 'Weekly', icon: '🏆' }
        ];
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        
        const page = String(Math.max(0, parseInt(params.cursor || '0')));
        const urlParams = new URLSearchParams();
        urlParams.set('page', page);

        const rangeKey = params.range || 'daily';
        const mappedPeriod = MonsnodeAdapter.RANGE_MAP[rangeKey] ?? rangeKey ?? '24h';
        const mappedRanking = params.sort === 'pv' ? '8' : '1';

        urlParams.set('period', mappedPeriod);
        urlParams.set('ranking', mappedRanking);

        const res = await runtime.http.request<string>({
            method: 'GET',
            url: `${origin}/?${urlParams.toString()}`,
            headers: { Accept: 'text/html' },
            responseType: 'text',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300) {
            const doc = new DOMParser().parseFromString(res.text, 'text/html');
            const cards = doc.querySelectorAll('.listn');
            
            const posts: UnifiedVideoItem[] = [];
            cards.forEach(card => {
                const redirectLink = card.querySelector('a[href*="redirect.php?v="]');
                const redirectHref = redirectLink?.getAttribute('href') || '';
                const vIdMatch = redirectHref.match(/v=(\d+)/);
                const vId = vIdMatch ? vIdMatch[1] : '';
                if (!vId) return;

                const id = vId;

                const img = card.querySelector('img');
                const thumb = img?.getAttribute('src') || '';

                const userLink = card.querySelector('.user a');
                const author = userLink?.textContent?.trim()?.replace(/^@/, '') || 'unknown';
                const title = `@${author} 的 Monsnode 视频`;

                const cardId = card.getAttribute('id') || vId;

                posts.push({
                    id,
                    url_cd: vId, // Store internal vId as url_cd to use in twjn.php resolution
                    thumbnail: thumb,
                    title,
                    tweet_account: author,
                    favorite: 0,
                    pv: 0,
                    duration: 0,
                    url: '', // Resolved lazy
                    isDetailsLoaded: false,
                    originalUrl: `https://monsnode.com/v${cardId}`
                });
            });

            const nextPage = String(parseInt(page) + 1);
            return {
                posts,
                nextCursor: nextPage,
                hasMore: posts.length > 0
            };
        }

        throw new Error(`Monsnode Scrape Error: ${res.status}`);
    }

    async fetchDetailHtml(postId: string): Promise<string> {
        // For Monsnode, the detail URL is twjn.php?v={url_cd} which returns the code with base64 URLs
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        const url = `${origin}/twjn.php?v=${postId}`;

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
        throw new Error(`Monsnode redirect file fetch error: ${res.status}`);
    }

    parseDetailHtml(html: string): { title: string; tweetAccount: string; videoPath: string } {
        return {
            title: '',
            tweetAccount: 'unknown',
            videoPath: html
        };
    }

    async resolveVideoUrl(videoPath: string): Promise<string> {
        // Monsnode detail HTML (videoPath) now contains a hidden link under cdn-cgi/content
        try {
            const doc = new DOMParser().parseFromString(videoPath, 'text/html');
            const link = doc.querySelector('a[href*="cdn-cgi/content"]');
            const href = link?.getAttribute('href') || '';
            if (href) {
                const origin = window.location.origin;
                return href.startsWith('http') ? href : `${origin}${href}`;
            }
        } catch (e) {
            console.error('Failed to parse Monsnode cdn-cgi link', e);
        }

        // Fallback to base64 decoding from the javascript block if present
        const base64Matches = videoPath.match(/atob\(['"]([^'"]+)['"]\)/g);
        if (base64Matches && base64Matches.length >= 1) {
            try {
                const rawBase64 = base64Matches[0].match(/['"]([^'"]+)['"]/);
                if (rawBase64) {
                    return atob(rawBase64[1]);
                }
            } catch (e) {
                console.error('Failed to decode Monsnode video URL base64', e);
            }
        }
        return '';
    }
}
