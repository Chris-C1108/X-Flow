import { VirtualList } from './VirtualList';
import { PoolManager } from '../api/PoolManager';
import { formatTime, escapeHtml, formatCount } from '../utils/Format';
import { loadJSON, saveJSON, loadGM, saveGM, STORAGE_KEYS } from '../engine/Storage';
import { collector } from '../telemetry/EventCollector';
import { fetchComments, postComment, Comment } from '../api/CommentService';

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
    private likes: Set<string>;
    private preloadTimer: ReturnType<typeof setTimeout> | null = null;
    private isDraggingProgress: boolean = false;
    private onCloseCallback: (() => void) | null = null;
    
    private progressFill: HTMLElement;
    private timeText: HTMLElement;
    private titleText: HTMLElement;
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

    constructor(pool: PoolManager) {
        this.pool = pool;
        this.vl = new VirtualList();
        this.loop = !!loadJSON(STORAGE_KEYS.LOOP, false);
        this.bookmarks = new Set(loadJSON(STORAGE_KEYS.BOOKMARKS, []) as string[]);
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
                <button type="button" class="tm-action like" id="tm-like-btn" aria-label="Like" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
                    <span class="txt" id="tm-like-count">0</span>
                </button>
                <button type="button" class="tm-action bookmark" id="tm-bookmark-btn" aria-label="Bookmark" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg></div>
                    <span class="txt">收藏</span>
                </button>
                <button type="button" class="tm-action author" id="tm-author-btn" aria-label="Author" tabindex="0" style="display:none">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
                    <span class="txt">主页</span>
                </button>
                <button type="button" class="tm-action comment" id="tm-comment-btn" aria-label="Comment" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg></div>
                    <span class="txt" id="tm-comment-count">评论</span>
                </button>
                <button type="button" class="tm-action download" id="tm-download-btn" aria-label="Download" tabindex="0">
                    <div class="icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></div>
                    <span class="txt">下载</span>
                </button>
            </div>
            <div class="tm-speed-tip" id="tm-speed-tip">⏩ 长按加速中</div>
            <div class="tm-swipe-mask" id="tm-swipe-mask"></div>
            
            <div class="tm-comment-panel" id="tm-comment-panel">
                <div class="tm-comment-header">
                    <span id="tm-comment-title">评论</span>
                    <button class="tm-comment-close" id="tm-comment-close" aria-label="Close comments">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="tm-comment-body" id="tm-comment-list"></div>
                <div class="tm-comment-footer">
                    <input type="text" class="tm-comment-input" id="tm-comment-input" placeholder="输入评论..." />
                    <button class="tm-comment-send" id="tm-comment-send" disabled>发送</button>
                </div>
            </div>
        `;
        this.modal.appendChild(this.uiLayer);

        this.progressFill = this.uiLayer.querySelector('#tm-progress-fill') as HTMLElement;
        this.timeText = this.uiLayer.querySelector('#tm-time') as HTMLElement;
        this.titleText = this.uiLayer.querySelector('#tm-title') as HTMLElement;

        this.pool.onDataAdded(() => {
            if (this.isOpen) {
                this.updateCountUI();
            }
        });
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

        const likeBtn = this.uiLayer.querySelector('#tm-like-btn')!;
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const list = this.pool.getDataPool();
            if (!list.length) return;
            const id = String(list[this.currentIndex].id);
            if (this.likes.has(id)) {
                this.likes.delete(id);
                likeBtn.classList.remove('active');
            } else {
                this.likes.add(id);
                likeBtn.classList.add('active');
                collector.trackLike(id);
            }
            saveGM(STORAGE_KEYS.LIKES, Array.from(this.likes));
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
                bookmarkBtn.classList.remove('active');
                collector.trackBookmark(id, false);
            } else {
                this.bookmarks.add(id);
                bookmarkBtn.classList.add('active');
                collector.trackBookmark(id, true);
            }
            saveJSON(STORAGE_KEYS.BOOKMARKS, Array.from(this.bookmarks));
        });

        // M2-4: 评论面板逻辑
        const commentBtn = this.uiLayer.querySelector('#tm-comment-btn')!;
        const commentPanel = this.uiLayer.querySelector('#tm-comment-panel')!;
        const commentClose = this.uiLayer.querySelector('#tm-comment-close')!;
        const commentList = this.uiLayer.querySelector('#tm-comment-list')!;
        const commentInput = this.uiLayer.querySelector('#tm-comment-input') as HTMLInputElement;
        const commentSend = this.uiLayer.querySelector('#tm-comment-send') as HTMLButtonElement;

        commentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            commentPanel.classList.add('active');
            this.loadComments();
        });

        commentClose.addEventListener('click', () => {
            commentPanel.classList.remove('active');
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

    public openModal(index: number) {
        this.isOpen = true;
        this.modal.style.display = 'block';
        this.currentIndex = index;
        
        this.vl.setTransition(false);
        this.vl.updateTransforms(this.currentIndex, 0);
        
        this.loadNode(this.currentIndex - 1);
        this.loadNode(this.currentIndex);
        this.loadNode(this.currentIndex + 1);

        this.playCurrent();
    }

    public closeModal() {
        if (this.preloadTimer) { clearTimeout(this.preloadTimer); this.preloadTimer = null; }
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
        }
        this.isOpen = false;
        this.modal.style.display = 'none';
        this.pauseAll();
        collector.flushSession();
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

        this.loadNode(this.currentIndex + delta); 

        setTimeout(() => {
            if (this.isOpen) this.playCurrent();
        }, 350);
        
        if (this.currentIndex >= list.length - 5) {
            this.pool.fetchNextPage();
        }
    }

    private loadNode(logicalIndex: number) {
        const list = this.pool.getDataPool();
        if (logicalIndex < 0 || logicalIndex >= list.length) return;

        const item = list[logicalIndex];
        const node = this.vl.getNode(logicalIndex);
        const video = node.querySelector('.tm-video') as HTMLVideoElement;
        const thumb = node.querySelector('.tm-thumb') as HTMLImageElement;

        if (video.getAttribute('data-index') !== logicalIndex.toString()) {
            video.src = item.url;
            video.setAttribute('data-index', logicalIndex.toString());
            video.loop = this.loop;
            video.preload = (logicalIndex === this.currentIndex) ? 'auto' : 'metadata';
            video.load();
            thumb.src = item.thumbnail || '';
            node.style.backgroundImage = `url("${escapeCSSUrl(item.thumbnail || '')}")`;
            node.style.backgroundSize = 'cover';
            node.style.backgroundPosition = 'center';
            thumb.classList.remove('hidden');
            video.style.opacity = '0';

            video.oncanplay = () => {
                if (video.getAttribute('data-index') === logicalIndex.toString()) {
                    thumb.classList.add('hidden');
                    video.style.opacity = '1';
                }
            };
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
        this.titleText.textContent = item.title || 'Video';
        
        this.updateCountUI();

        const likeCount = this.uiLayer.querySelector('#tm-like-count');
        if (likeCount) likeCount.textContent = String(item.favorite || 0);

        const likeBtn = this.uiLayer.querySelector('#tm-like-btn');
        if (likeBtn) {
            if (this.likes.has(videoId)) {
                likeBtn.classList.add('active');
            } else {
                likeBtn.classList.remove('active');
            }
        }

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
        video.play().catch(e => console.log('Autoplay prevented', e));
        video.volume = this.isMuted ? 0 : this.volume;
        video.muted = this.isMuted;
        this.schedulePreload();

        const authorBtn = this.uiLayer.querySelector<HTMLButtonElement>('#tm-author-btn');
        if (authorBtn) {
            const authorUrl = (item as any).author_url || (item as any).authorUrl || '';
            if (authorUrl) {
                authorBtn.style.display = '';
                authorBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.open(authorUrl, '_blank', 'noopener,noreferrer');
                };
            } else {
                authorBtn.style.display = 'none';
            }
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

        this.preloadTimer = setTimeout(() => {
            const nextIdx = this.currentIndex + 1;
            if (nextIdx < list.length) {
                const nextNode = this.vl.getNode(nextIdx);
                const nextVideo = nextNode.querySelector('.tm-video') as HTMLVideoElement;
                if (nextVideo.src) {
                    nextVideo.preload = 'auto';
                }
            }

            this.preloadTimer = setTimeout(() => {
                const prevIdx = this.currentIndex - 1;
                if (prevIdx >= 0) {
                    const prevNode = this.vl.getNode(prevIdx);
                    const prevVideo = prevNode.querySelector('.tm-video') as HTMLVideoElement;
                    if (prevVideo.src) {
                        prevVideo.preload = 'auto';
                    }
                }
            }, 2000);
        }, 2000);
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
}