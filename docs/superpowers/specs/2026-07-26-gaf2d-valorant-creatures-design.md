# GAF2D Valorant Creature Cast — approved design

> **Status:** Approved by the owner on 2026-07-26.
> The approval covers the six reviewed GAF2D creature identities and this static
> runtime integration.

## Outcome

Replace only the first Game Pack's target cast with six original GAF2D
identities.
Keep the shipped APN Hero V3 runtime unchanged.
Do not introduce 3D, provider calls, uploaded source media, or authored creature
motion.

## Runtime contract

The Valorant pack ships one transparent `896×128` WebP atlas with seven
untrimmed `128×128` cells:

| Frame | GAF2D identity | Runtime role |
|---|---|---|
| `common-a` | Entry Runner | common A |
| `common-b` | Veil Operator | common B |
| `common-c` | Signal Hunter | common C |
| `elite` | Site Sentinel | elite |
| `event` | Protocol Courier | event |
| `boss` | Site Warden | boss |
| `boss-break` | Site Warden | same boss below 34% HP |

Every cell keeps a normalized bottom-center pivot `{x: 0.5, y: 1}`.
Targets face right-to-left and must remain legible at the game's 72–128 px
presentation range.
The complete atlas remains below the existing 140 KB per-pack budget.

Existing Canvas presentation owns spawn pop, idle bob, hit squash, death, ground
shadow, and boss-break switching.
These transforms are runtime behavior, not a second authored identity or GAF2D
motion approval.

## Wave 1–10 cast

The first pack uses a deterministic authored arc while preserving the existing
enemy statistics, kill budgets, rewards, and boss cadence:

| Pack wave | Allowed cast |
|---:|---|
| 1 | Entry Runner |
| 2 | Veil Operator |
| 3 | Signal Hunter |
| 4 | Entry Runner / Veil Operator |
| 5 | Site Sentinel |
| 6 | Entry Runner / Signal Hunter |
| 7 | Veil Operator / Site Sentinel |
| 8 | Entry Runner / Veil Operator / Signal Hunter / Site Sentinel |
| 9 | Protocol Courier |
| 10 | Site Warden |

Mixed waves select from their fixed pool with the existing random source.
The authored pool changes presentation/type selection only; domain HP and reward
rules stay in `js/game.js`.

## Source authority and provenance

The sibling GAF2D project is the identity authority.
Each approved identity is hash-locked in its GAF2D asset manifest.
The game repository stores only the deterministic runtime derivative, portable
source mappings, source SHA-256 values, approval SHA-256 values, and build-tool
facts.
It does not store private media, user-specific paths, provider URLs, or the
GAF2D review contact sheets.

The atlas builder accepts the GAF2D project root as an explicit argument.
It uses fixed crops, one scale operation per cell, bottom-center padding, and
argument-array subprocesses.
Two consecutive builds must produce the same atlas and metadata hashes.

## Presentation precedence

The Valorant pack's GAF2D atlas always wins for its enemies.
The existing Curator, Recon, and Hotshot V3 assets remain intact for other
packs and fallbacks, but cannot override the first pack's six approved
identities.
The APN Hero loader and rendering path are unchanged.

## QA and acceptance

- Six exact GAF2D identity approvals are recorded; APN Hero receives no new
  approval or runtime change.
- The source mapping validates hashes before any crop or conversion.
- The runtime atlas is `896×128`, has seven untrimmed cells, uses foot-center
  pivots, faces right-to-left, and is at most 140 KB.
- Wave 1–10 selection follows the table above and is deterministic under a
  seeded random stream.
- Boss-break art appears only below 34% HP.
- Valorant enemies never route through the legacy V3 creature override.
- First-playable size remains below 5 MB.
- Headless, playthrough, pacing, long-run, browser, console, overflow, and
  reduced-motion checks are green.
- Documentation, changelog, progress log, generated catalog, and generated
  asset manifest match the shipped build.

