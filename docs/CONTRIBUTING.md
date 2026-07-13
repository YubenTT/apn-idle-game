# Contributing

## Setup

```bash
git clone https://github.com/YubenTT/apn-idle-game.git
cd apn-idle-game
./serve.sh
```

Node 18+ recommended for tests (no packages to install).

## Branch & PR

1. Branch from `main`: `feat/…`, `fix/…`, or `docs/…`
2. Make focused commits (imperative subject, complete sentences in body)
3. Run `node qa/run-tests.mjs` — must print **ALL PASS**
4. Open a PR against `main`
5. CI must be green
6. Squash or merge per maintainer preference; **no force-push to `main`**

### PR title style

```text
feat: add area-blast VFX trails
fix: sprint attack speed applies mid-melee
docs: document embed iframe CSP notes
```

### PR body (use the template)

- What / why
- Test plan (`node qa/run-tests.mjs` + manual if UI)
- Screenshots for HUD changes

## Code conventions

- ES modules, no required bundler
- Prefer small pure helpers in `formulas.js`
- Player-facing strings in `content.js` / `comedy.js`
- Touch targets ≥ 44px for primary controls
- Do not commit `.venv/`, zips, or local save dumps

## Balance changes

Edit `C` in `formulas.js`, update `docs/BALANCE.md` if the curve intent changes, run tests.

## Assets

See [ASSETS.md](./ASSETS.md). Do not add copyrighted third-party game logos as “official” marks.

## Agents

Follow root [AGENTS.md](../AGENTS.md). No AI co-author git trailers.
