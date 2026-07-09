# CSP Meta + document.open() 彻底解决广告重定向

- **Subject:** 通过 CSP meta 标签 + document.open() 在浏览器层面阻止第三方恶意脚本执行和广告重定向
- **Env:** Tampermonkey, Stay Browser (iOS WebKit), `twitter-ero-video-ranking.com` / `x-ero-anime.com`
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** 宿主页面的恶意脚本（`on.js` 等）劫持点击事件，触发重定向到广告页面
- **Solution:** ✅ **`document.open()` 重建文档 + CSP meta 注入 = 完全解决**

## 📋 背景

经过 9 轮 JS 层面的防御尝试全部失败后（详见 [anti_ad_redirect_postmortem.md](anti_ad_redirect_postmortem.md)），核心教训是：

> **Userscript 与恶意脚本共享同一个 `window` JS 运行时，JS 层面的军备竞赛防御方必输。**

解决方案是**切换到浏览器层面防御**：在 `document.open()` 重建的全新文档中注入 CSP meta 标签。

## 🔑 为什么有效

1. **`document.open()` 中止 HTML 解析器** — 未被解析的 `<script>` 永远不会执行
2. **`document.write()` 创建全新文档** — 这是一个干净的 HTML 文档
3. **CSP meta 对新文档生效** — 浏览器在新文档的上下文中强制执行 CSP 策略
4. **第三方脚本被浏览器自身阻止** — 不依赖 JS hook/proxy，不可被绕过
5. **`GM_xmlhttpRequest` 不受 CSP 影响** — GM API 在 Tampermonkey 沙箱中运行，不走常规 fetch/XHR

## Action_Steps

在 `document.open()` + `document.write()` 的 HTML `<head>` 中注入 CSP meta：

```typescript
// ✅ GOOD — CSP meta 在 document.write() 的全新文档中
document.open();
document.write([
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="referrer" content="no-referrer">',
    // CSP 防御 — 浏览器层面阻止第三方脚本和 iframe
    '<meta http-equiv="Content-Security-Policy" content="' +
        "default-src 'self' 'unsafe-inline' data: blob:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "frame-src 'none'; " +
        "connect-src 'self' https://video.twimg.com https://pbs.twimg.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
        "img-src 'self' https://pbs.twimg.com data: blob:; " +
        "media-src 'self' https://video.twimg.com blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "object-src 'none'; " +
        "base-uri 'self';" +
    '">',
    '<title>X-Flow</title>',
    '</head>',
    '<body>...</body>',
    '</html>',
].join(''));
document.close();
```

```typescript
// ❌ BAD — 不要尝试在原页面中动态插入 CSP meta
// 原页面的恶意脚本已经在执行，CSP 对已执行的脚本无效
const meta = document.createElement('meta');
meta.httpEquiv = 'Content-Security-Policy';
meta.content = "script-src 'self'";
document.head.appendChild(meta); // 太晚了！恶意脚本早已执行
```

### CSP 策略要点

| 指令 | 值 | 用途 |
|------|----|------|
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | 允许 Tampermonkey 注入的 inline 脚本 |
| `frame-src` | `'none'` | 彻底阻止所有 iframe（恶意广告的主要注入路径） |
| `connect-src` | `'self' + CDN whitelist` | 只允许 API 和已知 CDN 的网络请求 |
| `img-src` | `'self' https://pbs.twimg.com data: blob:` | 只允许 twimg 图片 CDN |
| `media-src` | `'self' https://video.twimg.com blob:` | 只允许 twimg 视频 CDN |
| `object-src` | `'none'` | 阻止 Flash/Java 等插件（额外加固） |
| `base-uri` | `'self'` | 防止 `<base>` 标签劫持 |

### 防重入守卫（必须配合使用）

```typescript
// ✅ GOOD — document.open() 后 Stay Browser 会重新注入 userscript
if ((window as any).__XFLOW_INIT__) throw new Error('already initialized');
(window as any).__XFLOW_INIT__ = true;
```

## 🎉 验证结果（2026-04-10, v5.0.8）

- ✅ CSP meta 在 `document.open()` + `document.write()` 后写入的文档中**生效**
- ✅ 第三方恶意脚本（`on.js` 等）被 CSP 阻止加载
- ✅ 点击不再触发广告重定向
- ✅ `GM_xmlhttpRequest` 正常工作（不受 CSP 影响）
- ✅ Google Fonts 正常加载（已在 CSP 中白名单）
- ✅ 视频播放正常（`video.twimg.com` 已在 media-src 白名单）
- ✅ **无需额外的 Content Blocker 规则** — CSP 单独即可解决

## AI_Guidance

- **ALWAYS:** `document.open()` + CSP meta 是反广告重定向的最终解决方案
- **ALWAYS:** CSP meta 必须在 `document.write()` 的 `<head>` 中第一批写入，不能动态追加到已有文档
- **ALWAYS:** 配合 `__XFLOW_INIT__` 防重入 flag（`document.open()` 触发 Stay Browser 重新注入）
- **ALWAYS:** 在 `connect-src` / `img-src` / `media-src` 中白名单所有合法 CDN 域名
- **NEVER:** 在原页面中动态插入 CSP meta — 恶意脚本已经执行
- **NEVER:** 再尝试 JS 层面的 hook/proxy 方案 — 方案 1-9 已全部失败
- **NEVER:** 删除或弱化任何 CSP 指令 — 每条指令都是一道防线
