# ADR-0009 — Every Game Pack declares a required rights mode

- Status: Accepted
- Date: 2026-07-16

## Context

The launch catalog ships 20+ packs whose player-facing titles are literal
trademarks ("Valorant", "EA Sports FC 26", "NBA 2K26"). The original A1 decision
tagged them `homage-only`, whose own definition says "exact game title: no" — a
documented contradiction on day one. Rights-mode enums also drift across five
sources (6/6/3/3/5 modes; a `blocked-until-review` status that is in no enum;
`reviewer` vs `reviewedBy`). Owner locked **A′**: split stable internal IDs from
display titles, make display titles APN-original parody names, and keep the real
title only in the feed ticker as an editorial reference.

## Options

### Option A1 — keep trademark titles, tag homage-only

Self-contradictory (homage-only forbids the exact title) and legally weak: a
playable world *named* "Valorant" is source-identifying use (Jack Daniel's v.
VIP, 2023) and loses the editorial shield.

### Option A′ — ID/display split + required canonical rights taxonomy (chosen)

Stable IDs stay internal; display titles become APN-original; the real title is
feed-ticker editorial context only; rights become a required, validated field.

## Decision

**Every pack declares a `rights` block** validated against the canonical
`docs/product/schemas/rights.schema.json`. Canonical modes:
`apn-original | homage-only | editorial-text-original-art | licensed-spotlight |
blocked`, plus the transitional `pending-review` (ADR-0011). Required fields:
`mode`, `editorialReference` (real title — ticker only), `reviewedBy`. The
`fan-policy-noncommercial` framing is blocked repo-wide (a brand-marketing game
is never noncommercial). Bosses/creatures/athletes are archetype-text only,
never third-party pixels or names.

## Consequences

- `rights.schema.json` is declared canonical in PR-0; the enforcing validator +
  title-vs-mode marks denylist + per-pack `rights.json` land in **PR-7**.
- The `echo-pack.schema.json` rights sub-object was reconciled to this taxonomy
  in PR-0 (see `docs/product/RECONCILIATION.md`).
- Asset-Bible rows naming real athletes/characters are rewritten to archetypes in
  PR-7.

## Revisit when

A written license changes a pack's posture to `licensed-spotlight`, or a new
distribution channel changes the commercial-use analysis.
