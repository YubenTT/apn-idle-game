# Mascot canon — APN Hero

> **Single source of truth for the player character.**
> The runtime ownership decision is
> [ADR-0015](../docs/decisions/ADR-0015-legless-hero-runtime-authority.md).

## Authority

The character is one identity across every screen:

1. the owner-approved GAF2D `apn-hero` identity record owns anatomy and proportions;
2. one complete, owner-approved GAF2D motion set owns acting and timing;
3. hash-locked files in `assets/mascot/v3/` are the only approved raster body at runtime;
4. `hero-v3.js` loads and blits those files, while `hero-v2.js` supplies presentation effects;
5. load failure may draw only the explicit identity-safe Canvas silhouette.

The current `assets/mascot/v3/` bytes are historical runtime art.
They keep the game playable, but they do not prove that the owner-requested replacement identity
or motion has passed its exact approval gates.

## Anatomy lock

- One oversized crimson spherical head.
- One integrated black wraparound visor.
- One floating crimson capsule torso.
- Two short capsule arms, visually separate from the torso.
- **No legs, feet, boots, or platform.**
- A small oval shadow may show the hover/ground relationship but is not part of the body.
- The runtime anchor is bottom-center at the torso/hover baseline; the name `footY` in legacy code
  is coordinate debt, not permission to invent feet.

The owner reference controls the silhouette.
Rendering may simplify surface detail for gameplay size, but may not add anatomy, split the visor,
change the head/body relationship, or turn the body into a biped.

## Visual finish

- Read as clear 2D editorial game art at runtime, not a glossy plastic toy.
- Keep the APN crimson body and a single near-black visor.
- Use one controlled highlight, crisp edges, and a quiet 18–22% oval shadow.
- Keep the same view, light direction, scale, outline language, and bottom-center pivot across the
  complete clip set.
- Prove the silhouette at actual gameplay sizes before producing the full motion batch.

## Runtime clip contract

The stable runtime interface is eight paired files:

| Clip | Purpose |
|---|---|
| `idle` | planted hover/breathe |
| `run` | default travel |
| `attack` | normal strike |
| `crit` | critical strike |
| `sprint` | sprint/overdrive travel |
| `hit` | damage reaction |
| `death` | defeat progression |
| `celebrate` | level/loot celebration |

Each clip has `assets/mascot/v3/<clip>.webp` and `<clip>.json`.
All clips must share the approved identity, canvas convention, anchor, and motion authority.
Replacing only part of the set is forbidden; release swaps all eight clips as one hash-locked
generation.

Reduced motion removes secondary camera, trail, squash, flash, and hover intensity.
It does not substitute a different body or bypass approved authored frames.

## Approval order

1. Register the owner reference in GAF2D without uploading it to a provider.
2. Prepare front/three-quarter/side/back comparison evidence and one isolated,
   legless, platform-free three-quarter motion seed.
3. Inspect the seed at gameplay size and obtain the exact human identity
   approval over those candidate bytes.
4. Prepare one complete eight-clip motion set and inspect every temporal proof.
5. Obtain the exact human motion approval and rig approval only if the selected lane needs it.
6. Run complete GAF2D QA, deterministic export, APN bundle validation, three-viewport browser QA,
   and the release gate.

Mechanical QA cannot approve identity, acting, deformation, timing feel, or release.

## Historical boundary

The old GLBs, procedural V2 body, segmented rig, and their renderer tools are provenance and
maintenance references only.
They are not current identity authority and cannot be used to reconstruct or silently replace the
APN Hero.
No new mesh, 3D runtime, biped fallback, or automatic final rig authoring is part of this pipeline.

## Permanent QA rule

Every APN Hero appearance must match the same approved silhouette and perspective.
Any leg, foot, boot, platform, alternate visor, mixed clip generation, stale approval hash, or
runtime fallback to a second character is a release blocker.
