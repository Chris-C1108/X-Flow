import type { RuntimeAdapter } from './adapter';
import { userscriptAdapter } from './userscriptAdapter';

export function getRuntimeAdapter(): RuntimeAdapter {
    return userscriptAdapter;
}

