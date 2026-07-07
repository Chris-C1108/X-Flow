import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem } from './SiteAdapter';
import { normalizeVideoUrl } from './Helper';

export class JavtwiAdapter implements SiteAdapter {
    id = 'javtwi';
    name = 'JavTwi (HTML Scraper)';

    matches(hostname: string): boolean {
        return hostname.includes('javtwi.com');
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;

        // JavTwi top ranking is at /top.html
        const res = await runtime.http.request<string>({
            method: 'GET',
            url: `${origin}/top.html`,
            headers: { Accept: 'text/html' },
            responseType: 'text',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300) {
            const doc = new DOMParser().parseFromString(res.text, 'text/html');
            
            // Find all anchor tags pointing directly to twimg videos
            const videoLinks = doc.querySelectorAll('a.center_contents[href*="video.twimg.com"]');
            const posts: UnifiedVideoItem[] = [];

            videoLinks.forEach((link, i) => {
                const videoUrl = link.getAttribute('href') || '';
                if (!videoUrl) return;

                const img = link.querySelector('img.center_contents') || link.querySelector('img');
                const thumb = img?.getAttribute('src') || '';

                const idMatch = videoUrl.match(/\/amplify_video\/(\d+)/) || videoUrl.match(/\/ext_tw_video\/(\d+)/) || thumb.match(/\/img\/([^.]+)/);
                const id = idMatch ? idMatch[1] : `javtwi_${i}`;

                // Try to find rank text from sibling
                const rankEl = link.previousElementSibling;
                const rankText = rankEl && rankEl.classList.contains('center_text_rank') ? rankEl.textContent?.trim() : '';
                const title = rankText ? `${rankText} - JAVTWI Video ${id}` : `JAVTWI Video ${id}`;

                posts.push({
                    id,
                    url_cd: id,
                    thumbnail: thumb,
                    title: title,
                    tweet_account: 'unknown',
                    favorite: 0,
                    pv: 0,
                    duration: 0,
                    url: normalizeVideoUrl(videoUrl), // Direct video URL!
                    isDetailsLoaded: true, // Direct play!
                    originalUrl: undefined
                });
            });

            return {
                posts,
                nextCursor: '', // No pagination
                hasMore: false
            };
        }

        throw new Error(`JavTwi Scrape Error: ${res.status}`);
    }

    async fetchDetailHtml(postId: string): Promise<string> {
        return '';
    }

    async resolveVideoUrl(videoPath: string): Promise<string> {
        return videoPath;
    }
}
