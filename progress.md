Original prompt: Complete the APN Idle redesign autonomously, including QA, review, and a muted localhost build for the final integrated user gate.

## 2026-07-28 authored-motion authority and honest rollout

- Finalized one future-character-safe contract: pack metadata owns identity and
  boss roles; each mapped creature owns one complete hash-locked
  `gaf2d-motion-bundle-v1`; no character ID, array position, static atlas cell,
  whole-sprite bob, or camera effect can impersonate authored motion.
- Added the deterministic GAF2D approved-export builder and synthetic approved
  fixture gate. The builder rejects stale or legacy approval lineage, missing
  or extra clips, aliased atlas cells, unsafe paths, unpinned encoders, wrong
  pack-role coverage, and partial output.
- Added current-wave-before-play and next-wave-after-first-frame warming,
  descriptor/atlas hash verification, dimension and decoded-memory checks,
  abort/timeout/stale-completion handling, bitmap release, and one deduplicated
  diagnostic per failed asset. Unmapped packs keep their lazy legacy path.
- Added one effective reduced-motion authority:
  `saved preference || live OS preference`. Essential authored frames remain
  active; only secondary motion is reduced.
- Locked the APN Hero runtime to the exact legless reference contract. The safe
  Canvas body has no legs, feet, boots, or platform; the segmented V2 rig cannot
  become a fallback. The new local four-view identity candidate is mechanical
  evidence only and remains `awaiting_identity_approval`.
- Production truth is intentionally unchanged until creative gates pass:
  `valorant/pack.json` has no motion character map, the six approved creatures
  still use their static atlas, and the current Hero V3 files remain historical
  bytes. Identity, complete motion-set, optional rig, and release approvals
  cannot be replaced by automated QA.
- Offline technical acceptance is green: 1,929 headless assertions, 12 PASS
  markers, 60 real-Chrome wave cases (standard + reduced), three synthetic
  authored-motion temporal cases with zero fallback, first-playable 779,169
  bytes, and two byte-stable catalog/manifest generations.

## Current execution

- I-007 catalog renderer complete with muted direct-Chrome route evidence.
- I-021 Gear implementation is complete: 5-column inventory, explicit compare/sort/filter/junk/scrap flows, Hero presentation, persistence, and portrait/small/landscape Chrome evidence.
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

## Open chain (historical R-005 checkpoint)

- Draft integration PR #8 publishes the original 34-commit redesign history from
  `release/apn-idle-redesign-v1` without merging it.
- R-005 is green across negative economy contracts, playthrough, 30-minute pacing,
  Zone 1000, and muted Chrome Run/Menu evidence. It is being prepared as a stacked
  PR against the release branch.
- At this checkpoint the next user gate was a Host V2 motion proof. That gate and
  body authority are superseded by the current authored-motion section above:
  exact legless Hero identity, complete motion-set, optional rig, and release
  approvals now control replacement; each creature owns its own complete motion
  set.

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
- At this historical checkpoint, the existing canonical GLB and placeholder
  atlas remained shipped and Issue #23 still described a different full-body
  direction. That direction is no longer an active next step: the current
  authored-motion section above and ADR-0015 supersede it with the exact legless
  GAF2D identity authority.
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

## GAF2D first-pack creature integration · 2026-07-26

- Owner approved the six reviewed creature identities and the static-atlas
  integration; APN Hero V3 remains out of scope and unchanged.
- Isolated worktree: `codex/gaf2d-2d-identities`; binding spec and ADR-0013 are
  committed at `631bcae`.
- Authoritative GAF2D state: Entry Runner, Veil Operator, Signal Hunter, Site
  Sentinel, Protocol Courier, and Site Warden are identity-approved, integrity
  QA-passed, double-export verified, and `exported`; APN Hero remains
  `awaiting_identity_approval`.
- Deterministic atlas builder verifies every approved source hash before fixed
  crops/scales. Two consecutive builds produced identical runtime hashes.
- Current runtime atlas: 7 cells, `896×128`, 30,506 bytes, SHA-256
  `a88bc072c0604f8e84cd02e9548989db9313dfe315d655696e98a95a2b2e8252`.
- Exact derivative tools are pinned to ImageMagick 7.1.2-13 and cwebp 1.6.0.
  The builder now rejects an approval whose source manifest version is not the
  current asset manifest version.
- Independent review found and removed one detached neighboring platform
  fragment from the Site Warden break crop. RGBA decode, per-cell alpha/
  occupancy/ground-contact checks, and a connected-component regression now
  guard the runtime pixels.
