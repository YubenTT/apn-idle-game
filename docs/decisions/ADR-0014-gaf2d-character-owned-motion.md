# ADR-0014 — GAF2D character-owned motion is the pack-creature authority

- Status: Accepted
- Date: 2026-07-28
- Supersedes: ADR-0013

## Context

ADR-0013 treated one approved identity cell plus Canvas translation, bob, squash,
and fade as sufficient creature motion. Real gameplay review disproved that
assumption: the target moved through the world, but the character itself did not
walk or act. The static cell also made it possible for an identity-only export to
look production-ready even though the gameplay clip vocabulary was absent.

GAF2D now supports an explicit `authored` delivery requirement and one hash-locked
named motion set per character. APN needs a runtime contract that preserves those
approvals, stays static-file-only, and does not preload every future wave.

## Options

**A — Keep the static cell and add stronger Canvas transforms.**
Small deformations remain useful presentation, but they cannot prove authored
locomotion, hit acting, death acting, or a boss break state.

**B — Return to a 3D runtime or build-time GLB pipeline.**
This can provide coherent motion, but it adds a model dependency the six selected
2D identities do not need and does not solve approval/cache ownership by itself.

**C — Use character-owned GAF2D motion bundles (chosen).**
Each mapped identity owns one validated WebP matrix plus a hash-locked descriptor.
The game warms only the identities reachable by the current and next wave.

## Decision

The APN Hero remains exclusively owned by `hero-v3.js`. A motion-enabled pack
creature is exclusively owned by the pack motion store and never by the legacy
global creature loader. Each creature bundle contains exact fixed-rate clips:
`idle`, `advance`, `engaged`, `hit`, and `death`; the pack-declared boss also
owns `broken`. Boss capability and the larger decoded class come only from
trusted pack metadata, never from a magic asset ID or descriptor self-claim.
Loop selection uses simulation time. Hit, death, and other progress clips use
normalized domain clocks and hold their final frame.

Before parsing or decoding, the runtime verifies the pack-owned descriptor hash
and descriptor-owned atlas hash. It validates a closed-world descriptor, exact
frame counts, non-overlapping physical cells, intrinsic dimensions, decoded
memory limits, and one shared bottom-center pivot. Current and next wave identity
sets are the only decoded motion window. Cold requests abort; cold bitmaps close.

Initial simulation waits for current-wave motion to resolve. During play, only a
spawn that would require a still-pending mapped identity is held; rendering and
UI input continue. A ready bundle always outranks `targets.webp`. Pending draws
no static body. A failed bundle may use the static target as a resilience
fallback, emits one structured diagnostic, and fails canonical wave 1–10 QA.

Effective reduced motion is one value: saved in-app preference OR the live OS
media query. It can remove secondary motion and effects, but it does not replace
an authored character with an unapproved static identity.

Exact identity, acting, clip timing, rig quality, and release remain human
approvals. Repository tests use deterministic fixtures and make no provider call,
upload, or paid request.

## Consequences

The runtime gains real frame-by-frame acting, deterministic ownership, cache-safe
release generations, bounded decode memory, and observable fallback behavior.
The static atlas remains a failure-only compatibility layer while approved
production bundles roll out.

This costs one descriptor and one WebP per mapped character plus a small
zero-dependency loader. Production cannot claim the walking defect fixed until
the exact character motion set has passed its human approval and release gates;
runtime readiness alone is not art approval.

## Revisit when

- Variable-duration per-frame timing is required; that needs a new descriptor
  grammar rather than silently changing v1.
- Measured current/next-wave motion exceeds the decoded or first-playable budget.
- A future renderer replaces Canvas 2D while preserving the same hash and
  approval authority.
