# Run Surface Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an edge-to-edge Run screen whose HUD, meters, action controls, and navigation read as one polished mobile game surface.

**Architecture:** Preserve the existing HTML and Canvas contracts while replacing the final I-013/I-014 presentation rules with a flat Run surface. Keep energy state derived in `js/ui.js`; expose it through stable meter text and control state rather than swapping button copy. Extend the existing headless QA contract and verify the resulting static app in muted real-browser viewports.

**Tech Stack:** Vanilla ES modules, Canvas 2D, CSS custom properties from `brand/tokens.css`, headless Node QA, static-file browser runtime.

## Global Constraints

- `node qa/run-tests.mjs` must end in `ALL PASS`.
- No React, Vue, Pixi, Next.js, build step, or runtime dependency.
- Combat/economy math stays in `js/formulas.js` and `js/game.js`.
- UI and render code do not invent balance values.
- No raw palette values or off-scale sizes in `css/game.css`.
- Touch targets are at least 44 pt and safe areas remain layout inputs.
- Tests and browser checks run with audio muted.
- Use a feature branch and PR chain; never push the dirty Host/GLB worktree.

---

### Task 1: Lock the Run surface contract

**Files:**
- Modify: `qa/run-tests.mjs`
- Test: `qa/run-tests.mjs`

**Interfaces:**
- Consumes: `shellMarkup`, `uiSource`, and `cssSource` already loaded by the suite.
- Produces: static assertions for stable Sprint copy, meter semantics, edge-to-edge stage declarations, and minimum control sizes.

- [ ] **Step 1: Add failing assertions**

```js
ok(!uiSource.includes("'Need energy'") && !uiSource.includes("'Low — grab orbs'"), 'Run avoids transient low-energy helper copy');
ok(/\.hud-stage\s*\{[^}]*margin:\s*0;[^}]*border:\s*0;[^}]*border-radius:\s*0;/s.test(cssSource), 'Run stage is edge-to-edge');
ok(shellMarkup.includes('id="v-energy-lab"') && shellMarkup.includes('id="v-focus-lab"'), 'Run meters expose live values');
ok(/\.btn-chip\s*\{[^}]*min-height:\s*calc\(var\(--touch-min\) \+ var\(--sp-1\)\)/s.test(cssSource), 'Run skills preserve touch targets');
```

- [ ] **Step 2: Run the suite and verify the new contract fails**

Run: `node qa/run-tests.mjs`

Expected: existing domain checks pass; at least the low-energy and edge-to-edge assertions fail.

- [ ] **Step 3: Commit the red contract with the approved design documents**

```bash
git add qa/run-tests.mjs docs/superpowers/specs/2026-07-16-run-surface-polish-design.md docs/superpowers/plans/2026-07-16-run-surface-polish.md
git commit -m "test: lock the seamless Run surface"
```

### Task 2: Implement the continuous HUD and action dock

**Files:**
- Modify: `index.html`
- Modify: `js/ui.js`
- Modify: `css/game.css`
- Modify: `docs/SCREEN-SPECS.md`
- Modify: `brand/COMPONENTS.md`
- Modify: `docs/REDESIGN-PLAN.md`
- Modify: `CHANGELOG.md`
- Test: `qa/run-tests.mjs`

**Interfaces:**
- Consumes: existing `hero.energy`, `state.eMax`, `state.focus`, and `state.fMax` runtime values.
- Produces: `#v-energy-lab` and `#v-focus-lab` percentage/sprint-state labels plus stable `.btn-sprint-sub` copy.

- [ ] **Step 1: Simplify meter and action markup**

Change the two meter headers so each has one semantic label and one live-value element. Keep the Upgrade Weapon object/effect/cost order and render its cost as a single-line value plus currency label.

- [ ] **Step 2: Stabilize runtime copy**

