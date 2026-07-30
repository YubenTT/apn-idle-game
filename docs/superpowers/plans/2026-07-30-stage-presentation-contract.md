# Stage Presentation Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved 96/72/112 visible-body stage hierarchy, stable grounding, and shared actor-anchor geometry for the current APN Hero and all creature integrations.

**Architecture:** A new pure `stage-presentation.js` module separates intrinsic source geometry from game-owned role presentation and resolves one immutable actor geometry. The deterministic GAF2D preview builder emits hash-bound neutral and union motion bounds; Hero, creature, and overlay renderers consume the same resolved geometry without changing asset pixels, authored motion, or clip timing. GAF2D guidance records the same integration boundary for future characters without changing its schema-version-1 core.

**Tech Stack:** Vanilla ES modules, Canvas 2D, Node.js headless QA, deterministic local GAF2D preview builder, static localhost runtime.

## Global Constraints

- Hero neutral visible body is exactly 96 px at `fit = 1`, with a 6 px visual hover gap.
- Standard creature neutral visible body is exactly 72 px at `fit = 1`, with a 2 px ground gap.
- Elite is reserved at 84 px and must require an explicit role assignment.
- Wave 10 boss neutral visible body is exactly 112 px at `fit = 1`, with a 2 px ground gap.
- One presentation transform applies unchanged to every clip and frame in one motion set.
- Frame selection remains elapsed time multiplied by the declared integer clip FPS.
- GAF2D owns source canvas, pivot, trim, body masks, shared transform, timing, lineage, and approvals.
- APN Idle Game owns role, target visible height, visual gap, responsive fit, and stage anchors.
- Do not modify asset pixels, clip membership, FPS, frame counts, approval hashes, or source media.
- Do not make provider calls, upload media, push, or deploy.
- Keep the runtime zero-dependency and static-server compatible.
- Preserve normal-gameplay fail-closed isolation from ignored `.gaf2d-preview` content.

---

## File Structure

### New files

- `js/stage-presentation.js` — pure role contract, presentation-record validation, stage-fit calculation, and immutable geometry resolution.
- `qa/check-stage-presentation.mjs` — exact deterministic math, invalid-input, compatibility-adapter, and shared-transform tests.

### Modified game files

- `scripts/assets/build-gaf2d-preview.mjs` — measure runtime neutral/union alpha bounds and emit hash-bound preview presentation records.
- `js/motion-bundle.js` — validate presentation records on unapproved preview descriptors and preserve production V1 compatibility.
- `js/hero-v3-contract.js` — require the same presentation record only for preview Hero descriptors.
- `js/hero-v3.js` — retain preview presentation geometry in runtime clips and expose it to the renderer.
- `js/hero-v2.js` — separate body pivot motion from the renderer-owned ground shadow.
- `js/host-contract.js` — replace the retired trim-height gate with the approved visible-body Hero contract.
- `js/render.js` — resolve actor geometry once and feed Hero, creatures, HP, brackets, floaters, auras, hit, crit, and loot consumers.
- `js/enemies-v2.js` — accept externally resolved size/ground/shadow facts without inventing a second geometry.
- `js/creatures.js` — keep the legacy atlas adapter on the same role geometry instead of owning a second size path.
- `js/game.js` — replace fixed Hero/enemy effect lifts with shared actor anchors propagated from the renderer.
- `qa/check-gaf2d-preview-build.mjs` — prove deterministic presentation metadata for all seven assets.
- `qa/check-motion-bundle.mjs` — prove strict preview validation and unchanged production V1 behavior.
- `qa/check-hero-v3-runtime.mjs` — prove Hero runtime retains presentation facts and blits with the resolved pivot.
- `qa/check-hero-motion-semantics.mjs` — prove semantics/FPS remain unchanged after the renderer refactor.
- `qa/check-gaf2d-valorant.mjs` — prove all current creatures map to standard or boss roles without ID-specific scales.
- `qa/check-creatures.mjs` — prove legacy/static atlas rendering consumes external role geometry.
- `qa/run-tests.mjs` — include the new geometry gate and update the retired Host size assertion.

