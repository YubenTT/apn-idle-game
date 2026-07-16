<!-- go-live-v2-superseded -->
> **⚠ Superseded on the prestige model (go-live v2).** This document still describes the retired **Ship Notes + End Season** model. The current design is **Go Live** — a single atomic prestige checkpoint (first at zone 10, then every 20; see [ADR-0008](decisions/ADR-0008-go-live-sole-checkpoint.md)). Read it through **plan v2** (`docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-v2.md`) and **`docs/product/RECONCILIATION.md`**; where they disagree, they win. Non-prestige content here may still be accurate.

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
  × permanentPowerBudget^0.9
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

| Profile | First boss | First season | Mature median | Corruption unlock |
|---|---:|---:|---:|---:|
| Active-assisted, 30s decisions | 10.9 min | 30.0 min | 67.6 min | 10.2 h |
| Mostly idle, 20 min check-ins | 23.8 min | 55.1 min | 99.0 min | 2.4 calendar days at 6 credited h/day |

Offline combat simulates at most three real hours per return, never plays SFX,
stops at the next End Season boundary, and converts remaining capped time into
bounded Signal/Notes at the measured pre-boundary rate.

## Tuning checklist

```bash
node qa/run-tests.mjs
node qa/pacing-profiles.mjs
node qa/long-run.mjs
```

Manual: hold Sprint → energy bar says ×1.85 SPEED; Z20+ stays multi-hit;
End Season keeps Route/Boosts and resets Weapon; automated checks remain muted.
