# GestureController 整合分析

## 背景
`src/player/GestureController.ts` (537行) 实现了一套完整的移动端手势系统，但从未被 `TikTokMode` 使用。TikTokMode 有自己独立的 `bindEvents()` 处理基础滑动。

## 代码质量
GestureController 实现质量很高，包含：
- FSM 状态机（IDLE → AWAITING → SWIPING/LONG_PRESS/SCRUBBING/ZOOMING/PANNING）
- 垂直滑动切换视频
- 长按 2x 倍速播放
- 长按后水平拖动 → 精准进度调节 (Mode A, 0.15s/px)
- 底部 15% 区域粗调进度 (Mode C, 全宽度映射到 duration)
- 单击/双击判定（300ms 间隔，含区域感知）
- 双指缩放 1x~4x + 放大后单指平移
- touchmove 节流 (16ms ~60fps)

## 兼容性问题
| # | 问题 | 影响平台 | 严重度 |
|---|------|---------|--------|
| A | `e.touches.length >= 2` 检测在部分 Android WebView 中不可靠 | 三星浏览器、MIUI 浏览器 | 🟡 中 |
| B | `performance.now()` 在 iOS < 15 的 Safari 中精度受限 | iOS Safari | 🟢 低 |
| C | `playbackRate = 2.0` 在某些 Android WebView 中可能被忽略 | Android 定制浏览器 | 🟡 中 |
| D | `video.style.transform` 在 iOS Safari 上可能导致视频渲染异常 | iOS Safari / Edge | 🟡 中 |
| E | `{ passive: false }` 在旧版 iOS Safari 中可能产生 console warning | iOS Safari < 13 | 🟢 低 |

## 选项
### 选项 1: 整合进 TikTokMode
- 让 TikTokMode 实现 `GestureCallbacks` 接口
- 用 GestureController 替换 TikTokMode 的 `bindEvents()` 基础滑动逻辑
- **优点：** 获得长按倍速、缩放、双击快进等高级功能
- **缺点：** 需要适配 TikTokMode 的 UI 层和 VirtualList 交互

### 选项 2: 删除
- 如果不需要高级手势，直接删除 GestureController.ts
- **优点：** 减少代码体积，避免维护负担
- **缺点：** 未来如需这些功能要重新实现

### 选项 3: 保持现状
- 两者并存，TikTokMode 处理基础滑动，GestureController 作为可选增强
- **优点：** 无风险
- **缺点：** 537 行死代码

## 建议
待评估用户对高级手势的需求程度后决定。

## 相关文件
- `src/player/GestureController.ts` — 手势控制器（未使用）
- `src/player/TikTokMode.ts` — TikTok 模式播放器（使用独立手势逻辑）
- `AGENTS.md` — Experience Index 条目 #8 (player_gesture_partitioning)
