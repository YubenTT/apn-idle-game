# QA checklist — the V1 gate

> A screen or change is not "V1-ready" until it clears this chain. Pairs with
> [DEFINITION-OF-DONE](./DEFINITION-OF-DONE.md) (per-task) — this is the
> product-quality gate. Automated domain coverage: `node qa/run-tests.mjs`.

## Gate table

| Area | Pass criterion |
|------|----------------|
| **Silhouette QA** | Mascot has the same head/body ratio, visor geometry, perspective, and outline on **every** screen ([MASCOT-CANON](../brand/MASCOT-CANON.md)). |
| **Art grammar QA** | Every item/enemy/icon uses the same outline + shadow + material grammar ([ART-DIRECTION](../brand/ART-DIRECTION.md)). No collage. |
| **Token QA** | No raw hex / off-scale size in the changed screen — tokens + components only. |
| **Layout QA** | No safe-area overflow in portrait **or** landscape; `env(safe-area-inset-*)` respected. |
| **Touch QA** | Every tappable surface ≥ 44×44 pt; long-press never selects text/media or opens a native callout; scrollable sheets still scroll. |
| **Contrast QA** | Body text ≥ 4.5:1; big values/large text ≥ 3:1. No sub-floor hairline bars. |
| **Decision QA** | The screen's single primary action is findable in < 2 s; no competing crimson. |
| **Copy QA** | No debug strings, no "hover", no "Upgrade Signal"; object·effect·cost on rows ([NAMING](../brand/NAMING.md)). |
| **Economy QA** | Signal/Notes/SP/Rep are visually distinct and correctly labeled; no wrong hue. |
| **Perf QA** | Cold-start and fps budgets hold on the device matrix ([PERF-BUDGET](./PERF-BUDGET.md)). |
| **Memory QA** | Atlas load/unload works; no leak across sheet open/close and season transitions. |
| **A11y QA** | Reduced-motion toggle + `prefers-reduced-motion`, SFX toggle, safe tap spacing all work. |
| **Regression QA** | Portrait/landscape screenshot diff approved vs. `qa/screenshots/`. |
| **Domain QA** | `node qa/run-tests.mjs` → ALL PASS (kills, upgrades, ship, boss, zone>20, HP scale). |

## Device matrix (minimum)

| Class | Example | Why |
|-------|---------|-----|
| Modern iOS Safari | recent iPhone, notch + home indicator | primary safe-area case |
| Modern Android Chrome | mid-range | Android touch target (48dp), perf floor |
| Small viewport | 375-wide | worst-case truncation |
| Desktop (embed) | 480px app max-width | site `/play` iframe |
| Landscape | 844×390 | full-screen sheets, strip layout |

## Bug severity

| Level | Meaning |
|-------|---------|
| Blocker | game won't load/advance; test can't proceed |
| Critical | save loss, crash, or main loop broken |
| Major | a system is broken but has a workaround |
| Minor | limited-impact issue |
| Cosmetic | visual/text only |

Release blocker = any Blocker or Critical open, or a Silhouette/Contrast/Touch gate
failing on a shipping screen.

## When gates conflict with "ship it"

Gates win. A failing gate is either fixed or explicitly accepted via an
[ADR](./decisions/) / risk note — never silently shipped.
