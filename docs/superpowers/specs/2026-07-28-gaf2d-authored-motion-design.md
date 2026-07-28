# GAF2D Authored Motion for APN Idle

Date: 2026-07-28

Status: Final. The owner delegated final technical review and implementation on 2026-07-28.
Exact GAF2D identity, motion, rig, and release approvals remain human gates.

## Goal

Replace first-pack sliding target cells with readable character-owned 2D motion, and replace the
current Hero art with clips that preserve the owner's exact legless, floating APN Hero identity.

The path stays deterministic, local, provider-free, 3D-free, hash-locked, Canvas-only, and
dependency-free at runtime.

## Correct diagnosis

The current first-pack renderer changes x-position, bob, and squash while repeatedly sampling one
static atlas cell. This is movement, not authored character motion.

The current Hero still loads the old eight V3 atlases. The unapproved GAF2D candidate added legs
that do not exist in the owner's supplied identity reference and cannot be integrated.

This specification supersedes the runtime-motion portions of:

- `docs/superpowers/specs/2026-07-26-gaf2d-valorant-creatures-design.md`;
- `docs/decisions/ADR-0013-gaf2d-static-creature-atlas.md`.

The fixed cast, original-IP restrictions, source hashes, wave mapping, and role names remain valid.
A new ADR records the replacement; history is not rewritten.

## Fixed scope

Exactly seven identities:

- `apn-hero`;
- `entry-runner`;
- `veil-operator`;
- `signal-hunter`;
- `site-sentinel`;
- `protocol-courier`;
- `site-warden`.

No skins, recolors, wave variants, extra creatures, 3D assets, or automatic rig authoring.
`site-warden` owns its broken phase as part of the same asset.

## Authoring contract

GAF2D owns manifests, hashes, approvals, QA, and exports. APN-specific masks, pivots, draw order,
pose curves, and recipes live in the sibling APN GAF2D project.

Each character is approved as one named motion set, not as unrelated per-clip approvals and not as
one walk cycle standing in for the other clips.
The generic GAF2D `MotionSetApproval` hash-locks every required clip, frame, order, timing,
playback mode, and review hash in one human action.

The deterministic local compositor consumes:

- one exact approved identity image;
- manually reviewed alpha masks for movable parts;
- explicit draw order and normalized pivots;
- fixed per-frame part-pose transforms, clip timing, and deformation bounds;
- a fixed canvas, sampling mode, color mode, and encoder toolchain.

It emits transparent PNG frames, actual-size previews, and contact sheets for GAF2D ingest.
Automatic segmentation may prepare a candidate mask but can never pass the visual gate by itself.
The compositor cannot approve its own identity, rig, acting, loop, deformation, or release.

Every recipe must lock:

- immutable identity-source hash;
- part names, masks, pivots, and z-order;
- maximum translation, rotation, and non-uniform scale per part;
- silhouette and ground-contact tolerances;
- clip frame count, FPS, playback, and deterministic phase;
- the exact tool versions and command arguments.

## Hero identity and clips

Identity authority is the owner-supplied nine-view APN Hero reference. The operator provides that
file through an explicit local CLI argument; only its SHA-256 enters portable project metadata.
The private path and source bytes never enter this repository.

The accepted Hero has a glossy red spherical head, one integrated matte-black wraparound visor, a
legless red capsule torso, and two short detached capsule arms. It has no hands, feet, shoes, knees,
neck, mouth, facial features, accessories, or platform.

Local extraction must reject gray-background halos and preserve visor geometry, red material
continuity, gloss placement, and the legless silhouette at actual gameplay size.

`apn-hero` keeps the editable-rig lane and requires exact identity, motion, and rig approvals.
Its runtime interface remains:

```text
assets/mascot/v3/{clip}.webp
assets/mascot/v3/{clip}.json
```

| Clip | Frames | Playback |
|---|---:|---|
| `idle` | 8 | loop |
| `run` | 10 | loop |
| `attack` | 8 | progress |
| `crit` | 8 | progress |
| `sprint` | 10 | loop |
| `hit` | 4 | progress |
| `death` | 8 | progress |
| `celebrate` | 8 | loop |

`run` and `sprint` mean forward hover/propulsion. Motion comes from arm swing, head/body
counter-rotation, restrained vertical displacement, anticipation, recovery, and
silhouette-preserving squash—never added legs.

## Creature clips and semantics

Every creature owns:

| Clip | Frames | Playback |
|---|---:|---|
| `idle` | 8 | loop |
| `advance` | 8 | loop |
| `engaged` | 6 | loop |
| `hit` | 4 | progress |
| `death` | 8 | progress |

