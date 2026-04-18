import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import basicSsl from '@vitejs/plugin-basic-ssl';
import obfuscator from 'rollup-plugin-obfuscator';

const earlyBootstrapBanner = `;(() => {
  try {
    if (window.self !== window.top) return;
    if (window.__XFLOW_PREBOOT__) return;
    window.__XFLOW_PREBOOT__ = true;
    const root = document.documentElement;
    if (!root) return;
    root.style.background = '#0D0D12';
    root.style.overflow = 'hidden';
    const style = document.createElement('style');
    style.id = 'xflow-preboot-banner-style';
    style.textContent = 'html{background:#0D0D12!important;overflow:hidden!important;}html::before{content:"";position:fixed;inset:0;z-index:2147483646;background:linear-gradient(160deg,#0D0D12 0%,#131320 40%,#0D0D12 100%);pointer-events:none;}html::after{content:"X-FLOW LOADING";position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;color:rgba(255,255,255,.86);font:700 14px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:.36em;pointer-events:none;text-shadow:0 0 24px rgba(130,80,255,.35);}';
    (document.head || root).appendChild(style);
    const cleanup = () => document.getElementById('xflow-preboot-banner-style')?.remove();
    window.addEventListener('xflow:booted', cleanup, { once: true });
    setTimeout(cleanup, 7000);
  } catch (_) {}
})();`;

export default defineConfig(({ command }) => ({
  build: {
    sourcemap: false,
    outDir: 'dist/userscript',
    rollupOptions: {
      output: {
        banner: earlyBootstrapBanner,
      },
    },
  },
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
          '*://x-ero-anime.com/*',
          '*://truvaze.com/*'
        ],
        connect: [
          'x-ero-anime.com',
          'video.twimg.com',
          'pbs.twimg.com',
          'truvaze.com',
          'x-flow.ccwu.cc',
          'app.x-flow.ccwu.cc',
          'xflow-telemetry.chen-m1108.workers.dev',
          '*'
        ],
        grant: ['GM_xmlhttpRequest', 'GM_setValue', 'GM_getValue', 'GM_openInTab'],
        "run-at": 'document-start',
        noframes: true,
      },
    }),
    ...(command === 'build' ? [
      obfuscator({
        global: true,
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
          renameGlobals: false,
          renameProperties: false,
          reservedNames: ['^GM_', '^unsafeWindow$'],
          numbersToExpressions: true,
          simplify: true,
          transformObjectKeys: false,
          selfDefending: false,
          sourceMap: false,
        },
      }),
    ] : []),
  ],
}));
