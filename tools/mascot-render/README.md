# Canonical Host render surface

This development-only page parses `assets/apn-mascot-glb-host.glb` directly and
renders the existing seven meshes with WebGL2. It has no runtime or npm
dependency and is never imported by the game.

- Orthographic-equivalent clip camera: 18° Y, 9° X.
- Three-band diffuse shader, controlled crimson/ink palette, no clearcoat/bloom.
- Geometry-normal outline and transparent background.
- Authored node matrices remain the geometry authority; pose parameters only
  rotate existing arm meshes or the whole existing silhouette.
- Export pivot is always `{x: 0.5, y: 1}` at the fixed underglow ground plane.

Serve the repository, then open:

```text
http://localhost:8790/tools/mascot-render/?pose=idle
```

Supported deterministic poses: `idle`, `run`, `scan`, `crit`, `loot`, `sprint`,
`overdrive`, `damage`, `level`, `defeat`.

The page exposes `renderPose(name)` for the asset export script. Image-generation
proofs guide edge economy only; no generated pixels or replacement geometry enter
the shipped atlas.
