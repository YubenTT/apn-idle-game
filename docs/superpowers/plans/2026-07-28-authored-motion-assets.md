# Authored Motion Asset Production and Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce, review, approve, export, and integrate exact authored motion for APN Hero plus the fixed six-creature first-pack cast without changing identity count or bypassing a GAF2D human gate.

**Architecture:** The sibling GAF2D project holds private source, masks, recipes, candidate frames, review evidence, and approvals. The game repository receives only approved portable derivatives and hashes through one deterministic builder; the runtime plan consumes those bundles.

**Tech Stack:** GAF2D CLI/domain services, Python 3.12, Pillow, ImageMagick, pinned `cwebp`, vanilla Canvas runtime, Node asset QA, Playwright browser QA.

## Global Constraints

- Exactly seven identities; no skins, recolors, variants, or extra creatures.
- APN Hero is legless and follows the owner-supplied nine-view identity authority.
- Creature clips are `idle`, `advance`, `engaged`, `hit`, `death`; Site Warden also has `broken`.
- Hero clips are exactly `idle`, `run`, `attack`, `crit`, `sprint`, `hit`, `death`, `celebrate`.
- Each character uses one current GAF2D named motion-set approval covering every clip.
- Automatic masks are candidates only; exact identity, motion, Hero rig, and release remain human gates.
- One shared source canvas, pivot, and normalization transform covers each approved character set.
- No private media enters git; no absolute source path enters portable metadata.
- No network/provider call, paid call, private upload, 3D, licensed Spine execution, publish, push, or deploy.

---

### Task 1: Replace the invalid Hero identity candidate

**Files in sibling GAF2D project:**
- Create: `tools/build_apn_hero_identity.py`
- Create: `tools/test_build_apn_hero_identity.py`
- Create: `review/apn-hero-legless-contact-sheet.png`
- Create through GAF2D: `assets/apn-hero/work/identity/candidates/<hash>.png`
- Replace through GAF2D review workflow: `assets/apn-hero/review/identity/**`

**Interfaces:**
- Consumes: the already ingested nine-view source under `assets/apn-hero/work/manual/image/`
- Produces: one transparent, legless, four-view identity candidate and actual-size proof

- [ ] **Step 1: Write failing matting and silhouette tests**

```python
def test_hero_candidate_is_legless_and_transparent() -> None:
    image = Image.open(OUTPUT).convert("RGBA")
    assert image.size == (1400, 560)
    assert image.getbbox() is not None
    assert alpha_edge_contact(image) == 0
    assert opaque_components_below_torso(image) == 0
    assert visor_region_is_present(image)
```

The test also requires four view cells, transparent corners, no gray fringe above tolerance, red
head/body continuity, black visor occupancy, and stable per-view scale.

- [ ] **Step 2: Run the focused test and confirm the red state**

Run from the sibling project:

```console
uv run --project ../gaf2d python tools/test_build_apn_hero_identity.py
```

Expected: fail because the new candidate builder/output is absent.

- [ ] **Step 3: Implement deterministic local extraction**

The builder accepts `--source`, `--output`, and `--contact-sheet` arguments. It crops the canonical
front, three-quarter, side, and back cells from the nine-view board; estimates the neutral gray
background only from each crop border; flood-removes border-connected pixels within a fixed
CIELAB-distance threshold; preserves interior visor black; defringes RGB only where alpha is
partial; and places all four views on fixed 350×560 transparent cells.

It records source SHA-256, crop rectangles, threshold, output SHA-256, and Pillow version in a
sidecar JSON under `review/`, never the source path.

- [ ] **Step 4: Run two clean builds and visual proof**

Run the builder twice into separate temporary directories. PNG and sidecar hashes must match.
Inspect the front view at 104 px and the full four-view sheet for halo, legs/feet, visor shape,
gloss, and red continuity.

- [ ] **Step 5: Register and rebuild the GAF2D identity review**

Use the canonical manual image registration path, then:

```console
uv run --project ../gaf2d gaf2d identity prepare apn-hero \
  --project . \
  --reference <registered-nine-view-path> \
  --candidate <registered-legless-candidate-path> \
  --json
```

Expected: `awaiting_identity_approval`; no approval or export is written.

### Task 2: Migrate all seven assets to authored delivery

**Files in sibling GAF2D project:**
- Modify atomically: `assets/*/asset.json`
- Update: `README.md`
- Update: `FINAL_REPORT.md`

**Interfaces:**
- Consumes: implemented GAF2D `asset set-motion`
- Produces: seven `motion_requirement: "authored"` declarations and a migration audit

- [ ] **Step 1: Dry-run every asset and preserve byte snapshots**

For each fixed ID, save the manifest SHA-256, then run:

```console
uv run --project ../gaf2d gaf2d asset set-motion ASSET_ID \
  --motion authored \
  --project . \
  --dry-run \
  --json
```

