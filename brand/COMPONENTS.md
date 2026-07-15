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
| **Primary CTA** | h 56 · r 18 | left icon · center title + delta · right cost chip. Crimson fill. Max one per screen. |
| **Secondary action** | h 48 · r 16 | outline or neutral fill. Never crimson. |
| **Skill button** | h 48 | 1px border; active = fill + accent line. Equal weight to siblings. |
| **Bottom sheet** | r-top 24 | handle 36×5 · title 28/32 · content padding 16 · `--elev-sheet`. |
| **Inventory slot** | 72×72 | 1px border; rarity accent on corners/edges only. States: empty · filled · selected · compare · junk. |
| **Item list card** | h 88 | icon left · name + 2 stats center · compare-delta / cost right. |
| **Tab item** | h 60 | icon 22–24 · label 11. Active = minimal fill (not a crimson slab). |
| **Modal close** | 44×44 | neutral, never destructive-red. |
| **Toggle switch** | 51×31 | one component everywhere; replaces the mismatched Menu checkboxes. |
| **Cost chip** | h 28 | currency icon + value, colored by that currency's token; green when affordable. |
| **Tag pill** | h 20–22 | ALL-CAPS ≤5 letters, colored by content-type token. |

## State language (applies across components)

| State | Signal |
|-------|--------|
| Affordable / can-buy | positive-green cue (fill or ring) |
| Locked | muted, `--text-low`, no accent |
| Active / equipped | accent line + subtle fill in the owning hue |
| Claimable (Hub) | prominent positive treatment |
| Claimed | muted checkmark |
| Destructive | low weight + confirm step, never same size as primary CTA |

## Anti-patterns (do not ship)

- Crimson outline on every card/row/button (kills red's meaning).
- Gradient-filled resource chips.
- Outer neon glow on stage/cards.
- Hairline (1px) progress bars below the contrast floor.
- "hover" copy, debug strings, or placeholder pictograms in a shipping screen.
- A second primary-weight crimson element competing with the run CTA.
