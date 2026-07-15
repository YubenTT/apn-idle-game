# Changelog

All notable changes to APN Idle are documented here.

Format inspired by [Keep a Changelog](https://keepachangelog.com/).  
Versioning: [SemVer](https://semver.org/) for tagged releases.

## [Unreleased]

### Added

- Added the canonical Host WebGL2 render-lock and ten-pose runtime atlas, derived
  directly from the existing GLB with fixed camera, flat three-band shading, and
  one-pixel pivot/ratio/visor QA.
- Added a deterministic zero-npm asset pipeline for atlas layout, pivot/trim
  metadata, fixed WebP profiles, SHA-256 manifests, hot-pack ownership, and hard
  first-playable/per-pack size gates.
- Added deterministic active/idle pacing profiles and a silent Zone 1000/offline
  long-run gate. The Clean Era now measures 10.2 active-assisted hours or about
  2.4 mostly-idle calendar days before Corruption.
- Added 20 stable Clean Era Game Pack manifests, a byte-stable frozen runtime
  catalog, seeded different-genre season scheduling, and bounded corruption tiers.
- Accepted the catalog-driven Game Pack Route: 20 clean ten-zone packs, persistent
  world progress, bounded Corruption revisits, and one deterministic expansion path.
- Added ADR-0005 for GLB-locked hybrid Host rendering: image generation may guide
  pose/cleanup, while shipped geometry and pivots remain canonical GLB derivatives.
- Added a documentation contract test and a 32-issue, six-session autonomous
  implementation graph with a single final localhost review gate.

- **Design-system + docs backbone** (system-first redesign foundation; no runtime
  change — the vanilla ES + Canvas 2D game is untouched):
  - `brand/` design system — `tokens.css` (canonical CSS custom properties,
    reconciled with shipped hexes), `DESIGN-TOKENS.md`, `COMPONENTS.md`,
    `MASCOT-CANON.md`, `ART-DIRECTION.md`, `NAMING.md`
  - `docs/00_START_HERE.md` source-of-truth map · `VISION.md` (pillars + non-goals)
    · `SCREEN-SPECS.md` (mobile-first per-screen redesign) · `ART-PIPELINE.md` ·
    `PERF-BUDGET.md` · `QA-CHECKLIST.md` · `GLOSSARY.md` · `DEFINITION-OF-DONE.md` ·
    `DOC-UPDATE-POLICY.md`
  - `docs/REDESIGN-PLAN.md` — sequenced issue backlog (32 issues) grouped into 6
    autonomous delivery sessions, with per-issue acceptance criteria,
    dependencies, one final integrated user gate, and a release gate
  - `docs/decisions/` ADRs — **ADR-0001** keep vanilla ES + Canvas 2D (reject
    PixiJS/React rewrite), **ADR-0002** token-driven design system, **ADR-0003**
    GLB single-source mascot
- Runtime design-token foundation: `css/game.css` now imports `brand/tokens.css`;
  all 532 CSS color literals resolve through canonical or exact-value compatibility
  tokens, with a zero-dependency headless guard against regression.
- Economy-color contract for canonical Notes/SP values, explicit DOM roles,
  semantic Canvas tones, contrast floors, and retained primary-crimson roles.

### Changed

- Unified inline, Gear, and feed marks under one monochrome 2px rounded-stroke
  grammar; removed per-icon gradients/colors and added a static grammar gate.
- Reworked combat scaling around season-local Weapon power, bounded Route
  maturity, permanent-power budgeting, and soft boss timer cycles. Eight-hour
  offline rewards now stop Route progress at the next End Season boundary.
- Save schema v2 moves world progress from season-scoped `run` into persistent
  `route` state. End Season now keeps Route Zone and pack history.
- Loading checks v2 first and migrates v1 Zone/kills without deleting the legacy
  key; explicit New Game clears both keys.

- All font sizes, touch minimums, and safe-area values use exact design tokens.
  Screen-specific legacy geometry remains unchanged until its owning redesign issue.
- Notes now use canonical rose `#ff6a8f`; SP uses canonical violet `#b07cff`
  across HUD values, Ship/Hub rows, Build badges/costs, and Canvas floaters. Canvas
  token reads are cached, and small filled violet controls use dark ink.

### Tests

- Added CSS token-contract checks for first-rule import order, raw color literals,
  unresolved custom properties, and active canonical Notes/SP tokens.
- Added economy-role checks for legacy alias retirement, exact DOM selectors,
  cached Canvas role mapping, semantic domain events, and 4.5:1 contrast.
- Verified pixel-identical masked Run/Gear chrome against clean `origin/main` at
  428×926, 375×812, and 844×390 in a real browser.
- Reviewed the intentional I-002 browser diff against merged I-001 across Run,
  Build, Ship, and Hub at 375×812, 428×926, and 844×390 with zero console errors.

### Fixed

- Seeded the headless test RNG with the suite-local `0x41504e` (`APN`) seed so the
  three gear ordering assertions are reproducible without weakening them or
  changing production randomness.
- Corrected redesign backlog counts, dependencies, execution order, and session
  ownership so the repository plan matches the autonomous delivery control plane.

### Planned

- Save schema rename (bytes → signal) with migration
- PWA manifest
- Wire real IAP receipts for APN Pro / coin packs / boxes
- Rewarded-ad stubs (MindStudios monetization playbook)

## [1.7.2] — 2026-07-13

### Changed

- **Gear** removed from bottom nav → left in-stage **Bag** FAB
- Bottom nav is 5 tabs (Build · Ship · Hub · Boosts · Menu)
- Bag badge: inventory count / green when upgrades ready

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
