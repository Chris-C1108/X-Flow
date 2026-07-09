# Tampermonkey 脚本 Build 混淆加密

- **Subject:** 为 Vite + vite-plugin-monkey 构建的 Tampermonkey 用户脚本添加 JS 混淆保护
- **Env:** Vite 5, vite-plugin-monkey, rollup-plugin-obfuscator (javascript-obfuscator 内核)
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** 默认 Vite 生产构建只做 terser 压缩，变量名缩短有限，源码逻辑基本可读。需要保护付出成本的业务逻辑不被轻易复制。

- **Solution:** 使用 `rollup-plugin-obfuscator` + `global: true` 对整个 bundle 进行混淆。关键约束：
  1. `GM_*` API 标识符必须通过 `reservedNames` 保护，不能被重命名
  2. `selfDefending: false`（沙盒环境中 self-defending 会破坏脚本）
  3. `renameProperties: false`（保护 DOM API / CSS class 字符串访问）
  4. 仅在 `command === 'build'` 时启用，不影响 dev 热更新

- **Action_Steps:**
  ```bash
  npm install --save-dev rollup-plugin-obfuscator
  ```

  ```typescript
  // vite.config.ts ✅ GOOD
  import { defineConfig } from 'vite';
  import obfuscator from 'rollup-plugin-obfuscator';

  export default defineConfig(({ command }) => ({
    plugins: [
      // ...其他插件...
      ...(command === 'build' ? [
        obfuscator({
          global: true,  // ✅ 必须 global:true，不要用 include 文件 glob（路径不匹配）
          options: {
            stringArray: true,
            stringArrayEncoding: ['base64'],
            stringArrayThreshold: 0.75,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            splitStrings: true,
            splitStringsChunkLength: 8,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.35,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.15,
            identifierNamesGenerator: 'hexadecimal',
            renameGlobals: false,      // ✅ 不重命名全局 (window/document/GM_*)
            renameProperties: false,   // ✅ 不重命名属性 (DOM API / class 字符串)
            reservedNames: ['^GM_', '^unsafeWindow$'],  // ✅ 保护 GM_ API
            numbersToExpressions: true,
            simplify: true,
            transformObjectKeys: false, // ✅ key 不变 (避免 CSS class 字符串匹配失效)
            selfDefending: false,       // ✅ 沙盒/严格模式不安全
            sourceMap: false,
          },
        }),
      ] : []),
    ],
  }));

  // ❌ BAD — include: ['**/x-flow.user.js'] 路径不匹配 rollup chunk id，混淆不会执行
  obfuscator({ include: ['**/x-flow.user.js'], options: {...} })
  ```

- **验证混淆是否生效:**
  ```bash
  grep -c '_0x' dist/x-flow.user.js  # 应输出 > 500
  grep -o 'GM_[a-zA-Z]*' dist/x-flow.user.js | sort -u  # 应保留 GM_getValue 等
  head -3 dist/x-flow.user.js  # ==UserScript== header 应完整
  ```

- **体积影响:** 约 2~2.5× 原始压缩体积（控制流混淆 + 死代码注入是主要来源）

- **AI_Guidance:**
  - **ALWAYS:** 使用 `global: true` 而非 `include` 文件 glob——Vite monkey 的 chunk id 不是文件名
  - **ALWAYS:** `reservedNames: ['^GM_', '^unsafeWindow$']` 是 Tampermonkey 脚本的必须项
  - **ALWAYS:** 构建后用 `grep -c '_0x'` 验证混淆实际生效
  - **NEVER:** 开启 `selfDefending: true`——会在受限沙盒（Tampermonkey 沙盒、严格 CSP 页面）中导致脚本崩溃
  - **NEVER:** 开启 `renameProperties: true`——会破坏 `element.classList`、`dataset.*` 等属性访问
  - **NEVER:** 在 dev 模式开启混淆——会让 HMR 和 console 调试变得不可能
