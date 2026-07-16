# Infinite Patchline Go Live — Adversarial Audit (v1 plan roast)

> **Audited:** 2026-07-16, against main `efc5f22` + V3 package + live UI + July-2026 tooling landscape
> **Method:** 7-dimension multi-agent audit (domain/economy, idle design, rights, art pipeline, V3 consistency, delivery/QA, asset tooling), every blocker/major finding adversarially verified against the actual files. 40/40 serious findings survived verification.
> **Verdict:** The plan's instincts are right (domain-first, gates, single prestige), but **4 of the 7 locked decisions (A1, D2, F1, G1) are broken as written**, one pre-existing rights violation must be fixed before anything else, and the "exit-ready infinite" claim is false without one meta-depth addition. Baseline `node qa/run-tests.mjs` re-verified ALL PASS.

---

## 1. What survives untouched (genuinely correct)

- **B1 (Go Live only)** — correct. End Season currently *burns unshipped Notes* (`js/game.js:1062`); the atomic merge removes a real foot-gun. Zone-20 "End-Season bonus" row maps 1:1 onto the Go Live sheet. Needs the mitigations in §4 (first-cycle length, hub retarget), not reversal.
- **E1 (deterministic SP refund)** — fully feasible: every input is persisted with fixed reconstructible costs (attrs 1 SP each, `skillSpCost(lv)=1+floor(lv/5)`). One doc note: legacy mask skills were already deleted without refund on load (`js/save.js:89-95`) — accepted historical loss, not a bug.
- **PR-1-first sequencing** — right call; `qa/run-tests.mjs` is a real executable contract.
- **Build V2 triad** — Scan (cycle-speed) / Verify (cycle-value) / Relay (offline-continuity) are the three orthogonal axes an idle actually has. Genuinely distinct, not renaming.
- **Go Live atomic-transaction spec** — top-decile prestige engineering for the genre.
- **Deterministic asset toolchain** (pack-atlas, convert-webp, verify-sizes, validate-manifests) — production-grade, do not rebuild.
- **V3 repo grounding** — REPO-MAIN-AUDIT and GO-LIVE-SPEC field names match actual code field-for-field.
- **Art gates concept** (rights-first → readability → composite) — generator-agnostic, survives the F1 tool swap unchanged.

---

## 2. BLOCKERS (verified, must fix before/at the stated point)

### B-0 · PUBLIC repo redistributes official Marvel/NetEase character art — fix BEFORE PR-0
`assets/game-packs/marvel-rivals/master/source-1..6.png` are official hero renders (Spider-Man, Iron Man, Doctor Doom visually confirmed), git-tracked in commit `2005c4c` on origin/main of a **public** repo. Worse: `compose-target-atlas.py` only crops/outlines those pixels, so the **runtime `targets.webp` also ships official pixels**. The bible admits it ("recorded official transparent hero sources"). PR-7's "research-only annotation" never touches these binaries.
**Fix (pre-PR-0 hotfix):** delete `master/source-*.png`, regenerate marvel-rivals `targets.webp` from original art (procedural SVG path already exists), `git filter-repo` the paths, force-push, delete/scrub stale feature branches carrying the blobs, file GitHub Support scrub request (GitHub retains unreachable blobs), add CI gate: no non-generated PNGs under `master/`, replace `check-assets.mjs:80` string-match with a provenance check.

### B-1 · goLive boundary semantics vs. real saves (PR-1)
`isGoLiveBoundary` requires `zone % 20 === 0`, but the live game never stops at the boundary — it toasts and keeps advancing, persisting `ui.seasonDone=true` at arbitrary zones (`js/game.js:618-624`, `1047-1052`). The most common non-trivial migration case (save at zone 27, seasonDone=true) **cannot Go Live until zone 40**, and PR-1's gate list never tests it.
**Fix:** decide boundary semantics (hard pause vs. overshoot-with-pending-checkpoint), add persisted `meta.pendingGoLiveZone`, mint checkpoint id from the boundary zone, migrate `ui.seasonDone` into it, add the mid-cycle-overshoot save to acceptance gates.

