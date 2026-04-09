# X-Flow — AGENTS.md

## Project Overview

X-Flow (`极境流媒体排行榜 v6 Pro`) 是一个 **Tampermonkey 用户脚本**，运行在 `twitter-ero-video-ranking.com` 和 `x-ero-anime.com` 上。它在 `document-start` 阶段接管页面，注入一个独立的 Sandbox 容器，提供 **TikTok 风格的全屏竖屏视频浏览体验**，替代原站 UI。

**核心约束：** 这不是独立 Web App，而是寄生在宿主页面的 Userscript。所有网络请求受同源策略约束，DOM 操作必须考虑与 React Hydration 的共存防御。

## Tech Stack

| 层级 | 技术 | 版本 |
|------|------|------|
| Build | Vite + vite-plugin-monkey | Vite 5, monkey ^4.0 |
| Language | TypeScript (strict) | ^5.2 |
| Runtime | Tampermonkey | GM API: `GM_xmlhttpRequest`, `GM_setValue`, `GM_getValue` |
| UI | Vanilla DOM — 无框架 | 直接操作 DOM |
| Styling | Vanilla CSS (OKLCH color system) | `src/styles/player.css` |
| Fonts | Google Fonts (Syne, Manrope) | CDN 动态注入 |
| Video CDN | `video.twimg.com` | 需要 `<meta referrer>` 抑制 Referer |
| API | `/api/media` (same-origin) | 通过 `isAnimeOnly` query param 区分频道 |

## Directory Structure

```
X-Flow/
├── AGENTS.md              # 本文件 — AI Agent 指南
├── vite.config.ts         # Vite + vite-plugin-monkey 配置
├── package.json           # npm 依赖
├── .agents/
│   ├── knowledge/         # 经验教训文件（详见下方 Experience Index）
│   ├── dev-docs/          # PRD 等产品文档
│   └── todo/              # 待办 & 已完成任务
└── src/
    ├── main.ts            # Entry point — 调用 Sandbox.initialize()
    ├── api/
    │   ├── ApiClient.ts   # API 封装，频道切换，数据请求
    │   └── PoolManager.ts # 数据池管理，分页预取
    ├── engine/
    │   ├── Scoring.ts     # 评分算法 (placeholder)
    │   ├── Storage.ts     # GM_setValue/getValue 本地持久化
    │   └── Tracker.ts     # 浏览追踪
    ├── player/
    │   ├── TikTokMode.ts  # ⭐ 核心播放器 — 3-node VirtualList 滑动
    │   ├── TinderMode.ts  # Tinder 模式 (placeholder)
    │   └── VirtualList.ts # 虚拟列表节点池（3 个 DOM 节点循环复用）
    ├── ui/
    │   ├── Sandbox.ts     # ⭐ 沙盒 — 接管页面, 防御 React Hydration
    │   ├── Layout.ts      # 主布局 — 频道切换, 视频列表, 播放器
    │   └── Components.ts  # UI 组件 — 按钮, 卡片, 叠层
    ├── styles/
    │   └── player.css     # 全局样式 (OKLCH, CSS Variables, 动画)
    ├── telemetry/
    │   └── Reporter.ts    # 分析上报 (placeholder)
    └── utils/
        ├── Dom.ts         # DOM 工具 (placeholder)
        ├── Format.ts      # 数字/时间格式化
        └── Logger.ts      # 日志输出
```

## Setup & Build

```bash
npm install              # 安装依赖
npm run dev              # Vite dev server — HMR + Tampermonkey 热加载
npm run build            # 构建生产 .user.js 到 dist/
```

## Code Style

- **TypeScript strict** — 避免 `any`，使用显式类型声明
- **PascalCase** for classes (`ApiClient`, `TikTokMode`)，**camelCase** for functions/variables
- **单例模式** for Sandbox (`Sandbox.getInstance()`)
- **Vanilla DOM** — 不使用任何 UI 框架，直接 `document.createElement`
- **CSS Variables** — 所有颜色通过 `--bg-base`, `--text-100` 等 CSS 变量控制
- **模板字符串** — 修改含大量模板字符串的文件后，`npm run build` 验证是 **MANDATORY**

## Manual Verification

无自动化测试。每次修改后需手动验证：

1. `npm run build` — **必须无错误通过**
2. 在 Tampermonkey 中安装 `dist/` 输出的 `.user.js`
3. 访问 `twitter-ero-video-ranking.com` → 验证播放器界面正常渲染
4. 上下滑动验证视频切换流畅，无黑屏
5. 点击频道切换 (Real ↔ Anime) → 验证无 CORS 错误、列表正常刷新
6. 检查 DevTools Console 无 403 / NotSupportedError

