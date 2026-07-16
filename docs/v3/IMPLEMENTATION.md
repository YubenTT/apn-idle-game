# Implementation, Migration and Release Gates

## Scope

Preserve the current module architecture. Primary files for later runtime PRs:

```text
js/game.js · js/ui.js · js/content.js · js/formulas.js
js/route.js · js/save.js · catalog generator/source
index.html · css/game.css · qa/*
```

This document does not authorize a framework rewrite.

## Save v3 target

```js
meta: {
  live: 1,
  dropsShipped: 0,
  lastShippedDrop: 0,
  dropHistory: [],
  // existing permanent fields retained
},
route: {
  zone: 0,
  // scheduler state retained
},
run: {
  signal: 0, // migrate bytes
  notes: 0,  // migrate patches
  hero: {
    scanner: 0,
    rank: 1,
    focus: FOCUS_MAX
  }
},
ui: {
  dropReady: false,
  dropTxnLock: false,
  dropPreview: null
}
```

Legacy internal IDs may survive a staged migration; player copy and new APIs use canonical terms immediately.

## Domain API

### Pure helpers

```js
export const DROP_ZONES = 20;
export const dropIndexAtZone = zone => Math.floor(Math.max(0, zone) / DROP_ZONES);
export const isDropBoundary = zone => zone > 0 && zone % DROP_ZONES === 0;
export const nextDropBoundary = zone => DROP_ZONES * (Math.floor(zone / DROP_ZONES) + 1);
```

### `dropPreview(state)`

Returns ready state, Drop index/ID, raw Notes, Rep gain, Live before/gain/after, Signal retained, reset/keep lists, next Pack/fallback and transaction ID.

### `shipDrop(state, transactionId)`

Replaces `shipPatches()` and `leaveSeason()` in player flow. It is DOM/storage independent, idempotent, allowed with zero Notes, preserves Route and returns `{ok, reason, preview, event}`.

### Boundary hold

After incrementing Route Zone, an unshipped multiple-of-20 boundary clears active encounter state, stops spawn/offline advance, writes save and exposes Drop Ready. After shipping, the next Zone begins without resetting Route.

## UI migration

Remove:

- immediate `btn-ship` conversion handler;
- `btn-leave` and confirm surface;
- End Season copy;
- mixed Ship-now/reset-later preview.

Add:

- `Drop` bottom tab with `7/20` or `READY` badge;
- one preview renderer from domain output;
- one `Ship This Drop` CTA and transaction-lock state;
- next-Pack preview and reduced-motion ceremony.

Naming pass:

```text
Upgrade Weapon → Upgrade Scanner
Burst → Hotfix
Area → Priority Tag / Tag
Ramp → Live Tracker / Tracker
Overdrive → Overclock
Hub Season → Season Track
survives End Season → permanent · kept when a Drop ships
```

## Skill migration

Preserve save IDs where possible in first PR:

| current ID | target |
|---|---|
| hotfix | Hotfix |
| summary_burst | Priority Tag; change behavior and migrate rank |
| live_tracker | Live Tracker |
| deep_dive | Overclock |
| scroll_speed | Quick Scan |
| notify | Signal Ping |
| sharp_eye | Source Lock |
| amplify | Relay Power; later resolve internal branch-name collision |
| marathon | Always Live |

## Pack schema integration

Catalog records add editorial/runtime separation, rights mode/review/kill switch, controlled mechanics, original target/boss data, asset budgets, provenance and fallback. Presentation renames adopt only at Pack/Drop boundaries so a player never sees a Pack change identity mid-world.

## v2 → v3 migration

1. Deep-copy and validate old state.
2. Preserve Route/scheduler state exactly.
3. Derive `lastShippedDrop` conservatively.
4. Preserve banked Rep, Live Mult, Gear and current Notes.
5. Boundary-ready old saves open the new preview.
6. Old post-End-Season saves do not receive duplicate reward.
7. Store diagnostics-only migration receipt.
8. Round-trip through save/load before committing.

Recovery record:

```text
apnIdleDropRecovery = { transactionId, previousSave, createdAt }
```

Boot clears it if the final transaction exists; otherwise restores previous state and reopens Drop Ready. Never replay reward automatically.

## Dependency roadmap

### P0 — contract lock

Vocabulary, unified transaction, skill semantics, rights modes, schema and asset factory.

### P1 — pure Drop domain

Formula/preview helpers, idempotent transaction and boundary hold.

### P2 — save v3 + recovery

Golden fixtures: new, mid-Pack, boundary-ready, old Ship-only, old post-End-Season, corrupt optional fields and missing Pack.

### P3 — Drop UI vertical slice

New nav, single preview/CTA, Scanner/skill naming, labeled Gear and 104–120 px Host proof at 375×812, 390×844, 428×926 and 844×390.

### P4 — Build semantics

Real Priority Tag, named skills, derived Mastery and fair migration from generic attributes.

### P5 — Pack contract/scheduler

Schema CI, two-layer identity, disabled-Pack filtering, fallback and boundary-only catalog adoption.

### P6 — three-Pack factory proof

Tactical Echo, Floodlight XI and Fashion Dream. No Pack-specific runtime code.

### P7+ — Host motion, balance, return loop and controlled release

Identity proof → clips → integration; seeded active/idle/offline/veteran profiles; 5% → 25% → 100% rollout.

## Mandatory tests

- zero-Notes Drop ships and resumes;
- duplicate transaction grants once;
- Route is preserved;
- reset/keep lists match exactly;
- all old-save fixtures migrate without value loss/duplicate;
- offline stops at boundary;
- missing/killed next Pack falls back;
- full Gear cannot block;
- save failure restores snapshot;
- reduced motion preserves meaning;
- keyboard completes/cancels transaction;
- all legacy player-facing terms are absent.

Run at least 10,000 deterministic long-run seeds. Fail on any infinite spinner, permanently disabled main CTA, enemyless stage without a decision, NaN/Infinity, negative permanent currency or backward Route movement.

## Visual/accessibility gates

- no horizontal overflow or clipped primary CTA;
- no ambiguous target ellipsis;
- Host readable at 72 px and presented 104–120 px;
- target/HP/Host do not collide;
- one dominant crimson CTA;
- Gear labeled;
- editorial and Runtime Echo identities separated;
- primary touch targets ≥44×44 CSS px;
- keyboard and screen-reader transaction parity;
- visible focus, contrast floors and persistent Reduced Motion/SFX/shake settings;
- 200% text zoom preserves primary path.

## Rights/asset gates

Every Pack validates schema, uses original runtime art, records explicit rights mode/review, contains no unlicensed mark/character/map/item/UI/audio/trade dress, has source/originality briefs, mark-free visual prompts, Read/Wink/Deep-Cut budget, fallback, kill switch and provenance.

## Ethical/commercial gates

Base reward before optional commercial prompt; no fake scarcity, guilt loop, hidden effect, disguised ad, sold progression power, better Gear odds, Rep/Live multiplier or boundary skip. Every experiment has control, guardrail and kill switch.

## Stop-ship findings

Any permanent-value loss/duplicate, backward Route, boundary softlock, missing-Pack boot failure, recognizable unlicensed third-party asset, Host drift, inaccessible transaction, sold power, nondeterministic migration or evidence/commit mismatch blocks release.
