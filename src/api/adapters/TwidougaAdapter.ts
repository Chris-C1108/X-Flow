import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem } from './SiteAdapter';
import { parseTwitterHandleFromUrl, normalizeVideoUrl } from './Helper';

export class TwidougaAdapter implements SiteAdapter {
    id = 'twidouga';
    name = 'TwiDouga (HTML Scraper)';

    matches(hostname: string): boolean {
        return hostname.includes('twidouga.net');
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        const page = params.cursor || '1';

        // TwiDouga has realtime list under /jp/realtime_t1.php
        let path = `/jp/realtime_t${page}.php`;
        if (params.range === 'weekly') {
            path = `/jp/weekly_t${page}.php`;
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
            const cards = doc.querySelectorAll('.item');
            
            const posts: UnifiedVideoItem[] = [];
            cards.forEach((card, i) => {
                const videoLink = card.querySelector('a');
                const videoUrl = videoLink?.getAttribute('href') || '';
                if (!videoUrl) return;

                const img = card.querySelector('a img');
                const thumb = img?.getAttribute('src') || '';

                const authorLink = card.querySelector('.saisei a');
                const authorHref = authorLink?.getAttribute('href') || '';
                const author = parseTwitterHandleFromUrl(authorHref);

                const idMatch = videoUrl.match(/\/amplify_video\/(\d+)/) || videoUrl.match(/\/ext_tw_video\/(\d+)/) || thumb.match(/\/img\/([^.]+)/);
                const id = idMatch ? idMatch[1] : `twidouga_${page}_${i}`;

                posts.push({
                    id,
                    url_cd: id,
                    thumbnail: thumb,
                    title: `@${author} 的视频`,
                    tweet_account: author,
                    favorite: 0,
                    pv: 0,
                    duration: 0,
                    url: normalizeVideoUrl(videoUrl), // Direct video URL!
                    isDetailsLoaded: true, // Everything available in the list!
                    originalUrl: authorHref || undefined
                });
            });

            const nextPage = String(parseInt(page) + 1);
            return {
                posts,
                nextCursor: nextPage,
                hasMore: posts.length > 0
            };
        }

        throw new Error(`TwiDouga Scrape Error: ${res.status}`);
    }

    async fetchDetailHtml(postId: string): Promise<string> {
        return '';
    }

    async resolveVideoUrl(videoPath: string): Promise<string> {
        return videoPath;
    }
}