Set `#v-energy-lab` to `Active ×1.85` while sprinting and otherwise to the rounded energy percentage. Set `#v-focus-lab` to the rounded focus percentage. Keep `.btn-sprint-sub` at `Hold · ×1.85`; use the existing disabled/active state to communicate availability.

- [ ] **Step 3: Replace framed-stage and dock CSS**

Make `.hud-stage` use zero margin, border, radius, and shadow. Flatten the telemetry band; define a compact two-meter rail; size the Sprint/Upgrade row to roughly 30/70; present the price on one line; retain four equal 48 pt skill controls and the five-tab safe-area navigation.

- [ ] **Step 4: Update owning documents**

Change `Stage card` to `Gameplay surface`, remove the obsolete radius/border component contract, mark the Run polish issue complete, and record the user-visible change in `CHANGELOG.md`.

- [ ] **Step 5: Run the suite**

Run: `node qa/run-tests.mjs`

Expected: `ALL PASS`.

- [ ] **Step 6: Commit the implementation**

```bash
git add index.html js/ui.js css/game.css docs/SCREEN-SPECS.md brand/COMPONENTS.md docs/REDESIGN-PLAN.md CHANGELOG.md qa/run-tests.mjs
git commit -m "feat: make the Run surface edge to edge"
```

### Task 3: Preserve the approved circular APN mark

**Files:**
- Modify: `assets/apn-logo.svg`
- Modify: `assets/apn-logo-square.png`
- Modify: `index.html`
- Modify: `css/game.css`
- Modify: `docs/ASSETS.md`
- Modify: `tools/character-lab/index.html`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Consumes: the approved circular SVG and transparent-corner PNG from the isolated art worktree.
- Produces: one circular mark across splash, feed, favicon, and Character Lab.

- [ ] **Step 1: Carry only the approved logo files and references**

Apply the circular SVG clip, transparent-corner PNG, round title mask, and cache-busted favicon/feed/title references. Do not copy any Host V2, GLB, atlas, or render-report artifact.

- [ ] **Step 2: Add logo contract checks and run QA**

Run: `node qa/run-tests.mjs`

Expected: circular mark assertions pass and the suite ends in `ALL PASS`.

- [ ] **Step 3: Commit the logo preservation**

```bash
git add assets/apn-logo.svg assets/apn-logo-square.png index.html css/game.css docs/ASSETS.md tools/character-lab/index.html qa/run-tests.mjs
git commit -m "fix: preserve the circular APN mark"
```

### Task 4: Browser QA, review, and integration

**Files:**
- Modify when evidence changes: `progress.md`
- Test: `qa/run-tests.mjs`

**Interfaces:**
- Consumes: the static app served by `./serve.sh` with `?mute=1`.
- Produces: responsive screenshots, console/overflow evidence, a reviewed commit range, and a clean PR chain to `main`.

- [ ] **Step 1: Run the complete automated gate twice**

Run: `node qa/run-tests.mjs && node qa/run-tests.mjs`

Expected: both runs end in `ALL PASS`.

- [ ] **Step 2: Verify muted browser viewports**

Serve the clean worktree and inspect 375×812, 393×852, 428×926, 844×390, and desktop embed. Confirm no horizontal overflow, truncation, console errors, native text selection, or target smaller than 44 pt.

- [ ] **Step 3: Review the exact branch diff**

Run: `git diff --check origin/feat/R-005-free-mvp-economy...HEAD` and inspect every changed file. Confirm no secret, save dump, generated Host candidate, or unrelated artifact is present.

- [ ] **Step 4: Push and integrate through PRs**

Push `feat/R-006-run-surface-polish`, open it against the free-MVP/release chain, wait for required checks, merge in dependency order, then merge the release PR into `main`. Never force-push or push directly to `main`.

- [ ] **Step 5: Post-merge production-tree verification**

Fetch `origin/main` into a fresh clean worktree, run `node qa/run-tests.mjs`, serve with `?mute=1`, and confirm Git status is clean.

