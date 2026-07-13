# Screen specs — mobile-first

> Per-screen layout and decision contract. Every screen must pass the **one screen,
> one decision** pillar. Sizes reference [tokens](../brand/DESIGN-TOKENS.md);
> components reference [COMPONENTS](../brand/COMPONENTS.md). This spec describes the
> *target*; it reconciles the redesign research with the **shipped** screens.

## Layout system

| Parameter | Value |
|-----------|-------|
| Logical portrait canvas | 428 × 926 pt |
| 3× export | 1284 × 2778 px |
| Landscape (secondary) | 844 × 390 CSS px |
| Side margin | 16 pt · Gutter 8 pt · 4-col grid |
| Safe areas | `env(safe-area-inset-*)` — real layout input, not decoration |
| App max-width (desktop) | 480 px (matches shipped sheet width) |

Portrait is primary. Landscape sheets open **full-screen**, not right-rail.

### Portrait run-screen skeleton

| Band | Height | Contents |
|------|-------:|----------|
| Safe top | 59 pt | notch / Dynamic Island |
| Resource strip | 44 pt | Signal (left) · Notes · SP (right), center cutout reserved |
| Feed rail | 40 pt | single-line live APN feed |
| Stage card | ~434 pt | stage header + viewport + footer |
| Action dock | 56 pt | primary CTA + one mod control |
| Skill row | 48 pt | 3–4 skill buttons |
| Tab bar | 60 pt + safe bottom | 5 top-level tabs |

## Navigation

**Shipped:** bottom nav = **Build · Ship · Hub · Boosts · Menu**; Gear is an
in-stage **bag FAB** (left rail).

**Research proposal:** Run · Build · Gear · Hub · More (Ship + Boosts become
sheets). The principle we adopt from it: **≤ 5 visible top-level destinations, and
each is a real decision surface.** The current 5 already satisfy the count.

**Recommendation (reconciled, low-churn):** keep 5 tabs. Two viable tunings, pick
during the nav pass — do not do both:

| Option | Nav | Trade-off |
|--------|-----|-----------|
| **A — keep shipped** | Build · Ship · Hub · Boosts · Menu + Gear FAB | Zero churn; Gear stays a discoverable FAB. Ship stays 1 tap. |
| **B — research-aligned** | Run · Build · Gear · Hub · More | Gear promoted to first-class (it's the collection hook); Ship + Boosts nest under Run/More. More churn. |

Either way: **only one primary crimson element per screen** — the active tab fill
must not compete with the run CTA (a current problem). Active tab uses a minimal
fill, not a full crimson slab.

## RUN — the hero screen

**Decision:** "what do I upgrade next?" Gameplay is the hero; HUD serves it.

Fixes over the shipped run screen:

1. **Resource strip around the notch** carries **Signal / Notes / SP** only — the
   three the player acts on. Drop the "APN Idle" wordmark from the running HUD
   (brand trust comes from component discipline; logomark lives on splash/menu per
   APN press-kit restraint). Move **Rep** and **DPS** out of the run HUD into their
   owning sheets (Ship/Boosts show Rep; a stats peek shows DPS).
2. **Feed rail**, not a website header: one line, source mark 16 · game name 15 ·
   type pill 20–22. It carries *run context* (what's live now), never a scrolling
   news marquee. Good truncation, one cell readable at a glance.
3. **Stage header** absorbs Zone / Rank / Live into a compact strip **inside** the
   stage card — Rank reads as an in-run growth metric, not a top-HUD analytics row.
4. **Patchline stage** must read as gameplay: camera framing so mascot + target
   are both legible; enemy HP as a clear banner over the target; hit anchor so
   damage numbers attach to the target, not float loose; loot flies to the HUD;
   APN environment (billboards, signal rails, skyline) instead of generic neon.
5. **Action dock = 1 primary CTA + 1 mod + 3–4 skill buttons**, weighted:
   - Primary CTA (56pt, crimson): **Upgrade Weapon** · `+8 scan · Lv 37→38` · cost chip.
   - Mod control (Sprint): a *behavior toggle*, visually lighter than the CTA.
   - Skill buttons (48pt): equal, secondary. Overdrive is a toggle, not a CTA-weight button.
   - **Never** title the CTA "Upgrade Signal" ([NAMING](../brand/NAMING.md)).

## Sheets (bottom-sheet pattern)

All secondary surfaces are focused bottom sheets: handle 36×5, title 28/32,
content padding 16, radius-top 24. One decision each; no spreadsheets.

### BUILD

Decision: "where do I spend SP?" Replace the value-dump with **skill cards** that
show a delta:

`icon · name · ROLE-tag (TAP/PASSIVE/TOGGLE) · current → next · SP cost · unlock/ROI`.

- SP badge shows affordability. Attribute cards (Damage/Crit/Utility) show what the
  next point *opens*, not just `+`.
- **Kill the red-outline-everything.** Crimson marks *primary progression* only;
  most rows are neutral with a positive-green "affordable" cue.

### GEAR (the collection hook — currently weakest, must become strongest)

Decision: "what do I equip?" This is a desire surface, not a placeholder grid.

- Left: equipment silhouette niche with the **canonical mascot** on a subtle
  spotlight (not a tiny floating dark figure).
- Right: equipped cards per slot (Weapon/Chest/Legs/Utility/…) with real item art.
- Bottom: **5-column** portrait inventory grid (72×72 slots), rarity accent on
  corners/edges, selectable, compare-highlight, junk state distinct.
- Flows: **equip / compare-delta / sort / filter / scrap**. Banned copy: "hover".
- Items look like items ([ART-DIRECTION](../brand/ART-DIRECTION.md) techwear
  families), not placeholder pictograms.

### SHIP (prestige — best core, weakest presentation)

Decision: "should I convert Notes → Rep now?" Make reset/keep/gain explicit.

- Summary preview: Notes · rate · Mult · End-Season bonus · **You'll gain (+Rep)**.
- A visible **what resets / what is kept** list before any destructive step.
- **End Season** is destructive: lower visual weight than the Ship CTA, and it
  routes through preview/confirm ([NAMING](../brand/NAMING.md) § destructive).

### HUB (live-ops board, not a to-do spreadsheet)

Decision: "what's my next claim?" Group **Daily / Weekly / Season**; make states
legible: **claimable** (prominent, positive) vs claimed (muted) vs locked. Reward
pills large enough to read; season milestones clearly clickable-or-not. Give it
live-ops energy, not a task list.

### BOOSTS (permanent ROI tree)

Decision: "which permanent Rep buy is best?" Every row shows **current → next
delta**, affordability, and a value cue; add category grouping and a
"recommended" cue. Rep header should feel like permanent growth, not a flat list.

### MENU / MORE (split settings from store from reset)

Decision depends on section. **Separate** concerns into grouped sections:
Accessibility · Audio · Account · Purchases · Reset. Fixes:

- Move the debug `Build: Damage 3·Crit 0·Utility 1` string **out** of player UI.
- Toggles use the component-library switch, not a mismatched checkbox.
- Premium card earns its visual weight: clear benefit line + restore-purchases /
  manage-subscription / legal per [MONETIZATION](./MONETIZATION.md).
- `New Game` (destructive) sits at the bottom, low weight, behind confirm.

## Definition of "screen done"

A screen ships only when it clears the [QA-CHECKLIST](./QA-CHECKLIST.md) Decision,
Contrast, Touch, and Copy gates and uses **only** tokens + library components.
