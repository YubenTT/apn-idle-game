# Stage Presentation Contract Design

**Status:** Approved for implementation on 2026-07-30  
**Visual decision:** Option B — balanced stage contract  
**Scope:** APN Idle Game runtime integration plus the GAF2D-to-game handoff rule

## Problem

The authored GAF2D motion sets preserve their original full canvas, bottom-center
pivot, shared trim, and clip timing. The game renderer historically interpreted
its `height` argument as the height of the trimmed atlas cell. That happened to
look correct for older sprites whose visible pixels nearly filled the cell and
ended at the source pivot.

The current authored frames intentionally preserve much more transparent canvas
below the visible character. Reusing the old trim-height contract therefore:

- displays the Hero and creatures larger than the intended gameplay hierarchy;
- displays the preserved transparent bottom margin as an unintended visual
  hover;
- positions HP plates, priority brackets, damage text, auras, shadows, and hit
  effects from guessed square sizes instead of the visible actor;
- makes future assets depend on accidental crop geometry.

The frames, pivots, and authored motion are not defective. The missing piece is
an explicit game presentation contract between intrinsic asset geometry and
game-owned role sizing.

## Goals

1. Render the APN Hero at a 96 px neutral visible-body height with a deliberate
   6 px hover gap.
2. Render standard creatures at a 72 px neutral visible-body height with a 2 px
   ground gap.
3. Render the Wave 10 boss at a 112 px neutral visible-body height with a 2 px
   ground gap.
4. Reserve an 84 px elite role without silently assigning it to an asset.
5. Apply one stable scale and pivot translation to an entire motion set. Never
   ground or resize individual animation frames.
6. Derive every actor-relative overlay from the same resolved geometry.
7. Make the rule deterministic and reusable for every future GAF2D character
   integration.
8. Preserve legacy/static fallbacks and fail closed when authored presentation
   metadata is malformed.

## Non-goals

- Do not regenerate, crop, repaint, retime, or reapprove any asset.
- Do not change clip FPS, frame count, playback mode, elapsed-time playback, or
  reduced-motion semantics.
- Do not alter GAF2D approval records, source media, normalized frame bytes, or
  public schema-version-1 contracts.
- Do not make APN-specific pixel roles part of GAF2D core.
- Do not perform frame-by-frame alpha grounding.
- Do not add a scene editor, database, server, or new runtime dependency.
- Do not treat this visual staging approval as creative motion approval.
- Do not push or deploy as part of this implementation.

## Ownership Boundary

### GAF2D owns intrinsic asset truth

GAF2D remains responsible for:

- source canvas dimensions;
- alpha-derived visible bounds and optional body-mask-derived bounds;
- bottom-center source pivot and trimmed-pivot reconstruction;
- one shared transform across an authored motion set;
- clip membership, timing, playback, lineage, and hashes;
- creative identity and motion approval gates.

GAF2D does **not** choose a game's Hero, standard, elite, or boss pixel height.

### APN Idle Game owns stage presentation

The game remains responsible for:

- role assignment;
- target visible-body height;
- neutral visual ground or hover gap;
- responsive stage-fit scaling;
- actor-relative shadow, HP, floater, aura, hit, and loot anchors.

The integration layer binds these two truths without modifying either one's
authority.

## Role Scale Ladder

The following values describe the neutral **visible body**, not the atlas cell,
trim, or source canvas:

| Role | Visible-body height | Neutral ground gap | Assignment |
|---|---:|---:|---|
| `hero` | 96 px | 6 px | APN Hero only |
| `standard` | 72 px | 2 px | default creature role |
| `elite` | 84 px | 2 px | reserved; requires an explicit role flag |
| `boss` | 112 px | 2 px | Wave 10 boss |

No asset ID may contain a hidden scale override. A different size requires a
named role or a future reviewed revision of this table.

## Intrinsic Presentation Record

Every newly integrated authored character must carry one game-integration
presentation record that is bound to the exact descriptor and image lineage:

```js
{
  schemaVersion: 1,
  scaleContract: 'visible-body',
  reference: {
    clip: 'idle',
    frameIndex: 0,
    sourceSha256: '<64 lowercase hex>'
  },
  visibleBounds: {
    x: 0,
    y: 0,
    width: 1,
    height: 1
  },
  motionBounds: {
    x: 0,
    y: 0,
    width: 1,
    height: 1
  }
}
```

Rules:

