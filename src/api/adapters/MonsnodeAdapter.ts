import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem } from './SiteAdapter';

export class MonsnodeAdapter implements SiteAdapter {
    id = 'monsnode';
    name = 'Monsnode (HTML Scraper & Redirect resolver)';

    matches(hostname: string): boolean {
        return hostname.includes('monsnode.com');
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        
        // Monsnode uses 0-based page indexing. Inherit current URL search params (e.g. ranking=1&period=24h)
        const page = String(Math.max(0, parseInt(params.cursor || '0')));
        const currentUrl = new URL(window.location.href);
        const urlParams = new URLSearchParams(currentUrl.search);
        urlParams.set('page', page);

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
