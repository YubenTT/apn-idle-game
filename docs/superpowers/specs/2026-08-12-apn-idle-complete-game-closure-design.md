# APN Idle Complete-Game Closure Design

**Date:** 2026-08-12
**Status:** Accepted for implementation
**Authority:** Owner request in the active complete-game closure goal

## Outcome

APN Idle becomes a complete, free, small-scale web idle game without changing
its core architecture. The finished loop is:

> fight through a ten-zone Pack, discover its three Echoes, clear its Gate,
> advance a visible Route, spend Rep on Pack-scoped mastery, complete thematic
> Sets, claim bounded capstones, Go Live at earned checkpoints, and continue
> through deterministic Signal Drift after the Clean Era.

The implementation preserves the approved GAF2D V4 Hero and Valorant motion
authority. It does not add a framework, backend, account, new currency, second
prestige, paid power, bespoke engine per Pack, or new art.

## Product decisions

### 1. Route is the primary long-term surface

The existing Route sheet keeps its stable `hub` navigation ID, but its visual
hierarchy changes:

1. current Pack and Pack-zone progress;
2. next Pack reveal;
3. Clean Era progress and final completion state;
4. current Pack Echo progress and archive;
5. recent Pack history;
6. Coverage Sets and claimable capstones;
7. existing daily, weekly, and season objectives.

Objectives remain available but no longer masquerade as the game's journey.
The five-item navigation and separate Gear FAB stay unchanged.

### 2. Echo is small, deterministic, and honest

Every Pack has three Echo slots. They are discoveries, not currency. The slots
unlock the first time Pack waves 3, 6, and 9 are cleared. The Gate at wave 10
completes the Pack visit. A fresh save therefore cannot display invented Echo
progress; the HUD and Route surface read the persisted domain state.

The launch uses a shared three-slot vocabulary—`Field Note`, `Signal Trace`,
and `Deep Cut`—instead of manufacturing sixty weak IP-flavoured stories. The
model permits future editorial copy without changing save semantics.

### 3. Clean Era then Signal Drift

The Clean Era is the first ordered pass through the active runtime catalog. It
is complete once every active Pack has a recorded clean completion. This is a
monotonic achievement: catalog additions do not erase a previously completed
Clean Era.

After the clean pass, the existing deterministic two-Pack scheduler continues
forever. Zone 200 reveals `Signal Drift`; revisit corruption remains bounded at
tiers 1–4. The player sees the tier and whether the current Pack is clean or a
revisit. The scheduler remains pure and seed-stable.

### 4. Save state is additive and bounded

No storage key or top-level save version bump is required. `normalizeRoute`
and normal meta hydration add missing fields to v1–v3 saves.

Route additions:

```js
{
  echoProgressByPack: { [packId]: { found: 0..3, total: 3 } },
  cleanCompletedPackIds: string[],
  packVisitCountById: { [packId]: integer },
  history: [
    { packId, visit, tier, completedAtZone, clean }
  ],
  cleanEraCompleted: boolean,
  cleanEraCompletedAtZone: integer
}
```

`history` is capped at 60 newest entries. Exact long-term counts live in the
maps, so bounded history does not lose progression truth.

Meta additions:

```js
{
  coverageMasteryByPack: { [packId]: 0..5 },
  claimedCoverageSetIds: string[]
}
```

Malformed values are clamped or discarded. Normalization is idempotent. Go
Live, offline simulation, and rollback keep all new fields.

### 5. Coverage Mastery is the Rep sink

Coverage Mastery has five levels per Pack. It costs Rep and affects only that
Pack on revisits. Each level grants a small bounded yield bonus; it never
touches `economyMult`, never creates a second global multiplier, and gives no
benefit in a Pack's first clean visit.

The initial curve is explicit and testable:

- cost by next level: `25, 60, 120, 220, 360` Rep;
- revisit yield: `+5%` per level, capped at `+25%`;
- maximum mastery level: `5`.

The balance slice may lower costs if the assertion-first playthrough proves the
feature unreachable, but it may not raise the cap or globalise the effect.

### 6. Coverage and Sets

A Pack is `covered` after its clean Gate has been cleared and all three Echoes
have been found. It does not require buying mastery. This keeps Set completion
earned by play rather than gated by a Rep grind.

The runtime contains seven non-empty Sets:

| ID | Name | Current members | Capstone |
|---|---|---|---|
| S1 | Tactical Feed | `valorant`, `counter-strike-2`, `escape-from-tarkov` | Rapid Defuse: first Gate in those Packs starts 5% pre-damaged |
| S2 | Hero Roster | `overwatch`, `apex-legends`, `marvel-rivals` | Team-Up Echoes: cosmetic paired archive treatment |
| S3 | Prime Time | `fc-26`, `nba-2k26`, `madden-nfl-26`, `rocket-league` | Clutch Window: +10% Gate Notes in those Packs |
| S4 | Lane Wars | `league`, `dota-2` | Last-Hit Bounty: +5% Signal on the final normal target in those Packs |
| S5 | Open Sandbox | `minecraft`, `fortnite`, `grand-theft-auto-v` | Free Build: cosmetic Route-card treatment |
| S6 | Nightmare Shift | `dead-by-daylight`, `path-of-exile-2`, `elden-ring` | Hardened: +5 percentage points offline efficiency in those Packs, still capped at 100% |
| S7 | Long Grind | `world-of-warcraft`, `old-school-runescape` | Idle Dividend: cosmetic persistent archive badge |

