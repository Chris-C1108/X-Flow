# VirtualList 3-Node 状态同步

- **Subject:** 虚拟列表（3 节点循环复用）在上滑时索引错乱
- **Env:** TypeScript, Vanilla DOM, 无虚拟 DOM 框架
- **Issue:** 使用标准 `%` 取模时，负数索引（向上滑动 `currentIndex - 1`）返回负值，导致节点分配错误、视频加载到错误位置。
  ```typescript
  // 当 currentIndex = 0, delta = -1:
  // (-1) % 3 = -1  ← 错误！应该得到 2
  ```
- **Solution:** 使用双重取模安全公式 `((i % n) + n) % n` 处理负数索引。同时确保 `playCurrent()` 的调用延迟到 CSS transition 完成后，避免 autoplay 被浏览器 block。
- **Action_Steps:**
  ```typescript
  // ❌ BAD — 标准取模无法处理负数
  public getNodeIndex(logicalIndex: number) {
      return logicalIndex % 3; // -1 % 3 = -1 💥
  }

  // ✅ GOOD — 安全循环索引
  public getNodeIndex(logicalIndex: number) {
      return ((logicalIndex % 3) + 3) % 3; // -1 → 2 ✅
  }

  // ✅ GOOD — playCurrent() 延迟到 transition 结束
  public navigate(delta: number) {
      this.currentIndex += delta;
      this.updatePositions(); // 触发 CSS transition
      // 等 transition 结束后再播放，避免 autoplay block
      setTimeout(() => this.playCurrent(), 400); // 400ms = transition duration
  }
  ```
- **AI_Guidance:**
  - **ALWAYS:** 修改 `VirtualList.ts` 中的索引计算时，使用 `((i % n) + n) % n` 公式。
  - **ALWAYS:** 修改 `navigate()` 或 `playCurrent()` 时，确认 play 调用的时机在 transition 动画完成之后。
  - **NEVER:** 使用裸 `%` 运算符处理可能为负数的循环索引。
  - **NEVER:** 在 `navigate()` 中同步调用 `video.play()`——必须延迟到 transition 结束。
