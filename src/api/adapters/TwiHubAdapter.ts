import { getRuntimeAdapter } from '../../runtime';
import { FetchParams } from '../ApiClient';
import { SiteAdapter, FetchListResult, UnifiedVideoItem, FilterGroup, HeroRange } from './SiteAdapter';

export class TwiHubAdapter implements SiteAdapter {
    id = 'twihub';
    name = 'TwiHub (SvelteKit)';

    private static readonly RANGE_MAP: Record<string, string> = {
        daily: '1d',
        weekly: '7d',
        monthly: '30d',
        all: '30d',
        '1d': '1d',
        '7d': '7d',
        '30d': '30d',
        realtime: 'realtime'
    };

    matches(hostname: string): boolean {
        return hostname.includes('twihub.net') || 
               hostname.includes('x-ero-anime.com') || 
               hostname.includes('truvaze.com');
    }

    getFilterGroups(isAnime: boolean): FilterGroup[] {
        return [
            {
                id: 'range',
                title: '范围 Range',
                type: 'range',
                options: [
                    { id: '1d', label: '24小时', en: '24 Hours' },
                    { id: '7d', label: '7天榜', en: '7 Days' },
                    { id: '30d', label: '30天榜', en: '30 Days' },
                    { id: 'realtime', label: '最新', en: 'Latest' }
                ]
            },
            {
                id: 'sort',
                title: '排序 Sort',
                type: 'sort',
                options: [
                    { id: 'pv', label: '极高播放' },
                    { id: 'favorite', label: '最多喜欢' }
                ]
            }
        ];
    }

    getHeroRanges(isAnime: boolean): HeroRange[] {
        return [
            { id: '1d', label: '24小时', en: '24 Hours', icon: '⏱' },
            { id: '7d', label: '7天榜', en: '7 Days', icon: '📅' },
            { id: '30d', label: '30天榜', en: '30 Days', icon: '🗓' }
        ];
    }

    private getBaseUrl(): string {
        const runtime = getRuntimeAdapter();
        return runtime.env.apiBase;
    }

    private buildMediaEndpoint(baseUrl: string): string {
        const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        if (normalized.endsWith('/api')) {
            return `${normalized}/v1/posts`;
        }
        return `${normalized}/api/v1/posts`;
    }

    async fetchList(params: FetchParams, isAnime: boolean): Promise<FetchListResult> {
        const runtime = getRuntimeAdapter();
        const baseUrl = this.getBaseUrl();
        const mappedRange = TwiHubAdapter.RANGE_MAP[params.range || 'daily'] ?? params.range ?? '1d';
        
        const finalParams: Record<string, any> = {
            type: mappedRange,
            limit: (params.per_page || 80).toString(),
        };

        if (params.cursor) {
            finalParams.cursor = params.cursor;
        }

        const url = new URL(this.buildMediaEndpoint(baseUrl), window.location.origin);
        Object.keys(finalParams).forEach((k) => {
            if (finalParams[k] !== undefined) {
                url.searchParams.append(k, finalParams[k].toString());
            }
        });

        const res = await runtime.http.request<any>({
            method: 'GET',
            url: url.toString(),
            headers: { Accept: 'application/json' },
            responseType: 'json',
            timeoutMs: 8000,
        });

        if (res.status >= 200 && res.status < 300) {
            const rawItems = res.data?.posts || [];
            const posts: UnifiedVideoItem[] = rawItems.map((item: any) => ({
                id: String(item.postId),
                url_cd: String(item.postId),
                thumbnail: item.thumbnailUrl,
                favorite: item.likesCount || 0,
                pv: item.viewsCount || 0,
                duration: item.firstVideoDuration || 0,
                title: 'Loading...',
                tweet_account: 'loading',
                url: '',
                isDetailsLoaded: false,
                originalUrl: `https://x.com/i/status/${item.postId}`
            }));

            // Client-side sorting fallback for TwiHub SvelteKit API
            if (params.sort === 'pv') {
                posts.sort((a, b) => b.pv - a.pv);
            } else if (params.sort === 'favorite') {
                posts.sort((a, b) => b.favorite - a.favorite);
            }

            return {
                posts,
                nextCursor: res.data?.nextCursor || '',
                hasMore: !!res.data?.hasMore
            };
        }

        throw new Error(`TwiHub API Error: ${res.status}`);
    }

    async fetchDetailHtml(postId: string): Promise<string> {
        const runtime = getRuntimeAdapter();
        const baseUrl = this.getBaseUrl();
        const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${normalized}/posts/${postId}`;

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
        throw new Error(`Detail HTML error: ${res.status}`);
    }

    parseDetailHtml(html: string): { title: string; tweetAccount: string; videoPath: string } {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        const videoLinkEl = doc.getElementById('video-link');
        const videoPath = videoLinkEl?.getAttribute('href') || '';

        const authorEl = doc.getElementById('author-handle');
        const authorText = authorEl?.querySelector('span')?.textContent?.trim() || '';
        const tweetAccount = authorText.replace(/^@/, '');

        const titleEl = doc.querySelector('.mt-4 p.text-gray-200');
        const title = titleEl?.textContent?.trim() || '';

        return { title, tweetAccount, videoPath };
    }

    async resolveVideoUrl(videoPath: string): Promise<string> {
        const runtime = getRuntimeAdapter();
        const baseUrl = this.getBaseUrl();
        const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = videoPath.startsWith('http') ? videoPath : `${normalized}${videoPath}`;

        const res = await runtime.http.request<string>({
            method: 'HEAD',
            url: url,
            responseType: 'text',
            timeoutMs: 8000,
        });

        return res.finalUrl || url;
    }

    async fetchAuthorVideos(username: string, cursor?: string): Promise<FetchListResult> {
        // TwiHub SvelteKit endpoint does not expose a clean per-author API route,
        // so we fall back to searching by username or returning empty (will open X.com profile link)
        return { posts: [], nextCursor: '', hasMore: false };
    }
}
