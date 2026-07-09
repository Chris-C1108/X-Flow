# 反广告重定向攻防总复盘 — 全部失败记录

- **Subject:** 在 Next.js 宿主页面上通过 Userscript 阻止恶意广告脚本的点击劫持和重定向
- **Env:** Tampermonkey, Next.js (React Hydration), WebKit (Stay Browser on iOS), `truvaze.com` / `twitter-ero-video-ranking.com`
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** 点击页面任意位置触发重定向到广告页面（navyrecentuproot.com → 3xyy.com → drtacs.club）
- **Solution:** ❌ **无。以下所有方案均已失败。**

## ⚠️ 失败方案清单（按时间顺序）

### 方案 1: DOM 轮询清理
- **思路:** `setInterval` 每 1-2s 轮询移除恶意 DOM 节点
- **失败原因:** 恶意脚本用微任务注入，轮询间隔远大于注入频率；产生视觉闪烁

### 方案 2: addEventListener 拦截
- **思路:** 劫持 `EventTarget.prototype.addEventListener`，拦截 click/mousedown 等事件注册
- **失败原因:** 恶意脚本用 `on*` 属性赋值（`window.onclick = ...`）或 `<a onclick="...">`，完全绕过 addEventListener 拦截

### 方案 3: on* 属性 + addEventListener 双重拦截
- **思路:** 在方案 2 基础上增加 `Object.defineProperty` 锁定 `window.onclick` 等属性
- **失败原因:** 恶意脚本改用 `location.href = ...` 直接跳转，完全不依赖事件

### 方案 4: location.assign/replace 覆写
- **思路:** 劫持 `location.assign()` 和 `location.replace()` 方法
- **失败原因:** `window.location.href` 的 setter 是浏览器原生属性，**不可通过 JS defineProperty 覆写**（Web 安全铁律）。恶意脚本直接写 `location.href = url` 绕过

### 方案 5: window.stop() 核平 + innerHTML 替换
- **思路:** 在 document-start 调用 `window.stop()` 杀死所有资源加载，然后用 `innerHTML` 替换整个文档
- **失败原因:** 
  - `window.stop()` 只停止**未开始的**资源加载，不能停止**已解析的** inline `<script>` 的执行
  - `innerHTML` 替换只清除 DOM 节点，**不清除 `window` 对象上已注册的事件监听器**
  - React inline 脚本已经执行，Hydration #418 错误触发 `location.reload()`，形成死亡循环

### 方案 6: React 全局对象冻结 + 伪造 RSC 响应
- **思路:** 用 `Object.defineProperty` 冻结 `__NEXT_DATA__` / `__NEXT_P` / `__next`，伪造 fetch 返回合法 RSC 响应以欺骗 Next.js
- **失败原因:** 
  - Next.js inline 脚本在我们的冻结代码前已执行并缓存了原始引用
  - Content Blocker（Stay Browser 原生）先于我们的 fetch proxy 拦截请求，产生原生 TypeError
  - Next.js 框架底层直接修改 `location.href`（不可拦截）触发浏览器级跳转

### 方案 7: beforeunload 铁闸
- **思路:** 用 `beforeunload` 事件阻止任何页面离开
- **失败原因:** 移动端 WebKit 中 `beforeunload` 对 programmatic navigation 的拦截行为不一致，且 `e.preventDefault()` 在某些 WebKit 版本中不触发确认弹窗

### 方案 8: createElement proxy + addEventListener 白名单（Symbol tag）
- **思路:** 用 Proxy 拦截 `document.createElement('meta')` 强制修正 referrer 值；用 Symbol 标记 X-Flow 的合法 addEventListener 调用
- **失败原因:** 恶意脚本的交互监听器在 `document-start` 之前（由 HTML 解析器同步执行的 inline script）已经注册到 `window` 上，我们的 proxy 覆盖不到已执行的代码

## 🔑 核心教训

### 教训 1: JS 层面无法拦截 `location.href` 赋值
`window.location` 是浏览器原生只读引用，其 `href` setter 不可用 `Object.defineProperty` / `Proxy` 覆写。这是 Web 安全的硬限制。任何依赖 "Proxy location" 的方案都是死路。

### 教训 2: `window.stop()` 不能阻止已解析的 inline script
`window.stop()` 停止的是**网络资源加载**（pending requests），不是**已被 HTML 解析器读取的 `<script>` 标签**的执行。如果宿主 HTML 的 `<head>` 中有 inline script，它们在 `@run-at document-start` 之前或同时已被解析，`window.stop()` 无效。

### 教训 3: `innerHTML = ''` 只清除 DOM，不清除 `window` 事件监听
`document.documentElement.innerHTML = ''` 会移除所有 DOM 节点（以及绑定在 DOM 节点上的事件），但**不会移除** `window.addEventListener('click', ...)` 注册的捕获/冒泡阶段监听器。恶意代码只需在 `window` 上注册一个 click 捕获监听器，就能永远存活于 DOM 清洗之后。

### 教训 4: "军备竞赛" 是必输的
每次我们 hook 一个 API（createElement, fetch, addEventListener...），恶意脚本就换另一个路径。JS 运行时的 API 面太大，不可能全部封锁。**与恶意代码共享同一个 JS 执行环境，防御方永远处于劣势。**

### 教训 5: 框架错误恢复是隐蔽的重定向路径
Next.js 的 Hydration Error → "Falling back to browser navigation" 机制是一个防御盲区。它不走 `location.assign/replace`（可拦截），而是直接修改 `location.href`（不可拦截）。冻结 `__NEXT_DATA__` 等全局变量也无法阻止已缓存引用的 inline script。

