# Authored Motion Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, budgeted, character-owned motion-bundle runtime that can be fully tested with synthetic fixtures before any creative artifact is approved.

**Architecture:** A DOM-free module validates descriptors and selects clips/frames. A separate browser store owns fetch, hash verification, async decode, warming, diagnostics, and bitmap release; `render.js` only selects/draws ready frames. Pack metadata opts characters into motion, so every other pack keeps the existing static path.

**Tech Stack:** Vanilla ES modules, Canvas 2D, Web Crypto, `createImageBitmap`, Node headless QA, Playwright browser QA, static files only.

## Global Constraints

- Runtime stays zero-dependency, static-file-only, and Canvas 2D.
- Descriptor grammar is exactly `gaf2d-motion-bundle-v1`.
- Creature clip precedence is `death > hit > broken > advance > engaged > idle`.
- Frame choice uses simulation timestamp/progress, never render count.
- Successful normal loading never paints a static placeholder first.
- Static fallback is load-failure resilience and fails canonical wave 1–10 QA.
- Common/event decoded atlas is at most 6 MiB RGBA; the pack-declared boss is at
  most 8 MiB. The role comes from trusted pack metadata, not an asset ID.
- Current + next wave motion is at most 32 MiB; hot textures stay below 64 MiB.
- First-playable compressed bytes remain below 5,242,879.
- No private source, provider call, paid call, 3D, publish, push, or deploy.

---

### Task 1: Pure descriptor and playback contract

**Files:**
- Create: `js/motion-bundle.js`
- Create: `qa/check-motion-bundle.mjs`
- Create: `qa/fixtures/motion-bundle/valid.json`
- Create: `qa/fixtures/motion-bundle/invalid-overlap.json`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Produces: `validateMotionBundle(data, expectedAssetId) -> string[]`
- Produces: `frameIndexForClip(clip, value) -> number`
- Produces: `selectEnemyMotion(enemy, context) -> { clip: string, value: number }`
- Produces: `drawMotionFrame(ctx, record, clipName, frameIndex, x, footY, height) -> object | null`

- [ ] **Step 1: Write the failing descriptor and selector tests**

```javascript
const errors = validateMotionBundle(valid, 'entry-runner');
assert(errors.length === 0, 'valid motion bundle accepted');
assert(frameIndexForClip(valid.clips.idle, 0.2) !== frameIndexForClip(valid.clips.idle, 0.4), 'loop uses timestamp');
assert(frameIndexForClip(valid.clips.death, 1) === 7, 'progress holds final frame');

assert(selectEnemyMotion(dying, context).clip === 'death', 'death outranks every state');
assert(selectEnemyMotion(hurt, context).clip === 'hit', 'hit outranks broken');
assert(selectEnemyMotion(brokenBoss, context).clip === 'broken', 'broken outranks locomotion');
assert(selectEnemyMotion(approaching, context).clip === 'advance', 'approach uses advance');
assert(selectEnemyMotion(engaged, context).clip === 'engaged', 'melee reaction is engaged, not attack');
```

The invalid fixture must fail for one overlapping rect, out-of-bounds rect, wrong asset ID,
absolute image path, unsupported playback, missing required clip, invalid SHA-256, and decoded-byte
overflow. Mutation tests also reject unknown fields at every object boundary, non-integer/out-of-
range FPS, wrong exact clip counts, unsafe encoder arguments, and exact rectangle aliases.

- [ ] **Step 2: Run the focused test and confirm the red state**

Run:

```console
node qa/check-motion-bundle.mjs
```

Expected: fail because `js/motion-bundle.js` does not exist.

- [ ] **Step 3: Implement the exact pure validator**

```javascript
export const MOTION_GRAMMAR = 'gaf2d-motion-bundle-v1';
export const REQUIRED_CLIPS = Object.freeze(['idle', 'advance', 'engaged', 'hit', 'death']);
export const LOOP_CLIPS = new Set(['idle', 'advance', 'engaged', 'broken']);
```

