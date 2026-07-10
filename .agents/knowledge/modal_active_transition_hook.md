# 元素显示隐藏 (display none/block) 时的 CSS 过渡动画触发机制

- **Subject:** 控制播放器 modal 等大容器的显示隐藏，并保证淡入淡出/缩放等过渡动画生效。
- **Env:** Vanilla JS / DOM, CSS transitions
- **Runtime Scope:** 适用于所有前端项目 (包括 Userscript 和 Web App)
- **Issue:** 当一个元素的 CSS 属性为 `display: none` 时，如果直接设置 `element.style.display = 'block'` 并立刻添加含有 `transition` 的类名，浏览器会将它们合并在同一个渲染帧内处理，导致过渡动画失效，元素直接生硬地显示。
- **Solution:** 
  1. **显示时 (Enter)**: 先设置 `style.display = 'block'`，随后读取一次 Layout 属性 (例如 `element.offsetHeight`) 强制触发浏览器重绘 (reflow)，再添加 `.active` 类名。
  2. **隐藏时 (Exit)**: 先移除 `.active` 类名触发退出动画，然后通过 `setTimeout` (时间与 CSS exit transition 一致) 延迟设置 `style.display = 'none'` 并进行资源卸载。

- **Action_Steps:**
  ```typescript
  // ✅ GOOD — 强制重绘 + 延迟隐藏，完美实现进入/退出过渡
  public openModal() {
      this.modal.style.display = 'block';
      this.modal.offsetHeight; // ⚡ 关键：强制触发 reflow
      this.modal.classList.add('active'); // 此时添加类名可完美触发 transition
  }

  public closeModal() {
      this.modal.classList.remove('active'); // 触发退出 transition
      
      // 延迟隐藏，时间匹配 CSS 中的 exit transition 时间 (200ms)
      setTimeout(() => {
          if (!this.isOpen) {
              this.modal.style.display = 'none';
              this.unloadVideos(); // 动画播放完毕后再进行内存/渲染清理
          }
      }, 200);
  }
  ```

  ```css
  /* CSS 搭配 */
  #modal {
      display: none;
      opacity: 0;
      transform: scale(0.96);
      transition: opacity 0.2s cubic-bezier(0.3, 0, 0.8, 0.15), transform 0.2s cubic-bezier(0.3, 0, 0.8, 0.15); /* 退出：快而爽快 */
  }
  #modal.active {
      display: block;
      opacity: 1;
      transform: scale(1);
      transition: opacity 0.32s cubic-bezier(0.23, 1, 0.32, 1), transform 0.32s cubic-bezier(0.23, 1, 0.32, 1); /* 进入：优雅平滑 */
  }
  ```

- **AI_Guidance:**
  - **ALWAYS:** 在由 `display: none` 变为 `display: block` 的同一同步任务中，必须在添加过渡类名之前访问 `offsetHeight` 或 `getBoundingClientRect()` 触发重绘。
  - **ALWAYS:** 隐藏过渡时，必须确保 `setTimeout` 的延迟时间与 CSS transition 的时长一致，避免过早切断 display 导致动画腰斩，或过迟切断导致无效渲染。
  - **NEVER:** 忽略进入和退出的非对称时间设计（进入慢而平滑，退出快而干脆）。
