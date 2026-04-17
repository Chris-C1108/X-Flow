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
├── .github/
│   └── workflows/
│       └── analyze.yml    # GitHub Actions 每日分析定时任务
├── workers/               # Cloudflare Worker 后端
│   ├── src/index.ts       # ⭐ Worker 路由 — /api/telemetry/* + /api/recommend
│   ├── schema.sql         # D1 数据库表结构（4张表）
│   └── wrangler.toml      # CF Worker 部署配置（含 D1 / KV 绑定）
├── scripts/
│   └── analyze.py         # Python 离线分析（高光提取 + 协同过滤 → 写回 D1）
├── .agents/
│   ├── knowledge/         # 经验教训文件（详见下方 Experience Index）
│   ├── dev-docs/          # PRD 等产品文档
│   └── todo/              # 待办 & 已完成任务（含 v6.0.0_plan.md）
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
    │   └── EventCollector.ts  # ⭐ 遥测埋点 — 匿名ID/点赞/Session/高光拉取
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

## 📋 Progress Tracking — 进度跟踪管理

### 当前版本状态

| 版本 | 计划文档 | 当前阶段 | 整体进度 |
|------|----------|----------|----------|
| **v6.0.0** | [v6.0.0_plan.md](.agents/todo/v6.0.0_plan.md) | M4 — 推荐系统 UI 闭环 | 🔄 进行中 |

### 状态标记规范

在所有 `.agents/todo/` 下的计划文档中，任务状态使用以下标记：

| 标记 | 含义 | 使用场景 |
|------|------|----------|
| `⬜` | 待开始 | 任务尚未启动 |
| `🔄` | 进行中 | 当前正在开发或调试 |
| `✅` | 完成 | 已验证通过，可交付 |
| `❌` | 阻塞 | 有依赖未解除或发现技术障碍 |
| `⏭️` | 跳过 | 本版本决定不实现，移入 Backlog |

### AI Agent 进度更新规则 — MANDATORY

> **每次完成一个任务后，AI Agent 必须执行以下操作，不得遗漏：**

1. **更新任务状态标记**
   - 将对应任务的 `⬜` 改为 `✅`（或其他适当状态）
   - 同时更新"总览仪表板"中该里程碑的状态

2. **更新 AGENTS.md 当前版本状态表**（即本节上方的表格）
   - 更新"当前阶段"列为最新进行中的里程碑
   - 如整个里程碑完成，进度更新为下一个里程碑

3. **新增 Knowledge File（当遇到新 BUG 或新经验时）**
   - 在 `.agents/knowledge/` 创建新文件
   - 在本文件 Experience Index 注册新条目（ID 自增）

4. **绝对禁止的行为**
   - ❌ 不得在未完成 `npm run build` 验证前将任务标记为 `✅`
   - ❌ 不得跳过"M0 验收标准"直接开始 M1 的工作
   - ❌ 不得在任务进行中修改其他里程碑的任务内容（需先讨论再修改）

### 里程碑完成标准

每个里程碑的"验收标准"是完成的最低门槛，必须全部满足后才能推进到下一里程碑。验收时需在计划文档中对应位置记录实际验证结果。

### 计划文档管理规则

- 计划文档保存在 `.agents/todo/v{version}_plan.md`
- 每个版本一个文档，禁止跨版本混写
- 版本发布后，将计划文档重命名为 `v{version}_plan_DONE.md` 归档
- Backlog 中的需求在下一版本计划制定时评估是否纳入

---

## 🛑 Experience Index — MANDATORY

> **BEFORE writing code or debugging, MATCH the current issue against this table.**
> If matched, READ the linked knowledge file and follow its `Action_Steps`.
>
> ⚠️ **知识诅咒警告：** 部分经验文件记录的是**已失败的方案**（标记为 ❌ FAILED）。
> 遇到相同问题时，**不要重复使用失败方案**，应先阅读失败原因，然后寻找新思路。
> 新 BUG 不一定适合旧经验——如果旧方案在多轮迭代中反复失败，它可能基于错误的假设。

### 🏗️ Architecture & Sandbox

