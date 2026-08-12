# APN Idle Complete-Game Closure Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Preserve RED → minimal GREEN → focused verification at every behavior boundary. Do not begin a later PR slice until the current slice is green, reviewed, merged, and the worktree is rebased on latest `origin/main`.

**Goal:** Turn APN Idle into a complete free small-scale web idle game by shipping visible Route/Echo progression, bounded Pack meta, truthful rights/catalog gates, measured balance, and a reversible production deployment.

**Architecture:** Keep the existing zero-dependency ES-module/Canvas application. Add pure Route and Coverage domain helpers, normalize additive save fields at existing boundaries, render them through the existing Route sheet, and extend the deterministic Node/Chrome QA harnesses. Keep authored manifests as source, generated catalog as derived output, and `apn-web/public/idle` as a release projection.

**Tech Stack:** Browser ES modules, Canvas, DOM/CSS, Node.js QA scripts, direct Chrome DevTools harness, JSON Schema, GitHub CLI, Cloudflare Wrangler through the APN Web release scripts.

**Design authority:** `docs/superpowers/specs/2026-08-12-apn-idle-complete-game-closure-design.md`

---

## Universal execution rules

- Work only in `/Users/talatongu/Code/kimi-projects/apn-idle-game/.worktrees/complete-game-closure` and later a clean APN Web branch/worktree. Never touch `/Users/talatongu/Documents/gaf2d`.
- Preserve approved GAF2D V4 bytes, manifests, approval records, and runtime lineage.
- Use `apply_patch` for hand edits. Generated catalog/schema outputs may be produced by their canonical scripts.
- Each feature starts with an assertion that fails for the intended missing behavior. Record the exact RED in `progress.md` before implementation.
- Never weaken a gate to make a test pass. Never introduce a production QA global.
- After every slice: focused checks → `npm test` → browser evidence as applicable → diff/status audit → review → commit/push/ready PR/merge.
- After merge: update the worktree to latest `origin/main`, create the next `codex/` branch, and verify clean status.

## Slice A — Route journey and Echo archive (#24)

### Task A1: Lock the Route/Echo domain contract with RED tests

**Files:**
- Create: `qa/check-route-journey.mjs`
- Modify: `qa/run-tests.mjs`
- Test: `qa/check-route-journey.mjs`

**Assertions:**

- a fresh route owns zeroed three-slot Echo state on demand without fake finds;
- wave 3/6/9 clears discover exactly one Echo once;
- wave 10 records the Pack completion, visit count, history entry, and next Pack;
- history is capped at 60 while exact visit counts remain;
- all current catalog Packs complete the Clean Era monotonically;
- Zone 200 reveals tier-1 Signal Drift and tiers stay ≤4;
- journey projection is pure and supplies current, next, progress, and state;
- normalization sanitizes malformed additions and is idempotent;
- adding a fixture Pack changes totals without a wipe or hardcoded count.

**RED command:**

```bash
node qa/check-route-journey.mjs
```

Expected first failure: missing exported Route/Echo transition and journey helpers.

### Task A2: Implement the smallest pure Route transition

**Files:**
- Modify: `js/route.js`
- Modify: `js/game.js`

**Interfaces:**

```js
export const ECHO_TOTAL = 3;
export function recordRouteZoneClear(route, catalog, completedZone) {}
export function routeJourney(route, catalog) {}
export function echoProgressFor(route, packId) {}
```

Move Pack-boundary mutation out of `onKill` into the helper. Keep combat and effects in `game.js`. Do not change scheduler order or Go Live boundaries.

**GREEN command:** `node qa/check-route-journey.mjs`

### Task A3: Persist and migrate without a save-key bump

**Files:**
- Modify: `js/save.js`
- Modify: `qa/run-tests.mjs`
- Test: `qa/check-route-journey.mjs`

Add v1/v2/v3 migration, malformed-input, round-trip, idempotency, future-save write-guard, and rollback-read tests. Verify the same normalized bytes after a second apply/save cycle.

**Commands:**

```bash
node qa/check-route-journey.mjs
node qa/run-tests.mjs
```

### Task A4: Put journey before objectives

**Files:**
- Modify: `js/ui.js`
- Modify: `css/game.css`
- Modify: `js/main.js`
- Modify: `qa/browser/chrome-route-smoke.mjs`
- Modify: `qa/run-tests.mjs`

Render current/next Pack, Clean Era meter/completion, Echo archive, Drift tier, and recent history before the existing Season/Daily/Weekly block. Keep current DOM shell and five-nav contract. Extend `render_game_to_text`; extend only the query-gated `__APN_QA__` actions needed for deterministic browser setup.

**Focused commands:**

```bash
node qa/run-tests.mjs
node qa/browser/chrome-route-smoke.mjs
```

