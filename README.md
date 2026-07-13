# APN Idle

**The All Patch Notes waiting-room game.**

Crush feed noise. Grab **Notes**. **Publish** for **Rep**. Stack **Live Mult**.
Stay live while the real patch notes load.

| | |
|---|---|
| **Play** | Open `index.html` via any static server → [localhost:8790](http://localhost:8790/) |
| **Stack** | Vanilla ES modules · Canvas 2D · **zero npm** runtime |
| **Save** | `localStorage` (offline progress) |
| **Brand** | [allpatchnotes.com](https://allpatchnotes.com) · Host mascot · crimson APN UI |
| **Tests** | `node qa/run-tests.mjs` |

---

## Why this exists

All Patch Notes is where gamers wait for **patch notes, news, events, and guides**.
**APN Idle** turns that wait into a playful loop that teaches the site’s language:

| Site | Game |
|------|------|
| Patch notes drop | Red **Patch Note** enemies → **Notes** currency |
| Live feed | **Live Mult** prestige multiplier |
| Verified / summary / tracker | Build skills (Crit Mask, Area Blast, Damage Ramp…) |
| Signal / engagement | **Signal** → **Upgrade Weapon** |
| Season of content | Every **20 zones** → optional **End Season** prestige |

This is not a clone of a third-party idle. It is **original APN IP**: Host mascot, feed-noise enemies, site vocabulary.

---

## Quick start

```bash
git clone https://github.com/YubenTT/apn-idle-game.git
cd apn-idle-game
./serve.sh
# → http://localhost:8790/
```

Or any static server:

```bash
python3 -m http.server 8790
npx --yes serve -l 8790   # optional; not required by the game
```

**Controls**

| Input | Action |
|-------|--------|
| Auto | Host attacks the nearest noise |
| **Hold Sprint** (button / stage / Space) | Faster hits, more damage, drains **Energy** |
| Tap green/blue orbs | Energy / Signal pickups |
| **Upgrade Weapon** | Spend Signal for permanent damage |
| **Build** | Spend SP on Damage / Crit / Skills |
| **Publish** | Notes → Rep |
| **Boosts** | Permanent meta with Rep |
| **End Season** | At zone checkpoints (every 20) → Live Mult |

---

## Core loop

```text
┌─────────────┐     Signal      ┌──────────────────┐
│ Clear noise │ ──────────────► │ Upgrade Weapon   │
└──────┬──────┘                 └────────▲─────────┘
       │ kills / XP                      │ more DPS
       ▼                                 │
┌─────────────┐   SP    ┌──────────────┐ │
│ Rank up     │ ──────► │ Build skills │─┘
└──────┬──────┘         └──────────────┘
       │ red Patch Notes
       ▼
┌─────────────┐   Notes  ┌──────────┐   Rep   ┌─────────┐
│ Collect     │ ───────► │ Publish  │ ──────► │ Boosts  │
└──────┬──────┘          └────┬─────┘         └─────────┘
       │ every 20 zones       │
       ▼                      ▼
┌─────────────┐         ┌───────────┐
│ Checkpoint  │ ──────► │ End Season│ → Live Mult (prestige)
└─────────────┘         └───────────┘
       │
       └── zones continue forever (no softlock)
```

### Currencies (player-facing)

| Currency | Earn | Spend |
|----------|------|--------|
| **Signal** | Kills, orbs | Upgrade Weapon |
| **Notes** | Red Patch Notes, bosses | Publish → Rep |
| **Rep** | Publish | Permanent Boosts |
| **SP** | Rank ups | Damage / Crit / Skills + skill ranks |
| **Live Mult** | End Season | Multiplies ship payout (and progress feel) |

Internal save fields may still say `bytes` / `patches` / `authority` — see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## Architecture (scalable)

```text
                    ┌──────────────────────────────────────┐
                    │              index.html               │
                    │         HUD · sheets · canvas         │
                    └───────────────┬──────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        css/game.css           js/main.js            assets/*
        (chrome only)       (input + rAF loop)    (mascot, enemies,
              │                     │               ticker icons)
              │         ┌───────────┴───────────┐
              │         ▼                       ▼
              │    js/ui.js                js/render.js
              │  (DOM sheets/HUD)         (Canvas 2D)
              │         │                       │
              │         └───────────┬───────────┘
              │                     ▼
              │              js/game.js  ◄── pure-ish domain
              │         step · combat · economy · toast
              │                     │
              │         ┌───────────┼───────────┐
              │         ▼           ▼           ▼
              │  js/formulas.js  content.js   save.js
              │   (balance C)    (skills/meta) (localStorage)
              │         │
              └─────────┴── qa/run-tests.mjs (Node, no browser)
```

| Layer | Owns | Must not |
|-------|------|----------|
| **formulas** | Curves, costs, HP, XP | Touch DOM / canvas |
| **game** | State machine, kills, skills | Assume `window` in tests |
| **content** | Names, copy, ticker, tips | Hard-code numbers that belong in `C` |
| **ui** | Sheets, buttons, HUD text | Re-implement combat math |
| **render** | Draw world | Mutate economy (read-only) |
| **main** | Input, loop, bootstrap | Balance tables |

**Why this scales:** new skills, zones, biomes, and embed targets plug into one layer without rewriting the others. Future npm/bundler optional; runtime stays static-file friendly.

Deep dive → [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## Repository map

```text
apn-idle-game/
├── index.html              # App shell
├── serve.sh                # Local static server (port 8790)
├── css/game.css            # HUD / sheets / sprint / chips
├── js/
│   ├── main.js             # Bootstrap + input + frame loop
│   ├── game.js             # Domain state + fixed-step combat
│   ├── formulas.js         # Balance constants + pure math
│   ├── content.js          # Skills, boosts, tips, ticker
│   ├── render.js           # Canvas (biomes, VFX, sprites)
│   ├── ui.js               # Build / Publish / Boosts sheets
│   ├── save.js             # localStorage schema
│   ├── sfx.js              # WebAudio (no asset files)
│   ├── icons.js            # Build-panel SVG icons
│   └── comedy.js           # Kill / boss / ship quips
├── assets/
│   ├── mascot-host.png     # Primary hero sprite
│   ├── enemies/*.png       # Feed-noise cast
│   ├── icons/*.svg         # LIVE ticker game marks
│   ├── apn-mascot-glb-*.glb# Future 3D / site kit
│   └── …                   # Refs, logos
├── docs/                   # Design + engineering docs
├── qa/
│   ├── run-tests.mjs       # Headless domain tests
│   └── screenshots/        # Visual regression reference
└── .github/workflows/      # CI
```

Assets catalog → [docs/ASSETS.md](./docs/ASSETS.md)

---

## Development workflow

```text
  issue / idea
       │
       ▼
  branch: feat/* | fix/* | docs/*
       │
       ▼
  implement + node qa/run-tests.mjs
       │
       ▼
  pull request → CI (tests)
       │
       ▼
  review → merge to main
       │
       ▼
  (optional) ship static build → apn-web /play or /idle
```

| Branch | Purpose |
|--------|---------|
| `main` | Always playable; CI green |
| `feat/*` | Features |
| `fix/*` | Bugfixes |
| `docs/*` | Documentation only |

See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) and [docs/ROADMAP.md](./docs/ROADMAP.md).

---

## Testing

```bash
node qa/run-tests.mjs
# → ALL PASS
```

Covers: combat kills, weapon upgrades, skills, publish, bosses, **endless zones past 20**, soft HP scale.

No browser required for domain tests. Visual checks use `qa/screenshots/` as human reference.

---

## Design pillars

1. **Readable progress** — big numbers, bars that mean one thing (Rank vs Zone).
2. **Afford signals** — green “can buy” CTAs, locked greys, SP badge on Build.
3. **Juicy feedback** — confetti, floaters, death squash, Patch Note flip, SFX.
4. **Brand-first** — APN crimson, Host mascot, feed comedy, LIVE ticker.
5. **Never softlock** — zones advance forever; prestige is optional at checkpoints.

Game design → [docs/GAME-DESIGN.md](./docs/GAME-DESIGN.md) · Balance → [docs/BALANCE.md](./docs/BALANCE.md)

---

## Production embed

Static folder on the main site (no backend):

```text
apn-web/public/idle/   or   /play  iframe
```

Details → [docs/EMBED.md](./docs/EMBED.md)

---

## Brand & license

- **Code & docs:** [MIT](./LICENSE)
- **APN name, logo, Host mascot:** All Patch Notes IP — use only for official APN products or with permission
- **Ticker icons:** simplified marks for atmosphere; not official partner logos

---

## Docs index

| Doc | Contents |
|-----|----------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Layers, data flow, extension points |
| [GAME-DESIGN.md](./docs/GAME-DESIGN.md) | Fantasy, loop, systems |
| [BALANCE.md](./docs/BALANCE.md) | Curves, checkpoints, sprint |
| [ASSETS.md](./docs/ASSETS.md) | Mascot, enemies, icons, GLB |
| [CONCEPT.md](./docs/CONCEPT.md) | Original product concept |
| [CONTRIBUTING.md](./docs/CONTRIBUTING.md) | PR rules, conventions |
| [ROADMAP.md](./docs/ROADMAP.md) | Near / mid / long term |
| [EMBED.md](./docs/EMBED.md) | Site integration |
| [AGENTS.md](./AGENTS.md) | Instructions for coding agents |

---

**APN Idle** — clear the noise. Stay live.
