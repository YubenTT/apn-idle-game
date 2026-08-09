# APN Idle redesign V1 — QA report

## 2026-08-09 Visual Fidelity V4 browser and approval-gate closure

Status: the owner explicitly approved all seven V4 motion sets. The approval
does not grant APN Hero rig authority. Six baked creature sets passed complete
QA, exported through current hash-locked release manifests, and are now the
production Valorant motion sources. Hero remains outside the production pack at
the separate `awaiting_rig_approval` gate. V3 remains the immutable semantic
acting/timing/root source.

Current immutable facts:

- V4 source batch: 7 assets / 39 clips / 795 frames / 920 files;
- V4 batch SHA-256:
  `9fbd349f27fb01a008bd9458f03becbc87485c27895d3fb7b5f667aa87658374`;
- preview manifest SHA-256:
  `64e31dab8ee529aaf432bc0b1c534ca0fbcbe90ec8ed524e00225034a20a2e9e`;
- deterministic Chrome report SHA-256:
  `5cba094a30584038933ec25f1d342e30956927ec325b46b74a772205ed347d25`;
- same-scale V3↔V4 report SHA-256:
  `550de2aabdbcce47ac7cc7e97083c25d7dc32e2280bfb60238cef67c7381c317`;
- selected lossless profile SHA-256:
  `76d15cc95e8a0bf2f40867abb09f375148679e71f3746e11d51130f83c463dd4`;
- compressed motion: 23,965,723 / 33,554,432 bytes; Hero:
  2,961,626 / 3,670,016 bytes;
- decoded max wave: 39,191,760 / 50,331,648 bytes;
- motion-only Hero + max-wave residency: 44,764,880 / 67,108,864 bytes;
- full route-aware hot textures: 63,022,408 / 67,108,864 bytes; and
- post-approval production Chrome report SHA-256:
  `05dfae9ab5be885f411345d04cb8947d6354a567548da83d9796eed70353eaa9`.

Hash-locked `MotionSetApprovalV4` records:

- Hero `3b18d9e82a611b738aa5e277c6da2649dc820648cf5fd2d5bbaa8c35b7c3260d`;
- Entry `54b6fd43c60def0ce0d270bc91ec3729af7e16442d118a8ecaf953c9fc6f2425`;
- Courier `992f4cdb38d18833412fed6d33cca8359ad4c13031a70ddaa0825f51c87936f4`;
- Signal `2f128f8fb6851316092819213c82699ce82a23de01fd71007f4bc12bd015c881`;
- Sentinel `5e2416fdaf9b829c3ea4f26fa0a257f35d3e189c84cfc9f178ed47e2fa48ec8e`;
- Warden `707e53ae77c2c3a3f37cdec70ba35f59a710c690247b7b1365a49204ad39abae`;
  and
- Veil `29852c0f6bbdb5b40b4577eaaf088835c854bb5f73494bc357d68151ab521efa`.

Six current release-manifest hashes are Entry `cbe9946b…d654`, Courier
`62e18b5a…9c7`, Signal `4bd9fbd3…bf83`, Sentinel `ccc83d3f…6119`, Warden
`9cd7e5ba…69d39`, and Veil `d25af068…6172`. Every runtime projection is an
exact-copy, SHA-verified `approved_release`; preview/snapshot/shim authority is
rejected by the production store.

Two fresh Chrome 151.0.7922.76 runs produced byte-identical deterministic and
same-scale reports. Every clip completed a full cycle at 60, 90, 120, and
144 Hz with zero continuity findings. The exact selected-only ledger contains
7 set, 40 JSON, and 39 WebP requests; all 86 returned HTTP 200. Residency peaked
at two current sets and three decoded clips including retained/warming state,
with zero diagnostics. The separate non-authoritative timing reports measured
39 decodes each, with medians of 17.0 and 16.5 ms and maxima of 48.1 and 51.6 ms.

