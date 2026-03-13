/**
 * 职责：
 * 1. 只创建 3 个视频容器节点 (Prev, Current, Next)
 * 2. 监听滑动偏移量，动态更新这 3 个节点的 transform 和 content
 * 3. 处理视频 object-fit: contain 与模糊背景的切换
 */

export class VirtualList {
    public container: HTMLElement;
    private nodes: HTMLElement[];

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'vl-container';
        // background #000 保证背景黑底，隐藏其他节点
        this.container.style.cssText = 'position: absolute; inset: 0; overflow: hidden; touch-action: none; background: #000; z-index: 10;';
        this.nodes = [];

        for (let i = 0; i < 3; i++) {
            const node = document.createElement('div');
            node.className = 'tm-video-stage';
            // Each node uses the existing CSS rules + transform hooks
            node.style.cssText = 'position: absolute; inset: 0; transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1); transform: translateY(100%); z-index: 1;';
            node.innerHTML = `
                <img class="tm-thumb hidden" alt="">
                <video class="tm-video" playsinline webkit-playsinline preload="metadata" referrerpolicy="no-referrer"></video>
            `;
            this.container.appendChild(node);
            this.nodes.push(node);
        }
    }

    public getNodes() {
        return this.nodes;
    }

    public getNodeIndex(logicalIndex: number) {
        return ((logicalIndex % 3) + 3) % 3;
    }

    public getNode(logicalIndex: number) {
        return this.nodes[this.getNodeIndex(logicalIndex)];
    }

    public setTransition(enable: boolean) {
        this.nodes.forEach(node => {
            node.style.transition = enable ? 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
        });
    }

    public updateTransforms(currentIndex: number, offsetPx: number = 0) {
        const curr = this.getNodeIndex(currentIndex);
        const prev = this.getNodeIndex(currentIndex - 1);
        const next = this.getNodeIndex(currentIndex + 1);

        this.nodes[prev].style.transform = `translateY(calc(-100% + ${offsetPx}px))`;
        this.nodes[prev].style.zIndex = '1';

        this.nodes[curr].style.transform = `translateY(${offsetPx}px)`;
        this.nodes[curr].style.zIndex = '2';

        this.nodes[next].style.transform = `translateY(calc(100% + ${offsetPx}px))`;
        this.nodes[next].style.zIndex = '1';
    }
}
