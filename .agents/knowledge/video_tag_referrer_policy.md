# video_tag_referrer_policy

- **Subject:** Twitter CDN video load block (403 Forbidden)
- **Env:** Tampermonkey Userscript, Twitter Media CDN (`video.twimg.com`)
- **Runtime Scope:** `【TM-ONLY】`
- **Issue:** Setting `referrerpolicy="no-referrer"` directly on the `<video>` tag triggers browser conflicts with the document-level meta tag in some runtimes, sending a referrer to `video.twimg.com` and resulting in 403 Forbidden errors.
- **Solution:** Remove `referrerpolicy` from the `<video>` tag and rely entirely on document-level `<meta name="referrer" content="no-referrer">` injected during sandbox startup.
- **Action_Steps:**
  ```html
  <!-- ❌ BAD -->
  <video class="tm-video" referrerpolicy="no-referrer"></video>

  <!-- ✅ GOOD -->
  <video class="tm-video"></video>
  ```
- **AI_Guidance:**
  - **ALWAYS** remove `referrerpolicy` attributes from `<video>` tags when loading Twitter media streams.
  - **ALWAYS** ensure `<meta name="referrer" content="no-referrer">` is injected at the document level during takeover.
