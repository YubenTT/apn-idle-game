# APN Idle — Enhanced Edition (2026-08-23)

Owner-directed release: make the shipped game read as a **crafted, complete, long-horizon idle** —
distinct themes across the whole 1000-zone arc, the APN story finally spoken in-game, a real
first-time experience, correct character presentation, and a stated ending — **without touching
the locked balance curves, the sealed GAF2D V4 art authority, or any human approval gate.**

Baseline: `main` @ `c1298dc` (ALL PASS, live site already in sync). Branch: `feat/enhanced-edition`.

---

## 0. Evidence base (what this plan is built on)

Four repo audits + one external research pass (2026-08-23, this session):

1. **Structure truth.** Zone = wave (no second axis). 20 Packs × 10 zones = 200 authored zones;
   beyond 200 the deterministic deck scheduler replays the 20 Packs in 2-Pack seasons with
   Corruption epochs (`tier = min(4, floor(zone/200))`). Zone 1000 = the 100th Gate. Balance is
   assertion-locked (`qa/check-balance-targets.mjs`, 9 gates, thin headroom: ordinary hits
   217.7/220, boss hits 1978/2000, per-zone 30.5/31 min, aggregate 319.5/325 h).
2. **The palette-swap problem is real here.** Runtime scenery is 5 biomes hashed on zone,
   pack-independent; the Pack contributes one 60%-alpha background plate. `props.webp` and
   `corruption-mask.webp` (40 files, budgeted, manifested, loaded) are **never drawn**. Only
   `valorant` has an authored wave pool; 19 packs spawn from one probability table.
3. **Character presentation gaps.** The `elite` stage role (84 px, in the locked ladder and in
   approved `set.json` data) is unreachable — `stageRoleForEnemy` returns only boss/standard, so
   Site Sentinel renders at 72 px against its approved 84. The Gear-sheet Hero preview bypasses
   the stage scale contract (trim-height scaling).
4. **Story is structural, not spoken.** Echoes are 3 booleans/pack; `TITLE_TAGLINES` and creature
   bios exist in code but are never rendered; the title screen has zero narrative; terminology
   collides (`ROUTE n` / `PACK n/10` / `Wave n/10` for the same ideas). No FTUE: one 3-second
   toast introduces 6 unexplained nouns, once, ever; all 4 skill chips sit dead at minute 0.
5. **Research laws adopted** (curated against repo reality): stated terminal goal + real ending
   (Universal Paperclips completeness), era shifts for the 200–1000 stretch, per-area identity
   beyond palette (composition rhythm + set dressing + audio motif), progressive disclosure FTUE
   (≤7 concepts visible), honest offline receipt, editorial voice as the anti-slop lever.
   **Rejected** where they conflict with locked design: boss-every-5, 24 h offline cap, 50-zone
   packs, prestige-formula rewrites (Go Live is already run-scoped — the Egg-Inc-correct shape).

## 1. Non-negotiable constraints

- `js/formulas.js` `C` constants: **zero changes.** All 9 balance gates must stay green with the
  same targets; if a slice moves a measured number past a gate, the slice is retuned, never the
  target.
- Sealed GAF2D V4 authority: no new art approvals, no touching `assets/game-packs/valorant/characters/**`,
  no `set.json`/hash edits. The stage role **ladder values** (hero 96/6, standard 72/2, elite 84/2,
  boss 112/2) are 10-doc-bound and unchanged — E4 changes role *assignment* only.
- ADR-0007 nav (5 destinations + Gear FAB), copy bans (`Weapon/Ship/End Season/Area/hover/mana/
  Reputation` display forms), rights gates (no real game marks in runtime copy), 44 pt touch,
  zero horizontal overflow, console-clean smokes, reduced-motion authority: all intact.
- No new assets, no manifest regeneration, no npm runtime deps, no framework creep.
- Every slice lands with its lockstep QA/doc updates in the same commit (DOC-UPDATE-POLICY).

## 2. Explicitly NOT doing (anti-overengineering line)

- No second prestige layer, no per-pack combat *modifiers* (20 mechanics would destabilize the
  thin-headroom balance gates), no verify-profile retune (its 2× slower first Go Live is a
  deliberate value-lane trade already asserted at ≥1.4× Rep/cycle).
- No compat-token CSS migration, no 35-screenshot baseline recapture, no soundtrack, no analytics
  runtime, no offline-cap change (8 h + boundary-stop is a deliberate anti-farm design).
- No pack count change, no zones-per-pack change, no save-schema restructure beyond additive
  fields with migration.

## 3. Slices (implementation order)

