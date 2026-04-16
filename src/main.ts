import { Sandbox } from './ui/Sandbox';

/**
 * X-Flow 页面接管 — 三层防御策略
 *
 * 核心问题: @run-at document-start 并非绝对保证在所有 inline 脚本之前执行。
 * 在缓存命中的快速加载场景下，React inline 脚本可能已经开始执行，
 * 产生的 zombie 代码（定时器、微任务、事件监听）会在 document.open()
 * 之后继续运行，触发 Hydration Error #418，进而通过 location.replace()
 * 或 location.reload() 导航离开，使 X-Flow UI 无法注入。
 *
 * 解决策略:
 *   Layer 1 — Pre-emptive: 在 document.open() 前冻结所有导航和异步 API
 *   Layer 2 — Nuclear: document.open() + CSP 中止解析器并重写文档
 *   Layer 3 — Verification: document.close() 后恢复必要 API + 选择性错误处理
 */

// ── 防重入守卫（document.open 后浏览器可能重新注入脚本）──────────
if ((window as any).__XFLOW_INIT__) throw new Error('X-Flow: already initialized');
(window as any).__XFLOW_INIT__ = true;

// ── iframe 守卫 ─────────────────────────────────────────────
if (window.self !== window.top) throw new Error('X-Flow: abort in iframe');

// ═══════════════════════════════════════════════════════════════
// Layer 1: Pre-emptive 防御 — 在 document.open() 之前执行
// 目标: 让 React/Next.js zombie 代码无法产生任何导航副作用
// ═══════════════════════════════════════════════════════════════

// 1a. 全局错误抑制: 阻止 React #418 错误触发框架级错误恢复逻辑
//     React 内部使用 try-catch 但某些路径依赖 window.onerror 传播
window.onerror = () => true;
window.addEventListener('unhandledrejection', (e) => { e.preventDefault(); });
window.addEventListener('error', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
}, true);

// 1b. 冻结导航 API: 阻止 React "Falling back to browser navigation"
//     location.href setter 不可覆写（Web 安全铁律），
//     但 location.replace / assign / reload 可以覆写
try { window.location.replace = (() => {}) as any; } catch (_) {}
try { window.location.assign = (() => {}) as any; } catch (_) {}
try { window.location.reload = (() => {}) as any; } catch (_) {}
try { window.history.pushState = (() => {}) as any; } catch (_) {}
try { window.history.replaceState = (() => {}) as any; } catch (_) {}
window.open = () => null;

// 1c. window.stop() — 取消所有挂起的网络请求（React chunk 加载）
//     window.stop() 停止网络资源加载，不影响已执行的 JS
window.stop();

// 1d. 清除所有定时器: 杀死 React inline script 注册的异步任务
//     在 document-start 阶段，定时器数量极少（React bootstrap 可能注册了 0-5 个）
const _noop = () => {};
const _sentinelTimerId = window.setTimeout(_noop, 0);
for (let i = 1; i < _sentinelTimerId; i++) {
    window.clearTimeout(i);
    window.clearInterval(i);
}
window.clearTimeout(_sentinelTimerId);

// 1e. 冻结 requestAnimationFrame: 阻止 React 渲染循环
const _origRAF = window.requestAnimationFrame;
window.requestAnimationFrame = () => 0;

// ── 冻结 origin（document.open 后 location 仍可用，但保险起见提前捕获）──
(window as any).__XFLOW_ORIGIN__ = window.location.origin;
(window as any).__XFLOW_IS_ANIME__ = window.location.hostname.includes('anime');

