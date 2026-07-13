# Agent guide — apn-idle-game

Instructions for coding agents working in this repo.

## What this is

**APN Idle** is a zero-dependency, vanilla ES-module + Canvas 2D idle mini-game for
[allpatchnotes.com](https://allpatchnotes.com). Players clear feed noise, collect
Notes, ship for permanent Rep/Boosts, and prestige for Live Mult (weapon resets) — while learning APN brand language.

## Non-negotiables

1. **No npm required for play.** Keep the runtime path as static files served by any HTTP server.
2. **Domain purity.** Combat math and economy live in `js/formulas.js` + `js/game.js`. UI and canvas read state; they do not invent balance rules.
3. **Headless tests must pass:** `node qa/run-tests.mjs`
4. **Brand IP.** Host mascot, crimson APN palette, feed-noise enemies. Do not copy Idle Miner / third-party characters.
5. **Plain language UI.** Prefer “Upgrade Weapon”, “Damage / Crit / Skills”, “Burst Hit” over jargon. Full copy rules: [brand/NAMING.md](./brand/NAMING.md).
6. **Design system is law.** Colors/sizes come from [brand/tokens.css](./brand/tokens.css); widgets from [brand/COMPONENTS.md](./brand/COMPONENTS.md); mascot from [brand/MASCOT-CANON.md](./brand/MASCOT-CANON.md). One color, one job. No new raw hex.

## Where to look first

Read [docs/00_START_HERE.md](./docs/00_START_HERE.md) — it maps every doc and says
which one is the **source of truth** for a given topic. Check
[docs/VISION.md](./docs/VISION.md) pillars + non-goals before proposing anything,
and [docs/GLOSSARY.md](./docs/GLOSSARY.md) before naming anything. Stack decisions
are settled in [docs/decisions/](./docs/decisions/) — do **not** reopen the
React/Pixi question ([ADR-0001](./docs/decisions/ADR-0001-vanilla-stack.md)) without a new ADR.

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
- [ ] Cache-bust `?v=` on `index.html` CSS/JS only when shipping UX that must invalidate CDN caches
- [ ] No force-push to `main`
