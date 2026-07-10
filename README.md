# X-Flow (极境流媒体排行榜 v6 Pro)

X-Flow 是一个专为 `truvaze.com`、`pektino.com` 以及 `x-ero-anime.com` 等镜像站点定制的 **Tampermonkey 用户脚本**。

它在页面加载的极早期（`document-start`）进行物理接管，屏蔽原站杂乱的网页和低效加载层，代以一个**极简、高贵、沉浸式的 TikTok 全屏竖屏短视频滑动播放器**。

---

## ✨ 核心功能与亮点 (Core Features)

*   **🎬 沉浸式短视频体验**：点击主屏卡片即可调起全屏竖式播放器，支持鼠标滚轮、方向键（↑/↓）及触摸滑动手势无缝切换。
*   **💾 播放进度记忆与断点续播**：
    *   内置轻量级持久化进度管理，精准记住您每个看了一半的视频进度（以秒为单位）。
    *   回滑或重新打开时瞬间恢复播放；在加载阶段，进度条和时间提前在上次进度位置渲染，防止视觉闪烁。
*   **🔥 5 物理节点池与 0秒回滑**：
    *   在 DOM 中同时缓存当前视频及其前后各 2 个邻近节点的媒体资源。
    *   在相邻视频间来回滑动时，**完全免除二次缓冲延迟**（彻底解决 HTML5 Range 分片重置带来的 3 秒黑屏卡顿），实现无缝极速播放。
*   **🚀 极致流媒体加载预热**：
    *   **零延迟预解析**：后台零延迟拉取后续 5 个视频的 HTML，并提前解析出 Twitter CDN 真实直链。
    *   **网络连接预热**：邻近节点默认采用 `preload="metadata"`，让浏览器提前静默完成 CDN 的 DNS 解析、TCP 握手和 SSL 密钥协商。划过时瞬间即开。
*   **🛡️ 物理注销 Service Worker**：
    *   智能移除宿主域下的 Service Worker，解除其对 `video.twimg.com` 媒体流分片请求的恶意代理，将视频缓冲卡顿从 15s 压缩至 3-5s。
*   **📱 移动端手势革命**：
    *   接管 WebKit 的 `touchend` 事件，绕过 iOS Safari 因 `:hover` CSS 属性引发的“第一点击仅触发悬停、二击才进播放器”的 WebKit Bug。
    *   取消移动端原生自带的 300ms 点击判定延迟，实现首击秒开，响应极其清脆跟手。
*   **📂 博主面板与批量生产力**：
    *   向左滑动拉出博主主页，支持“一键全选”，批量复制无水印视频 CDN 链接，或直接推送到下载管理器。
*   **🎨 HSL/OKLCH 极简美学**：
    *   完美隐藏视频卡片上的多余图标，提供海报级纯净卡片布局。
    *   首帧加载完毕前封面图保持 100% 不透明，杜绝冷启动及切换时的黑屏闪烁。

---

## 🎮 操作说明 (Controls)

| 操作方式 | 功能 |
| :--- | :--- |
| **🖱️ 鼠标滚轮 / ⌨️ 键盘 ↑/↓** | 上下无缝切换视频 |
| **⌨️ 空格 / Enter / 🖱️ 单击视频** | 播放 / 暂停 |
| **👆 触摸滑动** | 上滑下一个，下滑上一个；向左滑拉出博主面板；向右滑退出播放器 |
| **📊 进度条拖拽/点按** | 实时预览并快速跳转播放位置 |
| **⚡ 顶部控制器** | 控制播放速率（0.5× / 0.75× / 1.0× / 1.25× / 1.5× / 2.0×）；进入画中画（PiP）模式；返回原播放列表 |
| **💬 操作栏按钮** | 博主面板查看 / 批量下载 / 收藏与取消收藏 / 唤出评论抽屉 / 查看我的收藏夹 |

---

## 🛠️ 安装与配置 (Installation)

### 第一步：安装油猴管理器
在浏览器中安装 **Tampermonkey** 插件：[https://www.tampermonkey.net/](https://www.tampermonkey.net/)

### 第二步：安装脚本
脚本安装地址（二选一）：
*   **Greasy Fork 成人版**：[https://sleazyfork.org/zh-CN/scripts/562631](https://sleazyfork.org/zh-CN/scripts/562631)
*   **国内访问 备用地址**：[https://openuserjs.org/scripts/loadingi](https://openuserjs.org/scripts/loadingi)

脚本支持以下站点匹配：
*   `https://truvaze.com/*`
*   `https://pektino.com/*`
*   `https://x-ero-anime.com/*`

### 🍎 移动端支持 (iOS / Android)
*   **iOS Safari**：推荐安装 **「Stay for Safari」** 或 **「Userscripts」** 油猴扩展，将脚本导入即可使用。
*   **Android**：使用支持 Chrome 扩展程序的浏览器（如 Kiwi Browser、Yandex Browser），装载 Tampermonkey 扩展并安装本脚本。

---

## 📝 历史更新摘要 (Changelog)

### v6.2.1
*   🆕 实现了 5 物理 DOM 节点池位移机制，彻底消除回滑时的 3 秒重新缓冲卡顿。
*   🆕 引入了 `ProgressManager`（LRU 缓存限制 200 条，TTL 7天过期，末尾看过自动销毁），支持进度断点续播。
*   ⚡ 优化了后台细节零延迟解析和邻近节点 `preload="metadata"` 连接预热。
*   🐛 修复了 iOS Safari 上由于 `:hover` CSS 属性导致的卡片需要双击才能进入播放器的 WebKit 兼容 Bug。
*   🐛 为 `ontimeupdate`, `onended` 等多媒体监听事件添加了 Index Guard 校验，防止异步脏数据覆盖重置后的进度条。

### v6.2.0
*   🆕 完成对新站 `pektino.com` REST API `/api/media` 接口的全面重构与直链秒播映射。
*   ⚡ 将 `CacheManager` 改为 `GM_setValue` 跨域持久化，骨架屏渲染耗时缩短至 `<5ms`。
*   ⚡ 引入 Sandbox 早期 SW 强制注销，解决 Range 请求缓冲延迟飙升至 15s 的痛点。

### v6.1.0 ~ v6.1.1
*   🆕 增加博主列表、收藏夹“一键全选”及“批量复制 CDN 无水印下载链接”功能。
*   🐛 修复移动端因为 `document.open()` 导致重写为 `about:blank` 的 Bug，改为 innerHTML 动态写入。

### v6.0.0
*   适配 `twihub.net` 详情 HTML 懒加载与多线程重定向解析逻辑，集成 Cloudflare 避让机制。

---

## ⚠️ 免责声明 (Disclaimer)

本脚本仅供技术研究和交流学习使用，不提供任何多媒体视频资源的存储或分发服务。请勿用于任何非法商业用途。

---
**Author**: Chris_C  
**License**: Apache-2.0