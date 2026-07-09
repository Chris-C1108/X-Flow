# Sandbox CSS 保护：禁止清除 document.head

- **Subject:** Sandbox 初始化时误删 GM/Vite 注入的样式
- **Env:** vite-plugin-monkey ^4.0, Tampermonkey, Vite 5
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** `document.head.innerHTML = ''` 或其他激进清除操作会删除 Tampermonkey / Vite HMR 注入的 `<style>` 块，导致 UI 完全无样式 (FOUC)。
  ```
  // 典型报错现象：页面一闪后完全白屏，或所有组件堆叠在左上角
  ```
- **Solution:** 使用选择性追加策略，而非破坏性清除。只操作 `document.body` 做沙盒接管，`document.head` 仅做追加操作。
- **Action_Steps:**
  ```typescript
  // ❌ BAD — 直接清空 head
  document.head.innerHTML = '';

  // ❌ BAD — 遍历删除所有 head 子节点
  while (document.head.firstChild) {
      document.head.removeChild(document.head.firstChild);
  }

  // ✅ GOOD — 仅追加新资源，保留已有注入
  if (!document.querySelector('link[href*="specific-font"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/...';
      document.head.appendChild(link);
  }

  // ✅ GOOD — 追加保护样式时使用标记属性
  const style = document.createElement('style');
  style.setAttribute('data-xflow-core', '1');
  style.textContent = '/* ... */';
  document.head.appendChild(style);
  ```
- **AI_Guidance:**
  - **ALWAYS:** 在操作 `document.head` 前，假设其中已有 Tampermonkey / Vite HMR 注入的关键 `<style>` 和 `<link>` 标签。
  - **ALWAYS:** 使用 `data-xflow-*` 属性标记自身注入的元素，方便后续查找和防御。
  - **NEVER:** 使用 `document.head.innerHTML = ''`、`replaceChildren()` 或任何会清除全部 head 子节点的操作。
  - **NEVER:** 删除不带 `data-xflow-*` 标记的 `<style>` 或 `<link>` 标签。
