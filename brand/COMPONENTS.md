# Component library

> Every reusable UI part, its size, and its states. Screens compose from these —
> they don't invent one-off widgets. Sizes are tokens; see
> [DESIGN-TOKENS](./DESIGN-TOKENS.md). Placement is in
> [SCREEN-SPECS](../docs/SCREEN-SPECS.md).

## Rules

- **Compose, don't fork.** If a screen needs a widget not listed here, add it here
  first (one spec, one look), then use it.
- **No outer glow** on cards/stage — flat editorial (`--elev-card`).
- **One primary crimson element per screen.** Everything else is neutral/positive.
- **Touch ≥ 44pt** on anything tappable, even if the visual is smaller (use padding).

## Specs

| Component | Size | Rules |
|-----------|------|-------|
| **Resource chip** | h 44 · min-w 84 | left icon 16 · label 11 (`--fs-label-s`) · value 18–24 (`--fs-metric-*`), `tabular-nums`. **No gradient fill.** One per currency. |
| **Feed rail cell** | h 40 | source mark 16 · game name 15 · type pill 20–22. Truncate cleanly; never wrap. |
| **Gameplay surface** | full-bleed | Flat telemetry attached to an edge-to-edge Canvas viewport. No outer margin, border, radius, shadow, or glow. |
| **Progress track** | h 8 | lives inside ≥24pt touch container. Contrast ≥3:1 vs. its groove. One meaning per bar (Zone ≠ Rank). |
| **Primary CTA** | h 56 · r 18 | left icon · center title + delta · right cost chip. Crimson gradient with inset gloss/shade + depth shadow; shine sweep while affordable (dock only). Locked = saturated-muted crimson. Max one per screen; sheet primaries share the depth language without the sweep. |
| **Secondary action** | h 48 · r 16 | outline or neutral fill. Never crimson. |
| **Skill chip** | h ≥48 | Structured: name · cost/state line · rank pips (5) · Focus charge fill. Charged = positive border + inset positive underline (the sheet "can" language — never an always-on drop glow). Landscape (≤480px tall) compacts: pips hidden, dock rebalances 60/40 so labels never clip. |
| **Bottom sheet** | r-top 24 | handle 36×5 · title 28/32 · content padding 16 · `--elev-sheet`. Spring entrance; cards rise staggered on open. |
| **Inventory slot** | 72×72 | 1px border; rarity accent on corners/edges only. States: empty · filled · selected · compare · junk. Empty Gear niche hosts the live procedural Host (static frame under reduced motion). |
| **Item list card** | h 88 | icon left · name + 2 stats center · compare-delta / cost right. |
| **Tab item** | h 60 | icon 22–24 · label 11. Active = sliding pill (travels via `--nav-i`, surface-700 + inset info accent), never a crimson slab. Badge count changes pop once. |
| **Toast banner** | top-center | icon + one message. Tones: info / rank / zone / win / live, each in its owning token. Spring drop in, 240ms fade out. |
| **Modal close** | 44×44 | neutral, never destructive-red. |
| **Toggle switch** | 51×31 | one component everywhere; replaces the mismatched Menu checkboxes. |
| **Cost chip** | h 28 | currency icon + value, colored by that currency's token; green when affordable. |
| **Tag pill** | h 20–22 | ALL-CAPS ≤5 letters, colored by content-type token. |

## State language (applies across components)

| State | Signal |
|-------|--------|
| Affordable / can-buy | positive-green cue (fill or ring) |
| Ready to cast (charged skill chip) | positive border + inset positive underline |
| Locked | muted, `--text-low`, no accent |
| Active / equipped | accent line + subtle fill in the owning hue |
| Claimable (Hub) | prominent positive treatment |
| Claimed | muted checkmark |
| Destructive | low weight + confirm step, never same size as primary CTA |
| First-run coach hint | signal-colored bubble anchored above the CTA; dismissed forever on first Scanner upgrade (persisted in `ui.tips`) |

## Anti-patterns (do not ship)

- Crimson outline on every card/row/button (kills red's meaning).
- Gradient-filled resource chips.
- Outer neon glow on stage/cards.
- Hairline (1px) progress bars below the contrast floor.
- "hover" copy, debug strings, or placeholder pictograms in a shipping screen.
- A second primary-weight crimson element competing with the run CTA.
