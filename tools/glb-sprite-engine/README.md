# glb-sprite-engine

Build-time 3D→2D sprite pipeline (ENGINE CONTRACT v1). Renders GLB models (or
procedural scene modules) into trimmed, packed webp sprite atlases for the
zero-npm Canvas 2D runtime. Build-time only — no runtime code loads GLBs.

## Files

| File | Role |
|------|------|
| `render.html` + `engine.js` | `render.html?spec=<spec.json>` loads three.js via importmap from `./vendor/`, builds the scene, **deterministically** steps the clip (fixed `dt = 1/fps`, manual loop, no wall-clock rAF), renders all frames side-by-side into one transparent horizontal strip canvas (`alpha:true`, `preserveDrawingBuffer`), then sets `document.title = 'render-ready'`. |
| `capture.mjs` | `node capture.mjs --spec <spec.json> --out <dir> [--refs <dir>]` — serves the repo root on an ephemeral port (ES modules need http), launches headless Chrome with retry until `title=render-ready`, screenshots the strip, then runs `pack.py`. Writes `<name>-raw.png` + `<name>-strip.png` (contact sheet) into the refs dir (default `refs/gen/v3`). |
| `pack.py` | PIL: crop frames, **union-bbox trim** (identical box across the clip so the feet anchor stays consistent), pack webp atlas + `<name>.json` `{frames:[{x,y,w,h}], fps, frameSize, anchor:[ax,ay]}` + dark contact sheet. |
| `validate.mjs` | `node validate.mjs --spec <spec.json> --out <dir>` — QA gates: track node names exist in the model · every frame non-empty alpha · per-frame bbox w/h variance < 6% · feet (bbox bottom) stable within 4px for loop clips · atlas ≤ 4096px and ≤ 1.5MB. Prints PASS/FAIL per gate. |
| `vendor/` | pinned `three@0.160.0`: `three.module.js`, `loaders/GLTFLoader.js`, `utils/BufferGeometryUtils.js`, `environments/RoomEnvironment.js`. |
| `specs/` | clip specs (`host-idle.json`, `host-run.json`). |

## Spec format

```json
{
  "name": "run",
  "source": { "type": "glb", "path": "../../assets/apn-mascot-glb-host.glb" },
  "camera": { "pos": [2.3, 0.8, 4.9], "lookAt": [0, -0.15, 0], "fov": 35 },
  "view": "three-quarter-front-right",
  "clip": { "fps": 16, "frames": 16 },
  "tracks": [
    { "node": "host_left_arm", "prop": "rotation.z", "keys": [[0, 0.6], [8, -0.6], [16, 0.6]], "ease": "sine" }
  ],
  "output": { "frame": 256 }
}
```

- `source` may also be `{"type":"scene","module":"./models/curator.js"}` — an ES
  module exporting `export function build(THREE)` returning a `THREE.Group`
  whose animatable children have stable `name` fields.
- Track keys are `[frameNumber, value]`, linear interpolation; `"ease":"sine"`
  applies smooth in-out on the segment factor. Props: `rotation.x/y/z`,
  `position.x/y/z`, `scale.x/y/z`, uniform `scale`.
- At load the engine captures each named node's base transform; track values
  are **absolute offsets added to base** (rotation offsets compose in local
  space). Last key frame should equal the frame count for seamless loops.
- Lighting rig (engine-built): soft key upper-left, crimson rim back-right,
  crimson ground underglow point light, RoomEnvironment speculars. Crimson is
  the brand token `#fc1243` (`--apn-primary`). Background transparent.

## Typical run

```sh
node capture.mjs --spec specs/host-run.json --out ../../assets/mascot/v3
node validate.mjs --spec specs/host-run.json --out ../../assets/mascot/v3
```

Headless Chrome is expected at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
(override with `CHROME_PATH`); pack/validate need the managed `python3` + PIL.
