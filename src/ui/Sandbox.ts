import { Layout } from './Layout';
import { log } from '../utils/Logger';
import appCssText from '../styles/player.css?inline';

/**
 * Sandbox — document.open() 模式
 *
 * main.ts 已通过 document.open()/write()/close() 重写了整个文档。
 * document.body 和 #xflow-app-root 已存在。
 *
 * 职责：
 *   1. 注入 CSS + 字体
 *   2. 固定时长 Splash 遮罩（掩盖源站闪白）
 *   3. 后台网络检测 → 失败时在主界面顶部弹出 Banner
 *   4. 启动 Layout
 */
export class Sandbox {
    private static _instance: Sandbox;
    private appRoot: HTMLElement | null = null;

    /** 网络探测超时 */
    private static readonly PROBE_TIMEOUT = 4000;

    private constructor() { }

    public static getInstance() {
        if (!Sandbox._instance) {
            Sandbox._instance = new Sandbox();
        }
        return Sandbox._instance;
    }

    public async initialize() {
        if (this.appRoot) return;

        try {
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

            // ── Splash 进度推进 ──────────────────────────────────────
            this.splashProgress(30);

            // ── 并行：后台网络检测 + Layout 初始化 ───────────────────
            // 网络检测完全不阻塞主流程，结果出来后在主界面插 banner
            void this.checkNetworkInBackground();

            // 启动业务
            this.splashProgress(60);
            this.appRoot = this.ensureAppRoot();
            this.appRoot.dataset.xflowState = 'booting';
            log('Sandbox: document.open() clean slate ready');
            const layout = new Layout();
            layout.init(this.appRoot);

            // Layout 渲染完成
            this.splashProgress(100);
            this.appRoot.dataset.xflowState = 'ready';
        } catch (e) {
            // 捕获任意初始化异常；不要 rethrow（防止 finally 中 hideSplash 被跳过）
            console.error('X-Flow Sandbox init error:', e);
            this.appRoot = this.appRoot || document.getElementById('xflow-app-root');
            if (this.appRoot) this.appRoot.dataset.xflowState = 'failed';
        } finally {
            // ✅ 无论成功或失败，Splash 必须移除
            // 否则 z-index:2147483647 的遮罩会永久盖住整个页面（表现为黑屏）
            await this.hideSplash();
        }
    }

    private ensureAppRoot() {
        const existingRoot = document.getElementById('xflow-app-root');
        if (existingRoot instanceof HTMLElement) {
            return existingRoot;
        }

        log('Sandbox: appRoot missing after document.write() — rebuilding shell');

        const body = document.body || document.createElement('body');
        if (!document.body) {
            body.style.cssText = 'margin:0;overflow:hidden;width:100dvw;height:100dvh;background:#0D0D12';
            document.documentElement.appendChild(body);
        }

        const rebuiltRoot = document.createElement('div');
        rebuiltRoot.id = 'xflow-app-root';
        rebuiltRoot.style.cssText = 'width:100%;height:100%;background:var(--bg-base,#0D0D12);color:var(--text-100,#fff);overflow:hidden;position:relative';
        body.prepend(rebuiltRoot);
        return rebuiltRoot;
    }

    // ─── Splash Screen ──────────────────────────────────────────

    private splashProgress(pct: number) {
        const bar = document.getElementById('xflow-splash-bar');
        if (bar) bar.style.width = pct + '%';
    }

    /** 平滑隐藏 splash，固定 600ms 过渡 */
    private hideSplash(): Promise<void> {
        return new Promise((resolve) => {
            const splash = document.getElementById('xflow-splash');
            if (!splash) { resolve(); return; }

            // 短暂停留确保主界面已首次渲染
            setTimeout(() => {
                splash.style.opacity = '0';
                splash.style.transform = 'scale(1.04)';
                splash.style.pointerEvents = 'none';

                setTimeout(() => {
                    splash.remove();
                    resolve();
                }, 600);
            }, 200);
        });
    }

    // ─── Network Check (Background) ─────────────────────────────

