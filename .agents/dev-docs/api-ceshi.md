(async function() {
    console.log("%c[API 探针] 正在初始化...", "color: #25F4EE; font-weight: bold; font-size: 14px;");
    
    const BASE_URL = window.location.origin;
    // 根据当前域名自动判断 isAnimeOnly 参数
    const isAnimeOnly = BASE_URL.includes('x-ero-anime') ? 1 : 0;

    // 通用 GET 请求封装
    async function fetchList(params = {}) {
        const url = new URL(`${BASE_URL}/api/media`);
        const defaultParams = {
            range: 'all', page: 1, per_page: 50, category: '', ids: '', isAnimeOnly, sort: 'favorite'
        };
        const finalParams = { ...defaultParams, ...params };
        Object.keys(finalParams).forEach(k => url.searchParams.append(k, finalParams[k]));
        
        const res = await fetch(url.toString(), { headers: { 'accept': 'application/json' }});
        return res.json();
    }

    // --------------------------------------------------------
    // 测试 1：突破单页数量限制 (per_page 探针)
    // 目的：测试后端是否对 per_page 做了硬性限制。如果没限制，可以直接 per_page=1000 一次性抓取海量视频。
    // --------------------------------------------------------
    async function testPerPageLimit() {
        console.log("%c\n▶ 测试 1: per_page 极限测试", "color: #FE2C55; font-weight: bold;");
        const testSizes =[50, 100, 500, 1000];
        for (const size of testSizes) {
            try {
                const data = await fetchList({ per_page: size, page: 1 });
                console.log(`请求 per_page: ${size} -> 实际返回数量: ${data.items.length} (总数: ${data.total})`);
                if (data.items.length < size && data.items.length < data.total) {
                    console.log(`⚠️ 后端可能限制了单页最大返回数为: ${data.items.length}`);
                    break;
                }
            } catch (e) {
                console.error(`请求 per_page=${size} 失败:`, e);
            }
        }
    }

    // --------------------------------------------------------
    // 测试 2：隐藏的排序方式 (sort 探针)
    // 目的：尝试除了 favorite 和 pv 以外的排序方式，比如按最新发布(recent)排序。
    // --------------------------------------------------------
    async function testSortMethods() {
        console.log("%c\n▶ 测试 2: 排序参数(sort)探针", "color: #FE2C55; font-weight: bold;");
        const sorts =['favorite', 'pv', 'recent', 'posted_at', 'created_at', 'random'];
        for (const s of sorts) {
            const data = await fetchList({ sort: s, per_page: 5 });
            if (data.items && data.items.length > 0) {
                const sample = data.items.map(i => i.id).join(', ');
                console.log(`✅ 排序: ${s.padEnd(10)} -> 成功获取列表 IDs: [${sample}]`);
            } else {
                console.log(`❌ 排序: ${s.padEnd(10)} -> 后端可能不支持或返回为空`);
            }
        }
    }

    // --------------------------------------------------------
    // 测试 3：隐藏详情接口 & relatives (相关视频) 获取
    // 目的：既然 POST /api/media/{url_cd}/favorite 返回了完整的视频信息和 relatives，
    // 那么很有可能存在 GET /api/media/{url_cd} 直接获取这些信息，而不需要点赞。
    // --------------------------------------------------------
    async function testDetailEndpoint() {
        console.log("%c\n▶ 测试 3: 单体视频详情页探针 (包含相关视频)", "color: #FE2C55; font-weight: bold;");
        // 先随便获取一个视频的 url_cd
        const listData = await fetchList({ per_page: 1 });
        if (!listData.items.length) return;
        
        const targetCd = listData.items[0].url_cd;
        console.log(`抓取到测试目标 url_cd: ${targetCd}`);

        try {
            const res = await fetch(`${BASE_URL}/api/media/${targetCd}`, { headers: { 'accept': 'application/json' }});
            if (res.ok) {
                const detail = await res.json();
                console.log(`✅ GET 详情接口存在！获取成功。`);
                console.log(`视频包含 ${detail.relatives ? detail.relatives.length : 0} 个相关视频 (relatives)。`);
                if (detail.relatives && detail.relatives.length > 0) {
                     console.log("第一个相关视频直链:", detail.relatives[0].url);
                }
            } else {
                console.log(`❌ GET 详情接口不可用 (HTTP ${res.status})，看来只能通过 POST /favorite 触发详细信息返回。`);
            }
        } catch (e) {
            console.error("测试详情接口出错:", e);
        }
    }

    // --------------------------------------------------------
    // 测试 4：ids 参数批量查询功能
    // 目的：测试通过 ids 参数，是否可以一次性传入多个 ID 获取他们的数据（这对于同步已缓存的视频最新数据很有用）。
    // --------------------------------------------------------
    async function testIdsParam() {
        console.log("%c\n▶ 测试 4: ids 参数批量查询探针", "color: #FE2C55; font-weight: bold;");
        const listData = await fetchList({ per_page: 3 });
        const idsArray = listData.items.map(i => i.id);
        const idsString = idsArray.join(',');
        
        console.log(`尝试使用 ids 参数请求: ${idsString}`);
        const data = await fetchList({ ids: idsString, per_page: 50 });
        if (data.items) {
            console.log(`✅ 成功获取 ${data.items.length} 条数据，验证了 ids 参数的作用是通过特定 ID 获取列表。`);
        }
    }

    // 执行测试链
    await testPerPageLimit();
    await testSortMethods();
    await testDetailEndpoint();
    await testIdsParam();
    
    console.log("%c\n[探针结束] API 测试完毕。你可以在控制台查看测试结果并调整你的油猴脚本了！", "color: #25F4EE; font-weight: bold;");
})();


