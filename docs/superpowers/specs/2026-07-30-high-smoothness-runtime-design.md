# APN Idle High-Smoothness Motion Runtime Design

**Date:** 2026-07-30

## Problem

The current local authored preview is temporally correct but visibly stepped.
Creature clips contain 8–16 distinct poses per second and Hero clips contain
12–20.
The game uses elapsed time and refresh-independent frame selection correctly,
but each repaint can draw only one of those existing raster poses.

The current creature bundle places all five or six clips in one decoded atlas.
Tripling the frames inside that one image would exceed the existing 2048 px and
6/8 MiB decoded-texture limits.

## Decision

Regenerate the exact approved APN Hero and six-creature identities from their
deterministic layered-part authoring source at 30–32 authored FPS.
Do not crossfade body frames, run optical flow, add runtime body tweening, or
change per-frame grounding.

The frame contract is the exact table in the companion GAF2D V3 design.
The generated set contains 795 frames:

- Hero: 123;
- five regular creatures: 107 each;
- Site Warden: 137.

The generator samples semantic key poses in normalized clip time and renders
genuine intermediate part transforms.
Existing neutral, anticipation, maximum-excursion/contact, recovery/return, and
terminal poses remain authoritative.
Terminal duplicates are emitted only inside declared terminal holds.
Loop clips use periodic `[0, 1)` sampling: the final authored frame is the
last pre-wrap pose, never a duplicate of frame zero. Canonical GAF raster
evidence must report `loop_velocity_discontinuity <= 0.25`.

## Runtime Delivery

Add a versioned per-clip motion-set index.
The index hash-binds one descriptor and one WebP atlas per clip.
The current single-atlas V1 bundle remains readable for existing production
content.

Each clip atlas must independently satisfy:

- maximum dimension 2048;
- decoded RGBA limit 6 MiB for common characters or 8 MiB for the trusted boss;
- compressed-byte budget from `docs/PERF-BUDGET.md`;
- current V3 source canvas exactly 128×128; historical V2 remains 640×640;
- runtime derivatives may preserve or downscale V3 but never upscale it;
- one shared source canvas, union trim, pivot, and presentation transform for
  the complete character set.

The complete new/replaced first-pack motion set has one aggregate compressed
cap of `3.5 MiB` (`3,670,016` bytes). The canonical 7-asset, 39-clip,
795-frame V3 build measured `3,006,743` bytes on 2026-08-09, leaving `22.1%`
headroom. This aggregate decision does not change the per-clip, decoded
residency, or hot-texture limits above.

Only requested clips are fetched and decoded.
The cache owns explicit close/release semantics.
One decoded sibling clip per asset is not a valid cache invariant: a real frame
can contain a dying body on `death` and a fresh same-asset spawn on `advance`
at the same time.
Residency must therefore be decided after the frame's clip selection is known:
keep every selected sibling clip for that render, then release unselected
siblings without changing the emitted package path
`assets/game-packs/<pack-id>/characters/<asset-id>/`.
Current and next wave hot motion remains below 32 MiB decoded RGBA and the full
GPU/canvas hot texture set remains below 64 MiB.

## Playback

`requestAnimationFrame` timestamps and the fixed-step simulation remain separate.

- World/root position is interpolated for every display repaint.
- Loop clips select `floor(elapsed * fps) % frameCount`.
- Progress clips select a clamped frame from authoritative normalized event
  progress and hold the terminal frame.
- Repaint count never advances animation.
- 60, 90, 120, and 144 Hz schedules choose the same authored frame at the same
  elapsed time.
- Hidden-tab resume follows the existing deterministic simulation policy.
- Spatial `imageSmoothingEnabled` remains enabled for scale filtering only.
- Body pixels are never alpha-crossfaded.

Stage presentation remains unchanged:
one neutral-body role scale, one shared motion-envelope fit, one bottom-center
pivot translation, and no frame-specific grounding or resizing.

## Loading and Failure

The motion-set index is fetched first.
The loader validates exact keys, byte limits, hashes, clip vocabulary, V3
authority, atlas geometry, and presentation lineage before exposing a clip.

For a current approved production mapping, a missing or invalid required clip
fails closed rather than silently selecting a static identity.
Unapproved preview bytes remain available only on loopback with
`motion-preview=1`.

No runtime network provider call is introduced.
Static-file fetches use the same-origin game asset path.

## QA and Human Review

Automated evidence includes:

- old versus new real-time playback;
- frame-step and temporal metrics for all 39 clips;
- 64, 80, and 128 px light/dark witnesses;
- 60/90/120/144 Hz schedule invariance;
- loop seam and terminal-hold checks;
- exact stage geometry at 375×812, 390×844, 428×926, and 844×390;
- Wave 1 through Wave 10, boss broken state, Hero attack/hit/death/celebrate;
- network request, decoded-memory, compressed-byte, JS heap, frame-time, and
  console-error evidence;
- deterministic double build and exact file hashes.

The human receives a localhost animated comparison and the real gameplay
preview.
Because the frame set and timing change, a fresh motion approval is required
before production promotion.
Mechanical QA cannot create that approval.

## Release Chain

After human motion approval:

1. write the bound GAF2D V3 approvals;
2. pack and run complete QA;
3. export twice and compare deterministic hashes;
4. promote approved bytes from the ignored preview boundary into production
   game assets and regenerate manifests/catalogs;
5. push one APN Idle Game PR that supersedes open PR #40;
6. close PR #40 as superseded, merge the new PR to `main`, and verify CI;
7. copy the production static game into `apn-web/public/idle/`;
8. open and merge the APN Web PR;
9. deploy APN Web to Cloudflare production;
10. verify the live route, save migration, gameplay, animation, asset caching,
    console, and performance budgets.

No task-owned PR, unmerged commit, or undeployed release is left open.
Unrelated repository issues are not closed merely to make a dashboard empty.

## Acceptance Criteria

- Every APN body clip exposes at least 30 authored pose slots per second.
- The identity, visor, limbs, alpha edges, joint seams, scale, pivot, and stage
  placement remain stable.
- Gameplay event timing and high-refresh playback remain deterministic.
- Per-clip lazy delivery stays within compressed, decoded, heap, texture, and
  cold-start budgets.
- Full headless and browser QA passes and the human approves the animated
  review.
- GAF2D, APN Idle Game, and APN Web changes are merged to their remote `main`
  branches and the production route is health-checked after deployment.
