// ==UserScript==
// @name               Twitter排行榜：TikTok版
// @name:zh-CN         Twitter排行榜：TikTok版
// @name:zh-TW         Twitter排行榜：TikTok版
// @name:en            X-Flow: TikTok Mode Media Ranking
// @namespace          xflow.loadingi.local
// @version            6.3.4
// @author             Chris_C
// @description        TikTok风格上下滑动切换，PC/移动端双端适配，缩略图先行加载、进度指示、点赞、只看未读、循环播放、长按倍速、广告/弹窗/重定向屏蔽
// @description:zh-CN  TikTok风格上下滑动切换，PC/移动端双端适配，缩略图先行加载、进度指示、点赞、只看未读、循环播放、长按倍速、广告/弹窗/重定向屏蔽
// @description:zh-TW  TikTok風格上下滑動切換，PC/移動端雙端適配，縮略圖先行載入、進度指示、點讚、只看未讀、循環播放、長按倍速、廣告/彈窗/重新導向屏蔽
// @description:en     TikTok-style vertical video browsing experience, optimized for PC/Mobile, preloads, speed control and anti-redirects.
// @license            Apache-2.0
// @match              *://pektino.com/*
// @match              *://*.pektino.com/*
// @match              *://x-ero-anime.com/*
// @match              *://*.x-ero-anime.com/*
// @match              *://truvaze.com/*
// @match              *://*.truvaze.com/*
// @match              *://twihub.net/*
// @match              *://*.twihub.net/*
// @match              *://twikeep.com/*
// @match              *://*.twikeep.com/*
// @match              *://twiidol.com/*
// @match              *://*.twiidol.com/*
// @match              *://twiigle.com/*
// @match              *://*.twiigle.com/*
// @match              *://monsnode.com/*
// @match              *://*.monsnode.com/*
// @match              *://twivideo.net/*
// @match              *://*.twivideo.net/*
// @match              *://xiaohuangniao.me/*
// @match              *://*.xiaohuangniao.me/*
// @match              *://twidouga.net/*
// @match              *://*.twidouga.net/*
// @match              *://javtwi.com/*
// @match              *://*.javtwi.com/*
// @match              *://xhotvideo.com/*
// @match              *://*.xhotvideo.com/*
// @match              *://uraaka-times.com/*
// @match              *://*.uraaka-times.com/*
// @connect            pektino.com
// @connect            x-ero-anime.com
// @connect            video.twimg.com
// @connect            pbs.twimg.com
// @connect            truvaze.com
// @connect            twihub.net
// @connect            *
// @grant              GM_getValue
// @grant              GM_openInTab
// @grant              GM_setValue
// @grant              GM_xmlhttpRequest
// @run-at             document-start
// @noframes
// ==/UserScript==

