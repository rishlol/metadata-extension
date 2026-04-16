# metadata

A browser extension that inspects the storage of any website — localStorage, sessionStorage, cookies, and Cache API entries — in a clean popup.

## Files

```
manifest.json   extension config
popup.html      popup UI
popup.css       styles
popup.js        logic (reads storage from the active tab)
```

## Installation

### Chrome / Edge

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder

### Firefox

1. Go to `about:debugging`
2. Click **This Firefox**
3. Click **Load Temporary Add-on**
4. Select `manifest.json` inside this folder

> Firefox temporary add-ons are removed when the browser closes. For a persistent install without publishing, the extension needs to be [signed by Mozilla](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## Usage

Navigate to any website and click the extension icon. The popup shows:

- **localStorage** — key/value pairs stored for the origin
- **sessionStorage** — key/value pairs for the current session
- **Cookies** — all cookies including HttpOnly ones (via the extension API)
- **Cache API** — URLs stored by service workers or the page

JSON values are automatically pretty-printed.

The **Open** button opens the current data as a fully styled standalone HTML page in a new tab.

## Built with

Developed using [Cursor](https://cursor.com) (AI-assisted IDE).

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the URL of the current tab |
| `scripting` | Inject a script to read localStorage, sessionStorage, and caches from the tab |
| `cookies` | Access cookies (including HttpOnly) via the browser API |
| `host_permissions: <all_urls>` | Required for cookie access across all domains |