Assert all seven manifests retain their original bytes after dry-run. Each creature preview must
report identity approval/integrity QA/export facts becoming stale; Hero must report no invented
approval.

- [ ] **Step 2: Commit the seven atomic migrations**

Run the same commands without `--dry-run`. Verify every manifest version increased exactly once,
every effective delivery is `authored`, every QA profile is `complete`, and all existing approvals
remain stored but stale.

- [ ] **Step 3: Validate the project**

Run:

```console
uv run --project ../gaf2d gaf2d project validate --project . --json
```

Expected: valid, zero legacy-motion warnings, no provider action.

- [ ] **Step 4: Stop at the exact identity gate**

Present one batch review containing the unchanged six creature identity hashes plus the new
legless Hero candidate. A human must explicitly refresh the six creature identity approvals and
approve the exact Hero candidate. No agent writes these approvals.

### Task 3: Deterministic part masks, pivots, and clip recipes

**Files in sibling GAF2D project:**
- Create: `tools/motion_recipe.py`
- Create: `tools/build_motion_candidates.py`
- Create: `tools/test_motion_recipe.py`
- Create: `motion/recipes/apn-hero.json`
- Create: `motion/recipes/entry-runner.json`
- Create: `motion/recipes/veil-operator.json`
- Create: `motion/recipes/signal-hunter.json`
- Create: `motion/recipes/site-sentinel.json`
- Create: `motion/recipes/protocol-courier.json`
- Create: `motion/recipes/site-warden.json`
- Create: `motion/masks/<asset-id>/<part-id>.png`

**Interfaces:**
- Consumes: current approved identity bytes
- Produces: deterministic transparent PNG frames, strict decoded-frame manifests, clip manifests,
  contact sheets, actual-size GIF/WebP review loops, and double-build hashes

- [ ] **Step 1: Write failing recipe-schema and compositor tests**

```python
def test_every_recipe_has_exact_clip_contract() -> None:
    assert clip_names("apn-hero") == {
        "idle", "run", "attack", "crit", "sprint", "hit", "death", "celebrate"
    }
    for asset_id in CREATURE_IDS:
        expected = {"idle", "advance", "engaged", "hit", "death"}
        if asset_id == "site-warden":
            expected.add("broken")
        assert clip_names(asset_id) == expected


def test_two_builds_are_byte_identical(tmp_path: Path) -> None:
    first = build_all(RECIPES, tmp_path / "first")
    second = build_all(RECIPES, tmp_path / "second")
    assert first.file_hashes == second.file_hashes
```

Also require every mask SHA-256, normalized pivot, draw order, transform bound, frame count, FPS,
playback, source identity hash, alpha bounds, one-pixel pivot tolerance, and source-canvas size.

- [ ] **Step 2: Define the exact part vocabulary**

- `apn-hero`: `head_with_visor`, `torso`, `arm_front`, `arm_back`
- `entry-runner`: `base`, `torso_head`, `arm_front`, `arm_back`, `leg_front`, `leg_back`
- `veil-operator`: `base`, `core`, `shell_left`, `shell_right`, `shell_top`, `arm_left`, `arm_right`
- `signal-hunter`: `base`, `body`, `sensor`, `arm_left`, `orb_arm`, `leg_left`, `leg_right`
- `site-sentinel`: `base`, `torso`, `shoulder_left`, `shoulder_right`, `arm_left`, `arm_right`,
  `leg_left`, `leg_right`
- `protocol-courier`: `base`, `torso_core`, `arm_left`, `arm_right`, `leg_left`, `leg_right`,
  `back_fin`
- `site-warden`: `base`, `torso_head`, `shoulder_left`, `shoulder_right`, `shield_left`,
  `shield_right`, `arm_left`, `arm_right`, `leg_left`, `leg_right`

Every part mask is manually reviewed against the approved identity at 400% and actual gameplay
size. Masks may overlap only where the explicit z-order requires it.

- [ ] **Step 3: Encode fixed frame counts and playback**

Creature recipes use 8 idle, 8 advance, 6 engaged, 4 hit, and 8 death frames; Site Warden adds
8 broken frames. Hero uses 8 idle, 10 run, 8 attack, 8 crit, 10 sprint, 4 hit, 8 death, and
8 celebrate frames.

Loop endpoints must match within the recipe's pixel-difference tolerance. Progress clips never
wrap. All transforms remain inside their per-part maximum translation, rotation, and scale bounds.

- [ ] **Step 4: Implement one shared-canvas compositor**

For each frame, apply recipe transforms around normalized pivots, composite in fixed z-order with
bicubic sampling, and write canonical RGBA PNG. Do not crop individual frames. Build one strict
decoded-frame manifest whose frame IDs are `<clip>-<zero-padded-index>` and one
`gaf2d-motion-set-v2` clip manifest assigning every frame exactly once.

