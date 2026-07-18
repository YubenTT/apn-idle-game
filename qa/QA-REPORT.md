# APN Idle redesign V1 — QA report

## PR-4b · Build V2 UI + Priority Tag

Issue #22 removes SP from the Run strip and makes Build its sole owning surface.
The sheet presents Scan, Verify, and Relay as three direct three-skill branches,
with total and branch Mastery derived from actual SP spend. Priority Tag replaces
the retired multi-target action with a current-target Focus decision: its rank is
stored on the target, multiplies only that target's Signal/Notes rewards, and is
rendered as a signal-colored targeting bracket.

Fresh evidence on 2026-07-18:

- `node qa/run-tests.mjs` → `ALL PASS`, including the tag target/rank/Focus/reward contract;
- `node qa/pacing-profiles.mjs` → `PACING PASS · 3 SEEDED BUILDS`;
- `node qa/playthrough.mjs` → `PLAYTHROUGH PASS`;
- `node qa/long-run.mjs` → `LONG RUN PASS`;
- direct installed Google Chrome CDP, always `mute=1`, at 375×812, 428×926,
  and 844×390: Scan/Verify/Relay visible, nine skill decisions, four Mastery
  badges, SP absent outside Build, 44px minimum touch, 0px overflow, and zero
  console warning/error entries.

Chrome evidence is stored in `qa/screenshots/pr4b-build/`.

## PR-4a · Build V2 domain

Issue #21 replaces the generic attribute tax at the domain/save layer. The v3
shape migration reconstructs every supported skill-rank cost, adds the three
legacy attribute spends plus unspent SP, clears the old allocation, and writes a
`buildVersion` marker so reload cannot refund twice. Retired mask skills remain
the explicitly accepted historical loss.

Deterministic evidence:

- exact fixture refund: 18 SP, unchanged after a second load;
- Scan/Verify/Relay Mastery: 7/2/3 SP from named ranks, total 12;
- seeded Zone-200 profiles: Scan 6.9 h, Verify 17.7 h, Relay 19.7 h;
- `node qa/run-tests.mjs` → `ALL PASS`.

- Build: `feat/R-005-free-mvp-economy` stacked on `release/apn-idle-redesign-v1`
- Evidence date: 2026-07-15
- Browser: direct Chrome Extension control, always `mute=1`
- Automated gate: `node qa/run-tests.mjs` → `ALL PASS`
- Long-run gate: `node qa/long-run.mjs` → `LONG RUN PASS`

## R-005 free MVP economy cut

The launch build has no Purchases section, demo store, APN Pro badge/catalog,
coin pack/reward, paid Auto-Sprint, timed 2× Boost, Time Warp, or paid Gear Box.
`economyMult` now equals Live Mult. Legacy premium fields still round-trip through
v2 saves but cannot change damage, income, Sprint, offline efficiency, Ship, or
End Season.

Fresh evidence on 2026-07-15:

- `node qa/run-tests.mjs` → `ALL PASS`, including negative store/power contracts;
- `node qa/playthrough.mjs` → `PLAYTHROUGH PASS`, Zone 21 and a successful free
  End Season with Live ×1.0397;
- `node qa/pacing-profiles.mjs` → first boss 10.9m, first End Season 30.0m,
  `PACING PASS`;
- `node qa/long-run.mjs` → `LONG RUN PASS` through the Zone 1000 profile;
- Chrome Extension at 428×926 with `mute=1`: 0px overflow, SFX unchecked,
  zero warning/error logs, no purchase nodes/terms, HUD title `Live Mult ×1.00`,
  and Sprint returns to `aria-pressed=false` with no held/Auto state.

The current Run/Menu captures are stored in `qa/screenshots/r005-free-mvp/`.

## I-045 mobile input hardening

A physical iOS Safari review on 2026-07-15 exposed selection handles after an
imprecise hold/drag on the Run surface. The shipped document rule used only the
standard `user-select`; it did not explicitly own WebKit selection, iOS
touch-callout, or native media-drag behavior.

The release candidate now applies standard + WebKit selection guards and the
iOS callout guard to the complete document, plus a media-drag guard to images,
SVG, and Canvas. `qa/check-mobile-gestures.mjs` captured the three missing guards
as a failing test before the fix and passes after it while also proving that
`touch-action` is not disabled globally.

Muted Browser evidence at 393×852: 0px horizontal overflow; zero console
warning/error entries; Gear sheet scroll moved 0→96px; native Gear sort changed
to Rarity; the sheet reopened/closed with correct expansion state; Sprint
released to `aria-pressed="false"` with no held class. The cache-busted stylesheet
is `game.css?v=redesign-v1-gesture-fix`.

The owner confirmed the physical iOS Safari long-press recheck on 2026-07-15:
no selection handles or native callout returned. Release status: **ready**.

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
| Touch | All visible controls ≥44px; static Safari contract, 393×852 interaction chain, and physical iOS long-press pass | Pass |
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

Open Blocker: 0 · Critical: 0 · Major: 0. I-045's physical iOS Safari recheck and
R-005's free-economy/browser contracts are green. Asset replacement remains a
separate visual-owner gate and is not misreported as release-ready here.
