# Balance

All knobs live in `js/formulas.js` → `C`.

## Design targets

| Moment | Feel |
|--------|------|
| First 30s | Kill something (a few hits), see Signal, understand Weapon |
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
| `ENEMY_HP_*` | Zone difficulty (multi-hit forever) |
| `ENEMY_HP_SOFT_AFTER` | Very late soft (100+) only |
| `ZONE_KILLS*` | Clear length |
| `SEASON_ZONES` | Prestige checkpoint (20) |

## HP sketch

```text
base * zone^z * step^floor(z/5) * decade^floor(z/10) * typeMult
```

Weapon damage soft-caps after high levels so pure Signal spam cannot one-shot late zones.

## Tuning checklist

```bash
node qa/run-tests.mjs
```

Manual: hold Sprint → energy bar says ×1.85 SPEED; Z20+ multi-hit without upgrades; End Season keeps Boosts, zeros weapon.
