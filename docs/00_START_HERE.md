<!-- go-live-v2-superseded -->
> **⚠ Superseded (go-live v2).** This entry point predates the go-live v2 chain. **Start instead at** `docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-v2.md` (the law) and `docs/product/` (imported V3 authority, see `RECONCILIATION.md`). The **Ship Notes + End Season** model here is replaced by **Go Live** ([ADR-0008](decisions/ADR-0008-go-live-sole-checkpoint.md)).

# START HERE — APN Idle docs index

> One-screen map of every document, who owns it, and which doc is the **source of
> truth** for a given decision. Read this before touching design, art, or code.

## What APN Idle is (one line)

The **All Patch Notes** waiting-room idle game: clear feed noise, grab **Notes**,
**Ship** them for permanent **Rep**, stack **Live Mult** — while learning the site's
language. Original APN IP, Host mascot, crimson APN UI.

## Active phase

**Phase: Visual Fidelity V4 approved production integration.** V3 remains the
exact semantic acting/timing/root authority. The owner approved all seven V4
motion sets; six baked creature sets passed complete QA, exported through
hash-locked releases, and now back the production Valorant pack. APN Hero motion
is approved but remains outside production at its separate rig-approval gate.
The exact 7-asset / 39-clip / 795-frame review, same-scale V3↔V4 proof, and
post-approval three-viewport production Chrome evidence are green.

## The stack, in one sentence

Zero-npm **vanilla ES modules + Canvas 2D**, static-file playable, `localStorage`
save, headless Node domain tests. We deliberately **do not** use React/Vue/Pixi for
the playable core — see [ADR-0001](./decisions/ADR-0001-vanilla-stack.md).

## Source-of-truth map

When two docs disagree, the **owner** below wins for that topic. Everything else
must be updated to match, not argued with.

| Topic | Source of truth | Owner |
|-------|-----------------|-------|
| Why the game exists / fantasy | [CONCEPT.md](./CONCEPT.md), [GAME-DESIGN.md](./GAME-DESIGN.md) | Design |
| Design pillars & non-goals (the decision filter) | [VISION.md](./VISION.md) | Design |
| Core loop & systems | [GAME-DESIGN.md](./GAME-DESIGN.md) | Design |
| Long-form Game Pack route / Corruption proposal | [GAME-PACK-ROUTE.md](./GAME-PACK-ROUTE.md) | Design + Art + Eng |
| Game Pack asset inventory / official source boards | [GAME-PACK-ASSET-BIBLE.md](./GAME-PACK-ASSET-BIBLE.md) | Art + Design |
| Balance curves & costs | [BALANCE.md](./BALANCE.md) + `js/formulas.js` (`C`) | Design + Eng |
| Code architecture & module contracts | [ARCHITECTURE.md](./ARCHITECTURE.md) | Eng |
| Visual tokens (color, type, spacing, motion) | [../brand/DESIGN-TOKENS.md](../brand/DESIGN-TOKENS.md) + [../brand/tokens.css](../brand/tokens.css) | Design |
| Component specs (sizes, states) | [../brand/COMPONENTS.md](../brand/COMPONENTS.md) | Design |
| Mascot geometry, poses, variants | [../brand/MASCOT-CANON.md](../brand/MASCOT-CANON.md) | Art |
| 2D art grammar, icons, enemies, backgrounds | [../brand/ART-DIRECTION.md](../brand/ART-DIRECTION.md) | Art |
| Character identity/motion runtime contract | [authored-motion design](./superpowers/specs/2026-07-28-gaf2d-authored-motion-design.md) + [ADR-0014](./decisions/ADR-0014-gaf2d-character-owned-motion.md) + [ADR-0015](./decisions/ADR-0015-legless-hero-runtime-authority.md) + [ADR-0016](./decisions/ADR-0016-motion-ready-identity-seeds.md) | Art + Eng + QA |
| Player-facing copy & naming | [../brand/NAMING.md](../brand/NAMING.md) | Design |
| Term glossary (Signal/Notes/Rep… + code names) | [GLOSSARY.md](./GLOSSARY.md) | All |
| Per-screen mobile layout | [SCREEN-SPECS.md](./SCREEN-SPECS.md) | Design |
| Asset export / atlas / WebP pipeline | [ART-PIPELINE.md](./ART-PIPELINE.md) | Art + Eng |
| Performance budgets | [PERF-BUDGET.md](./PERF-BUDGET.md) | Eng |
| "Is it done?" gate | [DEFINITION-OF-DONE.md](./DEFINITION-OF-DONE.md) | All |
| QA acceptance gates | [QA-CHECKLIST.md](./QA-CHECKLIST.md) | QA |
| Which doc to update on which change | [DOC-UPDATE-POLICY.md](./DOC-UPDATE-POLICY.md) | All |
| Architectural decisions (why we chose X) | [decisions/](./decisions/) (ADRs) | All |
| Monetization posture | [MONETIZATION.md](./MONETIZATION.md) | Design |
| Redesign execution plan (issues) | [REDESIGN-PLAN.md](./REDESIGN-PLAN.md) | Producer |
| Approved end-to-end execution sequence | [2026-07-15 complete redesign plan](./superpowers/plans/2026-07-15-apn-idle-complete-redesign.md) | Producer + Eng + Art + QA |
| Roadmap | [ROADMAP.md](./ROADMAP.md) | Producer |
| Site embed | [EMBED.md](./EMBED.md) | Eng |
| Agent working rules | [../AGENTS.md](../AGENTS.md) | All |

## Reading order for a new contributor

1. This file → [VISION.md](./VISION.md) (pillars + non-goals = the filter)
2. [CONCEPT.md](./CONCEPT.md) + [GAME-DESIGN.md](./GAME-DESIGN.md) (what the game is)
3. [../brand/DESIGN-TOKENS.md](../brand/DESIGN-TOKENS.md) (how it looks)
4. [SCREEN-SPECS.md](./SCREEN-SPECS.md) (what each screen must do)
5. [ARCHITECTURE.md](./ARCHITECTURE.md) (how the code is shaped)
6. [authored-motion design](./superpowers/specs/2026-07-28-gaf2d-authored-motion-design.md)
   when touching any Hero, creature, atlas, animation, or loader path
7. [decisions/](./decisions/) (why the big calls were made)

## Doc conventions

- **Concise over complete.** Tables and bullets, not essays. If a doc grows past
  ~2 screens, split it and link.
- **One source of truth per fact.** Numbers that belong in `C` (formulas) or
  `tokens.css` are *referenced*, not re-typed, in prose docs.
- **Stale = wrong.** A doc that no longer matches the build is a bug. Fix it in the
  same PR that changed behavior — see [DOC-UPDATE-POLICY.md](./DOC-UPDATE-POLICY.md).
- **ADR before rewrite.** Any change to stack, save format, or a design pillar gets
  an ADR *first*.

## What is NOT here (deliberately)

Full 30-document AAA production framework (separate GDD/TDD/Narrative Bibles, etc.).
This is a small, static, single-surface web game — that scale of process would be
bureaucracy, not safety. We keep the *spirit* of that framework (why → who →
experience → is-it-fun → how → verify) folded into the lean set above. See
[VISION.md](./VISION.md) § "Process scope".
