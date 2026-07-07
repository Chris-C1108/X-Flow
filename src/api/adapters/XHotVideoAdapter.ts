import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem } from './SiteAdapter';
import { parseDuration, parseViews } from './Helper';

export class XHotVideoAdapter implements SiteAdapter {
    id = 'xhotvideo';
    name = 'XHotVideo (HTML Scraper)';

    matches(hostname: string): boolean {
        return hostname.includes('xhotvideo.com');
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        
        // Map sort / range to URLs
        let path = '/videos';
        const page = params.cursor || '1';

        if (params.sort === 'recent') {
            path = `/videos/sort/new/page/${page}`;
        } else if (params.sort === 'favorite') {
            path = `/videos/sort/favorite/page/${page}`;
        } else if (params.range === 'daily') {
            path = `/videos/period/day/page/${page}`;
        } else if (params.range === 'weekly') {
            path = `/videos/period/week/page/${page}`;
        } else if (params.range === 'monthly') {
            path = `/videos/period/month/page/${page}`;
        } else if (params.range === 'all') {
            path = `/videos/period/total/page/${page}`;
        } else {
            path = `/videos/page/${page}`;
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
