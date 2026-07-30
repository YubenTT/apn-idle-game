# ADR-0017 — Visible-body stage presentation ownership

- Status: Accepted
- Date: 2026-07-30
- Extends: ADR-0014, ADR-0015, and ADR-0016

## Context

Approved GAF2D motion sets preserve a source canvas, bottom-center pivot,
shared trim, clip timing, and transparent space needed by the acting.
The historical renderer sized actors from trimmed atlas-cell height.
That accidental contract made transparent padding look like body size, weakened
the intended Hero/creature hierarchy, and left labels and effects anchored to
guessed squares.

The asset bytes and pivots are not defective.
APN needs an explicit boundary between intrinsic asset geometry and game-owned
stage presentation.

## Options

**A — Crop, resize, or repivot the approved assets.**
This mutates intrinsic truth, invalidates hashes and approvals, and still makes
future staging depend on crop shape.

**B — Scan alpha and ground every current frame.**
This erases authored hops, recoil, compression, and collapse while introducing
raster-dependent jitter.

**C — Scale neutral visible bounds by role and preserve one transform (chosen).**
GAF2D supplies hash-bound intrinsic geometry; APN resolves game role scale and
all actor-relative presentation from it.

## Decision

GAF2D owns source canvas, pivot, shared trim, optional body mask, clip timing,
lineage, and one shared transform across an authored frame set.
APN owns role assignment, neutral visible-body height, visual gap, responsive
fit, renderer-owned shadow, and actor-relative overlays.

`STAGE_ROLE_PRESENTATION` is the exact role authority at `fit = 1`:

| Role | Neutral visible body | Visual gap |
|------|---------------------:|-----------:|
| `hero` | 96 px | 6 px |
| `standard` | 72 px | 2 px |
| `elite` | 84 px | 2 px |
| `boss` | 112 px | 2 px |

Each authored character carries one game-integration presentation record bound
to an explicit neutral reference frame and exact source lineage.
Its neutral visible bounds choose scale.
Its body-only union motion envelope protects HP plates, priority brackets,
floaters, and viewport clearance without changing scale.
The game applies the resulting scale and pivot translation to every clip and
frame; per-frame alpha grounding is prohibited.

The importer fails closed on missing, malformed, stale, zero-area, or
out-of-trim geometry and when the motion envelope does not contain the neutral
bounds.
Historical assets remain behind an explicit compatibility adapter.
Mechanical checks may reject geometry, but identity, motion, rig quality when
applicable, and release remain human approvals.

This decision adds no APN role to GAF2D core and makes no GAF2D
schema-version-1 change.

## Consequences

Character scale now reflects visible identity rather than transparent canvas.
Authored acting keeps its vertical and lateral excursions, while every overlay
and shadow shares one resolved actor geometry.
New integrations require hash-bound neutral and motion bounds plus actual-size
and overlay evidence.

The game carries a small presentation record and explicit legacy adapter.
Malformed authored metadata loses that motion record rather than being guessed
into readiness.

## Revisit when

- A renderer replaces Canvas 2D while preserving the same intrinsic/game
  ownership boundary.
- A reviewed cross-engine need justifies a new GAF2D schema rather than a
  game-owned integration record.
- APN changes the named role ladder through a new visual decision and matching
  runtime contract.
