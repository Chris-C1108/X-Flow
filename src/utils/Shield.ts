export class Shield {
    public static activate() {
        console.log('🛡️ [X-Flow Shield] 启动终极反劫持防御层...');

        // 1. 修复 iOS Safari 在 document-start 阶段 document.baseURI 为 null 导致 Vite 解析崩溃的底层 Bug
        const OriginalURL = window.URL;
        window.URL = new Proxy(OriginalURL, {
            // @ts-ignore
            construct(target, args) {
                // 如果 base 参数被显式传入了 null（原生的 Safari 会抛出解析异常），跳过 null 参数
                if (args.length > 1 && args[1] === null) {
                    return new target(args[0]);
                }
                // @ts-ignore
                return new target(...args);
            }
        });

        // 2. 拦截底层 addEventListener，禁止原网站在 window 和 document 上绑定点击跳转
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // 如果是拦截重点对象（window, document），且事件类型是点击或触摸
            if ((this === window || this === document) && 
                ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'pointerdown'].includes(type as string)) {
                
                console.log(`🛡️ [X-Flow Shield] 阻止全局恶意事件监听绑定: ${type}`);
                return; 
            }
            // 放行正常事件
            return originalAddEventListener.call(this, type, listener, options);
        };

        // 2. 废掉流氓网站常用的隐式弹窗和跳转 API
        window.open = function() {
            console.log("🛡️ [X-Flow Shield] 拦截 window.open 弹窗...");
            return null; 
        };

        // 3. 彻底禁用 beforeunload 恶意强留/重定向尝试
        window.addEventListener('beforeunload', (e) => {
            console.log("🛡️ [X-Flow Shield] 拦截页面离开/重定向尝试");
            // e.preventDefault();
        });

        // 4. 清理可能已经存在的透明全屏遮罩层 (Clickjacker)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    const el = node as HTMLElement;
                    if (el && (el.tagName === 'DIV' || el.tagName === 'A')) {
                        try {
                            const style = window.getComputedStyle(el);
                            // 发现全屏透明元素，直接删掉
                            if (style.position === 'absolute' || style.position === 'fixed') {
                                if (parseInt(style.zIndex || '0') > 9000 && parseInt(style.width || '0') > window.innerWidth * 0.8) {
                                    if (el.id !== 'xflow-app-root') {
                                        console.log("🛡️ [X-Flow Shield] 移除全屏透明劫持层", el);
                                        el.remove();
                                    }
                                }
                            }
                        } catch (e) {
                            // ignore GetComputedStyle throws on detached nodes
                        }
                    }
                });
            });
        });
        
        // 页面加载后开始监视 DOM 变化，防止广告动态注入
        if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    }
}
