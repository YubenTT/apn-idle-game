# Valorant production source board

- Clean Era order: 1
- Genre: tactical-shooter
- Environment grammar: tactical
- Palette roles: #ff4655, #79e6f2, #182a3d
- Direction: target enters right-to-left; foot-center pivot is locked.
- Background contract: APN cityline with billboard, signal rail, patchline, and archive-light motifs.
- Creature contract: six APN-original identities — Entry Runner, Veil Operator,
  Signal Hunter, Site Sentinel, Protocol Courier, and Site Warden.
- Runtime delivery: one textless `896×128` GAF2D static atlas; five targets, one
  final encounter, and one Site Warden break state.
- Research owner: `docs/GAME-PACK-ASSET-BIBLE.md` (Valorant official-source section).
- Approved direction evidence: `docs/art/proofs/2026-07-15/`.
- Identity approval: owner-approved on 2026-07-26; exact portable paths and
  SHA-256 locks are in `gaf2d-sources.json`.
- Production: deterministic `scripts/assets/build-gaf2d-targets.mjs`; source
  bytes must match the authoritative GAF2D approval manifests. The pinned
  derivative toolchain is ImageMagick 7.1.2-13 plus cwebp 1.6.0.
- Rights boundary: the pack remains a textless APN Patchline treatment;
  no screenshot pixels or official logos ship. Creature pixels are APN-original;
  copied agents, weapons, costumes, and third-party UI are prohibited.