Inspect screenshots at 375×812, 428×926, 844×390, and desktop. Confirm no overflow, console/network failure, hidden fake progress, or <44px interactive target.

### Task A5: Document, full verify, review, and merge

**Files:**
- Modify: `docs/GAME-PACK-ROUTE.md`
- Modify: `docs/product/PRODUCT-SYSTEM.md`
- Modify: `progress.md`

**Commands:**

```bash
npm test
node qa/long-run.mjs
git diff --check
git status --short --branch
```

Review against this plan, commit as a focused Route/Echo slice, push, open a ready PR that closes #24, wait for checks, merge, and verify `main` clean/aligned.

## Slice B — Coverage Mastery and Sets (#25)

### Task B1: Write Coverage RED tests first

**Files:**
- Create: `js/coverage.js`
- Create: `qa/check-coverage.mjs`
- Modify: `qa/run-tests.mjs`

Write tests before production exports exist. Assert five levels, exact costs, Pack/revisit scope, `covered` definition, seven visible Set definitions, open slots ignored, explicit claims, permanent claims after catalog extension, and zero access to `meta.live`/`economyMult`.

**RED command:** `node qa/check-coverage.mjs`

### Task B2: Implement pure Coverage helpers and state mutations

**Files:**
- Modify: `js/coverage.js`
- Modify: `js/game.js`
- Modify: `js/formulas.js`
- Modify: `js/save.js`

**Interfaces:**

```js
export const COVERAGE_MAX_LEVEL = 5;
export const COVERAGE_SETS = Object.freeze([...]);
export function coverageMasteryCost(level) {}
export function coverageYieldMultiplier(state, packId, tier) {}
export function coverageSetStatus(state, route, setId) {}
export function buyCoverageMastery(state, packId) {}
export function claimCoverageSetCapstone(state, setId) {}
```

Apply only the four listed numeric capstones at their existing reward/HP/offline boundaries. Cosmetic capstones affect only rendered class/copy. Persist and sanitize both new meta fields.

### Task B3: Render mastery and Sets in Route

**Files:**
- Modify: `js/ui.js`
- Modify: `css/game.css`
- Modify: `js/main.js`
- Modify: `qa/browser/chrome-route-smoke.mjs`

Show current Pack mastery purchase, set member progress, claim button, claimed state, and scoped benefit copy. Synthetic completion is allowed only through the query-gated QA surface.

### Task B4: Verify and merge

**Commands:**

```bash
node qa/check-coverage.mjs
node qa/run-tests.mjs
node qa/long-run.mjs
node qa/browser/chrome-route-smoke.mjs
npm test
git diff --check
```

Update balance/product docs and `progress.md`, review, commit, push, ready PR closing #25, merge, and realign.

## Slice C — Rights and catalog gates (#26)

### Task C1: Add failing schema/policy tests

**Files:**
- Create: `docs/product/schemas/pack.schema.json`
- Create: `assets/game-packs/catalog-policy.json`
- Create: `qa/check-catalog-rights.mjs`
- Modify: `scripts/assets/lib.mjs`
- Modify: `scripts/assets/generate-catalog.mjs`
- Modify: `qa/run-tests.mjs`

Before implementation, assert failures for a raw editorial mark used as title, missing/escaping rights pointer, blocked mode, kill-switched Pack, malformed review evidence, and hardcoded catalog count. Assert pending-review yields a warning, not fake approval. Assert a temporary valid extra Pack passes.

**RED command:** `node qa/check-catalog-rights.mjs`

### Task C2: Implement pointer validation and filtering

**Files:**
- Modify: `scripts/assets/lib.mjs`
- Modify: `scripts/assets/generate-catalog.mjs`
- Modify: `scripts/assets/validate-manifests.mjs`
- Modify: `js/assets.js`

Load policy and pointer files inside the repository, validate schemas/closed keys, filter blocked/kill-switched Packs before generation, emit deterministic warnings, and keep an empty-catalog fallback safe. Remove literal 20-count requirements from catalog and Route tests while retaining current-content coverage assertions derived from authored manifests.

### Task C3: Migrate all current Pack manifests honestly

**Files:**
- Modify: `assets/game-packs/*/pack.json` (20 files)
- Create: `assets/game-packs/*/rights.json` (20 files)
- Regenerate: `assets/game-packs/catalog.json`
- Regenerate: `js/generated/game-packs.js`

Add schema/version, APN runtime display title, raw `editorialReference`, and rights pointer. Use only `pending-review`/`needs-legal-review` unless an existing evidence file proves otherwise. Do not alter asset or GAF2D motion paths/hashes.

### Task C4: Separate runtime and editorial presentation

