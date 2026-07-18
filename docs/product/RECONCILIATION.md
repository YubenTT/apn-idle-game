# docs/product — V3 design authority, reconciled (PR-0 / issue #17)

This directory is the **imported V3 design package** (reviewed baseline `main@efc5f22`, the same baseline the AUDIT was written against). It is **design authority, not runtime art** — no file here is loaded by the game. It sits **below plan v2** in the law stack and is imported *as reconciled*, per the plan's PR-0 mandate.

## Law stack (conflict order)

```
owner answers (AUDIT §6 + plan v2 locks)
  → AUDIT amendments (§2–§8)
    → plan v2  ← THE LAW
      → these V3 docs, as reconciled here
        → code
```

When a V3 doc and plan v2 disagree, **plan v2 wins**. The V3 docs are imported **verbatim** (each carries a header pointing here); this file carries the deltas so the source stays faithful and the overrides stay in one place.

## What was imported

| File | Source (`origin/agent/apn-idle-v3-playbook`) | Note |
|---|---|---|
| `OVERVIEW.md` | `docs/v3/README.md` | package overview + V3 locked decisions + source map |
| `PRODUCT-SYSTEM.md` | `docs/v3/PRODUCT-SYSTEM.md` | Route/Pack/Drop, one transaction, naming, skills, Echo architecture |
| `ASSET-FACTORY.md` | `docs/v3/ASSET-FACTORY.md` | canonical Host + original Pack production |
| `IMPLEMENTATION.md` | `docs/v3/IMPLEMENTATION.md` | save v3 target, domain API, migration, gates |
| `RESEARCH.md` | `docs/v3/RESEARCH.md` | authoritative sources + design implications |
| `schemas/echo-pack.schema.json` | `docs/v3/schema/echo-pack.schema.json` | Pack contract — **rights sub-object reconciled** (below), pretty-printed |
| `examples/pack.example.json` | `docs/v3/examples/fashion-dream.echo-pack.json` | disabled review-required example — **rights fixed** to canonical |
| `docs/art/refs/host-v3-turnaround/**` | already imported at `a56ed5b` | identity/style reference only (D2′/ADR-0010) |

## Overrides — plan v2 supersedes the V3 docs on these points

| Dimension | V3 doc says | Plan v2 (LAW) — use this |
|---|---|---|
| Prestige action name | "Ship This Drop" | **Go Live** (PR-2/PR-3 rename) |
| Checkpoint cadence | Drop = every 20 zones only | **first checkpoint @ zone 10, then every 20** (ADR-0008, B1) |
| Prestige unit words | "Drop" / "Season" | **checkpoint / cycle**; "Route", "Pack" kept |
| Rights modes | 3: `original-echo \| editorial-reference \| licensed-spotlight` | **6**: `apn-original \| homage-only \| editorial-text-original-art \| licensed-spotlight \| blocked` + transitional `pending-review` (ADR-0009/0011) |
| Rights reviewer field | `reviewer` | **`reviewedBy`** (+ required `editorialReference`) |
| Display names | "Tactical Echo / Floodlight XI / Fashion Dream" | **A′ parody**: Spike Protocol / Ultimate Touchline / Dreamline Detour (plan §Content Spine) |
| Offline at boundary | stops (zones) | stops for zones **and currency is capped at the boundary** (PR-1) |

The imported doc bodies still use the left column; do **not** rewrite them — read them through this table.

## Canonical schemas & the rights-drift resolution

- **`schemas/rights.schema.json` is the canonical rights contract** (declared here per PR-0; enforced by the PR-7 validator + marks denylist). Modes = the 6 above; required = `mode`, `editorialReference`, `reviewedBy`.
- **`schemas/echo-pack.schema.json` is the Pack contract.** Its `rights` sub-object was reconciled to the canonical taxonomy (3→6 mode enum, `reviewer`→`reviewedBy`, `+editorialReference`) so a pack's rights block validates against both schemas. Everything else is verbatim (pretty-printed for reviewable diffs).
- The AUDIT's **6/6/3/3/5-mode drift** across five sources is resolved by declaring `rights.schema.json` canonical (6). The V3-original 3-mode enum, the `blocked-until-review` status (never in any enum → maps to `pending-review`), and the `reviewer`↔`reviewedBy` mismatch are **superseded** by the canonical contract above.
- Full JSON-Schema *validation wiring* (`examples/validate-pack.mjs`, ajv in CI) is **not** in PR-0 — it lands in **PR-7** with `pack.schema.json` and the rights validator. PR-0 hand-verified `examples/pack.example.json` against the reconciled schema (every rights key defined, every required key present).

## Deferred (named in v1 §2 but owned by a later PR)

| v1 §2 aspirational name | Reality | Owner PR |
|---|---|---|
| `schemas/go-live-receipt.schema.json` | not committed; receipt shape lives in PRODUCT-SYSTEM/IMPLEMENTATION | **PR-1** (receipt-schema fixes) |
| `schemas/easter-eggs.schema.json` | exists only as the `easterEgg` `$def` inside echo-pack.schema.json | **PR-7** |
| standalone `pack.schema.json` (pointer shape) | does not exist (dangling `$schema` ref per AUDIT) | **PR-7** |
| `GO-LIVE-SPEC.md` / `INFINITE-PACK-SYSTEM.md` / `ABILITIES-BUILD.md` / `NAMING-SYSTEMS.md` / `UX-UI-TARGET.md` / `RESEARCH-SOURCES.md` / `PRODUCT-PLAYBOOK.md` | aspirational re-decomposition; the real package is the 5 combined docs above | n/a (name-map is this table) |
| `APN-IDLE-INFINITE-PLAYBOOK.html` | not committed | n/a |

The v1 §2 layout was an aspirational re-decomposition of a package that was never committed in that shape. The committed artifact is the 5 combined docs + one combined schema imported here; this table is the name-map so later sessions don't hunt for files that never existed.

## Superseded-by-this-plan markers (AUDIT §3)

- `docs/00_START_HERE.md` — **marked superseded** in PR-0 (banner → plan v2 + this directory).
- `CODEX-IMPLEMENTATION-PROMPT`, `IMPLEMENTATION-ROADMAP`, `REPO-MAIN-AUDIT` — **not present in this repo** (external working docs, never committed); nothing to mark. Recorded here so no later session assumes they exist.
- Legacy design docs that taught the Ship-Notes + End-Season model carry a scoped supersede banner (prestige model only) added in PR-0 so no active doc teaches the retired action.