- `visibleBounds` is relative to the shared trimmed frame rectangle.
- `motionBounds` is the body-only union envelope of every authored frame,
  relative to that same trim. It protects overlays from the widest/tallest
  authored pose without changing the scale or grounding.
- The reference must be a declared neutral frame, currently `idle:0`.
- Alpha is measured deterministically with the same nonzero threshold used by
  the integration builder. When detached effects exist, the hash-bound GAF2D
  body mask is the measurement authority for both bounds.
- The record is generated once during deterministic integration/build time.
  Runtime code must not scan alpha pixels on every load or frame.
- The record is invalid if the reference clip/frame is missing, the bounds
  escape the trim, the height is zero, the hash is stale, or the role is
  missing.
- The same record applies to every clip and frame for that asset.

Current unapproved localhost preview derivatives may carry this record without
changing a GAF2D approval. A future approved atlas integration must carry the
equivalent hash-bound record in the game-owned pack mapping.

## Geometry Resolution

Let:

- `B` be the reference visible bounds inside the trim;
- `F` be the preserved full source frame;
- `T` be the shared trim;
- `P` be the normalized source pivot;
- `Hrole` be the role's target visible-body height;
- `Grole` be its neutral visual gap;
- `fit` be the responsive stage-fit multiplier;
- `groundY` be the game ground line.

Resolve once per actor draw:

```text
targetBodyHeight = Hrole × fit
visualGap = Grole × fit
scale = targetBodyHeight / B.height

sourcePivotY = F.height × P.y
visibleBottomFromPivot =
  sourcePivotY - (T.y + B.y + B.height)

resolvedPivotY =
  groundY - visualGap + visibleBottomFromPivot × scale

drawTrimHeight = T.height × scale
bodyBottom = groundY - visualGap
bodyTop = bodyBottom - targetBodyHeight
```

Horizontal placement continues to use the full-frame bottom-center pivot:

```text
drawX = actorX + (T.x - F.width × P.x) × scale
drawY = resolvedPivotY + (T.y - F.height × P.y) × scale
```

This moves the one shared source canvas as a unit. It does not modify authored
motion inside that canvas.

## Stable Motion Rule

The presentation record is measured from the neutral reference, but the
resulting scale and pivot translation are shared by all clips and frames:

- do not measure the current frame;
- do not align each frame to the ground;
- do not cancel authored hops, recoil, compression, collapse, or airborne
  poses;
- do not change elapsed-time frame selection (`elapsed × clip FPS`);
- do not add CSS or Canvas animation as a substitute for authored frames.

This preserves authored motion and prevents crop pumping or baseline jitter.

## Resolved Actor Geometry

The pure stage-presentation module returns one immutable value:

```js
{
  role: 'hero',
  targetBodyHeight: 96,
  visualGap: 6,
  scale: 0.24,
  pivotY: 300,
  drawTrimHeight: 100,
  body: {
    left: 100,
    top: 198,
    right: 164,
    bottom: 294,
    width: 64,
    height: 96,
    centerX: 132,
    centerY: 246
  },
  motionEnvelope: {
    left: 88,
    top: 182,
    right: 178,
    bottom: 296
  },
  anchors: {
    shadowX: 132,
    shadowY: 300,
    hpY: 188,
    floaterY: 178,
    auraX: 132,
    auraY: 246,
    hitX: 132,
    hitY: 246,
    lootX: 132,
    lootY: 246
  }
}
```

The neutral `body` comes from `visibleBounds`; the safety `motionEnvelope` comes
from `motionBounds` under the exact same scale and pivot. HP plates, priority
brackets, and viewport clearance use the motion envelope. Aura, hit, loot, and
identity-scale evidence use the neutral body. Consumers may add documented
presentation offsets, such as floater stacking, but must not independently
guess actor height.

## Renderer Integration

### Hero

- The Hero renderer receives the resolved draw trim height and pivot Y.
- The body uses the resolved pivot plus authored/procedural action transforms.
- The renderer-owned shadow stays on `shadowY`; it must not move vertically with
  body hover, jump, recoil, or level-up.
- Tracker/Overdrive fields, crown flare, combo chip, and Hero floaters use the
  resolved body and anchors.
- The procedural identity-safe fallback uses the same 96 px role target and
  6 px neutral hover contract.

### Creatures

- Authored motion uses descriptor presentation geometry.
- Static pack and procedural fallbacks use explicit square/source geometry
  adapters and the same role ladder.
- Priority brackets, HP plate, damage/crit text, hit bloom, shock rings, loot
  flight, and death effects use the resolved actor geometry.
