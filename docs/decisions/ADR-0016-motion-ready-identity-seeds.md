# ADR-0016 — Motion-ready identity seeds are single-subject and platform-free

- Status: Accepted
- Date: 2026-07-28
- Extends: GAF2D framework ADR-011, plus APN ADR-0014 and ADR-0015

## Context

The first APN creature identity prompts deliberately added a circular display
base and underglow to four-view collectible sheets. Those sheets were useful for
identity comparison but were then treated as candidate motion sources. The base
was baked into the pixels, the four camera views reduced useful subject
resolution, and image-conditioned animation had no single coherent subject to
move. Runtime translation could move the sheet, but could not create real walk
acting.

## Options

**A — Mask the base after motion generation.** This is brittle because the base
occludes feet, can change shape between frames, and produces unstable mattes.

**B — Keep the base and hide it with the game background.** The base still moves
with the body, pollutes pivots and bounds, and fails on other backgrounds.

**C — Separate comparison evidence from the approved motion seed (chosen).**
Turnarounds remain references; one isolated, platform-free pose becomes the
hash-locked identity and image-conditioned motion source.

## Decision

For APN Hero and every first-pack creature:

- turnarounds, multi-view sheets, checkerboards, labels, and actual-size boards
  are review evidence only;
- the motion-ready identity candidate contains exactly one full subject in the
  intended gameplay camera and a neutral starting pose;
- no display base, stand, pedestal, plinth, floor, horizon, cast shadow,
  reflection, underglow, or review marker may be baked into candidate or motion
  frame pixels;
- any gameplay ground/hover shadow is a separate renderer-owned presentation
  effect and never participates in identity hashes, atlas bounds, or pivots;
- the exact candidate bytes must receive the current human identity approval and
  must be the first image-conditioned live motion source;
- motion review covers the complete character-owned clip set. World
  translation, camera movement, whole-sprite bob, or a moving static pose does
  not satisfy authored locomotion.

Mechanical QA must reject empty/edge-touching seeds, multiple major subjects,
wide baseline components consistent with a platform, and excessive chroma
fringe. Mechanical checks may reject but cannot approve identity, acting, or
release.

## Consequences

The provider starts from one coherent subject at higher useful resolution.
Feet/hover baselines and shared pivots remain character-owned, while ground
presentation remains scene-owned. The runtime no longer needs to repair a
baked stand or guess which cell of a turnaround should move.

Existing historical sheets remain valid provenance and comparison references,
but they cannot be promoted to motion seeds.

## Revisit when

- APN deliberately adopts a character whose permanent identity includes a
  vehicle or platform; that asset requires a new explicit identity decision.
- A non-image-conditioned authoring path replaces the seed while preserving the
  same identity, motion, and release gates.
