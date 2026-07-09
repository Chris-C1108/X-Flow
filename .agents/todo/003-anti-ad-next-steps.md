# 反广告重定向 — 下一步计划

> 参考: [anti_ad_redirect_postmortem.md](../knowledge/anti_ad_redirect_postmortem.md)
> 状态: ✅ **已解决** — CSP meta + document.open() (v5.0.8, 2026-04-10)

## 当前状态

- `document.open()` + `__XFLOW_INIT__` 防重入 = **reload 循环已解决** ✅
- X-Flow 应用成功加载数据和渲染 UI ✅
- CSP meta 阻止第三方恶意脚本执行 ✅
- 点击不再触发广告重定向 ✅
- **无需 Content Blocker 规则** — CSP 单独即可解决 ✅

## 解决方案

**方案 10: `document.open()` + CSP meta 注入。** 在 `document.open()` 重建的全新文档 `<head>` 中注入 `<meta http-equiv="Content-Security-Policy">`，从浏览器层面阻止所有未白名单的第三方脚本。GM API 不受 CSP 影响。详见 [csp_meta_document_open_solution.md](../knowledge/csp_meta_document_open_solution.md)。

---

## 下一步：方向 D + E（职责分离 + CSP 注入）

### 任务 1: CSP Meta 注入（快速验证） ✅ DONE
**优先级: P0 — 最快可验证的方案**
**完成时间: 2026-04-10**

已在 `src/main.ts` 的 `document.write()` HTML `<head>` 中注入 CSP meta 标签：

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'  → 只允许自身和内联脚本
frame-src 'none'                                 → 完全禁止 iframe
connect-src 'self' + whitelisted CDNs            → 只允许已知 API/CDN
img-src / media-src → 只允许 twimg CDN
style-src → 允许 inline + Google Fonts
object-src 'none' / base-uri 'self'              → 额外安全加固
```

**需手动验证：**
- [ ] CSP meta 在 `document.open()` + `document.write()` 后写入的文档中是否生效？
- [ ] 是否能阻止 `on.js` 等第三方脚本加载？
- [ ] 是否影响 `GM_xmlhttpRequest`？（理论不影响——GM API 在 Tampermonkey 沙箱中运行）
- [ ] 是否影响 Google Fonts 加载？（已在 CSP 中允许 fonts.googleapis.com）
- [ ] `frame-src 'none'` 是否能阻止恶意 iframe 注入？

**修改文件：** `src/main.ts` L40-L57

### 任务 2: Stay Browser Content Blocker 自定义规则 ✅ DONE
**优先级: P1 — 最可靠的长期方案**
**完成时间: 2026-04-10**

已创建 `.agents/content-blocker-rules.json`，在网络层面彻底阻止恶意域名。

阻止的域名（9个）：
- ✅ `navyrecentuproot.com` — 主要广告分发
- ✅ `earmuffpostnasalrisotto.com` — 广告跟踪
- ✅ `bmmadspay.com` — 点击上报
- ✅ `hsbj6zow.o92kd83ncv.cc` — iframe 劫持
- ✅ `theoriaemodins.cyou` — 资源加载
- ✅ `drtacs.club` — 广告落地页
- ✅ `3xyy.com` — 重定向中转
- ✅ `hai8g.com` — 备用域名
- ✅ `jiankongqi1.com` — 监控跟踪

宿主站脚本拦截（2个）：
- ✅ `*/on.js` — 主劫持入口
- ✅ `*/zbs.kek.js` — 备用入口

弹窗拦截：
- ✅ 所有 popup 类型资源

**输出：** `.agents/content-blocker-rules.json`

#### Stay Browser 安装指南

1. 打开 Stay Browser → 设置 → 内容拦截器
2. 点击「导入自定义规则」
3. 选择 `content-blocker-rules.json` 文件
4. 启用规则集
5. 访问 `twitter-ero-video-ranking.com` 验证恶意脚本是否被阻止

> ⚠️ Content Blocker 规则在浏览器网络层执行，先于任何 JS 代码，不可被恶意脚本绕过。

### 任务 3: 评估方向 B（全新标签页隔离）
**优先级: P2 — 备选方案调研**

调研 `GM_openInTab` 或 `window.open('about:blank')` 在 Stay Browser 中的行为：
- about:blank 页面中能否通过 `opener.GM_xmlhttpRequest` 间接调用 GM API？
- 能否用 `postMessage` 在原标签页和新标签页之间传递 API 数据？
- 新标签页的 URL 显示是否会造成用户困惑？

---

## 不要做的事情

- ❌ 不要再尝试任何 JS 层面的 hook/proxy 方案（addEventListener、fetch、location、createElement...）
- ❌ 不要假设 `window.stop()` 或 `document.open()` 能阻止所有脚本执行
- ❌ 不要假设 `Object.defineProperty` 能覆写 `location.href`
- ❌ 不要在已知失败的方向上投入更多时间
