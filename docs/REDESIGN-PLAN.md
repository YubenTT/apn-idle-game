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

## Phasing (dependency waves — do in order)

```
Wave 0  Foundation → code      I-001, I-002            (unblocks everything)
Wave 1  Run screen (hero)      I-010 → I-014           (first visible leap)
Wave 2  Sheets (decisions)     I-021*, I-020, I-022–025 (*Gear first = biggest ROI)
Wave 3  Art system             I-030 → I-034           (mascot canon first)
Wave 4  Feel · pipeline · QA   I-040 → I-044           (polish + gates)
```

Rule: **do not start a wave until the prior wave's 🔴 Must issues are merged.**
Art (Wave 3) can run in parallel with Waves 1–2 as a separate art track, but its
integration issues land after the screen that consumes them.

## Master issue table

| ID | Epic | Title | Pri | Size | Depends on | Source of truth |
|----|------|-------|:---:|:----:|------------|-----------------|
| I-001 | Foundation | Wire `tokens.css` into `game.css` (staged) | 🔴 | M | — | [DESIGN-TOKENS](../brand/DESIGN-TOKENS.md) |
| I-002 | Foundation | Apply 2 token changes (Notes→rose, SP→violet) | 🔴 | S | I-001 | [DESIGN-TOKENS §Change](../brand/DESIGN-TOKENS.md) |
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
| I-032 | Art | Enemy / target family kit | 🟡 | L | I-031 | [ART-DIRECTION §Enemies](../brand/ART-DIRECTION.md) |
| I-033 | Art | Item art set (techwear families) | 🟡 | L | I-031, I-021 | [ART-DIRECTION §Items](../brand/ART-DIRECTION.md) |
| I-034 | Art | Backgrounds (APN editorial cityline) | 🟡 | L | I-031 | [ART-DIRECTION §Backgrounds](../brand/ART-DIRECTION.md) |
| I-040 | Feel | Motion / haptic / SFX pass | 🟡 | M | Wave 1 | [DESIGN-TOKENS §Motion](../brand/DESIGN-TOKENS.md) |
| I-041 | Pipeline | Asset pipeline + size gates | 🟡 | M | I-030 | [ART-PIPELINE](./ART-PIPELINE.md), [PERF-BUDGET](./PERF-BUDGET.md) |
| I-042 | Copy | Copy + naming pass (all screens) | 🔴 | S | Wave 1–2 | [NAMING](../brand/NAMING.md), [GLOSSARY](./GLOSSARY.md) |
| I-043 | QA | Device matrix + visual regression | 🔴 | M | Wave 1–2 | [QA-CHECKLIST](./QA-CHECKLIST.md) |
| I-044 | Nav | Nav decision (keep-5 vs research) + impl | 🟡 | S | I-010 | [SCREEN-SPECS §Navigation](./SCREEN-SPECS.md) |

## Effort roll-up

| Priority | Issues | Rough range |
|----------|-------:|------------:|
| 🔴 Must | 14 | ~150–210 h |
| 🟡 Fix | 7 | ~110–160 h |
| ⚪ Optional | (seasonal swaps, cosmetics, PWA — see ROADMAP) | ~60–90 h |

Hours are single-contributor, vanilla-stack, docs-already-written estimates — much
lower than the research's 460–520 h because no rewrite and no framework onboarding.

---

# Issue detail cards

## Wave 0 — Foundation

### I-001 · Wire `tokens.css` into `game.css` (staged) — 🔴 M
- **Goal:** every color/size in the UI comes from a token, not a literal.
- **Scope:** `@import "../brand/tokens.css"` at the top of `css/game.css`; swap
  literals for `var(--…)` region by region (surfaces → text → economy → components).
- **Acceptance:**
  - [ ] `tokens.css` imported; app renders identically pre-swap (additive).
  - [ ] Each swapped region passes a screenshot diff vs `qa/screenshots/` (no drift).
  - [ ] No raw hex remains in swapped regions (grep clean).
  - [ ] `node qa/run-tests.mjs` green.
