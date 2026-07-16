# Infinite Patchline · Go Live — Master Execution Plan

> **Status:** OWNER LOCKED 2026-07-16 — ready for PR-0 on explicit start  
> **Baseline main:** `efc5f22` (2026-07-16, redesign I-000→R-006 shipped, tests ALL PASS)  
> **Research inputs:**  
> - `~/Downloads/APN-IDLE-INFINITE-PLAYBOOK.html`  
> - `~/Downloads/apn-idle-unified-v3.zip` (specs, schemas, host turnaround, target mocks)  
> **Authority stack (when conflict):** Owner decision in this plan → new ADRs → VISION pillars → this plan’s PR sequence → code  
>
> ### Locked owner decisions
>
> | Gate | Choice |
> |------|--------|
> | Prestige | **B1** — Go Live only (no mid-cycle Ship) |
> | Catalog IDs | **A1** — keep real-game pack IDs + homage-only original art + `rights.json` |
> | Launch art | **C1** — 3 production packs + scale system; rest upgrade in waves |
> | Host | **D2** — matte 2D atlas from V3 turnaround refs (ChatGPT + Browser MCP) |
> | Tracking | **G1** — GitHub Epic + Issues + stacked PRs |
> | Build migrate | **E1** (default) — deterministic SP refund from legacy attrs |
> | Art tool | **F1** (default) — ChatGPT Create Image primary; Higgsfield only if billing fixed |
> | Counsel | Internal rights review for homage; no licensed marks without written license |

---

## 0. What “top tier / ship-ready” means here

Not “more features.” A satisfied return loop that feels like APN:

| Promise | Player feels | Evidence we will gate on |
|---------|--------------|--------------------------|
| Immediate impact | Scanner upgrade changes next clear | Delta UI + timing estimate tests |
| One clear prestige | Go Live = bank + grow + refresh + next | Atomic transaction + UI states |
| Meaningful builds | Scan / Verify / Relay play differently | 3 seeded profiles to Zone 200 |
| Discovery | Patch Echoes per Pack, archive | Echo progress + archive screen |
| Brand hero Host | Canonical silhouette, readable size | 118–142 px Host proof at 428×926 |
| Infinite, controlled | New Pack = data + rights + assets + QA | Catalog validator blocks bad packs |
| Zero AI-slop ship | No text/logo bleed, matte 2D grammar | Asset gates + real-UI composite |
| Never softlock / save-safe | Idempotent Go Live, migrations | Headless + Chrome QA |

**Launch definition (recommended):** free MVP runtime with Go Live + Scanner naming + Build V2 + Run hierarchy + Route surface + rights-gated catalog + **3 vertical-slice Packs at production art quality** + balance pass + full QA matrix. Remaining 17 packs upgraded in content waves after launch, same pipeline.

---

## 1. Repo truth (today)

### Already strong (do not rewrite)

- Vanilla ES + Canvas 2D, zero-npm play (`ADR-0001`)
- Route state + save v2 + 20-pack catalog + current/next decode
- Free MVP economy firewall (R-005)
- Device matrix, token system, copy bans, long-press, mute QA
- Asset pipeline scripts + fail-fast mascot gates
- Headless `node qa/run-tests.mjs` green

### Product gaps vs V3 playbook (why it is not “exit-ready infinite”)

| Gap | Current main | Target (V3) |
|-----|--------------|-------------|
| Prestige model | Split **Ship Notes** + **End Season** | Single atomic **Go Live** |
| Naming | Weapon / Ship / Hub / Zone mixed | Scanner / Go Live / Route / Pack |
| Build | Damage·Crit·Utility tax + skills | Named abilities Scan / Verify / Relay; Mastery derived |
| Combat choice | Area skill weak on 1-target | **Priority Tag** reward decision |
| Run hierarchy | SP duplicated; Host small; Focus early | Signal+Notes strip; SP in Build; Host 118–142 px |
| Top nav promise | Hub live-ops list | **Route** = journey + Echo archive + next packs |
| Rights | Pack IDs are real game titles; bible has exact-character research | `rights.json` modes; homage-only default |
| Art quality | Production packs exist but read generic / under-resolved; Host stage small | Contact-sheet → actual-size → real UI proof → atlas |
| Scale system | Produce packs scripts, weak rights/echo schema | Full packet: rights → concept → gen → approval → runtime |
| Checkpoint UX | Two mental models, anxiety | One receipt, one CTA |

### Explicit non-regressions

