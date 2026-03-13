import { PoolManager } from '../api/PoolManager';
import { Components } from './Components';
import { formatCount, escapeHtml } from '../utils/Format';

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

    private bindEvents() {
        document.querySelectorAll('.nav-item[data-range]').forEach(item => {
            item.addEventListener('click', async () => {
                document.querySelectorAll('.nav-item[data-range]').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                const range = (item as HTMLElement).dataset.range;
                await this.pool.loadInitialData({ range });
                this.renderAll();
            });
        });

        document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const sort = (btn as HTMLElement).dataset.sort;
                await this.pool.loadInitialData({ sort });
                this.renderAll();
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
                document.querySelectorAll('#range-dropdown .mobile-dd-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                // Also sync sidebar
                document.querySelectorAll('.nav-item[data-range]').forEach(n => n.classList.remove('active'));
                const matchSidebar = document.querySelector(`.nav-item[data-range="${(item as HTMLElement).dataset.range}"]`);
                matchSidebar?.classList.add('active');
                closeAllDropdowns();
                const range = (item as HTMLElement).dataset.range;
                await this.pool.loadInitialData({ range });
                this.renderAll();
            });
        });

        // Mobile sort items
        document.querySelectorAll('#sort-dropdown .mobile-dd-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                document.querySelectorAll('#sort-dropdown .mobile-dd-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                // Also sync desktop sort
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                const matchSort = document.querySelector(`.sort-btn[data-sort="${(item as HTMLElement).dataset.sort}"]`);
                matchSort?.classList.add('active');
                closeAllDropdowns();
                const sort = (item as HTMLElement).dataset.sort;
                await this.pool.loadInitialData({ sort });
                this.renderAll();
            });
        });

        document.querySelectorAll('.channel-btn[data-channel]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const channel = (btn as HTMLElement).dataset.channel;
                const isAnime = channel === 'anime';
                if (isAnime === this.pool.getApiClient().getIsAnime()) return;
                
                // Trigger pulse
                const topbarPulse = document.getElementById('topbar-pulse');
                if (topbarPulse) {
                    topbarPulse.classList.remove('pulse-anim');
                    void topbarPulse.offsetWidth; // trigger reflow
                    topbarPulse.classList.add('pulse-anim');
                }
                
                // Update theme class
                document.body.className = isAnime ? 'theme-anime' : 'theme-real';
                
                // Set the channel explicitly in the ApiClient config
                this.pool.getApiClient().setChannel(isAnime);
                
                // Update Switcher UI explicitly
                const switcher = btn.closest('.channel-switch');
                if (switcher) {
                    if (isAnime) switcher.classList.add('is-anime');
                    else switcher.classList.remove('is-anime');
                }
                
                // Re-render topbar cleanly via active classes
                document.querySelectorAll('.channel-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                
                // Sink old cards
                const cards = document.querySelectorAll('.media-card');
                cards.forEach(c => c.classList.add('sinking'));
                
                // Wait for sink animation
                await new Promise(res => setTimeout(res, 300));
                
                // Render loading states while switching channels 
                const grid = document.getElementById('grid-container');
                if (grid) grid.innerHTML = this.generateSkeletons();
                
                await this.pool.loadInitialData(); // the API will automatically fetch with the newly updated baseurl
                this.renderAll();
            });
        });

        const mainContainer = document.getElementById('main-scroll');
        if (mainContainer) {
            let isFetching = false;
            let lastScrollTop = 0;
            
            mainContainer.addEventListener('scroll', () => {
                const scrollTop = mainContainer.scrollTop;
                const scrollHeight = mainContainer.scrollHeight;
                const clientHeight = mainContainer.clientHeight;
                
                // Only check when scrolling down and near bottom (30% relative or 800px)
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

        const gridContainer = document.getElementById('grid-container');
        if (gridContainer) {
            gridContainer.addEventListener('click', (e) => {
                const card = (e.target as HTMLElement).closest('.media-card');
                if (card) {
                    const indexAttr = card.getAttribute('data-index');
                    if (indexAttr) {
                        const index = parseInt(indexAttr);
                        console.log('Open player for index', index);
                        this.player.openModal(index);
                    }
                }
            });
        }
    }

    private async loadInitialData() {
        try {
            await this.pool.loadInitialData();
            if (this.pool.getDataPool().length === 0) {
                this.renderEmptyState();
            } else {
                this.renderAll();
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.renderErrorState();
        }
    }

    private async loadMoreData() {
        try {
            const newData = await this.pool.fetchNextPage();
            if (newData && newData.length > 0) {
                this.renderGrid(true); // append only
            } else if (this.pool.getDataPool().length === 0) {
                this.renderEmptyState();
            }
        } catch (error) {
            console.error('Failed to load more data:', error);
            this.appendRetryBlock();
        }
    }

    private renderAll() {
        this.renderHero();
        this.renderGrid(false); // full re-render
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
            
            // Re-bind the one-time event for pure retry
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
            console.log('Open player for index 0');
            this.player.openModal(0);
        };
    }

    private renderGrid(append: boolean = false) {
        const container = document.getElementById('grid-container');
        if (!container) return;

        const list = this.pool.getDataPool();
        let html = '';
        
        // If appending, we only generate HTML for the newly added items. For now we will just re-render cleanly for simplicity,
        // unless you want high speed DOM appending.
        const startIndex = append ? container.children.length : 0;

        // Remove existing retry block if it exists
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