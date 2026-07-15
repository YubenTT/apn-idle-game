# ADR-0005 — GLB-locked hybrid Host rendering

- Status: Accepted
- Date: 2026-07-15

## Context

The canonical Host GLB preserves identity, but the current derived sprites drift
in camera, gloss, pivot, and perceived head tilt. Pure prompt-based replacement
would fix neither reproducibility nor brand ownership. Pure raw 3D export, without
an art-direction reference, repeatedly reads as a plastic toy rather than the
approved flat APN hero.

## Decision

Keep [ADR-0003](./ADR-0003-mascot-single-source.md) fully binding for geometry.
Use a hybrid production loop:

1. deterministically render the canonical GLB from front, locked ¾, side, and back
   cameras with a shared foot-center pivot;
2. condition image-generation studies on those views to explore pose energy,
   two-tone cleanup, and outline economy;
3. reject any study that changes silhouette DNA, visor bounds, proportions, limb
   thickness, or pivot;
4. reproduce the accepted treatment by re-rendering the GLB and applying
   deterministic 2D composite cleanup;
5. ship only the GLB-derived atlas and its pivot metadata.

AI output is reference evidence, never canonical Host geometry and never a
runtime dependency.

## Consequences

**We gain:** a repeatable character, a stronger 2D read, controlled pose language,
and an objective rejection rule for drift.

**We accept:** multi-view proof sheets, a development-only local renderer, and
silhouette/pivot QA before every Host atlas change.

## Revisit when

- the canonical GLB is intentionally superseded by a new accepted ADR, or
- deterministic GLB renders cannot meet the measured silhouette and runtime size
  budgets without changing geometry.
