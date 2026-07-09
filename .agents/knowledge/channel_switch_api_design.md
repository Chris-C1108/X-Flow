# Channel Switch: 使用 Query Parameter 而非 Base URL

- **Subject:** 次元切换（Real/Anime Channel Switch）的 API 调用方式
- **Env:** Tampermonkey userscript, `x-ero-anime.com` / `twitter-ero-video-ranking.com`
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** 之前的实现在切换频道时修改了 `baseUrl`（从 `twitter-ero-video-ranking.com` 切换到 `x-ero-anime.com`），导致跨域 CORS 请求失败。用户脚本运行在 A 域名上，却试图向 B 域名发送请求。
  ```typescript
  // ❌ 错误做法 — 切换 baseUrl
  public setChannel(isAnimeChannel: boolean) {
      if (isAnimeChannel) {
          this.baseUrl = 'https://x-ero-anime.com';   // CORS!
          this.isAnime = 1;
      } else {
          this.baseUrl = 'https://twitter-ero-video-ranking.com';
          this.isAnime = 0;
      }
  }
  ```
- **Solution:** 通过 API 探针测试证实：**两个站点共享完全相同的后端 API (`/api/media`)**，内容的区分仅依赖查询参数 `isAnimeOnly=0|1`。因此频道切换只需要翻转该参数，`baseUrl` 始终保持为 `window.location.origin`（即用户当前访问的域名），杜绝跨域问题。
- **Action_Steps:**
  ```typescript
  // ✅ GOOD — 仅切换查询参数
  export class ApiClient {
      private readonly baseUrl: string;
      private isAnime: number;

      constructor() {
          this.baseUrl = window.location.origin;
          this.isAnime = 0; // 默认 Real
      }

      public setChannel(isAnimeChannel: boolean) {
          // baseUrl 永远不变，始终是 window.location.origin
          this.isAnime = isAnimeChannel ? 1 : 0;
      }

      public async fetchList(params: FetchParams = {}) {
          const finalParams = {
              ...params,
              isAnimeOnly: this.isAnime.toString(),
          };
          const url = new URL(`${this.baseUrl}/api/media`);
          // ...
      }
  }
  ```

  **修改步骤：**
  1. `ApiClient.ts` → `setChannel()` 方法：删除 `this.baseUrl` 赋值，只修改 `this.isAnime`。
  2. `constructor()` → `this.baseUrl` 固定为 `window.location.origin`，声明为 `readonly`。
  3. `isAnime` 初始值 = `0`（默认 Real），由 UI 层调用 `setChannel(true/false)` 切换。
- **AI_Guidance:**
  - **ALWAYS:** 当你看到 `setChannel`、`channel switch`、`baseUrl`、`isAnimeOnly`、`anime`、`real` 等关键词时，必须首先回顾本经验。
  - **ALWAYS:** `baseUrl` 固定为 `window.location.origin`，声明为 `readonly`。
  - **ALWAYS:** 频道切换仅操作 `isAnimeOnly` 查询参数。
  - **NEVER:** 在 userscript 环境下动态切换 `baseUrl` 到另一个域名——同源策略会导致 CORS 失败。
  - **NEVER:** 尝试用 `GM_xmlhttpRequest` 绕过跨域限制来切换域名——这是架构错误，不是网络问题。

---

## API 探针结论摘要

| 测试项 | 结论 |
|--------|------|
| `per_page` 上限 | 后端无硬性限制，`per_page=1000` 可正常返回，但建议默认 50 分页请求避免限流 |
| `sort` 参数 | `favorite` 和 `pv` 返回不同排序；`recent` / `posted_at` / `created_at` / `random` 均回退到默认排序 |
| GET 详情 `/api/media/{url_cd}` | ✅ 可用，但不返回 `relatives` |
| `ids` 批量查询 | ✅ 可用，传入逗号分隔 ID 可精确查询 |
