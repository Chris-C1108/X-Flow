# Player Gesture Area Partitioning

- **Subject:** 播放器进度条拖拽手势与全局翻页手势的冲突。
- **Env:** Vanilla JS / Touch Events
- **Issue:** 移动端用户尝试拖动进度条（水平滑动）时，极易触发播放器的上下翻页手势（垂直滑动）。
- **Solution:** 实行屏幕区域隔离（Region Partitioning）。将屏幕底部一定比例（如 15%）的特定区域设为“手势敏感区”。在该区域内阻断或忽略全局翻页逻辑，仅响应进度调节。
- **Action_Steps:**
  ```typescript
  // ✅ GOOD: 区域识别与逻辑隔离
  swipeMask.addEventListener('touchstart', (e) => {
      const touchY = e.touches[0].clientY;
      const screenH = window.innerHeight;
      
      // 底部 15% 区域用于进度条，屏蔽翻页
      if (touchY > screenH * 0.85) {
          this.isMoving = false; // 标记不触发翻页
          return;
      }
      
      // 正常区域触发翻页逻辑
      this.startY = touchY;
      this.isMoving = true;
  });
  ```
- **AI_Guidance:** **ALWAYS** 在全屏交互组件中考虑手势的热区冲突。**NEVER** 让两个重合的层同时监听互相干扰的手势。使用比例（vh/percentage）而非绝对像素值来划分碰撞区。
