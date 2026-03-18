import { formatTime } from '../utils/Format';

// ═══════════════════════════════════════════════════════════════
//  手势状态枚举 — 有限状态机 (FSM) 的核心状态
// ═══════════════════════════════════════════════════════════════
const enum GestureState {
    IDLE = 'IDLE',                   // 空闲，等待手势输入
    AWAITING_GESTURE = 'AWAITING',   // touchstart 已触发，等待判定（长按? 滑动? 双击?）
    SWIPING_VERTICAL = 'SWIPE_V',   // 垂直滑动 — 切换视频（控制权交给外层）
    LONG_PRESSING = 'LONG_PRESS',   // 长按中 — 2x 倍速播放
    SCRUBBING = 'SCRUBBING',        // 长按后水平拖动 — 精准进度调节 (Mode A)
    BOTTOM_SCRUBBING = 'BOTTOM_SCRUB', // 底部区域水平拖动 — 粗调进度 (Mode C)
    ZOOMING = 'ZOOMING',            // 双指缩放
    PANNING = 'PANNING',            // 放大后单指平移
}

// ═══════════════════════════════════════════════════════════════
//  阈值常量
// ═══════════════════════════════════════════════════════════════
const LONG_PRESS_DELAY = 300;        // 长按判定（ms）
const DOUBLE_TAP_DELAY = 300;        // 双击判定间隔（ms）
const MOVE_DEADZONE = 10;            // 移动死区（px），超出则取消长按/点击判定
const STEP_SECONDS = 5;              // 边缘双击快进/快退秒数
const SCRUB_SENSITIVITY = 0.15;      // 精准拖拽：每 px 映射的秒数
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 4.0;
const THROTTLE_MS = 16;              // touchmove 节流间隔 (~60fps)

// ═══════════════════════════════════════════════════════════════
//  区域判定工具
// ═══════════════════════════════════════════════════════════════
type Region = 'left-edge' | 'right-edge' | 'core' | 'bottom';

function classifyTouch(x: number, y: number): Region {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (y > h * 0.85) return 'bottom';
    if (x < w * 0.20) return 'left-edge';
    if (x > w * 0.80) return 'right-edge';
    return 'core';
}

function pinchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// ═══════════════════════════════════════════════════════════════
//  回调接口 — 外部 (TikTokMode) 需要实现的交互
// ═══════════════════════════════════════════════════════════════
export interface GestureCallbacks {
    getVideo: () => HTMLVideoElement | null;
    getVideoStage: () => HTMLElement | null;
    onSwipeStart: () => void;
    onSwipeMove: (deltaY: number) => void;
    onSwipeEnd: (deltaY: number) => void;
    onTap: () => void;
    onDoubleTapLike: () => void;
}

// ═══════════════════════════════════════════════════════════════
//  GestureController 主类
// ═══════════════════════════════════════════════════════════════
export class GestureController {
    private state: GestureState = GestureState.IDLE;
    private cb: GestureCallbacks;
    private target: HTMLElement;
    /** UI 覆盖层容器 — swipeMask 的父元素 (uiLayer)，z-index 更高 */
    private overlayParent: HTMLElement;

    // ── 触控坐标记录 ──
    private startX = 0;
    private startY = 0;
    private startRegion: Region = 'core';

    // ── 长按定时器 ──
    private longPressTimer: ReturnType<typeof setTimeout> | null = null;

    // ── 双击检测 ──
    private lastTapTime = 0;
    private lastTapX = 0;
    private lastTapY = 0;
    private pendingTapTimer: ReturnType<typeof setTimeout> | null = null;

    // ── 进度拖拽 ──
    private scrubStartTime = 0;
    private scrubCurrentTime = 0;
    private scrubOverlay: HTMLElement | null = null;

    // ── 倍速提示 ──
    private speedTip: HTMLElement | null = null;

    // ── 缩放/平移 ──
    private currentScale = 1.0;
    private translateX = 0;
    private translateY = 0;
    private pinchStartDist = 0;
    private pinchStartScale = 1.0;
    private panStartX = 0;
    private panStartY = 0;
    private panStartTransX = 0;
    private panStartTransY = 0;

    // ── 节流 ──
    private lastMoveTime = 0;

    constructor(target: HTMLElement, callbacks: GestureCallbacks) {
        this.target = target;
        this.cb = callbacks;
        this.overlayParent = target.parentElement || target;
        this.createOverlayElements();
        this.bind();
    }

