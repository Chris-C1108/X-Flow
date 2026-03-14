// ==UserScript==
// @name         Twitter排行榜：TikTok版
// @namespace    xflow.loadingi.local
// @version      5.0.2
// @author       Chris_C
// @description  TikTok风格上下滑动切换，PC/移动端双端适配，缩略图先行加载、进度指示、点赞、只看未读、循环播放、长按倍速、广告/弹窗/重定向屏蔽
// @license      MIT
// @match        https://twitter-ero-video-ranking.com/*
// @match        https://x-ero-anime.com/*
// @connect      twitter-ero-video-ranking.com
// @connect      x-ero-anime.com
// @connect      video.twimg.com
// @connect      pbs.twimg.com
// @connect      *
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(t=>{if(typeof GM_addStyle=="function"){GM_addStyle(t);return}const e=document.createElement("style");e.textContent=t,document.head.append(e)})(' @import"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap";:root{--bg-base: #0D0D12;--bg-surface: #151519;--bg-surface-hover: #1C1C22;--bg-glass: rgba(18, 18, 22, .7);--accent-primary: oklch(60% .18 330);--accent-subtle: oklch(60% .18 330 / .1);--accent-cyan: oklch(72% .1 220);--accent-cyan-subtle: oklch(72% .1 220 / .1);--theme-accent: var(--accent-primary);--theme-accent-subtle: var(--accent-subtle);--text-100: #EBEBF0;--text-200: #C8C8D0;--text-300: #77778A;--text-400: #60607A;--font-display: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;--font-body: "Manrope", -apple-system, BlinkMacSystemFont, sans-serif;--ease-smooth: cubic-bezier(.16, 1, .3, 1);--ease-micro: cubic-bezier(.25, .1, .25, 1);--shadow-float: 0 12px 32px rgba(0,0,0,.45);--blur-heavy: blur(20px) saturate(110%)}*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}*:focus-visible{outline:2px solid var(--theme-accent);outline-offset:2px}body{background-color:var(--bg-base);color:var(--text-100);font-family:var(--font-body);overflow:hidden;-webkit-font-smoothing:antialiased}body.theme-anime{--theme-accent: var(--accent-cyan);--theme-accent-subtle: var(--accent-cyan-subtle)}.noise-overlay{display:none}.empty-state{grid-column:1 / -1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;color:var(--text-300);text-align:center}.empty-state svg{width:64px;height:64px;margin-bottom:1rem;opacity:.5}.empty-state h3{font-family:var(--font-display);font-size:1.5rem;margin-bottom:.5rem;color:var(--text-200)}.retry-block{grid-column:1 / -1;padding:2rem;text-align:center}.retry-btn{background:var(--bg-surface);color:var(--text-100);border:1px solid rgba(255,255,255,.06);padding:10px 24px;border-radius:99px;font-weight:600;cursor:pointer;transition:all .3s var(--ease-smooth)}.retry-btn:hover{background:var(--bg-surface-hover);border-color:#ffffff1f;transform:scale(1.02)}.retry-btn:active{transform:scale(.98)}.app-layout{display:flex;height:100vh;width:100vw}.sidebar{width:280px;flex-shrink:0;background:var(--bg-surface);border-right:1px solid rgba(255,255,255,.03);display:flex;flex-direction:column;padding:4vh 2vw;z-index:100}.brand{font-family:var(--font-display);font-size:1.5rem;font-weight:700;letter-spacing:-.02em;margin-bottom:2.5rem;color:var(--text-100);display:flex;align-items:center;gap:8px}.brand:after{content:"";display:block;width:6px;height:6px;background:var(--theme-accent);border-radius:50%;transition:background .5s ease}.nav-group{margin-bottom:2.5rem;border:none}.nav-title{font-size:.75rem;text-transform:uppercase;letter-spacing:2px;color:var(--text-400);margin-bottom:1rem;font-weight:600;padding-left:.5rem}.nav-item{display:flex;align-items:center;gap:12px;padding:1.25rem 1.5rem;border-radius:12px;color:var(--text-200);font-weight:500;font-size:.95rem;cursor:pointer;transition:all .25s var(--ease-smooth);position:relative;overflow:hidden;border:none}.nav-item svg{width:20px;height:20px;fill:currentColor;opacity:.6;transition:all .3s ease}.nav-item:hover{background:#ffffff08;color:var(--text-100)}.nav-item:hover svg{opacity:1}.nav-item.active{background:var(--theme-accent-subtle);color:var(--theme-accent);box-shadow:none;font-weight:600}.nav-item.active svg{fill:var(--theme-accent);opacity:1}.nav-item:active{transform:scale(.98)}.nav-item.active:before{content:"";position:absolute;left:0;top:25%;bottom:25%;width:3px;background:var(--theme-accent);border-radius:0 3px 3px 0;transition:background .5s ease}.main-container{flex:1;overflow-y:auto;overflow-x:hidden;position:relative;scroll-behavior:smooth}.topbar{position:sticky;top:0;z-index:50;padding:3vh 4vw;background:transparent;display:flex;justify-content:space-between;align-items:center}.pulse-wave{position:absolute;top:0;right:0;bottom:0;left:0;z-index:-1;opacity:0;background:radial-gradient(ellipse at top center,var(--theme-accent) 0%,transparent 60%);transform:scale(.95);pointer-events:none;transition:background .5s ease}.pulse-wave.pulse-anim{animation:channelPulse .6s ease-out}@keyframes channelPulse{0%{opacity:.15;transform:scale(1)}to{opacity:0;transform:scale(1.05)}}.channel-switch{position:relative;display:flex;background:#12121699;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-radius:99px;padding:3px;border:1px solid rgba(255,255,255,.04);width:260px}.channel-slider{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:99px;background:var(--theme-accent);transition:transform .35s var(--ease-smooth),background .5s ease;z-index:1}.channel-switch.is-anime .channel-slider{transform:translate(100%)}.channel-btn{position:relative;z-index:2;flex:1;padding:8px 0;text-align:center;border-radius:99px;cursor:pointer;font-size:.875rem;font-family:var(--font-body);font-weight:600;color:var(--text-300);border:none;background:transparent;transition:all .35s var(--ease-smooth);outline:none}.channel-btn.active{color:#fff}.sort-filters{display:flex;gap:1rem}.sort-btn{background:var(--bg-glass);backdrop-filter:var(--blur-heavy);-webkit-backdrop-filter:var(--blur-heavy);border:1px solid rgba(255,255,255,.06);color:var(--text-200);padding:8px 16px;border-radius:10px;font-family:var(--font-body);font-size:.875rem;font-weight:500;cursor:pointer;transition:all .25s var(--ease-micro);display:flex;align-items:center;gap:6px}.sort-btn:hover{border-color:#ffffff1f;background:#ffffff0a}.sort-btn.active{border-color:var(--theme-accent);color:var(--theme-accent);background:var(--theme-accent-subtle)}.sort-btn:active{transform:scale(.98)}.content-pad{padding:4vh 4vw 8vh}.hero-banner{position:relative;width:100%;height:55vh;min-height:480px;border-radius:2rem;overflow:hidden;margin-bottom:4vh;cursor:pointer}.hero-bg{position:absolute;top:0;right:0;bottom:0;left:0;background-position:center 20%;background-size:cover;transition:transform .8s var(--ease-smooth)}.hero-banner:hover .hero-bg{transform:scale(1.02)}.hero-overlay{position:absolute;top:0;right:0;bottom:0;left:0;background:linear-gradient(to top,var(--bg-base) 0%,rgba(13,13,18,.5) 50%,transparent 100%)}.hero-content{position:absolute;bottom:0;left:0;width:100%;padding:4vh 3vw;display:flex;flex-direction:column;align-items:flex-start}.hero-rank{font-family:var(--font-display);font-size:3rem;font-weight:700;line-height:1;color:#ffffff26;margin-bottom:-.25rem}.hero-title{font-family:var(--font-display);font-size:2.5rem;font-weight:600;line-height:1.15;max-width:80%;margin-bottom:1.5rem;letter-spacing:-.02em}.hero-meta{display:flex;gap:1.5rem;align-items:center;font-size:.85rem;font-weight:500;color:var(--text-200)}.meta-item{display:flex;align-items:center;gap:6px}.meta-item svg{width:16px;height:16px;fill:var(--theme-accent);transition:fill .5s ease}.hero-play-btn{position:absolute;right:3rem;bottom:3rem;width:64px;height:64px;border-radius:50%;background:var(--theme-accent);display:flex;align-items:center;justify-content:center;transition:all .3s var(--ease-smooth)}.hero-banner:hover .hero-play-btn{transform:scale(1.05)}.hero-play-btn svg{width:28px;height:28px;fill:#fff;margin-left:3px}.section-title{font-family:var(--font-display);font-size:1.5rem;font-weight:600;margin-bottom:2vh;display:flex;align-items:center;justify-content:space-between;letter-spacing:-.01em}.media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:2vw}.media-card{position:relative;border-radius:1rem;overflow:hidden;aspect-ratio:9/16;cursor:pointer;background:transparent;opacity:0;transform:translateY(12px);animation:cardRise .5s var(--ease-smooth) forwards;transition:transform .25s var(--ease-smooth),box-shadow .25s ease;border:none}.media-card.sinking{animation:cardSink .25s cubic-bezier(.4,0,.2,1) forwards!important}.media-card:active{transform:translateY(0) scale(.98)!important}@keyframes cardRise{0%{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}@keyframes cardSink{to{opacity:0;transform:translateY(12px) scale(.98)}}.card-img{width:100%;height:100%;object-fit:cover;transition:transform .5s var(--ease-smooth)}.media-card:hover .card-img{transform:scale(1.03)}.card-overlay{position:absolute;top:0;right:0;bottom:0;left:0;background:linear-gradient(180deg,rgba(0,0,0,.2) 0%,transparent 40%,rgba(0,0,0,.9) 100%);transition:opacity .3s ease}.card-rank{position:absolute;top:12px;left:12px;background:#00000080;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:4px 10px;border-radius:8px;font-family:var(--font-display);font-weight:600;font-size:.8rem;color:var(--text-200)}.rank-1{color:#d4b96a}.rank-2{color:#a8a8b0}.rank-3{color:#b08050}.card-info{position:absolute;bottom:0;left:0;right:0;padding:16px;transform:translateY(4px);transition:transform .3s var(--ease-smooth)}.media-card:hover .card-info{transform:translateY(0)}.card-title{font-size:.85rem;font-weight:500;line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:8px;overflow-wrap:break-word;word-break:break-all}.card-stats{display:flex;gap:12px;font-size:.75rem;color:var(--text-300);font-weight:500;opacity:.8;transition:opacity .3s ease}.media-card:hover .card-stats{opacity:1}.card-stats .stat{display:flex;align-items:center;gap:4px}.card-stats svg{width:14px;height:14px;fill:currentColor}.card-play-icon{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.9);width:44px;height:44px;border-radius:50%;background:#0006;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;transition:all .3s var(--ease-smooth)}.card-play-icon svg{width:18px;height:18px;fill:#fff;margin-left:2px}.media-card:hover .card-play-icon{opacity:1;transform:translate(-50%,-50%) scale(1)}.mobile-nav{display:none}.topbar-center{display:flex;align-items:center;gap:12px}.mobile-menu-btn-wrap{position:relative;display:none}.mobile-circle-btn{width:36px;height:36px;border-radius:50%;background:#ffffff14;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.06);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .25s var(--ease-smooth)}.mobile-circle-btn:hover{background:#ffffff1f;border-color:#ffffff1a}.mobile-circle-btn:active{transform:scale(.92)}.mobile-dropdown{position:absolute;top:calc(100% + 8px);min-width:160px;background:#141418f2;backdrop-filter:blur(20px) saturate(120%);-webkit-backdrop-filter:blur(20px) saturate(120%);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:6px;opacity:0;visibility:hidden;transform:translateY(-8px) scale(.95);transition:all .25s var(--ease-smooth);z-index:200;box-shadow:0 8px 32px #00000080}.mobile-dropdown.open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}#range-dropdown{left:0}#sort-dropdown{right:0}.mobile-dd-item{display:block;width:100%;padding:10px 14px;border:none;background:transparent;color:var(--text-200);font-family:var(--font-body);font-size:.875rem;font-weight:500;text-align:left;border-radius:10px;cursor:pointer;transition:all .2s ease}.mobile-dd-item:hover{background:#ffffff0a;color:var(--text-100)}.mobile-dd-item.active{color:var(--theme-accent);background:var(--theme-accent-subtle);font-weight:600}@media (max-width: 1024px){.hero-title{font-size:2rem;max-width:100%}}@media (max-width: 768px){.app-layout{flex-direction:column}.sidebar{display:none}.topbar{padding:1rem 1.5rem;border-bottom:none;justify-content:center}.sort-filters{display:none}.mobile-menu-btn-wrap{display:block}.content-pad{padding:1rem 1.2rem 6rem}.hero-banner{height:60vh;border-radius:20px;margin-bottom:2rem}.hero-content{padding:2rem 1.5rem}.hero-rank{font-size:2.5rem}.hero-title{font-size:1.5rem}.hero-play-btn{right:1.5rem;bottom:1.5rem;width:52px;height:52px}.hero-play-btn svg{width:22px;height:22px}.media-grid{grid-template-columns:repeat(2,1fr);gap:1rem}.card-title{font-size:.8rem}.card-stats{font-size:.7rem}.mobile-nav{display:flex;position:fixed;bottom:0;left:0;right:0;background:#0d0d12e6;backdrop-filter:var(--blur-heavy);-webkit-backdrop-filter:var(--blur-heavy);border-top:1px solid rgba(255,255,255,.04);padding:12px 24px calc(env(safe-area-inset-bottom) + 12px);justify-content:space-between;z-index:100}.m-nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--text-400);font-size:.65rem;font-weight:600}.m-nav-item svg{width:24px;height:24px;fill:currentColor;transition:transform .25s var(--ease-smooth)}.m-nav-item.active{color:var(--theme-accent)}.m-nav-item.active svg{transform:translateY(-1px)}}html.tm-tiktok-open,body.tm-tiktok-open{overflow:hidden!important;touch-action:none!important;overscroll-behavior:none!important;height:100%!important;background:#000!important}#tm-tiktok-modal{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483646;display:none;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;-webkit-user-select:none;user-select:none;touch-action:manipulation}#tm-tiktok-modal.active{display:block;animation:tm-modal-in .35s var(--ease-smooth) forwards}@keyframes tm-modal-in{0%{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}.tm-video-stage{position:absolute;top:0;right:0;bottom:0;left:0;overflow:hidden;background:#000 center center / cover no-repeat}.tm-video-stage:before{content:"";position:absolute;top:0;right:0;bottom:0;left:0;background:inherit;filter:blur(18px) brightness(.4);transform:scale(1.08)}.tm-video-stage:after{content:"";position:absolute;top:0;left:0;right:0;height:100px;background:linear-gradient(to bottom,rgba(0,0,0,.5) 0%,rgba(0,0,0,.2) 40%,transparent 100%);pointer-events:none;z-index:3}.tm-thumb,.tm-video{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;object-fit:contain;background:#000}.tm-thumb{z-index:2;opacity:1;transition:opacity .18s ease}.tm-thumb.hidden{opacity:0}.tm-video{z-index:1;opacity:0;transition:opacity .18s ease}.tm-video.visible{opacity:1}.tm-video::-webkit-media-controls,.tm-video::-webkit-media-controls-enclosure{display:none!important}@keyframes tm-slide-out-up{0%{transform:translateY(0);opacity:1}to{transform:translateY(-100%);opacity:0}}@keyframes tm-slide-in-up{0%{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes tm-slide-out-down{0%{transform:translateY(0);opacity:1}to{transform:translateY(100%);opacity:0}}@keyframes tm-slide-in-down{0%{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}.tm-video-stage.slide-out-up{animation:tm-slide-out-up .28s ease-out forwards}.tm-video-stage.slide-in-up{animation:tm-slide-in-up .28s ease-out forwards}.tm-video-stage.slide-out-down{animation:tm-slide-out-down .28s ease-out forwards}.tm-video-stage.slide-in-down{animation:tm-slide-in-down .28s ease-out forwards}.tm-topbar{position:absolute;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top) + 12px) 14px 12px}.tm-pill{background:var(--glass-bg);-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;box-shadow:var(--shadow-sm)}.tm-top-actions{display:flex;gap:10px}.tm-btn{width:40px;height:40px;border:none;border-radius:999px;background:var(--glass-bg);-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .3s var(--ease-smooth);box-shadow:var(--shadow-sm)}.tm-btn svg{width:22px;height:22px;fill:#fff}.tm-btn:hover{background:var(--glass-bg-hover);transform:scale(1.05);border-color:#ffffff26}.tm-actions{position:absolute;right:12px;bottom:138px;z-index:20;display:flex;flex-direction:column;gap:18px}.tm-action{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer}.tm-action .icon{width:50px;height:50px;border-radius:999px;background:var(--glass-bg);-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;transition:all .3s var(--ease-smooth);box-shadow:var(--shadow-sm)}.tm-action .icon svg{width:26px;height:26px;fill:#fff;transition:all .3s ease}.tm-action .txt{font-size:12px;color:#fff;font-weight:600}.tm-action .subtxt{font-size:11px;color:#ffffffd9}.tm-action.like.active .icon{border-color:#fe2c554d;background:#fe2c551a}.tm-action.like.active .icon svg{fill:var(--primary-red);animation:tm-heart-beat .4s var(--ease-smooth)}.tm-info{position:absolute;left:14px;right:76px;bottom:74px;z-index:20}.tm-title{font-size:15px;line-height:1.45;font-weight:600;max-height:4.35em;overflow:hidden}.tm-progress-wrap{position:absolute;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom) + 18px);z-index:25;display:flex;align-items:center;gap:10px;padding:10px 6px;cursor:pointer}.tm-progress-wrap:before{content:"";position:absolute;left:-14px;right:-14px;bottom:-18px;height:130px;background:linear-gradient(to top,rgba(0,0,0,.7) 0%,rgba(0,0,0,.3) 50%,transparent 100%);z-index:-1;pointer-events:none}.tm-progress{position:relative;flex:1;height:4px;background:#ffffff4d;border-radius:999px;transition:height .15s ease}.tm-progress-fill{position:absolute;left:0;top:0;bottom:0;width:0%;background:#fff;border-radius:inherit;transition:width .1s linear}.tm-progress-fill:after{content:"";position:absolute;right:-10px;top:50%;width:16px;height:16px;border-radius:50%;background:#fff;transform:translateY(-50%) scale(0);transition:transform .2s;pointer-events:none}.tm-time{font-size:12px;min-width:74px;text-align:right;color:#ffffffeb;font-variant-numeric:tabular-nums}.tm-progress-wrap:hover .tm-progress,.tm-progress-wrap.dragging .tm-progress{height:8px;background:#ffffff80}.tm-progress-wrap:hover .tm-progress-fill:after,.tm-progress-wrap.dragging .tm-progress-fill:after{transform:translateY(-50%) scale(1)}.tm-loading,.tm-error,.tm-center-icon,.tm-speed-tip{position:absolute;z-index:30}.tm-loading{left:50%;top:50%;transform:translate(-50%,-50%);text-align:center}.tm-loading .spinner{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.12);border-top-color:var(--primary-red);animation:tm-spin .8s linear infinite;margin:0 auto 12px}.tm-center-icon{left:50%;top:50%;transform:translate(-50%,-50%) scale(.8);width:74px;height:74px;border-radius:50%;background:#00000073;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center}.tm-center-icon.show{display:flex}.tm-center-icon svg{width:36px;height:36px;fill:#fff}.tm-speed-tip{top:calc(env(safe-area-inset-top) + 62px);left:50%;transform:translate(-50%);display:none;background:#0000008c;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-radius:999px;padding:8px 14px;font-size:13px}.tm-speed-tip.show{display:block}.tm-settings{position:absolute;top:calc(env(safe-area-inset-top) + 58px);right:14px;z-index:40;width:220px;display:none;background:#141414f2;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:14px;overflow:hidden;box-shadow:0 8px 32px #0006}.tm-settings.active{display:block}.tm-setting-item{display:flex;justify-content:space-between;align-items:center;padding:13px 14px;font-size:14px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;transition:background .2s}.tm-setting-item:hover{background:#ffffff0a}.tm-switch{width:40px;height:24px;border-radius:999px;background:#fff3;position:relative;transition:background .3s var(--ease-smooth)}.tm-switch:after{content:"";position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 4px #0003;transition:transform .3s var(--ease-smooth)}.tm-setting-item.active .tm-switch{background:var(--primary-red)}.tm-setting-item.active .tm-switch:after{transform:translate(16px)}.tm-swipe-mask{position:absolute;top:0;right:0;bottom:0;left:0;z-index:5;cursor:pointer}.tm-action.bookmark.active .icon{border-color:#00c8dc4d;background:#00c8dc14}.tm-action.bookmark.active .icon svg{fill:#60d0d8}.tm-volume-wrap{transition:opacity .2s ease}.tm-vol-slider-wrap{transition:height .15s ease}.tm-vol-slider-wrap:hover{height:6px!important}@media (max-width: 768px){.tm-btn{width:36px;height:36px}.tm-action .icon{width:44px;height:44px}.tm-actions{bottom:110px;right:10px;gap:16px}.tm-info{bottom:65px;left:12px;right:70px}.tm-volume-wrap{display:none!important}} ');

