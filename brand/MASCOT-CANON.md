# Mascot canon — the Host

> **Single source of truth for the mascot.** Inconsistent mascots are the most
> expensive art bug: they kill brand recognition (the player starts seeing a
> *family* of similar red figures instead of one hero). This doc exists to make
> that impossible. See [ADR-0003](../docs/decisions/ADR-0003-mascot-single-source.md).

## Runtime source (2026-07-18, V2)

**The shipped runtime Host is the procedural Canvas character in
[`js/hero-v2.js`](../js/hero-v2.js)** — see
[ADR-0012](../docs/decisions/ADR-0012-procedural-host-v2.md). The **silhouette
DNA below is unchanged and still binds**: oversized spherical head, integrated
black visor, slim torso, short arms, minimal oval shadow. The procedural rig
adds what the placeholder atlas never had: run cycle, breathe, blink, visor
scan sweep, attack/crit anticipation, damage flinch, sprint lean, overdrive
hover, and level/loot/defeat clips — all reduced-motion gated.

The GLB files and the `tools/mascot-render` export pipeline are **superseded as
runtime inputs** (ADR-0012): they remain in repo history as reference geometry,
but no runtime code loads GLB-derived Host frames. Future pose and animation
work is code in `hero-v2.js`, not new renders. Everything below this section is
the historical GLB canon, kept for provenance.

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

### Current production checkpoint (2026-07-18)

The repository still ships the existing canonical GLB and its existing
GLB-derived placeholder atlas. A first full-body extension candidate
(`d15bba39…`) was rejected at the owner identity gate and removed before commit:
its overall proportions and limb integration did not preserve the Host's
character. It is **not canonical** and must not be reconstructed from cached
proofs or by reusing the existing arm/neck meshes as legs and boots.

ADR-0010 remains the intended full-body direction, but no replacement GLB may
enter runtime assets until a new four-angle neutral identity proof is explicitly
approved. Run UI and the code-side clip vocabulary may evolve against the
placeholder atlas without implying art approval.

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

### Production gate order

Host work advances through one fail-fast sequence:

1. Lock a neutral front, three-quarter, side, and back identity proof from the
   canonical GLB.
2. Check the same silhouette at 72, 128, and 192 px before producing motion.
3. Approve pose keyframes before rendering a complete motion set.
4. Approve loop, pivot, and visor stability before packing the runtime atlas.

Do not generate a replacement mesh, rig, full frame set, or atlas to compensate
for a failed earlier gate. Provider outputs, turntables, and comparison renders
remain local candidates; only an approved master, its deterministic runtime
exports, and compact approval evidence enter the repository.

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

## V3 — engine-rendered canon (current)

Since V3 the canonical mascot pixels are **rendered, not drawn**: the Host GLB
(`assets/apn-mascot-glb-host.glb`) is animated by `tools/glb-sprite-engine/`
through deterministic keyframe specs and packed into the 8 clip atlases in
`assets/mascot/v3/`. The silhouette DNA is unchanged — glossy crimson sphere
head, integrated black controller visor, capsule torso, stubby arms, red
underglow base — but it is now *the same 3D body in every frame by
construction*, which hand-drawn atlases could never guarantee. Any change to
the mascot must go through the engine (new spec or GLB revision) and re-pass
the gates in [docs/ASSET-ENGINE](../docs/ASSET-ENGINE.md); hand-editing atlas
pixels is forbidden.
