# Infinite Patchline · Go Live — Master Execution Plan **v2**

> **Status:** OWNER LOCKED 2026-07-16 (v2) — supersedes the v1 plan in this directory.
> **Law stack (conflict order):** owner answers (AUDIT §6 + this file's locks) → AUDIT amendments (§2–§8) → this plan → V3 docs (as reconciled in PR-0) → code.
> **Baseline:** main `7b46686` (post-purge history `0cdba42` lineage) · `node qa/run-tests.mjs` ALL PASS re-verified after purge.
> **Executor:** autonomous **Opus 4.8** sessions (owner directive — planning was done on Fable 5; the chain must not burn Fable quota). Orchestration docs in §Chain-ops.
> **Companion docs:** `2026-07-16-infinite-patchline-go-live-AUDIT.md` (verified findings + owner gate answers) · v1 plan (historical).

## Locked decisions (v2 final)

| Gate | v1 | v2 (final) |
|------|----|------------|
| Prestige | B1 Go Live only | **B1 confirmed** + first checkpoint at zone 10, hub retarget, offline conversion preserved |
| Catalog IDs / display | A1 keep IDs + homage art | **A′** — IDs stable + **parody display names** (owner-directed, NSS2 style; see Content Spine) + real title only in feed ticker (`editorialReference`) + non-affiliation footer + validator marks-denylist |
| Launch art | C1 3 packs | **C1 confirmed** — Spike Protocol · Ultimate Touchline (flag: `Injury Time` alt) · Dreamline Detour, all in first 60 zones; PR-8 split a/b/c/d |
| Host | D2 gen-atlas from refs | **D2′** — extended full-body canonical GLB (ADR-0010) → deterministic matte render via `tools/mascot-render`; V3 turnaround + today's approved gen sample = identity/style reference only |
| Build migrate | E1 SP refund | **E1 confirmed** (deterministic; legacy mask-skill loss documented as accepted) |
| Art tool | F1 ChatGPT browser | **F1″** — ChatGPT Pro via Chrome (REF-FIRST, public raw-URL refs from repo, green-screen `#00B140` → local chroma-key) → Higgsfield MCP (ask owner first; needs one-time interactive OAuth) → fal.ai (~$25). Proven live 2026-07-16: Host + Site Warden samples. |
| Tracking | G1 stacked PRs | **G1′** — integration branch `release/go-live-v3`, merge commits, single final merge at PR-10 (ci.yml already covers `release/**`) |
| Meta depth | (absent) | **Gate M accepted** — PR-6.5 Coverage Mastery + HP-budget exponent soften + Sets/capstones (Content Spine) + PR-9 cycle-acceleration target |
| Rights hotfix | (absent) | **Gate H executed 2026-07-16** — official Marvel art purged from history (`filter-repo`, force-push, 9 branches), extraction scripts removed, provenance CI gate live. Residual: GitHub Support scrub request (text in §Ops notes). |

## Ref discipline (hard rule, proven today)

1. **No ref, no generation.** Every image request attaches/links APN identity refs (repo raw URLs: `docs/art/refs/host-v3-turnaround/`). The ref-less smoke test produced an off-model robot; the ref-driven run produced an on-model Host — same tool, same day.
2. **Never third-party pixels as refs.** Bosses/creatures = role/archetype text prompts only ("original design, NOT any existing game character" clause mandatory). Restyle of a real character is still a derivative work.
3. ChatGPT flow: same-chat continuity for style · solid `#00B140` background → local chroma-key → alpha · stop-and-ask on bot-check/rate-cap/2× reject.

---
## PR sequence v2 — executable specs

> Consolidates v1 §4 + audit §2 (B-0…B-7), §3 majors, §5 revised sequence, §8 ladder. Execution reality: autonomous **Opus 4.8** sessions, solo-owner public repo, integration branch `release/go-live-v3`, merge commits (never squash mid-stack), per-PR loop = spec → code → `node qa/run-tests.mjs` → scripted CDP smoke → self-review → merge to integration branch. Single final merge to `main` at PR-10. Free-MVP no-paid-power invariant holds in every PR.
>
> **Global owner gates (the ONLY human touchpoints):** (H) Marvel purge [cleared]; per-pack **display-name pass** + **real-UI composite approve/reject** at each art PR; **Host identity sheet** once (PR-5/8a); generator escalation on bot-check/rate-cap/download-friction; Higgsfield switch; **final ship/no-ship** (PR-10). Everything else runs unattended.

---

### HOTFIX · Marvel official-art purge — **STATUS: DONE (executes today)**

- **Objective:** Remove official Marvel/NetEase pixels from a public repo + history before any other work.
- **Scope:** delete `assets/game-packs/marvel-rivals/master/source-*.png`; regenerate `marvel-rivals/**/targets.webp` from the existing procedural SVG path; `git filter-repo` those paths; force-push; delete/scrub stale feature branches carrying blobs; file GitHub Support blob-scrub request; add CI provenance gate (no non-generated PNG under any `master/`); replace `qa/check-assets.mjs` string-match (~line 80) with a provenance check.
- **Non-goals:** no art re-do of marvel-rivals fantasy (that is PR-8 wave work); no rights-schema work here.
- **Acceptance gates:** `git log --all -- '**/master/source-*.png'` returns nothing reachable; `node qa/check-assets.mjs` passes with provenance gate; regenerated `targets.webp` byte-diff shows stick-figure geometry only; CI red on any newly added `master/*.png`.
- **Ask-owner-only-if:** already answered (Gate H approved). No further ask.
- **ETA:** 1.5 h (Opus 4.8).

---

### PR-0 · Source of truth (docs only, run-tests stays green)

- **Objective:** Import V3 as *reconciled* design authority, author ADRs, open the epic, create the integration branch.
- **Scope:** import V3 docs/schemas/host-refs into `docs/product/**` (per v1 §2 layout); declare `docs/product/schemas/rights.schema.json` **canonical** and fix drifting examples (6/6/3/3/5-mode drift, `blocked-until-review`, `reviewer`↔`reviewedBy`); ADR-0008 (Go Live sole checkpoint), ADR-0009 (rights modes required), ADR-0010 (extended full-body GLB supersedes 0003/0005 *scope*), transitional-rights ADR (`pending-review` = warn for wave packs); mark `CODEX-IMPLEMENTATION-PROMPT`/`IMPLEMENTATION-ROADMAP`/`REPO-MAIN-AUDIT`/`00_START_HERE` **superseded-by-this-plan**; add deploy-truth section; **defer all copy-bans**; scope forced `qa/check-doc-contracts.mjs` updates in-diff; create `release/go-live-v3` (CI covers `release/**`); open GitHub epic + child issues PR-1…10.
- **Non-goals:** no runtime code, no copy-ban additions, no schema authored beyond fixing examples, no ImageGen mocks into runtime.
- **Acceptance gates:** `node qa/run-tests.mjs` **ALL PASS on docs-only diff**; `check-doc-contracts.mjs` green; no active doc still teaches Ship+End Season; branch exists and CI triggers on it.
- **Ask-owner-only-if:** an ADR would reverse a §6-locked owner answer (else proceed).
- **ETA:** 2.5 h (Opus 4.8).

---

### PR-1 · Domain `goLive` (highest risk, strictly additive)

- **Objective:** Land atomic `goLive()` beside the working ship/leave path; nothing removed this PR.
- **Scope (`js/game.js`, `js/save.js`, `js/formulas.js`, `qa/`):** idempotent `goLive(state, checkpointId)` + receipt; persisted `meta.pendingGoLiveZone` (boundary semantics: **first checkpoint at zone 10, then every 20**; overshoot mints checkpoint from boundary zone, migrates `ui.seasonDone`); **save bump v2→v3 + write-guard** (refuse overwrite of higher-version save); `legacyContribution` input for `shippedThisSeason`→cycle mapping (encode expected value in test), then **delete `meta.season` + `authority.shippedThisSeason`** post-migrate (or `save.js:65` resurrects them); **preserve** offline→currency conversion but cap at boundary; receipt-schema fixes (`nextPackIds`/`completedPackIds` `minItems:0`, allow §7.6 migration marker, keep `additionalProperties:false` otherwise); `meta.hub` added to persist manifest; `qa/check-go-live.mjs` schema-validates every emitted receipt; parameterize `qa/browser/chrome-route-smoke.mjs` (add 375×812 + landscape, Linux Chrome path) + add `qa/browser/chrome-go-live-smoke.mjs`, run both in CI on ubuntu.
- **Non-goals:** no UI, no Build changes, no removal of ship/leave, no meta-economy tuning, no Echo model (moves to PR-5).
- **Acceptance gates:** double-click/reload/zero-notes/Zone-1000 contracts green; migration matrix (below) all green; `run-tests.mjs` ALL PASS; smoke console-clean at all viewports.
- **Ask-owner-only-if:** the `legacyContribution` denomination has >1 defensible value that changes banked Rep by >5% (present the 3 mappings, pick default = Rep-denominated). Else proceed.
- **ETA:** 5 h (Opus 4.8).

**PR-1 save-v3 migration matrix (acceptance rows):**

| From-state | Path | Machine assert |
|---|---|---|
| v1 save | → v3 direct | attrs→SP deterministic refund; no crash; `goLiveCount=0` |
| v2 clean boundary (zone 20) | → v3 | `goLiveCount === old meta.season`; Go Live available |
| v2 overshoot (zone 27, `seasonDone=true`) | → v3 | `pendingGoLiveZone=20`; Go Live available **now**, not at 40 |
| v2 + 8h offline crossing zone 20 at minute 30 | → v3 | banked Notes ≤ pre-boundary earnings (never 7.5h post-boundary) |
| post-PR-4 v3 save | loaded by v2/PR-1-era code | write-guard **refuses** overwrite |

---

### PR-2 · Go Live UI

- **Objective:** One sheet, one CTA, one receipt — remove the old End-Season path.
- **Scope (`js/ui.js`, `js/render.js`):** single Go Live sheet (bank/grow/refresh/keep/next/impact/safety); remove End-Season confirm path + its code; receipt state + a11y (keyboard cancel/confirm); **land End-Season copy ban** in `qa/check-copy.mjs` (this PR removes the last occurrence); 5 viewport states, 0 overflow.
- **Non-goals:** no naming/nav rename (PR-3), no Weapon/Ship bans yet, no new art.
- **Acceptance gates:** `check-copy.mjs` green with End-Season ban active; `run-tests.mjs` ALL PASS; `chrome-go-live-smoke.mjs` screenshots at 428×926 + 375×812 + landscape, console-clean, 0 horizontal scroll.
- **Ask-owner-only-if:** never (visual skim optional, not blocking).
- **ETA:** 3.5 h (Opus 4.8).

---

### PR-3 · Naming + nav + dormant analytics contract

- **Objective:** Player-facing language → Scanner/Go Live/Route/Pack; Hub→Route destination; reserve event-name contract.
- **Scope (`js/ui.js`, `js/route.js`, `js/hub.js`, `index.html`):** rename Weapon→Scanner, Ship→Go Live, Hub→Route (still **5 destinations**, ADR-0007 intact); **land Weapon/Ship copy bans** here; add dormant event-name contract per IDLE-DESIGN-CONTEXT (names only, no telemetry runtime); add `js/hub.js` to copy-scan list.
- **Non-goals:** **Area→Priority Tag rename does NOT live here** (PR-4b); no real telemetry; no "Satisfied Return Rate" metric (struck); no analytics history-migration fiction.
- **Acceptance gates:** `check-copy.mjs` zero retired-label leakage incl. `hub.js`; `check-route.mjs` = 5 nav destinations; `run-tests.mjs` ALL PASS; no renamed-but-unwired control in DOM.
- **Ask-owner-only-if:** never.
- **ETA:** 3.5 h (Opus 4.8).

---

### PR-4a · Build V2 domain + migration + profiles

- **Objective:** Replace the Damage/Crit/Utility purchasable tax with named abilities, deterministically migrated.
- **Scope (`js/formulas.js`, `js/game.js`, `js/save.js`, `qa/pacing-profiles.mjs`):** abilities Scan (cycle-speed) / Verify (cycle-value) / Relay (offline-continuity); Mastery = spent SP (derived); deterministic SP refund from legacy attrs (1 SP each) + `skillSpCost(lv)=1+floor(lv/5)`; three seeded builds to Zone 200; second save-shape migration chained onto v3 (no new version bump — extends PR-1's v3).
- **Non-goals:** no Build UI (PR-4b), no Priority Tag UI (PR-4b), no meta-economy curve change (PR-6.5), no balance-target setting (PR-9).
- **Acceptance gates:** SP-refund test = exact expected total; three profiles reach Zone 200 without softlock in `pacing-profiles.mjs`; migration matrix v2→PR-1→PR-4 green; `run-tests.mjs` ALL PASS.
- **Ask-owner-only-if:** refund math yields a build that cannot re-spec within one cycle (present the shortfall). Else proceed.
- **ETA:** 3.5 h (Opus 4.8).

---

### PR-4b · Build V2 UI + Priority Tag

- **Objective:** Surface the three abilities and replace Area with the Priority Tag decision.
- **Scope (`js/ui.js`, `js/render.js`, `js/game.js`):** Build sheet with Scan/Verify/Relay + Mastery badge (SP shown **only** here); **Area→Priority Tag rename + behavior lands here** (reward decision on single-target); SP removed from top strip.
- **Non-goals:** no domain re-tune, no new ability axes, no combat-model rewrite beyond Area→Priority Tag.
- **Acceptance gates:** `check-copy.mjs` no "Area" leakage; Priority Tag control wired to a real effect (no dead button); `run-tests.mjs` ALL PASS; smoke screenshots 3 viewports console-clean.
- **Ask-owner-only-if:** never.
- **ETA:** 3 h (Opus 4.8).

---

### PR-5 · Run hierarchy + Host presentation + pose/clip contract

> **Execution checkpoint (2026-07-18):** the Run hierarchy, placeholder scaling,
> and single code-side clip vocabulary are safe to checkpoint independently. The
> first extended-GLB identity candidate was owner-rejected and purged; it never
> became canonical or entered the runtime atlas. Issue #23 remains open for a new
> full-body identity approach, deterministic pose derivation, and the rewritten
> real-pixel asset gate. Do not reuse the rejected arm/neck-as-leg construction.

- **Objective:** V3 Run layout + Host at brand-hero scale, on a single code-defined pose contract with a rewritten asset gate.
- **Scope (`js/render.js`, `js/ui.js`, `qa/check-assets.mjs`, `tools/mascot-render/`, `docs/decisions/`):** top strip = Signal + Notes only; Route + Pack progress chips; conditional Focus; Patch Echo chip `n/m`; Host stage 118–142 px, shared ground plane; **define ONE pose/clip contract code-side** (resolve the 4 conflicting contracts) and **rewrite `check-assets.mjs`** to it in the same PR; author **extended full-body canonical GLB** (legs added per V3 identity) blessed by ADR-0010; derive all poses **deterministically** via `tools/mascot-render` 3-band matte toon shader; **ships with scaled placeholder atlas** — full matte re-atlas is PR-8.
- **Non-goals:** no image-gen as atlas source (gen = identity/style ref only per §7); no 3-layer parallax (single-layer launch); no per-pack art.
- **Acceptance gates:** `check-assets.mjs` (rewritten) passes against the new contract incl. `meta.source===GLB` + camera lock + full pose set; Host renders 118–142 px at 428×926 (measured, not asserted-against-self); `run-tests.mjs` ALL PASS.
- **Ask-owner-only-if:** **Host identity sheet approval** (owner gate — GLB proportions/identity signed off once before pose derivation). Else proceed.
- **ETA:** 5.5 h (Opus 4.8).

---

### PR-6 · Route surface + Echo archive + hub retarget + event reservation

- **Objective:** Route owns the journey; retire dead dailies; reserve the editorial-event lever.
- **Scope (`js/route.js`, `js/hub.js`, `js/game.js`, `docs/product/schemas/`):** Route sheet = journey + objectives + pack history + **Echo archive** (Echo domain model lands here) + next-pack reveal; install-new-pack path without core rewrite or forced wipe; **hub retarget** (`d_ship`→"Go Live once", `w_notes`→notes earned) + rename 99-level "Season track" (keep XP/reward drip); **reserve Patch Drop event schema + scheduler override hook + Route chip** (`{packId, window, yieldModifier, bonusEchoIds, editorialUrl}`) — schema + hook only, no live events.
- **Non-goals:** no live editorial events wired to real APN coverage; no meta-economy change (PR-6.5); no auto-Go-Live capstone (needs separate owner sign-off vs B1).
- **Acceptance gates:** dailies/weeklies claimable (not 0/1 forever); Echo archive renders `n/m` per pack; Patch Drop schema validates; pack-install test adds a pack without wipe; `run-tests.mjs` ALL PASS.
- **Ask-owner-only-if:** enabling an auto-Go-Live Relay capstone (conflicts with B1 one-action promise). Else proceed.
- **ETA:** 3.5 h (Opus 4.8).

---

### PR-6.5 · (Gate M) Coverage Mastery + Coverage Sets + curve soften

- **Objective:** Make "infinite" true — give the 18 wave packs a mechanical reason to exist and fix the ~Go-Live-#6 flatline.
- **Scope (`js/formulas.js`, `js/game.js`, `docs/BALANCE.md`):** per-pack **Coverage Mastery** = Rep sink multiplying that pack's yield on revisit; **Coverage Sets** = themed pack groups (genre-clustered per §8, e.g. tactical-shooter / sports / MOBA / BR) with a **permanent capstone bonus** when a set's members are mastered, and **open slots** reserved so future wave packs join an existing set and extend it; **soften HP budget exponent** (`permanentBudget` 0.9 → ~0.4–0.5, or exempt Live Mult); raise/remove the zone-120 `maturityHits` cap interaction only as needed to restore +10–20% settling.
- **Non-goals:** no paid power (free-MVP invariant), no new currency, no pay-gated set completion, no per-pack bespoke mechanics beyond the yield multiplier.
- **Acceptance gates:** simulated cycle N+1 first-Gate **≥X% faster** than cycle N (X set in PR-9); Coverage Set capstone is permanent + set has ≥1 open slot in schema; `run-tests.mjs` ALL PASS; BALANCE.md documents the reversal of the anti-trivialization decision.
- **Ask-owner-only-if:** the soften makes any seeded profile trivialize before Zone 200 (present the curve). Else proceed.
- **ETA:** 3.5 h (Opus 4.8).

---

### PR-7 · Rights + catalog hard gates + `pack.schema.json`

- **Objective:** Rights become enforceable truth without bricking the launch catalog.
- **Scope (`docs/product/schemas/`, `assets/game-packs/catalog.json`, `js/generated/game-packs.js`, `qa/`):** per-pack `rights.json` + `easter-eggs.json`; **author `pack.schema.json`** (pointer-file shape; adapt `examples/validate-pack.mjs`, don't rewrite blind); modes `apn-original|homage-only|editorial-text-original-art|licensed-spotlight|blocked` + transitional `pending-review` (warn); **display-title split** — internal IDs stay (`valorant` etc.), display titles become APN parody names (§8 ladder), real title appears **only** in feed ticker as `editorialReference` + one non-affiliation footer line; validator checks **title-vs-mode against a marks denylist** and blocks `fan-policy-noncommercial` repo-wide; **rewrite** Asset-Bible rows naming real athletes/characters (Bellingham, SGA, Doctor Doom, Godrick…) to **archetypes**; **generalize hardcoded gates** (`check-assets.mjs` count from `catalog.json`, per-pack production-set check — pack #21 must pass CI).
- **Non-goals:** no art generation; no ticker wired to live coverage (PR-6 schema only); no licensed marks; no renaming of stable IDs.
- **Acceptance gates:** a pack titled a raw trademark **fails** the validator; pack #21 passes CI; wave packs warn (not block) on `pending-review`; `validate-pack.mjs` green; `run-tests.mjs` ALL PASS.
- **Ask-owner-only-if:** a denylist hit is genuinely ambiguous editorial-vs-source-identifying use (quote the title + mode). Else proceed.
- **ETA:** 4.5 h (Opus 4.8).

---

### PR-8a · Art pipeline + measurement suite + model routing (mergeable with zero art)

- **Objective:** Build the scale-safe production system + the pixel-trust harness before any pack art lands.
- **Scope (`tools/`, `qa/`, `docs/product/ASSET-PRODUCTION-STANDARD.md`):** per-pack packet layout `01_RIGHTS…05_RUNTIME`; prompt templates + forbidden anchors; **REF-FIRST** ChatGPT-Pro-via-Chrome playbook (never generate without APN refs; solid-green bg → local chroma-key to alpha); extract/atlas + WebP-budget scripts reused (do not rebuild the deterministic toolchain); **real measurement suite** (alpha-derived foot row, mass ratio, visor coverage, halo fringe, occupancy at 72/128/192 downsamples, OCR text scan) replacing the self-verifying `footY:184` constants; model routing note (green-screen primary; Higgsfield fallback owner-gated; fal.ai tertiary — all gates generator-agnostic); **calibrate on ONE pack end-to-end** before the other two.
- **Non-goals:** no pack art committed in this PR; no provider candidate dumps in git; no 3-layer env; no gen-extract hand-crop round (the `7feb2c7→adaa817` failure mode is banned).
- **Acceptance gates:** measurement suite runs on placeholder atlas and reports real numbers; one calibration pack passes size/halo/text/composite gates end-to-end; `run-tests.mjs` ALL PASS; PR mergeable with zero new art.
- **Ask-owner-only-if:** **Host identity sheet** (if not already signed in PR-5); generator hits bot-check/rate-cap/download-friction → **STOP, ask owner** (do not grind); switching to Higgsfield.
- **ETA:** 4.5 h (Opus 4.8).

---

### PR-8b / 8c / 8d · One production pack each (independently owner-approvable)

- **Objective:** Three vertical-slice packs at production art quality, one PR each.
- **Scope:** **8b Spike Protocol** (`valorant`, retitled) · **8c Ultimate Touchline** (`fc-26`, retitled) · **8d Dreamline Detour** (`dreamline-detour`, new 21st pack, `apn-original`). Each: rights.json locked → ref-first green-screen contact sheet → chroma-key → silhouette readability → extract → WebP budgets → **real Run composite at 428×926** → catalog include. One permitted retry with tightened prompt on reject.
- **Non-goals:** no re-art of the other 18 (wave work post-launch); no infinite regen (one retry, then stop and escalate); no likeness/kit/logo.
- **Acceptance gates:** measurement suite passes (size/mass/halo/OCR-clean); real-UI composite exists; rights validator green for the pack; `run-tests.mjs` ALL PASS.
- **Ask-owner-only-if:** **display-name pass** for the pack **and** **real-UI composite approve/reject** (both owner gates, per pack); a reject after the one retry (owner decides third attempt vs ship placeholder).
- **ETA:** 2.5 h each (Opus 4.8), + owner gate + generation wall-time.

---

### PR-9 · Balance vs explicit targets

- **Objective:** Turn satisfaction into checked numbers.
- **Scope (`qa/pacing-profiles.mjs`, `qa/long-run.mjs`, `docs/BALANCE.md`):** seeded active/idle/offline × Scan/Verify/Relay × clean/corrupted × echo-discovery; targets — **time-to-first-Go-Live ≤15 min**, cycle N+1 first-Gate **≥X% faster** than N, Verify **≥+40% Rep/cycle** vs Scan, Scan **≥+20% zones/hr**, Relay **≥+30% offline yield** (`earnedQualityModifier` is the lever); **document rep∝live²** as intended or divide one factor out; rewrite `long-run.mjs:40` overflow assertion to the preserved-conversion behavior.
- **Non-goals:** no new mechanics, no re-tuning the Coverage curve from scratch (PR-6.5 owns it), no art.
- **Acceptance gates:** every numeric target met in seeded runs (machine-checked); `long-run.mjs` asserts capped offline conversion; `run-tests.mjs` ALL PASS.
- **Ask-owner-only-if:** a target is unmet after tuning and hitting it requires touching the free-MVP economy firewall (present the trade). Else proceed.
- **ETA:** 3.5 h (Opus 4.8).

---

### PR-10 · Controlled launch (final merge to `main`)

- **Objective:** Real, reversible deploy — receipts survive rollback.
- **Scope (`docs/EMBED.md`, `docs/DEFINITION-OF-DONE.md`):** define the actual deploy step (manual copy into apn-web; **fix stale `apn_idle_save_v1` key → v3** in EMBED.md); rollback semantics that preserve Go Live receipts; optional staged rollout if embedded; ship checklist = DEFINITION-OF-DONE + PR-9 product metrics; single merge `release/go-live-v3` → `main` with merge commit.
- **Non-goals:** no new features; no auto-deploy pipeline build-out (manual copy is the launch reality); no store/monetization.
- **Acceptance gates:** full QA matrix green on `release/go-live-v3`; deploy step is executable prose with the correct save key; rollback test preserves receipts; `run-tests.mjs` ALL PASS at merge.
- **Ask-owner-only-if:** **final ship / no-ship decision** (owner gate — mandatory, this is the launch trigger).
- **ETA:** 2.5 h (Opus 4.8).

---

## Content Spine — Set Ladder, Motif Grammar, Bosses & Capstones (adversarially polished)

This is the owner-facing content spine: 21 blocks, 10 zones each, one boss per 10th zone, grouped into 8 collectible Sets that thread across the ladder. Display names execute owner directive A′ (playful evocative parody, real title stays in the feed ticker only). IDs are stable and internal. This table supersedes AUDIT §8 and ships verbatim.

### Master ladder (21 blocks × all columns)

| # | Zones | ID (stable) | Kaynak oyun (yalnız ticker'da: editorialReference) | Display name | Set | Motif anchors (FEEL, IP-free) | Forbidden anchors (never render) | Zone-boss (original archetype) |
|--:|-------|-------------|-----------------------------------|--------------|-----|-------------------------------|----------------------------------|--------------------------------|
| 1 | 1–10 | `valorant` | Valorant (Riot) | **Spike Protocol** ★prod | S1 | defuse timer, A/B site markers, agent visors | agent likenesses, "Spike" logo, Riot/Vandal marks | Site Warden |
| 2 | 11–20 | `minecraft` | Minecraft (Mojang) | **Punch-a-Tree** | S5 | blocky voxel terrain, day/night bar, low-poly biomes | Steve/Alex likeness, Creeper face, Mojang logotype | Green Fuse Golem |
| 3 | 21–30 | `fc-26` | EA Sports FC 26 (EA) | **Ultimate Touchline** ★prod (owner-confirmed) | S3 | pitch stripes, broadcast lower-thirds, crowd tifo, retro shonen soccer-manga energy (dynamic poses, wind-swept hair, dramatic angles — style only) | real crests/kits, player likenesses, EA/FIFA/FC marks, Captain Tsubasa character likenesses | Golden Boot Captain |
| 4 | 31–40 | `fortnite` | Fortnite (Epic) | **Storm Builders** | S5 | closing storm wall, ramp/wall build pieces, glider drop | named skins/likenesses, Epic marks, battle-bus/llama shapes | Storm Herald |
| 5 | 41–50 | `counter-strike-2` | Counter-Strike 2 (Valve) | **Smoke & Defuse** | S1 | smoke plumes, plant beep, buy-menu economy | CS map trade dress, Valve marks, real skin brands | Eco Kingpin |
| 6 | 51–60 | `dreamline-detour` (new #21) | — APN original — | **Dreamline Detour** ★prod | S8 | floating dream isles, soft neon gradients, drifting motes | (original IP) any source-game homage, licensed music cues | The Dreamwright |
| 7 | 61–70 | `league` | League of Legends (Riot) | **Nexus Brawlers** | S4 | three-lane map, minion waves, turret beams | champion likenesses, Rift/Nexus logo, Riot marks | Nexus Colossus |
| 8 | 71–80 | `overwatch` | Overwatch (Blizzard) | **Payload Heroes** | S2 | escort cart on rail, ult flashes, clean sci-fi | hero likenesses, Blizzard marks, named ult callouts | Payload Prime *(the cart fights back)* |
| 9 | 81–90 | `nba-2k26` | NBA 2K26 (2K) | **Buzzer Beaters** | S3 | hardwood court, shot clock, jumbotron, net swish | real teams/logos, player likenesses, 2K/NBA marks | Clutch MVP |
| 10 | 91–100 | `grand-theft-auto-v` | Grand Theft Auto V (Rockstar) | **Five Stars Wanted** | S5 | rising wanted stars, city minimap, siren strobes | Rockstar/GTA marks, Los Santos map art, named characters | Heist Mastermind |
| 11 | 101–110 | `apex-legends` | Apex Legends (EA/Respawn) | **Third Party Legends** | S2 | closing ring, drop trails, ability-kit icons | Legend likenesses, Apex/Respawn/EA marks, named finishers | Ring Closer |
| 12 | 111–120 | `world-of-warcraft` | World of Warcraft (Blizzard) | **Guild & Glory** | S7 | raid-boss silhouette, guild banners, cast-bar mechanics | named characters, Blizzard/WoW marks, class-icon art | Guild-Breaker Behemoth |
| 13 | 121–130 | `old-school-runescape` | Old School RuneScape (Jagex) | **Click & Chop** | S7 | low-fi tile grid, XP drops, woodcut/mine loop | Jagex/RuneScape marks, named NPCs, exact RS UI chrome | Sand Crab Sovereign |
| 14 | 131–140 | `rocket-league` | Rocket League (Psyonix) | **Boosted Ballers** | S3 | boost trails, oversized ball, neon goal burst | Psyonix/RL marks, licensed car brands, named arenas | Aerial Ace |
| 15 | 141–150 | `dota-2` | Dota 2 (Valve) | **Creep Score** | S4 | dark lane map, last-hit gold pops, high-ground ramp | hero likenesses, Valve/Dota marks, Aegis/Roshan design | High Ground Warlord |
| 16 | 151–160 | `madden-nfl-26` | Madden NFL 26 (EA) | **4th & Goal** | S3 | gridiron yard lines, down-marker chains, stadium lights | real teams/logos, player likenesses, Madden/NFL/EA marks | Blitz Wall |
| 17 | 161–170 | `dead-by-daylight` | Dead by Daylight (Behaviour) | **Hooked & Hunted** | S6 | fog-lit trial, sacrifice hooks, repair-gen sparks | named/licensed killers, Behaviour marks, crossover characters | Generator Stalker |
| 18 | 171–180 | `marvel-rivals` | Marvel Rivals (NetEase/Marvel) | **Cape Clash** | S2 | rooftop skyline brawl, cape sweep, team-up burst | **any** Marvel character likeness, Marvel/NetEase/Rivals marks, comic-panel logos | Team-Up Titan |
| 19 | 181–190 | `escape-from-tarkov` | Escape from Tarkov (BSG) | **Gear Fear** | S1 | extraction countdown, loot-rig slots, grim militaria | BSG/Tarkov marks, real firearm brands, named raid maps | Extract Camper |
| 20 | 191–200 | `path-of-exile-2` | Path of Exile 2 (GGG) | **Loot Filter Purgatory** | S6 | cascading loot beams, gem sockets, currency orbs | GGG/PoE marks, named uniques, exact passive-tree art | Six-Link Horror |
| 21 | 201–210 | `elden-ring` | Elden Ring (FromSoftware) | **Git Gud Kingdom** | S6 | ash-lit ruined realm, fog-wall boss doors, bonfire checkpoints | named bosses, FromSoft/Bandai marks, "Tarnished"/rune terms | Nerf Knight, the Patchbearer |

★prod = the three production-quality launch packs (all inside the first 60 zones so every player sees them). `???` open slots (S4, S7, S8) render as locked cards; future wave packs slot in without touching stable IDs.

### Sets & capstones (thematic collections + one permanent bonus each)

Set completion = **every member pack "covered"** (boss down + 3 echoes). Capstone = one permanent thematic bonus. **Shape only — numbers land in PR-9.** Hard firewall (see below): every capstone is earned-by-play, never purchasable, and never a global multiplier.

| Set | Name | Member packs | Thematic fit | Capstone theme | Econ-safety class |
|-----|------|--------------|--------------|----------------|-------------------|
| S1 | **Tactical Feed** | Spike Protocol · Smoke & Defuse · Gear Fear | Precision gunplay / tactical (Valorant, CS2, Tarkov) — strong | **Rapid Defuse** — first Version Gate of each set-pack enters pre-primed (faster boss resolve) | **S** (scoped) |
| S2 | **Hero Roster** | Payload Heroes · Third Party Legends · Cape Clash | Hero shooters + team-up (OW, Apex, Rivals) — strong | **Team-Up Echoes** — Patch Echoes in set-packs surface an extra hint / reveal in pairs | **S** (scoped, discovery) |
| S3 | **Prime Time** | Ultimate Touchline · Buzzer Beaters · 4th & Goal · Boosted Ballers | Broadcast sports/esports — strong (largest set, on-brand APN "coverage") | **Clutch Window** — a scoped boss-timer window grants bonus Notes on set-packs only (skill-gated) | **S** (scoped, capped) |
| S4 | **Lane Wars** | Nexus Brawlers · Creep Score · `???` | MOBAs (LoL, Dota) — strong | **Last-Hit Bounty** — last kill per zone in set-packs drops bonus Signal | **S** (scoped, small) |
| S5 | **Open Sandbox** | Punch-a-Tree · Storm Builders · Five Stars Wanted | Sandbox/open-world (Minecraft, GTA) + Fortnite build — good (Fortnite justified by build motif) | **Free Build** — cosmetic Route/stage theme + free re-order of visited set-packs | **C** (cosmetic/QoL) |
| S6 | **Nightmare Shift** | Hooked & Hunted · Loot Filter Purgatory · Git Gud Kingdom | Difficulty/dread axis, not genre (horror, ARPG-hell, souls) — deliberate "games that hurt" set; all late-ladder | **Hardened** — offline/Relay yield inside set-packs resists corruption-tier decay | **S** (scoped, bounded) |
| S7 | **Long Grind** | Guild & Glory · Click & Chop · `???` | MMO/idle grind (WoW, OSRS) — strong | **Idle Dividend** — while active zone sits in a set-pack, a small **hard-capped** Coverage-Mastery Rep tick accrues offline | **S** (scoped + capped, honors offline-farm guard) |
| S8 | **APN Originals** | Dreamline Detour · `???` | Original IP — by definition | **Signature Frame** — exclusive APN Host cosmetic + a dedicated Patch Echo archive page | **C** (cosmetic/collectible) |

Assignment tally: 3+3+4+2+3+3+2+1 = **21** packs, all mapped.

### Capstone economy firewall (must survive `qa/run-tests.mjs` negative contract)

Read against `docs/MONETIZATION.md` (`economyMult = Live Mult`, one global multiplier) and `docs/BALANCE.md`:

1. **Live Mult stays the sole global multiplier.** No capstone adds a second global economy term. Class **S** bonuses apply **only inside their own set's packs** (scoped yield/time), Class **C** bonuses are cosmetic/navigation only. A machine gate can assert: no capstone effect reads or writes `economyMult` and none is unscoped.
2. **Never purchasable.** Every capstone is granted solely by covering all member packs (boss + 3 echoes). No SP/Rep/coin/real-money path unlocks one. This keeps free-MVP no-paid-power intact — capstones are the *reward for play*, not a store SKU.
3. **PR-9 owns the numbers and the caps.** S7 Idle Dividend and S3 Clutch Window are the two that touch currency; both are scoped + capped and must ship with the existing offline-farm test extended ("capstone offline tick cannot bank more than X/return").
4. Capstones sit **above** the audit's Gate-M Coverage Mastery (per-pack revisit yield), not in place of it — Coverage Mastery gives each wave pack a reason to exist; capstones reward completing a whole Set. Different layers, no double-count.

### Infinite-hook completion rule (protects the `???` slots)

Set completion evaluates against the set's **declared roster at capstone-claim time** (INFINITE-PACK "bounded visible set"). When a future wave pack joins a set, it adds **new optional echoes**, never a new completion requirement — **a claimed capstone never reverts.** Without this, every new wave pack would silently un-complete every player's capstone.

### Pacing critique (block-by-block) — verdict: strong, 2 boss fixes, 1 name flag

- **Onboarding (block 1).** Kept a tactical shooter at block 1 over higher cold-recognition Minecraft: block 1 must teach the **combat verb**, and "point-and-shoot" maps 1:1 onto the existing scan/fire loop, whereas Minecraft's mine/build verb is a mismatch. The one-two is deliberate — mechanical clarity (1) then max universal recognition (Punch-a-Tree, 2).
- **Two tactical packs (1 & 5) differentiated by their own games' vocabulary** — Valorant "Spike" vs CS "smoke/eco"; three blocks apart with sandbox + sports between. No cluster.
- **z100 milestone lands on Five Stars Wanted** (GTA heist finale) — clean round landmark.
- **z120 difficulty ceiling (`maturityHits` cap) lands on Guild & Glory** (WoW raid) — the single best pacing decision; the raid fantasy sits exactly on the ceiling.
- **Breathers at 6 / 13 / 18.** Dreamline surreal palette-cleanser mid-first-arc (z51–60), Click & Chop cozy grind immediately after the ceiling (z121–130), Cape Clash bright hero-spectacle lift inside the late dread cluster (between horror-17 and extraction-19).
- **MMO 12→13 back-to-back is intentional and kept** — epic raid finale → cozy click grind is a strong tonal drop, not a genre repeat.
- **Late anxiety escalation (17→21)** horror → hero-lift → extraction dread → ARPG purgatory → souls capstone — clean ramp.

### Changes made and why

1. **Boss dedupe — block 6 `Sleepwalker Prime` → `The Dreamwright`.** "Prime" collided with block 8 Payload Prime. Dreamwright is a unique noun and leans into Dreamline's original-IP freedom.
2. **Boss dedupe — block 13 `Grind Warden` → `Sand Crab Sovereign`.** "Warden" collided with block 1 Site Warden. Sand crabs are OSRS's canonical AFK-grind monster — a witty, source-authentic deep-cut that fits the "idle ur-game" veteran breather beat, and removes the collision.
3. **Added Set + capstone system** (8 sets, economy-safe capstone themes, class tags, firewall, infinite-hook completion rule) — the collection layer the draft ladder lacked; keeps every bonus off the global multiplier and out of the store.
4. **Added motif + forbidden anchor grammar per pack** — the ref-first/rights-first execution contract for PR-8a (what makes each pack FEEL like its source with zero IP, and the exact pixels/marks/likenesses that must never render).
5. **Display-name adversarial pass — all 21 survive; 1 flag.** The A′ parody names are strong (Punch-a-Tree, Gear Fear, Git Gud Kingdom, Click & Chop, Five Stars Wanted are best-in-class); churning them would forfeit recognition equity. One flag: **Ultimate Touchline** is the only name flirting with a live mark ("Ultimate Team"/FUT is an EA mark). It reads as evocative-parody not a soundalike, so it's defensible — but if counsel wants maximum distance on a ★prod launch pack, the zero-risk swap is **`Injury Time`** (drama + boss-timer tie, no mark contact). Owner/counsel call.
6. **Cape Clash kept deliberately generic** (capes, not "team-up heroes") — this is the pack whose official Marvel art was purged in the pre-PR-0 hotfix, so a generic-superhero name is a rights *feature*; its forbidden-anchor row is the strictest in the table (**any** Marvel likeness).
7. **Loot Filter Purgatory kept** (best evocation of "endless ARPG grind-dread") with a UI note: at 3 words it may need a `Loot Purgatory` short form on narrow chips — resolve in PR-6 Route surface, not by renaming.

---

## Autonomous chain ops

> Execution model: solo-owner public repo, integration branch `release/go-live-v3`, run by autonomous **Opus 4.8** sessions (not the planning model). Owner is touched ONLY at the scheduled gates in the session map and the six STOP triggers in §D — nothing else interrupts.

### A. Session map (S0…S9 → PRs)

| Session | Model | PRs | ETA | Entry criteria | Exit criteria | Owner touch |
|--------:|-------|-----|----:|----------------|---------------|-------------|
| **S0** | Opus 4.8 | HOTFIX + PR-0 + branch | 3h | Gate H answered; §8 locks green | Marvel blobs purged + `filter-repo`'d + provenance CI gate; V3 docs imported w/ reconciliation (canonical `rights.schema.json`, fixed examples, superseded markers, ADR-0008/9/10 + transitional-rights); `release/go-live-v3` cut; epic+issues opened; `run-tests` ALL PASS on docs-only diff | **Gate H** (purge+force-push approval, pre-session) |
| **S1** | Opus 4.8 | PR-1 | 5h | S0 merged; baseline green | `goLive()` **additive** (ship/leave still works); `pendingGoLiveZone`; save v3+write-guard; migration matrix + real-save fixture; receipt-schema fixes; `qa/check-go-live.mjs`; `chrome-go-live-smoke` in CI | None if all green |
| **S2** | Opus 4.8 | PR-2, PR-3 | 4h | PR-1 merged | Go Live UI (one sheet/CTA); old ship/leave path removed; End-Season+Weapon/Ship copy bans land; naming/nav (5 dest, ADR-0007 intact); dormant analytics contract | Optional visual skim |
| **S3** | Opus 4.8 | PR-4a, PR-4b | 5h | PR-3 merged | 4a: Build V2 domain + SP migration + seeded profiles; 4b: Build UI + Area→Priority Tag rename; 3 builds to Zone 200 | Balance glance if asked |
| **S4** | Opus 4.8 | PR-5 | 5h | PR-4b merged | Run hierarchy; Host 118–142px on **placeholder scaled atlas**; single pose/clip contract code-side; `check-assets.mjs` rewrite; extended full-body GLB gate (ADR-0010) | **Host identity sheet** approve |
| **S5** | Opus 4.8 | PR-6, PR-6.5 | 4h | PR-5 merged | Route surface + Echo archive + hub retarget + season-track rename + Patch Drop schema/hook; **6.5** Coverage Mastery + budget-exponent soften (Gate M) | None if tests green |
| **S6** | Opus 4.8 | PR-7 | 4h | PR-6.5 merged | `rights.json` + `pack.schema.json` + title/mode validator + marks denylist + pack-count generalization; bible archetype rewrite | Rights-mode defaults confirm |
| **S7** | Opus 4.8 | PR-8a | 4h | PR-7 merged | Art pipeline + real measurement suite (72/128/192, halo, OCR) + F1″ model routing; **mergeable with zero art** | Warm Higgsfield OAuth |
| **S8** | Opus 4.8 | PR-8b, 8c, 8d | 5h | PR-8a merged | One pack each: Spike Protocol · Ultimate Touchline · Dreamline Detour; real-UI composite per pack | **Art approve per pack** |
| **S9** | Opus 4.8 | PR-9, PR-10 | 4h | PR-8d merged | Balance vs explicit targets (≤15min first Go Live, cycle-accel, build divergence, rep∝live² documented); deploy step (EMBED.md fixed) + rollback semantics | **Ship / no-ship** |

### B. Branch mechanics

- S0 cuts `release/go-live-v3` off post-hotfix `main`; every child PR targets it, **merge commits only** (never squash mid-stack — preserves per-PR bisect points). `ci.yml` already fires on `release/**`, so each child PR runs full CI on open and on base-retarget.
- No stacking on unmerged branches (audit B-6): PR-N+1 opens only after PR-N merges to the integration branch — sequential sessions make this free.
- **PR-10 only**: single squash-free merge `release/go-live-v3` → `main` after ship gate. `main` never holds a broken intermediate state.

### C. Per-PR loop (concrete, every PR)


spec block in PR body → code
→ node qa/run-tests.mjs                         # ALL PASS, non-negotiable
→ targeted: qa/check-go-live.mjs, qa/check-route.mjs, etc. per PR surface
→ START SERVER: python3 -m http.server 8791 &   # harness hard-codes :8791
→ node qa/browser/chrome-route-smoke.mjs <out>  # + chrome-go-live-smoke.mjs
   parameterized viewports: 428×926 AND 375×812 (+ landscape when Run changes)
→ kill server
→ self-review (or /review on non-trivial) against issue DoD
→ merge to release/go-live-v3


**PR-body evidence block (required):** `run-tests: ALL PASS (N assertions)` · `smoke: 428×926 ✓ / 375×812 ✓, console clean` · screenshot paths · `DoD: <checkboxes>`. No "looks fine" without paths.

### D. STOP-AND-ASK-OWNER triggers (exhaustive — NOTHING else interrupts)

1. **Art gate 2× reject** — one tightened-prompt retry is permitted; a second reject stops.
2. **Rights-mode conflict on a shipping pack** — validator flags a title-vs-mode or denylist collision on a launch (non-wave) pack.
3. **Balance target miss after 2 tuning rounds** — a PR-9 numeric target still fails.
4. **Save-migration test failure on a real-save fixture** — any red in the migration matrix against a real save.
5. **Any force-push need** beyond the Gate-H-approved S0 hotfix.
6. **Scope change vs plan v2** — anything not written in this plan/AUDIT.

Not additional asks (already locked in the plan, do NOT re-prompt): the scheduled owner gates in the map (Host sheet, per-pack art, ship/no-ship, Gate H); and the F1″-locked art-pipeline asks — bot-check/rate-cap/download friction → STOP, and switching ChatGPT→Higgsfield → ask before switching.

### E. Session-start ritual (every session, in order)

1. Read plan v2 + AUDIT §2–8 + this ops section (LAW: audit amendments and §6 answers win over v1).
2. `git fetch && git checkout release/go-live-v3 && git pull` — verify on integration branch.
3. `node qa/run-tests.mjs` → confirm **baseline green** before touching code. Red baseline → go to §F.
4. Confirm prior PR merged and this session's entry criteria met; then work the assigned PR(s).

### E2. Session kickoff prompt (paste-ready, per issue)

```
Issue #<N> (PR-<X>) uzerinde calis. Once oku (LAW sirasiyla):
docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-v2.md (ilgili PR spec + Autonomous chain ops)
docs/superpowers/plans/2026-07-16-infinite-patchline-go-live-AUDIT.md
Baseline dogrula: node qa/run-tests.mjs ALL PASS. Branch: release/go-live-v3 (merge commit, squash yok).
Bitis kriteri: spec'teki acceptance gates + PR body evidence blogu. STOP tetikleyicileri (chain-ops D) disinda owner'a soru sorma.
```

### E3. No-hallucination rule (every session)

A fact not present in plan v2, the AUDIT, or the repo does not exist. Before citing any file path, field name, formula, or constant: READ it in the repo. Never invent schema fields, function names, or test names — grep first. If the plan and the code disagree, the code is the fact and the discrepancy is reported (STOP trigger 6 if it changes scope).

### F. Failure recovery (inherited red baseline)

- **First**: `git bisect` between last-known-green (prior session's merge SHA in the epic) and HEAD to name the offending merge — do not guess.
- **Single bad merge, isolated** → `git revert -m 1 <merge>` on `release/go-live-v3`, re-open that PR's issue, continue only if the current PR is independent; else stop the current PR and redo the reverted one first.
- **Entangled / multi-PR corruption** → STOP (trigger 5: recovery needs force-push/history surgery) — ask owner.
- Never force-push the integration branch to "fix" a red state; revert forward. The only sanctioned history rewrite is the Gate-H S0 hotfix.


---

PR-8a commits the following verbatim as `docs/art/APN-ART-STANDARD.md`. It is the machine-and-owner-checkable quality contract every generated pixel passes before it reaches `assets/game-packs/**` or the Host atlas. The style targets are the game's own shader output, not prose — the "matte 2D" band values below are literally `tools/mascot-render/render.js:70`.

---

## APN Art Standard v1

> **Owner of this file:** PR-8a (pipeline + gates, mergeable with zero art). Every later art PR (PR-8b/c/d, wave packs) is DoD-blocked on the gates in §4.
> **Scope:** all runtime art — Host atlas + per-pack target/boss/prop/background sets. Bosses and targets share the Host's visual language so the whole screen reads as one world.
> **The Host is not generated.** Per D2′/ADR-0010 the Host atlas is a *deterministic render* of the canonical full-body GLB through the shader in §1 — image-gen is identity/style reference only, never the Host atlas source. Pack art is generated, then forced to match that render's look through the gates below.

### 1 · Style grammar (the look, defined by the shader not by adjectives)

- **Matte 2D, 3-band cel.** Exactly three flat light bands, no smooth ramp. Reference the live shader: band multipliers **1.08 / 0.88 / 0.66** at light thresholds `>0.62 / >0.05 / else` (`tools/mascot-render/render.js:70`). Anything with visible gradient banding beyond these three steps fails style review.
- **Ink outline.** Single dark contour, color `#07090E` (shader ink `vec4(0.025, 0.035, 0.055)`), from silhouette-expand — not a drawn line-art overlay.
- **Forbidden:** gloss/specular highlights, bloom, soft gradients, ambient occlusion baking, rim-light glow, drop shadows, toy-plastic sheen, painterly texture. These are the exact "generic AI-render" tells the old crop pipeline shipped.
- **Silhouette-first.** Readability lives in the outline shape. If the piece fails the 72px silhouette gate (§4.3), no amount of interior detail rescues it — redesign the silhouette, don't add detail.
- **Per-pack palette anchored to `pack.json`.** Every pack declares `palette.anchors[]` (3–5 hex) in its manifest; generated art must land within ΔE ≤ 12 of an anchor for ≥80% of opaque pixels (gate §4, palette check). No pack invents colors off-anchor.
- **Targets/bosses relate to the Host:** same 3-band shading, same ink weight, same matte finish, same ground plane and camera-height read — enemies are *residents of the Host's world drawn by the same hand*, distinguished by silhouette and palette, never by a different rendering style.

### 2 · Ref-first protocol (hard rule — no ref, no generation)

1. **Always attach OUR refs.** Every generation attaches the APN identity/style sheet + Host turnaround + any approved same-pack art. A generation issued with zero APN refs is invalid and its output is discarded unreviewed (smoke test 2026-07-16 proved a ref-less prompt returns a clean but off-model generic robot).
2. **NEVER attach third-party pixels as refs.** Feeding an official character image and asking for "our style" produces a derivative work — APN-style Doctor Doom is still Doctor Doom. `01_RIGHTS/forbidden-anchors.txt` (§5) lists the marks/characters that may not appear as refs *or* in prompt text.
3. **Bosses/targets use role/archetype TEXT only.** Describe the fantasy beat and archetype in words ("site-defense warden", "extraction-camper predator") — never the source character's name, likeness, kit, or logo. Real athlete names/likenesses never appear as playable content (right of publicity, no editorial defense).

### 3 · ChatGPT Pro browser playbook (primary; F1″ order = ChatGPT Pro → Higgsfield owner-gated → fal.ai)

ChatGPT image output has no transparent channel, so the loop generates on a solid key color and chroma-keys locally.

```
LOOP (per asset, driven via claude-in-chrome):
  1. Upload refs     → APN style sheet + Host turnaround + approved same-pack art (§2)
  2. Prompt template → archetype text + "solid flat chroma green #00B140 background,
                       full-figure, matte 2D 3-band cel, ink outline, no gloss/no bloom/
                       no gradient/no shadow, single ground contact"
  3. Generate        → wait for render (~90s observed on owner Pro)
  4. Save            → screenshot/download raw to 03_GEN/ (candidates, gitignored)
  5. Chroma-key      → scripts/assets/chroma-key.mjs strips #00B140 → straight-alpha PNG → 04_MASTER/
  6. Downscale check → nearest-neighbor to 72/128/192 for the §4.3 gate
```

**Stop-and-ask triggers (STOP, notify owner, do not grind) — the complete list:**

| Trigger | Why it's a stop |
|---|---|
| Bot check / CAPTCHA / "verify you're human" | Agent must not solve; grinding risks the Pro account |
| Rate cap / usage-limit / "try again later" banner | Backing off blindly wastes the session |
| Download or save friction (image won't save, UI moved) | Blind retries produce garbage masters |
| **2× rejection** of the same asset on the same prompt family | Tighten prompt *with owner*, don't infinite-regen (the `7feb2c7→adaa817` failure mode) |
| Re-login / 2FA / session-expired prompt | Never re-authenticate an owner account autonomously |
| Need to switch to Higgsfield fallback | Owner-gated by directive T — ask first |

fal.ai tertiary (~$25 top-up, FLUX Kontext for consistency) is used only after owner approves the switch. All §4 gates are generator-agnostic and unchanged regardless of source.

### 4 · Executable gates (run in this order; first failure stops the asset)

Every gate is a machine check except 4.8. `qa/check-assets.mjs` is rewritten in PR-8a to run 4.2–4.6 from **real alpha-derived pixels** — the current metrics are theater (`scripts/assets/export-mascot.mjs:62` hardcodes `footY:184` on a legless model; `check-assets.mjs:121` asserts those constants stable against themselves). PR-8a is the prerequisite for trusting any pixel.

| # | Gate | Runs | Pass condition (machine) | On fail |
|---|------|------|--------------------------|---------|
| 4.1 | **Rights / forbidden-anchor prompt lint** | `qa/check-rights.mjs` on the prompt + `rights.json` + `forbidden-anchors.txt` | No denylisted mark/name/character in prompt or refs; `mode` valid; title-vs-mode passes marks denylist | Reject generation; fix prompt |
| 4.2 | **Alpha halo check** | alpha edge scan of chroma-keyed master | No residual green: mean edge-pixel `G−max(R,B) ≤ 8`; ≤0.5% semi-alpha fringe pixels at hard edges | Re-key / re-gen (route sprite finals off #00B140 if fringe persists) |
| 4.3 | **Silhouette occupancy + readability** | fill silhouette black, downsample to **72 / 128 / 192** | Opaque occupancy 35–70% of trim box at 72px; distinct connected-component count matches archetype; no orphan islands | Redesign silhouette (not interior) |
| 4.4 | **Actual-size readability** | render at 72/128/192 into a neutral tile | No sub-2px critical feature; contrast against neutral ≥ 3:1 on the ink outline | Simplify shape / thicken outline |
| 4.5 | **OCR text-bleed scan** | tesseract over the master + 72px downscale | Zero recognized glyph runs ≥3 chars (no leaked logos/captions/watermarks) | Reject; regen with "no text" reinforced |
| 4.6 | **Pivot / foot-row metrics (real, alpha-derived)** | `qa/check-assets.mjs` computes footX/footY/headBodyRatio/occupancy from actual alpha | Foot row = lowest opaque row; `pivot={0.5,1.0}` within ±1px; Host cross-pose foot drift ≤1px & head/body ratio ≤3% — all measured, none stamped | Reject; fix trim/pivot |
| 4.7 | **Real-UI composite @ 428×926** | `qa/browser/chrome-*-smoke.mjs` loads the asset in the actual game canvas | Renders in-engine over the pack background, single ground contact, console clean, no overflow at 428×926 (+375×812) | Reject; not a mock-HUD pass |
| 4.8 | **Owner approve/reject** | human gate — one real-UI composite per Host sheet + per launch pack | Owner: approve | **Reject = exactly ONE retry with a tightened prompt, then STOP and ask** (no infinite regen) |

Env note: the engine draws a **single** background layer (`js/render.js:273-274`) — packets ship one `background.webp`, not 3-layer parallax, until engine work is explicitly scheduled.

### 5 · Per-pack packet layout (`01_RIGHTS`…`05_RUNTIME`, trimmed to what the engine consumes today)

Everything in `03_GEN` is a candidate and gitignored — provider dumps never enter git. Only `05_RUNTIME` is loaded by the game; it maps 1:1 onto today's `pack.json` `assets{}` block.

```
assets/game-packs/<id>/
  01_RIGHTS/
    rights.json            # mode + editorialReference + reviewedBy (canonical: rights.schema.json)
    forbidden-anchors.txt  # marks/characters/athletes banned as ref OR prompt text (gate 4.1)
  02_REFS/
    (APN identity + style sheet + approved same-pack art attached to every gen; NO third-party pixels)
  03_GEN/                  # green-screen raw + prompt log — GITIGNORED, never committed
  04_MASTER/
    *.png                  # chroma-keyed straight-alpha masters + alpha-derived metrics report
  05_RUNTIME/              # the ONLY engine-loaded set — matches pack.json assets{}
    background.webp        # single layer (render.js draws one)
    targets.webp + targets.json   # 7 frames: common-a, common-b, common-c, elite, event, boss, boss-break
    props.webp
    corruption-mask.webp   # 2 corruption states the engine composites
    easter-eggs.json       # per easter-eggs.schema.json
```

Not in the packet (engine does not consume them today): parallax sub-layers, per-frame normal maps, 11-clip/72-frame Host animation sheets, licensed-art staging. Adding any of these requires an explicit engine PR first — the standard tracks what ships, not what a generator can emit.

---

## Ops notes

### GitHub Support scrub request (owner sends once)
Via https://support.github.com/contact — subject "Remove cached unreachable blobs after history rewrite (copyright)":
> Repository: YubenTT/apn-idle-game (public). On 2026-07-16 we rewrote history with git-filter-repo to remove copyrighted third-party images at `assets/game-packs/marvel-rivals/master/source-1..6.png` and `targets-approved.png`, then force-pushed all branches. Please garbage-collect the unreachable objects and any cached views (including old commit SHAs like 2005c4c and refs/pull/* references) so the removed files are no longer served.

### Higgsfield MCP warm-up (owner, non-blocking)
One-time OAuth in an interactive session (claude.ai connector settings or `/mcp`) so the F1″ fallback is ready before S7/S8.

### Sample evidence (2026-07-16 session)
- Host identity sample (ref-driven, ChatGPT Pro): on-model; note for atlas pass — visor lower edge picked up a mouth-like notch; the canonical visor is a clean band. Fix in prompt template ("visor is one continuous band, no mouth").
- Site Warden (Spike Protocol boss): approved direction — visor-slit language echoes Host, fully original.
- Golden Boot Captain: approved + owner directive — push toward retro shonen soccer-manga (Tsubasa-era) STYLE energy: dynamic pose, speed-line drama, wind-swept hair. Style only; no Captain Tsubasa character likeness (added to forbidden anchors).
- The Dreamwright: approved — crescent-visor + cloud mallet + floating island locked as Dreamline identity.
- OWNER AUTHORIZATION 2026-07-16: generated assets may be DOWNLOADED directly during art sessions (no screenshot workaround needed) — owner's explicit standing instruction.
- All four samples live in owner's ChatGPT chat "Sprite Creation Request" (full resolution downloadable).