Validate finite positive atlas/frame sizes; atlas dimensions `<= 2048`; `width * height * 4`
against the asset-class decoded limit; normalized pivot; portable relative image path; 64-char
lowercase hashes; exact required clip set plus pack-role-only `broken`; integer FPS `1..60`; exact
`8/8/6/4/8` frame counts plus pack-declared boss `broken=8`; playback `loop|progress`; ordered rect arrays;
integer in-bounds distinct physical cells; closed-world object keys; safe option-only encoder
arguments; and pairwise non-overlap.

- [ ] **Step 4: Implement timestamp/progress selection and one blitter**

```javascript
export function frameIndexForClip(clip, value) {
  const count = clip.frames.length;
  if (clip.playback === 'loop') {
    return Math.floor(Math.max(0, value) * clip.fps) % count;
  }
  return Math.min(count - 1, Math.floor(clamp(value, 0, 1) * count));
}
```

`selectEnemyMotion()` must compute existing `deathT/deathMax`, `hurt`, HP ratio, `x`, `meleeStop`,
and `engagedId` in the precedence order above. `drawMotionFrame()` must use the descriptor's shared
trim and bottom-center pivot and call one `ctx.drawImage`.

- [ ] **Step 5: Run the focused test**

Run:

```console
node qa/check-motion-bundle.mjs
```

Expected: `MOTION BUNDLE PASS`.

- [ ] **Step 6: Commit the pure runtime contract**

```console
git add js/motion-bundle.js qa/check-motion-bundle.mjs qa/fixtures/motion-bundle qa/run-tests.mjs
git commit -m "feat: define character motion bundle runtime"
```

### Task 2: Pack metadata, generated catalog, and honest size accounting

**Files:**
- Modify: `scripts/assets/lib.mjs`
- Modify: `scripts/assets/generate-catalog.mjs`
- Modify: `scripts/assets/generate-manifest.mjs`
- Modify: `scripts/assets/verify-sizes.mjs`
- Create: `scripts/assets/first-playable.mjs`
- Modify: `js/creatures.js`
- Create: `js/wave-roster.js`
- Modify: `js/game.js`
- Modify: `qa/check-assets.mjs`
- Modify: `qa/check-asset-loader.mjs`
- Modify: `qa/check-gaf2d-valorant.mjs`
- Modify: `qa/check-route.mjs`
- Regenerate later: `js/generated/game-packs.js`
- Regenerate later: `assets/game-packs/catalog.json`
- Regenerate later: `assets/manifest.json`

**Interfaces:**
- Consumes: optional `pack.motion.characters[assetId]`
- Produces: `firstPlayableAssetPaths(packs) -> Set<string>`
- Produces: one pure spawn/motion role selector shared by browser runtime and Node asset tools
- Produces: `motionAssetIdsForRouteWindow(route, packs) -> Set<string>`
- Produces: compressed and decoded motion-budget findings

- [ ] **Step 1: Write failing optional-motion metadata and budget tests**

```javascript
const fixturePack = {
  ...pack,
  motion: {
    grammar: 'gaf2d-motion-bundle-v1',
    characters: {
      'entry-runner': {
        image: 'assets/game-packs/valorant/characters/entry-runner/motion.webp',
        descriptor: 'assets/game-packs/valorant/characters/entry-runner/motion.json',
      },
    },
  },
};
assert(validatePackManifest(fixturePack).length === 0, 'optional motion map accepted');
assert(validatePackManifest({...fixturePack, motion: {...fixturePack.motion, grammar: 'bad'}}).length > 0, 'bad grammar rejected');
```

Add a manifest fixture proving a large GLB/reference image is cold, a boot-requested Hero clip is
first-playable, only the current wave's motion is first-playable, and a 5,242,879-byte total fails.
Until the eager global creature loader is removed in Task 4, its sixteen WebP/JSON pairs must also
be counted. Add a source/network-contract assertion so classification cannot silently diverge from
the boot loader.

- [ ] **Step 2: Run asset tests and confirm the red state**

Run:

```console
node qa/check-assets.mjs
node qa/check-gaf2d-valorant.mjs
```

Expected: fail on absent motion metadata support and dishonest first-playable classification.

- [ ] **Step 3: Validate the optional pack motion map**

