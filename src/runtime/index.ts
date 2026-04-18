import type { RuntimeAdapter } from './adapter';
import { userscriptAdapter } from './userscriptAdapter';
import { webAdapter } from './webAdapter';

let runtimeAdapter: RuntimeAdapter | null = null;

function isUserscriptRuntime(): boolean {
    return typeof (globalThis as any).GM_xmlhttpRequest === 'function';
}

export function getRuntimeAdapter(): RuntimeAdapter {
    if (!runtimeAdapter) {
        runtimeAdapter = isUserscriptRuntime() ? userscriptAdapter : webAdapter;
    }
    return runtimeAdapter;
}

export function setRuntimeAdapter(adapter: RuntimeAdapter): void {
    runtimeAdapter = adapter;
}
