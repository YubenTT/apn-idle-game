<!-- go-live-v2-superseded -->
> **⚠ Superseded on the prestige model (go-live v2).** This document still describes the retired **Ship Notes + End Season** model. The current design is **Go Live** — a single atomic prestige checkpoint (first at zone 10, then every 20; see [ADR-0008](decisions/ADR-0008-go-live-sole-checkpoint.md)). Read it through **plan v2** (`docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-v2.md`) and **`docs/product/RECONCILIATION.md`**; where they disagree, they win. Non-prestige content here may still be accurate.

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
- [x] Redesign control plane — the original 33 focused issues plus R-005,
      grouped into 7 autonomous delivery sessions with one visual-owner gate
- [x] Runtime token foundation — `brand/tokens.css` imported by `css/game.css`,
      532 color literals migrated with exact pixel preservation, and static token
      contract enforced in headless QA
- [x] Economy color de-collision — Notes use canonical rose and SP canonical
      violet across DOM + Canvas roles, with contrast and semantic-role QA

## Near term

- [x] Build V2 domain: named Scan/Verify/Relay axes, derived Mastery, exact v3
      SP refund, and three seeded Zone-200 profiles (PR-4a / issue #21)
- [ ] Build V2 presentation + Priority Tag behavior (PR-4b / issue #22)

- [x] Persistent global Route + dual-key save v2 migration; End Season keeps world progress
- [x] Deterministic 20-pack manifest catalog + seeded least-recent scheduler
- [x] Multi-day pacing and season-bounded offline progression
- [x] Production asset pipeline, canonical Host atlas, 20 Clean Era Game Packs,
      and current+next lazy runtime composition
- [x] Redesign screens against [SCREEN-SPECS](./SCREEN-SPECS.md) (Run HUD, Gear,
      Build, Ship, Hub, Boosts, Menu) — one screen at a time, each through
      [QA-CHECKLIST](./QA-CHECKLIST.md)
- [ ] Schema rename bytes→signal (with save migrate)
- [x] Mobile layout polish, safe-area coverage, and long-press gesture hardening
- [x] Free MVP economy cut: no demo store, paid power, coin rewards, Gear Boxes,
      Auto-Sprint unlock, or Time Warp; old premium save data remains inert
- [ ] PWA manifest
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
- [ ] Evidence-led cosmetic monetization proposal; no paid progression power
- [ ] Challenge modes (boss rush, speed zones)
- [ ] Localization (i18n content packs)

## Explicit non-goals

- Pay-to-win combat power (if monetized, cosmetics only)
- Heavy multiplayer simulation
