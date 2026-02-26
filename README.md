# JioCinema Ad Muter

This Chrome extension automatically mutes supported JioCinema tabs when ad indicators are detected in the page DOM.

## What's updated

- Migrated ad detection from a brittle class selector to a configurable rule list.
- Added support for the provided `Ad` indicator span (XPath + robust fallback locators).
- Improved mute/unmute logic to operate on the sender tab only.
- Added guardrails so only tabs muted by this extension are auto-unmuted.
- Reduced permissions to least privilege (`storage`, `tabs`) for better Chrome policy alignment.

## Ad indicator configuration (future-proof)

Detection rules live in `js/contentScript.js` under:

```js
const AD_INDICATOR_RULES = [ ... ];
```

To add a new indicator (Element 2, Element 3, etc.), append another rule object:

```js
{
  id: "new-indicator-id",
  textEquals: "Ad",
  locators: [
    { type: "css", query: "span.some-selector" },
    { type: "xpath", query: "//*[@data-testid='new-indicator']" }
  ]
}
```

Supported locator types:

- `css` via `querySelectorAll`
- `xpath` via `document.evaluate`

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project folder.
5. Open/reload a supported JioCinema tab.

## Chrome Web Store compliance notes

- Manifest V3 extension (service worker background script).
- No remote code execution.
- No collection or transmission of personal/sensitive user data.
- Uses minimal permissions needed for functionality.

See [`PRIVACY.md`](./PRIVACY.md) for the privacy statement.
