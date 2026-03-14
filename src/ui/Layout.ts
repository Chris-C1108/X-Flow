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
        this.loadInitialData();
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
            const banner = document.getElementById('hero-banner');
            if (banner) banner.style.display = 'none';
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
                const card = (e.target as HTMLElement).closest('.media-card');
                if (card) {
                    const indexAttr = card.getAttribute('data-index');
                    if (indexAttr) {
                        const index = parseInt(indexAttr);
                        this.player.openModal(index);
                    }
                }
            });
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
        this.renderHero();
        this.renderGrid(false);
    }
    
    private renderEmptyState() {
        const banner = document.getElementById('hero-banner');
        if (banner) banner.style.display = 'none';
        
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
        const banner = document.getElementById('hero-banner');
        if (banner) banner.style.display = 'none';
        
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

    private renderHero() {
        const list = this.pool.getDataPool();
        if (!list.length) return;

        const banner = document.getElementById('hero-banner');
        if (!banner) return;

        const hero = list[0];
        banner.style.display = 'block';
        
        const heroBg = document.getElementById('hero-bg');
        if (heroBg) {
            heroBg.style.backgroundImage = `url("${escapeCSSUrl(hero.thumbnail)}")`;
            heroBg.style.opacity = '1';
        }
        
        const heroSkeleton = document.getElementById('hero-skeleton');
        if (heroSkeleton) heroSkeleton.style.display = 'none';
        
        const heroTitle = document.getElementById('hero-title');
        if (heroTitle) heroTitle.textContent = hero.title || `@${hero.tweet_account} 的神级视觉演绎`;
        
        const heroLikes = document.getElementById('hero-likes');
        if (heroLikes) heroLikes.textContent = formatCount(hero.favorite);
        
        const heroPv = document.getElementById('hero-pv');
        if (heroPv) heroPv.textContent = formatCount(hero.pv);
        
        banner.onclick = () => {
            this.player.openModal(0);
        };
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
            <div class="media-card" style="animation-delay: ${(i % 20) * 0.05}s" data-index="${i}" role="button" tabindex="0" aria-label="${escapeHtml(item.title || 'Video card')}">
                <img src="${item.thumbnail}" alt="${escapeHtml(item.title || 'Thumbnail')}" class="card-img" loading="lazy">
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
            container.insertAdjacentHTML('beforeend', html);
        } else {
            container.innerHTML = html;
        }
    }
}
