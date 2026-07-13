# Changelog

All notable changes to APN Idle are documented here.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).  
Versioning: [SemVer](https://semver.org/) for tagged releases.

## [Unreleased]

### Planned

- Save schema rename (bytes → signal) with migration
- PWA manifest
- Wire real IAP receipts for APN Pro / coin packs / boxes
- Rewarded-ad stubs (MindStudios monetization playbook)

## [1.7.1] — 2026-07-13

### Fixed

- Gear stats make sense: **no Defense** (not a game system)
- Slot signature primaries: Weapon→Damage · Chest→Energy · Legs→Sprint · Visor→Crit
- Affix pools only use combat stats (dmg/crit/atk/signal/notes/energy/move/regen)
- Save sanitize strips wrong-slot affixes on load

## [1.7.0] — 2026-07-13

### Added

- **Brand Gear UI** (owner mock): Host + Weapon/Chest/Legs/Visor cards
- Inventory item cards with primary stat (Signal / Defense / Sprint)
- Hold-to-sell junk · rarity filter chips
- `docs/IDLE-DESIGN-CONTEXT.md` — MindStudios idle design/monetization archive + APN map

### Changed

- Loadout simplified to **4 brand slots** (head→visor, boots→legs, trinket→visor migrate)
- Primary-stat-forward copy on cards; detail bar for Equip/Swap/Unequip

## [1.6.0] — 2026-07-13

### Added

- Multi-slot gear loadout + paper-doll
- **Premium Gear Boxes** (Signal Crate / Rare Bundle / Epic Cache / Loadout Box)
- Legacy `armor` → `chest` save migration

### Changed

- Drops prefer empty slots; affixes are slot-tagged
- Never auto-equip worse pieces; sell junk → Signal only from bag
- Menu Premium: boxes grid + coin packs

## [1.5.1] — 2026-07-13

### Changed

- All sheets compacted: Build / Ship / Gear / Hub / Boosts / Menu
- Gear: 6×4 slot inventory, hover stats, Equip/Swap detail, sell → Signal
- No worse-item auto-equip; upgrade marker on bag slots
- Hub: fixed rewards (signal/sp/rep/coins — no “bytes”), dense quest rows
- Premium chips row; skill desc on hover only

## [1.5.0] — 2026-07-13

### Changed

- **Title intro**: animated clean brand card (no mascot / no fluff copy)
- **Gear** in bottom nav + header icon pill (no item-name spam top-right)
- Gear loadout: mascot + slot chips + cleaner inventory
- Center loot drop fade polish; one-shot gear tip only
- Overdrive ON: strong chip + stage vignette + canvas aura
- Dual-eye scanners always-on idle beams; enemies no longer glued to mascot
- Sheet panels: bottom nav stays usable, same-tab no longer closes (no flap)
- Per-item gear icons by name family

## [1.4.1] — 2026-07-13

### Changed

- Gear panel: mascot loadout showcase + per-item icons
- Loot drops: center fade card (no top toast/floater spam)
- Tighter copy on Ship / Hub / Premium

## [1.4.0] — 2026-07-13

### Added

- **Hub**: daily/weekly objectives, season track, patch feed, claim rewards
- Icons for every skill + boost
- Skill SP cost scales every 5 ranks (long-session sink); higher max ranks
- Premium: Auto-Sprint (was free mask OP), Time Warp +1h
- Gear via Hub quick chips (nav: Build · Ship · Hub · Boosts · Menu)

## [1.3.0] — 2026-07-13

### Changed

- **Removed masks** (Crit Mask, Endless Sprint) — skills are all stackable
- Build: 3 clear trees (Damage / Crit / Utility) + Sharp Eye & Marathon
- Attribute “Skills” → **Utility**
- Premium: APN Pro ×1.25, 2× Boost (coins), coin packs (demo IAP)
- Economy mult = Live × Pro × Boost on damage + income + Ship
- Headless playthrough QA (`qa/playthrough.mjs`)

## [1.2.0] — 2026-07-13

### Added

- **Gear system**: weapon + armor drops (white→unique), boss guaranteed
- Gear permanent across End Season with Boosts + Live Mult
- Gear panel + bag equip UI

### Changed

- Dual eye scanners (no skull stick weapon)
- Soft hit bloom instead of square flash
- Soft Ramp/Overdrive glows (no ring lines)
- Zone + Rank bars moved into stage overlay
- Nav: Build · Ship · Gear · Boosts · Menu

## [1.1.0] — 2026-07-13

### Changed

- **Sprint** multiplies full sim speed (**×1.85**) — not just walk animation
- **Combat rebalance**: HP tracks pace weapon; multi-hit forever; weapon soft DR late
- **Ship Notes** renames confusing “Publish” (Notes → permanent Rep)
- **Boosts + Rep permanent** across End Season; **weapon fully resets** each season
- **Live Mult** multiplies combat damage (prestige always felt)
- Hover-collect orbs (prior)

### Tests

- Prestige permanence, sprint timeScale, multi-hit targets

## [1.0.0] — 2026-07-13

### Added

- Playable idle loop: combat, Signal, Notes, Rep, SP, Live Mult
- Upgrade Weapon, Build (Damage / Crit / Skills), Ship, Boosts
- Endless zones with 20-zone prestige checkpoints
- Hold Sprint (button + stage + Space) with attack-speed and damage buffs
- Host mascot, feed-noise enemies, LIVE ticker icons
- Canvas juice: biomes, confetti, floaters, death VFX
- WebAudio SFX + settings toggles
- Headless domain tests (`qa/run-tests.mjs`)
- GitHub CI, docs suite, MIT license