- The Wave 10 broken clip retains the boss role and the same shared transform.

### Responsive stage fit

Stage fit protects the active cast's motion envelope plus its HP plate in short
canvases. At `fit = 1`, each actor's required height is derived from its role
height multiplied by `motionBounds.height / visibleBounds.height`, plus the
fixed banner clearance. Stage fit scales role body height and visual gap
together and no longer uses the retired 136 px trim target. High-refresh
displays do not affect scale or playback speed.

## Compatibility and Failure Behavior

- Historical assets without presentation metadata continue through an explicit
  legacy adapter; they are never misrepresented as authored visible-body
  metadata.
- An authored motion record with malformed/stale presentation metadata fails
  that motion record and uses the existing safe fallback.
- Normal gameplay must not load ignored `.gaf2d-preview` files unless the
  existing loopback `motion-preview=1` authority is active.
- The preview banner remains visible and continues to state that the content is
  unapproved and local-only.

## Future GAF2D Integration Rule

For every new character:

1. Preserve one source canvas and one bottom-center pivot.
2. Preserve or supply a body mask when detached effects would pollute body
   measurement.
3. Declare one neutral reference frame.
4. Generate and hash-bind the intrinsic presentation record.
5. Assign the game role explicitly.
6. Run runtime-size evidence at the role target.
7. Verify all clips with the same transform.
8. Verify shadow and overlays separately from asset pixels.
9. Stop for human motion approval; mechanical geometry never grants it.

The installed `gaf2d` skill and repository guidance must state this boundary.
Existing GAF2D schema-version-1 models remain unchanged unless a separate,
reviewed cross-engine schema is later justified.

## QA Contract

### Deterministic geometry tests

- exact Hero, standard, elite, and boss role values;
- exact visible-body scale and pivot solution;
- exact body top/bottom and anchor derivation;
- exact motion-envelope derivation under the same transform;
- stage-fit behavior;
- invalid bounds, missing role, stale lineage, and zero height fail closed;
- one presentation record yields one transform across different clip frames;
- historical adapter remains deterministic.

### Build and descriptor tests

- preview builder emits the reference, bounds, and lineage for all seven assets;
- bounds are inside the shared trim and reference hashes are current;
- Hero and creature loaders retain strict key validation;
- no asset-specific scale override appears in generated runtime mappings.

### Browser visual matrix

Verify normal and reduced motion at:

- 375 × 812;
- 390 × 844;
- 428 × 926;
- 844 × 390.

At minimum capture:

- standard encounter;
- boss encounter;
- boss broken state;
- Hero idle and attack;
- standard advance, hit, and death;
- HP plate, priority brackets, floater, aura, hit, and loot anchors.

Acceptance:

- Hero neutral visible body is 96 px at `fit = 1`;
- standard neutral visible body is 72 px at `fit = 1`;
- boss neutral visible body is 112 px at `fit = 1`;
- neutral visual gaps are 6/2/2 px before authored motion;
- no body intersects the ground;
- no shadow is baked into the sprite or follows body height;
- HP labels do not overlap actor pixels or fixed HUD/toast bands;
- authored frame selection still follows elapsed time × clip FPS;
- no console errors, failed motion records, or fallback regressions.

## Documentation Updates

Implementation updates:

- `brand/ART-DIRECTION.md` for the role ladder and shared shadow;
- `brand/MASCOT-CANON.md` for the Hero hover and shadow separation;
- `docs/ASSET-ENGINE.md` for intrinsic versus game presentation geometry;
- `docs/SCREEN-SPECS.md` for stage actor/HP clearance;
- `docs/ARCHITECTURE.md` for the central geometry module and consumers;
- `docs/QA-CHECKLIST.md` and `docs/DEFINITION-OF-DONE.md` for reusable gates;
- `progress.md` and `qa/QA-REPORT.md` for verified implementation evidence;
- GAF2D guidance/installed skill for the future integration checklist.

## Rejected Alternatives

### Lower the old constants only

Changing `130/96/136` to smaller trim heights would still encode transparent
padding as stage geometry and would fail on the next differently cropped asset.

### Ground each current frame by alpha

This would erase authored vertical motion, create jitter, and make playback
dependent on raster noise.

### Rewrite pivots or asset bytes

This would mutate intrinsic asset truth, invalidate hashes/approvals, and solve a
game presentation problem in the wrong subsystem.

### Compact 88/64 staging

The compact prototype created more negative space but weakened identity and
motion readability on the primary mobile viewport. It remains rejected.
