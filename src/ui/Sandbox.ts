import { Layout } from './Layout';
import { log } from '../utils/Logger';

/**
 * 职责：
 * 1. 执行 window.stop() 并清理 document.documentElement
 * 2. 使用 MutationObserver 监控并拦截原站的 Hydration 行为
 * 3. 注入高优先级 Z-Index 容器
 * * AI 关注点：确保原站 JS 无法干扰新 UI
 */
export class Sandbox {
    private static _instance: Sandbox;
    private appRoot: HTMLElement | null = null;
    private styleEl: HTMLStyleElement | null = null;

    private constructor() { }

    public static getInstance() {
        if (!Sandbox._instance) {
            Sandbox._instance = new Sandbox();
        }
        return Sandbox._instance;
    }

    public initialize() {
        // -1. 立即隐藏原始页面，防FOUC（闪烁）
        const hideStyle = document.createElement('style');
        hideStyle.id = 'xflow-hide-fouc';
        hideStyle.textContent = 'html { display: none !important; }';
        (document.documentElement || document.head || document.body)?.appendChild(hideStyle);

        // BUG1 fix: 在 document-start 阶段注入 meta referrer
        // 抑制所有跨域请求的 Referer 头，防止 video.twimg.com 返回 403
        const metaReferrer = document.createElement('meta');
        metaReferrer.name = 'referrer';
        metaReferrer.content = 'no-referrer';
        (document.head || document.documentElement).appendChild(metaReferrer);

        if (document.body) {
            this.createSandbox();
        } else {
            const observer = new MutationObserver(() => {
                if (document.body) {
                    observer.disconnect();
                    this.createSandbox();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    private createSandbox() {
        if (document.getElementById('xflow-app-root')) return;

        log('拦截原网页，创建防删除沙盒...');

        // 1. 注入强制保护样式：将原站的节点按在底下不可见，同时确保我们的 UI 始终置顶
        this.styleEl = document.createElement('style');
        this.styleEl.setAttribute('data-xflow-core', '1');
        this.styleEl.textContent = `
            /* 镇压原版网页，但不阻止其脚本运行以免抛错 */
            body > *:not(#xflow-app-root) { display: none !important; opacity: 0 !important; pointer-events: none !important; height: 0 !important; overflow: hidden !important; }
            html, body { background: var(--bg-base) !important; margin: 0 !important; overflow: hidden !important; width: 100vw !important; height: 100vh !important; }
        `;
        (document.head || document.documentElement).appendChild(this.styleEl);

        // 2. 创建一个绝对独立的沙盒容器，不修改原有网页自身的 DOM 结构
        this.appRoot = document.createElement('div');
        this.appRoot.id = 'xflow-app-root';
        this.appRoot.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647; background: var(--bg-base); color: var(--text-100); overflow: hidden;';

        const targetHost = document.body || document.documentElement;
        targetHost.appendChild(this.appRoot);

        // 3. 终极防御：如果 Next.js 或 React Hydration 强行重写了 body 删除了我们的沙盒，瞬间重塑它
        const rootObserver = new MutationObserver(() => {
            if (!document.getElementById('xflow-app-root') && document.body && this.appRoot) {
                log('警告：检测到 React 试图抹除 X-Flow 容器，自动执行纳米级重组...');
                document.body.appendChild(this.appRoot);
            }
            if (!document.querySelector('style[data-xflow-core]') && this.styleEl) {
                (document.head || document.documentElement).appendChild(this.styleEl);
            }
            if (!document.querySelector('meta[name="referrer"]')) {
                const mr = document.createElement('meta');
                mr.name = 'referrer';
                mr.content = 'no-referrer';
                (document.head || document.documentElement).appendChild(mr);
            }
        });
        rootObserver.observe(document.documentElement, { childList: true, subtree: true });

        // 4. 初始化自引导
        this.bootSystem();

        // 5. 解除先前的防御性隐藏，让我们的沙盒显示
        const hideStyle = document.getElementById('xflow-hide-fouc');
        if (hideStyle?.parentNode) {
            hideStyle.remove();
        }
        document.documentElement.style.display = '';
    }

    private bootSystem() {
        log('系统清理与重建中...');

        document.documentElement.className = '';

        // 1. 设置 Title
        document.title = 'X-Flow | 极境流媒体';

        // 2. 注入外部字体链接 (仅当尚未存在时)
        if (!document.querySelector('link[href*="family=Syne"]')) {
            const fontLinks = document.createElement('div');
            fontLinks.innerHTML = `
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@500;700;800&display=swap" rel="stylesheet">
            `;
            while (fontLinks.firstChild) {
                document.head.appendChild(fontLinks.firstChild);
            }
        }

        // 3. 重新确立我们的保护样式以防意外
        if (this.styleEl) {
            document.head.appendChild(this.styleEl);
        }

        // 4. 清理原始 Body 的 class
        document.body.className = '';

        // 5. 初始化业务 Layout
        const layout = new Layout();
        layout.init(this.appRoot!);
    }
}