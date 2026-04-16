/**
 * CommentService — 评论获取与发送
 *
 * 评论来源：
 *   - 获取：SSR 渲染的视频页面 HTML（DOMParser 解析）
 *   - 发送：POST /api/media/{url_cd}/comments
 *
 * 网络请求全部使用 GM_xmlhttpRequest，绕过页面级 CSP
 */

export interface Comment {
    time: string;
    content: string;
}

const BASE_URL = (window as any).__XFLOW_ORIGIN__ || 'https://truvaze.com';

/**
 * 从视频页面 HTML 中解析评论列表
 * 使用 GM_xmlhttpRequest 获取 SSR 页面 → DOMParser 解析 DOM → 提取评论
 */
export function fetchComments(urlCd: string): Promise<Comment[]> {
    return new Promise<Comment[]>((resolve) => {
        const pageUrl = `${BASE_URL}/zh-CN/movie/${urlCd}`;
        try {
            GM_xmlhttpRequest({
                method: 'GET',
                url: pageUrl,
                headers: { 'Accept': 'text/html' },
                timeout: 10000,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        try {
                            const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
                            const rows = doc.querySelectorAll('.comment .space-y-2 > div.border-b');
                            const comments: Comment[] = Array.from(rows).map(el => ({
                                time: el.querySelector('span')?.textContent?.trim() || '',
                                content: el.querySelector('p')?.textContent?.trim() || '',
                            })).filter(c => c.content);
                            resolve(comments);
                        } catch {
                            resolve([]);
                        }
                    } else {
                        resolve([]);
                    }
                },
                onerror: () => resolve([]),
                ontimeout: () => resolve([]),
            });
        } catch {
            resolve([]);
        }
    });
}

/**
 * 发送评论到视频
 * POST /api/media/{url_cd}/comments  body: { message: string }
 */
export function postComment(urlCd: string, message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const url = `${BASE_URL}/api/media/${urlCd}/comments`;
        try {
            GM_xmlhttpRequest({
                method: 'POST',
                url,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'Origin': BASE_URL,
                },
                data: JSON.stringify({ message }),
                timeout: 8000,
                onload: (res) => resolve(res.status >= 200 && res.status < 300),
                onerror: () => resolve(false),
                ontimeout: () => resolve(false),
            });
        } catch {
            resolve(false);
        }
    });
}
