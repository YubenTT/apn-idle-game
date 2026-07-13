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
| **APN Pro** | One-time IAP | Permanent ×1.25 economy + better offline | Demo unlock in Menu · wire real IAP later |
| **2× Boost** | Timed consumable | ×2 economy for 30 minutes (stacks with Pro) | **40 coins** |
| **Coin packs** | Soft IAP | +100 / +500 coins | Demo “Get” buttons · real store SKUs later |

## Free coin sinks & sources

| Source | Coins |
|--------|-------|
| Version Gate (boss) | +3 |
| Ship Notes | +1 |
| End Season | +15 |

Spend on 2× Boost. Never required.

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
