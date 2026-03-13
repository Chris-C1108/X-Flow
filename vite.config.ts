import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Twitter排行榜：TikTok版',
        namespace: 'xflow.loadingi.local',
        description: 'TikTok风格上下滑动切换，PC/移动端双端适配，缩略图先行加载、进度指示、点赞、只看未读、循环播放、长按倍速、广告/弹窗/重定向屏蔽',
        author: 'Chris_C',
        license: 'MIT',
        match: [
          'https://twitter-ero-video-ranking.com/*',
          'https://x-ero-anime.com/*'
        ],
        connect: [
          'twitter-ero-video-ranking.com',
          'x-ero-anime.com',
          'video.twimg.com',
          'pbs.twimg.com',
          '*'
        ],
        grant: ['GM_xmlhttpRequest', 'GM_setValue', 'GM_getValue'],
        "run-at": 'document-start',
      },
    }),
  ],
});
