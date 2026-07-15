# Redesign execution plan — issue backlog

> The system is locked ([design-system + docs backbone](./00_START_HERE.md)). This
> is the **execution plan**: the redesign broken into small, sequenced, testable
> issues. **One issue = one PR = one focused change**, and every issue ships only
> through the [QA-CHECKLIST](./QA-CHECKLIST.md) + [DEFINITION-OF-DONE](./DEFINITION-OF-DONE.md).
>
> Stack is settled — vanilla ES + Canvas 2D ([ADR-0001](./decisions/ADR-0001-vanilla-stack.md)).
> Every issue references the doc that is its source of truth; if the doc and the
> issue disagree, the doc wins.

## How to read an issue

Each issue card has: **Goal · Scope · Acceptance criteria (checkboxes) · Files ·
Source docs · Out of scope**. An issue is *ready* only when its acceptance criteria
are written as checkable statements (no "make Gear better"). It is *done* only when
every box is ticked and `node qa/run-tests.mjs` is green.

**Legend** — Priority: 🔴 Must · 🟡 Fix · ⚪ Optional. Size: S ≤ ½ day · M ≈ 1–2 days
· L ≈ 3–5 days · XL ≈ 1–1.5 weeks (single contributor, includes art where noted).

## Autonomous delivery sessions

The original 33 focused issues plus release issue R-005 still land as one issue =
one PR, but execution is grouped into seven long-running delivery sessions in one autonomous chain. Sessions are
work packages, not separate chats or one-agent-per-issue handoffs.

| Session | Issues / work | Outcome | User action |
|--------:|---------------|---------|-------------|
| 1 | I-000–I-002 | Deterministic QA + token foundation | None |
| 2 | I-003–I-006 | Route state, catalog, scheduler, pacing | None |
| 3 | I-041, I-030, I-031, I-032A–D | Asset pipeline, canonical Host, production pack art | None |
| 4 | I-007, I-021, I-010–I-014 | Runtime packs, Gear, Run hero experience | None |
| 5 | I-020, I-022, I-023, I-025, I-024 | Decision sheets | None |
| 6 | I-033, I-034, I-040, I-042, I-044, I-043, I-045 | Remaining art, feel, copy, nav, integrated QA, physical-input hardening | **Final integrated evidence review** |
| 7 | R-005 | Free MVP economy cut and release re-verification | None |

The original Session 6 review is complete. R-005 is verified autonomously against
its negative economy contract and muted browser evidence. The next single user gate is the Host V2 motion proof; no creature, item, or runtime Host replacement
may proceed before that visual-owner approval.

## Phasing (dependency waves — do in order)

```
Wave 0A Foundation → tokens    I-000 → I-002
Wave 0B Route → production    I-003 → I-006 → I-041 → I-030 → I-031 → I-032A–D → I-007
Wave 1  Collection vertical   I-021
Wave 2  Run screen (hero)      I-010 → I-014
Wave 3  Sheets (decisions)     I-020, I-022–I-025
Wave 4  Remaining art/feel/QA I-033, I-034, I-040, I-042 → I-044 → I-043 → I-045
Release hardening               R-005
```

Locked execution order:
`I-000 → I-001 → I-002 → I-003 → I-004 → I-005 → I-006 → I-041 → I-030 →
I-031 → I-032A → I-032B → I-032C → I-032D → I-007 → I-021 → I-010 → I-011 →
I-012 → I-013 → I-014 → I-020 → I-022 → I-023 → I-025 → I-024 → I-033 →
I-034 → I-040 → I-042 → I-044 → I-043 → I-045 → R-005`.

Rule: **do not start a wave until the prior wave's 🔴 Must issues are merged.** The
approved asset system now precedes UI implementation so the Run and Gear slices
are built once against production contracts. The chain stays linear.

## Master issue table

