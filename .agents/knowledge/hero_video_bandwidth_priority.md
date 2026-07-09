# Hero Carousel 带宽优先级

- **Subject:** Hero Carousel 的隐藏预览视频在后台继续缓冲，拖慢播放器首播和跳转 seek。
- **Env:** Tampermonkey Userscript, Hero Carousel, TikTokMode, `video.twimg.com`
- **Issue:** 首页 Hero 轮播存在 4 个真实卡槽 + 2 个 clone 卡槽。若所有卡槽都持续持有 `src` 并 autoplay，即使其中大部分处于离屏状态，也会继续占用网络带宽和视频解码资源，表现为播放器打开变慢、拖动进度时卡顿，甚至出现“有声音但画面不动”。
- **Solution:** Hero 只允许当前可见卡片持有 `src` 并播放；所有离屏卡片统一 `pause()` + `removeAttribute('src')` + `load()` 释放请求。进入 TikTok 播放器前，先卸载全部 Hero 预览，把带宽优先级完全让给当前播放视频；播放器节点切换时不要额外调用 `video.load()` 强制重置缓冲。
- **Action_Steps:**
  ```typescript
  // ❌ BAD — 所有 hero 卡片都持有 src 并持续播放
  for (const key of ['daily', 'weekly', 'monthly', 'all', 'clone-prev', 'clone-next']) {
      const video = document.getElementById(`hc-video-${key}`) as HTMLVideoElement | null;
      if (!video) continue;
      video.src = item.url;
      video.preload = 'auto';
      video.play();
  }

  // ✅ GOOD — 只有当前可见卡片能占用带宽
  const activeKey = this.getHeroSlotKey(this.heroCarouselPos);
  for (const key of ['daily', 'weekly', 'monthly', 'all', 'clone-prev', 'clone-next']) {
      const video = document.getElementById(`hc-video-${key}`) as HTMLVideoElement | null;
      if (!video) continue;

      if (key === activeKey) {
          video.src = item.url;
          video.preload = 'auto';
          video.play().catch(() => {});
      } else {
          video.pause();
          video.preload = 'none';
          video.removeAttribute('src');
          video.load();
      }
  }

  // ✅ GOOD — 打开播放器前先卸载全部 hero 预览
  this.pauseAllHeroVideos(true);

  // ✅ GOOD — 播放器复用节点时不要显式 video.load()
  video.src = item.url;
  video.preload = logicalIndex === this.currentIndex ? 'auto' : 'metadata';
  ```
- **AI_Guidance:**
  - **ALWAYS:** 把播放器当前视频视为最高带宽优先级，Hero 预览必须让路。
  - **ALWAYS:** 隐藏 Hero 卡片不只要 `pause()`，还要移除 `src`，否则 CDN 请求和缓冲可能继续进行。
  - **ALWAYS:** 轮播 clone 卡槽和真实卡槽一样算作独立 `<video>`，同样会抢资源。
  - **NEVER:** 让多个离屏 Hero 视频同时 autoplay 或 `preload="auto"`。
  - **NEVER:** 在播放器节点复用时额外调用 `video.load()` 强制刷新缓冲状态。
