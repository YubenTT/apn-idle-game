<!-- go-live-v2-superseded -->
> **⚠ Superseded on the prestige model (go-live v2).** This document still describes the retired **Ship Notes + End Season** model. The current design is **Go Live** — a single atomic prestige checkpoint (first at zone 10, then every 20; see [ADR-0008](decisions/ADR-0008-go-live-sole-checkpoint.md)). Read it through **plan v2** (`docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-v2.md`) and **`docs/product/RECONCILIATION.md`**; where they disagree, they win. Non-prestige content here may still be accurate.

# Idle Design & Monetization Context (APN Idle)

**Archived:** 2026-07-13  
**Primary source:** [MindStudios — Idle Clicker Games: Best Practices for Idle Game Design and Monetization](https://games.themindstudios.com/post/idle-clicker-game-design-and-monetization/) (Apr 2024; authors Svitlana Varaksina, Ivan Dyshuk / Mind Studios Games)  
**Brand UI north star:** APN Gear mock (mascot + 4 equip cards + inventory grid) + successful idle references (AdVenture Capitalist, Idle Miner Tycoon, hybrid arcade idle like *Burger, Please!*).

This document preserves the **historical industry research context** used during
the redesign. Shipping monetization truth lives in [MONETIZATION](./MONETIZATION.md);
R-005 supersedes every Pro, coin, box, warp, and paid-power proposal below.

---

## 1. Genre truth (why this niche works)

- Idle remains top-tier by popularity (PC/mobile/console); strong on mobile.
- Short session length, low cognitive load, passive accumulation = high retention potential.
- Top-quartile idle D1 retention can reach ~**42%** — driven largely by FOMO on offline progress and daily goals.
- Time-to-ship for an idle is often **4–6 months**; browser prototypes can be lean. Success still requires deliberate design, not just a clicker loop.

---

## 2. Six design principles (MindStudios) → APN Idle

| Principle | What it means | APN Idle mapping |
|-----------|---------------|------------------|
| **Idle mechanics** | Passive resource accumulation is the core fantasy | Signal / Notes accrue while fighting & offline; Sprint = optional active juice |
| **Clean, simple UI** | Short sessions; focus on gameplay; no overflowing menus | Compact sheets; Gear mock layout; stats on hover/tap not wall-of-text |
| **Interesting “live” surroundings** | Players stare at the main screen 99% of time | LIVE ticker, combat stage juice, center loot card, Overdrive aura |
| **Clear progression indicators** | Always a reachable goal | Zone bars, Rank/SP, Signal upgrade CTA, Hub dailies, season checkpoints |
| **Balanced pacing** | Small frequent rewards early; larger rarer later | Early kills → Signal/SP; bosses → gear; End Season → Live Mult |
| **Smart resource management** | Strategic spend of currencies | Signal → Weapon; SP → Build; Notes → Ship → Rep → Boosts |

---

## 3. Retention strategies → APN status

| Strategy | Guidance | APN Idle |
|----------|----------|----------|
| **First impression** | Fast entry, early wins, hide advanced chrome until needed | Title → Play; early kills + first gear drop |
| **Daily tasks & bonuses** | Simple dailies; short sessions | Hub daily/weekly + season milestones |
| **Limited offline income** | Cap offline so players return (FOMO) | `OFFLINE_CAP` + one free efficiency curve |
| **Progressive difficulty & achievements** | Peek at locked content; scale challenge | Zones → Version Gate; Hub season track |
| **Social / competition** | Leaderboards, contests | *Future* — not core v1 |
| **Push notifications** | Tie to rewards/events; don’t spam | *Future* PWA / native |
| **Narrative & characters** | Charismatic cast, unfolding story | APN Host mascot; feed/noise fantasy; avoid silly spam |

---

## 4. Monetization research → launch decision

The study described common idle patterns such as speed-ups, ads, passes, and
boxes. R-005 deliberately does not ship those patterns. The MVP is free, has no
store or coin currency, and uses `Live Mult` as its only global economy
multiplier. Post-MVP work may study cosmetics, but paid progression remains a
non-goal. See [MONETIZATION](./MONETIZATION.md).

---

## 5. Balancing monetization vs experience

Dynamic rhythm of the economy:

1. Don’t keep players under constant pressure.
2. Let “goal reached” land and linger so success feels good.

APN rules of thumb:

- No ads / soft paywall pressure in first session.
- Worse gear never auto-equips.
- Gear drops never require a purchase path.
- Offline capped so return visits feel rewarding, not infinite AFK.

---

## 6. Analytics (what to measure later)

| Area | Metrics |
|------|---------|
| Behavior | Session length, panel opens (Gear/Hub/Build), Sprint hold rate |
| Pain | Softlock zones, abandon before first boss, bag full without sell |
| Post-MVP product | Cosmetic interest and APN account linkage; no paid-power funnel |
| Retention | D1/D7, return after offline modal, Hub claim rate |

Ship event hooks early even if no backend yet (`window` debug counters OK).

---

## 7. Case-study takeaways (references)

| Title | Lesson for APN |
|-------|----------------|
| **AdVenture Capitalist** | Satire + clear prestige; many “businesses” = our skills/boosts/zones |
| **Idle Miner Tycoon** | Core fantasy first (digging); money secondary — our “clear the feed” first, currencies support it |
| **Burger, Please!** / arcade idle | Live stage action + rewarded-video-friendly loops |
| **Pixel farm / collectible shop UIs** | Big readable item cards, rarity borders, gold sinks, inventory as product |

---

## 8. APN brand UI north star (Gear mock)

Target Gear sheet (owner mock):

```text
┌─────────────────────────────────────────────┐
│ Gear                                      ✕ │
│  [Host]  [WEAPON] [CHEST] [LEGS] [VISOR]    │
│          name + primary stat + rarity frame │
│ INVENTORY 8/24              [Rarity ▾]      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│  │art │ │art │ │art │ │art │  4-col cards  │
│  │name│ │    │ │    │ │    │               │
│  │+stat│ │    │ │    │ │    │               │
│  └────┘ └────┘ └────┘ └────┘               │
│  Tap for stats · Hold to sell junk          │
└─────────────────────────────────────────────┘
```

### Loadout slots (brand)

| Slot | Fantasy | Stats (real systems only) | Card primary |
|------|---------|---------------------------|--------------|
| **Weapon** | Scanner / beam | Damage · Crit · Atk Speed | **Damage** |
| **Chest** | Vest / shell | Energy · Notes · Signal | **Energy** |
| **Legs** | Leggings | Sprint (move) · Atk Speed · Regen | **Sprint** |
| **Visor** | Optics | Crit · Signal · light Damage | **Crit** |

There is **no Defense** — APN Idle has no tank layer. Energy is the sprint stamina pool.

Inventory also holds **modules/charms** (bag-only or future module slot): Arrow Module, Shield Patch, Signal Amp, Archive Charm — sellable junk or equip when slot empty/better.

### Interaction

- **Tap** equipped or bag → detail (compare Equip / Swap)
- **Hold ~0.55s** on bag junk → sell for Signal
- Hover (desktop) → full affix tooltip
- Never auto-equip worse score
- No purchase surface in the free MVP Menu

---

## 9. System checklist (target state)

### Done / shipping direction

- [x] Idle combat + Sprint
- [x] Signal / Notes / Rep / Live Mult prestige
- [x] Build attributes + skills (no masks)
- [x] Hub dailies/weeklies/season
- [x] Multi-slot permanent gear + sell junk
- [x] Free MVP cut: no Pro, coin packs, paid boosts, warp, or Gear Boxes
- [x] Center loot card (no name spam)

### Brand polish (this pass)

- [x] 4-slot brand loadout (Weapon · Chest · Legs · Visor)
- [x] Card-style inventory matching mock
- [x] Hold-to-sell
- [x] Primary stat labels (Signal / Defense / Sprint)
- [x] Docs archive (this file)

### Later

- [ ] Cosmetic-only product study after MVP retention evidence
- [ ] Analytics events
- [ ] Real entitlement/restore design only if a later cosmetic product is approved
- [ ] Social / leaderboards

---

## 10. Copy & voice

- Prefer player verbs: Upgrade Weapon, Ship Notes, Equip, Sell.
- HUD: Signal · Notes · Rep · DPS (not internal `bytes` jargon).
- Comedy optional; never blocks systems.
- Purchase language is absent from the free MVP.

---

## 11. Implementation map

| Concern | Code |
|---------|------|
| Gear roll / slots / sell | `js/loot.js`, `js/game.js` |
| Free MVP economy contract | `js/game.js`, `qa/run-tests.mjs` |
| Gear + Menu UI | `js/ui.js`, `css/game.css` |
| Save migrate slots | `js/save.js` → `normalizeGear` |
| Monetization product truth | `docs/MONETIZATION.md` |
| This context | `docs/IDLE-DESIGN-CONTEXT.md` |

---

## 12. Source attribution

MindStudios article used as industry practice reference (not affiliated). Case studies named for design literacy only. APN Idle product decisions and brand remain independent.
