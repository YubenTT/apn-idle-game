# GAF2D Valorant Creature Integration Plan

> **For agentic workers:** use `superpowers:subagent-driven-development` and
> `superpowers:test-driven-development`.
> Work only in `codex/gaf2d-2d-identities`.

**Goal:** Ship the six owner-approved GAF2D identities as the complete first-pack
creature cast without changing APN Hero V3 or adding 3D.

**Architecture:** GAF2D remains identity authority.
A portable manifest maps approved source bytes to fixed crop recipes.
A build-time script validates hashes and produces the existing seven-cell pack
atlas contract.
`js/game.js` owns the authored Wave 1–10 cast pools; `js/render.js` guarantees
that Valorant uses pack art rather than legacy V3 creature overrides.

**Tech stack:** Vanilla ES modules, Canvas 2D, Node QA, ImageMagick and `cwebp`
as optional build-time tools, WebP/JSON runtime assets.

## Task 1 — Record the approved architecture

**Files:**

- Add: `docs/superpowers/specs/2026-07-26-gaf2d-valorant-creatures-design.md`
- Add: `docs/decisions/ADR-0013-gaf2d-static-creature-atlas.md`
- Modify: `docs/decisions/README.md`

- [ ] Record the exact identity/cell/wave contract and acceptance criteria.
- [ ] Index ADR-0013.
- [ ] Commit the approved design before runtime changes.

## Task 2 — Lock identities and build the deterministic atlas

**Files:**

- Add: `assets/game-packs/valorant/gaf2d-sources.json`
- Add: `scripts/assets/build-gaf2d-targets.mjs`
- Modify: `assets/game-packs/valorant/targets.webp`
- Modify: `assets/game-packs/valorant/targets.json`
- Modify: `assets/game-packs/valorant/source-board.md`
- Test: `qa/check-gaf2d-valorant.mjs`

- [ ] Record the six owner approvals in the authoritative GAF2D project.
- [ ] Add a failing contract for approval/source hashes, seven cells, alpha,
      pivots, direction, WebP size, and deterministic derivative hashes.
- [ ] Implement a path-portable, argument-array atlas builder.
- [ ] Build twice and require identical output hashes.
- [ ] Inspect actual-size cells and a real-game composite.

## Task 3 — Enforce the authored first-pack cast

**Files:**

- Modify: `assets/game-packs/valorant/pack.json`
- Modify: `js/game.js`
- Modify: `js/content.js`
- Modify: `js/render.js`
- Modify: `qa/check-creatures.mjs`
- Modify: `qa/run-tests.mjs`

- [ ] Add failing tests for all ten wave pools and seeded mixed-wave selection.
- [ ] Add failing tests that Valorant resolves no V3 creature override.
- [ ] Implement one pure wave-pool resolver in the domain layer.
- [ ] Keep existing HP, rewards, kill budgets, and non-Valorant behavior.
- [ ] Regenerate `assets/game-packs/catalog.json` and
      `js/generated/game-packs.js`; never hand-edit them.

## Task 4 — Add deterministic browser QA controls

**Files:**

- Modify: `js/main.js`
- Add or modify: `qa/browser/chrome-gaf2d-creatures.mjs`

- [ ] Expose a concise `renderGameToText()` and fixed-step
      `advanceTime(milliseconds)` only under the existing QA query gate.
- [ ] Drive waves 1–10 at 375×812, 428×926, and 844×390.
- [ ] Assert current pack, enemy label/frame, boss-break state, zero horizontal
      overflow, decoded asset readiness, and zero console errors.
- [ ] Capture review evidence with sound muted.

## Task 5 — Reconcile documentation and generated state

**Files:**

- Modify: `docs/ASSET-ENGINE.md`
- Modify: `docs/ART-PIPELINE.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PERF-BUDGET.md`
- Modify: `CHANGELOG.md`
- Modify: `progress.md`
- Regenerate: `assets/manifest.json`

- [ ] Document the static GAF2D lane without weakening Hero or provider gates.
- [ ] Record measured atlas and first-playable bytes with date 2026-07-26.
- [ ] Record browser evidence and the unchanged Hero boundary.
- [ ] Regenerate catalogs/manifests with repository scripts.

## Task 6 — Verify, review, and close

- [ ] Run focused atlas and creature contracts.
- [ ] Run `node qa/run-tests.mjs`.
- [ ] Run `node qa/playthrough.mjs`.
- [ ] Run `node qa/pacing-profiles.mjs`.
- [ ] Run `node qa/long-run.mjs`.
- [ ] Run the muted browser matrix and inspect screenshots.
- [ ] Run `git diff --check` and scan for secrets, absolute user paths, private
      media, unrelated files, and generated-file drift.
- [ ] Request an independent findings-first code review.
- [ ] Fix every in-scope finding and repeat the affected gates.
- [ ] Finish with a clean worktree and an evidence-backed final report.

