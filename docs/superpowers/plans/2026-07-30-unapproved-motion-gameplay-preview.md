# Unapproved GAF2D Motion Gameplay Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, visibly unapproved, localhost-only runtime preview of the exact APN Hero plus six-creature GAF2D `authored-semantic-v2` candidate inside real APN Idle gameplay.

**Architecture:** A local Node builder verifies the current GAF2D candidate and mechanical-QA hashes, then atomically writes disposable WebP atlases and explicit preview descriptors under ignored `.gaf2d-preview/`. A separate browser authority module activates those derivatives only for `motion-preview=1` on loopback, overlays the in-memory Valorant pack, enables a preview-only Hero loader contract, and otherwise fails closed to the unchanged production-safe runtime.

**Tech Stack:** Vanilla JavaScript ES modules, Canvas 2D, Node.js standard library, ImageMagick, `cwebp`, existing APN motion/asset loaders, deterministic Node QA, and Playwright browser QA.

## Global Constraints

- Normal `http://127.0.0.1:8790/` remains production-safe and unchanged.
- Preview activates only for `motion-preview=1` on exact host `127.0.0.1` or `localhost`.
- The current source must remain exactly 7 assets, 39 clips, and 276 frames with `mechanical_qa: passed`, `creative_approval: human_required`, and zero provider/network calls.
- Preview artifacts use `authority: unapproved_preview`; no approval, rig, export, release, publish, or deploy authority may be fabricated.
- Generated preview bytes live only below ignored `.gaf2d-preview/`.
- Production pack JSON, generated production catalog, first-playable manifest, release cache authority, and GAF2D state remain untouched.
- Frame selection remains elapsed time × clip-owned FPS; repaint frequency must not alter playback speed.
- Missing, stale, malformed, hash-invalid, or partially decoded preview inputs fail closed to the current static/historical fallback.
- Tests make no network or paid-provider calls and upload no private media.

---

### Task 1: Preview authority contracts

**Files:**
- Modify: `js/motion-bundle.js`
- Modify: `js/motion-store.js`
- Modify: `js/hero-v3-contract.js`
- Modify: `js/hero-v3.js`
- Modify: `qa/check-motion-bundle.mjs`
- Modify: `qa/check-motion-store.mjs`
- Modify: `qa/check-hero-v3-runtime.mjs`

**Interfaces:**
- Produces: `MOTION_PREVIEW_GRAMMAR`, `validateMotionPreviewBundle(data, expectedAssetId, options)`.
- Produces: `createMotionStore({ allowUnapprovedPreview })`.
- Produces: `loadHeroV3(basePath, { allowUnapprovedPreview })`.
- Preserves: `validateMotionBundle`, approved Hero contracts, and every existing default call.

- [x] **Step 1: Write failing preview-validator tests**

Add fixtures whose top level contains:

```js
{
  grammar: 'gaf2d-motion-preview-v1',
  authority: 'unapproved_preview',
  previewLineage: {
    candidateId: 'entry-runner-authored-semantic-v2',
    candidateSha256: sha('candidate'),
    qaSummarySha256: sha('qa'),
    batchSummarySha256: sha('batch'),
    sourceManifestVersion: 3,
  },
}
```

Assert that the preview validator accepts exact geometry/clip data, the production validator rejects it, unknown/approval fields are rejected, and a normal motion store rejects preview data unless `allowUnapprovedPreview: true` and the pack record also declares `authority: 'unapproved_preview'`.

- [x] **Step 2: Run focused tests and confirm red**

Run:

```bash
node qa/check-motion-bundle.mjs
node qa/check-motion-store.mjs
node qa/check-hero-v3-runtime.mjs
```

Expected: failure because the preview grammar and opt-in loader interfaces do not exist.

- [x] **Step 3: Implement separate preview validators**

Refactor shared bounded geometry/clip validation behind an internal mode object, while keeping production lineage and encoder checks byte-for-byte equivalent. Preview mode must require the exact preview lineage fields and reject production approval lineage.

- [x] **Step 4: Gate loader consumption**

Select the preview validator only when both conditions are true:

```js
store.allowUnapprovedPreview === true &&
source.authority === 'unapproved_preview'
```

Apply the same double opt-in to Hero preview set/clip descriptors. Preserve historical and approved Hero behavior when the option is absent.

- [x] **Step 5: Run focused tests and confirm green**

Run the three focused commands from Step 2. Expected: all pass.

- [x] **Step 6: Commit**

