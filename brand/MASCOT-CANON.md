# Mascot canon — the Host

> **Single source of truth for the mascot.** Inconsistent mascots are the most
> expensive art bug: they kill brand recognition (the player starts seeing a
> *family* of similar red figures instead of one hero). This doc exists to make
> that impossible. See [ADR-0003](../docs/decisions/ADR-0003-mascot-single-source.md).

## The one rule

**The GLB is the source of truth.** No new illustration, no AI variant, no "make it
a bit more fit" mesh edits. A fitter look comes from **camera, pose, and cleanup**
— never from inventing new proportions.

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
| Frame | Master 192×192 trimmed; export @1× runtime, @2× hi-res. |
| Light | Single key upper-left 45°, fill ~35%, rim ~15%. |
| Shader | 2-tone fill + 1 controlled spec. **No HDR bloom.** |
| Outline | 2px outer line in composite; dark ink/bordo, **not** pure black. |
| Shadow | Fixed oval drop shadow, opacity 18–22%. |
| Cleanup | Reduce gloss, sharpen visor edge, kill plastic-toy feel. |

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

## Suggested atlas layout

```
assets/mascot/
  apn_mascot_base_2048.webp        # base runner + core clips
  apn_mascot_variants_2048.webp    # 6 role variants
  apn_mascot_fx_1024.webp          # beam / loot / level-up fx
  atlas/apn_mascot_base.json       # frame + pivot data (trim on, pivot preserved)
```

The current `assets/` keeps flat PNGs; the atlas layout above is the export target
when the [pipeline](../docs/ART-PIPELINE.md) is wired. Until then, hand-exported
PNGs must still obey the render lock.

## QA hook

Every mascot appearance is checked against **Silhouette QA** in
[QA-CHECKLIST](../docs/QA-CHECKLIST.md): same head/body ratio, same visor geometry,
same perspective, same outline — on every screen.
