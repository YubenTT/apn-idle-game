# APN Live Motion Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one complete, identity-locked authored motion-set candidate
for APN Hero and each of the six first-pack creatures, perform deterministic
mechanical and temporal QA, and stop with all seven sets ready for the owner's
single final creative approval.

**Architecture:** The final candidate set is hybrid but closed-world. Two
quality-passed Higgsfield/Seedance sources supply APN Hero `idle` and Entry
Runner `advance`; the other 37 clips are authored deterministically from the
same approved identity bytes after Higgsfield reached an external full-access
limit. GAF2D enforces rights, upload and budget gates, source lineage,
extraction, shared normalization, hash locking, and the human approval gate.
Project-local adapters emit strict decoded-frame plus V2 clip manifests. APN
Idle remains offline, Canvas-only, and unchanged until motion-set approval.

**Tech Stack:** Python 3.12, GAF2D CLI/domain services, Higgsfield CLI 1.1.19,
Seedance 2.0, deterministic Pillow/NumPy 2D authoring, ffmpeg/ffprobe, strict
JSON, pytest, Node QA, Local Studio, Playwright browser QA.

## Global Constraints

- Exactly seven identities and exactly 39 named clip candidates:
  `8 + (5 × 5) + 6 = 39`.
- Exactly one selected candidate per required clip. Two come from bounded live
  provider jobs and 37 from the deterministic local authored fallback. No
  speculative branches or silent retries.
- A retry is allowed only for a recorded mechanical failure such as corrupt
  bytes, missing subject, added limb, baked platform, camera motion, or identity
  break; it uses the same clip contract and a recorded reason.
- Every provider/local authoring input is the current hash-approved,
  single-subject, platform-free identity image for that asset.
- The source prompt requires a locked gameplay camera, fixed framing, one
  subject, flat `#00FF00` background, no floor, stand, pedestal, cast shadow,
  reflection, underglow, text, props, extra limbs, or camera motion.
- Live execution requires confirmed rights, explicit source-upload permission,
  authenticated exact model availability, a known estimate, and an explicit
  per-run budget at or above that estimate. Unknown cost and model fallback
  remain rejected.
- Provider clips and local authoring recipes are source evidence, not approved
  game assets. Frame selection, alpha extraction, shared normalization,
  temporal proof, and review are local and deterministic.
- Clip counts, order, FPS, and playback are closed-world. No runtime bob,
  translation, or squash may substitute for authored pixels.
- The agent may prepare and review candidates but must not write
  `MotionSetApproval`. Stop with all seven assets at
  `awaiting_motion_approval`.
- No rig approval, pack build, export, game integration, release approval,
  publish, push, or deploy in this plan.
- Private source bytes, machine paths, signed URLs, credentials, and provider
  response payloads never enter git.

## Fixed motion contract

### APN Hero

| Clip | Frames | FPS | Playback | Acting |
|---|---:|---:|---|---|
| `idle` | 8 | 12 | loop | restrained hover-breath; stable visor |
| `run` | 10 | 16 | loop | forward propulsion, arm counter-swing, no legs |
| `attack` | 8 | 16 | progress | anticipation, forward strike, recovery |
| `crit` | 8 | 16 | progress | stronger readable strike, controlled recoil |
| `sprint` | 10 | 20 | loop | faster forward propulsion, no camera travel |
| `hit` | 4 | 16 | progress | short impact recoil; identity preserved |
| `death` | 8 | 16 | progress | readable shutdown/fall without added anatomy |
| `celebrate` | 8 | 16 | loop | compact victory gesture; loop closes cleanly |

### Creatures

| Clip | Frames | FPS | Playback |
|---|---:|---:|---|
| `idle` | 8 | 8 | loop |
| `advance` | 8 | 10 | loop |
| `engaged` | 6 | 12 | loop |
| `hit` | 4 | 16 | progress |
| `death` | 8 | 8 | progress |
| `broken` (Site Warden only) | 8 | 8 | loop |

