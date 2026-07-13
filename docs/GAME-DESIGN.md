# Game design

## Fantasy one-liner

You are the **APN Host** clearing **feed noise** so real **patch notes** can ship —
and you get stronger the longer the feed stays live.

## Player fantasy map

| Player does | Feels like |
|-------------|------------|
| Auto-attack noise | Scrolling / moderating the feed |
| Upgrade Weapon | Better scanner / tools |
| Burst / Area / Ramp | Editorial powers (hotfix, summary, live tracker) |
| Publish Notes | Hitting “publish” on the site |
| End Season | New content season / Live Mult era |

## Systems

### Combat

- Max **1** living enemy (classic idle clarity).
- Fixed melee range; enemies walk into range.
- Auto-attack from `combatStats.interval`.
- **Sprint (hold):** attack speed ×1.45, damage ×1.1, approach speed up, drains Energy.
- Boss every 10 zones (**Version Gate**) with timer heal-on-fail.

### Progression

| Track | Unit | Cap |
|-------|------|-----|
| Zone | kills to clear | **Endless** |
| Rank | XP → SP | Soft infinite |
| Weapon | Signal cost curve | Soft infinite |
| Skills | SP + attr reqs | Per-skill max |
| Season checkpoint | every 20 zones | Optional prestige |
| Live Mult | End Season | Permanent |

### Softlock policy

**Never stop spawning or advancing zones.**  
Checkpoints set `seasonDone` and unlock **End Season**; combat continues at Z21+.

### Satisfaction (juice)

- Floaters: `+Signal`, `+Notes`, CRIT, RANK
- Confetti: rank, patch kill, publish, upgrades
- Death: squash; Patch Note card-flip
- SFX: hit / crit / coin / rank / upgrade / sprint empty
- Build shop: afford pulse, SP bank, SVG icons

## UI information architecture

```text
Header   APN Idle · Zone · Live · Rank · SP
         Signal | Notes | Rep | DPS
Ticker   LIVE feed parody (game icons)
Stage    Canvas combat
Bars     Rank XP | Zone kills | Energy | Mana
CTA      Sprint (hold) | Upgrade Weapon | skill chips
Nav      Build | Publish | Boosts | Menu
```

## Copy rules

- Prefer verbs players understand: **Upgrade Weapon**, **Publish Notes**, **Damage**.
- Avoid internal jargon in HUD (scan/verify/amplify → Damage/Crit/Skills).
- Comedy is optional flavor on kills/bosses — never block systems.

## Accessibility / settings

- Reduced motion (settings)
- SFX toggle
- Touch targets ≥ 44–52px on primary controls
- Sheet max-width matches app (480px) on desktop
