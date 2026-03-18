import { Layout } from './Layout';
import { log } from '../utils/Logger';
import appCssText from '../styles/player.css?inline';

/**
 * 职责：
 * 1. document-start 阶段立即隐藏原站（防 FOUC）+ window.stop() 停止资源加载
 * 2. body 就绪后清空 documentElement.innerHTML 物理替换 DOM
 * 3. 重新注入应用 CSS 并启动业务
 *
 * 注意：不使用 document.write() — 因为在 DOMContentLoaded 后调用会触发
 * Next.js 客户端路由的 fallback browser navigation，导致原站重新加载覆盖我们的内容。
 * 使用 innerHTML 替换则不会触发新的导航。
 */
export class Sandbox {
    private static _instance: Sandbox;
    private appRoot: HTMLElement | null = null;

    private constructor() { }

    public static getInstance() {
        if (!Sandbox._instance) {
            Sandbox._instance = new Sandbox();
        }
        return Sandbox._instance;
    }

    public initialize() {
        // Phase 1: document-start — 立即阻止原站资源加载 + 隐藏页面防 FOUC
        try { window.stop(); } catch { /* ignore */ }

        try {
            const s = document.createElement('style');
            s.id = 'xflow-hide-fouc';
            s.textContent = 'html{display:none!important}';
            (document.documentElement || document.head || document.body)?.appendChild(s);
        } catch { /* DOM not ready yet */ }

        // Phase 2: 等 body 就绪后物理替换整个 DOM
        const doReplace = () => {
            // 清空并重建整个 DOM 树
            // 使用 innerHTML 替换而非 document.write() 以避免触发 Next.js 客户端路由
            document.documentElement.innerHTML =
                '<head>' +
                '<meta charset="UTF-8">' +
                '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">' +
                '<meta name="referrer" content="no-referrer">' +
                '<title>X-Flow | \u6781\u5883\u6d41\u5a92\u4f53</title>' +
                '</head>' +
                '<body style="margin:0;overflow:hidden;width:100vw;height:100vh;background:#0D0D12;">' +
                '<div id="xflow-app-root" style="position:fixed;inset:0;z-index:2147483647;background:var(--bg-base);color:var(--text-100);overflow:hidden;"></div>' +
                '</body>';

            // 重新注入应用 CSS（原 GM_addStyle 注入的样式随 head 被清除）
            this.injectAppCss();

            // 注入字体
            const fontLinks = document.createElement('div');
            fontLinks.innerHTML =
                '<link rel="preconnect" href="https://fonts.googleapis.com">' +
                '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
                '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@500;700;800&display=swap" rel="stylesheet">';
            while (fontLinks.firstChild) {
                document.head.appendChild(fontLinks.firstChild);
            }

            // 启动业务
            this.appRoot = document.getElementById('xflow-app-root');
            log('Sandbox: DOM 替换完成，干净环境就绪');
            const layout = new Layout();
            layout.init(this.appRoot!);
        };

        if (document.body) {
            doReplace();
        } else if (document.documentElement) {
            const observer = new MutationObserver(() => {
                if (document.body) {
                    observer.disconnect();
                    doReplace();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        } else {
            // Via/360 极端情况：连 documentElement 都不存在
            // 轮询等待
            const timer = setInterval(() => {
                if (document.body) {
                    clearInterval(timer);
                    doReplace();
                } else if (document.documentElement && !document.body) {
                    clearInterval(timer);
                    const observer = new MutationObserver(() => {
                        if (document.body) {
                            observer.disconnect();
                            doReplace();
                        }
                    });
                    observer.observe(document.documentElement, { childList: true, subtree: true });
                }
            }, 4);
        }
    }

    private injectAppCss() {
        if (typeof GM_addStyle === 'function') {
            GM_addStyle(appCssText);
            return;
        }
        const style = document.createElement('style');
        style.setAttribute('data-xflow-app', '1');
        style.textContent = appCssText;
        (document.head || document.documentElement).appendChild(style);
    }
}
