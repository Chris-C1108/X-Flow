import { Sandbox } from './ui/Sandbox';

/**
 * 方向 A: document.open() — 中止 HTML 解析器
 *
 * 与 window.stop() 的本质区别：
 *   window.stop()  → 停止网络加载，但已被解析器读取的 inline <script> 仍会执行
 *   document.open() → 中止解析器本身，未读取的 <script> 永远不会被解析和执行
 *
 * 如果恶意脚本从未执行，就不需要任何 JS 层面的防御。
 * 不需要: error blackhole, fetch fake, addEventListener guard, beforeunload,
 *         global freeze, createElement proxy — 全部删除。
 */

// ── 防重入守卫（document.open 后 Stay Browser 会重新注入脚本）──
if ((window as any).__XFLOW_INIT__) throw new Error('X-Flow: already initialized');
(window as any).__XFLOW_INIT__ = true;

// ── iframe 守卫 ─────────────────────────────────────────────
if (window.self !== window.top) throw new Error('X-Flow: abort in iframe');

// ── 冻结 origin（document.open 后 location 仍可用，但保险起见提前捕获）──
(window as any).__XFLOW_ORIGIN__ = window.location.origin;
(window as any).__XFLOW_IS_ANIME__ = window.location.hostname.includes('anime');

// ── 核心：中止 HTML 解析器 + 重写整个文档 ────────────────────
// document.open() 会：
//   1. 中止当前 HTML parser（未解析的 <script> 不会执行）
//   2. 清空整个文档树（document.documentElement 的所有子节点被移除）
//   3. 将文档置于 "writing" 状态
// document.write() 写入我们的干净 HTML
// document.close() 完成解析，触发 DOMContentLoaded
document.open();
document.write([
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
    '<meta name="referrer" content="no-referrer">',
    // ── P0: CSP 防御 — 浏览器层面阻止第三方脚本和 iframe ──
    // 这是 document.open() 后写入的全新文档，CSP meta 对此文档生效。
    // - script-src: 只允许 self + inline（Tampermonkey 注入的脚本本身是 inline）
    // - frame-src: 完全禁止 iframe（恶意广告的主要注入路径）
    // - connect-src: 只允许 API 和已知 CDN
    // - img-src: 允许 twimg CDN 图片
    // - media-src: 允许 twimg CDN 视频
    // - style-src: 允许 inline 样式和 Google Fonts
    '<meta http-equiv="Content-Security-Policy" content="' +
        "default-src 'self' 'unsafe-inline' data: blob:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "frame-src 'none'; " +
        "connect-src 'self' https://video.twimg.com https://pbs.twimg.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
        "img-src 'self' https://pbs.twimg.com data: blob:; " +
        "media-src 'self' https://video.twimg.com blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "object-src 'none'; " +
        "base-uri 'self';" +
    '">',
    '<title>X-Flow</title>',
    '</head>',
    '<body style="margin:0;overflow:hidden;width:100vw;height:100vh;background:#0D0D12">',
    '<div id="xflow-app-root" style="width:100%;height:100%;background:var(--bg-base,#0D0D12);color:var(--text-100,#fff);overflow:hidden;position:relative"></div>',
    '</body>',
    '</html>',
].join(''));
document.close();

// ── iframe 提权防御：阻止任何 iframe 修改 top.location ─────────
// 劫持 createElement，所有 iframe 强制 sandbox 属性（不含 allow-top-navigation）
const _origCreate = document.createElement.bind(document);
document.createElement = function(tag: string, options?: ElementCreationOptions) {
    const el = _origCreate(tag, options);
    if (tag.toLowerCase() === 'iframe') {
        el.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    }
    return el;
};

// MutationObserver 兜底：捕获任何绕过 createElement 的 iframe 注入
new MutationObserver((mutations) => {
    for (const m of mutations) {
        for (const node of m.addedNodes) {
            if ((node as HTMLElement).tagName === 'IFRAME') {
                const iframe = node as HTMLIFrameElement;
                if (!iframe.getAttribute('sandbox')?.includes('allow-top-navigation') === false
                    || !iframe.hasAttribute('sandbox')) {
                    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
                }
            }
        }
    }
}).observe(document.documentElement, { childList: true, subtree: true });

// 锁死跳转 API 作为最后兜底
window.open = () => null;

// ── 文档已是全新的干净环境，启动应用 ──────────────────────────
console.log('X-Flow v6 Pro: document.open() — parser aborted, clean slate');
const sandbox = Sandbox.getInstance();
sandbox.initialize();
