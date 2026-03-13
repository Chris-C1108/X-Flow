import './styles/tailwind.css';
import './styles/player.css';
import { Sandbox } from './ui/Sandbox';

/**
 * 入口文件：负责沙盒初始化与模块装�? */
console.log('X-Flow v6 Pro: System Starting...');

// 启动终极沙盒防御
const sandbox = Sandbox.getInstance();
sandbox.initialize();