| ID | Epic | Title | Pri | Size | Depends on | Source of truth |
|----|------|-------|:---:|:----:|------------|-----------------|
| I-000 | Foundation | Deterministic QA baseline + backlog integrity | 🔴 | S | — | [QA-CHECKLIST](./QA-CHECKLIST.md) |
| I-001 | Foundation | Wire `tokens.css` into `game.css` (staged) | 🔴 | M | I-000 | [DESIGN-TOKENS](../brand/DESIGN-TOKENS.md) |
| I-002 | Foundation | Apply 2 token changes (Notes→rose, SP→violet) | 🔴 | S | I-001 | [DESIGN-TOKENS §Change](../brand/DESIGN-TOKENS.md) |
| I-003 | Foundation | Accept Route program + backlog graph | 🔴 | S | I-002 | [ADR-0004](./decisions/ADR-0004-game-pack-route.md) |
| I-004 | Foundation | Persistent global Route + save v2 migration | 🔴 | L | I-003 | [ARCHITECTURE](./ARCHITECTURE.md) |
| I-005 | Foundation | Game Pack catalog + deterministic scheduler | 🔴 | L | I-004 | [GAME-PACK-ROUTE](./GAME-PACK-ROUTE.md) |
| I-006 | Foundation | Multi-day pacing + bounded offline progression | 🔴 | L | I-005 | [BALANCE](./BALANCE.md) |
| I-007 | Foundation | Lazy Game Pack loader + Canvas composition | 🔴 | L | I-032D | [ARCHITECTURE](./ARCHITECTURE.md), [PERF-BUDGET](./PERF-BUDGET.md) |
| I-010 | Run | Resource strip around notch (Signal/Notes/SP) | 🔴 | M | I-001 | [SCREEN-SPECS §RUN](./SCREEN-SPECS.md) |
| I-011 | Run | Feed rail (single line, run-context) | 🔴 | M | I-001 | [SCREEN-SPECS §RUN](./SCREEN-SPECS.md) |
| I-012 | Run | Stage header (Zone/Rank/Live compact) | 🔴 | M | I-010 | [SCREEN-SPECS §RUN](./SCREEN-SPECS.md) |
| I-013 | Run | Patchline stage framing + juice | 🔴 | L | I-012 | [SCREEN-SPECS §RUN](./SCREEN-SPECS.md), [ART-DIRECTION](../brand/ART-DIRECTION.md) |
| I-014 | Run | Action dock (1 CTA + mod + skills) | 🔴 | M | I-010 | [SCREEN-SPECS §RUN](./SCREEN-SPECS.md), [NAMING](../brand/NAMING.md) |
| I-020 | Sheets | Build sheet skill cards (delta/ROI) | 🔴 | M | I-001 | [SCREEN-SPECS §BUILD](./SCREEN-SPECS.md) |
| I-021 | Sheets | Gear + inventory redesign | 🔴 | XL | I-001 | [SCREEN-SPECS §GEAR](./SCREEN-SPECS.md), [ART-DIRECTION](../brand/ART-DIRECTION.md) |
| I-022 | Sheets | Ship prestige transparency + confirm | 🔴 | M | I-001 | [SCREEN-SPECS §SHIP](./SCREEN-SPECS.md), [NAMING](../brand/NAMING.md) |
| I-023 | Sheets | Hub live-ops board (claim states) | 🔴 | M | I-001 | [SCREEN-SPECS §HUB](./SCREEN-SPECS.md) |
| I-024 | Sheets | Boosts ROI tree | 🟡 | M | I-001 | [SCREEN-SPECS §BOOSTS](./SCREEN-SPECS.md) |
| I-025 | Sheets | Menu split (settings/store/reset) | 🔴 | M | I-001 | [SCREEN-SPECS §MENU](./SCREEN-SPECS.md), [MONETIZATION](./MONETIZATION.md) |
| I-030 | Art | Mascot canon pass (single-source) | 🔴 | L | — | [MASCOT-CANON](../brand/MASCOT-CANON.md), [ADR-0003](./decisions/ADR-0003-mascot-single-source.md) |
| I-031 | Art | 2D art grammar + icon unify | 🔴 | M | — | [ART-DIRECTION](../brand/ART-DIRECTION.md) |
| I-032A | Art | Game Packs 01–05 production set | 🟡 | L | I-031 | [GAME-PACK-ASSET-BIBLE](./GAME-PACK-ASSET-BIBLE.md) |
| I-032B | Art | Game Packs 06–10 production set | 🟡 | L | I-032A | [GAME-PACK-ASSET-BIBLE](./GAME-PACK-ASSET-BIBLE.md) |
| I-032C | Art | Game Packs 11–15 production set | 🟡 | L | I-032B | [GAME-PACK-ASSET-BIBLE](./GAME-PACK-ASSET-BIBLE.md) |
| I-032D | Art | Game Packs 16–20 production set | 🟡 | L | I-032C | [GAME-PACK-ASSET-BIBLE](./GAME-PACK-ASSET-BIBLE.md) |
| I-033 | Art | Item art set (techwear families) | 🟡 | L | I-031, I-021 | [ART-DIRECTION §Items](../brand/ART-DIRECTION.md) |
| I-034 | Art | Backgrounds (APN editorial cityline) | 🟡 | L | I-031 | [ART-DIRECTION §Backgrounds](../brand/ART-DIRECTION.md) |
| I-040 | Feel | Motion / haptic / SFX pass | 🟡 | M | Wave 1 | [DESIGN-TOKENS §Motion](../brand/DESIGN-TOKENS.md) |
| I-041 | Pipeline | Asset pipeline + size gates | 🟡 | M | I-006 | [ART-PIPELINE](./ART-PIPELINE.md), [PERF-BUDGET](./PERF-BUDGET.md) |
| I-042 | Copy | Copy + naming pass (all screens) | 🔴 | S | Wave 1–2 | [NAMING](../brand/NAMING.md), [GLOSSARY](./GLOSSARY.md) |
| I-043 | QA | Device matrix + visual regression | 🔴 | M | I-042, I-044 | [QA-CHECKLIST](./QA-CHECKLIST.md) |
| I-044 | Nav | Keep-5 navigation refinement + implementation | 🟡 | S | I-010 | [SCREEN-SPECS §Navigation](./SCREEN-SPECS.md) |
| I-045 | QA | Mobile long-press gesture hardening | 🔴 | S | I-043 | [QA-CHECKLIST](./QA-CHECKLIST.md) |
| R-005 | Release | Free MVP economy cut | 🔴 | S | I-045 | [MONETIZATION](./MONETIZATION.md) |

