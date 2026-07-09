# 无缝无限轮播：Clone 卡片策略

- **Subject:** 4卡横向轮播从最后一张回到第一张（或反之）时出现穿越所有卡片的反向滑动动画
- **Env:** Vanilla DOM，CSS `transform: translateX`，无框架
- **Issue:** 旧方案：Track = 400% 宽，4 张卡各占 25%。`goTo(0)` 时 `translateX(0%)`，`goTo(3)` 时 `translateX(-75%)`。从 index 3 → 0 需要从 -75% 跳回 0%，动画方向反向穿越所有卡片，视觉极为不自然。

- **Solution:** 使用 **Clone Slot 策略**：在真实卡片前后各插一张克隆卡，形成 6 个 slot：
  ```
  [clone-of-last | real-0 | real-1 | real-2 | real-3 | clone-of-first]
  ```
  - Track 宽度改为 600%，每张卡占 `calc(100% / 6) ≈ 16.67%`
  - 使用 `pos` 索引（1 = real-0，4 = real-3，0 = clone-last，5 = clone-first）
  - 初始化：`applyPos(false)` 无动画跳到 `pos=1`
  - 视觉上只感知：每次都向同方向滑动一张，永远连续

- **Action_Steps:**
  ```typescript
  // ✅ GOOD — 6 slot 无限轮播
  const REAL = 4, TOTAL = 6, STEP = 100 / TOTAL; // 16.6667%
  let pos = 1; // 初始指向 real-0

  const applyPos = (animated: boolean) => {
      track.style.transition = animated ? 'transform 0.55s var(--ease-smooth)' : 'none';
      track.style.transform = `translateX(-${pos * STEP}%)`;
  };

  // 关键：transitionend 时检测是否落在 clone 上，若是则无动画瞬跳
  track.addEventListener('transitionend', () => {
      if (pos <= 0) { pos = REAL; applyPos(false); }       // clone-prev → 跳到 real-last
      else if (pos >= TOTAL - 1) { pos = 1; applyPos(false); } // clone-next → 跳到 real-first
  });

  // ❌ BAD — 取模跳转，会反向穿越
  const goTo = (idx: number) => {
      currentSlide = ((idx % 4) + 4) % 4;
      track.style.transform = `translateX(-${currentSlide * 25}%)`; // 3→0 会倒退
  };
  ```

  ```html
  <!-- ✅ 克隆卡 HTML 结构（不含唯一 id，含独立的 bg/title id 供数据填充）-->
  <div class="hc-card hc-clone" aria-hidden="true" tabindex="-1">
      <div class="hc-card-bg" id="hc-bg-clone-prev"></div>
      ...（与真实卡相同的视觉结构）
  </div>
  ```

  ```typescript
  // ✅ 数据加载完后同步克隆卡内容
  populate('clone-prev', allData);   // clone-prev 镜像最后一张 (all)
  populate('clone-next', dailyData); // clone-next 镜像第一张 (daily)
  ```

- **AI_Guidance:**
  - **ALWAYS:** 克隆卡先在 HTML 生成时就有完整视觉结构（badge/title/meta），数据后填充
  - **ALWAYS:** 克隆卡加 `aria-hidden="true"` + `pointer-events: none`，不参与点击交互
  - **ALWAYS:** `transitionend` 监听做瞬跳，不能用 `setTimeout`（时机不准）
  - **NEVER:** 修改 `.hc-clone` 的唯一 `id`——克隆卡用独立 key（如 `clone-prev`、`clone-next`）避免与真实卡 id 冲突
  - **NEVER:** 对 clone 使用 `Math.abs(dx) > dt` 来判断方向——track 宽度已是 600%，STEP = 100/6