```bash
git add js/motion-bundle.js js/motion-store.js js/hero-v3-contract.js js/hero-v3.js qa/check-motion-bundle.mjs qa/check-motion-store.mjs qa/check-hero-v3-runtime.mjs
git commit -m "feat: isolate unapproved motion preview authority"
```

### Task 2: Deterministic disposable preview builder

**Files:**
- Create: `scripts/assets/build-gaf2d-preview.mjs`
- Create: `qa/check-gaf2d-preview-build.mjs`
- Modify: `qa/run-tests.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildGaf2dPreview({ gaf2dProjectRoot, outputRoot, tools })`.
- Produces CLI: `node scripts/assets/build-gaf2d-preview.mjs --gaf2d-project <absolute-root> --output .gaf2d-preview --json`.
- Consumes existing exports: `canonicalJson`, `validateDerivativeTools`, `chooseDerivativeMatrix`, `buildDerivativeAtlas`, and `atomicPublishDirectory`.
- Produces `.gaf2d-preview/manifest.json`, six `characters/<assetId>/motion.{json,webp}` bundles, and Hero `hero/set.json` plus eight clip descriptor/WebP pairs.

- [x] **Step 1: Write a failing deterministic fixture test**

Build a temporary GAF project with seven canonical candidates and tiny transparent PNG frame fixtures. Assert:

```js
assert.equal(manifest.authority, 'unapproved_preview');
assert.deepEqual(manifest.counts, { assets: 7, clips: 39, frames: 276 });
assert.equal(serialized.includes(tempRoot), false);
assert.equal(serialized.includes('ApprovalSha256'), false);
assert.deepEqual(secondBuildHashes, firstBuildHashes);
```

Also assert hard rejection for stale candidate hashes, failed mechanical QA, any status other than `human_required`, nonzero provider/network calls, and a partial seven-asset set.

- [x] **Step 2: Run the builder test and confirm red**

Run: `node qa/check-gaf2d-preview-build.mjs`

Expected: module-not-found for `scripts/assets/build-gaf2d-preview.mjs`.

- [x] **Step 3: Implement source verification**

For each batch asset:

```js
const candidatePath = path.join(
  root,
  'assets',
  assetId,
  'review',
  'motion-set',
  `${assetId}-authored-semantic-v2`,
  'candidate.json',
);
```

Verify canonical batch references, candidate bytes, QA summary bytes, clip manifest bytes, every listed frame byte hash, 640×640 canvas, clip order, playback, authored FPS, and candidate/source-manifest identity.

- [x] **Step 4: Implement deterministic atlases and atomic publish**

Compute one alpha-union trim per character across all source frames. Use bottom-center pivot `{ x: 0.5, y: 1 }`, canonical frame order, existing pinned ImageMagick/cwebp tool validation, canonical JSON, and one sibling staging directory followed by `atomicPublishDirectory`.

- [x] **Step 5: Wire the local command and ignore boundary**

Add:

```json
"preview:gaf2d": "node scripts/assets/build-gaf2d-preview.mjs"
```

Add `/.gaf2d-preview/` to `.gitignore`, and add the builder test to `qa/run-tests.mjs`.

- [x] **Step 6: Run focused tests twice**

Run:

```bash
node qa/check-gaf2d-preview-build.mjs
node qa/check-assets.mjs
```

Expected: all pass and no tracked production manifest contains `.gaf2d-preview`.

- [x] **Step 7: Commit**

```bash
git add .gitignore package.json scripts/assets/build-gaf2d-preview.mjs qa/check-gaf2d-preview-build.mjs qa/run-tests.mjs
git commit -m "feat: build deterministic local motion previews"
```

### Task 3: Loopback runtime overlay

**Files:**
- Create: `js/motion-preview.js`
- Create: `qa/check-motion-preview.mjs`
- Modify: `js/assets.js`
- Modify: `js/main.js`
- Modify: `qa/check-asset-loader.mjs`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Produces: `isMotionPreviewRequested(locationLike)`.
- Produces: `loadMotionPreview({ location, packs, fetch, hashBytes })` returning `{ active, packs, heroBasePath, manifest, error }`.
- Changes: `createAssetStore({ catalog })` and `packWindowForRoute(route, catalog = GAME_PACKS)`.
- Preserves: default production catalog and current static fallback when preview is absent or invalid.

- [x] **Step 1: Write failing activation and overlay tests**

Assert the exact matrix:

```js
true  // http://127.0.0.1/?motion-preview=1
true  // http://localhost/?motion-preview=1
false // http://127.0.0.1/?motion-preview=0
false // https://example.com/?motion-preview=1
false // http://127.0.0.2/?motion-preview=1
```

Mock fetch/hash and assert all-or-nothing validation, a cloned Valorant pack only, six preview motion records with descriptor hashes, preview Hero base path, and unchanged frozen input packs.

- [x] **Step 2: Run focused tests and confirm red**

Run:

```bash
node qa/check-motion-preview.mjs
node qa/check-asset-loader.mjs
```

Expected: missing preview module and catalog-injection behavior.

- [x] **Step 3: Implement the pure preview loader**

Load `.gaf2d-preview/manifest.json` only after the loopback/query gate passes. Verify manifest grammar, authority, exact counts, descriptor hashes, asset IDs, Hero clip membership, and portable `.gaf2d-preview/` relative paths before cloning the Valorant pack.

- [x] **Step 4: Thread the runtime catalog**

Store `catalog` on the asset store. Pass it to route window, current pack, wave union, warm, and release paths. In `main.js`, await the preview decision before creating the asset store and Hero load; enable preview validators only when the full manifest succeeds.

- [x] **Step 5: Run focused tests and confirm green**

Run the two commands from Step 2. Expected: all pass.

- [x] **Step 6: Commit**

```bash
git add js/motion-preview.js js/assets.js js/main.js qa/check-motion-preview.mjs qa/check-asset-loader.mjs qa/run-tests.mjs
git commit -m "feat: overlay local motion previews in gameplay"
```

### Task 4: Visible owner evidence and diagnostics

**Files:**
- Modify: `index.html`
- Modify: `css/game.css`
- Modify: `js/main.js`
- Create: `qa/check-motion-preview-ui.mjs`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Produces DOM id `motion-preview-banner`.
- Produces exact active copy `UNAPPROVED MOTION PREVIEW · LOCAL ONLY`.
- Extends `render_game_to_text()` with `motionPreview: { requested, active, authority, batchSummarySha256, error, heroStatus, heroAuthority }` and active asset `authority`, `candidateSha256`, `fps`, `frameIndex`.

- [x] **Step 1: Write failing DOM/text-state tests**

Assert the banner is hidden in markup by default, uses the exact warning copy, cannot cover the game control strip, and `main.js` exposes preview status plus clip-owned FPS through the query-gated QA state.

- [x] **Step 2: Run the UI test and confirm red**

Run: `node qa/check-motion-preview-ui.mjs`

Expected: missing banner and preview text-state fields.

- [x] **Step 3: Add the compact persistent banner**

Insert the banner directly below the app root, use only existing design tokens, reserve its height without overlaying Canvas/buttons, and toggle `hidden`/error copy from the resolved preview state.

- [x] **Step 4: Add deterministic QA evidence**

Report requested/active/fail-closed state, source candidate hash, active asset, semantic clip, authored FPS, selected frame, and fallback count without exposing file-system paths.

- [x] **Step 5: Run focused UI/cache tests**

Run:

```bash
node qa/check-motion-preview-ui.mjs
node qa/check-runtime-cache.mjs
```

Expected: all pass; every new runtime import uses the current cache token.

- [x] **Step 6: Commit**

```bash
git add index.html css/game.css js/main.js qa/check-motion-preview-ui.mjs qa/run-tests.mjs
git commit -m "feat: expose local motion preview evidence"
```

### Task 5: Build the real APN candidate and prove gameplay

**Files:**
- Generate ignored: `.gaf2d-preview/**`
- Modify: `progress.md`
- Generate ignored: `.gaf2d-preview/qa-evidence/motion-preview-portrait.png`
- Generate ignored: `.gaf2d-preview/qa-evidence/motion-preview-landscape.png`

**Interfaces:**
- Consumes a caller-supplied absolute GAF project root.
- Produces preview URL: `http://127.0.0.1:8790/?motion-preview=1&mute=1`.

- [x] **Step 1: Build the exact real package**

Run:

```bash
npm run preview:gaf2d -- \
  --gaf2d-project <absolute-gaf2d-project-root> \
  --output .gaf2d-preview \
  --json
```

Expected JSON: `passed: true`, `authority: unapproved_preview`, 7 assets, 39 clips, 276 frames, provider/network calls 0.

- [x] **Step 2: Verify generated bytes and production isolation**

Run the builder a second time and compare the complete file/hash projection. Confirm:

```bash
git status --short
git diff -- assets/game-packs/valorant/pack.json js/generated/game-packs.js assets/manifest.json
```