Anatomy-specific acting remains exactly as defined in
`2026-07-28-gaf2d-authored-motion-design.md`. `engaged` is a brace/reaction, not
an enemy attack.

## Task 1: Harden parameterized live execution

**Repository:** the local `gaf2d` framework checkout (`$GAF2D_REPO`)

**Files:**

- Modify: `src/gaf2d/workflows.py`
- Modify: `tests/unit/test_workflow_hardening.py`

- [x] Write a regression proving live parameter schema discovery happens
  before the persisted command preview.
- [x] Confirm the focused test fails on the old order.
- [x] Discover only when live request parameters are non-empty, then build the
  redacted preview. Preserve zero-I/O offline dry-run behavior.
- [x] Run focused provider/workflow tests, full pytest, Ruff check/format, and
  mypy before committing.

## Task 2: Freeze portable batch inputs

**Private asset project:** the local APN GAF2D project
(`$APN_GAF2D_PROJECT`)

**Files:**

- Create: `briefs/live-motion-v1/batch.json`
- Create: `briefs/live-motion-v1/parameters-480p.json`
- Create: `briefs/live-motion-v1/prompts/<asset-id>--<clip>.txt`
- Create: `briefs/live-motion-v1/source-locks.json`

- [x] Verify all seven assets are `identity_approved`, authored, rights
  confirmed, upload allowed, and bound to current identity hashes.
- [x] Generate one closed-world batch record per clip containing asset ID, clip
  name, frame count, FPS, playback, prompt path, approved source relative path,
  approved source SHA-256, model, duration, and resolution.
- [x] Reject duplicate/missing clips, noncurrent identity sources, absolute
  paths, unknown keys, and any total other than 39.
- [x] Make prompt text identity-specific and motion-specific while retaining
  the universal locked-camera/chroma/platform-free constraints.

## Task 3: Cost preflight and bounded live production

**State boundary:** GAF2D project config and private provider job bundles only.

- [x] Run a single Hero `idle` live attempt with credit budget `0`. This may
  upload only the approved Hero identity for provider cost estimation; it must
  not create a generation job.
- [x] Record the exact known per-job estimate without storing provider secrets
  or private URLs.
- [x] Set `credit_budget_per_run` to exactly the estimate, keep unknown-cost
  rejection on, and validate exact Seedance 2.0 availability.
- [x] Run and select the bounded Hero `idle` and Entry Runner `advance` jobs.
  Stop live production when Higgsfield reports `grace_daily_limit_reached`;
  do not bypass or duplicate the blocked jobs.
- [x] After every created job, verify successful materialization, safe provider job ID,
  one playable video, registered provenance, and output SHA-256.
- [x] Stop immediately on cost increase, auth loss, model mismatch, rights
  mismatch, identity hash drift, or malformed output.
- [x] Record before/after credit balance and the exact successful/retried job
  count in the private production report.
- [x] Return the live budget to zero after the external stop.

Recorded execution facts: opening balance `1021.38`, closing balance `953.88`,
total debit `67.50`; three Grok attempts at `12.50` and two Seedance 2.0 jobs
at `15.00`. Two Grok videos were rejected for camera/direction drift and one
was an orphaned parser-integration attempt. The two Seedance jobs supplied the
retained Hero idle and Entry Runner advance sources. Later blocked creates
created no job and spent no credits.

## Task 4: Deterministic frame adapter

**Private asset-project files:**

- Create: `tools/prepare_live_motion_frames.py`
- Create: `tools/test_prepare_live_motion_frames.py`
- Create: deterministic local authored-fallback builder and tests
- Create: one combined decoded-frame manifest and V2 clip manifest per asset
- Create: per-clip QA, source lineage, contact sheets, and animated proofs

