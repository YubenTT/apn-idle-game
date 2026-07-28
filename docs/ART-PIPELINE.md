# Art pipeline — approved source → atlas → WebP

> How art gets from source into the game. Pragmatic and **optional-build**: the
> game stays static-file playable ([ADR-0001](./decisions/ADR-0001-vanilla-stack.md)),
> so any tooling here is a *pre-commit convenience*, never a runtime requirement.

## Principle

Masters are editable (PNG/PSD/SVG/GLB); runtime art is compressed (WebP atlases).
A contributor with no toolchain can still play and even hand-export — the scripts
just make it repeatable.

## Source of truth

- APN Hero identity and motion: owner-approved GAF2D `apn-hero` records →
  [MASCOT-CANON](../brand/MASCOT-CANON.md) and ADR-0015
- First-pack creature identity and motion: sibling GAF2D project, locked by
  approved named motion sets, portable pack hashes, and ADR-0014
- Art grammar for everything drawn: [ART-DIRECTION](../brand/ART-DIRECTION.md)

## Stages

```
Hero:   identity lock ──▶ complete motion + rig locks ──▶ set.json + eight clip pairs
GAF2D:  identity lock ──▶ named motion-set lock ──▶ matrix atlas + descriptor
Static: pack target atlas ──▶ failure-only fallback or unmapped legacy pack
```

| Stage | Tool | Output |
|-------|------|--------|
| Prepare Hero evidence | GAF2D identity + named motion-set workflows | reviewed, hash-locked frames |
| Composite | one approved shared transform + controlled cleanup | clean PNG frames |
| Pack | atlas packer, **trim on but pivot data preserved** | atlas PNG + JSON |
| GAF2D runtime derivative | pinned ImageMagick shared-trim crop/matrix profile after current-export validation | distinct physical cells + canonical descriptors |
| Compress | PNG/JPEG → WebP | runtime `.webp` + `.json` |

**Pivot warning:** trimming without preserving pivot makes animations jump. The
atlas JSON must keep per-frame pivot/anchor. Canvas 2D `drawImage` blits from the
atlas rect and offsets by pivot — same JSON contract whether or not a library reads it.

## Shipped development scripts

Mirror the layout the research proposed, scoped to this repo:

```
scripts/assets/
  validate-manifests.mjs  # stable pack IDs, roles, asset-path contract
  build-gaf2d-targets.mjs # approved GAF2D hashes → first-pack target atlas
  build-gaf2d-motion.mjs  # approved GAF2D export → APN character motion bundle
  build-gaf2d-hero.mjs    # approved apn-hero export → atomic V3 set + 8 clip pairs
  pack-atlas.mjs          # deterministic shelf pack, pivot/trim metadata kept
  convert-webp.mjs        # cwebp q82 targets/Host, q78 backgrounds
  verify-sizes.mjs        # hard per-kind and first-playable budgets
  generate-manifest.mjs   # stable SHA-256 cache manifest
```

These are **dev-time**, run before commit.
They never ship to the player and add no npm dependency to the runtime.
The scripts resolve `ffmpeg`, `magick`, and `cwebp` from the configured
environment and invoke them with argument arrays. Approved motion derivatives
fail closed unless the live `gaf2d export --dry-run --json` result exactly
matches the on-disk release, ImageMagick is exactly `7.1.2-13`, and `cwebp` is
exactly `1.6.0` with `["-exact","-q","90"]`.
No script constructs a shell command string.

Frame input specs include authored trim rectangles and normalized bottom-center
baseline pivots (`foot` is retained only in legacy coordinate names).
The packer sorts frame names before shelf layout, retains `sourceSize`,
`trimOffset`, and `pivot`, and emits stable JSON. `qa/check-assets.mjs` rejects a
missing pivot, an out-of-bounds rect, an oversized asset, or a third hot pack.

Run the contract before every art commit:

```bash
node scripts/assets/validate-manifests.mjs
node scripts/assets/generate-manifest.mjs
node scripts/assets/verify-sizes.mjs
node qa/check-assets.mjs
```

## Format policy

| Asset | Master | Runtime |
|-------|--------|---------|
| APN Hero | approved GAF2D identity + complete motion and rig lineage | `assets/mascot/v3/set.json` + eight WebP/JSON pairs |
| Items | 2048² PNG | 1024² + 2048² WebP LOD |
| Legacy animated enemies | historical frame sets | cold compatibility clip WebP + JSON |
| GAF2D pack characters | approved identity + named motion set | character-owned matrix WebP + closed-world JSON |
| Static pack targets | pack identity derivative | `896×128` WebP + JSON fallback |
| UI / feed icons | SVG | 24/32/48 PNG + atlas |
| Backgrounds | PNG | WebP |
| Concept frames | 1284×2778 / 844×390 PNG | review only, not shipped |

**WebP default** for shipped raster (≈25–35% smaller than PNG/JPEG, alpha
supported). Keep PNG/PSD/SVG masters for editing only. Current repo already ships a
`mascot-host.webp` alongside the PNG — that's the pattern.

## Production handoff status

The legacy flat PNGs and GLBs remain as cold historical references while the owner-approved APN
Hero replacement and Game Pack motion atlases pass their exact gates. The pipeline and gates are
active now:

- New sprites must enter through pivot-preserving atlas JSON.
- The current Hero V3 files are `set.json`-labelled historical runtime bytes,
  not evidence that the replacement identity is approved; the future approved
  set manifest and all sixteen clip files move in one atomic directory
  transaction only after the complete gate.
- Every first-pack GAF2D motion derivative must match its identity, motion-set,
  source, descriptor, and atlas hashes before it can enter `ready`.
- Runtime rasters are WebP; editable masters stay out of first-playable bytes.
- Playback remains Canvas 2D with no build or runtime package dependency;
  `createImageBitmap()` is preferred and cold bitmaps are explicitly closed.
- Generated mesh candidates, provider receipts, turntables, and rejected motion
  batches stay outside the repository. Promote only an approved editable master,
  deterministic runtime exports, and the minimum evidence needed to reproduce
  the approval.
