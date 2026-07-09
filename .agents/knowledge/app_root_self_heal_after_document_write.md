# App Root Self-Heal After Document Write

- **Subject:** `document.open()/write()/close()` 后理论上应存在的 `#xflow-app-root` 在真实 Tampermonkey 环境里偶发缺失。
- **Env:** Tampermonkey + vite-plugin-monkey + `document-start` userscript takeover
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** 启动代码若直接写 `document.getElementById('xflow-app-root')!`，一旦宿主页、扩展注入器或浏览器时序导致节点未落地，就会在 `.dataset` / `layout.init()` 处直接抛 `TypeError: Cannot read properties of null`，随后 splash 被 finally 移除，页面进入“接管失败但无 UI”的状态。
- **Solution:** 在 `Sandbox.initialize()` 中对 `appRoot` 做自愈重建。缺失时立即补建 `body` 和 `#xflow-app-root`，再继续后续初始化，而不是依赖 non-null assertion。
- **Action_Steps:**
  ```typescript
  // ❌ BAD — 假设 document.write 后节点必然存在
  this.appRoot = document.getElementById('xflow-app-root')!;
  this.appRoot.dataset.xflowState = 'booting';

  // ✅ GOOD — 缺失时就地自愈
  const existingRoot = document.getElementById('xflow-app-root');
  if (existingRoot instanceof HTMLElement) return existingRoot;

  const body = document.body || document.createElement('body');
  if (!document.body) document.documentElement.appendChild(body);

  const rebuiltRoot = document.createElement('div');
  rebuiltRoot.id = 'xflow-app-root';
  body.prepend(rebuiltRoot);
  return rebuiltRoot;
  ```
- **AI_Guidance:** **ALWAYS** 把 `document.write()` 生成的关键节点当作“可能缺失，需要校验”的边界条件。**ALWAYS** 在启动链路里优先自愈，而不是把 null 继续传给 Layout。**NEVER** 对 `document.getElementById('xflow-app-root')` 使用 `!` 非空断言后立刻访问属性。**NEVER** 看到 `dataset of null` 就只修 catch；根因是启动前提不成立。