### E1 · Pack wave identity — authored composition for all 20 Packs
Every Pack gets an authored 10-wave rhythm (which enemy types appear on which waves), replacing
the flat probability table so each Pack *plays* differently, not just looks different.
- `js/wave-roster.js`: per-pack wave type pools (20 packs × 10 waves), designed so each pack's
  aggregate type mix stays inside the current statistical envelope (champion ≈ 0.14, elite ≈ 0.10)
  — this is what keeps the balance gates green. Valorant's creature pool table is untouched.
- `js/game.js` spawn selection consumes the authored pool when present (keeps probability table
  as fallback for scheduler-era packs? No — pools apply on every visit of that pack, clean rule).
- New `qa/check-wave-roster.mjs` (wired into `qa/run-tests.mjs`): per-pack pool shape, type-mix
  envelope bounds, deterministic selection, valorant intact.
- **Gate protocol:** run `check-balance-targets`, `pacing-profiles`, `long-run` after; retune pool
  placement (not targets) if any of the 4 thin-headroom numbers move adversely.

### E2 · Drift made visible + era arc + Patchline Complete (zone 1000)
The 200–1000 stretch becomes a narrated arc instead of silent repetition.
- Corruption visuals: draw `corruption-mask.webp` over the pack background plate when
  `epochTier > 0`, alpha stepped by tier; drift hue accent on biome glow. (`js/scenery-v2.js`,
  `js/render.js`, reading tier from the existing route journey state.)
- Era names: 5 named eras (tier 0 = Clean Signal; tiers 1–4 get APN-editorial era names) in
  `js/content.js`; Route sheet + drift kicker use them; era-shift beat (toast + zone-clear sweep
  reuse) the first time a save enters each tier. Names must pass copy bans + no real marks.
- Milestone Gates: the Gate at zones 200/400/600/800/1000 carries an era-named boss title
  (label layer only — HP/timer untouched).
- **Patchline Complete:** clearing Gate 100 (zone 1000) mints a one-time persisted completion
  record (`meta`, additive + `save.js` migration note), plays the Go-Live-class cinematic, adds a
  permanent trophy card at the top of the Route sheet, and labels post-1000 play as
  **Endless Rating** (the name docs already promised). Route sheet states the terminal goal from
  zone 1 ("Route Goal · Zone 1000").
- QA: extend `qa/check-route-journey.mjs` (era names, completion record, monotonic migration) +
  `qa/long-run.mjs` completion assertion at the 999→1000 boundary.

### E3 · Pack set dressing — draw the dead assets
- `js/scenery-v2.js`: near-ground set-dressing strip drawn from the active pack's `props.webp`
  cells (deterministic placement per zone), pack accent color threaded into billboard/rail
  accents so the *place* changes when the Pack changes. Background plate treatment rebalanced so
  the pack motif reads (alpha/dim tuning within tokens).
- Zero asset changes; props are already loaded, budgeted, and in the first-playable set for hot
  packs. Reduced-motion safe (static layer).
- QA: `chrome-catalog-rights-smoke` pixel gates must stay green for all 20 packs; visual
  inspection of representative packs at 3 viewports.

### E4 · Character presentation correctness
- `stageRoleForEnemy` honors the authored `elite` role: motion-mapped enemies whose approved
  `consumerScale.role === 'elite'` (Site Sentinel → 84 px as approved) and elite-typed enemies
  (`lag`/`spoiler` role frames) across packs. No upscale violation (168 device px ≤ 177 source).
- Gear-sheet Hero preview passes the real stage geometry contract to `drawHeroV2` (no more
  trim-height scaling).
- Lockstep: `qa/check-gaf2d-valorant.mjs` sentinel assertions 72→84/elite;
  `qa/check-creatures.mjs` fixture roles; sweep every "only standard/boss" assumption in QA +
  docs (ladder value rows are untouched, so the 10-doc geometry contract stays green).

### E5 · The APN story, spoken
- **Echo lines:** 60 unique editorial-voice discovery lines (20 packs × 3) in `js/content.js`,
  written against APN display titles only (rights-safe, copy-ban-safe). Discovery shows the line
  (toast channel, info tone); Echo Archive rows reveal found lines — the archive becomes the
  trophy case. `js/ui.js` + route hook.
