# APN Idle High-Smoothness Motion Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local 8–20 FPS APN authored preview with reviewed 30–32 FPS deterministic poses, lazy per-clip atlases, production mappings, and a verified deployed game.

**Architecture:** The offline APN project re-renders normalized semantic part tracks into 795 genuine poses and prepares GAF2D V3 review authority. The zero-dependency Canvas runtime loads a small hash-locked set index and per-clip atlases on demand while preserving elapsed-time playback, domain-event timing, shared presentation geometry, and V1 compatibility.

**Tech Stack:** Vanilla ES modules, Canvas 2D, Node.js 24, Python 3.12/Pillow/NumPy for the deterministic offline generator, WebP, Chrome/Playwright browser QA, static APN Web deployment.

## Global Constraints

- Game worktree: `/Users/talatongu/Code/kimi-projects/apn-idle-game/.worktrees/gaf2d-2d-identities`.
- Asset project: `/Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d`.
- Consume GAF2D only from `/Users/talatongu/Code/kimi-projects/gaf2d`.
- No provider call, private-media upload, 3D generation, optical flow, raster crossfade, or runtime body tweening.
- Preserve gameplay event durations, one shared body transform, bottom-center pivot, and fixed stage presentation.
- Loop frame selection is elapsed-time based; progress selection is normalized-domain-progress based.
- Common clip atlas: at most 2048 px and 6 MiB decoded; trusted boss clip atlas: at most 2048 px and 8 MiB decoded.
- Current and next wave motion: at most 32 MiB decoded; total hot texture set: below 64 MiB.
- First playable compressed set remains below 5 MiB and the existing cold-start/frame-time/heap budgets remain binding.
- New motion remains unapproved and loopback-only until the explicit human animated-review gate.
- Every behavior change follows red → verified failure → minimal implementation → verified pass.
- No task-owned PR, unmerged task commit, or undeployed approved release remains at completion.

---

### Task 1: Re-author the APN Pose Contract at 30–32 FPS

**Files:**
- Modify: `/Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d/tools/test_build_offline_authored_motion.py`
- Modify: `/Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d/tools/build_offline_authored_motion.py`
- Modify: `/Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d/briefs/authored-semantic-v2/acting-contract.json`

**Interfaces:**
- Consumes: current normalized identities, part masks, joint underpaints, key poses, and easing
- Produces: exact V3 frame contract, normalized-time sampling, holds, markers, and deterministic 795-frame batch

- [ ] **Step 1: Write failing exact-contract tests**

Assert the literal frame contract:

```python
assert EXPECTED_CONTRACT["apn-hero"] == (
    ("idle", 20, 30, "loop"),
    ("run", 20, 32, "loop"),
    ("attack", 15, 30, "progress"),
    ("crit", 15, 30, "progress"),
    ("sprint", 15, 30, "loop"),
    ("hit", 8, 32, "progress"),
    ("death", 15, 30, "progress"),
    ("celebrate", 15, 30, "loop"),
)
assert sum(count for _clip, count, _fps, _mode in EXPECTED_CONTRACT["entry-runner"]) == 107
assert sum(count for _clip, count, _fps, _mode in EXPECTED_CONTRACT["site-warden"]) == 137
```

