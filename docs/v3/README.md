# APN Idle V3 — Drop + Infinite Echo Packs

**Status:** approved target contract; current runtime remains source of truth until focused implementation PRs merge.  
**Reviewed baseline:** `main@efc5f223b2e149d8a6b523be415510c1580a5edf`.

## Product in one sentence

The APN Host clears signal noise across an endless Route of original Echo Packs inspired by the games players follow, then ships each completed Drop to convert temporary work into permanent Rep and Live power.

## Locked decisions

1. `Ship Notes` and `End Season` become one atomic action: **Ship This Drop**.
2. **Route never resets.** A Pack is 10 Zones; a Drop is 20 Zones / two Packs.
3. **Season Track** means calendar live ops only. It never means prestige.
4. Player-facing `Weapon` becomes **Scanner** everywhere.
5. Run actions become **Hotfix · Priority Tag · Live Tracker · Overclock**.
6. Bottom navigation becomes **Build · Drop · Hub · Boosts · Menu**.
7. The current unlabeled stage lock becomes a labeled **Gear** control.
8. Real game names remain factual editorial context; gameplay identity and art are APN-original Echoes unless written rights exist.
9. The canonical Host GLB remains the geometry source of truth. Image generation may explore poses/FX and generate original Pack assets, never a competing Host canon.
10. No sold combat power, better Gear odds, Rep/Live multiplier or prestige skip.

## Current-main audit

The current build already has the difficult foundation: vanilla ES modules, Canvas 2D, static deployment, local save/offline progress, deterministic tests, pacing/long-run suites, a full-bleed mobile Run surface, persistent Route state, a generated twenty-Pack catalog, unseen-first/genre-diverse scheduling, Gear, Hub, Boosts and a free-MVP economy.

The remaining blockers are contradictions rather than missing feature volume:

| Current | V3 target |
|---|---|
| Ship now; End Season later | one `Ship This Drop` transaction |
| Season used for prestige and Hub calendar | Drop = prestige; Season Track = calendar |
| Upgrade Weapon while system says Scanner | Upgrade Scanner |
| Burst / Area / Ramp / Overdrive | Hotfix / Tag / Tracker / Overclock |
| false Area skill in a one-living-enemy game | Priority Tag, a real single-target decision |
| tiny Host | 104–120 CSS px canonical Host presentation |
| unlabeled floating lock | labeled Gear control |
| real game title fused with runtime Pack identity | editorial signal + original Runtime Echo |
| extensible catalog without rights/provenance fields | schema, rights mode, provenance, fallback, kill switch |

## Source-of-truth map

- `PRODUCT-SYSTEM.md` — Route / Pack / Drop, one transaction, names, skills and endless Echo architecture.
- `ASSET-FACTORY.md` — canonical Host and AI-assisted original Pack production.
- `IMPLEMENTATION.md` — state/API migration, dependency roadmap and release gates.
- `RESEARCH.md` — authoritative sources and design implications.
- `schema/echo-pack.schema.json` — Draft 2020-12 Pack contract.
- `examples/fashion-dream.echo-pack.json` — disabled, review-required Fashion Dream example.

## Non-goals

- Rewrite the existing vanilla ES + Canvas stack.
- Reset the global Route.
- Copy third-party characters, logos, maps, outfits, items, UI, audio or signature trade dress.
- Treat a fan-content policy as a commercial game license.
- Produce all Packs before the factory passes Tactical Echo, Floodlight XI and Fashion Dream.
- Add multiplayer before the single-player return/Drop loop is proven.
