# ADR-0002 — Token-driven design system

- Status: Accepted
- Date: 2026-07-13

## Context

The shipped UI carries color/size decisions as **scattered literals** in
`css/game.css` (`--acc: #fc1243`, local `--rc` rarity vars, ad-hoc sizes). The
redesign research's central visual critique is that the product reads as a
**collage from different asset packs** — because there is no single visual contract.
Its top offender: **red does every job** (primary, Notes, SP, patch tag, active
tab), so red stops signaling anything.

We need a way to "draw any screen together" that guarantees consistency. That
requires one authoritative set of visual values.

## Options

**A — Formalize a token layer (chosen).** One `brand/tokens.css` + prose
`DESIGN-TOKENS.md`, reconciled with existing hexes; wire into CSS incrementally.

**B — Keep literals, fix by hand per screen.** Cheaper now, but drift returns
immediately and "one color one job" can't be enforced.

**C — Adopt the report's brand-new palette wholesale.** Ignores the shipped color
language (blue Signal, gold Rep, green positive) the player already learned.

## Decision

**Option A.** Introduce [`brand/tokens.css`](../../brand/tokens.css) as the single
source of truth for color, type, spacing, radius, elevation, and motion, with
rationale in [DESIGN-TOKENS.md](../../brand/DESIGN-TOKENS.md).

Reconciliation rules:

- **Lock** the shipped hues: crimson `#fc1243` primary, Signal blue `#5eb0ff`, Rep
  gold `#e6b84d`, positive green `#3ecf8e`, rarity ladder as-is.
- **Change exactly two** overloaded jobs off crimson: **Notes → rose `#ff6a8f`**,
  **SP → violet `#b07cff`** — the only value changes, applied per-screen during
  redesign, never as a surprise global flip.
- Enforce **one color, one job**; **no outer glow**; **tabular-nums** on values;
  accessibility floors (44pt touch, 4.5:1 / 3:1 contrast).

Wiring is incremental and reversible: `@import` the token file, then swap literals
for `var(--…)` region by region behind a visual-regression pass. Until wired,
`tokens.css` is a binding reference contract design and code agree on.

## Consequences

**We gain:** enforceable consistency, fast co-design (change a token, whole app
follows), and a real fix for red-noise.

**We accept:** a one-time migration of literals → vars (bounded, staged), and the
discipline cost of "no new value that isn't a token."

## Revisit when

- The token set can't express a legitimately new need (add a token, don't fork), or
- The APN site ships a shared design-token source we should consume upstream.