Add tests proving key semantic poses survive at normalized marker times and
only declared terminal holds may duplicate a pose.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
uv run pytest tools/test_build_offline_authored_motion.py -k "contract or cadence or marker or hold" -q
```

Expected: the current 276-frame low-rate contract fails the new literal expectations.

- [ ] **Step 3: Implement normalized-time sampling**

Represent key anchors as rational normalized phases and sample transforms with
the existing deterministic smoothstep:

```python
sample_phase_numerator = frame_index
sample_phase_denominator = frame_count - 1
```

Map semantic anchors to exact output indices with deterministic half-away
rounding, preserve first/last loop closure, and emit V3 hold/marker records.
Do not interpolate flattened RGBA pixels.

- [ ] **Step 4: Verify GREEN and deterministic double build**

Run:

```bash
uv run pytest tools/test_build_offline_authored_motion.py -q
```

Then build twice into two temporary directories and compare every canonical
JSON and PNG SHA-256.

Expected: tests pass and both output hash maps are identical.

### Task 2: Generate and Prepare the Seven V3 Motion Reviews

**Files:**
- Regenerate: `/Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d/motion/authored-semantic-v3/`
- Regenerate: asset-contained extraction and clip manifests under each asset
- Update: `/Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d/FINAL_REPORT.md`

**Interfaces:**
- Consumes: Task 1 generator and GAF2D V3 CLI
- Produces: seven unapproved candidates, independent clip animations, temporal proofs, and one aggregate review URL

- [ ] **Step 1: Run generator tests before materialization**

Run:

```bash
uv run pytest tools/test_build_offline_authored_motion.py -q
```

Expected: exit 0.

- [ ] **Step 2: Materialize the new immutable revision**

Run the generator with revision `authored-semantic-v3` and a fresh canonical
review root.
The command must report 7 assets, 39 clips, and 795 frames.

- [ ] **Step 3: Prepare each GAF2D motion set**

For each of:

```text
apn-hero
entry-runner
veil-operator
signal-hunter
site-sentinel
protocol-courier
site-warden
```

run `gaf2d motion reopen-review` only when current state permits it, then
project-contained `motion extract`, V3 `motion prepare-set --dry-run`, and the
identical committing command.
Do not execute `approve motion-set`.

- [ ] **Step 4: Verify mechanical evidence**

Run complete offline mechanical QA and assert:

```text
7 assets
39 clips
795 frames
0 undeclared duplicate runs
0 cadence-profile violations
0 identity/alpha/joint-seam failures
0 provider calls
0 uploads
```

Expected: all seven assets stop honestly at `awaiting_motion_approval`.

### Task 3: Build Per-Clip Character Motion Sets

**Files:**
- Modify: `qa/check-gaf2d-preview-build.mjs`
- Modify: `scripts/assets/build-gaf2d-preview.mjs`
- Modify: `js/motion-bundle.js`
- Test: `qa/check-motion-bundle.mjs`

**Interfaces:**
- Consumes: V3 frame directories and clip manifests
- Produces: `gaf2d-motion-set-index-v2`, one descriptor and one WebP per clip, and V1 bundle compatibility

- [ ] **Step 1: Write failing builder and validator tests**

Assert a character index has exact clip entries:

```js
assert.deepEqual(Object.keys(index.clips), [
  'idle',
  'advance',
  'engaged',
  'hit',
  'death',
]);
assert.equal(index.clips.idle.descriptor, 'idle.json');
assert.equal(index.clips.idle.image, 'idle.webp');
assert.equal(descriptors.idle.clips.idle.frames.length, 30);
```

Add rejection tests for hash mismatch, missing required clip, unknown key,
per-clip decoded overflow, and a V3 profile claiming repeated low-rate frames.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node qa/check-gaf2d-preview-build.mjs
node qa/check-motion-bundle.mjs
```

Expected: failure because creatures still emit one `motion.json` and
`motion.webp`.

- [ ] **Step 3: Implement per-clip deterministic packing**

Emit:

```text
.gaf2d-preview/characters/<asset>/set.json
.gaf2d-preview/characters/<asset>/<clip>.json
.gaf2d-preview/characters/<asset>/<clip>.webp
```

Keep each clip atlas independently bounded, canonicalize JSON, hash every
descriptor/image in the index, and preserve one character-wide presentation
record.

- [ ] **Step 4: Verify GREEN and byte budgets**

Run:

```bash
node qa/check-gaf2d-preview-build.mjs
node qa/check-motion-bundle.mjs
node scripts/assets/verify-sizes.mjs
```

Expected: all checks pass and every atlas satisfies its class budget.

- [ ] **Step 5: Commit the builder contract**

```bash
git add qa/check-gaf2d-preview-build.mjs scripts/assets/build-gaf2d-preview.mjs js/motion-bundle.js qa/check-motion-bundle.mjs
git commit -m "feat: pack high cadence motion by clip"
```

### Task 4: Load and Play Clips Lazily