At DPR2 and the same displayed role size, V4 supplies 219/192 visible/device
pixels for Hero, 176/144 for standard Courier, 177/168 for elite Sentinel, and
258/224 for boss Warden. The preserved V3 baseline supplied only 101, 102, 96,
and 100 source-visible pixels. Mobile, landscape, Wave 1, Wave 10, review,
native light/dark, and same-scale screenshots were visually inspected with no
clipping, halo, blank actor, overflow, console, or network finding. The
machine-readable reports and screenshots are permanently copied under the
asset project's `review/authored-semantic-v4-evidence/browser/` boundary.

Post-approval Chrome then exercised the production page at 375×812, 428×926,
and 844×390. All 60 Wave 1–10 standard/reduced cases rendered their exact
approved release with zero fallback, console, network, or overflow finding;
Wave 10 break state and fixed-timestamp frame changes were captured. The cold
request ledger proves current `set + advance`, next `set` only, then next
`advance` only at the route transition. Two consecutive complete runs produced
the byte-identical report hash above. The normal page still exposes none of the
QA globals. Seventy-five screenshots plus `report.json` live under
`qa/screenshots/gaf2d-production-v4/` and the representative Wave 1/Wave 10
portrait and landscape images were inspected at original resolution.

The complete game `node qa/run-tests.mjs` gate ends `ALL PASS`; the full GAF2D
suite passes 1,440 tests; and the asset V4 suite passes 70 tests. Seven
project-contained V4 candidates also pass zero-write GAF fidelity planning.
The owner approval authorizes these motion records and six baked releases, not
Hero rig approval or deployment.

## 2026-08-09 V4 bounded Hero density correction

A bounded APN Hero `hit` witness invalidated the earlier synthetic 256 px Hero
runtime assumption. Its 512 px master reference has 343 visible pixels; the
single 320 px derivative measures 214–220 visible pixels across the clip and
therefore clears the 96 CSS px × DPR 2 demand of 192 device pixels. A 256 px
Hero derivative would provide approximately 171 visible pixels and is rejected
as an upscale.

The current role-aware V4 contract is Hero 320, standard 256, elite 256, and
boss 320. Runtime class remains manifest-bound rather than caller-selected;
unknown classes and any role/class mismatch fail closed. These measurements are
mechanical evidence only and do not grant creative approval or production
promotion.

## 2026-08-09 authored-semantic-v3 browser closure (historical baseline)

Status: offline technical acceptance is green. Creative authority is not.
The preview remains `unapproved_preview` with `human_review_required` until the
owner watches and explicitly approves or rejects the complete 39-clip set.

Current immutable facts:

- source batch: 7 assets / 39 clips / 795 frames, 30/32 FPS;
- source batch SHA-256:
  `1ab30e7850918cd03446b539eeaf444b14ff5de4d9d0e121782cb92805f10a0e`;
- preview manifest SHA-256:
  `75c521d43a9a2214fc75ff7a33e5158c05a1d08f0af34edb07cf4d7caea8d2c8`;
- browser report SHA-256:
  `66907b99c380d8c0d1ae8495cc746652f5766f6d56dbc01a48c25f25fdecb948`;
- compressed motion: 3,006,743 / 3,670,016 bytes, 22.1% headroom;
- decoded max wave: 21,853,252 / 33,554,432 bytes; hot textures:
  27,172,756 / 67,108,864 bytes.

Fresh commands:

```console
node qa/run-tests.mjs
# ALL PASS

node qa/browser/chrome-motion-continuity.mjs
# PASS chrome-motion-continuity 39/39 clips across 60/90/120/144 Hz
```

The Chrome lane decoded and alpha-sampled every frame, found zero continuity
failures, rendered 18 Hero/regular/boss witnesses at 64/80/128 px on light and
dark, and proved a cold current-wave set/clip load with no blank active actor.
The first drawable actor appeared only after `advance` reached `ready`, then
three consecutive snapshots contained nonzero alpha and zero fallbacks.
The browser pages use a QA-only seeded random source; two consecutive complete
runs produced the same report SHA-256 above.

Gameplay evidence is independently captured at 375 × 812, 390 × 844,
428 × 926, and 844 × 390. Every page asserts that the review panel is hidden,
the V3 motion is `ready`, horizontal and vertical overflow are zero, and browser
console/network problems are zero. Screenshots and the machine-readable report
live under `qa/screenshots/motion-continuity/`.

