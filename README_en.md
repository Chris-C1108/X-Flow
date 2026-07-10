# X-Flow (Twitter Media Ranking TikTok-style Player v6 Pro)

<p align="center">
  <img src="https://img.shields.io/badge/Version-6.2.2-blue.svg?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Tampermonkey-red.svg?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/License-Apache--2.0-green.svg?style=flat-square" alt="License">
</p>

**Still struggling with annoying multi-level page redirects, aggressive pop-up ads, and painfully slow video buffering on Twitter ranking sites?**

X-Flow is a high-performance **Userscript** tailored for ranking websites like `truvaze.com`, `pektino.com`, and `x-ero-anime.com`. 

It intercepts the host page at `document-start` to **physically block all advertisements, popups, and malicious redirects, extracting video streams directly into a clean, immersive, and ultra-smooth TikTok-style full-screen player**.

No annoying redirects, no ads, just instant swiping. The ultimate, pure viewing experience is here!

---

## 🌟 Core Value & Highlights (Why X-Flow?)

*   **🚫 Ad & Redirect Annihilation**: Blocks all popups, clickjackings, and tracking scripts at the browser level, restoring a 100% clean and secure environment.
*   **🎬 TikTok-style Smooth Swiping**: Click any card to enter the full-screen player. Swipe up/down (on mobile), use your mouse wheel, or use arrow keys (↑/↓) to flip through videos continuously.
*   **💾 Playback Progress Memory & Resume**: Automatically saves your progress for every video down to the second. Resumes playback instantly. The progress bar and timestamps are drawn ahead of buffering to prevent layout flashing.
*   **⚡ Zero-Buffering Swipe Back**: Keeps the cache of neighboring nodes active using background buffer pools. Swiping back and forth between adjacent videos is completely instantaneous without re-buffering.
*   **🚀 3x Buffering Speedup**: Unregisters host Service Workers that throttle media range downloads, combining with TCP/SSL pre-warming (DNS/TCP/SSL handshakes completed in the background) for a 3x speedup.
*   **📂 Creator Panel & Batch Download**: Swipe left to view the creator's page. Select videos to copy direct CDN URLs in batch, making it easy to paste into your download manager.
*   **📱 Native Mobile Gesture Routing**: Completely bypasses iOS Safari's WebKit double-tap quirk (where the first tap only scales the card as a hover state), ensuring instant click response.

---

## 🎮 Navigation & Controls

| Input | Function |
| :--- | :--- |
| **🖱️ Mouse Wheel / ⌨️ Arrow Keys ↑/↓** | Navigate to previous/next video |
| **⌨️ Space / Enter / 🖱️ Single Click** | Play / Pause |
| **👆 Swipe Up / Down (Mobile)** | Navigate to next/previous video |
| **👆 Swipe Left (Mobile)** | Open Creator Panel & batch export links |
| **👆 Swipe Right (Mobile) / ⌨️ Esc / ❌ Button** | Exit player modal |
| **⚡ Playback Speed Controls** | Multi-gear speed control (0.5× to 2.0×) |
| **🔘 Unviewed Filter Toggle** | Filter out watched videos, keeping only new ones |

---

## 🛠️ Installation Guide

### Step 1: Install Tampermonkey
Make sure you have the **Tampermonkey** extension installed on your browser: [https://www.tampermonkey.net/](https://www.tampermonkey.net/)

### Step 2: Install X-Flow Script
Choose one of the mirror hosts to install:
*   **Greasy Fork (Adult/SleazyFork)**: [https://sleazyfork.org/zh-CN/scripts/562631](https://sleazyfork.org/zh-CN/scripts/562631)
*   **OpenUserJS Mirror**: [https://openuserjs.org/scripts/loadingi](https://openuserjs.org/scripts/loadingi)

Once installed, visit any of the supported domains, and the script will automatically take over the page:
*   `truvaze.com`
*   `pektino.com`
*   `x-ero-anime.com`

---

## 💻 Local Development & Build

If you wish to modify or compile the project yourself, follow these steps:

1. **Clone or download the project**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start local dev server (Supports Hot Module Replacement)**
   ```bash
   npm run dev
   ```
   Import the generated `.user.js` URL from your terminal into Tampermonkey. The browser will auto-reload whenever you edit the source files.
4. **Compile production build**
   ```bash
   npm run build
   ```
   The compiled production-ready userscript will be output to `dist/userscript/x-flow.user.js`.

---

## 📝 Changelog

*   **v6.2.2**: Refactored config parameters for latest host adapters.
*   **v6.2.1**: Implemented progress persistence (LRU + TTL) & resumption. Upgraded node pool to 5 to eliminate back-swipe lag. Resolved iOS Safari's hover-click interception bug. Added event index consistency guards.
*   **v6.2.0**: Adapted to `pektino.com` Next.js REST API. Boosted initial loading skeletons to <5ms via `GM_setValue` cache. Eliminated SW-based range caching blockages.
*   **v6.1.0 ~ v6.1.1**: Added Creator Panel, batch selection, and links extraction. Fixed mobile URL reset to `about:blank`.
*   **v6.0.0**: Initial support for `twihub.net` lazy detail loading and Cloudflare validation bypass.

---
**Author**: Chris_C  
**License**: Apache-2.0