(function() {
  "use strict";
  (() => {
    try {
      if (window.self !== window.top) return;
      const html = document.documentElement ? document.documentElement.innerHTML : "";
      if (window._cf_chl_opt || document.title === "Just a moment..." || document.title === "\u8BF7\u7A0D\u5019..." || html.indexOf("_cf_chl_opt") !== -1 || html.indexOf("cf-challenge") !== -1 && html.indexOf("challenge-form") !== -1) {
        console.log("X-Flow: Cloudflare challenge detected, skipping preboot banner");
        return;
      }
      if (window.__XFLOW_PREBOOT__) return;
      window.__XFLOW_PREBOOT__ = true;
      const root = document.documentElement;
      if (!root) return;
      root.style.background = "#0D0D12";
      root.style.overflow = "hidden";
      const style = document.createElement("style");
      style.id = "xflow-preboot-banner-style";
      style.textContent = 'html{background:#0D0D12!important;overflow:hidden!important;}html::before{content:"";position:fixed;inset:0;z-index:2147483646;background:linear-gradient(160deg,#0D0D12 0%,#131320 40%,#0D0D12 100%);pointer-events:none;}html::after{content:"X-FLOW LOADING";position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;color:rgba(255,255,255,.86);font:700 14px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:.36em;pointer-events:none;text-shadow:0 0 24px rgba(130,80,255,.35);}';
      (document.head || root).appendChild(style);
      const cleanup = () => {
        var _a;
        return (_a = document.getElementById("xflow-preboot-banner-style")) == null ? void 0 : _a.remove();
      };
      window.addEventListener("xflow:booted", cleanup, { once: true });
      setTimeout(cleanup, 7e3);
    } catch (_) {
    }
  })();
  const getOrigin = () => {
    const frozen = window.__XFLOW_ORIGIN__;
    if (typeof frozen === "string" && frozen && frozen !== "null" && !frozen.includes("about:blank")) return frozen;
    const current = window.location.origin;
    if (current && current !== "null" && !current.includes("about:blank")) return current;
    return "https://twihub.net";
  };
  const parseStorageValue = (raw, fallback) => {
    if (raw === void 0 || raw === null || raw === "") return fallback;
    if (typeof raw !== "string") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };
  const gmRequest = (options) => {
    return new Promise((resolve, reject) => {
      try {
        GM_xmlhttpRequest({
          method: options.method,
          url: options.url,
          headers: options.headers,
          data: options.body,
          responseType: options.responseType === "json" ? "json" : void 0,
          timeout: options.timeoutMs,
          onload: (res) => {
            resolve({
              status: res.status,
              data: options.responseType === "json" ? res.response : res.responseText,
              text: res.responseText || "",
              finalUrl: res.finalUrl
            });
          },
          onerror: (err) => reject(new Error(`GM_xmlhttpRequest failed: ${err.error || "Network error"}`)),
          ontimeout: () => reject(new Error(`Request timeout after ${options.timeoutMs || 0}ms`))
        });
      } catch (error) {
        reject(error);
      }
    });
  };
  const userscriptAdapter = {
    env: {
      mode: "userscript",
      apiBase: getOrigin(),
      isAnimeHost: Boolean(window.__XFLOW_IS_ANIME__ ?? window.location.hostname.includes("anime"))
    },
    http: {
      request(options) {
        const isSameOrigin = (() => {
          try {
            const u = new URL(options.url, window.location.origin);
            return u.origin === window.location.origin;
          } catch {
            return false;
          }
        })();
        if (isSameOrigin) {
          const fetchOpts = {
            method: options.method,
            headers: options.headers,
            credentials: "include"
          };
          if (options.body && options.method !== "GET" && options.method !== "HEAD") {
            fetchOpts.body = options.body;
          }
          return fetch(options.url, fetchOpts).then(async (res) => {
            const text = await res.text();
            let data = text;
            if (options.responseType === "json") {
              try {
                data = JSON.parse(text);
              } catch {
              }
            }
            return {
              status: res.status,
              data,
              text,
              finalUrl: res.url
            };
          }).catch((err) => {
            console.warn(`X-Flow: Native fetch failed, falling back to GM_xmlhttpRequest`, err);
            return gmRequest(options);
          });
        }
        return gmRequest(options);
      }
    },
    storage: {
      get(key, fallback) {
        try {
          const raw = GM_getValue(key, "");
          return parseStorageValue(raw, fallback);
        } catch {
          return fallback;
        }
      },
      set(key, value) {
        try {
          GM_setValue(key, JSON.stringify(value));
        } catch {
        }
      }
    }
  };
  function getRuntimeAdapter() {
    return userscriptAdapter;
  }
  const _TwiHubAdapter = class _TwiHubAdapter2 {
    constructor() {
      this.id = "twihub";
      this.name = "TwiHub (SvelteKit)";
    }
    matches(hostname) {
      return hostname.includes("twihub.net");
    }
    getFilterGroups(isAnime) {
      return [
        {
          id: "range",
          title: "\u8303\u56F4 Range",
          type: "range",
          options: [
            { id: "1d", label: "24\u5C0F\u65F6", en: "24 Hours" },
            { id: "7d", label: "7\u5929\u699C", en: "7 Days" },
            { id: "30d", label: "30\u5929\u699C", en: "30 Days" },
            { id: "realtime", label: "\u6700\u65B0", en: "Latest" }
          ]
        },
        {
          id: "sort",
          title: "\u6392\u5E8F Sort",
          type: "sort",
          options: [
            { id: "pv", label: "\u6781\u9AD8\u64AD\u653E" },
            { id: "favorite", label: "\u6700\u591A\u559C\u6B22" }
          ]
        }
      ];
    }
    getBaseUrl() {
      const runtime2 = getRuntimeAdapter();
      return runtime2.env.apiBase;
    }
    buildMediaEndpoint(baseUrl) {
      const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      if (normalized.endsWith("/api")) {
        return `${normalized}/v1/posts`;
      }
      return `${normalized}/api/v1/posts`;
    }
    async fetchList(params, isAnime) {
      var _a, _b, _c;
      const runtime2 = getRuntimeAdapter();
      const baseUrl = this.getBaseUrl();
      const mappedRange = _TwiHubAdapter2.RANGE_MAP[params.range || "daily"] ?? params.range ?? "1d";
      const finalParams = {
        type: mappedRange,
        limit: (params.per_page || 80).toString()
      };
      if (params.cursor) {
        finalParams.cursor = params.cursor;
      }
      const url = new URL(this.buildMediaEndpoint(baseUrl), window.location.origin);
      Object.keys(finalParams).forEach((k) => {
        if (finalParams[k] !== void 0) {
          url.searchParams.append(k, finalParams[k].toString());
        }
      });
      const res = await runtime2.http.request({
        method: "GET",
        url: url.toString(),
        headers: { Accept: "application/json" },
        responseType: "json",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        const rawItems = ((_a = res.data) == null ? void 0 : _a.posts) || [];
        const posts = rawItems.map((item) => ({
          id: String(item.postId),
          url_cd: String(item.postId),
          thumbnail: item.thumbnailUrl,
          favorite: item.likesCount || 0,
          pv: item.viewsCount || 0,
          duration: item.firstVideoDuration || 0,
          title: "Loading...",
          tweet_account: "loading",
          url: "",
          isDetailsLoaded: false,
          originalUrl: `https://x.com/i/status/${item.postId}`
        }));
        if (params.sort === "pv") {
          posts.sort((a, b) => b.pv - a.pv);
        } else if (params.sort === "favorite") {
          posts.sort((a, b) => b.favorite - a.favorite);
        }
        return {
          posts,
          nextCursor: ((_b = res.data) == null ? void 0 : _b.nextCursor) || "",
          hasMore: !!((_c = res.data) == null ? void 0 : _c.hasMore)
        };
      }
      throw new Error(`TwiHub API Error: ${res.status}`);
    }
    async fetchDetailHtml(postId) {
      const runtime2 = getRuntimeAdapter();
      const baseUrl = this.getBaseUrl();
      const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const url = `${normalized}/posts/${postId}`;
      const res = await runtime2.http.request({
        method: "GET",
        url,
        headers: { Accept: "text/html" },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        return res.text;
      }
      throw new Error(`Detail HTML error: ${res.status}`);
    }
    parseDetailHtml(html) {
      var _a, _b, _c;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const videoLinkEl = doc.getElementById("video-link");
      const videoPath = (videoLinkEl == null ? void 0 : videoLinkEl.getAttribute("href")) || "";
      const authorEl = doc.getElementById("author-handle");
      const authorText = ((_b = (_a = authorEl == null ? void 0 : authorEl.querySelector("span")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) || "";
      const tweetAccount = authorText.replace(/^@/, "");
      const titleEl = doc.querySelector(".mt-4 p.text-gray-200");
      const title = ((_c = titleEl == null ? void 0 : titleEl.textContent) == null ? void 0 : _c.trim()) || "";
      return { title, tweetAccount, videoPath };
    }
    async resolveVideoUrl(videoPath) {
      const runtime2 = getRuntimeAdapter();
      const baseUrl = this.getBaseUrl();
      const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const url = videoPath.startsWith("http") ? videoPath : `${normalized}${videoPath}`;
      const res = await runtime2.http.request({
        method: "HEAD",
        url,
        responseType: "text",
        timeoutMs: 8e3
      });
      return res.finalUrl || url;
    }
    async fetchAuthorVideos(username, cursor) {
      return { posts: [], nextCursor: "", hasMore: false };
    }
  };
  _TwiHubAdapter.RANGE_MAP = {
    daily: "1d",
    weekly: "7d",
    monthly: "30d",
    all: "30d",
    "1d": "1d",
    "7d": "7d",
    "30d": "30d",
    realtime: "realtime"
  };
  let TwiHubAdapter = _TwiHubAdapter;
  function parseDuration(str) {
    if (!str) return 0;
    const cleaned = str.trim();
    const parts = cleaned.split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  }
  function parseViews(str) {
    if (!str) return 0;
    const cleaned = str.trim().replace(/[^\d.KMkm万亿]/g, "");
    if (!cleaned) return 0;
    if (cleaned.endsWith("\u4E07")) {
      return parseFloat(cleaned) * 1e4;
    }
    if (cleaned.endsWith("\u4EBF")) {
      return parseFloat(cleaned) * 1e8;
    }
    const lower = cleaned.toLowerCase();
    if (lower.endsWith("m")) {
      return parseFloat(cleaned) * 1e6;
    }
    if (lower.endsWith("k")) {
      return parseFloat(cleaned) * 1e3;
    }
    return parseFloat(cleaned) || 0;
  }
  function parseTwitterHandleFromUrl(url) {
    if (!url) return "unknown";
    try {
      const cleaned = url.trim();
      const match = cleaned.match(/(?:x|twitter)\.com\/([^/]+)\/status\//i);
      return match ? match[1] : "unknown";
    } catch {
      return "unknown";
    }
  }
  function extractText(el, selector) {
    var _a;
    if (!el) return "";
    const sub = el.querySelector(selector);
    return ((_a = sub == null ? void 0 : sub.textContent) == null ? void 0 : _a.trim()) || "";
  }
  function normalizeVideoUrl(url) {
    if (!url) return "";
    let cleaned = url.trim();
    if (cleaned.startsWith("http://")) {
      cleaned = cleaned.replace("http://", "https://");
    }
    return cleaned;
  }
  function getCanonicalVideoId(item) {
    if (!item) return "";
    const url = item.url || "";
    if (url && url.includes("video.twimg.com")) {
      try {
        const u = new URL(url);
        const path = u.pathname.replace(/^\/+/, "");
        if (path && path.length > 5) return path;
      } catch {
        const match = url.match(/(amplify_video|ext_tw_video|tweet_video)\/.+$/i);
        if (match) return match[0].split("?")[0].replace(/^\/+/, "");
      }
    }
    return String(item.id || item.url_cd || "");
  }
  const _PektinoAdapter = class _PektinoAdapter2 {
    constructor() {
      this.id = "pektino";
      this.name = "Pektino (Next.js API)";
    }
    matches(hostname) {
      return hostname.includes("pektino.com") || hostname.includes("x-ero-anime.com") || hostname.includes("truvaze.com") || hostname.includes("twitter-ero-video-ranking.com");
    }
    getFilterGroups(isAnime) {
      return [
        {
          id: "range",
          title: "\u8303\u56F4 Range",
          type: "range",
          options: [
            { id: "daily", label: "24\u5C0F\u65F6", en: "24 Hours" },
            { id: "weekly", label: "\u5468\u699C", en: "Weekly" },
            { id: "monthly", label: "\u6708\u699C", en: "Monthly" },
            { id: "all", label: "\u603B\u699C", en: "All Time" }
          ]
        },
        {
          id: "sort",
          title: "\u6392\u5E8F Sort",
          type: "sort",
          options: [
            { id: "favorite", label: "\u6309\u70B9\u8D5E", en: "Likes" },
            { id: "pv", label: "\u6309\u89C2\u770B\u6570", en: "Views" },
            { id: "time", label: "\u6309\u65F6\u957F", en: "Duration" },
            { id: "created", label: "\u6700\u8FD1\u6DFB\u52A0", en: "Recently Added" }
          ]
        },
        {
          id: "duration",
          title: "\u65F6\u957F Duration",
          type: "tag",
          options: [
            { id: "0,0", label: "\u5168\u90E8", en: "All" },
            { id: "0,300", label: "0-5\u5206\u949F", en: "0-5 min" },
            { id: "300,900", label: "5-15\u5206\u949F", en: "5-15 min" },
            { id: "900,1800", label: "15-30\u5206\u949F", en: "15-30 min" },
            { id: "1800,3600", label: "30\u5206\u949F-1\u5C0F\u65F6", en: "30 min - 1 hr" },
            { id: "3600,0", label: "1\u5C0F\u65F6\u4EE5\u4E0A", en: "Over 1 hr" }
          ]
        }
      ];
    }
    async fetchList(params, isAnime) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const mappedRange = _PektinoAdapter2.RANGE_MAP[params.range || "daily"] ?? "";
      const page = params.cursor || "1";
      const perPage = params.per_page || 50;
      const url = new URL("/api/media", origin);
      url.searchParams.append("page", page);
      url.searchParams.append("per_page", String(perPage));
      url.searchParams.append("isAnimeOnly", isAnime ? "1" : "0");
      if (mappedRange !== "") {
        url.searchParams.append("range", mappedRange);
      }
      if (params.sort) {
        url.searchParams.append("sort", params.sort);
      }
      if (params.duration && params.duration !== "0,0") {
        const [minTime, maxTime] = params.duration.split(",").map(Number);
        if (minTime > 0) {
          url.searchParams.append("min_time", String(minTime));
        }
        if (maxTime > 0) {
          url.searchParams.append("max_time", String(maxTime));
        }
      }
      const res = await runtime2.http.request({
        method: "GET",
        url: url.toString(),
        headers: { Accept: "application/json" },
        responseType: "json",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300 && res.data) {
        const rawItems = res.data.items || [];
        const currentPage = Number(res.data.currentPage || 1);
        const lastPage = Number(res.data.lastPage || 1);
        const posts = rawItems.map((item) => {
          const urlCd = String(item.url_cd || item.id);
          const normUrl = normalizeVideoUrl(item.url);
          const canonicalId = getCanonicalVideoId({ id: urlCd, url: normUrl });
          return {
            id: canonicalId,
            url_cd: urlCd,
            thumbnail: item.thumbnail || "",
            title: item.anime_title || (item.tweet_account ? `@${item.tweet_account} \u7684\u89C6\u9891` : "\u514D\u8D39\u89C6\u9891"),
            tweet_account: item.tweet_account || "unknown",
            favorite: Math.round(Number(item.favorite || 0)),
            pv: Math.round(Number(item.pv || 0)),
            duration: Math.round(Number(item.time || 0)),
            url: normUrl,
            isDetailsLoaded: !!item.url,
            originalUrl: item.tweet_url || `https://x.com/i/status/${urlCd}`
          };
        });
        return {
          posts,
          nextCursor: String(currentPage + 1),
          hasMore: currentPage < lastPage
        };
      }
      throw new Error(`Pektino API Error: ${res.status}`);
    }
    async fetchAuthorVideos(username, cursor) {
      return { posts: [], nextCursor: "", hasMore: false };
    }
  };
  _PektinoAdapter.RANGE_MAP = {
    daily: "",
    weekly: "weekly",
    monthly: "monthly",
    all: "all"
  };
  let PektinoAdapter = _PektinoAdapter;
  const _NextApiAdapter = class _NextApiAdapter2 {
    constructor() {
      this.id = "nextapi";
      this.name = "Next.js API (TwiKeep / TwiIdol)";
    }
    matches(hostname) {
      return hostname.includes("twikeep.com") || hostname.includes("twiidol.com");
    }
    getFilterGroups(isAnime) {
      const isIdol = window.location.hostname.includes("twiidol.com");
      return [
        {
          id: "range",
          title: "\u8303\u56F4 Range",
          type: "range",
          options: [
            { id: "daily", label: "24\u5C0F\u65F6", en: "24 Hours" },
            { id: "weekly", label: "1\u5468", en: "1 Week" },
            { id: "monthly", label: "1\u4E2A\u6708", en: "1 Month" },
            { id: "all", label: "1\u5E74", en: "1 Year" }
          ]
        },
        {
          id: "sort",
          title: "\u6392\u5E8F Sort",
          type: "sort",
          options: isIdol ? [
            { id: "pv", label: "\u6700\u591A\u64AD\u653E" },
            { id: "favorite", label: "\u6700\u591A\u70B9\u8D5E" },
            { id: "recent", label: "\u6700\u65B0\u89C6\u9891" }
          ] : [
            { id: "pv", label: "\u6700\u591A\u64AD\u653E" },
            { id: "favorite", label: "\u6700\u591A\u70B9\u8D5E" }
          ]
        }
      ];
    }
    async fetchList(params, isAnime) {
      var _a;
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const mappedRange = _NextApiAdapter2.RANGE_MAP[params.range || "daily"] ?? "24h";
      const mappedMetric = _NextApiAdapter2.METRIC_MAP[params.sort || "favorite"] ?? "likes";
      const cursor = params.cursor || "0";
      let url;
      if (params.sort === "recent") {
        url = `${origin}/api/history?cursor=${encodeURIComponent(cursor)}`;
      } else {
        url = `${origin}/api/ranking?range=${mappedRange}&metric=${mappedMetric}&cursor=${encodeURIComponent(cursor)}`;
      }
      const res = await runtime2.http.request({
        method: "GET",
        url,
        headers: { Accept: "application/json" },
        responseType: "json",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300 && ((_a = res.data) == null ? void 0 : _a.ok)) {
        const rawItems = res.data.items || [];
        const posts = rawItems.map((item) => {
          const tweetId = item.tweetId || item.mediaKey || String(Date.now());
          const username = item.userName || "unknown";
          const normUrl = normalizeVideoUrl(item.bestVideoUrl);
          const canonicalId = getCanonicalVideoId({ id: tweetId, url: normUrl });
          return {
            id: canonicalId,
            url_cd: tweetId,
            thumbnail: item.thumbnailUrl || "",
            title: item.userDisplayName ? `${item.userDisplayName} (@${username})` : `@${username} \u7684\u89C6\u9891`,
            tweet_account: username,
            authorDisplayName: item.userDisplayName || void 0,
            favorite: Math.round(item.count || 0),
            pv: Math.round(item.count || 0) * 10,
            duration: 0,
            url: normUrl,
            isDetailsLoaded: !!item.bestVideoUrl,
            originalUrl: `https://x.com/${username}/status/${tweetId}`
          };
        });
        return {
          posts,
          nextCursor: res.data.nextCursor || "",
          hasMore: res.data.nextCursor !== null && res.data.nextCursor !== void 0 && res.data.nextCursor !== ""
        };
      }
      throw new Error(`Next.js API Error: ${res.status}`);
    }
    async fetchAuthorVideos(username, cursor) {
      return { posts: [], nextCursor: "", hasMore: false };
    }
  };
  _NextApiAdapter.RANGE_MAP = {
    daily: "24h",
    weekly: "1w",
    monthly: "1m",
    all: "1y"
  };
  _NextApiAdapter.METRIC_MAP = {
    favorite: "likes",
    pv: "views"
  };
  let NextApiAdapter = _NextApiAdapter;
  const _XHotVideoAdapter = class _XHotVideoAdapter2 {
    constructor() {
      this.id = "xhotvideo";
      this.name = "XHotVideo (HTML Scraper)";
    }
    matches(hostname) {
      return hostname.includes("xhotvideo.com");
    }
    getFilterGroups(isAnime) {
      return [
        {
          id: "range",
          title: "\u699C\u5355 Period",
          type: "range",
          options: [
            { id: "day", label: "\u4ECA\u65E5\u70ED\u95E8", en: "Daily" },
            { id: "week", label: "\u672C\u5468\u70ED\u95E8", en: "Weekly" },
            { id: "month", label: "\u672C\u6708\u70ED\u95E8", en: "Monthly" },
            { id: "all", label: "\u5168\u90E8\u70ED\u95E8", en: "All-Time" },
            { id: "total", label: "\u603B\u70ED\u95E8", en: "Total" }
          ]
        },
        {
          id: "sort",
          title: "\u6392\u5E8F Sort",
          type: "sort",
          options: [
            { id: "views", label: "\u64AD\u653E\u6700\u591A" },
            { id: "new", label: "\u6700\u65B0\u53D1\u5E03" },
            { id: "duration", label: "\u65F6\u957F\u6700\u957F" }
          ]
        },
        {
          id: "duration",
          title: "\u65F6\u957F Duration",
          type: "duration",
          options: [
            { id: "all", label: "\u5168\u90E8\u65F6\u957F" },
            { id: "short", label: "5 \u5206\u949F\u5185" },
            { id: "medium", label: "5-30 \u5206\u949F" },
            { id: "long", label: "30 \u5206\u949F\u4EE5\u4E0A" }
          ]
        },
        {
          id: "tag",
          title: "\u6807\u7B7E Tags",
          type: "tag",
          options: [
            { id: "all", label: "\u5168\u90E8\u6807\u7B7E" },
            { id: "anime", label: "\u52A8\u6F2B\u4E8C\u6B21\u5143" },
            { id: "jk", label: "\u5973\u9AD8\u4E2D\u751F" },
            { id: "kyonyu", label: "\u4E30\u6EE1\u80F8\u90E8" },
            { id: "lolita", label: "\u5C11\u5973\u841D\u8389" },
            { id: "shaved", label: "\u5149\u6ED1\u767D\u864E" },
            { id: "beautiful-girl", label: "\u7F8E\u5C11\u5973" },
            { id: "hamedori", label: "\u771F\u5B9E\u81EA\u62CD" }
          ]
        }
      ];
    }
    async fetchList(params, isAnime) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const page = params.cursor || "1";
      let path = "/videos";
      const tag = params.tag;
      const duration = params.duration;
      const sortKey = params.sort;
      const rangeKey = params.range;
      if (tag && tag !== "all") {
        path = `/videos/tag/${tag}/page/${page}`;
      } else if (duration && duration !== "all") {
        path = `/videos/duration/${duration}/page/${page}`;
      } else if (sortKey && sortKey !== "views" && sortKey !== "favorite" && sortKey !== "pv") {
        path = `/videos/sort/${sortKey}/page/${page}`;
      } else if (rangeKey && rangeKey !== "all") {
        const mappedRange = _XHotVideoAdapter2.RANGE_MAP[rangeKey] ?? rangeKey;
        if (mappedRange && mappedRange !== "total") {
          path = `/videos/period/${mappedRange}/page/${page}`;
        } else {
          path = `/videos/page/${page}`;
        }
      } else {
        if (sortKey === "recent" || sortKey === "new") {
          path = `/videos/sort/new/page/${page}`;
        } else if (rangeKey === "daily" || rangeKey === "day") {
          path = `/videos/period/day/page/${page}`;
        } else if (rangeKey === "weekly" || rangeKey === "week") {
          path = `/videos/period/week/page/${page}`;
        } else if (rangeKey === "monthly" || rangeKey === "month") {
          path = `/videos/period/month/page/${page}`;
        } else {
          path = `/videos/page/${page}`;
        }
      }
      const res = await runtime2.http.request({
        method: "GET",
        url: `${origin}${path}`,
        headers: { Accept: "text/html" },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        const doc = new DOMParser().parseFromString(res.text, "text/html");
        const cards = doc.querySelectorAll("a.video-card");
        const posts = [];
        cards.forEach((card) => {
          var _a, _b, _c;
          const href = card.getAttribute("href") || "";
          const id = href.replace("/video/", "");
          if (!id) return;
          const img = card.querySelector(".thumb img");
          const thumb = (img == null ? void 0 : img.getAttribute("src")) || "";
          const durationEl = card.querySelector(".thumb .duration");
          const durationStr = ((_a = durationEl == null ? void 0 : durationEl.textContent) == null ? void 0 : _a.trim()) || "";
          const duration2 = parseDuration(durationStr);
          const titleEl = card.querySelector(".card-title");
          const title = ((_b = titleEl == null ? void 0 : titleEl.textContent) == null ? void 0 : _b.trim()) || id;
          const metaEl = card.querySelector(".card-meta");
          const metaStr = ((_c = metaEl == null ? void 0 : metaEl.textContent) == null ? void 0 : _c.trim()) || "";
          const pv = parseViews(metaStr);
          posts.push({
            id,
            url_cd: id,
            thumbnail: thumb,
            title,
            tweet_account: "unknown",
            favorite: 0,
            pv,
            duration: duration2,
            url: "",
            isDetailsLoaded: false,
            originalUrl: `https://xhotvideo.com/video/${id}`
          });
        });
        const nextPage = String(parseInt(page) + 1);
        return {
          posts,
          nextCursor: nextPage,
          hasMore: posts.length > 0
        };
      }
      throw new Error(`XHotVideo Scrape Error: ${res.status}`);
    }
    async fetchDetailHtml(postId) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const url = `${origin}/video/${postId}`;
      const res = await runtime2.http.request({
        method: "GET",
        url,
        headers: { Accept: "text/html" },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        return res.text;
      }
      throw new Error(`Detail HTML error for ${postId}: ${res.status}`);
    }
    parseDetailHtml(html) {
      var _a;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const playerSource = doc.querySelector("video#mainPlayer source");
      const downloadAction = doc.querySelector("a.download-action");
      const videoPath = (playerSource == null ? void 0 : playerSource.getAttribute("src")) || (downloadAction == null ? void 0 : downloadAction.getAttribute("href")) || "";
      const titleEl = doc.querySelector("h1") || doc.querySelector(".card-title");
      const title = ((_a = titleEl == null ? void 0 : titleEl.textContent) == null ? void 0 : _a.trim()) || "";
      return {
        title,
        tweetAccount: "unknown",
        videoPath
      };
    }
    async resolveVideoUrl(videoPath) {
      return videoPath;
    }
  };
  _XHotVideoAdapter.RANGE_MAP = {
    daily: "day",
    weekly: "week",
    monthly: "month",
    all: "total",
    day: "day",
    week: "week",
    month: "month",
    total: "total"
  };
  let XHotVideoAdapter = _XHotVideoAdapter;
  const _MonsnodeAdapter = class _MonsnodeAdapter2 {
    constructor() {
      this.id = "monsnode";
      this.name = "Monsnode (HTML Scraper & Redirect resolver)";
    }
    matches(hostname) {
      return hostname.includes("monsnode.com");
    }
    getFilterGroups(isAnime) {
      return [
        {
          id: "range",
          title: "\u8303\u56F4 Period",
          type: "range",
          options: [
            { id: "24h", label: "24\u5C0F\u65F6\u699C", en: "24 Hours" },
            { id: "3d", label: "3\u5929\u699C", en: "3 Days" },
            { id: "7d", label: "\u5468\u699C", en: "Weekly" }
          ]
        },
        {
          id: "sort",
          title: "\u6392\u5E8F Sort",
          type: "sort",
          options: [
            { id: "pv", label: "\u7EFC\u5408\u6392\u884C" },
            { id: "favorite", label: "\u63A8\u8350\u6392\u884C" }
          ]
        }
      ];
    }
    async fetchList(params, isAnime) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const page = String(Math.max(0, parseInt(params.cursor || "0")));
      const urlParams = new URLSearchParams();
      urlParams.set("page", page);
      const rangeKey = params.range || "daily";
      const mappedPeriod = _MonsnodeAdapter2.RANGE_MAP[rangeKey] ?? rangeKey ?? "24h";
      const mappedRanking = params.sort === "pv" ? "8" : "1";
      urlParams.set("period", mappedPeriod);
      urlParams.set("ranking", mappedRanking);
      const res = await runtime2.http.request({
        method: "GET",
        url: `${origin}/?${urlParams.toString()}`,
        headers: { Accept: "text/html" },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        const doc = new DOMParser().parseFromString(res.text, "text/html");
        const cards = doc.querySelectorAll(".listn");
        const posts = [];
        cards.forEach((card) => {
          var _a, _b;
          const redirectLink = card.querySelector('a[href*="redirect.php?v="]');
          const redirectHref = (redirectLink == null ? void 0 : redirectLink.getAttribute("href")) || "";
          const vIdMatch = redirectHref.match(/v=(\d+)/);
          const vId = vIdMatch ? vIdMatch[1] : "";
          if (!vId) return;
          const id = vId;
          const img = card.querySelector("img");
          const thumb = (img == null ? void 0 : img.getAttribute("src")) || "";
          const userLink = card.querySelector(".user a");
          const author = ((_b = (_a = userLink == null ? void 0 : userLink.textContent) == null ? void 0 : _a.trim()) == null ? void 0 : _b.replace(/^@/, "")) || "unknown";
          const title = `@${author} \u7684 Monsnode \u89C6\u9891`;
          const cardId = card.getAttribute("id") || vId;
          posts.push({
            id,
            url_cd: vId,
            thumbnail: thumb,
            title,
            tweet_account: author,
            favorite: 0,
            pv: 0,
            duration: 0,
            url: "",
            isDetailsLoaded: false,
            originalUrl: `https://monsnode.com/v${cardId}`
          });
        });
        const nextPage = String(parseInt(page) + 1);
        return {
          posts,
          nextCursor: nextPage,
          hasMore: posts.length > 0
        };
      }
      throw new Error(`Monsnode Scrape Error: ${res.status}`);
    }
    async fetchDetailHtml(postId) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const url = `${origin}/twjn.php?v=${postId}`;
      const res = await runtime2.http.request({
        method: "GET",
        url,
        headers: { Accept: "text/html" },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        return res.text;
      }
      throw new Error(`Monsnode redirect file fetch error: ${res.status}`);
    }
    parseDetailHtml(html) {
      return {
        title: "",
        tweetAccount: "unknown",
        videoPath: html
      };
    }
    async resolveVideoUrl(videoPath) {
      try {
        const doc = new DOMParser().parseFromString(videoPath, "text/html");
        const link = doc.querySelector('a[href*="cdn-cgi/content"]');
        const href = (link == null ? void 0 : link.getAttribute("href")) || "";
        if (href) {
          const origin = window.location.origin;
          return href.startsWith("http") ? href : `${origin}${href}`;
        }
      } catch (e) {
        console.error("Failed to parse Monsnode cdn-cgi link", e);
      }
      const base64Matches = videoPath.match(/atob\(['"]([^'"]+)['"]\)/g);
      if (base64Matches && base64Matches.length >= 1) {
        try {
          const rawBase64 = base64Matches[0].match(/['"]([^'"]+)['"]/);
          if (rawBase64) {
            return atob(rawBase64[1]);
          }
        } catch (e) {
          console.error("Failed to decode Monsnode video URL base64", e);
        }
      }
      return "";
    }
  };
  _MonsnodeAdapter.RANGE_MAP = {
    daily: "24h",
    weekly: "3d",
    monthly: "7d",
    all: "7d",
    "24h": "24h",
    "3d": "3d",
    "7d": "7d"
  };
  let MonsnodeAdapter = _MonsnodeAdapter;
  const _TwiigleAdapter = class _TwiigleAdapter2 {
    constructor() {
      this.id = "twiigle";
      this.name = "Twiigle (HTML Scraper)";
    }
    matches(hostname) {
      return hostname.includes("twiigle.com");
    }
    getFilterGroups(isAnime) {
      return [
        {
          id: "category",
          title: "\u5206\u7C7B Category",
          type: "category",
          options: [
            { id: "index", label: "24\u5C0F\u65F6", en: "24 Hours" },
            { id: "1w", label: "\u5468\u699C", en: "Weekly" },
            { id: "realtime", label: "\u5B9E\u65F6", en: "Realtime" },
            { id: "realtime2", label: "\u968F\u673A", en: "Random" },
            { id: "popular", label: "AV1", en: "AV1" },
            { id: "trend", label: "AV2", en: "AV2" },
            { id: "new", label: "\u89D2\u8272\u626E\u6F14", en: "Cosplay" },
            { id: "best", label: "\u660E\u661F", en: "Talent" },
            { id: "amature", label: "\u5199\u771F", en: "Gravure" },
            { id: "hot", label: "\u91CC\u7AD9", en: "Underground" },
            { id: "secret", label: "TikTok", en: "TikTok" },
            { id: "3d", label: "\u6BBF\u5802", en: "Hall of Fame" },
            { id: "fera", label: "\u6DF1\u5589", en: "Blowjob" },
            { id: "ona", label: "\u81EA\u6211\u6EE1\u8DB3", en: "Masturbation" },
            { id: "ama", label: "\u7D20\u4EBA", en: "Amateur" },
            { id: "op", label: "\u79C1\u5904", en: "Genitals" }
          ]
        }
      ];
    }
    async fetchList(params, isAnime) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const key = params.range || params.category || "index";
      const mapped = _TwiigleAdapter2.RANGE_MAP[key] ?? key;
      const path = mapped.endsWith(".html") ? mapped : `/${mapped}.html`;
      const res = await runtime2.http.request({
        method: "GET",
        url: `${origin}${path}`,
        headers: { Accept: "text/html" },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        const doc = new DOMParser().parseFromString(res.text, "text/html");
        const cards = doc.querySelectorAll(".art_li");
        const posts = [];
        cards.forEach((card, i) => {
          var _a;
          const img = card.querySelector(".item_image img");
          const thumb = (img == null ? void 0 : img.getAttribute("src")) || "";
          if (!thumb) return;
          const videoLink = card.querySelector(".item_image a");
          const videoHref = (videoLink == null ? void 0 : videoLink.getAttribute("href")) || "";
          let videoUrl = "";
          if (videoHref.includes("#contents=")) {
            videoUrl = videoHref.split("#contents=")[1] || "";
          }
          const twitterLink = card.querySelector(".tw_icon a");
          const twitterHref = (twitterLink == null ? void 0 : twitterLink.getAttribute("href")) || "";
          const author = parseTwitterHandleFromUrl(twitterHref);
          const idMatch = twitterHref.match(/\/status\/(\d+)/) || videoUrl.match(/\/amplify_video\/(\d+)/) || thumb.match(/\/amplify_video_thumb\/(\d+)/);
          const id = idMatch ? idMatch[1] : `twiigle_${i}`;
          const rankingEl = card.querySelector(".item_ranking");
          const rankText = ((_a = rankingEl == null ? void 0 : rankingEl.textContent) == null ? void 0 : _a.trim()) || "";
          const title = rankText ? `${rankText} - @${author} \u7684\u63A8\u7279\u89C6\u9891` : `@${author} \u7684\u63A8\u7279\u89C6\u9891`;
          posts.push({
            id,
            url_cd: id,
            thumbnail: thumb,
            title,
            tweet_account: author,
            favorite: 0,
            pv: 0,
            duration: 0,
            url: normalizeVideoUrl(videoUrl),
            isDetailsLoaded: true,
            originalUrl: twitterHref || void 0
          });
        });
        return {
          posts,
          nextCursor: "",
          hasMore: false
        };
      }
      throw new Error(`Twiigle Scrape Error: ${res.status}`);
    }
    async fetchDetailHtml(postId) {
      return "";
    }
    async resolveVideoUrl(videoPath) {
      return videoPath;
    }
  };
  _TwiigleAdapter.RANGE_MAP = {
    daily: "index",
    weekly: "1w",
    monthly: "3d",
    all: "best"
  };
  let TwiigleAdapter = _TwiigleAdapter;
  class XiaoHuangNiaoAdapter {
    constructor() {
      this.id = "xiaohuangniao";
      this.name = "XiaoHuangNiao (JSON API)";
    }
    matches(hostname) {
      return hostname.includes("xiaohuangniao.me");
    }
    async fetchList(params, isAnime) {
      var _a;
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const page = String(Math.max(1, parseInt(params.cursor || "1")));
      const q = new URLSearchParams();
      q.append("page", page);
      if (params.sort === "favorite") {
        q.append("order", "likeCount");
      } else if (params.sort === "pv") {
        q.append("order", "viewCount");
      } else {
        q.append("order", "tweetId");
      }
      if (params.range) {
        q.append("range", params.range);
      }
      const res = await runtime2.http.request({
        method: "GET",
        url: `${origin}/api/tweet?${q.toString()}`,
        headers: { Accept: "application/json" },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        let data;
        try {
          data = JSON.parse(res.text);
        } catch {
          throw new Error("Failed to parse XiaoHuangNiao JSON response");
        }
        const rawTweets = Array.isArray(data) ? data : ((_a = data == null ? void 0 : data.data) == null ? void 0 : _a.tweets) || (data == null ? void 0 : data.data) || (data == null ? void 0 : data.tweets) || [];
        const posts = [];
        rawTweets.forEach((t2) => {
          var _a2, _b, _c, _d, _e, _f;
          if (t2.isPinned && parseInt(page) > 1) return;
          const mediaEntity = (_a2 = t2.mediaEntities) == null ? void 0 : _a2[0];
          const videoMedia = (_c = (_b = mediaEntity == null ? void 0 : mediaEntity.videoInfo) == null ? void 0 : _b.variants) == null ? void 0 : _c.find((v) => {
            var _a3;
            return v.contentType === "video/mp4" || ((_a3 = v.url) == null ? void 0 : _a3.includes(".mp4"));
          });
          const videoUrl = (videoMedia == null ? void 0 : videoMedia.url) || "";
          if (!videoUrl) return;
          const thumb = (mediaEntity == null ? void 0 : mediaEntity.media_url_https) || (mediaEntity == null ? void 0 : mediaEntity.media_url) || (videoMedia == null ? void 0 : videoMedia.url) || "";
          const author = ((_d = t2.author) == null ? void 0 : _d.userName) || "unknown";
          const authorDisplayName = ((_e = t2.author) == null ? void 0 : _e.name) || author;
          const duration = ((_f = mediaEntity == null ? void 0 : mediaEntity.videoInfo) == null ? void 0 : _f.durationMillis) ? Math.round(mediaEntity.videoInfo.durationMillis / 1e3) : 0;
          posts.push({
            id: String(t2.tweetId || t2.id),
            url_cd: String(t2.tweetId || t2.id),
            thumbnail: thumb,
            title: t2.text || `\u5C0F\u9EC4\u9E1F\u89C6\u9891 ${t2.tweetId}`,
            tweet_account: author,
            authorDisplayName,
            favorite: t2.likeCount || 0,
            pv: t2.viewCount || 0,
            duration,
            url: normalizeVideoUrl(videoUrl),
            isDetailsLoaded: true,
            originalUrl: `https://x.com/${author}/status/${t2.tweetId || t2.id}`
          });
        });
        const nextPage = String(parseInt(page) + 1);
        return {
          posts,
          nextCursor: nextPage,
          hasMore: rawTweets.length > 0
        };
      }
      throw new Error(`XiaoHuangNiao API Error: ${res.status}`);
    }
    async fetchDetailHtml(postId) {
      return "";
    }
    async resolveVideoUrl(videoPath) {
      return videoPath;
    }
  }
  const _TwivideoAdapter = class _TwivideoAdapter2 {
    constructor() {
      this.id = "twivideo";
      this.name = "TwiVideo (AJAX HTML Hybrid)";
      this.viewTokenPromise = null;
    }
    matches(hostname) {
      return hostname.includes("twivideo.net");
    }
    getFilterGroups(isAnime) {
      return [
        {
          id: "range",
          title: "\u6392\u884C Period",
          type: "range",
          options: [
            { id: "realtime", label: "\u5B9E\u65F6\u6392\u884C", en: "Realtime" },
            { id: "archives", label: "\u8BDD\u9898\u6392\u884C", en: "Archives" }
          ]
        }
      ];
    }
    fetchViewToken() {
      if (this.viewTokenPromise) return this.viewTokenPromise;
      this.viewTokenPromise = (async () => {
        var _a;
        const runtime2 = getRuntimeAdapter();
        const origin = window.location.origin;
        const res = await runtime2.http.request({
          method: "POST",
          url: `${origin}/templates/ajax_view_token.php`,
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01"
          },
          responseType: "json",
          timeoutMs: 8e3
        });
        if (res.status >= 200 && res.status < 300) {
          try {
            const obj = typeof res.data === "object" ? res.data : JSON.parse(res.text || "{}");
            return ((_a = obj == null ? void 0 : obj.token) == null ? void 0 : _a.trim()) || "";
          } catch (e) {
            console.error("Failed to parse Twivideo token JSON", e);
          }
        }
        return "";
      })();
      return this.viewTokenPromise;
    }
    async fetchList(params, isAnime) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const viewToken = await this.fetchViewToken();
      const offset = params.cursor || "0";
      const limit = String(params.per_page || 80);
      const rangeKey = params.range || "daily";
      const mappedRange = _TwivideoAdapter2.RANGE_MAP[rangeKey] ?? "realtime";
      const order = mappedRange === "archives" || params.sort === "favorite" ? "like_count" : "post_date";
      const bodyParams = new URLSearchParams();
      bodyParams.append("offset", offset);
      bodyParams.append("limit", limit);
      bodyParams.append("tag", "null");
      bodyParams.append("type", "0");
      bodyParams.append("order", order);
      bodyParams.append("le", "1000");
      bodyParams.append("ty", "p4");
      bodyParams.append("myarray", "[]");
      bodyParams.append("view_token", viewToken);
      const res = await runtime2.http.request({
        method: "POST",
        url: `${origin}/templates/view_lists.php`,
        body: bodyParams.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "*/*"
        },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        const doc = new DOMParser().parseFromString(`<div>${res.text}</div>`, "text/html");
        const cards = doc.querySelectorAll(".art_li");
        const posts = [];
        cards.forEach((card, i) => {
          const videoLink = card.querySelector(".item_image a");
          const videoUrl = (videoLink == null ? void 0 : videoLink.getAttribute("href")) || "";
          const img = card.querySelector(".item_image img");
          const thumb = (img == null ? void 0 : img.getAttribute("src")) || "";
          const likesStr = extractText(card, ".like_count_int");
          const likes = parseInt(likesStr) || 0;
          const snsLinkEl = card.querySelector(".tw_icon span.sns_link");
          const linkId = (snsLinkEl == null ? void 0 : snsLinkEl.getAttribute("data-link-id")) || "";
          const id = linkId || `twivideo_${offset}_${i}`;
          posts.push({
            id,
            url_cd: linkId,
            thumbnail: thumb,
            title: `TwiVideo Post ${id}`,
            tweet_account: "loading",
            favorite: likes,
            pv: 0,
            duration: 0,
            url: normalizeVideoUrl(videoUrl),
            isDetailsLoaded: false,
            originalUrl: void 0
          });
        });
        const nextOffset = String(parseInt(offset) + parseInt(limit));
        return {
          posts,
          nextCursor: nextOffset,
          hasMore: posts.length > 0
        };
      }
      throw new Error(`TwiVideo List Fetch Error: ${res.status}`);
    }
    async fetchDetailHtml(postId) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const url = `${origin}/api/link.php?id=${postId}`;
      const res = await runtime2.http.request({
        method: "GET",
        url,
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        return res.text;
      }
      return "";
    }
    parseDetailHtml(html) {
      const username = parseTwitterHandleFromUrl(html);
      return {
        title: `@${username} \u7684\u63A8\u7279\u89C6\u9891`,
        tweetAccount: username,
        videoPath: ""
      };
    }
    async resolveVideoUrl(videoPath) {
      return videoPath;
    }
  };
  _TwivideoAdapter.RANGE_MAP = {
    daily: "realtime",
    weekly: "archives",
    monthly: "archives",
    all: "archives",
    realtime: "realtime",
    archives: "archives"
  };
  let TwivideoAdapter = _TwivideoAdapter;
  class TwidougaAdapter {
    constructor() {
      this.id = "twidouga";
      this.name = "TwiDouga (HTML Scraper)";
    }
    matches(hostname) {
      return hostname.includes("twidouga.net");
    }
    getFilterGroups(isAnime) {
      return [
        {
          id: "range",
          title: "\u6392\u884C Period",
          type: "range",
          options: [
            { id: "realtime", label: "\u5B9E\u65F6\u6392\u884C", en: "Realtime" }
          ]
        }
      ];
    }
    async fetchList(params, isAnime) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const page = params.cursor || "1";
      const path = `/jp/realtime_t${page}.php`;
      const res = await runtime2.http.request({
        method: "GET",
        url: `${origin}${path}`,
        headers: { Accept: "text/html" },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        const doc = new DOMParser().parseFromString(res.text, "text/html");
        const cards = doc.querySelectorAll(".item");
        const posts = [];
        cards.forEach((card, i) => {
          const videoLink = card.querySelector("a");
          const videoUrl = (videoLink == null ? void 0 : videoLink.getAttribute("href")) || "";
          if (!videoUrl) return;
          const img = card.querySelector("a img");
          const thumb = (img == null ? void 0 : img.getAttribute("src")) || "";
          const authorLink = card.querySelector(".saisei a");
          const authorHref = (authorLink == null ? void 0 : authorLink.getAttribute("href")) || "";
          const author = parseTwitterHandleFromUrl(authorHref);
          const idMatch = videoUrl.match(/\/amplify_video\/(\d+)/) || videoUrl.match(/\/ext_tw_video\/(\d+)/) || thumb.match(/\/img\/([^.]+)/);
          const id = idMatch ? idMatch[1] : `twidouga_${page}_${i}`;
          posts.push({
            id,
            url_cd: id,
            thumbnail: thumb,
            title: `@${author} \u7684\u89C6\u9891`,
            tweet_account: author,
            favorite: 0,
            pv: 0,
            duration: 0,
            url: normalizeVideoUrl(videoUrl),
            isDetailsLoaded: true,
            originalUrl: authorHref || void 0
          });
        });
        const nextPage = String(parseInt(page) + 1);
        return {
          posts,
          nextCursor: nextPage,
          hasMore: posts.length > 0
        };
      }
      throw new Error(`TwiDouga Scrape Error: ${res.status}`);
    }
    async fetchDetailHtml(postId) {
      return "";
    }
    async resolveVideoUrl(videoPath) {
      return videoPath;
    }
  }
  class JavtwiAdapter {
    constructor() {
      this.id = "javtwi";
      this.name = "JavTwi (HTML Scraper)";
    }
    matches(hostname) {
      return hostname.includes("javtwi.com");
    }
    getFilterGroups(isAnime) {
      return [
        {
          id: "category",
          title: "\u5206\u7C7B Category",
          type: "category",
          options: [
            { id: "top", label: "\u63A8\u8350", en: "Top" },
            { id: "index", label: "\u6700\u65B0", en: "Index" },
            { id: "best", label: "\u7CBE\u54C1", en: "Best" },
            { id: "rank", label: "\u6392\u884C", en: "Rank" },
            { id: "new", label: "\u65B0\u54C1", en: "New" }
          ]
        }
      ];
    }
    async fetchList(params, isAnime) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const key = params.range || params.category || "top";
      const mapped = key === "daily" ? "top" : key;
      const path = mapped.endsWith(".html") ? mapped : `/${mapped}.html`;
      const res = await runtime2.http.request({
        method: "GET",
        url: `${origin}${path}`,
        headers: { Accept: "text/html" },
        responseType: "text",
        timeoutMs: 8e3
      });
      if (res.status >= 200 && res.status < 300) {
        const doc = new DOMParser().parseFromString(res.text, "text/html");
        const videoLinks = doc.querySelectorAll('a.center_contents[href*="video.twimg.com"]');
        const posts = [];
        videoLinks.forEach((link, i) => {
          var _a;
          const videoUrl = link.getAttribute("href") || "";
          if (!videoUrl) return;
          const img = link.querySelector("img.center_contents") || link.querySelector("img");
          const thumb = (img == null ? void 0 : img.getAttribute("src")) || "";
          const idMatch = videoUrl.match(/\/amplify_video\/(\d+)/) || videoUrl.match(/\/ext_tw_video\/(\d+)/) || thumb.match(/\/img\/([^.]+)/);
          const id = idMatch ? idMatch[1] : `javtwi_${i}`;
          const rankEl = link.previousElementSibling;
          const rankText = rankEl && rankEl.classList.contains("center_text_rank") ? (_a = rankEl.textContent) == null ? void 0 : _a.trim() : "";
          const title = rankText ? `${rankText} - JAVTWI Video ${id}` : `JAVTWI Video ${id}`;
          const normUrl = normalizeVideoUrl(videoUrl);
          const canonicalId = getCanonicalVideoId({ id, url: normUrl });
          posts.push({
            id: canonicalId,
            url_cd: id,
            thumbnail: thumb,
            title,
            tweet_account: "unknown",
            favorite: 0,
            pv: 0,
            duration: 0,
            url: normUrl,
            isDetailsLoaded: true,
            originalUrl: void 0
          });
        });
        return {
          posts,
          nextCursor: "",
          hasMore: false
        };
      }
      throw new Error(`JavTwi Scrape Error: ${res.status}`);
    }
    async fetchDetailHtml(postId) {
      return "";
    }
    async resolveVideoUrl(videoPath) {
      return videoPath;
    }
  }
  const _UraakaTimesAdapter = class _UraakaTimesAdapter2 {
    constructor() {
      this.id = "uraaka-times";
      this.name = "\u88CF\u57A2\u30BF\u30A4\u30E0\u30BA (REST API)";
    }
    matches(hostname) {
      return hostname.includes("uraaka-times.com");
    }
    getFilterGroups(_isAnime) {
      return [
        {
          id: "sort",
          title: "\u6392\u5E8F Sort",
          type: "sort",
          options: [
            { id: "popular", label: "\u4EBA\u6C17", en: "Popular" },
            { id: "new", label: "\u6700\u65B0", en: "Latest" },
            { id: "recommend", label: "\u304A\u3059\u3059\u3081", en: "Recommend" }
          ]
        }
      ];
    }
    async fetchList(params, _isAnime) {
      const runtime2 = getRuntimeAdapter();
      const origin = window.location.origin;
      const sortKey = params.sort || params.range || "new";
      const sort = _UraakaTimesAdapter2.SORT_MAP[sortKey] ?? "new";
      const page = params.cursor || "1";
      const limit = String(params.per_page || 50);
      const url = `${origin}/api/tweets?sort=${sort}&page=${page}&limit=${limit}`;
      const res = await runtime2.http.request({
        method: "GET",
        url,
        headers: { Accept: "application/json" },
        responseType: "json",
        timeoutMs: 1e4
      });
      if (res.status >= 200 && res.status < 300) {
        const rawItems = Array.isArray(res.data) ? res.data : [];
        const posts = rawItems.filter((item) => {
          if (!item.video || item.video.length === 0) return false;
          if (!/^\d+$/.test(String(item.tweet_id))) return false;
          if (item.is_super_promoted || item.myfans_promote) return false;
          const videoLink = item.video[0].video_link || "";
          if (!videoLink.includes("video.twimg.com")) return false;
          return true;
        }).map((item) => {
          var _a, _b;
          const vid = item.video[0];
          const title = item.seo_title || (item.tweet && item.tweet.length > 120 ? item.tweet.substring(0, 120) + "..." : item.tweet) || `@${item.twitter_id}`;
          return {
            id: String(item.tweet_id),
            url_cd: String(item.tweet_id),
            thumbnail: vid.video_thumbnail || "",
            title,
            tweet_account: ((_a = item.user) == null ? void 0 : _a.twitter_id) || item.twitter_id || "unknown",
            authorDisplayName: (_b = item.user) == null ? void 0 : _b.twitter_name,
            favorite: item.favorite || 0,
            pv: item.views || 0,
            duration: 0,
            url: normalizeVideoUrl(vid.video_link),
            isDetailsLoaded: true,
            originalUrl: `https://x.com/${item.twitter_id}/status/${item.tweet_id}`
          };
        });
        const nextPage = String(parseInt(page) + 1);
        return {
          posts,
          nextCursor: nextPage,
          hasMore: rawItems.length >= parseInt(limit)
        };
      }
      throw new Error(`UraakaTimes API Error: ${res.status}`);
    }
    async fetchAuthorVideos(_username, _cursor) {
      return { posts: [], nextCursor: "", hasMore: false };
    }
  };
  _UraakaTimesAdapter.SORT_MAP = {
    daily: "popular",
    weekly: "popular",
    monthly: "popular",
    all: "popular",
    new: "new",
    popular: "popular",
    recommend: "recommend",
    favorite: "popular",
    pv: "popular"
  };
  let UraakaTimesAdapter = _UraakaTimesAdapter;
  class AdapterManager {
    constructor() {
      this.adapters = [];
      this.adapters = [
        new PektinoAdapter(),
        new TwiHubAdapter(),
        new NextApiAdapter(),
        new XHotVideoAdapter(),
        new MonsnodeAdapter(),
        new TwiigleAdapter(),
        new XiaoHuangNiaoAdapter(),
        new TwivideoAdapter(),
        new TwidougaAdapter(),
        new JavtwiAdapter(),
        new UraakaTimesAdapter()
      ];
      const hostname = window.location.hostname;
      const matched = this.adapters.find((adapter) => adapter.matches(hostname));
      this.activeAdapter = matched || this.adapters[0];
    }
    static getInstance() {
      if (!AdapterManager.instance) {
        AdapterManager.instance = new AdapterManager();
      }
      return AdapterManager.instance;
    }
    getActiveAdapter() {
      return this.activeAdapter;
    }
  }
  class ApiClient {
    constructor(runtime2 = getRuntimeAdapter()) {
      this.runtime = runtime2;
      this.baseUrl = runtime2.env.apiBase;
      this.isAnime = runtime2.env.isAnimeHost ? 1 : 0;
    }
    setChannel(isAnimeChannel) {
      this.isAnime = isAnimeChannel ? 1 : 0;
    }
    async fetchList(params = {}) {
      const adapter = AdapterManager.getInstance().getActiveAdapter();
      return adapter.fetchList(params, this.isAnime === 1);
    }
    async fetchDetailHtml(postId) {
      const adapter = AdapterManager.getInstance().getActiveAdapter();
      if (adapter.fetchDetailHtml) {
        return adapter.fetchDetailHtml(postId);
      }
      return "";
    }
    async resolveVideoUrl(videoPath) {
      const adapter = AdapterManager.getInstance().getActiveAdapter();
      if (adapter.resolveVideoUrl) {
        return adapter.resolveVideoUrl(videoPath);
      }
      return videoPath;
    }
    getIsAnime() {
      return this.isAnime === 1;
    }
  }
  function log(...args) {
    console.log("\u{1F680}[X-Flow]", ...args);
  }
  const DEFAULT_TTL = 5 * 6e4;
  const STORAGE_CACHE_PREFIX = "xflow_cache_v3_";
  class CacheManager {
    constructor() {
      this.store =  new Map();
    }
    makeKey(q) {
      const parts = [
        q.isAnimeOnly ? "1" : "0",
        q.range || "daily",
        q.sort || "favorite",
        q.category || "",
        q.perPage ?? 50
      ];
      const extraKeys = Object.keys(q).filter(
        (k) => k !== "isAnimeOnly" && k !== "range" && k !== "sort" && k !== "category" && k !== "perPage"
      ).sort();
      extraKeys.forEach((k) => {
        if (q[k] !== void 0 && q[k] !== null) {
          parts.push(`${k}:${q[k]}`);
        }
      });
      return parts.join("|");
    }
    get(q, ttlMs = DEFAULT_TTL) {
      const key = this.makeKey(q);
      let entry = this.store.get(key);
      if (!entry) {
        try {
          const runtime2 = getRuntimeAdapter();
          entry = runtime2.storage.get(STORAGE_CACHE_PREFIX + key, null);
          if (entry) {
            log(`CacheManager: Storage HIT for ${key}`);
            this.store.set(key, entry);
          }
        } catch (err) {
          log(`CacheManager: Failed to read persistent cache: ${err}`);
        }
      }
      if (!entry) return null;
      if (Date.now() - entry.updatedAt > ttlMs) {
        log(`CacheManager: Cache expired for ${key}`);
        this.delete(q);
        return null;
      }
      return entry;
    }
    set(q, entry) {
      const key = this.makeKey(q);
      const newEntry = { ...entry, updatedAt: Date.now() };
      this.store.set(key, newEntry);
      try {
        const runtime2 = getRuntimeAdapter();
        runtime2.storage.set(STORAGE_CACHE_PREFIX + key, newEntry);
        log(`CacheManager: Persisted cache for ${key} (${entry.items.length} items)`);
      } catch (err) {
        log(`CacheManager: Failed to write persistent cache: ${err}`);
      }
    }
    delete(q) {
      const key = this.makeKey(q);
      this.store.delete(key);
      try {
        const runtime2 = getRuntimeAdapter();
        runtime2.storage.set(STORAGE_CACHE_PREFIX + key, null);
      } catch (_) {
      }
    }
    hasFresh(q, ttlMs) {
      return !!this.get(q, ttlMs);
    }
  }
  class PoolManager {
    constructor(runtime2 = getRuntimeAdapter()) {
      this.dataPool = [];
      this.isLoading = false;
      this.hasMore = true;
      this.listeners = [];
      this.detailListeners = [];
      this.activeRequestId = 0;
      this.preloadInFlight =  new Set();
      this.currentQuery = {
        isAnimeOnly: false,
        range: "daily",
        sort: "favorite",
        perPage: 50
      };
      this.nextCursor = "";
      this.customDataPool = null;
      this.prefetchAbortId = 0;
      this.runtime = runtime2;
      this.api = new ApiClient(runtime2);
      this.cache = new CacheManager();
      this.currentQuery.isAnimeOnly = this.api.getIsAnime();
    }
    async loadInitialData(params = {}) {
      const requestId = ++this.activeRequestId;
      this.currentQuery = {
        ...this.currentQuery,
        ...params
      };
      this.nextCursor = "";
      this.dataPool = [];
      this.hasMore = true;
      this.isLoading = false;
      this.api.setChannel(this.currentQuery.isAnimeOnly);
      log(`PoolManager: loadInitialData for ${this.cache.makeKey(this.currentQuery)}`);
      const cached = this.cache.get(this.currentQuery);
      if (cached) {
        log(`PoolManager: Cache HIT \u2014 ${cached.items.length} items`);
        this.dataPool = [...cached.items];
        this.nextCursor = cached.nextCursor;
        this.hasMore = cached.hasMore;
        this.listeners.forEach((cb) => cb(this.dataPool));
        return { fromCache: true };
      }
      log("PoolManager: Cache MISS \u2014 fetching page 1");
      await this.fetchPageInternal(requestId);
      return { fromCache: false };
    }
    async fetchNextPage() {
      if (this.isLoading || !this.hasMore) return [];
      const requestId = this.activeRequestId;
      return this.fetchPageInternal(requestId);
    }
    async fetchPageInternal(requestId) {
      var _a;
      if (this.isLoading) return [];
      this.isLoading = true;
      const queryKey = this.cache.makeKey(this.currentQuery);
      log(`PoolManager: Fetching page for ${queryKey} with cursor ${this.nextCursor}`);
      try {
        const fetchParams = {
          range: this.currentQuery.range,
          sort: this.currentQuery.sort,
          category: this.currentQuery.category || "",
          cursor: this.nextCursor,
          per_page: this.currentQuery.perPage || 80
        };
        const data = await this.api.fetchList(fetchParams);
        if (requestId !== this.activeRequestId) {
          log("PoolManager: Stale response discarded");
          return [];
        }
        if (((_a = data == null ? void 0 : data.posts) == null ? void 0 : _a.length) > 0) {
          const newItems = data.posts;
          this.dataPool = [...this.dataPool, ...newItems];
          this.nextCursor = data.nextCursor || "";
          this.hasMore = data.hasMore || false;
          if (!this.nextCursor) {
            this.hasMore = false;
          }
          this.cache.set(this.currentQuery, {
            items: [...this.dataPool],
            nextCursor: this.nextCursor,
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
        log("\u52A0\u8F7D\u66F4\u591A\u6570\u636E\u5931\u8D25", e);
        throw e;
      } finally {
        this.isLoading = false;
      }
    }
    async preload(query) {
      if (this.cache.hasFresh(query)) return;
      const key = this.cache.makeKey(query);
      if (this.preloadInFlight.has(key)) return;
      this.preloadInFlight.add(key);
      log(`PoolManager: Preloading ${key}...`);
      try {
        const tempApi = new ApiClient(this.runtime);
        tempApi.setChannel(query.isAnimeOnly);
        const data = await tempApi.fetchList({
          range: query.range,
          sort: query.sort,
          category: query.category || "",
          cursor: "",
          per_page: query.perPage || 80
        });
        const items = (data == null ? void 0 : data.posts) || [];
        this.cache.set(query, {
          items,
          nextCursor: (data == null ? void 0 : data.nextCursor) || "",
          hasMore: (data == null ? void 0 : data.hasMore) || false,
          updatedAt: Date.now()
        });
        log(`PoolManager: Preload done for ${key} (${items.length} items)`);
      } catch (e) {
        log(`PoolManager: Preload failed for ${key}`, e);
      } finally {
        this.preloadInFlight.delete(key);
      }
    }
    parseDetailHtml(html) {
      var _a, _b, _c;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const videoLinkEl = doc.getElementById("video-link");
      const videoPath = (videoLinkEl == null ? void 0 : videoLinkEl.getAttribute("href")) || "";
      const authorEl = doc.getElementById("author-handle");
      const authorText = ((_b = (_a = authorEl == null ? void 0 : authorEl.querySelector("span")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) || "";
      const tweetAccount = authorText.replace(/^@/, "");
      const titleEl = doc.querySelector(".mt-4 p.text-gray-200");
      const title = ((_c = titleEl == null ? void 0 : titleEl.textContent) == null ? void 0 : _c.trim()) || "";
      return { title, tweetAccount, videoPath };
    }
    async loadDetails(item) {
      if (!item || item.isDetailsLoaded) return item;
      try {
        log(`PoolManager: Loading details for post ${item.id}`);
        const html = await this.api.fetchDetailHtml(item.id);
        const adapter = AdapterManager.getInstance().getActiveAdapter();
        const parsed = adapter.parseDetailHtml ? adapter.parseDetailHtml(html) : this.parseDetailHtml(html);
        item.title = parsed.title || item.title || `@${parsed.tweetAccount}`;
        item.tweet_account = parsed.tweetAccount || item.tweet_account || "unknown";
        const videoPath = parsed.videoPath || "";
        if (videoPath) {
          log(`PoolManager: Resolving video URL for ${videoPath}`);
          let resolved = await this.api.resolveVideoUrl(videoPath);
          if (resolved && resolved.startsWith("http://")) {
            resolved = resolved.replace("http://", "https://");
          }
          item.url = resolved;
          item.id = getCanonicalVideoId(item);
        }
        item.isDetailsLoaded = true;
        this.detailListeners.forEach((cb) => cb(item));
        log(`PoolManager: Loaded details for ${item.id}`);
      } catch (e) {
        log(`PoolManager: Failed to load details for ${item.id}`, e);
      }
      return item;
    }
    hasFreshCache(params) {
      const query = { ...this.currentQuery, ...params };
      return this.cache.hasFresh(query);
    }
    getCachedItems(params) {
      const query = { ...this.currentQuery, ...params };
      const entry = this.cache.get(query);
      return (entry == null ? void 0 : entry.items) || [];
    }
    onDataAdded(cb) {
      this.listeners.push(cb);
    }
    onDetailLoaded(cb) {
      this.detailListeners.push(cb);
    }
    getIsLoading() {
      return this.isLoading;
    }
    hasMoreData() {
      return this.hasMore;
    }
    getDataPool() {
      return this.customDataPool || this.dataPool;
    }
    getCurrentQuery() {
      return { ...this.currentQuery };
    }
    getApiClient() {
      return this.api;
    }
    setCustomDataPool(list) {
      this.customDataPool = list;
    }
    clearCustomDataPool() {
      this.customDataPool = null;
    }
    getRawDataPool() {
      return this.dataPool;
    }
    getCustomDataPool() {
      return this.customDataPool;
    }
    stopPrefetching() {
      this.prefetchAbortId++;
      log("PoolManager: Prefetching stopped");
    }
    async startPrefetching(currentIndex, count = 5, delayMs = 800) {
      const abortId = ++this.prefetchAbortId;
      const pool = this.getDataPool();
      const itemsToPrefetch = [];
      for (let offset = 1; offset <= count; offset++) {
        const idx = currentIndex + offset;
        if (idx >= pool.length) break;
        const item = pool[idx];
        if (item && !item.isDetailsLoaded) {
          itemsToPrefetch.push(item);
        }
      }
      if (itemsToPrefetch.length === 0) return;
      let queueIndex = 0;
      const worker = async () => {
        while (queueIndex < itemsToPrefetch.length && abortId === this.prefetchAbortId) {
          const currentIdx = queueIndex++;
          if (currentIdx >= itemsToPrefetch.length) break;
          const item = itemsToPrefetch[currentIdx];
          try {
            await this.loadDetails(item);
          } catch {
          }
          if (queueIndex < itemsToPrefetch.length && abortId === this.prefetchAbortId) {
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
      };
      const maxConcurrency = Math.min(3, itemsToPrefetch.length);
      const workers = [];
      for (let i = 0; i < maxConcurrency; i++) {
        workers.push(worker());
      }
      await Promise.all(workers);
    }
  }
  const STORAGE_KEYS = {
    LOOP: "xflow_loop",
    BOOKMARKS_V2: "xflow_bookmarks_v2",
    DOWNLOADED: "xflow_downloaded_v1",
    LIKES: "xflow_likes_v1",
    VOLUME: "xflow_volume",
    PLAYBACK_RATE: "xflow_playback_rate"
  };
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
  function loadGM(key, fallback) {
    try {
      const raw = GM_getValue(key, "");
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function saveGM(key, value) {
    try {
      GM_setValue(key, JSON.stringify(value));
    } catch {
    }
  }
  const TRANSLATIONS = {
    "zh-CN": {
      brand: "X-Flow",
      trending: "\u8D8B\u52BF\u63A2\u7D22",
      emptyTitle: "\u6D41\u5A92\u4F53\u8352\u539F",
      emptyDesc: "\u5F53\u524D\u9891\u9053\u6216\u8303\u56F4\u5C1A\u672A\u4EA7\u751F\u6570\u636E<br>\u8BF7\u5207\u6362\u6761\u4EF6\u8BD5\u8BD5\u5427",
      loadError: "\u53D1\u73B0\u65B0\u7684\u5185\u5BB9\uFF0C\u4F46\u52A0\u8F7D\u5931\u8D25\u4E86",
      retry: "\u7EE7\u7EED\u52A0\u8F7D",
      authorWorks: "\u4F5C\u8005\u4F5C\u54C1",
      relatedRecs: "\u76F8\u4F3C\u63A8\u8350",
      visitProfile: "\u8BBF\u95EE X \u4E3B\u9875",
      myBookmarks: "\u6211\u7684\u6536\u85CF",
      includeDownloaded: "\u5305\u542B\u5DF2\u4E0B\u8F7D",
      copyLinks: "\u590D\u5236\u89C6\u9891\u94FE\u63A5",
      copied: "\u5DF2\u590D\u5236!",
      noAuthorVideos: "\u8BE5\u4F5C\u8005\u5C1A\u672A\u53D1\u5E03\u5176\u4ED6\u89C6\u9891",
      noRelatedVideos: "\u6682\u65E0\u76F8\u5173\u63A8\u8350\u89C6\u9891",
      videoDeleted: "\u89C6\u9891\u5DF2\u88AB\u4F5C\u8005\u6216 Twitter \u5220\u9664",
      channelReal: "\u6B21\u5143\u5B9E\u5883",
      channelAnime: "\u4E8C\u6B21\u5143\u52A8\u6F2B",
      collapseSidebar: "\u6536\u8D77\u4FA7\u8FB9\u680F",
      expandSidebar: "\u5C55\u5F00\u4FA7\u8FB9\u680F",
      language: "\u8BED\u8A00\u5207\u6362",
      search: "\u641C\u7D22",
      filter: "\u7B5B\u9009",
      filter_range: "\u8303\u56F4",
      filter_sort: "\u6392\u5E8F",
      filter_duration: "\u65F6\u957F",
      filter_tag: "\u6807\u7B7E",
      filter_category: "\u5206\u7C7B",
      all: "\u5168\u90E8",
      errorTitle: "\u7F51\u7EDC\u94FE\u8DEF\u4E2D\u65AD",
      errorDesc: "\u8DE8\u8D8A\u6B21\u5143\u58C1\u7684\u8FC7\u7A0B\u9047\u5230\u4E86\u4E00\u70B9\u5E72\u6270",
      retryConnect: "\u91CD\u8BD5\u8FDE\u63A5",
      commentsTitle: "\u8BC4\u8BBA",
      commentPlaceholder: "\u8F93\u5165\u8BC4\u8BBA...",
      send: "\u53D1\u9001",
      authorProfileTitle: "\u535A\u4E3B\u4E3B\u9875 / \u63A8\u8350",
      viewOnTwitter: "\u5728 X.com (Twitter) \u67E5\u770B",
      speedTip: "\u23E9 \u957F\u6309\u52A0\u901F\u4E2D",
      actionBookmark: "\u6536\u85CF",
      actionProfile: "\u4E3B\u9875",
      actionDownload: "\u4E0B\u8F7D",
      daily: "\u65E5\u699C",
      weekly: "\u5468\u699C",
      monthly: "\u6708\u699C",
      yearly: "\u5E74\u699C",
      allTime: "\u603B\u699C",
      mostLiked: "\u6700\u591A\u559C\u6B22",
      mostViews: "\u6700\u591A\u64AD\u653E",
      recent: "\u6700\u65B0\u53D1\u5E03",
      threeDays: "3\u5929\u699C",
      recommended: "\u63A8\u8350\u6392\u884C",
      best: "\u7CBE\u54C1",
      rank: "\u6392\u884C",
      new: "\u65B0\u54C1",
      realtime: "\u5B9E\u65F6",
      trendingLabel: "\u8D8B\u52BF",
      gravure: "\u5199\u771F",
      underground: "\u91CC\u7AD9",
      onanism: "\u81EA\u6211\u6EE1\u8DB3",
      blowjob: "\u6DF1\u5589",
      cosplay: "\u89D2\u8272\u626E\u6F14",
      talent: "\u660E\u661F",
      random: "\u968F\u673A",
      allHot: "\u5168\u90E8\u70ED\u95E8",
      todayHot: "\u4ECA\u65E5\u70ED\u95E8",
      weekHot: "\u672C\u5468\u70ED\u95E8",
      monthHot: "\u672C\u6708\u70ED\u95E8",
      totalHot: "\u603B\u70ED\u95E8",
      longest: "\u65F6\u957F\u6700\u957F",
      oldest: "\u6700\u65E9\u53D1\u5E03",
      allDurations: "\u5168\u90E8\u65F6\u957F",
      shortDuration: "5\u5206\u949F\u5185",
      mediumDuration: "5-30\u5206\u949F",
      longDuration: "30\u5206\u949F\u4EE5\u4E0A",
      allTags: "\u5168\u90E8\u6807\u7B7E",
      tagAnime: "\u52A8\u6F2B\u4E8C\u6B21\u5143",
      tagJk: "\u5973\u9AD8\u4E2D\u751F",
      tagBigBoobs: "\u4E30\u6EE1\u80F8\u90E8",
      tagLoli: "\u5C11\u5973\u841D\u8389",
      tagShaved: "\u5149\u6ED1\u767D\u864E",
      tagBeautiful: "\u7F8E\u5C11\u5973",
      tagSelfie: "\u771F\u5B9E\u81EA\u62CD"
    },
    "zh-TW": {
      brand: "X-Flow",
      trending: "\u8DA8\u52E2\u63A2\u7D22",
      emptyTitle: "\u6D41\u5A92\u9AD4\u8352\u539F",
      emptyDesc: "\u7576\u524D\u983B\u9053\u6216\u7BC4\u570D\u5C1A\u672A\u7522\u751F\u6578\u64DA<br>\u8ACB\u5207\u63DB\u689D\u4EF6\u8A66\u8A66\u5427",
      loadError: "\u767C\u73FE\u65B0\u7684\u5167\u5BB9\uFF0C\u4F46\u52A0\u8F09\u5931\u6557\u4E86",
      retry: "\u7E7C\u7E8C\u52A0\u8F09",
      authorWorks: "\u4F5C\u8005\u4F5C\u54C1",
      relatedRecs: "\u76F8\u4F3C\u63A8\u85A6",
      visitProfile: "\u8A2A\u554F X \u4E3B\u9801",
      myBookmarks: "\u6211\u7684\u6536\u85CF",
      includeDownloaded: "\u5305\u542B\u5DF2\u4E0B\u8F09",
      copyLinks: "\u8907\u88FD\u5F71\u7247\u9023\u7D50",
      copied: "\u5DF2\u8907\u88FD!",
      noAuthorVideos: "\u8A72\u4F5C\u8005\u5C1A\u672A\u767C\u4F48\u5176\u4ED6\u8996\u983B",
      noRelatedVideos: "\u66AB\u7121\u76F8\u95DC\u63A8\u85A6\u8996\u983B",
      videoDeleted: "\u8996\u983B\u5DF2\u88AB\u4F5C\u8005\u6216 Twitter \u522A\u9664",
      channelReal: "\u6B21\u5143\u5BE6\u5883",
      channelAnime: "\u4E8C\u6B21\u5143\u52D5\u6F2B",
      collapseSidebar: "\u6536\u8D77\u5074\u908A\u6B04",
      expandSidebar: "\u5C55\u958B\u5074\u908A\u6B04",
      language: "\u8A9E\u8A00\u5207\u63DB",
      search: "\u641C\u5C0B",
      filter: "\u7BE9\u9078",
      filter_range: "\u7BC4\u570D",
      filter_sort: "\u6392\u5E8F",
      filter_duration: "\u6642\u9577",
      filter_tag: "\u6A19\u7C64",
      filter_category: "\u5206\u985E",
      all: "\u5168\u90E8",
      errorTitle: "\u7DB2\u7D61\u93C8\u8DEF\u4E2D\u65B7",
      errorDesc: "\u8DE8\u8D8A\u6B21\u5143\u58C1\u7684\u904E\u7A0B\u9047\u5230\u4E86\u4E00\u9EDE\u5E72\u64FE",
      retryConnect: "\u91CD\u8A66\u9023\u63A5",
      commentsTitle: "\u8A55\u8AD6",
      commentPlaceholder: "\u8F38\u5165\u8A55\u8AD6...",
      send: "\u767C\u9001",
      authorProfileTitle: "\u535A\u4E3B\u4E3B\u9801 / \u63A8\u85A6",
      viewOnTwitter: "\u5728 X.com (Twitter) \u67E5\u770B",
      speedTip: "\u23E9 \u9577\u6309\u52A0\u901F\u4E2D",
      actionBookmark: "\u6536\u85CF",
      actionProfile: "\u4E3B\u9801",
      actionDownload: "\u4E0B\u8F09",
      daily: "\u65E5\u699C",
      weekly: "\u5468\u699C",
      monthly: "\u6708\u699C",
      yearly: "\u5E74\u699C",
      allTime: "\u7E3D\u699C",
      mostLiked: "\u6700\u591A\u9EDE\u8B9A",
      mostViews: "\u6700\u591A\u64AD\u653E",
      recent: "\u6700\u65B0\u767C\u4F48",
      threeDays: "3\u5929\u699C",
      recommended: "\u63A8\u85A6\u6392\u884C",
      best: "\u7CBE\u54C1",
      rank: "\u6392\u884C",
      new: "\u65B0\u54C1",
      realtime: "\u5BE6\u6642",
      trendingLabel: "\u8DA8\u52E2",
      gravure: "\u5BEB\u771F",
      underground: "\u88CF\u7AD9",
      onanism: "\u81EA\u6211\u6EFF\u8DB3",
      blowjob: "\u6DF1\u5589",
      cosplay: "\u89D2\u8272\u626E\u6F14",
      talent: "\u660E\u661F",
      random: "\u96A8\u6A5F",
      allHot: "\u5168\u90E8\u71B1\u9580",
      todayHot: "\u4ECA\u65E5\u71B1\u9580",
      weekHot: "\u672C\u9031\u71B1\u9580",
      monthHot: "\u672C\u6708\u71B1\u9580",
      totalHot: "\u7E3D\u71B1\u9580",
      longest: "\u6642\u9577\u6700\u9577",
      oldest: "\u6700\u65E9\u767C\u4F48",
      allDurations: "\u5168\u90E8\u6642\u9577",
      shortDuration: "5\u5206\u9418\u5167",
      mediumDuration: "5-30\u5206\u9418",
      longDuration: "30\u5206\u9418\u4EE5\u4E0A",
      allTags: "\u5168\u90E8\u6A19\u7C64",
      tagAnime: "\u52D5\u6F2B\u4E8C\u6B21\u5143",
      tagJk: "\u5973\u9AD8\u4E2D\u751F",
      tagBigBoobs: "\u8C50\u6EFF\u80F8\u90E8",
      tagLoli: "\u5C11\u5973\u863F\u8389",
      tagShaved: "\u5149\u6ED1\u767D\u864E",
      tagBeautiful: "\u7F8E\u5C11\u5973",
      tagSelfie: "\u771F\u5BE6\u81EA\u62CD"
    },
    "ja": {
      brand: "X-Flow",
      trending: "\u30C8\u30EC\u30F3\u30C9\u63A2\u7D22",
      emptyTitle: "\u30B3\u30F3\u30C6\u30F3\u30C4\u304C\u3042\u308A\u307E\u305B\u3093",
      emptyDesc: "\u73FE\u5728\u306E\u30C1\u30E3\u30F3\u30CD\u30EB\u307E\u305F\u306F\u30D5\u30A3\u30EB\u30BF\u30FC\u306B\u306F\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093<br>\u4ED6\u306E\u6761\u4EF6\u3092\u8A66\u3057\u3066\u304F\u3060\u3055\u3044",
      loadError: "\u65B0\u3057\u3044\u30B3\u30F3\u30C6\u30F3\u30C4\u304C\u898B\u3064\u304B\u308A\u307E\u3057\u305F\u304C\u3001\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      retry: "\u518D\u8AAD\u307F\u8FBC\u307F",
      authorWorks: "\u6295\u7A3F\u8005\u306E\u52D5\u753B",
      relatedRecs: "\u95A2\u9023\u52D5\u753B",
      visitProfile: "X \u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u3078",
      myBookmarks: "\u30DE\u30A4\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF",
      includeDownloaded: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u6E08\u3092\u542B\u3080",
      copyLinks: "\u52D5\u753B\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC",
      copied: "\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F!",
      noAuthorVideos: "\u3053\u306E\u6295\u7A3F\u8005\u306E\u4ED6\u306E\u52D5\u753B\u306F\u3042\u308A\u307E\u305B\u3093",
      noRelatedVideos: "\u95A2\u9023\u52D5\u753B\u306F\u3042\u308A\u307E\u305B\u3093",
      videoDeleted: "\u52D5\u753B\u306F\u6295\u7A3F\u8005\u307E\u305F\u306F Twitter \u306B\u3088\u3063\u3066\u524A\u9664\u3055\u308C\u307E\u3057\u305F",
      channelReal: "\u30EA\u30A2\u30EB\u6B21\u5143",
      channelAnime: "\u30A2\u30CB\u30E1\u6B21\u5143",
      collapseSidebar: "\u30B5\u30A4\u30C9\u30D0\u30FC\u3092\u9589\u3058\u308B",
      expandSidebar: "\u30B5\u30A4\u30C9\u30D0\u30FC\u3092\u958B\u304F",
      language: "\u8A00\u8A9E\u5207\u66FF",
      search: "\u691C\u7D22",
      filter: "\u30D5\u30A3\u30EB\u30BF\u30FC",
      filter_range: "\u671F\u9593",
      filter_sort: "\u4E26\u3073\u66FF\u3048",
      filter_duration: "\u9577\u3055",
      filter_tag: "\u30BF\u30B0",
      filter_category: "\u30AB\u30C6\u30B4\u30EA",
      all: "\u3059\u3079\u3066",
      errorTitle: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u30A8\u30E9\u30FC",
      errorDesc: "\u30C7\u30FC\u30BF\u306E\u53D6\u5F97\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
      retryConnect: "\u518D\u8A66\u884C",
      commentsTitle: "\u30B3\u30E1\u30F3\u30C8",
      commentPlaceholder: "\u30B3\u30E1\u30F3\u30C8\u3092\u5165\u529B...",
      send: "\u9001\u4FE1",
      authorProfileTitle: "\u6295\u7A3F\u8005\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB / \u304A\u3059\u3059\u3081",
      viewOnTwitter: "X.com (Twitter) \u3067\u898B\u308B",
      speedTip: "\u23E9 \u9577\u62BC\u3057\u3067\u500D\u901F\u518D\u751F\u4E2D",
      actionBookmark: "\u304A\u6C17\u306B\u5165\u308A",
      actionProfile: "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB",
      actionDownload: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
      daily: "\u65E5\u699C",
      weekly: "\u9031\u699C",
      monthly: "\u6708\u9593",
      yearly: "\u5E74\u9593",
      allTime: "\u6BBF\u5802",
      mostLiked: "\u3044\u3044\u306D\u9806",
      mostViews: "\u518D\u751F\u6570\u9806",
      recent: "\u6700\u65B0\u6295\u7A3F",
      threeDays: "3\u65E5\u9593",
      recommended: "\u304A\u3059\u3059\u3081",
      best: "\u30D9\u30B9\u30C8",
      rank: "\u30E9\u30F3\u30AD\u30F3\u30B0",
      new: "\u65B0\u4F5C",
      realtime: "\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0",
      trendingLabel: "\u30C8\u30EC\u30F3\u30C9",
      gravure: "\u30B0\u30E9\u30D3\u30A2",
      underground: "\u88CF\u57A2",
      onanism: "\u30AA\u30CA\u30CB\u30FC",
      blowjob: "\u30D5\u30A7\u30E9",
      cosplay: "\u30B3\u30B9\u30D7\u30EC",
      talent: "\u30BF\u30EC\u30F3\u30C8",
      random: "\u30E9\u30F3\u30C0\u30E0",
      allHot: "\u3059\u3079\u3066\u306E\u4EBA\u6C17",
      todayHot: "\u672C\u65E5\u306E\u4EBA\u6C17",
      weekHot: "\u4ECA\u9031\u306E\u4EBA\u6C17",
      monthHot: "\u4ECA\u6708\u306E\u4EBA\u6C17",
      totalHot: "\u7DCF\u5408\u4EBA\u6C17",
      longest: "\u6700\u9577\u52D5\u753B",
      oldest: "\u6700\u3082\u53E4\u3044",
      allDurations: "\u3059\u3079\u3066\u306E\u9577\u3055",
      shortDuration: "5\u5206\u4EE5\u5185",
      mediumDuration: "5-30\u5206",
      longDuration: "30\u5206\u4EE5\u4E0A",
      allTags: "\u3059\u3079\u3066\u306E\u30BF\u30B0",
      tagAnime: "\u30A2\u30CB\u30E1",
      tagJk: "\u5973\u5B50\u9AD8\u751F",
      tagBigBoobs: "\u5DE8\u4E73",
      tagLoli: "\u30ED\u30EA",
      tagShaved: "\u30D1\u30A4\u30D1\u30F3",
      tagBeautiful: "\u7F8E\u5C11\u5973",
      tagSelfie: "\u81EA\u64AE\u308A"
    },
    "ko": {
      brand: "X-Flow",
      trending: "\uD2B8\uB80C\uB4DC \uD0D0\uC0C9",
      emptyTitle: "\uCF58\uD150\uCE20\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
      emptyDesc: "\uD604\uC7AC \uCC44\uB110 \uB610\uB294 \uD544\uD130\uC5D0 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4<br>\uB2E4\uB978 \uC870\uAC74\uC744 \uC120\uD0DD\uD574 \uBCF4\uC138\uC694",
      loadError: "\uC0C8\uB85C\uC6B4 \uCF58\uD150\uCE20\uB97C \uCC3E\uC558\uC73C\uB098 \uB85C\uB4DC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
      retry: "\uB2E4\uC2DC \uC2DC\uB3C4",
      authorWorks: "\uC791\uC131\uC790 \uB3D9\uC601\uC0C1",
      relatedRecs: "\uCD94\uCC9C \uB3D9\uC601\uC0C1",
      visitProfile: "X \uD504\uB85C\uD544 \uBC29\uBB38",
      myBookmarks: "\uB9C8\uC774 \uBD81\uB9C8\uD06C",
      includeDownloaded: "\uB2E4\uC6B4\uB85C\uB4DC \uC644\uB8CC \uD3EC\uD568",
      copyLinks: "\uBE44\uB514\uC624 \uB9C1\uD06C \uBCF5\uC0AC",
      copied: "\uBCF5\uC0AC \uC644\uB8CC!",
      noAuthorVideos: "\uC774 \uC791\uC131\uC790\uC758 \uB2E4\uB978 \uB3D9\uC601\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
      noRelatedVideos: "\uAD00\uB828 \uCD94\uCC9C \uB3D9\uC601\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
      videoDeleted: "\uB3D9\uC601\uC0C1\uC774 \uC791\uC131\uC790 \uB610\uB294 Twitter\uC5D0 \uC758\uD574 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
      channelReal: "\uB9AC\uC5BC \uCC44\uB110",
      channelAnime: "\uC560\uB2C8 \uCC44\uB110",
      collapseSidebar: "\uC0AC\uC774\uB4DC\uBC14 \uC811\uAE30",
      expandSidebar: "\uC0AC\uC774\uB4DC\uBC14 \uD3BC\uCE58\uAE30",
      language: "\uC5B8\uC5B4 \uBCC0\uACBD",
      search: "\uAC80\uC0C9",
      filter: "\uD544\uD130",
      filter_range: "\uAE30\uAC04",
      filter_sort: "\uC815\uB82C",
      filter_duration: "\uC7AC\uC0DD \uC2DC\uAC04",
      filter_tag: "\uD0DC\uADF8",
      filter_category: "\uCE74\uD14C\uACE0\uB9AC",
      all: "\uC804\uCCB4",
      errorTitle: "\uB124\uD2B8\uC6CC\uD06C \uC624\uB958",
      errorDesc: "\uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4",
      retryConnect: "\uC7AC\uC2DC\uB3C4",
      commentsTitle: "\uB313\uAE00",
      commentPlaceholder: "\uB313\uAE00 \uC785\uB825...",
      send: "\uC804\uC1A1",
      authorProfileTitle: "\uC791\uC131\uC790 \uD504\uB85C\uD544 / \uCD94\uCC9C",
      viewOnTwitter: "X.com (Twitter) \uC5D0\uC11C \uBCF4\uAE30",
      speedTip: "\u23E9 \uAE38\uAC8C \uB204\uB974\uBA74 \uBC30\uC18D \uC7AC\uC0DD",
      actionBookmark: "\uBD81\uB9C8\uD06C",
      actionProfile: "\uD504\uB85C\uD544",
      actionDownload: "\uB2E4\uC6B4\uB85C\uB4DC",
      daily: "\uC77C\uAC04",
      weekly: "\uC8FC\uAC04",
      monthly: "\uC6D4\uAC04",
      yearly: "\uC5F0\uAC04",
      allTime: "\uC804\uCCB4",
      mostLiked: "\uC88B\uC544\uC694 \uC21C",
      mostViews: "\uC870\uD68C\uC218 \uC21C",
      recent: "\uCD5C\uC2E0 \uB4F1\uB85D",
      threeDays: "3\uC77C\uAC04",
      recommended: "\uCD94\uCC9C \uB7AD\uD0B9",
      best: "\uBCA0\uC2A4\uD2B8",
      rank: "\uB7AD\uD0B9",
      new: "\uC2E0\uC791",
      realtime: "\uC2E4\uC2DC\uAC04",
      trendingLabel: "\uD2B8\uB80C\uB4DC",
      gravure: "\uD654\uBCF4",
      underground: "\uBE44\uACF5\uAC1C",
      onanism: "\uC194\uB85C",
      blowjob: "\uD3A0\uB77C",
      cosplay: "\uCF54\uC2A4\uD504\uB808",
      talent: "\uC5F0\uC608\uC778",
      random: "\uB79C\uB364",
      allHot: "\uC804\uCCB4 \uC778\uAE30",
      todayHot: "\uC624\uB298 \uC778\uAE30",
      weekHot: "\uC774\uBC88 \uC8FC \uC778\uAE30",
      monthHot: "\uC774\uBC88 \uB2EC \uC778\uAE30",
      totalHot: "\uC885\uD569 \uC778\uAE30",
      longest: "\uAC00\uC7A5 \uAE34 \uC601\uC0C1",
      oldest: "\uAC00\uC7A5 \uC624\uB798\uB41C",
      allDurations: "\uBAA8\uB4E0 \uC2DC\uAC04",
      shortDuration: "5\uBD84 \uC774\uB0B4",
      mediumDuration: "5-30\uBD84",
      longDuration: "30\uBD84 \uC774\uC0C1",
      allTags: "\uBAA8\uB4E0 \uD0DC\uADF8",
      tagAnime: "\uC560\uB2C8\uBA54\uC774\uC158",
      tagJk: "\uC5EC\uACE0\uC0DD",
      tagBigBoobs: "\uD48D\uB9CC\uD55C \uAC00\uC2B4",
      tagLoli: "\uB85C\uB9AC",
      tagShaved: "\uC81C\uBAA8",
      tagBeautiful: "\uBBF8\uC18C\uB140",
      tagSelfie: "\uC140\uCE74"
    },
    "en": {
      brand: "X-Flow",
      trending: "Trending Now",
      emptyTitle: "No Content Found",
      emptyDesc: "No media matches the current filters.<br>Please select another category.",
      loadError: "Discovered new content, but failed to load.",
      retry: "Load More",
      authorWorks: "Author Works",
      relatedRecs: "Related Videos",
      visitProfile: "Visit X Profile",
      myBookmarks: "My Library",
      includeDownloaded: "Include Downloaded",
      copyLinks: "Copy Links",
      copied: "Copied!",
      noAuthorVideos: "No other videos from this author",
      noRelatedVideos: "No related recommendations",
      videoDeleted: "This video has been deleted by the author or Twitter",
      channelReal: "Real Channel",
      channelAnime: "Anime Channel",
      collapseSidebar: "Collapse Sidebar",
      expandSidebar: "Expand Sidebar",
      language: "Language",
      search: "Search",
      filter: "Filter",
      filter_range: "Period",
      filter_sort: "Sort",
      filter_duration: "Duration",
      filter_tag: "Tags",
      filter_category: "Category",
      all: "All",
      errorTitle: "Network Error",
      errorDesc: "Something went wrong while retrieving content.",
      retryConnect: "Retry Connection",
      commentsTitle: "Comments",
      commentPlaceholder: "Write a comment...",
      send: "Send",
      authorProfileTitle: "Profile & Recommendations",
      viewOnTwitter: "View on X.com (Twitter)",
      speedTip: "\u23E9 Long-press to speed up",
      actionBookmark: "Bookmark",
      actionProfile: "Profile",
      actionDownload: "Download",
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
      allTime: "All-Time",
      mostLiked: "Most Liked",
      mostViews: "Most Viewed",
      recent: "Latest",
      threeDays: "3 Days",
      recommended: "Recommended",
      best: "Featured",
      rank: "Ranked",
      new: "New Releases",
      realtime: "Real-Time",
      trendingLabel: "Trending",
      gravure: "Gravure",
      underground: "Underground",
      onanism: "Solo",
      blowjob: "Blowjob",
      cosplay: "Cosplay",
      talent: "Talent",
      random: "Random",
      allHot: "All Popular",
      todayHot: "Today's Hot",
      weekHot: "Weekly Hot",
      monthHot: "Monthly Hot",
      totalHot: "Total Hot",
      longest: "Longest",
      oldest: "Oldest",
      allDurations: "All Durations",
      shortDuration: "Under 5m",
      mediumDuration: "5-30m",
      longDuration: "Over 30m",
      allTags: "All Tags",
      tagAnime: "Anime",
      tagJk: "High School",
      tagBigBoobs: "Big Breasts",
      tagLoli: "Loli",
      tagShaved: "Shaved",
      tagBeautiful: "Beautiful",
      tagSelfie: "Selfie"
    },
    "vi": {
      brand: "X-Flow",
      trending: "Xu H\u01B0\u1EDBng M\u1EDBi",
      emptyTitle: "Kh\xF4ng C\xF3 N\u1ED9i Dung",
      emptyDesc: "Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u cho b\u1ED9 l\u1ECDc hi\u1EC7n t\u1EA1i.<br>Vui l\xF2ng th\u1EED \u0111i\u1EC1u ki\u1EC7n kh\xE1c.",
      loadError: "Ph\xE1t hi\u1EC7n n\u1ED9i dung m\u1EDBi nh\u01B0ng t\u1EA3i th\u1EA5t b\u1EA1i.",
      retry: "T\u1EA3i L\u1EA1i",
      authorWorks: "Video T\xE1c Gi\u1EA3",
      relatedRecs: "Video Li\xEAn Quan",
      visitProfile: "Xem Trang C\xE1 Nh\xE2n X",
      myBookmarks: "Th\u01B0 vi\u1EC7n",
      includeDownloaded: "G\u1ED3m \u0111\xE3 t\u1EA3i",
      copyLinks: "Sao ch\xE9p li\xEAn k\u1EBFt",
      copied: "\u0110\xE3 sao ch\xE9p!",
      noAuthorVideos: "Kh\xF4ng c\xF3 video n\xE0o kh\xE1c t\u1EEB t\xE1c gi\u1EA3 n\xE0y",
      noRelatedVideos: "Kh\xF4ng c\xF3 \u0111\u1EC1 xu\u1EA5t li\xEAn quan",
      videoDeleted: "Video n\xE0y \u0111\xE3 b\u1ECB x\xF3a b\u1EDFi t\xE1c gi\u1EA3 ho\u1EB7c Twitter",
      channelReal: "K\xEAnh \u0110\u1EDDi Th\u1EF1c",
      channelAnime: "K\xEAnh Ho\u1EA1t H\xECnh",
      collapseSidebar: "Thu g\u1ECDn thanh b\xEAn",
      expandSidebar: "M\u1EDF r\u1ED9ng thanh b\xEAn",
      language: "Ng\xF4n ng\u1EEF",
      search: "T\xECm ki\u1EBFm",
      filter: "B\u1ED9 l\u1ECDc",
      filter_range: "Kho\u1EA3ng th\u1EDDi gian",
      filter_sort: "S\u1EAFp x\u1EBFp",
      filter_duration: "Th\u1EDDi l\u01B0\u1EE3ng",
      filter_tag: "Th\u1EBB",
      filter_category: "Danh m\u1EE5c",
      all: "T\u1EA5t c\u1EA3",
      errorTitle: "L\u1ED7i K\u1EBFt N\u1ED1i",
      errorDesc: "\u0110\xE3 x\u1EA3y ra l\u1ED7i trong qu\xE1 tr\xECnh t\u1EA3i d\u1EEF li\u1EC7u.",
      retryConnect: "Th\u1EED L\u1EA1i",
      commentsTitle: "B\xECnh lu\u1EADn",
      commentPlaceholder: "Vi\u1EBFt b\xECnh lu\u1EADn...",
      send: "G\u1EEDi",
      authorProfileTitle: "Trang C\xE1 Nh\xE2n & G\u1EE3i \xDD",
      viewOnTwitter: "Xem tr\xEAn X.com (Twitter)",
      speedTip: "\u23E9 Nh\u1EA5n gi\u1EEF \u0111\u1EC3 t\u0103ng t\u1ED1c",
      actionBookmark: "L\u01B0u",
      actionProfile: "C\xE1 nh\xE2n",
      actionDownload: "T\u1EA3i xu\u1ED1ng",
      daily: "24 Gi\u1EDD",
      weekly: "H\xE0ng Tu\u1EA7n",
      monthly: "H\xE0ng Th\xE1ng",
      yearly: "H\xE0ng N\u0103m",
      allTime: "To\xE0n B\u1ED9",
      mostLiked: "Nhi\u1EC1u Th\xEDch Nh\u1EA5t",
      mostViews: "Xem Nhi\u1EC1u Nh\u1EA5t",
      recent: "M\u1EDBi Nh\u1EA5t",
      threeDays: "3 Ng\xE0y",
      recommended: "G\u1EE3i \xDD",
      best: "Tuy\u1EC3n Ch\u1ECDn",
      rank: "X\u1EBFp H\u1EA1ng",
      new: "M\u1EDBi Ph\xE1t H\xE0nh",
      realtime: "Th\u1EDDi Gian Th\u1EF1c",
      trendingLabel: "Xu H\u01B0\u1EDBng",
      gravure: "Nhi\u1EBFp \u1EA2nh",
      underground: "K\xEAnh \u1EA8n",
      onanism: "Solo",
      blowjob: "Blowjob",
      cosplay: "Cosplay",
      talent: "N\u1ED5i Ti\u1EBFng",
      random: "Ng\u1EABu Nhi\xEAn",
      allHot: "T\u1EA5t C\u1EA3 N\u1ED5i B\u1EADt",
      todayHot: "N\u1ED5i B\u1EADt H\xF4m Nay",
      weekHot: "N\u1ED5i B\u1EADt Tu\u1EA7n N\xE0y",
      monthHot: "N\u1ED5i B\u1EADt Th\xE1ng N\xE0y",
      totalHot: "T\u1ED5ng N\u1ED5i B\u1EADt",
      longest: "D\xE0i Nh\u1EA5t",
      oldest: "C\u0169 Nh\u1EA5t",
      allDurations: "M\u1ECDi Th\u1EDDi L\u01B0\u1EE3ng",
      shortDuration: "D\u01B0\u1EDBi 5 ph\xFAt",
      mediumDuration: "5-30 ph\xFAt",
      longDuration: "Tr\xEAn 30 ph\xFAt",
      allTags: "T\u1EA5t C\u1EA3 Th\u1EBB",
      tagAnime: "Ho\u1EA1t Hinh",
      tagJk: "N\u1EEF Sinh",
      tagBigBoobs: "Ng\u1EF1c Kh\u1EE7ng",
      tagLoli: "Loli",
      tagShaved: "C\u1EA1o S\u1EA1ch",
      tagBeautiful: "G\xE1i Xinh",
      tagSelfie: "T\u1EF1 Ch\u1EE5p"
    }
  };
  const LANG_NAMES = {
    "zh-CN": "\u7B80\u4F53\u4E2D\u6587",
    "zh-TW": "\u7E41\u9AD4\u4E2D\u6587",
    "ja": "\u65E5\u672C\u8A9E",
    "ko": "\uD55C\uAD6D\uC5B4",
    "en": "English",
    "vi": "Ti\u1EBFng Vi\u1EC7t"
  };
  const LABEL_KEY_MAP = {
    "\u65E5\u699C": "daily",
    "24\u5C0F\u65F6": "daily",
    "24\u5C0F\u65F6\u699C": "daily",
    "\u5468\u699C": "weekly",
    "1\u5468": "weekly",
    "7\u5929": "weekly",
    "7\u5929\u699C": "weekly",
    "\u6708\u699C": "monthly",
    "1\u4E2A\u6708": "monthly",
    "30\u5929": "monthly",
    "30\u5929\u699C": "monthly",
    "\u5E74\u699C": "yearly",
    "1\u5E74": "yearly",
    "\u603B\u699C": "allTime",
    "\u6BBF\u5802": "allTime",
    "\u6700\u591A\u559C\u6B22": "mostLiked",
    "\u6700\u591A\u70B9\u8D5E": "mostLiked",
    "\u6700\u591A\u64AD\u653E": "mostViews",
    "\u6781\u9AD8\u64AD\u653E": "mostViews",
    "\u7EFC\u5408\u6392\u884C": "mostViews",
    "\u6700\u65B0": "recent",
    "\u6700\u65B0\u53D1\u5E03": "recent",
    "\u6700\u65B0\u89C6\u9891": "recent",
    "3\u5929\u699C": "threeDays",
    "\u63A8\u8350": "recommended",
    "\u63A8\u8350\u6392\u884C": "recommended",
    "\u7CBE\u54C1": "best",
    "\u6392\u884C": "rank",
    "\u65B0\u54C1": "new",
    "\u5B9E\u65F6": "realtime",
    "\u5B9E\u65F6\u6392\u884C": "realtime",
    "\u8BDD\u9898": "trendingLabel",
    "\u5199\u771F": "gravure",
    "\u91CC\u7AD9": "underground",
    "\u81EA\u6211\u6EE1\u8DB3": "onanism",
    "\u6DF1\u5589": "blowjob",
    "\u89D2\u8272\u626E\u6F14": "cosplay",
    "\u660E\u661F": "talent",
    "\u968F\u673A": "random",
    "\u5168\u90E8\u70ED\u95E8": "allHot",
    "\u4ECA\u65E5\u70ED\u95E8": "todayHot",
    "\u672C\u5468\u70ED\u95E8": "weekHot",
    "\u672C\u6708\u70ED\u95E8": "monthHot",
    "\u603B\u70ED\u95E8": "totalHot",
    "\u64AD\u653E\u6700\u591A": "mostViews",
    "\u65F6\u957F\u6700\u957F": "longest",
    "\u6700\u65E9\u53D1\u5E03": "oldest",
    "\u5168\u90E8\u65F6\u957F": "allDurations",
    "5 \u5206\u949F\u5185": "shortDuration",
    "5-30 \u5206\u949F": "mediumDuration",
    "30 \u5206\u949F\u4EE5\u4E0A": "longDuration",
    "\u5168\u90E8\u6807\u7B7E": "allTags",
    "\u52A8\u6F2B\u4E8C\u6B21\u5143": "tagAnime",
    "\u5973\u9AD8\u4E2D\u751F": "tagJk",
    "\u4E30\u6EE1\u80F8\u90E8": "tagBigBoobs",
    "\u5C11\u5973\u841D\u8389": "tagLoli",
    "\u5149\u6ED1\u767D\u864E": "tagShaved",
    "\u7F8E\u5C11\u5973": "tagBeautiful",
    "\u771F\u5B9E\u81EA\u62CD": "tagSelfie"
  };
  let currentLang = "en";
  function initI18n() {
    const saved = loadGM("xflow_language", "");
    if (saved && TRANSLATIONS[saved]) {
      currentLang = saved;
      return;
    }
    const navLangs = navigator.languages || [navigator.language];
    for (const lang of navLangs) {
      const clean = lang.toLowerCase();
      if (clean.startsWith("zh-cn") || clean === "zh" || clean.startsWith("zh-sg")) {
        currentLang = "zh-CN";
        return;
      }
      if (clean.startsWith("zh-tw") || clean.startsWith("zh-hk") || clean.startsWith("zh-mo")) {
        currentLang = "zh-TW";
        return;
      }
      if (clean.startsWith("ja")) {
        currentLang = "ja";
        return;
      }
      if (clean.startsWith("ko")) {
        currentLang = "ko";
        return;
      }
      if (clean.startsWith("vi")) {
        currentLang = "vi";
        return;
      }
    }
    currentLang = "en";
  }
  function getLang() {
    return currentLang;
  }
  function setLang(lang) {
    if (TRANSLATIONS[lang]) {
      currentLang = lang;
      saveGM("xflow_language", lang);
    }
  }
  function t(key) {
    return TRANSLATIONS[currentLang][key] ?? TRANSLATIONS["en"][key] ?? key;
  }
  function tLabel(label) {
    const clean = label.trim();
    const key = LABEL_KEY_MAP[clean];
    if (key) {
      return t(key);
    }
    return clean;
  }
  const DEFAULT_FILTER_GROUPS = [
    {
      id: "range",
      title: "\u6392\u884C\u8303\u56F4",
      type: "range",
      options: [
        { id: "daily", label: "\u65E5\u699C", icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>` },
        { id: "weekly", label: "\u5468\u699C", icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>` },
        { id: "monthly", label: "\u6708\u699C", icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>` },
        { id: "all", label: "\u603B\u699C", icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` }
      ]
    },
    {
      id: "sort",
      title: "\u6392\u5E8F",
      type: "sort",
      options: [
        { id: "favorite", label: "\u6700\u591A\u559C\u6B22", icon: `<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` },
        { id: "pv", label: "\u6781\u9AD8\u64AD\u653E", icon: `<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>` },
        { id: "recent", label: "\u6700\u65B0\u53D1\u5E03", icon: `<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>` }
      ]
    }
  ];
  const getGroupTitle = (group) => {
    const i18nKey = `filter_${group.id}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
    return tLabel(group.title);
  };
  const Components = {
    getSidebarHTML(filters = DEFAULT_FILTER_GROUPS, activeParams = {}, isBookmarksActive = false) {
      var _a;
      const primaryGroup = filters[0] || DEFAULT_FILTER_GROUPS[0];
      const activeId = isBookmarksActive ? null : activeParams[primaryGroup.id] || ((_a = primaryGroup.options[0]) == null ? void 0 : _a.id);
      const itemsHtml = primaryGroup.options.map((opt) => {
        const activeClass = opt.id === activeId ? "active" : "";
        const icon = opt.icon || `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
        return `
                <button type="button" class="nav-item ${activeClass}" 
                        data-filter-group="${primaryGroup.id}" 
                        data-filter-value="${opt.id}" 
                        tabindex="0">
                    ${icon}
                    <span class="nav-item-label">${tLabel(opt.label)}</span>
                </button>
            `;
      }).join("");
      return `
            <aside class="sidebar">
                <div class="sidebar-head">
                    <div class="brand">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="url(#brand-grad)" aria-hidden="true"><defs><linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00F0FF"/><stop offset="100%" stop-color="#FF1053"/></linearGradient></defs><path d="M12 2L2 22h20L12 2zm0 6l6 12H6l6-12z"/></svg>
                        <span class="brand-text">${t("brand")}</span>
                    </div>
                    <button type="button" class="sidebar-toggle-btn" id="sidebar-toggle-btn" aria-label="${t("collapseSidebar")}" aria-expanded="true" title="${t("collapseSidebar")}">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                    </button>
                </div>
                <nav class="nav-group" aria-label="${getGroupTitle(primaryGroup)}">
                    <div class="nav-title">${getGroupTitle(primaryGroup)}</div>
                    <div class="nav-items-scroll">${itemsHtml}</div>
                </nav>
                <div class="sidebar-divider" style="height: 1px; background: rgba(255,255,255,0.06); margin: 12px 16px;"></div>
                <nav class="nav-group" aria-label="Library">
                    <button type="button" class="nav-item ${isBookmarksActive ? "active" : ""}" id="my-bookmarks-btn" tabindex="0">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15-5-2.18L7 18V5h10v13z"/></svg>
                        <span class="nav-item-label">${t("myBookmarks")}</span>
                    </button>
                </nav>
            </aside>
        `;
    },
    getSiteSwitchHTML() {
      const sites = [
        { name: "Pektino", url: "https://pektino.com" },
        { name: "TwiHub", url: "https://twihub.net" },
        { name: "TwiKeep", url: "https://www.twikeep.com" },
        { name: "TwiIdol", url: "https://www.twiidol.com" },
        { name: "Twiigle", url: "https://twiigle.com" },
        { name: "Monsnode", url: "https://monsnode.com" },
        { name: "TwiVideo", url: "https://twivideo.net" },
        { name: "\u5C0F\u9EC4\u9E1F", url: "https://xiaohuangniao.me" },
        { name: "TwiDouga", url: "https://www.twidouga.net" },
        { name: "JavTwi", url: "https://javtwi.com" },
        { name: "XHotVideo", url: "https://xhotvideo.com" },
        { name: "UraakaTimes", url: "https://uraaka-times.com" }
      ];
      const hostname = window.location.hostname;
      const isMatch = (s) => {
        const domain = s.url.replace("https://", "").replace("www.", "");
        if (s.name === "Pektino") {
          return hostname.includes("pektino.com") || hostname.includes("x-ero-anime.com") || hostname.includes("truvaze.com") || hostname.includes("twitter-ero-video-ranking.com");
        }
        return hostname.includes(domain);
      };
      const currentSite = sites.find(isMatch);
      const currentSiteName = currentSite ? currentSite.name : "Pektino";
      const listItems = sites.map((s) => {
        const isActive = isMatch(s);
        return `<a href="${s.url}" class="site-dd-item ${isActive ? "active" : ""}" target="_blank" rel="noopener">${s.name}</a>`;
      }).join("");
      return `
            <div class="site-switch-wrap" id="site-switch-wrap">
                <button type="button" class="site-switch-btn" id="site-switch-btn" aria-label="Switch Site">
                    <svg class="switch-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0-2-.9-2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                    <span class="switch-label">${currentSiteName}</span>
                    <svg class="arrow-icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                </button>
                <div class="site-switch-dropdown" id="site-switch-dropdown">
                    ${listItems}
                </div>
            </div>
        `;
    },
    getLangSwitchHTML() {
      const lang = getLang();
      const langName = LANG_NAMES[lang];
      const listItems = Object.keys(LANG_NAMES).map((l) => {
        const isActive = l === lang;
        return `<button type="button" class="site-dd-item ${isActive ? "active" : ""}" data-lang="${l}">${LANG_NAMES[l]}</button>`;
      }).join("");
      return `
            <div class="site-switch-wrap lang-switch-wrap" id="lang-switch-wrap">
                <button type="button" class="site-switch-btn lang-icon-btn" id="lang-switch-btn" aria-label="Switch Language" title="${langName}">
                    <svg class="switch-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin: 0;"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
                </button>
                <div class="site-switch-dropdown" id="lang-switch-dropdown">
                    ${listItems}
                </div>
            </div>
        `;
    },
    getTopBarHTML(isAnimeActive = false, filters = DEFAULT_FILTER_GROUPS, activeParams = {}) {
      var _a, _b, _c;
      const primaryGroup = filters[0];
      let primaryActiveId = "";
      let mobileRangeItems = "";
      if (primaryGroup) {
        primaryActiveId = activeParams[primaryGroup.id] || ((_a = primaryGroup.options[0]) == null ? void 0 : _a.id);
        mobileRangeItems = primaryGroup.options.map((opt) => {
          const activeClass = opt.id === primaryActiveId ? "active" : "";
          return `<button type="button" class="mobile-dd-item ${activeClass}" data-filter-group="${primaryGroup.id}" data-filter-value="${opt.id}">${tLabel(opt.label)}</button>`;
        }).join("");
      }
      const secondaryGroup = filters[1];
      let desktopSecondaryHtml = "";
      if (secondaryGroup) {
        const secActiveId = activeParams[secondaryGroup.id] || ((_b = secondaryGroup.options[0]) == null ? void 0 : _b.id);
        desktopSecondaryHtml = `<div class="sort-filters" role="group" aria-label="Sort options">`;
        desktopSecondaryHtml += secondaryGroup.options.map((opt) => {
          const activeClass = opt.id === secActiveId ? "active" : "";
          const icon = opt.icon || "";
          return `
                    <button type="button" class="sort-btn ${activeClass}" 
                            data-filter-group="${secondaryGroup.id}" 
                            data-filter-value="${opt.id}" 
                            tabindex="0">
                        ${icon} ${tLabel(opt.label)}
                    </button>
                `;
        }).join("");
        desktopSecondaryHtml += `</div>`;
      }
      let mobileSortItems = "";
      if (filters[1]) {
        const group = filters[1];
        const activeId = activeParams[group.id] || ((_c = group.options[0]) == null ? void 0 : _c.id);
        mobileSortItems += `<div style="font-size: 11px; color: var(--text-400); padding: 8px 16px 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${getGroupTitle(group)}</div>`;
        mobileSortItems += group.options.map((opt) => {
          const activeClass = opt.id === activeId ? "active" : "";
          return `<button type="button" class="mobile-dd-item ${activeClass}" data-filter-group="${group.id}" data-filter-value="${opt.id}">${tLabel(opt.label)}</button>`;
        }).join("");
      }
      const siteSwitchHtml = Components.getSiteSwitchHTML();
      const langSwitchHtml = Components.getLangSwitchHTML();
      return `
            <header class="topbar">
                <div class="pulse-wave" id="topbar-pulse"></div>
                <div class="topbar-left">
                    ${siteSwitchHtml}
                    ${langSwitchHtml}
                </div>
                <div class="topbar-center">
                    ${primaryGroup ? `
                    <div class="mobile-menu-btn-wrap" id="range-menu-wrap">
                        <button type="button" class="mobile-circle-btn" id="mobile-range-btn" aria-label="${getGroupTitle(primaryGroup)}" aria-expanded="false">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>
                        </button>
                        <div class="mobile-dropdown" id="range-dropdown">
                            ${mobileRangeItems}
                        </div>
                    </div>
                    ` : ""}
                    <div class="mobile-switches-row">
                        ${siteSwitchHtml}
                        ${langSwitchHtml}
                    </div>
                    ${mobileSortItems ? `
                    <div class="mobile-menu-btn-wrap" id="sort-menu-wrap">
                        <button type="button" class="mobile-circle-btn" id="mobile-sort-btn" aria-label="${t("filter_sort")}" aria-expanded="false">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
                        </button>
                        <div class="mobile-dropdown" id="sort-dropdown" style="max-height: 70dvh; overflow-y: auto;">
                            ${mobileSortItems}
                        </div>
                    </div>` : ""}
                </div>
                ${desktopSecondaryHtml}
            </header>
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
    if (num >= 1e8) return (num / 1e8).toFixed(1).replace(/\.0$/, "") + "\u4EBF";
    if (num >= 1e4) return (num / 1e4).toFixed(1).replace(/\.0$/, "") + "\u4E07";
    return String(num || 0);
  }
  function showConfirmModal(title, message, onConfirm, onCancel) {
    var _a, _b;
    const overlay = document.createElement("div");
    overlay.className = "xflow-confirm-overlay";
    overlay.innerHTML = `
        <div class="xflow-confirm-modal">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="xflow-confirm-actions">
                <button type="button" class="xflow-confirm-btn cancel-btn" id="confirm-cancel">\u5426</button>
                <button type="button" class="xflow-confirm-btn confirm-btn" id="confirm-ok">\u662F</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.offsetHeight;
    overlay.classList.add("show");
    const cleanup = () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 300);
    };
    (_a = overlay.querySelector("#confirm-ok")) == null ? void 0 : _a.addEventListener("click", () => {
      onConfirm();
      cleanup();
    });
    (_b = overlay.querySelector("#confirm-cancel")) == null ? void 0 : _b.addEventListener("click", () => {
      if (onCancel) onCancel();
      cleanup();
    });
  }
  const Dom =  Object.freeze( Object.defineProperty({
    __proto__: null,
    showConfirmModal
  }, Symbol.toStringTag, { value: "Module" }));
  const scriptRel = function detectScriptRel() {
    const relList = typeof document !== "undefined" && document.createElement("link").relList;
    return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
  }();
  const assetsURL = function(dep) {
    return "/" + dep;
  };
  const seen = {};
  const __vitePreload = function preload(baseModule, deps, importerUrl) {
    let promise = Promise.resolve();
    if (deps && deps.length > 0) {
      document.getElementsByTagName("link");
      const cspNonceMeta = document.querySelector(
        "meta[property=csp-nonce]"
      );
      const cspNonce = (cspNonceMeta == null ? void 0 : cspNonceMeta.nonce) || (cspNonceMeta == null ? void 0 : cspNonceMeta.getAttribute("nonce"));
      promise = Promise.allSettled(
        deps.map((dep) => {
          dep = assetsURL(dep);
          if (dep in seen) return;
          seen[dep] = true;
          const isCss = dep.endsWith(".css");
          const cssSelector = isCss ? '[rel="stylesheet"]' : "";
          if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
            return;
          }
          const link = document.createElement("link");
          link.rel = isCss ? "stylesheet" : scriptRel;
          if (!isCss) {
            link.as = "script";
          }
          link.crossOrigin = "";
          link.href = dep;
          if (cspNonce) {
            link.setAttribute("nonce", cspNonce);
          }
          document.head.appendChild(link);
          if (isCss) {
            return new Promise((res, rej) => {
              link.addEventListener("load", res);
              link.addEventListener(
                "error",
                () => rej(new Error(`Unable to preload CSS for ${dep}`))
              );
            });
          }
        })
      );
    }
    function handlePreloadError(err) {
      const e = new Event("vite:preloadError", {
        cancelable: true
      });
      e.payload = err;
      window.dispatchEvent(e);
      if (!e.defaultPrevented) {
        throw err;
      }
    }
    return promise.then((res) => {
      for (const item of res || []) {
        if (item.status !== "rejected") continue;
        handlePreloadError(item.reason);
      }
      return baseModule().catch(handlePreloadError);
    });
  };
  class VirtualList {
    constructor() {
      this.container = document.createElement("div");
      this.container.className = "vl-container";
      this.container.style.cssText = "position: absolute; inset: 0; overflow: hidden; touch-action: pan-x; background: #000; z-index: 10; overflow-anchor: none; contain: layout size style; height: 100dvh;";
      this.nodes = [];
      for (let i = 0; i < 5; i++) {
        const node = document.createElement("div");
        node.className = "tm-video-stage";
        node.style.cssText = "position: absolute; inset: 0; transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); transform: translateY(100%); z-index: 1;";
        node.innerHTML = `
                <img class="tm-thumb hidden" alt="" referrerpolicy="no-referrer">
                <video class="tm-video" playsinline webkit-playsinline preload="metadata"></video>
                <div class="tm-error-overlay hidden">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <span>\u89C6\u9891\u5DF2\u88AB\u4F5C\u8005\u6216 Twitter \u5220\u9664</span>
                </div>
            `;
        this.container.appendChild(node);
        this.nodes.push(node);
      }
    }
    getNodes() {
      return this.nodes;
    }
    getNodeIndex(logicalIndex) {
      return (logicalIndex % 5 + 5) % 5;
    }
    getNode(logicalIndex) {
      return this.nodes[this.getNodeIndex(logicalIndex)];
    }
    setTransition(enable) {
      this.nodes.forEach((node) => {
        node.style.transition = enable ? "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)" : "none";
      });
    }
    updateTransforms(currentIndex, offsetPx = 0) {
      const curr = this.getNodeIndex(currentIndex);
      const prev = this.getNodeIndex(currentIndex - 1);
      const next = this.getNodeIndex(currentIndex + 1);
      const prev2 = this.getNodeIndex(currentIndex - 2);
      const next2 = this.getNodeIndex(currentIndex + 2);
      this.nodes[prev2].style.transform = `translateY(calc(-200% + ${offsetPx}px))`;
      this.nodes[prev2].style.zIndex = "1";
      this.nodes[prev].style.transform = `translateY(calc(-100% + ${offsetPx}px))`;
      this.nodes[prev].style.zIndex = "1";
      this.nodes[curr].style.transform = `translateY(${offsetPx}px)`;
      this.nodes[curr].style.zIndex = "2";
      this.nodes[next].style.transform = `translateY(calc(100% + ${offsetPx}px))`;
      this.nodes[next].style.zIndex = "1";
      this.nodes[next2].style.transform = `translateY(calc(200% + ${offsetPx}px))`;
      this.nodes[next2].style.zIndex = "1";
    }
  }
  const runtime = getRuntimeAdapter();
  const BASE_URL = (() => {
    const base = runtime.env.apiBase;
    if (base.endsWith("/api")) {
      return base.slice(0, -4);
    }
    return base;
  })();
  function fetchComments(urlCd) {
    return new Promise((resolve) => {
      const pageUrl = `${BASE_URL}/zh-CN/movie/${urlCd}`;
      runtime.http.request({
        method: "GET",
        url: pageUrl,
        headers: { Accept: "text/html" },
        responseType: "text",
        timeoutMs: 1e4
      }).then((res) => {
        if (res.status < 200 || res.status >= 300) {
          resolve([]);
          return;
        }
        try {
          const doc = new DOMParser().parseFromString(res.text, "text/html");
          const rows = doc.querySelectorAll(".comment .space-y-2 > div.border-b");
          const comments = Array.from(rows).map((el) => {
            var _a, _b, _c, _d;
            return {
              time: ((_b = (_a = el.querySelector("span")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) || "",
              content: ((_d = (_c = el.querySelector("p")) == null ? void 0 : _c.textContent) == null ? void 0 : _d.trim()) || ""
            };
          }).filter((c) => c.content);
          resolve(comments);
        } catch {
          resolve([]);
        }
      }).catch(() => resolve([]));
    });
  }
  function postComment(urlCd, message) {
    return runtime.http.request({
      method: "POST",
      url: `${BASE_URL}/api/media/${urlCd}/comments`,
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
        Origin: BASE_URL
      },
      body: JSON.stringify({ message }),
      timeoutMs: 8e3
    }).then((res) => res.status >= 200 && res.status < 300).catch(() => false);
  }
  class ProgressManager {
    constructor() {
      this.cache =  new Map();
      this.STORAGE_KEY = "xflow_play_progress_lru";
      this.MAX_ENTRIES = 200;
      this.TTL_MS = 7 * 24 * 60 * 60 * 1e3;
      this.saveTimer = null;
      this.loadFromStorage();
    }
    static getInstance() {
      if (!ProgressManager.instance) {
        ProgressManager.instance = new ProgressManager();
      }
      return ProgressManager.instance;
    }
    loadFromStorage() {
      const raw = loadJSON(this.STORAGE_KEY, {});
      const now = Date.now();
      for (const [id, item] of Object.entries(raw)) {
        const pItem = item;
        if (now - pItem.updatedAt < this.TTL_MS) {
          this.cache.set(id, pItem);
        }
      }
    }
    saveToStorage() {
      const obj = {};
      for (const [id, item] of this.cache.entries()) {
        obj[id] = item;
      }
      saveJSON(this.STORAGE_KEY, obj);
    }
    saveProgress(videoId, time, duration, immediate = false) {
      if (!videoId || time <= 0 || !duration) return;
      if (duration - time < 2) {
        this.clearProgress(videoId);
        return;
      }
      if (!this.cache.has(videoId) && this.cache.size >= this.MAX_ENTRIES) {
        let oldestId = null;
        let oldestTime = Infinity;
        for (const [id, item] of this.cache.entries()) {
          if (item.updatedAt < oldestTime) {
            oldestTime = item.updatedAt;
            oldestId = id;
          }
        }
        if (oldestId) {
          this.cache.delete(oldestId);
        }
      }
      this.cache.set(videoId, {
        time,
        duration,
        updatedAt: Date.now()
      });
      if (immediate) {
        if (this.saveTimer) {
          clearTimeout(this.saveTimer);
          this.saveTimer = null;
        }
        this.saveToStorage();
      } else {
        if (!this.saveTimer) {
          this.saveTimer = setTimeout(() => {
            this.saveToStorage();
            this.saveTimer = null;
          }, 2e3);
        }
      }
    }
    getProgress(videoId) {
      const item = this.cache.get(videoId);
      if (!item) return 0;
      item.updatedAt = Date.now();
      this.saveToStorage();
      return item.time;
    }
    getProgressItem(videoId) {
      const item = this.cache.get(videoId);
      if (!item) return void 0;
      item.updatedAt = Date.now();
      this.saveToStorage();
      return item;
    }
    clearProgress(videoId) {
      if (this.cache.delete(videoId)) {
        this.saveToStorage();
      }
    }
  }
  function escapeCSSUrl(url) {
    return url.replace(/["'\\]/g, "\\$&");
  }
  class TikTokMode {
    constructor(pool) {
      this.isOpen = false;
      this.currentIndex = 0;
      this.bookmarksList = [];
      this.currentAuthorVideos = [];
      this.preloadTimer = null;
      this.isDraggingProgress = false;
      this.onCloseCallback = null;
      this.onLibraryClickCallback = null;
      this.idleTimer = null;
      this.pendingStartTime = 0;
      this.centerIconTimer = null;
      this.longPressTimer = null;
      this.isLongPressing = false;
      this.savedPlaybackRate = 1;
      this.lastTapTime = 0;
      this.lastTapX = 0;
      this.doubleTapTimer = null;
      this.highlightMarkers = [];
      this.hasBackup = false;
      this.backupCustomPool = null;
      this.backupIndex = 0;
      this.pool = pool;
      this.vl = new VirtualList();
      this.loop = !!loadJSON(STORAGE_KEYS.LOOP, false);
      this.bookmarksList = loadGM(STORAGE_KEYS.BOOKMARKS_V2, []);
      this.bookmarks = new Set(this.bookmarksList.map((b) => b.id));
      this.likes = new Set(loadGM(STORAGE_KEYS.LIKES, []));
      this.playbackRate = loadJSON(STORAGE_KEYS.PLAYBACK_RATE, 1);
      const savedVol = loadJSON(STORAGE_KEYS.VOLUME, { volume: 0.7, muted: false });
      this.volume = savedVol.volume;
      this.isMuted = savedVol.muted;
      this.modal = document.createElement("div");
      this.modal.id = "tm-tiktok-modal";
      this.modal.style.cssText = "position: fixed; inset: 0; z-index: 2147483647; display: none; background: #000; color: #fff; font-family: sans-serif; height: 100dvh; overflow-anchor: none; contain: layout size style;";
      this.modal.appendChild(this.vl.container);
      this.uiLayer = document.createElement("div");
      this.uiLayer.style.cssText = "position: absolute; inset: 0; z-index: 20; pointer-events: none;";
      this.uiLayer.innerHTML = `
            <div class="tm-topbar">
                <div class="tm-pill" id="tm-count" aria-live="polite">1 / 1</div>
                <div class="tm-top-actions">
                    <button type="button" class="tm-btn" id="tm-back-playlist-btn" aria-label="Back to previous playlist" tabindex="0" style="display:none; font-size:12px; padding:4px 10px; background:rgba(255,255,255,0.1); border-radius:12px; margin-right:8px; align-items:center; color:#fff; font-family:var(--font-body); font-weight:600; border:none; cursor:pointer;">
                        \u2190 \u8FD4\u56DE
                    </button>
                    <button type="button" class="tm-btn tm-speed-btn" id="tm-speed-btn" aria-label="Playback speed" tabindex="0">
                        <span id="tm-speed-label">1\xD7</span>
                    </button>
                    <button type="button" class="tm-btn" id="tm-pip-btn" aria-label="Picture in picture" tabindex="0" style="display:none">
                        <svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/></svg>
                    </button>
                    <button type="button" class="tm-btn" id="tm-close-btn" aria-label="Close" tabindex="0">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
            </div>
            <div class="tm-speed-panel" id="tm-speed-panel">
                <button type="button" class="tm-speed-option" data-rate="0.5">0.5\xD7</button>
                <button type="button" class="tm-speed-option" data-rate="0.75">0.75\xD7</button>
                <button type="button" class="tm-speed-option active" data-rate="1">1\xD7</button>
                <button type="button" class="tm-speed-option" data-rate="1.25">1.25\xD7</button>
                <button type="button" class="tm-speed-option" data-rate="1.5">1.5\xD7</button>
                <button type="button" class="tm-speed-option" data-rate="2">2\xD7</button>
            </div>
            <div class="tm-center-icon" id="tm-center-icon">
                <svg id="tm-center-svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <div class="tm-info">
                <div class="tm-author-name" id="tm-author-name"></div>
                <h2 class="tm-title" id="tm-title"></h2>
            </div>
            <div class="tm-volume-wrap" id="tm-volume-wrap">
                <button type="button" class="tm-vol-btn" id="tm-vol-btn" aria-label="Toggle mute">
                    <svg id="tm-vol-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </button>
                <div class="tm-vol-slider-wrap">
                    <div class="tm-vol-fill" id="tm-vol-fill"></div>
                </div>
            </div>
            <div class="tm-progress-wrap" id="tm-progress-wrap" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
                <div class="tm-progress">
                    <div class="tm-progress-fill" id="tm-progress-fill"></div>
                </div>
                <div class="tm-time" id="tm-time">0:00 / 0:00</div>
            </div>
            <div class="tm-actions" id="tm-actions" role="group" aria-label="Video actions">
                <button type="button" class="tm-action author" id="tm-author-btn" aria-label="Author" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
                    <span class="txt">${t("actionProfile")}</span>
                </button>
                <button type="button" class="tm-action bookmark" id="tm-bookmark-btn" aria-label="Bookmark" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg></div>
                    <span class="txt">${t("actionBookmark")}</span>
                </button>
                <button type="button" class="tm-action download" id="tm-download-btn" aria-label="Download" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></div>
                    <span class="txt">${t("actionDownload")}</span>
                </button>
                <button type="button" class="tm-action library" id="tm-library-btn" aria-label="My Library" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0-2-.9-2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg></div>
                    <span class="txt">${t("myBookmarks")}</span>
                </button>
            </div>
            <div class="tm-speed-tip" id="tm-speed-tip">${t("speedTip")}</div>
            <div class="tm-swipe-mask" id="tm-swipe-mask"></div>
            <div class="tm-comment-panel" id="tm-comment-panel">
                <div class="tm-comment-header">
                    <span id="tm-comment-title">${t("commentsTitle")}</span>
                    <button class="tm-comment-close" id="tm-comment-close" aria-label="Close comments">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="tm-comment-body" id="tm-comment-list"></div>
                <div class="tm-comment-footer">
                    <input type="text" class="tm-comment-input" id="tm-comment-input" placeholder="${t("commentPlaceholder")}" />
                    <button class="tm-comment-send" id="tm-comment-send" disabled>${t("send")}</button>
                </div>
            </div>
            <div class="tm-author-panel" id="tm-author-panel">
                <div class="tm-author-header">
                    <span class="tm-author-title">${t("authorProfileTitle")}</span>
                    <button type="button" class="tm-author-close" id="tm-author-close" aria-label="Close author panel">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="tm-author-profile">
                    <div class="tm-author-profile-top">
                        <div class="tm-author-avatar-big" id="tm-author-avatar">U</div>
                        <div class="tm-author-info-text">
                            <div class="tm-author-name-big" id="tm-author-name">User</div>
                            <div class="tm-author-handle-big" id="tm-author-handle">@username</div>
                        </div>
                    </div>
                    <a href="#" class="tm-author-external-btn" id="tm-author-external-link" target="_blank" rel="noopener noreferrer">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                        <span>${t("viewOnTwitter")}</span>
                    </a>
                </div>
                <div class="tm-author-batch-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.01);">
                    <label class="bookmark-chk-label" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--text-300);">
                        <input type="checkbox" id="tm-author-batch-downloaded-chk" checked style="accent-color: var(--theme-accent); width: 14px; height: 14px; cursor: pointer;">
                        ${t("includeDownloaded")}
                    </label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="bookmark-copy-btn" id="tm-author-select-all-btn" style="display: inline-flex; align-items: center; gap: 6px; background: var(--theme-accent-subtle) !important; border: 1px solid var(--theme-accent) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--theme-accent) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                            \u5168\u9009
                        </button>
                        <button type="button" class="bookmark-copy-btn" id="tm-author-batch-copy-btn" style="display: none; align-items: center; gap: 6px; background: var(--theme-accent-subtle) !important; border: 1px solid var(--theme-accent) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--theme-accent) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                            ${t("copyLinks")}
                        </button>
                        <button type="button" class="bookmark-copy-btn" id="tm-author-cancel-select-btn" style="display: none; align-items: center; gap: 6px; background: rgba(255,255,255,0.08) !important; border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--text-200) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                            \u53D6\u6D88
                        </button>
                    </div>
                </div>
                <div class="tm-author-videos-grid" id="tm-author-videos-grid"></div>
            </div>
        `;
      this.modal.appendChild(this.uiLayer);
      this.progressFill = this.uiLayer.querySelector("#tm-progress-fill");
      this.timeText = this.uiLayer.querySelector("#tm-time");
      this.titleText = this.uiLayer.querySelector("#tm-title");
      this.authorText = this.uiLayer.querySelector("#tm-author-name");
      this.pool.onDataAdded(() => {
        if (this.isOpen) {
          this.updateCountUI();
        }
      });
      this.setupIdleTracker();
    }
    ensureInDom() {
      const root = document.getElementById("xflow-app-root") || document.body;
      if (!root.contains(this.modal)) {
        root.appendChild(this.modal);
      }
    }
    init() {
      this.ensureInDom();
      this.bindEvents();
    }
    bindEvents() {
      const speedBtn = this.uiLayer.querySelector("#tm-speed-btn");
      const speedPanel = this.uiLayer.querySelector("#tm-speed-panel");
      const speedLabel = this.uiLayer.querySelector("#tm-speed-label");
      speedLabel.textContent = this.playbackRate === 1 ? "1\xD7" : this.playbackRate + "\xD7";
      speedBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        speedPanel.classList.toggle("active");
      });
      speedPanel.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = e.target.closest(".tm-speed-option");
        if (!target) return;
        const rate = parseFloat(target.dataset.rate || "1");
        this.playbackRate = rate;
        saveJSON(STORAGE_KEYS.PLAYBACK_RATE, rate);
        speedPanel.querySelectorAll(".tm-speed-option").forEach((o) => o.classList.remove("active"));
        target.classList.add("active");
        speedLabel.textContent = rate === 1 ? "1\xD7" : rate + "\xD7";
        speedPanel.classList.remove("active");
        const video = this.getCurrentVideo();
        if (video) video.playbackRate = rate;
        this.pool.getDataPool();
      });
      this.modal.addEventListener("click", () => {
        speedPanel.classList.remove("active");
      });
      const pipBtn = this.uiLayer.querySelector("#tm-pip-btn");
      if (document.pictureInPictureEnabled) {
        pipBtn.style.display = "";
        pipBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          try {
            const video = this.getCurrentVideo();
            if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
            } else if (video) {
              await video.requestPictureInPicture();
              const list = this.pool.getDataPool();
            }
          } catch (err) {
            console.log("PiP not available", err);
          }
        });
      }
      const closeBtn = this.uiLayer.querySelector("#tm-close-btn");
      closeBtn.addEventListener("click", () => this.closeModal());
      const swipeMask = this.uiLayer.querySelector("#tm-swipe-mask");
      const speedTip = this.uiLayer.querySelector("#tm-speed-tip");
      let startY = 0;
      let startX = 0;
      let isMoving = false;
      let touchScrolled = false;
      swipeMask.addEventListener("touchstart", (e) => {
        const touchY = e.touches[0].clientY;
        const touchX = e.touches[0].clientX;
        const screenH = window.innerHeight;
        touchScrolled = false;
        startX = touchX;
        if (touchY > screenH * 0.85) {
          isMoving = false;
          return;
        }
        startY = touchY;
        isMoving = true;
        this.vl.setTransition(false);
        if (this.longPressTimer) clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
          if (!touchScrolled && this.isOpen) {
            this.isLongPressing = true;
            const video = this.getCurrentVideo();
            if (video) {
              this.savedPlaybackRate = video.playbackRate;
              video.playbackRate = 1.5;
            }
            if (speedTip) {
              speedTip.classList.add("show");
            }
          }
        }, 450);
      }, { passive: true });
      swipeMask.addEventListener("touchmove", (e) => {
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY_move = Math.abs(e.touches[0].clientY - startY);
        if (deltaX > 10 || deltaY_move > 10) {
          touchScrolled = true;
          if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
          if (this.isLongPressing) {
            this.cancelLongPress(speedTip);
          }
        }
        if (!isMoving) return;
        const deltaY = e.touches[0].clientY - startY;
        this.vl.updateTransforms(this.currentIndex, deltaY);
      }, { passive: false });
      swipeMask.addEventListener("touchend", (e) => {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
        if (this.isLongPressing) {
          this.cancelLongPress(speedTip);
          isMoving = false;
          return;
        }
        if (!isMoving) return;
        isMoving = false;
        const deltaX = e.changedTouches[0].clientX - startX;
        const deltaY = e.changedTouches[0].clientY - startY;
        if (deltaX < -60 && Math.abs(deltaY) < 60) {
          this.vl.updateTransforms(this.currentIndex, 0);
          const list = this.pool.getDataPool();
          if (list.length) {
            list[this.currentIndex];
          }
          this.openAuthorPanel();
          return;
        }
        if (deltaX > 60 && Math.abs(deltaY) < 60) {
          this.vl.updateTransforms(this.currentIndex, 0);
          this.closeModal();
          return;
        }
        this.vl.setTransition(true);
        if (deltaY < -70) {
          this.navigate(1);
        } else if (deltaY > 70) {
          this.navigate(-1);
        } else {
          this.vl.updateTransforms(this.currentIndex, 0);
        }
      }, { passive: true });
      swipeMask.addEventListener("touchcancel", () => {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
        if (this.isLongPressing) {
          this.cancelLongPress(speedTip);
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
      swipeMask.addEventListener("click", (e) => {
        if (this.isLongPressing) return;
        speedPanel.classList.remove("active");
        const now = Date.now();
        const screenW = window.innerWidth;
        const tapX = e.clientX;
        if (now - this.lastTapTime < 300 && Math.abs(tapX - this.lastTapX) < 80) {
          if (this.doubleTapTimer) {
            clearTimeout(this.doubleTapTimer);
            this.doubleTapTimer = null;
          }
          const video = this.getCurrentVideo();
          if (!video || !video.duration) return;
          const ratio = tapX / screenW;
          if (ratio < 0.333) {
            video.currentTime = Math.max(0, video.currentTime - 10);
            this.showDoubleTapFeedback("left");
          } else if (ratio > 0.666) {
            video.currentTime = Math.min(video.duration, video.currentTime + 10);
            this.showDoubleTapFeedback("right");
          }
          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
          this.lastTapX = tapX;
          this.doubleTapTimer = setTimeout(() => {
            this.togglePlayCurrent();
            this.doubleTapTimer = null;
          }, 300);
        }
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
          this.bookmarksList = this.bookmarksList.filter((b) => b.id !== id);
          bookmarkBtn.classList.remove("active");
        } else {
          this.bookmarks.add(id);
          const activeAdapter = AdapterManager.getInstance().getActiveAdapter();
          const currentSiteKey = activeAdapter ? activeAdapter.constructor.name.replace("Adapter", "").toLowerCase() : "";
          const bookmarkItem = {
            bookmarkTime: Date.now(),
            authorId: item.tweet_account || "",
            videoUrl: item.originalUrl || item.url || "",
            tweetTitle: item.title || "",
            currentRankingSite: currentSiteKey,
            id,
            url_cd: item.url_cd || "",
            thumbnail: item.thumbnail || "",
            duration: item.duration || 0,
            url: item.url || "",
            pv: item.pv || 0
          };
          this.bookmarksList.push(bookmarkItem);
          bookmarkBtn.classList.add("active");
        }
        saveGM(STORAGE_KEYS.BOOKMARKS_V2, this.bookmarksList);
      });
      const libraryBtn = this.uiLayer.querySelector("#tm-library-btn");
      if (libraryBtn) {
        libraryBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.closeModal();
          if (this.onLibraryClickCallback) {
            this.onLibraryClickCallback();
          }
        });
      }
      const commentBtn = this.uiLayer.querySelector("#tm-comment-btn");
      const commentPanel = this.uiLayer.querySelector("#tm-comment-panel");
      const commentClose = this.uiLayer.querySelector("#tm-comment-close");
      const commentList = this.uiLayer.querySelector("#tm-comment-list");
      const commentInput = this.uiLayer.querySelector("#tm-comment-input");
      const commentSend = this.uiLayer.querySelector("#tm-comment-send");
      commentBtn == null ? void 0 : commentBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        commentPanel.classList.add("active");
        this.loadComments();
      });
      commentClose.addEventListener("click", () => {
        commentPanel.classList.remove("active");
      });
      const authorPanel = this.uiLayer.querySelector("#tm-author-panel");
      const authorClose = this.uiLayer.querySelector("#tm-author-close");
      authorClose.addEventListener("click", () => {
        authorPanel.classList.remove("active");
      });
      let startX_author = 0;
      let startY_author = 0;
      authorPanel.addEventListener("touchstart", (e) => {
        startX_author = e.touches[0].clientX;
        startY_author = e.touches[0].clientY;
      }, { passive: true });
      authorPanel.addEventListener("touchend", (e) => {
        const deltaX = e.changedTouches[0].clientX - startX_author;
        const deltaY = e.changedTouches[0].clientY - startY_author;
        if (deltaX > 60 && Math.abs(deltaY) < 60) {
          authorPanel.classList.remove("active");
        }
      }, { passive: true });
      const backBtn = this.uiLayer.querySelector("#tm-back-playlist-btn");
      backBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.restorePlaylist();
      });
      const authorCopyBtn = this.uiLayer.querySelector("#tm-author-batch-copy-btn");
      const selectAllBtn = this.uiLayer.querySelector("#tm-author-select-all-btn");
      const cancelBtn = this.uiLayer.querySelector("#tm-author-cancel-select-btn");
      selectAllBtn == null ? void 0 : selectAllBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const gridEl = this.uiLayer.querySelector("#tm-author-videos-grid");
        if (!gridEl) return;
        gridEl.querySelectorAll(".tm-author-video-card").forEach((card) => {
          let chk = card.querySelector(".tm-author-select-chk");
          if (!chk) {
            chk = document.createElement("input");
            chk.type = "checkbox";
            chk.className = "tm-author-select-chk";
            chk.checked = true;
            chk.style.cssText = "position:absolute;top:4px;left:4px;z-index:3;width:16px;height:16px;accent-color:var(--theme-accent);cursor:pointer;";
            card.appendChild(chk);
          } else {
            chk.checked = true;
            chk.style.display = "block";
          }
        });
        if (selectAllBtn) selectAllBtn.style.display = "none";
        if (authorCopyBtn) authorCopyBtn.style.display = "inline-flex";
        if (cancelBtn) cancelBtn.style.display = "inline-flex";
      });
      cancelBtn == null ? void 0 : cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const gridEl = this.uiLayer.querySelector("#tm-author-videos-grid");
        if (gridEl) {
          gridEl.querySelectorAll(".tm-author-select-chk").forEach((chk) => {
            chk.style.display = "none";
          });
        }
        if (selectAllBtn) selectAllBtn.style.display = "inline-flex";
        if (authorCopyBtn) authorCopyBtn.style.display = "none";
        if (cancelBtn) cancelBtn.style.display = "none";
      });
      authorCopyBtn == null ? void 0 : authorCopyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!this.currentAuthorVideos.length) return;
        const gridEl = this.uiLayer.querySelector("#tm-author-videos-grid");
        if (!gridEl) return;
        const selectedIds =  new Set();
        gridEl.querySelectorAll(".tm-author-video-card").forEach((card) => {
          const chk = card.querySelector(".tm-author-select-chk");
          if (chk && chk.checked) {
            const id = card.getAttribute("data-id");
            if (id) selectedIds.add(id);
          }
        });
        const links = [];
        const copiedIds = [];
        selectedIds.forEach((id) => {
          const video = this.currentAuthorVideos.find((v) => v.id === id);
          if (video) {
            const url = video.originalUrl || video.url || "";
            if (url) links.push(url);
            copiedIds.push(video.id);
          }
        });
        if (links.length === 0) return;
        const linksText = links.join("\n");
        try {
          await navigator.clipboard.writeText(linksText);
          const currentItem = this.pool.getDataPool()[this.currentIndex];
          const originalText = authorCopyBtn.textContent;
          authorCopyBtn.textContent = t("copied");
          authorCopyBtn.style.setProperty("background", "rgba(46, 213, 115, 0.15)", "important");
          authorCopyBtn.style.setProperty("border-color", "#2ed573", "important");
          authorCopyBtn.style.setProperty("color", "#2ed573", "important");
          setTimeout(() => {
            authorCopyBtn.textContent = originalText;
            authorCopyBtn.style.removeProperty("background");
            authorCopyBtn.style.removeProperty("border-color");
            authorCopyBtn.style.removeProperty("color");
          }, 1500);
          const { showConfirmModal: showConfirmModal2 } = await __vitePreload(async () => {
            const { showConfirmModal: showConfirmModal3 } = await Promise.resolve().then(() => Dom);
            return { showConfirmModal: showConfirmModal3 };
          }, true ? void 0 : void 0);
          showConfirmModal2(
            "\u6807\u8BB0\u5DF2\u4E0B\u8F7D",
            `\u5DF2\u590D\u5236 ${links.length} \u4E2A\u89C6\u9891\u94FE\u63A5\u3002\u662F\u5426\u5C06\u8FD9\u4E9B\u89C6\u9891\u6807\u8BB0\u4E3A\u5DF2\u4E0B\u8F7D\uFF1F`,
            () => {
              const downloaded = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []));
              copiedIds.forEach((id) => downloaded.add(id));
              saveGM(STORAGE_KEYS.DOWNLOADED, Array.from(downloaded));
              const downloadedSet = new Set(downloaded);
              gridEl.querySelectorAll(".tm-author-video-card").forEach((card) => {
                const id = card.getAttribute("data-id") || "";
                if (downloadedSet.has(id)) {
                  let badge = card.querySelector(".tm-downloaded-badge");
                  if (!badge) {
                    badge = document.createElement("div");
                    badge.className = "tm-downloaded-badge";
                    badge.innerHTML = "\u2713 \u5DF2\u4E0B\u8F7D";
                    card.appendChild(badge);
                  }
                }
              });
              if (cancelBtn) cancelBtn.click();
            }
          );
        } catch (err) {
          console.error("Failed to copy blogger links:", err);
        }
      });
      commentInput.addEventListener("input", () => {
        commentSend.disabled = !commentInput.value.trim();
      });
      commentInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !commentSend.disabled) {
          commentSend.click();
        }
      });
      commentSend.addEventListener("click", async () => {
        const msg = commentInput.value.trim();
        if (!msg) return;
        const list = this.pool.getDataPool();
        const item = list[this.currentIndex];
        if (!item || !item.url_cd) return;
        commentSend.disabled = true;
        const originalText = commentSend.textContent;
        commentSend.textContent = "...";
        try {
          const success = await postComment(item.url_cd, msg);
          if (success) {
            commentInput.value = "";
            const now =  new Date();
            const newCommentHtml = `<div class="tm-comment-item" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                        <span class="tm-comment-time">\u521A\u521A</span>
                        <div class="tm-comment-content">${escapeHtml(msg)}</div>
                    </div>`;
            const emptyState = commentList.querySelector(".tm-comment-empty");
            if (emptyState) emptyState.remove();
            commentList.insertAdjacentHTML("afterbegin", newCommentHtml);
            const countEl = this.uiLayer.querySelector("#tm-comment-count");
            if (countEl) {
              const countText = countEl.textContent === "\u8BC4\u8BBA" ? "0" : countEl.textContent;
              const count = parseInt(countText || "0") + 1;
              countEl.textContent = formatCount(count);
              item.commentCount = (item.commentCount || item._count && item._count.comments || item.comments || 0) + 1;
            }
          } else {
            alert("\u53D1\u9001\u8BC4\u8BBA\u5931\u8D25");
          }
        } catch (err) {
          alert("\u53D1\u9001\u8BC4\u8BBA\u5931\u8D25: " + err);
        } finally {
          commentSend.textContent = originalText;
          commentSend.disabled = !commentInput.value.trim();
        }
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
          const id = String(item.id);
          const downloaded = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []));
          downloaded.add(id);
          saveGM(STORAGE_KEYS.DOWNLOADED, Array.from(downloaded));
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
    openModal(index, startTime) {
      this.ensureInDom();
      this.isOpen = true;
      this.modal.style.display = "block";
      setTimeout(() => {
        if (this.isOpen) {
          this.modal.classList.add("active");
        }
      }, 20);
      this.currentIndex = index;
      this.pendingStartTime = startTime || 0;
      this.resetProgress();
      this.vl.setTransition(false);
      this.vl.updateTransforms(this.currentIndex, 0);
      this.loadNode(this.currentIndex);
      this.playCurrent();
      this.pool.startPrefetching(this.currentIndex, 5, 800);
      if (this.preloadTimer) clearTimeout(this.preloadTimer);
      this.preloadTimer = setTimeout(() => {
        if (this.isOpen) {
          this.loadNode(this.currentIndex - 1);
          this.loadNode(this.currentIndex + 1);
          this.schedulePreload();
        }
      }, 1500);
    }
    closeModal() {
      if (this.preloadTimer) {
        clearTimeout(this.preloadTimer);
        this.preloadTimer = null;
      }
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
      this.modal.classList.remove("tm-idle");
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {
        });
      }
      this.isOpen = false;
      this.modal.classList.remove("active");
      setTimeout(() => {
        if (!this.isOpen) {
          this.modal.style.display = "none";
          this.unloadAllVideos();
        }
      }, 200);
      this.pauseAll();
      this.pool.stopPrefetching();
      this.backupCustomPool = null;
      this.backupIndex = 0;
      this.hasBackup = false;
      const backBtn = this.uiLayer.querySelector("#tm-back-playlist-btn");
      if (backBtn) backBtn.style.display = "none";
      if (this.onCloseCallback) this.onCloseCallback();
    }
    onClose(cb) {
      this.onCloseCallback = cb;
    }
    navigate(delta) {
      if (this.preloadTimer) {
        clearTimeout(this.preloadTimer);
        this.preloadTimer = null;
      }
      const list = this.pool.getDataPool();
      if (!list.length) return;
      this.pauseAll();
      this.resetProgress();
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
      this.loadNode(this.currentIndex);
      this.pool.startPrefetching(this.currentIndex, 5, 800);
      if (this.preloadTimer) clearTimeout(this.preloadTimer);
      this.preloadTimer = setTimeout(() => {
        if (this.isOpen) {
          this.loadNode(this.currentIndex + delta);
          this.loadNode(this.currentIndex - delta);
          this.schedulePreload();
        }
      }, 1500);
      setTimeout(() => {
        if (this.isOpen) this.playCurrent();
      }, 350);
      if (this.currentIndex >= list.length - 5) {
        this.pool.fetchNextPage();
      }
    }
    restorePlaylist() {
      if (!this.hasBackup) return;
      this.pool.setCustomDataPool(this.backupCustomPool);
      const idx = this.backupIndex;
      this.backupCustomPool = null;
      this.backupIndex = 0;
      this.hasBackup = false;
      const backBtn = this.uiLayer.querySelector("#tm-back-playlist-btn");
      if (backBtn) backBtn.style.display = "none";
      this.openModal(idx);
    }
    async loadNode(logicalIndex) {
      var _a;
      const list = this.pool.getDataPool();
      if (logicalIndex < 0 || logicalIndex >= list.length) return;
      const item = list[logicalIndex];
      const node = this.vl.getNode(logicalIndex);
      const video = node.querySelector(".tm-video");
      const thumb = node.querySelector(".tm-thumb");
      const loadPromise = this.pool.loadDetails(item);
      const isCurrent = logicalIndex === this.currentIndex;
      if (video.getAttribute("data-index") !== logicalIndex.toString()) {
        video.pause();
        video.removeAttribute("src");
        try {
          video.load();
        } catch {
        }
        video.setAttribute("data-index", logicalIndex.toString());
        video.loop = this.loop;
        video.preload = isCurrent ? "auto" : "metadata";
        thumb.src = item.thumbnail || "";
        node.style.backgroundImage = `url("${escapeCSSUrl(item.thumbnail || "")}")`;
        node.style.backgroundSize = "cover";
        node.style.backgroundPosition = "center";
        thumb.classList.remove("hidden");
        video.style.opacity = "0";
        (_a = node.querySelector(".tm-error-overlay")) == null ? void 0 : _a.classList.add("hidden");
        const showVideo = () => {
          var _a2;
          if (video.getAttribute("data-index") === logicalIndex.toString()) {
            thumb.classList.add("hidden");
            video.style.opacity = "1";
            (_a2 = node.querySelector(".tm-error-overlay")) == null ? void 0 : _a2.classList.add("hidden");
          }
        };
        video.oncanplay = showVideo;
        video.onplaying = showVideo;
        video.onloadedmetadata = showVideo;
        video.onerror = () => {
          var _a2;
          if (video.getAttribute("data-index") === logicalIndex.toString()) {
            thumb.classList.add("hidden");
            video.style.opacity = "0";
            (_a2 = node.querySelector(".tm-error-overlay")) == null ? void 0 : _a2.classList.remove("hidden");
          }
        };
      }
      const resolvedItem = await loadPromise;
      if (video.getAttribute("data-index") === logicalIndex.toString()) {
        if (logicalIndex === this.currentIndex) {
          if (video.src !== resolvedItem.url) {
            video.src = resolvedItem.url;
          }
          this.playCurrent();
          if (this.preloadTimer) clearTimeout(this.preloadTimer);
          this.preloadTimer = setTimeout(() => {
            if (this.isOpen) {
              this.loadNode(this.currentIndex - 1);
              this.loadNode(this.currentIndex + 1);
              this.schedulePreload();
            }
          }, 1500);
        } else {
          if (resolvedItem.url && video.src !== resolvedItem.url) {
            video.src = resolvedItem.url;
          }
        }
      }
    }
    pauseAll() {
      const list = this.pool.getDataPool();
      if (list.length && this.currentIndex >= 0 && this.currentIndex < list.length) {
        const currentItem = list[this.currentIndex];
        const currentVideo = this.getCurrentVideo();
        if (currentVideo && currentVideo.duration && !currentVideo.paused) {
          ProgressManager.getInstance().saveProgress(
            String(currentItem.id),
            currentVideo.currentTime,
            currentVideo.duration,
            true
          );
        }
      }
      this.vl.getNodes().forEach((n) => {
        const v = n.querySelector(".tm-video");
        v.pause();
      });
    }
    unloadAllVideos() {
      this.vl.getNodes().forEach((n) => {
        const v = n.querySelector(".tm-video");
        v.pause();
        v.removeAttribute("src");
        try {
          v.load();
        } catch {
        }
        v.removeAttribute("data-index");
        const thumb = n.querySelector(".tm-thumb");
        if (thumb) thumb.classList.add("hidden");
        n.style.backgroundImage = "none";
      });
    }
    playCurrent() {
      const list = this.pool.getDataPool();
      if (!list.length) return;
      const item = list[this.currentIndex];
      const videoId = String(item.id);
      const cleanName = this.getCleanBloggerName(item.authorDisplayName || item.tweet_account || "");
      if (this.authorText) {
        this.authorText.textContent = cleanName;
      }
      this.titleText.textContent = item.isDetailsLoaded ? item.title || "" : "Loading...";
      this.titleText.style.display = item.title ? "" : "none";
      this.updateCountUI();
      const bookmarkBtn = this.uiLayer.querySelector("#tm-bookmark-btn");
      if (bookmarkBtn) {
        if (this.bookmarks.has(videoId)) {
          bookmarkBtn.classList.add("active");
        } else {
          bookmarkBtn.classList.remove("active");
        }
      }
      const commentCountTxt = this.uiLayer.querySelector("#tm-comment-count");
      if (commentCountTxt) {
        const count = item.commentCount || item._count && item._count.comments || item.comments || 0;
        commentCountTxt.textContent = count > 0 ? formatCount(count) : "\u8BC4\u8BBA";
      }
      const node = this.vl.getNode(this.currentIndex);
      const video = node.querySelector(".tm-video");
      video.preload = "auto";
      video.playbackRate = this.playbackRate;
      video.volume = this.isMuted ? 0 : this.volume;
      video.muted = this.isMuted;
      const savedItem = ProgressManager.getInstance().getProgressItem(videoId);
      const savedProgress = savedItem ? savedItem.time : 0;
      const startTime = this.pendingStartTime || savedProgress || 0;
      if (startTime > 0) {
        const duration = video.duration || item.duration || (savedItem ? savedItem.duration : 0) || 0;
        if (duration > 0) {
          const p = startTime / duration * 100;
          this.progressFill.style.width = p + "%";
          this.timeText.textContent = formatTime(startTime) + " / " + formatTime(duration);
          const progressWrap = this.uiLayer.querySelector("#tm-progress-wrap");
          if (progressWrap) progressWrap.setAttribute("aria-valuenow", String(Math.round(p)));
        }
      }
      if (startTime > 0 && item.url && video.src === item.url) {
        this.pendingStartTime = 0;
        if (video.readyState >= 1) {
          video.currentTime = startTime;
        } else {
          const onMetadata = () => {
            video.currentTime = startTime;
            video.removeEventListener("loadedmetadata", onMetadata);
          };
          video.addEventListener("loadedmetadata", onMetadata);
        }
      }
      video.play().catch((e) => console.log("Autoplay prevented", e));
      const authorBtn = this.uiLayer.querySelector("#tm-author-btn");
      if (authorBtn) {
        authorBtn.style.display = "";
        const btnText = authorBtn.querySelector(".txt");
        if (btnText) {
          btnText.textContent = cleanName || "\u535A\u4E3B";
        }
        authorBtn.onclick = (e) => {
          e.stopPropagation();
          this.openAuthorPanel();
        };
      }
      video.onleavepictureinpicture = () => {
        if (video.getAttribute("data-index") !== this.currentIndex.toString()) return;
        if (this.isOpen && !video.paused) {
          video.play().catch(() => {
          });
        }
      };
      AdapterManager.getInstance().getActiveAdapter();
      this.renderHighlightMarkers(videoId);
      video.ontimeupdate = () => {
        if (video.getAttribute("data-index") !== this.currentIndex.toString()) return;
        if (!video.duration) return;
        const p = video.currentTime / video.duration * 100;
        this.progressFill.style.width = p + "%";
        const progressWrap = this.uiLayer.querySelector("#tm-progress-wrap");
        if (progressWrap) progressWrap.setAttribute("aria-valuenow", String(Math.round(p)));
        this.timeText.textContent = formatTime(video.currentTime) + " / " + formatTime(video.duration);
        ProgressManager.getInstance().saveProgress(videoId, video.currentTime, video.duration, false);
      };
      video.onended = () => {
        if (video.getAttribute("data-index") !== this.currentIndex.toString()) return;
        if (!this.loop) {
          this.navigate(1);
        }
      };
    }
    schedulePreload() {
      if (this.preloadTimer) clearTimeout(this.preloadTimer);
      const list = this.pool.getDataPool();
      if (!list.length) return;
      const checkAndPreload = () => {
        const video = this.getCurrentVideo();
        if (!video) return;
        let bufferedAhead = 0;
        const time = video.currentTime;
        for (let i = 0; i < video.buffered.length; i++) {
          const start = video.buffered.start(i);
          const end = video.buffered.end(i);
          if (time >= start && time <= end) {
            bufferedAhead = end - time;
            break;
          }
        }
        const isSafeToPreload = video.readyState >= 3 || bufferedAhead >= 6 || video.ended;
        if (isSafeToPreload) {
          const nextIdx = this.currentIndex + 1;
          if (nextIdx < list.length) {
            this.preloadNode(nextIdx);
          }
        } else {
          this.preloadTimer = setTimeout(checkAndPreload, 1500);
        }
      };
      this.preloadTimer = setTimeout(checkAndPreload, 2e3);
    }
    async preloadNode(logicalIndex) {
      const list = this.pool.getDataPool();
      if (logicalIndex < 0 || logicalIndex >= list.length) return;
      const item = list[logicalIndex];
      const node = this.vl.getNode(logicalIndex);
      const video = node.querySelector(".tm-video");
      const resolvedItem = await this.pool.loadDetails(item);
      if (video.getAttribute("data-index") === logicalIndex.toString()) {
        if (logicalIndex !== this.currentIndex) {
          video.preload = "auto";
          if (video.src !== resolvedItem.url) {
            video.src = resolvedItem.url;
          }
        }
      }
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
      const centerIcon = this.uiLayer.querySelector("#tm-center-icon");
      const centerSvg = this.uiLayer.querySelector("#tm-center-svg");
      if (video.paused) {
        video.play().catch((e) => console.log("Play prevented", e));
        if (centerSvg) centerSvg.innerHTML = '<path d="M8 5v14l11-7z"/>';
      } else {
        video.pause();
        if (centerSvg) centerSvg.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      }
      if (centerIcon) {
        centerIcon.classList.remove("show");
        void centerIcon.offsetWidth;
        centerIcon.classList.add("show");
        if (this.centerIconTimer) clearTimeout(this.centerIconTimer);
        this.centerIconTimer = setTimeout(() => centerIcon.classList.remove("show"), 600);
      }
    }
    updateCountUI() {
      const list = this.pool.getDataPool();
      const countSpan = this.uiLayer.querySelector("#tm-count");
      if (countSpan) {
        countSpan.textContent = `${this.currentIndex + 1} / ${list.length}${this.pool.hasMoreData() ? "+" : ""}`;
      }
    }
    cancelLongPress(speedTip) {
      this.isLongPressing = false;
      const video = this.getCurrentVideo();
      if (video) {
        video.playbackRate = this.savedPlaybackRate;
      }
      if (speedTip) {
        speedTip.classList.remove("show");
      }
    }
    async loadComments() {
      const commentList = this.uiLayer.querySelector("#tm-comment-list");
      const list = this.pool.getDataPool();
      const item = list[this.currentIndex];
      if (!commentList || !item || !item.url_cd) return;
      commentList.innerHTML = '<div class="tm-comment-loading"><div class="spinner"></div></div>';
      try {
        const comments = await fetchComments(item.url_cd);
        if (!comments || comments.length === 0) {
          commentList.innerHTML = '<div class="tm-comment-empty">\u6682\u65E0\u8BC4\u8BBA\uFF0C\u5FEB\u6765\u62A2\u6C99\u53D1\uFF01</div>';
          return;
        }
        commentList.innerHTML = comments.map((c) => `
                <div class="tm-comment-item">
                    <span class="tm-comment-time">${escapeHtml(c.time)}</span>
                    <div class="tm-comment-content">${escapeHtml(c.content)}</div>
                </div>
            `).join("");
      } catch (err) {
        commentList.innerHTML = '<div class="tm-comment-empty">\u52A0\u8F7D\u8BC4\u8BBA\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5</div>';
      }
    }
    showDoubleTapFeedback(side) {
      const el = document.createElement("div");
      el.className = `tm-doubletap-feedback ${side}`;
      if (side === "left") {
        el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg> 10s';
      } else {
        el.innerHTML = '10s <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';
      }
      this.uiLayer.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }
    async renderHighlightMarkers(_videoId) {
      this.clearHighlightMarkers();
    }
    clearHighlightMarkers() {
      for (const m of this.highlightMarkers) {
        m.remove();
      }
      this.highlightMarkers = [];
    }
    resetProgress() {
      if (this.progressFill) {
        this.progressFill.style.width = "0%";
      }
      if (this.timeText) {
        this.timeText.textContent = "0:00 / 0:00";
      }
      const progressWrap = this.uiLayer.querySelector("#tm-progress-wrap");
      if (progressWrap) {
        progressWrap.setAttribute("aria-valuenow", "0");
      }
      this.clearHighlightMarkers();
    }
    async openAuthorPanel() {
      const authorPanel = this.uiLayer.querySelector("#tm-author-panel");
      authorPanel.classList.add("active");
      const selectAllBtn = this.uiLayer.querySelector("#tm-author-select-all-btn");
      const authorCopyBtn = this.uiLayer.querySelector("#tm-author-batch-copy-btn");
      const cancelBtn = this.uiLayer.querySelector("#tm-author-cancel-select-btn");
      if (selectAllBtn) selectAllBtn.style.display = "inline-flex";
      if (authorCopyBtn) authorCopyBtn.style.display = "none";
      if (cancelBtn) cancelBtn.style.display = "none";
      const commentPanel = this.uiLayer.querySelector("#tm-comment-panel");
      commentPanel.classList.remove("active");
      const list = this.pool.getDataPool();
      if (!list.length) return;
      const item = list[this.currentIndex];
      const avatarEl = authorPanel.querySelector("#tm-author-avatar");
      const nameEl = authorPanel.querySelector("#tm-author-name");
      const handleEl = authorPanel.querySelector("#tm-author-handle");
      const externalLinkEl = authorPanel.querySelector("#tm-author-external-link");
      const gridEl = authorPanel.querySelector("#tm-author-videos-grid");
      const username = item.tweet_account || "unknown";
      const displayName = item.authorDisplayName || username;
      if (avatarEl) avatarEl.textContent = displayName.charAt(0);
      if (nameEl) nameEl.textContent = displayName;
      if (handleEl) handleEl.textContent = username !== "unknown" && username !== "loading" ? `@${username}` : "";
      if (externalLinkEl) {
        if (username !== "unknown" && username !== "loading") {
          externalLinkEl.style.display = "inline-flex";
          externalLinkEl.href = `https://x.com/${username}`;
        } else {
          externalLinkEl.style.display = "none";
        }
      }
      gridEl.innerHTML = '<div class="tm-comment-loading"><div class="spinner"></div></div>';
      try {
        const adapter = AdapterManager.getInstance().getActiveAdapter();
        let result = null;
        if (adapter.fetchAuthorVideos && username && username !== "unknown" && username !== "loading") {
          result = await adapter.fetchAuthorVideos(username);
        }
        const videos = result && result.posts && result.posts.length > 0 ? result.posts : list.slice(0, 15);
        this.currentAuthorVideos = videos;
        if (videos.length === 0) {
          gridEl.innerHTML = '<div class="tm-comment-empty">\u6682\u65E0\u76F8\u5173\u89C6\u9891</div>';
          return;
        }
        const downloadedSet = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []));
        gridEl.innerHTML = videos.map((video, idx) => {
          const durationStr = video.duration > 0 ? this.formatDuration(video.duration) : "";
          const isDownloaded = downloadedSet.has(String(video.id));
          return `
                    <div class="tm-author-video-card" data-id="${video.id}" data-index="${idx}" style="position: relative;">
                        <img src="${video.thumbnail}" alt="Thumbnail" loading="lazy" referrerpolicy="no-referrer" />
                        ${durationStr ? `<span class="duration">${durationStr}</span>` : ""}
                        ${isDownloaded ? '<div class="tm-downloaded-badge">\u2713 \u5DF2\u4E0B\u8F7D</div>' : ""}
                    </div>
                `;
        }).join("");
        gridEl.querySelectorAll(".tm-author-video-card").forEach((card) => {
          card.addEventListener("click", (e) => {
            e.stopPropagation();
            const chk = card.querySelector(".tm-author-select-chk");
            if (chk && chk.style.display !== "none") {
              if (e.target !== chk) {
                chk.checked = !chk.checked;
              }
              return;
            }
            const targetId = card.getAttribute("data-id") || "";
            if (!targetId) return;
            authorPanel.classList.remove("active");
            if (!this.hasBackup) {
              this.backupCustomPool = this.pool.getCustomDataPool();
              this.backupIndex = this.currentIndex;
              this.hasBackup = true;
            }
            const backBtn = this.uiLayer.querySelector("#tm-back-playlist-btn");
            if (backBtn) backBtn.style.display = "inline-flex";
            this.pool.setCustomDataPool(this.currentAuthorVideos);
            const clickedIndex = videos.findIndex((v) => v.id === targetId);
            this.openModal(clickedIndex >= 0 ? clickedIndex : 0);
          });
        });
      } catch (err) {
        console.error("Failed to load author videos", err);
        this.currentAuthorVideos = [];
        gridEl.innerHTML = `<div class="tm-comment-empty">${t("loadError")}</div>`;
      }
    }
    formatDuration(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor(seconds % 3600 / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) {
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
      return `${m}:${String(s).padStart(2, "0")}`;
    }
    retranslateUI() {
      if (!this.uiLayer) return;
      const commentTitle = this.uiLayer.querySelector("#tm-comment-title");
      if (commentTitle) commentTitle.textContent = t("commentsTitle");
      const commentInput = this.uiLayer.querySelector("#tm-comment-input");
      if (commentInput) commentInput.placeholder = t("commentPlaceholder");
      const commentSend = this.uiLayer.querySelector("#tm-comment-send");
      if (commentSend) commentSend.textContent = t("send");
      const authorTitle = this.uiLayer.querySelector(".tm-author-title");
      if (authorTitle) authorTitle.textContent = t("authorProfileTitle");
      const externalLinkSpan = this.uiLayer.querySelector("#tm-author-external-link span");
      if (externalLinkSpan) externalLinkSpan.textContent = t("viewOnTwitter");
      const speedTip = this.uiLayer.querySelector("#tm-speed-tip");
      if (speedTip) speedTip.textContent = t("speedTip");
      const bookmarkSpan = this.uiLayer.querySelector("#tm-bookmark-btn .txt");
      if (bookmarkSpan) bookmarkSpan.textContent = t("actionBookmark");
      const authorSpan = this.uiLayer.querySelector("#tm-author-btn .txt");
      if (authorSpan) authorSpan.textContent = t("actionProfile");
      const commentSpan = this.uiLayer.querySelector("#tm-comment-btn .txt");
      if (commentSpan) commentSpan.textContent = t("commentsTitle");
      const downloadSpan = this.uiLayer.querySelector("#tm-download-btn .txt");
      if (downloadSpan) downloadSpan.textContent = t("actionDownload");
    }
    onLibraryClick(cb) {
      this.onLibraryClickCallback = cb;
    }
    getCleanBloggerName(name) {
      if (!name) return "";
      return name.replace(/的视频(空间)?$/g, "").trim();
    }
    resetIdleTimer() {
      if (!this.isOpen) return;
      const modal = this.modal;
      modal.classList.remove("tm-idle");
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
      const video = this.getCurrentVideo();
      const isPaused = video ? video.paused : true;
      const isPanelOpen = !!modal.querySelector(".tm-comment-panel.active, .tm-author-panel.active, .tm-settings.active, .tm-speed-panel.active");
      if (!isPaused && !isPanelOpen) {
        this.idleTimer = setTimeout(() => {
          const currentPanelOpen = !!modal.querySelector(".tm-comment-panel.active, .tm-author-panel.active, .tm-settings.active, .tm-speed-panel.active");
          if (this.isOpen && video && !video.paused && !currentPanelOpen) {
            modal.classList.add("tm-idle");
          }
        }, 3e3);
      }
    }
    setupIdleTracker() {
      const events = ["mousemove", "mousedown", "touchstart", "touchmove", "keydown"];
      events.forEach((evt) => {
        this.modal.addEventListener(evt, () => this.resetIdleTimer(), { passive: true });
      });
      this.vl.getNodes().forEach((n) => {
        const v = n.querySelector(".tm-video");
        if (v) {
          v.addEventListener("play", () => this.resetIdleTimer());
          v.addEventListener("pause", () => {
            if (this.idleTimer) {
              clearTimeout(this.idleTimer);
              this.idleTimer = null;
            }
            this.modal.classList.remove("tm-idle");
          });
        }
      });
    }
  }
  class Layout {
    constructor() {
      this.rootElement = null;
      this.hoverVideo = null;
      this.hoverCard = null;
      this.isBookmarksView = false;
      this.bookmarkFilterSite = "all";
      this.bookmarkSort = "recent";
      this.bookmarkIncludeDownloaded = true;
      this.globalEventsBound = false;
      this.pool = new PoolManager();
      this.player = new TikTokMode(this.pool);
    }
    getActiveFilters() {
      const adapter = AdapterManager.getInstance().getActiveAdapter();
      return adapter.getFilterGroups ? adapter.getFilterGroups(this.pool.getApiClient().getIsAnime()) : [];
    }
    init(root) {
      this.rootElement = root;
      if (this.rootElement) {
        this.rootElement.className = this.pool.getApiClient().getIsAnime() ? "theme-anime" : "theme-real";
      }
      this.createPageStructure();
      this.bindEvents();
      this.player.init();
      this.player.onClose(() => {
        if (this.isBookmarksView) {
          this.loadBookmarksData();
        } else {
          this.playNo1AutoVideo();
        }
      });
      this.player.onLibraryClick(() => {
        this.switchToBookmarksView();
      });
      this.bindDetailLoaderListener();
      this.loadInitialData();
      const activeAdapter = AdapterManager.getInstance().getActiveAdapter();
      activeAdapter ? activeAdapter.id || activeAdapter.constructor.name.replace("Adapter", "").toLowerCase() : "";
    }
    bindDetailLoaderListener() {
      this.pool.onDetailLoaded((item) => {
        var _a;
        const grid = document.getElementById("grid-container");
        if (!grid) return;
        const cards = grid.querySelectorAll(".media-card");
        for (const card of cards) {
          const indexAttr = card.getAttribute("data-index");
          if (!indexAttr) continue;
          const index = parseInt(indexAttr);
          const poolItem = this.isBookmarksView ? (_a = this.pool.getCustomDataPool()) == null ? void 0 : _a[index] : this.pool.getDataPool()[index];
          if (poolItem && poolItem.id === item.id) {
            if (item.url) {
              card.setAttribute("data-video-url", item.url);
            }
            const authorEl = card.querySelector(".card-author");
            if (authorEl) {
              authorEl.textContent = this.getCleanBloggerName(item.authorDisplayName || item.tweet_account || "");
            }
            let titleEl = card.querySelector(".card-title");
            if (!titleEl && item.title) {
              titleEl = document.createElement("div");
              titleEl.className = "card-title";
              const infoEl = card.querySelector(".card-info");
              if (infoEl) {
                const statsEl = infoEl.querySelector(".card-stats");
                if (statsEl) {
                  infoEl.insertBefore(titleEl, statsEl);
                } else {
                  infoEl.appendChild(titleEl);
                }
              }
            }
            if (titleEl && item.title) {
              titleEl.textContent = item.title;
            }
            break;
          }
        }
      });
    }
    createPageStructure() {
      if (!this.rootElement) return;
      const filters = this.getActiveFilters();
      const activeParams = this.pool.getCurrentQuery();
      this.rootElement.innerHTML = `
            <div class="noise-overlay"></div>
            <div class="app-layout">
                ${Components.getSidebarHTML(filters, activeParams, this.isBookmarksView)}
                <main class="main-container" id="main-scroll">
                    ${Components.getTopBarHTML(this.pool.getApiClient().getIsAnime(), filters, activeParams)}
                    <div class="content-pad">
                        <div class="filter-section-container">
                            <div class="filter-header-row">
                                <h2 class="section-title" id="section-title"></h2>
                                <button type="button" class="filter-toggle-btn" id="filter-toggle-btn" aria-label="Toggle Filters" style="display: ${filters.length > 2 ? "inline-flex" : "none"};">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 18v-6L3 5V3h18v2l-7 7v6l-4 2z"/></svg>
                                    <span>${t("filter")}</span>
                                </button>
                            </div>
                            <div class="filter-expand-panel hidden" id="filter-expand-panel"></div>
                        </div>
                        <div class="media-grid" id="grid-container">
                            ${this.generateSkeletons()}
                        </div>
                    </div>
                </main>
            </div>
        `;
      this.renderFilterPanel();
      this.updateSectionTitle();
      const toggleBtn = document.getElementById("filter-toggle-btn");
      if (toggleBtn) {
        if (filters.length === 0) {
          toggleBtn.style.display = "none";
        } else {
          toggleBtn.style.display = "";
        }
      }
    }
    renderFilterPanel() {
      const panel = document.getElementById("filter-expand-panel");
      if (!panel) return;
      if (this.isBookmarksView) {
        const sites = [
          { id: "all", label: "\u5168\u90E8" },
          { id: "pektino", label: "Pektino" },
          { id: "twihub", label: "TwiHub" },
          { id: "twikeep", label: "TwiKeep" },
          { id: "twiidol", label: "TwiIdol" },
          { id: "twiigle", label: "Twiigle" },
          { id: "monsnode", label: "Monsnode" },
          { id: "twivideo", label: "TwiVideo" },
          { id: "twidouga", label: "TwiDouga" },
          { id: "javtwi", label: "JavTwi" },
          { id: "xhotvideo", label: "XHotVideo" }
        ];
        const sitesHtml = sites.map((opt) => {
          const isActive = opt.id === this.bookmarkFilterSite;
          return `<button type="button" class="filter-option-btn ${isActive ? "active" : ""}" data-bookmark-site="${opt.id}">${opt.label}</button>`;
        }).join("");
        const sorts = [
          { id: "recent", label: "\u6700\u8FD1\u6536\u85CF" },
          { id: "oldest", label: "\u6700\u65E9\u6536\u85CF" },
          { id: "views", label: "\u64AD\u653E\u6700\u591A" },
          { id: "duration", label: "\u65F6\u957F\u6700\u957F" }
        ];
        const sortsHtml = sorts.map((opt) => {
          const isActive = opt.id === this.bookmarkSort;
          return `<button type="button" class="filter-option-btn ${isActive ? "active" : ""}" data-bookmark-sort="${opt.id}">${opt.label}</button>`;
        }).join("");
        panel.innerHTML = `
                <div class="filter-rows-container">
                    <div class="filter-row">
                        <div class="filter-row-title">${t("filter_category")}</div>
                        <div class="filter-row-options">
                            ${sitesHtml}
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-row-title">${t("filter_sort")}</div>
                        <div class="filter-row-options">
                            ${sortsHtml}
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-row-title">\u6279\u91CF\u64CD\u4F5C</div>
                        <div class="filter-row-options" style="align-items: center; gap: 16px;">
                            <label class="bookmark-chk-label" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--text-300);">
                                <input type="checkbox" id="bookmark-include-downloaded-chk" ${this.bookmarkIncludeDownloaded ? "checked" : ""} style="accent-color: var(--theme-accent); width: 14px; height: 14px; cursor: pointer;">
                                ${t("includeDownloaded")}
                            </label>
                            <button type="button" class="bookmark-copy-btn" id="bookmark-select-all-btn" style="display: inline-flex; align-items: center; gap: 6px; background: var(--theme-accent-subtle) !important; border: 1px solid var(--theme-accent) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--theme-accent) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                                \u5168\u9009
                            </button>
                            <button type="button" class="bookmark-copy-btn" id="bookmark-copy-links-btn" style="display: none; align-items: center; gap: 6px; background: var(--theme-accent-subtle) !important; border: 1px solid var(--theme-accent) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--theme-accent) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                                ${t("copyLinks")}
                            </button>
                            <button type="button" class="bookmark-copy-btn" id="bookmark-cancel-select-btn" style="display: none; align-items: center; gap: 6px; background: rgba(255,255,255,0.08) !important; border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--text-200) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                                \u53D6\u6D88
                            </button>
                        </div>
                    </div>
                </div>
            `;
        const btn = document.getElementById("filter-toggle-btn");
        if (btn) btn.style.display = "inline-flex";
        return;
      }
      const filters = this.getActiveFilters();
      const activeParams = this.pool.getCurrentQuery();
      const extraGroups = filters.slice(2);
      if (extraGroups.length === 0) {
        const btn = document.getElementById("filter-toggle-btn");
        if (btn) btn.style.display = "none";
        panel.innerHTML = "";
        return;
      } else {
        const btn = document.getElementById("filter-toggle-btn");
        if (btn) btn.style.display = "inline-flex";
      }
      const rowsHtml = extraGroups.map((group) => {
        var _a;
        const activeId = activeParams[group.id] || ((_a = group.options[0]) == null ? void 0 : _a.id);
        const optionsHtml = group.options.map((opt) => {
          const isActive = opt.id === activeId;
          return `<button type="button" class="filter-option-btn ${isActive ? "active" : ""}" data-filter-group="${group.id}" data-filter-value="${opt.id}">${tLabel(opt.label)}</button>`;
        }).join("");
        return `
                <div class="filter-row">
                    <div class="filter-row-title">${getGroupTitle(group)}</div>
                    <div class="filter-row-options">
                        ${optionsHtml}
                    </div>
                </div>
            `;
      }).join("");
      panel.innerHTML = `
            <div class="filter-rows-container">
                ${rowsHtml}
            </div>
        `;
    }
    generateSkeletons() {
      return Array(6).fill(0).map(() => `
            <div class="media-card" style="border-radius: 1.5rem; cursor: default; animation: none; background: transparent; border: none;">
                <div class="skeleton-pulse"></div>
            </div>
        `).join("");
    }
    async applyFilters(partial, opts) {
      this.pool.stopPrefetching();
      if (this.isBookmarksView) {
        if (partial.bookmarkSite !== void 0) {
          this.bookmarkFilterSite = partial.bookmarkSite;
        }
        if (partial.bookmarkSort !== void 0) {
          this.bookmarkSort = partial.bookmarkSort;
        }
        this.loadBookmarksData();
        return;
      }
      const willHitCache = this.pool.hasFreshCache(partial);
      if (!willHitCache) {
        const grid = document.getElementById("grid-container");
        if (grid) grid.innerHTML = this.generateSkeletons();
      }
      if ((opts == null ? void 0 : opts.channelSwitch) && partial.isAnimeOnly !== void 0) {
        this.pool.getCurrentQuery().isAnimeOnly ? "anime" : "real";
        partial.isAnimeOnly ? "anime" : "real";
        if (this.rootElement) {
          this.rootElement.className = partial.isAnimeOnly ? "theme-anime" : "theme-real";
        }
        this.createPageStructure();
        this.bindEvents();
      }
      try {
        const result = await this.pool.loadInitialData(partial);
        this.syncFiltersUI(this.pool.getCurrentQuery());
        if (this.pool.getDataPool().length === 0) {
          this.renderEmptyState();
        } else {
          this.renderAll();
        }
        log(`applyFilters: ${willHitCache ? "Cache HIT \u26A1" : "Fetched"} (fromCache=${result.fromCache})`);
      } catch (error) {
        console.error("Failed to apply filters:", error);
        this.renderErrorState();
      }
      this.schedulePreloads();
    }
    schedulePreloads() {
      const q = this.pool.getCurrentQuery();
      const filters = this.getActiveFilters();
      const rangeGroup = filters.find((g) => g.type === "range" || g.id === "range" || g.id === "category");
      const ranges = rangeGroup ? rangeGroup.options.map((o) => o.id) : ["daily", "weekly", "monthly", "all"];
      const nextRange = ranges.find((r) => r !== q.range) || ranges[0] || "weekly";
      const otherChannel = {
        isAnimeOnly: !q.isAnimeOnly,
        range: q.range,
        sort: q.sort,
        perPage: q.perPage ?? 50
      };
      const sameChannelOtherRange = {
        isAnimeOnly: q.isAnimeOnly,
        range: nextRange,
        sort: q.sort,
        perPage: q.perPage ?? 50
      };
      setTimeout(() => {
        this.pool.preload(sameChannelOtherRange).then(() => {
          this.pool.preload(otherChannel);
        });
      }, 1500);
    }
    bindEvents() {
      var _a;
      const appLayout = (_a = this.rootElement) == null ? void 0 : _a.querySelector(".app-layout");
      const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
      sidebarToggleBtn == null ? void 0 : sidebarToggleBtn.addEventListener("click", () => {
        if (!appLayout) return;
        const collapsed = appLayout.classList.toggle("sidebar-collapsed");
        sidebarToggleBtn.setAttribute("aria-expanded", (!collapsed).toString());
        sidebarToggleBtn.setAttribute("aria-label", collapsed ? t("expandSidebar") : t("collapseSidebar"));
        sidebarToggleBtn.setAttribute("title", collapsed ? t("expandSidebar") : t("collapseSidebar"));
      });
      const rangeBtn = document.getElementById("mobile-range-btn");
      const rangeDropdown = document.getElementById("range-dropdown");
      const sortBtn2 = document.getElementById("mobile-sort-btn");
      const sortDropdown = document.getElementById("sort-dropdown");
      const closeAllDropdowns = (options) => {
        if (!(options == null ? void 0 : options.excludeRange)) {
          rangeDropdown == null ? void 0 : rangeDropdown.classList.remove("open");
          rangeBtn == null ? void 0 : rangeBtn.setAttribute("aria-expanded", "false");
        }
        sortDropdown == null ? void 0 : sortDropdown.classList.remove("open");
        sortBtn2 == null ? void 0 : sortBtn2.setAttribute("aria-expanded", "false");
        document.querySelectorAll(".site-switch-wrap").forEach((w) => w.classList.remove("active"));
        document.querySelectorAll(".filter-dd-wrap").forEach((d) => d.classList.remove("active"));
      };
      const siteSwitchWraps = document.querySelectorAll(".site-switch-wrap:not(.lang-switch-wrap)");
      siteSwitchWraps.forEach((wrap) => {
        const btn = wrap.querySelector(".site-switch-btn");
        btn == null ? void 0 : btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const isActive = wrap.classList.contains("active");
          closeAllDropdowns({ excludeRange: true });
          if (!isActive) {
            wrap.classList.add("active");
          }
        });
      });
      const langSwitchWraps = document.querySelectorAll(".lang-switch-wrap");
      langSwitchWraps.forEach((wrap) => {
        const btn = wrap.querySelector(".site-switch-btn");
        btn == null ? void 0 : btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const isActive = wrap.classList.contains("active");
          closeAllDropdowns({ excludeRange: true });
          if (!isActive) {
            wrap.classList.add("active");
          }
        });
        wrap.addEventListener("click", (e) => {
          const langBtn = e.target.closest("[data-lang]");
          if (langBtn) {
            e.stopPropagation();
            const selectedLang = langBtn.dataset.lang;
            if (selectedLang) {
              setLang(selectedLang);
              this.createPageStructure();
              this.bindEvents();
              this.player.retranslateUI();
              this.renderAll();
            }
          }
        });
      });
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
      if (!this.globalEventsBound) {
        this.globalEventsBound = true;
        document.addEventListener("click", () => closeAllDropdowns());
      }
      const filterToggleBtn = document.getElementById("filter-toggle-btn");
      const filterExpandPanel = document.getElementById("filter-expand-panel");
      filterToggleBtn == null ? void 0 : filterToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !(filterExpandPanel == null ? void 0 : filterExpandPanel.classList.toggle("hidden"));
        filterToggleBtn.classList.toggle("active", isOpen);
      });
      document.addEventListener("click", async (e) => {
        const target = e.target;
        const bSiteBtn = target.closest("[data-bookmark-site]");
        if (bSiteBtn) {
          e.stopPropagation();
          const site = bSiteBtn.dataset.bookmarkSite;
          await this.applyFilters({ bookmarkSite: site });
          return;
        }
        const bSortBtn = target.closest("[data-bookmark-sort]");
        if (bSortBtn) {
          e.stopPropagation();
          const sort = bSortBtn.dataset.bookmarkSort;
          await this.applyFilters({ bookmarkSort: sort });
          return;
        }
        const filterItem = target.closest("[data-filter-group][data-filter-value]");
        if (filterItem) {
          e.stopPropagation();
          const groupId = filterItem.dataset.filterGroup;
          const value = filterItem.dataset.filterValue;
          if (this.isBookmarksView && groupId === "range") {
            this.isBookmarksView = false;
            this.pool.clearCustomDataPool();
            this.createPageStructure();
            this.bindEvents();
          }
          closeAllDropdowns();
          const currentQuery = this.pool.getCurrentQuery();
          const update = { [groupId]: value };
          this.syncFiltersUI(Object.assign({}, currentQuery, update));
          await this.applyFilters(update);
        }
      });
      const myBookmarksBtn = document.getElementById("my-bookmarks-btn");
      myBookmarksBtn == null ? void 0 : myBookmarksBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.switchToBookmarksView();
      });
      document.addEventListener("change", (e) => {
        const chk = e.target;
        if (chk.id === "bookmark-include-downloaded-chk") {
          this.bookmarkIncludeDownloaded = chk.checked;
          this.loadBookmarksData();
        }
      });
      document.addEventListener("click", async (e) => {
        const selectAllBtn = e.target.closest("#bookmark-select-all-btn");
        if (selectAllBtn) {
          e.stopPropagation();
          document.querySelectorAll(".media-card").forEach((card) => {
            let chk = card.querySelector(".bookmark-select-chk");
            if (!chk) {
              chk = document.createElement("input");
              chk.type = "checkbox";
              chk.className = "bookmark-select-chk";
              chk.checked = true;
              chk.style.cssText = "position:absolute;top:12px;left:12px;z-index:7;width:18px;height:18px;accent-color:var(--theme-accent);cursor:pointer;";
              card.appendChild(chk);
            } else {
              chk.checked = true;
              chk.style.display = "block";
            }
          });
          selectAllBtn.style.display = "none";
          const copyBtn2 = document.getElementById("bookmark-copy-links-btn");
          const cancelBtn2 = document.getElementById("bookmark-cancel-select-btn");
          if (copyBtn2) copyBtn2.style.display = "inline-flex";
          if (cancelBtn2) cancelBtn2.style.display = "inline-flex";
          return;
        }
        const cancelBtn = e.target.closest("#bookmark-cancel-select-btn");
        if (cancelBtn) {
          e.stopPropagation();
          document.querySelectorAll(".bookmark-select-chk").forEach((chk) => chk.style.display = "none");
          cancelBtn.style.display = "none";
          const copyBtn2 = document.getElementById("bookmark-copy-links-btn");
          const selAllBtn = document.getElementById("bookmark-select-all-btn");
          if (copyBtn2) copyBtn2.style.display = "none";
          if (selAllBtn) selAllBtn.style.display = "inline-flex";
          return;
        }
        const copyBtn = e.target.closest("#bookmark-copy-links-btn");
        if (copyBtn) {
          e.stopPropagation();
          const selectedIds =  new Set();
          document.querySelectorAll(".media-card").forEach((card) => {
            const chk = card.querySelector(".bookmark-select-chk");
            if (chk && chk.checked) {
              const idx = card.getAttribute("data-index");
              if (idx !== null) selectedIds.add(idx);
            }
          });
          const list = this.pool.getDataPool();
          const links = [];
          const copiedIds = [];
          selectedIds.forEach((idxStr) => {
            const item = list[parseInt(idxStr)];
            if (item) {
              const link = item.originalUrl || item.url || "";
              if (link) links.push(link);
              copiedIds.push(item.id);
            }
          });
          if (links.length === 0) return;
          const linksText = links.join("\n");
          try {
            await navigator.clipboard.writeText(linksText);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = t("copied");
            copyBtn.style.setProperty("background", "rgba(46, 213, 115, 0.15)", "important");
            copyBtn.style.setProperty("border-color", "#2ed573", "important");
            copyBtn.style.setProperty("color", "#2ed573", "important");
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.style.removeProperty("background");
              copyBtn.style.removeProperty("border-color");
              copyBtn.style.removeProperty("color");
            }, 1500);
            showConfirmModal(
              "\u6807\u8BB0\u5DF2\u4E0B\u8F7D",
              `\u5DF2\u590D\u5236 ${links.length} \u4E2A\u89C6\u9891\u94FE\u63A5\u3002\u662F\u5426\u5C06\u8FD9\u4E9B\u89C6\u9891\u6807\u8BB0\u4E3A\u5DF2\u4E0B\u8F7D\uFF1F`,
              () => {
                const downloaded = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []));
                copiedIds.forEach((id) => downloaded.add(id));
                saveGM(STORAGE_KEYS.DOWNLOADED, Array.from(downloaded));
                this.loadBookmarksData();
              }
            );
          } catch (err) {
            console.error("Failed to copy links:", err);
          }
        }
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
            const chk = card.querySelector(".bookmark-select-chk");
            if (chk && chk.style.display !== "none") {
              if (e.target !== chk) {
                chk.checked = !chk.checked;
              }
              return;
            }
            const indexAttr = card.getAttribute("data-index");
            if (indexAttr) {
              const index = parseInt(indexAttr);
              let startTime = 0;
              if (index === 0 && this.hoverCard === card && this.hoverVideo) {
                startTime = this.hoverVideo.currentTime;
              }
              this.clearActiveHoverVideo();
              this.player.openModal(index, startTime);
            }
          }
        });
        gridContainer.addEventListener("mouseenter", async (e) => {
          var _a2;
          const card = e.target.closest(".media-card");
          if (!card || card === this.hoverCard) return;
          this.clearActiveHoverVideo();
          const indexAttr = card.getAttribute("data-index");
          if (!indexAttr) return;
          const index = parseInt(indexAttr);
          const item = this.isBookmarksView ? (_a2 = this.pool.getCustomDataPool()) == null ? void 0 : _a2[index] : this.pool.getDataPool()[index];
          if (!item) return;
          this.hoverCard = card;
          card.classList.add("hover-playing");
          let videoUrl = item.url || card.dataset.videoUrl || "";
          if (!videoUrl) {
            try {
              const resolved = await this.pool.loadDetails(item);
              videoUrl = (resolved == null ? void 0 : resolved.url) || "";
              if (videoUrl) {
                card.setAttribute("data-video-url", videoUrl);
              }
            } catch (err) {
              console.warn("Failed to resolve video URL on hover:", err);
            }
          }
          if (!videoUrl || card !== this.hoverCard) {
            if (card === this.hoverCard) this.clearActiveHoverVideo();
            return;
          }
          const video = document.createElement("video");
          video.className = "card-hover-video";
          video.src = videoUrl;
          video.muted = true;
          video.autoplay = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = "auto";
          const onPlay = () => {
            card.classList.add("video-playing");
          };
          video.addEventListener("playing", onPlay, { once: true });
          video.addEventListener("timeupdate", onPlay, { once: true });
          card.appendChild(video);
          this.hoverVideo = video;
          video.play().catch(() => {
          });
        }, true);
        gridContainer.addEventListener("mouseleave", (e) => {
          const card = e.target.closest(".media-card");
          if (card && card === this.hoverCard) this.clearActiveHoverVideo();
        }, true);
        let touchTimer = null;
        let touchStartY = 0;
        let touchScrolled = false;
        const startTouchPreview = async (card) => {
          var _a2;
          this.clearActiveHoverVideo();
          const indexAttr = card.getAttribute("data-index");
          if (!indexAttr) return;
          const index = parseInt(indexAttr);
          const item = this.isBookmarksView ? (_a2 = this.pool.getCustomDataPool()) == null ? void 0 : _a2[index] : this.pool.getDataPool()[index];
          if (!item) return;
          this.hoverCard = card;
          card.classList.add("hover-playing");
          let videoUrl = item.url || card.dataset.videoUrl || "";
          if (!videoUrl) {
            try {
              const resolved = await this.pool.loadDetails(item);
              videoUrl = (resolved == null ? void 0 : resolved.url) || "";
              if (videoUrl) {
                card.setAttribute("data-video-url", videoUrl);
              }
            } catch (err) {
              console.warn("Failed to resolve video URL on touch preview:", err);
            }
          }
          if (!videoUrl || card !== this.hoverCard) {
            if (card === this.hoverCard) this.clearActiveHoverVideo();
            return;
          }
          const video = document.createElement("video");
          video.className = "card-hover-video";
          video.src = videoUrl;
          video.muted = true;
          video.autoplay = true;
          video.loop = true;
          video.playsInline = true;
          const onPlay = () => {
            card.classList.add("video-playing");
          };
          video.addEventListener("playing", onPlay, { once: true });
          video.addEventListener("timeupdate", onPlay, { once: true });
          card.appendChild(video);
          this.hoverVideo = video;
          video.play().catch(() => {
          });
        };
        gridContainer.addEventListener("touchstart", (e) => {
          const card = e.target.closest(".media-card");
          if (!card) return;
          touchScrolled = false;
          touchStartY = e.touches[0].clientY;
          touchTimer = setTimeout(() => {
            if (!touchScrolled) startTouchPreview(card);
          }, 450);
        }, { passive: true });
        gridContainer.addEventListener("touchmove", (e) => {
          if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
            touchScrolled = true;
            if (touchTimer) {
              clearTimeout(touchTimer);
              touchTimer = null;
            }
          }
        }, { passive: true });
        gridContainer.addEventListener("touchend", (e) => {
          if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
          if (this.hoverCard) {
            const card = e.target.closest(".media-card");
            if (card && card === this.hoverCard) {
              const indexAttr = card.getAttribute("data-index");
              if (indexAttr) {
                const index = parseInt(indexAttr);
                let startTime = 0;
                if (this.hoverVideo) {
                  startTime = this.hoverVideo.currentTime;
                }
                this.clearActiveHoverVideo();
                this.player.openModal(index, startTime);
              }
            } else {
              this.clearActiveHoverVideo();
            }
            e.preventDefault();
          } else if (!touchScrolled) {
            const card = e.target.closest(".media-card");
            if (card) {
              const chk = card.querySelector(".bookmark-select-chk");
              if (chk && chk.style.display !== "none") {
                if (e.target !== chk) {
                  chk.checked = !chk.checked;
                }
                e.preventDefault();
                return;
              }
              const indexAttr = card.getAttribute("data-index");
              if (indexAttr) {
                const index = parseInt(indexAttr);
                this.player.openModal(index, 0);
                e.preventDefault();
              }
            }
          }
        }, { passive: false });
        gridContainer.addEventListener("touchcancel", () => {
          if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
          this.clearActiveHoverVideo();
        }, { passive: true });
      }
    }
    syncFiltersUI(activeParams) {
      Object.entries(activeParams).forEach(([groupId, activeValue]) => {
        document.querySelectorAll(`.nav-item[data-filter-group="${groupId}"]`).forEach((n) => {
          const val = n.dataset.filterValue;
          n.classList.toggle("active", val === activeValue);
        });
        document.querySelectorAll(`.mobile-dd-item[data-filter-group="${groupId}"]`).forEach((n) => {
          const val = n.dataset.filterValue;
          n.classList.toggle("active", val === activeValue);
        });
        document.querySelectorAll(`.sort-btn[data-filter-group="${groupId}"]`).forEach((n) => {
          const val = n.dataset.filterValue;
          n.classList.toggle("active", val === activeValue);
        });
        document.querySelectorAll(`.extra-filter-dropdown[data-group-id="${groupId}"] .site-dd-item`).forEach((n) => {
          const val = n.dataset.filterValue;
          n.classList.toggle("active", val === activeValue);
        });
        const dropdownBtn = document.querySelector(`.extra-filter-dropdown[data-group-id="${groupId}"] .site-switch-btn span`);
        if (dropdownBtn) {
          const filters = this.getActiveFilters();
          const group = filters.find((g) => g.id === groupId);
          const activeOpt = group == null ? void 0 : group.options.find((o) => o.id === activeValue);
          if (activeOpt) {
            dropdownBtn.textContent = `${group.title}: ${activeOpt.label}`;
          }
        }
      });
    }
    async loadInitialData() {
      try {
        const filters = this.getActiveFilters();
        const defaultParams = {};
        filters.forEach((group) => {
          if (group.options && group.options.length > 0) {
            defaultParams[group.id] = group.options[0].id;
          }
        });
        await this.pool.loadInitialData(defaultParams);
        this.syncFiltersUI(this.pool.getCurrentQuery());
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
        const prevLength = this.pool.getDataPool().length;
        this.pool.stopPrefetching();
        const newData = await this.pool.fetchNextPage();
        if (newData && newData.length > 0) {
          this.renderGrid(true);
          this.scheduleHomepagePrefetch(prevLength);
        } else if (this.pool.getDataPool().length === 0) {
          this.renderEmptyState();
        }
      } catch (error) {
        console.error("Failed to load more data:", error);
        this.appendRetryBlock();
      }
    }
    loadBookmarksData() {
      const bookmarks = loadGM(STORAGE_KEYS.BOOKMARKS_V2, []);
      let filtered = bookmarks;
      if (this.bookmarkFilterSite !== "all") {
        filtered = bookmarks.filter((b) => b.currentRankingSite === this.bookmarkFilterSite);
      }
      if (!this.bookmarkIncludeDownloaded) {
        const downloaded = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []));
        filtered = filtered.filter((b) => !downloaded.has(b.id));
      }
      if (this.bookmarkSort === "recent") {
        filtered.sort((a, b) => b.bookmarkTime - a.bookmarkTime);
      } else if (this.bookmarkSort === "oldest") {
        filtered.sort((a, b) => a.bookmarkTime - b.bookmarkTime);
      } else if (this.bookmarkSort === "views") {
        filtered.sort((a, b) => (b.pv || 0) - (a.pv || 0));
      } else if (this.bookmarkSort === "duration") {
        filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
      }
      const unifiedVideos = filtered.map((b) => ({
        id: b.id,
        url_cd: b.url_cd,
        thumbnail: b.thumbnail,
        title: b.tweetTitle,
        tweet_account: b.authorId,
        favorite: 0,
        pv: b.pv,
        duration: b.duration,
        url: b.url,
        isDetailsLoaded: !!b.url,
        originalUrl: b.videoUrl
      }));
      this.pool.setCustomDataPool(unifiedVideos);
      const el = document.getElementById("section-title");
      if (el) {
        const siteLabel = this.bookmarkFilterSite === "all" ? "\u5168\u90E8\u7AD9\u70B9" : this.bookmarkFilterSite.toUpperCase();
        const sortLabel = this.bookmarkSort === "recent" ? "\u6700\u8FD1\u6536\u85CF" : this.bookmarkSort === "oldest" ? "\u6700\u65E9\u6536\u85CF" : this.bookmarkSort === "views" ? "\u64AD\u653E\u6700\u591A" : "\u65F6\u957F\u6700\u957F";
        el.innerHTML = `${t("myBookmarks")} \xB7 ${siteLabel} \xB7 ${sortLabel} <button type="button" class="back-to-rankings-btn" id="back-to-rankings-btn">\u2190 \u8FD4\u56DE\u6392\u884C\u699C</button>`;
        const backBtn = document.getElementById("back-to-rankings-btn");
        backBtn == null ? void 0 : backBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.isBookmarksView = false;
          this.pool.clearCustomDataPool();
          this.createPageStructure();
          this.bindEvents();
          this.loadInitialData();
        });
      }
      this.renderFilterPanel();
      if (unifiedVideos.length === 0) {
        this.renderEmptyState();
      } else {
        this.renderGrid(false);
        this.playNo1AutoVideo();
      }
    }
    renderAll() {
      this.updateSectionTitle();
      this.renderGrid(false);
      this.playNo1AutoVideo();
      this.scheduleHomepagePrefetch(0);
    }
    updateSectionTitle() {
      const el = document.getElementById("section-title");
      if (!el) return;
      const q = this.pool.getCurrentQuery();
      const filters = this.getActiveFilters();
      const labels = [];
      filters.forEach((group) => {
        const val = q[group.id];
        const opt = group.options.find((o) => o.id === val) || group.options[0];
        if (opt) {
          labels.push(tLabel(opt.label));
        }
      });
      const titleText = labels.join(" \xB7 ");
      el.textContent = titleText;
    }
    renderEmptyState() {
      this.updateSectionTitle();
      const container = document.getElementById("grid-container");
      if (container) {
        container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="var(--text-400)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <h3>${t("emptyTitle")}</h3>
                    <p>${t("emptyDesc")}</p>
                </div>
            `;
      }
    }
    renderErrorState() {
      this.updateSectionTitle();
      const container = document.getElementById("grid-container");
      if (container) {
        container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="var(--accent-primary)"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>
                    <h3>${t("errorTitle")}</h3>
                    <p style="margin-bottom: 1.5rem">${t("errorDesc")}</p>
                    <button class="retry-btn" onclick="document.dispatchEvent(new CustomEvent('xflow-retry'))">${t("retryConnect")}</button>
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
                <p style="color: var(--text-300); margin-bottom: 1rem; font-size: 0.9rem;">${t("loadError")}</p>
                <button class="retry-btn" id="tm-retry-load">${t("retry")}</button>
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
    clearActiveHoverVideo() {
      if (this.hoverVideo) {
        this.hoverVideo.pause();
        this.hoverVideo.removeAttribute("src");
        this.hoverVideo.load();
        this.hoverVideo.remove();
        this.hoverVideo = null;
      }
      if (this.hoverCard) {
        this.hoverCard.classList.remove("hover-playing", "auto-playing-no1", "video-playing");
        this.hoverCard = null;
      }
    }
    getCleanBloggerName(name) {
      if (!name) return "";
      return name.replace(/的视频(空间)?$/g, "").trim();
    }
    switchToBookmarksView() {
      this.isBookmarksView = true;
      this.createPageStructure();
      this.bindEvents();
      this.loadBookmarksData();
    }
    async playNo1AutoVideo() {
      var _a;
      const grid = document.getElementById("grid-container");
      if (!grid) return;
      this.clearActiveHoverVideo();
      const card = grid.querySelector('.media-card[data-index="0"]');
      if (!card) return;
      const item = this.isBookmarksView ? (_a = this.pool.getCustomDataPool()) == null ? void 0 : _a[0] : this.pool.getDataPool()[0];
      if (!item) return;
      this.hoverCard = card;
      card.classList.add("hover-playing", "auto-playing-no1");
      let videoUrl = item.url || card.dataset.videoUrl || "";
      if (!videoUrl) {
        try {
          const resolved = await this.pool.loadDetails(item);
          videoUrl = (resolved == null ? void 0 : resolved.url) || "";
          if (videoUrl) {
            card.setAttribute("data-video-url", videoUrl);
          }
        } catch (err) {
          console.warn("Failed to resolve No.1 video URL:", err);
        }
      }
      if (!videoUrl || card !== this.hoverCard) {
        if (card === this.hoverCard) this.clearActiveHoverVideo();
        return;
      }
      const video = document.createElement("video");
      video.className = "card-hover-video no1-auto-video";
      video.src = videoUrl;
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      const onPlay = () => {
        card.classList.add("video-playing");
      };
      video.addEventListener("playing", onPlay, { once: true });
      video.addEventListener("timeupdate", onPlay, { once: true });
      card.appendChild(video);
      this.hoverVideo = video;
      this.hoverCard = card;
      video.play().catch(() => {
      });
    }
    scheduleHomepagePrefetch(startIndex = 0) {
      this.pool.stopPrefetching();
      if (this.isBookmarksView) return;
      setTimeout(() => {
        const playerModal = document.getElementById("tm-tiktok-modal");
        const isPlayerOpen = playerModal && playerModal.style.display !== "none";
        if (!isPlayerOpen && !this.isBookmarksView) {
          this.pool.startPrefetching(startIndex, 8, 1200);
        }
      }, 2500);
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
      const downloadedSet = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []));
      for (let i = startIndex; i < list.length; i++) {
        const item = list[i];
        const rankNum = i + 1;
        let rankClass = rankNum === 1 ? "rank-1" : rankNum === 2 ? "rank-2" : rankNum === 3 ? "rank-3" : "";
        const isDownloaded = downloadedSet.has(item.id);
        html += `
            <div class="media-card" style="animation-delay: ${i % 20 * 0.05}s" data-index="${i}" ${item.url ? `data-video-url="${escapeHtml(item.url)}"` : ""} role="button" tabindex="0" aria-label="${escapeHtml(item.title || "Video card")}">
                <img src="${item.thumbnail}" alt="${escapeHtml(item.title || "Thumbnail")}" class="card-img" loading="lazy" referrerpolicy="no-referrer">
                <div class="card-overlay"></div>
                <div class="card-rank ${rankClass}">No.${rankNum}</div>
                ${isDownloaded ? '<div class="card-downloaded-badge">\u2713 \u5DF2\u4E0B\u8F7D</div>' : ""}
                <div class="card-info">
                    <div class="card-author">${escapeHtml(this.getCleanBloggerName(item.authorDisplayName || item.tweet_account || ""))}</div>
                    ${item.title ? `<div class="card-title">${escapeHtml(item.title)}</div>` : ""}
                    <div class="card-stats">
                        <span class="stat"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></svg> ${formatCount(item.favorite)}</span>
                        ${item.commentCount || item._count && item._count.comments ? `<span class="stat"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg> ${formatCount(item.commentCount || item._count && item._count.comments)}</span>` : ""}
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
  const appCssText = '@import"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap";#xflow-app-root{--bg-base: #0D0D12;--bg-surface: #151519;--bg-surface-hover: #1C1C22;--bg-glass: rgba(18, 18, 22, .7);--accent-primary: oklch(60% .18 330);--accent-subtle: oklch(60% .18 330 / .1);--accent-cyan: oklch(72% .1 220);--accent-cyan-subtle: oklch(72% .1 220 / .1);--theme-accent: var(--accent-primary);--theme-accent-subtle: var(--accent-subtle);--text-100: #EBEBF0;--text-200: #C8C8D0;--text-300: #77778A;--text-400: #60607A;--font-display: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;--font-body: "Manrope", -apple-system, BlinkMacSystemFont, sans-serif;--ease-smooth: cubic-bezier(.16, 1, .3, 1);--ease-micro: cubic-bezier(.25, .1, .25, 1);--ease-out: cubic-bezier(.23, 1, .32, 1);--ease-drawer: cubic-bezier(.32, .72, 0, 1);--shadow-float: 0 12px 32px rgba(0,0,0,.45);--blur-heavy: blur(20px) saturate(110%);--glass-bg: rgba(20, 20, 25, .45);--glass-bg-hover: rgba(40, 40, 45, .55);--glass-border: rgba(255, 255, 255, .1);--glass-blur: blur(16px);--shadow-sm: 0 4px 12px rgba(0,0,0,.25);--primary-red: #ff2c55;background-color:var(--bg-base);color:var(--text-100);font-family:var(--font-body);overflow:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overscroll-behavior:none;-webkit-text-size-adjust:100%;touch-action:manipulation;height:100dvh;width:100dvw;position:fixed;top:0;right:0;bottom:0;left:0;z-index:999999}body>:not(#xflow-app-root):not(#xflow-splash):not(.xflow-confirm-overlay):not(#xflow-net-banner){display:none!important}:where(#xflow-app-root,#xflow-app-root *){margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}:where(#xflow-app-root) *:focus-visible{outline:2px solid var(--theme-accent);outline-offset:2px}#xflow-app-root.theme-anime{--theme-accent: var(--accent-cyan);--theme-accent-subtle: var(--accent-cyan-subtle)}.noise-overlay{display:none}.empty-state{grid-column:1 / -1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;color:var(--text-300);text-align:center}.empty-state svg{width:64px;height:64px;margin-bottom:1rem;opacity:.5}.empty-state h3{font-family:var(--font-display);font-size:1.5rem;margin-bottom:.5rem;color:var(--text-200)}.retry-block{grid-column:1 / -1;padding:2rem;text-align:center}.retry-btn{background:var(--bg-surface);color:var(--text-100);border:1px solid rgba(255,255,255,.06);padding:10px 24px;border-radius:99px;font-weight:600;cursor:pointer;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),transform .15s var(--ease-out)}@media (hover: hover) and (pointer: fine){.retry-btn:hover{background:var(--bg-surface-hover);border-color:#ffffff1f;transform:scale(1.02)}}.retry-btn:active{transform:scale(.97)}.app-layout{display:flex;height:100dvh;width:100dvw;position:fixed;top:0;right:0;bottom:0;left:0}.sidebar{width:280px;flex-shrink:0;background:var(--bg-surface);border-right:1px solid rgba(255,255,255,.03);display:flex;flex-direction:column;justify-content:space-between;padding:4vh 2vw;z-index:100;transition:width .24s var(--ease-out),padding .24s var(--ease-out);overflow:visible}.sidebar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:2.5rem;gap:12px}.sidebar-toggle-btn{width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:#ffffff08;color:var(--text-200);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),color .2s var(--ease-out),transform .15s var(--ease-out)}@media (hover: hover) and (pointer: fine){.sidebar-toggle-btn:hover{background:#ffffff0f;color:var(--text-100);border-color:#ffffff24}}.sidebar-toggle-btn:active{transform:scale(.97)}.sidebar-toggle-btn svg{transition:transform .24s var(--ease-out)}.brand{font-family:var(--font-display);font-size:1.5rem;font-weight:700;letter-spacing:-.02em;color:var(--text-100);display:flex;align-items:center;gap:8px;white-space:nowrap}.brand:after{content:"";display:block;width:6px;height:6px;background:var(--theme-accent);border-radius:50%;transition:background .25s var(--ease-out)}.app-layout.sidebar-collapsed .sidebar{width:88px;padding:3vh 10px}.app-layout.sidebar-collapsed .sidebar-toggle-btn svg{transform:rotate(180deg)}.app-layout.sidebar-collapsed .brand{justify-content:center;width:100%;gap:0}.app-layout.sidebar-collapsed .brand-text,.app-layout.sidebar-collapsed .brand:after,.app-layout.sidebar-collapsed .nav-title,.app-layout.sidebar-collapsed .nav-item-label{display:none}.app-layout.sidebar-collapsed .nav-item{justify-content:center;padding:1rem .4rem}.app-layout.sidebar-collapsed .nav-item.active:before{display:none}.nav-group{margin-bottom:1.5rem;border:none;display:flex;flex-direction:column;flex:1;min-height:0;overflow:visible}.nav-title{font-size:.75rem;text-transform:uppercase;letter-spacing:2px;color:var(--text-400);margin-bottom:1rem;font-weight:600;padding-left:.5rem}.nav-items-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding-right:4px;display:flex;flex-direction:column;gap:4px}.nav-items-scroll::-webkit-scrollbar{width:0;display:none}.nav-items-scroll{-ms-overflow-style:none;scrollbar-width:none}.nav-item{display:flex;align-items:center;gap:12px;padding:1.25rem 1.5rem;border-radius:12px;color:var(--text-200)!important;font-weight:500;font-size:.95rem;cursor:pointer;transition:background-color .2s var(--ease-out),color .2s var(--ease-out),transform .15s var(--ease-out);position:relative;overflow:hidden;border:none!important;background:transparent!important;outline:none!important}.nav-item svg{width:20px;height:20px;fill:currentColor;opacity:.6;transition:opacity .2s var(--ease-out),fill .2s var(--ease-out)}@media (hover: hover) and (pointer: fine){.nav-item:hover{background:#ffffff08!important;color:var(--text-100)!important}.nav-item:hover svg{opacity:1}}.nav-item.active{background:var(--theme-accent-subtle)!important;color:var(--theme-accent)!important;box-shadow:none!important;font-weight:600!important}.nav-item.active svg{fill:var(--theme-accent);opacity:1}.nav-item:active{transform:scale(.97)}.nav-item.active:before{content:"";position:absolute;left:0;top:25%;bottom:25%;width:3px;background:var(--theme-accent);border-radius:0 3px 3px 0;transition:background .25s var(--ease-out)}.main-container{flex:1;overflow-y:auto;overflow-x:hidden;position:relative;scroll-behavior:smooth}.topbar{position:sticky;top:0;z-index:50;padding:calc(env(safe-area-inset-top,0px) + 1.5vh) 4vw 1.5vh;background:transparent;display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box}.content-pad{padding:0 4vw 4rem}.pulse-wave{position:absolute;top:0;right:0;bottom:0;left:0;z-index:-1;opacity:0;background:radial-gradient(ellipse at top center,var(--theme-accent) 0%,transparent 60%);transform:scale(.95);pointer-events:none;transition:background .25s var(--ease-out)}.pulse-wave.pulse-anim{animation:channelPulse .4s var(--ease-out)}@keyframes channelPulse{0%{opacity:.15;transform:scale(1)}to{opacity:0;transform:scale(1.03)}}.channel-switch{display:none!important}.channel-slider{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:99px;background:var(--theme-accent);transition:transform .3s var(--ease-out),background .25s var(--ease-out);z-index:1}.channel-btn{position:relative;z-index:2;flex:1;padding:8px 0;text-align:center;border-radius:99px;cursor:pointer;font-size:.875rem;font-family:var(--font-body);font-weight:600;color:var(--text-300);border:none;background:transparent;transition:color .25s var(--ease-out);outline:none}.channel-btn.active{color:#fff}.sort-filters{display:flex;gap:1rem}.sort-btn{background:var(--bg-glass);backdrop-filter:var(--blur-heavy);-webkit-backdrop-filter:var(--blur-heavy);border:1px solid rgba(255,255,255,.06);color:var(--text-200);padding:8px 16px;border-radius:10px;font-family:var(--font-body);font-size:.875rem;font-weight:500;cursor:pointer;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),color .2s var(--ease-out),transform .15s var(--ease-out);display:flex;align-items:center;gap:6px}@media (hover: hover) and (pointer: fine){.sort-btn:hover{border-color:#ffffff1f;background:#ffffff0a}}.sort-btn.active{border-color:var(--theme-accent);color:var(--theme-accent);background:var(--theme-accent-subtle)}.sort-btn:active{transform:scale(.97)}.hero-carousel{position:relative;width:100%;height:52vh;min-height:400px;margin-bottom:4vh;overflow:hidden;border-radius:2rem}.hc-track{display:flex;width:600%;height:100%;transition:transform .55s var(--ease-smooth);will-change:transform}.hc-card{flex:0 0 calc(100% / 6);height:100%;position:relative;cursor:pointer;overflow:hidden;-webkit-user-select:none;user-select:none}.hc-clone{pointer-events:none}.hc-card-bg{position:absolute;top:0;right:0;bottom:0;left:0;background-size:cover;background-position:center 20%;opacity:0;transition:opacity .3s var(--ease-out),transform .4s var(--ease-out)}@media (hover: hover) and (pointer: fine){.hc-card:hover .hc-card-bg{transform:scale(1.04)}}.hc-card-overlay{position:absolute;top:0;right:0;bottom:0;left:0;background:linear-gradient(135deg,rgba(0,0,0,.55) 0%,transparent 50%),linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.3) 55%,transparent 100%);z-index:1}.hc-skeleton,.skeleton-pulse{position:relative;overflow:hidden;background:#ffffff08!important;z-index:0}.hc-skeleton{position:absolute;top:0;right:0;bottom:0;left:0}.skeleton-pulse{width:100%;height:100%;aspect-ratio:9/16;border-radius:1.5rem}.hc-skeleton:after,.skeleton-pulse:after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;transform:translate(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.05) 30%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.05) 70%,transparent);animation:tm-shimmer 1.8s infinite}@keyframes tm-shimmer{to{transform:translate(100%)}}.hc-badge{position:absolute;top:1.2rem;left:1.2rem;z-index:3;display:flex;align-items:center;gap:6px;background:#00000073;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:6px 12px}.hc-badge-icon{font-size:1rem;line-height:1}.hc-badge-label{font-family:var(--font-display);font-size:.9rem;font-weight:700;color:#fff;letter-spacing:.02em}.hc-badge-en{font-family:var(--font-body);font-size:.72rem;font-weight:500;color:#ffffff80;letter-spacing:.06em;text-transform:uppercase}.hc-badge-rank{font-family:var(--font-display);font-size:.85rem;font-weight:800;color:var(--theme-accent);margin-left:4px;padding-left:10px;border-left:1px solid rgba(255,255,255,.2)}.hc-rank-num{position:absolute;top:1rem;right:1.5rem;font-family:var(--font-display);font-size:4rem;font-weight:800;background:linear-gradient(135deg,#ffd70059,#daa52040,#b8860b33);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;-webkit-text-stroke:1px rgba(255,215,0,.15);filter:drop-shadow(0 0 8px rgba(255,200,0,.12));z-index:2;line-height:1;letter-spacing:-.04em;pointer-events:none}.hc-card-content{position:absolute;bottom:0;left:0;right:0;padding:2rem 1.5rem;z-index:3;display:flex;flex-direction:column;gap:.75rem}.hc-title{font-family:var(--font-display);font-size:1.25rem;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;letter-spacing:-.01em;color:#fff;min-height:2.4em}.hc-meta{display:flex;align-items:center;gap:1.2rem}.hc-stat{display:flex;align-items:center;gap:5px;font-size:.8rem;font-weight:600;color:#ffffffbf}.hc-stat svg{width:14px;height:14px;fill:var(--theme-accent);flex-shrink:0;transition:fill .25s var(--ease-out)}.hc-play-btn{width:44px;height:44px;border-radius:50%;background:var(--theme-accent);display:flex;align-items:center;justify-content:center;transition:transform .2s var(--ease-out),box-shadow .2s var(--ease-out);box-shadow:0 0 20px -4px var(--theme-accent);align-self:flex-end;margin-top:-4.5rem}@media (hover: hover) and (pointer: fine){.hc-card:hover .hc-play-btn{transform:scale(1.12);box-shadow:0 0 32px -2px var(--theme-accent)}}.hc-play-btn:active{transform:scale(.96)!important}.hc-play-btn svg{width:20px;height:20px;fill:#fff;margin-left:2px}.hc-indicators{position:absolute;bottom:1rem;left:50%;transform:translate(-50%);z-index:10;display:flex;gap:6px;align-items:center}.hc-dot{width:6px;height:6px;border-radius:99px;background:#ffffff4d;border:none;cursor:pointer;padding:0;transition:width .25s var(--ease-out),background .25s var(--ease-out),box-shadow .25s var(--ease-out)}.hc-dot.active{width:22px;background:var(--theme-accent);box-shadow:0 0 8px var(--theme-accent)}.hc-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:10;width:36px;height:36px;border-radius:50%;background:#0006;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),opacity .2s var(--ease-out),transform .15s var(--ease-out);opacity:0}.hero-carousel:hover .hc-arrow{opacity:1}@media (hover: hover) and (pointer: fine){.hc-arrow:hover{background:#000000a6;border-color:#fff3;transform:translateY(-50%) scale(1.08)}}.hc-arrow:active{transform:translateY(-50%) scale(.96)!important}.hc-arrow svg{width:20px;height:20px;fill:#fff}.hc-arrow-left{left:.75rem}.hc-arrow-right{right:.75rem}.hc-card+.hc-card{border-left:1px solid rgba(255,255,255,.05)}.hc-card-video{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:0;transition:opacity .3s var(--ease-out);pointer-events:none}.hc-card-video.playing{opacity:1;z-index:0}.hc-card-bg{z-index:0}.hc-card-overlay{z-index:1}.hc-rank-num{transition:opacity .2s var(--ease-out)}.hc-rank-num.switching{animation:rankPulse .3s var(--ease-out)}@keyframes rankPulse{0%{opacity:1;transform:scale(1)}30%{opacity:0;transform:scale(.85)}70%{opacity:0;transform:scale(1.15)}to{opacity:1;transform:scale(1)}}.card-hover-video{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;object-fit:cover;z-index:5;border-radius:inherit;background:#000;opacity:0;transition:opacity .25s var(--ease-out);pointer-events:none}.media-card.hover-playing.video-playing .card-hover-video{opacity:1}.media-card.hover-playing.video-playing .card-img{opacity:.2}.media-card.hover-playing .card-overlay{opacity:.5}.media-card .card-rank,.media-card .card-info,.media-card .card-play-icon{z-index:6}.section-title{font-family:var(--font-display);font-size:1.5rem;font-weight:600;margin-bottom:2vh;display:flex;align-items:center;justify-content:space-between;letter-spacing:-.01em}.media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:2vw}.media-card{position:relative;border-radius:1rem;overflow:hidden;aspect-ratio:9/16;cursor:pointer;background:transparent;opacity:0;transform:translateY(12px);animation:cardRise .4s var(--ease-out) forwards;transition:transform .2s var(--ease-out),box-shadow .2s var(--ease-out);border:none;-webkit-user-select:none;-webkit-touch-callout:none;user-select:none}.media-card.sinking{animation:cardSink .2s var(--ease-out) forwards!important}.media-card:active{transform:translateY(0) scale(.97)!important;transition:transform .1s var(--ease-out)!important}@keyframes cardRise{0%{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}@keyframes cardSink{to{opacity:0;transform:translateY(12px) scale(.97)}}.card-img{width:100%;height:100%;object-fit:cover;transition:transform .4s var(--ease-out)}@media (hover: hover) and (pointer: fine){.media-card:hover .card-img{transform:scale(1.03)}}.card-overlay{position:absolute;top:0;right:0;bottom:0;left:0;background:linear-gradient(180deg,rgba(0,0,0,.2) 0%,transparent 40%,rgba(0,0,0,.9) 100%);transition:opacity .25s var(--ease-out)}.card-rank{position:absolute;top:12px;left:12px;background:#00000080;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:4px 10px;border-radius:8px;font-family:var(--font-display);font-weight:600;font-size:.8rem;color:var(--text-200)}.rank-1{color:#d4b96a}.rank-2{color:#a8a8b0}.rank-3{color:#b08050}.card-info{position:absolute;bottom:0;left:0;right:0;padding:16px;transform:translateY(4px);transition:transform .25s var(--ease-out)}.card-author{font-size:.85rem;font-weight:700;color:#fff;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-title{font-size:.75rem;font-weight:500;line-height:1.3;color:var(--text-200);display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:6px;overflow-wrap:break-word;word-break:break-all}.card-stats{display:flex;gap:12px;font-size:.75rem;color:var(--text-300);font-weight:500;opacity:.8;transition:opacity .25s var(--ease-out)}.card-play-icon{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.9);width:44px;height:44px;border-radius:50%;background:#0006;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s var(--ease-out),transform .25s var(--ease-out)}.card-play-icon svg{width:18px;height:18px;fill:#fff;margin-left:2px}@media (hover: hover) and (pointer: fine){.media-card:hover .card-info{transform:translateY(0)}.media-card:hover .card-stats{opacity:1}.media-card:hover .card-play-icon{opacity:1;transform:translate(-50%,-50%) scale(1)}}.mobile-nav{display:none}.topbar-center{display:flex;align-items:center;gap:12px}.mobile-menu-btn-wrap{position:relative;display:none}.mobile-circle-btn{width:36px;height:36px;border-radius:50%;background:#ffffff14;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.06);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),transform .15s var(--ease-out)}@media (hover: hover) and (pointer: fine){.mobile-circle-btn:hover{background:#ffffff1f;border-color:#ffffff1a}}.mobile-circle-btn:active{transform:scale(.96)}.mobile-dropdown{position:absolute;top:calc(100% + 8px);min-width:160px;background:#141418f2;backdrop-filter:blur(20px) saturate(120%);-webkit-backdrop-filter:blur(20px) saturate(120%);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:6px;opacity:0;visibility:hidden;transform:translateY(-8px) scale(.95);transition:opacity .25s var(--ease-smooth),visibility .25s var(--ease-smooth),transform .25s var(--ease-smooth);z-index:200;box-shadow:0 8px 32px #00000080}.mobile-dropdown.open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}#range-dropdown{left:0;transform-origin:top left}#sort-dropdown{right:0;transform-origin:top right}.mobile-dd-item{display:block;width:100%;padding:10px 14px;border:none;background:transparent;color:var(--text-200);font-family:var(--font-body);font-size:.875rem;font-weight:500;text-align:left;border-radius:10px;cursor:pointer;transition:background .2s var(--ease-out),color .2s var(--ease-out),transform .15s var(--ease-out)}@media (hover: hover) and (pointer: fine){.mobile-dd-item:hover{background:#ffffff0a;color:var(--text-100)}}.mobile-dd-item:active{transform:scale(.97)}.mobile-dd-item.active{color:var(--theme-accent);background:var(--theme-accent-subtle);font-weight:600}@media (max-width: 1024px){.hc-title{font-size:1.1rem}}@media (max-width: 768px){.app-layout{flex-direction:column}.sidebar{display:none}.topbar{padding:calc(env(safe-area-inset-top,0px) + .5rem) 0 .5rem;border-bottom:none;justify-content:center}.sort-filters{display:none}.topbar-center{width:100%;justify-content:space-between;padding:0 14px}.mobile-menu-btn-wrap{display:block}.content-pad{padding:1rem 1.2rem 6rem}.hero-carousel{height:56vw;min-height:260px;border-radius:16px;margin-bottom:1.5rem}.hc-title{font-size:1rem}.hc-badge{padding:4px 9px}.hc-rank-num{font-size:3rem}.hc-arrow{display:none}.media-grid{grid-template-columns:repeat(2,1fr);gap:1rem}.card-title{font-size:.8rem}.card-stats{font-size:.7rem}.mobile-nav{display:flex;position:fixed;bottom:0;left:0;right:0;background:#0d0d12e6;backdrop-filter:var(--blur-heavy);-webkit-backdrop-filter:var(--blur-heavy);border-top:1px solid rgba(255,255,255,.04);padding:12px 24px calc(env(safe-area-inset-bottom) + 12px);justify-content:space-between;z-index:100}.m-nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--text-400);font-size:.65rem;font-weight:600}.m-nav-item svg{width:24px;height:24px;fill:currentColor;transition:transform .25s var(--ease-smooth)}.m-nav-item.active{color:var(--theme-accent)}.m-nav-item.active svg{transform:translateY(-1px)}}html.tm-tiktok-open,body.tm-tiktok-open{overflow:hidden!important;touch-action:none!important;overscroll-behavior:none!important;height:100dvh!important;background:#000!important}#tm-tiktok-modal{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483646;display:none;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;-webkit-user-select:none;user-select:none;touch-action:pan-x;overflow-anchor:none;contain:layout size style;height:100dvh;opacity:0;transform:scale(.96);transition:opacity .2s cubic-bezier(.3,0,.8,.15),transform .2s cubic-bezier(.3,0,.8,.15)}#tm-tiktok-modal.active{display:block;opacity:1;transform:scale(1);transition:opacity .32s var(--ease-out),transform .32s var(--ease-out)}.tm-video-stage{position:absolute;top:0;right:0;bottom:0;left:0;overflow:hidden;background:#000 center center / cover no-repeat}.tm-video-stage:before{content:"";position:absolute;top:0;right:0;bottom:0;left:0;background:inherit;filter:blur(18px) brightness(.4);transform:scale(1.08)}.tm-video-stage:after{content:"";position:absolute;top:0;left:0;right:0;height:100px;background:linear-gradient(to bottom,rgba(0,0,0,.5) 0%,rgba(0,0,0,.2) 40%,transparent 100%);pointer-events:none;z-index:3;transition:opacity .28s var(--ease-out)}.tm-thumb,.tm-video{position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;object-fit:contain;background:#000}.tm-thumb{z-index:2;opacity:1;transition:opacity .2s var(--ease-out)}.tm-thumb.hidden{opacity:0}.tm-video{z-index:1;opacity:0;transition:opacity .2s var(--ease-out)}.tm-video.visible{opacity:1}.tm-video::-webkit-media-controls,.tm-video::-webkit-media-controls-enclosure{display:none!important}@keyframes tm-slide-out-up{0%{transform:translateY(0);opacity:1}to{transform:translateY(-100%);opacity:0}}@keyframes tm-slide-in-up{0%{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes tm-slide-out-down{0%{transform:translateY(0);opacity:1}to{transform:translateY(100%);opacity:0}}@keyframes tm-slide-in-down{0%{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}.tm-video-stage.slide-out-up{animation:tm-slide-out-up .28s ease-out forwards}.tm-video-stage.slide-in-up{animation:tm-slide-in-up .28s ease-out forwards}.tm-video-stage.slide-out-down{animation:tm-slide-out-down .28s ease-out forwards}.tm-video-stage.slide-in-down{animation:tm-slide-in-down .28s ease-out forwards}.tm-topbar{position:absolute;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top) + 12px) 14px 12px;pointer-events:auto}.tm-pill{background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;box-shadow:var(--shadow-sm);letter-spacing:.5px}.tm-top-actions{display:flex;gap:10px}.tm-btn{width:40px;height:40px;border:none;border-radius:50%;background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),transform .15s var(--ease-out);box-shadow:var(--shadow-sm)}.tm-btn svg{width:22px;height:22px;fill:#fff;transition:transform .15s var(--ease-out)}@media (hover: hover) and (pointer: fine){.tm-btn:hover{background:var(--glass-bg-hover);transform:scale(1.05);border-color:#ffffff26}}.tm-btn:active{transform:scale(.96)!important}.tm-info{position:absolute;left:14px;right:76px;bottom:84px;z-index:20;pointer-events:auto;display:flex;flex-direction:column;gap:4px;text-shadow:0 1px 4px rgba(0,0,0,.8)}.tm-author-name{font-size:15px;font-weight:700;color:#fff;letter-spacing:.3px}.tm-title{font-size:14px;line-height:1.35;font-weight:500;color:#ffffffe6;max-height:2.8em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-overflow:ellipsis;word-break:break-all}.tm-actions{position:absolute;right:12px;bottom:84px;z-index:20;display:flex;flex-direction:column;gap:20px;pointer-events:auto}.tm-action{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;background:transparent;border:none;padding:0;outline:none}.tm-action .icon{width:46px;height:46px;border-radius:50%;background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),transform .15s var(--ease-out),color .2s var(--ease-out);box-shadow:var(--shadow-sm);color:#fff}@media (hover: hover) and (pointer: fine){.tm-action:hover .icon{background:var(--glass-bg-hover);transform:scale(1.08);border-color:#fff3}}.tm-action:active .icon{transform:scale(.96)}.tm-action .icon svg{width:24px;height:24px;fill:currentColor;transition:transform .25s var(--ease-out),fill .25s var(--ease-out)}.tm-action .txt{font-size:13px;color:#ffffffe6;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,.8);transition:color .3s;display:block;max-width:68px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}.tm-action.like.active .icon{border-color:#ff2c5566;background:#ff2c5526;color:var(--primary-red)}.tm-action.like.active .icon svg{animation:tm-heart-beat .5s cubic-bezier(.175,.885,.32,1.275)}@keyframes tm-heart-beat{0%{transform:scale(1)}20%{transform:scale(1.3)}40%{transform:scale(.9)}60%{transform:scale(1.15)}to{transform:scale(1)}}.tm-action.bookmark.active .icon{border-color:#00c8dc4d;background:#00c8dc1a;color:#60d0d8}.tm-volume-wrap{position:absolute;bottom:58px;right:16px;z-index:25;display:flex;align-items:center;gap:10px;pointer-events:auto}.tm-vol-btn{width:32px;height:32px;border-radius:50%;background:var(--glass-bg);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s var(--ease-out),transform .15s var(--ease-out);box-shadow:var(--shadow-sm)}@media (hover: hover) and (pointer: fine){.tm-vol-btn:hover{background:var(--glass-bg-hover);transform:scale(1.05)}}.tm-vol-btn:active{transform:scale(.96)}.tm-vol-slider-wrap{width:80px;height:6px;background:#fff3;border-radius:4px;cursor:pointer;position:relative;overflow:hidden;transition:height .15s ease;box-shadow:inset 0 1px 3px #0000004d}.tm-vol-slider-wrap:hover{height:8px}.tm-vol-fill{height:100%;background:#fff;border-radius:4px;width:0%;pointer-events:none;transition:width .1s linear}.tm-progress-wrap{position:absolute;left:14px;right:14px;bottom:calc(env(safe-area-inset-bottom) + 20px);z-index:25;display:flex;align-items:center;gap:12px;pointer-events:auto;cursor:pointer;padding:10px 0;outline:none}.tm-progress-wrap:before{content:"";position:absolute;left:-14px;right:-14px;bottom:-24px;height:160px;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.4) 50%,transparent 100%);z-index:-1;pointer-events:none;transition:height .3s ease,opacity .28s var(--ease-out)}.tm-progress{position:relative;flex:1;height:4px;background:#ffffff40;border-radius:4px;transition:height .15s var(--ease-smooth)}.tm-progress-fill{position:absolute;left:0;top:0;bottom:0;width:0%;background:#fff;border-radius:inherit}.tm-progress-fill:after{content:"";position:absolute;right:-8px;top:50%;width:16px;height:16px;border-radius:50%;background:#fff;transform:translateY(-50%) scale(0);transition:transform .25s var(--ease-smooth);pointer-events:none;box-shadow:0 0 10px #0000004d}.tm-time{font-size:13px;font-weight:600;min-width:80px;text-align:right;color:#fffffff2;font-variant-numeric:tabular-nums;text-shadow:0 1px 3px rgba(0,0,0,.8)}.tm-progress-wrap:hover .tm-progress,.tm-progress-wrap.dragging .tm-progress{height:8px;background:#fff6}.tm-progress-wrap:hover .tm-progress-fill:after,.tm-progress-wrap.dragging .tm-progress-fill:after{transform:translateY(-50%) scale(1)}.tm-loading,.tm-error,.tm-center-icon,.tm-speed-tip{position:absolute;z-index:30}.tm-loading{left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none}.tm-loading .spinner{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.12);border-top-color:var(--primary-red);animation:tm-spin .8s linear infinite;margin:0 auto 12px}.tm-center-icon{left:50%;top:50%;transform:translate(-50%,-50%) scale(.8);width:74px;height:74px;border-radius:50%;background:#00000073;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;pointer-events:none}.tm-center-icon.show{display:flex;animation:tm-pop-icon .5s cubic-bezier(.175,.885,.32,1.275) forwards}.tm-center-icon svg{width:36px;height:36px;fill:#fff}@keyframes tm-pop-icon{0%{opacity:0;transform:translate(-50%,-50%) scale(.85)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}.tm-speed-tip{top:calc(env(safe-area-inset-top) + 62px);left:50%;transform:translate(-50%);display:none;background:#0000008c;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;pointer-events:none}.tm-speed-tip.show{display:block;animation:tm-fade-in .3s ease forwards}@keyframes tm-fade-in{0%{opacity:0}to{opacity:1}}.tm-settings{position:absolute;top:calc(env(safe-area-inset-top) + 58px);right:14px;z-index:40;width:220px;display:none;background:#141414f2;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:16px;overflow:hidden;box-shadow:0 12px 40px #00000080;transform-origin:top right}.tm-settings.active{display:block;animation:tm-modal-in .25s var(--ease-smooth) forwards}.tm-setting-item{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;font-size:14px;font-weight:500;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;transition:background .2s}.tm-setting-item:hover{background:#ffffff0f}.tm-switch{width:44px;height:26px;border-radius:999px;background:#fff3;position:relative;transition:background .3s var(--ease-smooth)}.tm-switch:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 4px #0003;transition:transform .3s var(--ease-smooth)}.tm-setting-item.active .tm-switch{background:var(--theme-accent)}.tm-setting-item.active .tm-switch:after{transform:translate(18px)}.tm-speed-panel{position:absolute;top:calc(env(safe-area-inset-top) + 58px);right:60px;z-index:40;display:none;background:#141414f2;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:14px;overflow:hidden;box-shadow:0 12px 40px #00000080;pointer-events:auto;transform-origin:top right}.tm-speed-panel.active{display:block;animation:tm-modal-in .2s var(--ease-smooth) forwards}.tm-speed-option{display:block;width:100%;padding:12px 24px;border:none;background:transparent;color:var(--text-200);font-family:var(--font-body);font-size:14px;font-weight:600;text-align:center;cursor:pointer;transition:background .2s var(--ease-out),color .2s var(--ease-out),transform .15s var(--ease-out)}@media (hover: hover) and (pointer: fine){.tm-speed-option:hover{background:#ffffff0f;color:#fff}}.tm-speed-option:active{transform:scale(.97)}.tm-speed-option.active{color:var(--theme-accent);background:var(--theme-accent-subtle)}.tm-speed-option+.tm-speed-option{border-top:1px solid rgba(255,255,255,.06)}.tm-speed-btn{min-width:40px}.tm-action.author .icon{background:#50b4ff1f;border-color:#50b4ff33}.tm-action.author:hover .icon{background:#50b4ff33}.tm-doubletap-feedback{position:absolute;top:50%;z-index:30;display:flex;align-items:center;gap:6px;padding:10px 18px;border-radius:999px;background:#0000008c;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:14px;font-weight:600;color:#fff;pointer-events:none;opacity:0}.tm-doubletap-feedback.left{left:15%;transform:translate(-50%,-50%);animation:tm-doubletap-pop-left .6s cubic-bezier(.34,1.56,.64,1) forwards}.tm-doubletap-feedback.right{right:15%;transform:translate(50%,-50%);animation:tm-doubletap-pop-right .6s cubic-bezier(.34,1.56,.64,1) forwards}.tm-doubletap-feedback svg{width:18px;height:18px;fill:#fff}@keyframes tm-doubletap-pop-left{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}to{opacity:0;transform:translate(-50%,-50%) scale(1)}}@keyframes tm-doubletap-pop-right{0%{opacity:0;transform:translate(50%,-50%) scale(.7)}30%{opacity:1;transform:translate(50%,-50%) scale(1.05)}to{opacity:0;transform:translate(50%,-50%) scale(1)}}.tm-highlight-marker{position:absolute;top:50%;width:6px;height:6px;border-radius:50%;background:var(--theme-accent);transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 0 6px var(--theme-accent);z-index:5;opacity:.85;transition:opacity .3s ease}.tm-action.comment .icon{background:#a0a0ff1f;border-color:#a0a0ff33}.tm-action.comment:hover .icon{background:#a0a0ff33}.tm-comment-panel{position:absolute;bottom:0;left:0;right:0;height:60vh;background:#141418fa;border-top-left-radius:16px;border-top-right-radius:16px;z-index:100;transform:translateY(100%);transition:transform .2s cubic-bezier(.3,0,.8,.15);display:flex;flex-direction:column;box-shadow:0 -4px 20px #00000080;pointer-events:auto}.tm-comment-panel.active{transform:translateY(0);transition:transform .35s var(--ease-drawer)}.tm-comment-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06);font-weight:600;font-size:15px}.tm-comment-close{background:none;border:none;color:#fff;cursor:pointer;padding:4px;display:flex;align-items:center;opacity:.8;transition:opacity .2s}.tm-comment-close:hover{opacity:1}.tm-comment-close svg{width:22px;height:22px;fill:currentColor}.tm-comment-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:16px;overscroll-behavior:contain}.tm-comment-item{display:flex;flex-direction:column;gap:6px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.04)}.tm-comment-item:last-child{border-bottom:none}.tm-comment-time{font-size:11px;color:var(--text-400)}.tm-comment-content{font-size:13px;color:var(--text-100);line-height:1.5;word-break:break-all}.tm-comment-footer{padding:12px 20px calc(env(safe-area-inset-bottom) + 12px);border-top:1px solid rgba(255,255,255,.06);display:flex;gap:12px;background:#141418}.tm-comment-input{flex:1;background:#ffffff0f;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;outline:none;transition:border-color .2s}.tm-comment-input:focus{border-color:var(--theme-accent)}.tm-comment-send{background:var(--theme-accent);color:#fff;border:none;border-radius:8px;padding:0 16px;font-weight:600;cursor:pointer;opacity:.9;transition:opacity .2s,transform .2s}.tm-comment-send:hover{opacity:1}.tm-comment-send:active{transform:scale(.95)}.tm-comment-send:disabled{background:#ffffff1a;color:#ffffff4d;cursor:not-allowed;transform:none}.tm-comment-empty{text-align:center;color:var(--text-400);padding:30px 0;font-size:13px}.tm-comment-loading{display:flex;justify-content:center;padding:30px 0}.tm-comment-loading .spinner{width:24px;height:24px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--theme-accent);border-radius:50%;animation:tm-spin .8s linear infinite}.tm-swipe-mask{position:absolute;top:0;right:0;bottom:0;left:0;z-index:5;cursor:pointer;pointer-events:auto}@media (max-width: 768px){.tm-btn{width:36px;height:36px}.tm-action .icon{width:44px;height:44px}.tm-action .txt{font-size:12px}.tm-actions{bottom:104px;right:12px;gap:16px}.tm-info{bottom:74px;left:14px;right:70px;gap:2px}.tm-author-name{font-size:14px}.tm-title{font-size:13px}.tm-volume-wrap{display:none!important}.tm-progress-wrap{bottom:calc(env(safe-area-inset-bottom) + 16px);padding:12px 0}.tm-pill{font-size:12px;padding:6px 12px}}#tm-comment-btn{display:none!important}.tm-gesture-speed-tip{position:absolute;top:calc(env(safe-area-inset-top) + 64px);left:50%;transform:translate(-50%) scale(.95);background:#0009;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);color:#fff;padding:8px 18px;border-radius:99px;font-size:13px;font-weight:700;pointer-events:none;opacity:0;z-index:100;transition:opacity .25s var(--ease-smooth),transform .25s var(--ease-smooth)}.tm-gesture-speed-tip.show{opacity:1;transform:translate(-50%) scale(1)}.tm-gesture-scrub-overlay{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(.9);background:#0d0d12d9;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px 32px;box-shadow:0 24px 60px #000000a6;opacity:0;pointer-events:none;z-index:100;transition:opacity .2s var(--ease-smooth),transform .2s var(--ease-smooth)}.tm-gesture-scrub-overlay.show{opacity:1;transform:translate(-50%,-50%) scale(1)}.tm-gesture-scrub-overlay .scrub-time{font-family:var(--font-body);font-size:18px;font-weight:700;letter-spacing:.5px;color:#fff;font-variant-numeric:tabular-nums}.tm-gesture-step-feedback{position:absolute;top:50%;z-index:30;display:flex;align-items:center;gap:6px;padding:12px 20px;border-radius:999px;background:#0009;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:14px;font-weight:700;color:#fff;pointer-events:none;opacity:0}.tm-gesture-step-feedback.left{left:15%;transform:translate(-50%,-50%);animation:tm-doubletap-pop-left .6s var(--ease-smooth) forwards}.tm-gesture-step-feedback.right{right:15%;transform:translate(50%,-50%);animation:tm-doubletap-pop-right .6s var(--ease-smooth) forwards}.tm-author-panel{position:absolute;top:0;bottom:0;right:0;width:380px;background:#121216f5;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-left:1px solid var(--glass-border);z-index:100;transform:translate(100%);transition:transform .2s cubic-bezier(.3,0,.8,.15);display:flex;flex-direction:column;box-shadow:-4px 0 20px #00000080;pointer-events:auto}.tm-author-panel.active{transform:translate(0);transition:transform .35s var(--ease-drawer)}.tm-author-header{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.06)}.tm-author-title{font-weight:700;font-size:16px;color:#fff}.tm-author-close{background:none;border:none;color:#fff;cursor:pointer;padding:4px;display:flex;align-items:center;opacity:.8;transition:opacity .15s var(--ease-out)}.tm-author-close:hover{opacity:1}.tm-author-close svg{width:22px;height:22px;fill:currentColor}.tm-author-profile{padding:20px;display:flex;flex-direction:column;gap:14px;border-bottom:1px solid rgba(255,255,255,.06)}.tm-author-profile-top{display:flex;align-items:center;gap:16px}.tm-author-avatar-big{width:56px;height:56px;border-radius:50%;background:#ffffff1a;border:2px solid var(--theme-accent);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;text-transform:uppercase}.tm-author-info-text{display:flex;flex-direction:column;gap:4px}.tm-author-name-big{font-size:16px;font-weight:700;color:#fff}.tm-author-handle-big{font-size:13px;color:var(--text-400)}.tm-author-external-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--theme-accent);color:#fff;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;transition:background .15s var(--ease-out),opacity .15s var(--ease-out),transform .15s var(--ease-out);text-align:center}@media (hover: hover) and (pointer: fine){.tm-author-external-btn:hover{opacity:.95}}.tm-author-external-btn:active{transform:scale(.97)}.tm-author-videos-grid{flex:1;overflow-y:auto;padding:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;overscroll-behavior:contain;min-height:0}.tm-author-video-card{position:relative;display:block;width:100%;height:0;padding-bottom:177.78%;border-radius:6px;overflow:hidden;cursor:pointer;border:1px solid rgba(255,255,255,.08);background:#0000004d;transition:transform .2s var(--ease-out),border-color .2s var(--ease-out);box-sizing:border-box}@media (hover: hover) and (pointer: fine){.tm-author-video-card:hover{transform:scale(1.03);border-color:var(--theme-accent)}}.tm-author-video-card:active{transform:scale(.97)}.tm-author-video-card img{position:absolute;top:0;left:0;width:100%!important;height:100%!important;object-fit:cover;display:block}.tm-author-video-card .duration{position:absolute;bottom:4px;right:4px;background:#0009;padding:2px 4px;border-radius:3px;font-size:10px;font-weight:600;color:#fff}@media (max-width: 768px){.tm-author-panel{width:100%;height:100%;top:0;bottom:0;left:0;right:0;border-left:none;border-top:none;border-radius:0;transform:translate(100%)}.tm-author-panel.active{transform:translate(0)}.tm-author-videos-grid{grid-template-columns:repeat(3,1fr)}}.site-switch-wrap{position:relative;display:inline-block;pointer-events:auto}.site-switch-btn{display:flex;align-items:center;gap:6px;background:#ffffff14;border:1px solid var(--glass-border);border-radius:999px;padding:0 14px;height:36px;box-sizing:border-box;font-size:13px;font-weight:600;color:#fff;cursor:pointer;transition:background .2s ease,border-color .2s ease;font-family:var(--font-body)}.site-switch-btn:hover{background:#ffffff26;border-color:#ffffff4d}.site-switch-btn svg{transition:transform .2s ease}.site-switch-wrap.active .site-switch-btn svg{transform:rotate(180deg)}.site-switch-dropdown{position:absolute;top:calc(100% + 8px);left:50%;transform:translate(-50%) scale(.95);opacity:0;pointer-events:none;width:140px;background:#141418f5;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:12px;padding:6px 0;box-shadow:0 10px 30px #00000080;z-index:1000;transition:opacity .2s var(--ease-smooth),transform .2s var(--ease-smooth);transform-origin:top center;display:flex;flex-direction:column}.site-switch-wrap.active .site-switch-dropdown{opacity:1;pointer-events:auto;transform:translate(-50%) scale(1)}.site-dd-item{display:block;width:100%;padding:10px 16px;font-size:13px;font-weight:500;color:var(--text-200)!important;text-decoration:none;text-align:center;transition:background .2s,color .2s;box-sizing:border-box;background:transparent!important;border:none!important;outline:none!important;cursor:pointer}.site-dd-item:hover{background:#ffffff0f!important;color:#fff!important}.site-dd-item.active{color:var(--theme-accent)!important;font-weight:700!important;background:var(--theme-accent-subtle)!important}.tm-error-overlay{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0d0d12d9;color:var(--text-200);z-index:5;font-family:var(--font-title);gap:12px;padding:20px;text-align:center}.tm-error-overlay svg{width:48px;height:48px;color:var(--text-400)}.tm-error-overlay span{font-size:1rem;font-weight:500;letter-spacing:.5px}.tm-error-overlay.hidden{display:none!important}.lang-icon-btn{padding:0!important;border-radius:50%!important;width:36px!important;height:36px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}.topbar-left{display:flex;gap:8px;align-items:center;flex:1;justify-content:flex-start;pointer-events:auto}.topbar-center{display:flex;align-items:center;gap:8px;justify-content:center;flex:1;pointer-events:auto}.sort-filters{display:flex;gap:8px;align-items:center;flex:1;justify-content:flex-end;pointer-events:auto}.mobile-switches-row{display:none}@media (max-width: 768px){.topbar{padding:calc(env(safe-area-inset-top,0px) + 12px) 16px 12px!important;background:#0d0d12d1!important;backdrop-filter:blur(20px) saturate(120%)!important;-webkit-backdrop-filter:blur(20px) saturate(120%)!important;border-bottom:1px solid rgba(255,255,255,.05)!important;justify-content:space-between!important}.topbar-left,.sort-filters{display:none!important}.topbar-center{flex:1;display:flex!important;flex-direction:row!important;justify-content:space-between!important;align-items:center!important;width:100%!important;position:relative;padding:0!important;gap:0!important}.mobile-switches-row{display:flex!important;gap:8px!important;justify-content:center!important;align-items:center!important;margin:0!important;width:auto!important;flex:1!important}#range-menu-wrap{position:relative!important;left:0!important;top:0!important;transform:none!important;display:flex!important;align-items:center!important}#sort-menu-wrap{position:relative!important;right:0!important;top:0!important;transform:none!important;display:flex!important;align-items:center!important}.channel-switch{display:flex!important;position:relative;background:#ffffff0d;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.08);border-radius:99px;padding:3px;width:140px;height:36px;box-sizing:border-box;align-items:center}}.filter-section-container{margin-bottom:1.5rem;display:flex;flex-direction:column;width:100%}.filter-header-row{display:flex;align-items:center;justify-content:space-between;width:100%}.filter-toggle-btn{display:inline-flex;align-items:center;gap:6px;background:#ffffff08!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:999px!important;padding:8px 16px;font-size:13px;font-weight:600;color:var(--text-200)!important;cursor:pointer;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),color .2s var(--ease-out),transform .15s var(--ease-out);font-family:var(--font-body);outline:none!important}@media (hover: hover) and (pointer: fine){.filter-toggle-btn:hover{background:#ffffff0f!important;border-color:#ffffff24!important}}.filter-toggle-btn.active{background:var(--theme-accent-subtle)!important;border-color:var(--theme-accent)!important;color:var(--theme-accent)!important}.filter-toggle-btn:active{transform:scale(.97)}.filter-expand-panel{width:100%;max-height:500px;opacity:1;overflow:hidden;transition:max-height .32s var(--ease-drawer),opacity .24s var(--ease-out)}.filter-expand-panel.hidden{max-height:0!important;opacity:0!important;display:block!important;pointer-events:none}.filter-rows-container{display:flex;flex-direction:column;gap:8px;padding:16px 20px;background:#14141899;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--glass-border);border-radius:16px;margin-top:12px;box-shadow:0 10px 40px #0006}.filter-row{display:flex;align-items:flex-start;gap:16px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}.filter-row:last-child{border-bottom:none}.filter-row-title{font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-400);min-width:80px;padding-top:6px;flex-shrink:0}.filter-row-options{display:flex;flex-wrap:wrap;gap:8px;flex:1}.filter-option-btn{display:inline-flex;align-items:center;padding:6px 12px;font-size:13px;font-weight:500;color:var(--text-200)!important;background:#ffffff08!important;border:1px solid rgba(255,255,255,.06)!important;border-radius:999px;cursor:pointer;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),color .2s var(--ease-out),transform .15s var(--ease-out);outline:none!important}@media (hover: hover) and (pointer: fine){.filter-option-btn:hover{background:#ffffff14!important;border-color:#ffffff26!important;color:#fff!important}}.filter-option-btn.active{color:var(--theme-accent)!important;font-weight:600!important;background:var(--theme-accent-subtle)!important;border-color:var(--theme-accent)!important}.filter-option-btn:active{transform:scale(.97)}@media (max-width: 768px){.filter-row{flex-direction:column;gap:8px;padding:8px 0}.filter-row-title{min-width:auto;padding-top:0}.filter-toggle-btn span{display:none!important}.filter-toggle-btn{padding:0!important;border-radius:50%!important;width:34px!important;height:34px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0}}.app-layout.in-bookmarks-view .topbar-center .channel-switch,.app-layout.in-bookmarks-view .topbar-center .mobile-switches-row,.app-layout.in-bookmarks-view .sort-filters{display:none!important}.sidebar-divider{height:1px;background:#ffffff0f;margin:12px 16px}.filter-header-row .section-title{margin-bottom:0!important}#tm-tiktok-modal.tm-idle .tm-topbar,#tm-tiktok-modal.tm-idle .tm-actions,#tm-tiktok-modal.tm-idle .tm-volume-wrap,#tm-tiktok-modal.tm-idle .tm-info,#tm-tiktok-modal.tm-idle .tm-video-stage:after,#tm-tiktok-modal.tm-idle .tm-progress-wrap:before{opacity:0!important;pointer-events:none;transition:opacity .28s var(--ease-out)}#tm-tiktok-modal.tm-idle .tm-progress-wrap{bottom:0!important;left:0!important;right:0!important;padding:0!important;transition:all .28s var(--ease-out)}#tm-tiktok-modal.tm-idle .tm-progress{height:2px!important;background:#ffffff1a!important;border-radius:0!important;transition:all .28s var(--ease-out)}#tm-tiktok-modal.tm-idle .tm-progress-fill{border-radius:0!important}#tm-tiktok-modal.tm-idle .tm-progress-fill:after{transform:translateY(-50%) scale(0)!important}#tm-tiktok-modal.tm-idle .tm-time{display:none!important}.xflow-confirm-overlay{position:fixed;top:0;right:0;bottom:0;left:0;background:#0009;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .15s cubic-bezier(.3,0,.8,.15)}.xflow-confirm-overlay.show{opacity:1;pointer-events:auto;transition:opacity .25s var(--ease-out)}.xflow-confirm-modal{background:#16161cf2;border:1px solid var(--glass-border);border-radius:16px;padding:24px;width:320px;max-width:90%;box-shadow:0 20px 40px #00000080;transform:scale(.95);transition:transform .15s cubic-bezier(.3,0,.8,.15);text-align:center}.xflow-confirm-overlay.show .xflow-confirm-modal{transform:scale(1);transition:transform .3s cubic-bezier(.34,1.56,.64,1)}.xflow-confirm-modal h3{margin:0 0 12px;font-size:16px;font-weight:700;color:#fff;font-family:var(--font-display)}.xflow-confirm-modal p{margin:0 0 20px;font-size:14px;color:var(--text-300);line-height:1.5}.xflow-confirm-actions{display:flex;gap:12px;justify-content:center}.xflow-confirm-btn{flex:1;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:background .15s var(--ease-out),opacity .15s var(--ease-out),transform .15s var(--ease-out)}.xflow-confirm-btn.cancel-btn{background:#ffffff14;color:var(--text-200)}@media (hover: hover) and (pointer: fine){.xflow-confirm-btn.cancel-btn:hover{background:#ffffff26}.xflow-confirm-btn.confirm-btn:hover{opacity:.9}}.xflow-confirm-btn.confirm-btn{background:var(--theme-accent);color:#fff}.xflow-confirm-btn:active{transform:scale(.96)}.card-downloaded-badge{position:absolute;top:12px;right:12px;background:#2ecc71d9;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:4px 10px;border-radius:8px;font-family:var(--font-body);font-weight:600;font-size:.75rem;color:#fff;display:inline-flex;align-items:center;z-index:6}.tm-downloaded-badge{position:absolute;top:4px;right:4px;background:#2ecc71d9;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;color:#fff;display:inline-flex;align-items:center;gap:2px;z-index:2}.back-to-rankings-btn{display:inline-flex;align-items:center;background:#ffffff14;border:1px solid var(--glass-border);border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;transition:background .2s var(--ease-out),border-color .2s var(--ease-out),transform .15s var(--ease-out);margin-left:12px}@media (hover: hover) and (pointer: fine){.back-to-rankings-btn:hover{background:#ffffff26;border-color:#ffffff4d}}.back-to-rankings-btn:active{transform:scale(.97)}@media (prefers-reduced-motion: reduce){#tm-tiktok-modal,#tm-tiktok-modal.active,.tm-comment-panel,.tm-comment-panel.active,.tm-author-panel,.tm-author-panel.active,.mobile-dropdown,.mobile-dropdown.open,.site-switch-dropdown,.site-switch-wrap.active .site-switch-dropdown,.xflow-confirm-overlay,.xflow-confirm-modal,.filter-expand-panel{transition:opacity .15s ease-out!important;transform:none!important;animation:none!important}.media-card,.hc-card,.retry-btn,.nav-item,.sort-btn,.mobile-circle-btn,.tm-btn,.tm-action .icon,.tm-vol-btn,.back-to-rankings-btn,.xflow-confirm-btn,.filter-toggle-btn,.filter-option-btn{transition:opacity .1s ease-out!important;transform:none!important;animation:none!important}}#xflow-net-banner{position:fixed;top:0;left:0;right:0;z-index:999999;padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 10px;background:linear-gradient(135deg,#ff3c50eb,#c8283ceb);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;font-weight:500;text-align:center;line-height:1.6;box-shadow:0 4px 24px #0000004d;transform:translateY(-100%);will-change:transform;animation:xf-banner-in .4s cubic-bezier(.16,1,.3,1) forwards}#xflow-net-banner.hiding{transform:translateY(-100%);transition:transform .3s cubic-bezier(.4,0,1,1)}@keyframes xf-banner-in{0%{transform:translateY(-100%)}to{transform:translateY(0)}}#xflow-splash{will-change:opacity,transform;transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .6s cubic-bezier(.16,1,.3,1)}#xflow-splash.xflow-splash-hiding{opacity:0!important;transform:scale(1.04)!important;pointer-events:none!important}.tm-video{will-change:opacity;transition:opacity .25s var(--ease-out)}';
  const _Sandbox = class _Sandbox2 {
    constructor() {
      this.appRoot = null;
    }
    static getInstance() {
      if (!_Sandbox2._instance) {
        _Sandbox2._instance = new _Sandbox2();
      }
      return _Sandbox2._instance;
    }
    async initialize() {
      if (this.appRoot) return;
      if (typeof navigator !== "undefined" && navigator.serviceWorker) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            const success = await reg.unregister();
            if (success) {
              log("Sandbox: Unregistered host Service Worker successfully");
            }
          }
        } catch (err) {
          console.warn("X-Flow: Failed to clean host Service Workers", err);
        }
      }
      try {
        try {
          const OriginalURL = window.URL;
          window.URL = new Proxy(OriginalURL, {
            construct(target, args) {
              if (args.length > 1 && (args[1] === null || args[1] === void 0)) {
                return new target(args[0]);
              }
              return new target(...args);
            }
          });
        } catch (_) {
        }
        const style = document.createElement("style");
        style.setAttribute("data-xflow-app", "1");
        style.textContent = appCssText;
        document.head.appendChild(style);
        const fontFrag = document.createDocumentFragment();
        const preconnect1 = document.createElement("link");
        preconnect1.rel = "preconnect";
        preconnect1.href = "https://fonts.googleapis.com";
        fontFrag.appendChild(preconnect1);
        const preconnect2 = document.createElement("link");
        preconnect2.rel = "preconnect";
        preconnect2.href = "https://fonts.gstatic.com";
        preconnect2.crossOrigin = "";
        fontFrag.appendChild(preconnect2);
        const fontLink = document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@500;700;800&display=swap";
        fontLink.media = "print";
        fontLink.onload = function() {
          this.media = "all";
        };
        fontFrag.appendChild(fontLink);
        document.head.appendChild(fontFrag);
        this.splashProgress(30);
        this.splashProgress(60);
        this.appRoot = this.ensureAppRoot();
        this.appRoot.dataset.xflowState = "booting";
        log("Sandbox: document.open() clean slate ready");
        const layout = new Layout();
        layout.init(this.appRoot);
        setTimeout(() => {
          void this.checkNetworkInBackground();
        }, 3e3);
        this.splashProgress(100);
        this.appRoot.dataset.xflowState = "ready";
      } catch (e) {
        console.error("X-Flow Sandbox init error:", e);
        this.appRoot = this.appRoot || document.getElementById("xflow-app-root");
        if (this.appRoot) this.appRoot.dataset.xflowState = "failed";
      } finally {
        await this.hideSplash();
      }
    }
    ensureAppRoot() {
      const existingRoot = document.getElementById("xflow-app-root");
      if (existingRoot instanceof HTMLElement) {
        return existingRoot;
      }
      log("Sandbox: appRoot missing after document.write() \u2014 rebuilding shell");
      const body = document.body || document.createElement("body");
      if (!document.body) {
        body.style.cssText = "margin:0;overflow:hidden;width:100dvw;height:100dvh;background:#0D0D12";
        document.documentElement.appendChild(body);
      }
      const rebuiltRoot = document.createElement("div");
      rebuiltRoot.id = "xflow-app-root";
      rebuiltRoot.style.cssText = "width:100%;height:100%;background:var(--bg-base,#0D0D12);color:var(--text-100,#fff);overflow:hidden;position:relative";
      body.prepend(rebuiltRoot);
      return rebuiltRoot;
    }
    splashProgress(pct) {
      const bar = document.getElementById("xflow-splash-bar");
      if (bar) bar.style.width = pct + "%";
    }
    hideSplash() {
      return new Promise((resolve) => {
        const splash = document.getElementById("xflow-splash");
        if (!splash) {
          resolve();
          return;
        }
        setTimeout(() => {
          splash.classList.add("xflow-splash-hiding");
          setTimeout(() => {
            splash.remove();
            resolve();
          }, 600);
        }, 200);
      });
    }
    async checkNetworkInBackground() {
      try {
        const TIMEOUT = _Sandbox2.PROBE_TIMEOUT;
        const probeImage = () => {
          return new Promise((resolve) => {
            const img = new Image();
            const timer = setTimeout(() => resolve(false), TIMEOUT);
            img.onload = () => {
              clearTimeout(timer);
              resolve(true);
            };
            img.onerror = () => {
              clearTimeout(timer);
              resolve(true);
            };
            img.src = "https://pbs.twimg.com/profile_images/1/normal.jpg?" + Date.now();
          });
        };
        const probeVideo = () => {
          return new Promise((resolve) => {
            const timer = setTimeout(() => resolve(false), TIMEOUT);
            try {
              GM_xmlhttpRequest({
                method: "HEAD",
                url: "https://video.twimg.com/ext_tw_video/1/pu/vid/avc1/270x480/probe.mp4?" + Date.now(),
                timeout: TIMEOUT,
                onload: () => {
                  clearTimeout(timer);
                  resolve(true);
                },
                onerror: () => {
                  clearTimeout(timer);
                  resolve(false);
                },
                ontimeout: () => {
                  clearTimeout(timer);
                  resolve(false);
                }
              });
            } catch {
              clearTimeout(timer);
              resolve(false);
            }
          });
        };
        const [imgOk, videoOk] = await Promise.all([probeImage(), probeVideo()]);
        if (imgOk && videoOk) {
          log("Network check: OK");
          return;
        }
        log(`Network check failed: image=${imgOk}, video=${videoOk}`);
        this.showNetworkBanner();
      } catch (error) {
        console.error("X-Flow network check error:", error);
      }
    }
    showNetworkBanner() {
      var _a;
      if (document.getElementById("xflow-net-banner")) return;
      const banner = document.createElement("div");
      banner.id = "xflow-net-banner";
      banner.innerHTML = [
        '<div style="max-width:480px;margin:0 auto;">',
        '<span style="font-weight:700;">\u26A0 \u7F51\u7EDC\u73AF\u5883\u5F02\u5E38</span>',
        "<br>",
        '<span style="opacity:0.85;">\u5F53\u524D\u7F51\u7EDC\u73AF\u5883\u4E0D\u7A33\u5B9A\uFF0C\u8BF7\u5408\u6CD5\u5408\u89C4\u8BBF\u95EE\u5883\u5916\u7F51\u7AD9</span>',
        "</div>",
        '<button id="xflow-net-banner-close" style="',
        "position:absolute; top:50%; right:12px; transform:translateY(-50%);",
        "background:rgba(255,255,255,0.2); border:none; color:#fff;",
        "width:24px; height:24px; border-radius:50%; cursor:pointer;",
        "display:flex; align-items:center; justify-content:center;",
        "font-size:14px; line-height:1; transition: background 0.2s;",
        '">\u2715</button>'
      ].join("");
      document.body.appendChild(banner);
      const closeBanner = () => {
        banner.classList.add("hiding");
        setTimeout(() => banner.remove(), 350);
      };
      (_a = document.getElementById("xflow-net-banner-close")) == null ? void 0 : _a.addEventListener("click", closeBanner);
      setTimeout(() => {
        if (banner.parentElement) {
          closeBanner();
        }
      }, 15e3);
    }
  };
  _Sandbox.PROBE_TIMEOUT = 4e3;
  let Sandbox = _Sandbox;
  const _clearEarlyBootArtifacts = () => {
    var _a, _b;
    (_a = document.getElementById("xflow-preboot-banner-style")) == null ? void 0 : _a.remove();
    (_b = document.getElementById("xflow-preboot-veil-style")) == null ? void 0 : _b.remove();
  };
  const _appRoot = document.getElementById("xflow-app-root");
  const _appHealthy = !!(_appRoot == null ? void 0 : _appRoot.querySelector(".app-layout")) && (_appRoot == null ? void 0 : _appRoot.dataset.xflowState) === "ready";
  const _hasInitFlag = !!window.__XFLOW_INIT__;
  if (_hasInitFlag && _appHealthy) {
    _clearEarlyBootArtifacts();
    console.info("X-Flow: duplicate bootstrap detected, app already healthy");
  } else {
    const _isXiaoHuangNiao = window.location.hostname.includes("xiaohuangniao.me");
    if (_isXiaoHuangNiao) {
      console.info("X-Flow: Running on xiaohuangniao.me, aborting takeover.");
      _clearEarlyBootArtifacts();
      const root = document.documentElement;
      if (root) {
        root.style.background = "";
        root.style.overflow = "";
      }
      throw new Error("X-Flow: Aborted on xiaohuangniao.me");
    }
    const _html = document.documentElement ? document.documentElement.innerHTML : "";
    const _isCf = window._cf_chl_opt || document.title === "Just a moment..." || document.title === "\u8BF7\u7A0D\u5019..." || _html.indexOf("_cf_chl_opt") !== -1 || _html.indexOf("cf-challenge") !== -1 && _html.indexOf("challenge-form") !== -1;
    if (_isCf) {
      console.warn("X-Flow: Cloudflare challenge page detected, aborting takeover.");
      _clearEarlyBootArtifacts();
      const root = document.documentElement;
      if (root) {
        root.style.background = "";
        root.style.overflow = "";
      }
      throw new Error("X-Flow: Aborted due to Cloudflare challenge");
    }
    window.__XFLOW_INIT__ = true;
    if (window.self !== window.top) throw new Error("X-Flow: abort in iframe");
    try {
      const root = document.documentElement;
      if (root && !document.getElementById("xflow-preboot-veil-style")) {
        root.style.background = "#0D0D12";
        root.style.overflow = "hidden";
        const veilStyle = document.createElement("style");
        veilStyle.id = "xflow-preboot-veil-style";
        veilStyle.textContent = 'html::before{content:"";position:fixed;inset:0;z-index:2147483647;background:#0D0D12;pointer-events:none;}';
        (document.head || root).appendChild(veilStyle);
      }
    } catch (_) {
    }
    window.onerror = () => true;
    window.addEventListener("unhandledrejection", (e) => {
      e.preventDefault();
    });
    window.addEventListener("error", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
    try {
      window.location.replace = () => {
      };
    } catch (_) {
    }
    try {
      window.location.assign = () => {
      };
    } catch (_) {
    }
    try {
      window.location.reload = () => {
      };
    } catch (_) {
    }
    try {
      window.history.pushState = () => {
      };
    } catch (_) {
    }
    try {
      window.history.replaceState = () => {
      };
    } catch (_) {
    }
    window.open = () => null;
    window.stop();
    const _noop = () => {
    };
    const _sentinelTimerId = window.setTimeout(_noop, 0);
    for (let i = 1; i < _sentinelTimerId; i++) {
      window.clearTimeout(i);
      window.clearInterval(i);
    }
    window.clearTimeout(_sentinelTimerId);
    const _origRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = () => 0;
    window.__XFLOW_ORIGIN__ = window.location.origin;
    window.__XFLOW_IS_ANIME__ = window.location.hostname.includes("anime");
    const _isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0;
    const _htmlContent = [
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
      '<meta name="referrer" content="no-referrer">',
      `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-src 'none'; connect-src 'self' ${window.location.origin} https://video.twimg.com https://pbs.twimg.com https://fonts.googleapis.com https://fonts.gstatic.com img-src 'self' ${window.location.origin} https://pbs.twimg.com data: blob:; media-src 'self' ${window.location.origin} https://video.twimg.com blob:; style-src 'self' 'unsafe-inline' ${window.location.origin} https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'self' ${window.location.origin};">`,
      "<title>X-Flow</title>",
      "</head>",
      '<body style="margin:0;overflow:hidden;width:100dvw;height:100dvh;background:#0D0D12">',
      '<div id="xflow-app-root" style="width:100%;height:100%;background:var(--bg-base,#0D0D12);color:var(--text-100,#fff);overflow:hidden;position:relative"></div>',
      '<div id="xflow-splash" style="',
      "position:fixed;inset:0;z-index:2147483647;",
      "background:linear-gradient(160deg,#0D0D12 0%,#131320 40%,#0D0D12 100%);",
      "display:flex;flex-direction:column;align-items:center;justify-content:center;",
      "font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;",
      "transition:opacity 0.6s cubic-bezier(0.16,1,0.3,1),transform 0.6s cubic-bezier(0.16,1,0.3,1);",
      "will-change:opacity,transform;",
      '">',
      '<div style="position:absolute;width:260px;height:260px;border-radius:50%;',
      "background:radial-gradient(circle,rgba(130,80,255,0.15) 0%,transparent 70%);",
      'filter:blur(60px);pointer-events:none;animation:xf-glow 3s ease-in-out infinite alternate;"></div>',
      '<svg viewBox="0 0 24 24" width="56" height="56" fill="url(#splash-grad)" style="position:relative;filter:drop-shadow(0 0 24px rgba(130,80,255,0.4));animation:xf-float 2.5s ease-in-out infinite;">',
      '<defs><linearGradient id="splash-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00F0FF"/><stop offset="100%" stop-color="#FF1053"/></linearGradient></defs>',
      '<path d="M12 2L2 22h20L12 2zm0 6l6 12H6l6-12z"/>',
      "</svg>",
      '<div style="margin-top:24px;font-size:28px;font-weight:800;letter-spacing:2px;',
      "background:linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.6) 100%);",
      "-webkit-background-clip:text;-webkit-text-fill-color:transparent;",
      'background-clip:text;">X-FLOW</div>',
      '<div style="margin-top:8px;font-size:12px;letter-spacing:4px;color:rgba(255,255,255,0.35);text-transform:uppercase;">\u6781\u5883\u6D41\u5A92\u4F53\u6392\u884C\u699C</div>',
      '<div id="xflow-splash-status" style="margin-top:40px;font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:1px;">\u6B63\u5728\u521D\u59CB\u5316 \xB7\xB7\xB7</div>',
      '<div style="margin-top:16px;width:180px;height:2px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">',
      '<div id="xflow-splash-bar" style="width:0%;height:100%;border-radius:2px;',
      "background:linear-gradient(90deg,#00F0FF,#8B5CF6,#FF1053);",
      'transition:width 0.4s cubic-bezier(0.16,1,0.3,1);"></div>',
      "</div>",
      "<style>",
      "@keyframes xf-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}",
      "@keyframes xf-glow{0%{opacity:0.6;transform:scale(0.9)}100%{opacity:1;transform:scale(1.1)}}",
      "</style>",
      "</div>",
      "</body>"
    ].join("");
    if (_isMobile) {
      document.documentElement.innerHTML = _htmlContent;
    } else {
      document.open();
      document.write('<!DOCTYPE html><html lang="zh-CN">' + _htmlContent + "</html>");
      document.close();
    }
    window.requestAnimationFrame = _origRAF;
    window.onerror = (msg) => {
      if (typeof msg === "string" && (msg.includes("React") || msg.includes("#418") || msg.includes("hydrat") || msg.includes("Minified") || msg.includes("__next") || msg.includes("NEXT"))) {
        return true;
      }
      return false;
    };
    const _origCreate = document.createElement.bind(document);
    document.createElement = function(tag, options) {
      const el = _origCreate(tag, options);
      if (tag.toLowerCase() === "iframe") {
        el.setAttribute("sandbox", "allow-scripts allow-same-origin");
      }
      return el;
    };
    new MutationObserver((mutations) => {
      if (!document.querySelector('meta[name="referrer"]')) {
        const mr = document.createElement("meta");
        mr.name = "referrer";
        mr.content = "no-referrer";
        if (document.head) document.head.appendChild(mr);
      }
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.tagName === "IFRAME") {
            const iframe = node;
            if (!iframe.hasAttribute("sandbox") || iframe.getAttribute("sandbox").includes("allow-top-navigation")) {
              iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
            }
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
    console.log("X-Flow v6 Pro: 3-layer defense active \u2014 clean slate");
    const _removeSplash = () => {
      var _a;
      (_a = document.getElementById("xflow-splash")) == null ? void 0 : _a.remove();
    };
    let _xflowInitStartedAt = Date.now();
    const _bootSandbox = (instance) => {
      _xflowInitStartedAt = Date.now();
      initI18n();
      void instance.initialize().then(() => {
        window.dispatchEvent(new Event("xflow:booted"));
        _clearEarlyBootArtifacts();
      }).catch((error) => {
        console.error("X-Flow: fatal init error", error);
        const appRoot = document.getElementById("xflow-app-root");
        if (appRoot) appRoot.dataset.xflowState = "failed";
        _removeSplash();
        _clearEarlyBootArtifacts();
      });
    };
    const sandbox = Sandbox.getInstance();
    _bootSandbox(sandbox);
    const _verifyAndRecover = () => {
      const splash = document.getElementById("xflow-splash");
      if (splash) {
        const splashAge = Date.now() - _xflowInitStartedAt;
        if (splashAge < 4e3) return;
        console.warn("X-Flow: splash stuck beyond boot window \u2014 force removing");
        splash.remove();
      }
      const appRoot = document.getElementById("xflow-app-root");
      const shellReady = !!(appRoot == null ? void 0 : appRoot.querySelector(".app-layout")) && !!(appRoot == null ? void 0 : appRoot.querySelector("#main-scroll"));
      if (shellReady && (appRoot == null ? void 0 : appRoot.dataset.xflowState) === "ready") return;
      console.warn(`X-Flow: app shell unhealthy (state=${(appRoot == null ? void 0 : appRoot.dataset.xflowState) ?? "missing"}) \u2014 re-injecting!`);
      document.body.innerHTML = "";
      document.body.style.cssText = "margin:0;overflow:hidden;width:100dvw;height:100dvh;background:#0D0D12;position:fixed;inset:0";
      const newRoot = document.createElement("div");
      newRoot.id = "xflow-app-root";
      newRoot.style.cssText = "width:100%;height:100%;background:var(--bg-base,#0D0D12);color:var(--text-100,#fff);overflow:hidden;position:relative";
      newRoot.dataset.xflowState = "recovering";
      document.body.appendChild(newRoot);
      if (!document.querySelector('meta[name="referrer"]')) {
        const mr = document.createElement("meta");
        mr.name = "referrer";
        mr.content = "no-referrer";
        document.head.appendChild(mr);
      }
      if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        const csp = document.createElement("meta");
        csp.httpEquiv = "Content-Security-Policy";
        csp.content = `default-src 'self' 'unsafe-inline' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-src 'none'; connect-src 'self' ${window.location.origin} https://video.twimg.com https://pbs.twimg.com https://fonts.googleapis.com https://fonts.gstatic.com img-src 'self' ${window.location.origin} https://pbs.twimg.com data: blob:; media-src 'self' ${window.location.origin} https://video.twimg.com blob:; style-src 'self' 'unsafe-inline' ${window.location.origin} https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'self' ${window.location.origin};`;
        document.head.appendChild(csp);
      }
      Sandbox._instance = null;
      const freshSandbox = Sandbox.getInstance();
      _bootSandbox(freshSandbox);
    };
    setTimeout(_verifyAndRecover, 3e3);
    setTimeout(_verifyAndRecover, 6e3);
    setTimeout(() => {
      window.onerror = null;
    }, 1e4);
  }
})();

