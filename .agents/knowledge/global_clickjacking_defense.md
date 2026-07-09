# 拦截全局 Clickjacking 幽灵事件 (Tab-under 防御)

- **Subject:** 宿主存在流氓广告网络，Tab-under 劫持：点击任意位置跳广告
- **Env:** Userscript, Vanilla DOM, iOS Safari / Mobile Chrome / Stay Browser
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Status:** ✅ **已解决** — `document.open()` + CSP meta 注入 (v5.0.8, 2026-04-10)

- **Issue:**
  点击页面任意区域触发重定向到广告页面。恶意脚本通过多条路径实施跳转。

- **Solution:** `document.open()` 中止 HTML 解析器 + CSP meta 在浏览器层面阻止第三方脚本。详见 [csp_meta_document_open_solution.md](csp_meta_document_open_solution.md)

- **已尝试并失败的方案（方案 1-9）:**

  | 方案 | 失败原因 |
  |------|---------  |
  | `addEventListener` 拦截 | 恶意脚本用 `on*` 属性赋值或 inline `onclick` 绕过 |
  | `on*` 属性 defineProperty | 恶意脚本改用 `location.href = ...` 直接跳转 |
  | `location.assign/replace` 覆写 | `location.href` setter 是浏览器原生属性，不可 defineProperty |
  | `window.stop()` + innerHTML 核平 | 不清除 `window` 级事件监听器；inline script 已执行 |
  | `beforeunload` 拦截 | 移动端 WebKit 对 programmatic navigation 的拦截不可靠 |
  | addEventListener Symbol 白名单 | 恶意监听器在脚本运行前已注册 |
  | fetch 伪造 RSC 响应 | Content Blocker 先于 JS proxy 拦截，产生原生 TypeError |
  | createElement proxy | 恶意脚本的交互监听器在 proxy 覆盖前已执行 |
  | `document.open()` 单独使用 | 部分有效（打破 reload 循环），但浏览器缓存中的 JS 模块仍执行 |

- **最终成功方案（方案 10）:**

  `document.open()` + CSP meta 注入。关键洞察：**JS 层面防御必输，但 CSP 是浏览器层面的安全机制。** 在 `document.open()` 重建的全新文档中注入 CSP meta，浏览器自动阻止所有未白名单的第三方脚本，无需 Content Blocker 规则。

- **AI_Guidance:**
  - **ALWAYS:** 使用 `document.open()` + CSP meta 方案。详见 [csp_meta_document_open_solution.md](csp_meta_document_open_solution.md)。
  - **NEVER:** 把方案 1-9 当作"已验证方案"来实施——它们全部失败。
  - **NEVER:** 假设 `window.location.href` 可以被 JS 覆写或 proxy。
  - **NEVER:** 在已解决的基础上引入额外的 JS 层面 hook——CSP 已经足够。