**Files:**
- Modify: `js/ui.js`
- Modify: `js/render.js` only if it directly renders Pack title
- Modify: `index.html`
- Modify: `css/game.css`
- Modify: `qa/check-copy.mjs`

Gameplay surfaces read `title`; the editorial reference/ticker may read `editorialReference` and must show a non-affiliation notice. Add fallback and kill-switch browser fixtures.

### Task C5: Verify and merge

**Commands:**

```bash
node scripts/assets/generate-catalog.mjs
node scripts/assets/validate-manifests.mjs
node qa/check-catalog-rights.mjs
node qa/check-copy.mjs
node qa/check-route.mjs
npm test
git diff --check
```

Update rights/catalog docs and `progress.md`, review generated diffs, commit, push, ready PR closing #26, merge, and realign.

## Slice D — Assertion-first balance closure (#29)

### Task D1: Turn targets into failing executable assertions

**Files:**
- Create: `qa/check-balance-targets.mjs`
- Modify: `qa/pacing-profiles.mjs`
- Modify: `qa/long-run.mjs`
- Modify: `qa/run-tests.mjs`

Export deterministic profile measurements and compare explicit outcomes, not implementation constants. Capture the baseline table in `progress.md`. The first run must fail at least the currently unmet Relay/first-Go-Live target.

**RED command:** `node qa/check-balance-targets.mjs`

### Task D2: Apply tuning round one only

**Files:**
- Modify: `js/formulas.js`
- Modify: `js/game.js` only if a Build reward lever is required
- Modify: `docs/BALANCE.md`

Name the permanent-budget exponent constant and set it within 0.4–0.5. Change only the smallest existing Build lever necessary. Record before/after metrics.

### Task D3: Use at most one additional tuning round

If a target remains unmet, diagnose the measured cause and perform one more bounded change. If success would require new currency, paid power, a second prestige, another global multiplier, or ordinary one-frame targets, stop and raise the exact owner gate while continuing independent release preparation.

### Task D4: Full deterministic and browser verification

**Commands:**

```bash
node qa/check-balance-targets.mjs
node qa/pacing-profiles.mjs
node qa/long-run.mjs
node qa/run-tests.mjs
npm test
node qa/browser/chrome-route-smoke.mjs
git diff --check
```

Update docs and `progress.md`, review, commit, push, ready PR closing #29, merge, and realign.

## Slice E — Release projection, deploy, and production proof (#30/#31)

### Task E1: Freeze the game release candidate

Read APN Web instructions and the `apn-web-context`, `cloudflare-deploy`, and `wrangler` skills. Run game full tests from clean `main`. Record the source commit and complete deterministic file inventory; ensure approved V4 hashes are unchanged.

### Task E2: Project to APN Web with rollback metadata

**Repository:** `/Users/talatongu/Code/kimi-projects/apn-web`

**Files:**
- Replace deterministically: `public/idle/`
- Create/update: `public/idle/release.json`
- Modify: release documentation/changelog required by APN Web instructions

Create the required Linear issue/branch before mutation. `release.json` records game source commit, projection timestamp, complete inventory hash, entry hashes, and previous production release/rollback identifier. Do not hand-edit projected runtime files.

### Task E3: Verify APN Web locally

Run all APN Web static validation, build/type/lint/tests required by its current instructions, start its documented local server, and execute the same browser matrix at `/idle/`. Compare source/projection hashes.

### Task E4: Merge and deploy

Commit, push, open a ready APN Web PR, wait for checks, merge, update local `main`, run the documented Cloudflare production deploy command, and capture the deployment/version identifier. Do not claim completion on a CLI exit alone.

### Task E5: Production smoke and closeout

Use cache-bypass URLs and verify:

- release and entry hashes match the merged projection;
- 375×812, 428×926, 844×390, and desktop have no material overflow;
- start → Build → Gate → Gear → Go Live → Route/Echo → Coverage/capstone → Zone-200 Drift chain is reachable through the production build;
- save reload and offline return preserve Route, Echo, mastery, claimed Sets, and Go Live guards;
- no console error, failed required request, missing/fallback V4 asset, or production QA global;
- reduced motion, focus, touch targets, and non-affiliation copy are intact.

Rollback immediately using the recorded prior release if a stop condition fires. Otherwise close #30 and #31 with exact evidence, reconcile stale docs and issues, and verify both repositories are clean and `0/0` against upstream.

## Final verification record

The final handoff must include:

- game and web commit SHAs;
- every PR URL and merge commit;
- focused/full test commands and exact pass summaries;
- browser viewports and inspected evidence paths;
- source/projection/production hashes;
- Cloudflare deployment identifier;
- production smoke results;
- rollback release identifier and whether rollback was used;
- final repo status/ahead/behind;
- any genuine remaining legal-review item clearly labelled non-blocking or blocking based on the enforced runtime policy.
