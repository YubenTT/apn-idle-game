Original prompt: Complete the APN Idle redesign autonomously, including QA, review, and a muted localhost build for the final integrated user gate.

## Current execution

- I-007 catalog renderer complete with muted direct-Chrome route evidence.
- I-021 Gear implementation is complete: 5-column inventory, explicit compare/sort/filter/junk/scrap flows, canonical Host, persistence, and portrait/small/landscape Chrome evidence.
- I-010–I-014 Run hero experience is implemented; integrated Run Chrome review is active.
- I-020 Build is implemented with requirement-derived next-unlock previews and
  428/375 Chrome Extension evidence (44pt touch, zero overflow/truncation).
- I-022 Ship is implemented with a tested reset/keep contract, live conversion
  preview, and an explicit two-step End Season gate; 428/375 Chrome evidence is green.
- I-023 Hub is implemented as a Daily/Weekly/Season live-ops board; state helper,
  readable rewards, 8px tracks, 44pt touch, and 428/375 Chrome gates are green.
- I-025 Menu keeps canonical switches, no player debug copy, and a tested safe
  reset gate; R-005 removes the retired demo-store section for launch.
- I-024 Boosts is implemented as a domain-driven permanent ROI tree with exact
  deltas/costs, one recommendation, 44pt touch, and clean 428/375 Chrome evidence.
- I-033 item art is implemented as a 12-piece, three-material APN techwear atlas;
  Gear uses authored sprites with zero filled-slot SVG fallbacks, 44pt touch, and
  zero horizontal overflow in direct Chrome evidence.
- I-034 backgrounds are locked across all 20 packs with visible APN billboard,
  signal-rail, patchline, and archive-light motifs; every WebP is below 150 KB
  and the Run surface remains zero-overflow in direct Chrome.
- I-040 feedback is complete: hit, crit, loot, rank, sheet, and afford cues share
  deterministic haptics and are silenced by mute plus OS/in-app reduced motion.
- I-042 copy is complete: all five player-facing sources pass the banned-copy
  contract, Focus replaces Mana with save migration, and glossary target names
  plus object/effect/cost language are aligned.
- I-044 navigation is locked by ADR-0007: five stable destinations, Gear FAB,
  minimal info-color active fill, 44pt targets, and explicit expansion state.
- I-043 integrated QA is complete: 35 Chrome baselines across five viewport
  classes, 0px overflow, ≥44px touch, muted copy-safe screens, clean console,
  89.8fps cadence, 6.6MB heap, and 2.7ms sheet-open evidence.
- Browser QA uses Chrome Extension or isolated direct Chrome with `mute=1`; no
  standalone Playwright process is used.

## I-045 closure evidence

- I-045 mobile long-press hardening is active after physical iOS Safari exposed
  selectable HUD/stage regions. Root cause: the document had only the standard
  `user-select` declaration; explicit WebKit callout and media-drag guards were
  absent. Baseline remains `ALL PASS` + `LONG RUN PASS` on 2026-07-15.
- Execution plan: `docs/superpowers/plans/2026-07-15-mobile-long-press-release-hardening.md`.
- I-045 code and automated/browser QA are green: the pre-fix gesture contract
  failed on all three missing WebKit guards, the fixed suite ends `ALL PASS`, and
  the 393×852 muted Browser chain has 0px overflow, clean console, preserved
  Gear scroll/native sort, and a clean Sprint release. The owner confirmed the
  physical iOS Safari long-press recheck on 2026-07-15; I-045 is release-ready.

## Open chain

- Draft integration PR #8 publishes the original 34-commit redesign history from
  `release/apn-idle-redesign-v1` without merging it.
- R-005 is green across negative economy contracts, playthrough, 30-minute pacing,
  Zone 1000, and muted Chrome Run/Menu evidence. It is being prepared as a stacked
  PR against the release branch.
- Next user gate: approve the Host V2 motion proof. No creature/item/runtime Host
  asset replacement proceeds before that approval.

## Go Live v2 · PR-5 checkpoint (2026-07-18)

- Run hierarchy is implemented: Route + Pack context, Clear / Rank / Live,
  conditional Focus, and a Patch Echo chip that renders only real optional data.
- Direct Chrome (`mute=1`) covers 10 scenarios at 375×812, 428×926, and 844×390
  with zero overflow, clean console, target-right entry, Focus reveal, and
  boss-tip clearance. Compact evidence lives under `qa/screenshots/pr5-run/`.
- `js/host-contract.js` is the sole placeholder presentation/clip vocabulary.
- Owner rejected the first ADR-0010 full-body GLB identity candidate. The GLB,
  proof renderer, proof image, and experimental asset checks were purged before
  commit; they never entered the runtime atlas. Do not recreate its
  arm/neck-as-leg construction.
- The existing canonical GLB and placeholder atlas remain shipped. Issue #23
  stays open for a different owner-approved four-angle full-body identity,
  deterministic pose derivation, and real-pixel asset gate.
- This checkpoint is intended to merge through `release/go-live-v3` into `main`
  only after `node qa/run-tests.mjs` and muted Chrome verification are green.

## V2 Super Polish · ship-readiness checkpoint (2026-07-18)

- Branch `v2/super-polish`; pre-V2 state restorable via tag
  `backup/pre-v2-super-polish`. Master spec:
  `docs/superpowers/specs/2026-07-18-v2-super-polish.md`.
- Wave 1 art core (`3b24b2c`): procedural Host V2 (`js/hero-v2.js`), procedural
  feed-noise enemy family + target presentation (`js/enemies-v2.js`), layered
  per-zone editorial scenery (`js/scenery-v2.js`).
- Wave 2 chrome (`c365714`): animated counters, press physics, sheet springs,
  live Gear Host, toast banner, nav pill, coach hint.
- Wave 3 juice (`2004092`): hit stop, shake tuning, crit flash, death bursts,
  combo meter, zone/rank/Go Live cinematics, enriched WebAudio SFX.
- Wave 4 QA & ship-readiness: headless gate ALL PASS (`run-tests.mjs`,
  `playthrough.mjs`, `pacing-profiles.mjs`, `long-run.mjs` incl. finite
  Zone-1000 profile); fresh Chrome matrix at `qa/screenshots/v2-final/` (route
  smoke 3 viewports × zones 1/10/11/20/200/201; Build/Gear/Go Live smokes;
  `wave2/` 24 captures; `wave3/` 6 captures) — zero console errors, zero
  document overflow. Fixed this wave: legacy floaters/currency/quips re-anchored
  to stage-aware origins (toast band is canvas y ≈112–162 on every viewport),
  kill-cluster particles/confetti burst at the body, zone-clear wipe fallback
  no longer strands text in the toast band; `chrome-build-smoke.mjs` repointed
  to the standard 8791 evidence server.
- ADR-0012 records the owner-mandated switch: the procedural Canvas Host is the
  shipped runtime character; GLB files stay in repo history; `tools/mascot-render`
  is retired from the runtime path. `brand/MASCOT-CANON.md` carries the dated
  V2 section; `docs/ARCHITECTURE.md` maps the V2 modules.
- Open leftovers: pack target atlases are still the original art (procedural
  presentation layer wraps them; full procedural replacement is future work);
  scenery mood crossfade between zones is a hard cut today; the damage vignette
  from the Wave 3 scope was dropped as N/A (hit stop + shake + crit flash carry
  the hurt read); no V2 perf probe beyond the existing PERF-BUDGET caps yet.
