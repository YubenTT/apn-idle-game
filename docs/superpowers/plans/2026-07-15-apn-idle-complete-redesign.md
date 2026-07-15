# APN Idle Complete Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved mobile-first APN Idle redesign as a save-safe,
multi-day, catalog-driven 20-pack Route with production assets, complete decision
sheets, deterministic QA, and a muted real-Chrome build on
`http://localhost:8790/`.

**Architecture:** Preserve vanilla ES modules, Canvas 2D, static-file play, and
domain purity. Add a pure Route/catalog layer, migrate world progress out of the
resetting run, generate static pack catalogs and atlases at development time, and
load only the current and next pack at runtime. UI and renderer consume domain
state; they never calculate balance or scheduling.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Canvas 2D, localStorage, Node headless
tests, Node development scripts, `cwebp`, `ffmpeg`, Chrome extension browser QA.
No npm or build step is required to play.

## Global Constraints

- Runtime remains vanilla ES modules + Canvas 2D with zero runtime dependency.
- Combat, route, offline, and economy math live in `js/formulas.js` and
  `js/game.js`; scheduling is pure in `js/route.js`.
- All colors and sizes resolve from `brand/tokens.css`; no raw palette literals
  enter `css/game.css` or Canvas drawing code.
- UI names the object and action: **Upgrade Weapon**, never Upgrade Signal.
- Host identity remains tied to `assets/apn-mascot-glb-host.glb`; approved AI
  output is a cleanup/style reference, not replacement geometry.
- Host and encounter share one ground plane; Host stays left, target enters from
  the right.
- Touch targets are at least 44×44 CSS px; body contrast is at least 4.5:1 and
  large text at least 3:1.
- Safe-area insets are layout inputs in portrait and landscape.
- Automated and browser QA run with sound effects off.
- One issue produces one focused commit and one retained local feature branch.
  Do not push or open PRs until the user asks.
- No blocking user gates occur during execution. The only remaining gate is the
  final integrated localhost review.

## Execution branch discipline

Use `integration/complete-redesign` as the local integration line. For each issue,
create `feat/I-xxx-short-name` from the current integration head, implement and
verify it, then fast-forward the integration branch locally. Keep the feature
branch ref so it can become a one-issue PR later without history surgery.

```bash
git switch -c integration/complete-redesign
git switch -c feat/I-003-route-state
# implement, verify, commit
git switch integration/complete-redesign
git merge --ff-only feat/I-003-route-state
```

Do not stack unrelated fixes in an issue commit. Browser evidence, issue status,
and the relevant `CHANGELOG.md` line land in the same commit as the issue.

## File and ownership map

| File | Responsibility |
|---|---|
| `js/formulas.js` | pure pacing, boss, season, offline boundary math |
| `js/route.js` | pure pack selection, route deck, corruption scheduler |
| `js/game.js` | state transitions, combat, route advancement, prestige |
| `js/save.js` | v1→v2 migration and durable v2 serialization |
| `js/generated/game-packs.js` | generated static catalog consumed at runtime |
| `js/assets.js` | pack atlas preload, current/next ownership, unload |
| `js/render.js` | state-to-Canvas composition only |
| `js/ui.js` | state-to-DOM presentation and domain-action bindings |
| `assets/game-packs/*` | pack masters, runtime atlases, manifests, source boards |
| `scripts/assets/*.mjs` | manifest validation, catalog generation, size checks |
| `tools/mascot-render/*` | development-only GLB render-lock surface |
| `qa/long-run.mjs` | seeded Zone 1000 pacing/scheduler/offline profiles |
| `qa/check-assets.mjs` | manifest, dimensions, pivot, size, path validation |
| `qa/browser/*` | viewport scenarios and evidence manifest, not a runtime dep |

---

### Task 1: Lock the approved direction and backlog graph

**Issue:** I-003 · Route program/backlog integrity