**Files:**
- Modify: `qa/check-motion-store.mjs`
- Modify: `qa/check-motion-preview.mjs`
- Modify: `qa/check-hero-motion-semantics.mjs`
- Modify: `js/motion-store.js`
- Modify: `js/motion-preview.js`
- Modify: `js/render.js`
- Modify: `js/hero-v3.js`

**Interfaces:**
- Consumes: Task 3 set index and descriptors
- Produces: bounded per-clip fetch/decode/cache/release and refresh-independent 30–32 FPS playback

- [ ] **Step 1: Write failing store/runtime tests**

Prove:

```js
const idle = await store.acquireClip(pack, 'entry-runner', 'idle');
assert.equal(idle.descriptor.clips.idle.frames.length, 30);
assert.equal(fetchCount('death.webp'), 0);
store.releaseClip(idle);
assert.equal(idle.bitmap.closed, true);
```

Add elapsed-time matrices for 60, 90, 120, and 144 Hz and progress tests that
hold the terminal frame without using descriptor FPS as the gameplay clock.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node qa/check-motion-store.mjs
node qa/check-motion-preview.mjs
node qa/check-hero-motion-semantics.mjs
```

Expected: failure because the store only acquires a complete character atlas.

- [ ] **Step 3: Implement bounded clip acquisition**

Add an index entry and clip entry state machine with:

```js
acquireClip(pack, assetId, clipName)
releaseClip(handle)
preloadClip(pack, assetId, clipName)
```

Validate before decode, abort cold in-flight work, close released
`ImageBitmap`s, and retain V1 `acquire` compatibility.
Use elapsed time for loops and normalized domain progress for progress clips.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
node qa/check-motion-store.mjs
node qa/check-motion-preview.mjs
node qa/check-hero-motion-semantics.mjs
node qa/check-motion-bundle.mjs
```

Expected: all motion runtime tests pass.

- [ ] **Step 5: Commit runtime loading**

```bash
git add qa/check-motion-store.mjs qa/check-motion-preview.mjs qa/check-hero-motion-semantics.mjs js/motion-store.js js/motion-preview.js js/render.js js/hero-v3.js
git commit -m "feat: stream high cadence motion clips"
```

