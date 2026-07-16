# Glossary

> One name per concept, across design, code, UI, and (future) localization. If two
> docs use two words for one thing, this file wins and they get fixed.

## Player-facing terms (canonical)

| Term | Meaning | Color token | Survives End Season? |
|------|---------|-------------|----------------------|
| **Signal** | Scan resource from kills/orbs; spent on Upgrade Weapon | `--c-signal` (blue) | Partial |
| **Notes** | Archive currency from red Patch Notes & bosses; shipped for Rep | `--c-notes` (rose) | No |
| **Rep** | Permanent progression currency from shipping Notes; buys Boosts | `--c-rep` (gold) | **Yes** |
| **SP** | Skill Points from ranking up; spent in Build | `--c-sp` (violet) | No (reset) |
| **Live Mult** | Prestige multiplier from End Season; multiplies damage + Ship | `--apn-primary` | **Yes** |
| **DPS** | Displayed damage-per-second (derived, not stored) | `--c-positive` (green) | n/a |
| **Route Zone** | Endless world-stage counter; kills-to-clear | `--c-zone` (cyan) | **Yes** |
| **Rank** | XP track that grants SP | `--c-rep` context | soft-infinite |
| **Boosts** | Permanent meta upgrades bought with Rep | `--c-rep` | **Yes** |
| **Build** | Season skill/attribute allocation (Damage/Crit/Utility + skills) | — | No (reset) |
| **Ship** | Convert Notes → permanent Rep | — | action |
| **End Season** | Optional prestige at a checkpoint → +Live Mult | `--apn-primary` | action |
| **Gear** | Equippable items with rarity; loadout + inventory | rarity tokens | **Yes** (collection) |
| **Host** | The APN mascot the player embodies | — | — |
| **Focus** | Regenerating Run meter spent by active skills | `--c-signal` context | No (reset) |

## Enemy / target names (canonical)

Per [ART-DIRECTION](../brand/ART-DIRECTION.md). Use these, not ad-hoc names.

| Name | Role | Sprite (current) |
|------|------|------------------|
| **Feed Noise** | trash | `assets/enemies/rumor.png`, `lag.png` |
| **Broken Link** | trash | `assets/enemies/stale.png`, `stale2.png` |
| **Patch Note** | core enemy → Notes | `assets/enemies/patch.png` |
| **Fake Leak** | elite | `assets/enemies/spoiler.png` |
| **Version Gate** | boss (every 10 zones) | `assets/enemies/boss.png` |
| **Event Surge** | event flavor | `assets/enemies/event.png` |

## Code ↔ UI name map (naming debt)

Internal save/state fields predate the UI vocabulary. **Do not rename in code
without a save migration** (`js/save.js`, schema `v`). Until migrated, this table
is how you read the code.

| Code / save field | Player-facing term | Notes |
|-------------------|--------------------|-------|
| `bytes` | **Signal** | rename target: `signal` |
| `patches` | **Notes** | rename target: `notes` |
| `authority` | **Rep** | rename target: `rep` |
| `scan` / `verify` / `amplify` | Damage / Crit / Utility attrs | Build attributes |
| `scanner` | Weapon level | "Upgrade Weapon" object |
| `mask` | (legacy skill grouping) | see `content.SKILLS` |
| `hero.energy` / legacy `hero.mana` | Energy / **Focus** | legacy `mana` migrates on load |
| `meta.live` | **Live Mult** | prestige |
| `seasonDone` | season checkpoint reached | unlocks End Season |
| `route.zone` / `route.killsInZone` | **Route Zone** progress | v2 owner; never reset by End Season |
| legacy `run.zone` / `run.killsInZone` | **Route Zone** progress | read-only v1 migration input |

## Flagged renames (open)

| Current | Should be | Where | Blocker |
|---------|-----------|-------|---------|
| `bytes` / `patches` / `authority` | `signal` / `notes` / `rep` | save schema | needs migration in `save.js` |

## Abbreviations

APN = All Patch Notes · CTA = call to action · SP = Skill Points · DoD =
Definition of Done · ADR = Architecture Decision Record · FAB = floating action
button · LOD = level of detail.
