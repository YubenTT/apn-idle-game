Original prompt: Complete the APN Idle redesign autonomously, including QA, review, and a muted localhost build for the final integrated user gate.

## 2026-08-24 — Enhanced Edition session

- Owner-directed release on `feat/enhanced-edition`, branched from `main` at
  `c1298dc`: make the shipped game read as a crafted, complete, long-horizon idle
  without touching the locked balance curves, the sealed GAF2D V4 authority, or
  any human approval gate. Plan:
  `docs/superpowers/plans/2026-08-23-apn-idle-enhanced-edition.md`.
- Eight slices shipped in order, each with its lockstep QA and doc updates:
  1. **E1 · authored wave composition** — all 20 Packs get a designed ten-wave
     rhythm in `js/wave-roster.js`, replacing the single probability table; type
     mixes held inside the existing envelope so the balance gates stay green.
  2. **E2 · Signal Drift made visible** — tier-stepped corruption masks, five
     named eras across the 200–1000 stretch, era-named Milestone Gate titles, the
     one-time **Patchline Complete** record and cinematic at zone 1000, a
     permanent Route trophy card, and **Endless Rating** for post-1000 play.
  3. **E3 · Pack set dressing** — the manifested but never-drawn `props.webp`
     cells now render as a deterministic near-ground strip with the Pack accent
     threaded into billboard and rail treatments. No asset changes.
  4. **E4 · character presentation correctness** — `stageRoleForEnemy` honors the
     authored `elite` role (Site Sentinel at its approved 84 px) and the
     Gear-sheet Hero preview uses the real stage geometry contract. Ladder values
     unchanged, so the ten-document geometry contract stayed green.
  5. **E5 · the APN story, spoken** — 60 unique Echo discovery lines (20 Packs ×
     3), the Echo Archive as trophy case, and a title-screen tagline rotation
     plus one in-world line.
  6. **E6 · FTUE and UX honesty** — skill chips hidden until usable, staged
     single-concept tips on real triggers, a structured per-currency offline
     receipt replacing the `<pre>`, **Wave n/10** as the single ten-step label,
     and the targeted CSS debt deletions.
  7. **E7 · Pack audio motifs** — `js/sfx.js` derives a deterministic two-to-four
     note WebAudio motif per Pack from a genre family table plus an id-hash pitch
     offset (no assets, no `Math.random`), fired on Pack entry and Gate boss
     spawn behind the existing mute and reduced-motion silence.
  8. **E8 · release mechanics** — `RUNTIME_BUILD_ID` swept `gaf2d-motion-v1` →
     `enhanced-v1` across `index.html`, every relative runtime import, and the QA
     scripts that pin the token; `docs/EMBED.md` corrected to the real
     `sync-idle-game.mjs` projection plus Cloudflare Workers deploy and the
     `apn_idle_save_v2` / `v: 3` health check, with a ship checklist added;
     CHANGELOG, ROADMAP, ARCHITECTURE, NAMING, and this record updated.
- Balance is untouched and proven untouched: `js/formulas.js` `C` constants have
  zero changes and `node qa/check-balance-targets.mjs` reports the same settled
  successor Gate acceleration ratios as the pre-slice baseline — scan
  `0.885x / 0.439x`, verify `0.839x / 0.386x`, relay `0.742x / 0.482x` — with
  Zone-1000 bounds still inside their locked targets (ordinary hits 217.71,
  boss hits 1978.01, per-zone 30.48 min, aggregate 319.55 h, 100 Gates).
- `node qa/run-tests.mjs` ends `ALL PASS`. The Chrome matrix on
  `127.0.0.1:8791` is green: route smoke across its viewport set and the 20-Pack
  catalog/rights smoke, both with zero console errors and zero horizontal
  overflow, re-run after the cache-token sweep so a missed import specifier would
  have surfaced as a 404.
- No commit, merge, or deploy ran in this slice; `git diff --check` is clean.

## 2026-08-12 — ALL-257 production enemy-visibility incident started

- New owner request: live `https://allpatchnotes.com/idle/` shows combat/HP/name but no creature body; diagnose broadly, fix without overengineering, then PR/merge/deploy and leave both repositories clean.
- Production reproduction: Fortnite Route 24 / Pack wave 4, `Storm Runner`, decoded Pack atlas `896×128`, `motion.status=unmapped`, correct 72×72 stage geometry, but zero target-colored pixels inside the body envelope. Required requests and state are healthy.
- Root cause: `draw()` creates a new interpolation copy per frame while static and legacy spawn clocks use object identity. Their `WeakMap` restarts every frame and pins body scale to zero. Mapped V4 motion bypasses that path, matching the visible Hero/V4 versus invisible non-motion cast symptom.
- Tracking: Linear `ALL-257`; isolated branch `codex/ALL-257-enemy-visibility`; plan `docs/superpowers/plans/2026-08-12-enemy-visibility-production-fix.md`.
- Guardrails: no art, balance, save, catalog, rights, or public QA changes; regression-first, one efficient browser CI addition inside the existing job, exact game→Web projection, exact production readback, rollback on any mismatch.
- RED confirmed after correcting one test-fixture ordering mistake: `node qa/check-creatures.mjs` exits 1 at `interpolated static Pack target completes spawn scale for one persistent actor`. The atlas/store fixture is valid; the second interpolation copy still receives a zero body scale, matching production.
- Minimal GREEN: static and legacy painters now receive the existing persistent `retentionOwner` only for their first-seen clock; interpolated coordinates still come from the render copy. `check-creatures`, `check-motion-bundle`, and `check-motion-store` pass.
- Efficient browser gate: the existing catalog/rights Chrome process now checks material actor-body pixel differences for the complete runtime-safe catalog (20/20), Fortnite mobile/short landscape, Valorant V4 motion, one warmed legacy creature owner, and the procedural required-asset fallback. It adds no CI job, install, matrix, server, or duplicate invocation and runs in about 12 seconds locally.
- Fresh integrated verification: `npm test` ends `ALL PASS`; Chrome Route and Go Live matrices pass; catalog/rights/visibility passes with no unexpected console finding or horizontal overflow. Representative Fortnite, Valorant, legacy, and procedural-fallback captures were visually inspected. No additional product defect surfaced in the exercised game/runtime scope.
- Independent review found no P0/P1/P2 defect and two P3 test-strength gaps. Both are closed: every pixel subtraction now proves byte-identical domain state, identical text projection, and preserved enemy identity after measurement; the legacy branch requires exactly one owner and the exact five-clip set. The complete 20-Pack Chrome gate remains green after those changes.

