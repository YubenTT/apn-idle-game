# ADR-0012 — Procedural Canvas Host V2 is the shipped runtime character

- Status: Accepted
- Date: 2026-07-18

## Context

On 2026-07-18 the owner mandated the V2 Super Polish (`v2/super-polish` branch,
[master spec](../superpowers/specs/2026-07-18-v2-super-polish.md)): the game must
feel alive in the first 3 seconds — a hero with character, visibly animated every
frame — and explicitly authorized root-level changes to prior asset decisions.

The GLB-atlas pipeline ([ADR-0003](./ADR-0003-mascot-single-source.md),
[ADR-0005](./ADR-0005-hybrid-host-render.md),
[ADR-0010](./ADR-0010-extended-full-body-glb.md)) could not deliver that:

- The shipped runtime was a **ten-frame static placeholder atlas** — one frozen
  pose per semantic clip. No run cycle, no anticipation, no blink, no drift. The
  Host read as a cardboard cutout sliding across the stage.
- The only path to real frames (full-body GLB re-render) was blocked: the first
  full-body identity candidate was rejected at the owner identity gate and
  purged before commit (see PR-5 checkpoint, `progress.md`). Every further GLB
  iteration carries the same silhouette-drift risk and render-turnaround cost.

## Options

**A — Procedural Canvas Host (chosen).** Draw the Host in code every frame
(`js/hero-v2.js`): locked silhouette DNA (oversized spherical head ~52% of
height, integrated black visor band, slim torso, short stubby arms, small boots,
minimal oval shadow) with a real animation vocabulary — run cycle, breathe,
blink, visor scan sweep, attack/crit anticipation, damage flinch, sprint lean,
overdrive hover, level/loot/defeat clips. Zero asset downloads, deterministic
from state + time, reduced-motion gated.

**B — Keep iterating on the GLB pipeline.** Rejected: each candidate needs a
four-angle identity proof and owner gate; the rejected candidate showed how
easily proportions drift; and even a good atlas is still a finite frame set —
per-frame procedural motion (lean into sprint speed, soften bounce at low
energy) is not expressible.

**C — Hybrid: procedural now, swap back to GLB later.** Rejected as stated:
two runtime characters is exactly the "family of similar red figures" bug
[ADR-0003](./ADR-0003-mascot-single-source.md) exists to prevent. One runtime
Host, one source.

## Decision

**The procedural Canvas Host (`js/hero-v2.js`) is the single runtime source of
the Host character.** The silhouette DNA is unchanged and remains law
([MASCOT-CANON](../../brand/MASCOT-CANON.md)); `js/host-contract.js` keeps the
semantic clip vocabulary and the 118–142 px presentation gate, now resolved
onto the procedural rig.

The canonical GLB files remain in the repo and in history, untouched; they are
reference geometry, not runtime inputs. The `tools/mascot-render` + GLB export
pipeline is **retired from the runtime path** (kept in git history; no runtime
code loads GLB-derived Host frames). Future pose/animation work is **code in
`hero-v2.js`**, not renders.

## Consequences

**We gain:** a living, per-frame-animated Host with zero download cost;
instant iteration on motion; no identity-gate round-trips; deterministic QA
(the character is a pure function of state + time); reduced-motion behavior
that collapses motion by construction.

**We accept:** the GLB pipeline's investment is shelved (files and tools remain
in history); hand-authored atlas nuance (fabric texture, baked lighting) is
replaced by flat token-faithful fills; and the silhouette is now guarded by
code review + headless tests (`no mask on hero`) instead of render QA. If a
future owner-approved GLB identity ever ships, it must re-prove itself against
the procedural Host's animation bar — that would be a new ADR.

**Test/doc fallout:** headless suites assert the procedural contract; canon
([MASCOT-CANON](../../brand/MASCOT-CANON.md)) gains a dated V2 section stating
the procedural Host is the runtime source; this ADR is indexed in
[decisions/README](./README.md).

## Revisit when

- A real-time 3D Host becomes a product requirement (new ADR), or
- The procedural rig blocks an art direction the owner explicitly wants
  (e.g. detailed costume texture that flat fills cannot carry).
