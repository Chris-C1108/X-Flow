# Pages Functions 部署：Production vs Preview 环境变量隔离

- **Subject:** Cloudflare Pages Functions 部署后环境变量（secrets）不生效
- **Env:** Wrangler 4.83.0, Cloudflare Pages
- **Issue:** `wrangler pages secret put` 设置的 secrets 仅在 Production 环境可用；`wrangler pages deploy` 默认部署到 Preview 环境，导致 `env.UPSTREAM_ORIGIN` 为 undefined
- **Solution:**
  1. 部署时必须指定 `--branch main` 以触发 Production 部署
  2. Secrets 设置后需重新部署才能生效
  3. Preview 部署的 URL 格式为 `https://{hash}.x-flow-app.pages.dev`，Production URL 为 `https://x-flow-app.pages.dev`
- **Action_Steps:**
  ```bash
  # ✅ GOOD — 部署到 Production（--branch main 匹配 production-branch）
  npx wrangler pages deploy dist/web --project-name x-flow-app --branch main

  # ❌ BAD — 默认部署到 Preview，secrets 不可用
  npx wrangler pages deploy dist/web --project-name x-flow-app

  # ✅ GOOD — 设置 secrets
  npx wrangler pages secret put UPSTREAM_ORIGIN --project-name x-flow-app

  # ✅ GOOD — 验证 secrets
  npx wrangler pages secret list --project-name x-flow-app
  ```
- **AI_Guidance:**
  - ALWAYS use `--branch main` when deploying Pages to Production
  - ALWAYS re-deploy after setting secrets
  - NEVER assume Preview deployments have access to production secrets
  - Check `wrangler pages deployment list` to verify Environment column shows "Production"
