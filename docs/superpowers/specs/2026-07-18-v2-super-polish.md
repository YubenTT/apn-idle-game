# V2 Super Polish — master spec (owner-mandated)

> **Status:** binding for the `v2/super-polish` branch. Ordered by the owner on
> 2026-07-18: *"Bağımlılık yaratıcı, görsel olarak overly satisfy eden — perfect
> şekilde, ilerleme hazzıyla birlikte allpatchnotes.com'un tüm benliğiyle. Dünyanın
> en iyi idle oyunu olacak."* The owner explicitly authorizes root-level changes to
> prior asset/standard decisions where they conflict ("aykırı varsa kökten
> değiştirebiliriz"), while the current state stays restorable via
> `backup/pre-v2-super-polish`.

## North star for V2

In the first 3 seconds the player must feel: **a living APN world, a hero with
character, enemies worth popping, and progress worth chasing.** Every frame should
look intentional; every kill, rank, and zone should *feel* like a reward.

Stand-alone quality first; the allpatchnotes.com embed remains a supported surface.

## What changes (owner override log)

| Prior rule | V2 decision | Recorded in |
|---|---|---|
| Host ships only as GLB-derived atlas (ADR-0003/0005/0010 pipeline) | Host V2 is a **procedural Canvas character** with real per-frame animation, keeping the silhouette DNA (big spherical head, integrated black visor, slim body, short arms). GLB files remain in repo history, untouched. | ADR-0012 (this branch) |
| Enemies ship as pack atlases + static PNG fallbacks | Pack atlases stay as zone flavor, but ALL targets get a unified **presentation layer** (shadow, spawn pop, hit squash, death burst). Fallback enemies become a fully procedural feed-noise creature family. | this spec |
| Backgrounds = sparse pack plates | Layered editorial parallax world: pack plate (when present) becomes the far layer; procedural mid/near layers, atmosphere, and per-zone seeded moods on top. | this spec |
| Flat chrome, minimal motion | Juicy UI: animated counters, press physics, sheet springs, celebration banners, combo presence, damage vignette — all gated by reduced-motion + mute. | tokens + COMPONENTS |

## Non-negotiables that STILL bind

1. Zero-npm vanilla ES modules + Canvas 2D; static-file playable (ADR-0001).
2. Domain purity: combat/economy math only in `js/formulas.js` + `js/game.js`.
3. Token discipline: no new raw hex in `css/game.css`; one color = one job
   (crimson = APN primary/PATCH/LIVE; Signal blue; Notes rose; SP violet; Rep gold;
   positive green; Zone cyan).
4. Keep-5 navigation; Gear FAB; 44pt touch floors; safe areas.
5. Plain-language UI per `brand/NAMING.md`.
6. `node qa/run-tests.mjs` → ALL PASS after every wave (with
   `FFMPEG=$HOME/.local/bin/ffmpeg` on this machine; CI installs ffmpeg).
7. Reduced-motion + mute gates for every new effect.

## Wave plan

| Wave | Scope | Primary files |
|---|---|---|
| 1 · Art core | Procedural Host V2 (animated), procedural enemy family + target presentation, layered scenery w/ per-zone moods | `js/hero-v2.js` (new), `js/enemies-v2.js` (new), `js/scenery-v2.js` (new), `js/render.js`, `js/host-contract.js` |
| 2 · UI chrome | HUD chips, action dock, sheets, nav, typography, toasts/banners, onboarding hints, Gear niche hero | `index.html`, `css/game.css`, `js/ui.js`, `brand/tokens.css` (additive) |
| 3 · Juice & feel | Combat juice (hit stop, shake, particles, crit flash), celebrations (zone/rank/Go Live), combo presence, SFX enrichment | `js/game.js`, `js/render.js`, `js/sfx.js`, `js/ui.js` |
| 4 · QA & ship-readiness | Full suites, Chrome screenshot matrix review, perf check, docs + ADR-0012 + CHANGELOG, preview server | `qa/*`, docs, `package.json` (dev script only) |

## Acceptance (V2 gate)

- [ ] Host reads as ONE character with a locked silhouette, visibly animated
      (run cycle, idle breathe, attack anticipation, crit, flinch, level, defeat).
- [ ] Every zone reads as a distinct editorial scene; no empty black stages.
- [ ] Every kill/rank/zone/Go Live produces visible, gated celebration feedback.
- [ ] HUD numbers animate; CTAs have press physics; sheets spring in.
- [ ] `node qa/run-tests.mjs` ALL PASS; playthrough + long-run green.
- [ ] Chrome evidence at 375×812 / 428×926 / 844×390: zero overflow, clean console.
- [ ] No perf regression: DPR-2 mobile frame budget respected (see PERF-BUDGET).
- [ ] ADR-0012 + CHANGELOG + progress.md updated; backup tag documented.
