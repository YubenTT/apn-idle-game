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
| Cache | One authority: `RUNTIME_BUILD_ID` in `js/cache.js`. Bump it and sweep every `?v=` token (`index.html` links plus every relative JS import) when shipping UX; `qa/check-runtime-cache.mjs` enforces it |
| Mobile | `viewport-fit=cover`, safe-area padding already in CSS |

## Versioning

Tag releases: `v1.0.0`, `v1.1.0`.  
The embedded build is never hand-copied — it is projected from a named source
commit; see **Deploy truth** below.

## Deploy truth

Merging `main` does not publish anything — there is no auto-deploy. But the
deploy is **not** a hand copy either: it is a deterministic, fail-closed
projection minted by one script in `apn-web`.

1. **Project the release** — `apn-web/scripts/sync-idle-game.mjs`
   (`npm run sync:idle-game`). It refuses to run unless the game checkout is
   clean `main` aligned to `origin/main` at `--expected-commit`, verifies the
   approved Hero `set.json` SHA-256 and every `assets/manifest.json` hash, then
   projects `LICENSE`, `brand/tokens.css`, `index.html`, `css/`, `js/`, and the
   manifested runtime assets into `apn-web/public/idle/`. It injects
   `<base href="/idle/">` into the deployed entrypoint, swaps the directory
   atomically, and writes `public/idle/release.json` carrying the source commit,
   `treeSha256`, per-file hashes, and a concrete `rollback` block built from
   `--previous-web-commit`. `--dry-run` builds into a temp directory and prints
   `source=` / `tree=` without touching `public/`.
2. **Deploy apn-web** — Cloudflare Workers via OpenNext:
   `npm run deploy:production` (run it with `--dry-run` first).
3. **Verify the live release** —
   `npm run smoke:idle-game -- --expected-source <commit> --expected-tree <treeSha256>`
   asserts the deployed `release.json` matches exactly what was projected and
   exposes a concrete rollback target; `npm run smoke:production` covers the
   wider site.

Rollback needs no reconstruction: the previous release (`apnWebCommit`,
`sourceCommit`, `treeSha256`) is pinned inside the live
`public/idle/release.json` under `rollback`. A rollback restores a whole prior
release tree, so Go Live checkpoint receipts in a player's save must survive it —
`js/save.js` keeps the journey capsule readable by the older schema for that
reason.

## Ship checklist

1. `node qa/run-tests.mjs` → `ALL PASS` (includes `check-runtime-cache`, so the
   `RUNTIME_BUILD_ID` bump must already be swept).
2. Browser smokes against `127.0.0.1:8791` (`PORT=8791 ./serve.sh`): route, Go Live,
   catalog/rights, build, gear — zero console errors, zero horizontal overflow.
3. `sync:idle-game` **dry-run** → real run; record the printed `source=` commit
   and `tree=` hash.
4. `deploy:production` **dry-run** → real deploy.
5. `smoke:idle-game -- --expected-source <commit> --expected-tree <tree>` plus
   `smoke:production`.
6. Manual browser readback of `https://allpatchnotes.com/idle/`.
7. Rollback pointer lives in `public/idle/release.json` → `rollback`; no other
   record is needed.

## Health check after deploy

1. Hard refresh, title → Play  
2. Kill once, Signal increases  
3. Sprint hold drains Energy, DPS rises  
4. `localStorage` key **`apn_idle_save_v2`** present after ~6s, with `v: 3`
   (`js/save.js`: `SAVE_KEY_V2`, `SAVE_VERSION = 3`). `apn_idle_save_v1` is
   read-only rollback evidence, not the key to check.