### 方案 9: document.open() 中止解析器
- **思路:** `document.open()` 中止 HTML 解析器本身（而非仅停止网络加载），阻止未解析的 `<script>` 执行
- **结果:** ⚠️ **部分成功** — 
  - ✅ 配合 `__XFLOW_INIT__` 防重入 flag 成功打破了无限 reload 循环
  - ✅ X-Flow 应用成功加载并渲染数据（50 items cached）
  - ❌ 但 Next.js chunk 文件（`4bd1b696-xxx.js`、`9735-xxx.js`）仍从浏览器缓存执行
  - ❌ 恶意脚本 `on.js` 仍被加载（可能来自 HTTP 缓存或已解析的 `<script>` 标签）
  - ❌ Referrer 毒丸 `content="none"` 仍触发 WebKit 报错
  - ❌ 点击劫持/重定向仍然存在
- **失败原因:** `document.open()` 中止的是 HTML **解析器**，但浏览器 HTTP 缓存中已编译的 JS 模块不受影响。如果 `<script>` 标签在 `document-start` 之前已被解析器读取（在 `<head>` 最前面），其 JS 仍会执行。另外 `document.open()` 会触发 Stay Browser 重新注入 userscript，需要 window 级 flag 防重入。

## 🔑 核心教训

### 教训 1: JS 层面无法拦截 `location.href` 赋值
`window.location` 是浏览器原生只读引用，其 `href` setter 不可用 `Object.defineProperty` / `Proxy` 覆写。这是 Web 安全的硬限制。

### 教训 2: `window.stop()` 不能阻止已解析的 inline script
停止的是**网络资源加载**，不是**已被解析器读取的 `<script>` 标签**。

### 教训 3: `document.open()` 不能阻止浏览器缓存的 JS 模块
中止的是 HTML **解析器**，但 HTTP 缓存中已编译的 JS 模块（如 Next.js chunks）仍会执行。

### 教训 4: `innerHTML = ''` 只清除 DOM，不清除 `window` 事件监听
恶意代码在 `window` 上注册的事件监听器永远存活于 DOM 清洗之后。

### 教训 5: "军备竞赛" 是必输的
与恶意代码共享同一个 `window` JS 运行时，防御方永远处于劣势。

### 教训 6: 框架错误恢复是隐蔽的重定向路径
Next.js Hydration Error → "Falling back to browser navigation" → `location.href` 赋值。

### 教训 7: `document.open()` 会触发 Stay Browser 重新注入 userscript
需要 `window` 级 flag（如 `__XFLOW_INIT__`）防止重入死循环。`window` 对象在 `document.open()` 后存活。

### 教训 8: Content Blocker 是双刃剑
Stay Browser 的 Content Blocker 拦截恶意资源时产生的原生 TypeError 会被 Next.js 捕获并触发 fallback navigation。Content Blocker 的拦截在 JS proxy 之前发生，无法通过 JS 控制。

### 教训 9: CSP meta 在 document.open() 重建的文档中生效
`document.open()` 创建的是全新文档上下文，在其 `<head>` 中写入的 CSP meta 标签会被浏览器强制执行。这意味着：**先用 `document.open()` 中止解析器，再在新文档中用 CSP 阻止第三方脚本** = 两层防御叠加，彻底解决问题。

### 教训 10: GM API 不受 CSP 影响
`GM_xmlhttpRequest` 在 Tampermonkey 沙箱中运行，绕过浏览器的 CSP `connect-src` 限制。因此可以放心地将 CSP 设为最严格的白名单，不会影响 userscript 的 API 调用。

## ✅ 最终解决方案（方案 10: document.open() + CSP meta）

> **状态: ✅ SOLVED — v5.0.8 (2026-04-10)**

### 方案 10: document.open() + CSP meta 注入
- **思路:** 在 `document.open()` 重建的全新文档的 `<head>` 中注入 `<meta http-equiv="Content-Security-Policy">` 标签
- **结果:** ✅ **完全成功** —
  - ✅ `document.open()` 中止 HTML 解析器，阻止未解析的恶意 `<script>` 执行
  - ✅ CSP meta 从浏览器层面阻止第三方脚本加载和执行
  - ✅ 点击不再触发广告重定向
  - ✅ `GM_xmlhttpRequest` 正常工作（不受 CSP 影响）
  - ✅ Google Fonts、视频 CDN 通过白名单正常加载
  - ✅ **无需额外的 Content Blocker 规则** — CSP 单独即可解决
- **关键洞察:** JS 层面的防御（方案 1-9）全部失败，但 CSP 是**浏览器层面**的安全机制，恶意脚本无法绕过。`document.open()` + CSP 的组合 = 先中止解析器，再在干净环境中启用浏览器级安全策略。

详见: [csp_meta_document_open_solution.md](csp_meta_document_open_solution.md)

- **AI_Guidance:**
  - **ALWAYS:** `document.open()` + CSP meta 是反广告重定向的最终解决方案。
  - **ALWAYS:** CSP meta 必须在 `document.write()` 的 `<head>` 中写入，不能动态追加到已有文档。
  - **ALWAYS:** 配合 `__XFLOW_INIT__` 防重入 flag。
  - **NEVER:** 把方案 1-9 当作解决方案复用——全部失败。
  - **NEVER:** 在 JS 层面尝试新的 hook/proxy 方案——CSP 已从根本上解决问题。
  - **NEVER:** 删除或弱化 CSP 指令——每条指令都是一道防线。