## Effort roll-up

| Priority | Issues | Rough range |
|----------|-------:|------------:|
| 🔴 Must | 24 | measured issue-by-issue |
| 🟡 Fix | 10 | measured issue-by-issue |
| ⚪ Optional | (seasonal swaps, cosmetics, PWA — see ROADMAP) | ~60–90 h |

The previous speculative hour ranges are retired. Completion is evidence-based:
acceptance boxes, fresh tests, browser proof, and one focused commit per issue.

---

# Issue detail cards

## Wave 0 — Foundation

### I-000 · Deterministic QA baseline + backlog integrity — 🔴 S
- **Goal:** every redesign issue starts from a reproducible test and an internally
  consistent execution plan.
- **Scope:** install a suite-local seeded RNG in `qa/run-tests.mjs`; preserve the
  three gear assertions; correct issue/wave/session counts, dependencies, and the
  locked execution order in this backlog.
- **Acceptance:**
  - [x] The pre-fix failure is reproduced with a controlled seed: the same three
        gear assertions fail together.
  - [x] Test randomness is seeded locally with `0x41504e` (`APN`); production RNG
        behavior is untouched.
  - [x] `worse weapon stays bag`, `best weapon kept`, and `weak in bag` remain
        unchanged and pass reproducibly.
  - [x] Ten consecutive suite runs produce one output hash and end `ALL PASS`.
  - [x] Backlog truth is explicit: 33 issues, 23 Must + 10 Fix, 6 delivery
        sessions, and one final integrated user gate.
- **Files:** `qa/run-tests.mjs`, `docs/REDESIGN-PLAN.md`, `docs/ROADMAP.md`,
  `CHANGELOG.md`.
- **Out of scope:** production/gameplay RNG, gear balance, UI changes, runtime
  dependencies.

