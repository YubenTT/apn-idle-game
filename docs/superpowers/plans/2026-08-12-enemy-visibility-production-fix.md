# ALL-257 Enemy Visibility Production Fix Plan

> **For Codex:** Execute with `superpowers:executing-plans`. Preserve RED → minimal GREEN → fresh verification. Stop on an unexplained test, asset, rights, save, network, or production-fingerprint mismatch.

**Goal:** Restore every non-motion enemy body on APN Idle, preserve the approved V4 motion path, and ship the exact corrected game tree through APN Web to Cloudflare production.

**Root cause:** `draw()` creates a fresh interpolation copy of every enemy on every frame. Static targets and legacy creatures key their spawn clock by the object passed to the painter. Their `WeakMap` therefore sees a new actor every frame and holds the body scale at the first-frame value of zero. HP plates and combat state render outside that transform, while mapped V4 motion bodies bypass it; that is the exact production symptom.

**Architecture:** Keep interpolation coordinates on the render copy, but pass the persistent domain enemy as the presentation owner. Spawn clocks use that stable owner; motion retention already uses the same owner boundary. No art, game-state, balance, save, catalog, rights, or public QA-surface change.

**Authority:** The owner explicitly authorized implementation, PRs, merges, Cloudflare deployment, and production smoke on 2026-08-12. Linear authority: `ALL-257`. Roll back to game `5061b5c8dc66bfddbcea4ff1d339c90c825d670b` and Web `924c7a8aef63f5b96b0cee2a0bbe2883aea54402` if the post-deploy gates fail.

## Task 1 — Lock the regression in Node

**Files:**
- Modify: `qa/check-creatures.mjs`

Add a behavioral assertion that draws two interpolation copies of one persistent enemy at separated timestamps. Capture Canvas scale calls. The second static target draw and the second legacy-creature draw must have a positive, settled body scale. Do not assert source text or implementation names.

**RED:**

```bash
node qa/check-creatures.mjs
```

Expected failure: the second draw still scales the body to zero because the clone is treated as newly seen.

## Task 2 — Apply the smallest owner fix

**Files:**
- Modify: `js/render.js`
- Modify: `js/enemies-v2.js`

Pass `env.retentionOwner || enemy` as the persistent presentation owner to both non-motion painters. Use it only for the first-seen spawn clock; continue drawing with the interpolation copy. Preserve mapped-motion pending/no-flash and failed/static-fallback behavior.

**GREEN:**

```bash
node qa/check-creatures.mjs
node qa/check-motion-bundle.mjs
node qa/check-motion-store.mjs
```

## Task 3 — Add a real browser visibility gate

**Files:**
- Modify: `qa/browser/chrome-catalog-rights-smoke.mjs`

Use the existing query-gated manual clock and the already-CI-owned catalog/right Chrome process. For every runtime-safe Pack, spawn one deterministic live target, read its actual stage body envelope, and assert the body region differs materially from the same background-only region. Cover all 20 Pack IDs, atlas/static targets, a procedural fallback, one warmed legacy creature, and Valorant mapped V4 motion. Fail on console errors/warnings, required request failures, or horizontal overflow.

Keep CI efficient: extend the existing smoke in its existing served Chrome job; do not add a script invocation, job, matrix, install, or duplicate full suite.

**Verification:**

```bash
node qa/browser/chrome-catalog-rights-smoke.mjs
npm test
```

Inspect representative screenshots for Fortnite Route 24, procedural fallback, legacy creature, and Valorant V4 at mobile and landscape sizes.

## Task 4 — Document and review the game patch

**Files:**
- Modify: `progress.md`
- Modify: `CHANGELOG.md`
- Modify: `qa/QA-REPORT.md`

Record the production reproduction, exact RED, root cause, scope, test counts, browser evidence, and deliberate non-changes. Run:

```bash
npm test
node qa/browser/chrome-route-smoke.mjs
node qa/browser/chrome-go-live-smoke.mjs
node qa/browser/chrome-catalog-rights-smoke.mjs
git diff --check
git status --short --branch
```

Review the exact head, commit, push `codex/ALL-257-enemy-visibility`, open a ready game PR with `Refs ALL-257`, wait for natural CI/GitGuardian, merge, and verify game `main` clean/equal `origin/main`.

## Task 5 — Project exact game main into APN Web

Create a clean APN Web worktree and branch `ALL-257-idle-enemy-visibility-release` from fresh `origin/main`. Read the Web release/session docs before edits. Use the canonical projection/release script; do not hand-copy files. Require the release manifest to bind the exact merged game SHA and tree hash.

Run the full Web gate required by its repository contract:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check:forbidden
npm run check:secrets
git diff --check
```

Commit, push, open a ready Web PR containing exactly one `Closes ALL-257`, wait for natural checks and exact-head review, merge, and verify Web `main` clean/equal `origin/main`.

## Task 6 — Deploy and prove production

From exact Web `main`, run the canonical production deploy and smoke commands. Verify Cloudflare deployment/Worker IDs, `x-apn-build-commit`, release-manifest game SHA/tree hash, asset response headers/bytes, Fortnite Route 24 visible target pixels, all-Pack visibility, Hero/V4 motion, save continuity, console/network, overflow, and responsive screenshots.

If any production assertion fails, stop and roll back to the recorded Web deployment instead of patching live ad hoc.

## Task 7 — Close without debris

Append durable closeout evidence to `ALL-257`, remove `agent:in-flight`, set Done only after live readback, close browser tabs/servers, remove merged worktrees and branches where safe, and prove both repository mains are clean and equal origin. Do not leave generated screenshots or temporary logs tracked.
