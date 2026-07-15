# Art pipeline — GLB → sprite → atlas → WebP

> How art gets from source into the game. Pragmatic and **optional-build**: the
> game stays static-file playable ([ADR-0001](./decisions/ADR-0001-vanilla-stack.md)),
> so any tooling here is a *pre-commit convenience*, never a runtime requirement.

## Principle

Masters are editable (PNG/PSD/SVG/GLB); runtime art is compressed (WebP atlases).
A contributor with no toolchain can still play and even hand-export — the scripts
just make it repeatable.

## Source of truth

- Mascot geometry: `assets/apn-mascot-glb-*.glb` → [MASCOT-CANON](../brand/MASCOT-CANON.md)
- Art grammar for everything drawn: [ART-DIRECTION](../brand/ART-DIRECTION.md)

## Stages

```
GLB / master ──▶ headless render (Blender) ──▶ cleanup / outline composite
             ──▶ atlas pack (trim on, pivot preserved) ──▶ WebP convert ──▶ assets/
```

| Stage | Tool | Output |
|-------|------|--------|
| Render mascot frames | Blender CLI (headless), ortho camera per render-lock | trimmed PNG frames |
| Composite | outline + shadow + gloss-reduction pass | clean PNG frames |
| Pack | atlas packer, **trim on but pivot data preserved** | atlas PNG + JSON |
| Compress | PNG/JPEG → WebP | runtime `.webp` + `.json` |

**Pivot warning:** trimming without preserving pivot makes animations jump. The
atlas JSON must keep per-frame pivot/anchor. Canvas 2D `drawImage` blits from the
atlas rect and offsets by pivot — same JSON contract whether or not a library reads it.

## Shipped development scripts

Mirror the layout the research proposed, scoped to this repo:

```
scripts/assets/
  validate-manifests.mjs  # stable pack IDs, roles, asset-path contract
  pack-atlas.mjs          # deterministic shelf pack, pivot/trim metadata kept
  convert-webp.mjs        # cwebp q82 targets/Host, q78 backgrounds
  verify-sizes.mjs        # hard per-kind and first-playable budgets
  generate-manifest.mjs   # stable SHA-256 cache manifest
```

These are **dev-time**, run before commit. They never ship to the player and add
no npm dependency to the runtime. The packer invokes the installed `ffmpeg`
binary with an argument array; conversion invokes `/opt/homebrew/bin/cwebp` with
an argument array. Neither script constructs a shell command string.

Frame input specs include authored trim rectangles and normalized foot pivots.
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
| Mascot | 2048² PNG (from GLB) | 2048² WebP + JSON |
| Items | 2048² PNG | 1024² + 2048² WebP LOD |
| Enemies | 2048² PNG | 2048² WebP |
| UI / feed icons | SVG | 24/32/48 PNG + atlas |
| Backgrounds | PNG | WebP |
| Concept frames | 1284×2778 / 844×390 PNG | review only, not shipped |

**WebP default** for shipped raster (≈25–35% smaller than PNG/JPEG, alpha
supported). Keep PNG/PSD/SVG masters for editing only. Current repo already ships a
`mascot-host.webp` alongside the PNG — that's the pattern.

## Production handoff status

The legacy flat PNGs and two GLBs remain while the canonical Host and Game Pack
atlases are produced issue-by-issue. The pipeline and gates are active now:

- New sprites must enter through pivot-preserving atlas JSON.
- Runtime rasters are WebP; editable masters stay out of first-playable bytes.
- Playback remains plain `Image()` + Canvas with no build or runtime dependency.