### Documentation and guidance

- `brand/ART-DIRECTION.md`
- `brand/MASCOT-CANON.md`
- `docs/ASSET-ENGINE.md`
- `docs/ART-PIPELINE.md`
- `docs/ARCHITECTURE.md`
- `docs/decisions/ADR-0017-visible-body-stage-presentation.md`
- `docs/decisions/README.md`
- `docs/SCREEN-SPECS.md`
- `docs/QA-CHECKLIST.md`
- `docs/DEFINITION-OF-DONE.md`
- `progress.md`
- `qa/QA-REPORT.md`
- `/Users/talatongu/Documents/gaf2d/docs/runtime-integration.md`
- `/Users/talatongu/Documents/gaf2d/skills/gaf2d/SKILL.md`
- `/Users/talatongu/.codex/skills/gaf2d/SKILL.md`

---

### Task 1: Pure Stage Presentation Contract

**Files:**
- Create: `js/stage-presentation.js`
- Create: `qa/check-stage-presentation.mjs`
- Modify: `qa/run-tests.mjs:116-220`
- Modify: `js/host-contract.js:17-21`
- Modify: `qa/run-tests.mjs:242-259`

**Interfaces:**
- Produces: `STAGE_ROLE_PRESENTATION`
- Produces: `validatePresentationRecord(record) -> string[]`
- Produces: `legacySquarePresentation({ sourceSize?, visibleInset? }) -> object`
- Produces: `resolveActorGeometry(input) -> Readonly<StageActorGeometry>`
- Produces: `stageFitForActors(input) -> number`
- Consumes later: every renderer and preview descriptor validator.

- [ ] **Step 1: Write the failing role and geometry tests**

```js
import {
  STAGE_ROLE_PRESENTATION,
  resolveActorGeometry,
  stageFitForActors,
  validatePresentationRecord,
} from '../js/stage-presentation.js';

assert(
  JSON.stringify(STAGE_ROLE_PRESENTATION) === JSON.stringify({
    hero: { visibleBodyHeight: 96, visualGap: 6 },
    standard: { visibleBodyHeight: 72, visualGap: 2 },
    elite: { visibleBodyHeight: 84, visualGap: 2 },
    boss: { visibleBodyHeight: 112, visualGap: 2 },
  }),
  'role ladder is exact',
);

const presentation = {
  schemaVersion: 1,
  scaleContract: 'visible-body',
  reference: {
    clip: 'idle',
    frameIndex: 0,
    sourceSha256: 'a'.repeat(64),
  },
  visibleBounds: { x: 8, y: 6, width: 40, height: 50 },
  motionBounds: { x: 2, y: 1, width: 54, height: 61 },
};

const geometry = resolveActorGeometry({
  actorX: 200,
  groundY: 300,
  fit: 1,
  role: 'standard',
  frameSize: { width: 64, height: 64 },
  trim: { x: 4, y: 3, width: 56, height: 58 },
  pivot: { x: 0.5, y: 1 },
  presentation,
});

assert(geometry.body.height === 72, 'standard body height is exact');
assert(geometry.body.bottom === 298, 'standard body has a 2 px ground gap');
assert(geometry.body.top === 226, 'body top derives from the same geometry');
assert(
  geometry.motionEnvelope.top < geometry.body.top,
  'motion envelope protects wider/taller authored poses',
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```console
node qa/check-stage-presentation.mjs
```

Expected: module import failure because `js/stage-presentation.js` does not exist.

- [ ] **Step 3: Implement the pure contract and closed validation**

```js
export const STAGE_ROLE_PRESENTATION = Object.freeze({
  hero: Object.freeze({ visibleBodyHeight: 96, visualGap: 6 }),
  standard: Object.freeze({ visibleBodyHeight: 72, visualGap: 2 }),
  elite: Object.freeze({ visibleBodyHeight: 84, visualGap: 2 }),
  boss: Object.freeze({ visibleBodyHeight: 112, visualGap: 2 }),
});