(function () {
  'use strict';

  const _ApiClient = class _ApiClient {
    constructor() {
      this.baseUrl = window.location.origin;
      this.isAnime = this.baseUrl.includes("anime") ? 1 : 0;
    }
    setChannel(isAnimeChannel) {
      this.isAnime = isAnimeChannel ? 1 : 0;
    }
    async fetchList(params = {}) {
      const mappedRange = _ApiClient.RANGE_MAP[params.range || "daily"] ?? params.range ?? "";
      const finalParams = {
        ...params,
        range: mappedRange,
        isAnimeOnly: this.isAnime.toString(),
        per_page: (params.per_page || 50).toString()
      };
      const url = new URL(`${this.baseUrl}/api/media`);
      Object.keys(finalParams).forEach((k) => {
        if (finalParams[k] !== void 0) {
          url.searchParams.append(k, finalParams[k].toString());
        }
      });
      const res = await fetch(url.toString(), { headers: { "accept": "application/json" } });
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      return await res.json();
    }
    getBaseUrl() {
      return this.baseUrl;
    }
    getIsAnime() {
      return this.isAnime === 1;
    }
  };
  _ApiClient.RANGE_MAP = {
    daily: "",
    weekly: "weekly",
    monthly: "monthly",
    all: "all"
  };
  let ApiClient = _ApiClient;
  function log(...args) {
    console.log("🚀[X-Flow]", ...args);
  }
  const DEFAULT_TTL = 5 * 6e4;
  class CacheManager {
    constructor() {
      this.store = /* @__PURE__ */ new Map();
    }
    makeKey(q) {
      return [
        q.isAnimeOnly ? 1 : 0,
        q.range || "daily",
        q.sort || "favorite"
      ].join("|");
    }
    get(q, ttlMs = DEFAULT_TTL) {
      const key = this.makeKey(q);
      const entry = this.store.get(key);
      if (!entry) return null;
      if (Date.now() - entry.updatedAt > ttlMs) {
        this.store.delete(key);
        return null;
      }
      return entry;
    }
    set(q, entry) {
      const key = this.makeKey(q);
      log(`Cache SET: ${key} (${entry.items.length} items, nextPage=${entry.nextPage})`);
      this.store.set(key, { ...entry, updatedAt: Date.now() });
    }
    hasFresh(q, ttlMs) {
      return !!this.get(q, ttlMs);
    }
  }
  class PoolManager {
    constructor() {
      this.dataPool = [];
      this.isLoading = false;
      this.hasMore = true;
      this.listeners = [];
      this.activeRequestId = 0;
      this.preloadInFlight = /* @__PURE__ */ new Set();
      this.currentQuery = {
        isAnimeOnly: false,
        range: "daily",
        sort: "favorite"
      };
      this.currentPage = 1;
      this.api = new ApiClient();
      this.cache = new CacheManager();
      this.currentQuery.isAnimeOnly = this.api.getIsAnime();
    }
    /**
     * 加载初始数据。先查缓存，命中则秒开；否则 fetch page 1。
     */
    async loadInitialData(params = {}) {
      const requestId = ++this.activeRequestId;
      this.currentQuery = {
        ...this.currentQuery,
        ...params
      };
      this.currentPage = 1;
      this.dataPool = [];
      this.hasMore = true;
      this.isLoading = false;
      this.api.setChannel(this.currentQuery.isAnimeOnly);
      log(`PoolManager: loadInitialData for ${this.cache.makeKey(this.currentQuery)}`);
      const cached = this.cache.get(this.currentQuery);
      if (cached) {
        log(`PoolManager: Cache HIT — ${cached.items.length} items`);
        this.dataPool = [...cached.items];
        this.currentPage = cached.nextPage;
        this.hasMore = cached.hasMore;
        this.listeners.forEach((cb) => cb(this.dataPool));
        return { fromCache: true };
      }
      log("PoolManager: Cache MISS — fetching page 1");
      await this.fetchPageInternal(requestId);
      return { fromCache: false };
    }
    /**
     * 加载下一页数据（分页续取）
     */
    async fetchNextPage() {
      if (this.isLoading || !this.hasMore) return [];
      const requestId = this.activeRequestId;
      return this.fetchPageInternal(requestId);
    }
    /**
     * 内部 fetch 实现，带请求 ID 防竞态
     */
    async fetchPageInternal(requestId) {
      var _a;
      if (this.isLoading) return [];
      this.isLoading = true;
      const queryKey = this.cache.makeKey(this.currentQuery);
      log(`PoolManager: Fetching page ${this.currentPage} for ${queryKey}`);
      try {
        const fetchParams = {
          range: this.currentQuery.range,
          sort: this.currentQuery.sort,
          category: this.currentQuery.category || "",
          page: this.currentPage,
          per_page: this.currentQuery.perPage || 50
        };
        const data = await this.api.fetchList(fetchParams);
        if (requestId !== this.activeRequestId) {
          log("PoolManager: Stale response discarded");
          return [];
        }
        if (((_a = data == null ? void 0 : data.items) == null ? void 0 : _a.length) > 0) {
          const newItems = data.items;
          this.dataPool = [...this.dataPool, ...newItems];
          this.currentPage += 1;
          if (newItems.length < 50) {
            this.hasMore = false;
          }
          this.cache.set(this.currentQuery, {
            items: [...this.dataPool],
            nextPage: this.currentPage,
            hasMore: this.hasMore,
            updatedAt: Date.now()
          });
          this.listeners.forEach((cb) => cb(newItems));
          return newItems;
        } else {
          this.hasMore = false;
          return [];
        }
      } catch (e) {
        log("加载更多数据失败", e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    }
    /**
     * 后台预加载指定维度组合的第一页（不影响当前 dataPool）
     */
    async preload(query) {
      if (this.cache.hasFresh(query)) return;
      const key = this.cache.makeKey(query);
      if (this.preloadInFlight.has(key)) return;
      this.preloadInFlight.add(key);
      log(`PoolManager: Preloading ${key}...`);
      try {
        const tempApi = new ApiClient();
        tempApi.setChannel(query.isAnimeOnly);
        const data = await tempApi.fetchList({
          range: query.range,
          sort: query.sort,
          category: query.category || "",
          page: 1,
          per_page: query.perPage || 50
        });
        const items = (data == null ? void 0 : data.items) || [];
        this.cache.set(query, {
          items,
          nextPage: 2,
          hasMore: items.length >= 50,
          updatedAt: Date.now()
        });
        log(`PoolManager: Preload done for ${key} (${items.length} items)`);
      } catch (e) {
        log(`PoolManager: Preload failed for ${key}`, e);
      } finally {
        this.preloadInFlight.delete(key);
      }
    }
    /**
     * 检查指定组合是否有新鲜缓存
     */
    hasFreshCache(params) {
      const query = { ...this.currentQuery, ...params };
      return this.cache.hasFresh(query);
    }
    onDataAdded(cb) {
      this.listeners.push(cb);
    }
    getIsLoading() {
      return this.isLoading;
    }
    hasMoreData() {
      return this.hasMore;
    }
    getDataPool() {
      return this.dataPool;
    }
    getCurrentQuery() {
      return { ...this.currentQuery };
    }
    getApiClient() {
      return this.api;
    }
  }
  const Components = {
    getSidebarHTML() {
      return `
            <aside class="sidebar">
                <div class="brand">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="url(#brand-grad)" aria-hidden="true"><defs><linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00F0FF"/><stop offset="100%" stop-color="#FF1053"/></linearGradient></defs><path d="M12 2L2 22h20L12 2zm0 6l6 12H6l6-12z"/></svg>
                    X-Flow
                </div>
                <nav class="nav-group" aria-label="Ranking Range">
                    <div class="nav-title">排行范围 Range</div>
                    <button type="button" class="nav-item active" data-range="daily" tabindex="0"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> 日榜 Daily</button>
                    <button type="button" class="nav-item" data-range="weekly" tabindex="0"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> 周榜 Weekly</button>
                    <button type="button" class="nav-item" data-range="monthly" tabindex="0"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg> 月榜 Monthly</button>
                    <button type="button" class="nav-item" data-range="all" tabindex="0"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> 总榜 All-Time</button>
                </nav>
            </aside>
        `;
    },
    getMobileNavHTML() {
      return ``;
    },
    getTopBarHTML(isAnimeActive = false) {
      const rActive = !isAnimeActive ? "active" : "";
      const aActive = isAnimeActive ? "active" : "";
      const switchClass = isAnimeActive ? "channel-switch is-anime" : "channel-switch";
      return `
            <header class="topbar">
                <div class="pulse-wave" id="topbar-pulse"></div>
                <div class="topbar-center">
                    <div class="mobile-menu-btn-wrap" id="range-menu-wrap">
                        <button type="button" class="mobile-circle-btn" id="mobile-range-btn" aria-label="Ranking Range" aria-expanded="false">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>
                        </button>
                        <div class="mobile-dropdown" id="range-dropdown">
                            <button type="button" class="mobile-dd-item active" data-range="daily">日榜 Daily</button>
                            <button type="button" class="mobile-dd-item" data-range="weekly">周榜 Weekly</button>
                            <button type="button" class="mobile-dd-item" data-range="monthly">月榜 Monthly</button>
                            <button type="button" class="mobile-dd-item" data-range="all">总榜 All-Time</button>
                        </div>
                    </div>
                    <div class="${switchClass}" role="tablist">
                        <div class="channel-slider"></div>
                        <button type="button" class="channel-btn ${rActive}" data-channel="real" role="tab" aria-selected="${!isAnimeActive}">Real 次元</button>
                        <button type="button" class="channel-btn ${aActive}" data-channel="anime" role="tab" aria-selected="${isAnimeActive}">Anime 动漫</button>
                    </div>
                    <div class="mobile-menu-btn-wrap" id="sort-menu-wrap">
                        <button type="button" class="mobile-circle-btn" id="mobile-sort-btn" aria-label="Sort Filter" aria-expanded="false">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
                        </button>
                        <div class="mobile-dropdown" id="sort-dropdown">
                            <button type="button" class="mobile-dd-item active" data-sort="favorite">最多喜欢</button>
                            <button type="button" class="mobile-dd-item" data-sort="pv">极高播放</button>
                            <button type="button" class="mobile-dd-item" data-sort="recent">最新发布</button>
                        </div>
                    </div>
                </div>
                <div class="sort-filters" role="group" aria-label="Sort options">
                    <button type="button" class="sort-btn active" data-sort="favorite" tabindex="0"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> 最多喜欢</button>
                    <button type="button" class="sort-btn" data-sort="pv" tabindex="0"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg> 极高播放</button>
                    <button type="button" class="sort-btn" data-sort="recent" tabindex="0"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> 最最新发布</button>
                </div>
            </header>
        `;
    },
    getHeroBannerHTML() {
      return `
            <div class="hero-banner" id="hero-banner" tabindex="0" role="button" aria-label="Play Hero Video">
                <style>
                    .skeleton-pulse { animation: pulse 1.5s infinite ease-in-out; }
                    @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
                    .nav-item { background: transparent; border: none; text-align: left; font-family: inherit; font-size: 1rem; width: 100%; }
                </style>
                <div class="hero-skeleton absolute-inset skeleton-pulse" id="hero-skeleton" style="background: rgba(255,255,255,0.05); position: absolute; inset: 0; z-index: 1;"></div>
                <div class="hero-bg" id="hero-bg" style="opacity: 0; transition: opacity 0.5s ease; z-index: 2;"></div>
                <div class="hero-overlay" style="z-index: 3;"></div>
                <div class="hero-content" style="z-index: 4;">
                    <div class="hero-rank">No.1</div><h1 class="hero-title" id="hero-title"></h1>
                    <div class="hero-meta">
                        <span class="meta-item"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> <span id="hero-likes">--</span></span>
                        <span class="meta-item"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg> <span id="hero-pv">--</span></span>
                    </div>
                </div>
                <div class="hero-play-btn" style="z-index: 4;"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
            </div>
        `;
    }
  };
  const escapeMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (s) => escapeMap[s] || s);
  }
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  function formatCount(num) {
    if (num >= 1e8) return (num / 1e8).toFixed(1).replace(/\.0$/, "") + "亿";
    if (num >= 1e4) return (num / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
    return String(num || 0);
  }
  class VirtualList {
    constructor() {
      this.container = document.createElement("div");
      this.container.className = "vl-container";
      this.container.style.cssText = "position: absolute; inset: 0; overflow: hidden; touch-action: none; background: #000; z-index: 10;";
      this.nodes = [];
      for (let i = 0; i < 3; i++) {
        const node = document.createElement("div");
        node.className = "tm-video-stage";
        node.style.cssText = "position: absolute; inset: 0; transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1); transform: translateY(100%); z-index: 1;";
        node.innerHTML = `
                <img class="tm-thumb hidden" alt="">
                <video class="tm-video" playsinline webkit-playsinline preload="metadata" referrerpolicy="no-referrer"></video>
            `;
        this.container.appendChild(node);
        this.nodes.push(node);
      }
    }
    getNodes() {
      return this.nodes;
    }
    getNodeIndex(logicalIndex) {
      return (logicalIndex % 3 + 3) % 3;
    }
    getNode(logicalIndex) {
      return this.nodes[this.getNodeIndex(logicalIndex)];
    }
    setTransition(enable) {
      this.nodes.forEach((node) => {
        node.style.transition = enable ? "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)" : "none";
      });
    }
    updateTransforms(currentIndex, offsetPx = 0) {
      const curr = this.getNodeIndex(currentIndex);
      const prev = this.getNodeIndex(currentIndex - 1);
      const next = this.getNodeIndex(currentIndex + 1);
      this.nodes[prev].style.transform = `translateY(calc(-100% + ${offsetPx}px))`;
      this.nodes[prev].style.zIndex = "1";
      this.nodes[curr].style.transform = `translateY(${offsetPx}px)`;
      this.nodes[curr].style.zIndex = "2";
      this.nodes[next].style.transform = `translateY(calc(100% + ${offsetPx}px))`;
      this.nodes[next].style.zIndex = "1";
    }
  }
  const STORAGE_KEYS = { LOOP: "xflow_loop", BOOKMARKS: "xflow_bookmarks_v1", VOLUME: "xflow_volume" };
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
  }
  function escapeCSSUrl$1(url) {
    return url.replace(/["'\\]/g, "\\$&");
  }
  class TikTokMode {
    constructor(pool) {
      this.isOpen = false;
      this.currentIndex = 0;
      this.preloadTimer = null;
      this.isDraggingProgress = false;
      this.pool = pool;
      this.vl = new VirtualList();
      this.loop = !!loadJSON(STORAGE_KEYS.LOOP, false);
      this.bookmarks = new Set(loadJSON(STORAGE_KEYS.BOOKMARKS, []));
      const savedVol = loadJSON(STORAGE_KEYS.VOLUME, { volume: 0.7, muted: false });
      this.volume = savedVol.volume;
      this.isMuted = savedVol.muted;
      this.modal = document.createElement("div");
      this.modal.id = "tm-tiktok-modal";
      this.modal.style.cssText = "position: fixed; inset: 0; z-index: 2147483647; display: none; background: #000; color: #fff; font-family: sans-serif;";
      this.modal.appendChild(this.vl.container);
      this.uiLayer = document.createElement("div");
      this.uiLayer.style.cssText = "position: absolute; inset: 0; z-index: 20; pointer-events: none;";
      this.uiLayer.innerHTML = `
            <div class="tm-topbar" style="pointer-events: auto; position: absolute; top:0; left:0; right:0; padding:12px; display:flex; justify-content:space-between; z-index: 20;">
                <div class="tm-pill" id="tm-count" style="background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 20px;" aria-live="polite">1 / 1</div>
                <button type="button" class="tm-btn" id="tm-close-btn" style="background: rgba(0,0,0,0.5); border: none; color: #fff; border-radius: 50%; width: 36px; height: 36px; cursor: pointer;" aria-label="Close" tabindex="0">X</button>
            </div>
            <div class="tm-info" style="pointer-events: auto; position: absolute; bottom: 80px; left: 16px; right: 80px; z-index: 20;">
                <h2 class="tm-title" id="tm-title" style="font-size: 15px; font-weight: bold; text-shadow: 0 1px 4px rgba(0,0,0,0.8); margin: 0;"></h2>
            </div>
            <div class="tm-volume-wrap" id="tm-volume-wrap" style="pointer-events: auto; position: absolute; bottom: 54px; right: 16px; z-index: 25; display: flex; align-items: center; gap: 8px;">
                <button type="button" class="tm-vol-btn" id="tm-vol-btn" aria-label="Toggle mute" style="background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); border: none; color: #fff; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <svg id="tm-vol-icon" viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </button>
                <div class="tm-vol-slider-wrap" style="width: 80px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; cursor: pointer; position: relative;">
                    <div class="tm-vol-fill" id="tm-vol-fill" style="height: 100%; background: #fff; border-radius: 2px; width: 70%; pointer-events: none;"></div>
                </div>
            </div>
            <div class="tm-progress-wrap" id="tm-progress-wrap" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0" style="pointer-events: auto; position: absolute; bottom: 20px; left: 16px; right: 16px; z-index: 20; display:flex; align-items:center; gap:10px;">
                <div class="tm-progress" style="flex:1; height:4px; background:rgba(255,255,255,0.3); border-radius:2px; position:relative;">
                    <div class="tm-progress-fill" id="tm-progress-fill" style="width:0%; height:100%; background:#fff; border-radius:2px;"></div>
                </div>
                <div class="tm-time" id="tm-time" style="font-size: 12px; font-variant-numeric: tabular-nums;">0:00 / 0:00</div>
            </div>
            <div class="tm-actions" id="tm-actions" style="pointer-events: auto;" role="group" aria-label="Video actions">
                <button type="button" class="tm-action like" id="tm-like-btn" aria-label="Like" tabindex="0" style="background:transparent; border:none; padding:0;">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
                    <span class="txt" id="tm-like-count">0</span>
                </button>
                <button type="button" class="tm-action bookmark" id="tm-bookmark-btn" aria-label="Bookmark" tabindex="0" style="background:transparent; border:none; padding:0;">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg></div>
                    <span class="txt">收藏</span>
                </button>
                <button type="button" class="tm-action download" id="tm-download-btn" aria-label="Download" tabindex="0" style="background:transparent; border:none; padding:0;">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></div>
                    <span class="txt">下载</span>
                </button>
            </div>
            <div class="tm-swipe-mask" id="tm-swipe-mask" style="pointer-events: auto; position: absolute; inset:0; z-index:5; cursor: pointer;"></div>
        `;
      this.modal.appendChild(this.uiLayer);
      this.progressFill = this.uiLayer.querySelector("#tm-progress-fill");
      this.timeText = this.uiLayer.querySelector("#tm-time");
      this.titleText = this.uiLayer.querySelector("#tm-title");
      this.pool.onDataAdded(() => {
        if (this.isOpen) {
          this.updateCountUI();
        }
      });
    }
    init() {
      const root = document.getElementById("xflow-app-root") || document.body;
      if (!root.contains(this.modal)) {
        root.appendChild(this.modal);
      }
      this.bindEvents();
    }
    bindEvents() {
      const closeBtn = this.uiLayer.querySelector("#tm-close-btn");
      closeBtn.addEventListener("click", () => this.closeModal());
      const swipeMask = this.uiLayer.querySelector("#tm-swipe-mask");
      let startY = 0;
      let isMoving = false;
      swipeMask.addEventListener("touchstart", (e) => {
        const touchY = e.touches[0].clientY;
        const screenH = window.innerHeight;
        if (touchY > screenH * 0.85) {
          isMoving = false;
          return;
        }
        startY = touchY;
        isMoving = true;
        this.vl.setTransition(false);
      }, { passive: true });
      swipeMask.addEventListener("touchmove", (e) => {
        if (!isMoving) return;
        const deltaY = e.touches[0].clientY - startY;
        this.vl.updateTransforms(this.currentIndex, deltaY);
      }, { passive: false });
      swipeMask.addEventListener("touchend", (e) => {
        if (!isMoving) return;
        isMoving = false;
        const deltaY = e.changedTouches[0].clientY - startY;
        this.vl.setTransition(true);
        if (deltaY < -70) {
          this.navigate(1);
        } else if (deltaY > 70) {
          this.navigate(-1);
        } else {
          this.vl.updateTransforms(this.currentIndex, 0);
        }
      }, { passive: true });
      swipeMask.addEventListener("wheel", (e) => {
        if (!this.isOpen) return;
        e.preventDefault();
        this.navigate(e.deltaY > 0 ? 1 : -1);
      }, { passive: false });
      document.addEventListener("keydown", (e) => {
        if (!this.isOpen) return;
        if (e.key === "Escape") this.closeModal();
        else if (e.key === "ArrowUp") this.navigate(-1);
        else if (e.key === "ArrowDown") this.navigate(1);
        else if (e.key === " ") {
          e.preventDefault();
          this.togglePlayCurrent();
        } else if (e.key === "ArrowLeft") {
          const v = this.getCurrentVideo();
          if (v) v.currentTime = Math.max(0, v.currentTime - 5);
        } else if (e.key === "ArrowRight") {
          const v = this.getCurrentVideo();
          if (v && v.duration) v.currentTime = Math.min(v.duration, v.currentTime + 5);
        }
      });
      swipeMask.addEventListener("click", () => {
        if (!isMoving) this.togglePlayCurrent();
      });
      const likeBtn = this.uiLayer.querySelector("#tm-like-btn");
      likeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        likeBtn.classList.toggle("active");
      });
      const bookmarkBtn = this.uiLayer.querySelector("#tm-bookmark-btn");
      bookmarkBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const list = this.pool.getDataPool();
        if (!list.length) return;
        const item = list[this.currentIndex];
        const id = String(item.id);
        if (this.bookmarks.has(id)) {
          this.bookmarks.delete(id);
          bookmarkBtn.classList.remove("active");
        } else {
          this.bookmarks.add(id);
          bookmarkBtn.classList.add("active");
        }
        saveJSON(STORAGE_KEYS.BOOKMARKS, Array.from(this.bookmarks));
      });
      const downloadBtn = this.uiLayer.querySelector("#tm-download-btn");
      downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const list = this.pool.getDataPool();
        if (!list.length) return;
        const item = list[this.currentIndex];
        if (item.url) {
          const a = document.createElement("a");
          a.href = item.url;
          a.download = item.title || "video.mp4";
          a.target = "_blank";
          a.rel = "noopener";
          a.click();
        }
      });
      const progressWrap = this.uiLayer.querySelector("#tm-progress-wrap");
      progressWrap.addEventListener("click", (e) => {
        e.stopPropagation();
        this.seekToPosition(e.clientX);
      });
      progressWrap.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        this.isDraggingProgress = true;
        progressWrap.classList.add("dragging");
        this.seekToPosition(e.touches[0].clientX);
      }, { passive: false });
      progressWrap.addEventListener("touchmove", (e) => {
        if (!this.isDraggingProgress) return;
        e.preventDefault();
        e.stopPropagation();
        this.seekToPosition(e.touches[0].clientX);
      }, { passive: false });
      progressWrap.addEventListener("touchend", (e) => {
        if (!this.isDraggingProgress) return;
        e.stopPropagation();
        this.isDraggingProgress = false;
        progressWrap.classList.remove("dragging");
      }, { passive: true });
      progressWrap.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.isDraggingProgress = true;
        progressWrap.classList.add("dragging");
        this.seekToPosition(e.clientX);
        const onMouseMove = (ev) => {
          if (!this.isDraggingProgress) return;
          this.seekToPosition(ev.clientX);
        };
        const onMouseUp = () => {
          this.isDraggingProgress = false;
          progressWrap.classList.remove("dragging");
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
      const volBtn = this.uiLayer.querySelector("#tm-vol-btn");
      const volSliderWrap = this.uiLayer.querySelector(".tm-vol-slider-wrap");
      const volFill = this.uiLayer.querySelector("#tm-vol-fill");
      const volIcon = this.uiLayer.querySelector("#tm-vol-icon");
      const updateVolIcon = () => {
        if (this.isMuted || this.volume === 0) {
          volIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
        } else if (this.volume < 0.5) {
          volIcon.innerHTML = '<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>';
        } else {
          volIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
        }
      };
      const applyVolume = () => {
        const video = this.getCurrentVideo();
        if (video) {
          video.volume = this.isMuted ? 0 : this.volume;
          video.muted = this.isMuted;
        }
        volFill.style.width = `${(this.isMuted ? 0 : this.volume) * 100}%`;
        updateVolIcon();
        saveJSON(STORAGE_KEYS.VOLUME, { volume: this.volume, muted: this.isMuted });
      };
      volBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.isMuted = !this.isMuted;
        applyVolume();
      });
      const setVolFromX = (clientX) => {
        const rect = volSliderWrap.getBoundingClientRect();
        this.volume = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        this.isMuted = false;
        applyVolume();
      };
      volSliderWrap.addEventListener("click", (e) => {
        e.stopPropagation();
        setVolFromX(e.clientX);
      });
      volSliderWrap.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        setVolFromX(e.clientX);
        const onMove = (ev) => setVolFromX(ev.clientX);
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
      volFill.style.width = `${(this.isMuted ? 0 : this.volume) * 100}%`;
      updateVolIcon();
    }
    openModal(index) {
      this.isOpen = true;
      this.modal.style.display = "block";
      this.currentIndex = index;
      this.vl.setTransition(false);
      this.vl.updateTransforms(this.currentIndex, 0);
      this.loadNode(this.currentIndex - 1);
      this.loadNode(this.currentIndex);
      this.loadNode(this.currentIndex + 1);
      this.playCurrent();
    }
    closeModal() {
      if (this.preloadTimer) {
        clearTimeout(this.preloadTimer);
        this.preloadTimer = null;
      }
      this.isOpen = false;
      this.modal.style.display = "none";
      this.pauseAll();
    }
    navigate(delta) {
      if (this.preloadTimer) {
        clearTimeout(this.preloadTimer);
        this.preloadTimer = null;
      }
      const list = this.pool.getDataPool();
      if (!list.length) return;
      this.pauseAll();
      let nextIndex = this.currentIndex + delta;
      if (nextIndex < 0) {
        nextIndex = list.length - 1;
      } else if (nextIndex >= list.length) {
        if (this.pool.hasMoreData()) {
          if (!this.pool.getIsLoading()) {
            this.pool.fetchNextPage();
          }
          return;
        } else {
          nextIndex = 0;
        }
      }
      this.currentIndex = nextIndex;
      this.vl.setTransition(true);
      this.vl.updateTransforms(this.currentIndex, 0);
      this.loadNode(this.currentIndex + delta);
      setTimeout(() => {
        if (this.isOpen) this.playCurrent();
      }, 350);
      if (this.currentIndex >= list.length - 5) {
        this.pool.fetchNextPage();
      }
    }
    loadNode(logicalIndex) {
      const list = this.pool.getDataPool();
      if (logicalIndex < 0 || logicalIndex >= list.length) return;
      const item = list[logicalIndex];
      const node = this.vl.getNode(logicalIndex);
      const video = node.querySelector(".tm-video");
      const thumb = node.querySelector(".tm-thumb");
      if (video.getAttribute("data-index") !== logicalIndex.toString()) {
        video.src = item.url;
        video.setAttribute("data-index", logicalIndex.toString());
        video.loop = this.loop;
        video.preload = logicalIndex === this.currentIndex ? "auto" : "metadata";
        video.load();
        thumb.src = item.thumbnail || "";
        node.style.backgroundImage = `url("${escapeCSSUrl$1(item.thumbnail || "")}")`;
        node.style.backgroundSize = "cover";
        node.style.backgroundPosition = "center";
        thumb.classList.remove("hidden");
        video.style.opacity = "0";
        video.oncanplay = null;
        video.oncanplay = () => {
          if (video.getAttribute("data-index") === logicalIndex.toString()) {
            thumb.classList.add("hidden");
            video.style.opacity = "1";
          }
        };
      }
    }
    pauseAll() {
      this.vl.getNodes().forEach((n) => {
        const v = n.querySelector(".tm-video");
        v.pause();
      });
    }
    playCurrent() {
      const list = this.pool.getDataPool();
      if (!list.length) return;
      const item = list[this.currentIndex];
      this.titleText.textContent = item.title || "Video";
      this.updateCountUI();
      const likeCount = this.uiLayer.querySelector("#tm-like-count");
      if (likeCount) likeCount.textContent = String(item.favorite || 0);
      const likeBtn = this.uiLayer.querySelector("#tm-like-btn");
      if (likeBtn) likeBtn.classList.remove("active");
      const bookmarkBtn = this.uiLayer.querySelector("#tm-bookmark-btn");
      if (bookmarkBtn) {
        if (this.bookmarks.has(String(item.id))) {
          bookmarkBtn.classList.add("active");
        } else {
          bookmarkBtn.classList.remove("active");
        }
      }
      const node = this.vl.getNode(this.currentIndex);
      const video = node.querySelector(".tm-video");
      video.preload = "auto";
      video.play().catch((e) => console.log("Autoplay prevented", e));
      video.volume = this.isMuted ? 0 : this.volume;
      video.muted = this.isMuted;
      this.schedulePreload();
      video.ontimeupdate = () => {
        if (!video.duration) return;
        const p = video.currentTime / video.duration * 100;
        this.progressFill.style.width = `${p}%`;
        const progressWrap = this.uiLayer.querySelector("#tm-progress-wrap");
        if (progressWrap) progressWrap.setAttribute("aria-valuenow", String(Math.round(p)));
        this.timeText.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      };
    }
    schedulePreload() {
      if (this.preloadTimer) clearTimeout(this.preloadTimer);
      const list = this.pool.getDataPool();
      if (!list.length) return;
      this.preloadTimer = setTimeout(() => {
        const nextIdx = this.currentIndex + 1;
        if (nextIdx < list.length) {
          const nextNode = this.vl.getNode(nextIdx);
          const nextVideo = nextNode.querySelector(".tm-video");
          if (nextVideo.src) {
            nextVideo.preload = "auto";
          }
        }
        this.preloadTimer = setTimeout(() => {
          const prevIdx = this.currentIndex - 1;
          if (prevIdx >= 0) {
            const prevNode = this.vl.getNode(prevIdx);
            const prevVideo = prevNode.querySelector(".tm-video");
            if (prevVideo.src) {
              prevVideo.preload = "auto";
            }
          }
        }, 2e3);
      }, 2e3);
    }
    getCurrentVideo() {
      const node = this.vl.getNode(this.currentIndex);
      return node.querySelector(".tm-video");
    }
    seekToPosition(clientX) {
      const progressTrack = this.uiLayer.querySelector(".tm-progress");
      if (!progressTrack) return;
      const rect = progressTrack.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const video = this.getCurrentVideo();
      if (video && video.duration && isFinite(video.duration)) {
        video.currentTime = ratio * video.duration;
        this.progressFill.style.width = `${ratio * 100}%`;
        this.timeText.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      }
    }
    togglePlayCurrent() {
      const node = this.vl.getNode(this.currentIndex);
      const video = node.querySelector(".tm-video");
      if (video.paused) {
        video.play().catch((e) => console.log("Play prevented", e));
      } else {
        video.pause();
      }
    }
    updateCountUI() {
      const list = this.pool.getDataPool();
      const countSpan = this.uiLayer.querySelector("#tm-count");
      if (countSpan) {
        countSpan.textContent = `${this.currentIndex + 1} / ${list.length}${this.pool.hasMoreData() ? "+" : ""}`;
      }
    }
  }
  function escapeCSSUrl(url) {
    return url.replace(/["'\\]/g, "\\$&");
  }
  class Layout {
    constructor() {
      this.rootElement = null;
      this.pool = new PoolManager();
      this.player = new TikTokMode(this.pool);
    }
    init(root) {
      this.rootElement = root;
      document.body.className = this.pool.getApiClient().getIsAnime() ? "theme-anime" : "theme-real";
      this.createPageStructure();
      this.bindEvents();
      this.player.init();
      this.loadInitialData();
    }
    createPageStructure() {
      if (!this.rootElement) return;
      this.rootElement.innerHTML = `
            <div class="noise-overlay"></div>
            <div class="app-layout">
                ${Components.getSidebarHTML()}
                <main class="main-container" id="main-scroll">
                    ${Components.getTopBarHTML(this.pool.getApiClient().getIsAnime())}
                    <div class="content-pad">
                        ${Components.getHeroBannerHTML()}
                        <h2 class="section-title">趋势探索 <span style="font-size:1rem; color:var(--text-400); font-family:var(--font-body)">Trending Now</span></h2>
                        <div class="media-grid" id="grid-container">
                            ${this.generateSkeletons()}
                        </div>
                    </div>
                </main>
                ${Components.getMobileNavHTML()}
            </div>
        `;
    }
    generateSkeletons() {
      return Array(6).fill(0).map(() => `
            <div class="media-card" style="border-radius: 1.5rem; cursor: default; animation: none; background: transparent; border: none;">
                <div class="skeleton-pulse" style="width: 100%; height: 100%; background: rgba(255,255,255,0.05); aspect-ratio: 9/16; border-radius: 1.5rem;"></div>
            </div>
        `).join("");
    }
    // ─── Unified filter switching ───────────────────────────────────
    /**
     * 统一入口：所有 UI 筛选切换都走此方法。
     * 缓存命中则秒开，否则展示 skeleton loading。
     */
    async applyFilters(partial, opts) {
      const willHitCache = this.pool.hasFreshCache(partial);
      if (!willHitCache) {
        const grid = document.getElementById("grid-container");
        if (grid) grid.innerHTML = this.generateSkeletons();
        const banner = document.getElementById("hero-banner");
        if (banner) banner.style.display = "none";
      }
      if ((opts == null ? void 0 : opts.channelSwitch) && partial.isAnimeOnly !== void 0) {
        document.body.className = partial.isAnimeOnly ? "theme-anime" : "theme-real";
      }
      try {
        const result = await this.pool.loadInitialData(partial);
        if (this.pool.getDataPool().length === 0) {
          this.renderEmptyState();
        } else {
          this.renderAll();
        }
        log(`applyFilters: ${willHitCache ? "Cache HIT ⚡" : "Fetched"} (fromCache=${result.fromCache})`);
      } catch (error) {
        console.error("Failed to apply filters:", error);
        this.renderErrorState();
      }
      this.schedulePreloads();
    }
    /**
     * 后台预加载策略：预取当前维度的邻近组合 + 另一次元的默认组合
     */
    schedulePreloads() {
      const q = this.pool.getCurrentQuery();
      const ranges = ["daily", "weekly", "monthly", "all"];
      const nextRange = ranges.find((r) => r !== q.range) || "weekly";
      const otherChannel = {
        isAnimeOnly: !q.isAnimeOnly,
        range: q.range,
        sort: q.sort
      };
      const sameChannelOtherRange = {
        isAnimeOnly: q.isAnimeOnly,
        range: nextRange,
        sort: q.sort
      };
      setTimeout(() => {
        this.pool.preload(sameChannelOtherRange).then(() => {
          this.pool.preload(otherChannel);
        });
      }, 1500);
    }
    // ─── Event binding ──────────────────────────────────────────────
    bindEvents() {
      document.querySelectorAll(".nav-item[data-range]").forEach((item) => {
        item.addEventListener("click", async () => {
          const range = item.dataset.range;
          this.syncRangeUI(range);
          await this.applyFilters({ range });
        });
      });
      document.querySelectorAll(".sort-btn[data-sort]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const sort = btn.dataset.sort;
          this.syncSortUI(sort);
          await this.applyFilters({ sort });
        });
      });
      const rangeBtn = document.getElementById("mobile-range-btn");
      const rangeDropdown = document.getElementById("range-dropdown");
      const sortBtn2 = document.getElementById("mobile-sort-btn");
      const sortDropdown = document.getElementById("sort-dropdown");
      const closeAllDropdowns = () => {
        [rangeDropdown, sortDropdown].forEach((dd) => dd == null ? void 0 : dd.classList.remove("open"));
        [rangeBtn, sortBtn2].forEach((btn) => btn == null ? void 0 : btn.setAttribute("aria-expanded", "false"));
      };
      rangeBtn == null ? void 0 : rangeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = rangeDropdown == null ? void 0 : rangeDropdown.classList.contains("open");
        closeAllDropdowns();
        if (!isOpen) {
          rangeDropdown == null ? void 0 : rangeDropdown.classList.add("open");
          rangeBtn.setAttribute("aria-expanded", "true");
        }
      });
      sortBtn2 == null ? void 0 : sortBtn2.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = sortDropdown == null ? void 0 : sortDropdown.classList.contains("open");
        closeAllDropdowns();
        if (!isOpen) {
          sortDropdown == null ? void 0 : sortDropdown.classList.add("open");
          sortBtn2.setAttribute("aria-expanded", "true");
        }
      });
      document.addEventListener("click", () => closeAllDropdowns());
      document.querySelectorAll("#range-dropdown .mobile-dd-item").forEach((item) => {
        item.addEventListener("click", async (e) => {
          e.stopPropagation();
          const range = item.dataset.range;
          this.syncRangeUI(range);
          closeAllDropdowns();
          await this.applyFilters({ range });
        });
      });
      document.querySelectorAll("#sort-dropdown .mobile-dd-item").forEach((item) => {
        item.addEventListener("click", async (e) => {
          e.stopPropagation();
          const sort = item.dataset.sort;
          this.syncSortUI(sort);
          closeAllDropdowns();
          await this.applyFilters({ sort });
        });
      });
      document.querySelectorAll(".channel-btn[data-channel]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const channel = btn.dataset.channel;
          const isAnime = channel === "anime";
          if (isAnime === this.pool.getApiClient().getIsAnime()) return;
          const topbarPulse = document.getElementById("topbar-pulse");
          if (topbarPulse) {
            topbarPulse.classList.remove("pulse-anim");
            void topbarPulse.offsetWidth;
            topbarPulse.classList.add("pulse-anim");
          }
          const switcher = btn.closest(".channel-switch");
          if (switcher) {
            if (isAnime) switcher.classList.add("is-anime");
            else switcher.classList.remove("is-anime");
          }
          document.querySelectorAll(".channel-btn").forEach((b) => {
            b.classList.remove("active");
            b.setAttribute("aria-selected", "false");
          });
          btn.classList.add("active");
          btn.setAttribute("aria-selected", "true");
          const willHitCache = this.pool.hasFreshCache({ isAnimeOnly: isAnime });
          if (!willHitCache) {
            const cards = document.querySelectorAll(".media-card");
            cards.forEach((c) => c.classList.add("sinking"));
            await new Promise((res) => setTimeout(res, 300));
          }
          await this.applyFilters({ isAnimeOnly: isAnime }, { channelSwitch: true });
        });
      });
      const mainContainer = document.getElementById("main-scroll");
      if (mainContainer) {
        let isFetching = false;
        let lastScrollTop = 0;
        mainContainer.addEventListener("scroll", () => {
          const scrollTop = mainContainer.scrollTop;
          const scrollHeight = mainContainer.scrollHeight;
          const clientHeight = mainContainer.clientHeight;
          if (scrollTop > lastScrollTop && !isFetching) {
            const threshold = Math.min(scrollHeight * 0.3, 800);
            if (scrollTop + clientHeight >= scrollHeight - threshold) {
              isFetching = true;
              this.loadMoreData().finally(() => {
                isFetching = false;
              });
            }
          }
          lastScrollTop = scrollTop;
        }, { passive: true });
      }
      const gridContainer = document.getElementById("grid-container");
      if (gridContainer) {
        gridContainer.addEventListener("click", (e) => {
          const card = e.target.closest(".media-card");
          if (card) {
            const indexAttr = card.getAttribute("data-index");
            if (indexAttr) {
              const index = parseInt(indexAttr);
              this.player.openModal(index);
            }
          }
        });
      }
    }
    // ─── UI sync helpers ────────────────────────────────────────────
    syncRangeUI(range) {
      var _a, _b;
      document.querySelectorAll(".nav-item[data-range]").forEach((n) => n.classList.remove("active"));
      (_a = document.querySelector(`.nav-item[data-range="${range}"]`)) == null ? void 0 : _a.classList.add("active");
      document.querySelectorAll("#range-dropdown .mobile-dd-item").forEach((n) => n.classList.remove("active"));
      (_b = document.querySelector(`#range-dropdown .mobile-dd-item[data-range="${range}"]`)) == null ? void 0 : _b.classList.add("active");
    }
    syncSortUI(sort) {
      var _a, _b;
      document.querySelectorAll(".sort-btn").forEach((b) => b.classList.remove("active"));
      (_a = document.querySelector(`.sort-btn[data-sort="${sort}"]`)) == null ? void 0 : _a.classList.add("active");
      document.querySelectorAll("#sort-dropdown .mobile-dd-item").forEach((n) => n.classList.remove("active"));
      (_b = document.querySelector(`#sort-dropdown .mobile-dd-item[data-sort="${sort}"]`)) == null ? void 0 : _b.classList.add("active");
    }
    // ─── Data loading ───────────────────────────────────────────────
    async loadInitialData() {
      try {
        await this.pool.loadInitialData();
        if (this.pool.getDataPool().length === 0) {
          this.renderEmptyState();
        } else {
          this.renderAll();
        }
        this.schedulePreloads();
      } catch (error) {
        console.error("Failed to load initial data:", error);
        this.renderErrorState();
      }
    }
    async loadMoreData() {
      try {
        const newData = await this.pool.fetchNextPage();
        if (newData && newData.length > 0) {
          this.renderGrid(true);
        } else if (this.pool.getDataPool().length === 0) {
          this.renderEmptyState();
        }
      } catch (error) {
        console.error("Failed to load more data:", error);
        this.appendRetryBlock();
      }
    }
    // ─── Rendering ──────────────────────────────────────────────────
    renderAll() {
      this.renderHero();
      this.renderGrid(false);
    }
    renderEmptyState() {
      const banner = document.getElementById("hero-banner");
      if (banner) banner.style.display = "none";
      const container = document.getElementById("grid-container");
      if (container) {
        container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="var(--text-400)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <h3>流媒体荒原</h3>
                    <p>当前频道或范围尚未产生数据<br>请切换条件试试吧</p>
                </div>
            `;
      }
    }
    renderErrorState() {
      const banner = document.getElementById("hero-banner");
      if (banner) banner.style.display = "none";
      const container = document.getElementById("grid-container");
      if (container) {
        container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="var(--accent-primary)"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>
                    <h3>网络链路中断</h3>
                    <p style="margin-bottom: 1.5rem">跨越次元壁的过程遇到了一点干扰</p>
                    <button class="retry-btn" onclick="document.dispatchEvent(new CustomEvent('xflow-retry'))">重试连接</button>
                </div>
            `;
        document.addEventListener("xflow-retry", () => {
          if (container) container.innerHTML = this.generateSkeletons();
          this.loadInitialData();
        }, { once: true });
      }
    }
    appendRetryBlock() {
      const container = document.getElementById("grid-container");
      if (!container || document.getElementById("tm-retry-block")) return;
      const retryHtml = `
            <div id="tm-retry-block" class="retry-block">
                <p style="color: var(--text-300); margin-bottom: 1rem; font-size: 0.9rem;">发现新的内容，但加载失败了</p>
                <button class="retry-btn" id="tm-retry-load">继续加载</button>
            </div>
        `;
      container.insertAdjacentHTML("beforeend", retryHtml);
      const retryBtn = document.getElementById("tm-retry-load");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => {
          const block = document.getElementById("tm-retry-block");
          if (block) block.remove();
          this.loadMoreData();
        });
      }
    }
    renderHero() {
      const list = this.pool.getDataPool();
      if (!list.length) return;
      const banner = document.getElementById("hero-banner");
      if (!banner) return;
      const hero = list[0];
      banner.style.display = "block";
      const heroBg = document.getElementById("hero-bg");
      if (heroBg) {
        heroBg.style.backgroundImage = `url("${escapeCSSUrl(hero.thumbnail)}")`;
        heroBg.style.opacity = "1";
      }
      const heroSkeleton = document.getElementById("hero-skeleton");
      if (heroSkeleton) heroSkeleton.style.display = "none";
      const heroTitle = document.getElementById("hero-title");
      if (heroTitle) heroTitle.textContent = hero.title || `@${hero.tweet_account} 的神级视觉演绎`;
      const heroLikes = document.getElementById("hero-likes");
      if (heroLikes) heroLikes.textContent = formatCount(hero.favorite);
      const heroPv = document.getElementById("hero-pv");
      if (heroPv) heroPv.textContent = formatCount(hero.pv);
      banner.onclick = () => {
        this.player.openModal(0);
      };
    }
    renderGrid(append = false) {
      const container = document.getElementById("grid-container");
      if (!container) return;
      const list = this.pool.getDataPool();
      let html = "";
      const startIndex = append ? container.children.length : 0;
      const oldRetryBlock = document.getElementById("tm-retry-block");
      if (oldRetryBlock) {
        oldRetryBlock.remove();
      }
      for (let i = startIndex; i < list.length; i++) {
        const item = list[i];
        const rankNum = i + 1;
        let rankClass = rankNum === 1 ? "rank-1" : rankNum === 2 ? "rank-2" : rankNum === 3 ? "rank-3" : "";
        html += `
            <div class="media-card" style="animation-delay: ${i % 20 * 0.05}s" data-index="${i}" role="button" tabindex="0" aria-label="${escapeHtml(item.title || "Video card")}">
                <img src="${item.thumbnail}" alt="${escapeHtml(item.title || "Thumbnail")}" class="card-img" loading="lazy">
                <div class="card-overlay"></div>
                <div class="card-rank ${rankClass}">No.${rankNum}</div>
                <div class="card-play-icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                <div class="card-info">
                    <div class="card-title">${escapeHtml(item.title || `@${item.tweet_account} 的视频`)}</div>
                    <div class="card-stats">
                        <span class="stat"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></svg> ${formatCount(item.favorite)}</span>
                        <span class="stat"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg> ${formatCount(item.pv)}</span>
                    </div>
                </div>
            </div>`;
      }
      if (append) {
        container.insertAdjacentHTML("beforeend", html);
      } else {
        container.innerHTML = html;
      }
    }
  }
  class Sandbox {
    constructor() {
      this.appRoot = null;
      this.styleEl = null;
    }
    static getInstance() {
      if (!Sandbox._instance) {
        Sandbox._instance = new Sandbox();
      }
      return Sandbox._instance;
    }
    initialize() {
      var _a;
      const hideStyle = document.createElement("style");
      hideStyle.id = "xflow-hide-fouc";
      hideStyle.textContent = "html { display: none !important; }";
      (_a = document.documentElement || document.head || document.body) == null ? void 0 : _a.appendChild(hideStyle);
      const metaReferrer = document.createElement("meta");
      metaReferrer.name = "referrer";
      metaReferrer.content = "no-referrer";
      (document.head || document.documentElement).appendChild(metaReferrer);
      if (document.body) {
        this.createSandbox();
      } else {
        const observer = new MutationObserver(() => {
          if (document.body) {
            observer.disconnect();
            this.createSandbox();
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      }
    }
    createSandbox() {
      if (document.getElementById("xflow-app-root")) return;
      log("拦截原网页，创建防删除沙盒...");
      this.styleEl = document.createElement("style");
      this.styleEl.setAttribute("data-xflow-core", "1");
      this.styleEl.textContent = `
            /* 镇压原版网页，但不阻止其脚本运行以免抛错 */
            body > *:not(#xflow-app-root) { display: none !important; opacity: 0 !important; pointer-events: none !important; height: 0 !important; overflow: hidden !important; }
            html, body { background: var(--bg-base) !important; margin: 0 !important; overflow: hidden !important; width: 100vw !important; height: 100vh !important; }
        `;
      (document.head || document.documentElement).appendChild(this.styleEl);
      this.appRoot = document.createElement("div");
      this.appRoot.id = "xflow-app-root";
      this.appRoot.style.cssText = "position: fixed; inset: 0; z-index: 2147483647; background: var(--bg-base); color: var(--text-100); overflow: hidden;";
      const targetHost = document.body || document.documentElement;
      targetHost.appendChild(this.appRoot);
      const rootObserver = new MutationObserver(() => {
        if (!document.getElementById("xflow-app-root") && document.body && this.appRoot) {
          log("警告：检测到 React 试图抹除 X-Flow 容器，自动执行纳米级重组...");
          document.body.appendChild(this.appRoot);
        }
        if (!document.querySelector("style[data-xflow-core]") && this.styleEl) {
          (document.head || document.documentElement).appendChild(this.styleEl);
        }
        if (!document.querySelector('meta[name="referrer"]')) {
          const mr = document.createElement("meta");
          mr.name = "referrer";
          mr.content = "no-referrer";
          (document.head || document.documentElement).appendChild(mr);
        }
      });
      rootObserver.observe(document.documentElement, { childList: true, subtree: true });
      this.bootSystem();
      const hideStyle = document.getElementById("xflow-hide-fouc");
      if (hideStyle == null ? void 0 : hideStyle.parentNode) {
        hideStyle.remove();
      }
      document.documentElement.style.display = "";
    }
    bootSystem() {
      log("系统清理与重建中...");
      document.documentElement.className = "";
      document.title = "X-Flow | 极境流媒体";
      if (!document.querySelector('link[href*="family=Syne"]')) {
        const fontLinks = document.createElement("div");
        fontLinks.innerHTML = `
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@500;700;800&display=swap" rel="stylesheet">
            `;
        while (fontLinks.firstChild) {
          document.head.appendChild(fontLinks.firstChild);
        }
      }
      if (this.styleEl) {
        document.head.appendChild(this.styleEl);
      }
      document.body.className = "";
      const layout = new Layout();
      layout.init(this.appRoot);
    }
  }
  console.log("X-Flow v6 Pro: System Starting...");
  const sandbox = Sandbox.getInstance();
  sandbox.initialize();

})();