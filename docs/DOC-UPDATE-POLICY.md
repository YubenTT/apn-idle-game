# Doc update policy

> Which doc must change when you change the game. A doc that no longer matches the
> build is a bug — fix it in the **same** change that caused the drift. Owners and
> the source-of-truth map: [00_START_HERE](./00_START_HERE.md).

## Trigger → doc

| You changed… | Update |
|--------------|--------|
| Core loop / a system's rules | [GAME-DESIGN.md](./GAME-DESIGN.md) (+ [CONCEPT.md](./CONCEPT.md) if the fantasy shifts) |
| A balance curve / cost / cap | `js/formulas.js` (`C`) **and** [BALANCE.md](./BALANCE.md) |
| A color / type / spacing / radius / motion value | [../brand/tokens.css](../brand/tokens.css) **and** [../brand/DESIGN-TOKENS.md](../brand/DESIGN-TOKENS.md) |
| A reusable widget's size/states | [../brand/COMPONENTS.md](../brand/COMPONENTS.md) |
| A screen's layout / decision | [SCREEN-SPECS.md](./SCREEN-SPECS.md) |
| Mascot geometry / variant / animation | [../brand/MASCOT-CANON.md](../brand/MASCOT-CANON.md) |
| Icon / enemy / item / background art rules | [../brand/ART-DIRECTION.md](../brand/ART-DIRECTION.md) |
| Player-facing wording / a term | [../brand/NAMING.md](../brand/NAMING.md) + [GLOSSARY.md](./GLOSSARY.md) |
| Module boundaries / data flow / state shape | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Save schema | `js/save.js` + [GLOSSARY.md](./GLOSSARY.md) code-map + migration note |
| A performance-affecting decision | [PERF-BUDGET.md](./PERF-BUDGET.md) |
| Asset export / atlas / format | [ART-PIPELINE.md](./ART-PIPELINE.md) |
| Monetization posture | [MONETIZATION.md](./MONETIZATION.md) |
| A stack / save-format / pillar decision | a new **[ADR](./decisions/)** (before the change) |
| Anything shipped/planned status | [ROADMAP.md](./ROADMAP.md) + [CHANGELOG.md](../CHANGELOG.md) |

## Rules

1. **Same change, not later.** Docs drift the moment code lands; close the gap in
   the same PR/commit.
2. **One source of truth.** Numbers that live in `C` or `tokens.css` are
   *referenced* in prose, never re-typed (so they can't disagree).
3. **ADR before rewrite.** Stack, save format, and design-pillar changes get an ADR
   first — the code change references it.
4. **Stale doc = failing DoD.** [DEFINITION-OF-DONE](./DEFINITION-OF-DONE.md)
   includes "docs updated"; a stale doc fails the task.
5. **Deprecate, don't orphan.** If a doc is retired, mark it clearly and point to
   its replacement in [00_START_HERE](./00_START_HERE.md). No silent dead files.
