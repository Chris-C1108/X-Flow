import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem } from './SiteAdapter';
import { parseTwitterHandleFromUrl, normalizeVideoUrl } from './Helper';

export class TwiigleAdapter implements SiteAdapter {
    id = 'twiigle';
    name = 'Twiigle (HTML Scraper)';

    matches(hostname: string): boolean {
        return hostname.includes('twiigle.com');
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;

        // Twiigle has static category pages
        let path = '/index.html';
        if (params.range === 'weekly') {
            path = '/1w.html';
        } else if (params.range === 'realtime') {
            path = '/realtime.html';
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
