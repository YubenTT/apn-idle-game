# Marvel Rivals production source board

- Clean Era order: 17
- Genre: hero-shooter
- Environment grammar: chrono
- Palette roles: #e64858, #57bce8, #2b2548
- Direction: target enters right-to-left; foot-center pivot is locked.
- Contract: textless APN Patchline vector master; five targets, one final encounter, one break state.
- Research owner: `docs/GAME-PACK-ASSET-BIBLE.md` (Marvel Rivals official-source section).
- Approved direction evidence: `docs/art/proofs/2026-07-15/`.
- Production: deterministic `scripts/assets/produce-game-packs.mjs`; no screenshot pixels or official logos ship.

## Focused proof closure

The five target masters are official Marvel Rivals transparent character renders; the final encounter is the recorded Doom render above. All six are normalized into the APN outline, 128 px silhouette, right-to-left staging, foot pivot, and authored break-state contract. Source URLs are retained in `scripts/assets/extract-approved-pack-art.mjs`.
