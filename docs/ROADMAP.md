# Roadmap

Living plan — not a commitment calendar.

## Shipped (v1 playable)

- [x] Core combat + 1-enemy queue
- [x] Signal / Notes / Rep / SP / Live Mult
- [x] Build shop (attrs + skills + masks)
- [x] Publish + Boosts meta
- [x] Endless zones + 20-zone checkpoints
- [x] Sprint hold (button + stage + Space)
- [x] Juice: confetti, floaters, death, biomes, SFX
- [x] LIVE ticker with game icons
- [x] Headless domain tests + CI
- [x] Host mascot + enemy sprites + GLB kit files

## Shipped (docs / system)

- [x] Design-system + docs backbone ([00_START_HERE](./00_START_HERE.md),
      [brand/](../brand/), [SCREEN-SPECS](./SCREEN-SPECS.md), ADRs) — system-first
      redesign foundation; runtime unchanged

## Near term

- [ ] Wire `brand/tokens.css` into `css/game.css` (staged, visual-regression gated)
- [ ] Apply the 2 staged token changes (Notes → rose, SP → violet) during redesign
- [ ] Redesign screens against [SCREEN-SPECS](./SCREEN-SPECS.md) (Run HUD, Gear,
      Build, Ship, Hub, Boosts, Menu) — one screen at a time, each through
      [QA-CHECKLIST](./QA-CHECKLIST.md)
- [ ] Schema rename bytes→signal (with save migrate)
- [ ] Mobile layout polish + PWA manifest
- [ ] Daily login / offline claim UI polish
- [ ] More enemy variants + elite modifiers
- [ ] Analytics hooks (opt-in) for embed

## Mid term

- [ ] Season themes (art + enemy pack + ticker set)
- [ ] Hand-authored biome plates (replace procedural strips)
- [ ] Skill tree visual map
- [ ] Accessibility: full keyboard sheet nav, ARIA live regions
- [ ] Optional ESBuild/Vite package for site monorepo — keep raw static entry

## Long term

- [ ] GLB Host in WebGL/three overlay (optional quality tier)
- [ ] Shared APN account cosmetics (site-linked)
- [ ] Challenge modes (boss rush, speed zones)
- [ ] Localization (i18n content packs)

## Explicit non-goals

- Pay-to-win combat power (if monetized, cosmetics only)
- Heavy multiplayer simulation
