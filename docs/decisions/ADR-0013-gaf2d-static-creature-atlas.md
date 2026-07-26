# ADR-0013 — GAF2D static atlases are the first-pack creature source

- Status: Accepted
- Date: 2026-07-26

## Context

APN Idle already supplies creature motion through deterministic Canvas
transforms.
The owner approved six original GAF2D creature identities for the first Game
Pack and explicitly confirmed that these creatures do not need 3D.

The existing V3 asset standard describes build-time 3D clip atlases as the only
character path.
Applying that path here would duplicate motion already supplied by the game,
consume the remaining first-playable budget, and add a 3D dependency without a
player benefit.
GAF2D v1 also owns one approved motion set per asset, while this integration
needs one stable identity pose plus runtime transforms.

## Options

**A — Approved GAF2D identity atlas plus Canvas motion (chosen).**
Hash-lock each identity, derive one fixed atlas, and let the existing Canvas
presentation provide spawn, idle, hit, death, and break-state behavior.

**B — Per-character animated clip atlases.**
This offers authored motion but multiplies files, loading cost, approvals, and
runtime complexity for behavior the game already supplies.

**C — Live provider-generated motion.**
This adds provider spend, upload gates, identity drift, and nondeterministic
inputs.

## Decision

The Valorant pack's six creature identities come from hash-approved GAF2D review
art and ship as one static, pivot-locked WebP atlas.
The APN Hero remains on its existing V3 path.
Existing animated V3 creatures remain available outside this pack.

This is a controlled exception to the 3D-only creature wording in
`docs/ASSET-ENGINE.md`, not a replacement for the Hero pipeline.
Static GAF2D delivery is valid when:

1. the owner approves the exact identity bytes;
2. the runtime already owns the required motion;
3. the derivative is deterministic and source-hash verified;
4. the atlas passes size, alpha, pivot, readability, and real-game QA;
5. no provider call or upload occurs during the repository build.

## Consequences

We gain one coherent cast, a small hot texture, deterministic rebuilds, and a
simple zero-runtime-dependency integration.
We accept that the creatures use shared Canvas motion rather than individually
authored acting and that rebuilding requires access to the authoritative GAF2D
project.

The game repository records portable source mappings and hashes but does not
duplicate GAF2D review sheets.
Changing any approved source bytes invalidates the derivative and requires a new
identity review.

## Revisit when

- A creature needs authored acting that shared Canvas transforms cannot express.
- GAF2D adds a native multi-action character bundle.
- The runtime texture budget can support lazy multi-clip assets with a measured
  player benefit.
