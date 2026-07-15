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
- [x] Deterministic seeded headless QA (including gear ordering assertions)
- [x] Host mascot + enemy sprites + GLB kit files

## Shipped (docs / system)

- [x] Design-system + docs backbone ([00_START_HERE](./00_START_HERE.md),
      [brand/](../brand/), [SCREEN-SPECS](./SCREEN-SPECS.md), ADRs) — system-first
      redesign foundation; runtime unchanged
- [x] Redesign control plane — 32 focused issues grouped into 6 autonomous
      delivery sessions with one final integrated evidence gate
- [x] Runtime token foundation — `brand/tokens.css` imported by `css/game.css`,
      532 color literals migrated with exact pixel preservation, and static token
      contract enforced in headless QA
- [x] Economy color de-collision — Notes use canonical rose and SP canonical
      violet across DOM + Canvas roles, with contrast and semantic-role QA

## Near term

- [x] Persistent global Route + dual-key save v2 migration; End Season keeps world progress
- [ ] Deterministic 20-pack catalog, multi-day pacing, and season-bounded offline progression
- [ ] Production asset pipeline, canonical Host atlas, 20 Clean Era Game Packs,
      and current+next lazy runtime composition
- [ ] Redesign screens against [SCREEN-SPECS](./SCREEN-SPECS.md) (Run HUD, Gear,
      Build, Ship, Hub, Boosts, Menu) — one screen at a time, each through
      [QA-CHECKLIST](./QA-CHECKLIST.md)
- [ ] Schema rename bytes→signal (with save migrate)
- [ ] Mobile layout polish + PWA manifest
- [ ] Daily login / offline claim UI polish
- [ ] More enemy variants + elite modifiers
- [ ] Analytics hooks (opt-in) for embed

## Mid term

- [ ] New clean Game Packs entering at End Season boundaries
- [ ] Higher Corruption tiers reusing the bounded mask system
- [ ] Skill tree visual map
- [ ] Accessibility: full keyboard sheet nav, ARIA live regions
- [ ] Optional ESBuild/Vite package for site monorepo — keep raw static entry

## Long term

- [ ] Optional higher-fidelity GLB-derived Host atlas tier if budgets permit
- [ ] Shared APN account cosmetics (site-linked)
- [ ] Challenge modes (boss rush, speed zones)
- [ ] Localization (i18n content packs)

## Explicit non-goals

- Pay-to-win combat power (if monetized, cosmetics only)
- Heavy multiplayer simulation
