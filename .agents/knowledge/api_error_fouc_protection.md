# API Error Handling & FOUC Protection

- **Subject:** 系统启动阶段 API 报错导致页面永久白屏（FOUC 隐藏样式未移除）。
- **Env:** Userscript / Sandbox
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** 为了防止闪烁（FOUC），Sandbox 会在 `bootSystem` 前给 `html` 加上 `display: none !important`。如果 API 请求在 UI 渲染前抛出错误，且错误处理流程没有包含“移除 FOUC 样式”的逻辑，页面将保持白屏。
- **Solution:** 确保错误渲染函数（`renderErrorState`）具有最高优先级，并且必须包含 UI 恢复逻辑。解耦“移除闪烁保护”与“API 数据加载成功”的强绑定关系。
- **Action_Steps:**
  ```typescript
  // ✅ GOOD: 健壮的启动逻辑
  async bootSystem() {
      try {
          await this.api.init(); // 可能会报错
          this.renderUI();
      } catch (e) {
          this.renderErrorUI(); // 内部必须包含恢复显示逻辑
      } finally {
          // 无论成功失败，都确保移除 FOUC 隐藏
          document.documentElement.style.display = '';
      }
  }
  ```
- **AI_Guidance:** **ALWAYS** 在 `try-catch-finally` 的 `finally` 块中处理 UI 的强制显示。在调试白屏问题时，优先检查 `html` 或 `body` 标签是否被 CSS 强制隐藏。
