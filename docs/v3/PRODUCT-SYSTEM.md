# Product System — One Drop, Endless Route

## Canonical units

```text
Route        endless global progression; never resets
Zone         compact Route position shown in Run
Pack         10 Zones; one original world and one signature mechanic
Drop         20 Zones / two Packs; one publishing-prestige closure
Season Track calendar live-ops reward track only
```

## One action

Remove both player-facing actions:

- `Ship Notes`
- `End Season`

Replace them with:

# Ship This Drop

### Flow

```text
Zones 1–19
  → Notes accumulate; Drop progress remains visible

Zone 20 cleared
  → safe Drop Ready hold
  → save written
  → Drop tab shows READY

Ship This Drop
  → Notes convert to Rep
  → Live Mult increases
  → temporary power resets
  → Route Zone and Pack history remain
  → next Pack preloads or APN Core fallback is used
  → Zone 21 begins
```

### Preview must answer

1. What will I gain?
2. What will reset?
3. What will stay?
4. What comes next?
5. Can I continue safely with zero Notes, full inventory or missing assets?

Example:

```text
DROP 04 READY

124 Notes → +124 Rep
Live Mult ×1.18 → ×1.24

Resets
Scanner Lv · Rank · SP · Build · Notes · 85% Signal

Keeps
Route Zone · Rep · Boosts · Gear · Live Mult · Archive · Season Track

Next
Fashion Dream · Pack 9

[ Ship This Drop ]
```

### Canonical formulas

```js
dropIndex = Math.floor(route.zone / 20)
dropReady = route.zone > 0
  && route.zone % 20 === 0
  && meta.lastShippedDrop < dropIndex

rawNotes = Math.floor(run.notes)
repGain = Math.floor(rawNotes * SHIP_RATE * currentLiveMult)
liveGain = 0.05 * Math.log2(1 + rawNotes / 60)
```

`liveGain` uses raw Notes rather than already-multiplied Rep, preventing a double-multiplier feedback loop. Constants remain versioned balance config and require simulation.

### Reset / keep contract

**Reset:** Scanner, Rank/XP/SP, temporary Build, Notes, 85% Signal, encounter state. Energy and Focus refill.  
**Keep:** Route Zone/history, Rep, Boosts, Gear/inventory, Live Mult, Hub/Season Track, settings/accessibility, Archive discoveries.

### No-softlock rules

- Zero Notes never disables the CTA.
- Transaction is idempotent by Drop index/transaction ID.
- Offline simulation stops at an unshipped boundary.
- Missing next Pack uses packaged APN Core fallback.
- Full Gear cannot block shipping.
- Recovery snapshot is written before mutation; failed save rolls back.
- Old Ship-only and post-End-Season saves migrate without loss or duplicate reward.

### Atomic sequence

```text
lock input → validate → recovery snapshot → calculate → apply Rep/Live
→ reset temporary state → mark transaction → final save → clear recovery
→ emit one event → preload/fallback → resume
```

## Canonical language

| Concept | Player-facing term | Never show |
|---|---|---|
| endless progression | Route / Zone | season route, epoch |
| ten-Zone world | Pack | catalog entry |
| twenty-Zone prestige unit | Drop | season, cycle |
| unified action | Ship This Drop | Ship Notes, End Season, Reset Run |
| live ops | Season Track | Season when meaning Drop |
| main tool | Scanner | Weapon |
| temporary currency | Signal | bytes |
| shippable work | Notes | patches |
| permanent currency | Rep | authority |
| temporary level | Rank | hero.level |
| active ability resource | Focus | mana |
| permanent upgrades | Boosts | meta tree |

Never show bare `Level` when multiple tracks share a surface: Zone, Rank, Scanner Lv, Skill Rank, Live Mult and Season Track Lv are distinct.

## Four Run actions

### Hotfix — active / Focus
Immediate heavy scan on the current target.

### Priority Tag — active / Focus
Marks one target; the marked clear pays more Signal/Notes and contributes more Gate-chain quality. It replaces false `Area` behavior because the game intentionally has one living enemy.

### Live Tracker — toggle
Maintaining the same target builds a visible power ramp; strongest on Version Gates.

### Overclock — toggle / Focus drain
Increases Scanner throughput and active-skill power while Focus lasts. It is distinct from Sprint, which spends Energy and speeds movement/simulation.

Compact Run labels: `Hotfix · Tag · Tracker · Overclock`.

## Build branches

- **Scan:** Quick Scan, Hotfix, Live Tracker, Zero Downtime.
- **Verify:** Signal Ping, Priority Tag, Source Lock, Trusted Source.
- **Relay:** Overclock, Relay Power, Always Live, Background Sync.

SP buys named skills directly. Branch Mastery is derived from SP spent. No Damage/Crit/Utility attribute tax. Respec is free until the first Gate, then one free respec per Drop.

## Infinite Echo Pack architecture

Every game-inspired Pack has separate identities:

### Editorial Signal

Factual real title, APN content type, APN/official source and concise feed copy. No implication of partnership.

### Runtime Echo

Original APN title, environment, target cast, boss, mechanic and art. No third-party logos, characters, maps, outfits, UI, audio, signature items or trade dress.

### Licensed Spotlight

Direct branded assets only when a written license covers the intended commercial game use, territory and term.

Rights modes:

- `original-echo`
- `editorial-reference`
- `licensed-spotlight`

Default is original Echo or factual editorial reference. A fan-content policy is not assumed to authorize a commercial minigame.

## Pack anatomy

Each Pack supplies:

1. editorial reference;
2. original runtime title/fantasy;
3. one signature mechanic + optional tested modifier;
4. five target roles;
5. one Version Gate;
6. three-layer environment;
7. semantic palette;
8. up to three Easter eggs;
9. revisit/Signal Drift parameters;
10. fallback and kill switch;
11. provenance and review records.

Controlled mechanics:

```text
ordered_targets · shield_source · timing_window · lane_shift
tag_then_clear · resource_choice · pickup_path · armor_break
streak_guard · environment_pulse · duplicate_filter · style_chain
```

New Packs compose these primitives rather than adding custom runtime code by default.

## Easter-egg budget

- **Read:** broad genre/fantasy recognition.
- **Wink:** subtle mechanic/copy nod.
- **Deep Cut:** rare optional Archive discovery.

Maximum three per Pack. Every egg has an originality note, trigger and independent kill switch. Recognition may not depend on copied character, logo, map, costume, item, audio or exact UI.

## Example identity conversions

| Editorial reference | Original Runtime Echo | Mechanic |
|---|---|---|
| Valorant | Tactical Echo | ordered_targets |
| EA Sports FC 26 | Floodlight XI | timing_window |
| Barbie | Fashion Dream | style_chain |
| Minecraft | Block Signal | resource_choice |
| GTA V | Night Heist | pickup_path |
| Elden Ring | Ashen Gate | armor_break |

The scheduler keeps stable Pack IDs, unseen-first progression, genre separation and revisits. It adds disabled-Pack filtering, fallback substitution, boundary-only catalog adoption and minimum mechanic/palette distance.