`site-warden` additionally owns an 8-frame looping `broken` clip.

`engaged` is deliberate: enemies do not execute a domain attack in the current game. It represents
the close-range brace/reaction while the Hero attacks and must not imply enemy damage timing.

Clip precedence is exact:

```text
death > hit > broken > advance > engaged > idle
```

Loops use simulation time plus a stable per-entity phase; progress clips use the existing hit/death
progress clocks. Frame choice never depends on render count or refresh rate.

Acting follows anatomy:

- Entry Runner: fast alternating step and forward torso intent;
- Veil Operator: low hover, shutter counter-rotation, arm balance;
- Signal Hunter: measured step, sensor/orb follow-through;
- Site Sentinel: heavy planted march and shoulder counter-motion;
- Protocol Courier: guarded step with a stable core;
- Site Warden: slow weighted march; asymmetric guarded `broken` breathing.

A stable display base is allowed. Whole-sprite translation, runtime bob, camera motion, or global
squash cannot satisfy authored-motion acceptance.

## Motion bundle v1

Each creature ships:

```text
assets/game-packs/valorant/characters/<asset-id>/motion.webp
assets/game-packs/valorant/characters/<asset-id>/motion.json
```

`gaf2d-motion-bundle-v1` is one character-owned, matrix-packed atlas. It contains:

- grammar, asset ID, image-relative portable path, atlas dimensions, and atlas SHA-256;
- untrimmed frame size, trim union, and one normalized bottom-center pivot;
- named clips with playback, FPS, and ordered frame rectangles;
- current identity and motion approval hashes;
- the current GAF2D motion-set candidate and approval hashes;
- rig approval hash when applicable;
- source manifest hash and exported artifact hash;
- encoder name/version and canonical arguments.

Part-pose transforms vary by frame according to the approved acting recipe.
After compositing those poses on one source canvas, GAF2D applies one global normalization transform
and one bottom-center pivot across the character's entire approved motion set.
All atlas rectangles are integer, positive, non-overlapping, and inside the declared atlas.
Atlas dimensions are at most `2048×2048`; packing uses rows/columns, never one unbounded horizontal
strip.

The game stores runtime derivatives and portable hashes only—no private source, review package,
absolute path, or signed URL.

## Loader and lifecycle

Add a pure validator/frame selector and a browser resource store. The validator has no DOM or
network dependency.

The store:

- fetches and validates JSON before decode;
- verifies the fetched atlas hash before accepting it;
- decodes asynchronously with `createImageBitmap` where available;
- coalesces duplicate requests;
- warms the current and next wave's possible identity set;
- releases cold bitmaps with `ImageBitmap.close()` where supported;
- parses no JSON and allocates no image inside a frame draw.

Boot waits for the current wave's required motion set before simulation begins. While a later wave
is warming, the next spawn—not the whole UI—is held at the between-wave boundary. A normal,
successful load never displays a static cell first.

One failing asset logs one structured, deduplicated diagnostic and draws the legacy `targets.webp`
cell. This is resilience only: canonical wave 1–10 QA fails if a motion fallback is observed.

The existing pack atlas remains available during rollout but never outranks a ready bundle.
The browser never reads a GAF2D project path.

Runtime ownership is exclusive:

- `apn-hero` is loaded only by `hero-v3.js` from `assets/mascot/v3/{clip}.webp|json`;
- the six creature IDs are loaded only by the pack motion store from their character-owned bundle;
- the Hero never resolves through pack metadata;
- a mapped creature never resolves through the legacy global creature loader;
- `targets.webp` is the mapped creature's failure-only fallback, never a competing primary source.

QA rejects duplicate ownership, a missing expected owner, or a ready identity drawn from the wrong
loader path.

## Performance contract

Compressed limits:

- common/event creature bundle: `≤ 160 KB` each;
- Site Warden bundle: `≤ 240 KB`;
- all Hero WebP clips: `≤ 640 KB`;
- all new/replaced first-pack motion WebP + JSON: `≤ 1.8 MB`;
- measured first-playable transfer: `< 5,242,879 bytes`.

Decoded limits:

- each common/event creature atlas: `≤ 6 MiB RGBA`;
- Site Warden atlas: `≤ 8 MiB RGBA`;
- every atlas dimension: `≤ 2048 px`;
- current + next wave creature motion: `≤ 32 MiB RGBA`;
- entire hot Canvas texture set: `< 64 MiB`;
- no more than the current/next wave identity union remains decoded.

