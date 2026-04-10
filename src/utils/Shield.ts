export class Shield {
    public static activate() {
        console.log('🛡️ [X-Flow Shield] 启动终极反劫持防御层...');

        // ─────────────────────────────────────────────────────────
        // Fix 0: iOS Safari document.baseURI null 导致 Vite URL 构造崩溃
        // ─────────────────────────────────────────────────────────
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
        } catch (e) {
            console.warn('🛡️ [X-Flow Shield] URL Proxy 安装失败（可忽略）:', e);
        }

        // ─────────────────────────────────────────────────────────
        // Fix 1: 锁死 window.location — 拦截 Tab-under 核心手段
        //   恶意代码路径: location.href = "..." / location.replace("...")
        //   注意: 必须用 Object.defineProperty 覆盖，赋值拦截 setter 即可
        // ─────────────────────────────────────────────────────────
        try {
            const originalLocation = window.location;
            const ownDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
            // 仅在 location 可被重新定义时操作（Chrome/Firefox 通常不允许，Safari 有时可以）
            if (!ownDescriptor || ownDescriptor.configurable) {
                Object.defineProperty(window, 'location', {
                    get: () => originalLocation,
                    set: (v: string) => {
                        console.log('🛡️ [X-Flow Shield] 拦截 window.location 赋值:', v);
                        // 不执行跳转
                    },
                    configurable: false,
                });
            }
        } catch (e) {
            console.warn('🛡️ [X-Flow Shield] location defineProperty 失败，尝试 href/replace 拦截');
        }

        // 无论 defineProperty 是否成功，都补丁 location.href setter + location.replace/assign
        try {
            const proto = Object.getPrototypeOf(window.location);
            const hrefDesc = Object.getOwnPropertyDescriptor(proto, 'href') ||
                             Object.getOwnPropertyDescriptor(window.location, 'href');

            if (hrefDesc && hrefDesc.set) {
                const originalHrefSetter = hrefDesc.set;
                Object.defineProperty(proto, 'href', {
                    get: hrefDesc.get,
                    set(v: string) {
                        console.log('🛡️ [X-Flow Shield] 拦截 location.href 设置:', v);
                        // 不跳转
                    },
                    configurable: true,
                });
            }
        } catch (e) { /* ignore */ }

        try {
            const noop = (url?: string) => {
                console.log('🛡️ [X-Flow Shield] 拦截 location.replace/assign:', url);
            };
            window.location.replace = noop as typeof window.location.replace;
            window.location.assign  = noop as typeof window.location.assign;
        } catch (e) { /* iOS 可能不允许重写，忽略 */ }

        // ─────────────────────────────────────────────────────────
        // Fix 2: 拦截 addEventListener (目标: window, document, body)
        //   + 拦截 on* 属性直接赋值（addEventListener 无法覆盖这条路径）
        // ─────────────────────────────────────────────────────────
        const BLOCKED_EVENTS = new Set([
            'click', 'mousedown', 'mouseup',
            'touchstart', 'touchend', 'touchmove',
            'pointerdown', 'pointerup',
        ]);

        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            const isGlobalTarget = this === window || this === document || this === document.body;
            if (isGlobalTarget && BLOCKED_EVENTS.has(type as string)) {
                console.log(`🛡️ [X-Flow Shield] 阻止全局恶意事件监听绑定: ${type}`);
                return;
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        // 拦截 on* 属性赋值 (e.g. window.onclick = ..., document.onmousedown = ...)
        Shield._blockOnEventProperties(window);
        Shield._blockOnEventProperties(document);
        // body 可能尚未存在，待 DOM ready 后补上
        const bodyBlockOnce = () => {
            if (document.body) {
                Shield._blockOnEventProperties(document.body);
            }
        };
        document.addEventListener('DOMContentLoaded', bodyBlockOnce, { once: true, capture: true });
        setTimeout(bodyBlockOnce, 0);

        // ─────────────────────────────────────────────────────────
        // Fix 3: 废掉 window.open (维持原有逻辑，Tab-under 第一步)
        // ─────────────────────────────────────────────────────────
        window.open = function(url?: string | URL) {
            console.log('🛡️ [X-Flow Shield] 拦截 window.open:', url);
            return null;
        };

        // ─────────────────────────────────────────────────────────
        // Fix 4: 拦截跨框架 postMessage 的 null target 报错
        //   日志: TypeError: null is not an object (evaluating 't.postMessage')
        //   原因: 宿主广告 iframe 已被移除，广告代码仍尝试调用 postMessage
        // ─────────────────────────────────────────────────────────
        try {
            const originalPostMessage = window.postMessage.bind(window);
            window.postMessage = function(message: unknown, targetOrigin: string, transfer?: Transferable[]) {
                if (targetOrigin === null || targetOrigin === undefined) {
                    console.warn('🛡️ [X-Flow Shield] 拦截 null targetOrigin postMessage');
                    return;
                }
                return originalPostMessage(message, targetOrigin, transfer ?? []);
            };
        } catch (e) { /* ignore */ }

        // ─────────────────────────────────────────────────────────
        // Fix 5: MutationObserver 清理动态注入的全屏透明劫持层
        // ─────────────────────────────────────────────────────────
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    const el = node as HTMLElement;
                    if (!el || !el.tagName) continue;
                    if (el.tagName !== 'DIV' && el.tagName !== 'A' && el.tagName !== 'SPAN') continue;
                    if (el.id === 'xflow-app-root') continue;

                    try {
                        const style = window.getComputedStyle(el);
                        const z = parseInt(style.zIndex || '0');
                        const w = parseFloat(style.width || '0');
                        const isFullscreen = (style.position === 'fixed' || style.position === 'absolute')
                            && z > 9000
                            && w > window.innerWidth * 0.8;
                        if (isFullscreen) {
                            console.log('🛡️ [X-Flow Shield] 移除全屏透明劫持层', el.tagName, el.id, el.className);
                            el.remove();
                        }
                    } catch (_) {
                        // getComputedStyle on detached nodes may throw
                    }
                }
            }
        });

        if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }

        console.log('🛡️ [X-Flow Shield] 防御层全部就位。');
    }

    /**
     * 通过 defineProperty 拦截目标对象的 on* 属性直接赋值
     * （此路径绕过了 addEventListener 劫持）
     */
    private static _blockOnEventProperties(target: EventTarget) {
        const BLOCKED_ON: string[] = [
            'onclick', 'onmousedown', 'onmouseup',
            'ontouchstart', 'ontouchend', 'ontouchmove',
            'onpointerdown', 'onpointerup',
        ];
        for (const propName of BLOCKED_ON) {
            try {
                Object.defineProperty(target, propName, {
                    get: () => null,
                    set: (v) => {
                        console.log(`🛡️ [X-Flow Shield] 拦截 ${propName} 属性直接赋值`);
                        // 丢弃赋值，不设置处理器
                    },
                    configurable: true,
                });
            } catch (_) { /* 某些属性在 strict 模式下无法重定义 */ }
        }
    }
}
