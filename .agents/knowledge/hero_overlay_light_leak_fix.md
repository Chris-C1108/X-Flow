# Hero 卡片遮罩漏光修复

- **Subject:** `hc-card-overlay` 边缘/底部漏光，能看到下层视频或封面，遮罩不完整
- **Env:** Vanilla DOM + CSS，Hero Carousel 6-slot track（`translateX(-16.6667%)` 步进）
- **Issue:** 在轮播/动画中出现子像素缝隙（subpixel seam），叠加 `.hc-card + .hc-card` 分隔线与透明渐变区域，导致卡片边缘和底部出现“漏光”，视觉上像遮罩破洞。
- **Solution:** 采用“遮罩超采样 + 层隔离 + 裁剪一致性”三件套：
  1) 给卡片建立独立合成层与裁剪上下文（`isolation + contain + border-radius + overflow`）
  2) 遮罩使用伪元素并向外扩 1px（`inset: -1px`）覆盖子像素缝
  3) 分隔线只保留在非 overlay 层（避免和遮罩边缘叠加发亮）

- **Action_Steps:**
  ```css
  /* ✅ GOOD — 防漏光卡片容器 */
  .hc-card {
    position: relative;
    overflow: hidden;
    border-radius: inherit;
    isolation: isolate;
    contain: paint;
    background: #000; /* 兜底底色，避免透明底透出 */
  }

  /* ✅ GOOD — 遮罩使用伪元素并做 1px overscan */
  .hc-card-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }

  .hc-card-overlay::before {
    content: '';
    position: absolute;
    inset: -1px; /* 覆盖 subpixel seam */
    background:
      linear-gradient(135deg, rgba(0,0,0,0.62) 0%, transparent 52%),
      linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.36) 58%, transparent 100%);
    transform: translateZ(0);
    will-change: opacity;
  }

  /* ❌ BAD — 直接在 overlay 本体做渐变，且无 overscan/隔离 */
  .hc-card-overlay {
    background: linear-gradient(...);
  }
  ```

  ```css
  /* ✅ GOOD — 分隔线不与遮罩边缘叠加 */
  .hc-card + .hc-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255,255,255,0.04);
    z-index: 0; /* 在 overlay 下方 */
  }

  /* ❌ BAD — 直接 border-left 容易在 transform 中放大缝隙 */
  .hc-card + .hc-card { border-left: 1px solid rgba(255,255,255,0.05); }
  ```

- **AI_Guidance:**
  - **ALWAYS:** 先检查 `.hc-card` 是否有 `overflow:hidden + isolation:isolate + background:#000`
  - **ALWAYS:** 遮罩层优先用 `::before`，并用 `inset:-1px` 做 anti-seam overscan
  - **ALWAYS:** 轮播步进涉及 `16.6667%` 时，把“细线/分隔”放到独立伪元素层，避免与 overlay 叠加
  - **NEVER:** 仅靠提高 `z-index` 解决漏光（根因通常是子像素缝隙，不是层级）
  - **NEVER:** 在 `.hc-card` 上使用透明底色并同时保留强透明渐变遮罩
