# Assets

## Principles

1. **APN IP first** — Host mascot, crimson brand, feed-noise cast.
2. **No third-party idle characters** (no miner clones).
3. **Ticker icons** are simplified atmospheric marks, not official partner logos.
4. Keep runtime light; prefer PNG/SVG/WebP; GLB is optional future kit.

## Inventory

### Hero / brand

| File | Use |
|------|-----|
| `mascot-host.png` | Primary combat sprite (flipped to face right) |
| `mascot-title.png` | Title screen |
| `mascot-*.png/jpg` | Refs / alternates |
| `apn-logo.svg` / `apn-logo-square.png` | Favicon / brand |
| `apn-mascot-glb-host.glb` | Future 3D / site embed |
| `apn-mascot-glb-analyst.glb` | Future analyst variant |

### Enemies (`assets/enemies/`)

| File | Role |
|------|------|
| `stale.png` | Stale Post |
| `rumor.png` | Fake Leak |
| `lag.png` | Broken Link |
| `spoiler.png` | Spoiler |
| `patch.png` | Patch Note (Notes drop) |
| `event.png` | Event Spam |
| `boss.png` | Version Gate |

### LIVE ticker (`assets/icons/*.svg`)

Valorant, League, WoW, FFXIV, Apex, CS2, Genshin, PoE, Diablo, R6, Overwatch, Fortnite, Star Rail, TFT, Steam, APN.

Loaded by `main.js` into the ticker track.

### Procedural (no file)

- Biome midgrounds (canvas cache in `render.js`)
- Confetti / particles / floaters
- Build icons (`js/icons.js` SVG strings)
- SFX (`js/sfx.js` WebAudio)

## Pipeline (future)

```text
  Art source (Figma / Aseprite / Blender)
           │
           ▼
  Export PNG/WebP @1x/@2x or GLB
           │
           ▼
  assets/…  + document here
           │
           ▼
  content / render references
```

## Naming

- Prefer `kebab-case` files.
- Combat-critical sprites: keep stable paths; cache-bust via query on load in `render.js` when art updates.
