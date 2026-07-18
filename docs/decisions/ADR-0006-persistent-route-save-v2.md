<!-- go-live-v2-superseded -->
> **⚠ Superseded on the prestige model (go-live v2).** The **End Season** prestige framing in this ADR is superseded by [ADR-0008](./ADR-0008-go-live-sole-checkpoint.md) (Go Live is the sole checkpoint). The Route/catalog/save structure here otherwise stands; see plan v2 + `docs/product/RECONCILIATION.md`.

# ADR-0006 — Persistent global Route in save schema v2

- Status: Accepted
- Date: 2026-07-15

## Context

Schema v1 stored `zone` and `killsInZone` inside the season-scoped `run` object.
End Season therefore reset the player's visible world path to Zone 1. The accepted
Game Pack Route needs stable pack history, catalog identity, corruption progress,
and expansion scheduling across many End Seasons.

## Options

**A — Keep v1 and reinterpret `run.zone`.** Small diff, but preserves the wrong
ownership and cannot safely grow pack history.

**B — Add global `route` state and write schema v2 (chosen).** Migrate v1 Route
progress once, preserve the legacy key as rollback evidence, and make explicit New
Game the only operation that clears both keys.

**C — Replace localStorage with a database.** Adds runtime/backend scope with no
benefit to this static single-player build.

## Decision

Choose **B**. `s.route` owns world zone, kills in the current zone, stable pack ID,
seen/deck/history records, catalog version, and deterministic seed. `s.run` keeps
only season-scoped resources and hero power. End Season resets run power but never
Route progress.

`load()` checks `apn_idle_save_v2` then `apn_idle_save_v1`. `save()` writes v2
only. Applying v1 migrates `run.zone` and `run.killsInZone` into `s.route`; it does
not delete the v1 key. Explicit New Game clears both keys.

## Consequences

**We gain:** save-stable world progress, reversible migration, deterministic pack
state, and a clean owner for scheduler expansion.

**We accept:** two localStorage keys during migration and one maintained v1 read
path until a future ADR retires rollback support.

## Revisit when

- a cross-device account save becomes real product scope, or
- measured save size approaches the browser storage budget.
