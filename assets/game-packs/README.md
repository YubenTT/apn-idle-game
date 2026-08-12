# Game Pack manifests

Each directory is a stable content plug-in. `pack.json` is authored source;
`catalog.json` and `js/generated/game-packs.js` are deterministic generated files.

Required contract:

- stable lowercase string `id` and unique numeric `order`;
- one primary `genre` and exactly `zones: 10`;
- five target roles with frame + foot-center pivot;
- one boss with break frame + foot-center pivot;
- runtime paths for background, targets/data, props, and corruption mask;
- source-board path and four bounded corruption-mask names.
- `schemaVersion`, `catalogVersion`, an APN-only runtime `title`, and a factual
  `editorialReference` used only by the feed ticker;
- an exact contained `rights.json` pointer plus a progress-preserving fallback.

Rights are data, not a comment:

- `docs/product/schemas/pack.schema.json` and `rights.schema.json` are the closed
  versioned contracts;
- `catalog-policy.json` defaults new `pending-review` Packs to **blocked**;
- only the explicit current transition roster in `pendingReviewWarnIds` may warn
  and run while it still says `needs-legal-review`; the warning is not approval;
- `blocked` rights and `disabledKillSwitches` are omitted from generated runtime
  data, so Route selects the next active Pack without renumbering stable IDs or
  erasing save history;
- `deniedRuntimeMarks` and `deniedRuntimeTerms` reject raw marks or named
  third-party identity in the Pack title, target labels, and boss label;
- resolving a Pack requires a real reviewer, timestamp, and hashed review
  evidence (plus the complete license scope for `licensed-spotlight`);
- remove a resolved or blocked Pack from `pendingReviewWarnIds`; do not turn the
  exception list into a default allowlist.

The Pack `fallback` is deliberately different from a rights kill switch. A
required art/decode failure keeps the current Route in the existing procedural
Canvas shell (`mode: procedural-canvas`) and preserves progress; it does not
claim to skip Packs when runtime does not do that.

Run:

```bash
node scripts/assets/generate-catalog.mjs
node qa/check-catalog-rights.mjs
node qa/check-route.mjs
```

Generation prints one deterministic `RIGHTS WARN` for each explicit transitional
Pack and writes only eligible Packs to `catalog.json` and
`js/generated/game-packs.js`. An empty eligible catalog is valid: the procedural
APN shell remains stable and invents no Pack identity.

`create-clean-era-manifests.mjs` is the reproducible bootstrap for the accepted
launch roster. It refuses to overwrite authored manifests unless `--force` is
explicitly passed. Production WebP/JSON/source-board files land in I-032A–D.
