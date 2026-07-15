# Mascot canon — the Host

> **Single source of truth for the mascot.** Inconsistent mascots are the most
> expensive art bug: they kill brand recognition (the player starts seeing a
> *family* of similar red figures instead of one hero). This doc exists to make
> that impossible. See [ADR-0003](../docs/decisions/ADR-0003-mascot-single-source.md).

## The one rule

**The GLB is the geometry source of truth.** No new mesh and no invented
proportions. A fitter look comes from **camera, pose, shader, and cleanup**. An AI
image may be used only as a style/cleanup reference after it is conditioned on
canonical multi-angle GLB renders; the shipped Host is always re-rendered from the
GLB under this lock. See [ADR-0005](../docs/decisions/ADR-0005-hybrid-host-render.md).

Canonical source files (already in repo):

- `assets/apn-mascot-glb-host.glb` — **primary** Host
- `assets/apn-mascot-glb-analyst.glb` — analyst variant source
- Derived 2D (keep in sync, never diverge): `assets/mascot-host.png` / `.webp`,
  `mascot-run.png`, `mascot-combat.png`, `mascot-side.png`, `mascot-title.png`

If a 2D sprite disagrees with the GLB silhouette, the **GLB wins** and the sprite
is re-exported ([ART-PIPELINE](../docs/ART-PIPELINE.md)).

## Silhouette DNA (must never drift)

Large spherical head · slim body · integrated black visor · short cylindrical arms
· minimal grounded shadow. The character's power is the **iconic silhouette**, not
"shiny 3D toy." Final in-game asset reads **2D** even when derived from a 3D render.

## Render lock (GLB → sprite)

| Field | Rule |
|-------|------|
| Camera | Orthographic. Y-rotate 18°, X-tilt 8–10°. No lens perspective. |
| Pivot | Foot-center, fixed across **every** animation. |
| Frame | Master 192×192; atlas padding 2 px; export @1× runtime. |
| Light | Single key upper-left 45°, fill ~35%, rim ~15%. |
| Shader | 2-tone fill + 1 controlled spec. **No HDR bloom.** |
| Outline | 2px outer line in composite; dark ink/bordo, **not** pure black. |
| Shadow | Fixed oval drop shadow, opacity 18–22%. |
| Cleanup | Reduce gloss, sharpen visor edge, kill plastic-toy feel. |

### Hybrid reference boundary

- Input reference sheets must show the canonical GLB from front, locked ¾, side,
  and back views with the foot pivot marked.
- Image generation may propose pose energy, flat-light cleanup, and edge economy.
- It may not change head/body ratio, visor bounds, limb thickness, foot pivot, or
  the one-piece silhouette.
- Final runtime frames are deterministic GLB renders plus controlled 2D composite
  cleanup. If the reference and GLB disagree, the reference is rejected.

## Role variants (NOT new characters)

Same mascot, same silhouette — only a small accent/prop changes.

| Variant | Role | Silhouette delta | Accent |
|---------|------|------------------|--------|
| Base Runner | default run | bare visor + body | crimson + black |
| Scanner Operator | main DPS / scan | thin mod-stick / beam emitter in hand | crimson + APN red |
| Burst Specialist | tap/burst | small condenser ring at shoulder | crimson + blue |
| Sprint Courier | speed | route fins / small trail emitter at feet | crimson + gold |
| Overdrive Core | late-game | chest energy core, visor inner glow | crimson + magenta |
| Publisher Marshal | prestige / Ship | belt seal-satchel, chest source badge | crimson + gold |

## Animation set

| Clip | Frames | FPS | Notes |
|------|-------:|----:|-------|
| `idle_breathe` | 8 | 8 | always |
| `run_loop` | 8 | 12 | auto-run / stage motion |
| `scan_start` | 4 | 16 | beam charge |
| `scan_fire` | 4 | 20 | beam hit |
| `scan_recover` | 3 | 16 | post-hit |
| `crit_hit` | 5 | 18 | extra beam flicker |
| `loot_pull` | 6 | 14 | pickup / pull to HUD |
| `sprint_loop` | 8 | 14 | hold-to-speed |
| `overdrive_loop` | 8 | 10 | chest core pulse |
| `damage_react` | 3 | 18 | recoil |
| `level_up` | 6 | 12 | halo / badge flash |
| `defeat_fall` | 6 | 10 | short, rare |

## Shipped atlas layout

```
assets/mascot/
  apn-mascot-base.webp             # ten GLB-derived base poses
  apn-mascot-idle.webp             # DOM/Gear niche derivative
  apn-mascot-fx.webp               # reserved transparent FX surface
  atlas/apn-mascot-base.json       # rect + foot pivot + render-lock metadata
  master/*.png                     # deterministic 192 px exports
```

`tools/mascot-render/` parses the canonical GLB directly with a local WebGL2
renderer. It retains authored node matrices, uses the locked orthographic camera,
removes clearcoat/bloom through a three-band diffuse shader, and changes poses
only by rotating existing arm meshes or the whole silhouette. The export script
packs and converts the result deterministically; image-generation studies never
enter the atlas.

## QA hook

Every mascot appearance is checked against **Silhouette QA** in
[QA-CHECKLIST](../docs/QA-CHECKLIST.md): same head/body ratio, same visor geometry,
same perspective, same outline — on every screen.

`node qa/check-assets.mjs` additionally fails unless all ten poses share a foot
pivot within one pixel, head/body ratio within 3%, non-empty visor coverage, the
18°/9° camera lock, and the canonical GLB source path.