**Files:**
- Modify: `docs/REDESIGN-PLAN.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/VISION.md`
- Modify: `brand/ART-DIRECTION.md`
- Modify: `brand/MASCOT-CANON.md`
- Modify: `docs/decisions/ADR-0003-mascot-single-source.md`
- Modify: `docs/decisions/ADR-0004-game-pack-route.md`
- Create: `docs/decisions/ADR-0005-hybrid-host-render.md`
- Create: `docs/art/proofs/2026-07-15/README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: approved `GAME-PACK-ROUTE.md` and `GAME-PACK-ASSET-BIBLE.md`.
- Produces: accepted ADR-0004, a non-contradictory Host derivation rule, and a
  locked issue order used by every later task.

- [ ] **Step 1: Add a failing documentation integrity check**

Create `qa/check-doc-contracts.mjs` that reads the five owning docs and fails if
the route is still described as procedural five-biome cycling, if third-party
Game Packs are simultaneously accepted and prohibited, or if ADR-0004 is not
Accepted.

```js
import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const route = read('docs/GAME-PACK-ROUTE.md');
const vision = read('docs/VISION.md');
const art = read('brand/ART-DIRECTION.md');
const adr = read('docs/decisions/ADR-0004-game-pack-route.md');
const fail = [];
if (!route.includes('20 distinct clean Game Packs')) fail.push('route milestone');
if (!adr.includes('Status: Accepted')) fail.push('ADR-0004 status');
if (vision.includes('Do not copy third-party game characters')) fail.push('VISION contradiction');
if (art.includes('We do **not** copy third-party game characters')) fail.push('art contradiction');
if (fail.length) throw new Error(`Doc contract: ${fail.join(', ')}`);
console.log('OK route and art docs agree');
```

- [ ] **Step 2: Run the check and verify it fails**

Run: `node qa/check-doc-contracts.mjs`

Expected: failure naming ADR-0004 and the two third-party contradictions.

- [ ] **Step 3: Accept the route and supersede only the conflicting clauses**

Keep ADR-0003's GLB geometry authority. ADR-0005 must permit ImageGen only as a
render/style cleanup reference derived from GLB views; it must prohibit changing
head/body ratio, visor geometry, pivot, or silhouette. Update the backlog with the
new I-003–I-009 foundation issues and the exact execution order in this plan.

- [ ] **Step 4: Register approved proof files without shipping them**

Compress the accepted concept boards to review-only WebP under
`docs/art/proofs/2026-07-15/`; record source PNG, prompt family, approval date,
covered packs, and the fact that Marvel Rivals still needs a focused proof.

Run: `node qa/check-doc-contracts.mjs`

Expected: `OK route and art docs agree`.

- [ ] **Step 5: Commit**

```bash
git add docs brand qa/check-doc-contracts.mjs CHANGELOG.md
git commit -m "docs: accept the game pack route"
```

### Task 2: Introduce global Route state and save v2 migration

**Issue:** I-004 · Global Route/save migration

**Files:**
- Create: `js/route.js`
- Modify: `js/game.js`
- Modify: `js/save.js`
- Modify: `js/formulas.js`
- Modify: `qa/run-tests.mjs`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: `createRouteState(seed)`, `routeZoneDisplay(route)`,
  `packZoneDisplay(route)`, `nextSeasonBoundary(routeZone)`, and save schema v2.
- Later tasks consume `s.route.zone`; `s.run.zone` must no longer exist after the
  migration.

- [ ] **Step 1: Write failing state/migration tests**

Add fixtures for a fresh save, a real v1-style Zone 1905 save, malformed route
fields, and a v2 round trip.

```js
const fresh = createState();
assert(fresh.route.zone === 0, 'fresh global route');
assert(fresh.route.currentPackId === 'valorant', 'first pack');

const migrated = createState();
apply(migrated, { v: 1, ts: Date.now(), run: { zone: 1905, killsInZone: 2 } });
assert(migrated.route.zone === 1905, 'v1 zone migrates');
assert(migrated.route.killsInZone === 2, 'v1 kills migrate');
assert(!('zone' in migrated.run), 'run zone retired');
```

- [ ] **Step 2: Verify red**

Run: `node qa/run-tests.mjs`

Expected: failure because `route` and schema v2 do not exist.

- [ ] **Step 3: Implement the pure route state**

```js
export function createRouteState(seed = 0x41504e) {
  return {
    zone: 0,
    killsInZone: 0,
    currentPackId: 'valorant',
    seenPackIds: [],
    corruptionByPack: {},
    lastSeenByPack: {},
    deck: [],
    catalogVersion: 1,
    seed: seed >>> 0,
  };
}

