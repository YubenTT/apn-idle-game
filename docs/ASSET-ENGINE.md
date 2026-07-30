# APN Idle — Asset Production Engine (glb-sprite-engine) v1

The standard for producing **every** character asset in APN Idle. This engine is
how the Host hero and the vinyl creature family were made. Follow it and new
assets come out consistent, QA'd, and game-ready. **Build-time 3D → runtime 2D**:
the runtime stays zero-dependency Canvas 2D (ADR-0001); all 3D work happens
offline and ships as webp clip atlases.

## Why this pipeline (decisions, settled)

- **Source of truth = real 3D models**, never still-image AI generation.
  Single-image models drift proportions frame-to-frame (the "missing arm"
  incident, v2 rig) and strobe at low fps. A 3D scene cannot lose a limb.
- **The engine is the animator.** Animation is declared as keyframe tracks over
  named scene nodes and stepped deterministically (fixed dt, no wall-clock).
  Consistency is guaranteed by construction.
- **Vinyl-toy art direction.** Glossy volumetric primitives, chibi proportions
  (head ≈ 45% of height), display base with signature underglow ring. Every
  character — hero or creature — belongs to the same collectible family.
- **Homage, never copy.** Creatures may channel pop-culture energy through
  palette/silhouette/props only. Original names, no trademark logos or outfits.
  Crimson (`--apn-red` family) is reserved for the Host.

## Directory contract

```
tools/glb-sprite-engine/
  render.html + engine.js   deterministic strip renderer (three.js, importmap)
  capture.mjs               driver: static server + headless Chrome + pack
  pack.py                   crop → union-bbox trim → webp atlas + atlas.json
  validate.mjs              QA gates (below)
  rebuild_raw.py            rebuilds evidence strips from atlases (no re-render)
  specs/<character>-<clip>.json   one spec per clip (THE asset definition)
  models/<character>.js     scene modules: export function build(THREE) → Group
assets/mascot/v3/           hero atlases (8 clips)
assets/creatures/<kind>/    creature atlases
refs/gen/v3/                evidence: <spec>-raw.png strips (per-spec names!)
```

## Spec format (v1)

```jsonc
{
  "name": "run",                       // clip name → outputs <name>.webp/.json
  "kind": "locomotion",                // locomotion | action (gate selection)
  "source": { "type": "glb", "path": "../../assets/x.glb" }
          | { "type": "scene", "module": "./models/x.js" },
  "camera": { "pos": [2.3,0.8,4.9], "lookAt": [0,-0.15,0], "fov": 35 },
  "clip":  { "fps": 16, "frames": 16 },
  "loop":  true,                       // false for one-shots (death)
  "tracks": [ { "node": "host_left_arm", "prop": "rotation.z",
                "keys": [[0,0.3],[8,-0.3],[16,0.3]], "ease": "sine" } ],
  "output": { "frame": 256 }
}
```

Track values are **offsets added to the node's captured base transform**.
Props: `rotation.x/y/z`, `position.x/y/z`, `scale.x/y/z`. Keys are frame
numbers; linear interpolation, `ease:"sine"` optional.

## The canon clip set

| Character | locomotion clips | action clips |
|---|---|---|
| Host hero | idle, run, sprint | attack, crit, hit, death, celebrate |
| Creature (elite) | idle, advance | attack, hit, death |
| Creature (boss) | idle, advance, **broken** | attack, hit, death |

`broken` = <34% HP boss phase: visibly wounded (tilted shades, drooped prop,
dimmed posture) but standing. Camera is always `three-quarter-front-right` —
that is the game's readability angle.

## QA gates (validate.mjs — all must PASS)

1. **nodes** — every track node exists in the model (glb-checked).
2. **alpha** — every frame has non-empty alpha.
3. **bbox (locomotion)** — content width/height variance < 6% across the clip.
4. **feet (locomotion loops)** — bottom-of-bbox drift ≤ 8px (8, not 4: evidence
   strips rebuilt from lossy webp let soft underglow alpha wobble at the
   binarize threshold; the true foot line is locked by pack.py's union trim).
5. **stance (action loops)** — first-vs-last frame bottom within 6px (returns
   to stance). Action clips may deform freely *between* the ends.
6. **atlas** — ≤ 4096px per dimension, ≤ 1.5MB webp; atlas.json carries
   frames/fps/frameSize/anchor/trim.

Plus the **identity check** (done at integration time): dominant palette of
every atlas must match its character (hero=red, recon=blue/cyan,
hotshot=orange, curator=pale navy-gold). This catches cross-contamination.

## Hard-won rules (do not relearn the hard way)

- **Never run captures in parallel.** Headless Chrome + SwiftShader on this
  machine needs 2–4 min per clip; parallel instances thrash CPU and, worse,
  identically-named evidence strips can race and cross-pack the wrong
  character (this actually happened to `host-attack`). Evidence files are now
  named by spec basename; still — render serially.
- **Union-bbox trim is sacred.** pack.py trims every frame to the clip's union
  alpha box, so the feet anchor is identical across frames by construction.
  Never per-frame trim (that is what made v1 flipbooks wobble).
- **Loop anchors**: lay the underglow disc flat (`rotation.x = -1.5708`) and
  pin it (`position.y = -0.35`) as constant tracks in every hero clip — it is
  the ground plane that locks bbox bottom.
- **Decaying game clocks**: in-game hit/death clocks run 1→0, strips play
  standing→flattened left-to-right, so runtime scrubs `progress = 1 - clock`.
- **No wall-clock anywhere** — engine steps fixed dt; runtime loops by t*fps.

## Adding a new character (checklist)

1. Model `models/<name>.js` (primitives/lathes, MeshPhysicalMaterial clearcoat,
   named animatable parts, display base + signature underglow).
2. Turntable self-review (4 stills, LOOK at them) before writing any spec.
3. Write the canon clip specs for its tier (table above).
4. `node tools/glb-sprite-engine/capture.mjs --spec … --out assets/creatures/<name>/`
   — serially, one clip at a time.
5. `validate.mjs` per clip → ALL PASS; LOOK at every evidence strip.
6. Palette identity check; register in `js/content.js` (CREATURES) and let
   `js/creatures.js` + `render.js` draw it; QA script contract entries.
7. `node qa/run-tests.mjs` → ALL PASS. Commit assets + specs + evidence.
