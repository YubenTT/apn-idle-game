# ADR-0015 — Legless Hero clip authority and safe fallback

- Status: Accepted
- Date: 2026-07-28
- Supersedes: ADR-0003, ADR-0005, ADR-0010, and ADR-0012

## Context

ADR-0003 and ADR-0005 made a GLB the geometry/render authority; ADR-0010 then
extended that direction into an unapproved full-body biped. ADR-0012 made the
procedural V2 Host the sole runtime body and described small boots. Later code
made the eight-file `hero-v3.js` clip player primary while retaining a segmented
V2 rig fallback. Those statements and paths disagreed, and every old direction
could reintroduce legs that do not exist in the owner's nine-view APN Hero
reference.

The filename `v3` is a stable runtime interface, not permission to reuse old
geometry or bypass a new identity approval. Current historical V3 bytes also do
not prove that the owner-requested replacement has been delivered.

## Decision

`hero-v3.js` exclusively owns approved Hero raster clips at
`assets/mascot/v3/{clip}.webp|json`. `hero-v2.js` remains the Canvas
presentation/orchestration entry point for juice and semantic state, but it is
not a second character source.

If the approved clip set is unavailable, the only body fallback is a small,
explicitly legless Canvas silhouette: crimson sphere, integrated black visor,
floating capsule torso, and two short capsule arms. The historical segmented
V2 rig is never loaded or drawn. Ground position is a bottom-center pivot; it
does not imply feet.

Replacing the historical V3 bytes requires the exact owner-reference identity
approval, one complete Hero motion-set approval, the editable-rig gate when
that lane is used, complete mechanical QA, and release authorization. Runtime
readiness and fallback correctness cannot approve those bytes.

## Consequences

There is one approved-art owner, one identity-safe failure body, and no biped
fallback. Cache generations can replace all eight clips atomically without
changing the public filenames.

Until the creative gates pass, production must be described honestly as using
the historical clip set. The repository may prove the replacement runtime and
candidate path offline, but it may not claim that the final Hero identity or
acting is shipped.

## Revisit when

- The owner approves a different Hero anatomy through a new ADR and identity
  gate.
- The eight-clip interface changes.
- Canvas 2D is replaced while preserving the same approval and hash authority.