### I-001 · Wire `tokens.css` into `game.css` (staged) — 🔴 M
- **Goal:** make the token layer authoritative for the UI palette and shared type,
  touch, and safe-area primitives; owning screen issues migrate their layout geometry.
- **Scope:** `@import "../brand/tokens.css"` at the top of `css/game.css`; swap
  literals for `var(--…)` region by region (surfaces → text → economy → components),
  using an exact-value compatibility bridge where canonical values would drift.
- **Acceptance:**
  - [x] `tokens.css` imported; app renders identically pre-swap (additive).
  - [x] Each swapped region passes screenshot diff: controlled Run/Gear chrome is
        pixel-identical to clean `origin/main` at 428×926, 375×812, and 844×390
        after masking live Canvas/state content, so its relationship to the
        historical `qa/screenshots/` references is unchanged.
  - [x] No raw hex, color function, or named palette literal remains in
        `game.css`; static QA prevents regression (`transparent` / `currentColor`
        remain valid CSS controls).
  - [x] Every `font-size` plus shared touch and safe-area primitives use tokens;
        legacy screen geometry remains frozen for its owning redesign issue.
  - [x] Notes and SP retain shipped values for the focused I-002 change.
  - [x] `node qa/run-tests.mjs` green.
- **Files:** `css/game.css`, `brand/tokens.css`, `brand/DESIGN-TOKENS.md`,
  `qa/check-css-tokens.mjs`, `qa/run-tests.mjs`, plan/status docs.