export function resolveActorGeometry({
  actorX,
  groundY,
  fit,
  role,
  frameSize,
  trim,
  pivot,
  presentation,
}) {
  const errors = validatePresentationRecord(presentation);
  if (errors.length) throw new Error(errors.join('; '));
  const roleContract = STAGE_ROLE_PRESENTATION[role];
  if (!roleContract) throw new Error(`unknown stage role "${String(role)}"`);

  const targetBodyHeight = roleContract.visibleBodyHeight * fit;
  const visualGap = roleContract.visualGap * fit;
  const scale = targetBodyHeight / presentation.visibleBounds.height;
  const sourcePivotY = frameSize.height * pivot.y;
  const visibleBottomFromPivot =
    sourcePivotY -
    (trim.y + presentation.visibleBounds.y + presentation.visibleBounds.height);
  const pivotY =
    groundY - visualGap + visibleBottomFromPivot * scale;
  const bodyBottom = groundY - visualGap;
  const bodyTop = bodyBottom - targetBodyHeight;

  return Object.freeze({
    role,
    targetBodyHeight,
    visualGap,
    scale,
    pivotY,
    drawTrimHeight: trim.height * scale,
    body: Object.freeze({
      top: bodyTop,
      bottom: bodyBottom,
    }),
  });
}
```

Complete the implementation with bounded exact-key checks, finite-number
checks, visible/motion bounds containment, `motionBounds` containing
`visibleBounds`, immutable nested output, horizontal body/envelope math, anchor
facts, legacy square adapter, and actor-list stage-fit math.

- [ ] **Step 4: Add the new test to the full runner and update the Host contract assertion**

`HOST_PRESENTATION` becomes:

```js
export const HOST_PRESENTATION = Object.freeze({
  role: 'hero',
  visibleBodyHeight: 96,
  visualGap: 6,
});
```

The headless assertion must compare these exact facts and no longer describe
118–142 px trim sizing.

- [ ] **Step 5: Run focused and full tests**

Run:

```console
node qa/check-stage-presentation.mjs
node qa/run-tests.mjs
```

Expected: the focused geometry suite passes; the full suite may identify the
expected downstream render assertions that Tasks 2–4 update, but no unrelated
domain/economy test may fail.

- [ ] **Step 6: Commit the pure contract**

```console
git add js/stage-presentation.js js/host-contract.js qa/check-stage-presentation.mjs qa/run-tests.mjs
git commit -m "feat: define stage presentation contract"
```

---

### Task 2: Deterministic GAF2D Preview Presentation Metadata

**Files:**
- Modify: `scripts/assets/build-gaf2d-preview.mjs:551-1090`
- Modify: `js/motion-bundle.js:53-260`
- Modify: `js/hero-v3-contract.js:117-175,560-685`
- Modify: `qa/check-gaf2d-preview-build.mjs:270-418`
- Modify: `qa/check-motion-bundle.mjs:96-189`
- Modify: `qa/check-gaf2d-hero-build.mjs`

**Interfaces:**
- Consumes: `validatePresentationRecord(record) -> string[]`
- Produces: preview descriptor `presentation` record for all seven assets.
- Produces: build-time `cellBounds` keyed by exact frame ID.
- Produces later: Hero and creature runtime source geometry.

- [ ] **Step 1: Add failing descriptor validation tests**

The preview fixture helper must add:

```js
preview.presentation = {
  schemaVersion: 1,
  scaleContract: 'visible-body',
  reference: {
    clip: 'idle',
    frameIndex: 0,
    sourceSha256: 'd'.repeat(64),
  },
  visibleBounds: { x: 8, y: 4, width: 64, height: 88 },
  motionBounds: { x: 2, y: 1, width: 78, height: 96 },
};
```

Assert that preview descriptors reject:

- a missing `presentation`;
- `reference.clip !== 'idle'`;
- nonzero current reference frame;
- bounds outside `trim`;
- a motion envelope that does not contain the neutral bounds;
- zero body height;
- a malformed source SHA-256;
- any unknown presentation key.

Assert that unchanged production `gaf2d-motion-bundle-v1` fixtures remain valid
without the new preview-only record.

- [ ] **Step 2: Run descriptor tests and verify RED**

Run:

```console
node qa/check-motion-bundle.mjs
node qa/check-hero-v3-runtime.mjs
```

Expected: preview presentation tests fail because the preview grammars do not
yet recognize or require the record.

- [ ] **Step 3: Extend preview-only validators**

Add `presentation` to `PREVIEW_TOP_LEVEL_KEYS` and
`PREVIEW_DESCRIPTOR_KEYS`, import `validatePresentationRecord`, and append its
bounded errors with a stable `presentation:` prefix.

Do not add the field to the production V1 exact-key sets.

- [ ] **Step 4: Make the derivative builder retain exact runtime alpha bounds**

While each resized transparent cell still exists, inspect its alpha bounds and
return:

```js
{
  webp,
  webpBytes,
  webpDimensions,
  cellBounds: new Map([
    [frameId, { x, y, width, height }],
  ]),
}
```

Build one presentation record per asset:

```js
function presentationRecord(source, cellBounds) {
  const idle = source.candidate.clips.idle;
  requireFact(idle && idle.frame_ids.length > 0, `${source.assetId} has no idle reference`);
  const referenceId = idle.frame_ids[0];
  const visibleBounds = cellBounds.get(referenceId);
  const motionBounds = unionBounds(source.frameIds.map(id => cellBounds.get(id)));
  return {
    schemaVersion: 1,
    scaleContract: 'visible-body',
    reference: {
      clip: 'idle',
      frameIndex: 0,
      sourceSha256: source.frames.get(referenceId).sha256,
    },
    visibleBounds,
    motionBounds,
  };
}
```

The real and fake derivative implementations must return the same shape.
Creature descriptors receive the record once. Every Hero clip descriptor
receives the same asset-level record.

- [ ] **Step 5: Prove deterministic output and all seven records**

Extend the build test to assert:

```js
for (const asset of allSevenAssets) {
  assert(asset.presentation.scaleContract === 'visible-body');
  assert(asset.presentation.reference.clip === 'idle');
  assert(asset.presentation.reference.frameIndex === 0);
  assert(boundsInsideTrim(asset.presentation.visibleBounds, asset.trim));
  assert(boundsInsideTrim(asset.presentation.motionBounds, asset.trim));
}
```

Also assert two unchanged builds produce byte-identical descriptors and
manifest hashes after the presentation record is added.

- [ ] **Step 6: Run focused tests and regenerate the ignored local preview**

Run:

```console
node qa/check-motion-bundle.mjs
node qa/check-gaf2d-preview-build.mjs
node scripts/assets/build-gaf2d-preview.mjs --gaf2d-project /Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d --output .gaf2d-preview
```

Expected: all seven assets report bounded neutral and union presentation
geometry, with zero provider calls and no approval fields.

- [ ] **Step 7: Commit the integration metadata**

```console
git add scripts/assets/build-gaf2d-preview.mjs js/motion-bundle.js js/hero-v3-contract.js qa/check-gaf2d-preview-build.mjs qa/check-motion-bundle.mjs qa/check-gaf2d-hero-build.mjs
git commit -m "feat: bind visible body geometry to previews"
```

---

### Task 3: Hero Scale, Grounding, and Shadow Separation

**Files:**
- Modify: `js/hero-v3.js:127-147,316-408`
- Modify: `js/hero-v2.js:28-139,277-374`
- Modify: `js/render.js:258-423`
- Modify: `js/game.js:463-475`
- Modify: `qa/check-hero-v3-runtime.mjs:337-450`
- Modify: `qa/check-hero-motion-semantics.mjs`

**Interfaces:**
- Consumes: `resolveActorGeometry(...)`
- Consumes: preview clip `presentation`
- Produces: `getV3Presentation() -> object | null`
- Produces: Hero draw options `{ drawTrimHeight, pivotY, geometry }`
- Produces later: common overlay geometry contract.

- [ ] **Step 1: Write failing Hero retention and placement tests**

After loading a preview Hero, assert:

```js
const presentation = getV3Presentation();
assert(
  presentation?.visibleBounds.height > 0 &&
    presentation?.motionBounds.height >= presentation.visibleBounds.height,
  'Hero runtime retains one validated presentation record',
);