### Task 5: Add Temporal Browser QA and Human Review

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `qa/browser/chrome-gaf2d-creatures.mjs`
- Create: `qa/browser/chrome-motion-continuity.mjs`
- Modify: `qa/run-tests.mjs`
- Modify: `qa/QA-REPORT.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: Tasks 1–4 local preview
- Produces: real-speed comparison, viewport evidence, performance facts, and one human review URL

- [ ] **Step 1: Write failing browser assertions**

At each refresh schedule, sample the active clip over one second and assert:

```js
assert.ok(uniquePoseCount >= 30);
assert.ok(maximumUndeclaredHoldMs <= 1000 / 30 + 1);
assert.equal(consoleErrors.length, 0);
```

Capture Hero, one regular creature, and Site Warden at 64, 80, and 128 px plus
real gameplay at 375×812, 390×844, 428×926, and 844×390.

- [ ] **Step 2: Run browser QA and verify RED**

Serve the game locally and run:

```bash
node qa/browser/chrome-motion-continuity.mjs
```

Expected: the old low-rate preview fails the unique-pose threshold.

- [ ] **Step 3: Complete the comparison and CI lane**

Produce current-versus-V3 playback, frame-step controls, light/dark backgrounds,
temporal metrics, and exact hashes.
Add the authored-motion browser test to CI after the existing route/go-live
smokes.

- [ ] **Step 4: Run the complete local matrix**

Run:

```bash
node qa/run-tests.mjs
node qa/browser/chrome-gaf2d-creatures.mjs
node qa/browser/chrome-motion-continuity.mjs
node scripts/assets/verify-sizes.mjs
```

Use the shared web-game Playwright client, inspect every generated screenshot,
inspect `render_game_to_text`, and resolve the first new console error before
continuing.

- [ ] **Step 5: Present the explicit human gate**

Leave localhost running and present:

```text
full 39-clip review
old/new real-time comparison
Wave 1 gameplay
Wave 10 boss/broken gameplay
native-size light/dark witnesses
```

Stop here until the human explicitly approves or rejects the complete V3
motion set.

### Task 6: Promote Approved Motion into Production

**Files:**
- Create/Modify: production Hero and creature motion files under `assets/`
- Modify: `assets/game-packs/valorant/pack.json`
- Modify: `assets/manifest.json`
- Modify: `js/generated/game-packs.js`
- Modify: `README.md`
- Modify: `docs/ART-PIPELINE.md`
- Modify: `docs/PERF-BUDGET.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DEFINITION-OF-DONE.md`
- Modify: `qa/QA-REPORT.md`

**Interfaces:**
- Consumes: explicit human V3 approval and deterministic GAF2D export
- Produces: production motion mapping with no preview authority

- [ ] **Step 1: Bind the exact human approval**

Use the previously previewed manifest version, approval token, candidate
document SHA-256, approver, and notes with `gaf2d approve motion-set`.
If any binding changed, regenerate the preview and stop for review again.

- [ ] **Step 2: Pack, complete-QA, and double-export**

For all seven assets run atlas packing, `qa --profile complete`, and two exports
from unchanged inputs.
Assert identical manifest SHA-256 and sorted file hashes.

- [ ] **Step 3: Promote only approved exports**

Copy only hash-current `export/` artifacts into production asset paths, update
the Valorant pack mapping, and regenerate game manifests/catalogs.
Remove every `unapproved_preview` authority from production mappings while
keeping the local preview boundary available for future candidates.

- [ ] **Step 4: Run full production verification**

Run:

```bash
node qa/run-tests.mjs
node qa/browser/chrome-gaf2d-creatures.mjs
node qa/browser/chrome-motion-continuity.mjs
node scripts/assets/verify-sizes.mjs
git diff --check
```

Expected: all commands exit 0 and normal production URL uses approved motion
without the preview query.

- [ ] **Step 5: Commit production promotion**

Stage only the task-owned production assets, mappings, generated manifests,
tests, and docs.
Commit:

```bash
git commit -m "feat: ship approved high cadence APN motion"
```

### Task 7: Merge, Deploy, and Verify Production

**Files:**
- Modify in APN Web: `public/idle/**`
- Modify in APN Web: release documentation required by its repository policy

**Interfaces:**
- Consumes: fully verified production game commit
- Produces: merged GAF2D, merged APN Idle Game, merged APN Web, and live Cloudflare evidence

- [ ] **Step 1: Publish and merge GAF2D**

Push `codex/high-smoothness-motion-v3`, open a ready PR to `main`, wait for CI,
address review, merge, and verify remote `main` contains the merge commit.

- [ ] **Step 2: Publish and merge APN Idle Game**

Push `codex/gaf2d-2d-identities`, open one ready PR to `main` that supersedes
PR #40, close #40 with the superseding PR link, wait for CI, address review,
merge, and verify remote `main`.

- [ ] **Step 3: Copy the exact merged game into APN Web**

From the merged APN Idle Game `main`, replace `apn-web/public/idle/` with the
documented static release set while preserving save migration and rollback
receipts.
Run APN Web build and repository-required tests.

- [ ] **Step 4: Publish and merge APN Web**

Create a scoped `codex/apn-idle-high-smoothness` branch, commit the static
release, push, open a ready PR, wait for CI/review, merge to `main`, and verify
the remote merge.

- [ ] **Step 5: Deploy Cloudflare production**

From clean APN Web `main`, run the repository production deployment command:

```bash
npm run deploy:production
```

Capture the deployment identifier and production URL.

- [ ] **Step 6: Perform post-deploy health checks**

Verify the live `/idle/` route:

```text
HTTP 200
no console errors
correct save-v3 persistence
Wave 1 and Wave 10 gameplay
Hero and all six creature identities
30+ unique authored poses per second
current/next cache release
mobile portrait and landscape geometry
frame, heap, texture, and load budgets
```

- [ ] **Step 7: Prove repository closure**

Run:

```bash
gh pr list --repo YubenTT/gaf2d --state open
gh pr list --repo YubenTT/apn-idle-game --state open
gh pr list --repo YubenTT/apn-web --state open
```

Expected: no task-owned PR remains open; PR #40 is closed as superseded; all
three remote `main` branches contain their release commits; the live deployment
matches APN Web `main`.

