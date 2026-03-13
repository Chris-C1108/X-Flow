/**
 * 调试日志控制
 */
const CONFIG = { DEBUG: true };
export function log(...args: any[]) { if (CONFIG.DEBUG) console.log('🚀[X-Flow]', ...args); }
