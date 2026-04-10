/**
 * Shield — 最小化防御层
 * 
 * 核平模式下宿主脚本已被 window.stop() 杀死，不再需要：
 * - prototype patching (createElement, setAttribute, appendChild...)
 * - MutationObserver 监控
 * - fetch/XHR/Image/Iframe 拦截
 * - Ghost layer 清扫
 * - Beacon API 拦截
 * 
 * 仅保留环境修补：
 * 1. Referrer meta — video.twimg.com CDN 需要 no-referrer
 * 2. iOS Safari URL polyfill — Vite dev 模式需要
 */
export class Shield {
    public static activate() {
        // 1. Referrer policy — 确保 video.twimg.com 不被 403
        try {
            const existing = document.querySelector('meta[name="referrer"]');
            if (existing) {
                // 修正任何非法值（如 'none'）
                const val = existing.getAttribute('content') || '';
                if (val !== 'no-referrer') {
                    existing.setAttribute('content', 'no-referrer');
                }
            } else {
                const meta = document.createElement('meta');
                meta.name = 'referrer';
                meta.content = 'no-referrer';
                (document.head || document.documentElement).appendChild(meta);
            }
        } catch (_) {}

        // 2. iOS Safari: document.baseURI null → Vite URL 构造崩溃
        try {
            const OriginalURL = window.URL;
            window.URL = new Proxy(OriginalURL, {
                // @ts-ignore
                construct(target, args) {
                    if (args.length > 1 && (args[1] === null || args[1] === undefined)) {
                        return new target(args[0]);
                    }
                    // @ts-ignore
                    return new target(...args);
                }
            });
        } catch (_) {}
    }
}
