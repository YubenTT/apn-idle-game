# ADR-0011 — Transitional rights: `pending-review` warns, never blocks (wave packs)

- Status: Accepted
- Date: 2026-07-16

## Context

Making rights an enforceable hard gate (ADR-0009) collides with launch reality: a
strict "catalog build fails if rights missing/blocked" gate, applied to 20+ packs
that currently have trademark titles and no reconciled rights data, would either
**block the entire launch catalog** or force shipping unreviewed marks. The three
production launch packs get full rights treatment at PR-8; the other 18 wave packs
need a path to ship-then-reconcile without bricking CI.

## Options

### Option A — hard gate everything immediately

Any pack without a resolved rights mode fails the build. Bricks the launch catalog
on day one; not shippable.

### Option B — transitional `pending-review` mode (chosen)

A distinct mode the validator **warns** on for wave packs while they are being
reconciled, and **blocks** on for launch/shipping packs.

## Decision

Add the transitional rights mode **`pending-review`** to the canonical taxonomy.
The PR-7 validator treats it as:

- **Wave (non-launch) packs:** `pending-review` → **WARN** (build continues).
- **Launch / shipping packs:** `pending-review` → **BLOCK** (must resolve to a
  real mode: `apn-original` / `homage-only` / `editorial-text-original-art` /
  `licensed-spotlight`, or be `blocked`).

The AUDIT's `blocked-until-review` status (present in no enum) maps to
`pending-review`. INFINITE-PACK production gates apply to new packs and re-arted
packs until the waves land.

## Consequences

- PR-7 implements the warn-vs-block split by pack class and enforces it in CI;
  pack #21 (Dreamline Detour, `apn-original`) must pass.
- The three launch packs (Spike Protocol, Ultimate Touchline, Dreamline Detour)
  are fully resolved at PR-8b/c/d — none may ship `pending-review`.
- A wave pack may sit at `pending-review` post-launch without failing CI, but is
  never a launch pack while it does.

## Revisit when

All wave packs are reconciled to a real mode — at which point `pending-review`
can be tightened to block repo-wide.