Every motion key must equal an existing target/boss ID. Image and descriptor paths must remain
inside `assets/game-packs/<pack-id>/characters/<asset-id>/`, use `motion.webp|motion.json`, and be
unique. Target roles are the exact unique set `common-a|common-b|common-c|elite|event`, every
target `frame` equals its declared `role`, the boss stays `frame="boss"` with
`breakFrame="boss-break"`, and the optional motion object is closed-world:
`grammar|characters` plus record-exact `image|descriptor|descriptorSha256` only. Every record
requires the current lowercase `descriptorSha256`; generated catalog output preserves it unchanged.
Packs without `motion` remain valid and unchanged.

- [ ] **Step 4: Replace directory-based first-playable guessing with an explicit contract**

`firstPlayableAssetPaths()` must include:

- all eight `assets/mascot/v3/{clip}.webp|json` files;
- current and next pack background, targets, targetData, props, and corruption mask;
- current wave's possible character motion files when motion metadata exists;
- every legacy creature file still requested eagerly by the current boot path;
- actually boot-fetched UI/item assets recorded by the current loader tests.

It must exclude GLBs, review/reference sheets, unused mascot versions, legacy creatures not loaded
at boot, cold pack art, masters, and later-wave motion. `generate-manifest.mjs` sets
`firstPlayable` only from this set.

- [ ] **Step 5: Centralize spawn and motion-window selection**

Move the fixed Valorant role schedule and generic legacy reachable-role rules into one DOM-free
module imported by both `game.js` and asset scripts. The route-window helper must call the real
route scheduler and cover waves 1–10, `10→1`, clean catalog progression, scheduled seasons,
revisits, and non-adjacent pack pairs. A future motion-enabled pack without a narrower schedule is
budgeted conservatively for every identity reachable by its spawn rules.

- [ ] **Step 6: Add compressed and decoded motion gates**

`verify-sizes.mjs` must read descriptors and enforce per-asset compressed, decoded, current+next
wave, hot-texture, Hero total, new-motion total, and first-playable caps. Error messages name the
asset, measured bytes, and exact cap. It validates each mapped descriptor with
`validateMotionBundle(expectedAssetId)` before budgeting, reads actual WebP header dimensions,
requires exact descriptor equality, and budgets the real dimensions rather than trusting JSON.
Manifest `firstPlayable` flags must exactly match the canonical boot request set so stale booleans
cannot under- or over-count.

- [ ] **Step 7: Run asset tests**

Run:

```console
node qa/check-assets.mjs
node qa/check-gaf2d-valorant.mjs
node scripts/assets/verify-sizes.mjs
```

Expected: pass with no production motion mapping yet.

- [ ] **Step 8: Commit metadata and budget support**

```console
git add scripts/assets js/creatures.js js/wave-roster.js js/game.js qa/check-assets.mjs qa/check-asset-loader.mjs qa/check-gaf2d-valorant.mjs qa/check-route.mjs
git commit -m "feat: budget pack-owned motion assets"
```

### Task 3: Browser motion resource store

**Files:**
- Create: `js/motion-store.js`
- Create: `qa/check-motion-store.mjs`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Consumes: validated motion descriptors
- Produces: `createMotionStore(options) -> MotionStore`
- Produces: `warmMotionSet(store, pack, assetIds) -> Promise<object[]>`
- Produces: `getMotionRecord(store, packId, assetId) -> object | null`
- Produces: `releaseColdMotion(store, keepKeys) -> void`
- Produces: `motionDiagnostics(store) -> object[]`

- [ ] **Step 1: Write failing lifecycle tests with deterministic fakes**

Test coalesced duplicate fetches; raw descriptor SHA-256 before JSON parse; JSON-before-image
acceptance; atlas SHA-256 rejection; decoded-dimension mismatch; immutable cache-token use; async
decoder selection; five-asset warm set; a deterministic 10-second timeout; cold in-flight abort;
stale completion that closes instead of resurrecting a record; cold `close()` calls; silent
supersession versus one timeout diagnostic; failed-entry fallback state; and exactly one structured
diagnostic per `packId/assetId/errorCode`.

```javascript
const [first, second] = await Promise.all([
  warmMotionSet(store, pack, ['entry-runner']),
  warmMotionSet(store, pack, ['entry-runner']),
]);
assert(fetchCounts.json === 1 && fetchCounts.image === 1, 'duplicate loads coalesced');
releaseColdMotion(store, new Set());
assert(bitmap.closed === 1, 'cold bitmap explicitly released');
```