### B-2 · Progression flatlines ~Go Live #6 — "exit-ready infinite" is currently false
`maturityHits` caps at zone 120 (`formulas.js:114`); `permanentBudget = min(14, M^0.9)` cancels ~all permanent-power clear-speed gain (net ~1.5–3%/cycle incl. income channel — genre standard is +10–20% settling from 2–5× early); `liveGain = 0.05*log2(1+notes/60)` yields +0.04–0.08/Go Live. BALANCE.md documents the cancellation as intentional anti-trivialization — the plan claims 9/10 infinite without ever revisiting that decision. No PR touches the meta economy.
**Fix (owner gate M):** one meta-depth addition (recommended: per-pack **Coverage Mastery** Rep sink multiplying that pack's yield on revisit — gives the 17 wave packs a mechanical reason to exist) + soften HP budget exponent (0.9 → ~0.4–0.5, or exempt Live Mult) + PR-9 target "cycle N+1 first-Gate ≥X% faster than cycle N".

### B-3 · A1 is internally contradictory (rights)
A1 locks `rights.mode=homage-only` whose own V3 definition says **"Exact game title: no"** — while all 20 player-facing `title` fields are literal trademarks ("Valorant", "EA Sports FC 26", "NBA 2K26"...) rendered in the live UI (`js/generated/game-packs.js:14`, `ui.js:914`, `index.html:31`). Ship it and the rights system is a documented lie on day one. Also: PR-7's validator as spec'd never reads `pack.title` — a pack titled "Valorant" tagged homage-only **passes** the gate. Jack Daniel's v. VIP (2023): a playable world *named* "Valorant" is source-identifying use and loses the Rogers/editorial shield; the feed-ticker editorial framing is APN's strong ground.
**Fix (owner gate A′):** split ID from display — IDs stay (`valorant` etc., internal, near-zero exposure; V3 §7 designed for exactly this); display titles become APN-original (`Tactical Signal`), real title appears **only** in the feed ticker as `editorialReference` + one non-affiliation footer line; validator checks title-vs-mode against a marks denylist; block `fan-policy-noncommercial` repo-wide (brand-marketing game is never noncommercial). Sports bible rows naming real athletes (Bellingham, SGA, Barkley — right-of-publicity, no editorial defense for playable depictions) and named characters (Doctor Doom, Godrick, Lich King...) are **rewritten to archetypes** in PR-7, not annotated.

### B-4 · D2 is a three-way self-contradiction (Host art)
D2 ("new matte atlas generated from turnaround refs via ChatGPT") contradicts (a) accepted ADR-0003/0005 (GLB canonical; AI output never canonical geometry), (b) the executable gate `qa/check-assets.mjs:115-118` (10 named poses + `meta.source === GLB` + camera lock), and (c) **the V3 standard the plan itself imports** ("GLB remains the editable geometry source… runtime art is a deterministic 2D derivative"). The plan simultaneously lists ADR-0003 as a non-regression. And the kicker: **the canonical GLB has no legs** (7 meshes, zero leg/foot nodes, zero animations) while V3's brand hero is full-body — the required geometry doesn't exist and no PR creates it. The V3 turnaround refs are also weak as gen sources (front vs ¾ are near-duplicates with ~0° usable rotation, fused side view, toy-gloss speculars, white-matte halos, all static A-pose).
**Fix (D2′):** V3 refs = proportion/identity approval only. Produce an **extended full-body canonical GLB** (same character + legs per V3 identity), blessed by ADR-0010 superseding 0003/0005's scope, then derive all poses **deterministically** through the existing `tools/mascot-render` 3-band matte toon shader (it already emits exactly the "matte 2D" target). Image-gen is style/identity reference, not the atlas source. Define the single pose/clip contract code-side first (currently 4 conflicting contracts: plan's 6 keys, runtime's de-facto 6 different keys — `pickup`/`go_live` are read by no code while `damage`/`sprint` are — check-assets' 10, V3 §5's 11 clips/72 frames with no playback engine), and rewrite `check-assets.mjs` accordingly in the same PR.

### B-5 · A1+PR-7 hard gate bricks the launch catalog (V3 consistency)
PR-7 "catalog build fails if rights missing/blocked" + homage-only's no-title rule + 20 packs with trademark titles + zero packs having echo data = the validator either blocks the entire launch catalog or ships marks. Also the arithmetic is wrong: Dreamline Detour is a **new 21st pack** (`pack.example.json: order: 21`), so waves = 18, not 17. And the plan's PR-8 labels Tactical Signal `homage-only` while V3's own example sets it `editorial-text-original-art`.
**Fix:** PR-0 transitional-rights ADR: `pending-review` status the validator *warns* on for wave packs, retitle map per B-3, corrected pack arithmetic (3 slices = 2 retitled existing + 1 new; 18 in waves), explicit decision that INFINITE-PACK §9 gates apply to new packs + re-arted packs only until waves land.

### B-6 · G1 stacked PRs run ZERO CI (delivery)
`ci.yml` triggers only on PRs based on `main`/`release/**` — a PR-2 stacked on PR-1's branch merges with no automated verification, and base-retarget after parent merge doesn't re-trigger. Solo owner + sequential sessions = stacking has no payoff anyway. The repo already proved the fix: redesign-v1 used a `release/**` integration branch (child PRs #9/#14; CI patched via `a05315f` for exactly this).
**Fix (G1′):** integration branch `release/go-live-v3`; child PRs target it sequentially with merge commits (never squash mid-stack); single final merge to main at PR-10. Kills every "broken intermediate state on main" concern simultaneously.

### B-7 · F1 (browser-automating chatgpt.com) is the weakest locked decision — stale as of July 2026
**gpt-image-2 has been GA in the OpenAI API since 2026-04-21** at ~$0.006/$0.053/$0.211 per image (low/med/high). The whole launch art volume (~200 images incl. retries) is **$11–42 via API** vs. a ToS-violating (OpenAI ToS forbids automated extraction outside the API), rate-capped, bot-check-fragile, babysat browser session that contradicts the plan's own "autonomous chain" premise. Session smoke test confirmed the browser path *works mechanically* (~90 s/image on the owner's ChatGPT Pro), but it puts the owner's Pro account at ToS risk and hard-stalls on bot challenges an agent may not bypass. Higgsfield: MCP unauthenticated in agent sessions + billing broken + same OpenAI model behind an extra intermediary + credit expiry — dead weight as a fallback. fal.ai (owner has an account): hosts gpt-image-2 pay-per-image, FLUX.1 Kontext [pro] $0.04/img (strongest API-automatable character-consistency option), Ideogram V3 Character, and $2–6 character-LoRA training — completely absent from the plan.
Model-routing fact the plan misses: **gpt-image-2 rejects `background:'transparent'`; gpt-image-1.5 supports it** — routing sprite finals to 1.5 eliminates the segmentation/halo retry loop (`fallback-segment.py` / `segment-foreground.swift`) entirely.
**Fix (F1′, owner gate T):** PRIMARY = OpenAI Images API (one-time Persona org verification, project key; gpt-image-2 edits endpoint for identity/contact sheets, gpt-image-1.5 `background:transparent` for pose/sprite finals). FALLBACK = fal.ai (gpt-image-2 + FLUX Kontext; ~$25 top-up; optional $2–6 Host LoRA as consistency insurance — note: 4-view turnaround is thin training data, augment first). chatgpt.com = owner-manual exploration only. Higgsfield = dropped (revival needs billing fixed AND an authenticated access path). Total launch art budget: **$25–60**.

---

## 3. MAJORS (verified; fold into the named PRs)

**Domain/economy (PR-1):**
- Receipt schema rejects the reference implementation's own default output (`nextPackIds`/`completedPackIds` `minItems:1` vs `[]`; `additionalProperties:false` leaves the §7.6 migration marker homeless). Fix schema + make `qa/check-go-live.mjs` schema-validate every emitted receipt.
- `shippedThisSeason → cycle contribution` has no input slot in `calculateGoLive` and a Rep-vs-Notes denomination mismatch (old formula was Rep-denominated with same constants → three defensible mappings exist). Pick one explicitly (`legacyContribution` input), encode expected value in the migration test. Delete `meta.season` and `authority.shippedThisSeason` after migration or `Object.assign` resurrects them forever (`save.js:65`).
- "Offline stops at boundary" already true for zones but **false for currency**: `game.js:1206-1215` extrapolates up to 8h of Signal+Notes past the boundary → AFK prestige-fuel farm under V3. Decide: preserve conversion (recommended, matches current sane behavior) with explicit test "8h offline crossing boundary at minute 30 must not bank 7.5h of Notes", and rewrite `qa/long-run.mjs:40` which asserts the current overflow.
- Two save-shape migrations (PR-1, PR-4) with **no version-bump strategy** against `save.js` hardcoded `v:2`, 6-second autosave, and CDN-cached stale clients: stale client loads null → **overwrites v3 save within seconds**. Fix in PR-1: bump to v3, add write-guard (refuse to overwrite higher-version save), migration-matrix test (v1→post-PR-4; v2→PR-1→PR-4; post-PR-4 loaded by PR-1-era code).
- rep ∝ live² (Notes carry eco at drop AND are multiplied by live at conversion) — document as intended or divide one factor out **before** PR-9 sets targets; spec's own copy example (124 Notes → +150 Rep at ×1.00) contradicts its formula.

**Idle design (PR-1/-3/-6/-9):**
- Hub dailies/weeklies orphaned: `d_ship`/`w_notes` are fed **only** by `hubOnShip` inside `shipPatches` — under B1 they render permanently 0/1, 0/40 (dead UI, unclaimable rewards), and `hub.js` isn't even in the copy-scan list. Retarget (`d_ship`→"Go Live once" — fine at 65–94 min mature cycles; `w_notes`→notes earned), rename the 99-level "Season track" (keep the XP/reward drip), add `meta.hub` to the GO-LIVE-SPEC persist manifest + PR-1 tests, add hub.js to copy scan.
- B1 delays first Rep/Boost touch to ~30 min active / ~55 min idle (today: minutes). Mitigate: **first Go Live checkpoint at zone 10** (genre-standard tutorial prestige), or scripted first-Rep taste; make time-to-first-Go-Live ≤15 min an explicit PR-9 target.
- "Verify catches up through reward quality" is unattainable under default tuning (log2 compression + HP-budget tax); PR-4/9 must set numeric divergence targets (e.g. Verify ≥+40% Rep/cycle vs Scan; Scan ≥+20% zones/hr; Relay ≥+30% offline yield) — `earnedQualityModifier` is the intended lever, currently undefined.
- **Live editorial events** — the Playbook's own defensibility row ("APN's real coverage can seed pack arrivals") has zero implementing PR, not even schema fields. Reserve in PR-6/PR-7: scheduler event-override hook + Route chip + `Patch Drop` overlay schema (packId, window, yieldModifier, bonusEchoIds, editorialUrl). This is the one retention lever competitors cannot copy.
- Offline post-boundary conversion + optional Relay-capstone auto-Go-Live (NGU/LBR precedent) — needs owner sign-off vs B1's one-action promise; note ABILITIES-BUILD's "Background Sync" capstone currently has a different effect.

**V3 package (PR-0 reconciliation pass — do NOT import as-is):**
- Rights-mode enums drift across five sources (6/6/3/3/5 modes); GATE §2's own example fails its own schema (`status: blocked-until-review` not in enum); `reviewer` vs `reviewedBy`; declare `rights.schema.json` canonical and fix examples at import.
- `pack.schema.json` **does not exist** (dangling `$schema` ref) and the manifest contract exists in two incompatible shapes (inline vs pointer). Author it in PR-7 (pointer-file shape), adapt `examples/validate-pack.mjs` instead of rewriting blind.
- Analytics fiction: zero telemetry exists in the repo; PR-3's "Analytics ID map without history loss" is a phantom — rescope to a dormant event-name contract (IDLE-DESIGN-CONTEXT already prescribes exactly this); strike "Satisfied Return Rate" as a gate; record plan-PR-10's softened rollout as superseding V3 P10.
- CODEX-IMPLEMENTATION-PROMPT + IMPLEMENTATION-ROADMAP + 00_START_HERE + REPO-MAIN-AUDIT are silently omitted from intake — mark them **superseded-by-this-plan** in PR-0 so no later session follows the competing prompt. Move Area→Priority Tag rename out of PR-3 into PR-4 (no renamed-but-unimplemented button).

**Delivery/QA:**
- The repo already has a scripted CDP browser harness (`qa/browser/chrome-route-smoke.mjs` — 428×926, console-clean, screenshots) that the plan ignores in favor of manual Browser MCP; it's macOS-hardcoded, needs a serve step, and runs in no CI. Parameterize (viewports incl. 375×812 + landscape, Linux Chrome path), add `chrome-go-live-smoke.mjs`, run in CI on ubuntu. Browser MCP stays for human-shaped visual approvals only.
- PR-0's banned-copy expansion turns run-tests red (check-copy scans code that legitimately ships "Ship"/"Weapon" until PR-2/3; run-tests positively asserts the old nav labels and contract strings). Move bans to the PR that removes the last occurrence (End Season→PR-2, Weapon/Ship→PR-3); PR-0 gate: "run-tests still ALL PASS on the docs-only diff"; scope the forced `check-doc-contracts.mjs` updates into PR-0.
- Split oversized PRs: PR-4 → 4a (domain+migration+profiles) / 4b (Build UI+Priority Tag); PR-8 → 8a (pipeline+gates+validator, mergeable with zero art) / 8b/c/d (one pack each, independently owner-approvable). Defines what happens after the one permitted retry, too.
- PR-1 must be strictly **additive** (goLive lands beside a fully working ship/leave; removal happens in PR-2) — otherwise main has no working prestige surface for a whole session. Echo domain model moves to PR-5 or the chip to PR-6.
- Hardcoded QA gates brick the "infinite" promise: `check-assets.mjs:62` asserts exactly 20 packs; pack #21 fails CI. Generalize in PR-7 (count from catalog.json, per-pack production-set check).
- The 72/128/192 gate is prose; current Host "metrics" are hardcoded constants verified against themselves (`export-mascot.mjs:62` stamps `footY:184` on a model with no feet). PR-8a must build the real measurement suite (alpha-derived foot row, mass ratio, visor coverage, halo fringe, occupancy at downsamples, OCR text scan) — it is the prerequisite for trusting any generated pixel.
- Deploy truth: main is NOT auto-deployed (manual copy into apn-web per EMBED.md, which still documents the stale `apn_idle_save_v1` key — fix). PR-10 needs an actual deploy step definition.
- Env art: engine draws ONE background layer (`render.js:273-274`); V3 packet wants 3-layer parallax — decide single-layer launch (recommended) or schedule engine work explicitly. Previous gen-extract production round (hand-tuned crops + Swift segmenter) was replaced by procedural SVG within hours (`7feb2c7`→`adaa817`) — the exact failure mode PR-8 must not re-run; calibrate with ONE pack end-to-end before the other two.

---

## 4. Owner gates opened by this audit

| Gate | Question | Recommended |
|------|----------|-------------|
| **H** (hotfix) | Purge Marvel official art + history rewrite + force-push + GitHub scrub? | Yes, pre-PR-0 |
| **A′** | Display-title split (APN titles + ticker editorialReference + non-affiliation line)? | Yes — smallest de-risk, ~2 days inside PR-3/PR-7 |
| **M** | Meta-depth addition (Coverage Mastery + budget-exponent soften) vs ship-flatline? | Add it — "infinite" is false without it |
| **T** | F1′ generator: OpenAI API primary / fal primary / ChatGPT-Pro browser | OpenAI API primary, fal fallback |
| D2′ | Extended full-body GLB + ADR-0010 + deterministic render | (technical, folded into PR-5/8a; identity sheet approval stays an owner gate) |

## 5. Revised sequence (delta view)

```
HOTFIX  Marvel purge + history rewrite + provenance CI gate      ← before anything public
PR-0    V3 import WITH reconciliation (canonical schema, fixed examples,
        superseded markers, ADR-0008/0009/0010, transitional-rights ADR,
        deploy-truth §, copy-bans deferred) · epic on GitHub
BRANCH  release/go-live-v3 integration branch (merge commits, CI covers release/**)
PR-1    goLive additive + pendingGoLiveZone + save v3 + write-guard +
        migration matrix + receipt-schema fixes + legacyContribution +
        offline conversion test + hub persist + chrome-go-live-smoke in CI
PR-2    Go Live UI + remove old paths + End-Season copy ban
PR-3    Naming/nav (Weapon/Ship bans land here) + dormant analytics contract
PR-4a/b Build V2 domain / UI + Priority Tag (rename lives here, not PR-3)
PR-5    Run hierarchy + Host scale (placeholder atlas) + pose/clip contract
        + check-assets rewrite + new full-body GLB gate (ADR-0010)
PR-6    Route surface + Echo archive + hub retarget + season-track rename
        + Patch Drop event schema/hook reservation
PR-6.5  (Gate M) Coverage Mastery + budget-exponent soften
PR-7    rights.json + pack.schema.json + title/mode validator + denylist +
        gate generalization (pack #21) + bible archetype rewrite
PR-8a   Art pipeline + real measurement suite + model routing (F1′)
PR-8b/c/d  One pack each: Tactical Signal · Ultimate Touchline · Dreamline Detour (21st pack)
PR-9    Balance vs explicit targets (≤15min first Go Live · cycle-accel ≥X% ·
        build divergence thresholds · rep∝live² documented)
PR-10   Launch: real deploy step (EMBED.md fixed) + rollback semantics
```

Score honesty: plan v1 would have landed ~7/10 with three silent failures (CI-less stack, bricked catalog gate, dead dailies). With this delta: 9/10 launch is a defensible claim — **if** Gate M is taken; without it, cap the claim at "polished finite idle with content waves".

---

## 6. Owner gate answers (2026-07-16, same session)

| Gate | Answer | Consequence |
|------|--------|-------------|
| **H** (Marvel purge) | Owner asked for evidence + explanation first; files shown (source-1=Spider-Man official render, public repo, commit `2005c4c`; runtime targets.webp confirmed clean stick-figures). **Purge approval still pending.** | Hotfix stays gated; nothing else public (epic) until resolved. |
| **A′** (titles) | Owner direction: **playful evocative names** (NSS2-style parody), not exact marks — plus real title stays in feed ticker as editorial reference. Bosses/creatures: archetype-inspired originals in APN style. | See §7 naming rules + §8 ladder. Supersedes both raw A1 and the "Tactical Signal"-style neutral names where a witty name is better. |
| **M** (meta depth) | **Accepted** — Coverage Mastery + curve softening, "yap ama çok temiz" (execution quality bar). Plus new directive: every 10-zone block = one game with its boss finale, ladder designed deliberately. | PR-6.5 confirmed in sequence; §8 ladder is the content spine. |
| **T** (generator) | **Owner order: 1) ChatGPT Pro via Chrome (browser automation), 2) Higgsfield MCP (ask owner before switching), 3) fal.ai.** ToS risk acknowledged by owner. | F1″ below replaces F1′'s API-primary recommendation. |

