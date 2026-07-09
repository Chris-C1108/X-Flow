# Safari Null baseURI 解析崩溃修复

- **Subject:** Dev 模式下注入 `about:blank` 时 Vite Client 加载崩溃
- **Env:** Vite 5, vite-plugin-monkey, iOS Safari
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** `TypeError: "...@vite/client" cannot be parsed as a URL against "null".` 在 iOS 平台上，因注入到了如 `about:blank` 内，导致 `document.baseURI` 为 `null`，原生 Safari 的 `new URL` 解析报错卡死。
- **Solution:** 明确关闭 iframe 注入 (`noframes: true`) 强制用户重装 dev 脚本，并且通过 Proxy 补丁拦截修复原生 `URL` 构造函数应对第二个参数为 `null` 时的健壮性。
- **Action_Steps:**
  ```typescript
  // 配置中杜绝 iframe
  // vite.config.ts -> userscript: { noframes: true }

  // 代码入口增加应对环境补丁
  const OriginalURL = window.URL;
  window.URL = new Proxy(OriginalURL, {
      construct(target, args) {
          if (args.length > 1 && args[1] === null) {
              return new target(args[0]); // Safari 下跳过 null 参数防止抛出异常
          }
          return new target(...args);
      }
  });
  ```
- **AI_Guidance:** 
  - **ALWAYS:** 在排查 iOS 环境 Userscript 注入导致的诡异加载问题时，检查宿主是否包含 `about:blank` 的 iframe。
  - **NEVER:** 不要假设 `document.baseURI` 永远为有效地 String, 特别是 iOS 与极端沙箱内。
