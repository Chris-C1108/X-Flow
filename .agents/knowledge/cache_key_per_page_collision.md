# 缓存键污染导致列表仅 3 条

- **Subject:** 点击左侧榜单（`日榜/周榜/月榜`）和右侧排序后，`media-grid` 仅显示 3 条视频
- **Env:** Userscript + `PoolManager`/`CacheManager`，Hero 预加载 `perPage=3`，主列表默认 `perPage=50`
- **Issue:** 缓存 key 仅由 `isAnimeOnly|range|sort` 组成，未纳入 `perPage/category`。Hero 写入的 3 条缓存会被主列表误命中，导致主列表只显示 3 条。
- **Solution:** 缓存 key 必须包含查询维度全集（至少 `category`、`perPage`）；Hero 查询显式固定 `perPage:3`，与读取路径保持一致。
- **Action_Steps:**
  ```ts
  // ✅ GOOD: key 包含所有影响结果集的维度
  public makeKey(q: QueryState): string {
    return [
      q.isAnimeOnly ? 1 : 0,
      q.range || 'daily',
      q.sort || 'favorite',
      q.category || '',
      q.perPage ?? 50,
    ].join('|');
  }

  // ❌ BAD: 忽略 perPage/category，导致 3 条与 50 条缓存互相污染
  public makeKey(q: QueryState): string {
    return [q.isAnimeOnly ? 1 : 0, q.range || 'daily', q.sort || 'favorite'].join('|');
  }
  ```

  ```ts
  // ✅ GOOD: Hero 全链路显式 perPage=3
  const query = { isAnimeOnly: isAnime, range: r.id, sort: 'favorite', perPage: 3 };
  const cached = this.pool.getCachedItems(query);
  if (!cached.length) await this.pool.preload(query);
  ```

- **AI_Guidance:**
  - **ALWAYS:** 为缓存键纳入“会影响结果集内容/条数”的全部字段
  - **ALWAYS:** 列表页与预加载页使用同一查询对象，避免隐式默认值分叉
  - **ALWAYS:** 出现“数据条数异常稳定（总是 3/10）”时优先排查缓存键碰撞
  - **NEVER:** 在不同 `perPage` 语义下复用同一缓存命名空间
  - **NEVER:** 仅凭 UI 侧症状判断 API 返回异常，先验证缓存命中路径
