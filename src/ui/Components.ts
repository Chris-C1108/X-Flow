export const Components = {
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

    getTopBarHTML(isAnimeActive: boolean = false) {
        const rActive = !isAnimeActive ? 'active' : '';
        const aActive = isAnimeActive ? 'active' : '';
        const switchClass = isAnimeActive ? 'channel-switch is-anime' : 'channel-switch';
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

    getHeroCarouselHTML() {
        const ranges = [
            { id: 'daily',   label: '日榜', en: 'Daily',    icon: '⏱' },
            { id: 'weekly',  label: '周榜', en: 'Weekly',   icon: '📅' },
            { id: 'monthly', label: '月榜', en: 'Monthly',  icon: '🗓' },
            { id: 'all',     label: '总榜', en: 'All-Time', icon: '🏆' },
        ];

        // Generates one card slot's inner HTML
        const makeCard = (r: { id: string; label: string; en: string; icon: string }, isClone: boolean, cloneKey: string = '') => {
            const key     = isClone ? cloneKey : r.id;
            const cardId  = isClone ? '' : `id="hc-card-${r.id}"`;
            const aria    = isClone
                ? 'aria-hidden="true" tabindex="-1"'
                : `role="button" tabindex="0" aria-label="${r.label} No.1视频"`;
            return `
            <div class="hc-card${isClone ? ' hc-clone' : ''}" ${cardId} data-range="${r.id}" ${aria}>
                <div class="hc-card-bg" id="hc-bg-${key}"></div>
                <div class="hc-card-overlay"></div>
                <div class="hc-skeleton" id="hc-sk-${key}"></div>
                <div class="hc-badge">
                    <span class="hc-badge-icon">${r.icon}</span>
                    <span class="hc-badge-label">${r.label}</span>
                    <span class="hc-badge-en">${r.en}</span>
                </div>
                <div class="hc-rank-num">No.1</div>
                <div class="hc-card-content">
                    <h2 class="hc-title" id="hc-title-${key}"></h2>
                    <div class="hc-meta">
                        <span class="hc-stat">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            <span id="hc-likes-${key}">--</span>
                        </span>
                        <span class="hc-stat">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                            <span id="hc-pv-${key}">--</span>
                        </span>
                    </div>
                    <div class="hc-play-btn" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
            </div>`;
        };

        // 6 slots: [clone-all | daily | weekly | monthly | all | clone-daily]
        const cards = [
            makeCard(ranges[3], true, 'clone-prev'),   // clone of all  → shown when wrapping backward
            ...ranges.map(r => makeCard(r, false)),     // 4 real cards
            makeCard(ranges[0], true, 'clone-next'),    // clone of daily → shown when wrapping forward
        ].join('');

        const dots = ranges.map((r, i) =>
            `<button class="hc-dot ${i === 0 ? 'active' : ''}" data-idx="${i}" aria-label="切换到${r.label}"></button>`
        ).join('');

        return `
            <style>
                .skeleton-pulse { animation: pulse 1.5s infinite ease-in-out; }
                @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
                .nav-item { background: transparent; border: none; text-align: left; font-family: inherit; font-size: 1rem; width: 100%; }
            </style>
            <section class="hero-carousel" id="hero-carousel" aria-label="四榜精华 Top Videos">
                <div class="hc-track" id="hc-track">${cards}</div>
                <div class="hc-indicators" id="hc-indicators">${dots}</div>
                <button class="hc-arrow hc-arrow-left" id="hc-prev" aria-label="上一个" tabindex="0">
                    <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
                </button>
                <button class="hc-arrow hc-arrow-right" id="hc-next" aria-label="下一个" tabindex="0">
                    <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                </button>
            </section>
        `;
    }
};