The asset manifest must represent files actually fetched before play, not every file under
`assets/`. Reference images, GLBs, inactive legacy creature sets, and cold pack assets cannot be
marked first-playable merely because they ship in the repository. Motion must fit the cap by
replacing obsolete hot art or by loading later; the budget is never raised silently.

## Reduced motion

Reduced-motion mode preserves essential state-readable frame changes at lower intensity:

- authored clips remain active;
- nonessential camera shake, spawn overshoot, idle bob, and whole-sprite amplitude are removed or
  reduced;
- hit/death state remains legible;
- no path freezes to one static cell.

Standard and reduced modes use the same asset lineage and pivot.

## Deterministic build

The builder accepts the GAF2D project root explicitly and:

- validates current source, manifest, approval, and export hashes;
- rejects a single-cycle approval where the APN delivery requires the complete named clip set;
- rejects missing clips, duplicate frames, invalid pivots, stale approval, non-portable paths, and
  unknown tool versions;
- writes to a temporary directory and atomically replaces a complete bundle;
- emits canonical JSON;
- matrix-packs inside the atlas bounds;
- invokes pinned `cwebp` arguments with `-exact`, without stochastic `-pre` and without `-mt`;
- proves same-toolchain reproducibility with two clean builds and equal hashes.

The contract does not claim cross-version or cross-platform encoder byte identity. Reproducibility
is scoped to the recorded toolchain.

## Automated and visual QA

Headless gates:

- descriptor schema, hash, path, bounds, overlap, pivot, and clip validation;
- loop/progress frame selection from timestamp/progress;
- pack role → asset mapping and all wave 1–10 pools;
- exact clip precedence, including `broken`;
- deduplicated fallback and bitmap release;
- Hero's exact eight-clip contract;
- current GAF2D lineage;
- exact required-clip coverage by one current motion-set approval;
- deterministic double build;
- compressed, decoded, hot-texture, and first-playable budgets;
- generated manifest and documentation consistency.

Browser gates use `?chrome-smoke=1` and deterministic `window.advanceTime(ms)`. They capture the same
entity at three fixed simulation timestamps and assert:

- at least two frame indexes and pixel hashes differ;
- an authored body-part pose changes;
- bottom-center pivot drift is at most one pixel;
- the body stays within canvas and atlas bounds;
- no matte halo, clipping, jitter, foot sliding, decode placeholder, or fallback appears.

Run waves 1–10 at `375×812`, `428×926`, and `844×390`, in standard and reduced motion. Console,
overflow, long-run, pacing, and existing visual gates remain mandatory.

## Human gates

Implementation may proceed mechanically, but exact artifacts stop at:

1. legless Hero identity approval;
2. refreshed identity approval if a manifest change stales an existing approval;
3. batch motion approval after contact-sheet and temporal proof review;
4. Hero rig approval after mask, pivot, z-order, and deformation review;
5. release authorization before push, publish, deploy, or shipping.

QA can reject bytes; it cannot record these approvals.

## Documentation and acceptance

Add ADR-0014 and update architecture, art pipeline, asset engine, asset catalog, pack asset bible,
performance budget, QA checklist/report, definition of done, changelog, and both progress logs.
Regenerate catalogs/manifests only through their documented scripts.

Acceptance is complete when:

- Hero matches the exact legless reference at gameplay size;
- all six first-pack creatures show part-level authored motion;
- no accepted character merely slides a static cell;
- all required GAF2D approval, QA, lineage, and export hashes are current;
- normal play shows no fallback or decode placeholder;
- deterministic headless, temporal, responsive, reduced-motion, long-run, and documentation gates
  pass;
- compressed and decoded budgets pass;
- no provider call, external media upload, paid call, 3D pipeline, publish, push, or deploy occurs.

## Research basis

- Canvas sprite rectangles and source/destination drawing:
  <https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage>
- Async bitmap decode and explicit graphics-resource release:
  <https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap>,
  <https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close>
- Canvas size limits, including the `4096×4096` iOS ceiling:
  <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas>
- Timestamp-based animation and background-tab behavior:
  <https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame>
- Named clips and per-frame animation durations:
  <https://docs.godotengine.org/en/latest/classes/class_spriteframes.html>
- Matrix sprite sheets and animation tags:
  <https://www.aseprite.org/docs/sprite-sheet/>, <https://www.aseprite.org/docs/tags/>
- Reduced-motion preference:
  <https://www.w3.org/TR/mediaqueries-5/>
- Recorded WebP encoder options:
  <https://developers.google.com/speed/webp/docs/cwebp>
