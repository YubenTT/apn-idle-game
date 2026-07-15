# ADR-0004 — Catalog-driven Game Pack Route

- Status: Accepted
- Date: 2026-07-15

## Context

The shipped game rotates five palette biomes while enemy selection is independent
of the environment. That is too thin for a game intended to run for hours or days.
The redesign now calls for recognizable game-specific encounters: one game owns a
10-zone environment, target family, and boss.

The existing docs also prohibit third-party characters as targets. The product
direction explicitly replaces that non-goal with controlled, recognizable homage
packs. This must be recorded rather than left as a contradiction for later agents.

## Options

**A — Fixed 120/200-zone tour, then repeat.** Simple, but becomes stale and makes
new games a migration problem.

**B — One genre per pack.** Cheap, but collapses games with incompatible visual
identities (for example WoW and Old School RuneScape).

**C — Catalog-driven Game Packs with bounded Corruption epochs (chosen).** Each
game is a plug-in content pack. New games enter clean; completed packs can return
through reusable Corruption layers.

## Decision

Choose **C**.

- One **Game Pack** owns 10 global Route Zones and ends with its own boss.
- End Season remains every 20 Route Zones: two complete packs per season.
- Route Zone and pack history survive End Season; run power still resets.
- Full Corruption unlocks after **20 distinct clean packs**. With 10 zones per
  pack this is currently Zone 200. The rule is the completed-pack count, not the
  magic number 200.
- Corruption is foreshadowed without entering the scheduler: anomaly at Pack 5,
  boss fracture preview at Pack 10, and a stronger warning at Pack 15.
- After unlock, the scheduler alternates seasons containing new clean packs and
  corrupted revisits. A pack must be completed clean before it can corrupt.
- Corruption has four visual tiers and then stops adding art. Endless difficulty
  and rewards continue numerically without producing unlimited asset variants.
- Game Pack identity uses recognizable game environments, characters, creatures,
  roles, and cover stars under one APN 2D rendering grammar. This supersedes the
  former third-party-character non-goal in `VISION.md` and the matching former
  prohibition in `brand/ART-DIRECTION.md`.
- The vanilla ES module + Canvas 2D runtime remains unchanged. Packs are static
  files loaded on demand; no runtime dependency or build step is introduced.

The detailed behavior and asset contract live in
[GAME-PACK-ROUTE](../GAME-PACK-ROUTE.md).

## Consequences

**We gain:** a long-lived route, one-game/one-fantasy clarity, deterministic save
progress, a clean expansion path, and late-game variation without multiplying
base art for every tier.

**We accept:** a catalog/save migration, a lazy asset loader, a much larger
research and art program, and explicit curation of recognizable third-party game
material.

## Revisit when

- Ten zones no longer gives a pack enough time to establish and resolve its arc.
- Long-run simulation cannot keep Zone 200 inside the target calendar window.
- Per-pack compressed or decoded memory budgets cannot be held on target devices.
- A licensed/partner content pipeline replaces locally curated packs.
