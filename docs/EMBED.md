# Embed on allpatchnotes.com

## Recommended

Ship the folder as static assets:

```text
apn-web/public/idle/
  index.html
  css/
  js/
  assets/
```

Route: `https://allpatchnotes.com/idle` or `/play`.

### iframe (if isolated chrome is preferred)

```html
<iframe
  src="/idle/"
  title="APN Idle"
  loading="lazy"
  style="width:100%;max-width:480px;height:min(90dvh,720px);border:0;border-radius:12px"
  allow="autoplay"
></iframe>
```

## Constraints

| Topic | Note |
|-------|------|
| Backend | None for v1 |
| Save | `localStorage` origin-scoped to the page host |
| CSP | Allow `'self'` scripts; WebAudio needs user gesture (already gated) |
| Cache | Bump `?v=` on CSS/JS links in `index.html` when shipping UX fixes |
| Mobile | `viewport-fit=cover`, safe-area padding already in CSS |

## Versioning

Tag releases: `v1.0.0`, `v1.1.0`.  
Embed can pin a path or copy a release artifact into `apn-web`.

## Health check after deploy

1. Hard refresh, title → Play  
2. Kill once, Signal increases  
3. Sprint hold drains Energy, DPS rises  
4. `localStorage` key `apn_idle_save_v1` present after ~6s  
