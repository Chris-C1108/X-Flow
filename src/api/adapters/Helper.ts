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
