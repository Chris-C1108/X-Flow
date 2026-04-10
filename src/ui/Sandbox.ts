import { Layout } from './Layout';
import { log } from '../utils/Logger';
import appCssText from '../styles/player.css?inline';

/**
 * Sandbox — document.open() 模式
 *
 * main.ts 已通过 document.open()/write()/close() 重写了整个文档。
 * document.body 和 #xflow-app-root 已存在。
 *
 * 职责仅剩：注入 CSS + 字体 → 启动 Layout。
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
        if (this.appRoot) return;

        // iOS Safari: document.baseURI null → Vite URL 构造崩溃
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

        // 注入应用 CSS
        const style = document.createElement('style');
        style.setAttribute('data-xflow-app', '1');
        style.textContent = appCssText;
        document.head.appendChild(style);

        // 注入字体
        const fontFrag = document.createDocumentFragment();
        const preconnect1 = document.createElement('link');
        preconnect1.rel = 'preconnect';
        preconnect1.href = 'https://fonts.googleapis.com';
        fontFrag.appendChild(preconnect1);

        const preconnect2 = document.createElement('link');
        preconnect2.rel = 'preconnect';
        preconnect2.href = 'https://fonts.gstatic.com';
        preconnect2.crossOrigin = '';
        fontFrag.appendChild(preconnect2);

        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@500;700;800&display=swap';
        fontFrag.appendChild(fontLink);

        document.head.appendChild(fontFrag);

        // 启动业务
        this.appRoot = document.getElementById('xflow-app-root')!;
        log('Sandbox: document.open() clean slate ready');
        const layout = new Layout();
        layout.init(this.appRoot);
    }
}