Edge-to-edge Run, tokens, free-MVP no paid power, stable Route IDs, deterministic scheduler, save compatibility, 5-nav max (`ADR-0007`), Host single-source (`ADR-0003`), no React/Pixi, no provider candidate dumps in repo.

---

## 2. Artifact intake (V3 package → repo)

After approval, **import as design authority (not runtime art yet)**:

```
docs/product/
  PRODUCT-PLAYBOOK.md
  GO-LIVE-SPEC.md
  INFINITE-PACK-SYSTEM.md
  ASSET-PRODUCTION-STANDARD.md
  RIGHTS-REFERENCE-GATE.md
  UX-UI-TARGET.md
  ABILITIES-BUILD.md
  NAMING-SYSTEMS.md
  RESEARCH-SOURCES.md
docs/product/schemas/
  go-live-receipt.schema.json
  rights.schema.json
  easter-eggs.schema.json
  pack.example.json
docs/art/refs/host-v3-turnaround/
  host-front.png host-3q.png host-side.png host-back.png
  host-canonical-contact-sheet.jpg
docs/art/refs/ui-target/
  target-run-screen.png current-main-*.jpg
docs/product/APN-IDLE-INFINITE-PLAYBOOK.html
```

Runtime never loads ImageGen HUD mocks. Host turnaround = **identity ref only** until 2D matte atlas gates pass.

---

## 3. Delivery architecture (how we ship without pain)

### Why not one PR / one session

Domain transaction + Build rewrite + art + rights is multi-day. One mega-PR is unreviewable and unrollbackable.

### Correct shape

| Layer | Tool | Purpose |
|-------|------|---------|
| Master plan | **this file** | Single sequence + gates |
| Spec lock | ADRs + product docs | Source of truth |
| Work units | **GitHub Issues** (epic + child issues) | One issue → one PR → DoD |
| Evidence | `qa/` + Browser MCP screenshots | Every PR green |
| Art ops | ChatGPT Create Image via **Browser MCP** (primary); Higgsfield only if payment restored | Ref-driven, no slop dump |

### Execution sessions (autonomous chain after approval)

| Session | PRs | Outcome | Owner touch |
|--------:|-----|---------|-------------|
| S0 | PR-0 | V3 docs imported; ADRs; stale term map; issue graph opened | **Approve product locks (below)** |
| S1 | PR-1 | `goLive()` domain + migration + tests | None if tests green |
| S2 | PR-2–3 | Go Live UI + full naming/nav | Optional visual skim |
| S3 | PR-4 | Build V2 + Priority Tag + migration | Balance glance if asked |
| S4 | PR-5 | Run hierarchy + Host scale (code first, placeholder scale) | **Host atlas art gate** |
| S5 | PR-6–7 | Route surface + rights schema + catalog validator | Rights mode defaults |
| S6 | PR-8 | Art system + 3 Pack vertical slices (production quality) | **Art approve per pack** |
| S7 | PR-9–10 | Balance profiles + device matrix + launch checklist | **Ship / no-ship** |

Parallel only where safe: art pipeline tooling can start in S4 while S3 balances; never merge art that fails rights/size/silhouette gates.

### Per-PR mandatory loop (no exceptions)

```
spec in PR → code → node qa/run-tests.mjs
→ targeted qa/check-*.mjs
→ Browser MCP: snapshot + screenshot at 428×926 (+ one second viewport)
→ review subagent or self-review against DoD
→ only then merge
```

---

## 4. PR sequence (locked after approval)

### PR-0 · Source of truth (docs only)

- Import V3 product docs + schemas + host refs
- ADR-0008: Go Live is the only checkpoint transaction
- ADR-0009: Pack rights modes required for catalog inclusion
- Update `00_START_HERE`, VISION copy (ship language → Go Live), REDESIGN-PLAN status → Infinite phase
- Expand banned-copy list (Weapon CTA, End Season player-facing, etc.)
- Open GitHub epic + child issues mirroring PR-1…10

**Gate:** no active doc still teaches Ship+End Season as the product model.

### PR-1 · Domain `goLive` (highest risk, pure)

- `goLive(state, checkpointId)` idempotent; receipt schema
- Deprecate player path through split ship/leave (keep internal helpers only if needed for migration)
- Offline stops at boundary; Live calc uses **pre-raise** Live Mult for Rep
- Save migrate: `shippedThisSeason` → cycle contribution; `meta.season` → `goLiveCount`
- `qa/check-go-live.mjs` + long-run + playthrough updates