This closes the stale RED described below. It does not grant motion approval or
authorize production promotion, commit, push, merge, or deploy.

## 2026-08-08 V3 browser continuity lane

Status: harness added, syntax-checked, and intentionally RED against the
current local preview because the worktree still exposes the old mixed V2
authority instead of the real V3 7/39/795 set.

`node --check qa/browser/chrome-motion-continuity.mjs` passes.
`node qa/browser/chrome-motion-continuity.mjs` currently fails closed with the
expected blocker:

- `.gaf2d-preview/manifest.json` still reports `sourceFamily=authored-semantic-v2`
  and `counts=7/39/276`; and
- creature preview entries still bind legacy
  `.gaf2d-preview/characters/<asset>/motion.json` and `motion.webp` instead of
  per-clip `set.json` plus exact clip descriptor/image pairs.

Once the real V3 preview materializes locally, the harness is wired to:

- reject any catalog that is not the exact 39-clip, 795-frame, authored-semantic-v3 review surface;
- require the review panel to activate instead of the current blocked state;
- sample all 39 clips at `60/90/120/144` Hz through the real browser review
  loader and fail on cadence or undeclared-hold regressions;
- render and alpha-sample every frame of every loaded review clip so a
  structurally valid but blank/transparent atlas frame cannot pass;
- enforce progress freeze behavior from descriptor-owned `markers` and `holds`
  instead of skipping terminal-frame hold validation entirely;
- collect console/network failures separately for each gameplay viewport CDP
  session; and
- prove a real cold gameplay transition from released motion residency to first
  visible active frames when the per-clip gameplay preview is actually present;
- capture one native-size light/dark witness board for `64/80/128` px; and
- capture gameplay screenshots at `375×812`, `390×844`, `428×926`, and
  `844×390` with zero overflow and an active preview authority.

## 2026-07-30 stage-presentation contract closure

Status: offline implementation and browser evidence are green. This is not
creative approval: the derivative remains `unapproved_preview` with
`human_review_required`, and the complete authored motion set still requires an
explicit human approve/reject decision.

### Commits and deterministic source

- Stage contract chain: `a721467`, `f22d7a5`, `6a4f06d`, `932a13e`,
  `53d5f05`, `2cc131c`, `b802ac9`, `d833c8e`, `7ea5f83`.
- Browser-found toast regression and fix: `0f38cf8`. RED was
  `node qa/check-motion-preview-ui.mjs`, failing
  `hidden toast overrides its component display declaration`; GREEN was the
  same focused command plus the full gate. The fixed expired toast measures
  `hidden=true`, `display=none`, and `0×0`.
- The exact preview build command was run twice:

  `node scripts/assets/build-gaf2d-preview.mjs --gaf2d-project "$GAF2D_PROJECT" --output .gaf2d-preview`

  Both runs reported `GAF2D PREVIEW 7/39/276` and manifest SHA-256
  `2ec2659c795e6e298f86bd7d079a538e193139e546c4b335dd32d9e8a4c5b2e1`.
  Both sorted 30-file projections were
  `3004d6b8b527b62456d6bcf50bdad58a14cadfeca352338e3b5b5e22928aa3c7`.
  The manifest binds source batch
  `29d8137159038631dfc279bdd789def5dcdd31842fe21c6dced64feca623adb5`,
  `sourceFamily=authored-semantic-v2`, seven assets, 39 clips, 276 frames,
  and zero network/provider/provider-clip calls.

### Automated gate

The following focused commands pass:

```console
node qa/check-motion-preview-ui.mjs
node qa/check-stage-presentation.mjs
node qa/check-gaf2d-preview-build.mjs
node qa/check-hero-v3-runtime.mjs
node qa/check-hero-motion-semantics.mjs
node qa/check-gaf2d-valorant.mjs
node qa/check-creatures.mjs
node qa/check-doc-contracts.mjs
```

`node --check qa/check-motion-preview-ui.mjs` passes. The complete
`node qa/run-tests.mjs` gate exits 0 with 2,143 lines and ends `ALL PASS`;
`git diff --check` is clean.
No test made a provider, paid, or external-network call.

