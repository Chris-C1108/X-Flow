# Like/Bookmark 跨域持久化 — GM_setValue 方案

- **Subject:** Like（点赞）和 Bookmark（收藏）状态需要跨域（real/anime 两域）持久化保存
- **Env:** Tampermonkey + vite-plugin-monkey + GM API
- **Runtime Scope:** 【TM-ONLY】（v7 Pages 独立站默认忽略）
- **Issue:** 原 Like 仅 toggle CSS class 不持久化，刷新即丢失；原 Bookmark 使用 localStorage 不跨域
- **Solution:** 统一使用 `GM_setValue` / `GM_getValue` 保存 likes 和 bookmarks 的 Set 数据（跨域共享）
- **Action_Steps:**

```typescript
// ✅ GOOD — GM_setValue 跨域持久化
import { loadGM, saveGM, STORAGE_KEYS } from '../engine/Storage';

this.likes = new Set(loadGM(STORAGE_KEYS.LIKES, []) as string[]);
this.bookmarks = new Set(loadGM(STORAGE_KEYS.BOOKMARKS, []) as string[]);

// 切换时保存
this.likes.add(id);
saveGM(STORAGE_KEYS.LIKES, Array.from(this.likes));

// ❌ BAD — localStorage 不跨域
this.bookmarks = new Set(loadJSON(STORAGE_KEYS.BOOKMARKS, []) as string[]);
saveJSON(STORAGE_KEYS.BOOKMARKS, Array.from(this.bookmarks));
```

- **AI_Guidance:**
  - ALWAYS use `GM_setValue` / `GM_getValue` for user preference data that needs to persist across real/anime domains
  - ALWAYS serialize Set to Array before saving (JSON.stringify)
  - NEVER use localStorage for cross-domain shared state
  - ALWAYS sync UI state (classList toggle) with persistence layer in the same click handler
