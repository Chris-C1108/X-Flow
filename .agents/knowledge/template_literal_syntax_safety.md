# 模板字符串 & 反引号转义安全

- **Subject:** AI 代码生成中反引号导致构建失败
- **Env:** TypeScript ^5.2, Vite 5, vite-plugin-monkey ^4.0
- **Issue:** AI 生成或重构含大量模板字符串的代码时，嵌套反引号未正确转义，导致 Vite 构建失败。
  ```
  ERROR: Syntax error "`" during Vite build
  // 常见于 Sandbox.ts、TikTokMode.ts、Layout.ts 等含 innerHTML 模板的文件
  ```
- **Solution:** 在 AI 代码生成场景下，将反引号视为"不稳定字符"。对简单字符串映射优先使用标准引号，复杂 HTML 模板拆分为常量。
- **Action_Steps:**
  ```typescript
  // ❌ BAD — 在 write_to_file 中深度嵌套反引号
  const html = `<div class="${`item-${index}`}">${`<span>${name}</span>`}</div>`;

  // ✅ GOOD — 用标准引号定义简单映射
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;' };

  // ✅ GOOD — 将复杂模板拆分为独立常量
  const className = 'item-' + index;
  const inner = '<span>' + name + '</span>';
  const html = `<div class="${className}">${inner}</div>`;

  // ✅ GOOD — 使用 document.createElement 替代 innerHTML 模板
  const div = document.createElement('div');
  div.className = `item-${index}`;
  const span = document.createElement('span');
  span.textContent = name;
  div.appendChild(span);
  ```
- **AI_Guidance:**
  - **ALWAYS:** 修改 `Sandbox.ts`、`TikTokMode.ts`、`Layout.ts`、`Components.ts` 后执行 `npm run build` 验证。
  - **ALWAYS:** 对包含 HTML 模板的修改，优先使用 `document.createElement` 而非 `innerHTML` 模板字符串。
  - **NEVER:** 在 AI 工具的 `write_to_file` / `replace_file_content` 操作中使用三层及以上嵌套的反引号。
  - **NEVER:** 假设反引号转义在多层工具调用链中能保持正确——每次都要通过构建验证。