Fix-round review reproduced the 844×390 standard HP/name plate behind the
two-row stage HUD. The component-bound RED measured fit `0.8113725490` and
plate y `81.2247..111.2247` against safe y 103. Commit `148cf05` now measures
the DOM HUD edge, reserves the fixed plate height separately from the scaled
motion envelope, and holds compact/full selection on one branch. GREEN measures
fit `0.5376015474` and plate y `103..133`; the post-commit browser measures
HUD bottom 103, safety line 105, and the final plate at `105..135`.

Second fix-round review then reproduced the Wave 10 timer over that boss plate.
The real Canvas RED captured plate `{x:274.12,y:105,w:91.76,h:30}` and labeled
timer `{x:151.92,y:108,w:540.16,h:24}`. Commit `69a1b37` resolves both from
one pure functional layout and moves the timer only when the rectangles
collide. GREEN keeps the plate unchanged and places the timer at
`{x:377.88,y:108,w:450.12,h:24}`, with `SITE WARDEN` centered at
`(602.94,130)`. The 12 px horizontal gap keeps both components visible without
hiding either or changing the minimum actor fit.

### Browser matrix

The query-gated audit used
`http://127.0.0.1:8790/?motion-preview=1&mute=1&autostart=1&zone=1&chrome-smoke=1&qa-manual=1`.
The exact landscape boss proof used the same query with `zone=10`.
The final human-review link omits QA-only hooks:
`http://127.0.0.1:8790/?motion-preview=1&mute=1&autostart=1&zone=1`.

| Viewport | Canvas | Standard fit | Boss fit | Ground Y | Hero body/gap | Standard body/gap | Boss body/gap | Normal/reduced | Overflow | Console / motion failures |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---|
| 375×812 | 375×456 | 1 | 1 | 392.16 | 96/6 | 72/2 | 112/2 | pass/pass | 0/0 | 0 / 0 |
| 390×844 | 390×488 | 1 | 1 | 419.68 | 96/6 | 72/2 | 112/2 | pass/pass | 0/0 | 0 / 0 |
| 428×926 | 428×570 | 1 | 1 | 490.20 | 96/6 | 72/2 | 112/2 | pass/pass | 0/0 | 0 / 0 |
| 844×390 | 844×216 | 0.5428087 | 0.5 | 185.76 | 96×fit/6×fit | 72×fit/2×fit | 112×fit/2×fit | pass/pass | 0/0 | 0 / 0 |

Every row measured `shadowY == groundY`. Normal and reduced motion produced the
same geometry. Within each scene, Entry Runner `advance`, `hit`, and `death`
used one identical role/scale/pivot/draw transform, and Site Warden `idle` and
`broken` used one identical transform. In the 844×390 standard scene, fit is
`0.5428087167`, body/gap are `39.0822276/1.0856174`, and the plate remains
fully below the HUD. In the 844×390 boss scene, fit is `0.5`, body/gap are
`56/1`, and the same compact plate remains at y `105..135`. Its plate occupies
x `274.12..365.88`; the timer occupies x `377.88..828`, y `108..132`, and
retains its visible `SITE WARDEN` label. Normal and reduced motion produce the
same layout. At 428×926 the non-colliding timer remains at the original
centered `{x:77.04,y:108,w:273.92,h:24}` placement.
The post-commit landscape capture uses the real Site Warden at `3112/4940` HP,
with authored `advance` frame 7 at 10 FPS and zero fallbacks.

Resolved standard-target anchor samples:

| Viewport | HP Y | Floater Y | Aura / hit / loot center |
|---|---:|---:|---|
| 375×812 | 307.0691 | 297.0691 | 320.1818, 354.1600 |
| 390×844 | 334.5891 | 324.5891 | 315.1818, 381.6800 |
| 428×926 | 405.1091 | 395.1091 | 320.1818, 452.2000 |
| 844×390 | 135.0000 | 125.0000 | 320.0987, 165.1333 |

