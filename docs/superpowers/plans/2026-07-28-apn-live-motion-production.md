# APN Live Motion Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one complete, identity-locked authored motion-set candidate
for APN Hero and each of the six first-pack creatures, perform deterministic
mechanical and temporal QA, and stop with all seven sets ready for the owner's
single final creative approval.

**Architecture:** Higgsfield/Grok supplies only private, focused source clips.
GAF2D enforces rights, uploads, model identity, known-cost budgets, source
lineage, extraction, shared normalization, hash locking, and the human approval
gate. A deterministic project-local adapter selects the exact contracted
frames and emits strict decoded-frame plus V2 clip manifests. APN Idle remains
offline, Canvas-only, and unchanged until motion-set approval.

**Tech Stack:** Python 3.12, GAF2D CLI/domain services, Higgsfield CLI 1.1.19,
`grok_video_v15`, ffmpeg/ffprobe, Pillow, strict JSON, pytest, Node QA, Local
Studio, Playwright browser QA.

## Global Constraints

- Exactly seven identities and exactly 39 focused provider jobs:
  `8 + (5 × 5) + 6 = 39`.
- Exactly one five-second, 480p candidate per required clip from the outset.
  No speculative branches or silent retries.
- A retry is allowed only for a recorded mechanical failure such as corrupt
  bytes, missing subject, added limb, baked platform, camera motion, or identity
  break; it uses the same clip contract and a recorded reason.
- Every job's first and only image source is the current hash-approved,
  single-subject, platform-free identity image for that asset.
- The source prompt requires a locked gameplay camera, fixed framing, one
  subject, flat `#00FF00` background, no floor, stand, pedestal, cast shadow,
  reflection, underglow, text, props, extra limbs, or camera motion.
- Live execution requires confirmed rights, explicit source-upload permission,
  authenticated exact model availability, a known estimate, and an explicit
  per-run budget at or above that estimate. Unknown cost and model fallback
  remain rejected.
- Provider clips are source evidence, not approved game assets. Frame selection,
  alpha extraction, shared normalization, temporal proof, and review are local
  and deterministic.
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

**Repository:** `/Users/talatongu/Code/kimi-projects/gaf2d`

**Files:**

- Modify: `src/gaf2d/workflows.py`
- Modify: `tests/unit/test_workflow_hardening.py`

- [ ] Write a regression proving live parameter schema discovery happens
  before the persisted command preview.
- [ ] Confirm the focused test fails on the old order.
- [ ] Discover only when live request parameters are non-empty, then build the
  redacted preview. Preserve zero-I/O offline dry-run behavior.
- [ ] Run focused provider/workflow tests, full pytest, Ruff check/format, and
  mypy before committing.

## Task 2: Freeze portable batch inputs

**Private asset project:**
`/Users/talatongu/Code/kimi-projects/apn-idle-game-gaf2d`

**Files:**

- Create: `briefs/live-motion-v1/batch.json`
- Create: `briefs/live-motion-v1/parameters-480p.json`
- Create: `briefs/live-motion-v1/<asset-id>/<clip>.txt`
- Create: `briefs/live-motion-v1/source-locks.json`

- [ ] Verify all seven assets are `identity_approved`, authored, rights
  confirmed, upload allowed, and bound to current identity hashes.
- [ ] Generate one closed-world batch record per clip containing asset ID, clip
  name, frame count, FPS, playback, prompt path, approved source relative path,
  approved source SHA-256, model, duration, and resolution.
- [ ] Reject duplicate/missing clips, noncurrent identity sources, absolute
  paths, unknown keys, and any total other than 39.
- [ ] Make prompt text identity-specific and motion-specific while retaining
  the universal locked-camera/chroma/platform-free constraints.

## Task 3: Cost preflight and bounded live production

**State boundary:** GAF2D project config and private provider job bundles only.

- [ ] Run a single Hero `idle` live attempt with credit budget `0`. This may
  upload only the approved Hero identity for provider cost estimation; it must
  not create a generation job.
- [ ] Record the exact known per-job estimate without storing provider secrets
  or private URLs.
- [ ] Set `credit_budget_per_run` to exactly that estimate, keep unknown-cost
  rejection on, and validate exact `grok_video_v15` availability.
