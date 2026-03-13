/**
 * 时间、数字格式化
 */
const escapeMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(str: string) { return (str || '').replace(/[&<>"']/g, s => escapeMap[s] || s); }
export function formatTime(seconds: number) { if (!isFinite(seconds) || seconds < 0) return '0:00'; const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m}:${String(s).padStart(2, '0')}`; }
export function formatCount(num: number) { if (num >= 100000000) return (num / 100000000).toFixed(1).replace(/\.0$/, '') + '亿'; if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万'; return String(num || 0); }
