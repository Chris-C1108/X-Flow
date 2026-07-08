import { FilterGroup } from '../api/adapters/SiteAdapter';
import { t, tLabel, getLang, LANG_NAMES, LangCode } from '../utils/i18n';

export const DEFAULT_FILTER_GROUPS: FilterGroup[] = [
    {
        id: 'range',
        title: '排行范围',
        type: 'range',
        options: [
            { id: 'daily', label: '日榜', icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>` },
            { id: 'weekly', label: '周榜', icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>` },
            { id: 'monthly', label: '月榜', icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>` },
            { id: 'all', label: '总榜', icon: `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` }
        ]
    },
    {
        id: 'sort',
        title: '排序',
        type: 'sort',
        options: [
            { id: 'favorite', label: '最多喜欢', icon: `<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` },
            { id: 'pv', label: '极高播放', icon: `<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>` },
            { id: 'recent', label: '最新发布', icon: `<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>` }
        ]
    }
];

export const getGroupTitle = (group: FilterGroup) => {
    const i18nKey = `filter_${group.id}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
    return tLabel(group.title);
};

export const Components = {
    getSidebarHTML(
        filters: FilterGroup[] = DEFAULT_FILTER_GROUPS, 
        activeParams: Record<string, string> = {},
        isBookmarksActive: boolean = false
    ) {
        const primaryGroup = filters[0] || DEFAULT_FILTER_GROUPS[0];
        const activeId = isBookmarksActive ? null : (activeParams[primaryGroup.id] || primaryGroup.options[0]?.id);

        const itemsHtml = primaryGroup.options.map(opt => {
            const activeClass = opt.id === activeId ? 'active' : '';
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
        }).join('');

        return `
            <aside class="sidebar">
                <div class="sidebar-head">
                    <div class="brand">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="url(#brand-grad)" aria-hidden="true"><defs><linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00F0FF"/><stop offset="100%" stop-color="#FF1053"/></linearGradient></defs><path d="M12 2L2 22h20L12 2zm0 6l6 12H6l6-12z"/></svg>
                        <span class="brand-text">${t('brand')}</span>
                    </div>
                    <button type="button" class="sidebar-toggle-btn" id="sidebar-toggle-btn" aria-label="${t('collapseSidebar')}" aria-expanded="true" title="${t('collapseSidebar')}">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                    </button>
                </div>
                <nav class="nav-group" aria-label="${getGroupTitle(primaryGroup)}">
                    <div class="nav-title">${getGroupTitle(primaryGroup)}</div>
                    <div class="nav-items-scroll">${itemsHtml}</div>
                </nav>
                <div class="sidebar-divider" style="height: 1px; background: rgba(255,255,255,0.06); margin: 12px 16px;"></div>
                <nav class="nav-group" aria-label="Library">
                    <button type="button" class="nav-item ${isBookmarksActive ? 'active' : ''}" id="my-bookmarks-btn" tabindex="0">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15-5-2.18L7 18V5h10v13z"/></svg>
                        <span class="nav-item-label">${t('myBookmarks')}</span>
                    </button>
                </nav>
            </aside>
        `;
    },

    getSiteSwitchHTML() {
        const sites = [
            { name: 'TwiHub', url: 'https://twihub.net' },
            { name: 'TwiKeep', url: 'https://www.twikeep.com' },
            { name: 'TwiIdol', url: 'https://www.twiidol.com' },
            { name: 'Twiigle', url: 'https://twiigle.com' },
            { name: 'Monsnode', url: 'https://monsnode.com' },
            { name: 'TwiVideo', url: 'https://twivideo.net' },
            { name: '小黄鸟', url: 'https://xiaohuangniao.me' },
            { name: 'TwiDouga', url: 'https://www.twidouga.net' },
            { name: 'JavTwi', url: 'https://javtwi.com' },
            { name: 'XHotVideo', url: 'https://xhotvideo.com' },
            { name: 'UraakaTimes', url: 'https://uraaka-times.com' }
        ];

        const hostname = window.location.hostname;
        const currentSite = sites.find(s => hostname.includes(s.url.replace('https://', '').replace('www.', '')));
        const currentSiteName = currentSite ? currentSite.name : 'TwiHub';

        const listItems = sites.map(s => {
            const isActive = hostname.includes(s.url.replace('https://', '').replace('www.', ''));
            return `<a href="${s.url}" class="site-dd-item ${isActive ? 'active' : ''}" target="_blank" rel="noopener">${s.name}</a>`;
        }).join('');

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
        
        const listItems = (Object.keys(LANG_NAMES) as LangCode[]).map(l => {
            const isActive = l === lang;
            return `<button type="button" class="site-dd-item ${isActive ? 'active' : ''}" data-lang="${l}">${LANG_NAMES[l]}</button>`;
        }).join('');

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

    getTopBarHTML(
        isAnimeActive: boolean = false, 
        filters: FilterGroup[] = DEFAULT_FILTER_GROUPS, 
        activeParams: Record<string, string> = {}
    ) {
        const primaryGroup = filters[0];
        let primaryActiveId = '';
        let mobileRangeItems = '';
        
        if (primaryGroup) {
            primaryActiveId = activeParams[primaryGroup.id] || primaryGroup.options[0]?.id;
            mobileRangeItems = primaryGroup.options.map(opt => {
                const activeClass = opt.id === primaryActiveId ? 'active' : '';
                return `<button type="button" class="mobile-dd-item ${activeClass}" data-filter-group="${primaryGroup.id}" data-filter-value="${opt.id}">${tLabel(opt.label)}</button>`;
            }).join('');
        }

        const secondaryGroup = filters[1];
        let desktopSecondaryHtml = '';
        if (secondaryGroup) {
            const secActiveId = activeParams[secondaryGroup.id] || secondaryGroup.options[0]?.id;
            desktopSecondaryHtml = `<div class="sort-filters" role="group" aria-label="Sort options">`;
            desktopSecondaryHtml += secondaryGroup.options.map(opt => {
                const activeClass = opt.id === secActiveId ? 'active' : '';
                const icon = opt.icon || '';
                return `
                    <button type="button" class="sort-btn ${activeClass}" 
                            data-filter-group="${secondaryGroup.id}" 
                            data-filter-value="${opt.id}" 
                            tabindex="0">
                        ${icon} ${tLabel(opt.label)}
                    </button>
                `;
            }).join('');
            desktopSecondaryHtml += `</div>`;
        }

        let mobileSortItems = '';
        if (filters[1]) {
            const group = filters[1];
            const activeId = activeParams[group.id] || group.options[0]?.id;
            mobileSortItems += `<div style="font-size: 11px; color: var(--text-400); padding: 8px 16px 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${getGroupTitle(group)}</div>`;
            mobileSortItems += group.options.map(opt => {
                const activeClass = opt.id === activeId ? 'active' : '';
                return `<button type="button" class="mobile-dd-item ${activeClass}" data-filter-group="${group.id}" data-filter-value="${opt.id}">${tLabel(opt.label)}</button>`;
            }).join('');
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
                    ` : ''}
                    <div class="mobile-switches-row">
                        ${siteSwitchHtml}
                        ${langSwitchHtml}
                    </div>
                    ${mobileSortItems ? `
                    <div class="mobile-menu-btn-wrap" id="sort-menu-wrap">
                        <button type="button" class="mobile-circle-btn" id="mobile-sort-btn" aria-label="${t('filter_sort')}" aria-expanded="false">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
                        </button>
                        <div class="mobile-dropdown" id="sort-dropdown" style="max-height: 70dvh; overflow-y: auto;">
                            ${mobileSortItems}
                        </div>
                    </div>` : ''}
                </div>
                ${desktopSecondaryHtml}
            </header>
        `;
    }
};
