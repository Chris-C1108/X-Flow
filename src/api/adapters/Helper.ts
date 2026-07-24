export function parseDuration(str: string | null | undefined): number {
    if (!str) return 0;
    const cleaned = str.trim();
    const parts = cleaned.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    if (parts.length === 1) {
        return parts[0];
    }
    return 0;
}

export function parseViews(str: string | null | undefined): number {
    if (!str) return 0;
    const cleaned = str.trim().replace(/[^\d.KMkm万亿]/g, '');
    if (!cleaned) return 0;
    
    // Chinese characters
    if (cleaned.endsWith('万')) {
        return parseFloat(cleaned) * 10000;
    }
    if (cleaned.endsWith('亿')) {
        return parseFloat(cleaned) * 100000000;
    }
    
    // English suffixes
    const lower = cleaned.toLowerCase();
    if (lower.endsWith('m')) {
        return parseFloat(cleaned) * 1000000;
    }
    if (lower.endsWith('k')) {
        return parseFloat(cleaned) * 1000;
    }
    
    return parseFloat(cleaned) || 0;
}

export function parseTwitterHandleFromUrl(url: string | null | undefined): string {
    if (!url) return 'unknown';
    try {
        const cleaned = url.trim();
        // Match x.com/username/status/id or twitter.com/username/status/id
        const match = cleaned.match(/(?:x|twitter)\.com\/([^/]+)\/status\//i);
        return match ? match[1] : 'unknown';
    } catch {
        return 'unknown';
    }
}

export function extractText(el: Element | null, selector: string): string {
    if (!el) return '';
    const sub = el.querySelector(selector);
    return sub?.textContent?.trim() || '';
}

export function extractAttr(el: Element | null, selector: string, attr: string): string {
    if (!el) return '';
    const sub = el.querySelector(selector);
    return sub?.getAttribute(attr) || '';
}

export function normalizeVideoUrl(url: string | null | undefined): string {
    if (!url) return '';
    let cleaned = url.trim();
    if (cleaned.startsWith('http://')) {
        cleaned = cleaned.replace('http://', 'https://');
    }
    return cleaned;
}

/**
 * 从 UnifiedVideoItem 中提取规范唯一的 video_id。
 * 对于 video.twimg.com 类型的视频，提取完整的相对路径（如 amplify_video/2079457168697577472/vid/avc1/720x1280/foVKPpVJWvPm4umg.mp4），
 * 以便遥测、D1 存储和 AI 推荐算法能够 100% 完整还原视频流播放 URL。
 */
export function getCanonicalVideoId(item: { id?: string; url_cd?: string; url?: string }): string {
    if (!item) return '';
    const url = item.url || '';
    if (url && url.includes('video.twimg.com')) {
        try {
            const u = new URL(url);
            const path = u.pathname.replace(/^\/+/, '');
            if (path && path.length > 5) return path;
        } catch {
            const match = url.match(/(amplify_video|ext_tw_video|tweet_video)\/.+$/i);
            if (match) return match[0].split('?')[0].replace(/^\/+/, '');
        }
    }
    return String(item.id || item.url_cd || '');
}

/**
 * 根据规范的 canonicalId 自动还原视频播放 URL。
 */
export function resolveUrlFromCanonicalId(canonicalId: string): string {
    if (!canonicalId) return '';
    if (canonicalId.startsWith('http://') || canonicalId.startsWith('https://')) {
        return canonicalId;
    }
    if (canonicalId.includes('amplify_video/') || canonicalId.includes('ext_tw_video/') || canonicalId.includes('tweet_video/')) {
        return `https://video.twimg.com/${canonicalId}`;
    }
    return '';
}