- **Out of scope:** the 2 value changes (that's I-002); new layouts.

### I-002 · Apply the 2 token changes — 🔴 S
- **Goal:** de-collide Notes and SP from primary crimson.
- **Scope:** Notes → `--c-notes` rose; SP → `--c-sp` violet, everywhere they render.
- **Acceptance:**
  - [x] Notes value/pills/floaters use rose; SP badges/costs use violet.
  - [x] No remaining crimson is used for a Notes or SP role; APN primary,
        combat/crit, PATCH/LIVE, generic Hub badge, and unique rarity stay crimson.
  - [x] Contrast floors still met: Notes is 7.01:1 and SP is 6.52:1 on shipped
        ink; filled violet badges/costs use dark ink.
  - [x] Controlled real-browser diff reviewed against merged I-001 at Run
        428×926, Run/Build 375×812, Run/Build 844×390, Ship 375×812, and Hub
        375×812. Computed colors match the locked tokens, layout is unchanged,
        and browser console errors are zero. The approved board closes this
        historical preproduction check; Session 6 is the sole remaining user gate.
  - [x] Semantic Canvas proof renders Notes/SP floaters through a cached
        `render.js` token map; domain events carry roles, not palette values.
  - [x] `node qa/run-tests.mjs` green with the economy-color contract.
- **Files:** `brand/tokens.css`, `css/game.css`, `js/game.js`, `js/render.js`,
  `js/ui.js`, `qa/check-css-tokens.mjs`, `qa/check-economy-colors.mjs`,
  `qa/run-tests.mjs`, plan/status docs.

## Wave 0B — Route and production foundation

### I-003 · Accept Route program + backlog graph — 🔴 S
- **Goal:** remove contradictory product/art rules and lock one executable graph.
- **Acceptance:**
  - [x] ADR-0004 is Accepted; VISION and ART-DIRECTION agree with it.
  - [x] ADR-0005 preserves GLB geometry while defining the approved hybrid reference boundary.
  - [x] Backlog contains all 33 focused issues in dependency order with only one final user gate.
  - [x] Approved concept proofs are registered as review evidence, not runtime assets.
  - [x] `node qa/check-doc-contracts.mjs` and `node qa/run-tests.mjs` pass.
- **Files:** owning design/art docs, ADR-0004/0005, backlog, proof registry, QA contract.
- **Out of scope:** save/runtime/balance changes.

### I-004 · Persistent global Route + save v2 migration — 🔴 L
- **Goal:** world progress survives End Season and legacy saves load without loss.
- **Acceptance:**
  - [x] `s.route` owns zone, pack history, seed, deck, and catalog version; `s.run.zone` is retired.
  - [x] v1 Zone/kills migrate deterministically to v2; malformed fields sanitize safely.
  - [x] v2 writes to a new key while the legacy key remains rollback evidence.
  - [x] End Season resets run power but never global Route progress.
  - [x] Fresh, v1→v2, malformed, and round-trip tests pass.
- **Files:** `js/route.js`, `js/game.js`, `js/save.js`, `js/formulas.js`, QA, architecture.

### I-005 · Game Pack catalog + deterministic scheduler — 🔴 L
- **Goal:** make packs stable content records, never renderer-selected array slots.
- **Acceptance:**
  - [x] Twenty manifests generate one byte-stable catalog with unique string IDs.
  - [x] A pack defines 10 zones, five target roles, one boss, assets, pivots, genre, and source board.
  - [x] First Clean Era order is locked; new packs debut Clean at season boundaries only.
  - [x] Revisits use seeded least-recent scheduling without adjacent duplicate pack/genre.
  - [x] Catalog generation, scheduler QA, and primary suite pass.
- **Files:** pack manifests/catalog, `scripts/assets/generate-catalog.mjs`, `js/route.js`, QA.

### I-006 · Multi-day pacing + bounded offline progression — 🔴 L
- **Goal:** make the 200-zone Clean Era last days without timers or infinite offline skips.
- **Acceptance:**
  - [x] Seeded active/idle profiles meet the windows in GAME-PACK-ROUTE.
  - [x] Eight-hour offline simulation stops at the next End Season boundary and reports overflow.
  - [x] Zone 1000 has finite math, no hard wall, deterministic save, and valid pack order.
  - [x] UI/render receive formatted outputs and invent no balance values.
  - [x] Primary suite ends `ALL PASS`; long-run suite ends `LONG RUN PASS`.
- **Files:** formulas/game, long-run QA, pacing profiles, BALANCE, Route doc.

### I-007 · Lazy Game Pack loader + Canvas composition — 🔴 L
- **Goal:** render production packs fluently while decoding at most current + next.
- **Acceptance:**
  - [x] Loader preloads current/next, releases cold packs, deduplicates decodes, and has a safe fallback.
  - [x] Canvas consumes scheduled pack data; procedural biome selection is removed from the happy path.
  - [x] Host stays left, target enters from right, shared ground/pivots remain stable.
  - [x] Pack transitions at 1/10/11/20/200/201 pass loader and muted Chrome evidence.
  - [x] Asset, loader, primary, and performance gates pass.
- **Files:** `js/assets.js`, main/render/game, loader QA, architecture, performance budget.

## Wave 1 — Run screen

### I-010 · Resource strip around notch — 🔴 M
- **Goal:** the running HUD shows only what the player acts on: Signal / Notes / SP.
- **Scope:** notch-aware resource strip (44pt); drop "APN Idle" wordmark from run
  HUD; move **Rep** to Ship/Boosts context and **DPS** to a stats peek.
- **Acceptance:**
  - [x] Signal (left), Notes + SP (right), center cutout reserved via safe-area.
  - [x] Wordmark absent from run HUD; brand held by component discipline.
  - [x] Rep and DPS no longer in the run strip.
  - [x] Chips = resource-chip component, `tabular-nums`, no gradient.
  - [x] No safe-area overflow on notch device (portrait + landscape).
- **Files:** `index.html`, `css/game.css`, `js/ui.js`.

### I-011 · Feed rail — 🔴 M
- **Goal:** one-line live APN feed that carries run context, not a news marquee.
- **Acceptance:**
  - [x] Single row: source mark 16 · game name 15 · type pill 20–22.
  - [x] Clean truncation; never wraps; type pills use content-type tokens.
  - [x] Reads as "what's live now," tied to the run (not a scrolling website header).
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/content.js` (TICKER).

### I-012 · Stage header — 🔴 M
- **Goal:** Zone / Rank / Live folded into a compact strip **inside** the stage card.
- **Acceptance:**
  - [x] Zone + Rank + Live in one stage-header strip; Rank reads as in-run growth.
  - [x] Each bar means one thing (Zone ≠ Rank), ≥3:1 contrast, ≥8px track.
  - [x] Top HUD no longer carries separate Zone/Rank cards.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`.

### I-013 · Patchline stage framing + juice — 🔴 L
- **Goal:** the stage reads as gameplay, not a dark placeholder.
- **Acceptance:**
  - [x] Camera framing keeps mascot + target both legible at portrait size.
  - [x] Enemy HP is a clear banner over the target; name legible.
  - [x] Damage numbers anchor to the target (not floating loose top-of-stage).
  - [x] Loot flies to the HUD chip it credits.
  - [x] Background reads APN editorial (billboards/signal-rail/skyline), no generic neon glow.
- **Files:** `js/render.js`, `js/game.js` (anchors/floaters), `assets/stage/*`.
- **Out of scope:** final hand-painted plates (that's I-034); use current biomes retuned.

### I-014 · Action dock — 🔴 M
- **Goal:** one clear decision — weighted controls.
- **Acceptance:**
  - [x] One primary CTA (56pt crimson): **Upgrade Weapon** · `+x · Lv n→n+1` · cost chip.
  - [x] Sprint is a lighter *mod* control, not CTA weight; Overdrive is a toggle.
  - [x] 3–4 skill buttons, equal secondary weight.
  - [x] No "Upgrade Signal" (or any currency-named CTA) anywhere ([NAMING](../brand/NAMING.md)).
  - [x] Only one primary-crimson element on screen (CTA), not competing with active tab.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`.

## Wave 2 — Sheets

### I-021 · Gear + inventory redesign — 🔴 XL (do first — biggest ROI)
- **Goal:** turn the weakest surface into the collection hook (desire, not placeholder).
- **Acceptance:**
  - [x] Left niche shows the **canonical mascot** (per MASCOT-CANON) on a subtle spotlight.
  - [x] Equipped cards per slot with real item art (no placeholder pictograms).
  - [x] 5-column portrait inventory grid, 72×72 slots, rarity accent on corners/edges.
  - [x] States: empty · filled · selected · compare-highlight · junk.
  - [x] Flows work: equip · compare-delta · sort · filter · scrap, all persist on reload.
  - [x] Zero "hover" copy; zero placeholder slots.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/loot.js`, `assets/items/*`.
- **Source:** [SCREEN-SPECS §GEAR](./SCREEN-SPECS.md); item art tracked in I-033.

### I-020 · Build sheet skill cards — 🔴 M
- **Acceptance:**
  - [x] Each skill row = card: icon · name · ROLE-tag · current→next · SP cost · unlock/ROI.
  - [x] Attribute cards show what the next point *opens*, not bare `+`.
  - [x] SP badge shows affordability; crimson marks primary progression only.
  - [x] No red-outline-everything; most rows neutral + positive affordance cue.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/content.js`, `js/icons.js`.

### I-022 · Ship prestige transparency — 🔴 M
- **Acceptance:**
  - [x] Summary preview: Notes · rate · Mult · End-Season bonus · **You'll gain +Rep**.
  - [x] Explicit **what resets / what is kept** list shown before any destructive step.
  - [x] End Season is lower weight than Ship CTA + routes through preview/confirm.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/game.js`.

### I-023 · Hub live-ops board — 🔴 M
- **Acceptance:**
  - [x] Tasks grouped Daily / Weekly / Season.
  - [x] States legible: claimable (prominent positive) vs claimed (muted) vs locked.
  - [x] Reward pills readable; season milestones clearly clickable-or-not.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/hub.js`.

### I-024 · Boosts ROI tree — 🟡 M
- **Acceptance:**
  - [x] Each row shows current→next delta + affordability + a value cue.
  - [x] Category grouping + a "recommended" cue; Rep header feels permanent-growth.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/content.js`.

### I-025 · Menu split — 🔴 M
- **Acceptance:**
  - [x] Sections separated: Accessibility · Audio · Account · Reset; the original
        demo Purchases section is superseded by R-005 for launch.
  - [x] Debug string `Damage n·Crit n·Utility n` removed from player UI.
  - [x] Toggles use the component-library switch (not mismatched checkbox).
  - [x] Legal remains under Account; no demo purchase or restore surface ships.
  - [x] `New Game` low-weight, bottom, behind confirm.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`.

## Wave 3 — Art system

### I-030 · Mascot canon pass — 🔴 L
- **Acceptance:**
  - [x] Every mascot appearance passes **Silhouette QA** (same ratio/visor/perspective/outline).
  - [x] Run and Gear use the GLB-derived atlas/idle derivative under one render-lock.
  - [x] Ten poses share a one-pixel foot pivot, 3% ratio bound, and non-empty visor.
  - [x] AI studies are reference only; shipped pixels come from the canonical GLB renderer.
- **Files:** `assets/mascot/*`, `assets/mascot-*.png/.webp`, `js/render.js`.

### I-031 · 2D art grammar + icon unify — 🔴 M
- **Acceptance:**
  - [x] Inline and feed marks use one monochrome currentColor grammar without gradients.
  - [x] Icon set has a constant 2px stroke, rounded terminals, and low interior detail.
  - [x] Static icon QA is part of the primary suite.
- **Files:** `js/icons.js`, `assets/icons/*`.

### I-032A–D · Game Pack production sets — 🟡 L each
- **Goal:** ship all 20 Clean Era packs without one giant art commit.
- **Scope:** A = packs 01–05; B = 06–10; C = 11–15; D = 16–20.
- **Status:** I-032A ✅ · I-032B ✅ · I-032C ✅ · I-032D ✅
- **Acceptance for every sub-issue:**
  - [x] Each pack has five target roles, one boss, one break state, a layered environment, props, and bounded masks.
  - [x] Every asset passes 72/128 px silhouette, shared grammar, direction, pivot, manifest, and size gates.
  - [x] Source-board evidence is recorded; no official logo or source screenshot ships.
  - [x] Catalog and asset generation are byte-stable and all automated suites remain green.
- **Files:** `assets/game-packs/<pack-id>/*`, asset QA, asset bible.

### I-033 · Item art set — 🟡 L
- **Acceptance:**
  - [x] 12 items in the 3 material families (matte polymer / laminated paper / anodized metal).
  - [x] No fantasy materials; art matches slot names already in Gear.
- **Files:** `assets/items/*`, `js/loot.js`.

### I-034 · Backgrounds — 🟡 L
- **Acceptance:**
  - [x] APN editorial cityline (billboards/signal rails/patchline/archive lights).
  - [x] Fits [PERF-BUDGET](./PERF-BUDGET.md) background-atlas budget.
- **Files:** `assets/stage/backgrounds/*`, `js/render.js` (BIOMES).

## Wave 4 — Feel · pipeline · QA

### I-040 · Motion / haptic / SFX pass — 🟡 M
- **Acceptance:** [x] hit/crit/loot/rank-up/sheet-open/afford cues; all gated by
  reduced-motion (OS + in-app). Files: `js/sfx.js`, `js/render.js`, `js/game.js`.

### I-041 · Asset pipeline + size gates — 🟡 M
- **Acceptance:**
  - [x] Optional dev scripts preserve trim, source size, and foot pivots.
  - [x] Missing-pivot, out-of-bounds, oversized, and third-hot-pack cases fail by name.
  - [x] WebP conversion uses fixed q82/q78 profiles through argument-safe tools.
  - [x] `assets/manifest.json` generation is SHA-256 byte-stable across two runs.
  - [x] Runtime stays zero-npm and the primary suite includes the asset gate.
- **Files:** `scripts/assets/*`, `qa/check-assets.mjs`, `assets/manifest.json`.

### I-042 · Copy + naming pass — 🔴 S
- **Acceptance:** [x] every screen object·effect·cost; no debug/hover/"Upgrade Signal";
  terms match [GLOSSARY](./GLOSSARY.md); "Mana Flow"/`mana` renamed. Files: `js/content.js`, `js/ui.js`.

### I-043 · Device matrix + visual regression — 🔴 M
- **Acceptance:** [x] all [QA-CHECKLIST](./QA-CHECKLIST.md) gates green on the device
  matrix; screenshot diffs refreshed + approved. Files: `qa/*`.

### I-044 · Keep-5 navigation refinement + implement — 🟡 S
- **Acceptance:** [x] record locked Option A in an ADR; keep Build · Ship · Hub ·
  Boosts · Menu with the Gear FAB; use a minimal active fill; keep one
  primary-crimson element per screen. Files: `docs/decisions/ADR-0007-*.md`,
  `index.html`, `css/game.css`, `js/ui.js`.

### I-045 · Mobile long-press gesture hardening — 🔴 S
- **Goal:** a hold or imprecise drag remains a game gesture and never becomes
  Safari text/object selection, a native callout, or media dragging.
- **Acceptance:**
  - [x] Document descendants disable standard and WebKit selection plus iOS
        touch callouts; Canvas/media disable WebKit native dragging.
  - [x] No global `touch-action: none`; Gear sheet scrolling and native select
        controls remain functional.
  - [x] Canvas/Sprint retain intentional pointer ownership; Sprint releases to
        `aria-pressed="false"` with no held state.
  - [x] `qa/check-mobile-gestures.mjs` fails before and passes after the fix;
        `node qa/run-tests.mjs` ends `ALL PASS`.
  - [x] Physical iOS Safari recheck shows no selection handles or callout after
        long-pressing the Run stage, HUD, CTA, navigation, and an open sheet.
- **Files:** `css/game.css`, `index.html`, `qa/check-mobile-gestures.mjs`,
  `qa/run-tests.mjs`.
- **Out of scope:** layout, copy, art, balance, save, or navigation changes.

## Release hardening

### R-005 · Free MVP economy cut — 🔴 S
- **Goal:** return the launch build to the no-pay-to-win product decision before
  any distribution or asset expansion work.
- **Scope:** remove the demo APN Pro, coin packs, paid Auto-Sprint, `1.25×` power,
  timed `2×` Boost, Time Warp, paid Gear Boxes, coin rewards, and every purchase
  action/surface. Keep old v2 premium save values inert and lossless.
- **Acceptance:**
  - [x] Menu/HUD contain no Purchases, demo store, Pro badge, product card, coin,
        warp, paid boost, or paid Gear Box surface.
  - [x] `economyMult` equals Live Mult; old Pro/boost/Auto-Sprint flags cannot
        affect damage, income, Sprint, offline progress, Ship, or End Season.
  - [x] Boss, Hub, Ship, and End Season grant no dead coin currency; free Gear
        drops and the existing Signal/SP/Rep rewards remain intact.
  - [x] Legacy `meta.premium` values round-trip through save/load and remain
        byte-for-byte inert across prestige.
  - [x] `node qa/run-tests.mjs`, `node qa/playthrough.mjs`,
        `node qa/pacing-profiles.mjs`, and `node qa/long-run.mjs` pass fresh.
  - [x] Muted real-Chrome Run/Menu proof has zero console errors, no purchase
        copy or controls, correct manual Sprint, and only Live Mult in the HUD.
- **Files:** `index.html`, `js/content.js`, `js/game.js`, `js/hub.js`, `js/ui.js`,
  `js/save.js`, QA, monetization/screen/architecture/status docs.
- **Out of scope:** new currencies, reward replacements, balance buffs, asset
  replacement, accounts, payment plumbing, or future cosmetic products.

---

## Definition of "epic done"

An epic is done when all its 🔴 Must issues are merged, `node qa/run-tests.mjs` is
green, and the relevant [QA-CHECKLIST](./QA-CHECKLIST.md) gates pass on the device
matrix. 🟡 Fix issues may trail into the next wave; ⚪ Optional issues never block a
release.

## Release gate (redesign V1)

Ship redesign V1 when: all 34 issue acceptance lists are complete · all 24 Must + 10 Fix branches are integrated · Sessions 1–7 are complete · QA matrix (I-043) is green ·
no Blocker/Critical is open · every shipping screen passes Silhouette / Contrast /
Touch / Decision gates.
