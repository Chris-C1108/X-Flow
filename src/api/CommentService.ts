import { getRuntimeAdapter } from '../runtime';

/**
 * CommentService — 评论获取与发送
 */

export interface Comment {
    time: string;
    content: string;
}

const runtime = getRuntimeAdapter();

const BASE_URL = (() => {
    const base = runtime.env.apiBase;
    if (base.endsWith('/api')) {
        return base.slice(0, -4);
    }
    return base;
})();

export function fetchComments(urlCd: string): Promise<Comment[]> {
    return new Promise<Comment[]>((resolve) => {
        const pageUrl = `${BASE_URL}/zh-CN/movie/${urlCd}`;

        runtime.http.request<string>({
            method: 'GET',
            url: pageUrl,
            headers: { Accept: 'text/html' },
            responseType: 'text',
            timeoutMs: 10000,
        }).then((res) => {
            if (res.status < 200 || res.status >= 300) {
                resolve([]);
                return;
            }

            try {
                const doc = new DOMParser().parseFromString(res.text, 'text/html');
                const rows = doc.querySelectorAll('.comment .space-y-2 > div.border-b');
                const comments: Comment[] = Array.from(rows).map(el => ({
                    time: el.querySelector('span')?.textContent?.trim() || '',
                    content: el.querySelector('p')?.textContent?.trim() || '',
                })).filter(c => c.content);
                resolve(comments);
            } catch {
                resolve([]);
            }
        }).catch(() => resolve([]));
    });
}

export function postComment(urlCd: string, message: string): Promise<boolean> {
    return runtime.http.request({
        method: 'POST',
        url: `${BASE_URL}/api/media/${urlCd}/comments`,
        headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
            Origin: BASE_URL,
        },
        body: JSON.stringify({ message }),
        timeoutMs: 8000,
    }).then((res) => res.status >= 200 && res.status < 300)
      .catch(() => false);
}
