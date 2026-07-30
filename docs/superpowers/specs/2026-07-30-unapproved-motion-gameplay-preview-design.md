# Unapproved GAF2D Motion Gameplay Preview

Date: 2026-07-30

Status: approved design; implementation pending

## Goal

Let the owner judge the current APN Hero and six creature
`authored-semantic-v2` motion candidates inside the real APN Idle gameplay
loop before granting creative motion approval.

The preview must use the exact current 7-asset, 39-clip, 276-frame candidate
and its authored FPS. It must never imply that the candidate is approved,
exported, released, or production-ready.

## Chosen approach

Add one explicit, localhost-only preview mode:

```text
http://127.0.0.1:8790/?motion-preview=1
```

Normal `http://127.0.0.1:8790/` remains unchanged and continues to use the
current production-safe static/historical fallback. The committed Valorant
pack and generated production catalog remain motionless until the real GAF2D
motion, Hero rig-quality, QA, and release gates pass.

The two rejected alternatives are:

1. approving and integrating the candidate before gameplay inspection, which
   would invert the human gate; and
2. a separate animation arena, which would not prove real combat state,
   positioning, scaling, timing, fallback, or performance behavior.

## Authority boundary

Preview output is a disposable derivative, not a GAF2D export.

- The builder reads the current registered `authored-semantic-v2` candidate,
  frame bytes, batch summary, and mechanical QA evidence.
- It verifies exact hashes, clip membership, frame counts, playback, FPS,
  transparent 640 × 640 canvases, and `creative_approval: human_required`.
- It rejects missing, stale, approved, malformed, or mechanically failed
  inputs.
- It never reads or fabricates a motion approval, rig approval, release
  manifest, or production runtime lineage.
- Preview descriptors use an explicit preview grammar and
  `authority: unapproved_preview`; they cannot validate as approved production
  bundles.
- Generated preview media lives only under the ignored local boundary
  `.gaf2d-preview/`.
- No production pack, catalog, asset manifest, release bundle, cache build ID,
  or first-playable budget record points at that boundary.

## Components

### Deterministic preview builder

A Node entry point receives the APN GAF2D project root explicitly. It:

1. verifies the canonical batch and all seven current candidates;
2. computes one stable transparent union trim and bottom-center pivot per
   asset;
3. packs the six creatures into one character-owned WebP atlas each;
4. packs APN Hero into its existing eight per-clip WebP layout;
5. writes canonical preview descriptors and one root preview manifest;
6. writes atomically to `.gaf2d-preview/`; and
7. produces byte-identical output from unchanged input.

Machine-local source paths are never serialized. The root manifest binds the
candidate, review, frame, atlas, descriptor, and toolchain hashes.

### Runtime preview authority

A small runtime module activates only when all conditions are true:

- `motion-preview=1` is present;
- the page hostname is exactly `127.0.0.1` or `localhost`;
- the preview manifest is current and hash-valid; and
- every required Hero and creature bundle validates under the preview
  grammar.

It returns an in-memory Valorant pack overlay and a Hero preview base path.
Production `GAME_PACKS`, `valorant/pack.json`, and approved runtime validators
are never mutated or weakened.

The motion store may consume a preview descriptor only when the source record
itself is preview-owned and the loopback/query gate is already active.
Approved and preview descriptor validators remain separate.

### Visible owner warning

While active, the game shows a persistent compact banner:

```text
UNAPPROVED MOTION PREVIEW · LOCAL ONLY
```

The banner does not cover gameplay controls. Text-state QA reports preview
status, candidate hash, active asset, clip, authored FPS, and selected frame.
If preview loading fails, a visible fail-closed message names the problem and
the game uses its normal safe fallback.

### Gameplay mapping

The existing semantic selectors remain authoritative:

- Hero: `idle`, `run`, `sprint`, `attack`, `crit`, `hit`, `death`,
  `celebrate`.
- Creatures: `idle`, `advance`, `engaged`, `hit`, `death`.
- Site Warden additionally owns `broken` below 34% HP.

`requestAnimationFrame` remains only the repaint clock. Loop frame selection
uses elapsed simulation time multiplied by the clip-owned FPS; progress clips
use their existing gameplay progress clocks and hold their terminal frame.

## Failure behavior

- Non-loopback hosts ignore the preview query entirely.
- A missing or stale preview boundary never partially activates.
- A failed Hero set keeps the current identity-safe Hero fallback.
- A failed creature bundle records one diagnostic and uses the current static
  atlas for that asset.
- No preview failure blocks normal mode, rewrites a save, or changes canonical
  GAF2D state.
- Preview mode never exposes approval, export, publish, or deploy actions.

## Testing

Implementation follows test-first red/green cycles.

Automated contracts cover:

- preview activation only on loopback plus the exact query flag;
- normal production pack/catalog bytes remaining unchanged;
- separate preview grammar and rejection by production validators;
- no approval fields or machine-local paths in preview artifacts;
- deterministic double build and exact source/hash binding;
- all 7 assets, 39 clips, and 276 frames;
- exact Hero and creature clip/state mapping;
- timestamp-based selection at simulated 60 Hz and 120 Hz repaint rates;
- safe fallback for missing, stale, corrupt, or partially decoded preview
  media; and
- no preview media in production asset manifests or first-playable budgets.

Browser QA uses the real game at
`http://127.0.0.1:8790/?motion-preview=1&mute=1` and records:

- APN Hero run, sprint, attack, hit, death, and celebrate;
- waves 1, 2, 3, 5, and 9 for all five non-boss creature identities;
- Site Warden advance, engaged, hit, broken, and death at wave 10;
- portrait and landscape gameplay;
- changed-frame evidence, active clip/FPS/frame text state, zero fallback,
  zero console/network errors, and zero document overflow; and
- standard and effective reduced-motion behavior.

The final complete `npm test` suite must pass. Mechanical and browser QA may
reject the candidate but cannot grant motion, Hero rig, export, or release
approval.

## Acceptance

The design is complete when:

1. the owner can open one localhost URL and see all current authored motion
   through real gameplay states;
2. normal mode remains byte- and behavior-equivalent to the current
   production-safe game;
3. preview status can never be confused with approval;
4. the preview can be deleted and regenerated without touching tracked
   production art; and
5. the next step remains an explicit owner approve/reject decision per complete
   motion set.
