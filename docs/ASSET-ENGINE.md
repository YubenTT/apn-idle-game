# APN Idle — Character asset production

APN Idle has three controlled build-time lanes.
All ship ordinary WebP/JSON into the same zero-dependency Canvas 2D runtime:

| Lane | Use it for | Source authority | Motion owner |
|---|---|---|---|
| APN Hero clip set | The one Hero runtime identity | owner reference + one approved GAF2D named set | eight `hero-v3.js` clip atlases |
| GAF2D character motion bundle | motion-enabled pack characters | identity + one approved named motion set | character-owned matrix atlas |
| Static pack target | unmapped legacy packs and mapped-load failure only | pack atlas | presentation fallback, not authored motion |

ADR-0014 supersedes ADR-0013 for the six first-pack creatures. Canvas translation,
bob, squash, and fade are presentation effects; they are not walking or authored
acting. The APN Hero remains exclusively owned by `hero-v3.js`; its historical
segmented V2 rig is not a fallback (ADR-0015). None of these lanes weakens
identity, motion, rights, upload, budget, or release gates.

## Historical GLB-derived tooling (maintenance only)

The following tooling documents how existing legacy atlases were produced. It is
not the default path for a new Hero or first-pack creature, and it cannot replace
the current GAF2D identity/motion approval chain.

- **For this retired lane, source of truth = its existing 3D model**, never
  still-image AI generation.
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

## GAF2D character-motion lane

Use one GAF2D asset per character. Never split clips into separate assets or treat
one approved cycle as the complete gameplay delivery.

1. Declare `--motion authored` before production work.
2. Review and human-approve the exact identity at runtime-relevant sizes.
3. Prepare one fixed-rate named set containing exact `idle`, `advance`,
   `engaged`, `hit`, and `death` clips; the pack-declared boss also requires
   `broken`. The trusted pack role—not an asset-name allowlist or descriptor
   claim—owns that capability and its larger decoded budget.
4. Inspect the complete temporal proof and obtain one human motion-set approval
   over every ordered frame, clip membership, FPS, playback mode, and shared
   normalization.
5. Build one character-owned `motion.webp` plus `motion.json`. The descriptor is
   closed-world, hash-locks lineage and atlas bytes, uses one bottom-center pivot,
   and contains distinct non-overlapping physical cells.
6. Record only portable runtime paths and hashes in pack metadata. The browser
   verifies descriptor bytes before parse, then atlas bytes and decoded
   dimensions before readiness.
7. Run complete GAF2D QA plus APN descriptor, size, current/next-wave memory,
   browser, and all-waves checks. Canonical wave 1–10 QA requires zero fallback.

The existing `targets.webp` remains failure resilience and an unmapped-pack
compatibility path. It never outranks a ready motion bundle and cannot satisfy an
authored-motion declaration.

Live provider calls and source uploads remain outside repository builds. Changing
identity or motion bytes requires new human approval and new hashes.

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

## Historical GLB clip set

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
- **Reconstruct the full-frame pivot after trim.** For a shared crop, paste at
  `(trim - frameSize × anchor) × scale`; the anchor is not local to the trimmed
  rectangle. Subtracting the trim twice shifts the character and lifts its
  ground contact.
- **Loop anchors**: lay the underglow disc flat (`rotation.x = -1.5708`) and
  pin it (`position.y = -0.35`) as constant tracks in every hero clip — it is
  the ground plane that locks bbox bottom.
- **Decaying game clocks**: in-game hit/death clocks run 1→0, strips play
  standing→flattened left-to-right, so runtime scrubs `progress = 1 - clock`.
- **No wall-clock anywhere** — engine steps fixed dt; runtime loops by t*fps.

## Maintaining a legacy GLB-derived character (not a new-character path)

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

Every new or replacement Hero/pack character uses the GAF2D character-motion
checklist above. This legacy checklist may repair already-shipped historical
derivatives only; it must not register a new runtime owner.
