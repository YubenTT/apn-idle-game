Original prompt: Complete the APN Idle redesign autonomously, including QA, review, and a muted localhost build for the final integrated user gate.

## Current execution

- I-007 catalog renderer complete with muted direct-Chrome route evidence.
- I-021 Gear implementation is complete: 5-column inventory, explicit compare/sort/filter/junk/scrap flows, canonical Host, persistence, and portrait/small/landscape Chrome evidence.
- I-010–I-014 Run hero experience is implemented; integrated Run Chrome review is active.
- I-020 Build is implemented with requirement-derived next-unlock previews and
  428/375 Chrome Extension evidence (44pt touch, zero overflow/truncation).
- I-022 Ship is implemented with a tested reset/keep contract, live conversion
  preview, and an explicit two-step End Season gate; 428/375 Chrome evidence is green.
- I-023 Hub is implemented as a Daily/Weekly/Season live-ops board; state helper,
  readable rewards, 8px tracks, 44pt touch, and 428/375 Chrome gates are green.
- I-025 Menu is split into five truthful sections with canonical switches, no
  player debug copy, explicit demo-store semantics, and a tested safe reset gate.
- I-024 Boosts is implemented as a domain-driven permanent ROI tree with exact
  deltas/costs, one recommendation, 44pt touch, and clean 428/375 Chrome evidence.
- I-033 item art is implemented as a 12-piece, three-material APN techwear atlas;
  Gear uses authored sprites with zero filled-slot SVG fallbacks, 44pt touch, and
  zero horizontal overflow in direct Chrome evidence.
- I-034 backgrounds are locked across all 20 packs with visible APN billboard,
  signal-rail, patchline, and archive-light motifs; every WebP is below 150 KB
  and the Run surface remains zero-overflow in direct Chrome.
- I-040 feedback is complete: hit, crit, loot, rank, sheet, and afford cues share
  deterministic haptics and are silenced by mute plus OS/in-app reduced motion.
- I-042 copy is complete: all five player-facing sources pass the banned-copy
  contract, Focus replaces Mana with save migration, and glossary target names
  plus object/effect/cost language are aligned.
- I-044 navigation is locked by ADR-0007: five stable destinations, Gear FAB,
  minimal info-color active fill, 44pt targets, and explicit expansion state.
- I-043 integrated QA is complete: 35 Chrome baselines across five viewport
  classes, 0px overflow, ≥44px touch, muted copy-safe screens, clean console,
  89.8fps cadence, 6.6MB heap, and 2.7ms sheet-open evidence.
- Browser QA uses Chrome Extension or isolated direct Chrome with `mute=1`; no
  standalone Playwright process is used.

## I-045 closure evidence

- I-045 mobile long-press hardening is active after physical iOS Safari exposed
  selectable HUD/stage regions. Root cause: the document had only the standard
  `user-select` declaration; explicit WebKit callout and media-drag guards were
  absent. Baseline remains `ALL PASS` + `LONG RUN PASS` on 2026-07-15.
- Execution plan: `docs/superpowers/plans/2026-07-15-mobile-long-press-release-hardening.md`.
- I-045 code and automated/browser QA are green: the pre-fix gesture contract
  failed on all three missing WebKit guards, the fixed suite ends `ALL PASS`, and
  the 393×852 muted Browser chain has 0px overflow, clean console, preserved
  Gear scroll/native sort, and a clean Sprint release. The owner confirmed the
  physical iOS Safari long-press recheck on 2026-07-15; I-045 is release-ready.

## Open chain

- None. I-045 is green across regression, browser, long-run, and physical iOS
  evidence. The feature branch remains local until the owner requests integration.