export const routeZoneDisplay = (route) => Math.max(0, route.zone | 0) + 1;
export const packZoneDisplay = (route) => (Math.max(0, route.zone | 0) % 10) + 1;
export const nextSeasonBoundary = (zone) => (Math.floor(Math.max(0, zone) / 20) + 1) * 20;
```

Move all `zone` and `killsInZone` reads/writes to `s.route`. `leaveSeason()` resets
run power but never resets `s.route.zone` or pack history.

- [ ] **Step 4: Implement dual-key migration**

`load()` checks `apn_idle_save_v2`, then legacy `apn_idle_save_v1`. `save()` writes
only v2. Do not delete the legacy key during migration; preserve it as rollback
evidence until the user explicitly starts a New Game.

- [ ] **Step 5: Verify green and commit**

Run: `node qa/run-tests.mjs`

Expected: `ALL PASS`, including v1→v2 and v2 round trip.

```bash
git add js/route.js js/game.js js/save.js js/formulas.js qa/run-tests.mjs docs/ARCHITECTURE.md CHANGELOG.md
git commit -m "feat: add persistent global route state"
```

### Task 3: Generate the pack catalog and deterministic scheduler

**Issue:** I-005 · Catalog/scheduler

**Files:**
- Create: `assets/game-packs/*/pack.json` for all 20 Clean Era packs
- Create: `assets/game-packs/catalog.json`
- Create: `scripts/assets/generate-catalog.mjs`
- Create: `js/generated/game-packs.js`
- Modify: `js/route.js`
- Create: `qa/check-route.mjs`
- Modify: `qa/run-tests.mjs`
- Modify: `docs/ARCHITECTURE.md`

**Interfaces:**
- Produces: `GAME_PACKS`, `PACK_BY_ID`, `packForRoute(route)`,
  `scheduleNextSeason(route, catalog)`, and `corruptionTierFor(route, packId)`.
- The renderer never chooses a pack or corruption tier itself.

- [ ] **Step 1: Write the scheduler contract tests**

```js
const route = createRouteState(0x41504e);
const first = scheduleNextSeason(route, GAME_PACKS);
assert(first.map((p) => p.id).join(',') === 'valorant,league', 'first clean season');
route.seenPackIds = GAME_PACKS.slice(0, 20).map((p) => p.id);
route.zone = 200;
const drift = scheduleNextSeason(route, GAME_PACKS);
assert(drift.length === 2, 'two packs per season');
assert(drift[0].id !== drift[1].id, 'no duplicate pack');
assert(drift[0].genre !== drift[1].genre, 'no repeated primary genre');
assert(drift.every((p) => p.tier === 1), 'first revisit uses Signal Drift');
```

Run: `node qa/check-route.mjs`

Expected: module-not-found failure.

- [ ] **Step 2: Define complete manifests**

Every manifest contains stable `id`, `order`, `title`, `genre`, `zones: 10`,
`boss`, five `targets`, asset paths, pivots, source-board path, and corruption-mask
paths. No array index is persisted as identity.

- [ ] **Step 3: Generate the runtime catalog**

`generate-catalog.mjs` validates exactly five targets, one boss, unique IDs and
orders, then writes a deterministic frozen JS module. Re-running without source
changes must produce byte-identical output.

- [ ] **Step 4: Implement scheduler rules**

Use a small seeded xorshift function local to `route.js`. Schedule two unseen
different-genre Clean packs when available; otherwise select the two
least-recently-seen eligible packs at the lowest available corruption tier. New
packs always debut Clean. Never mutate an active two-pack season.

- [ ] **Step 5: Verify and commit**

Run:

```bash
node scripts/assets/generate-catalog.mjs
node qa/check-route.mjs
node qa/run-tests.mjs
git diff --exit-code js/generated/game-packs.js
```

Expected: both QA commands pass and generated catalog is clean.

Commit: `feat: add deterministic game pack catalog`.

### Task 4: Rebuild pacing and bounded offline progression

**Issue:** I-006 · Multi-day pacing/offline boundary

**Files:**
- Modify: `js/formulas.js`
- Modify: `js/game.js`
- Create: `qa/long-run.mjs`
- Create: `qa/pacing-profiles.mjs`
- Modify: `qa/run-tests.mjs`
- Modify: `docs/BALANCE.md`
- Modify: `docs/GAME-PACK-ROUTE.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: `routeEnemyHp(routeZone, runPower, permanentPower, tier, typeMult)`,
  `routeKillsNeeded(routeZone)`, `offlineRouteBudget(routeZone, seconds)`, and
  deterministic active/idle/offline profiles.
- Compatibility: retain `enemyHp()` as a delegating wrapper until every existing
  caller and test has moved to `routeEnemyHp()`; no intermediate commit may leave
  the playable build or primary test suite red.

- [ ] **Step 1: Preserve the observed failure as a regression fixture**

Add a seeded fixture equivalent to the Chrome evidence: an eight-hour return may
not advance from Zone 93 past the Zone 100 End Season boundary.

```js
const s = seededProgressState({ routeZone: 93, seed: 0x41504e });
const out = simulateOffline(s, 8 * 3600);
assert(s.route.zone === 100, 'offline stops at next season boundary');
assert(out.zones === 7, 'offline reports actual bounded zones');
assert(out.overflowSeconds > 0, 'overflow retained as bounded resources');
```

- [ ] **Step 2: Add long-run failure windows**

The test profiles fail unless:

- first boss is 8–12 active minutes and 15–25 mostly-idle minutes;
- first End Season is 25–40 active minutes and 45–75 mostly-idle minutes;
- mature seasons remain 35–70 active minutes and 60–120 mostly-idle minutes;
- full Corruption unlock is 10–16 active hours or 2–4 calendar days;
- adjacent automated seasons after Season 3 remain within 0.75–1.25×;
- no on-curve normal target is a one-frame kill;
- Zone 1000 has no non-finite number, hard wall, duplicate adjacent pack, or save
  nondeterminism.

Run: `node qa/long-run.mjs`

Expected: failure showing the current ~31-minute Zone 200 collapse.

- [ ] **Step 3: Move tuning into pure formulas**

Use the route position within the current 20-zone season for expected scanner
power and a bounded fraction of permanent power for catch-up. `game.js` passes
state-derived inputs; UI/render receive only formatted results. Replace any raw
scientific-notation enemy label with `formatNum()`.

- [ ] **Step 4: Bound offline simulation**

Stop route advancement at `nextSeasonBoundary()`. Convert remaining capped time
to existing Signal/Notes using an efficiency curve; do not complete another pack,
schedule a second season, or play audio. Return a structured recap:

```js
{
  seconds, simulatedSeconds, overflowSeconds,
  signal, notes, ranks, zones, kills, bosses,
  stoppedAtSeasonBoundary: true
}
```

- [ ] **Step 5: Tune from the profile output, document measured constants, verify**

Run `node qa/long-run.mjs` after every constants change. Record the final seeded
profile table and measurement date 2026-07-15 in `docs/BALANCE.md`.

Run: `node qa/run-tests.mjs && node qa/long-run.mjs`

Expected: `ALL PASS` and `LONG RUN PASS`.

Commit: `balance: stabilize multi-day route pacing`.

### Task 5: Build the production asset pipeline and gates

**Issue:** I-041 · Asset pipeline/size gates

**Files:**
- Create: `scripts/assets/validate-manifests.mjs`
- Create: `scripts/assets/pack-atlas.mjs`
- Create: `scripts/assets/convert-webp.mjs`
- Create: `scripts/assets/verify-sizes.mjs`
- Create: `scripts/assets/generate-manifest.mjs`
- Create: `qa/check-assets.mjs`
- Create: `qa/fixtures/assets/valid/*`
- Create: `qa/fixtures/assets/missing-pivot/*`
- Create: `qa/fixtures/assets/out-of-bounds/*`
- Create: `qa/fixtures/assets/oversized/*`
- Create: `assets/manifest.json`
- Modify: `docs/ART-PIPELINE.md`
- Modify: `docs/PERF-BUDGET.md`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Consumes: trimmed PNG masters and per-frame JSON.
- Produces: WebP atlases, pivot-preserving JSON, cache-bust hashes, and hard size
  failures.

- [ ] **Step 1: Write failing fixture tests**

Create tiny test fixtures with one valid foot-center pivot, one missing pivot, one
out-of-bounds rect, and one oversized fake atlas. `qa/check-assets.mjs` must reject
the latter three with the exact pack/asset name.

- [ ] **Step 2: Implement scripts using Node stdlib plus installed tools**

Use `child_process.execFile` with `/opt/homebrew/bin/cwebp`; never construct a
shell command string. `pack-atlas.mjs` must preserve `pivot: {x, y}` after trim.
`convert-webp.mjs` uses quality 82 for targets/Host and 78 for backgrounds.

- [ ] **Step 3: Enforce budgets**

- first playable total `< 5 MB`;
- Host base atlas `≤ 650 KB`;
- per-pack background `≤ 150 KB`;
- per-pack targets `≤ 140 KB`;
- per-pack props + masks `≤ 50 KB`;
- only current and next packs may be marked hot.

- [ ] **Step 4: Verify deterministic output**

Run the full pipeline twice and compare SHA-256 hashes. Expected: identical
manifest and atlas hashes.

- [ ] **Step 5: Commit**

Run: `node qa/check-assets.mjs && node qa/run-tests.mjs`

Commit: `build: add deterministic asset pipeline`.

### Task 6: Produce the canonical Host runtime atlas

**Issue:** I-030 · Host render-lock

**Files:**
- Create: `tools/mascot-render/index.html`
- Create: `tools/mascot-render/render.js`
- Create: `tools/mascot-render/README.md`
- Create: `tools/mascot-render/vendor/*` pinned development-only renderer files
- Create: `assets/mascot/master/*`
- Create: `assets/mascot/atlas/apn-mascot-base.json`
- Create: `assets/mascot/apn-mascot-base.webp`
- Create: `assets/mascot/apn-mascot-fx.webp`
- Modify: `brand/MASCOT-CANON.md`
- Modify: `qa/check-assets.mjs`

**Interfaces:**
- Consumes: `assets/apn-mascot-glb-host.glb` and the approved Host proof.
- Produces: fixed-pivot idle/run/scan/crit/loot/sprint/overdrive/damage/level/defeat
  frames; `render.js` consumes only atlas rect/pivot data.

- [ ] **Step 1: Add silhouette/pivot failures**

Check that every frame has the same foot pivot within one pixel, the same trimmed
head/body bounding ratio within 3%, and a non-empty visor region. Fail on tilted
or vertically jumping exports.

- [ ] **Step 2: Build a development-only GLB render surface**

Pin the renderer under `tools/`, load the canonical GLB locally, use an
orthographic camera at Y 18° and X 9°, and expose deterministic pose/camera query
parameters. No vendor script is referenced by `index.html` or shipped runtime JS.

- [ ] **Step 3: Export and composite**

Capture the required frames in Chrome, apply the two-tone/outline cleanup, pack
with the pipeline, and compare the result to the approved proof. AI output may
guide pose and cleanup but never supplies geometry.

- [ ] **Step 4: Verify at 76 px and Gear niche size**

Use a checkerboard proof page and the actual Run/Gear canvases. Verify visor
shape, head tilt, right-facing combat, ground pivot, and no glossy toy lighting.

- [ ] **Step 5: Commit**

Run: `node qa/check-assets.mjs && node qa/run-tests.mjs`

Commit: `art: lock the canonical Host atlas`.

### Task 7: Produce all 20 Clean Era pack masters

**Issues:** I-032A · packs 01–05; I-032B · packs 06–10; I-032C · packs 11–15;
I-032D · packs 16–20

**Files:**
- Create/modify: `assets/game-packs/<pack-id>/master/*` for 20 packs
- Create/modify: `assets/game-packs/<pack-id>/{background,targets,props,corruption-mask}.webp`
- Create/modify: `assets/game-packs/<pack-id>/targets.json`
- Create/modify: `assets/game-packs/<pack-id>/source-board.md`
- Modify: `docs/GAME-PACK-ASSET-BIBLE.md`
- Modify: `qa/check-assets.mjs`

**Interfaces:**
- Each pack exports exactly five target roles, one boss, one break state, three
  background layers, props, and two mask families with foot-center pivots.

- [ ] **Step 1: Regenerate the missing Marvel Rivals focused proof**

Use official source-board images and the accepted APN grammar. Do not proceed to
its production master until it passes the same silhouette/spacing checks as the
other 19 packs. This is an internal self-review, not a new user gate.

- [ ] **Step 2: Generate textless isolated target-family masters**

Use one flat removable chroma key per pack, one call per distinct sheet, then the
installed ImageGen background-removal helper with soft matte/despill. Never use
ImageGen for HUD text or runtime labels.

- [ ] **Step 3: Generate separate parallax masters**

Far, mid, and ground layers must tile or safely overdraw at 428×926 and 844×390.
Host is never baked into a background. Target direction is right-to-left.

- [ ] **Step 4: Surgical QA each pack**

Check silhouette at 72 px, boss at 128 px, shared outline/shadow, no pasted logo,
no unreadable micro-detail, no target/background collision, and exact pivot data.
Reject any row that looks like a different asset pack.

- [ ] **Step 5: Pack, compress, verify, and close one sub-issue per group**

Each group is its own retained feature branch and focused commit: packs 01–05,
06–10, 11–15, and 16–20. Each group runs:

```bash
node scripts/assets/generate-catalog.mjs
node scripts/assets/generate-manifest.mjs
node qa/check-assets.mjs
node qa/run-tests.mjs
```

Expected: all packs valid and within budget.

Commit messages are `art: produce game packs 01-05`, `art: produce game packs
06-10`, `art: produce game packs 11-15`, and `art: produce game packs 16-20`.

### Task 8: Implement lazy pack loading and Canvas composition

**Issue:** I-007 · Runtime pack renderer

**Files:**
- Create: `js/assets.js`
- Modify: `js/main.js`
- Modify: `js/render.js`
- Modify: `js/game.js`
- Create: `qa/check-asset-loader.mjs`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PERF-BUDGET.md`

**Interfaces:**
- Produces: `createAssetStore()`, `preloadRouteAssets(store, route)`,
  `getCurrentPackAssets(store, route)`, and `releaseColdPacks(store, route)`.
- `render.draw()` receives the store; it may read decoded images but may not
  choose Route content.

- [ ] **Step 1: Write loader lifecycle tests**

Test current+next preload, missing-asset fallback, stale pack release, repeated
sheet/season transitions, and a maximum of two decoded pack records.

- [ ] **Step 2: Implement explicit ownership**

```js
export function createAssetStore() {
  return { packs: new Map(), pending: new Map(), currentId: null, nextId: null };
}
```

Decode once, cache promises, and delete cold `ImageBitmap`/`Image` references at
season transition. A missing optional prop cannot stop combat; a missing target
atlas fails to the existing APN Version Gate silhouette and logs one warning.

- [ ] **Step 3: Replace procedural biome selection**

Remove `Math.floor(zone / 4) % BIOMES.length`. Draw far/mid/ground atlases using
pack manifest parallax rates; draw corruption masks additively by authored tier.
Move target HP banner over the target and format every number with `formatNum()`.

- [ ] **Step 4: Verify memory and rendering**

Automated loader QA must report two hot packs maximum. Chrome transition evidence
must show correct packs at Zones 1, 10, 11, 20, 50, 100, 150, 200, and 201.

- [ ] **Step 5: Commit**

Run: `node qa/check-asset-loader.mjs && node qa/run-tests.mjs`.

Commit: `feat: render catalog-driven game packs`.

### Task 9: Complete Gear as the collection vertical slice

**Issue:** I-021

**Files:**
- Modify: `index.html`
- Modify: `css/game.css`
- Modify: `js/ui.js`
- Modify: `js/loot.js`
- Modify: `js/save.js`
- Create: `assets/items/*`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Domain produces compare deltas, sort/filter results, and scrap returns.
- UI receives display-ready item facts; it never calculates rarity power or sale
  value.

- [ ] **Step 1: Add failing flow tests**

Cover equip, compare delta, sort, filter, junk toggle, scrap, reload persistence,
empty slot, full bag, and selected-item deletion.

- [ ] **Step 2: Produce four shipped slot families**

Finalize Scanner Lash, Patch Mail, Route Leggings, and Visor Coil under the three
allowed materials. Export rarity-neutral art; rarity belongs to card edge/corner,
not separate duplicated item art.

- [ ] **Step 3: Implement the 5-column portrait layout**

Use 72×72 inventory cells at the 428-wide reference. Compact equipped slots sit
beside/under the Host niche without compressing the item grid. The selected drawer
shows actual current→candidate changes and offers Equip or Scrap.

- [ ] **Step 4: Pass all states and browser sizes**

Verify empty, filled, selected, better-than-equipped, equipped, junk, sorted,
filtered, and full-bag at 375×812, 428×926, and 844×390. No hover copy.

- [ ] **Step 5: Commit**

Run: `node qa/run-tests.mjs` plus muted Chrome screenshots.

Commit: `feat: redesign Gear collection flow`.

### Task 10: Complete the Run hero experience

**Issues:** I-010 → I-014

**Files:**
- Modify: `index.html`
- Modify: `css/game.css`
- Modify: `js/ui.js`
- Modify: `js/render.js`
- Modify: `js/game.js`
- Modify: `js/content.js`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Run DOM reads `s.route`, `combatStats(s)`, and formatter outputs.
- Canvas reads anchors emitted by the domain for floaters/loot; it invents no
  rewards or balance numbers.

- [ ] **Step 1: Implement I-010 resource strip**

Signal sits left; Notes and SP sit right around the notch. Remove wordmark, Rep,
and DPS from the Run strip. Use tabular numerals and safe-area padding.

- [ ] **Step 2: Implement I-011 feed rail**

Render exactly one current item tied to `currentPackId`; no duplicated scrolling
track. Clamp to one line and expose accessible source/type text.

- [ ] **Step 3: Implement I-012 stage header**

Show global Route Zone, pack zone `/10`, Rank, and Live in one compact stage-card
header. Bars have one meaning, tracks are at least 8 px, and no duplicate top
cards remain.

- [ ] **Step 4: Implement I-013 stage framing**

Use a zoomed-out Tap-Titans-like composition without copying its art: Host at
18–24% width, target at 68–78%, boss banner above target, stable ground at roughly
76–80% of stage height. Damage anchors to target; loot flies to the credited HUD
chip. Target always enters from the right.

- [ ] **Step 5: Implement I-014 action dock**

One 56 pt crimson **Upgrade Weapon** CTA shows effect, `Lv n → n+1`, and Signal
cost. Sprint is a lighter mod. Burst/Area/Ramp/Overdrive are equal 48 pt secondary
controls. Active nav never competes with the CTA in crimson.

- [ ] **Step 6: Commit one issue at a time**

Each issue runs `node qa/run-tests.mjs` and muted Chrome evidence before its
focused commit. Do not squash I-010–I-014.

### Task 11: Complete all decision sheets

**Issues:** I-020, I-022, I-023, I-025, I-024

**Files:**
- Modify: `index.html`
- Modify: `css/game.css`
- Modify: `js/ui.js`
- Modify: `js/game.js`
- Modify: `js/content.js`
- Modify: `js/hub.js`
- Modify: `js/icons.js`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Domain exposes next-cost, affordability, ROI/delta, reset/keep/gain, claim
  state, and recommended permanent purchase.
- Sheets only render those results and dispatch domain actions.

- [ ] **Step 1: Build**

Skill cards show icon, name, role, current→next, SP cost, prerequisite/unlock, and
affordability. Attribute cards state what the next point opens.

- [ ] **Step 2: Ship**

Preview exact Notes, rate, multiplier, End Season bonus, Rep gain, reset list, and
keep list. End Season requires an explicit confirm and has lower weight than Ship.

- [ ] **Step 3: Hub**

Group Daily, Weekly, Season. Claimable, claimed, and locked states are visually
and semantically different; reward pills remain readable at 375 px.

- [ ] **Step 4: Menu**

Separate Accessibility, Audio, Account, Purchases, Reset. Remove attribute debug
copy. Use one switch component. Add restore/manage/legal rows only when they
invoke real actions; until backend ownership exists, label the demo purchase
surface explicitly as demo and never fake account success.

- [ ] **Step 5: Boosts**

Show current→next effect, exact Rep cost, affordability, category, and one
domain-derived recommendation.

- [ ] **Step 6: Verify and commit per issue**

Run headless tests, reload persistence, keyboard/touch interactions, and muted
Chrome screenshots before each focused commit.

### Task 12: Finish art grammar, copy, motion, navigation, and accessibility

**Issues:** I-031, I-033, I-034, I-040, I-042, I-044

**Files:**
- Modify: `js/icons.js`
- Modify: `assets/icons/*`
- Modify: `assets/items/*`
- Modify: `brand/tokens.css`
- Modify: `css/game.css`
- Modify: `js/ui.js`
- Modify: `js/render.js`
- Modify: `js/sfx.js`
- Modify: `brand/NAMING.md`
- Modify: `docs/GLOSSARY.md`

**Interfaces:**
- One icon grammar, one item grammar, one motion token family, and one fixed five
  destination navigation contract.

- [ ] **Step 1: Unify icons/items/backgrounds**

Remove raw SVG gradients and raw color literals from inline icons. Keep constant
stroke/terminal grammar. Replace remaining placeholder item/background art with
accepted production files.

- [ ] **Step 2: Add restrained motion and feedback**

Use token durations only. Boss-break, loot-pull, sheet transition, and pressed
states must have reduced-motion alternatives. SFX remains procedural and all QA
paths keep it off.

- [ ] **Step 3: Run copy contract checks**

Add a static QA scan that rejects `Upgrade Signal`, `hover`, player-visible debug
strings, and glossary mismatches. Object·effect·cost is the row pattern.

- [ ] **Step 4: Lock navigation**

Keep five top-level destinations and Gear as the in-stage FAB unless real-browser
decision timing proves Gear is undiscoverable. Active destination uses a minimal
neutral/mint state, not a competing crimson slab.

- [ ] **Step 5: Verify and commit per issue**

Run tokens, economy-color, copy, headless, and browser checks for each focused
commit.

### Task 13: Full QA, performance, regression, and localhost handoff

**Issue:** I-043 · Integrated release gate

**Files:**
- Create: `qa/browser/evidence-2026-07-15.json`
- Create: `qa/screenshots/redesign/*`
- Modify: `qa/QA-REPORT.md`
- Modify: `docs/REDESIGN-PLAN.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes the complete integration branch.
- Produces release evidence and the live muted localhost handoff.

- [ ] **Step 1: Run all deterministic suites fresh**

```bash
node qa/run-tests.mjs
node qa/long-run.mjs
node qa/check-route.mjs
node qa/check-assets.mjs
node qa/check-asset-loader.mjs
node qa/check-doc-contracts.mjs
```

Expected: every command exits 0; primary suite ends `ALL PASS`; long run ends
`LONG RUN PASS`.

- [ ] **Step 2: Run static safety scans**

Verify no raw game CSS colors, unresolved tokens, forbidden copy, secrets, local
save dumps, untracked generated catalogs, or asset-budget breaches.

- [ ] **Step 3: Execute the real Chrome matrix with sound off**

Use the Chrome extension at 428×926, 375×812, 844×390, and default desktop. Test
Run, every sheet, Gear flows, first boss, End Season, save reload, offline recap,
Zone 50/100/150 foreshadowing, Zone 200 unlock, and Zone 201 scheduler. Capture
console errors/warnings and screenshots after stable state.

- [ ] **Step 4: Measure touch, contrast, safe-area, memory, and frame behavior**

Record:

- every interactive rect at least 44×44;
- contrast results at required floors;
- no overflow in portrait/landscape;
- current+next pack only in decoded store;
- sheet open→interactive under 150 ms;
- 60 fps target, 45 fps floor, ≤22 ms worst frame during representative combat;
- no memory growth across ten sheet open/close cycles and ten pack transitions.

- [ ] **Step 5: Perform findings-first self-review**

Block release for any Blocker/Critical, any Silhouette/Contrast/Touch failure, any
save loss, any wrong-direction encounter, any audible QA path, or any visible AI
collage/slop. Fix in the owning issue branch, re-fast-forward integration, and
rerun the affected full gate.

- [ ] **Step 6: Final docs and issue closure**

Tick acceptance boxes only with evidence. Update QA report with measurement date,
commit, viewport, browser, and exact commands. `git diff --check` must pass.

- [ ] **Step 7: Serve the user build**

Ensure the stale Trash server is not owning port 8790. Start this repo with
`./serve.sh`, navigate the kept Chrome tab to `http://localhost:8790/`, verify SFX
is off, and leave that tab open as the single deliverable.

- [ ] **Step 8: Final commit**

```bash
git add qa docs CHANGELOG.md
git commit -m "qa: certify the complete mobile redesign"
```

Do not push or open PRs. Report the integration commit, test results, measured
budgets, any explicitly accepted residual risk, and the live localhost URL.