- Wave 1–10 authored cast, real `spawnEnemy()` mapping, GAF2D-over-V3
  precedence, boss-break threshold, asset loader, and 140 KB target budget
  focused checks are green.
- The boss timer names Site Warden rather than the legacy Version Gate fallback,
  clears the two-row DOM stage HUD at every tested viewport, and remains
  readable over combat effects; non-Valorant packs retain their legacy banner.
  First-pack boss help copy is identity-neutral.
- Measured first-playable assets after integration: 4,928,494 bytes of the
  5,242,879-byte hard cap.
- Browser evidence covers all ten waves at 375×812, 428×926, and 844×390:
  30 wave cases plus three Site Warden break cases, decoded atlas readiness,
  muted audio, visible boss-timer geometry, no overflow/network/console
  failures, and a separate assertion that production pages expose no QA
  controls.
- `qa/run-tests.mjs`, playthrough, three pacing profiles, long-run, deterministic
  double build, documentation reconciliation, and clean-state checks are green.
- Independent findings-first acceptance review closed with no remaining
  blocking or actionable findings.

## 2026-07-28 authored-motion reduced-motion authority

- Added `js/motion-preference.js` as the single runtime authority for reduced
  motion: effective preference is `saved toggle OR live OS media query`, and OS
  changes never overwrite the saved toggle.
- `js/main.js` now owns the live `MediaQueryList` bridge and forces immediate
  stage/HUD refresh on OS preference changes.
- `js/game.js`, `js/render.js`, `js/ui.js`, and `js/sfx.js` now consume the same
  effective reduced-motion value for gameplay FX, render FX, gear hero preview,
  CSS classing, and audio/haptics gating.
- Deterministic QA added at `qa/check-motion-preference.mjs` and wired into
  `qa/run-tests.mjs`; focused check and full `node qa/run-tests.mjs` end green.

## 2026-07-30 localhost authored-motion gameplay proof

- Added a separate `unapproved_preview` runtime authority that activates only
  on exact `127.0.0.1` or `localhost` plus `motion-preview=1`. Normal gameplay
  keeps the unchanged production catalog, makes zero preview requests, and
  shows no preview banner.
- The ignored `.gaf2d-preview/` derivative binds the current mechanically
  passing, creatively unapproved GAF2D batch: 7 assets, 39 clips, 276 frames,
  batch SHA-256
  `29d8137159038631dfc279bdd789def5dcdd31842fe21c6dced64feca623adb5`.
  Its portable manifest SHA-256 is
  `f4671b39ee56e45c091d00645dc3b02893f2790ab5d640595e5b497d8dc8c0a2`.
- The builder verifies current GAF2D manifests, candidates, QA evidence,
  descriptors, and every frame hash before a pinned ImageMagick 7.1.2-13 /
  cwebp 1.6.0 transform. Two sequential rebuilds produced the same 30-file
  projection SHA-256
  `ee203b4d89ac3507dd6ae219bf23f5b832547be26dc89e5b2c2dba7c86e18b71`.
- Runtime activation verifies the root manifest, Hero set, eight Hero
  descriptors, six creature descriptors, and every media hash. Any stale or
  corrupt member blocks the entire overlay and visibly reports a safe
  fallback.
- Browser evidence covered Hero `run`, `sprint`, `attack`, `crit`, `hit`,
  `death`, and `celebrate`; all six Wave 1/2/3/5/9/10 identities; and Site
  Warden `advance`, `engaged`, `hit`, `broken`, and `death`. Active asset,
  candidate hash, authority, clip, clip FPS, and frame index were observable;
  changed-frame evidence was present and fallback count stayed zero.
- Portrait 390×844 and live landscape 844×390 gameplay have zero horizontal
  overflow. Preview media returned 200, the browser console stayed at zero
  errors, and reduced-motion preserved one timestamp loop and one progress
  clip while suppressing nonessential effects.
- A fixed 60 Hz simulation sampled under 60 Hz and 120 Hz repaint schedules
  selects identical authored frames. Clip FPS, not display refresh rate,
  controls playback, and fixed-duration clips use equal frame-time bins.
- Independent reviews caught and closed every release-blocking timing and trust
  defect before handoff: outgoing Hero strikes no longer masquerade as incoming
  damage, preview activation verifies all eight Hero and six creature WebP
  bodies, continuous combat cannot truncate a clip, and fixed-duration frames
  own equal time bins.