测试结果：
[API 探针] 正在初始化...
VM91:26 ▶ 测试 1: per_page 极限测试
Promise {<pending>}
VM91:31 请求 per_page: 50 -> 实际返回数量: 50 (总数: 238693)
VM91:31 请求 per_page: 100 -> 实际返回数量: 100 (总数: 238693)
VM91:31 请求 per_page: 500 -> 实际返回数量: 500 (总数: 238693)
VM91:31 请求 per_page: 1000 -> 实际返回数量: 1000 (总数: 238693)
VM91:47 ▶ 测试 2: 排序参数(sort)探针
VM91:53 ✅ 排序: favorite   -> 成功获取列表 IDs: [384018, 358310, 357750, 370829, 392923]
VM91:53 ✅ 排序: pv         -> 成功获取列表 IDs: [358310, 384018, 373281, 357750, 341177]
VM91:53 ✅ 排序: recent     -> 成功获取列表 IDs: [384018, 358310, 357750, 370829, 392923]
VM91:53 ✅ 排序: posted_at  -> 成功获取列表 IDs: [384018, 358310, 357750, 370829, 392923]
VM91:53 ✅ 排序: created_at -> 成功获取列表 IDs: [384018, 358310, 357750, 370829, 392923]
VM91:53 ✅ 排序: random     -> 成功获取列表 IDs: [384018, 358310, 357750, 370829, 392923]
VM91:66 ▶ 测试 3: 单体视频详情页探针 (包含相关视频)
VM91:72 抓取到测试目标 url_cd: ow3bjnE6H1OCIuAn
VM91:78 ✅ GET 详情接口存在！获取成功。
VM91:79 视频包含 0 个相关视频 (relatives)。
VM91:96 ▶ 测试 4: ids 参数批量查询探针
VM91:101 尝试使用 ids 参数请求: 384018,358310,357750
VM91:104 ✅ 成功获取 3 条数据，验证了 ids 参数的作用是通过特定 ID 获取列表。
VM91:114 [探针结束] API 测试完毕。你可以在控制台查看测试结果并调整你的油猴脚本了！

---
curl 'https://twitter-ero-video-ranking.com/api/media' \
  -H 'accept: */*' \
  -H 'accept-language: zh-CN,zh;q=0.9,fr;q=0.8' \
  -H 'content-type: application/json' \
  -b '_ga=GA1.1.429978307.1773286704; _ga_K6DMSSKBCK=GS2.1.s1773290602$o2$g1$t1773294011$j60$l0$h0' \
  -H 'dnt: 1' \
  -H 'origin: https://twitter-ero-video-ranking.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://twitter-ero-video-ranking.com/zh-CN' \
  -H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' \
  --data-raw '{"url":"https://x.com/manateelazycat/status/2031903900253765762?s=20","status":"public","saved_from_lang":"zh-CN"}'

{"message":"メディアが正常に追加されました","data":{"url_cd":"W77BxPcEnmuAeDEx","url":"https://video.twimg.com/amplify_video/2031685517721632769/vid/avc1/2160x3840/W77BxPcEnmuAeDEx.mp4?tag=21","time":25.35,"thumbnail":"https://pbs.twimg.com/amplify_video_thumb/2031685517721632769/img/C3FiZp7NeMozoSEe.jpg"}}