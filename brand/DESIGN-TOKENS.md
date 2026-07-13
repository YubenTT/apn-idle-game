# Design tokens

> The single source of truth for how APN Idle **looks**. Machine-readable values
> live in [`tokens.css`](./tokens.css), which is imported by the shipped UI; this
> file is the *why* and the rules.
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
I-001 wired the token layer with exact-value compatibility aliases, so it produced
no visual change. I-002 then applied both changes as a separate, reviewable diff:
DOM roles use the canonical tokens, while Canvas effects carry semantic Notes/SP
tones that `render.js` resolves through the same CSS tokens.

On the shipped ink surface, Notes measures **7.01:1** and SP **6.52:1**. Small
filled SP badges/cost chips use dark ink rather than white, preserving the 4.5:1
floor. The economy-color contract in `qa/check-economy-colors.mjs` locks the
values, roles, render mapping, and contrast.

## Compatibility bridge (I-001)

The pre-redesign CSS used 118 exact color values, while the canonical surface and
text tiers intentionally describe the destination system. Directly replacing a
shipped value such as `#0c1014` with `--ink-950 #071019` would have changed the UI
inside a foundation issue and failed the no-drift gate.

`tokens.css` therefore contains a temporary `--compat-*` group:

- aliases preserve the exact pre-token pixels and are valid only for migrated
  legacy rules;
- new or redesigned components use canonical role tokens, never compatibility
  aliases;
- each owning screen issue retires its compatibility aliases as that screen moves
  onto the canonical palette and component scale;
- the Notes/SP bridge aliases were retired by I-002; combo's visually identical
  legacy rose remains a separate `--compat-combo` role because combo is combat,
  not Notes;
- every `font-size` now resolves through canonical or exact compatibility type
  tokens; screen-specific legacy layout geometry stays frozen until its owning
  redesign issue so I-001 cannot silently reflow the UI.

The zero-dependency `qa/check-css-tokens.mjs` guard enforces the import, rejects raw
palette literals and font-size lengths in `game.css`, verifies custom-property
resolution, and requires the canonical Notes/SP tokens. The companion economy
guard rejects legacy role aliases and combat-crimson economy events. CSS control
values `transparent` and `currentColor` remain valid.

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

## Runtime and retirement contract

1. `css/game.css` imports `../brand/tokens.css` as its first effective rule.
2. Shipped literals are represented by canonical tokens when values and roles
   match, otherwise by the exact compatibility bridge above.
3. `node qa/run-tests.mjs` runs the token guard on every change.
4. I-002 applied the only two planned global value changes: Notes and SP.
5. Later screen issues replace compatibility aliases with canonical component
   tokens and verify portrait + landscape browser evidence in the same PR.
