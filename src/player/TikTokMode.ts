import { VirtualList } from './VirtualList';
import { PoolManager } from '../api/PoolManager';
import { formatTime, escapeHtml, formatCount } from '../utils/Format';
import { loadJSON, saveJSON, loadGM, saveGM, STORAGE_KEYS, BookmarkItem } from '../engine/Storage';
import { collector } from '../telemetry/EventCollector';
import { fetchComments, postComment, Comment } from '../api/CommentService';
import { AdapterManager } from '../api/adapters/AdapterManager';
import { t } from '../utils/i18n';

function escapeCSSUrl(url: string) {
    return url.replace(/["'\\]/g, '\\$&');
}

/** 可选倍速档位 */
const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

export class TikTokMode {
    public isOpen: boolean = false;
    private pool: PoolManager;
    private vl: VirtualList;
    private modal: HTMLElement;
    private uiLayer: HTMLElement;
    private currentIndex: number = 0;
    private loop: boolean;
    private bookmarks: Set<string>;
    private bookmarksList: BookmarkItem[] = [];
    private currentAuthorVideos: any[] = [];
    private likes: Set<string>;
    private preloadTimer: ReturnType<typeof setTimeout> | null = null;
    private isDraggingProgress: boolean = false;
    private onCloseCallback: (() => void) | null = null;
    private onLibraryClickCallback: (() => void) | null = null;
    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    
    private progressFill: HTMLElement;
    private timeText: HTMLElement;
    private titleText: HTMLElement;
    private authorText!: HTMLElement;
    private pendingStartTime: number = 0;
    private volume: number;
    private isMuted: boolean;
    private playbackRate: number;
    private centerIconTimer: ReturnType<typeof setTimeout> | null = null;
    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private isLongPressing: boolean = false;
    private savedPlaybackRate: number = 1;
    private lastTapTime: number = 0;
    private lastTapX: number = 0;
    private doubleTapTimer: ReturnType<typeof setTimeout> | null = null;
    private highlightMarkers: HTMLElement[] = [];
    private hasBackup: boolean = false;
    private backupCustomPool: any[] | null = null;
    private backupIndex: number = 0;


    constructor(pool: PoolManager) {
        this.pool = pool;
        this.vl = new VirtualList();
        this.loop = !!loadJSON(STORAGE_KEYS.LOOP, false);
        this.bookmarksList = loadGM(STORAGE_KEYS.BOOKMARKS_V2, []) as BookmarkItem[];
        this.bookmarks = new Set(this.bookmarksList.map(b => b.id));
        this.likes = new Set(loadGM(STORAGE_KEYS.LIKES, []) as string[]);
        this.playbackRate = loadJSON(STORAGE_KEYS.PLAYBACK_RATE, 1) as number;
        const savedVol = loadJSON(STORAGE_KEYS.VOLUME, { volume: 0.7, muted: false }) as { volume: number; muted: boolean };
        this.volume = savedVol.volume;
        this.isMuted = savedVol.muted;

        this.modal = document.createElement('div');
        this.modal.id = 'tm-tiktok-modal';
        this.modal.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647; display: none; background: #000; color: #fff; font-family: sans-serif; height: 100dvh; overflow-anchor: none; contain: layout size style;';
        
        this.modal.appendChild(this.vl.container);

        this.uiLayer = document.createElement('div');
        this.uiLayer.style.cssText = 'position: absolute; inset: 0; z-index: 20; pointer-events: none;';
        this.uiLayer.innerHTML = `
            <div class="tm-topbar">
                <div class="tm-pill" id="tm-count" aria-live="polite">1 / 1</div>
                <div class="tm-top-actions">
                    <button type="button" class="tm-btn" id="tm-back-playlist-btn" aria-label="Back to previous playlist" tabindex="0" style="display:none; font-size:12px; padding:4px 10px; background:rgba(255,255,255,0.1); border-radius:12px; margin-right:8px; align-items:center; color:#fff; font-family:var(--font-body); font-weight:600; border:none; cursor:pointer;">
                        ← 返回
                    </button>
                    <button type="button" class="tm-btn tm-speed-btn" id="tm-speed-btn" aria-label="Playback speed" tabindex="0">
                        <span id="tm-speed-label">1×</span>
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
                <button type="button" class="tm-speed-option" data-rate="0.5">0.5×</button>
                <button type="button" class="tm-speed-option" data-rate="0.75">0.75×</button>
                <button type="button" class="tm-speed-option active" data-rate="1">1×</button>
                <button type="button" class="tm-speed-option" data-rate="1.25">1.25×</button>
                <button type="button" class="tm-speed-option" data-rate="1.5">1.5×</button>
                <button type="button" class="tm-speed-option" data-rate="2">2×</button>
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
                    <span class="txt">${t('actionProfile')}</span>
                </button>
                <button type="button" class="tm-action bookmark" id="tm-bookmark-btn" aria-label="Bookmark" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg></div>
                    <span class="txt">${t('actionBookmark')}</span>
                </button>
                <button type="button" class="tm-action download" id="tm-download-btn" aria-label="Download" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></div>
                    <span class="txt">${t('actionDownload')}</span>
                </button>
                <button type="button" class="tm-action library" id="tm-library-btn" aria-label="My Library" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0-2-.9-2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg></div>
                    <span class="txt">${t('myBookmarks')}</span>
                </button>
            </div>
            <div class="tm-speed-tip" id="tm-speed-tip">${t('speedTip')}</div>
            <div class="tm-swipe-mask" id="tm-swipe-mask"></div>
            
            <div class="tm-comment-panel" id="tm-comment-panel">
                <div class="tm-comment-header">
                    <span id="tm-comment-title">${t('commentsTitle')}</span>
                    <button class="tm-comment-close" id="tm-comment-close" aria-label="Close comments">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="tm-comment-body" id="tm-comment-list"></div>
                <div class="tm-comment-footer">
                    <input type="text" class="tm-comment-input" id="tm-comment-input" placeholder="${t('commentPlaceholder')}" />
                    <button class="tm-comment-send" id="tm-comment-send" disabled>${t('send')}</button>
                </div>
            </div>

            <div class="tm-author-panel" id="tm-author-panel">
                <div class="tm-author-header">
                    <span class="tm-author-title">${t('authorProfileTitle')}</span>
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
                        <span>${t('viewOnTwitter')}</span>
                    </a>
                </div>
                <div class="tm-author-batch-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.01);">
                    <label class="bookmark-chk-label" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--text-300);">
                        <input type="checkbox" id="tm-author-batch-downloaded-chk" checked style="accent-color: var(--theme-accent); width: 14px; height: 14px; cursor: pointer;">
                        ${t('includeDownloaded')}
                    </label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="bookmark-copy-btn" id="tm-author-select-all-btn" style="display: inline-flex; align-items: center; gap: 6px; background: var(--theme-accent-subtle) !important; border: 1px solid var(--theme-accent) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--theme-accent) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                            全选
                        </button>
                        <button type="button" class="bookmark-copy-btn" id="tm-author-batch-copy-btn" style="display: none; align-items: center; gap: 6px; background: var(--theme-accent-subtle) !important; border: 1px solid var(--theme-accent) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--theme-accent) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                            ${t('copyLinks')}
                        </button>
                        <button type="button" class="bookmark-copy-btn" id="tm-author-cancel-select-btn" style="display: none; align-items: center; gap: 6px; background: rgba(255,255,255,0.08) !important; border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 999px !important; padding: 6px 14px; font-size: 12px; font-weight: 600; color: var(--text-200) !important; cursor: pointer; font-family: var(--font-body); outline: none !important; transition: background 0.2s, color 0.2s;">
                            取消
                        </button>
                    </div>
                </div>
                <div class="tm-author-videos-grid" id="tm-author-videos-grid"></div>
            </div>
        `;

        this.modal.appendChild(this.uiLayer);

        this.progressFill = this.uiLayer.querySelector('#tm-progress-fill') as HTMLElement;
        this.timeText = this.uiLayer.querySelector('#tm-time') as HTMLElement;
        this.titleText = this.uiLayer.querySelector('#tm-title') as HTMLElement;
        this.authorText = this.uiLayer.querySelector('#tm-author-name') as HTMLElement;

        this.pool.onDataAdded(() => {
            if (this.isOpen) {
                this.updateCountUI();
            }
        });

        this.setupIdleTracker();
    }

    public init() {
        const root = document.getElementById('xflow-app-root') || document.body;
        if (!root.contains(this.modal)) {
            root.appendChild(this.modal);
        }
        this.bindEvents();
    }

    private bindEvents() {
        const speedBtn = this.uiLayer.querySelector('#tm-speed-btn')!;
        const speedPanel = this.uiLayer.querySelector('#tm-speed-panel')!;
        const speedLabel = this.uiLayer.querySelector('#tm-speed-label')!;

        speedLabel.textContent = this.playbackRate === 1 ? '1×' : this.playbackRate + '×';

        speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speedPanel.classList.toggle('active');
        });

        speedPanel.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = (e.target as HTMLElement).closest('.tm-speed-option') as HTMLElement | null;
            if (!target) return;
            const rate = parseFloat(target.dataset.rate || '1');
            this.playbackRate = rate;
            saveJSON(STORAGE_KEYS.PLAYBACK_RATE, rate);

            speedPanel.querySelectorAll('.tm-speed-option').forEach(o => o.classList.remove('active'));
            target.classList.add('active');
            speedLabel.textContent = rate === 1 ? '1×' : rate + '×';
            speedPanel.classList.remove('active');

            const video = this.getCurrentVideo();
            if (video) video.playbackRate = rate;
        });

        this.modal.addEventListener('click', () => {
            speedPanel.classList.remove('active');
        });

        const pipBtn = this.uiLayer.querySelector<HTMLButtonElement>('#tm-pip-btn')!;
        if (document.pictureInPictureEnabled) {
            pipBtn.style.display = '';
            pipBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const video = this.getCurrentVideo();
                    if (document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                    } else if (video) {
                        await video.requestPictureInPicture();
                    }
                } catch (err) {
                    console.log('PiP not available', err);
                }
            });
        }

        const closeBtn = this.uiLayer.querySelector('#tm-close-btn')!;
        closeBtn.addEventListener('click', () => this.closeModal());

        const swipeMask = this.uiLayer.querySelector('#tm-swipe-mask')!;
        const speedTip = this.uiLayer.querySelector('#tm-speed-tip') as HTMLElement;
        let startY = 0;
        let startX = 0;
        let isMoving = false;
        let touchScrolled = false;

        swipeMask.addEventListener('touchstart', (e: any) => {
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

            // M2-1: 长按快进 — 450ms 后开启 1.5× 倍速
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
                        speedTip.classList.add('show');
                    }
                }
            }, 450);
        }, { passive: true });

        swipeMask.addEventListener('touchmove', (e: any) => { 
            const deltaX = Math.abs(e.touches[0].clientX - startX);
            const deltaY_move = Math.abs(e.touches[0].clientY - startY);
            if (deltaX > 10 || deltaY_move > 10) {
                touchScrolled = true;
                if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
                if (this.isLongPressing) {
                    this.cancelLongPress(speedTip);
                }
            }
            if (!isMoving) return;
            const deltaY = e.touches[0].clientY - startY;
            this.vl.updateTransforms(this.currentIndex, deltaY);
        }, { passive: false });

        swipeMask.addEventListener('touchend', (e: any) => { 
            // M2-1: 取消长按
            if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
            if (this.isLongPressing) {
                this.cancelLongPress(speedTip);
                isMoving = false;
                return;
            }

            if (!isMoving) return;
            isMoving = false;
            
            const deltaX = e.changedTouches[0].clientX - startX;
            const deltaY = e.changedTouches[0].clientY - startY;

            // Horizontal swipe left (deltaX < -60) -> Open Author Panel
            if (deltaX < -60 && Math.abs(deltaY) < 60) {
                this.vl.updateTransforms(this.currentIndex, 0);
                this.openAuthorPanel();
                return;
            }

            // Horizontal swipe right (deltaX > 60) -> Close modal
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

        swipeMask.addEventListener('touchcancel', () => {
            if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = null; }
            if (this.isLongPressing) {
                this.cancelLongPress(speedTip);
            }
        }, { passive: true });
        
        swipeMask.addEventListener('wheel', (e: any) => {
            if (!this.isOpen) return; 
            e.preventDefault();
            this.navigate(e.deltaY > 0 ? 1 : -1);
        }, { passive: false });

        document.addEventListener('keydown', e => { 
            if (!this.isOpen) return; 
            if (e.key === 'Escape') this.closeModal(); 
            else if (e.key === 'ArrowUp') this.navigate(-1); 
            else if (e.key === 'ArrowDown') this.navigate(1); 
            else if (e.key === ' ') {
                e.preventDefault();
                this.togglePlayCurrent();
            } else if (e.key === 'ArrowLeft') {
                const v = this.getCurrentVideo();
                if (v) v.currentTime = Math.max(0, v.currentTime - 5);
            } else if (e.key === 'ArrowRight') {
                const v = this.getCurrentVideo();
                if (v && v.duration) v.currentTime = Math.min(v.duration, v.currentTime + 5);
            }
        });
        
        // M2-2: 双击快进/快退 + 单击暂停/播放
        swipeMask.addEventListener('click', (e: any) => {
            if (this.isLongPressing) return;
            speedPanel.classList.remove('active');

            const now = Date.now();
            const screenW = window.innerWidth;
            const tapX = e.clientX;

            if (now - this.lastTapTime < 300 && Math.abs(tapX - this.lastTapX) < 80) {
                // 双击
                if (this.doubleTapTimer) { clearTimeout(this.doubleTapTimer); this.doubleTapTimer = null; }
                const video = this.getCurrentVideo();
                if (!video || !video.duration) return;

                const ratio = tapX / screenW;
                if (ratio < 0.333) {
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    this.showDoubleTapFeedback('left');
                } else if (ratio > 0.666) {
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    this.showDoubleTapFeedback('right');
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

        const bookmarkBtn = this.uiLayer.querySelector('#tm-bookmark-btn')!;
        bookmarkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const list = this.pool.getDataPool();
            if (!list.length) return;
            const item = list[this.currentIndex];
            const id = String(item.id);
            if (this.bookmarks.has(id)) {
                this.bookmarks.delete(id);
                this.bookmarksList = this.bookmarksList.filter(b => b.id !== id);
                bookmarkBtn.classList.remove('active');
                collector.trackBookmark(id, false);
            } else {
                this.bookmarks.add(id);
                const activeAdapter = AdapterManager.getInstance().getActiveAdapter();
                const currentSiteKey = activeAdapter ? activeAdapter.constructor.name.replace('Adapter', '').toLowerCase() : '';
                
                const bookmarkItem: BookmarkItem = {
                    bookmarkTime: Date.now(),
                    authorId: item.tweet_account || '',
                    videoUrl: item.originalUrl || item.url || '',
                    tweetTitle: item.title || '',
                    currentRankingSite: currentSiteKey,
                    id: id,
                    url_cd: item.url_cd || '',
                    thumbnail: item.thumbnail || '',
                    duration: item.duration || 0,
                    url: item.url || '',
                    pv: item.pv || 0
                };
                this.bookmarksList.push(bookmarkItem);
                bookmarkBtn.classList.add('active');
                collector.trackBookmark(id, true);
            }
            saveGM(STORAGE_KEYS.BOOKMARKS_V2, this.bookmarksList);
        });

        const libraryBtn = this.uiLayer.querySelector('#tm-library-btn');
        if (libraryBtn) {
            libraryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeModal();
                if (this.onLibraryClickCallback) {
                    this.onLibraryClickCallback();
                }
            });
        }

        // M2-4: 评论面板逻辑
        const commentBtn = this.uiLayer.querySelector('#tm-comment-btn');
        const commentPanel = this.uiLayer.querySelector('#tm-comment-panel')!;
        const commentClose = this.uiLayer.querySelector('#tm-comment-close')!;
        const commentList = this.uiLayer.querySelector('#tm-comment-list')!;
        const commentInput = this.uiLayer.querySelector('#tm-comment-input') as HTMLInputElement;
        const commentSend = this.uiLayer.querySelector('#tm-comment-send') as HTMLButtonElement;

        commentBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            commentPanel.classList.add('active');
            this.loadComments();
        });

        commentClose.addEventListener('click', () => {
            commentPanel.classList.remove('active');
        });

        // M2-6: 博主主页/相关视频面板逻辑
        const authorPanel = this.uiLayer.querySelector('#tm-author-panel')!;
        const authorClose = this.uiLayer.querySelector('#tm-author-close')!;
        authorClose.addEventListener('click', () => {
            authorPanel.classList.remove('active');
        });

        // Swipe right to close author panel
        let startX_author = 0;
        let startY_author = 0;
        authorPanel.addEventListener('touchstart', (e: any) => {
            startX_author = e.touches[0].clientX;
            startY_author = e.touches[0].clientY;
        }, { passive: true });

        authorPanel.addEventListener('touchend', (e: any) => {
            const deltaX = e.changedTouches[0].clientX - startX_author;
            const deltaY = e.changedTouches[0].clientY - startY_author;
            if (deltaX > 60 && Math.abs(deltaY) < 60) {
                authorPanel.classList.remove('active');
            }
        }, { passive: true });

        // ── 播放列表返回按钮 ──
        const backBtn = this.uiLayer.querySelector('#tm-back-playlist-btn')!;
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.restorePlaylist();
        });

        // ── 博主批量选择与复制逻辑 ──
        const authorCopyBtn = this.uiLayer.querySelector('#tm-author-batch-copy-btn') as HTMLButtonElement | null;
        const selectAllBtn = this.uiLayer.querySelector('#tm-author-select-all-btn') as HTMLButtonElement | null;
        const cancelBtn = this.uiLayer.querySelector('#tm-author-cancel-select-btn') as HTMLButtonElement | null;


        selectAllBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const gridEl = this.uiLayer.querySelector('#tm-author-videos-grid') as HTMLElement;
            if (!gridEl) return;

            gridEl.querySelectorAll('.tm-author-video-card').forEach(card => {
                let chk = card.querySelector('.tm-author-select-chk') as HTMLInputElement | null;
                if (!chk) {
                    chk = document.createElement('input');
                    chk.type = 'checkbox';
                    chk.className = 'tm-author-select-chk';
                    chk.checked = true;
                    chk.style.cssText = 'position:absolute;top:4px;left:4px;z-index:3;width:16px;height:16px;accent-color:var(--theme-accent);cursor:pointer;';
                    card.appendChild(chk);
                } else {
                    chk.checked = true;
                    chk.style.display = 'block';
                }
            });

            if (selectAllBtn) selectAllBtn.style.display = 'none';
            if (authorCopyBtn) authorCopyBtn.style.display = 'inline-flex';
            if (cancelBtn) cancelBtn.style.display = 'inline-flex';
        });

        cancelBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const gridEl = this.uiLayer.querySelector('#tm-author-videos-grid') as HTMLElement;
            if (gridEl) {
                gridEl.querySelectorAll('.tm-author-select-chk').forEach(chk => {
                    (chk as HTMLElement).style.display = 'none';
                });
            }
            if (selectAllBtn) selectAllBtn.style.display = 'inline-flex';
            if (authorCopyBtn) authorCopyBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
        });

        authorCopyBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!this.currentAuthorVideos.length) return;

            const gridEl = this.uiLayer.querySelector('#tm-author-videos-grid') as HTMLElement;
            if (!gridEl) return;

            const selectedIds = new Set<string>();
            gridEl.querySelectorAll('.tm-author-video-card').forEach(card => {
                const chk = card.querySelector('.tm-author-select-chk') as HTMLInputElement;
                if (chk && chk.checked) {
                    const id = card.getAttribute('data-id');
                    if (id) selectedIds.add(id);
                }
            });

            const links: string[] = [];
            const copiedIds: string[] = [];
            selectedIds.forEach(id => {
                const video = this.currentAuthorVideos.find(v => v.id === id);
                if (video) {
                    const url = video.originalUrl || video.url || '';
                    if (url) links.push(url);
                    copiedIds.push(video.id);
                }
            });

            if (links.length === 0) return;

            const linksText = links.join('\n');
            try {
                await navigator.clipboard.writeText(linksText);

                // Temporary visual feedback
                const originalText = authorCopyBtn.textContent;
                authorCopyBtn.textContent = t('copied');
                authorCopyBtn.style.setProperty('background', 'rgba(46, 213, 115, 0.15)', 'important');
                authorCopyBtn.style.setProperty('border-color', '#2ed573', 'important');
                authorCopyBtn.style.setProperty('color', '#2ed573', 'important');

                setTimeout(() => {
                    authorCopyBtn.textContent = originalText;
                    authorCopyBtn.style.removeProperty('background');
                    authorCopyBtn.style.removeProperty('border-color');
                    authorCopyBtn.style.removeProperty('color');
                }, 1500);

                const { showConfirmModal } = await import('../utils/Dom');
                showConfirmModal(
                    '标记已下载',
                    `已复制 ${links.length} 个视频链接。是否将这些视频标记为已下载？`,
                    () => {
                        const downloaded = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []) as string[]);
                        copiedIds.forEach(id => downloaded.add(id));
                        saveGM(STORAGE_KEYS.DOWNLOADED, Array.from(downloaded));

                        // Refresh author panel grid badges
                        const downloadedSet = new Set(downloaded);
                        gridEl.querySelectorAll('.tm-author-video-card').forEach(card => {
                            const id = card.getAttribute('data-id') || '';
                            if (downloadedSet.has(id)) {
                                let badge = card.querySelector('.tm-downloaded-badge');
                                if (!badge) {
                                    badge = document.createElement('div');
                                    badge.className = 'tm-downloaded-badge';
                                    badge.innerHTML = '✓ 已下载';
                                    card.appendChild(badge);
                                }
                            }
                        });

                        // Clear selection mode
                        if (cancelBtn) cancelBtn.click();
                    }
                );
            } catch (err) {
                console.error('Failed to copy blogger links:', err);
            }
        });


        commentInput.addEventListener('input', () => {
            commentSend.disabled = !commentInput.value.trim();
        });

        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !commentSend.disabled) {
                commentSend.click();
            }
        });

        commentSend.addEventListener('click', async () => {
            const msg = commentInput.value.trim();
            if (!msg) return;

            const list = this.pool.getDataPool();
            const item = list[this.currentIndex];
            if (!item || !item.url_cd) return;

            commentSend.disabled = true;
            const originalText = commentSend.textContent;
            commentSend.textContent = '...';

            try {
                const success = await postComment(item.url_cd, msg);
                if (success) {
                    commentInput.value = '';
                    // 乐观更新：将新评论添加到列表顶部
                    const now = new Date();
                    const newCommentHtml = `<div class="tm-comment-item" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
                        <span class="tm-comment-time">刚刚</span>
                        <div class="tm-comment-content">${escapeHtml(msg)}</div>
                    </div>`;
                    const emptyState = commentList.querySelector('.tm-comment-empty');
                    if (emptyState) emptyState.remove();
                    commentList.insertAdjacentHTML('afterbegin', newCommentHtml);
                    
                    // 增加评论数计数
                    const countEl = this.uiLayer.querySelector('#tm-comment-count');
                    if (countEl) {
                        const countText = countEl.textContent === '评论' ? '0' : countEl.textContent;
                        const count = parseInt(countText || '0') + 1;
                        countEl.textContent = formatCount(count);
                        item.commentCount = (item.commentCount || (item._count && item._count.comments) || item.comments || 0) + 1;
                    }
                } else {
                    alert('发送评论失败');
                }
            } catch (err) {
                alert('发送评论失败: ' + err);
            } finally {
                commentSend.textContent = originalText;
                commentSend.disabled = !commentInput.value.trim();
            }
        });

        const downloadBtn = this.uiLayer.querySelector('#tm-download-btn')!;
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const list = this.pool.getDataPool();
            if (!list.length) return;
            const item = list[this.currentIndex];
            if (item.url) {
                const a = document.createElement('a');
                a.href = item.url;
                a.download = item.title || 'video.mp4';
                a.target = '_blank';
                a.rel = 'noopener';
                a.click();
                collector.trackDownload(String(item.id));

                // Record download
                const id = String(item.id);
                const downloaded = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []) as string[]);
                downloaded.add(id);
                saveGM(STORAGE_KEYS.DOWNLOADED, Array.from(downloaded));
            }
        });

        const progressWrap = this.uiLayer.querySelector('#tm-progress-wrap')!;
        progressWrap.addEventListener('click', (e: any) => {
            e.stopPropagation();
            this.seekToPosition(e.clientX);
        });

        progressWrap.addEventListener('touchstart', (e: any) => {
            e.stopPropagation();
            this.isDraggingProgress = true;
            progressWrap.classList.add('dragging');
            this.seekToPosition(e.touches[0].clientX);
        }, { passive: false });

        progressWrap.addEventListener('touchmove', (e: any) => {
            if (!this.isDraggingProgress) return;
            e.preventDefault();
            e.stopPropagation();
            this.seekToPosition(e.touches[0].clientX);
        }, { passive: false });

        progressWrap.addEventListener('touchend', (e: any) => {
            if (!this.isDraggingProgress) return;
            e.stopPropagation();
            this.isDraggingProgress = false;
            progressWrap.classList.remove('dragging');
        }, { passive: true });

        progressWrap.addEventListener('mousedown', (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            this.isDraggingProgress = true;
            progressWrap.classList.add('dragging');
            this.seekToPosition(e.clientX);

            const onMouseMove = (ev: MouseEvent) => {
                if (!this.isDraggingProgress) return;
                this.seekToPosition(ev.clientX);
            };
            const onMouseUp = () => {
                this.isDraggingProgress = false;
                progressWrap.classList.remove('dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        const volBtn = this.uiLayer.querySelector('#tm-vol-btn')!;
        const volSliderWrap = this.uiLayer.querySelector('.tm-vol-slider-wrap')!;
        const volFill = this.uiLayer.querySelector('#tm-vol-fill') as HTMLElement;
        const volIcon = this.uiLayer.querySelector('#tm-vol-icon') as SVGElement;

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

        volBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isMuted = !this.isMuted;
            applyVolume();
        });

        const setVolFromX = (clientX: number) => {
            const rect = (volSliderWrap as HTMLElement).getBoundingClientRect();
            this.volume = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            this.isMuted = false;
            applyVolume();
        };

        volSliderWrap.addEventListener('click', (e: any) => {
            e.stopPropagation();
            setVolFromX(e.clientX);
        });

        volSliderWrap.addEventListener('mousedown', (e: any) => {
            e.stopPropagation();
            e.preventDefault();
            setVolFromX(e.clientX);
            const onMove = (ev: MouseEvent) => setVolFromX(ev.clientX);
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        volFill.style.width = `${(this.isMuted ? 0 : this.volume) * 100}%`;
        updateVolIcon();
    }

    public openModal(index: number, startTime?: number) {
        this.isOpen = true;
        this.modal.style.display = 'block';
        this.currentIndex = index;
        this.pendingStartTime = startTime || 0;
        
        this.vl.setTransition(false);
        this.vl.updateTransforms(this.currentIndex, 0);
        
        this.loadNode(this.currentIndex);
        this.playCurrent();

        // Defer neighboring node loads and background prefetching to avoid bandwidth competition
        if (this.preloadTimer) clearTimeout(this.preloadTimer);
        this.preloadTimer = setTimeout(() => {
            if (this.isOpen) {
                this.loadNode(this.currentIndex - 1);
                this.loadNode(this.currentIndex + 1);
                this.schedulePreload();
                this.pool.startPrefetching(this.currentIndex, 5, 800);
            }
        }, 1500);
    }

    public closeModal() {
        if (this.preloadTimer) { clearTimeout(this.preloadTimer); this.preloadTimer = null; }
        if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
        this.modal.classList.remove('tm-idle');
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
        }
        this.isOpen = false;
        this.modal.style.display = 'none';
        this.pauseAll();
        collector.flushSession();
        this.pool.stopPrefetching();

        // 还原/清除播放列表备份，隐藏返回按钮
        this.backupCustomPool = null;
        this.backupIndex = 0;
        this.hasBackup = false;
        const backBtn = this.uiLayer.querySelector('#tm-back-playlist-btn') as HTMLElement;
        if (backBtn) backBtn.style.display = 'none';

        if (this.onCloseCallback) this.onCloseCallback();
    }

    public onClose(cb: () => void) {
        this.onCloseCallback = cb;
    }

    private navigate(delta: number) {
        if (this.preloadTimer) { clearTimeout(this.preloadTimer); this.preloadTimer = null; }
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

        // Defer neighboring node loads and background prefetching to avoid bandwidth competition
        if (this.preloadTimer) clearTimeout(this.preloadTimer);
        this.preloadTimer = setTimeout(() => {
            if (this.isOpen) {
                this.loadNode(this.currentIndex + delta);
                this.loadNode(this.currentIndex - delta);
                this.schedulePreload();
                this.pool.startPrefetching(this.currentIndex, 5, 800);
            }
        }, 1500);

        setTimeout(() => {
            if (this.isOpen) this.playCurrent();
        }, 350);
        
        if (this.currentIndex >= list.length - 5) {
            this.pool.fetchNextPage();
        }
    }

    private restorePlaylist() {
        if (!this.hasBackup) return;

        this.pool.setCustomDataPool(this.backupCustomPool);
        const idx = this.backupIndex;

        // Clear backup references
        this.backupCustomPool = null;
        this.backupIndex = 0;
        this.hasBackup = false;

        const backBtn = this.uiLayer.querySelector('#tm-back-playlist-btn') as HTMLElement;
        if (backBtn) backBtn.style.display = 'none';

        // Refresh playing modal
        this.openModal(idx);
    }


    private async loadNode(logicalIndex: number) {
        const list = this.pool.getDataPool();
        if (logicalIndex < 0 || logicalIndex >= list.length) return;

        const item = list[logicalIndex];
        const node = this.vl.getNode(logicalIndex);
        const video = node.querySelector('.tm-video') as HTMLVideoElement;
        const thumb = node.querySelector('.tm-thumb') as HTMLImageElement;

        const loadPromise = this.pool.loadDetails(item);
        const isCurrent = (logicalIndex === this.currentIndex);

        if (video.getAttribute('data-index') !== logicalIndex.toString()) {
            // Abort any ongoing network request for the recycled node
            video.pause();
            video.removeAttribute('src');
            try {
                video.load(); // Force browser to release media resources
            } catch {}

            video.setAttribute('data-index', logicalIndex.toString());
            video.loop = this.loop;
            video.preload = isCurrent ? 'auto' : 'none';
            thumb.src = item.thumbnail || '';
            node.style.backgroundImage = `url("${escapeCSSUrl(item.thumbnail || '')}")`;
            node.style.backgroundSize = 'cover';
            node.style.backgroundPosition = 'center';
            thumb.classList.remove('hidden');
            video.style.opacity = '0';

            node.querySelector('.tm-error-overlay')?.classList.add('hidden');

            const showVideo = () => {
                if (video.getAttribute('data-index') === logicalIndex.toString()) {
                    thumb.classList.add('hidden');
                    video.style.opacity = '1';
                    node.querySelector('.tm-error-overlay')?.classList.add('hidden');
                }
            };
            video.oncanplay = showVideo;
            video.onplaying = showVideo;
            video.onloadedmetadata = showVideo;
            video.onerror = () => {
                if (video.getAttribute('data-index') === logicalIndex.toString()) {
                    thumb.classList.add('hidden');
                    video.style.opacity = '0';
                    node.querySelector('.tm-error-overlay')?.classList.remove('hidden');
                }
            };
        }

        const resolvedItem = await loadPromise;
        if (video.getAttribute('data-index') === logicalIndex.toString()) {
            if (logicalIndex === this.currentIndex) {
                if (video.src !== resolvedItem.url) {
                    video.src = resolvedItem.url;
                }
                this.playCurrent();

                // If resolved asynchronously, defer neighbor loads and preloading
                if (this.preloadTimer) clearTimeout(this.preloadTimer);
                this.preloadTimer = setTimeout(() => {
                    if (this.isOpen) {
                        this.loadNode(this.currentIndex - 1);
                        this.loadNode(this.currentIndex + 1);
                        this.schedulePreload();
                    }
                }, 1500);
            } else {
                if (resolvedItem.url && video.src !== resolvedItem.url && video.preload === 'auto') {
                    video.src = resolvedItem.url;
                }
            }
        }
    }

    private pauseAll() {
        this.vl.getNodes().forEach(n => {
            const v = n.querySelector('.tm-video') as HTMLVideoElement;
            v.pause();
        });
    }

    private playCurrent() {
        const list = this.pool.getDataPool();
        if (!list.length) return;
        
        const item = list[this.currentIndex];
        const videoId = String(item.id);
        
        // Two-line layout updates
        const cleanName = this.getCleanBloggerName(item.authorDisplayName || item.tweet_account || '');
        if (this.authorText) {
            this.authorText.textContent = cleanName;
        }
        this.titleText.textContent = item.isDetailsLoaded ? (item.title || '') : 'Loading...';
        this.titleText.style.display = item.title ? '' : 'none';
        
        this.updateCountUI();



        const bookmarkBtn = this.uiLayer.querySelector('#tm-bookmark-btn');
        if (bookmarkBtn) {
            if (this.bookmarks.has(videoId)) {
                bookmarkBtn.classList.add('active');
            } else {
                bookmarkBtn.classList.remove('active');
            }
        }
        
        const commentCountTxt = this.uiLayer.querySelector('#tm-comment-count');
        if (commentCountTxt) {
            const count = item.commentCount || (item._count && item._count.comments) || item.comments || 0;
            commentCountTxt.textContent = count > 0 ? formatCount(count) : '评论';
        }

        const node = this.vl.getNode(this.currentIndex);
        const video = node.querySelector('.tm-video') as HTMLVideoElement;
        
        video.preload = 'auto';
        video.playbackRate = this.playbackRate;
        video.volume = this.isMuted ? 0 : this.volume;
        video.muted = this.isMuted;

        const startTime = this.pendingStartTime || 0;
        if (startTime > 0 && item.url && video.src === item.url) {
            this.pendingStartTime = 0; // reset
            if (video.readyState >= 1) {
                video.currentTime = startTime;
            } else {
                const onMetadata = () => {
                    video.currentTime = startTime;
                    video.removeEventListener('loadedmetadata', onMetadata);
                };
                video.addEventListener('loadedmetadata', onMetadata);
            }
        }

        video.play().catch(e => console.log('Autoplay prevented', e));

        const authorBtn = this.uiLayer.querySelector<HTMLButtonElement>('#tm-author-btn');
        if (authorBtn) {
            authorBtn.style.display = '';
            
            const btnText = authorBtn.querySelector('.txt');
            if (btnText) {
                btnText.textContent = cleanName || '博主';
            }

            authorBtn.onclick = (e) => {
                e.stopPropagation();
                this.openAuthorPanel();
            };
        }

        video.onleavepictureinpicture = () => {
            if (this.isOpen && !video.paused) {
                video.play().catch(() => {});
            }
        };

        collector.startSession(videoId);
        collector.trackViewStart(videoId);

        // M2-3: 异步拉取高光时刻并渲染到进度条（不阻塞播放主流程）
        this.renderHighlightMarkers(videoId);

        video.ontimeupdate = () => {
            if (!video.duration) return;
            const p = (video.currentTime / video.duration) * 100;
            this.progressFill.style.width = p + '%';
            
            const progressWrap = this.uiLayer.querySelector('#tm-progress-wrap');
            if (progressWrap) progressWrap.setAttribute('aria-valuenow', String(Math.round(p)));
            
            this.timeText.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);

            collector.trackTimeUpdate(video.currentTime, video.duration);
        };

        video.onended = () => {
            if (!this.loop) {
                this.navigate(1);
            }
        };
    }
    
    private schedulePreload() {
        if (this.preloadTimer) clearTimeout(this.preloadTimer);

        const list = this.pool.getDataPool();
        if (!list.length) return;

        const checkAndPreload = () => {
            const video = this.getCurrentVideo();
            if (!video) return;

            // Calculate how much has been buffered ahead of current playback time
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

            // Standard requirements for active video safety:
            // 1. readyState >= 3 (HAVE_FUTURE_DATA - can play without stuttering)
            // 2. Or buffered ahead is at least 6 seconds
            // 3. Or the video has already ended
            const isSafeToPreload = video.readyState >= 3 || bufferedAhead >= 6 || video.ended;

            if (isSafeToPreload) {
                const nextIdx = this.currentIndex + 1;
                if (nextIdx < list.length) {
                    this.preloadNode(nextIdx);
                }
            } else {
                // Not safe yet, re-check in 1500ms to preserve current video's bandwidth
                this.preloadTimer = setTimeout(checkAndPreload, 1500);
            }
        };

        // Start checking 2 seconds after play starts
        this.preloadTimer = setTimeout(checkAndPreload, 2000);
    }

    private async preloadNode(logicalIndex: number) {
        const list = this.pool.getDataPool();
        if (logicalIndex < 0 || logicalIndex >= list.length) return;

        const item = list[logicalIndex];
        const node = this.vl.getNode(logicalIndex);
        const video = node.querySelector('.tm-video') as HTMLVideoElement;

        const resolvedItem = await this.pool.loadDetails(item);

        if (video.getAttribute('data-index') === logicalIndex.toString()) {
            if (logicalIndex !== this.currentIndex) {
                video.preload = 'auto';
                if (video.src !== resolvedItem.url) {
                    video.src = resolvedItem.url;
                }
            }
        }
    }

    private getCurrentVideo(): HTMLVideoElement {
        const node = this.vl.getNode(this.currentIndex);
        return node.querySelector('.tm-video') as HTMLVideoElement;
    }

    private seekToPosition(clientX: number) {
        const progressTrack = this.uiLayer.querySelector('.tm-progress') as HTMLElement;
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

    private togglePlayCurrent() {
        const node = this.vl.getNode(this.currentIndex);
        const video = node.querySelector('.tm-video') as HTMLVideoElement;
        const centerIcon = this.uiLayer.querySelector('#tm-center-icon') as HTMLElement | null;
        const centerSvg = this.uiLayer.querySelector('#tm-center-svg') as SVGElement | null;

        if (video.paused) {
            video.play().catch(e => console.log('Play prevented', e));
            if (centerSvg) centerSvg.innerHTML = '<path d="M8 5v14l11-7z"/>';
        } else {
            video.pause();
            if (centerSvg) centerSvg.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        }

        // M1-3: 中心动画提示
        if (centerIcon) {
            centerIcon.classList.remove('show');
            void centerIcon.offsetWidth; // force reflow to restart animation
            centerIcon.classList.add('show');
            if (this.centerIconTimer) clearTimeout(this.centerIconTimer);
            this.centerIconTimer = setTimeout(() => centerIcon.classList.remove('show'), 600);
        }
    }

    private updateCountUI() {
        const list = this.pool.getDataPool();
        const countSpan = this.uiLayer.querySelector('#tm-count');
        if (countSpan) {
            countSpan.textContent = `${this.currentIndex + 1} / ${list.length}${this.pool.hasMoreData() ? '+' : ''}`;
        }
    }

    // ── M2-1: 长按快进 ──────────────────────────────────────
    private cancelLongPress(speedTip: HTMLElement | null) {
        this.isLongPressing = false;
        const video = this.getCurrentVideo();
        if (video) {
            video.playbackRate = this.savedPlaybackRate;
        }
        if (speedTip) {
            speedTip.classList.remove('show');
        }
    }

    // ── M2-4: 加载当前视频评论 ──────────────────────────────
    private async loadComments() {
        const commentList = this.uiLayer.querySelector('#tm-comment-list');
        const list = this.pool.getDataPool();
        const item = list[this.currentIndex];
        
        if (!commentList || !item || !item.url_cd) return;

        commentList.innerHTML = '<div class="tm-comment-loading"><div class="spinner"></div></div>';
        
        try {
            const comments = await fetchComments(item.url_cd);
            
            if (!comments || comments.length === 0) {
                commentList.innerHTML = '<div class="tm-comment-empty">暂无评论，快来抢沙发！</div>';
                return;
            }
            
            // Render comments
            commentList.innerHTML = comments.map(c => `
                <div class="tm-comment-item">
                    <span class="tm-comment-time">${escapeHtml(c.time)}</span>
                    <div class="tm-comment-content">${escapeHtml(c.content)}</div>
                </div>
            `).join('');

        } catch (err) {
            commentList.innerHTML = '<div class="tm-comment-empty">加载评论失败，请重试</div>';
        }
    }

    // ── M2-2: 双击反馈动画 ──────────────────────────────────
    private showDoubleTapFeedback(side: 'left' | 'right') {
        const el = document.createElement('div');
        el.className = `tm-doubletap-feedback ${side}`;
        if (side === 'left') {
            el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg> 10s';
        } else {
            el.innerHTML = '10s <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';
        }
        this.uiLayer.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }

    // ── M2-3: 高光打点 ──────────────────────────────────────
    private async renderHighlightMarkers(videoId: string) {
        this.clearHighlightMarkers();
        try {
            const result = await collector.fetchRecommendations();
            const segments = result.highlights[videoId];
            if (!segments || !segments.length) return;

            const video = this.getCurrentVideo();
            if (!video || !video.duration || !isFinite(video.duration)) return;

            const progressTrack = this.uiLayer.querySelector('.tm-progress') as HTMLElement;
            if (!progressTrack) return;

            for (const seg of segments) {
                const midpoint = (seg.start + seg.end) / 2;
                const pct = (midpoint / video.duration) * 100;
                if (pct < 0 || pct > 100) continue;

                const marker = document.createElement('div');
                marker.className = 'tm-highlight-marker';
                marker.style.left = pct + '%';
                progressTrack.appendChild(marker);
                this.highlightMarkers.push(marker);
            }
        } catch {
            // 静默失败，不影响播放主流程
        }
    }

    private clearHighlightMarkers() {
        for (const m of this.highlightMarkers) {
            m.remove();
        }
        this.highlightMarkers = [];
    }

    // ── M2-6: 博主主页/相关推荐面板数据加载 ───────────────────────────
    private async openAuthorPanel() {
        const authorPanel = this.uiLayer.querySelector('#tm-author-panel')!;
        authorPanel.classList.add('active');

        // Reset select mode in author panel
        const selectAllBtn = this.uiLayer.querySelector('#tm-author-select-all-btn') as HTMLElement;
        const authorCopyBtn = this.uiLayer.querySelector('#tm-author-batch-copy-btn') as HTMLElement;
        const cancelBtn = this.uiLayer.querySelector('#tm-author-cancel-select-btn') as HTMLElement;
        if (selectAllBtn) selectAllBtn.style.display = 'inline-flex';
        if (authorCopyBtn) authorCopyBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';

        // Close comment panel if open
        const commentPanel = this.uiLayer.querySelector('#tm-comment-panel')!;
        commentPanel.classList.remove('active');

        const list = this.pool.getDataPool();
        if (!list.length) return;
        const item = list[this.currentIndex];
        
        const avatarEl = authorPanel.querySelector('#tm-author-avatar') as HTMLElement;
        const nameEl = authorPanel.querySelector('#tm-author-name') as HTMLElement;
        const handleEl = authorPanel.querySelector('#tm-author-handle') as HTMLElement;
        const externalLinkEl = authorPanel.querySelector('#tm-author-external-link') as HTMLAnchorElement;
        const gridEl = authorPanel.querySelector('#tm-author-videos-grid') as HTMLElement;

        const username = item.tweet_account || 'unknown';
        const displayName = item.authorDisplayName || username;

        // Render profile info
        if (avatarEl) avatarEl.textContent = displayName.charAt(0);
        if (nameEl) nameEl.textContent = displayName;
        if (handleEl) handleEl.textContent = (username !== 'unknown' && username !== 'loading') ? `@${username}` : '';
        
        if (externalLinkEl) {
            if (username && username !== 'unknown' && username !== 'loading') {
                externalLinkEl.style.display = 'inline-flex';
                externalLinkEl.href = `https://x.com/${username}`;
            } else {
                externalLinkEl.style.display = 'none';
            }
        }

        // Fetch videos
        gridEl.innerHTML = '<div class="tm-comment-loading"><div class="spinner"></div></div>';

        try {
            const adapter = AdapterManager.getInstance().getActiveAdapter();
            let result = null;
            if (adapter.fetchAuthorVideos && username && username !== 'unknown' && username !== 'loading') {
                result = await adapter.fetchAuthorVideos(username);
            }
            
            // Fallback: If no author-specific videos are found, display the current dataPool items (as Related Videos)
            const videos = (result && result.posts && result.posts.length > 0) ? result.posts : list.slice(0, 15);
            this.currentAuthorVideos = videos;
            
            if (videos.length === 0) {
                gridEl.innerHTML = '<div class="tm-comment-empty">暂无相关视频</div>';
                return;
            }

            const downloadedSet = new Set(loadGM(STORAGE_KEYS.DOWNLOADED, []) as string[]);
            gridEl.innerHTML = videos.map((video, idx) => {
                const durationStr = video.duration > 0 ? this.formatDuration(video.duration) : '';
                const isDownloaded = downloadedSet.has(String(video.id));
                return `
                    <div class="tm-author-video-card" data-id="${video.id}" data-index="${idx}" style="position: relative;">
                        <img src="${video.thumbnail}" alt="Thumbnail" loading="lazy" referrerpolicy="no-referrer" />
                        ${durationStr ? `<span class="duration">${durationStr}</span>` : ''}
                        ${isDownloaded ? '<div class="tm-downloaded-badge">✓ 已下载</div>' : ''}
                    </div>
                `;
            }).join('');

            // Bind click handlers to cards
            gridEl.querySelectorAll('.tm-author-video-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chk = card.querySelector('.tm-author-select-chk') as HTMLInputElement | null;
                    if (chk && chk.style.display !== 'none') {
                        if (e.target !== chk) {
                            chk.checked = !chk.checked;
                        }
                        return; // Do not play/navigate
                    }

                    const targetId = card.getAttribute('data-id') || '';
                    if (!targetId) return;

                    // Close panel
                    authorPanel.classList.remove('active');

                    // Back up current playlist before switching to author playlist
                    if (!this.hasBackup) {
                        this.backupCustomPool = this.pool.getCustomDataPool();
                        this.backupIndex = this.currentIndex;
                        this.hasBackup = true;
                    }

                    // Show back button
                    const backBtn = this.uiLayer.querySelector('#tm-back-playlist-btn') as HTMLElement;
                    if (backBtn) backBtn.style.display = 'inline-flex';

                    // Set custom pool to author videos
                    this.pool.setCustomDataPool(this.currentAuthorVideos);

                    const clickedIndex = videos.findIndex(v => v.id === targetId);
                    this.openModal(clickedIndex >= 0 ? clickedIndex : 0);
                });
            });


        } catch (err) {
            console.error('Failed to load author videos', err);
            this.currentAuthorVideos = [];
            gridEl.innerHTML = `<div class="tm-comment-empty">${t('loadError')}</div>`;
        }
    }

    private formatDuration(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    public retranslateUI() {
        if (!this.uiLayer) return;
        const commentTitle = this.uiLayer.querySelector('#tm-comment-title');
        if (commentTitle) commentTitle.textContent = t('commentsTitle');

        const commentInput = this.uiLayer.querySelector('#tm-comment-input') as HTMLInputElement;
        if (commentInput) commentInput.placeholder = t('commentPlaceholder');

        const commentSend = this.uiLayer.querySelector('#tm-comment-send');
        if (commentSend) commentSend.textContent = t('send');

        const authorTitle = this.uiLayer.querySelector('.tm-author-title');
        if (authorTitle) authorTitle.textContent = t('authorProfileTitle');

        const externalLinkSpan = this.uiLayer.querySelector('#tm-author-external-link span');
        if (externalLinkSpan) externalLinkSpan.textContent = t('viewOnTwitter');

        const speedTip = this.uiLayer.querySelector('#tm-speed-tip');
        if (speedTip) speedTip.textContent = t('speedTip');

        const bookmarkSpan = this.uiLayer.querySelector('#tm-bookmark-btn .txt');
        if (bookmarkSpan) bookmarkSpan.textContent = t('actionBookmark');

        const authorSpan = this.uiLayer.querySelector('#tm-author-btn .txt');
        if (authorSpan) authorSpan.textContent = t('actionProfile');

        const commentSpan = this.uiLayer.querySelector('#tm-comment-btn .txt');
        if (commentSpan) commentSpan.textContent = t('commentsTitle');

        const downloadSpan = this.uiLayer.querySelector('#tm-download-btn .txt');
        if (downloadSpan) downloadSpan.textContent = t('actionDownload');
    }

    public onLibraryClick(cb: () => void) {
        this.onLibraryClickCallback = cb;
    }

    private getCleanBloggerName(name: string): string {
        if (!name) return '';
        return name.replace(/的视频(空间)?$/g, '').trim();
    }

    private resetIdleTimer() {
        if (!this.isOpen) return;
        
        const modal = this.modal;
        modal.classList.remove('tm-idle');

        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }

        const video = this.getCurrentVideo();
        const isPaused = video ? video.paused : true;

        if (!isPaused) {
            this.idleTimer = setTimeout(() => {
                if (this.isOpen && video && !video.paused) {
                    modal.classList.add('tm-idle');
                }
            }, 3000);
        }
    }

    private setupIdleTracker() {
        const events = ['mousemove', 'mousedown', 'touchstart', 'touchmove', 'keydown'];
        events.forEach(evt => {
            this.modal.addEventListener(evt, () => this.resetIdleTimer(), { passive: true });
        });

        // Recycled video play/pause event tracking
        this.vl.getNodes().forEach(n => {
            const v = n.querySelector('.tm-video') as HTMLVideoElement;
            if (v) {
                v.addEventListener('play', () => this.resetIdleTimer());
                v.addEventListener('pause', () => {
                    if (this.idleTimer) {
                        clearTimeout(this.idleTimer);
                        this.idleTimer = null;
                    }
                    this.modal.classList.remove('tm-idle');
                });
            }
        });
    }
}