    // ═══════════════════════════════════════════════════════════
    //  创建 UI 覆盖层（挂在 uiLayer 上，确保 z-index 在视频之上）
    // ═══════════════════════════════════════════════════════════
    private createOverlayElements() {
        // 2x 倍速提示
        this.speedTip = document.createElement('div');
        this.speedTip.className = 'tm-gesture-speed-tip';
        this.speedTip.textContent = '2x 快进中 ▶▶';
        this.overlayParent.appendChild(this.speedTip);

        // 精准拖拽进度浮层
        this.scrubOverlay = document.createElement('div');
        this.scrubOverlay.className = 'tm-gesture-scrub-overlay';
        this.scrubOverlay.innerHTML = '<span class="scrub-time"></span>';
        this.overlayParent.appendChild(this.scrubOverlay);
    }

    private bind() {
        const el = this.target;
        el.addEventListener('touchstart', this.onTouchStart, { passive: false });
        el.addEventListener('touchmove', this.onTouchMove, { passive: false });
        el.addEventListener('touchend', this.onTouchEnd, { passive: false });
        el.addEventListener('touchcancel', this.onTouchCancel, { passive: false });
    }

    public destroy() {
        const el = this.target;
        el.removeEventListener('touchstart', this.onTouchStart);
        el.removeEventListener('touchmove', this.onTouchMove);
        el.removeEventListener('touchend', this.onTouchEnd);
        el.removeEventListener('touchcancel', this.onTouchCancel);
        this.clearLongPressTimer();
        this.clearPendingTap();
    }

