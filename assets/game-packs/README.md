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

Run:

```bash
node scripts/assets/generate-catalog.mjs
node qa/check-route.mjs
```

`create-clean-era-manifests.mjs` is the reproducible bootstrap for the accepted
launch roster. It refuses to overwrite authored manifests unless `--force` is
explicitly passed. Production WebP/JSON/source-board files land in I-032A–D.
