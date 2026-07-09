# Document-Start Bootstrap Must Avoid Static Imports

- **Subject:** Userscript 需要在 `document-start` 立即接管页面，但首屏仍先闪出宿主站内容。
- **Env:** Vite 5 + vite-plugin-monkey + TypeScript + Tampermonkey
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** 即使 metadata 已设置 `@run-at document-start`，只要入口文件存在运行时静态 `import`，浏览器仍会先解析/求值被导入的整棵模块图。对于 X-Flow 这种大 bundle，`document.open()`、preboot veil、splash 都会被拖到 1~2 秒后执行，表现为“先看到无样式原网站，再晚到接管”，甚至误以为 splash 消失了。
- **Solution:** 入口 bootstrap 必须保持“零运行时 import”，或者在构建输出最顶部注入一个原始 preboot banner。核心原则是不让 `document.open()` 之前的遮罩逻辑被模块图求值阻塞。
- **Action_Steps:**
  ```typescript
  // ❌ BAD — 运行时静态 import 会让 bootstrap 晚于整包求值
  import { Sandbox } from './ui/Sandbox';

  document.open();
  document.write('...');
  document.close();
  Sandbox.getInstance().initialize();

  // ✅ GOOD — bootstrap 顶层无运行时 import，先接管再加载重模块
  type SandboxModule = typeof import('./ui/Sandbox');

  let sandboxModulePromise: Promise<SandboxModule> | null = null;
  const loadSandboxModule = () => sandboxModulePromise ??= import('./ui/Sandbox');

  document.open();
  document.write('...');
  document.close();

  void loadSandboxModule().then(({ Sandbox }) => Sandbox.getInstance().initialize());

  // ✅ GOOD — 如果单文件 userscript 打包不适合动态 import，
  // 也要用 Rollup/Vite banner 在 bundle 最顶层提前注入 preboot 遮罩
  const earlyBootstrapBanner = ';(() => { /* append fixed full-screen veil */ })();';
  ```
- **AI_Guidance:** **ALWAYS** 保持最早期接管路径（遮罩、CSP、`document.open()`）不依赖任何运行时静态 import。**ALWAYS** 在构建后手动验证首屏是否还会闪出宿主站内容，尤其是在开启混淆后。**ALWAYS** 检查打包方式是否会把动态 import 拆成额外 chunk；userscript 若只交付单个 `.user.js`，应优先使用构建 banner/prelude。**NEVER** 因为 metadata 已写 `document-start` 就假设页面一定在首屏前被接管；bundle 解析时间本身就会造成可见延迟。**NEVER** 在 bootstrap 顶层重新引入 `Sandbox`、`Layout`、CSS inline 模块等重依赖。