- [x] Write failing tests for the exact 39-clip contract, stable hashes,
  strictly increasing timestamps, fixed durations, one-use frame assignment,
  progress final-frame hold, and loop seam scoring.
- [x] Decode the two selected provider clips locally at a deterministic
  sampling rate and author the remaining clips from the approved transparent
  identity bytes with local articulated transforms.
- [x] For loops, choose an ordered window with the lowest seam error that still
  exceeds the minimum inter-frame motion threshold; omit the repeated endpoint.
- [x] For progress clips, choose monotonic action coverage including the neutral
  start and readable held terminal state.
- [x] Reject automatic selection on camera drift, chroma contamination,
  silhouette truncation, identity loss, platform pixels, insufficient motion,
  or impossible loop closure. A rejection is a recorded mechanical retry, not
  creative approval.
- [x] Bind every provider-derived or locally authored frame to its exact
  source/job/recipe/output hashes. A combined local video is optional; the
  strict immutable RGBA adapter manifest is sufficient source authority.
- [x] Build twice and require identical PNG, manifest, QA, provenance, contact
  sheet, animated-proof, and asset-mirror hashes. The final 640px tree contains
  443 files and is byte-stable.

## Task 5: GAF2D extract and named-set preparation

- [x] Preserve provider job lineage for the two selected clips and exact
  approved-identity plus local-recipe lineage for all fallback frames.
- [x] Dry-run `gaf2d motion extract` with the strict decoded-frame manifest,
  without `--matte-rgb`; inputs are already deterministic transparent RGBA.
- [x] Commit extraction only after dry-run passes. Require transparent corners,
  no green fringe at actual gameplay size, and one shared source canvas.
- [x] Dry-run `gaf2d motion prepare-set` with the V2 clip manifest.
- [x] Commit preparation only after every extracted frame is assigned exactly
  once and all required clips match the fixed contract.
- [x] Verify each asset is exactly `awaiting_motion_approval`, with no motion
  approval record written.

## Task 6: Mechanical, temporal, and visual QA

- [x] Run project validation, pre-approval mechanical QA, deterministic
  double-build checks, and all focused adapter tests. Approval-gated complete
  QA remains intentionally unavailable until the owner approves motion.
- [x] For every clip inspect frame zero, midpoint, last frame, ordered contact
  sheet, exact-cadence animated temporal proof, loop seam, silhouette, alpha
  edge, pivot, and actual gameplay scale. Frame-by-frame review is the
  deterministic slow-inspection surface; no second 0.25× encoded derivative
  is allowed to become competing review authority.
- [x] Reject whole-sprite sliding as authored motion, baked bases/stands,
  shadows, green halos, crop jitter, scale pumping, extra anatomy, camera
  motion, foot sliding, rubber deformation, pose ambiguity, or identity drift.
- [x] Compare Hero against the approved nine-view authority with special checks
  for legless silhouette, integrated visor geometry, red material continuity,
  and restrained highlight brightness.
- [x] Compare each creature against its approved identity and anatomy-specific
  acting contract.
- [x] Run an independent read-only review and resolve every fixable finding
  before presenting the gate.

## Task 7: Owner approval surface

- [x] Refresh Local Studio at `http://127.0.0.1:43127/`.
- [x] Present exactly seven selectable named motion-set review surfaces, each
  with named clips, ordered frame-by-frame contact sheet, exact-cadence
  temporal proof, source/candidate hashes, and explicit pass/fail notes. The
  portable, script-free review deliberately uses deterministic frame-by-frame
  inspection instead of client-side speed controls.
- [x] Show total job count, retry/rejection count, exact credits spent, and a
  privacy summary in the private final report and owner handoff without
  exposing credentials or signed URLs.
- [x] Verify no review contains a stored motion approval and every asset remains
  `awaiting_motion_approval`.
- [x] Stop at the owner gate and ask for the seven explicit motion-set
  approvals. Do
  not continue to rig, export, integration, push, or deploy.
