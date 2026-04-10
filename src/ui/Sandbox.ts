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
            // ⚠️ 不用 display:none 隐藏整个 html — 那会导致 1-2s 白屏
            // 改为：用黑色伪幕覆盖可见区域（视觉上无白屏），不阻塞渲染树
            s.textContent = [
                'html,body{background:#0D0D12!important;overflow:hidden!important}',
                'body>*:not(#xflow-app-root){opacity:0!important;pointer-events:none!important}',
            ].join('');
            (document.documentElement || document.head || document.body)?.appendChild(s);
        } catch { /* DOM not ready yet */ }

        // Phase 2: React 共存防御 - 选择性追加，延迟执行，防止报 #418 错误
        const doReplace = () => {
            if (this.appRoot) return; // 避免重复执行

            // 立即移除 FOUC 样式幕布（此时 X-Flow 容器将接管视觉）
            const foucEl = document.getElementById('xflow-hide-fouc');
            if (foucEl) foucEl.remove();

            // 隐藏原站所有直系节点，而不是销毁 (防止 React 水合报错)
            Array.from(document.body.children).forEach(child => {
                if (child.id !== 'xflow-app-root' && child.id !== 'xflow-hide-fouc' && child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') {
                    (child as HTMLElement).style.display = 'none';
                }
            });

            // 接管 body 样式
            document.body.style.setProperty('margin', '0', 'important');
            document.body.style.setProperty('overflow', 'hidden', 'important');
            document.body.style.setProperty('width', '100vw', 'important');
            document.body.style.setProperty('height', '100vh', 'important');
            document.body.style.setProperty('background', '#0D0D12', 'important');

            // 注入 meta
            if (!document.querySelector('meta[name="referrer"]')) {
                const metaReferrer = document.createElement('meta');
                metaReferrer.name = 'referrer';
                metaReferrer.content = 'no-referrer';
                document.head.appendChild(metaReferrer);
            }

            // 追加应用容器
            let appRoot = document.getElementById('xflow-app-root');
            if (!appRoot) {
                appRoot = document.createElement('div');
                appRoot.id = 'xflow-app-root';
                appRoot.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--bg-base);color:var(--text-100);overflow:hidden;';
                document.body.appendChild(appRoot);
            }
            
            // UI 级事件隔离 (防劫持)：阻止点击/触摸事件冒泡给可能幸存的底层劫持者
            const stopPropagation = (e: Event) => e.stopPropagation();
            appRoot.addEventListener('click', stopPropagation);
            appRoot.addEventListener('touchstart', stopPropagation);
            appRoot.addEventListener('mousedown', stopPropagation);
            appRoot.addEventListener('pointerdown', stopPropagation);
            
            this.appRoot = appRoot;

            // 重新注入应用 CSS
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
            
            // FOUC 样式已在函数顶部移除，此处不再重复

            // 启动业务
            log('Sandbox: DOM 接管完成，干净环境就绪');
            const layout = new Layout();
            layout.init(this.appRoot!);
        };

        const readyAndReplace = () => {
            // 延迟 0ms：将执行推入下一个事件循环，让 React 水合先完成一帧
            // 0ms vs 1500ms：视觉上消除白屏，React 兼容性不变
            setTimeout(doReplace, 0);
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            readyAndReplace();
        } else {
            window.addEventListener('load', readyAndReplace);
            // 兜底机制（缩短至 800ms，避免长时间白屏）
            setTimeout(readyAndReplace, 800);
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