## 2026-08-12 · Complete-game closure goal

- Owner-authorized outcome: make APN Idle a complete free small web idle game,
  then merge and deploy it through APN Web. Approved GAF2D V4 authority stays
  sealed; no new art, framework, backend, currency, second prestige, paid power,
  or Pack-specific engine is in scope.
- Verified starting truth: `apn-idle-game`, `apn-web`, and canonical `gaf2d`
  mains were clean and upstream-aligned; no open game PR existed; live
  `https://allpatchnotes.com/idle/` returned HTTP 200 with the current V4 cache
  family. The dirty historical alternate GAF2D checkout is explicitly out of
  bounds.
- Isolated worktree: `.worktrees/complete-game-closure`; the active rights slice
  is `codex/apn-idle-rights-catalog` based on merged `origin/main`. Fresh
  baseline `npm test` = `ALL PASS`.
- Accepted design:
  `docs/superpowers/specs/2026-08-12-apn-idle-complete-game-closure-design.md`.
- Executable plan:
  `docs/superpowers/plans/2026-08-12-apn-idle-complete-game-closure.md`.
- Rights decision: use truthful `pending-review` records and an explicit runtime
  policy; never invent legal approval. Gameplay uses APN display titles, raw
  names stay editorial-only, and blocked/kill-switched Packs are excluded.