- Hero combat semantics now keep actual RNG crit state separate from ordinary
  attack and incoming hit state. The visible V3 renderer and diagnostics share
  the same selector; attack/crit (8 frames at 16 FPS), hit (4 at 16 FPS), and
  death (8 at 16 FPS) each advance forward through their complete authored
  sequence at both 60 Hz and 120 Hz.
- Continuous base and sprint combat use a single-slot visual queue: the current
  attack/crit clip reaches its final frame before the latest pending strike
  begins, with crit state latched and combat math unchanged. Reduced-motion
  keeps essential hit/death semantics while suppressing secondary transforms.
- Preview media preflight reads image bodies sequentially, enforces bounded
  runtime safety caps, and fails the entire overlay closed on a missing,
  oversized, or SHA-mismatched WebP. Normal mode still performs zero preview
  fetches.
- No paid-provider call, network generation, private-media upload, creative
  approval, rig authoring, export, push, or deploy occurred. The remaining gate
  is the owner's approve/reject decision for the complete authored motion set.

## 2026-07-30 stage-presentation browser closure

- The stage-presentation implementation is the nine-commit chain
  `a721467`, `f22d7a5`, `6a4f06d`, `932a13e`, `53d5f05`, `2cc131c`,
  `b802ac9`, `d833c8e`, and `7ea5f83`. Browser review found one additional
  CSS precedence defect: a toast whose DOM `hidden` property was true still
  occupied layout because the component `display:flex` rule won. Commit
  `0f38cf8` records the failing regression assertion and the narrow
  `#toast.toast-banner[hidden] { display: none; }` fix.
- Two consecutive exact preview builds both reported
  `GAF2D PREVIEW 7/39/276
  2ec2659c795e6e298f86bd7d079a538e193139e546c4b335dd32d9e8a4c5b2e1`.
  Their sorted 30-file projections both hashed to
  `3004d6b8b527b62456d6bcf50bdad58a14cadfeca352338e3b5b5e22928aa3c7`.
  The source batch remains
  `29d8137159038631dfc279bdd789def5dcdd31842fe21c6dced64feca623adb5`,
  with zero network, provider, and provider-clip calls.
- Focused checks for motion-preview UI, stage presentation, preview build,
  Hero V3 runtime/semantics, Valorant motion, creatures, and documentation all
  pass. The complete `node qa/run-tests.mjs` gate ends `ALL PASS`, and
  `git diff --check` is clean.

| Viewport | Canvas | Standard fit | Boss fit | Ground Y | Normal + reduced motion |
|---|---:|---:|---:|---:|---|
| 375×812 | 375×456 | 1 | 1 | 392.16 | pass |
| 390×844 | 390×488 | 1 | 1 | 419.68 | pass |
| 428×926 | 428×570 | 1 | 1 | 490.20 | pass |
| 844×390 | 844×216 | 1 | 0.9407764 | 185.76 | pass |

- At every viewport and in both motion modes, the Hero resolves to
  `96 × fit` with a `6 × fit` neutral gap, a standard target resolves to
  `72 × fit` with a `2 × fit` gap, and Site Warden resolves to `112 × fit`
  with a `2 × fit` gap. Every shadow Y equals the measured ground Y. Entry
  Runner `advance`, `hit`, and `death` and Site Warden `idle` and `broken`
  retain one exact transform within each scene.
- Browser-selected clips remained Hero `run` 16 FPS and `attack` 16 FPS;
  Entry Runner `advance` 10 FPS, `hit` 16 FPS, and `death` 8 FPS; and Site
  Warden `idle`/`broken` 8 FPS. The decoded Hero `idle` strip remains 8 frames
  at 12 FPS. Priority rank 2, HP, floater, tracker aura, hit/shock, and loot
  evidence consumed the resolved geometry anchors; motion diagnostics,
  console errors, warnings, and horizontal/vertical overflow stayed at zero.
- Visual evidence:
  `.gaf2d-preview/qa-evidence/stage-presentation-375x812.png`,
  `stage-presentation-390x844.png`, `stage-presentation-428x926.png`,
  `stage-presentation-844x390.png`, and
  `stage-presentation-wave10.png`. The Wave 10 capture is 428×926 and shows
  the real Site Warden `broken` clip at 33% HP with a clear plate.
- The complete derivative remains `unapproved_preview` /
  `human_review_required`. No paid call, upload, push, publish, or deploy
  occurred. The only remaining gate is explicit human approval or rejection
  of the complete authored motion set.