Expected: no preview output tracked and no production asset diff.

- [x] **Step 3: Run deterministic 60/120 Hz selection checks**

Use equal elapsed durations with 60 and 120 repaint timestamps. Assert every loop resolves the same authored frame at each sampled elapsed time and progress clips hold their terminal frame.

- [x] **Step 4: Run real browser QA**

Use the project’s `web_game_playwright_client.js` against:

```text
http://127.0.0.1:8790/?motion-preview=1&mute=1&autostart=1&zone=1&chrome-smoke=1&qa-manual=1
```

Capture portrait and landscape screenshots. Inspect Hero run/sprint/attack/hit/death/celebrate, waves 1/2/3/5/9, and Site Warden advance/engaged/hit/broken/death at wave 10. Require changed-frame evidence, correct asset/clip/FPS text, zero preview fallback, zero console/network error, and zero horizontal overflow.

Repeat one loop and one progress clip with effective reduced motion enabled.
Require semantic state and authored frame timing to remain correct while
nonessential motion effects stay suppressed.

- [x] **Step 5: Append the truthful progress record**

Record the preview boundary, exact counts, browser evidence, remaining human creative-approval gate, and that no paid call/upload/approval/export/push/deploy occurred.

- [x] **Step 6: Commit tracked evidence/docs**

```bash
git add progress.md
git commit -m "docs: record local motion gameplay proof"
```

### Task 6: Regression, review, and handoff

**Files:**
- Review: all files changed by Tasks 1–5

**Interfaces:**
- Produces one working localhost URL and a truthful approval boundary.

- [x] **Step 1: Run focused regression**

Run:

```bash
node qa/check-motion-bundle.mjs
node qa/check-motion-store.mjs
node qa/check-hero-v3-runtime.mjs
node qa/check-gaf2d-preview-build.mjs
node qa/check-motion-preview.mjs
node qa/check-motion-preview-ui.mjs
node qa/check-gaf2d-valorant.mjs
```

Expected: all pass.

- [x] **Step 2: Run the full suite**

Run: `npm test`

Expected: exit 0.

- [x] **Step 3: Review authority and production isolation**

Search for `unapproved_preview`, `.gaf2d-preview`, and every approval field. Confirm preview data has no production approval authority and no tracked production manifest points at the disposable boundary.

- [x] **Step 4: Verify the server and final URL**

Request the preview URL, reload it once, inspect the persistent banner and QA state, and confirm the normal URL still omits the preview.

- [x] **Step 5: Finish**

Report the exact localhost link, what is visibly testable, test/browser evidence, and the single remaining owner decision: approve or reject the complete authored motion set.

### Task 7: Independent-review blocker hardening

**Files:**
- Modify: `js/game.js`
- Modify: `js/hero-v2.js`
- Modify: `js/hero-v3.js`
- Modify: `js/host-contract.js`
- Modify: `js/motion-preview.js`
- Modify: `js/render.js`
- Modify: `js/save.js`
- Create: `qa/check-hero-motion-semantics.mjs`
- Modify: `qa/check-motion-preview.mjs`

- [x] **Step 1: Separate outgoing attack, actual crit, and incoming-hit state**

Ordinary attacks select `attack`, actual RNG critical hits select `crit`, and
only the explicit incoming-damage entry point selects `hit`.

- [x] **Step 2: Make visible and diagnostic Hero selectors identical**

Keep the procedural lunge independent while the visible V3 renderer and
`inspectHeroMotion()` consume the same authored selector object.

- [x] **Step 3: Lock complete authored progress timing**

Prove attack/crit (8 frames at 16 FPS), hit (4 at 16 FPS), and death (8 at
16 FPS) advance forward through equal-duration bins under a fixed 60 Hz
simulation sampled at both 60 Hz and 120 Hz repaint schedules. Continuous base
and sprint combat must complete the current visual sequence through its final
frame before consuming one latched pending strike; combat math is unchanged.
Reduced-motion must preserve essential hit/death selection while suppressing
secondary transforms.

- [x] **Step 4: Preflight every referenced media body**

Fetch and SHA-256 verify all eight Hero and six creature WebP files before
returning `active: true`. Read media sequentially and fail closed for missing,
oversized, or corrupt bytes without exposing private paths.

- [x] **Step 5: Repeat focused, full-suite, and browser QA**

Require exact authority/candidate evidence, zero fallback, zero console errors,
normal-mode zero preview fetches, and changed-frame proof for Hero and creature
motion.