- [ ] **Step 5: Run deterministic and mechanical QA**

Run:

```console
uv run --project ../gaf2d python tools/test_motion_recipe.py
uv run --project ../gaf2d python tools/build_motion_candidates.py --all --verify-repeat
```

Expected: all seven builds hash-identical, no clip/pivot/alpha/bounds failure.

- [ ] **Step 6: Inspect temporal proof at actual size**

For every clip, compare frames 0, midpoint, and last plus the actual-size loop. Reject masks,
rubber-hose deformation, halo, platform drift, foot sliding, clipping, or identity loss before
GAF2D ingest.

### Task 4: GAF2D motion-set review and approval gates

**Files in sibling GAF2D project:**
- Create through GAF2D: `assets/*/work/motion/**`
- Create through GAF2D: `assets/*/review/motion/**`
- Create only after human action: `assets/*/approved/motion/**`

**Interfaces:**
- Consumes: strict decoded-frame and clip manifests from Task 3
- Produces: one current `MotionSetApproval` and shared-normalized frame set per character

- [ ] **Step 1: Extract and prepare every named set**

For each asset:

```console
uv run --project ../gaf2d gaf2d motion extract ASSET_ID \
  --project . \
  --frame-manifest <registered-decoded-frame-manifest> \
  --json

uv run --project ../gaf2d gaf2d motion prepare-set ASSET_ID \
  --project . \
  --clip-manifest <registered-clip-manifest> \
  --json
```

Expected: one candidate/review covering every required clip and no approval.

- [ ] **Step 2: Dry-run all seven approvals**

```console
uv run --project ../gaf2d gaf2d approve motion-set ASSET_ID MOTION_SET_ID \
  --project . \
  --dry-run \
  --json
```

Assert the preview binds the current manifest version, identity approval, review hash, candidate
hash, exact clip map, and every frame hash.

- [ ] **Step 3: Stop at the batch motion gate**

Present all contact sheets and temporal proofs. A human must approve each exact motion set.
No agent records approval from mechanical test success or blanket instruction.

- [ ] **Step 4: Prepare and validate the Hero rig after motion approval**

Run `gaf2d rig prepare` using the four reviewed Hero layers and their explicit pivots/z-order, then
`gaf2d rig validate`. The handoff remains an editable 2D rig contract; licensed Spine is not
invoked.

- [ ] **Step 5: Stop at the exact Hero rig gate**

A human inspects mask edges, pivots, draw order, sockets, and deformation limits, then records the
rig approval if accepted.

### Task 5: Complete QA, export, and game-owned runtime bundles

**Files in game worktree:**
- Create: `scripts/assets/build-gaf2d-motion.mjs`
- Create: `qa/check-gaf2d-motion-build.mjs`
- Create: `scripts/assets/build-gaf2d-hero.mjs`
- Create: `qa/check-gaf2d-hero-build.mjs`
- Create only from approved exports: `assets/game-packs/valorant/characters/*/motion.webp`
- Create only from approved exports: `assets/game-packs/valorant/characters/*/motion.json`
- Replace only from approved Hero export: `assets/mascot/v3/set.json` plus
  the exact eight `{clip}.{webp,json}` pairs
- Modify: `assets/game-packs/valorant/pack.json`
- Modify: `assets/game-packs/valorant/gaf2d-sources.json`

**Interfaces:**
- Consumes: current GAF2D exports and the technical runtime contract
- Produces: six `gaf2d-motion-bundle-v1` creature bundles and one approved,
  17-file Hero V3 set (`set.json` plus sixteen clip files)

**Mechanical status (2026-07-28):** The separate zero-provider creature and
Hero builders and their synthetic current-V2 export QA are complete. They prove
GAF2D approval/normalization/atlas/export
lineage, trusted pack-role clip requirements, alias expansion, pinned encoding,
exact Hero identity+motion+rig lineage, canonical set/file hashes, atomic
rollback, and same-toolchain double-build identity.
Production bundle bytes and the production pack map remain blocked on the exact
human identity/motion (and Hero rig) approvals below; synthetic evidence is not
production art approval.

- [ ] **Step 1: Run complete GAF2D QA and deterministic exports**

For every character:

```console
uv run --project ../gaf2d gaf2d pack atlas ASSET_ID --project . --name motion --json
uv run --project ../gaf2d gaf2d qa ASSET_ID --project . --profile complete --json
uv run --project ../gaf2d gaf2d export ASSET_ID --project . --json
```

Run export twice and require identical manifest/file hashes.

- [x] **Step 2: Write failing game-builder lineage tests**

