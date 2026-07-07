import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem } from './SiteAdapter';
import { parseTwitterHandleFromUrl, extractText, extractAttr, normalizeVideoUrl } from './Helper';

export class TwivideoAdapter implements SiteAdapter {
    id = 'twivideo';
    name = 'TwiVideo (AJAX HTML Hybrid)';

    matches(hostname: string): boolean {
        return hostname.includes('twivideo.net');
    }

    private viewTokenPromise: Promise<string> | null = null;

    private fetchViewToken(): Promise<string> {
        if (this.viewTokenPromise) return this.viewTokenPromise;

        this.viewTokenPromise = (async () => {
            const runtime = getRuntimeAdapter();
            const origin = window.location.origin;

            const res = await runtime.http.request<any>({
                method: 'POST',
                url: `${origin}/templates/ajax_view_token.php`,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json, text/javascript, */*; q=0.01'
                },
                responseType: 'json',
                timeoutMs: 8000,
            });

            if (res.status >= 200 && res.status < 300) {
                try {
                    const obj = typeof res.data === 'object' ? res.data : JSON.parse(res.text || '{}');
                    return obj?.token?.trim() || '';
                } catch (e) {
                    console.error('Failed to parse Twivideo token JSON', e);
                }
            }
            return '';
        })();

        return this.viewTokenPromise;
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;

        const viewToken = await this.fetchViewToken();
        const offset = params.cursor || '0';
        const limit = String(params.per_page || 80);

        const bodyParams = new URLSearchParams();
        bodyParams.append('offset', offset);
        bodyParams.append('limit', limit);
        bodyParams.append('tag', 'null');
        bodyParams.append('type', '0');
        bodyParams.append('order', params.sort === 'favorite' ? 'like_count' : 'post_date');
        bodyParams.append('le', '1000');
        bodyParams.append('ty', 'p4');
        bodyParams.append('myarray', '[]');
        bodyParams.append('view_token', viewToken);

        const res = await runtime.http.request<string>({
            method: 'POST',
            url: `${origin}/templates/view_lists.php`,
            body: bodyParams.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': '*/*'
            },
            responseType: 'text',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300) {
            // The response is an HTML chunk containing multiple .art_li elements
            const doc = new DOMParser().parseFromString(`<div>${res.text}</div>`, 'text/html');
            const cards = doc.querySelectorAll('.art_li');
            
            const posts: UnifiedVideoItem[] = [];
            cards.forEach((card, i) => {
                const videoLink = card.querySelector('.item_image a');
                const videoUrl = videoLink?.getAttribute('href') || '';
                
                const img = card.querySelector('.item_image img');
                const thumb = img?.getAttribute('src') || '';

                const likesStr = extractText(card, '.like_count_int');
                const likes = parseInt(likesStr) || 0;

                // We'll store the data-link-id in url_cd to resolve the Twitter handle lazily
                const snsLinkEl = card.querySelector('.tw_icon span.sns_link');
                const linkId = snsLinkEl?.getAttribute('data-link-id') || '';

                const id = linkId || `twivideo_${offset}_${i}`;

                posts.push({
                    id,
                    url_cd: linkId, // Store the linkId to resolve the twitter username on play
                    thumbnail: thumb,
                    title: `TwiVideo Post ${id}`,
                    tweet_account: 'loading',
                    favorite: likes,
                    pv: 0,
                    duration: 0,
                    url: normalizeVideoUrl(videoUrl), // Video URL is already direct!
                    isDetailsLoaded: false, // We still need to load details to resolve the Twitter handle
                    originalUrl: undefined
                });
            });

            const nextOffset = String(parseInt(offset) + parseInt(limit));
            return {
                posts,
                nextCursor: nextOffset,
                hasMore: posts.length > 0
            };
        }

        throw new Error(`TwiVideo List Fetch Error: ${res.status}`);
    }

    async fetchDetailHtml(postId: string): Promise<string> {
        // For TwiVideo, we fetch the twitter link from their redirect API
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        const url = `${origin}/api/link.php?id=${postId}`;

        const res = await runtime.http.request<string>({
            method: 'GET',
            url: url,
            responseType: 'text',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300) {
            return res.text; // This returns the raw x.com status URL as text
        }
        return '';
    }

    parseDetailHtml(html: string): { title?: string; tweetAccount?: string; videoPath?: string } {
        // html is the direct tweet URL (e.g. https://x.com/username/status/123456)
        const username = parseTwitterHandleFromUrl(html);
        return {
            title: `@${username} 的推特视频`,
            tweetAccount: username,
            videoPath: '' // Video URL is already resolved in fetchList
        };
    }

    async resolveVideoUrl(videoPath: string): Promise<string> {
        return videoPath;
    }
}
