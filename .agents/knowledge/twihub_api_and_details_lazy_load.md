# Twihub API & Details Lazy Load

- **Subject:** SvelteKit cursor pagination and lazy loading detail HTML & redirect resolution
- **Env:** SvelteKit API (/api/v1/posts), HTML parsing, HTTP redirects
- **Runtime Scope:** Both Userscript and Web mode
- **Issue:** The upgraded `twihub.net` REST API `/api/v1/posts` only returns post metadata (`postId`, `thumbnailUrl`, `likesCount`, `firstVideoDuration`). It does not provide tweet accounts, descriptions, or direct video stream URLs.
- **Solution:** 
  1. We fetch post lists using SvelteKit's cursor-based pagination parameters (`type`, `cursor`, `limit`).
  2. We initialize post items with placeholder values for details (`title`, `tweet_account`, `url`).
  3. When a post is scrolled into view or preloaded, we lazily call `loadDetails(item)` which fetches the post's HTML detail page `/posts/[postId]`, parses the video path `/r/v/[mediaId]`, and follows the redirect to resolve the final `video.twimg.com` CDN stream URL.
  4. For the independent Web mode, we proxy these requests through Cloudflare Pages Functions to bypass CORS.

- **Action_Steps:**
  - **Fetching Details & Redirects in Userscript mode:**
    ```typescript
    // fetch detail HTML page
    const res = await this.runtime.http.request<string>({
        method: 'GET',
        url: `https://twihub.net/posts/${postId}`,
        headers: { Accept: 'text/html' }
    });
    // parse DOM
    const doc = new DOMParser().parseFromString(res.text, 'text/html');
    const videoPath = doc.getElementById('video-link')?.getAttribute('href');
    
    // Resolve final CDN url via redirect following
    const redirectRes = await this.runtime.http.request<string>({
        method: 'GET',
        url: `https://twihub.net${videoPath}`
    });
    const videoUrl = redirectRes.finalUrl; // final redirected destination
    ```

- **AI_Guidance:**
  - **ALWAYS:** Load details lazily for current and adjacent nodes to avoid mass fetching which triggers Cloudflare anti-bot blocks.
  - **ALWAYS:** Keep `video.oncanplay` and other handlers defensive when waiting for details to load asynchronously.
  - **NEVER:** Attempt to guess the twitter video CDN URL format from the thumbnail ID, as media slugs are unpredictable.