**Gate:** double-click / reload / zero-notes / Zone 1000 contracts green.

### PR-2 · Go Live UI

- One sheet, one CTA, bank/grow/refresh/keep/next/impact/safety
- Remove End Season confirm path
- Receipt state + a11y (keyboard cancel/confirm)
- 5 viewport states, 0 overflow

### PR-3 · Naming + nav

- Player-facing: Scanner, Go Live, Route, Pack, Priority Tag
- Nav: Hub → Route (still 5 destinations; ADR-0007 intact)
- Analytics ID map without history loss
- Copy QA zero retired leakage

### PR-4 · Build V2

- Remove purchasable Damage/Crit/Utility tax layer
- Named abilities Scan / Verify / Relay; Mastery = spent SP
- Priority Tag replaces Area
- Fair SP migration from legacy attributes
- Three seeded builds through Zone 200

### PR-5 · Run hierarchy + Host presentation

- Top strip: Signal + Notes only; SP only on Build badge
- Route + Pack progress chips
- Host stage height 118–142 px; ground plane shared
- Conditional Focus; Patch Echo chip `n/m`
- **Code can ship with scaled existing atlas**; full matte re-atlas if art gate open

### PR-6 · Route surface + Patch Echo

- Route sheet owns journey, objectives, pack history, echo archive, next reveal
- Install new pack without core rewrite or forced wipe

### PR-7 · Rights + catalog hard gates

- `rights.json` + `easter-eggs.json` per pack
- Catalog build fails if rights missing / blocked
- Asset Bible exact-character rows → research-only annotation
- Modes: `apn-original` | `homage-only` | `editorial-text-original-art` | `licensed-spotlight` | `blocked`

### PR-8 · Art production system + 3-pack vertical slice

**System first (so scale never re-slops):**

1. Per-pack packet layout (`01_RIGHTS` … `05_RUNTIME`) per V3 ASSET standard
2. Prompt templates + forbidden anchors
3. Browser MCP playbook for ChatGPT Create Image (ref images attached)
4. Extract/atlas scripts + size/pivot/halo/text-scan gates
5. Real-UI composite required before runtime merge

**First three slices (diversity proof):**

| Pack fantasy | Mode | Why |
|--------------|------|-----|
| Tactical Signal | homage-only / APN original art | Shooter coverage DNA, no Riot marks |
| Ultimate Touchline | homage-only | Sports broadcast energy, no kits/likeness |
| Dreamline Detour | apn-original | Safe pop dream world (no brand likeness) |

Existing 20 catalog IDs: either (a) keep IDs with homage art + rights mode, or (b) rename to APN-original IDs with migration map — **owner decision A below**.

### PR-9 · Balance + satisfaction profiles

Seeded: active, idle, offline, Scan, Verify, Relay, clean vs corrupted, echo discovery. Measure first upgrade / first Gate / first Go Live / recovery / dominance.

### PR-10 · Controlled launch

Internal QA matrix → optional staged rollout if embedded on site → rollback preserves receipts. Ship checklist = DEFINITION-OF-DONE + product metrics.

---

## 5. Art production ops (ChatGPT / Higgsfield)

### Decision: primary generator

| Tool | Status | Role |
|------|--------|------|
| **ChatGPT Create Image + Browser MCP** | Ready in this Grok setup | **Primary** for Host poses + pack contact sheets |
| **Higgsfield** | Account shows **Payment failed / unlimited paused** | Secondary only after billing fixed |
| Local ImageGen (Grok) | Available | Quick drafts only; final still needs real-UI proof |
| Provider dump into repo | Forbidden | Candidates stay outside git |

### Canonical Host art loop (no new character)

1. Attach V3 turnaround refs (front / ¾ / side / back)  
2. Generate **matte 2D** derivatives (not glossy toy)  
3. Actual-size gate 72 / 128 / 192 — fail → stop  
4. Pose keys: idle, run, scan, crit, pickup, go_live  
5. Atlas + pivot QA  
6. **Composite inside real game canvas** (not mock HUD)

### Pack art loop

```
rights.json locked → identity + forbidden anchors
→ ChatGPT contact sheets (textless, APN grammar)
→ silhouette readability
→ extract → WebP budgets
→ real Run composite at 428×926
→ catalog include
```

### Owner art gates (minimal, high leverage)

- Host identity sheet once  
- Each of 3 launch packs: one real-UI composite approve/reject  
- Reject = one retry with tightened prompt, not infinite regen  