const geometry = resolveActorGeometry({
  actorX: 120,
  groundY: 300,
  fit: 1,
  role: 'hero',
  frameSize: getV3Clip('idle').frameSize,
  trim: toLongRect(getV3Clip('idle').trim),
  pivot: { x: 0.5, y: 1 },
  presentation,
});
assert(geometry.body.height === 96, 'Hero visible body resolves to 96 px');
assert(geometry.body.bottom === 294, 'Hero keeps the approved 6 px hover');
```

Capture fake Canvas calls and prove the shadow's Y remains fixed when jump,
overdrive hover, or authored clip selection changes.

- [ ] **Step 2: Run Hero tests and verify RED**

Run:

```console
node qa/check-hero-v3-runtime.mjs
node qa/check-hero-motion-semantics.mjs
```

Expected: missing `getV3Presentation` and old shadow/pivot behavior fail.

- [ ] **Step 3: Retain one consistent Hero presentation record**

`runtimeClip()` copies validated `descriptor.presentation`. During set load,
reject a modern preview or approved set if any clip's full-frame size, shared
trim, pivot, or presentation differs from `idle` by stable JSON comparison.
Keep only the named historical compatibility path for old independently
authored Hero descriptors.

Expose:

```js
export function getV3Presentation() {
  return V3?.clips?.idle?.presentation || null;
}
```

- [ ] **Step 4: Resolve Hero geometry in `render.js`**

Use the loaded authored record when available. Use one explicit legacy Hero
adapter when the safe procedural fallback is active. Pass the resolved trim
height and pivot to `drawHeroV2`.

Aura, crown, combo chip, and Hero floater clearance use the returned `body`,
`motionEnvelope`, and `anchors` instead of `mhEff`.

- [ ] **Step 5: Keep the shadow on the ground**

In `drawHeroV2`, paint the shadow before translating the body to `pivotY`.
Apply hover, jump, recoil, lunge, rotation, and squash only to the body group.
The shadow may change width/opacity from the action envelope but not follow the
body vertically.

- [ ] **Step 6: Replace the game-side 130 px floater lift**

Import the pure role contract in `game.js` and derive Hero floater clearance
from `STAGE_ROLE_PRESENTATION.hero.visibleBodyHeight` plus the existing
documented margin.

- [ ] **Step 7: Run focused and full tests**

Run:

```console
node qa/check-stage-presentation.mjs
node qa/check-hero-v3-runtime.mjs
node qa/check-hero-motion-semantics.mjs
node qa/run-tests.mjs
```

Expected: Hero stays 96 px at `fit = 1`, has a neutral 6 px hover, and retains
all eight elapsed-time clip semantics.

- [ ] **Step 8: Commit Hero integration**

```console
git add js/hero-v3.js js/hero-v2.js js/render.js js/game.js qa/check-hero-v3-runtime.mjs qa/check-hero-motion-semantics.mjs
git commit -m "feat: ground hero with visible body geometry"
```

---

### Task 4: Creature Roles and Unified Overlay Anchors

**Files:**
- Modify: `js/render.js:28-28,99-192,425-680,730-940`
- Modify: `js/motion-bundle.js:609-666`
- Modify: `js/enemies-v2.js:52-173`
- Modify: `js/creatures.js`
- Modify: `js/game.js`
- Modify: `qa/check-motion-bundle.mjs`
- Modify: `qa/check-gaf2d-valorant.mjs`
- Modify: `qa/check-creatures.mjs`
- Modify: `qa/check-hero-motion-semantics.mjs`
- Modify: `qa/browser/probe-stage-geometry.mjs`
- Modify: `qa/browser/chrome-gaf2d-creatures.mjs`

**Interfaces:**
- Consumes: `resolveActorGeometry(...)`
- Produces: `stageRoleForEnemy(enemy) -> 'standard' | 'boss'`
- Produces: `drawEnemy(...) -> StageActorGeometry`
- Produces: per-frame `actorGeometries: Map<enemyId, StageActorGeometry>`

- [ ] **Step 1: Write failing creature role and anchor tests**

Assert:

```js
assert(stageRoleForEnemy({ type: 'stale' }) === 'standard');
assert(stageRoleForEnemy({ type: 'patch' }) === 'standard');
assert(stageRoleForEnemy({ type: 'boss' }) === 'boss');
```

For an authored Entry Runner, assert a 72 px body and 2 px ground gap. For Site
Warden and its broken clip, assert the same record/transform resolves a 112 px
body and 2 px gap. Assert the HP top and priority brackets use
`motionEnvelope.top`, while hit/loot use `anchors.hitY` and `anchors.lootY`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```console
node qa/check-motion-bundle.mjs
node qa/check-gaf2d-valorant.mjs
```

Expected: old 96/100/136 trim sizing and guessed anchors fail.

- [ ] **Step 3: Resolve one geometry per enemy**

Delete `enemyRenderSize`. Resolve the role from trusted game state, obtain
authored presentation from the validated motion record, and otherwise use an
explicit legacy square adapter.

`drawMotionFrame` continues to reconstruct the full source pivot but receives
the resolved `pivotY` and `drawTrimHeight`:

```js
drawMotionFrame(
  ctx,
  motionInfo.record,
  motionInfo.clip,
  motionInfo.frameIndex,
  x,
  geometry.pivotY,
  geometry.drawTrimHeight,
);
```

- [ ] **Step 4: Feed every overlay from the geometry map**

The draw loop stores the value returned by `drawEnemy`. Update:

- authored/static/procedural shadow placement;
- HP plate and priority brackets;
- anchored floaters;
- normal/critical hit flashes;
- shock-ring origins;
- loot-flight origins.

Death may keep authored pose changes but cannot invent a different role scale.
HP remains hidden while dying.

The ready authored-motion path, static pack path, procedural path, and legacy
creature atlas path all receive the same resolved geometry. None may bypass
shared shadow, hit, or death placement. Propagate a stable actor anchor ID or
the resolved immutable geometry into game effects so `game.js` no longer owns
fixed pixel lifts for damage, shock, or loot origins.

- [ ] **Step 5: Recompute short-stage fit from actor motion envelopes**

Replace the hard-coded 136 px denominator with `stageFitForActors`. The input
contains the Hero and the current enemy/boss intrinsic envelope ratios. The
result remains bounded to `0.5..1` and is stamped into `world.stageFit` for
presentational consumers.

- [ ] **Step 6: Update browser probes**

Browser QA must report resolved:

```js
{
  role,
  bodyTop,
  bodyBottom,
  bodyHeight,
  visualGap,
  motionTop,
  hpY,
  shadowY
}
```

It must stop reconstructing heads from the deleted 96/100/136 constants.

- [ ] **Step 7: Run focused and full tests**

Run:

```console
node qa/check-stage-presentation.mjs
node qa/check-motion-bundle.mjs
node qa/check-gaf2d-valorant.mjs
node qa/check-creatures.mjs
node qa/check-hero-motion-semantics.mjs
node qa/run-tests.mjs
```

Expected: standard, boss, broken, fallbacks, and overlay anchors pass with no
combat/economy changes.

- [ ] **Step 8: Commit creature integration**

```console
git add js/render.js js/motion-bundle.js js/enemies-v2.js js/creatures.js js/game.js qa/check-motion-bundle.mjs qa/check-gaf2d-valorant.mjs qa/check-creatures.mjs qa/check-hero-motion-semantics.mjs qa/browser/probe-stage-geometry.mjs qa/browser/chrome-gaf2d-creatures.mjs
git commit -m "feat: unify creature stage geometry"
```

---

### Task 5: Lock the Future GAF2D Integration Rule

**Files:**
- Create: `/Users/talatongu/Documents/gaf2d/docs/runtime-integration.md`
- Modify: `/Users/talatongu/Documents/gaf2d/skills/gaf2d/SKILL.md`
- Modify: `/Users/talatongu/.codex/skills/gaf2d/SKILL.md`
- Modify: `brand/ART-DIRECTION.md`
- Modify: `brand/MASCOT-CANON.md`
- Modify: `docs/ASSET-ENGINE.md`
- Modify: `docs/ART-PIPELINE.md`
- Modify: `docs/ARCHITECTURE.md`
- Create: `docs/decisions/ADR-0017-visible-body-stage-presentation.md`
- Modify: `docs/decisions/README.md`
- Modify: `docs/SCREEN-SPECS.md`
- Modify: `docs/QA-CHECKLIST.md`
- Modify: `docs/DEFINITION-OF-DONE.md`
- Modify: `qa/check-doc-contracts.mjs`

**Interfaces:**
- Consumes: the implemented role and intrinsic-presentation contracts.
- Produces: one reusable authoring/integration checklist for future agents.
- Does not produce: a new GAF2D schema, approval, provider call, or APN role in GAF2D core.

- [ ] **Step 1: Add failing documentation contract checks**

Require the game docs to contain:

```text
visible-body height
motion envelope
one shared transform
Hero 96
standard 72
boss 112
frame-by-frame grounding is forbidden
```

Require the GAF2D runtime integration document and both skill copies to state:

```text
GAF2D owns intrinsic geometry
the game owns role scale
declare one neutral reference frame
hash-bind visible and union motion bounds
never ground each frame independently
mechanical geometry does not approve motion
```

- [ ] **Step 2: Run doc tests and verify RED**

Run:

```console
node qa/check-doc-contracts.mjs
```

Expected: missing integration doctrine fails.

- [ ] **Step 3: Write the GAF2D integration document**

Document:

1. source canvas, pivot, trim, mask, shared-transform ownership;
2. neutral visible bounds versus union motion envelope;
3. game-owned role ladder;
4. hash binding and fail-closed importer behavior;
5. actual-size proof and overlay/shadow checks;
6. human identity/motion/release gates;
7. no schema-version-1 change in this delivery.

The current dirty GAF2D worktree must be preserved. Record its initial status,
edit only the three listed guidance files, and never stage or commit unrelated
changes.

- [ ] **Step 4: Update game source-of-truth docs**

Keep values and terminology identical to
`STAGE_ROLE_PRESENTATION`. State that neutral body bounds choose scale,
motion-envelope bounds protect labels, and one transform preserves acting.

- [ ] **Step 5: Run documentation and GAF2D skill tests**

Run:

```console
node qa/check-doc-contracts.mjs
uv run pytest -q tests/unit/test_skill_install.py tests/integration/test_docs_contract.py
```

Expected: game docs and GAF2D guidance agree; no unrelated GAF2D file is
modified by the test run.

- [ ] **Step 6: Commit only game-repository documentation**

```console
git add brand/ART-DIRECTION.md brand/MASCOT-CANON.md docs/ASSET-ENGINE.md docs/ART-PIPELINE.md docs/ARCHITECTURE.md docs/decisions/ADR-0017-visible-body-stage-presentation.md docs/decisions/README.md docs/SCREEN-SPECS.md docs/QA-CHECKLIST.md docs/DEFINITION-OF-DONE.md qa/check-doc-contracts.mjs
git commit -m "docs: lock authored actor integration geometry"
```

Leave GAF2D repository guidance uncommitted if committing it would include
pre-existing user changes in the same file. Report that exact state rather than
mixing ownership.

---

### Task 6: Full QA, Visual Review, and Evidence

**Files:**
- Modify: `progress.md`
- Modify: `qa/QA-REPORT.md`
- Generate ignored: `.gaf2d-preview/qa-evidence/stage-presentation-375x812.png`
- Generate ignored: `.gaf2d-preview/qa-evidence/stage-presentation-390x844.png`
- Generate ignored: `.gaf2d-preview/qa-evidence/stage-presentation-428x926.png`
- Generate ignored: `.gaf2d-preview/qa-evidence/stage-presentation-844x390.png`
- Generate ignored: `.gaf2d-preview/qa-evidence/stage-presentation-wave10.png`

**Interfaces:**
- Consumes: completed implementation and deterministic preview build.
- Produces: final test evidence, screenshots, and localhost review URL.

- [ ] **Step 1: Run the deterministic preview build twice**

Run:

```console
node scripts/assets/build-gaf2d-preview.mjs --gaf2d-project /Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d --output .gaf2d-preview
node scripts/assets/build-gaf2d-preview.mjs --gaf2d-project /Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d --output .gaf2d-preview
```

Expected: identical manifest SHA-256 and file projection; zero provider calls.

- [ ] **Step 2: Run the complete offline gate**

Run:

```console
node qa/run-tests.mjs
git diff --check
```

Expected: `ALL PASS`, no whitespace errors.

- [ ] **Step 3: Inspect the localhost game at four viewports**

Use:

```text
http://127.0.0.1:8790/?motion-preview=1&mute=1&autostart=1&zone=1
```

Verify 375×812, 390×844, 428×926, and 844×390 in normal and reduced motion.
Inspect the standard encounter, Hero attack, creature advance/hit/death, HP,
priority, floater, aura, hit, and loot anchors.

- [ ] **Step 4: Inspect Wave 10 and broken state**

Verify Site Warden at 112 px, 2 px ground gap, stable shared transform, clear HP
plate, and unchanged geometry when switching to `broken`.

- [ ] **Step 5: Record measurable browser facts**

For every required viewport, record:

```text
Hero body: 96 × fit
Hero neutral gap: 6 × fit
Standard body: 72 × fit
Standard gap: 2 × fit
Boss body: 112 × fit
Boss gap: 2 × fit
shadowY == groundY
no console errors
no failed motion records
```

- [ ] **Step 6: Update reports with exact evidence**

`progress.md` and `qa/QA-REPORT.md` must name:

- commit IDs;
- focused and full commands;
- viewport matrix;
- screenshot paths;
- unchanged FPS/frame counts;
- unapproved-preview status;
- no paid calls/uploads/push/deploy;
- the remaining human motion approval gate.

- [ ] **Step 7: Run independent review**

Review for:

- frame-by-frame grounding;
- duplicate size constants;
- ID-specific scale overrides;
- shadow movement with body;
- HP/floater guesses that bypass geometry;
- preview authority leaks;
- stale docs or test omissions.

Fix every actionable issue and rerun focused plus full QA.

- [ ] **Step 8: Commit verified evidence**

```console
git add progress.md qa/QA-REPORT.md
git commit -m "docs: record stage presentation proof"
```

- [ ] **Step 9: Present final localhost proof**

Leave the verified localhost game running and provide the exact preview link
plus the portrait and Wave 10 screenshots. Do not push or deploy.