- Delivery order: Route/Echo (#24) → Coverage/Sets (#25) → rights/catalog (#26)
  → numeric balance (#29) → APN Web projection/deploy (#30/#31). Each slice must
  be green, reviewed, and merged before the next.

- Task A1 RED confirmed: `node qa/check-route-journey.mjs` exited 1 at module
  instantiation because `js/route.js` does not export `ECHO_TOTAL`. This is the
  intended production gap; no fixture or environment failure occurred.
- Task A4 browser RED confirmed: `node qa/browser/chrome-route-smoke.mjs`
  reached a playable, console-clean Zone 1 at 428×926, then failed because the
  HUD still hid the new data-bound Echo `0/3`. The new Route-first DOM did not
  exist yet; production UI is the isolated gap.
- Route/Echo GREEN evidence: focused domain `ROUTE JOURNEY PASS`; offline
  `LONG RUN PASS`; full `npm test` = `ALL PASS`; direct Chrome covers 375×812,
  428×926, 844×390, and 1280×800, including real combat Echo `1/3`, current/next,
  Clean Era Complete, Signal Drift 1, history, `render_game_to_text`, zero
  horizontal overflow, and zero console warnings/errors. Four representative
  screenshots were visually inspected.
- Review found and fixed four pre-merge edge cases with new regressions:
  monotonic Clean Era migration for a genuine pre-Echo Zone-200 save;
  reconstruction of Pack progress earned while an old v3 rollback was active;
  an incorrect promised-next Pack at the second postgame pair boundary; and
  unsafe Pack IDs from tampered localStorage reaching Route history markup.
  Route normalization now accepts only canonical kebab-case Pack IDs and the
  UI never renders an unknown ID as a title.
- Save rollback safety is explicit: current v3 persists `apn.route-journey@1`
  under opaque meta state; an old v3 client preserves it while still earning
  legacy Pack completion, and the current client merges both histories on
  return. Approved V4/GAF2D asset and authority paths are untouched.
- Route/Echo shipped through ready PR #44. GitHub CI and GitGuardian passed;
  squash merge `817b7c8` is on `origin/main`, issue #24 closed, and the old local
  and remote branch were removed before Coverage work began.
- Task B1 RED confirmed: `node qa/check-coverage.mjs` exited 1 with
  `ERR_MODULE_NOT_FOUND` for the absent `js/coverage.js`; no fixture or
  environment failure was involved. Browser RED reached playable/console-clean
  Zone 1 and failed because the Route had zero Coverage Set cards.
- Coverage GREEN: five exact mastery levels/costs, revisit-only +5% to +25%,
  exact 20-Pack/7-Set partition, explicit permanent claims, four bounded scoped
  effects, v3 save/Go-Live preservation, and no-Live-Mult/no-paid-path firewall
  all pass `qa/check-coverage.mjs`. Review corrected Rapid Defuse to preserve
  Gate max HP while starting at 95% current HP.
- Direct Chrome at 375×812, 428×926, 844×390, and 1280×800 buys mastery through
  the actual Route control, claims S1, reads the immediate save and text QA,
  and stays overflow/console clean. The saved test state is removed between
  scenarios. Representative fresh and postgame captures were inspected.
- Final self-review restored every test-owned global, bound the current
  Coverage rules into the doc contract, and found no production scope leak.
  The fresh full tree ends `ALL PASS`; final focused Coverage/docs, syntax,
  diff, pacing, long-run, and Chrome checks are all green.
- Gate-M pacing is measured, not guessed: Scan/Verify/Relay first Gate
  7.7/10.0/17.7m; mature median 27.0/64.7/82.6m; Zone 200 4.2/9.5/12.1h.
  Relay's remaining >15m miss is explicitly reserved for the numeric balance
  slice. Zone 1000 remains deterministic and finite.
- Coverage/Sets shipped through ready PR #45. GitHub CI and GitGuardian passed;
  squash merge `b98b516` is on `origin/main`, issue #25 closed, and the old
  local/remote branch was removed before rights/catalog work began.
- Task C1 RED confirmed: `node qa/check-catalog-rights.mjs` exits 1 because the
  production generator has no import-safe `buildCatalog` service. The new
  contract already covers a closed versioned Pack pointer, raw-mark title
  rejection, missing/escaping rights pointers, fake review evidence,
  pending-review warnings, blocked/kill-switch exclusion, and a valid Pack 21.
- Rights/catalog GREEN: all 20 Pack pointers and closed `rights.json` records
  resolve through one import-safe builder. Raw game names remain editorial-only;
  APN titles/target/boss labels are runtime identity, and the Asset Bible now
  describes original archetypes rather than named athletes or characters.
- No legal approval is invented. All current records remain
  `pending-review`/`needs-legal-review` with null reviewer/time/evidence. Policy
  defaults future unresolved Packs to blocked and enumerates the current twenty
  as the only transitional warning roster. Resolved Pack 21 passes; unresolved
  Pack 22 is excluded.
- Closed gates now reject unknown keys, escaping or symlink authority, stale
  provenance, incomplete license scope, fake review evidence, raw marks, named
  third-party runtime terms, blocked records, and active per-Pack kill switches.
  Catalog count is derived; generated catalog/module/asset manifest are current.
- Real Chrome at 428×926 proves three independent states: disabling Valorant
  selects League without save corruption; a required background failure keeps a
  playable progress-safe Canvas fallback; zero eligible Packs keep a stable APN
  shell with no invented Pack identity. All have zero overflow and zero
  unexpected console findings; screenshots were inspected.
- Fresh focused catalog/assets/Route/Coverage/copy/docs/manifest/syntax checks
  are green. Full `npm test` ends `ALL PASS`. A test-harness regression found by
  that run was traced to the removed authored-list variable and fixed by using
  the rights-filtered active projection throughout the downstream V4 budget
  fixtures.
- Rights/catalog shipped through ready PR #46. GitHub CI and GitGuardian passed;
  squash merge `e5e3781` is on `origin/main`, issue #26 closed, and the old
  local/remote branch was removed before balance work began.
- Task D1 assertion-first RED was production-only: the first run exposed Relay
  at 17.72m, only 1.136x neutral overflow yield, and sub-10% settled cycle
  acceleration. Review then corrected two measurement flaws before tuning:
  active profiles now use their actual Hotfix/Priority Tag/Overclock controls.
  Successor-cycle evidence uses the fixed final post-ceiling window and requires
  both ratios to pass independently; there is no median/outlier allowance.
- Tuning round one is sufficient; no second round or firewall exception is
  needed. The named permanent-power HP exponent is 0.4, neutral overflow is
  75%, and Relay restores two points per Mastery up to active yield. Final
  Scan/Verify/Relay first Go Live is 7.12m/14.35m/7.78m; Zone 200 is
  3.92h/7.96h/3.84h; Scan is 2.789x neutral zones/hour; Verify is 2.291x Scan
  Rep/cycle; Relay is 1.333x neutral overflow. Settled successor ratios are
  Scan 0.884x/0.850x, Verify 0.853x/0.371x, and Relay 0.506x/0.627x. Zone-1000
  bounded-work evidence remains 15.17 minimum
  ordinary hits, 217.71 max ordinary, 1978.01 max Gate, 20 max kills, 30.48 max
  combat minutes, 319.55 aggregate combat hours, and exactly 100 Gates.

- Fresh final verification is green: the stricter balance target, pacing,
  long-run, coverage, JavaScript syntax, `git diff --check`, and complete
  `npm test` all exit 0. The Route Chrome matrix passed at 375×812, 428×926,
  844×390, and 1280×800 with no console warning/error or horizontal overflow.
  Visual inspection caught a DPR2 screenshot tiling defect in the evidence
  harness; capture now emits and asserts exactly one logical viewport, and the
  corrected landscape/mobile evidence was visually rechecked.

**Single next step:** finish the final diff/self-review, commit and push the
balance slice, open ready PR closing #29, wait for CI plus GitGuardian, merge,
then freeze clean game `main` for the APN Web projection/deploy slice.

## 2026-08-09/10 V4 owner approval and production promotion

- The owner explicitly approved all seven `MotionSetCandidateV4` records. Seven
  hash-locked `MotionSetApprovalV4` documents now bind the approved candidates;
  this motion approval does not grant the separate APN Hero rig authority.
- Entry Runner, Protocol Courier, Signal Hunter, Site Sentinel, Site Warden,
  and Veil Operator passed current complete QA and deterministic export. Their
  production projection is exact-copy `approved_release` V4 WebP/JSON with
  release, approval, derivative, profile, candidate, and source hashes checked
  fail-closed. APN Hero is intentionally absent from the pack and remains
  `awaiting_rig_approval`.
- `valorant/pack.json` maps exactly those six releases. Current and next route
  windows load set metadata first and only the selected clip body. Preview,
  snapshot, synthetic-fixture, and shim authority cannot activate production
  motion.
- Route-aware memory accounting found and fixed an impossible-maxima sum. The
  real worst window is Valorant Wave 8+9 at 63,022,408 / 67,108,864 hot bytes;
  the 64 MiB cap remains frozen. V4 budget selection now scans every ordered
  pack instead of depending on catalog position.
- Real Chrome passed 60 production cases: Wave 1–10, normal/reduced, at
  375×812, 428×926, and 844×390. All six identities reported
  `approved_release`, exact approval lineage, zero fallback, zero overflow, and
  zero final console/network findings. Entry fixed-timestamp frames were
  pixel-distinct and replay-stable across hidden→visible lifecycle; Veil became
  drawable only after its selected `advance` descriptor/WebP loaded.
- Two consecutive complete Chrome runs produced byte-identical
  `qa/screenshots/gaf2d-production-v4/report.json`, SHA-256
  `05dfae9ab5be885f411345d04cb8947d6354a567548da83d9796eed70353eaa9`.
  Seventy-five screenshots plus the report form the durable production lane;
  representative portrait/landscape Wave 1/Wave 10 images were inspected at
  original resolution.
- CI exposed a machine-only test assumption: the legacy derivative harness
  expected locally installed exact ImageMagick/cwebp binaries. The harness now
  uses deterministic subprocess fixture tools when explicit tool paths are
  absent, while the local real-tool + real-release lane remains separately
  green. Tool version pins and production release bytes were not relaxed.
- Fresh broad gates: GAF2D 1,440 tests; asset V4 70 tests; game Node suite
  `ALL PASS`. No deploy or Hero rig approval was inferred.

## 2026-08-09 V3 technical closure and evidence lessons

- The loopback preview now consumes the exact `authored-semantic-v3` batch:
  7 assets, 39 clips, 795 frames, 30/32 FPS, and manifest SHA-256
  `75c521d43a9a2214fc75ff7a33e5158c05a1d08f0af34edb07cf4d7caea8d2c8`.
  It remains visibly labeled `unapproved_preview` / `human_review_required`.
- Real Chrome passes all 39 clips at 60/90/120/144 Hz, renders 18 native-size
  light/dark witnesses, and proves three nonblank authored frames immediately
  after a fully cold current-wave set/advance load. The four gameplay captures
  are the actual game (review panel hidden), authored motion is `ready`, console
  and network problems are zero, and viewport overflow is zero.
- Two evidence bugs were found by inspecting the screenshots rather than
  trusting filenames. First, deterministic simulation steps ran in one browser
  turn and starved asynchronous fetch/decode; the cold test now yields between
  fixed steps, matching the real repaint loop. Second, files named `gameplay`
  still showed the review overlay; the capture lane now omits `motion-review=1`
  and asserts the panel is hidden. A test artifact must prove its named claim.
- A third evidence leak was caught by comparing repeat-run hashes: random spawn
  IDs/timing made the JSON report change even when every assertion passed. The
  disposable Chrome QA pages now use a fixed random seed, and consecutive full
  runs produce the same report bytes without changing production randomness.
- Final review also tested whether `advance` and Hero `run` should become
  optional. They must not: V3 character/boss sets are closed-world and require
  `advance`, while Hero sets require the exact eight-clip vocabulary including
  `run`. A future role with a different vocabulary needs an explicit versioned
  contract, not a permissive runtime fallback that could hide malformed art.
- The Luna/ComfyUI comparison reinforced the production rule: nominal 100 FPS
  can still be duplicated or ping-ponged motion, while a 16.7 FPS GIF can hide
  a hard loop seam, topology pops, and prop drift. GAF2D therefore judges
  semantic body changes, integral loops, root/body coupling, topology/contact,
  alpha on light/dark, native game size, and the real consumer independently.
- Runtime remains lazy and bounded: set metadata is not drawable readiness;
  spawn waits for the current `advance` clip, cold transitions retain the last
  authored frame, and only selected clips are fetched/decoded. The compressed
  V3 total is 3,006,743 / 3,670,016 bytes (22.1% headroom).
- Fresh verification: `node qa/run-tests.mjs` ends `ALL PASS`,
  `node qa/browser/chrome-motion-continuity.mjs` passes 39/39, syntax and
  whitespace checks are clean. No paid call, upload, approval, production
  promotion, push, or deploy occurred. The remaining gate is human review of
  the complete animated set.

## 2026-08-08 V3 continuity harness lane

- Added `qa/browser/chrome-motion-continuity.mjs` as the missing real Chrome
  continuity lane for authored-semantic-v3 review authority.
- The harness is self-contained: it can serve the repo locally, open headless
  Chrome, verify the review surface, sample all 39 clips at `60/90/120/144`
  Hz, render native-size `64/80/128` light/dark witnesses, and capture the
  four requested gameplay viewports once the real V3 bundle exists.
- Follow-up hardening added reviewer-requested checks inside the same lane:
  per-viewport console/network assertions, rendered alpha/bounds validation for
  every loaded clip frame, descriptor-owned progress hold checks, and a real
  cold-start gameplay visibility proof when the per-clip runtime is present.
- Current RED is deliberate and verified: the local `.gaf2d-preview` still
  exposes `sourceFamily=authored-semantic-v2`, `7/39/276`, and legacy creature
  `motion.json`/`motion.webp` entries, so the review surface stays blocked and
  the continuity lane fails closed instead of fabricating pass evidence.
- `qa/run-tests.mjs` and CI now syntax-check the harness. CI only executes the
  runtime lane when `.gaf2d-preview/manifest.json` exists in the checkout,
  which avoids breaking the shared branch before the V3 materialization task
  lands.

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

- 2026-07-31 CI right-sizing is documented in this worktree: one public-repo CI
  job now preserves `node qa/run-tests.mjs`, both direct-Chrome smoke paths, and
  a final always-running upload attempt for any smoke evidence already produced,
  while stale-run cancellation, a 15-minute timeout, and 7-day artifact
  retention reduce compute/storage/job overhead rather than billed
  standard-runner minutes.
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
- Fix-round review found that the 844×390 standard-target plate was still
  painted behind the two-row DOM stage HUD. Commit `148cf05` replaces the
  stale fixed 78 px reservation with the measured HUD edge, reserves each
  enemy plate as fixed overhead above its scaled motion envelope, and keeps
  compact/full plate selection branch-consistent. The component-bound RED
  measured plate y `81.2247..111.2247` against safe y 103; GREEN measures
  `103..133`, and the post-commit browser measures the final plate at
  `105..135` below the measured HUD bottom y 103.
- Second fix-round review found the 844×390 boss timer was painted after and
  across that now-correct plate. Commit `69a1b37` makes the plate and timer
  consume one pure functional layout; only a real 2D collision moves the timer
  into the wider horizontal lane. The boss plate remains
  `{x:274.12,y:105,w:91.76,h:30}` while the labeled timer moves from the
  overlapping `{x:151.92,y:108,w:540.16,h:24}` rect to
  `{x:377.88,y:108,w:450.12,h:24}`. Portrait placement remains centered and
  unchanged.
- Final review then found the boss timer collision probe still used
  `activeBoss.displayX - scrollSmooth` while the real plate remains anchored to
  `enemy.displayX` screen space. The new RED contract in
  `qa/check-gaf2d-valorant.mjs` sets `scroll=scrollSmooth=240` on the 844×390
  Wave 10 scene and reproduces the overlap with the timer falling back to the
  centered `{x:151.92,y:108,w:540.16,h:24}` lane over the unchanged plate.
  The fix keeps the timer collision layout in screen space, so the same
  scrolled scene now reuses the safe right lane
  `{x:377.88,y:108,w:450.12,h:24}` with the `SITE WARDEN` label still visible.
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
  pass. The final complete `node qa/run-tests.mjs` gate exits 0 with 2,143
  lines and ends `ALL PASS`; `git diff --check` is clean.

| Viewport | Canvas | Standard fit | Boss fit | Ground Y | Normal + reduced motion |
|---|---:|---:|---:|---:|---|
| 375×812 | 375×456 | 1 | 1 | 392.16 | pass |
| 390×844 | 390×488 | 1 | 1 | 419.68 | pass |
| 428×926 | 428×570 | 1 | 1 | 490.20 | pass |
| 844×390 | 844×216 | 0.5428087 | 0.5 | 185.76 | pass |

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
  `stage-presentation-844x390.png`,
  `stage-presentation-844x390-wave10.png`, and
  `stage-presentation-wave10.png`. The Wave 10 capture is 428×926 and shows
  the real Site Warden `broken` clip at 33% HP with a clear plate; the new
  844×390 Wave 10 capture plus the scrolled headless contract prove the compact
  plate and labeled timer stay visible in separate horizontal lanes even after
  substantial camera scroll.
- The complete derivative remains `unapproved_preview` /
  `human_review_required`. No paid call, upload, push, publish, or deploy
  occurred. The only remaining gate is explicit human approval or rejection
  of the complete authored motion set.

## 2026-07-31 high-cadence runtime verification

- Re-ran the focused runtime contract after adding the 30+ FPS authored-motion
  path. `node qa/check-motion-bundle.mjs` and
  `node qa/check-hero-motion-semantics.mjs` both pass.
- The independent elapsed-time oracle checks every repaint tick for 60, 90,
  120, and 144 Hz, including exact loop wrap, progress-bin clamping, queued
  Hero attacks, hit/death progression, and fixed simulation timestamps.
- This is runtime timing evidence only. The final 7-asset / 39-clip /
  795-frame producer-v2 pack is not integrated yet, and no creative approval,
  export, push, merge, or deploy has occurred.
- Freezing the canonical V3 acting contract exposed two stale parallel
  assumptions in the preview validator: loop sampling accepted only the C1
  profile, and secondary actions accepted only the smallest shape. The
  canonical contract also contains C2 interpolating loops plus typed joint
  clearance, extrema stabilizer, basis, and zero-crossing evidence. The focused
  preview build first failed on both stale assumptions, then passed after the
  validator learned those exact bounded variants.
- `scripts/assets/motion-v3-acting-contract.json` is now an exact byte copy of
  the corrected canonical APN 7/39/795 contract, SHA-256
  `92e851f19934c86a791a3a705090af6d67c1dece88c9f1a14e614c2d6da08457`.
  The audit rejected the earlier bytes because Courier and Hunter extrema
  amplitudes were transposed. The focused preview builder passes two
  byte-identical builds, hash-binds the corrected snapshot into every asset,
  and keeps the result `unapproved_preview` / `human_review_required`.
- APN Hero idle now declares the same periodic C2 sampler used by its producer
  and final-raster path. This removes two sub-threshold extrema transitions
  without adding a secondary action or weakening cadence QA. The game contract
  validator also accepts canonical ordered zero-crossing boundaries beginning
  at frame zero; Site Warden hit freezes the valid `[0, 4, 5]` profile.

## 2026-08-01 authored-semantic-v3 runtime core

- Runtime preview loader now accepts both legacy `authored-semantic-v2` creature bundles and per-clip `authored-semantic-v3` creature sets under the same fail-closed loopback gate.
- `js/motion-store.js` now supports a two-stage warm path for V3 creatures: asset-level `set.json` first, then lazy clip-level descriptor/WebP fetch on first clip demand. Cold release still stays asset-window scoped.
- `js/render.js` now requests V3 creature clips lazily from actual selected combat state and uses the fetched clip descriptor for frame selection and blitting.
- `js/motion-bundle.js` blitter now accepts both legacy bundle records and V3 clip records with set-owned trim/frame/pivot geometry.
- Added red/green QA for V3 preview manifest acceptance and lazy clip load:
  - `qa/check-motion-preview.mjs`
  - `qa/check-motion-store.mjs`
- Focused green commands used the active workspace Node runtime because the
  then-installed Homebrew Node was missing `libsimdjson.29.dylib`:
  - `$NODE qa/check-motion-store.mjs`
  - `$NODE qa/check-motion-preview.mjs`
  - `$NODE qa/check-motion-bundle.mjs`
  - `$NODE qa/check-gaf2d-valorant.mjs`
  - `$NODE qa/check-motion-preview-ui.mjs`
- Remaining from the parent ask: the dedicated loopback review/query UI for selecting every actual asset/clip and watching the real animation in-browser is not implemented in this slice yet.

## 2026-08-01 loopback 39-clip review surface

- Added a loopback-only real-browser review surface at `?motion-preview=1&motion-review=1`.
- The panel is hidden outside the existing loopback preview gate and stays fail-closed when the active preview package is not the exact smooth `authored-semantic-v3` 7/39/795 batch.
- `js/motion-review.js` owns:
  - explicit review query gating
  - exact 39-entry catalog construction from the smooth preview manifest
  - portable-path validation for every preview descriptor/image/set path
  - hash-locked set/descriptor/image loading for both Hero and creature clips
  - actual canvas playback using declared clip FPS/playback and real frame descriptors
  - per-clip viewed state in localStorage keyed by batch SHA-256
- UI wiring:
  - `index.html` review panel markup
  - `css/game.css` review panel styles
  - `js/main.js` mount path after preview activation
- Focused QA added:
  - `qa/check-motion-review.mjs`
  - updated `qa/check-motion-preview-ui.mjs`
- Focused green commands (workspace Node runtime):
  - `$NODE qa/check-motion-review.mjs`
  - `$NODE qa/check-motion-preview-ui.mjs`
  - `$NODE qa/check-motion-preview.mjs`
  - `$NODE qa/check-motion-store.mjs`
- Not added in this slice: a separate automated Chrome continuity harness for the review panel itself. The runtime/path/state contracts are covered; live browser capture remains for the parent task if required.
- Follow-up full-suite review rejected raw review-surface palette literals and a
  formatting-sensitive GAF2D documentation check. The panel now uses canonical
  design tokens, while doc QA normalizes case and whitespace without dropping
  any required runtime-geometry phrase.
- Follow-up lifecycle review found that visiting all 39 clips would retain every
  decoded bitmap and that rapid selection could let a stale async load replace
  the current clip. `createMotionReviewSession` now owns exactly one active
  decoded runtime, generation-tags selections, closes previous/stale/destroyed
  completions, and surfaces current-load failures without an unhandled promise.
- The review loader also rejects and closes a hash-bound WebP whose decoded
  dimensions differ from its descriptor atlas. Catalog validation now locks the
  exact seven assets and per-asset 39-clip vocabulary instead of trusting counts
  alone. These regressions are covered by `qa/check-motion-review.mjs`.

## 2026-08-01 canonical V3 canvas handoff

- Reconciled the implementation with the authoritative high-smoothness design:
  historical V2 stays exactly 640×640, while new authored-semantic-v3 sources
  are exactly 128×128. This avoids carrying the stale V2 canvas into the final
  795-frame package.
- Added a red/green preview-builder contract that rejects any V3 candidate not
  using the canonical 128×128 canvas, derives runtime geometry from the locked
  candidate canvas, and proves every V3 asset remains at scalePpm 1,000,000 in
  the representative package (no runtime-source upscaling).
- Focused command is green with the workspace Node runtime:
  `$NODE qa/check-gaf2d-preview-build.mjs`.
- The complete pre-integration game matrix is also green with
  `GAF2D_ROOT=<gaf2d-worktree>`
  and bundled Node: `qa/run-tests.mjs` exits 0 with `ALL PASS`. This freezes a
  clean baseline before the real V3 package replaces the synthetic fixture.
- The canonical Hero correction profiles are now explicit acting authority,
  not hidden producer constants. The game snapshot and preview validator bind
  acting-contract SHA-256
  `34337bb58b611bad012f4e431042337c97774bf4dc0305c36b0484d2e0a437c8`
  and validate exact typed variants for idle peak calibration, run/celebrate
  phase-locked second harmonics, and death arm scaling. The focused preview
  build is green with the new snapshot and rejects unknown profile shapes.
- Final producer materialization, real derivative build, complete suite, and
  browser viewing of all 39 clips remain pending. Creative motion approval,
  export, push, merge, and deploy remain closed.

## 2026-08-01 V3 integration lesson

- Real builder-output to runtime integration is the contract gate; hand-built
  partial fixtures can guide unit coverage, but they cannot authorize cross-layer
  assumptions about manifest budgets, smooth Hero set shape, root acting/temporal
  lineage, transform bindings, or role-specific image caps.
- The REDs that exposed this were exact: smooth manifests illegally carrying a
  `firstPlayable` budget, generic Hero V3 still routed through the specialized
  Hero validator/draw path, swapped-valid Hero set bytes loading without a bound
  set hash, and smooth set/image mutations failing by stale-hash accident instead
  of the intended fail-closed authority checks.
- Permanent regression coverage now stays fail-closed at the real boundaries:
  builder schema asserts exact four-key manifest budgets, preview/review/runtime
  bind root acting and temporal authorities, set geometry must match manifest
  runtime transforms, generic Hero review draw consumes loader-normalized runtime
  geometry, and smooth clip bytes are capped and byte-count-checked by role.

## 2026-08-01 V3 runtime ownership lesson

- Per-clip authored-semantic-v3 runtime records do not own presentation
  geometry; the validated set index does. Any render path that reads stage
  intrinsics only from the clip descriptor silently falls back to legacy
  geometry even when the store and builder are otherwise correct.
- Runtime memory and builder budgets must describe the same thing. Keeping
  every independently loadable sibling clip decoded for one asset while
  budgeting only one active clip is false accounting. The current invariant is
  stricter and truthful: non-hero authored-semantic-v3 preview budgets sum all
  independently loadable clip atlases per asset unless a narrower mechanical
  state-machine bound is proven, while runtime frame arbitration keeps every
  clip selected for the current render and prunes only unselected siblings.
- Exact fetched-byte validation is part of the boundary contract. Hash-consistent
  clip descriptors with stale `atlas.bytes` must still fail before decode using
  the real fetched `imageBytes.byteLength`, not pass because the store validated
  only hashes and grammar.
- The permanent gate for this review round is one real builder-output to
  store-to-render integration assertion plus the sequential `advance -> engaged
  -> hit -> death` residency test. Synthetic partial fixtures remain useful, but
  they are not sufficient evidence for set ownership, resident-budget truth, or
  fetched-byte fail-closed behavior.

## 2026-08-08 lazy authored-motion runtime lesson

- A validated `set.json` is metadata readiness, not drawable readiness. Spawn is
  now gated by the selected current-wave `advance` clip reaching `ready` or
  `failed`; boot also awaits those exact pixels before first playable.
- Hero V3 no longer treats eight independent clips as one eager download. Boot
  loads only `set.json` plus `run`; every other descriptor/WebP is requested by
  live semantics. The bitmap invariant is one last-drawn authored clip plus at
  most one decoded replacement until its first successful draw.
- Creature transitions use the same continuity rule: `engaged`, `hit`, and
  `death` may warm independently, while the exact last successfully drawn frame
  remains visible. Cache pruning runs after drawing and preserves current-wave
  `advance`, the retained frame, and a warming replacement; it never substitutes
  the static body during a cold transition and never preloads all 39 clips.
- That retained frame is renderer state, not game state. It lives in a
  renderer-local `WeakMap` keyed by the enemy object, leaves simulation/save
  bytes untouched, and is reclaimed with the enemy object's lifecycle.
- The canonical asset manifest now marks seven non-current Hero clips cold.
  Measured first-playable compressed bytes are 271,795 in focused QA.
- Permanent focused regressions cover selected-only Hero fetches, cold
  `death.webp`, Hero replacement close accounting, set-vs-clip spawn gating,
  ready/failed gate semantics, first-spawn body visibility, no-blank
  `advance -> engaged -> hit -> death`, and bounded retained/warming residency.
- Preview activation now reads only the root manifest plus the seven small,
  hash-locked set indexes. All 39 clip descriptors and WebPs stay cold until
  gameplay or the explicit 39-clip review requests them; descriptor validation,
  byte limits, hashes, decoded dimensions, and diagnostics remain fail-closed at
  that demand boundary. This keeps package topology preflight separate from
  clip residency instead of disguising metadata eager-loading as lazy delivery.

## 2026-08-08 acting-contract ownership lesson

- The preview consumer previously hash-bound the canonical acting contract and
  then reimplemented producer-owned sampling-profile and secondary-action
  grammars. A valid new Site Warden death settle profile therefore failed in the
  game even though runtime never evaluates that authoring method.
- The consumer now verifies exact canonical contract bytes and SHA-256, the
  7-asset / 39-clip vocabulary, playback timing, and runtime-owned geometry and
  budgets. Producer sampling and secondary-action payloads remain opaque.
- The current snapshot SHA-256 is
  `fe5b7f5675dc543312fcb9691d4787f1ebd5a2871f8f4ad6f12e8f8f0307b4b8`.
  `qa/check-gaf2d-preview-build.mjs` passes the 7/39/795 real-shape fixture and
  statically rejects reintroducing a parallel producer-profile parser.
- This supersedes the 2026-08-01 note that the game should reject unknown
  profile shapes. GAF2D owns that grammar; the game owns faithful consumption.

## 2026-08-08 draw-pure presentation ownership

- The exact RED proved that `draw()` changed domain bytes and leaked repaint
  phase into later effects: root alpha 0 stamped enemy hit X 100, root alpha 1
  stamped hit X 116, and fixed 60-step outcomes produced four different hashes
  at 60/90/120/144 Hz.
- Stage geometry, semantic effect origins, and actor-removal retention now live
  only in renderer-owned `WeakMap` caches. `game.js` no longer owns or reads
  `world.groundY`, `world.stageFit`, or `world.actorGeometries`; floaters,
  particles, loot flights, shocks, and anchored confetti keep relative
  fixed-step motion plus semantic Hero/enemy anchors.
- Camera shake uses deterministic presentation noise, so repaint count cannot
  consume the domain RNG stream. Authored body frames remain discrete and only
  actor/world roots use residual-accumulator interpolation.
- A frozen `inspectStagePresentation()` snapshot replaces browser access to
  draw-stamped world fields. Focused GREEN leaves both alpha states unchanged,
  retains an enemy floater from `[216,170]` to
  `[216,169.66666666666666]` after actor removal, and gives all four refresh
  schedules SHA-256
  `53d04ddaef74768a13395f1c9a482d9a68fbcf7a80055cc7269570f3a8eab2f5`.
- `node qa/run-tests.mjs` ends `ALL PASS`; browser scripts were syntax-checked
  but not executed because this task explicitly prohibited starting a server.

## 2026-08-09 V3 contract-snapshot refresh lesson

- The game snapshot is an opaque, repo-versioned byte pin for the producer
  contract; it is not a second authoring schema. The current source and game
  snapshot are byte-identical at SHA-256
  `976700bb8168f8f3113625674785b0c56eea13b8d4fcb1e73002f4729a2bb8e2`.
- Repeated JSON keys such as `secondary_action` and `amplitude_mdeg` make broad
  textual replacement unsafe: a syntactically valid edit can land on the wrong
  asset. Every refresh must patch within asset/clip context, then require an
  empty byte diff against the canonical GAF2D contract before running preview
  QA. Hash equality is the final guard, not visual inspection of a few hunks.
- Runtime continues to validate only consumer-owned facts: exact contract
  bytes/hash, 7/39 vocabulary, timing, geometry, budgets, and temporal evidence.
  Sampling profiles and secondary-action payloads remain producer-owned and
  opaque to the game.

## 2026-08-09 Visual Fidelity V4 human-gate closure

- The current loopback preview is now `authored-semantic-v4`: exact 7 assets,
  39 clips, 795 frames, selected lossless WebP bytes copied without re-encoding,
  and explicit `unapproved_preview` / `human_review_required` state. V3 remains
  the immutable semantic authority rather than being rewritten or relabeled.
- Two fresh Chrome 151 runs completed all 39 clips at 60/90/120/144 Hz with
  zero continuity findings. Their deterministic report is byte-identical at
  SHA-256 `5cba094a30584038933ec25f1d342e30956927ec325b46b74a772205ed347d25`;
  the same-scale V3↔V4 report is byte-identical at
  `550de2aabdbcce47ac7cc7e97083c25d7dc32e2280bfb60238cef67c7381c317`.
- Same-size DPR2 evidence closes the original density failure: source-visible /
  displayed-device pixels are Hero 219/192, Courier 176/144, Sentinel 177/168,
  and Warden 258/224. V3 supplied only 101, 102, 96, and 100 pixels.
- Selected-only delivery is exact: seven set indexes, 40 JSON requests, and 39
  WebPs, all HTTP 200. Residency stays bounded to two current sets and three
  decoded clips including retained/warming state, with zero diagnostics.
- Wave 1, Wave 10, four gameplay viewports, native light/dark, review-surface,
  and same-scale screenshots were visually inspected without clipping, halo,
  blank actors, overflow, console, or network findings. `node qa/run-tests.mjs`
  ends `ALL PASS`.
- Project-contained evidence and V4 candidate documents are ready, and every
  asset passes zero-write GAF fidelity planning. No approval, pack, export, git,
  PR, merge, or deploy operation has run; the next gate is the owner's complete
  39-clip animated review.