---

## 6. QA / review contract (every PR)

### Automated

- `node qa/run-tests.mjs` ALL PASS  
- New: `qa/check-go-live.mjs`, rights/catalog validators, pack packet layout  
- Existing: tokens, copy, assets, route, economy colors, mobile gestures, long-run  

### Browser MCP (real Chrome)

- Mute on; dedicated connected tab  
- 428×926 + 375×812 minimum; landscape when Run changes  
- Snapshot for interaction; screenshot for visual evidence  
- Console clean  

### Human-shaped review

- Self-review against issue acceptance  
- `/review` or review skill on non-trivial PRs  
- No “looks fine” without evidence paths in PR body  

---

## 7. Conflict register (must resolve before code)

| ID | Conflict | Options | Recommendation |
|----|----------|---------|----------------|
| **A** | Catalog pack IDs are real game titles (`valorant`, `fc-26`…) | **A1** Keep IDs + homage art + `rights.mode=homage-only` + no marks · **A2** Rename to APN-original IDs + save migration map | **A1** for speed; A2 if legal risk-averse commercial launch |
| **B** | Ship mid-cycle economy (bank Notes without reset) removed | **B1** Pure Go Live only (V3) · **B2** Soft bank mid-cycle optional later | **B1** — product promise is one action |
| **C** | Launch art scope | **C1** 3 packs production + rest “acceptable clean” · **C2** All 20 packs re-art before ship | **C1** — ship quality bar on 3, upgrade rest in waves |
| **D** | Host atlas | **D1** Scale+cleanup current atlas · **D2** Full new matte atlas from V3 refs before Run PR | **D2** for brand hero claim |
| **E** | Build V2 migration | **E1** Refund SP deterministically · **E2** Map attributes to nearest ability ranks | **E1** simpler fairness |
| **F** | Art generator | **F1** ChatGPT primary · **F2** Wait for Higgsfield billing | **F1** (Higgsfield currently broken) |
| **G** | Execution surface | **G1** GitHub Issues + stacked PRs · **G2** Only local plan MD | **G1** — autonomous + reviewable |

---

## 8. Owner approval checklist

- [x] **Product lock:** Go Live is the only prestige checkpoint (B1)  
- [x] **Catalog policy:** A1  
- [x] **Launch art scope:** C1  
- [x] **Host:** D2  
- [x] **Build migration:** E1 (default accepted with lock)  
- [x] **Art tooling:** F1 (default accepted with lock)  
- [x] **Tracking:** G1  
- [x] **Counsel posture:** homage + internal review; no third-party marks  
- [x] **Multi-session chain** accepted  
- [ ] **START token:** owner says start / PR-0 — then agent runs autonomous chain  
- [ ] **Art gates during S4/S6:** Host sheet + 3 pack composites  
- [ ] **Final ship / no-ship** after PR-10 evidence  

---

## 9. What we will not do

- Rewrite to React/Pixi  
- New Host character / “similar red guy”  
- Paste logos, kits, agent likenesses  
- Pay-to-win, store power, coin combat  
- Commit ImageGen candidate dumps  
- Ship without goLive idempotency tests  
- Expand top nav past 5  
- “Make prettier” redesign without problem → hypothesis → math → rights → events → migration  

---

## 10. Immediate next command after approval

```text
Approve gates A–G (reply with choices). Then:
1) PR-0: import V3 docs + ADRs + open GitHub epic
2) PR-1: goLive domain + tests
… continue session chain autonomously with Browser MCP QA
```

---

## 11. Gap scorecard (honest)

| Area | Today | After plan | Residual risk |
|------|------:|-----------:|---------------|
| Core idle loop playable | 9/10 | 9/10 | — |
| Prestige clarity | 5/10 | 9/10 | migration edge cases |
| Naming / fantasy language | 6/10 | 9/10 | analytics remap |
| Build identity | 5/10 | 9/10 | balance iteration |
| Host as brand hero | 4/10 | 9/10 | art approval |
| Pack art quality | 5/10 | 8/10 (3 packs) / 6/10 (rest) | C1 residual |
| Rights / scale system | 4/10 | 9/10 | counsel on commercial |
| QA / ship discipline | 9/10 | 9/10 | — |
| **Overall “exit-ready infinite APN idle”** | **~6/10** | **~9/10 launch** | infinite content = ongoing |

---

*Plan author: Grok session 2026-07-16 against main + V3 package. Implementation starts only after §8 checkboxes.*
