# Design tokens

> The single source of truth for how APN Idle **looks**. Machine-readable values
> live in [`tokens.css`](./tokens.css); this file is the *why* and the rules.
> No screen may introduce a color, size, or radius that isn't a token here.

## Principle: one color, one job

The shipped build already carries a color language in the HUD (Signal is blue,
Rep is gold, DPS/positive is green, crimson is the brand). The redesign research's
core visual complaint was that **red does every job** — primary CTA, Notes, SP,
patch tag, active tab, stage frame — so red stops meaning anything. The fix is not
a new palette; it's **discipline**: lock the established hues and give the two
overloaded jobs their own hue.

### Reconciled with the shipped `css/game.css`

| Job | Token | Value | Status vs. shipped code |
|-----|-------|-------|-------------------------|
| APN primary / PATCH / LIVE / CTA | `--apn-primary` | `#fc1243` | **Locked** (was `--acc`) |
| Signal (scan resource) | `--c-signal` | `#5eb0ff` | **Locked** (shipped HUD blue) |
| Rep (permanent) | `--c-rep` | `#e6b84d` | **Locked** (shipped gold) |
| DPS / positive / affordable | `--c-positive` | `#3ecf8e` | **Locked** (shipped green) |
| Rarity ladder | `--rarity-*` | green/blue/yellow/unique | **Locked** (shipped `.r-*`) |

### The two deliberate changes (with rationale)  {#change}

| Job | Was (code) | Now (token) | Why |
|-----|-----------|-------------|-----|
| **Notes** | crimson `#fc1243` | rose `--c-notes #ff6a8f` | Notes shared crimson with primary/PATCH/CTA — the exact collision the research flagged. Rose stays warm/red-adjacent (reads as "patch family") but is unmistakably not the primary button. |
| **SP** | crimson `#fc1243` | violet `--c-sp #b07cff` | SP badges read as "another red thing." Violet gives skill-points a distinct, ownable identity separate from combat crimson. |

These two are the only **value** changes; everything else is formalization.
Migration is a find-and-replace when we wire `tokens.css` — tracked in
[ROADMAP](../docs/ROADMAP.md) and gated by a visual-regression pass
([QA-CHECKLIST](../docs/QA-CHECKLIST.md)).

## Full palette

### Surfaces & text

| Token | Value | Use |
|-------|-------|-----|
| `--ink-950` | `#071019` | app background |
| `--surface-900` | `#0b1622` | card / sheet base |
| `--surface-800` | `#112032` | second-layer panels |
| `--surface-700` | `#16283c` | raised / hover |
| `--border-700` | `#22364c` | 1px lines, slot borders |
| `--text-high` | `#f3f7fb` | primary text & values |
| `--text-mid` | `#aab7c7` | secondary text |
| `--text-low` | `#6c7a8d` | helper / disabled |

### Economy semantics

`--c-signal` blue · `--c-notes` rose · `--c-rep` gold · `--c-sp` violet ·
`--c-zone` cyan · `--c-positive` green · `--c-info` blue-link. Each appears in
**exactly one** role. A currency's hue never doubles as a UI state color in the
same component.

### Content-type tags (mirrors APN site taxonomy)

`PATCH` red · `NEWS` blue · `GUIDE` amber · `EVENT` green · `VIDEO` purple.
Fixed forever — these map to the five APN content types.

### Rarity vs. economy — why hues repeat

The rarity ladder (green→blue→yellow→unique) and economy hues intentionally share
colors. That's fine **because they never share a component role**: rarity lives on
item-card corners/edges; economy lives in HUD chips and cost pills. A green item
border and a green "affordable" CTA are never adjacent in the same decision.

## Type scale

| Token | Size / line | Use |
|-------|-------------|-----|
| `--fs-display-l` | 28/32 | sheet title, big CTA heading |
| `--fs-display-m` | 22/26 | target name, section hero |
| `--fs-body-l` | 17/22 | primary button, item name |
| `--fs-body-m` | 15/20 | row body, stat description |
| `--fs-label-m` | 13/16 | chip label, small header |
| `--fs-label-s` | 11/14 | meta tag, rarity, phase tag |
| `--fs-metric-xl` | 24/26 | Signal/Notes/SP values |
| `--fs-metric-m` | 18/20 | HP, cost, count, level |

- **No new display font.** Use the APN site's primary sans if present, else the
  `--font-sans` fallback stack (system-ui / Inter class).
- **All numbers use `tabular-nums`** so values don't jitter as they tick.

## Spacing, radius, elevation, motion

- **Spacing:** 4/8/12/16/24/32/48 (`--sp-*`). Nothing off-scale.
- **Radius:** chip 12 · card 16 · CTA 18 · stage 20 · sheet 24 · slot 14 · pill full.
- **Elevation:** flat editorial. `--elev-card` is a hairline + soft drop; **no
  outer neon glow** on cards/stage (a research anti-pattern). Sheets use
  `--elev-sheet`.
- **Motion:** `--dur-fast/base/slow` with `--ease-out`. Collapses to 0ms under
  `prefers-reduced-motion` **and** the in-app Reduced-motion toggle.

## Accessibility floors (hard requirements)

| Rule | Floor |
|------|-------|
| Touch target | ≥ **44×44 pt** (iOS); Android target 48 dp. WCAG 24px is a *pass mark*, not our bar. |
| Body text contrast | ≥ **4.5:1** |
| Large text / big values | ≥ **3:1** |
| Progress track height | 8px, inside a ≥24px touch container |

Low-contrast grey labels and 1px hairline bars from the current build must be
raised to these floors — verified in [QA-CHECKLIST](../docs/QA-CHECKLIST.md).

## How tokens get into the code (later, reversible)

1. `@import "../brand/tokens.css"` at the top of `css/game.css` (or a `<link>` in
   `index.html`). Additive — nothing breaks.
2. Swap literals for `var(--…)` file-region by file-region, re-running the visual
   regression each step.
3. Apply the two **change** values only when a screen is being redesigned anyway,
   never as a surprise global flip.

Until then `tokens.css` is a reference contract that design and code agree on.
