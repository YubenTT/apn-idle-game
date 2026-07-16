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

## Deploy truth (go-live v2)

`main` is **not** auto-deployed. Deploy is the **manual copy** of the static build
into `apn-web` (the `apn-web/public/idle/` layout above); no pipeline publishes
`main` on merge. Plan v2 keeps this manual reality for launch (PR-10 non-goal: no
auto-deploy build-out).

- **The save key documented here is stale.** This file references
  `apn_idle_save_v1`, but the save bumps to **v3** in PR-1 (with a write-guard).
  The EMBED key fix (`v1` → `v3`) and rollback semantics are **PR-10** scope —
  deferred per plan v2, flagged here so no one ships the v1 key.
- **Rollback must preserve Go Live receipts.** A rollback of the embedded build may
  not discard shipped-checkpoint receipts; PR-10 defines the reversible deploy step
  and the rollback test.
- The integration branch `release/go-live-v3` holds the whole chain; the single
  merge to `main` happens at **PR-10** after the ship/no-ship owner gate.

## Health check after deploy

1. Hard refresh, title → Play  
2. Kill once, Signal increases  
3. Sprint hold drains Energy, DPS rises  
4. `localStorage` key `apn_idle_save_v1` present after ~6s  
