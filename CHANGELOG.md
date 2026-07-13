# Changelog

All notable changes to APN Idle are documented here.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).  
Versioning: [SemVer](https://semver.org/) for tagged releases.

## [Unreleased]

### Planned

- Save schema rename (bytes → signal) with migration
- PWA manifest
- Wire real IAP receipts for APN Pro / coin packs

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
