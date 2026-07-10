# X-Flow (极境流媒体排行榜 v6 Pro)

<p align="center">
  <img src="https://img.shields.io/badge/Version-6.2.2-blue.svg?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Tampermonkey-red.svg?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/License-Apache--2.0-green.svg?style=flat-square" alt="License">
</p>

**还在忍受推特排行榜网站套路满满的多层跳转、满屏乱飞的弹窗广告、以及极其慢的视频缓冲吗？**

X-Flow 是一个专为 `truvaze.com`、`pektino.com` 及 `x-ero-anime.com` 等镜像站点定制的**油猴脚本（Userscript）**。

它在页面打开的瞬间进行“降维打击式”的强力接管，**物理屏蔽原站所有的广告、弹窗与恶意重定向，将视频直接提取并打包成一个纯净、高贵、极度丝滑的 TikTok/抖音全屏竖屏播放器**。

不跳网页、没有广告、即开即刷，给您最纯粹的推特视频刷片体验！

---

## 🌟 核心价值与特色 (Why X-Flow?)

*   **🚫 物理超度所有广告与重定向**：强力拦截原站一切弹窗广告、暗箱跳转与垃圾脚本，还您一个 100% 纯净、安全的绿色刷片环境。
*   **🎬 抖音模式极速刷片**：点击主屏卡片立刻进入全屏竖屏播放器。支持鼠标滚轮、键盘方向键（↑/↓）或手机滑动，像刷抖音一样停不下来。
*   **💾 智能进度记忆（断点续播）**：自动记住您每个视频播放到第几分第几秒。再次切回时瞬间自动续播，进度条和时间在加载中提前绘制，视觉过度毫无闪烁。
*   **⚡ 0秒切回免缓冲**：采用智能后台缓存，即使在相邻视频间来回切换（比如看完 B 又划回 A ），也无需重新等待网络缓冲，实现真正的“滑回即播”。
*   **🚀 3倍缓冲加速**：自动注销源站中限制视频下载速度的后台网络代理，并配合后台自动预连接技术，视频开播缓冲速度提升 300%。
*   **📂 生产力博主面板与批量下载**：向左滑动呼出博主主页，支持“一键全选”，批量复制无水印视频 CDN 链接，方便导入您的专业下载器。
*   **📱 移动端首触直达**：针对手机 Safari 等浏览器进行底层手势优化，彻底解决“第一次点击卡片只缩放、必须点第二次才播”的顽疾，点击零延迟，即点即开。

---

## 🎮 常用操作 (Controls)

| 操作方式 | 对应功能 |
| :--- | :--- |
| **🖱️ 鼠标滚轮 / ⌨️ 键盘 ↑/↓** | 上下切换视频 |
| **⌨️ 空格 / Enter / 🖱️ 单击视频** | 播放 / 暂停 |
| **👆 手机上下滑动** | 上滑下一个，下滑上一个 |
| **👆 手机向左滑动** | 拉出博主面板与批量下载链接 |
| **👆 手机向右滑动 / ⌨️ Esc / ❌ 按钮** | 退出全屏播放器 |
| **⚡ 播放倍速控制** | 支持 0.5× 到 2.0× 的倍速播放 |
| **🔘 只看未读开关** | 过滤已观看视频，只看新内容 |

---

## 🛠️ 怎么安装？ (Installation)

### 第一步：安装浏览器油猴扩展
在浏览器安装 **Tampermonkey** 插件：[https://www.tampermonkey.net/](https://www.tampermonkey.net/)

### 第二步：安装 X-Flow 脚本
脚本安装地址（二选一）：
*   **Greasy Fork 平台**：[https://sleazyfork.org/zh-CN/scripts/562631](https://sleazyfork.org/zh-CN/scripts/562631)
*   **国内访问 备用地址**：[https://openuserjs.org/scripts/loadingi](https://openuserjs.org/scripts/loadingi)

安装后，直接访问以下支持的排行榜域名，脚本将自动激活并接管页面：
*   `truvaze.com`
*   `pektino.com`
*   `x-ero-anime.com`

---

## 💻 本地开发与编译 (Development)

如果您想自行修改或编译本项目，可按照以下步骤配置：

1. **克隆/下载本项目到本地**
2. **安装依赖**
   ```bash
   npm install
   ```
3. **启动本地开发服务 (支持 HMR 热重载)**
   ```bash
   npm run dev
   ```
   开启后，控制台会输出一个 `http://localhost:5173/` 类似链接，用浏览器打开或将该地址的 `.user.js` 导入到油猴中，即可实现代码修改后网页实时重载。
4. **编译打包生产环境**
   ```bash
   npm run build
   ```
   编译完成后，最终可发布的脚本将输出至 `dist/userscript/x-flow.user.js`。

---

## 📝 历史更新 (Changelog)

*   **v6.2.2**：配合最新宿主接口优化，更新版本配置。
*   **v6.2.1**：加入断点续播进度保存，升级 5 缓存池实现 0 缓冲切回，修复 iOS Safari 卡片需要点两次的 WebKit Bug。
*   **v6.2.0**：完美适配新域名 `pektino.com` API；优化首屏骨架屏延迟（<5ms 秒开）；干掉源站 Service Worker 突破 15 秒缓冲瓶颈。
*   **v6.1.0 ~ v6.1.1**：新增博主列表、收藏夹“一键全选”及“批量复制 CDN 直链”；解决移动端接管页面出现 about:blank 的问题。
*   **v6.0.0**：首发适配 `twihub.net` 懒加载及重定向解析，支持 Cloudflare 安全验证避让。

---
**Author**: Chris_C  
**License**: Apache-2.0