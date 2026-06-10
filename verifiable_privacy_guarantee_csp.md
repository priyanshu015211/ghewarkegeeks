# Verifiable Privacy Guarantee (CSP)

## Overview
A **Content Security Policy (CSP)** provides a strict, browser-enforced guarantee that your extension cannot silently transmit data to external servers. By setting `connect-src 'none'`, we technically prove to users and security auditors that the extension runs 100% offline and handles their private AI prompts locally.

## Implementation Steps

### 1. Update `manifest.json`
We need to add a strict `content_security_policy` to our manifest. Since Chrome Extensions use Manifest V3, the CSP structure specifically targets extension pages (like the popup and offscreen document).

Open `manifest.json` and add the following block:

```json
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'none';"
  }
```

### Breakdown of the Rules:
- **`script-src 'self' 'wasm-unsafe-eval'`**: Allows execution of our bundled Javascript and the WebAssembly (`.wasm`) ONNX runtime required for `toxic-bert`.
- **`object-src 'self'`**: Prevents injection of external plugins (like Flash).
- **`connect-src 'none'`**: **This is the core privacy guarantee.** It completely blocks `fetch()`, `XMLHttpRequest`, and WebSockets from reaching out to any external domain (e.g., `google.com`, `analytics.com`, or any malicious endpoint).

## Verification
1. Open Chrome and go to `chrome://extensions`.
2. Reload the `GhewarkeGeeks` extension.
3. If any part of the extension attempts to make a network request, Chrome will block it and log a red `Content Security Policy` violation error in the console.

> **Note on Future Auto-Updates:** 
> When we implement the "Silent Auto-Update" feature later, we will need to slightly relax this policy (e.g., `connect-src https://github.com/priyanshu015211/`) so that the extension is specifically allowed to fetch the new `.onnx` models from your trusted domain, while still blocking all other outgoing traffic.