The action captures show the actual priority-rank-2 bracket, HP plate,
`-42` floater, Hero tracker aura, hit/shock, and loot origins. The dedicated
Wave 10 capture measured fit 1, body 112, gap 2,
`shadowY=groundY=490.2`, `hpY=365.6563`, and selected Site Warden
`broken` frame 5 at 8 FPS with 33% HP and zero fallbacks. The preceding
normal-state audit selected Site Warden `idle` at 8 FPS with the exact same
transform.

Browser clip evidence and unchanged descriptor facts:

- Hero: `idle` 8@12, `run` 10@16, `attack` 8@16, `crit` 8@16,
  `hit` 4@16, `death` 8@16, `celebrate` 8@16, `sprint` 10@20.
- Every non-boss creature: `idle` 8@8, `advance` 8@10,
  `engaged` 6@12, `hit` 4@16, `death` 8@8.
- Site Warden keeps that set and adds `broken` 8@8.
- The live standard audit selected Hero `run` 16 FPS and `attack` 16 FPS,
  Entry Runner `advance` 10 FPS, `hit` 16 FPS, and `death` 8 FPS.
  Hero `idle` was separately decoded and rendered from its 8-frame, 12 FPS
  strip; no FPS or frame-count contract changed.

All observed resource responses were successful `127.0.0.1:8790` requests.
The Playwright session reported zero console errors and zero warnings, and every
motion-store diagnostic set was empty.
Permanent runtime lesson: one-sibling-per-asset clip residency is unsafe for
real gameplay because a dying body and a fresh same-asset spawn can overlap in
one render.
The runtime now keeps all clips selected for the current frame, then prunes
only unselected siblings; the canonical emitted package path remains
`assets/game-packs/<pack-id>/characters/<asset-id>/...`.

### Screenshot evidence

| File | Pixels | SHA-256 |
|---|---:|---|
| `.gaf2d-preview/qa-evidence/stage-presentation-375x812.png` | 375×812 | `66a5994634e31bcb340bfd71cbfbeb2a109e137a43b40308d63c9df8fa07d3d8` |
| `.gaf2d-preview/qa-evidence/stage-presentation-390x844.png` | 390×844 | `496a9900b1fff3d13dc4dd48d9ce734ddd35fe96708c7431ca9c6cf92ca74072` |
| `.gaf2d-preview/qa-evidence/stage-presentation-428x926.png` | 428×926 | `6ced5c7f575c42120416dba9d3e1f7ba06f9750929c5652a48d9a5d959532377` |
| `.gaf2d-preview/qa-evidence/stage-presentation-844x390.png` | 844×390 | `0f2186416b968de9755a2884b0eac69f527df11800decb703baabf4bbc589bd6` |
| `.gaf2d-preview/qa-evidence/stage-presentation-844x390-wave10.png` | 844×390 | `a4b8ecc956b1c640fd9363ec8cbcb3a2d3b3cf26889473c911768c7f746286dd` |
| `.gaf2d-preview/qa-evidence/stage-presentation-wave10.png` | 428×926 | `426bb228ae3fbbfa7c69dd4e2d05d87e8ca607cc7556797d8a8e7176912ea69d` |

Each final file was visually inspected at original resolution. The expired boss
toast is absent from all final evidence. The portrait Wave 10 image shows the
real broken-state body and a clear `1631/4940` HP plate. The landscape Wave 10
image shows the compact `Site Warden` HP/name plate and the uppercase
`SITE WARDEN` timer label together without overlap.

### Independent review

The final review checked frame-by-frame grounding, duplicate role-size
constants, identity-specific scaling, shadow movement, anchor bypasses,
preview-authority leakage, and stale tests/docs. The role ladder exists only in
`js/stage-presentation.js`; trusted enemy domain type selects a role while asset
IDs never select scale; all frames share one asset presentation record and one
resolved transform; shadows use resolved ground geometry; HP/floater/aura/hit/
loot paths consume resolved anchors; and production mode remains closed to the
preview overlay. Focused tests cover those contracts.

