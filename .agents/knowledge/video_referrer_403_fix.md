# Video CDN Referrer 403 修复

- **Subject:** video.twimg.com CDN 返回 403，视频无法加载
- **Env:** Chrome 145+, vite-plugin-monkey ^4.0, Tampermonkey, video.twimg.com CDN
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** `<video>` 元素的 `referrerpolicy="no-referrer"` 属性对 Chrome 媒体请求无效，浏览器仍然发送 `Referer: https://twitter-ero-video-ranking.com/` 头，导致 Twitter CDN 返回 403 空响应。
  ```
  Autoplay prevented NotSupportedError: Failed to load because no supported source was found.
  // Network tab 显示 video.twimg.com 返回 status 403, response body 为空
  ```
- **Solution:** 在 `document-start` 阶段注入文档级 `<meta name="referrer" content="no-referrer">`，全局抑制所有跨域请求的 Referer 头。同时用 MutationObserver 防御 React Hydration 删除该 meta 标签。
- **Action_Steps:**
  ```typescript
  // ❌ BAD — 依赖元素级 referrerpolicy（Chrome 对媒体元素不可靠）
  videoEl.setAttribute('referrerpolicy', 'no-referrer');

  // ❌ BAD — 使用 crossorigin（会触发 CORS 预检，CDN 不支持）
  videoEl.setAttribute('crossorigin', 'anonymous');

  // ✅ GOOD — 在 Sandbox.initialize() 中注入文档级 meta（document-start 阶段）
  const metaReferrer = document.createElement('meta');
  metaReferrer.name = 'referrer';
  metaReferrer.content = 'no-referrer';
  (document.head || document.documentElement).appendChild(metaReferrer);

  // ✅ GOOD — 在 MutationObserver 中防御 React Hydration 删除
  if (!document.querySelector('meta[name="referrer"]')) {
      const mr = document.createElement('meta');
      mr.name = 'referrer';
      mr.content = 'no-referrer';
      (document.head || document.documentElement).appendChild(mr);
  }
  ```
- **AI_Guidance:**
  - **ALWAYS:** 遇到跨域媒体 403 时，首先在 DevTools Network tab 检查请求的 `Referer` 头。
  - **ALWAYS:** 使用 `<meta name="referrer">` 文档级策略抑制 Referer。
  - **ALWAYS:** 配合 MutationObserver 保护 meta 标签不被宿主页面的框架删除。
  - **NEVER:** 依赖 `<video referrerpolicy>` 元素级属性——Chrome 对媒体元素的支持不可靠。
  - **NEVER:** 使用 `crossorigin="anonymous"`——Twitter CDN 不返回 CORS 头，会预检失败。
