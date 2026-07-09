# React Hydration 共存防御 + FOUC 白屏消除

- **Subject:** Sandbox 接管 React/Next.js 宿主时，既要避免水合错误，又要消除可见白屏
- **Env:** React, Next.js, Userscript Sandbox, iOS Safari / Mobile Chrome / Desktop Chrome
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Status:** ✅ **已解决 (v5.0.9)** — 三层防御策略：Pre-emptive API 冻结 + document.open() + CSP

- **Issue:**
  1. `Error: Minified React error #418;` — `document.open()` 替换文档后，React zombie 代码检测到 DOM 不匹配。
  2. **间歇性注入失败** — `@run-at document-start` 在缓存命中场景下不保证在 React inline 脚本之前执行，导致 React zombie 代码通过 `location.replace()` / `location.reload()` 导航离开。
  3. **需要多次刷新** — 每次刷新都是一次独立的 timing race，有时赢有时输。

- **Root Cause (v5.0.9 确认):**
  - `window` 对象在 `document.open()` 后存活，React zombie 代码（定时器、微任务、rAF 回调、window 事件监听）继续运行
  - React 内部 try-catch 捕获 #418 → Next.js "Falling back to browser navigation" → `location.replace()` → 页面导航离开
  - `location.href` setter 不可覆写（Web 安全铁律），但 `location.replace/assign/reload` **可以覆写**

- **Solution (三层防御 ✅):**

  **Layer 1 — Pre-emptive（在 document.open() 之前）:**
  - `window.onerror = () => true` + `unhandledrejection` handler — 全局错误抑制
  - 覆写 `location.replace/assign/reload` + `history.pushState/replaceState` 为 noop — 冻结导航
  - `window.stop()` — 取消所有挂起的网络请求（React chunk 加载）
  - 清除所有定时器（循环 clearTimeout/clearInterval 到 sentinel ID）
  - `requestAnimationFrame = () => 0` — 冻结 React 渲染循环

  **Layer 2 — Nuclear（document.open() + CSP，不变）:**
  - `document.open()` 中止解析器 + `document.write()` 写入干净文档 + CSP meta

  **Layer 3 — Post-write（恢复与验证）:**
  - 恢复 `requestAnimationFrame`（X-Flow 自身需要）
  - 切换到选择性错误处理（只抑制 React 关键词错误，放行 X-Flow 错误）
  - 10 秒后完全恢复 `window.onerror = null`

- **Action_Steps:**
  ```typescript
  // ── Layer 1: Pre-emptive 防御（在 document.open() 之前）──

  // ❌ BAD — 只做 document.open()，React zombie 代码仍可导航
  document.open();
  document.write('...');
  document.close();

  // ✅ GOOD — 三层防御
  // 1a. 全局错误抑制
  window.onerror = () => true;
  window.addEventListener('unhandledrejection', (e) => { e.preventDefault(); });
  window.addEventListener('error', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
  }, true);

  // 1b. 冻结导航 API（location.href 不可覆写，但 replace/assign/reload 可以）
  try { window.location.replace = (() => {}) as any; } catch (_) {}
  try { window.location.assign = (() => {}) as any; } catch (_) {}
  try { window.location.reload = (() => {}) as any; } catch (_) {}
  try { window.history.pushState = (() => {}) as any; } catch (_) {}
  try { window.history.replaceState = (() => {}) as any; } catch (_) {}
  window.open = () => null;

  // 1c. 停止网络请求 + 清除定时器 + 冻结 rAF
  window.stop();
  const sentinel = window.setTimeout(() => {}, 0);
  for (let i = 1; i < sentinel; i++) { clearTimeout(i); clearInterval(i); }
  clearTimeout(sentinel);
  const origRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = () => 0;

  // 2. Nuclear: document.open() + CSP（不变）
  document.open();
  document.write('...');
  document.close();

  // 3. Post-write: 恢复
  window.requestAnimationFrame = origRAF;
  window.onerror = (msg) => {
      if (typeof msg === 'string' && msg.includes('React')) return true;
      return false;
  };
  setTimeout(() => { window.onerror = null; }, 10000);
  ```

- **AI_Guidance:**
  - **ALWAYS:** 在 `document.open()` 之前执行 Layer 1 防御——即使 `document-start` 通常足够早，缓存场景下可能不够。
  - **ALWAYS:** 用 `try-catch` 包裹 `location.*` 覆写——不同浏览器对 location 属性的可覆写性不同。
  - **ALWAYS:** `document.open()` 后恢复 `requestAnimationFrame`——X-Flow 自身动画依赖它。
  - **ALWAYS:** 10 秒后移除全局错误抑制——避免永久吞掉 X-Flow 自身的 bug。
  - **NEVER:** 假设 `location.href` 可以被 JS 覆写——它不可以，但 `location.replace` 可以。
  - **NEVER:** 删除 Layer 1 防御——即使 "好像不需要"，在边缘 timing 场景下它是救命的。
  - **NEVER:** 将此文件作为放弃 CSP 的理由——CSP（Layer 2）仍然是核心，Layer 1 只是补充。
