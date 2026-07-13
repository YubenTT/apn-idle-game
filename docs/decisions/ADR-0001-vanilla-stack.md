# ADR-0001 — Keep vanilla ES + Canvas 2D; do not migrate to PixiJS/React

- Status: Accepted
- Date: 2026-07-13

## Context

A detailed mobile-redesign research report proposed rebuilding APN Idle on
**PixiJS 8 + React/Next.js + Zustand + Web Worker + a Blender headless sprite
pipeline**, estimating ~460–520 hours of work.

Two facts frame the decision:

1. The report **explicitly states it did not inspect this repository** ("kod satırı
   düzeyinde repo denetimi yapmadım… önerilen üretim yapısıdır, mevcut repo ağacının
   birebir tespiti değildir"). Its file paths and stack are a *proposed* production
   shape, not an audit of what exists.
2. This repo is a **working, tested, polished** zero-npm **vanilla ES modules +
   Canvas 2D** game. [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) already lists
   "Heavy frameworks (React/Vue) for the playable core" as a **v1 non-goal** — a
   deliberate prior decision, not an oversight.

The user's directive was explicit: *set up the system properly, respecting what has
already been done right, without sprawl* ("dallanıp budaklanmadan, şu ana kadar
doğru yapılanlara saygı"). Stated goal: **max user satisfaction and the freedom to
design/redraw any screen together, whenever we want.**

## Options

**A — Keep vanilla ES + Canvas 2D (chosen).** Fold the report's (excellent,
stack-agnostic) design thinking — tokens, mascot canon, screen specs, art grammar,
production docs — into the existing architecture.

**B — Migrate to PixiJS 8 + React/Next.js.** Adopt the report's stack wholesale.

**C — Hybrid: React HUD over a Pixi/Canvas stage.** Partial migration of the UI
layer only.

## Decision

**Option A.** We keep the vanilla, zero-npm, static-file stack. The redesign is a
**design-system + documentation** effort layered on the current engine, not a
rewrite.

Rationale against the migration:

- **Design freedom is a *system* property, not a *framework* property.** What lets
  us redraw any screen together in minutes is a locked design system (tokens,
  component specs, screen contracts) — not the renderer. Pixi/React deliver nothing
  toward "draw whatever we want, whenever, together"; the design system does.
- **Zero-npm is the fastest iteration loop that exists:** edit CSS/JS, refresh.
  Adding React/Next/Pixi adds a build step, framework ceremony, and bundle weight —
  making casual co-design *harder*, the opposite of the goal.
- **It respects prior correct work.** A migration discards a working, headless-
  tested, brand-consistent game and re-litigates a decision already recorded in
  ARCHITECTURE.md. That is exactly the "sprawl" the user asked us to avoid.
- **The report's own priority is "system first, then polish."** Even the report
  says lock tokens / nav / sheet patterns / mascot pipeline / item grammar first —
  none of which require a new stack.
- **Risk/return is poor.** ~460–520h of rewrite risk to reach quality we can reach
  by fixing UI within the current engine at a fraction of the cost.

## Consequences

**We gain:** continuity, zero-friction iteration, site-embeddable static output, all
existing tests/CI intact, and full budget pointed at design quality.

**We accept (downsides):**
- No engine-provided scene graph / particle system — we hand-roll in `render.js`
  (already the case; max-1-enemy design keeps it cheap).
- No React component ecosystem for sheets — we keep DOM + `ui.js` discipline via
  [COMPONENTS](../../brand/COMPONENTS.md).
- If the game later needs thousands of on-screen entities or heavy 3D, this ADR
  must be revisited.

**Kept explicitly:** the good ideas from the report are adopted regardless of stack
— see [DESIGN-TOKENS](../../brand/DESIGN-TOKENS.md), [MASCOT-CANON](../../brand/MASCOT-CANON.md),
[SCREEN-SPECS](../SCREEN-SPECS.md), [ART-DIRECTION](../../brand/ART-DIRECTION.md),
[ART-PIPELINE](../ART-PIPELINE.md).

## Revisit when

- On-screen entity counts or 3D needs exceed what Canvas 2D holds at 60 fps on the
  device matrix, **or**
- APN Idle graduates into a standalone app (not a site-embedded waiting-room game)
  where a heavier toolchain pays for itself.

Until such a signal, migration proposals are out of scope by decision, not by
oversight.
