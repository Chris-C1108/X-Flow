# same_origin_fetch_credentials

- **Subject:** Cloudflare same-origin fetch blocks and Chrome fetch TypeErrors
- **Env:** Tampermonkey Userscript, Chrome / Modern Browsers
- **Runtime Scope:** `【TM-ONLY】`
- **Issue:** Same-origin requests to AJAX endpoints (e.g. `/api/tweet` or `/templates/view_lists.php`) fail with 403 blocks because `GM_xmlhttpRequest` does not share page session cookies (`cf_clearance`). Native `fetch` falls back to `GM_xmlhttpRequest` due to a TypeError: "Request with GET/HEAD method cannot have body" when `body: undefined` is explicitly passed in options.
- **Solution:** 
  1. Build fetch options dynamically, omitting the `body` field entirely if the method is `GET` or `HEAD`.
  2. Set `credentials: 'include'` explicitly in native `fetch` requests to ensure cookies are sent.
- **Action_Steps:**
  ```typescript
  // ❌ BAD
  return fetch(options.url, {
      method: options.method,
      headers: options.headers,
      body: options.body, // Throws TypeError on GET/HEAD if present (even if undefined)
  });

  // ✅ GOOD
  const fetchOpts: RequestInit = {
      method: options.method,
      headers: options.headers,
      credentials: 'include', // Ensure Cloudflare cookies are sent
  };
  if (options.body && options.method !== 'GET' && options.method !== 'HEAD') {
      fetchOpts.body = options.body;
  }
  return fetch(options.url, fetchOpts);
  ```
- **AI_Guidance:**
  - **ALWAYS** set `credentials: 'include'` for same-origin native `fetch` calls to inherit active Cloudflare session cookies.
  - **NEVER** assign the `body` key to the options object of a native `fetch` request if the method is `GET` or `HEAD`.
