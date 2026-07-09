# 移动端触摸"悬停"预览播放

- **Subject:** 媒体卡片网格需要在移动端支持类似桌面 hover 的视频预览功能
- **Env:** Tampermonkey Userscript，iOS Safari / Android Chrome，Vanilla DOM
- **Issue:** 桌面端 `mouseenter/mouseleave` 在触摸屏完全无效。触摸屏没有 hover 状态，但用户可能希望在不进入全屏播放器的情况下快速预览视频内容。

- **Solution:** 使用 **长按预览** 模式：
  - `touchstart` → 启动 450ms 定时器
  - `touchmove` 垂直偏移 > 10px → 取消（用户在滚动）
  - 450ms 后触发 → 创建静音 `<video>` 附加到卡片（同桌面 hover 逻辑）
  - `touchend` → 清除预览；**若预览正在播放**，调用 `e.preventDefault()` 吃掉后续 click（防止意外进入播放器）
  - `touchcancel` → 清除预览

- **Action_Steps:**
  ```typescript
  // ✅ GOOD — 长按预览 + 短按打开播放器，行为严格分离
  let touchTimer: ReturnType<typeof setTimeout> | null = null;
  let touchStartY = 0;
  let touchScrolled = false;

  gridContainer.addEventListener('touchstart', (e: TouchEvent) => {
      const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
      if (!card || !card.dataset.videoUrl) return;
      touchScrolled = false;
      touchStartY = e.touches[0].clientY;
      touchTimer = setTimeout(() => {
          if (!touchScrolled) startTouchPreview(card); // 创建 video 元素
      }, 450);
  }, { passive: true });

  gridContainer.addEventListener('touchmove', (e: TouchEvent) => {
      if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
          touchScrolled = true;
          if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
      }
  }, { passive: true });

  gridContainer.addEventListener('touchend', (e: TouchEvent) => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
      if (hoverCard) {
          clearHoverVideo();
          e.preventDefault(); // ✅ 吃掉 click，防止意外打开播放器
      }
      // 短按时 hoverCard 为 null → click 正常触发 → 打开播放器
  }, { passive: false }); // ← 必须 passive:false 才能调用 preventDefault

  gridContainer.addEventListener('touchcancel', () => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
      clearHoverVideo();
  }, { passive: true });

  // ❌ BAD — 直接在 touchstart 播放（无延迟，滚动页面时也会触发）
  gridContainer.addEventListener('touchstart', (e) => {
      startPreview(e.target.closest('.media-card'));
  });
  ```

  ```typescript
  // 创建预览视频（桌面/移动共用）
  const startTouchPreview = (card: HTMLElement) => {
      hoverCard = card;
      card.classList.add('hover-playing');
      const video = document.createElement('video');
      video.className = 'card-hover-video';
      video.src = card.dataset.videoUrl!;
      video.muted = true; video.autoplay = true; video.loop = true; video.playsInline = true;
      card.appendChild(video);
      hoverVideo = video;
      video.play().catch(() => {});
  };
  ```

- **AI_Guidance:**
  - **ALWAYS:** `touchend` 监听器必须用 `passive: false`，才能在预览激活时 `e.preventDefault()`
  - **ALWAYS:** `touchmove` 用 `passive: true` 防止卡顿，仅设置 flag 取消定时器
  - **ALWAYS:** 450ms 是经验值：太短误触，太长感觉迟钝；可根据 UX 测试调整 300~600ms
  - **NEVER:** 在 `touchend` 中直接判断时间差再决定是否 preventDefault——应使用 `hoverCard !== null` 状态判断
  - **NEVER:** 在全局 `document` 上监听这些事件——必须绑定到具体容器，避免与其他触摸交互冲突
