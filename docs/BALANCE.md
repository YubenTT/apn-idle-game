# Balance

All knobs live in `js/formulas.js` → `C`.

## Design targets

| Moment | Feel |
|--------|------|
| First 30s | Kill something, see Signal, understand Weapon button |
| First rank | Open Build, spend SP |
| First red enemy | Notes → Publish path |
| Zone 10 | First Version Gate (boss) |
| Zone 20 | Checkpoint toast; prestige available; **keep playing** |
| Z40+ | Soft HP scale so upgrades still matter |

## Key constants

| Key | Role |
|-----|------|
| `BASE_DAMAGE` / `SCANNER_DMG_GROWTH` | Weapon power curve |
| `SCANNER_COST_*` | Signal sink |
| `ENEMY_HP_*` | Zone difficulty |
| `ENEMY_HP_SOFT_AFTER` / `SOFT_ZONE` | Late-game HP softens after Z40 |
| `ZONE_KILLS` / `ZONE_KILLS_PER5` | Clear length (capped) |
| `SPRINT_ATK` / `SPRINT_DMG` / `SPRINT_DRAIN` | Hold-sprint combat feel |
| `SP_PER_LEVEL` | Build economy |
| `SEASON_ZONES` | Prestige checkpoint length (20) |

## HP formula (sketch)

```text
base * zoneGrowth^min(z, softAfter) * softGrowth^max(0, z-softAfter)
    * stepGrowth^floor(z/stepEvery) * typeMult
```

## Prestige

- Trigger: finishing a zone such that `zone % 20 === 0` (internal 0-based after advance).
- Reward: `liveGain(shippedThisSeason)` added to `meta.live`.
- Cost: reset run attrs/skills/zone; keep Live Mult; partial weapon keep.

## Tuning checklist

After any `C` change:

```bash
node qa/run-tests.mjs
```

Manually: time-to-first-kill, time-to-Z10, energy empty while sprinting, checkpoint at 20 without freeze.
