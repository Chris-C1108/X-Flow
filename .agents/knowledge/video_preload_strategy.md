# 视频分级预加载策略

- **Subject:** twimg 视频源缓冲慢，滑动切换时长时间黑屏
- **Env:** video.twimg.com CDN, VirtualList (3-node pool), TikTokMode player
- **Issue:** Twitter CDN 视频缓冲速度慢。`preload="metadata"` 仅加载元数据不缓冲视频流数据，导致滑动到新视频时出现数秒黑屏等待。
  ```
  // 用户滑动后: 新视频 src 已设置，但 preload="metadata" 不触发数据缓冲
  // 视频停在第 0 帧黑屏，直到用户端慢速下载足够数据
  ```
- **Solution:** 分级预加载策略——当前视频立即 `preload="auto"` 全量缓冲；停留 2s 后将下一个视频升级为 `auto` 开始后台缓冲；再过 2s（共 4s）升级上一个视频。每次导航时清除旧定时器避免带宽浪费。
- **Action_Steps:**
  ```typescript
  // ✅ Step 1: playCurrent() 中——当前视频立即激进缓冲
  video.preload = 'auto';
  this.schedulePreload();

  // ✅ Step 2: loadNode() 中——新加载的节点初始为 metadata（懒加载）
  video.preload = (logicalIndex === this.currentIndex) ? 'auto' : 'metadata';

  // ✅ Step 3: navigate() / closeModal() 中——清除旧定时器防止竞态
  if (this.preloadTimer) {
      clearTimeout(this.preloadTimer);
      this.preloadTimer = null;
  }

  // ✅ Step 4: schedulePreload()——分级升级
  private schedulePreload() {
      if (this.preloadTimer) clearTimeout(this.preloadTimer);
      this.preloadTimer = setTimeout(() => {
          // +2s: 升级 next 视频
          const nextVideo = this.getVideoElement(this.currentIndex + 1);
          if (nextVideo) nextVideo.preload = 'auto';

          this.preloadTimer = setTimeout(() => {
              // +4s: 升级 prev 视频
              const prevVideo = this.getVideoElement(this.currentIndex - 1);
              if (prevVideo) prevVideo.preload = 'auto';
          }, 2000);
      }, 2000);
  }
  ```
- **AI_Guidance:**
  - **ALWAYS:** VirtualList 只有 3 个节点，预加载最多同时缓冲 3 个视频——这是带宽上限。
  - **ALWAYS:** 导航时先 `clearTimeout` 再设新定时器，否则旧定时器会升级错误的节点。
  - **ALWAYS:** 新加载的节点默认 `preload="metadata"`，只有被调度后才升级。
  - **NEVER:** 对所有节点无差别设置 `preload="auto"`——会浪费带宽，且 3 个视频同时缓冲会互相争抢。
  - **NEVER:** 在 `loadNode()` 中直接调用 `video.load()`——改变 `preload` 属性即可，浏览器会自行决定缓冲深度。
