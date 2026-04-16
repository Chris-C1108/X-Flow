import { PoolManager } from '../api/PoolManager';
import { QueryState } from '../api/CacheManager';
import { Components } from './Components';
import { formatCount, escapeHtml } from '../utils/Format';
import { log } from '../utils/Logger';

function escapeCSSUrl(url: string) {
    return url.replace(/["'\\]/g, '\\$&');
}

import { TikTokMode } from '../player/TikTokMode';

/**
 * 核心容器与 CSS 注入，以及数据展示的 DOM 构造逻辑
 */
export class Layout {
    private pool: PoolManager;
    private rootElement: HTMLElement | null = null;
    private player: TikTokMode;

    /** Hero carousel: top-3 data per range */
    private heroData: Map<string, any[]> = new Map();
    /** Current sub-index (0/1/2) displayed within each hero card */
    private heroSubIndex: Map<string, number> = new Map();
    /** Auto-loop timers per range */
    private heroTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
    /** Ranges used by hero carousel */
    private static readonly HERO_RANGES = [
        { id: 'daily', label: '日榜' },
        { id: 'weekly', label: '周榜' },
        { id: 'monthly', label: '月榜' },
        { id: 'all', label: '总榜' },
    ];

    constructor() {
        this.pool = new PoolManager();
        this.player = new TikTokMode(this.pool);
    }

    public init(root: HTMLElement) {
        this.rootElement = root;
        document.body.className = this.pool.getApiClient().getIsAnime() ? 'theme-anime' : 'theme-real';
        this.createPageStructure();
        this.bindEvents();
        this.player.init();
        this.player.onClose(() => this.resumeHeroVideos());
        this.bindCarouselEvents();
        this.loadInitialData();
        this.loadHeroCarousel();
    }

    private createPageStructure() {
        if (!this.rootElement) return;

        this.rootElement.innerHTML = `
            <div class="noise-overlay"></div>
            <div class="app-layout">
                ${Components.getSidebarHTML()}
                <main class="main-container" id="main-scroll">
                    ${Components.getTopBarHTML(this.pool.getApiClient().getIsAnime())}
                    <div class="content-pad">
                        ${Components.getHeroCarouselHTML()}
                        <h2 class="section-title" id="section-title">趋势探索 <span style="font-size:1rem; color:var(--text-400); font-family:var(--font-body)">Trending Now</span></h2>
                        <div class="media-grid" id="grid-container">
                            ${this.generateSkeletons()}
                        </div>
                    </div>
                </main>
            </div>
        `;
    }

    private generateSkeletons() {
        return Array(6).fill(0).map(() => `
            <div class="media-card" style="border-radius: 1.5rem; cursor: default; animation: none; background: transparent; border: none;">
                <div class="skeleton-pulse" style="width: 100%; height: 100%; background: rgba(255,255,255,0.05); aspect-ratio: 9/16; border-radius: 1.5rem;"></div>
            </div>
        `).join('');
    }

    // ─── Unified filter switching ───────────────────────────────────

    /**
     * 统一入口：所有 UI 筛选切换都走此方法。
     * 缓存命中则秒开，否则展示 skeleton loading。
     */
    private async applyFilters(partial: Partial<QueryState>, opts?: { channelSwitch?: boolean }) {
        const willHitCache = this.pool.hasFreshCache(partial);

        if (!willHitCache) {
            const grid = document.getElementById('grid-container');
            if (grid) grid.innerHTML = this.generateSkeletons();
        }

        // Channel switch: update theme
        if (opts?.channelSwitch && partial.isAnimeOnly !== undefined) {
            document.body.className = partial.isAnimeOnly ? 'theme-anime' : 'theme-real';
        }

        try {
            const result = await this.pool.loadInitialData(partial);
            if (this.pool.getDataPool().length === 0) {
                this.renderEmptyState();
            } else {
                this.renderAll();
            }
            log(`applyFilters: ${willHitCache ? 'Cache HIT ⚡' : 'Fetched'} (fromCache=${result.fromCache})`);
        } catch (error) {
            console.error('Failed to apply filters:', error);
            this.renderErrorState();
        }

        // Schedule background preloads after each filter switch
        this.schedulePreloads();
    }

    /**
     * 后台预加载策略：预取当前维度的邻近组合 + 另一次元的默认组合
     */
    private schedulePreloads() {
        const q = this.pool.getCurrentQuery();

        // 1. Same channel, same sort, next likely ranges
        const ranges = ['daily', 'weekly', 'monthly', 'all'];
        const nextRange = ranges.find(r => r !== q.range) || 'weekly';

        // 2. Other channel, same range + sort
        const otherChannel: QueryState = {
            isAnimeOnly: !q.isAnimeOnly,
            range: q.range,
            sort: q.sort,
        };

        const sameChannelOtherRange: QueryState = {
            isAnimeOnly: q.isAnimeOnly,
            range: nextRange,
            sort: q.sort,
        };

        // Sequential preloads to avoid 429
        setTimeout(() => {
            this.pool.preload(sameChannelOtherRange).then(() => {
                this.pool.preload(otherChannel);
            });
        }, 1500);
    }

    // ─── Event binding ──────────────────────────────────────────────

    private bindEvents() {
        // Desktop sidebar range buttons
        document.querySelectorAll('.nav-item[data-range]').forEach(item => {
            item.addEventListener('click', async () => {
                const range = (item as HTMLElement).dataset.range;
                this.syncRangeUI(range!);
                await this.applyFilters({ range });
            });
        });

        // Desktop sort buttons
        document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const sort = (btn as HTMLElement).dataset.sort;
                this.syncSortUI(sort!);
                await this.applyFilters({ sort });
            });
        });

        // Mobile dropdown toggles
        const rangeBtn = document.getElementById('mobile-range-btn');
        const rangeDropdown = document.getElementById('range-dropdown');
        const sortBtn2 = document.getElementById('mobile-sort-btn');
        const sortDropdown = document.getElementById('sort-dropdown');

        const closeAllDropdowns = () => {
            [rangeDropdown, sortDropdown].forEach(dd => dd?.classList.remove('open'));
            [rangeBtn, sortBtn2].forEach(btn => btn?.setAttribute('aria-expanded', 'false'));
        };

        rangeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = rangeDropdown?.classList.contains('open');
            closeAllDropdowns();
            if (!isOpen) {
                rangeDropdown?.classList.add('open');
                rangeBtn.setAttribute('aria-expanded', 'true');
            }
        });

        sortBtn2?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = sortDropdown?.classList.contains('open');
            closeAllDropdowns();
            if (!isOpen) {
                sortDropdown?.classList.add('open');
                sortBtn2.setAttribute('aria-expanded', 'true');
            }
        });

        document.addEventListener('click', () => closeAllDropdowns());

        // Mobile range items
        document.querySelectorAll('#range-dropdown .mobile-dd-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const range = (item as HTMLElement).dataset.range;
                this.syncRangeUI(range!);
                closeAllDropdowns();
                await this.applyFilters({ range });
            });
        });

        // Mobile sort items
        document.querySelectorAll('#sort-dropdown .mobile-dd-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const sort = (item as HTMLElement).dataset.sort;
                this.syncSortUI(sort!);
                closeAllDropdowns();
                await this.applyFilters({ sort });
            });
        });

        // Channel switch (次元切换)
        document.querySelectorAll('.channel-btn[data-channel]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const channel = (btn as HTMLElement).dataset.channel;
                const isAnime = channel === 'anime';
                if (isAnime === this.pool.getApiClient().getIsAnime()) return;

                // Trigger pulse
                const topbarPulse = document.getElementById('topbar-pulse');
                if (topbarPulse) {
                    topbarPulse.classList.remove('pulse-anim');
                    void topbarPulse.offsetWidth;
                    topbarPulse.classList.add('pulse-anim');
                }

                // Update Switcher UI
                const switcher = btn.closest('.channel-switch');
                if (switcher) {
                    if (isAnime) switcher.classList.add('is-anime');
                    else switcher.classList.remove('is-anime');
                }

                document.querySelectorAll('.channel-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');

                // Sink old cards animation (only if not cached for instant feel)
                const willHitCache = this.pool.hasFreshCache({ isAnimeOnly: isAnime });
                if (!willHitCache) {
                    const cards = document.querySelectorAll('.media-card');
                    cards.forEach(c => c.classList.add('sinking'));
                    await new Promise(res => setTimeout(res, 300));
                }

                await this.applyFilters({ isAnimeOnly: isAnime }, { channelSwitch: true });
            });
        });

        // Infinite scroll
        const mainContainer = document.getElementById('main-scroll');
        if (mainContainer) {
            let isFetching = false;
            let lastScrollTop = 0;

            mainContainer.addEventListener('scroll', () => {
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

        // Grid card click → open player
        const gridContainer = document.getElementById('grid-container');
        if (gridContainer) {
            gridContainer.addEventListener('click', (e) => {
                const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
                if (card) {
                    const indexAttr = card.getAttribute('data-index');
                    if (indexAttr) {
                        const index = parseInt(indexAttr);
                        this.player.openModal(index);
                    }
                }
            });

            // ── Hover-to-play ─────────────────────────────────────────
            let hoverVideo: HTMLVideoElement | null = null;
            let hoverCard: HTMLElement | null = null;

            const clearHoverVideo = () => {
                if (hoverVideo) {
                    hoverVideo.pause();
                    hoverVideo.remove();
                    hoverVideo = null;
                }
                if (hoverCard) {
                    hoverCard.classList.remove('hover-playing');
                    hoverCard = null;
                }
            };

            gridContainer.addEventListener('mouseenter', (e) => {
                const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
                if (!card || card === hoverCard) return;
                clearHoverVideo();

                const videoUrl = card.dataset.videoUrl;
                if (!videoUrl) return;

                hoverCard = card;
                card.classList.add('hover-playing');

                const video = document.createElement('video');
                video.className = 'card-hover-video';
                video.src = videoUrl;
                video.muted = true;
                video.autoplay = true;
                video.loop = true;
                video.playsInline = true;
                video.preload = 'auto';
                card.appendChild(video);
                hoverVideo = video;
                video.play().catch(() => {/* autoplay blocked */ });
            }, true);

            gridContainer.addEventListener('mouseleave', (e) => {
                const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
                if (card && card === hoverCard) clearHoverVideo();
            }, true);

            // ── Mobile touch: long-press (450ms) to preview, short tap to open ──
            let touchTimer: ReturnType<typeof setTimeout> | null = null;
            let touchStartY = 0;
            let touchScrolled = false;

            const startTouchPreview = (card: HTMLElement) => {
                clearHoverVideo();
                const videoUrl = card.dataset.videoUrl;
                if (!videoUrl) return;
                hoverCard = card;
                card.classList.add('hover-playing');
                const video = document.createElement('video');
                video.className = 'card-hover-video';
                video.src = videoUrl;
                video.muted = true;
                video.autoplay = true;
                video.loop = true;
                video.playsInline = true;
                card.appendChild(video);
                hoverVideo = video;
                video.play().catch(() => { });
            };

            gridContainer.addEventListener('touchstart', (e: TouchEvent) => {
                const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
                if (!card || !card.dataset.videoUrl) return;
                touchScrolled = false;
                touchStartY = e.touches[0].clientY;
                touchTimer = setTimeout(() => {
                    if (!touchScrolled) startTouchPreview(card);
                }, 450);
            }, { passive: true });

            gridContainer.addEventListener('touchmove', (e: TouchEvent) => {
                if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
                    touchScrolled = true;
                    if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
                }
            }, { passive: true });

            gridContainer.addEventListener('touchend', (e: TouchEvent) => {
                if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
                if (hoverCard) {
                    // Was in preview mode → stop preview, suppress the click
                    clearHoverVideo();
                    e.preventDefault();
                }
                // Short tap (no preview) → click fires naturally → opens player
            }, { passive: false });

            gridContainer.addEventListener('touchcancel', () => {
                if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
                clearHoverVideo();
            }, { passive: true });
        }
    }

    // ─── UI sync helpers ────────────────────────────────────────────

    private syncRangeUI(range: string) {
        // Sync sidebar
        document.querySelectorAll('.nav-item[data-range]').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-range="${range}"]`)?.classList.add('active');
        // Sync mobile dropdown
        document.querySelectorAll('#range-dropdown .mobile-dd-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`#range-dropdown .mobile-dd-item[data-range="${range}"]`)?.classList.add('active');
    }

    private syncSortUI(sort: string) {
        // Sync desktop sort buttons
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.sort-btn[data-sort="${sort}"]`)?.classList.add('active');
        // Sync mobile dropdown
        document.querySelectorAll('#sort-dropdown .mobile-dd-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`#sort-dropdown .mobile-dd-item[data-sort="${sort}"]`)?.classList.add('active');
    }

    // ─── Data loading ───────────────────────────────────────────────

    private async loadInitialData() {
        try {
            await this.pool.loadInitialData();
            if (this.pool.getDataPool().length === 0) {
                this.renderEmptyState();
            } else {
                this.renderAll();
            }
            // Kick off background preloads after initial load
            this.schedulePreloads();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.renderErrorState();
        }
    }

    private async loadMoreData() {
        try {
            const newData = await this.pool.fetchNextPage();
            if (newData && newData.length > 0) {
                this.renderGrid(true);
            } else if (this.pool.getDataPool().length === 0) {
                this.renderEmptyState();
            }
        } catch (error) {
            console.error('Failed to load more data:', error);
            this.appendRetryBlock();
        }
    }

    // ─── Rendering ──────────────────────────────────────────────────

    private renderAll() {
        this.updateSectionTitle();
        this.renderGrid(false);
    }

    /** 展示当前榜单和排序模式信息 */
    private updateSectionTitle() {
        const el = document.getElementById('section-title');
        if (!el) return;
        const q = this.pool.getCurrentQuery();
        const rangeLabel: Record<string, string> = {
            daily: '日榜', weekly: '周榜', monthly: '月榜', all: '总榜',
        };
        const sortLabel: Record<string, string> = {
            favorite: '最多喜欢', pv: '最高播放', recent: '最新发布',
        };
        const rl = rangeLabel[q.range] || q.range;
        const sl = sortLabel[q.sort] || q.sort;
        el.innerHTML = `${rl}·${sl} <span style="font-size:0.875rem;color:var(--text-400);font-family:var(--font-body);font-weight:400;">Trending Now</span>`;
    }

    private renderEmptyState() {
        this.updateSectionTitle();
        const container = document.getElementById('grid-container');
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

    private renderErrorState() {
        this.updateSectionTitle();
        const container = document.getElementById('grid-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="var(--accent-primary)"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>
                    <h3>网络链路中断</h3>
                    <p style="margin-bottom: 1.5rem">跨越次元壁的过程遇到了一点干扰</p>
                    <button class="retry-btn" onclick="document.dispatchEvent(new CustomEvent('xflow-retry'))">重试连接</button>
                </div>
            `;

            document.addEventListener('xflow-retry', () => {
                if (container) container.innerHTML = this.generateSkeletons();
                this.loadInitialData();
            }, { once: true });
        }
    }

    private appendRetryBlock() {
        const container = document.getElementById('grid-container');
        if (!container || document.getElementById('tm-retry-block')) return;

        const retryHtml = `
            <div id="tm-retry-block" class="retry-block">
                <p style="color: var(--text-300); margin-bottom: 1rem; font-size: 0.9rem;">发现新的内容，但加载失败了</p>
                <button class="retry-btn" id="tm-retry-load">继续加载</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', retryHtml);

        const retryBtn = document.getElementById('tm-retry-load');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                const block = document.getElementById('tm-retry-block');
                if (block) block.remove();
                this.loadMoreData();
            });
        }
    }

    /**
     * 独立并行拉取四个榜单 top3，填充 Hero Carousel 并启动自动轮播。
     *
     * 修复：Hero 获取的视频数据通过 PoolManager.preload() 注入缓存层，
     * 后续 TikTokMode 打开相同 range 时可复用缓存，
     * 避免 Hero 和播放器各自独立缓冲同一批视频。
     */
    private async loadHeroCarousel() {
        const isAnime = this.pool.getApiClient().getIsAnime();

        const fetches = Layout.HERO_RANGES.map(async (r) => {
            const query = { isAnimeOnly: isAnime, range: r.id, sort: 'favorite' };

            // 1. 先查缓存（可能已被 preload 或其他路径填充）
            const cached = this.pool.getCachedItems(query);
            if (cached.length > 0) {
                return { id: r.id, items: cached.slice(0, 3) };
            }

            // 2. 缓存未命中 → 通过 preload 获取并写入缓存
            try {
                await this.pool.preload({ ...query, perPage: 3 });
                const fresh = this.pool.getCachedItems(query);
                return { id: r.id, items: fresh.slice(0, 3) };
            } catch {
                return { id: r.id, items: [] as any[] };
            }
        });

        const results = await Promise.all(fetches);

        // Store top-3 data and initialise sub-index for each range
        results.forEach(({ id, items }) => {
            this.heroData.set(id, items);
            this.heroSubIndex.set(id, 0);
        });

        // Populate first item (index 0) into each card
        results.forEach(({ id, items }) => {
            if (!items.length) return;
            this.populateHeroCard(id, items[0], 0);
        });

        // Mirror clone slots
        const allItems = this.heroData.get('all') || [];
        const dailyItems = this.heroData.get('daily') || [];
        if (allItems.length) this.populateHeroCard('clone-prev', allItems[0], 0);
        if (dailyItems.length) this.populateHeroCard('clone-next', dailyItems[0], 0);

        // Start auto-loop for each real card
        this.startHeroAutoLoop();
    }

    /**
     * Populate a hero card slot with a specific item's data.
     */
    private populateHeroCard(key: string, item: any, subIndex: number) {
        if (!item) return;

        const skeleton = document.getElementById(`hc-sk-${key}`);
        if (skeleton) skeleton.style.display = 'none';

        const bg = document.getElementById(`hc-bg-${key}`);
        if (bg) {
            bg.style.backgroundImage = `url("${escapeCSSUrl(item.thumbnail)}")`;
            bg.style.opacity = '1';
        }

        const titleEl = document.getElementById(`hc-title-${key}`);
        if (titleEl) titleEl.textContent = item.title || `@${item.tweet_account}`;

        const likesEl = document.getElementById(`hc-likes-${key}`);
        if (likesEl) likesEl.textContent = formatCount(item.favorite);

        const pvEl = document.getElementById(`hc-pv-${key}`);
        if (pvEl) pvEl.textContent = formatCount(item.pv);

        // Update rank numbers
        const rankEl = document.getElementById(`hc-rank-${key}`);
        if (rankEl) {
            const newRank = `No.${subIndex + 1}`;
            if (rankEl.textContent !== newRank) {
                rankEl.classList.add('switching');
                setTimeout(() => {
                    rankEl.textContent = newRank;
                    rankEl.classList.remove('switching');
                }, 200);
            }
        }

        const badgeRankEl = document.getElementById(`hc-badge-rank-${key}`);
        if (badgeRankEl) {
            badgeRankEl.textContent = `No.0${subIndex + 1}`;
        }

        // Store current sub-index on the card element for click handlers
        const card = document.getElementById(`hc-card-${key}`) as HTMLElement | null;
        if (card) {
            card.dataset.heroSubIndex = String(subIndex);
            if (item.url) card.dataset.videoUrl = item.url;
        }
    }

    /**
     * Start auto-loop: each range cycles top1→top2→top3 every 10 seconds.
     * Each item plays its video for 10 seconds.
     */
    private startHeroAutoLoop() {
        // Clear existing timers
        this.heroTimers.forEach(t => clearInterval(t));
        this.heroTimers.clear();

        const INTERVAL = 10_000; // 10 seconds per item

        for (const range of Layout.HERO_RANGES) {
            const items = this.heroData.get(range.id);
            if (!items || items.length <= 1) continue; // No rotation needed for 0 or 1 item

            // Start playing first video immediately
            this.playHeroVideo(range.id, items[0]);

            const timer = setInterval(() => {
                const currentSub = this.heroSubIndex.get(range.id) ?? 0;
                const nextSub = (currentSub + 1) % items.length;
                this.heroSubIndex.set(range.id, nextSub);

                const nextItem = items[nextSub];
                this.populateHeroCard(range.id, nextItem, nextSub);
                this.playHeroVideo(range.id, nextItem);

                // Also sync clone card if this range is daily or all
                if (range.id === 'all') {
                    this.populateHeroCard('clone-prev', nextItem, nextSub);
                    this.playHeroCloneVideo('clone-prev', nextItem);
                } else if (range.id === 'daily') {
                    this.populateHeroCard('clone-next', nextItem, nextSub);
                    this.playHeroCloneVideo('clone-next', nextItem);
                }
            }, INTERVAL);

            this.heroTimers.set(range.id, timer);
        }
    }

    /**
     * Play 10-second video preview on a real hero card.
     */
    private playHeroVideo(rangeId: string, item: any) {
        const video = document.getElementById(`hc-video-${rangeId}`) as HTMLVideoElement | null;
        if (!video || !item?.url) return;

        video.src = item.url;
        video.currentTime = 0;
        video.muted = true;
        video.playsInline = true;
        video.load();
        video.classList.add('playing');
        video.play().catch(() => {/* autoplay blocked */ });
    }

    /**
     * Play video on clone cards (mirror of real).
     */
    private playHeroCloneVideo(cloneKey: string, item: any) {
        const video = document.getElementById(`hc-video-${cloneKey}`) as HTMLVideoElement | null;
        if (!video || !item?.url) return;

        video.src = item.url;
        video.currentTime = 0;
        video.muted = true;
        video.playsInline = true;
        video.load();
        video.classList.add('playing');
        video.play().catch(() => { });
    }

    /** Infinite-loop carousel — 6 slots: [clone-all | d | w | m | a | clone-daily] */
    private bindCarouselEvents() {
        const track = document.getElementById('hc-track') as HTMLElement | null;
        if (!track) return;

        const REAL = 4;
        const TOTAL = 6; // 2 clones + 4 real
        const STEP = 100 / TOTAL; // ≈ 16.6667%
        let pos = 1; // start at real-daily (slot index 1)

        const dots = Array.from(document.querySelectorAll('.hc-dot'));

        const applyPos = (animated: boolean) => {
            track.style.transition = animated ? 'transform 0.55s var(--ease-smooth)' : 'none';
            track.style.transform = `translateX(-${pos * STEP}%)`;
        };

        const syncDots = () => {
            // real cards: pos 1→dot0, 2→dot1, 3→dot2, 4→dot3 (clones map to their mirror)
            const di = ((pos - 1 + REAL) % REAL);
            dots.forEach((d, i) => d.classList.toggle('active', i === di));
        };

        // Initialize without animation
        applyPos(false);
        syncDots();

        const advance = (delta: number) => {
            pos += delta;
            applyPos(true);
            syncDots();
        };

        // After slide animation ends: if we're on a clone, instant-jump to real mirror
        track.addEventListener('transitionend', () => {
            if (pos <= 0) {
                pos = REAL;        // clone-prev (all) → jump to real all (slot 4)
                applyPos(false);
            } else if (pos >= TOTAL - 1) {
                pos = 1;           // clone-next (daily) → jump to real daily (slot 1)
                applyPos(false);
            }
        });

        document.getElementById('hc-prev')?.addEventListener('click', () => advance(-1));
        document.getElementById('hc-next')?.addEventListener('click', () => advance(1));

        dots.forEach((dot, i) => dot.addEventListener('click', () => {
            pos = i + 1; // dot0 → pos1, dot1 → pos2, ...
            applyPos(true);
            syncDots();
        }));

        // Touch swipe on carousel track
        let hcTsx = 0;
        let hcTsy = 0;
        track.addEventListener('touchstart', (e: TouchEvent) => {
            hcTsx = e.touches[0].clientX;
            hcTsy = e.touches[0].clientY;
        }, { passive: true });
        track.addEventListener('touchend', (e: TouchEvent) => {
            const dx = hcTsx - e.changedTouches[0].clientX;
            const dy = Math.abs(e.changedTouches[0].clientY - hcTsy);
            // Only swipe horizontally (ignore vertical scroll)
            if (Math.abs(dx) > 50 && Math.abs(dx) > dy * 1.5) {
                advance(dx > 0 ? 1 : -1);
            }
        }, { passive: true });

        // Click on real carousel cards → switch to that ranking and open player
        document.getElementById('hero-carousel')?.addEventListener('click', (e) => {
            const card = (e.target as HTMLElement).closest('.hc-card') as HTMLElement | null;
            if (!card || card.classList.contains('hc-clone')) return;

            // Prevent clicks on nav arrows
            if ((e.target as HTMLElement).closest('.hc-arrow')) return;

            const range = card.dataset.range;
            if (!range) return;

            const subIndex = parseInt(card.dataset.heroSubIndex || '0');
            this.handleHeroCardClick(range, subIndex);
        });
    }

    /**
     * Hero card click handler:
     * 1. Switch main grid + section title to the clicked card's range
     * 2. Open TikTok player at the sub-index position (top1/top2/top3)
     */
    private async handleHeroCardClick(range: string, startIndex: number) {
        log(`Hero card clicked: range=${range}, startIndex=${startIndex}`);

        // Pause all hero videos while in player
        this.pauseAllHeroVideos();

        // Sync range UI (sidebar + mobile dropdown)
        this.syncRangeUI(range);

        // Switch main data pool to this range
        await this.applyFilters({ range });

        // Open player at the correct sub-index
        this.player.openModal(startIndex);
    }

    /**
     * Pause all hero card preview videos.
     */
    private pauseAllHeroVideos() {
        for (const range of Layout.HERO_RANGES) {
            const video = document.getElementById(`hc-video-${range.id}`) as HTMLVideoElement | null;
            if (video) video.pause();
        }
        // Also pause clones
        const clonePrev = document.getElementById('hc-video-clone-prev') as HTMLVideoElement | null;
        const cloneNext = document.getElementById('hc-video-clone-next') as HTMLVideoElement | null;
        if (clonePrev) clonePrev.pause();
        if (cloneNext) cloneNext.pause();

        // Stop auto-loop timers
        this.heroTimers.forEach(t => clearInterval(t));
        this.heroTimers.clear();
    }

    /**
     * Resume hero video auto-loop after player closes.
     */
    private resumeHeroVideos() {
        // Resume current video for each range
        for (const range of Layout.HERO_RANGES) {
            const items = this.heroData.get(range.id);
            const subIdx = this.heroSubIndex.get(range.id) ?? 0;
            if (items && items[subIdx]) {
                this.playHeroVideo(range.id, items[subIdx]);
            }
        }
        // Restart auto-loop timers
        this.startHeroAutoLoop();
    }

    private renderGrid(append: boolean = false) {
        const container = document.getElementById('grid-container');
        if (!container) return;

        const list = this.pool.getDataPool();
        let html = '';

        const startIndex = append ? container.children.length : 0;

        const oldRetryBlock = document.getElementById('tm-retry-block');
        if (oldRetryBlock) {
            oldRetryBlock.remove();
        }

        for (let i = startIndex; i < list.length; i++) {
            const item = list[i];
            const rankNum = i + 1;
            let rankClass = rankNum === 1 ? 'rank-1' : (rankNum === 2 ? 'rank-2' : (rankNum === 3 ? 'rank-3' : ''));

            html += `
            <div class="media-card" style="animation-delay: ${(i % 20) * 0.05}s" data-index="${i}" ${item.url ? `data-video-url="${escapeHtml(item.url)}"` : ''} role="button" tabindex="0" aria-label="${escapeHtml(item.title || 'Video card')}">
                <img src="${item.thumbnail}" alt="${escapeHtml(item.title || 'Thumbnail')}" class="card-img" loading="lazy">
                <div class="card-overlay"></div>
                <div class="card-rank ${rankClass}">No.${rankNum}</div>
                <div class="card-play-icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                <div class="card-info">
                    <div class="card-title">${escapeHtml(item.title || `@${item.tweet_account} 的视频`)}</div>
                    <div class="card-stats">
                        <span class="stat"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></svg> ${formatCount(item.favorite)}</span>
                        ${(item.commentCount || (item._count && item._count.comments)) ? `<span class="stat"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg> ${formatCount(item.commentCount || (item._count && item._count.comments))}</span>` : ''}
                        <span class="stat"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg> ${formatCount(item.pv)}</span>
                    </div>
                </div>
            </div>`;
        }

        if (append) {
            container.insertAdjacentHTML('beforeend', html);
        } else {
            container.innerHTML = html;
        }
    }
}
