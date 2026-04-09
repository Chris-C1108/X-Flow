import { VirtualList } from './VirtualList';
import { PoolManager } from '../api/PoolManager';
import { formatTime } from '../utils/Format';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../engine/Storage';

function escapeCSSUrl(url: string) {
    return url.replace(/["'\\]/g, '\\$&');
}

export class TikTokMode {
    public isOpen: boolean = false;
    private pool: PoolManager;
    private vl: VirtualList;
    private modal: HTMLElement;
    private uiLayer: HTMLElement;
    private currentIndex: number = 0;
    private loop: boolean;
    private bookmarks: Set<string>;
    private preloadTimer: ReturnType<typeof setTimeout> | null = null;
    private isDraggingProgress: boolean = false;
    
    private progressFill: HTMLElement;
    private timeText: HTMLElement;
    private titleText: HTMLElement;
    private volume: number;
    private isMuted: boolean;

    constructor(pool: PoolManager) {
        this.pool = pool;
        this.vl = new VirtualList();
        this.loop = !!loadJSON(STORAGE_KEYS.LOOP, false);
        this.bookmarks = new Set(loadJSON(STORAGE_KEYS.BOOKMARKS, []) as string[]);
        const savedVol = loadJSON(STORAGE_KEYS.VOLUME, { volume: 0.7, muted: false }) as { volume: number; muted: boolean };
        this.volume = savedVol.volume;
        this.isMuted = savedVol.muted;

        this.modal = document.createElement('div');
        this.modal.id = 'tm-tiktok-modal';
        this.modal.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647; display: none; background: #000; color: #fff; font-family: sans-serif;';
        
        this.modal.appendChild(this.vl.container);

        this.uiLayer = document.createElement('div');
        this.uiLayer.style.cssText = 'position: absolute; inset: 0; z-index: 20; pointer-events: none;';
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
        const closeBtn = this.uiLayer.querySelector('#tm-close-btn')!;
        closeBtn.addEventListener('click', () => this.closeModal());

        const swipeMask = this.uiLayer.querySelector('#tm-swipe-mask')!;
        let startY = 0;
        let isMoving = false;

        swipeMask.addEventListener('touchstart', (e: any) => {
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

        swipeMask.addEventListener('touchmove', (e: any) => { 
            if (!isMoving) return;
            const deltaY = e.touches[0].clientY - startY;
            this.vl.updateTransforms(this.currentIndex, deltaY);
        }, { passive: false });

        swipeMask.addEventListener('touchend', (e: any) => { 
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
        
        // Desktop support
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
        
        swipeMask.addEventListener('click', () => {
            if (!isMoving) this.togglePlayCurrent();
        });

        // Like button - show the server-side like count (read-only display from API data)
        const likeBtn = this.uiLayer.querySelector('#tm-like-btn')!;
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            likeBtn.classList.toggle('active');
        });

        // Bookmark button - toggle bookmark in localStorage
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
            } else {
                this.bookmarks.add(id);
                bookmarkBtn.classList.add('active');
            }
            saveJSON(STORAGE_KEYS.BOOKMARKS, Array.from(this.bookmarks));
        });

        // Download button - open video URL in new tab for download
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
            }
        });

        // Progress bar interaction (touch + mouse + click)
        const progressWrap = this.uiLayer.querySelector('#tm-progress-wrap')!;

        // Click to seek
        progressWrap.addEventListener('click', (e: any) => {
            e.stopPropagation();
            this.seekToPosition(e.clientX);
        });

        // Touch drag on progress bar
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

        // Mouse drag on progress bar (PC)
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

        // Volume controls
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

        // Initialize volume fill
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
        this.isOpen = false;
        this.modal.style.display = 'none';
        this.pauseAll();
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

            video.oncanplay = null; // Clear old event listener before setting a new one
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
        this.titleText.textContent = item.title || 'Video';
        
        this.updateCountUI();

        // Update action buttons state
        const likeCount = this.uiLayer.querySelector('#tm-like-count');
        if (likeCount) likeCount.textContent = String(item.favorite || 0);

        const likeBtn = this.uiLayer.querySelector('#tm-like-btn');
        if (likeBtn) likeBtn.classList.remove('active');

        const bookmarkBtn = this.uiLayer.querySelector('#tm-bookmark-btn');
        if (bookmarkBtn) {
            if (this.bookmarks.has(String(item.id))) {
                bookmarkBtn.classList.add('active');
            } else {
                bookmarkBtn.classList.remove('active');
            }
        }
        
        const node = this.vl.getNode(this.currentIndex);
        const video = node.querySelector('.tm-video') as HTMLVideoElement;
        
        video.preload = 'auto';
        video.play().catch(e => console.log('Autoplay prevented', e));
        video.volume = this.isMuted ? 0 : this.volume;
        video.muted = this.isMuted;
        this.schedulePreload();

        video.ontimeupdate = () => {
            if (!video.duration) return;
            const p = (video.currentTime / video.duration) * 100;
            this.progressFill.style.width = `${p}%`;
            
            const progressWrap = this.uiLayer.querySelector('#tm-progress-wrap');
            if (progressWrap) progressWrap.setAttribute('aria-valuenow', String(Math.round(p)));
            
            this.timeText.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        };
    }
    
    private schedulePreload() {
        if (this.preloadTimer) clearTimeout(this.preloadTimer);

        const list = this.pool.getDataPool();
        if (!list.length) return;

        // After 2s on current video, start buffering next
        this.preloadTimer = setTimeout(() => {
            const nextIdx = this.currentIndex + 1;
            if (nextIdx < list.length) {
                const nextNode = this.vl.getNode(nextIdx);
                const nextVideo = nextNode.querySelector('.tm-video') as HTMLVideoElement;
                if (nextVideo.src) {
                    nextVideo.preload = 'auto';
                }
            }

            // After 4s total, start buffering prev too
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
        if (video.paused) {
            video.play().catch(e => console.log('Play prevented', e));
        } else {
            video.pause();
        }
    }

    private updateCountUI() {
        const list = this.pool.getDataPool();
        const countSpan = this.uiLayer.querySelector('#tm-count');
        if (countSpan) {
            countSpan.textContent = `${this.currentIndex + 1} / ${list.length}${this.pool.hasMoreData() ? '+' : ''}`;
        }
    }
}