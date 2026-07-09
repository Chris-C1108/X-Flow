# 宿主晚到脚本清空 DOM 的恢复策略

- **Subject:** Userscript 已经完成 `document.open()` 接管并渲染 UI，但宿主站点的晚到 `load` 回调 / 残留事件处理又把 `body` 或 `#xflow-app-root` 清空，导致界面黑屏或需要多次刷新。
- **Env:** Tampermonkey, `@run-at document-start`, `document.open()` clean document, 同窗口宿主脚本残留回调
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** Console 出现 `X-Flow: appRoot missing or empty — re-injecting!`，前面通常已经有 `PoolManager` 数据加载日志，说明不是首轮注入太晚，而是**注入成功后 DOM 又被篡改**。
- **Solution:** 不要只靠一次性 `setTimeout` 检查 `appRoot.children.length`。必须：1）对 `Sandbox.initialize()` 显式 `.catch()`，避免初始化 rejection 被全局 `unhandledrejection` 吞掉；2）以 `.app-layout` / `#main-scroll` 作为完整 app shell 健康检查；3）用 `MutationObserver` + `load/pageshow` 在宿主脚本篡改 DOM 时立即恢复；4）恢复前只清空 `body`，不要清空 `head`，并补齐 `<meta referrer>` / CSP。
- **Action_Steps:**
  ```typescript
  // ❌ BAD — 只做一次 children.length 检查，且不处理 async initialize rejection
  const sandbox = Sandbox.getInstance();
  sandbox.initialize();
  setTimeout(() => {
      const appRoot = document.getElementById('xflow-app-root');
      if (!appRoot || appRoot.children.length === 0) {
          document.body.innerHTML = '';
      }
  }, 3000);

  // ✅ GOOD — 显式 catch + 完整 app shell 健康检查 + DOM 篡改恢复
  const hasHealthyAppShell = () => !!document.getElementById('xflow-app-root') &&
      !!document.querySelector('.app-layout') &&
      !!document.getElementById('main-scroll');

  const bootstrapSandbox = (reason: string, forceReset = false) => {
      if (forceReset) (Sandbox as any)._instance = null;
      return Sandbox.getInstance().initialize().catch((error) => {
          console.error(`X-Flow: sandbox bootstrap failed (${reason})`, error);
          throw error;
      });
  };

  const verifyAndRecover = (reason: string) => {
      if (document.getElementById('xflow-splash')) return;
      if (hasHealthyAppShell()) return;
      // 只重建 body，保留 monkey 注入样式和 head 里的关键 meta
      recoverAppShell(reason);
  };

  void bootstrapSandbox('initial boot');
  new MutationObserver(() => verifyAndRecover('dom mutation'))
      .observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', () => verifyAndRecover('window.load'), { once: true });
  ```
- **AI_Guidance:**
  - **ALWAYS:** 先判断这是“首轮注入太晚”还是“注入成功后 DOM 被宿主脚本再次清空”。若日志里已出现 `PoolManager` / `Layout` 成功加载，再出现黑屏，优先怀疑后者。
  - **ALWAYS:** 对 `async initialize()` 使用显式 `.catch()`，否则全局错误抑制会把真实启动异常吞掉。
  - **ALWAYS:** 恢复时保留 `document.head`，只重建 `body` 和 app shell。
  - **NEVER:** 仅用 `appRoot.children.length` 作为健康判断；异步重绘和宿主篡改会让这个条件误报。
  - **NEVER:** 把这类问题误判成单纯 CSS/字体问题；先看是否发生了后续 DOM wipe。
