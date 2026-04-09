import './styles/tailwind.css';
import './styles/player.css';
import { Sandbox } from './ui/Sandbox';
import { Shield } from './utils/Shield';

if (window.self !== window.top) {
    console.warn('X-Flow: Blocked execution in iframe');
} else {
    /**
     * 入口文件：负责沙盒初始化与模块装配
     */
    console.log('X-Flow v6 Pro: System Starting...');

    // 1. 设置底层反劫持之盾，阻止原生广告附加到 window/document
    Shield.activate();

    // 2. 启动终极沙盒防御
    const sandbox = Sandbox.getInstance();
    sandbox.initialize();
}