### F1″ — generation pipeline as locked by owner

1. **ChatGPT Pro via claude-in-chrome (primary).** Mandatory **REF-FIRST playbook** (see §7): never generate without attaching APN identity/style refs. Prompt for **solid green background** → local chroma-key to alpha (smoke-tested; sidesteps ChatGPT's lack of transparent output). Bot-check / rate-cap / download friction → STOP and ask owner, don't grind.
2. **Higgsfield MCP (fallback, owner-gated).** Requires one-time OAuth in an interactive session (claude.ai connector settings or `/mcp`) — do this proactively so the fallback is warm.
3. **fal.ai (tertiary).** ~$25 top-up; FLUX Kontext for character consistency; optional $2–6 Host LoRA.
All quality gates (rights → actual-size 72/128/192 → halo/text scan → real-UI composite) are generator-agnostic and unchanged.

## 7. Ref discipline (lesson locked 2026-07-16 — both directions)

The session smoke test proved it live: a prompt **without** identity refs produced a clean but **off-model** generic robot — not the APN Host. And the inverse rule is the rights gate:

1. **Always attach OUR refs.** Host turnaround / approved pack art / style sheet goes into every generation. No ref, no generation — hard rule in the PR-8a playbook.
2. **Never attach THEIR IP as refs.** Feeding an official character image and asking for "our style" produces a derivative work — APN-style Doctor Doom is still Doctor Doom. RIGHTS-REFERENCE-GATE §5 red-flags exactly this. Bosses/creatures take the **role/archetype** (text), never the pixels.
3. Naming rules for the parody direction: (a) no one-letter-off soundalikes ("Valorint" ❌ — confusion risk); community-slang/joke names ✅ ("Gear Fear", "Git Gud Kingdom", "Punch-a-Tree"); (b) real title appears only in the feed ticker as editorial reference + one non-affiliation footer line; (c) real athlete names/likenesses never appear as playable content (right of publicity — no editorial defense).

## 8. Zone→Pack ladder (owner directive: each 10-zone block = one game, boss at every 10th zone)

Design logic: instant-recognition + simple silhouettes first · genre alternation (no publisher/genre clusters) · 3 production-art packs inside the first 60 zones where every player sees them · difficulty ceiling (zone 120, `maturityHits` cap) lands on the raid fantasy · breather after the ceiling · anxiety-heavy fantasies late · souls capstone. Reorder ships with PR-6's pack-install machinery and applies **at next cycle rollover** (stable IDs untouched; mid-block swaps forbidden).

| Block | Zones | ID (stable) | Display name (parody, draft) | Fantasy beat | Zone-boss archetype (original design) |
|------:|-------|-------------|------------------------------|--------------|----------------------------------------|
| 1 | 1–10 | `valorant` | **Spike Protocol** ★prod | tactical shooter onboarding; first Go Live @z10 | Site Warden |
| 2 | 11–20 | `minecraft` | **Punch-a-Tree** | max-contrast sandbox, all-ages recognition | Green Fuse Golem |
| 3 | 21–30 | `fc-26` | **Ultimate Touchline** ★prod | sports broadcast energy | Golden Boot Captain |
| 4 | 31–40 | `fortnite` | **Storm Builders** | BR chaos, build gimmick | Storm Herald |
| 5 | 41–50 | `counter-strike-2` | **Smoke & Defuse** | tactical returns, grittier | Eco Kingpin |
| 6 | 51–60 | `dreamline-detour` (new #21) | **Dreamline Detour** ★prod | APN-original surreal breather | Sleepwalker Prime |
| 7 | 61–70 | `league` | **Nexus Brawlers** | MOBA depth | Nexus Colossus |
| 8 | 71–80 | `overwatch` | **Payload Heroes** | hero shooter | Payload Prime (the cart fights back) |
| 9 | 81–90 | `nba-2k26` | **Buzzer Beaters** | sports beat | Clutch MVP |
| 10 | 91–100 | `grand-theft-auto-v` | **Five Stars Wanted** | z100 milestone heist finale | Heist Mastermind |
| 11 | 101–110 | `apex-legends` | **Third Party Legends** | BR returns, harder | Ring Closer |
| 12 | 111–120 | `world-of-warcraft` | **Guild & Glory** | raid finale AT the difficulty ceiling | Guild-Breaker Behemoth |
| 13 | 121–130 | `old-school-runescape` | **Click & Chop** | post-ceiling cozy grind (the idle ur-game) | Grind Warden |
| 14 | 131–140 | `rocket-league` | **Boosted Ballers** | vehicular sports, bright | Aerial Ace |
| 15 | 141–150 | `dota-2` | **Creep Score** | dark MOBA mastery | High Ground Warlord |
| 16 | 151–160 | `madden-nfl-26` | **4th & Goal** | sports beat | Blitz Wall |
| 17 | 161–170 | `dead-by-daylight` | **Hooked & Hunted** | horror shift | Generator Stalker |
| 18 | 171–180 | `marvel-rivals` | **Cape Clash** | hero team-up spectacle | Team-Up Titan |
| 19 | 181–190 | `escape-from-tarkov` | **Gear Fear** | extraction anxiety peak | Extract Camper |
| 20 | 191–200 | `path-of-exile-2` | **Loot Filter Purgatory** | ARPG depth for veterans | Six-Link Horror |
| 21 | 201–210 | `elden-ring` | **Git Gud Kingdom** | souls capstone | Nerf Knight, the Patchbearer |

Display names are **drafts for the owner's naming pass** (gate stays with owner per pack at its art PR); ticker keeps the real title editorially ("Covering: Valorant · Patch live").

*Audit: Claude (Fable 5) session 2026-07-16 · multi-agent adversarial verification · smoke-tested browser image-gen + baseline QA re-run. Gate answers + ladder appended same session.*
