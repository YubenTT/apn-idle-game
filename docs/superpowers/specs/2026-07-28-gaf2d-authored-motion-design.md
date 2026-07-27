# GAF2D Authored Motion for APN Idle

Date: 2026-07-28

Status: The architecture was approved by the owner on 2026-07-28.
This written specification is awaiting the owner's review before implementation planning.

## Goal

Replace the first pack's sliding static targets with character-specific authored 2D motion and
replace the current APN Hero runtime art with clips that preserve the owner's exact legless,
floating Hero identity.

The complete path remains deterministic, local, provider-free, 3D-free, hash-locked, and
compatible with the zero-dependency Canvas runtime.

## Why the current result is wrong

ADR-0013 deliberately selected one static GAF2D cell per target and assigned motion to whole-sprite
Canvas transforms.
That decision preserved identity and performance but did not produce walking or character acting.
The renderer changes position, bob, and squash while repeatedly sampling the same source rectangle.

The Hero is a separate mismatch.
The current runtime still loads the pre-existing eight V3 clip atlases.
The GAF2D Hero candidate was never approved or integrated, and its four-view extraction adds legs
that are absent from the owner's supplied identity reference.

## Superseded decisions

This specification supersedes the runtime-motion portions of:

- `docs/superpowers/specs/2026-07-26-gaf2d-valorant-creatures-design.md`;
- `docs/decisions/ADR-0013-gaf2d-static-creature-atlas.md`.

The six creature identities, wave mapping, original-IP restrictions, source hashes, and pack role
names remain valid.
The static runtime atlas and “Hero unchanged” decisions do not.

A new ADR records the replacement.
The historical files remain unchanged apart from an explicit superseded-status link.

## Asset scope

The fixed identity count remains seven:

- `apn-hero`;
- `entry-runner`;
- `veil-operator`;
- `signal-hunter`;
- `site-sentinel`;
- `protocol-courier`;
- `site-warden`.

No skins, recolors, extra creatures, or one-off wave variants are added.
The Site Warden broken state remains part of the same asset.

## Authoring boundary

GAF2D remains the canonical approval, lineage, QA, and export authority.
APN-specific part masks, pivots, pose curves, and clip recipes live in the sibling APN GAF2D
project, not in the generic GAF2D repository or browser code.

The motion authoring tool is a deterministic local compositor.
It consumes:

- one exact approved identity image;
- manually authored alpha masks for movable parts;
- manually authored normalized pivots;
- fixed clip recipes and timing curves;
- a fixed canvas, scale, sampling filter, and encoder configuration.

It produces ordinary transparent PNG frames and review contact sheets.
GAF2D ingests those outputs through its canonical CLI workflow.
The compositor never approves its own identity, masks, pivots, acting, loop, deformation, or
release quality.

This is baked 2D animation, not automatic final-rig authoring and not a 3D pipeline.

## Hero identity lock

The owner's supplied nine-view image is the identity authority.
The accepted Hero has:

- a glossy red spherical head;
- one integrated matte-black wraparound visor;
- a legless red capsule torso;
- two short detached capsule arms;
- no hands, feet, shoes, knees, neck, mouth, facial features, accessories, or platform.

The current legged four-view candidate is rejected and cannot be used as runtime source.

Local matting extracts the approved source views without provider upload.
The review must specifically check gray-background halos, visor geometry, red material continuity,
and the legless silhouette at gameplay size.

`apn-hero` keeps its editable-rig lane.
Its manually authored layer/pivot specification must pass GAF2D rig validation and an explicit rig
approval before runtime export.

The runtime retains the existing eight clip names:

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

“Run” and “sprint” mean forward hover/propulsion.
They do not add legs.
The motion comes from arm swing, head/body counter-rotation, controlled vertical displacement,
anticipation, recovery, and silhouette-preserving squash.

The existing `assets/mascot/v3/{clip}.webp|json` runtime interface remains unchanged.
Only approved source lineage and atlas bytes change.

## Creature motion lock

Every creature receives these five clip families:

| Clip | Frames | Playback |
|---|---:|---|
| `idle` | 8 | loop |
| `advance` | 8 | loop |
| `attack` | 6 | progress |
| `hit` | 4 | progress |
| `death` | 8 | progress |

Site Warden additionally receives an 8-frame looping `broken` clip.

Motion follows anatomy:

- Entry Runner uses a quick alternating step with forward torso intent.
- Veil Operator uses a low hover cycle with counter-rotating shutters and arm balance.
- Signal Hunter uses a measured step with sensor and orb follow-through.
- Site Sentinel uses a heavy planted march with shoulder and arm counter-motion.
- Protocol Courier uses a guarded step that keeps its core stable and readable.
- Site Warden uses a slow weighted march; `broken` has asymmetric guarded breathing without
  changing identity.

The display base may remain visually stable while the body moves above it.
Whole-sprite translation, bob, squash, or runtime x-position changes cannot satisfy authored
motion acceptance by themselves.

## Runtime bundle

Each character ships one WebP atlas and one JSON descriptor under:

```text
assets/game-packs/valorant/characters/<asset-id>/motion.webp
assets/game-packs/valorant/characters/<asset-id>/motion.json
```

The descriptor uses grammar `gaf2d-motion-bundle-v1` and contains:

- fixed frame rectangles;
- clip name, first frame, frame count, FPS, and playback mode;
- untrimmed frame size;
- one bottom-center normalized pivot;
- trim union;
- source asset ID;
- current identity, motion, and rig approval hashes as applicable;
- source manifest hash;
- atlas hash;
- deterministic toolchain facts.

The game repository stores portable mappings and hashes only.
It does not store private source media, local absolute paths, review packages, or signed URLs.

The legacy `targets.webp` remains only as a load-failure fallback during rollout.
It is not sufficient for acceptance and cannot take precedence after an animated character bundle
is ready.

## Runtime modules

Add a pack-owned motion loader with three responsibilities:

1. validate and load `gaf2d-motion-bundle-v1`;
2. select loop or progress frames from existing game state;
3. draw one frame at the current bottom-center pivot.

`render.js` selects clips from existing state:

- normal presence uses `idle` or `advance`;
- attack timing uses `attack`;
- recent damage uses `hit`;
- defeat uses `death`;
- Site Warden below 34% HP uses `broken` when no stronger one-shot is active.

The loader fails soft per asset.
Failure draws the legacy static target and records one diagnostic without breaking combat.
The QA harness treats any fallback during the canonical wave 1–10 run as a failure.

The Hero continues through `hero-v3.js`.
No APN GAF2D project path is fetched by the browser.

## Performance

The runtime remains static-file-only and dependency-free.

The motion bundle budget is:

- at most 160 KB per common/event creature;
- at most 240 KB for Site Warden;
- at most 640 KB for all eight Hero clips;
- at most 1.8 MB total new compressed motion bytes;
- below 5 MB first-playable transfer;
- no more than one decoded current enemy bundle plus one prefetched next-wave bundle;
- no per-frame image allocation or JSON parsing.

The pack loader prefetches the next deterministic wave identity after the current bundle becomes
ready.
It does not load all creature atlases at boot.

Reduced-motion mode keeps authored frame changes but disables nonessential camera and whole-sprite
amplitude.
It does not replace animation with a static cell.

## Deterministic build

The builder:

- accepts the GAF2D project root as an explicit argument;
- validates current manifest and approval hashes before reading frames;
- rejects missing clip ranges, duplicate frames, invalid pivots, non-portable paths, stale
  approvals, and unexpected tool versions;
- writes through a temporary directory and atomically replaces complete outputs;
- produces stable JSON serialization;
- produces identical file hashes across two unchanged builds.

No network, provider, image generation, private-media upload, licensed Spine invocation, publish,
push, or deploy occurs.

## Human gates

Work pauses only for exact GAF2D gates:

1. Hero identity approval of the legless candidate;
2. batch identity refresh if changing motion intent stales the six existing approvals;
3. batch motion approval after inspecting all clip contact sheets;
4. Hero rig approval after inspecting masks, pivots, deformation limits, and gameplay proof;
5. release authorization before any push, publish, deploy, or shipping action.

Mechanical QA may reject an artifact but never records these approvals.

## Automated QA

Headless tests cover:

- descriptor validation and path safety;
- loop and progress frame selection;
- pack-role to asset mapping;
- wave 1–10 clip selection;
- Site Warden broken precedence;
- fallback behavior;
- Hero's exact eight-clip contract;
- current approval and source-hash validation;
- deterministic double build;
- asset and first-playable size budgets;
- documentation and generated manifest consistency.

Temporal browser QA captures the same character at three fixed timestamps.
It fails unless:

- at least two authored frame indexes differ;
- the sampled frame pixel hashes differ;
- the body-part pose changes;
- the pivot remains within one pixel;
- the body stays inside the canvas;
- no matte halo, clipping, jitter, foot sliding, or unexpected fallback is visible.

The real-game matrix covers waves 1–10 at:

- 375 px mobile;
- 428 px mobile;
- 844×390 landscape;
- standard and reduced motion.

The console must remain free of errors.
Long-run, playthrough, pacing, overflow, and existing visual gates remain required.

## Documentation

Add ADR-0014 for authored GAF2D motion.
Update:

- `docs/ARCHITECTURE.md`;
- `docs/ART-PIPELINE.md`;
- `docs/ASSET-ENGINE.md`;
- `docs/ASSETS.md`;
- `docs/GAME-PACK-ASSET-BIBLE.md`;
- `docs/PERF-BUDGET.md`;
- `docs/QA-CHECKLIST.md`;
- `docs/DEFINITION-OF-DONE.md`;
- `CHANGELOG.md`;
- `PROGRESS.md`;
- `qa/QA-REPORT.md`.

Generated asset catalogs and manifests are regenerated with their documented scripts.

## Acceptance criteria

- APN Hero matches the owner's legless source identity at gameplay size.
- Every first-pack creature shows authored part-level motion during gameplay.
- No accepted creature merely slides a static cell.
- All required GAF2D identity, motion, rig, QA, lineage, and export records are current.
- The game loads only portable, hash-verified runtime derivatives.
- Two unchanged builds produce identical descriptor and atlas hashes.
- All headless, temporal, browser, responsive, reduced-motion, long-run, and documentation gates
  pass.
- Runtime budgets pass.
- No provider call, external media upload, paid call, 3D pipeline, publish, push, or deployment
  occurs.
