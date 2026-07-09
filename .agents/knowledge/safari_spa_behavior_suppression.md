# Safari / iOS WebKit SPA 行为抑制

- **Subject:** iOS Safari 在 SPA / 全屏视频应用中触发的原生浏览器行为（长按选文、弹出菜单、橡皮筋回弹等）与应用体验冲突
- **Env:** iOS Safari 15+, Android Chrome, Tampermonkey Userscript, CSS 全局样式
- **Issue:** 未处理时的典型问题：
  - 长按媒体卡片唤出 "拷贝 / 分享 / 查看" 系统菜单，干扰视频预览开始
  - 长按文字区域触发文字选择框，遮挡 UI
  - 页面整体可被 iOS 橡皮筋滚动（overscroll），拉出白边
  - 横屏时 Safari 自动放大字体，破坏布局
  - 点击响应有 300ms 延迟（双击缩放判定）

- **Solution:** 一组 CSS 全局样式，放在 app root CSS 的最顶层 `*` reset 和 `body` 规则中：

- **Action_Steps:**
  ```css
  /* ✅ GOOD — SPA 行为抑制，放在所有样式之前 */

  * {
      margin: 0; padding: 0; box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;   /* 禁用点击高亮蓝色闪烁 */
      -webkit-user-select: none;
      user-select: none;                          /* 禁用长按文本选择框 */
      -webkit-touch-callout: none;                /* 禁用长按系统菜单 (Copy/Share/Look Up) */
  }

  body {
      overscroll-behavior: none;           /* 禁止橡皮筋回弹 (iOS bounce) */
      -webkit-text-size-adjust: 100%;      /* 防止横屏时 Safari 自动放大字体 */
      touch-action: manipulation;          /* 禁用双击缩放 + 消除 300ms 点击延迟 */
  }

  /* ❌ BAD — 仅设置 tap-highlight，其他问题仍然存在 */
  * { -webkit-tap-highlight-color: transparent; }
  ```

- **注意事项:**

  | 属性 | 副作用 | 缓解方式 |
  |------|--------|---------|
  | `user-select: none` | 所有文字不可复制 | 对需要可选的元素局部覆写 `user-select: text` |
  | `touch-action: manipulation` | 禁用 pinch-zoom | 如需局部缩放，在该元素上覆写 `touch-action: auto` |
  | `overscroll-behavior: none` | 下拉刷新也会被禁用 | 通常对 SPA 是预期行为 |

- **AI_Guidance:**
  - **ALWAYS:** 把这组样式放在 CSS 文件的最顶层 global reset 块内，确保优先级最低、覆盖范围最广
  - **ALWAYS:** `touch-action: manipulation` 放在 `body` 而非 `*`（`*` 覆盖太激进，会禁止 scroll container 内的滑动）
  - **ALWAYS:** 在 Tampermonkey 脚本中，这些样式必须通过 `GM_addStyle` 或 `<style>` 注入方式加到页面 head 中
  - **NEVER:** 设置 `touch-action: none` 在 `body`——这会完全阻止触摸滚动，体验极差
  - **NEVER:** 忘记 `-webkit-` 前缀版本——iOS Safari 对无前缀版本支持延迟较晚
