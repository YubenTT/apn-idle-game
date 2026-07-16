# ADR-0008 — Go Live is the sole prestige checkpoint

- Status: Accepted
- Date: 2026-07-16

## Context

The live build has two player-facing prestige-adjacent actions: `Ship Notes`
(bank notes → Rep) and `End Season` (prestige → +Live Mult). `End Season`
currently **burns unshipped Notes** (`js/game.js:1062`) — a real foot-gun — and
the two-action model forces the player to understand a season/ship split that no
longer maps to the product. The V3 package unifies them into one atomic action
("Ship This Drop"); plan v2 locks decision **B1** and renames that action
**Go Live**, with the AUDIT's first-cycle-length mitigation folded in.

## Options

### Option A — keep Ship Notes + End Season

Two actions, two mental models, and a path that silently destroys banked work.

### Option B1 — single atomic Go Live (chosen)

One action banks Notes → Rep, raises Live Mult, resets temporary power, and keeps
the global Route, with an idempotent receipt. First checkpoint at **zone 10**
(genre-standard tutorial prestige), then every **20** zones.

### Option C — auto Go Live capstone

A Relay/Background-Sync capstone that ships automatically. Conflicts with B1's
one-deliberate-action promise; deferred (needs separate owner sign-off).

## Decision

Lock **B1**. **Go Live is the sole prestige checkpoint.** It is a single atomic
transaction (bank → grow Live Mult → reset temporary state → keep permanent
state → advance) that never resets the Route. Checkpoint boundaries: **first at
zone 10, then every 20**; an overshoot mints a checkpoint from the boundary zone.
Offline→currency conversion is **preserved but capped at the boundary** (no
post-boundary AFK prestige-fuel farm). This **supersedes the End-Season prestige
model** everywhere it is taught.

## Consequences

- PR-1 lands `goLive()` strictly additively (ship/leave still works that PR);
  PR-2 removes the End-Season path and its copy.
- Save bumps to v3 with a write-guard and a migration matrix (PR-1).
- Legacy docs that teach Ship-Notes + End-Season as current mechanics are
  superseded on the prestige model (PR-0 banners; copy-ban enforcement in PR-2).
- `meta.season` / `authority.shippedThisSeason` are migrated then deleted so
  `save.js` cannot resurrect them.

## Revisit when

A second, genuinely distinct prestige layer is designed (Option C), or telemetry
shows the zone-10 first checkpoint is mistimed.