The test rejects stale manifest/identity/motion/rig hashes, a single-cycle approval, missing clip,
wrong playback/frame count, non-integer/out-of-range FPS, variable-rate source timing, mixed
transform, non-portable path, unsafe encoder arguments, unknown tool version, oversized atlas,
aliased/overlapping runtime cells, WebP/descriptor dimension mismatch, and changed source frame.

- [x] **Step 3: Implement atomic matrix packing**

Both builders require the exact live GAF2D export dry-run to match the release.
The creature builder expands any generic GAF2D `duplicate_of` alias so
every APN logical frame receives its own physical matrix cell, matrix-packs frames into `<=2048`
dimensions, writes canonical `gaf2d-motion-bundle-v1` JSON, runs pinned `cwebp -exact` without
`-pre` or `-mt`, and atomically replaces a complete character directory. It reads the output WebP
header and requires exact descriptor dimensions. It stores hashes and an option-only canonical
argument vector, never source/output operands or the GAF2D root. The separate
Hero builder uses the shared validated source but preserves the eight-clip
`hero-v3.js` interface, writes canonical approved clip descriptors plus
`gaf2d-hero-set-v1`, and atomically replaces the complete 17-file V3 directory.
Both pin and hash the exact ImageMagick operation profile as well as `cwebp`.

- [ ] **Step 4: Prove production same-toolchain double-build identity**

Synthetic current-V2 approved-export fixtures already build twice in fresh temporary directories
with identical creature JSON/WebP hashes and identical Hero 17-file set hashes.
After the human creative gates, repeat that proof against every
production export, then write only those approved outputs into the game worktree and update
portable source hashes.

- [ ] **Step 5: Add the six-character motion map**

`pack.json` maps each fixed ID to its `motion.webp`, `motion.json`, and descriptor SHA-256.
Regenerate catalog and asset manifest through their scripts; do not hand-edit generated files.

- [ ] **Step 6: Replace the old Hero runtime bytes**

Keep the eight existing clip basenames/API, but transactionally replace
`set.json` and all sixteen clip files only from the current approved legless
Hero export. The approved set must carry exact identity, motion, rig, export,
file, and toolchain hashes. Remove no historical source from git in this step;
mark old hot files cold through the honest first-playable contract where
applicable.

### Task 6: Real-game QA, docs, and release stop

**Files in game worktree:**
- Add: `docs/decisions/ADR-0014-gaf2d-authored-motion.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ART-PIPELINE.md`
- Modify: `docs/ASSET-ENGINE.md`
- Modify: `docs/ASSETS.md`
- Modify: `docs/GAME-PACK-ASSET-BIBLE.md`
- Modify: `docs/PERF-BUDGET.md`
- Modify: `docs/QA-CHECKLIST.md`
- Modify: `docs/DEFINITION-OF-DONE.md`
- Modify: `CHANGELOG.md`
- Modify: `PROGRESS.md`
- Modify: `progress.md`
- Modify: `qa/QA-REPORT.md`

**Interfaces:**
- Consumes: approved production bundles plus the runtime plan
- Produces: dated mechanical/visual evidence and a release-ready but unshipped branch

- [ ] **Step 1: Run full headless and asset gates**

```console
node qa/run-tests.mjs
node scripts/assets/verify-sizes.mjs
git diff --check
```

Expected: all pass, zero motion fallback in canonical wave mapping, first-playable below 5,242,879.

- [ ] **Step 2: Run deterministic wave 1–10 temporal browser QA**

At `375×812`, `428×926`, and `844×390`, standard and reduced motion, use
`window.advanceTime(ms)` to sample each identity at three fixed timestamps. Require different
authored frame indexes/pixel hashes, part-pose change, pivot drift `<=1 px`, no fallback/placeholder,
no halo/clipping/jitter/foot sliding, zero console errors, and zero horizontal overflow.

- [ ] **Step 3: Run long-run, pacing, and hot-texture checks**

Execute the existing long-run/pacing suite, browser FPS/heap capture, and decoded texture accounting.
Require the documented 60 fps target/floor, `<180 MB` heap, `<64 MiB` hot textures, and no leaked
cold bitmap.

- [ ] **Step 4: Update docs with measured 2026-07-28 facts**

Record exact bundle sizes/hashes, tool versions, approval lineage, first-playable bytes, decoded
peak, viewport matrix, fallback count, and superseded ADR link. Preserve the original prompt and
existing progress history.

- [ ] **Step 5: Request independent asset, code, and browser review**

Reviewers separately inspect identity/acting quality, GAF2D authority/hash lineage, runtime
loading/state semantics, responsive/reduced-motion evidence, budgets, and documentation truth.
Every actionable finding gets a regression test or rebuilt artifact before rerunning Steps 1–3.

- [ ] **Step 6: Stop at release authorization**

Do not push, publish, deploy, or ship. Present the exact commit/diff, QA report, screenshots, and
known creative approvals for the human release decision.
