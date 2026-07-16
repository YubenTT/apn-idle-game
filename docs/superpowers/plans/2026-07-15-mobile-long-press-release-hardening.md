# Mobile Long-Press Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent iOS long-press selection, callouts, and native media dragging across every APN Idle surface without breaking Sprint hold, sheet scrolling, native controls, or links.

**Architecture:** Treat the complete document as a game surface and own gesture suppression in the global CSS boundary, not in individual widgets. Keep intentional gesture behavior local: Canvas and Sprint retain `touch-action: none`; ordinary controls and scrollable sheets retain their existing touch actions. Add a static release contract plus real-browser interaction evidence.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Canvas 2D, Node headless QA, Codex in-app Browser.

## Global Constraints

- Runtime remains zero-dependency static files with no build step.
- No raw palette, type, spacing, or balance values.
- Sound stays disabled through `?mute=1` during browser QA.
- The fix must not change combat, economy, save state, copy, art, or navigation.
- The issue has no intermediate user gate; only the final integrated evidence gate remains.

---

### Task 1: Lock the mobile gesture contract in failing QA

**Files:**
- Create: `qa/check-mobile-gestures.mjs`
- Modify: `qa/run-tests.mjs`

**Interfaces:**
- Consumes: `index.html` and `css/game.css` as shipped static source.
- Produces: `checkMobileGestureContract()` returning named pass/fail checks.

- [x] **Step 1: Write the failing contract**

```js
export function checkMobileGestureContract() {
  return [
    check('WebKit selection is disabled on the complete document', hasDocumentWebkitSelectGuard),
    check('iOS long-press callouts are disabled on the complete document', hasDocumentCalloutGuard),
    check('Canvas and media cannot enter native drag mode', hasMediaDragGuard),
    check('Global gesture hardening does not disable sheet scrolling', !hasGlobalTouchActionNone),
  ];
}
```

- [x] **Step 2: Add the contract to `qa/run-tests.mjs` and run it**

Run: `node qa/run-tests.mjs`

Expected: FAIL on missing `-webkit-user-select`, `-webkit-touch-callout`, and `-webkit-user-drag`; existing domain assertions remain green.

### Task 2: Apply the minimal document-level Safari fix

**Files:**
- Modify: `css/game.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: the Task 1 contract.
- Produces: a document-wide non-selectable/non-callout surface while leaving existing per-control `touch-action` rules intact.

- [x] **Step 1: Add the document and media guards**

```css
html,
body {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

img,
svg,
canvas {
  -webkit-user-drag: none;
}
```

- [x] **Step 2: Cache-bust the stylesheet URL**

Change `game.css?v=redesign-v1` to `game.css?v=redesign-v1-gesture-fix` so the remote Safari review cannot reuse the stale stylesheet.

- [x] **Step 3: Run the focused and complete gates**

Run: `node qa/check-mobile-gestures.mjs && node qa/run-tests.mjs`

Expected: `MOBILE GESTURES PASS` and `ALL PASS`.

### Task 3: Verify real interactions and release readiness

**Files:**
- Modify: `docs/REDESIGN-PLAN.md`
- Modify: `docs/QA-CHECKLIST.md`
- Modify: `docs/ROADMAP.md`
- Modify: `qa/QA-REPORT.md`
- Modify: `CHANGELOG.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: the fixed static build served at `http://127.0.0.1:8790`.
- Produces: I-045 closure and dated release evidence.

- [x] **Step 1: Browser-check the mobile Run surface at 393×852**

Verify page identity, meaningful DOM, zero console warnings/errors, computed selection/callout/drag guards, no horizontal overflow, and a screenshot.

- [x] **Step 2: Exercise the affected interaction chain**

Hold/release Sprint and confirm `aria-pressed` returns to `false`; open Gear,
scroll its sheet, change the native sort control, close the sheet, and confirm the
Run screen remains responsive. A fresh save may correctly have no selectable item.

- [x] **Step 3: Re-run long-run and release checks**

Run: `node qa/long-run.mjs`, `git diff --check`, and the repository hygiene scans documented in `docs/DEFINITION-OF-DONE.md`.

- [x] **Step 4: Update release truth**

Record I-045's automated/browser completion and physical-device hold, add the
long-press/callout criterion to Touch QA, update the stale Roadmap completion
state, and add dated browser evidence to `qa/QA-REPORT.md`.

- [x] **Step 5: Commit the focused issue**

```bash
git add css/game.css index.html qa/check-mobile-gestures.mjs qa/run-tests.mjs docs/REDESIGN-PLAN.md docs/QA-CHECKLIST.md docs/ROADMAP.md qa/QA-REPORT.md CHANGELOG.md progress.md docs/superpowers/plans/2026-07-15-mobile-long-press-release-hardening.md
git commit -m "fix: harden mobile long-press gestures"
```

Do not push or open a PR without the user asking.