The initial actionable review finding was the hidden-toast CSS precedence
defect, fixed and regression-tested in `0f38cf8`. Fix-round review then found
and closed the landscape plate/HUD overlap in `148cf05`; second fix-round
review closed the zero-scroll boss timer/plate collision in `69a1b37`, but a
final review pass found the timer collision probe still subtracting
`scrollSmooth` while the real boss plate stays in actor screen space. The RED
contract reproduced the 844×390 Wave 10 regression at `scroll=scrollSmooth=240`
with the plate unchanged at `{x:274.12,y:105,w:91.76,h:30}` and the timer
falling back to the overlapping centered lane
`{x:151.92,y:108,w:540.16,h:24}`. The final fix keeps the collision layout in
screen space, so the same scrolled scene now reuses the safe right lane
`{x:377.88,y:108,w:450.12,h:24}` with the `SITE WARDEN` label centered at
`(602.94,130)`. No other blocking or actionable finding remains. No paid call,
private-media upload, export, push, publish, deploy, or history rewrite
occurred.

## 2026-07-28 authored-motion technical closure

Status: offline technical acceptance approved. Production art acceptance remains
open at the exact human identity, complete motion-set, Hero rig, and release
gates.

Current final evidence:

- `node qa/run-tests.mjs` passes with 1,929 `OK` assertions, 12 terminal
  `PASS` lines, and final `ALL PASS`;
- `node scripts/assets/verify-sizes.mjs` passes with
  `first-playable=779169` bytes and `hot=2`;
- catalog, generated pack module, and asset manifest are byte-stable across two
  consecutive generator runs; the asset manifest contains 221 entries;
- direct Chrome verifies all waves 1–10 at `375×812`, `428×926`, and
  `844×390` in both standard and effective reduced-motion modes: 60 wave cases,
  zero console/network problems, zero document overflow, and correct role/boss
  mapping;
- the query-gated synthetic authored-motion path adds three viewport cases
  through the same public store contract. Each selects exact `advance` frames
  `0→1→2`, produces three distinct pixel hashes and a moving part centroid,
  records zero fallback, survives `visible→hidden→visible`, and preserves one
  saved-or-live-OS reduced-motion authority;
- the normal page exposes none of `render_game_to_text`, `advanceTime`, or
  `__APN_QA__`; the smoke page alone exposes those test hooks; and
- the documentation contract rejects any active return to GLB-derived,
  procedural-V2, biped, or one-batch-approval Hero authority while preserving
  clearly labeled historical provenance; and
- `git diff --check` plus JavaScript syntax checks pass.

The deterministic creature and Hero builders reject stale GAF2D export dry-runs,
legacy or incomplete approvals, mixed or uniformly shifted pivots, aliased
logical frames, untrusted boss promotion, nonportable paths, unknown tool
versions, and partial output. They build twice to identical hashes under the
recorded ImageMagick 7.1.2-13 / `cwebp` 1.6.0 toolchain and publish complete
directories atomically.

This is deliberately not a production-art claim. `valorant/pack.json` still has
no motion character map, so the six production creatures remain on the approved
static atlas. `assets/mascot/v3/set.json` labels the current Hero bytes
`historical`. The new legless Hero four-view sheet remains an unapproved
candidate. No provider call, private upload, paid action, 3D pipeline, push,
publish, or deploy was used for this closure.

## PR-5 checkpoint · Run hierarchy + placeholder Host contract

Run now separates Route and ten-zone Pack context from Clear / Rank / Live
telemetry, omits Focus until a Focus-spending skill is learned, and refuses to
display Patch Echo progress until that optional Route domain data actually
exists. The Host uses a code-owned 118–142px presentation range and the existing
canonical placeholder atlas.

Fresh checkpoint evidence on 2026-07-18:

- direct installed Google Chrome CDP, always `mute=1`, passed 10 Route scenarios
  across 375×812, 428×926, and 844×390, including zones 1/10/11/20/200/201;
- every scenario recorded 0px horizontal overflow, no console warning/error,
  decoded at most current + next packs, and targets approaching from the right;
- Focus is hidden before Hotfix and revealed after a real learned-skill mutation;
  Patch Echo stays absent before its domain exists;
- boss tips remain at least 8px below stage telemetry in portrait and landscape;
- Run evidence is stored in `qa/screenshots/pr5-run/`;
- the existing asset suite remains authoritative and must finish `ALL PASS`.

