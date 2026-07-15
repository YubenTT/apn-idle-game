# APN Idle redesign V1 — QA report

- Build: `integration/complete-redesign`
- Evidence date: 2026-07-15
- Browser: direct Chrome Extension control, always `mute=1`
- Automated gate: `node qa/run-tests.mjs` → `ALL PASS`
- Long-run gate: `node qa/long-run.mjs` → `LONG RUN PASS`

## Integrated device matrix

Every row covers Run, Build, Ship, Hub, Boosts, Menu, and Gear. The 35 accepted
captures live in `qa/screenshots/redesign-v1/` and are shape-checked by
`qa/check-visual-baselines.mjs`.

| Class | Viewport | Screens | Min touch | Horizontal overflow | SFX | Copy |
|---|---:|---:|---:|---:|---|---|
| iOS-size safe-area proxy | 428×926 | 7/7 | 44px | 0px | Off | Pass |
| Android-size proxy | 412×915 | 7/7 | 44px | 0px | Off | Pass |
| Small portrait | 375×812 | 7/7 | 44px | 0px | Off | Pass |
| Desktop embed | 480×900 | 7/7 | 44px | 0px | Off | Pass |
| Landscape | 844×390 | 7/7 | 44px | 0px | Off | Pass |

Direct Chrome also returned zero warning/error console entries after the final
cache-busted load. Gear evidence exercised item selection, equipped-stat delta,
Rarity sort, Weapon filter, and restoration to the default Power/All view.

## Performance evidence

Measured on the final local static build at 428×926 with the opt-in
`qa_metrics=1` probe:

| Budget | Measured | Result |
|---|---:|---|
| First playable, Wi-Fi/local | 181ms | Pass (`<3.5s`) |
| Frame cadence | 89.8 fps on the active display | Pass (floor `45 fps`) |
| JS heap | 6.6 MB | Pass (`<180 MB`) |
| Sheet open → rendered | 2.7ms | Pass (`<150ms`) |
| First-playable assets | 2,384,094 bytes | Pass (`<5 MB`) |

The probe only writes read-only `data-qa-*` values when the explicit query flag
is present; normal gameplay does not expose or update them.

## Product gates

| Gate | Evidence | Result |
|---|---|---|
| Silhouette | Ten canonical GLB-derived Host poses; pivot ≤1px, ratio drift ≤3% | Pass |
| Art grammar | 20 pack sets, 12 item atlas cells, shared Patchline grammar | Pass |
| Tokens | 0 raw CSS palette literals; 0 raw font-size lengths | Pass |
| Layout | Five viewports × seven screens, 0px overflow | Pass |
| Touch | All visible controls ≥44px (Run controls ≥48px) | Pass |
| Contrast | Notes 7.01:1; SP 6.52:1; canonical text roles use locked floors | Pass |
| Decision | One Run CTA; neutral nav state; one decision per sheet | Pass |
| Copy | Five player-facing sources pass banned-copy scan; Focus migration tested | Pass |
| Economy | Signal/Notes/SP/Rep roles and Canvas event tones tested | Pass |
| Perf | Asset, fps, heap, cold-start, and sheet budgets above | Pass |
| Memory | Two-pack decoded cap, transition release, explicit cold release | Pass |
| A11y | Mute, OS/in-app reduced motion, expansion state, touch floor | Pass |
| Regression | 35 accepted JPEG baselines with exact viewport dimensions | Pass |
| Domain | deterministic RNG, combat, Route, Gear, save, offline, Zone 1000 | Pass |

## Severity result

Open Blocker: 0 · Critical: 0 · Major: 0. No release-gate exception or risk ADR is
required. Physical-device Safari/Android hardware profiling remains a store/release
step; this V1 gate uses the user-approved direct Chrome surface and the required
viewport/safe-area classes.
