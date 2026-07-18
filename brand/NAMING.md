# Naming & copy standard

> How we name things the player reads. Terminology definitions live in
> [GLOSSARY.md](../docs/GLOSSARY.md); this file is the *writing rules*.

## The one rule that fixes the most bugs

**Name the object, not the resource.** A CTA that spends a currency is titled by
what it *upgrades*, never by the currency it *costs*.

| ❌ Wrong | ✅ Right | Why |
|---------|---------|-----|
| "Upgrade Signal" | **"Upgrade Weapon"** (shipped) / "Upgrade Scanner" (thematic) | Signal is the *cost*, not the thing improving. "Upgrade Signal" makes the player ask "am I upgrading my money?" |
| "Buy Notes" | "Ship Notes → Rep" | Names the action + outcome. |
| "SP button" | "Hotfix · stronger hit · 3 SP" | Object · effect · cost. |

The shipped CTA is already **"Upgrade Weapon"** — keep it. `Scanner` is an approved
thematic alias if a screen wants the scan metaphor; both are legal, "Upgrade
Signal" is not.

## Voice

- **Plain verbs players know.** Upgrade, Ship, Build, Boost, Equip, Scrap.
- **Object · effect · cost**, in that order, on every actionable row.
  Example: `Upgrade Weapon` · `+8 scan power · Lv 37 → 38` · `4.0K Signal`.
- **APN-flavored, not fantasy.** scan / filter / notes / rep / ship / live —
  never fantasy-resource or random-loot-drop language. Active skills spend the
  canonical **Focus** meter defined in [GLOSSARY](../docs/GLOSSARY.md).
- **Comedy is flavor, never a blocker.** Kill/boss/ship quips are fine; they never
  carry information the player needs to act.

## Mobile-safe copy

- Button labels must remain single-line on the 375pt baseline; compact Run labels
  may use the canonical short name while Build owns the full explanation.
- Show a **delta**, not just a state: `Lv 14 → 15`, `+12`, `12.1K/16.3K`.
- No **debug/diagnostic** strings in player UI. Banned examples from the current
  build: `Damage 3·Crit 0·Utility 1` (Menu), `Tap a slot · hover for stats` (Gear).
- No **desktop-only verbs** on a touch product. "**hover**" is banned copy.

## Casing & formatting

| Thing | Rule | Example |
|-------|------|---------|
| Currencies | Title case, singular as a label | Signal, Notes, Rep, SP |
| Sheet titles | Title case, one word where possible | Build, Gear, Go Live, Route, Boosts, Menu |
| Numbers | Abbreviate ≥ 1000, `tabular-nums` | 1.1K, 12.1K/16.3K, ×1.06 |
| Tags | ALL CAPS, ≤ 5 letters | PATCH, NEWS, GUIDE, EVENT, VIDEO, LIVE, PRO |
| Multipliers | `×` glyph, 2 decimals when < 10 | ×1.06, ×1.85, 37× |

## Destructive-action copy

Any action that resets progress (End Season, New Game) must:

1. Read as its consequence, not its label — the button says what it *does*.
2. Sit at **lower** visual weight than the primary CTA (never same-size crimson).
3. Route through a **preview / confirm** step that lists *what resets and what is
   kept* before it fires. See [SCREEN-SPECS](../docs/SCREEN-SPECS.md) § Ship.

## Localization-ready

Copy is authored in `js/content.js` (and future `i18n/*`). Never concatenate
sentence fragments in code; keep whole phrases so translation stays possible.
Keep a `tr` and `en` parity list when i18n lands (roadmap).