// ═══════════════════════════════════════════════════════════════
// Layer 2: Nuclear — document.open() + CSP 重写整个文档
// document.open() 会:
//   1. 中止当前 HTML parser（未解析的 <script> 不会执行）
//   2. 清空整个文档树
//   3. 将文档置于 "writing" 状态
// CSP meta 对新文档生效，浏览器层面阻止第三方脚本
// ═══════════════════════════════════════════════════════════════
document.open();
document.write([
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
    '<meta name="referrer" content="no-referrer">',
    // ── P0: CSP 防御 — 浏览器层面阻止第三方脚本和 iframe ──
    '<meta http-equiv="Content-Security-Policy" content="' +
        "default-src 'self' 'unsafe-inline' data: blob:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "frame-src 'none'; " +
        "connect-src 'self' https://video.twimg.com https://pbs.twimg.com https://fonts.googleapis.com https://fonts.gstatic.com https://loadingi.cloudns.be; " +
        "img-src 'self' https://pbs.twimg.com data: blob:; " +
        "media-src 'self' https://video.twimg.com blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "object-src 'none'; " +
        "base-uri 'self';" +
    '">',
    '<title>X-Flow</title>',
    '</head>',
    '<body style="margin:0;overflow:hidden;width:100dvw;height:100dvh;background:#0D0D12">',
    '<div id="xflow-app-root" style="width:100%;height:100%;background:var(--bg-base,#0D0D12);color:var(--text-100,#fff);overflow:hidden;position:relative"></div>',
    // ── Splash Screen — 纯遮罩，隐藏源站闪白 ──
    '<div id="xflow-splash" style="',
        'position:fixed;inset:0;z-index:2147483647;',
        'background:linear-gradient(160deg,#0D0D12 0%,#131320 40%,#0D0D12 100%);',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;',
        'transition:opacity 0.6s cubic-bezier(0.16,1,0.3,1),transform 0.6s cubic-bezier(0.16,1,0.3,1);',
        'will-change:opacity,transform;',
    '">',
        // Glow orb behind logo
        '<div style="position:absolute;width:260px;height:260px;border-radius:50%;',
            'background:radial-gradient(circle,rgba(130,80,255,0.15) 0%,transparent 70%);',
            'filter:blur(60px);pointer-events:none;animation:xf-glow 3s ease-in-out infinite alternate;"></div>',
        // Logo
        '<svg viewBox="0 0 24 24" width="56" height="56" fill="url(#splash-grad)" style="position:relative;filter:drop-shadow(0 0 24px rgba(130,80,255,0.4));animation:xf-float 2.5s ease-in-out infinite;">',
            '<defs><linearGradient id="splash-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00F0FF"/><stop offset="100%" stop-color="#FF1053"/></linearGradient></defs>',
            '<path d="M12 2L2 22h20L12 2zm0 6l6 12H6l6-12z"/>',
        '</svg>',
        // Brand name
        '<div style="margin-top:24px;font-size:28px;font-weight:800;letter-spacing:2px;',
            'background:linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.6) 100%);',
            '-webkit-background-clip:text;-webkit-text-fill-color:transparent;',
            'background-clip:text;">X-FLOW</div>',
        '<div style="margin-top:8px;font-size:12px;letter-spacing:4px;color:rgba(255,255,255,0.35);text-transform:uppercase;">极境流媒体排行榜</div>',
        // Status text
        '<div id="xflow-splash-status" style="margin-top:40px;font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:1px;">正在初始化 ···</div>',
        // Progress bar
        '<div style="margin-top:16px;width:180px;height:2px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">',
            '<div id="xflow-splash-bar" style="width:0%;height:100%;border-radius:2px;',
                'background:linear-gradient(90deg,#00F0FF,#8B5CF6,#FF1053);',
                'transition:width 0.4s cubic-bezier(0.16,1,0.3,1);"></div>',
        '</div>',
        // Keyframes
        '<style>',
            '@keyframes xf-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
            '@keyframes xf-glow{0%{opacity:0.6;transform:scale(0.9)}100%{opacity:1;transform:scale(1.1)}}',
        '</style>',
    '</div>',
    '</body>',
    '</html>',
].join(''));
document.close();

// ═══════════════════════════════════════════════════════════════
// Layer 3: Post-write 恢复与验证
// ═══════════════════════════════════════════════════════════════

// 3a. 恢复 requestAnimationFrame（X-Flow 自身动画需要）
window.requestAnimationFrame = _origRAF;

