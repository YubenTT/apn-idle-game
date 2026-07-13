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

## Suggested scripts (target — not yet in repo)

Mirror the layout the research proposed, scoped to this repo:

```
scripts/
  export_mascot.py        # Blender headless render per MASCOT-CANON render-lock
  render_headless.sh       # wrapper: blender -b … -P export_mascot.py
  pack_atlas.mjs           # trim+pack, emit atlas JSON with pivots
  convert_webp.mjs         # *.png → *.webp at target quality
  verify_sizes.mjs         # fail build if any atlas exceeds PERF-BUDGET
  generate_manifest.mjs    # asset manifest for cache-busting
```

These are **dev-time**, run before commit. They never ship to the player and add no
npm dependency to the runtime. If added, wire them as an **optional** GitHub Action
(`assets` workflow) that regenerates atlases on art-master changes.

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

## Interim reality (today)

The repo ships flat PNGs and two GLBs, no packer. That's fine for v1. The pipeline
above is the path when art volume grows (item sets, enemy families, mascot
variants). Until then:

- New sprites obey the render-lock + art grammar by hand.
- Keep a `.webp` next to any large `.png` used at runtime.
- Do not add a runtime dependency to load art — plain `<img>` / `Image()` + canvas.