- **Files:** `css/game.css`, `index.html` (link if used), `brand/tokens.css`.
- **Out of scope:** the 2 value changes (that's I-002); new layouts.

### I-002 · Apply the 2 token changes — 🔴 S
- **Goal:** de-collide Notes and SP from primary crimson.
- **Scope:** Notes → `--c-notes` rose; SP → `--c-sp` violet, everywhere they render.
- **Acceptance:**
  - [ ] Notes value/pills/floaters use rose; SP badges/costs use violet.
  - [ ] No remaining crimson used for a Notes or SP role.
  - [ ] Contrast floors still met ([DESIGN-TOKENS §A11y](../brand/DESIGN-TOKENS.md)).
  - [ ] Screenshot diff reviewed + approved (intentional change).
- **Files:** `css/game.css`, `js/render.js` (floater colors), `js/ui.js`.

## Wave 1 — Run screen

### I-010 · Resource strip around notch — 🔴 M
- **Goal:** the running HUD shows only what the player acts on: Signal / Notes / SP.
- **Scope:** notch-aware resource strip (44pt); drop "APN Idle" wordmark from run
  HUD; move **Rep** to Ship/Boosts context and **DPS** to a stats peek.
- **Acceptance:**
  - [ ] Signal (left), Notes + SP (right), center cutout reserved via safe-area.
  - [ ] Wordmark absent from run HUD; brand held by component discipline.
  - [ ] Rep and DPS no longer in the run strip.
  - [ ] Chips = resource-chip component, `tabular-nums`, no gradient.
  - [ ] No safe-area overflow on notch device (portrait + landscape).
- **Files:** `index.html`, `css/game.css`, `js/ui.js`.

### I-011 · Feed rail — 🔴 M
- **Goal:** one-line live APN feed that carries run context, not a news marquee.
- **Acceptance:**
  - [ ] Single row: source mark 16 · game name 15 · type pill 20–22.
  - [ ] Clean truncation; never wraps; type pills use content-type tokens.
  - [ ] Reads as "what's live now," tied to the run (not a scrolling website header).
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/content.js` (TICKER).

### I-012 · Stage header — 🔴 M
- **Goal:** Zone / Rank / Live folded into a compact strip **inside** the stage card.
- **Acceptance:**
  - [ ] Zone + Rank + Live in one stage-header strip; Rank reads as in-run growth.
  - [ ] Each bar means one thing (Zone ≠ Rank), ≥3:1 contrast, ≥8px track.
  - [ ] Top HUD no longer carries separate Zone/Rank cards.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`.

### I-013 · Patchline stage framing + juice — 🔴 L
- **Goal:** the stage reads as gameplay, not a dark placeholder.
- **Acceptance:**
  - [ ] Camera framing keeps mascot + target both legible at portrait size.
  - [ ] Enemy HP is a clear banner over the target; name legible.
  - [ ] Damage numbers anchor to the target (not floating loose top-of-stage).
  - [ ] Loot flies to the HUD chip it credits.
  - [ ] Background reads APN editorial (billboards/signal-rail/skyline), no generic neon glow.
- **Files:** `js/render.js`, `js/game.js` (anchors/floaters), `assets/stage/*`.
- **Out of scope:** final hand-painted plates (that's I-034); use current biomes retuned.

### I-014 · Action dock — 🔴 M
- **Goal:** one clear decision — weighted controls.
- **Acceptance:**
  - [ ] One primary CTA (56pt crimson): **Upgrade Weapon** · `+x · Lv n→n+1` · cost chip.
  - [ ] Sprint is a lighter *mod* control, not CTA weight; Overdrive is a toggle.
  - [ ] 3–4 skill buttons, equal secondary weight.
  - [ ] No "Upgrade Signal" (or any currency-named CTA) anywhere ([NAMING](../brand/NAMING.md)).
  - [ ] Only one primary-crimson element on screen (CTA), not competing with active tab.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`.

## Wave 2 — Sheets

### I-021 · Gear + inventory redesign — 🔴 XL (do first — biggest ROI)
- **Goal:** turn the weakest surface into the collection hook (desire, not placeholder).
- **Acceptance:**
  - [ ] Left niche shows the **canonical mascot** (per MASCOT-CANON) on a subtle spotlight.
  - [ ] Equipped cards per slot with real item art (no placeholder pictograms).
  - [ ] 5-column portrait inventory grid, 72×72 slots, rarity accent on corners/edges.
  - [ ] States: empty · filled · selected · compare-highlight · junk.
  - [ ] Flows work: equip · compare-delta · sort · filter · scrap, all persist on reload.
  - [ ] Zero "hover" copy; zero placeholder slots.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/loot.js`, `assets/items/*`.
- **Source:** [SCREEN-SPECS §GEAR](./SCREEN-SPECS.md); item art tracked in I-033.

### I-020 · Build sheet skill cards — 🔴 M
- **Acceptance:**
  - [ ] Each skill row = card: icon · name · ROLE-tag · current→next · SP cost · unlock/ROI.
  - [ ] Attribute cards show what the next point *opens*, not bare `+`.
  - [ ] SP badge shows affordability; crimson marks primary progression only.
  - [ ] No red-outline-everything; most rows neutral + positive affordance cue.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/content.js`, `js/icons.js`.

### I-022 · Ship prestige transparency — 🔴 M
- **Acceptance:**
  - [ ] Summary preview: Notes · rate · Mult · End-Season bonus · **You'll gain +Rep**.
  - [ ] Explicit **what resets / what is kept** list shown before any destructive step.
  - [ ] End Season is lower weight than Ship CTA + routes through preview/confirm.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/game.js`.

### I-023 · Hub live-ops board — 🔴 M
- **Acceptance:**
  - [ ] Tasks grouped Daily / Weekly / Season.
  - [ ] States legible: claimable (prominent positive) vs claimed (muted) vs locked.
  - [ ] Reward pills readable; season milestones clearly clickable-or-not.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/hub.js`.

### I-024 · Boosts ROI tree — 🟡 M
- **Acceptance:**
  - [ ] Each row shows current→next delta + affordability + a value cue.
  - [ ] Category grouping + a "recommended" cue; Rep header feels permanent-growth.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`, `js/content.js`.

### I-025 · Menu split — 🔴 M
- **Acceptance:**
  - [ ] Sections separated: Accessibility · Audio · Account · Purchases · Reset.
  - [ ] Debug string `Damage n·Crit n·Utility n` removed from player UI.
  - [ ] Toggles use the component-library switch (not mismatched checkbox).
  - [ ] Premium card: clear benefit + restore-purchases / manage-sub / legal.
  - [ ] `New Game` low-weight, bottom, behind confirm.
- **Files:** `index.html`, `css/game.css`, `js/ui.js`.

## Wave 3 — Art system

### I-030 · Mascot canon pass — 🔴 L
- **Acceptance:**
  - [ ] Every mascot appearance passes **Silhouette QA** (same ratio/visor/perspective/outline).
  - [ ] All in-game sprites re-derived under the render-lock; conflicting sprites replaced.
  - [ ] No AI/freehand re-interpretation; variants change only accent/prop.
- **Files:** `assets/mascot/*`, `assets/mascot-*.png/.webp`, `js/render.js`.

### I-031 · 2D art grammar + icon unify — 🔴 M
- **Acceptance:**
  - [ ] Single outline/material/shadow grammar across icons + UI marks.
  - [ ] Icon set: constant stroke, rounded terminals, low interior detail.
- **Files:** `js/icons.js`, `assets/icons/*`.

### I-032 · Enemy / target family kit — 🟡 L
- **Acceptance:**
  - [ ] All enemies share one grammar; families per [ART-DIRECTION](../brand/ART-DIRECTION.md).
  - [ ] Names match [GLOSSARY](./GLOSSARY.md) (Feed Noise, Patch Note, Version Gate…).
- **Files:** `assets/enemies/*`, `js/content.js`, `js/render.js`.

### I-033 · Item art set — 🟡 L
- **Acceptance:**
  - [ ] 12 items in the 3 material families (matte polymer / laminated paper / anodized metal).
  - [ ] No fantasy materials; art matches slot names already in Gear.
- **Files:** `assets/items/*`, `js/loot.js`.

### I-034 · Backgrounds — 🟡 L
- **Acceptance:**
  - [ ] APN editorial cityline (billboards/signal rails/patchline/archive lights).
  - [ ] Fits [PERF-BUDGET](./PERF-BUDGET.md) background-atlas budget.
- **Files:** `assets/stage/backgrounds/*`, `js/render.js` (BIOMES).

## Wave 4 — Feel · pipeline · QA

### I-040 · Motion / haptic / SFX pass — 🟡 M
- **Acceptance:** hit/crit/loot/rank-up/sheet-open/afford cues; all gated by
  reduced-motion (OS + in-app). Files: `js/sfx.js`, `js/render.js`, `js/game.js`.

### I-041 · Asset pipeline + size gates — 🟡 M
- **Acceptance:** optional dev scripts ([ART-PIPELINE](./ART-PIPELINE.md)); `verify_sizes.mjs`
  fails on budget breach; runtime stays zero-npm. Files: `scripts/*`, `.github/workflows/*`.

### I-042 · Copy + naming pass — 🔴 S
- **Acceptance:** every screen object·effect·cost; no debug/hover/"Upgrade Signal";
  terms match [GLOSSARY](./GLOSSARY.md); "Mana Flow"/`mana` renamed. Files: `js/content.js`, `js/ui.js`.

### I-043 · Device matrix + visual regression — 🔴 M
- **Acceptance:** all [QA-CHECKLIST](./QA-CHECKLIST.md) gates green on the device
  matrix; screenshot diffs refreshed + approved. Files: `qa/*`.

### I-044 · Nav decision + implement — 🟡 S
- **Acceptance:** pick Option A (keep 5) or B (research-aligned) in an ADR; implement;
  one primary-crimson element per screen. Files: `docs/decisions/ADR-0004-*.md`, `index.html`, `js/ui.js`.

---

## Definition of "epic done"

An epic is done when all its 🔴 Must issues are merged, `node qa/run-tests.mjs` is
green, and the relevant [QA-CHECKLIST](./QA-CHECKLIST.md) gates pass on the device
matrix. 🟡 Fix issues may trail into the next wave; ⚪ Optional issues never block a
release.

## Release gate (redesign V1)

Ship redesign V1 when: Waves 0–2 🔴 Must merged · Mascot canon (I-030) merged ·
Copy pass (I-042) + QA matrix (I-043) green · no Blocker/Critical open · every
shipping screen passes Silhouette / Contrast / Touch / Decision gates.