S4 and S7 retain declared open slots as metadata; an empty S8 is not shown.
Open slots do not block current completion. Once claimed, a capstone remains
claimed even when a future catalog version adds a member.

Claims are explicit player actions. Capstones are not purchasable. Only S1,
S3, S4, and S6 alter numbers, and each is scoped and bounded as listed. A
contract test proves none reads or writes `economyMult` or `meta.live`.

### 7. Catalog and rights truth

Stable Pack IDs and current order remain unchanged. No twenty-first Pack or art
is added.

Each `pack.json` becomes a versioned pointer manifest and carries:

```json
{
  "schema": "apn.idle.pack",
  "version": 1,
  "id": "valorant",
  "title": "Spike Protocol",
  "editorialReference": "Valorant",
  "rights": "assets/game-packs/valorant/rights.json",
  "sourceBoard": "assets/game-packs/valorant/source-board.md"
}
```

`title` is the only gameplay identity. `editorialReference` may appear only on
the editorial reference/ticker surface together with a non-affiliation label.
Stable IDs remain internal and may retain historical names.

Every Pack receives a rights record conforming to the existing rights schema.
No legal review is fabricated: launch records use `mode: pending-review`,
`reviewStatus: needs-legal-review`, and null reviewer/time unless genuine
evidence exists. A versioned catalog policy explicitly permits that transitional
mode with a visible non-affiliation notice. It never turns pending into approved.

The catalog builder:

- excludes `blocked` records and active kill switches;
- warns deterministically for `pending-review`;
- rejects raw editorial marks used as runtime titles;
- rejects missing, escaping, or malformed pointer paths;
- derives catalog size from eligible manifests rather than asserting 20;
- produces a safe empty catalog, for which the existing procedural APN fallback
  remains playable instead of crashing.

A fixture proves that a valid additional Pack passes validation without
changing production content. Another proves one Pack can be disabled without
renumbering or corrupting saves.

### 8. Balance closes against measured outcomes

Targets become executable assertions before any tuning:

- every Build reaches first Go Live in at most 15 minutes;
- Scan produces at least 20% more zones/hour than its neutral comparison;
- Verify produces at least 40% more Rep/cycle than Scan;
- Relay produces at least 30% more offline yield than its active-offline
  comparison;
- cycle N+1 reaches its first Gate at least 10% faster than cycle N;
- Zone 200 and Zone 1000 remain finite and softlock-free;
- ordinary targets take more than one simulation frame;
- save, scheduler, active simulation, and offline simulation are deterministic.

`finite` alone is never a passing assertion. Tuning is deliberately narrow:
soften the permanent-power HP budget exponent from `0.9` into the already
approved `0.4–0.5` range, then adjust the smallest Build constants needed. Stop
after two documented tuning rounds if meeting a target would breach the free
MVP or single-Live-Mult firewall.

### 9. Browser and release proof

The query-gated QA surface gains Route, Echo, Coverage, and capstone actions and
`render_game_to_text` exposes their read-only state. Production URLs without
`chrome-smoke=1` expose no QA globals.

The browser chain covers 375×812, 428×926, 844×390, and desktop:

1. start;
2. choose/build skills;
3. defeat a normal target and Gate;
4. inspect Gear;
5. Go Live;
6. inspect Route, Echo archive, history, and next Pack;
7. buy Pack mastery;
8. earn and claim one synthetic full Set in the query-gated harness;
9. inspect Zone 200 Signal Drift;
10. reload and simulate offline return.

Screenshots and text snapshots are inspected, not only generated. Tests cover
console/network errors, horizontal overflow, touch targets, focus, reduced
motion, asset fallback, and save reload.

### 10. Delivery and rollback

Work ships as small sequential PRs from latest `main`:

1. Route + Echo (closes #24);
2. Coverage + Sets (closes #25);
3. rights/catalog gates (closes #26);
4. balance assertions/tuning (closes #29);
5. release projection and production deploy (closes #30 and epic #31).

Each PR is fully green and merged before the next begins. The final game tree is
copied deterministically to `apn-web/public/idle`, with a release manifest that
records source commit and content hashes. The previous production manifest is
the rollback target. Cloudflare deployment is followed by cache-bypass smoke;
rollback is required on save loss, Route/Go-Live regression, missing assets,
runtime errors, or material viewport overflow.

## Rejected alternatives

- A frontend framework rewrite: no product value for this closure and high
  regression cost.
- Sixty bespoke Echo stories or twenty bespoke Pack mechanics: content-heavy,
  hard to balance, and outside the small-game goal.
- New currency or second prestige: violates the accepted economy.
- Pretending pending rights have legal approval: false and unsafe.
- Adding the aspirational twenty-first Pack: needs new art and owner review;
  catalog extensibility is proven with a fixture instead.
- One giant release branch: obscures rollback and review boundaries.

## Definition of done

The work is done only when the Route journey and postgame are visible, Pack
progress has bounded persistent meaning, rights/catalog gates cover every
runtime Pack without invented approval, numeric balance assertions and the full
browser chain pass, saves migrate without loss, both repositories are clean and
upstream-aligned, all PRs are merged, Cloudflare serves the projected hashes,
and production smoke is green.