// 3b. 选择性错误处理 — 只抑制 React zombie 代码的错误，放行 X-Flow 自身错误
window.onerror = (msg) => {
    if (typeof msg === 'string' &&
        (msg.includes('React') || msg.includes('#418') ||
         msg.includes('hydrat') || msg.includes('Minified') ||
         msg.includes('__next') || msg.includes('NEXT'))) {
        return true; // 吞掉 React/Next.js 错误
    }
    return false; // 放行 X-Flow 错误
};

// ── iframe 提权防御：阻止任何 iframe 修改 top.location ─────────
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
    // ⚠️ 严防 React Hydration 删除 meta[name="referrer"]
    if (!document.querySelector('meta[name="referrer"]')) {
        const mr = document.createElement('meta');
        mr.name = 'referrer';
        mr.content = 'no-referrer';
        if (document.head) document.head.appendChild(mr);
    }

    for (const m of mutations) {
        for (const node of m.addedNodes) {
            if ((node as HTMLElement).tagName === 'IFRAME') {
                const iframe = node as HTMLIFrameElement;
                if (!iframe.hasAttribute('sandbox') ||
                    iframe.getAttribute('sandbox')!.includes('allow-top-navigation')) {
                    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
                }
            }
        }
    }
}).observe(document.documentElement, { childList: true, subtree: true });

// ── 启动应用 ──────────────────────────────────────────────────
console.log('X-Flow v6 Pro: 3-layer defense active — clean slate');
const sandbox = Sandbox.getInstance();
sandbox.initialize();

// ── Layer 4: Fallback re-injection ──────────────────────────
// document.open/write/close 可能在某些浏览器场景下失败（back-forward cache、
// prerender、late parser re-assertion）。定时验证 appRoot 是否仍存在，
// 如果原始站点内容接管了 DOM，则重新清洗并注入。
const _verifyAndRecover = () => {
    // ⚠️ Splash 仍在 = initialize() 仍在异步执行中（网络检测/数据加载），不干预
    if (document.getElementById('xflow-splash')) return;

    const appRoot = document.getElementById('xflow-app-root');
    if (appRoot && appRoot.children.length > 0) return; // 正常运行

    console.warn('X-Flow: appRoot missing or empty — re-injecting!');

    // 强制清洗 body
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;overflow:hidden;width:100dvw;height:100dvh;background:#0D0D12;position:fixed;inset:0';

    // 重建 appRoot
    const newRoot = document.createElement('div');
    newRoot.id = 'xflow-app-root';
    newRoot.style.cssText = 'width:100%;height:100%;background:var(--bg-base,#0D0D12);color:var(--text-100,#fff);overflow:hidden;position:relative';
    document.body.appendChild(newRoot);

    // 重新注入 meta referrer
    if (!document.querySelector('meta[name="referrer"]')) {
        const mr = document.createElement('meta');
        mr.name = 'referrer';
        mr.content = 'no-referrer';
        document.head.appendChild(mr);
    }

    // 重新注入 CSP（如果 head 被篡改）
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        const csp = document.createElement('meta');
        csp.httpEquiv = 'Content-Security-Policy';
        csp.content = "default-src 'self' 'unsafe-inline' data: blob:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "frame-src 'none'; " +
            "connect-src 'self' https://video.twimg.com https://pbs.twimg.com https://fonts.googleapis.com https://fonts.gstatic.com https://loadingi.cloudns.be; " +
            "img-src 'self' https://pbs.twimg.com data: blob:; " +
            "media-src 'self' https://video.twimg.com blob:; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "object-src 'none'; base-uri 'self';";
        document.head.appendChild(csp);
    }

    // 重新初始化 Sandbox（单例会跳过，需要重置）
    (Sandbox as any)._instance = null;
    const freshSandbox = Sandbox.getInstance();
    freshSandbox.initialize();
};

// 延迟验证：3s 和 6s（给 async initialize 足够时间完成网络检测 + 数据加载）
setTimeout(_verifyAndRecover, 3000);
setTimeout(_verifyAndRecover, 6000);

// ── 10 秒后完全恢复错误处理 ──
// React zombie 代码超过此时间应已全部死亡（定时器已清、rAF 已冻结过）
setTimeout(() => {
    window.onerror = null;
}, 10000);
