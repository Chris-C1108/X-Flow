import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { transformSync } from 'esbuild';
import fs from 'fs';
import path from 'path';

const earlyBootstrapBanner = `;(() => {
  try {
    if (window.self !== window.top) return;
    const html = document.documentElement ? document.documentElement.innerHTML : '';
    if (
      window._cf_chl_opt ||
      document.title === 'Just a moment...' ||
      document.title === '请稍候...' ||
      html.indexOf('_cf_chl_opt') !== -1 ||
      (html.indexOf('cf-challenge') !== -1 && html.indexOf('challenge-form') !== -1)
    ) {
      console.log('X-Flow: Cloudflare challenge detected, skipping preboot banner');
      return;
    }
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


function stripCommentsPlugin() {
  return {
    name: 'strip-userscript-comments',
    closeBundle() {
      const filePath = path.resolve(__dirname, 'dist/userscript/x-flow.user.js');
      if (!fs.existsSync(filePath)) return;
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const headerMatch = fileContent.match(/^([\s\S]*?\/\/ ==\/UserScript==\r?\n?)/);
      const header = headerMatch ? headerMatch[1] : '';
      const body = headerMatch ? fileContent.slice(headerMatch[0].length) : fileContent;
      const stripped = transformSync(body, {
        legalComments: 'none',
        minifyWhitespace: false,
        minifyIdentifiers: false,
        minifySyntax: false,
      }).code;
      fs.writeFileSync(filePath, header + '\n' + stripped.trimStart() + '\n', 'utf-8');
    }
  };
}

export default defineConfig(({ command }) => ({
  build: {
    sourcemap: false,
    minify: false,
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
        name: {
          '': 'Twitter排行榜：TikTok版',
          'zh-CN': 'Twitter排行榜：TikTok版',
          'zh-TW': 'Twitter排行榜：TikTok版',
          'en': 'X-Flow: TikTok Mode Media Ranking',
        },
        namespace: 'xflow.loadingi.local',
        description: {
          '': 'TikTok风格上下滑动切换，PC/移动端双端适配，缩略图先行加载、进度指示、点赞、只看未读、循环播放、长按倍速、广告/弹窗/重定向屏蔽',
          'zh-CN': 'TikTok风格上下滑动切换，PC/移动端双端适配，缩略图先行加载、进度指示、点赞、只看未读、循环播放、长按倍速、广告/弹窗/重定向屏蔽',
          'zh-TW': 'TikTok風格上下滑動切換，PC/移動端雙端適配，縮略圖先行載入、進度指示、點讚、只看未讀、循環播放、長按倍速、廣告/彈窗/重新導向屏蔽',
          'en': 'TikTok-style vertical video browsing experience, optimized for PC/Mobile, preloads, speed control and anti-redirects.',
        },
        author: 'Chris_C',
        license: 'Apache-2.0',
        match: [
          '*://pektino.com/*',
          '*://*.pektino.com/*',
          '*://x-ero-anime.com/*',
          '*://*.x-ero-anime.com/*',
          '*://truvaze.com/*',
          '*://*.truvaze.com/*',
          '*://twihub.net/*',
          '*://*.twihub.net/*',
          '*://twikeep.com/*',
          '*://*.twikeep.com/*',
          '*://twiidol.com/*',
          '*://*.twiidol.com/*',
          '*://twiigle.com/*',
          '*://*.twiigle.com/*',
          '*://monsnode.com/*',
          '*://*.monsnode.com/*',
          '*://twivideo.net/*',
          '*://*.twivideo.net/*',
          '*://xiaohuangniao.me/*',
          '*://*.xiaohuangniao.me/*',
          '*://twidouga.net/*',
          '*://*.twidouga.net/*',
          '*://javtwi.com/*',
          '*://*.javtwi.com/*',
          '*://xhotvideo.com/*',
          '*://*.xhotvideo.com/*',
          '*://uraaka-times.com/*',
          '*://*.uraaka-times.com/*'
        ],
        connect: [
          'pektino.com',
          'x-ero-anime.com',
          'video.twimg.com',
          'pbs.twimg.com',
          'truvaze.com',
          'twihub.net',
          '*'
        ],
        grant: ['GM_xmlhttpRequest', 'GM_setValue', 'GM_getValue', 'GM_openInTab'],
        "run-at": 'document-start',
        noframes: true,
      },
    }),
    stripCommentsPlugin(),
  ],
}));
