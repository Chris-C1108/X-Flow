# CSS Cascading & Media Query Order

- **Subject:** 移动端 UI 元素（如按钮）在符合媒体查询条件时仍不显示的问题。
- **Env:** Vanilla CSS / Tampermonkey
- **Issue:** 在 `@media (max-width: 768px)` 中设置了 `display: block`，但元素依然处于 `display: none` 状态。
- **Solution:** 检查基础样式的声明顺序。CSS 的层叠原则（Cascade）规定，相同优先级的选择器，后声明的会覆盖先声明的。如果 `display: none` 的基础样式定义在 `@media` 块之后，它会覆盖媒体查询中的样式。
- **Action_Steps:**
  ```css
  // ❌ BAD: 基础样式在媒体查询之后，会覆盖媒体查询内的生效样式
  @media (max-width: 768px) {
      .btn { display: block; }
  }
  .btn { display: none; } // 这里会覆盖上面的 block
  
  // ✅ GOOD: 先定义基础样式，再定义特化（媒体查询）样式
  .btn { display: none; }
  @media (max-width: 768px) {
      .btn { display: block; }
  }
  ```
- **AI_Guidance:** **ALWAYS** 确保所有 `@media` 块放在相关 CSS 文件的末尾，或者至少在所涉及的基础样式定义之后。在调试 UI 消失问题时，优先检查 DevTools 中的 CSS 覆盖顺序。
