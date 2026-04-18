import { Layout } from '../../ui/Layout';
import { log } from '../../utils/Logger';
import { setRuntimeAdapter } from '../index';
import { webAdapter } from '../webAdapter';
import appCssText from '../../styles/player.css?inline';

setRuntimeAdapter(webAdapter);

export async function bootstrapWebApp() {
    const appRoot = document.getElementById('xflow-app-root');
    if (!appRoot) {
        console.error('X-Flow: #xflow-app-root not found in HTML');
        return;
    }

    try {
        const style = document.createElement('style');
        style.setAttribute('data-xflow-app', '1');
        style.textContent = appCssText;
        document.head.appendChild(style);

        const fontFrag = document.createDocumentFragment();

        const preconnect1 = document.createElement('link');
        preconnect1.rel = 'preconnect';
        preconnect1.href = 'https://fonts.googleapis.com';
        fontFrag.appendChild(preconnect1);

        const preconnect2 = document.createElement('link');
        preconnect2.rel = 'preconnect';
        preconnect2.href = 'https://fonts.gstatic.com';
        preconnect2.crossOrigin = '';
        fontFrag.appendChild(preconnect2);

        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@500;700;800&display=swap';
        fontFrag.appendChild(fontLink);

        document.head.appendChild(fontFrag);

        appRoot.dataset.xflowState = 'booting';
        log('X-Flow Web: booting on clean HTML shell');

        const layout = new Layout();
        layout.init(appRoot);

        appRoot.dataset.xflowState = 'ready';
        log('X-Flow Web: ready');
    } catch (e) {
        console.error('X-Flow Web init error:', e);
        appRoot.dataset.xflowState = 'failed';
    } finally {
        const splash = document.getElementById('xflow-splash');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.transform = 'scale(1.04)';
            splash.style.pointerEvents = 'none';
            setTimeout(() => splash.remove(), 600);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapWebApp);
} else {
    bootstrapWebApp();
}
