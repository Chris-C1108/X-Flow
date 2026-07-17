import { PoolManager } from '../api/PoolManager';
import { QueryState } from '../api/CacheManager';
import { Components, DEFAULT_FILTER_GROUPS, getGroupTitle } from './Components';
import { AdapterManager } from '../api/adapters/AdapterManager';
import { formatCount, escapeHtml } from '../utils/Format';
import { log } from '../utils/Logger';
import { t, tLabel, setLang, LangCode } from '../utils/i18n';
import { loadGM, saveGM, STORAGE_KEYS, BookmarkItem } from '../engine/Storage';
import { showConfirmModal } from '../utils/Dom';

function escapeCSSUrl(url: string) {
    return url.replace(/["'\\]/g, '\\$&');
}

import { TikTokMode } from '../player/TikTokMode';
import { collector } from '../telemetry/EventCollector';

/**
 * 核心容器与 CSS 注入，以及数据展示的 DOM 构造逻辑
 */
export class Layout {
    private pool: PoolManager;
    private rootElement: HTMLElement | null = null;
    private player: TikTokMode;
    private hoverVideo: HTMLVideoElement | null = null;
    private hoverCard: HTMLElement | null = null;

    private isBookmarksView = false;
    private bookmarkFilterSite = 'all';
    private bookmarkSort = 'recent';
    private bookmarkIncludeDownloaded = true;

    private getActiveFilters(): any[] {
        const adapter = AdapterManager.getInstance().getActiveAdapter();
        return adapter.getFilterGroups ? adapter.getFilterGroups(this.pool.getApiClient().getIsAnime()) : [];
    }

    constructor() {
        this.pool = new PoolManager();
        this.player = new TikTokMode(this.pool);
    }

    public init(root: HTMLElement) {
        this.rootElement = root;
        if (this.rootElement) {
            this.rootElement.className = this.pool.getApiClient().getIsAnime() ? 'theme-anime' : 'theme-real';
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

        // DAU 心跳：统计脚本总日活终端数与各站点日活（6小时防重发）
        const activeAdapter = AdapterManager.getInstance().getActiveAdapter();
        const siteKey = activeAdapter ? (activeAdapter.id || activeAdapter.constructor.name.replace('Adapter', '').toLowerCase()) : '';
        collector.setSiteKey(siteKey);
        collector.setChannel(this.pool.getCurrentQuery().isAnimeOnly);
        collector.trackAppInit(siteKey);
    }

    private bindDetailLoaderListener() {
        this.pool.onDetailLoaded((item) => {
            const grid = document.getElementById('grid-container');
            if (!grid) return;
            const cards = grid.querySelectorAll('.media-card');
            for (const card of cards) {
                const indexAttr = card.getAttribute('data-index');
                if (!indexAttr) continue;
                const index = parseInt(indexAttr);
                const poolItem = this.isBookmarksView 
                    ? this.pool.getCustomDataPool()?.[index] 
                    : this.pool.getDataPool()[index];
                if (poolItem && poolItem.id === item.id) {
                    if (item.url) {
                        card.setAttribute('data-video-url', item.url);
                    }
                    const authorEl = card.querySelector('.card-author');
                    if (authorEl) {
                        authorEl.textContent = this.getCleanBloggerName(item.authorDisplayName || item.tweet_account || '');
                    }
                    let titleEl = card.querySelector('.card-title');
                    if (!titleEl && item.title) {
                        titleEl = document.createElement('div');
                        titleEl.className = 'card-title';
                        const infoEl = card.querySelector('.card-info');
                        if (infoEl) {
                            const statsEl = infoEl.querySelector('.card-stats');
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

    private createPageStructure() {
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
                                <button type="button" class="filter-toggle-btn" id="filter-toggle-btn" aria-label="Toggle Filters" style="display: ${filters.length > 2 ? 'inline-flex' : 'none'};">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 18v-6L3 5V3h18v2l-7 7v6l-4 2z"/></svg>
                                    <span>${t('filter')}</span>
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

        // Hide filter toggle button if there are no filters
        const toggleBtn = document.getElementById('filter-toggle-btn');
        if (toggleBtn) {
            if (filters.length === 0) {
                toggleBtn.style.display = 'none';
            } else {
                toggleBtn.style.display = '';
            }
        }
    }

    private renderFilterPanel() {
        const panel = document.getElementById('filter-expand-panel');
        if (!panel) return;

        if (this.isBookmarksView) {
            const sites = [
                { id: 'all', label: '全部' },
                { id: 'pektino', label: 'Pektino' },
                { id: 'twihub', label: 'TwiHub' },
                { id: 'twikeep', label: 'TwiKeep' },
                { id: 'twiidol', label: 'TwiIdol' },
                { id: 'twiigle', label: 'Twiigle' },
                { id: 'monsnode', label: 'Monsnode' },
                { id: 'twivideo', label: 'TwiVideo' },
                { id: 'twidouga', label: 'TwiDouga' },
                { id: 'javtwi', label: 'JavTwi' },
                { id: 'xhotvideo', label: 'XHotVideo' }
            ];
            
            const sitesHtml = sites.map(opt => {
                const isActive = opt.id === this.bookmarkFilterSite;
                return `<button type="button" class="filter-option-btn ${isActive ? 'active' : ''}" data-bookmark-site="${opt.id}">${opt.label}</button>`;
            }).join('');

            const sorts = [
                { id: 'recent', label: '最近收藏' },
                { id: 'oldest', label: '最早收藏' },
                { id: 'views', label: '播放最多' },
                { id: 'duration', label: '时长最长' }
            ];

            const sortsHtml = sorts.map(opt => {
                const isActive = opt.id === this.bookmarkSort;
                return `<button type="button" class="filter-option-btn ${isActive ? 'active' : ''}" data-bookmark-sort="${opt.id}">${opt.label}</button>`;
            }).join('');

            panel.innerHTML = `
                <div class="filter-rows-container">
                    <div class="filter-row">
                        <div class="filter-row-title">${t('filter_category')}</div>
                        <div class="filter-row-options">
                            ${sitesHtml}
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-row-title">${t('filter_sort')}</div>
                        <div class="filter-row-options">
                            ${sortsHtml}
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-row-title">批量操作</div>
                        <div class="filter-row-options" style="align-items: center; gap: 16px;">
                            <label class="bookmark-chk-label" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--text-300);">
                                <input type="checkbox" id="bookmark-include-downloaded-chk" ${this.bookmarkIncludeDownloaded ? 'checked' : ''} style="accent-color: var(--theme-accent); width: 14px; height: 14px; cursor: pointer;">
                                ${t('includeDownloaded')}
                            </label>
                            <button type="button" class="bookmark-copy-btn" id="bookmark-select-all-btn" style="display: inline-flex; align-items: center; gap: 6px; background: var(--theme-accent-subtle) !important; border: 1px solid var(--theme-accent) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--theme-accent) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                                全选
                            </button>
                            <button type="button" class="bookmark-copy-btn" id="bookmark-copy-links-btn" style="display: none; align-items: center; gap: 6px; background: var(--theme-accent-subtle) !important; border: 1px solid var(--theme-accent) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--theme-accent) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                                ${t('copyLinks')}
                            </button>
                            <button type="button" class="bookmark-copy-btn" id="bookmark-cancel-select-btn" style="display: none; align-items: center; gap: 6px; background: rgba(255,255,255,0.08) !important; border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--text-200) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const btn = document.getElementById('filter-toggle-btn');
            if (btn) btn.style.display = 'inline-flex';
            return;
        }

        const filters = this.getActiveFilters();
        const activeParams = this.pool.getCurrentQuery();
        
        // Dynamic filter rows (Group 2+)
        const extraGroups = filters.slice(2);
        if (extraGroups.length === 0) {
            const btn = document.getElementById('filter-toggle-btn');
            if (btn) btn.style.display = 'none';
            panel.innerHTML = '';
            return;
        } else {
            const btn = document.getElementById('filter-toggle-btn');
            if (btn) btn.style.display = 'inline-flex';
        }

        const rowsHtml = extraGroups.map(group => {
            const activeId = activeParams[group.id] || group.options[0]?.id;
            const optionsHtml = group.options.map(opt => {
                const isActive = opt.id === activeId;
                return `<button type="button" class="filter-option-btn ${isActive ? 'active' : ''}" data-filter-group="${group.id}" data-filter-value="${opt.id}">${tLabel(opt.label)}</button>`;
            }).join('');

            return `
                <div class="filter-row">
                    <div class="filter-row-title">${getGroupTitle(group)}</div>
                    <div class="filter-row-options">
                        ${optionsHtml}
                    </div>
                </div>
            `;
        }).join('');

        panel.innerHTML = `
            <div class="filter-rows-container">
                ${rowsHtml}
            </div>
        `;
    }

    private generateSkeletons() {
        return Array(6).fill(0).map(() => `
            <div class="media-card" style="border-radius: 1.5rem; cursor: default; animation: none; background: transparent; border: none;">
                <div class="skeleton-pulse"></div>
            </div>
        `).join('');
    }

    // ─── Unified filter switching ───────────────────────────────────

    /**
     * 统一入口：所有 UI 筛选切换都走此方法。
     * 缓存命中则秒开，否则展示 skeleton loading。
     */
    private async applyFilters(partial: Partial<QueryState>, opts?: { channelSwitch?: boolean }) {
        this.pool.stopPrefetching();
        if (this.isBookmarksView) {
            if (partial.bookmarkSite !== undefined) {
                this.bookmarkFilterSite = partial.bookmarkSite;
            }
            if (partial.bookmarkSort !== undefined) {
                this.bookmarkSort = partial.bookmarkSort;
            }
            this.loadBookmarksData();
            return;
        }

        const willHitCache = this.pool.hasFreshCache(partial);

        if (!willHitCache) {
            const grid = document.getElementById('grid-container');
            if (grid) grid.innerHTML = this.generateSkeletons();
        }

        // Channel switch: update theme & recreate structure
        if (opts?.channelSwitch && partial.isAnimeOnly !== undefined) {
            const prevChannel = this.pool.getCurrentQuery().isAnimeOnly ? 'anime' : 'real';
            const nextChannel = partial.isAnimeOnly ? 'anime' : 'real';
            if (prevChannel !== nextChannel) {
                collector.trackChannelSwitch(prevChannel, nextChannel);
            }
            if (this.rootElement) {
                this.rootElement.className = partial.isAnimeOnly ? 'theme-anime' : 'theme-real';
            }
            this.createPageStructure();
            this.bindEvents();
        }

        // Keep collector in sync with current channel
        collector.setChannel(partial.isAnimeOnly ?? this.pool.getCurrentQuery().isAnimeOnly);

        try {
            const result = await this.pool.loadInitialData(partial);
            
            // Sync UI active indicators to match actual query parameters after loading
            this.syncFiltersUI(this.pool.getCurrentQuery());

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
        const filters = this.getActiveFilters();
        const rangeGroup = filters.find(g => g.type === 'range' || g.id === 'range' || g.id === 'category');
        const ranges = rangeGroup ? rangeGroup.options.map((o: any) => o.id) : ['daily', 'weekly', 'monthly', 'all'];
        const nextRange = ranges.find((r: string) => r !== q.range) || ranges[0] || 'weekly';

        // 2. Other channel, same range + sort
        const otherChannel: QueryState = {
            isAnimeOnly: !q.isAnimeOnly,
            range: q.range,
            sort: q.sort,
            perPage: q.perPage ?? 50,
        };

        const sameChannelOtherRange: QueryState = {
            isAnimeOnly: q.isAnimeOnly,
            range: nextRange,
            sort: q.sort,
            perPage: q.perPage ?? 50,
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
        const appLayout = this.rootElement?.querySelector('.app-layout') as HTMLElement | null;
        const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
        sidebarToggleBtn?.addEventListener('click', () => {
            if (!appLayout) return;
            const collapsed = appLayout.classList.toggle('sidebar-collapsed');
            sidebarToggleBtn.setAttribute('aria-expanded', (!collapsed).toString());
            sidebarToggleBtn.setAttribute('aria-label', collapsed ? t('expandSidebar') : t('collapseSidebar'));
            sidebarToggleBtn.setAttribute('title', collapsed ? t('expandSidebar') : t('collapseSidebar'));
        });

        // Mobile dropdown toggles and Site Switcher
        const rangeBtn = document.getElementById('mobile-range-btn');
        const rangeDropdown = document.getElementById('range-dropdown');
        const sortBtn2 = document.getElementById('mobile-sort-btn');
        const sortDropdown = document.getElementById('sort-dropdown');
        
        const closeAllDropdowns = (options?: { excludeRange?: boolean }) => {
            if (!options?.excludeRange) {
                rangeDropdown?.classList.remove('open');
                rangeBtn?.setAttribute('aria-expanded', 'false');
            }
            sortDropdown?.classList.remove('open');
            sortBtn2?.setAttribute('aria-expanded', 'false');
            document.querySelectorAll('.site-switch-wrap').forEach(w => w.classList.remove('active'));
            document.querySelectorAll('.filter-dd-wrap').forEach(d => d.classList.remove('active'));
        };

        // Bind all Site Switchers (Desktop topbar & Mobile dropdown menu)
        const siteSwitchWraps = document.querySelectorAll('.site-switch-wrap:not(.lang-switch-wrap)');
        siteSwitchWraps.forEach(wrap => {
            const btn = wrap.querySelector('.site-switch-btn');
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = wrap.classList.contains('active');
                closeAllDropdowns({ excludeRange: true });
                if (!isActive) {
                    wrap.classList.add('active');
                }
            });
        });

        // Bind all Language Switchers (Desktop topbar & Mobile dropdown menu)
        const langSwitchWraps = document.querySelectorAll('.lang-switch-wrap');
        langSwitchWraps.forEach(wrap => {
            const btn = wrap.querySelector('.site-switch-btn');
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = wrap.classList.contains('active');
                closeAllDropdowns({ excludeRange: true });
                if (!isActive) {
                    wrap.classList.add('active');
                }
            });

            wrap.addEventListener('click', (e) => {
                const langBtn = (e.target as HTMLElement).closest('[data-lang]') as HTMLElement | null;
                if (langBtn) {
                    e.stopPropagation();
                    const selectedLang = langBtn.dataset.lang as LangCode;
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

        // Toggle dynamic filter panel next to section-title
        const filterToggleBtn = document.getElementById('filter-toggle-btn');
        const filterExpandPanel = document.getElementById('filter-expand-panel');
        filterToggleBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !filterExpandPanel?.classList.toggle('hidden');
            filterToggleBtn.classList.toggle('active', isOpen);
        });

        // Dynamic Filter clicks (Sidebar, Topbar sort, Extra dropdowns list, Mobile dropdown list)
        document.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;

            // Bookmark site filter click
            const bSiteBtn = target.closest('[data-bookmark-site]') as HTMLElement | null;
            if (bSiteBtn) {
                e.stopPropagation();
                const site = bSiteBtn.dataset.bookmarkSite!;
                await this.applyFilters({ bookmarkSite: site });
                return;
            }

            // Bookmark sort click
            const bSortBtn = target.closest('[data-bookmark-sort]') as HTMLElement | null;
            if (bSortBtn) {
                e.stopPropagation();
                const sort = bSortBtn.dataset.bookmarkSort!;
                await this.applyFilters({ bookmarkSort: sort });
                return;
            }

            const filterItem = target.closest('[data-filter-group][data-filter-value]') as HTMLElement | null;
            if (filterItem) {
                e.stopPropagation();
                const groupId = filterItem.dataset.filterGroup!;
                const value = filterItem.dataset.filterValue!;
                
                // If in bookmarks view and switching to a standard range category, exit bookmarks!
                if (this.isBookmarksView && groupId === 'range') {
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

        // Bookmark Library Button click (My Library)
        const myBookmarksBtn = document.getElementById('my-bookmarks-btn');
        myBookmarksBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.switchToBookmarksView();
        });

        // Bookmark Include Downloaded Checkbox change
        document.addEventListener('change', (e) => {
            const chk = e.target as HTMLInputElement;
            if (chk.id === 'bookmark-include-downloaded-chk') {
                this.bookmarkIncludeDownloaded = chk.checked;
                // Reload bookmarks data to apply checkbox filtering/display updates
                this.loadBookmarksData();
            }
        });

        // Bookmark Select All / Copy / Cancel flow
        document.addEventListener('click', async (e) => {
            const selectAllBtn = (e.target as HTMLElement).closest('#bookmark-select-all-btn') as HTMLButtonElement | null;
            if (selectAllBtn) {
                e.stopPropagation();
                // Show checkboxes on all bookmark cards
                document.querySelectorAll('.media-card').forEach(card => {
                    let chk = card.querySelector('.bookmark-select-chk') as HTMLInputElement;
                    if (!chk) {
                        chk = document.createElement('input');
                        chk.type = 'checkbox';
                        chk.className = 'bookmark-select-chk';
                        chk.checked = true;
                        chk.style.cssText = 'position:absolute;top:12px;left:12px;z-index:7;width:18px;height:18px;accent-color:var(--theme-accent);cursor:pointer;';
                        card.appendChild(chk);
                    } else {
                        chk.checked = true;
                        chk.style.display = 'block';
                    }
                });
                selectAllBtn.style.display = 'none';
                const copyBtn = document.getElementById('bookmark-copy-links-btn');
                const cancelBtn = document.getElementById('bookmark-cancel-select-btn');
                if (copyBtn) copyBtn.style.display = 'inline-flex';
                if (cancelBtn) cancelBtn.style.display = 'inline-flex';
                return;
            }

            const cancelBtn = (e.target as HTMLElement).closest('#bookmark-cancel-select-btn') as HTMLButtonElement | null;
            if (cancelBtn) {
                e.stopPropagation();
                document.querySelectorAll('.bookmark-select-chk').forEach(chk => (chk as HTMLElement).style.display = 'none');
                cancelBtn.style.display = 'none';
                const copyBtn = document.getElementById('bookmark-copy-links-btn');
                const selAllBtn = document.getElementById('bookmark-select-all-btn');
                if (copyBtn) copyBtn.style.display = 'none';
                if (selAllBtn) selAllBtn.style.display = 'inline-flex';
                return;
            }

            const copyBtn = (e.target as HTMLElement).closest('#bookmark-copy-links-btn') as HTMLButtonElement | null;
            if (copyBtn) {
                e.stopPropagation();
                
                // Gather selected video IDs
                const selectedIds = new Set<string>();
                document.querySelectorAll('.media-card').forEach(card => {
                    const chk = card.querySelector('.bookmark-select-chk') as HTMLInputElement;
                    if (chk && chk.checked) {
                        const idx = card.getAttribute('data-index');
                        if (idx !== null) selectedIds.add(idx);
                    }
                });

                const list = this.pool.getDataPool();
                const links: string[] = [];
                const copiedIds: string[] = [];
                selectedIds.forEach(idxStr => {
                    const item = list[parseInt(idxStr)];
                    if (item) {
                        const link = item.originalUrl || item.url || '';
                        if (link) links.push(link);
                        copiedIds.push(item.id);
                    }
                });

                if (links.length === 0) return;

                const linksText = links.join('\n');
                try {
                    await navigator.clipboard.writeText(linksText);
                    
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = t('copied');
                    copyBtn.style.setProperty('background', 'rgba(46, 213, 115, 0.15)', 'important');
                    copyBtn.style.setProperty('border-color', '#2ed573', 'important');
                    copyBtn.style.setProperty('color', '#2ed573', 'important');

                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                        copyBtn.style.removeProperty('background');
                        copyBtn.style.removeProperty('border-color');
                        copyBtn.style.removeProperty('color');
                    }, 1500);

                    // Ask user to mark as downloaded
                    showConfirmModal(
                        '标记已下载',
                        `已复制 ${links.length} 个视频链接。是否将这些视频标记为已下载？`,
                        () => {
                            const downloaded = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []) as string[]);
                            copiedIds.forEach(id => downloaded.add(id));
                            saveGM(STORAGE_KEYS.DOWNLOADED, Array.from(downloaded));
                            // Refresh UI to show badges
                            this.loadBookmarksData();
                        }
                    );
                } catch (err) {
                    console.error('Failed to copy links:', err);
                }
            }
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
                    // Check if bookmark selection checkbox is visible
                    const chk = card.querySelector('.bookmark-select-chk') as HTMLInputElement | null;
                    if (chk && chk.style.display !== 'none') {
                        if (e.target !== chk) {
                            chk.checked = !chk.checked;
                        }
                        return; // Do not open player
                    }

                    const indexAttr = card.getAttribute('data-index');
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


            // ── Hover-to-play ─────────────────────────────────────────
            gridContainer.addEventListener('mouseenter', async (e) => {
                const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
                if (!card || card === this.hoverCard) return;
                this.clearActiveHoverVideo();

                const indexAttr = card.getAttribute('data-index');
                if (!indexAttr) return;
                const index = parseInt(indexAttr);
                const item = this.isBookmarksView 
                    ? this.pool.getCustomDataPool()?.[index] 
                    : this.pool.getDataPool()[index];
                if (!item) return;

                this.hoverCard = card;
                card.classList.add('hover-playing');

                let videoUrl = item.url || card.dataset.videoUrl || '';
                if (!videoUrl) {
                    try {
                        const resolved = await this.pool.loadDetails(item);
                        videoUrl = resolved?.url || '';
                        if (videoUrl) {
                            card.setAttribute('data-video-url', videoUrl);
                        }
                    } catch (err) {
                        console.warn('Failed to resolve video URL on hover:', err);
                    }
                }

                if (!videoUrl || card !== this.hoverCard) {
                    if (card === this.hoverCard) this.clearActiveHoverVideo();
                    return;
                }

                const video = document.createElement('video');
                video.className = 'card-hover-video';
                video.src = videoUrl;
                video.muted = true;
                video.autoplay = true;
                video.loop = true;
                video.playsInline = true;
                video.preload = 'auto';

                const onPlay = () => {
                    card.classList.add('video-playing');
                };
                video.addEventListener('playing', onPlay, { once: true });
                video.addEventListener('timeupdate', onPlay, { once: true });

                card.appendChild(video);
                this.hoverVideo = video;
                video.play().catch(() => {/* autoplay blocked */ });
            }, true);

            gridContainer.addEventListener('mouseleave', (e) => {
                const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
                if (card && card === this.hoverCard) this.clearActiveHoverVideo();
            }, true);

            // ── Mobile touch: long-press (450ms) to preview, short tap to open ──
            let touchTimer: ReturnType<typeof setTimeout> | null = null;
            let touchStartY = 0;
            let touchScrolled = false;

            const startTouchPreview = async (card: HTMLElement) => {
                this.clearActiveHoverVideo();
                
                const indexAttr = card.getAttribute('data-index');
                if (!indexAttr) return;
                const index = parseInt(indexAttr);
                const item = this.isBookmarksView 
                    ? this.pool.getCustomDataPool()?.[index] 
                    : this.pool.getDataPool()[index];
                if (!item) return;

                this.hoverCard = card;
                card.classList.add('hover-playing');

                let videoUrl = item.url || card.dataset.videoUrl || '';
                if (!videoUrl) {
                    try {
                        const resolved = await this.pool.loadDetails(item);
                        videoUrl = resolved?.url || '';
                        if (videoUrl) {
                            card.setAttribute('data-video-url', videoUrl);
                        }
                    } catch (err) {
                        console.warn('Failed to resolve video URL on touch preview:', err);
                    }
                }

                if (!videoUrl || card !== this.hoverCard) {
                    if (card === this.hoverCard) this.clearActiveHoverVideo();
                    return;
                }

                const video = document.createElement('video');
                video.className = 'card-hover-video';
                video.src = videoUrl;
                video.muted = true;
                video.autoplay = true;
                video.loop = true;
                video.playsInline = true;

                const onPlay = () => {
                    card.classList.add('video-playing');
                };
                video.addEventListener('playing', onPlay, { once: true });
                video.addEventListener('timeupdate', onPlay, { once: true });

                card.appendChild(video);
                this.hoverVideo = video;
                video.play().catch(() => { });
            };

            gridContainer.addEventListener('touchstart', (e: TouchEvent) => {
                const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
                if (!card) return;
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
                
                if (this.hoverCard) {
                    const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
                    if (card && card === this.hoverCard) {
                        const indexAttr = card.getAttribute('data-index');
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
                    // Short tap on mobile: open player immediately (bypasses iOS hover delay and double-tap quirk)
                    const card = (e.target as HTMLElement).closest('.media-card') as HTMLElement | null;
                    if (card) {
                        // Check if bookmark selection checkbox is visible
                        const chk = card.querySelector('.bookmark-select-chk') as HTMLInputElement | null;
                        if (chk && chk.style.display !== 'none') {
                            if (e.target !== chk) {
                                chk.checked = !chk.checked;
                            }
                            e.preventDefault();
                            return;
                        }

                        const indexAttr = card.getAttribute('data-index');
                        if (indexAttr) {
                            const index = parseInt(indexAttr);
                            this.player.openModal(index, 0);
                            e.preventDefault(); // Prevent simulated mouse/click events
                        }
                    }
                }
            }, { passive: false });

            gridContainer.addEventListener('touchcancel', () => {
                if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
                this.clearActiveHoverVideo();
            }, { passive: true });
        }
    }

    // ─── UI sync helpers ────────────────────────────────────────────

    private syncFiltersUI(activeParams: Record<string, string>) {
        Object.entries(activeParams).forEach(([groupId, activeValue]) => {
            // 1. Sidebar items
            document.querySelectorAll(`.nav-item[data-filter-group="${groupId}"]`).forEach(n => {
                const val = (n as HTMLElement).dataset.filterValue;
                n.classList.toggle('active', val === activeValue);
            });

            // 2. Mobile dropdown items
            document.querySelectorAll(`.mobile-dd-item[data-filter-group="${groupId}"]`).forEach(n => {
                const val = (n as HTMLElement).dataset.filterValue;
                n.classList.toggle('active', val === activeValue);
            });

            // 3. Desktop sort buttons
            document.querySelectorAll(`.sort-btn[data-filter-group="${groupId}"]`).forEach(n => {
                const val = (n as HTMLElement).dataset.filterValue;
                n.classList.toggle('active', val === activeValue);
            });

            // 4. Desktop extra dropdown items
            document.querySelectorAll(`.extra-filter-dropdown[data-group-id="${groupId}"] .site-dd-item`).forEach(n => {
                const val = (n as HTMLElement).dataset.filterValue;
                n.classList.toggle('active', val === activeValue);
            });

            // Update extra dropdown button label
            const dropdownBtn = document.querySelector(`.extra-filter-dropdown[data-group-id="${groupId}"] .site-switch-btn span`);
            if (dropdownBtn) {
                const filters = this.getActiveFilters();
                const group = filters.find(g => g.id === groupId);
                const activeOpt = group?.options.find(o => o.id === activeValue);
                if (activeOpt) {
                    dropdownBtn.textContent = `${group.title}: ${activeOpt.label}`;
                }
            }
        });
    }

    // ─── Data loading ───────────────────────────────────────────────

    private async loadInitialData() {
        try {
            const filters = this.getActiveFilters();
            const defaultParams: Partial<QueryState> = {};
            filters.forEach(group => {
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
            // Kick off background preloads after initial load
            this.schedulePreloads();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.renderErrorState();
        }
    }

    private async loadMoreData() {
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
            console.error('Failed to load more data:', error);
            this.appendRetryBlock();
        }
    }

    // ─── Rendering ──────────────────────────────────────────────────

    private loadBookmarksData() {
        // Load v2 bookmarks
        const bookmarks = loadGM(STORAGE_KEYS.BOOKMARKS_V2, []) as BookmarkItem[];
        
        // Filter by Site
        let filtered = bookmarks;
        if (this.bookmarkFilterSite !== 'all') {
            filtered = bookmarks.filter(b => b.currentRankingSite === this.bookmarkFilterSite);
        }

        // Filter by Downloaded status if not included
        if (!this.bookmarkIncludeDownloaded) {
            const downloaded = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []) as string[]);
            filtered = filtered.filter(b => !downloaded.has(b.id));
        }

        // Sort
        if (this.bookmarkSort === 'recent') {
            filtered.sort((a, b) => b.bookmarkTime - a.bookmarkTime);
        } else if (this.bookmarkSort === 'oldest') {
            filtered.sort((a, b) => a.bookmarkTime - b.bookmarkTime);
        } else if (this.bookmarkSort === 'views') {
            filtered.sort((a, b) => (b.pv || 0) - (a.pv || 0));
        } else if (this.bookmarkSort === 'duration') {
            filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
        }

        // Map BookmarkItem[] to UnifiedVideoItem[]
        const unifiedVideos = filtered.map(b => ({
            id: b.id,
            url_cd: b.url_cd,
            thumbnail: b.thumbnail,
            title: b.tweetTitle,
            tweet_account: b.authorId,
            favorite: 0,
            pv: b.pv,
            duration: b.duration,
            url: b.url,
            isDetailsLoaded: true,
            originalUrl: b.videoUrl
        }));

        this.pool.setCustomDataPool(unifiedVideos);

        const el = document.getElementById('section-title');
        if (el) {
            const siteLabel = this.bookmarkFilterSite === 'all' ? '全部站点' : this.bookmarkFilterSite.toUpperCase();
            const sortLabel = this.bookmarkSort === 'recent' ? '最近收藏' : (this.bookmarkSort === 'oldest' ? '最早收藏' : (this.bookmarkSort === 'views' ? '播放最多' : '时长最长'));
            el.innerHTML = `${t('myBookmarks')} · ${siteLabel} · ${sortLabel} <button type="button" class="back-to-rankings-btn" id="back-to-rankings-btn">← 返回排行榜</button>`;
            // Bind back button
            const backBtn = document.getElementById('back-to-rankings-btn');
            backBtn?.addEventListener('click', (ev) => {
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

    private renderAll() {
        this.updateSectionTitle();
        this.renderGrid(false);
        this.playNo1AutoVideo();
        this.scheduleHomepagePrefetch(0);
    }

    /** 展示当前榜单和排序模式信息 */
    private updateSectionTitle() {
        const el = document.getElementById('section-title');
        if (!el) return;
        
        const q = this.pool.getCurrentQuery();
        const filters = this.getActiveFilters();
        const labels: string[] = [];

        filters.forEach(group => {
            const val = q[group.id];
            const opt = group.options.find((o: any) => o.id === val) || group.options[0];
            if (opt) {
                labels.push(tLabel(opt.label));
            }
        });

        const titleText = labels.join(' · ');
        el.textContent = titleText;
    }

    private renderEmptyState() {
        this.updateSectionTitle();
        const container = document.getElementById('grid-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="var(--text-400)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <h3>${t('emptyTitle')}</h3>
                    <p>${t('emptyDesc')}</p>
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
                    <h3>${t('errorTitle')}</h3>
                    <p style="margin-bottom: 1.5rem">${t('errorDesc')}</p>
                    <button class="retry-btn" onclick="document.dispatchEvent(new CustomEvent('xflow-retry'))">${t('retryConnect')}</button>
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
                <p style="color: var(--text-300); margin-bottom: 1rem; font-size: 0.9rem;">${t('loadError')}</p>
                <button class="retry-btn" id="tm-retry-load">${t('retry')}</button>
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

    private clearActiveHoverVideo() {
        if (this.hoverVideo) {
            this.hoverVideo.pause();
            this.hoverVideo.removeAttribute('src');
            this.hoverVideo.load();
            this.hoverVideo.remove();
            this.hoverVideo = null;
        }
        if (this.hoverCard) {
            this.hoverCard.classList.remove('hover-playing', 'auto-playing-no1', 'video-playing');
            this.hoverCard = null;
        }
    }

    private getCleanBloggerName(name: string): string {
        if (!name) return '';
        return name.replace(/的视频(空间)?$/g, '').trim();
    }

    private switchToBookmarksView() {
        this.isBookmarksView = true;
        this.createPageStructure();
        this.bindEvents();
        this.loadBookmarksData();
    }

    private async playNo1AutoVideo() {
        const grid = document.getElementById('grid-container');
        if (!grid) return;

        this.clearActiveHoverVideo();

        const card = grid.querySelector('.media-card[data-index="0"]') as HTMLElement | null;
        if (!card) return;

        const item = this.isBookmarksView 
            ? this.pool.getCustomDataPool()?.[0] 
            : this.pool.getDataPool()[0];
        if (!item) return;

        this.hoverCard = card;
        card.classList.add('hover-playing', 'auto-playing-no1');

        let videoUrl = item.url || card.dataset.videoUrl || '';
        if (!videoUrl) {
            try {
                const resolved = await this.pool.loadDetails(item);
                videoUrl = resolved?.url || '';
                if (videoUrl) {
                    card.setAttribute('data-video-url', videoUrl);
                }
            } catch (err) {
                console.warn('Failed to resolve No.1 video URL:', err);
            }
        }

        if (!videoUrl || card !== this.hoverCard) {
            if (card === this.hoverCard) this.clearActiveHoverVideo();
            return;
        }

        const video = document.createElement('video');
        video.className = 'card-hover-video no1-auto-video';
        video.src = videoUrl;
        video.muted = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';

        const onPlay = () => {
            card.classList.add('video-playing');
        };
        video.addEventListener('playing', onPlay, { once: true });
        video.addEventListener('timeupdate', onPlay, { once: true });

        card.appendChild(video);
        this.hoverVideo = video;
        this.hoverCard = card;

        video.play().catch(() => {/* autoplay blocked */});
    }

    private scheduleHomepagePrefetch(startIndex: number = 0) {
        this.pool.stopPrefetching();
        if (this.isBookmarksView) return;
        
        setTimeout(() => {
            const playerModal = document.getElementById('tm-tiktok-modal');
            const isPlayerOpen = playerModal && playerModal.style.display !== 'none';
            if (!isPlayerOpen && !this.isBookmarksView) {
                this.pool.startPrefetching(startIndex, 8, 1200);
            }
        }, 2500);
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

        const downloadedSet = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []) as string[]);

        for (let i = startIndex; i < list.length; i++) {
            const item = list[i];
            const rankNum = i + 1;
            let rankClass = rankNum === 1 ? 'rank-1' : (rankNum === 2 ? 'rank-2' : (rankNum === 3 ? 'rank-3' : ''));
            const isDownloaded = downloadedSet.has(item.id);

            html += `
            <div class="media-card" style="animation-delay: ${(i % 20) * 0.05}s" data-index="${i}" ${item.url ? `data-video-url="${escapeHtml(item.url)}"` : ''} role="button" tabindex="0" aria-label="${escapeHtml(item.title || 'Video card')}">
                <img src="${item.thumbnail}" alt="${escapeHtml(item.title || 'Thumbnail')}" class="card-img" loading="lazy" referrerpolicy="no-referrer">
                <div class="card-overlay"></div>
                <div class="card-rank ${rankClass}">No.${rankNum}</div>
                ${isDownloaded ? '<div class="card-downloaded-badge">✓ 已下载</div>' : ''}
                <div class="card-info">
                    <div class="card-author">${escapeHtml(this.getCleanBloggerName(item.authorDisplayName || item.tweet_account || ''))}</div>
                    ${item.title ? `<div class="card-title">${escapeHtml(item.title)}</div>` : ''}
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
