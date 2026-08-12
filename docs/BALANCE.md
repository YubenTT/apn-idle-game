<!-- go-live-v2-superseded -->
> **⚠ Superseded on the prestige model (go-live v2).** This document still describes the retired **Ship Notes + End Season** model. The current design is **Go Live** — a single atomic prestige checkpoint (first at zone 10, then every 20; see [ADR-0008](decisions/ADR-0008-go-live-sole-checkpoint.md)). Read it through **plan v2** (`docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-v2.md`) and **`docs/product/RECONCILIATION.md`**; where they disagree, they win. Non-prestige content here may still be accurate.

> **Current Gate-M authority (2026-08-12).** Coverage Mastery is a five-level
> Pack-scoped Rep sink with costs `25 / 60 / 120 / 220 / 360` and at most 25%
> revisit yield. Set capstones are earned, scoped, and bounded; Live Mult stays
> the only global multiplier. The permanent-power HP budget exponent is `0.4`,
> replacing the retired `0.9` anti-trivialization curve. Assertion-first
> first-session, Build-divergence, offline, cycle, and Zone-1000 gates are now
> executable in `qa/check-balance-targets.mjs`.

# Balance

All knobs live in `js/formulas.js` → `C`.

## Design targets

| Moment | Feel |
|--------|------|
| First 30s | Kill something (readable multi-hit), see Signal, understand Weapon |
| First rank | Open Build, spend SP |
| First red enemy | Notes → **Ship** → permanent Rep |
| Zone 10 | First Version Gate (boss) |
| Zone 20 | Checkpoint; End Season available; **keep playing** |
| Mid zones | Must keep upgrading weapon or fights drag |
| End Season | Live Mult ↑, **Boosts stay**, **weapon resets** |

## Meta permanence

| System | On End Season |
|--------|----------------|
| **Boosts** (Rep purchases) | **Permanent** — never wipe |
| **Unspent Rep** | **Kept** |
| **Live Mult** | **Permanent** (+gain) |
| **Weapon level** | **Full reset** (run-only) |
| Rank / SP / skills / attrs | Reset |
| Zone / Notes | Reset |
| Signal | Partial keep (15%) |

Live Mult multiplies **damage** and Notes→Rep conversion.

## Sprint

Hold Sprint (button / stage / Space):

- **Time scale ×1.85** — whole sim runs faster (main loop)
- Extra attack speed + march + shorter spawn gaps
- Drains Energy (grab green orbs)

## Build V2 axes

- **Scan** spends SP on named throughput skills; no generic Damage tax remains.
- **Verify** spends SP on named value skills. Its derived Mastery applies the
  bounded yield formula owned by `formulas.js`.
- **Relay** spends SP on continuity skills. Its derived Mastery raises capped
  offline efficiency toward active yield, never above it.
- **Mastery** is the exact SP already spent in a branch; it is derived from skill
  ranks with `skillSpCost`, not stored as a second upgrade currency.

The three axes are exercised as actual play profiles: Hotfix, Priority Tag, and
Overclock are used when available instead of measuring passive skill ranks that
the player would never activate.

## Coverage Mastery and Set capstones

Coverage yield applies only when the current Pack has a positive revisit tier.
The four numeric capstones are local to their declared Set: 5% pre-damage on a
Tactical Feed Gate, 10% Prime Time Gate Notes, 5% Lane Wars final-target Signal,
and five Nightmare Shift offline-efficiency points capped at active yield. The
other Set rewards are presentation-only. None feeds damage, Live Mult, or a
second global economy term.

## Key constants

| Key | Role |
|-----|------|
| `SPRINT_TIME` | Real game speed while sprinting |
| `BASE_DAMAGE` / `SCANNER_DMG_GROWTH` | Weapon curve (+ soft DR after Lv25) |
| `SCANNER_COST_*` | Signal sink (steep) |
| `ENEMY_HP_*` | Season-local Weapon curve plus bounded Route maturity |
| `ZONE_KILLS*` | Clear length |
| `SEASON_ZONES` | Prestige checkpoint (20) |

## HP sketch

```text
scannerDamage(localSeasonPace)
  × readableHits(localZone + boundedMaturity)
  × permanentPowerBudget^0.4
  × corruptionTier
  × targetType
```

Weapon and Rank reset every 20 Route Zones, so their comparison curve is also
season-local. Route maturity caps after seven seasons; Corruption caps at Tier 4.
Gear, Live, and permanent Signal Power are partially budgeted into target HP:
they still save time, but cannot collapse later seasons into seconds. Signal and
Rank rewards use the same season-local curve plus a bounded maturity bonus.

Boss timer expiry preserves damage. The timer communicates pressure and repeats
its telemetry cycle; it never restores full HP or creates an unattended hard wall.

## Measured seeded profiles

Run `node qa/pacing-profiles.mjs` for the deterministic evidence. The locked seed
currently measures:

| Profile | First Gate | Mature median | Zone 200 |
|---|---:|---:|---:|
| Scan (seed `SCAN`) | 7.1 min | 25.6 min | 3.9 h |
| Verify (seed `VERI`) | 14.4 min | 52.0 min | 8.0 h |
| Relay (seed `RELA`) | 7.8 min | 27.8 min | 3.8 h |

The acceptance test additionally measures Scan at `2.789×` the same-seed
neutral zones/hour, Verify at `2.291×` Scan Rep/cycle, and Relay overflow Signal
and Notes at `1.333×` neutral. The authored maturity budget stops growing at
Zone 120. In the fixed final post-ceiling window, both successive first-Gate
ratios pass independently—Scan `0.884× / 0.850×`, Verify `0.853× / 0.371×`, and
Relay `0.506× / 0.627×`. No median or outlier allowance is used.

Live Mult intentionally affects both Notes earned and Notes→Rep conversion, so
the economy's Rep channel is proportional to `live²`. This is one multiplier
applied at two explicit stages, not a hidden second multiplier. The `0.4` HP
budget share, multi-hit floor, free-MVP firewall, and bounded seeded tests are
the corresponding anti-collapse gates.

Offline combat simulates at most three real hours per return, never plays SFX,
stops at the next Go Live boundary, and converts remaining capped time into
bounded Signal/Notes at the measured pre-boundary rate. Neutral conversion is
75%; each point of Relay Mastery restores two percentage points toward the
100% active-yield ceiling. Hardened may add five Pack-scoped points but never
crosses that ceiling.

## Tuning checklist

```bash
node qa/run-tests.mjs
node qa/check-balance-targets.mjs
node qa/pacing-profiles.mjs
node qa/long-run.mjs
```

Manual: hold Sprint → energy bar says ×1.85 SPEED; Z20+ stays multi-hit;
End Season keeps Route/Boosts and resets Weapon; automated checks remain muted.
