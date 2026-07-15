# APN item atlas

`item-atlas.png` is the transparent source master and `item-atlas.webp` is the
runtime atlas. `item-atlas.json` owns the exact 4×3 cell map, item names, and
material-family assignments.

The source board was generated from the approved Gear/Fx proof at
`docs/art/proofs/2026-07-15/gear-and-fx.webp`. The production prompt locked the
following constraints:

- twelve isolated APN editorial-techwear objects in a strict 4×3 contact sheet;
- one centered object per cell, consistent scale and generous transparent trim;
- matte polymer, laminated paper, or anodized metal only;
- navy, rose/crimson, cyan, violet, and restrained warm-metal accents;
- graphic mobile-game readability, no fantasy leather, gems, runes, or scenery;
- preserve the approved Scanner Lash, Patch Mail, Route Leggings, and Visor Coil
  visual language while extending it to all twelve named items.

The runtime mapping remains deterministic: existing loot names resolve to a
specific authored cell through `js/icons.js`; slot fallback only applies when a
legacy name has no authored counterpart. Asset QA enforces twelve entries, four
items per material family, and a 128 KB runtime-atlas ceiling.
