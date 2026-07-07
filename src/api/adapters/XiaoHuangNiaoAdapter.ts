import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem } from './SiteAdapter';
import { normalizeVideoUrl } from './Helper';

export class XiaoHuangNiaoAdapter implements SiteAdapter {
    id = 'xiaohuangniao';
    name = 'XiaoHuangNiao (JSON API)';

    matches(hostname: string): boolean {
        return hostname.includes('xiaohuangniao.me');
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const origin = window.location.origin;
        
        // XiaoHuangNiao Next.js api is /api/tweet?page={page}
        const page = String(Math.max(1, parseInt(params.cursor || '1')));

        const q = new URLSearchParams();
        q.append('page', page);
        if (params.sort === 'favorite') {
            q.append('order', 'likeCount');
        } else if (params.sort === 'pv') {
            q.append('order', 'viewCount');
        } else {
            q.append('order', 'tweetId');
        }
        
        if (params.range) {
            q.append('range', params.range);
        }

        const res = await runtime.http.request<string>({
            method: 'GET',
            url: `${origin}/api/tweet?${q.toString()}`,
            headers: { Accept: 'application/json' },
            responseType: 'text',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300) {
            let data: any;
            try {
                data = JSON.parse(res.text);
            } catch {
                throw new Error('Failed to parse XiaoHuangNiao JSON response');
            }
            
            const rawTweets = Array.isArray(data) ? data : (data?.data?.tweets || data?.data || data?.tweets || []);
            const posts: UnifiedVideoItem[] = [];

            rawTweets.forEach((t: any) => {
                // If it is a pinned tweet, we skip it on pages > 1 to avoid duplicates
                if (t.isPinned && parseInt(page) > 1) return;

                const mediaEntity = t.mediaEntities?.[0];
                const videoMedia = mediaEntity?.videoInfo?.variants?.find((v: any) => v.contentType === 'video/mp4' || v.url?.includes('.mp4'));
                const videoUrl = videoMedia?.url || '';
                if (!videoUrl) return;

                const thumb = mediaEntity?.media_url_https || mediaEntity?.media_url || videoMedia?.url || '';

                const author = t.author?.userName || 'unknown';
                const authorDisplayName = t.author?.name || author;

                const duration = mediaEntity?.videoInfo?.durationMillis ? Math.round(mediaEntity.videoInfo.durationMillis / 1000) : 0;

                posts.push({
                    id: String(t.tweetId || t.id),
                    url_cd: String(t.tweetId || t.id),
                    thumbnail: thumb,
                    title: t.text || `小黄鸟视频 ${t.tweetId}`,
                    tweet_account: author,
                    authorDisplayName: authorDisplayName,
                    favorite: t.likeCount || 0,
                    pv: t.viewCount || 0,
                    duration: duration,
                    url: normalizeVideoUrl(videoUrl), // Direct video URL!
                    isDetailsLoaded: true, // 秒播!
                    originalUrl: `https://x.com/${author}/status/${t.tweetId || t.id}`
                });
            });

            const nextPage = String(parseInt(page) + 1);
            return {
                posts,
                nextCursor: nextPage,
                hasMore: rawTweets.length > 0
            };
        }

        throw new Error(`XiaoHuangNiao API Error: ${res.status}`);
    }

    async fetchDetailHtml(postId: string): Promise<string> {
        return '';
    }

    async resolveVideoUrl(videoPath: string): Promise<string> {
        return videoPath;
    }
}