The first full-body GLB identity candidate failed the owner gate. It and its
experimental proof/measurement tooling were removed before integration, so this
checkpoint makes no full-body or new-atlas quality claim. Issue #23 remains open
for a different full-body identity approach.

## PR-4b · Build V2 UI + Priority Tag

Issue #22 removes SP from the Run strip and makes Build its sole owning surface.
The sheet presents Scan, Verify, and Relay as three direct three-skill branches,
with total and branch Mastery derived from actual SP spend. Priority Tag replaces
the retired multi-target action with a current-target Focus decision: its rank is
stored on the target, multiplies only that target's Signal/Notes rewards, and is
rendered as a signal-colored targeting bracket.

Fresh evidence on 2026-07-18:

- `node qa/run-tests.mjs` → `ALL PASS`, including the tag target/rank/Focus/reward contract;
- `node qa/pacing-profiles.mjs` → `PACING PASS · 3 SEEDED BUILDS`;
- `node qa/playthrough.mjs` → `PLAYTHROUGH PASS`;
- `node qa/long-run.mjs` → `LONG RUN PASS`;
- direct installed Google Chrome CDP, always `mute=1`, at 375×812, 428×926,
  and 844×390: Scan/Verify/Relay visible, nine skill decisions, four Mastery
  badges, SP absent outside Build, 44px minimum touch, 0px overflow, and zero
  console warning/error entries.

Chrome evidence is stored in `qa/screenshots/pr4b-build/`.

## PR-4a · Build V2 domain

Issue #21 replaces the generic attribute tax at the domain/save layer. The v3
shape migration reconstructs every supported skill-rank cost, adds the three
legacy attribute spends plus unspent SP, clears the old allocation, and writes a
`buildVersion` marker so reload cannot refund twice. Retired mask skills remain
the explicitly accepted historical loss.

Deterministic evidence:

- exact fixture refund: 18 SP, unchanged after a second load;
- Scan/Verify/Relay Mastery: 7/2/3 SP from named ranks, total 12;
- seeded Zone-200 profiles: Scan 6.9 h, Verify 17.7 h, Relay 19.7 h;
- `node qa/run-tests.mjs` → `ALL PASS`.

- Build: `feat/R-005-free-mvp-economy` stacked on `release/apn-idle-redesign-v1`
- Evidence date: 2026-07-15
- Browser: direct Chrome Extension control, always `mute=1`
- Automated gate: `node qa/run-tests.mjs` → `ALL PASS`
- Long-run gate: `node qa/long-run.mjs` → `LONG RUN PASS`

## R-005 free MVP economy cut

The launch build has no Purchases section, demo store, APN Pro badge/catalog,
coin pack/reward, paid Auto-Sprint, timed 2× Boost, Time Warp, or paid Gear Box.
`economyMult` now equals Live Mult. Legacy premium fields still round-trip through
v2 saves but cannot change damage, income, Sprint, offline efficiency, Ship, or
End Season.

Fresh evidence on 2026-07-15:

- `node qa/run-tests.mjs` → `ALL PASS`, including negative store/power contracts;
- `node qa/playthrough.mjs` → `PLAYTHROUGH PASS`, Zone 21 and a successful free
  End Season with Live ×1.0397;
- `node qa/pacing-profiles.mjs` → first boss 10.9m, first End Season 30.0m,
  `PACING PASS`;
- `node qa/long-run.mjs` → `LONG RUN PASS` through the Zone 1000 profile;
- Chrome Extension at 428×926 with `mute=1`: 0px overflow, SFX unchecked,
  zero warning/error logs, no purchase nodes/terms, HUD title `Live Mult ×1.00`,
  and Sprint returns to `aria-pressed=false` with no held/Auto state.

The current Run/Menu captures are stored in `qa/screenshots/r005-free-mvp/`.

## I-045 mobile input hardening

A physical iOS Safari review on 2026-07-15 exposed selection handles after an
imprecise hold/drag on the Run surface. The shipped document rule used only the
standard `user-select`; it did not explicitly own WebKit selection, iOS
touch-callout, or native media-drag behavior.

