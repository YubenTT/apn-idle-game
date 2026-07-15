# Performance budget

> Budgets set at the **start**, not discovered at the end. Tuned for a static,
> Canvas 2D, zero-npm web game embedded on the APN site — not a heavy engine.

## Why these numbers

The game must open fast inside a waiting-room page (often on mobile, often on 4G)
and hold frame rate on mid/low devices. A slow idle game defeats its own purpose.

## Load & size budgets

| Target | Budget |
|--------|-------:|
| First-playable compressed asset set | `< 5 MB` |
| Core runtime JS (all `js/*.js`, ungzipped today) | keep lean; audit if `> 250 KB` raw |
| Core UI/sprite atlas | `≤ 512 KB` WebP |
| Mascot base atlas | `≤ 650 KB` WebP |
| Per-pack target atlas | `≤ 140 KB` WebP |
| Per-pack background | `≤ 150 KB` WebP |
| Per-pack props + masks | `≤ 50 KB` combined |
| SFX preload | `≤ 300 KB` (currently WebAudio-synth, ~0 asset bytes) |
| Cold start (Wi-Fi) | `< 3.5 s` |
| Cold start (good 4G) | `< 6 s` |

Note: SFX today is procedural WebAudio (`js/sfx.js`) with **no audio files** — a
strong head start on the audio budget. Keep it that way unless a real mix demands
samples.

## Runtime budgets

| Target | Budget |
|--------|-------:|
| Frame rate | 60 fps, floor 45 |
| Frame time | ≤ 16.67 ms (≤ 22 ms worst case) |
| JS heap | `< 180 MB` |
| GPU/canvas hot texture set | `< 64 MB` |
| Autosave write | `< 50 ms` (localStorage) |
| Sheet open → interactive | `< 150 ms` |

The fixed-timestep loop (`main.js`, 1/60 step, HUD throttled ~12.5 Hz, save ~6 s)
already protects determinism and battery. Don't raise HUD or save frequency without
a reason.

## Canvas 2D specifics (this engine)

- **Max 1 living enemy** by design — keep the draw list tiny. Particle/floater caps
  live in `game.js`; don't remove them.
- Cache decoded images (`render.js` image cache); never decode per frame.
- Prefer integer blit positions and pre-composited sprites over per-frame filters.
- Respect **Reduced motion**: fewer particles, no confetti storms — same toggle
  gates OS `prefers-reduced-motion` and the in-app setting.
- Offscreen/atlas: when art volume grows, blit from one atlas image, not many
  small `<img>`s.

## How we check

| Check | Tool |
|-------|------|
| Domain correctness (no browser) | `node qa/run-tests.mjs` |
| Frame time / heap | browser devtools Performance + Memory on the target device matrix |
| Asset size gate | `node scripts/assets/verify-sizes.mjs` |
| Visual regression | `qa/screenshots/` reference diffs |

## Budget-breach policy

If a change breaks a budget: either bring it back under, or open an
[ADR](./decisions/) accepting the new number with rationale. Silent overruns are
the bug — a breach with a recorded decision is fine.

`assets/manifest.json` is deterministic and records byte size plus SHA-256 for
every shipped raster/vector/GLB/JSON. `qa/check-assets.mjs` regenerates it twice,
requires byte-identical output, and enforces at most two hot pack records.
