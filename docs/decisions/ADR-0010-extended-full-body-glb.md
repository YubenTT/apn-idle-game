# ADR-0010 — Extended full-body canonical GLB (supersedes ADR-0003/0005 scope)

- Status: Accepted
- Date: 2026-07-16

## Context

ADR-0003 makes the GLB the single source of truth for the mascot and ADR-0005
locks GLB-derived hybrid Host rendering; `qa/check-assets.mjs` enforces a named
pose set with `meta.source === GLB` and a camera lock. But the AUDIT found the
canonical GLB **has no legs** (7 meshes, zero leg/foot nodes, zero animations),
while the V3 brand-hero Host is **full-body** — so the geometry the gates assume
does not exist, and no PR created it. The V3 turnaround refs are usable for
identity/proportion approval only (near-duplicate front/¾, fused side, static
A-pose, toy-gloss speculars), not as an atlas source. Owner locked **D2′**.

## Options

### Option D2 — generate a new matte atlas from turnaround refs via ChatGPT

Makes AI output the canonical geometry — contradicts ADR-0003/0005 and the V3
standard the plan itself imports ("GLB remains the editable geometry source;
runtime art is a deterministic 2D derivative"). Rejected.

### Option D2′ — extend the canonical GLB to full body, derive poses deterministically (chosen)

Keep GLB-as-source; add the missing legs per the V3 identity; render all poses
through the existing deterministic toon shader. Image-gen stays a reference.

## Decision

Produce an **extended full-body canonical GLB** (same identity + visor + pivot,
with legs added per the V3 turnaround). It becomes the single geometry source.
**ADR-0003 and ADR-0005 remain in force; their *scope* is extended** from the
legless model to this full-body GLB. All Host poses are derived **deterministically**
via `tools/mascot-render` (the 3-band matte toon shader — already the runtime
"matte 2D" target). Image generation is **identity/style reference only, never the
atlas source**. Exactly **one** pose/clip contract is defined code-side (resolving
the four conflicting contracts), and `qa/check-assets.mjs` is rewritten to it in
the same PR.

## Consequences

- PR-5 authors the extended GLB, defines the single pose/clip contract, and
  rewrites `check-assets.mjs` to measure real alpha-derived metrics.
- The **Host identity sheet is an owner gate** (GLB proportions signed off once
  before pose derivation), per plan v2.
- PR-8a builds the real measurement suite; the Host atlas ships as a scaled
  placeholder in PR-5 and is re-atlased in PR-8.

### Implementation checkpoint — 2026-07-18

The first full-body extension candidate was rejected at the required owner gate
and purged before integration. Reusing the legless GLB's arm/neck meshes for
legs/boots produced unacceptable identity and proportion drift. This is a failed
implementation, not an approval of new geometry and not a supersession of this
ADR. The existing GLB plus placeholder atlas therefore remain canonical until a
new neutral four-angle candidate clears the same owner gate.

## Revisit when

The Host identity itself changes, or a rigged/animated pipeline replaces the
deterministic matte render.