- [ ] Run the 39 jobs serially through `gaf2d generate motion`. Resume by GAF2D
  job identity after interruption; never create a duplicate completed job.
- [ ] After every job, verify successful materialization, safe provider job ID,
  one playable video, registered provenance, and output SHA-256.
- [ ] Stop immediately on cost increase, auth loss, model mismatch, rights
  mismatch, identity hash drift, or malformed output.
- [ ] Record before/after credit balance and the exact successful/retried job
  count in the private production report.

## Task 4: Deterministic frame adapter

**Private asset-project files:**

- Create: `tools/build_live_motion_adapters.py`
- Create: `tools/test_build_live_motion_adapters.py`
- Create: `motion/live-v1/<asset-id>/decoded-frame-manifest.json`
- Create: `motion/live-v1/<asset-id>/clip-manifest.json`
- Create: `motion/live-v1/<asset-id>/selection.json`
- Create: `motion/live-v1/<asset-id>/source.mp4`

- [ ] Write failing tests for the exact 39-clip contract, stable hashes,
  strictly increasing timestamps, fixed durations, one-use frame assignment,
  progress final-frame hold, and loop seam scoring.
- [ ] Decode each focused clip locally at a deterministic sampling rate.
- [ ] For loops, choose an ordered window with the lowest seam error that still
  exceeds the minimum inter-frame motion threshold; omit the repeated endpoint.
- [ ] For progress clips, choose monotonic action coverage including the neutral
  start and readable held terminal state.
- [ ] Reject automatic selection on camera drift, chroma contamination,
  silhouette truncation, identity loss, platform pixels, insufficient motion,
  or impossible loop closure. A rejection is a recorded mechanical retry, not
  creative approval.
- [ ] Concatenate each asset's focused source clips deterministically into one
  local source video and bind every selected frame to clip/job/output hashes.
- [ ] Build twice in separate temporary directories and require identical PNG,
  manifest, and selection hashes.

## Task 5: GAF2D extract and named-set preparation

- [ ] Register each deterministic combined video as the asset's manual motion
  source with portable origin/hash lineage.
- [ ] Dry-run `gaf2d motion extract` with the strict decoded-frame manifest,
  `--matte-rgb 0,255,0`, and one fixed reviewed matte tolerance.
- [ ] Commit extraction only after dry-run passes. Require transparent corners,
  no green fringe at actual gameplay size, and one shared source canvas.
- [ ] Dry-run `gaf2d motion prepare-set` with the V2 clip manifest.
- [ ] Commit preparation only after every extracted frame is assigned exactly
  once and all required clips match the fixed contract.
- [ ] Verify each asset is exactly `awaiting_motion_approval`, with no motion
  approval record written.

## Task 6: Mechanical, temporal, and visual QA

- [ ] Run project validation, integrity QA, deterministic double-build checks,
  and all focused adapter tests.
- [ ] For every clip inspect frame zero, midpoint, last frame, contact sheet,
  full-speed preview, 0.25× preview, loop seam, silhouette, alpha edge, pivot,
  and actual gameplay scale.
- [ ] Reject whole-sprite sliding as authored motion, baked bases/stands,
  shadows, green halos, crop jitter, scale pumping, extra anatomy, camera
  motion, foot sliding, rubber deformation, pose ambiguity, or identity drift.
- [ ] Compare Hero against the approved nine-view authority with special checks
  for legless silhouette, integrated visor geometry, red material continuity,
  and restrained highlight brightness.
- [ ] Compare each creature against its approved identity and anatomy-specific
  acting contract.
- [ ] Run an independent read-only review and resolve every fixable finding
  before presenting the gate.

## Task 7: Owner approval surface

- [ ] Refresh Local Studio at `http://127.0.0.1:43127/`.
- [ ] Present exactly seven motion-set review cards, each with named clips,
  speed controls, contact sheet, temporal proof, source/candidate hashes, and
  explicit pass/fail notes.
- [ ] Show total job count, retry count, exact credits spent, and a privacy
  summary without exposing credentials or signed URLs.
- [ ] Verify no card contains a stored approval and every asset remains
  `awaiting_motion_approval`.
- [ ] Stop and ask the owner for the seven explicit motion-set approvals. Do
  not continue to rig, export, integration, push, or deploy.
