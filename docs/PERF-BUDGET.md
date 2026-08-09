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
| V1–V3 common/event motion bundle | `≤ 160 KB` compressed; `≤ 6 MiB` decoded RGBA |
| V1–V3 pack-declared boss motion bundle | `≤ 240 KB` compressed; `≤ 8 MiB` decoded RGBA |
| V1–V3 new/replaced first-pack motion set | `≤ 3.5 MiB` compressed WebP + JSON |
| V1–V3 current + next wave motion | `≤ 32 MiB` decoded RGBA |
| V4 selected clip: Hero | `≤ 640 KiB` compressed; `≤ 8 MiB` decoded RGBA |
| V4 selected clip: standard / elite | `≤ 1.25 MiB` compressed; `≤ 6 MiB` decoded RGBA |
| V4 selected clip: boss | `≤ 2.25 MiB` compressed; `≤ 10 MiB` decoded RGBA |
| V4 Hero motion set | `≤ 3.5 MiB` selected WebP |
| V4 full 39-clip preview | `≤ 32 MiB` selected WebP + JSON |
| V4 current + next wave motion | `≤ 48 MiB` decoded RGBA |
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
  live in `game.js`; don't remove them. Current hard caps (Wave 3): particles 260,
  confetti 200, floaters 40, shock rings 14, loot flights 14 — all trimmed at
  spawn, never in the sim.
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
`qa/check-asset-loader.mjs` additionally executes current/next preload, optional
fallback, transition release, Zone 200/201, and explicit close semantics without
a browser; muted Chrome then verifies the real decode/composite path.

## GAF2D authored-motion rollout

- First-pack target atlas: 30,506 bytes (`896×128`, seven cells).
- The exact first-playable hard cap is `< 5,242,879` bytes and is calculated from
  the canonical request set, not directory membership or stale manifest flags.
- New/replaced first-pack motion WebP + JSON is capped at `≤ 3.5 MiB`
  (`3,670,016` bytes); all Hero WebP clips remain `≤ 640 KB`.
- The 2026-08-09 canonical 7-asset, 39-clip, 795-frame V3 build measured
  `3,006,743` compressed bytes. The cap leaves `663,273` bytes (`22.1%` of the
  measured set) for deterministic encoder and descriptor growth without
  weakening any per-clip, decoded-residency, or hot-texture limit.
- Only the current and next wave identity union may remain decoded. Cold
  in-flight work aborts and cold `ImageBitmap` instances close.
- `targets.webp` remains a compact fallback, but canonical motion QA fails on any
  mapped-identity fallback; it cannot hide a missing production bundle.

### Visual Fidelity V4 measured candidate

The 2026-08-09 V4 limits above are one rounded calibration from the real,
deterministic 7-asset / 39-clip / 795-frame candidate. They do not apply to the
historical V3 reader and do not grant creative approval.

- Largest selected clips: Hero `506,248 / 655,360` bytes, standard/elite
  `1,057,610 / 1,310,720` bytes, boss `1,944,276 / 2,359,296` bytes.
- Largest boss decoded clip: `8,490,240 / 10,485,760` RGBA bytes. Common/elite
  remain below 6 MiB and Hero remains below 8 MiB.
- Hero selected WebP total: `2,961,626 / 3,670,016` bytes.
- All 39 selected WebPs plus projected JSON: `23,965,723 / 33,554,432` bytes.
- Current/next-wave two-clip residency maximum: `39,191,760 / 50,331,648`
  decoded bytes. Hero plus that wave window is `44,764,880 / 67,108,864`
  motion-only hot-texture bytes.
- The full route-aware maximum is `63,022,408 / 67,108,864` bytes at the
  Valorant Wave 8+9 window: Hero + the exact route motion union + the one
  resident pack texture set. A legacy creature owner is added only for a route
  containing an unmapped identity. Do not add independent maxima from mutually
  exclusive route windows; that fabricated a non-resident 78,794,584-byte
  total. The frozen hot-texture cap remains 64 MiB.
- Runtime keeps selected-clip lazy fetch/decode, at most two resident clips per
  asset during a transition, and only the current/next wave identity union.
  The larger V4 caps therefore describe measured bounded residency, not eager
  loading of all 39 atlases.
- V4 budget authority is selected when any ordered pack owns a V4 source; it is
  not coupled to whichever pack happens to sort first in the catalog.
