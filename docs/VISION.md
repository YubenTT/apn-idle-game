# Vision · Pillars · Non-Goals

> The **decision filter**. Every design, art, and code choice is checked against the
> pillars and non-goals here. When a proposal fails a pillar or matches a non-goal,
> it does not ship — no matter how cool it looks in isolation.

## North star

**APN Idle is a small editorial-operative fantasy that tames live-service
information chaos.** You are the APN Host on the Signal Road: scan, clear noise,
collect Notes, ship them for Rep, and stay live while the real patch notes load.

It is **not** a generic cyberpunk battler. The verbs are **scan, filter, collect,
ship** — not mana/burst/random-fantasy-loot. The difference from every other idle
is that the loop is *tied to APN's content stream* (patch / news / events / guides /
videos), not bolted onto a stock template.

## Design pillars

Five pillars. If a screen or feature can't defend itself against all five, cut or
fix it.

| # | Pillar | Test question |
|---|--------|---------------|
| 1 | **Gameplay is the hero.** | In the first 3 seconds can the player tell *what they fight, what they earn, what to do next*? |
| 2 | **One mascot, one silhouette, one perspective.** | Does this asset match the [mascot canon](../brand/MASCOT-CANON.md) exactly — same head/body ratio, visor, light, outline? |
| 3 | **2D editorial clarity, not 3D toy gloss.** | Does it read as flat-shaded APN art with a crisp outline, or as a shiny plastic toy? |
| 4 | **One color, one job.** | Does each hue mean exactly one thing per [DESIGN-TOKENS](../brand/DESIGN-TOKENS.md)? Is red still meaningful, not ambient paint? |
| 5 | **One screen, one decision.** | Does this surface ask the player for *one* clear decision — no debug text, no half-built economy, no placeholder? |

## Readability & feel guarantees (inherited, still binding)

These were already right in the shipped game — we keep them.

1. **Readable progress** — big numbers; each bar means one thing (Rank ≠ Zone).
2. **Afford signals** — green "can buy" CTAs, locked greys, SP badge on Build.
3. **Juicy feedback** — confetti, floaters, death squash, Patch Note flip, SFX.
4. **Brand-first** — APN crimson, Host mascot, feed comedy, LIVE ticker.
5. **Never softlock** — zones advance forever; prestige is optional at checkpoints.

## Non-goals (what we will NOT build)

Non-goals are the strongest anti-scope-creep tool we have. Adding to this list is
cheap; violating it is expensive.

| Non-goal | Why |
|----------|-----|
| React / Vue / Pixi / heavy framework for the playable core | Kills zero-npm static iteration; contradicts [ADR-0001](./decisions/ADR-0001-vanilla-stack.md). |
| Pay-to-win combat power | If monetized, cosmetics + convenience only. See [MONETIZATION.md](./MONETIZATION.md). |
| Multiplayer / server-authoritative combat | Single-surface waiting-room game; no backend for v1. |
| New mascot art per screen / AI re-interpretations | Mascot is single-source from GLB. "Fit look" comes from camera + cleanup, not new meshes. |
| Red as the default accent for everything | Red = APN primary / patch / live only. Other jobs get other hues. |
| Pasting official logos or unmodified third-party art into encounters | Game Packs use recognizable homage as input, then redraw every target, prop, and environment through APN's owned 2D grammar; no source image ships as runtime art. See [ADR-0004](./decisions/ADR-0004-game-pack-route.md). |
| More than 5 top-level nav destinations | Cognitive load + touch targets. Secondary surfaces are sheets. |
| Debug / diagnostic text on player-facing screens | e.g. "Damage 3·Crit 0·Utility 1", "hover for stats" — banned in UI. |
| Full 30-doc AAA production process | Right-sized process for a small web game (see below). |

## Process scope

The redesign research shipped a 30+ document AAA framework (Thesis → Research →
Prototype → GDD → TDD → Bibles → LiveOps → Postmortem). That order is *correct in
spirit* (validate fun before writing the encyclopedia) but that *volume* would be
bureaucracy for a static single-screen web game.

We keep the chain, folded into the lean doc set:

| Framework stage | Where it lives here |
|-----------------|---------------------|
| Thesis / why / who | [CONCEPT.md](./CONCEPT.md), this file |
| Vision / pillars / non-goals | this file |
| Core loop / experience | [GAME-DESIGN.md](./GAME-DESIGN.md) |
| GDD / systems | [GAME-DESIGN.md](./GAME-DESIGN.md) + [BALANCE.md](./BALANCE.md) |
| TDD | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Art / UX bible | [../brand/](../brand/) + [SCREEN-SPECS.md](./SCREEN-SPECS.md) |
| Vertical slice proof | the shipped playable build + [../qa/](../qa/) |
| QA / DoD | [QA-CHECKLIST.md](./QA-CHECKLIST.md), [DEFINITION-OF-DONE.md](./DEFINITION-OF-DONE.md) |
| Decisions log | [decisions/](./decisions/) |

If the game ever grows a backend, accounts, or a real content pipeline, *then* we
graduate the relevant stage into its own doc — not before.

## Go / no-go gates

A change is not "done" until it clears the gate for its stage.

| Gate | Question | Evidence |
|------|----------|----------|
| Design | Passes all 5 pillars, violates no non-goal? | This file |
| Visual | Uses only tokens; contrast + touch pass? | [DESIGN-TOKENS](../brand/DESIGN-TOKENS.md), [QA-CHECKLIST](./QA-CHECKLIST.md) |
| Code | Domain pure, tests green, no framework creep? | `node qa/run-tests.mjs`, [ARCHITECTURE](./ARCHITECTURE.md) |
| Ship | DoD satisfied, docs updated? | [DEFINITION-OF-DONE](./DEFINITION-OF-DONE.md) |