| ID | Trigger Keywords | Verdict | Knowledge File |
|----|------------------|---------|----------------|
| 01 | head, innerHTML, css, unstyled | NEVER wipe `document.head` in userscripts; preserve Monkey-injected styles | [sandbox_css_protection.md](.agents/knowledge/sandbox_css_protection.md) |
| 04 | 403, referrer, twimg, video load, NotSupportedError | Use document-level `<meta referrer>` NOT element-level `referrerpolicy` for media | [video_referrer_403_fix.md](.agents/knowledge/video_referrer_403_fix.md) |
| 06 | channel, switch, baseUrl, isAnimeOnly, anime, real, CORS | Channel switch = flip `isAnimeOnly` query param; NEVER change `baseUrl` to another domain | [channel_switch_api_design.md](.agents/knowledge/channel_switch_api_design.md) |
| 07 | media query, display: none, mobile button, order | CSS base styles MUST be defined BEFORE @media queries to avoid cascade overriding | [css_declaration_order_cascading.md](.agents/knowledge/css_declaration_order_cascading.md) |
| 09 | blank screen, white, FOUC, error, finally | Always remove FOUC hide in `finally` block or error state; don't wait for API success | [api_error_fouc_protection.md](.agents/knowledge/api_error_fouc_protection.md) |
| 10 | range, daily, all, 日榜, 总榜, same data | API `range=daily` is INVALID — daily = empty string `""`; use RANGE_MAP in ApiClient | [api_range_param_mapping.md](.agents/knowledge/api_range_param_mapping.md) |
| 11 | hydration, React, error 418, replace, **white screen, blank, FOUC, display none, 白屏, 1500ms, 间歇性注入失败, 多次刷新** | ✅ SOLVED — 三层防御: Pre-emptive API 冻结 + document.open() + CSP + 选择性错误处理 | [react_hydration_coexistence.md](.agents/knowledge/react_hydration_coexistence.md) |
| 12 | redirect, clickjacking, ad, window, **Tab-under, location.href, location.replace, onclick=, onmousedown=, postMessage null** | ✅ SOLVED — `document.open()` + CSP meta injection; 9 JS-level approaches failed, browser-level CSP succeeded | [global_clickjacking_defense.md](.agents/knowledge/global_clickjacking_defense.md) |
| 14 | carousel, loop, wrap, swipe back, 轮转, jump, 跳回, 反向 | Clone 6-slot track (clone-last \| r0\|r1\|r2\|r3 \| clone-first); `transitionend` instant-jump to real mirror | [infinite_carousel_clone_pattern.md](.agents/knowledge/infinite_carousel_clone_pattern.md) |
| 15 | safari, long press, select, callout, text selection, bounce, overscroll, 长按选字, 弹出菜单 | `-webkit-user-select:none` + `-webkit-touch-callout:none` + `overscroll-behavior:none` + `touch-action:manipulation` | [safari_spa_behavior_suppression.md](.agents/knowledge/safari_spa_behavior_suppression.md) |
| 18 | redirect, ad, 重定向, 广告, nuclear, 核平, window.stop, inline script, reload loop | ✅ **SOLVED** — `document.open()` + CSP meta in `<head>` blocks all 3rd-party scripts at browser level; no Content Blocker needed | [anti_ad_redirect_postmortem.md](.agents/knowledge/anti_ad_redirect_postmortem.md) |
| 19 | CSP, Content-Security-Policy, meta, document.open, document.write, 第三方脚本, frame-src, script-src | ✅ The winning pattern: `document.open()` + CSP meta in clean document; GM API unaffected by CSP | [csp_meta_document_open_solution.md](.agents/knowledge/csp_meta_document_open_solution.md) |

### 🛠️ Build & Syntax

| ID | Trigger Keywords | Verdict | Knowledge File |
|----|------------------|---------|----------------|
| 02 | backtick, syntax error, vite | Escape backticks carefully or use standard quotes for template segments | [template_literal_syntax_safety.md](.agents/knowledge/template_literal_syntax_safety.md) |
| 13 | vite client, URL, null, safari | Configure `noframes` & proxy `window.URL` for strict baseURI null bypass in iOS | [safari_null_base_uri_crash.md](.agents/knowledge/safari_null_base_uri_crash.md) |
| 16 | obfuscate, encrypt, build, minify, 混淆, 加密, rollup-plugin-obfuscator, GM_ broken after build | Use `global:true`; reserve GM_ names; disable `selfDefending` & `renameProperties` | [build_obfuscation_tampermonkey.md](.agents/knowledge/build_obfuscation_tampermonkey.md) |

### 📱 Player & Performance

| ID | Trigger Keywords | Verdict | Knowledge File |
|----|------------------|---------|----------------|
| 03 | virtual list, index, swipe | Use absolute modulo for node recycling; sync play state with transition delay | [virtual_list_state_sync.md](.agents/knowledge/virtual_list_state_sync.md) |
| 05 | preload, buffer, slow, twimg, black screen | Tiered preload: current=auto, next after 2s, prev after 4s; clear timers on navigate | [video_preload_strategy.md](.agents/knowledge/video_preload_strategy.md) |
| 08 | progress, swipe, touch, collision, region | Partition screen: use bottom 15% for progress/seeking; ignore vertical swiping in that area | [player_gesture_partitioning.md](.agents/knowledge/player_gesture_partitioning.md) |
| 17 | hover play, mobile, touch, preview video, 移动端悬浮, 长按播放, touchstart, preventDefault | Long-press 450ms delay + `touchmove` scroll-cancel + `touchend` `preventDefault` when previewing | [mobile_touch_hover_preview.md](.agents/knowledge/mobile_touch_hover_preview.md) |
| 20 | like, bookmark, favorite, 收藏, 点赞, localStorage, GM_setValue, 跨域, 持久化 | Use `GM_setValue`/`GM_getValue` for likes & bookmarks — cross-domain persistence; never use localStorage for shared state | [like_bookmark_gm_persistence.md](.agents/knowledge/like_bookmark_gm_persistence.md) |
| 21 | hero carousel, hidden video, preload, seek slow, audio only, frame freeze, buffer contention, 离屏视频, 进度跳转卡顿 | Only the visible hero card may hold `src`/play; unload hidden hero videos before player open | [hero_video_bandwidth_priority.md](.agents/knowledge/hero_video_bandwidth_priority.md) |

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

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