    /**
     * 后台双链路探测，完全不阻塞 UI。
     * 失败时在主界面顶部插入警告 Banner。
     */
    private async checkNetworkInBackground() {
        try {
            const TIMEOUT = Sandbox.PROBE_TIMEOUT;

            const probeImage = (): Promise<boolean> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    const timer = setTimeout(() => resolve(false), TIMEOUT);
                    img.onload = () => { clearTimeout(timer); resolve(true); };
                    img.onerror = () => {
                        clearTimeout(timer);
                        // CORS onerror ≠ 网络不可达，视为可达
                        resolve(true);
                    };
                    img.src = 'https://pbs.twimg.com/profile_images/1/normal.jpg?' + Date.now();
                });
            };

            const probeVideo = (): Promise<boolean> => {
                return new Promise((resolve) => {
                    const timer = setTimeout(() => resolve(false), TIMEOUT);
                    try {
                        GM_xmlhttpRequest({
                            method: 'HEAD',
                            url: 'https://video.twimg.com/ext_tw_video/1/pu/vid/avc1/270x480/probe.mp4?' + Date.now(),
                            timeout: TIMEOUT,
                            onload: () => { clearTimeout(timer); resolve(true); },
                            onerror: () => { clearTimeout(timer); resolve(false); },
                            ontimeout: () => { clearTimeout(timer); resolve(false); },
                        });
                    } catch {
                        clearTimeout(timer);
                        resolve(false);
                    }
                });
            };

            const [imgOk, videoOk] = await Promise.all([probeImage(), probeVideo()]);

            if (imgOk && videoOk) {
                log('Network check: OK');
                return;
            }

            log(`Network check failed: image=${imgOk}, video=${videoOk}`);
            this.showNetworkBanner();
        } catch (error) {
            console.error('X-Flow network check error:', error);
        }
    }

    /**
     * 在主界面顶部插入一条可关闭的警告 Banner。
     */
    private showNetworkBanner() {
        // 防重复
        if (document.getElementById('xflow-net-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'xflow-net-banner';
        banner.style.cssText = [
            'position: fixed; top: 0; left: 0; right: 0; z-index: 9999;',
            'padding: calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px;',
            'background: linear-gradient(135deg, rgba(255,60,80,0.92), rgba(200,40,60,0.92));',
            'backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);',
            'color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
            'font-size: 13px; font-weight: 500; text-align: center; line-height: 1.6;',
            'box-shadow: 0 4px 24px rgba(0,0,0,0.3);',
            'transform: translateY(-100%); animation: xf-banner-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards;',
        ].join('');

        banner.innerHTML = [
            '<div style="max-width:480px;margin:0 auto;">',
                '<span style="font-weight:700;">⚠ 网络环境异常</span>',
                '<br>',
                '<span style="opacity:0.85;">当前网络环境不稳定，请合法合规访问境外网站</span>',
            '</div>',
            '<button id="xflow-net-banner-close" style="',
                'position:absolute; top:50%; right:12px; transform:translateY(-50%);',
                'background:rgba(255,255,255,0.2); border:none; color:#fff;',
                'width:24px; height:24px; border-radius:50%; cursor:pointer;',
                'display:flex; align-items:center; justify-content:center;',
                'font-size:14px; line-height:1; transition: background 0.2s;',
            '">✕</button>',
        ].join('');

        // 注入关闭动画 keyframe
        if (!document.getElementById('xflow-banner-style')) {
            const s = document.createElement('style');
            s.id = 'xflow-banner-style';
            s.textContent = '@keyframes xf-banner-in{from{transform:translateY(-100%)}to{transform:translateY(0)}}';
            document.head.appendChild(s);
        }

        document.body.appendChild(banner);

        // 关闭按钮
        document.getElementById('xflow-net-banner-close')?.addEventListener('click', () => {
            banner.style.transform = 'translateY(-100%)';
            banner.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 1, 1)';
            setTimeout(() => banner.remove(), 350);
        });

        // 15 秒后自动消失
        setTimeout(() => {
            if (banner.parentElement) {
                banner.style.transform = 'translateY(-100%)';
                banner.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 1, 1)';
                setTimeout(() => banner.remove(), 350);
            }
        }, 15000);
    }
}
