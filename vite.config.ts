import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import basicSsl from '@vitejs/plugin-basic-ssl';
import obfuscator from 'rollup-plugin-obfuscator';

export default defineConfig(({ command }) => ({
  build: { sourcemap: false },
  plugins: [
    basicSsl(),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Twitter排行榜：TikTok版',
        namespace: 'xflow.loadingi.local',
        description: 'TikTok风格上下滑动切换，PC/移动端双端适配，缩略图先行加载、进度指示、点赞、只看未读、循环播放、长按倍速、广告/弹窗/重定向屏蔽',
        author: 'Chris_C',
        license: 'Apache-2.0',
        match: [
          'https://twitter-ero-video-ranking.com/*',
          'https://x-ero-anime.com/*',
          'https://truvaze.com/*'
        ],
        connect: [
          'twitter-ero-video-ranking.com',
          'x-ero-anime.com',
          'video.twimg.com',
          'pbs.twimg.com',
          'truvaze.com',
          '*'
        ],
        grant: ['GM_xmlhttpRequest', 'GM_setValue', 'GM_getValue'],
        "run-at": 'document-start',
        noframes: true,
      },
    }),
    // ── 混淆加密 ── 仅生产构建 ──────────────────────────────────────
    ...(command === 'build' ? [
      obfuscator({
        // global:true 对整个 bundle 进行混淆（单文件产物最有效）
        global: true,
        options: {
          // 字符串混淆 — 提取到旋转数组并 base64 编码
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.75,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          splitStrings: true,
          splitStringsChunkLength: 8,

          // 控制流混淆（适度，避免体积暴增）
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.35,

          // 死代码注入
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.15,

          // 标识符混淆
          identifierNamesGenerator: 'hexadecimal',
          renameGlobals: false,      // 不重命名全局 (保护 window/document/GM_*)
          renameProperties: false,   // 不重命名属性 (避免破坏 DOM API)

          // 保护 GM_ API 不被重命名
          reservedNames: ['^GM_', '^unsafeWindow$'],

          // 数字混淆、简化
          numbersToExpressions: true,
          simplify: true,
          transformObjectKeys: false, // 不转 key（避免破坏 CSS class 字符串匹配）

          selfDefending: false,  // 沙盒环境中 self-defending 不安全
          sourceMap: false,
        },
      }),
    ] : []),
  ],
}));
