# Architecture Decision Records

> One file per significant, hard-to-reverse decision: context, options weighed, the
> call, the downsides we accept, and when to revisit. Write the ADR **before** the
> change it justifies. Format is lightweight on purpose.

## Index

| ADR | Decision | Status |
|-----|----------|--------|
| [0001](./ADR-0001-vanilla-stack.md) | Keep vanilla ES + Canvas 2D; do **not** migrate to PixiJS/React | Accepted |
| [0002](./ADR-0002-design-tokens.md) | Adopt a token-driven design system (`brand/tokens.css`) | Accepted |
| [0003](./ADR-0003-mascot-single-source.md) | GLB is the single source of truth for the mascot | Accepted |
| [0004](./ADR-0004-game-pack-route.md) | Catalog-driven 10-zone Game Packs + bounded Corruption epochs | Accepted |
| [0005](./ADR-0005-hybrid-host-render.md) | GLB-locked hybrid Host rendering | Accepted |
| [0006](./ADR-0006-persistent-route-save-v2.md) | Persist global Route in dual-key save schema v2 | Accepted |

## When to write one

- Changing the **stack** (framework, renderer, build).
- Changing the **save format** / persistence model.
- Adding or removing a **design pillar** or a **non-goal**.
- Any call future-you will ask "why did we do it this way?" about.

## Template

```md
# ADR-XXXX — <title>

- Status: Proposed | Accepted | Superseded by ADR-YYYY
- Date: <yyyy-mm-dd>

## Context
What's true / what forced the decision.

## Options
The real alternatives, honestly.

## Decision
What we chose.

## Consequences
What we gain, what we give up (name the downsides).

## Revisit when
The signal that would reopen this.
```
