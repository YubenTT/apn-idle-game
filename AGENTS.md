# Agent guide — apn-idle-game

Instructions for coding agents working in this repo.

## What this is

**APN Idle** is a zero-dependency, vanilla ES-module + Canvas 2D idle mini-game for
[allpatchnotes.com](https://allpatchnotes.com), live at `/idle/`. Players clear feed noise, collect
Notes, and **Go Live**: the single prestige checkpoint (first at zone 10, then every 20) that banks
Notes into permanent Rep (spent on Boosts) and grows Live Mult ([ADR-0008](./docs/decisions/ADR-0008-go-live-sole-checkpoint.md)) — while learning APN brand language.

## Non-negotiables

1. **No npm required for play.** Keep the runtime path as static files served by any HTTP server.
2. **Domain purity.** Combat math and economy live in `js/formulas.js` + `js/game.js`. UI and canvas read state; they do not invent balance rules.
3. **Headless tests must pass:** `node qa/run-tests.mjs`
4. **Brand IP.** Host mascot, crimson APN palette, feed-noise enemies. Do not copy Idle Miner / third-party characters.
5. **Plain language UI.** Use the shipped vocabulary: “Upgrade Scanner”, “Go Live”, “Route”, “Wave n/10”. “Upgrade Weapon”, “Ship Notes” and “End Season” are retired, banned copy (`qa/check-copy.mjs` fails on them). Full copy rules: [brand/NAMING.md](./brand/NAMING.md).
6. **Design system is law.** Colors/sizes come from [brand/tokens.css](./brand/tokens.css); widgets from [brand/COMPONENTS.md](./brand/COMPONENTS.md); mascot from [brand/MASCOT-CANON.md](./brand/MASCOT-CANON.md). One color, one job. No new raw hex.

## Where to look first

Current state: the newest entry at the top of [progress.md](./progress.md). Current design:
[docs/product/RECONCILIATION.md](./docs/product/RECONCILIATION.md) and the go-live v2 plan
(`docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-v2.md`). `docs/00_START_HERE.md`,
`README.md`, `docs/ROADMAP.md` and `docs/GLOSSARY.md` still teach the retired Ship Notes + End Season
prestige model (see their banners). Check [docs/VISION.md](./docs/VISION.md) pillars + non-goals
before proposing anything, and [brand/NAMING.md](./brand/NAMING.md) before naming anything. Stack
decisions are settled in [docs/decisions/](./docs/decisions/) — do **not** reopen the
React/Pixi question ([ADR-0001](./docs/decisions/ADR-0001-vanilla-stack.md)) without a new ADR.

## Release

Merging `main` publishes nothing. The live `/idle/` build is projected from a named commit by
apn-web `npm run sync:idle-game` (`scripts/sync-idle-game.mjs`), which writes
`public/idle/release.json`; see "Deploy truth" in [docs/EMBED.md](./docs/EMBED.md).

## Layout

```
index.html          HUD shell
css/game.css        Layout + chrome
js/
  main.js           Bootstrap, input, loop
  game.js           State, combat step, economy actions
  formulas.js       Balance constants + pure math
  content.js        Skills, meta, tips, ticker
  render.js         Canvas draw
  ui.js             Sheets, HUD bind
  save.js           localStorage
  sfx.js            WebAudio
  icons.js          Build SVG icons
  comedy.js         Quips
assets/             Mascot, enemies, ticker icons
docs/               Design + architecture
qa/                 Headless tests + screenshots
```

## How to change balance

Edit `js/formulas.js` (`C` object) and re-run `node qa/run-tests.mjs`.
Document non-trivial curves in `docs/BALANCE.md`.

## How to add a skill

1. Add entry to `SKILLS` in `js/content.js` (name, desc, req, type, max).
2. Wire effects in `combatStats` / cast helpers in `js/game.js`.
3. Add icon key in `js/icons.js` if needed.
4. Shortcut chip in `index.html` + `ui.js` if active/toggle.
5. Test with `node qa/run-tests.mjs`.

## PR checklist (agents)

Full gate: [docs/DEFINITION-OF-DONE.md](./docs/DEFINITION-OF-DONE.md). Minimum:

- [ ] `node qa/run-tests.mjs` → ALL PASS
- [ ] Docs updated per [docs/DOC-UPDATE-POLICY.md](./docs/DOC-UPDATE-POLICY.md)
- [ ] Tokens + components only (no raw hex / off-scale sizes)
- [ ] No secret keys or local save dumps committed
- [ ] Docs updated if loop / currency / architecture changed
- [ ] Shipping UX: bump `RUNTIME_BUILD_ID` in `js/cache.js` and sweep every `?v=` token (`index.html` links plus every relative JS import); `qa/check-runtime-cache.mjs` (run by `qa/run-tests.mjs`) enforces it
- [ ] No force-push to `main`