- [ ] **Step 2: Run the store test and confirm the red state**

Run:

```console
node qa/check-motion-store.mjs
```

Expected: fail because the store module is absent.

- [ ] **Step 3: Implement fetch, hash, decode, and ownership**

Fetch raw descriptor bytes using the pack-owned descriptor hash as the cache token, verify that hash
before parse, then validate JSON. Fetch atlas bytes using the descriptor-owned atlas hash token,
verify it, and decode through injected `decodeImage`/`createImageBitmap`. Reject raw descriptors
larger than `256 KiB` before parse. The HTMLImage fallback must use an object URL and revoke it
after decode. The decoded intrinsic width/height must equal the descriptor. Store entries are
`pending|ready|failed`; each owns a generation, abort controller, and injectable deadline (default
10 seconds), and only the current generation in `ready` may draw.

- [ ] **Step 4: Implement set warming, deduplicated diagnostics, and release**

Keys are `${packId}/${assetId}`. `warmMotionSet()` rejects IDs absent from the pack map without
fetching. `releaseColdMotion()` aborts pending cold requests, calls `image.close?.()` once, and
removes every cold state. A late decode for a removed/superseded generation closes its bitmap and
cannot repopulate the store. Failures record:

```javascript
{
  code: 'motion-bundle-fallback',
  packId,
  assetId,
  reason: 'descriptor|hash|decode|network',
}
```

- [ ] **Step 5: Run the focused and aggregate headless gates**

Run:

```console
node qa/check-motion-store.mjs
node qa/run-tests.mjs
```

Expected: pass.

- [ ] **Step 6: Commit the browser store**

```console
git add js/motion-store.js qa/check-motion-store.mjs qa/run-tests.mjs
git commit -m "feat: load and release motion bundles"
```

### Task 4: Main-loop warming, renderer integration, and deterministic QA state

**Files:**
- Modify: `js/game.js`
- Modify: `js/assets.js`
- Modify: `js/main.js`
- Create: `js/motion-preference.js`
- Modify: `js/render.js`
- Modify: `index.html`
- Modify: `qa/check-asset-loader.mjs`
- Modify: `qa/check-gaf2d-valorant.mjs`
- Modify: `qa/browser/chrome-gaf2d-creatures.mjs`

**Interfaces:**
- Consumes: `selectEnemyMotion()`, `drawMotionFrame()`, motion-store functions
- Produces: `targetForEnemyType(pack, type) -> target`
- Produces: `motionAssetIdsForPackWave(pack, wave) -> string[]`
- Extends QA text with `motion.assetId`, `motion.clip`, `motion.frameIndex`, `motion.fallbacks`

- [ ] **Step 1: Write failing mapping, precedence, warm-window, and QA-text tests**

Prove waves 1–10 map to the exact existing six IDs; wave 8 warms four IDs and wave 9 warms one;
wave `10→1` uses the actual scheduled next pack; clean and revisit routes can select non-adjacent
pack pairs; the pack-declared boss's `broken` clip is lower precedence than hit/death; motion wins over the static
atlas when ready; pending is not rendered as static; failed draws static and records fallback.

- [ ] **Step 2: Run the focused tests and confirm the red state**

Run:

```console
node qa/check-asset-loader.mjs
node qa/check-gaf2d-valorant.mjs
```

Expected: fail on absent motion warm/draw state.

- [ ] **Step 3: Finish the canonical enemy-type-to-target selector**

Use the shared Task 2 role/wave authority and move the remaining inline type-to-target map from
`spawnEnemy()` into:

```javascript
export function targetForEnemyType(pack, type) {
  if (type === 'boss') return pack?.boss || null;
  const role = ({
    stale: 'common-a',
    rumor: 'common-b',
    lag: 'common-c',
    spoiler: 'elite',
    patch: 'elite',
    event: 'event',
  })[type];
  return role ? pack?.targets?.find((target) => target.role === role) || null : null;
}
```

Both spawning and motion warming must use this function. Target array order is never identity
authority; declared roles are.

- [ ] **Step 4: Gate boot and only the between-wave spawn boundary**

