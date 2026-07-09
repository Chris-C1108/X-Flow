# API Range 参数映射：daily 需传空字符串

- **Subject:** `/api/media` 的 `range` 查询参数与原站行为不一致
- **Env:** `twitter-ero-video-ranking.com` / `x-ero-anime.com`，API endpoint `/api/media`
- **Issue:** 传 `range=daily` 给后端 API 时，后端不识别该值，静默回退为与 `range=all` 相同的结果（全量排序），导致日榜显示的数据和总榜完全一致。
  ```
  // ❌ BAD — range=daily 返回的是总榜数据
  GET /api/media?range=daily&sort=favorite → id=384018 fav=1883 (2026-02-06)
  GET /api/media?range=all&sort=favorite   → id=384018 fav=1883 (2026-02-06)  ← 一模一样！

  // ✅ GOOD — range= (空) 返回真正的日榜数据
  GET /api/media?range=&sort=favorite      → id=432041 fav=221 (2026-03-13)   ← 当日数据
  ```
- **Solution:** 在 `ApiClient.fetchList()` 中建立 range 参数映射表，将 UI 层的 `"daily"` 转换为 API 实际接受的空字符串 `""`。
- **Action_Steps:**
  ```typescript
  // ✅ GOOD — 在 ApiClient 中映射
  private static readonly RANGE_MAP: Record<string, string> = {
      daily: '',       // 后端日榜 = 空字符串
      weekly: 'weekly',
      monthly: 'monthly',
      all: 'all',
  };

  public async fetchList(params: FetchParams = {}) {
      const mappedRange = ApiClient.RANGE_MAP[params.range || 'daily'] ?? params.range ?? '';
      const finalParams = { ...params, range: mappedRange, ... };
  }

  // ❌ BAD — 直接传 range=daily
  const finalParams = { ...params }; // range: "daily" 被后端忽略
  ```
- **AI_Guidance:**
  - **ALWAYS:** 通过 `RANGE_MAP` 映射 UI range 值到 API 实际值
  - **ALWAYS:** UI 层继续使用 `"daily"` 语义值（按钮 data-range、缓存 key 等）
  - **NEVER:** 直接把 `"daily"` 传给 `/api/media?range=` — 后端会静默回退到全量排序
  - **ALWAYS:** 新增 range 选项前，先用 API 探针确认后端是否真正支持该值

## API 探针结论

| `range` 值 | 后端行为 | 返回内容 |
|------------|----------|----------|
| `""` (空) | ✅ 有效 — 日榜 | 仅当日 posted 的内容 |
| `"weekly"` | ✅ 有效 — 周榜 | 近 7 天内容 |
| `"monthly"` | ✅ 有效 — 月榜 | 近 30 天内容 |
| `"all"` | ✅ 有效 — 总榜 | 全部历史内容 |
| `"daily"` | ❌ 无效 — 回退到 all | 与 `range=all` 相同 |
