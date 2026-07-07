import { SiteAdapter } from './SiteAdapter';
import { TwiHubAdapter } from './TwiHubAdapter';
import { NextApiAdapter } from './NextApiAdapter';
import { XHotVideoAdapter } from './XHotVideoAdapter';
import { MonsnodeAdapter } from './MonsnodeAdapter';
import { TwiigleAdapter } from './TwiigleAdapter';
import { XiaoHuangNiaoAdapter } from './XiaoHuangNiaoAdapter';
import { TwivideoAdapter } from './TwivideoAdapter';
import { TwidougaAdapter } from './TwidougaAdapter';
import { JavtwiAdapter } from './JavtwiAdapter';

export class AdapterManager {
    private static instance: AdapterManager;
    private adapters: SiteAdapter[] = [];
    private activeAdapter: SiteAdapter;

    private constructor() {
        // Register all site adapters
        this.adapters = [
            new TwiHubAdapter(),
            new NextApiAdapter(),
            new XHotVideoAdapter(),
            new MonsnodeAdapter(),
            new TwiigleAdapter(),
            new XiaoHuangNiaoAdapter(),
            new TwivideoAdapter(),
            new TwidougaAdapter(),
            new JavtwiAdapter()
        ];
        
        // Detect active adapter
        const hostname = window.location.hostname;
        const matched = this.adapters.find(adapter => adapter.matches(hostname));
        
        // Fallback to TwiHubAdapter if none matched (e.g. localhost or dev)
        this.activeAdapter = matched || this.adapters[0];
    }

    public static getInstance(): AdapterManager {
        if (!AdapterManager.instance) {
            AdapterManager.instance = new AdapterManager();
        }
        return AdapterManager.instance;
    }

    public getActiveAdapter(): SiteAdapter {
        return this.activeAdapter;
    }
}