Make initial pack preload and current-wave motion warming complete before the animation loop starts.
For later waves, warm the next wave during the current wave. If readiness is still pending after
the current enemy disappears, keep rendering/UI input active but skip simulation steps that could
spawn the next enemy until the required set is ready.

- [ ] **Step 5: Draw ready bundles before static fallback**

In `drawEnemy()`, resolve the pack target ID, get its motion record, select clip/frame, and draw the
bundle. A pending entry returns without drawing a static body. A failed entry draws the current
static target; a ready entry never touches `targets.webp`.

Remove the eager global creature load from boot. Legacy creature art may load only for an unmapped
owner that actually requests it; a mapped pack character is exclusively owned by the motion store.
Update the loader/network-contract test and first-playable accounting in the same commit—never
declare those files cold before the request path is gone.

- [ ] **Step 6: Extend query-gated deterministic evidence**

`render_game_to_text()` must expose current motion asset ID, clip, frame index, bundle readiness,
and structured fallback count. Production without `chrome-smoke` still exposes none of
`render_game_to_text`, `advanceTime`, or `__APN_QA__`.

- [ ] **Step 7: Cache-bust only the shipped runtime entry points**

Update the build ID consistently in `index.html` and every first-party module import covered by the
existing cache-bust contract test. Descriptor and atlas requests receive the same immutable build
generation markers, but the descriptor request key is the pack-owned descriptor hash while the
atlas request key is the descriptor-owned atlas hash, so mixed release generations cannot become a
normal fallback path.

- [ ] **Step 8: Unify reduced-motion state**

Create one pure effective value from the saved in-app switch OR the OS
`prefers-reduced-motion: reduce` query. Subscribe to `MediaQueryList` `change` events without
overwriting the saved switch. Rendering, simulation effects, and query-gated QA must consume this
same value.

- [ ] **Step 9: Run headless and browser-smoke gates**

Run:

```console
node qa/run-tests.mjs
# Terminal 1: zero-dependency loopback server
node tools/dev-server.mjs --host 127.0.0.1 --port 8792

# Terminal 2: real Chrome/CDP matrix with disposable screenshot evidence
APN_MOTION_SHOTS="$(mktemp -d /tmp/apn-motion-chrome.XXXXXX)"
BASE_URL=http://127.0.0.1:8792 node qa/browser/chrome-gaf2d-creatures.mjs "$APN_MOTION_SHOTS"
```

Expected: pass. Browser smoke may exercise a synthetic motion fixture until approved production
bundles are integrated.

- [ ] **Step 10: Commit runtime integration**

```console
git add js index.html qa
git commit -m "feat: render pack-owned authored motion"
```

### Task 5: Independent review and full technical gate

**Files:**
- Verify all files changed by Tasks 1–4

**Interfaces:**
- Produces: a fixture-proven runtime ready for approved production bundles

- [ ] **Step 1: Run the complete headless gate**

```console
node qa/run-tests.mjs
node scripts/assets/verify-sizes.mjs
git diff --check
```

Expected: all exit 0.

- [ ] **Step 2: Run real browser QA**

Serve the worktree on loopback with `node tools/dev-server.mjs --host 127.0.0.1 --port 8792`,
then run `BASE_URL=http://127.0.0.1:8792 node qa/browser/chrome-gaf2d-creatures.mjs
"$(mktemp -d /tmp/apn-motion-chrome.XXXXXX)"`. The real Chrome/CDP harness covers `375×812`,
`428×926`, and `844×390` in standard and reduced motion and captures console errors, overflow,
current clip/frame, fallback count, ResourceTiming order, lifecycle resume, and fixed-timestamp
screenshots.

- [ ] **Step 3: Request independent code review**

Review must cover descriptor trust boundaries, hash verification, async race handling, duplicate
loads, bitmap release, state precedence, pending-vs-failed behavior, reduced motion, query-gated QA,
first-playable truthfulness, and future pack scalability.

- [ ] **Step 4: Resolve every actionable finding with a failing regression test**

Each fix begins with the smallest failing Node or browser test and ends by rerunning its focused
gate.

- [ ] **Step 5: Re-run Steps 1–2**

Expected: all pass with zero fallback in the synthetic canonical motion case.

- [ ] **Step 6: Commit review fixes only when files changed**

```console
git add -u
git commit -m "fix: close authored motion runtime review findings"
```