---

## 🛑 Experience Index — MANDATORY

> **BEFORE writing code or debugging, MATCH the current issue against this table.**
> If matched, READ the linked knowledge file and follow its `Action_Steps`.

### 🏗️ Architecture & Sandbox

| ID | Trigger Keywords | Verdict | Knowledge File |
|----|------------------|---------|----------------|
| 01 | head, innerHTML, css, unstyled | NEVER wipe `document.head` in userscripts; preserve Monkey-injected styles | [sandbox_css_protection.md](.agents/knowledge/sandbox_css_protection.md) |
| 04 | 403, referrer, twimg, video load, NotSupportedError | Use document-level `<meta referrer>` NOT element-level `referrerpolicy` for media | [video_referrer_403_fix.md](.agents/knowledge/video_referrer_403_fix.md) |
| 06 | channel, switch, baseUrl, isAnimeOnly, anime, real, CORS | Channel switch = flip `isAnimeOnly` query param; NEVER change `baseUrl` to another domain | [channel_switch_api_design.md](.agents/knowledge/channel_switch_api_design.md) |
| 07 | media query, display: none, mobile button, order | CSS base styles MUST be defined BEFORE @media queries to avoid cascade overriding | [css_declaration_order_cascading.md](.agents/knowledge/css_declaration_order_cascading.md) |
| 09 | blank screen, white, FOUC, error, finally | Always remove FOUC hide in `finally` block or error state; don't wait for API success | [api_error_fouc_protection.md](.agents/knowledge/api_error_fouc_protection.md) |
| 10 | range, daily, all, 日榜, 总榜, same data | API `range=daily` is INVALID — daily = empty string `""`; use RANGE_MAP in ApiClient | [api_range_param_mapping.md](.agents/knowledge/api_range_param_mapping.md) |
| 11 | hydration, React, error 418, replace | Add AppRoot via CSS hide-and-append + setTimeout to avoid breaking React root | [react_hydration_coexistence.md](.agents/knowledge/react_hydration_coexistence.md) |
| 12 | redirect, clickjacking, ad, window | Pre-hijack EventTarget prototype to block invisible ad overlays & global redirects | [global_clickjacking_defense.md](.agents/knowledge/global_clickjacking_defense.md) |

### 🛠️ Build & Syntax

| ID | Trigger Keywords | Verdict | Knowledge File |
|----|------------------|---------|----------------|
| 02 | backtick, syntax error, vite | Escape backticks carefully or use standard quotes for template segments | [template_literal_syntax_safety.md](.agents/knowledge/template_literal_syntax_safety.md) |
| 13 | vite client, URL, null, safari | Configure `noframes` & proxy `window.URL` for strict baseURI null bypass in iOS | [safari_null_base_uri_crash.md](.agents/knowledge/safari_null_base_uri_crash.md) |

### 📱 Player & Performance

| ID | Trigger Keywords | Verdict | Knowledge File |
|----|------------------|---------|----------------|
| 03 | virtual list, index, swipe | Use absolute modulo for node recycling; sync play state with transition delay | [virtual_list_state_sync.md](.agents/knowledge/virtual_list_state_sync.md) |
| 05 | preload, buffer, slow, twimg, black screen | Tiered preload: current=auto, next after 2s, prev after 4s; clear timers on navigate | [video_preload_strategy.md](.agents/knowledge/video_preload_strategy.md) |
| 08 | progress, swipe, touch, collision, region | Partition screen: use bottom 15% for progress/seeking; ignore vertical swiping in that area | [player_gesture_partitioning.md](.agents/knowledge/player_gesture_partitioning.md) |

---

## ✍️ Knowledge Files Schema

`.agents/knowledge/` 中的每个经验文件必须遵循以下格式：

```markdown
# [简明标题]

- **Subject:** [场景描述]
- **Env:** [框架/版本号]
- **Issue:** [错误现象或日志片段]
- **Solution:** [核心解决方案]
- **Action_Steps:**
  [可执行的代码块]
- **AI_Guidance:** [AI 行动指南 — 优先查什么 + 绝对禁止做什么]
```

### Schema 规则

1. 每个文件必须在 AGENTS.md 的 Experience Index 中注册对应条目
2. `Action_Steps` 必须包含可复制粘贴的代码块（用 `// ✅ GOOD` / `// ❌ BAD` 对比）
3. `AI_Guidance` 必须明确 **ALWAYS** 和 **NEVER** 边界
4. 文件名使用 `snake_case.md`，描述性命名
5. 不要在 knowledge 文件中存放原始调试脚本或临时数据