    // ═══════════════════════════════════════════════════════════
    //  touchstart — 初始化手势判定
    // ═══════════════════════════════════════════════════════════
    private onTouchStart = (e: TouchEvent) => {
        // ── 双指缩放起始 ──
        if (e.touches.length >= 2) {
            this.clearLongPressTimer();
            this.clearPendingTap();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            this.pinchStartDist = pinchDistance(t1, t2);
            this.pinchStartScale = this.currentScale;
            this.state = GestureState.ZOOMING;
            e.preventDefault();
            return;
        }

        // ── 放大状态下的单指 → 平移 ──
        if (this.currentScale > 1.05) {
            const t = e.touches[0];
            this.panStartX = t.clientX;
            this.panStartY = t.clientY;
            this.panStartTransX = this.translateX;
            this.panStartTransY = this.translateY;
            this.state = GestureState.PANNING;
            e.preventDefault();
            return;
        }

        const t = e.touches[0];
        this.startX = t.clientX;
        this.startY = t.clientY;
        this.startRegion = classifyTouch(t.clientX, t.clientY);
        this.state = GestureState.AWAITING_GESTURE;

        // 底部区不启动长按定时器（底部区专用于 Mode C 水平粗调）
        if (this.startRegion !== 'bottom') {
            this.startLongPressTimer();
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  touchmove — 状态机驱动分发
    // ═══════════════════════════════════════════════════════════
    private onTouchMove = (e: TouchEvent) => {
        const now = performance.now();
        if (now - this.lastMoveTime < THROTTLE_MS) return;
        this.lastMoveTime = now;

        switch (this.state) {
            case GestureState.ZOOMING:
                this.handleZoomMove(e);
                break;
            case GestureState.PANNING:
                this.handlePanMove(e);
                break;
            case GestureState.AWAITING_GESTURE:
                this.resolveInitialDirection(e);
                break;
            case GestureState.LONG_PRESSING:
                this.checkScrubFromLongPress(e);
                break;
            case GestureState.SCRUBBING:
                this.handleScrubMove(e);
                break;
            case GestureState.BOTTOM_SCRUBBING:
                this.handleBottomScrubMove(e);
                break;
            case GestureState.SWIPING_VERTICAL:
                this.handleVerticalSwipeMove(e);
                break;
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  touchend — 收尾处理
    // ═══════════════════════════════════════════════════════════
    private onTouchEnd = (e: TouchEvent) => {
        // 双指缩放结束时若还有一根手指，过渡到平移
        if (this.state === GestureState.ZOOMING && e.touches.length === 1) {
            const t = e.touches[0];
            this.panStartX = t.clientX;
            this.panStartY = t.clientY;
            this.panStartTransX = this.translateX;
            this.panStartTransY = this.translateY;
            this.state = GestureState.PANNING;
            return;
        }

        switch (this.state) {
            case GestureState.AWAITING_GESTURE:
                this.clearLongPressTimer();
                this.handleTapOrDoubleTap(e);
                break;
            case GestureState.LONG_PRESSING:
                this.endLongPress();
                break;
            case GestureState.SCRUBBING:
                this.endScrub();
                break;
            case GestureState.BOTTOM_SCRUBBING:
                this.endBottomScrub();
                break;
            case GestureState.SWIPING_VERTICAL: {
                const deltaY = e.changedTouches[0].clientY - this.startY;
                this.cb.onSwipeEnd(deltaY);
                break;
            }
            case GestureState.ZOOMING:
                if (this.currentScale < 1.05) this.resetZoom();
                break;
            case GestureState.PANNING:
                this.clampPan();
                break;
        }
        this.state = GestureState.IDLE;
    };

    private onTouchCancel = () => {
        this.clearLongPressTimer();
        if (this.state === GestureState.LONG_PRESSING) this.endLongPress();
        else if (this.state === GestureState.SCRUBBING) this.endScrub();
        else if (this.state === GestureState.BOTTOM_SCRUBBING) this.endBottomScrub();
        this.state = GestureState.IDLE;
    };

    // ═══════════════════════════════════════════════════════════
    //  AWAITING 阶段 — 首次移动方向判定（防冲突核心）
    // ═══════════════════════════════════════════════════════════
    private resolveInitialDirection(e: TouchEvent) {
        const t = e.touches[0];
        const dx = t.clientX - this.startX;
        const dy = t.clientY - this.startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // 未超过死区 → 保持等待（长按定时器仍在倒计时）
        if (absDx < MOVE_DEADZONE && absDy < MOVE_DEADZONE) return;

        // 超过死区 → 取消长按判定
        this.clearLongPressTimer();

        if (this.startRegion === 'bottom') {
            // 底部区：水平滑动 → Mode C（粗调进度）
            if (absDx >= absDy) {
                this.state = GestureState.BOTTOM_SCRUBBING;
                this.startBottomScrub();
                e.preventDefault();
            }
            return;
        }

        // 非底部区：方向锁定
        if (absDy > absDx) {
            this.state = GestureState.SWIPING_VERTICAL;
            this.cb.onSwipeStart();
            this.cb.onSwipeMove(dy);
        } else {
            // 水平滑动在非长按状态下无交互意义
            this.state = GestureState.IDLE;
        }
    }

    private handleVerticalSwipeMove(e: TouchEvent) {
        const t = e.touches[0];
        const dy = t.clientY - this.startY;
        this.cb.onSwipeMove(dy);
    }

    // ═══════════════════════════════════════════════════════════
    //  长按 — 2x 倍速播放
    // ═══════════════════════════════════════════════════════════
    private startLongPressTimer() {
        this.clearLongPressTimer();
        this.longPressTimer = setTimeout(() => {
            this.longPressTimer = null;
            this.state = GestureState.LONG_PRESSING;
            this.clearPendingTap();
            const video = this.cb.getVideo();
            if (video) video.playbackRate = 2.0;
            if (this.speedTip) this.speedTip.classList.add('show');
        }, LONG_PRESS_DELAY);
    }

    private clearLongPressTimer() {
        if (this.longPressTimer !== null) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    private endLongPress() {
        const video = this.cb.getVideo();
        if (video) video.playbackRate = 1.0;
        if (this.speedTip) this.speedTip.classList.remove('show');
    }

    // ═══════════════════════════════════════════════════════════
    //  长按后水平拖动 → 精准进度调节 (Mode A)
    // ═══════════════════════════════════════════════════════════
    private checkScrubFromLongPress(e: TouchEvent) {
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - this.startX);
        if (dx > MOVE_DEADZONE) {
            this.endLongPress();
            const video = this.cb.getVideo();
            this.scrubStartTime = video ? video.currentTime : 0;
            this.scrubCurrentTime = this.scrubStartTime;
            this.state = GestureState.SCRUBBING;
            this.showScrubOverlay();
            e.preventDefault();
        }
    }

    private handleScrubMove(e: TouchEvent) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - this.startX;
        const video = this.cb.getVideo();
        if (!video || !video.duration) return;
        const timeDelta = dx * SCRUB_SENSITIVITY;
        this.scrubCurrentTime = Math.max(0, Math.min(video.duration, this.scrubStartTime + timeDelta));
        this.updateScrubOverlay(this.scrubCurrentTime, video.duration);
    }

    private endScrub() {
        const video = this.cb.getVideo();
        if (video && isFinite(this.scrubCurrentTime)) {
            video.currentTime = this.scrubCurrentTime;
            if (video.paused) video.play().catch(() => {});
        }
        this.hideScrubOverlay();
    }

    // ═══════════════════════════════════════════════════════════
    //  底部区粗调进度 (Mode C)
    // ═══════════════════════════════════════════════════════════
    private startBottomScrub() {
        const video = this.cb.getVideo();
        this.scrubStartTime = video ? video.currentTime : 0;
        this.scrubCurrentTime = this.scrubStartTime;
        this.showScrubOverlay();
    }

    private handleBottomScrubMove(e: TouchEvent) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - this.startX;
        const video = this.cb.getVideo();
        if (!video || !video.duration) return;
        const ratio = dx / window.innerWidth;
        const timeDelta = ratio * video.duration;
        this.scrubCurrentTime = Math.max(0, Math.min(video.duration, this.scrubStartTime + timeDelta));
        this.updateScrubOverlay(this.scrubCurrentTime, video.duration);
    }

    private endBottomScrub() {
        const video = this.cb.getVideo();
        if (video && isFinite(this.scrubCurrentTime)) {
            video.currentTime = this.scrubCurrentTime;
            if (video.paused) video.play().catch(() => {});
        }
        this.hideScrubOverlay();
    }

    // ── 拖拽浮层 UI ──
    private showScrubOverlay() {
        if (this.scrubOverlay) this.scrubOverlay.classList.add('show');
    }
    private hideScrubOverlay() {
        if (this.scrubOverlay) this.scrubOverlay.classList.remove('show');
    }
    private updateScrubOverlay(current: number, duration: number) {
        if (!this.scrubOverlay) return;
        const span = this.scrubOverlay.querySelector('.scrub-time');
        if (span) span.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }

    // ═══════════════════════════════════════════════════════════
    //  单击 / 双击判定（含区域感知防冲突）
    // ═══════════════════════════════════════════════════════════
    private handleTapOrDoubleTap(e: TouchEvent) {
        const now = performance.now();
        const t = e.changedTouches[0];
        const region = classifyTouch(t.clientX, t.clientY);
        const timeSinceLastTap = now - this.lastTapTime;
        const dx = Math.abs(t.clientX - this.lastTapX);
        const dy = Math.abs(t.clientY - this.lastTapY);
        const isDoubleTap = timeSinceLastTap < DOUBLE_TAP_DELAY && dx < 50 && dy < 50;

        if (isDoubleTap) {
            this.clearPendingTap();
            if (region === 'left-edge') {
                const video = this.cb.getVideo();
                if (video) video.currentTime = Math.max(0, video.currentTime - STEP_SECONDS);
                this.showStepFeedback('left');
            } else if (region === 'right-edge') {
                const video = this.cb.getVideo();
                if (video && video.duration) video.currentTime = Math.min(video.duration, video.currentTime + STEP_SECONDS);
                this.showStepFeedback('right');
            } else {
                this.cb.onDoubleTapLike();
            }
            this.lastTapTime = 0;
        } else {
            this.lastTapTime = now;
            this.lastTapX = t.clientX;
            this.lastTapY = t.clientY;
            this.clearPendingTap();
            this.pendingTapTimer = setTimeout(() => {
                this.pendingTapTimer = null;
                this.cb.onTap();
            }, DOUBLE_TAP_DELAY);
        }
    }

    private clearPendingTap() {
        if (this.pendingTapTimer !== null) {
            clearTimeout(this.pendingTapTimer);
            this.pendingTapTimer = null;
        }
    }

    private showStepFeedback(direction: 'left' | 'right') {
        const el = document.createElement('div');
        el.className = `tm-gesture-step-feedback ${direction}`;
        el.textContent = direction === 'left' ? '◀◀ -5s' : '+5s ▶▶';
        this.overlayParent.appendChild(el);
        setTimeout(() => el.remove(), 600);
    }

    // ═══════════════════════════════════════════════════════════
    //  Pinch-to-Zoom 缩放
    // ═══════════════════════════════════════════════════════════
    private handleZoomMove(e: TouchEvent) {
        if (e.touches.length < 2) return;
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = pinchDistance(t1, t2);
        const ratio = dist / this.pinchStartDist;
        this.currentScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.pinchStartScale * ratio));
        this.applyTransform();
    }

    // ═══════════════════════════════════════════════════════════
    //  放大后单指平移 (Pan)
    // ═══════════════════════════════════════════════════════════
    private handlePanMove(e: TouchEvent) {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        const t = e.touches[0];
        this.translateX = this.panStartTransX + (t.clientX - this.panStartX);
        this.translateY = this.panStartTransY + (t.clientY - this.panStartY);
        this.clampPan();
        this.applyTransform();
    }

    private clampPan() {
        const stage = this.cb.getVideoStage();
        if (!stage) return;
        const maxX = (this.currentScale - 1) * stage.clientWidth / 2;
        const maxY = (this.currentScale - 1) * stage.clientHeight / 2;
        this.translateX = Math.max(-maxX, Math.min(maxX, this.translateX));
        this.translateY = Math.max(-maxY, Math.min(maxY, this.translateY));
        this.applyTransform();
    }

    public resetZoom() {
        this.currentScale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        this.applyTransform();
    }

    private applyTransform() {
        const video = this.cb.getVideo();
        if (!video) return;
        video.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentScale})`;
        video.style.transformOrigin = 'center center';
    }

    public isZoomed(): boolean {
        return this.currentScale > 1.05;
    }
}
