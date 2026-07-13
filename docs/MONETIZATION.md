# Monetization (APN Idle)

Optional power/convenience. **Free path is complete** — Pro and boosts speed progress, they do not gate zones, gear, or End Season.

## Economy mult stack

```text
economyMult = Live Mult × Pro(1.25 if owned) × Boost(2 if timed active)
```

Applied to:

- Combat damage
- Signal from kills
- Notes from kills
- Ship Notes → Rep payout

## Products

| Product | Type | Effect | Earn / pay |
|---------|------|--------|------------|
| **APN Pro** | One-time IAP | ×1.25 economy + **Auto-Sprint** + offline bonus | Menu → Premium |
| **Auto-Sprint** | Coin unlock (or free with Pro) | Sprint without hold; still drains energy | **80 coins** |
| **2× Boost** | Timed | ×2 economy 30m | **40 coins** |
| **Time Warp +1h** | Consumable + CD | Fast-forward 1h idle (8m cooldown) | **30 coins** |
| **Coin packs** | Soft IAP | +100 / +500 coins | Demo “Get” |
| **Signal Crate** | Coin sink | 1 gear (fills empty slots) | **25 coins** |
| **Rare Bundle** | Coin sink | 1 gear · Uncommon+ bias | **70 coins** |
| **Epic Cache** | Coin sink | 1 gear · Rare+ / Unique chance | **160 coins** |
| **Loadout Box** | Coin sink | 2 gear · empty-slot first | **110 coins** |

## Gear loadout (permanent)

Six slots: **Weapon · Head · Chest · Legs · Boots · Trinket**.  
Boss/elite drops fill for free. Boxes are optional power/convenience.  
Sell bag junk for **Signal** (season soft currency). Worse items never auto-equip.

## Free coin sinks & sources

| Source | Coins |
|--------|-------|
| Version Gate (boss) | +3 |
| Ship Notes | +1 |
| End Season | +15 |

Spend on 2× Boost, Auto-Sprint, Time Warp, and **Gear Boxes**. Never required.

## What stays free forever

- Combat loop, Signal upgrades, Build SP, skills
- Gear drops, Boosts (Rep), Ship, End Season Live Mult
- Offline progress (Pro only improves efficiency slightly)

## Implementation

- State: `meta.premium = { pro, coins, boostEndsAt }`
- Survives End Season with gear + Rep boosts
- Catalog: `js/content.js` → `PREMIUM`
- Logic: `unlockPro`, `buyBoost2x`, `buyCoinPack`, `economyMult` in `js/game.js`
- UI: Menu → Premium block

## Production IAP checklist

1. Map `pro` → App Store / Play one-time product ID
2. Map coin packs → consumable product IDs
3. Receipt validate before `unlockPro` / coin grant
4. Keep demo buttons behind `?debug=1` or remove for store builds
