# Mobile about:blank Takeover Bypass

- **Subject:** Userscript initialization and document hijacking on mobile browsers.
- **Env:** Tampermonkey, iOS Safari / WebKit-based mobile browsers.
- **Runtime Scope:** `【TM-ONLY】`
- **Issue:** On mobile Safari or other mobile WebKit browsers, calling `document.open()` during `@run-at document-start` changes the active document's URL to `about:blank`. This resets `window.location.origin` to `"null"`, which breaks relative/same-origin fetches and triggers CORS blocks (shown as "网络链路中断").
- **Solution:** Detect mobile devices and bypass `document.open()` / `document.write()`. Instead, rely on Layer 1's `window.stop()` (which stops parser loading the rest of the HTML) and directly update `document.documentElement.innerHTML` with the injected layout. This preserves the original page URL and origin.
- **Action_Steps:**
  In `main.ts` entry point:
  ```typescript
  // ✅ GOOD: Conditional cleansing depending on device platform
  const _isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                    (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0);

  if (_isMobile) {
      // Mobile: Write directly to innerHTML to avoid resetting the URL bar to about:blank
      document.documentElement.innerHTML = _htmlContent;
  } else {
      // Desktop: Use document.open / document.write to cleanly wipe everything
      document.open();
      document.write('<!DOCTYPE html><html lang="zh-CN">' + _htmlContent + '</html>');
      document.close();
  }
  ```
- **AI_Guidance:**
  - **NEVER** call `document.open()` unconditionally at `document-start` for scripts running on mobile.
  - **ALWAYS** check device touch/agent status to bypass document.open on mobile.
