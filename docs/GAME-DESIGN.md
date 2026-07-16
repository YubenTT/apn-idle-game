<!-- go-live-v2-superseded -->
> **⚠ Superseded on the prestige model (go-live v2).** This document still describes the retired **Ship Notes + End Season** model. The current design is **Go Live** — a single atomic prestige checkpoint (first at zone 10, then every 20; see [ADR-0008](decisions/ADR-0008-go-live-sole-checkpoint.md)). Read it through **plan v2** (`docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-v2.md`) and **`docs/product/RECONCILIATION.md`**; where they disagree, they win. Non-prestige content here may still be accurate.

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
| Ship Notes | Banking patch notes → reputation (not CMS publish) |
| End Season | New content season / Live Mult era |

## Systems

### Combat

- Max **1** living enemy (classic idle clarity).
- Fixed melee range; enemies walk into range.
- Auto-attack from `combatStats.interval`.
- **Sprint (hold):** full game time scale ×1.85, attack/march juice, shorter spawn gaps, drains Energy.
- Boss every 10 zones (**Version Gate**) with timer heal-on-fail.

### Progression

| Track | Unit | Cap |
|-------|------|-----|
| Route Zone | kills to clear | **Endless; survives End Season** |
| Rank | XP → SP | Soft infinite |
| Weapon | Signal cost curve | Soft infinite |
| Skills | SP + attr reqs | Per-skill max |
| Season checkpoint | every 20 zones | Optional prestige |
| Live Mult | End Season | Permanent |

### Softlock policy

**Never reset or hide world progress.** Checkpoints set `seasonDone` and unlock
**End Season**. End Season resets run power, not `route.zone`; combat resumes on
the same global Route after the reset.

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
Nav      Build | Ship | Boosts | Menu
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
