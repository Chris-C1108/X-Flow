# X-Flow (極境串流媒體排行榜 v6 Pro)

<p align="center">
  <img src="https://img.shields.io/badge/Version-6.2.3-blue.svg?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Tampermonkey-red.svg?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/License-Apache--2.0-green.svg?style=flat-square" alt="License">
</p>

**還在忍受推特排行榜網站套路滿滿的多層跳轉、滿畫面亂飛的彈出式廣告、以及極其緩慢的影片緩衝嗎？**

X-Flow 是專為 `truvaze.com`、`pektino.com` 及 `x-ero-anime.com` 等鏡像站點定制的**使用者腳本（Userscript / 油猴腳本）**。

它在頁面打開的瞬間進行「降維打擊式」的強效接管，**物理屏蔽原站所有的廣告、彈出式視窗與惡意重新導向，將影片直接提取並打包成一個純淨、高貴、極度絲滑的 TikTok/抖音全螢幕直式播放器**。

不跳網頁、沒有廣告、即開即刷，給您最純粹的推特影片刷片體驗！

---

## 🌟 核心價值與特色 (Why X-Flow?)

*   **🚫 物理超度所有廣告與重新導向**：強效攔截原站一切彈出式廣告、暗箱跳轉與廣告垃圾指令碼，還您一個 100% 純淨、安全的綠色刷片環境。
*   **🎬 抖音模式極速刷片**：點擊主畫面卡片立刻進入全螢幕直式播放器。支援滑鼠滾輪、鍵盤方向鍵（↑/↓）或手機滑動，像刷抖音一樣停不下來。
*   **💾 智慧進度記憶（斷點續播）**：自動記住您每個影片播放到幾分幾秒。再次切回時瞬間自動續播，進度條和時間在載入中提前繪製，視覺過渡毫無閃爍。
*   **⚡ 0秒切回免緩衝**：採用智慧背景快取，即使在相鄰影片間來回切換（例如看完 B 又劃回 A ），也無需重新等待網路緩衝，實現真正的「劃回即播」。
*   **🚀 3倍緩衝加速**：自動註銷源站中限制影片下載速度的背景網路代理，並配合背景自動預連接技術，影片開播緩衝速度提升 300%。
*   **📂 生產力博主面板與批次下載**：向左滑動呼出博主主頁，支援「一鍵全選」，批次複製無浮水印影片 CDN 直鏈，方便匯入您的專業下載器。
*   **📱 行動端首觸直達**：針對手機 Safari 等瀏覽器進行底層手勢優化，徹底解決「第一次點擊卡片只縮放、必須點第二次才播」的頑疾，點擊零延遲，即點即開。

---

## 🎮 常用操作 (Controls)

| 操作方式 | 對應功能 |
| :--- | :--- |
| **🖱️ 滑鼠滾輪 / ⌨️ 鍵盤 ↑/↓** | 上下切換影片 |
| **⌨️ 空白鍵 / Enter / 🖱️ 單擊影片** | 播放 / 暫停 |
| **👆 手機上下滑動** | 上滑下一個，下滑上一個 |
| **👆 手機向左滑動** | 拉出博主面板與批次下載連結 |
| **👆 手機向右滑動 / ⌨️ Esc / ❌ 按鈕** | 退出全螢幕播放器 |
| **⚡ 播放倍速控制** | 支援 0.5× 到 2.0× 的倍速播放 |
| **🔘 只看未讀開關** | 過濾已觀看影片，只看新內容 |

---

## 🛠️ 怎麼安裝？ (Installation)

### 第一步：安裝瀏覽器油猴擴充功能
在瀏覽器安裝 **Tampermonkey** 插件：[https://www.tampermonkey.net/](https://www.tampermonkey.net/)

### 第二步：安裝 X-Flow 腳本
腳本安裝地址（二選一）：
*   **Greasy Fork 平台**：[https://sleazyfork.org/zh-CN/scripts/562631](https://sleazyfork.org/zh-CN/scripts/562631)
*   **國內訪問 備用地址**：[https://openuserjs.org/scripts/loadingi](https://openuserjs.org/scripts/loadingi)

安裝後，直接訪問以下支援的排行榜網域名稱，腳本將自動激活並接管頁面：
*   `truvaze.com`
*   `pektino.com`
*   `x-ero-anime.com`

---

## 💻 本地開發與編譯 (Development)

如果您想自行修改或編譯本專案，可按照以下步驟配置：

1. **複製/下載本專案到本地**
2. **安裝依賴**
   ```bash
   npm install
   ```
3. **啟動本地開發服務 (支援 HMR 熱重載)**
   ```bash
   npm run dev
   ```
   開啟後，控制台會輸出一個 `http://localhost:5173/` 類似連結，用瀏覽器打開或將該位址的 `.user.js` 匯入到油猴中，即可實現程式碼修改後網頁即時重載。
4. **編譯打包生產環境**
   ```bash
   npm run build
   ```
   編譯完成後，最終可發佈的腳本將輸出至 `dist/userscript/x-flow.user.js`。

---

## 📝 歷史更新 (Changelog)

*   **v6.2.3**：優化進入和退出動畫邏輯，解決行動端及特定狀態下模態框可能透明不顯示的問題。
*   **v6.2.2**：配合最新宿主接口優化，更新版本配置。
*   **v6.2.1**：加入斷點續播進度保存，升級 5 快取池實現 0 緩衝切回，修復 iOS Safari 卡片需要點兩次的 WebKit Bug。
*   **v6.2.0**：完美適配新網域 `pektino.com` API；優化首屏骨架屏延遲（<5ms 秒開）；幹掉源站 Service Worker 突破 15 秒緩衝瓶頸。
*   **v6.1.0 ~ v6.1.1**：新增博主列表、收藏夾「一鍵全選」及「批次複製 CDN 直鏈」；解決行動端接管頁面出現 about:blank 的問題。
*   **v6.0.0**：首發適配 `twihub.net` 懶載入及重新導向解析，支援 Cloudflare 安全驗證避讓。

---
**Author**: Chris_C  
**License**: Apache-2.0