- **Title screen:** render a deterministic `TITLE_TAGLINES` rotation + one fantasy line ("You are
  the Host. Clear the noise. Stay live." class) — `index.html`, `js/ui.js`/`main.js`.
- Creature/boss flavor: surface existing `CREATURES` bios in the boss help copy where identity-
  neutral rules allow.
- QA: `check-copy` already scans `content.js`/`ui.js`; add uniqueness guard (no duplicate Echo
  lines) to the route-journey or a small content check.

### E6 · FTUE + UX honesty pass
- Progressive disclosure: the 4 skill HUD chips hidden until the player has SP/rank for them
  (mirrors the Focus-meter treatment); staged tips — `TIPS.start` split into single-concept beats
  on real triggers (first kill → Signal; first affordable upgrade → coach; rank 1 → Build;
  first patch → Notes; first checkpoint → Go Live). Tip copy moves fully into `js/content.js`.
- Offline receipt: replace the `<pre>` with a structured, token-colored per-currency receipt
  component (honest numbers, no reveal animation). `index.html` + `js/ui.js` + `css/game.css`.
- Terminology unification: one label for the 10-step counter — **Wave n/10** everywhere (stage
  chip, Route sheet, aria) — and the `LIVE … ACTIVE` static pip either bound to a real state or
  removed. Smoke assertions updated in lockstep (`chrome-route-smoke` Pack n/10 match).
- Targeted CSS debt: delete the two dead `.nav-btn.active` layers (crimson rule contradicts
  ADR-0007) + the orphan skills-badge rule; raise the 4 px stage-context track to the 8 px floor;
  remove the coach-hint outer glow (COMPONENTS anti-pattern). No broad refactor.

### E7 · Pack audio motifs
- `js/sfx.js`: one 2–4 note WebAudio motif per Pack genre family (deterministic, ~20 tiny
  definitions, zero assets), played on Pack entry and boss spawn, behind `feedbackAllowed()`
  (mute + reduced-motion silence preserved). Distinct milestone-vs-normal purchase cue if cheap.
- QA: run-tests sfx surface assertions extended additively.

### E8 · Release mechanics — cache-bust, docs, changelog
- `RUNTIME_BUILD_ID` `gaf2d-motion-v1` → `enhanced-v1`: `js/cache.js` + every import specifier +
  `index.html` `?v=` (mechanical sweep; `qa/check-runtime-cache.mjs` enforces).
- `docs/EMBED.md` corrected (real sync pipeline, save key v3) — closes the doc half of issue #30;
  ship checklist section added.
- `CHANGELOG.md` release entry, `docs/ROADMAP.md` status, `progress.md` session record,
  `brand/NAMING.md` examples updated to shipped vocabulary (or superseded-bannered).
- Doc-contract sweep (`qa/check-doc-contracts.mjs`) after every doc edit.

## 4. Verification protocol (single-shot, zero-bug bar)

Per slice: focused checks for the touched area + full `node qa/run-tests.mjs` (ALL PASS).
After E1 and again after all slices: `qa/check-balance-targets.mjs` + `qa/pacing-profiles.mjs` +
`qa/long-run.mjs` + `qa/playthrough.mjs`.

Integrated gate before PR:
1. `npm test` → ALL PASS; `git diff --check` clean; entrypoint existence gate.
2. Browser matrix on `127.0.0.1:8791`: `chrome-route-smoke` (4 viewports), `chrome-go-live-smoke`
   (3), `chrome-catalog-rights-smoke` (20 packs, pixel gates), `chrome-build-smoke`,
   `chrome-gear-smoke` (local, macOS Chrome), `node --check chrome-motion-continuity`.
3. Representative screenshots visually inspected (fresh save FTUE, drift-era pack, zone-1000
   completion state via `?zone=` seed, offline receipt).
4. Independent adversarial review (multi-agent: correctness / balance-gate impact / copy-rights /
   save-migration / UX-contract dimensions; every finding verified before fix).
5. Re-run the full gate after fixes.

## 5. Ship chain

1. PR `feat/enhanced-edition` → `main` (What/why + test plan + screenshots; no AI trailers).
2. CI (`Tests + browser smoke`) + GitGuardian green → squash merge (standing merge authority),
   branch deleted.
3. Deploy: clean primary checkout `main` pull → `apn-web` `sync-idle-game.mjs` dry-run → real run
   (`--previous-web-commit 98c0168…`, unchanged hero hashes) → apn-web tests/typecheck/lint →
   apn-web PR + merge → `deploy:production` (dry-run first) → `smoke:idle-game` +
   `smoke:production` with the new source/tree hashes → manual browser readback of
   https://allpatchnotes.com/idle/.
4. Rollback stays concrete: previous release pinned in `public/idle/release.json.rollback`.

## 6. Risk register

| Risk | Mitigation |
|---|---|
| E1 pools shift the 4 thin-headroom balance numbers | Type-mix envelope designed to match current distribution; measured after E1 in isolation; pool placement retuned, targets never |
| E4 role change trips geometry/pixel QA | Ladder values untouched; assertion sweep listed per file; catalog smoke re-run |
| New copy trips copy-ban/rights gates | All new strings written against the ban list + `deniedRuntimeMarks`; `check-copy` run per slice |
| Save-schema additions break old saves | Additive fields only, `save.js` migration + rollback-safety test (route-journey pattern) |
| Doc edits break phrase contracts | `check-doc-contracts` run after every doc commit; EMBED/CHANGELOG are uncontracted |
| Cache-bust sweep misses an import | `check-runtime-cache` enforces the exact token on every specifier |
