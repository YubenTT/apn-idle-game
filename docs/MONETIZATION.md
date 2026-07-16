<!-- go-live-v2-superseded -->
> **⚠ Superseded on the prestige model (go-live v2).** This document still describes the retired **Ship Notes + End Season** model. The current design is **Go Live** — a single atomic prestige checkpoint (first at zone 10, then every 20; see [ADR-0008](decisions/ADR-0008-go-live-sole-checkpoint.md)). Read it through **plan v2** (`docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-v2.md`) and **`docs/product/RECONCILIATION.md`**; where they disagree, they win. Non-prestige content here may still be accurate.

# Monetization (APN Idle)

## Launch policy: free MVP

APN Idle launches with **no purchase surface and no paid gameplay advantage**.
The Menu contains no demo store, APN Pro, coin pack, paid Gear Box, timed power
boost, Auto-Sprint unlock, or Time Warp. Gear continues to drop from play.

The launch economy has one global multiplier:

```text
economyMult = Live Mult
```

Live Mult is earned only through the free Ship / End Season loop. It applies to
combat and the existing Signal, Notes, and Rep flows as defined by the domain
layer. Rep Boosts remain permanent progression earned through play; they are not
the retired paid `2× Boost` product.

## Save compatibility

Schema v2 keeps the old `meta.premium` object only so local demo saves can round
trip without losing unknown historical values. Every field in that object is
inert: it cannot affect damage, income, Sprint, offline progress, rewards, Gear,
Ship, or End Season. New code must not add a player-facing dependency on it.

## Future monetization gate

Monetization is a post-MVP product decision, not hidden launch code. A future
proposal requires its own issue and evidence for entitlement validation, restore
flow, legal copy, accessibility, and cross-product account behavior.

Allowed direction:

- cosmetic Host treatments, profile/share frames, and visual stage themes;
- APN Pro benefits that do not change combat power, drops, progression speed,
  offline efficiency, or prestige output;
- optional convenience only after it is proven not to become optimal play.

Prohibited direction:

- paid damage or economy multipliers;
- paid or randomized power Gear;
- paid skips that advance Route, Rank, resources, or End Season timing;
- ads or purchase pressure in the first-session loop.

The current implementation source of truth is the negative launch contract in
`qa/run-tests.mjs`; historical industry research is archived in
`docs/IDLE-DESIGN-CONTEXT.md` and does not override this policy.