The release candidate now applies standard + WebKit selection guards and the
iOS callout guard to the complete document, plus a media-drag guard to images,
SVG, and Canvas. `qa/check-mobile-gestures.mjs` captured the three missing guards
as a failing test before the fix and passes after it while also proving that
`touch-action` is not disabled globally.

Muted Browser evidence at 393×852: 0px horizontal overflow; zero console
warning/error entries; Gear sheet scroll moved 0→96px; native Gear sort changed
to Rarity; the sheet reopened/closed with correct expansion state; Sprint
released to `aria-pressed="false"` with no held class. The cache-busted stylesheet
is `game.css?v=redesign-v1-gesture-fix`.

The owner confirmed the physical iOS Safari long-press recheck on 2026-07-15:
no selection handles or native callout returned. Release status: **ready**.

## Integrated device matrix

Every row covers Run, Build, Ship, Hub, Boosts, Menu, and Gear. The 35 accepted
captures live in `qa/screenshots/redesign-v1/` and are shape-checked by
`qa/check-visual-baselines.mjs`.

| Class | Viewport | Screens | Min touch | Horizontal overflow | SFX | Copy |
|---|---:|---:|---:|---:|---|---|
| iOS-size safe-area proxy | 428×926 | 7/7 | 44px | 0px | Off | Pass |
| Android-size proxy | 412×915 | 7/7 | 44px | 0px | Off | Pass |
| Small portrait | 375×812 | 7/7 | 44px | 0px | Off | Pass |
| Desktop embed | 480×900 | 7/7 | 44px | 0px | Off | Pass |
| Landscape | 844×390 | 7/7 | 44px | 0px | Off | Pass |

Direct Chrome also returned zero warning/error console entries after the final
cache-busted load. Gear evidence exercised item selection, equipped-stat delta,
Rarity sort, Weapon filter, and restoration to the default Power/All view.

## Performance evidence

Measured on the final local static build at 428×926 with the opt-in
`qa_metrics=1` probe:

| Budget | Measured | Result |
|---|---:|---|
| First playable, Wi-Fi/local | 181ms | Pass (`<3.5s`) |
| Frame cadence | 89.8 fps on the active display | Pass (floor `45 fps`) |
| JS heap | 6.6 MB | Pass (`<180 MB`) |
| Sheet open → rendered | 2.7ms | Pass (`<150ms`) |
| First-playable assets | 2,384,094 bytes | Pass (`<5 MB`) |

The probe only writes read-only `data-qa-*` values when the explicit query flag
is present; normal gameplay does not expose or update them.

## Product gates

| Gate | Evidence | Result |
|---|---|---|
| Silhouette | Ten canonical GLB-derived Host poses; pivot ≤1px, ratio drift ≤3% | Pass |
| Art grammar | 20 pack sets, 12 item atlas cells, shared Patchline grammar | Pass |
| Tokens | 0 raw CSS palette literals; 0 raw font-size lengths | Pass |
| Layout | Five viewports × seven screens, 0px overflow | Pass |
| Touch | All visible controls ≥44px; static Safari contract, 393×852 interaction chain, and physical iOS long-press pass | Pass |
| Contrast | Notes 7.01:1; SP 6.52:1; canonical text roles use locked floors | Pass |
| Decision | One Run CTA; neutral nav state; one decision per sheet | Pass |
| Copy | Five player-facing sources pass banned-copy scan; Focus migration tested | Pass |
| Economy | Signal/Notes/SP/Rep roles and Canvas event tones tested | Pass |
| Perf | Asset, fps, heap, cold-start, and sheet budgets above | Pass |
| Memory | Two-pack decoded cap, transition release, explicit cold release | Pass |
| A11y | Mute, OS/in-app reduced motion, expansion state, touch floor | Pass |
| Regression | 35 accepted JPEG baselines with exact viewport dimensions | Pass |
| Domain | deterministic RNG, combat, Route, Gear, save, offline, Zone 1000 | Pass |

## Severity result

Open Blocker: 0 · Critical: 0 · Major: 0. I-045's physical iOS Safari recheck and
R-005's free-economy/browser contracts are green. Asset replacement remains a
separate visual-owner gate and is not misreported as release-ready here.
