# ADR-0003 — GLB is the single source of truth for the mascot

- Status: Accepted
- Date: 2026-07-13

## Context

Across screens the mascot drifts — different head/body ratio, gloss, silhouette,
sometimes more "3D toy," sometimes flatter. The research report calls this **the
most expensive art problem**, because it doesn't just look off — it **destroys brand
recognition**: the player starts perceiving a *family of similar red figures*
instead of one Host.

The repo already contains authoritative 3D sources:
`assets/apn-mascot-glb-host.glb` and `assets/apn-mascot-glb-analyst.glb`, plus
several derived 2D sprites that currently disagree with each other.

## Options

**A — GLB as single source; all 2D derived under a fixed render-lock (chosen).**

**B — Pick one 2D sprite as canonical.** Simpler, but no reproducible way to make
new poses/variants without re-drifting.

**C — Continue per-screen art.** Status quo = the bug.

## Decision

**Option A.** The **GLB is canonical**. All in-game mascot art is derived from it
under a fixed render-lock (orthographic camera, foot-center pivot, single key light,
2-tone shader, 2px ink outline, grounded oval shadow), documented in
[MASCOT-CANON](../../brand/MASCOT-CANON.md). Role variants change only a small
accent/prop — never proportions. A "fitter" look is achieved by camera + cleanup,
**not** by new meshes or AI re-interpretations (a [VISION](../VISION.md) non-goal).

If a 2D sprite conflicts with the GLB silhouette, the GLB wins and the sprite is
re-exported. Every mascot appearance passes **Silhouette QA**
([QA-CHECKLIST](../QA-CHECKLIST.md)).

## Consequences

**We gain:** one recognizable hero, reproducible variants/animations, and a QA
criterion that's objective (same geometry, or it fails).

**We accept:** a Blender-based export step for new mascot art
([ART-PIPELINE](../ART-PIPELINE.md)); interim hand-exports must still obey the
render-lock, which is slower than freehand.

## Revisit when

- The Host is intentionally redesigned (a new canonical GLB supersedes this, via a
  new ADR), or
- A rendering-tier change (e.g. a real-time GLB overlay) makes sprites secondary.
