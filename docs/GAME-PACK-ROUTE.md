# Game Pack Route

> Design source of truth for long-form Route progression, pack scheduling,
> Corruption, pacing targets, and the asset handoff. Accepted by
> [ADR-0004](./decisions/ADR-0004-game-pack-route.md); implementation follows the
> locked issue sequence in [REDESIGN-PLAN](./REDESIGN-PLAN.md).

## The derived Zone 200 rule

**Full Corruption unlocks after 20 distinct clean Game Packs.** Each pack is 10
zones, so the current unlock is Zone 200. If pack length changes, the completed
pack rule wins; `200` is not independently sacred.

Why 20 clean packs:

- 20 bosses teach the clean silhouettes before remixing them.
- 10 End Seasons establish the permanent progression loop.
- The launch roster can cover shooters, MOBAs, RPGs, survival, and three distinct
  sports packs before any revisit.
- At the pacing targets below this is a mid-game unlock measured in days, not the
  first session and not a months-late endgame.

Why not 12 packs / Zone 120: it starts remixing before the player has learned the
three separate sports packs and the intended breadth of shooter, MOBA, RPG,
survival, horror, and action identities. Why not wait beyond 20 packs: the clean
catalog then becomes a long flat tour and delays the system that makes completed
art reusable. Twenty is the smallest roster that satisfies the requested breadth
without postponing systemic variation indefinitely.

Corruption still needs foreshadowing:

| Clean-pack milestone | Signal |
|---:|---|
| 5 / Zone 50 | One non-combat anomaly in the background |
| 10 / Zone 100 | First boss fracture preview; no Corruption reward |
| 15 / Zone 150 | Feed warning + stronger environment scar |
| 20 / Zone 200 | Full Signal Drift scheduler unlock |

Foreshadowing never replaces the clean target art and never inserts a corrupted
pack before the unlock.

## Progression clocks

| Clock | Scope | Reset behavior |
|---|---|---|
| Encounter | seconds | enemy dies |
| Route Zone | one zone | **never resets** |
| Game Pack | 10 Route Zones + boss | completed forever in pack history |
| Season | 20 Route Zones / two packs | run power resets; Route continues |
| Corruption epoch | 200 Route Zones | raises allowed revisit tier |

The Run HUD displays global Route Zone and `pack zone / 10`. Internal run-only
growth may reset, but player-facing world progress must not jump back to Zone 1.

## Clean Era roster · Zones 1–200

The order alternates visual genres and includes the requested sports games as
independent packs.

| Route Zones | Game Pack |
|---:|---|
| 1–10 | Valorant |
| 11–20 | League of Legends |
| 21–30 | Fortnite |
| 31–40 | World of Warcraft |
| 41–50 | EA Sports FC 26 |
| 51–60 | Minecraft |
| 61–70 | Counter-Strike 2 |
| 71–80 | Old School RuneScape |
| 81–90 | NBA 2K26 |
| 91–100 | Overwatch |
| 101–110 | Grand Theft Auto V |
| 111–120 | Madden NFL 26 |
| 121–130 | Apex Legends |
| 131–140 | Dota 2 |
| 141–150 | Dead by Daylight |
| 151–160 | Path of Exile 2 |
| 161–170 | Marvel Rivals |
| 171–180 | Escape from Tarkov |
| 181–190 | Rocket League |
| 191–200 | Elden Ring |

This is a curated launch route, not a permanent popularity ranking. Twitch data
chooses the candidate roster; visual variety and pack quality choose the order.

## Pack arc · every 10 zones

| Pack zone | Encounter function |
|---:|---|
| 1–2 | common A; establish environment and scale |
| 3–4 | common B; introduce second silhouette |
| 5–6 | common C / champion; first signature mechanic motif |
| 7–8 | elite; stronger game-specific character or role |
| 9 | event target; boss foreshadow |
| 10 | unique pack boss + break state |

Every pack exports five small targets/rivals and one boss. A sports pack may use
cover stars, player-card rivals, or game-specific roles instead of monsters; it
still obeys the same runtime scale and pivot contract.

## Corruption epochs

| Route Zone | Maximum revisit tier | Art delta |
|---:|---|---|
| 1–200 | Clean Build | canonical pack only |
| 201–400 | Signal Drift | light fissures / signal contamination |
| 401–600 | Corrupted Build | corruption mask + boss armor segments |
| 601–800 | Overrun | environment infestation + stronger break state |
| 801–1000 | Zero-Day | maximum readable mutation |
| 1001+ | Endless Rating | Zero-Day art remains; numbers/rewards continue |

Rules:

- A newly installed or unseen pack always debuts Clean, even in a late epoch.
- A pack's corruption tier increases only after that tier's boss is completed.
- Tier 4 is the visual cap. More black growth, particles, or overlays after Tier 4
  are prohibited; readability wins over an infinitely dirtier screen.
- Corruption rewards use existing Notes, Gear, and Rep. No new currency is added.
- Armor segments are milestone feedback inside the existing boss HP budget, not
  a second unrelated combat system.

## Scheduler after the Clean Era

Scheduling happens at End Season boundaries so content updates never split a
two-pack season.

1. If unseen packs exist, schedule a **Clean Season** with two non-adjacent-genre
   unseen packs.
2. Follow with a **Corruption Season** containing two least-recently-seen eligible
   packs at the lowest available tier.
3. If no unseen pack exists, schedule Corruption Seasons continuously.
4. A newly added pack joins the next Clean Season; it does not reorder the active
   season or mutate an existing save deck.
5. Never schedule the same pack or the same primary genre consecutively.
6. If only one unseen pack exists, it debuts Clean beside the least-recent
   different-genre revisit; the new pack is never held back waiting for another install.

Example after Zone 200:

| Route Zones | Scheduled pack |
|---:|---|
| 201–210 | Call of Duty: Warzone · Clean |
| 211–220 | Rainbow Six Siege · Clean |
| 221–230 | Valorant · Signal Drift |
| 231–240 | League of Legends · Signal Drift |
| 241–250 | Final Fantasy XIV · Clean |
| 251–260 | Diablo IV · Clean |
| 261–270 | Fortnite · Signal Drift |
| 271–280 | World of Warcraft · Signal Drift |

## Save-stable route state

Save state uses stable string IDs, never catalog array indexes:

- `routeZone`
- `currentPackId`
- `seenPackIds`
- `corruptionByPack`
- `lastSeenByPack`
- `routeDeck`
- `catalogVersion`
- `routeSeed`

A missing pack falls back to the next valid ID without erasing its history. New
catalog versions are adopted only at the next End Season boundary.

## Pacing targets

The current aggressive headless auto-buy/auto-SP simulation clears ten 20-zone
seasons in about 31 minutes, with later seasons collapsing to about two minutes.
That is a balance failure for an art-led multi-day route.

Target windows:

| Milestone | Active-assisted | Mostly idle |
|---|---:|---:|
| First boss / Zone 10 | 8–12 min | 15–25 min |
| First End Season / Zone 20 | 25–40 min | 45–75 min |
| Mature 20-zone season | 35–70 min | 60–120 min |
| Corruption unlock / 20 clean packs | 10–16 h | 2–4 calendar days |

No hard waiting timer enforces these windows. `formulas.js` owns route difficulty,
kill budgets, enemy HP, boss HP, and prestige catch-up. Permanent power must make
the player feel faster without allowing later seasons to collapse:

- after Season 3, adjacent automated season durations stay within `0.75–1.25×`;
- active Sprint/build decisions save meaningful time but do not skip whole packs;
- no normal target is a one-shot at on-curve power;
- each boss remains a visible encounter, not a single-frame reward dispenser.

Add a seeded, silent long-run QA profile for active-assisted, idle, and offline
play through at least Zone 1000. The test fails on runaway acceleration, a hard
wall, missed boss cadence, scheduler repetition, or save nondeterminism.

## Offline progression

- Existing offline efficiency/cap remains the starting constraint.
- Offline route advancement stops at the next 20-zone End Season boundary.
- Overflow time may generate bounded existing resources, but cannot silently skip
  another two Game Packs.
- On return, completed boss encounters appear in a concise recap before the End
  Season decision. No audio is played by automated or visual QA.

## Game Pack asset contract

Each pack is independently loadable and contains:

```text
assets/game-packs/<pack-id>/
  pack.json
  background.webp       # far / mid / ground atlas
  targets.webp          # 5 small targets + boss + boss break state
  targets.json          # rect, foot pivot, runtime scale, role
  props.webp
  corruption-mask.webp  # target mask + boss fracture mask
  source-board.md       # research provenance; no runtime load
```

Pack budget target: background ≤150 KB, targets ≤140 KB, props/masks ≤50 KB.
Only current and next pack are decoded. Core first-playable and hot-texture budgets
in [PERF-BUDGET](./PERF-BUDGET.md) remain binding.

### Source-board and generation procedure

For every game:

1. Collect official environment/gameplay, character or cover-star, boss/event,
   and patch/live-content references. Record URL, owner, date, and what may be
   extracted from each reference.
2. Build one textless target-family sheet: five small silhouettes + one boss.
3. Build one textless parallax environment/prop sheet.
4. Condition both on the APN art grammar: two-tone fill, controlled highlight,
   common ink outline, grounded shadow, and the Run camera direction.
5. Extract sprites, preserve foot-center pivots, and verify at runtime size.
6. Compose approval proofs with deterministic real UI; ImageGen never produces
   HUD text, buttons, resource values, or navigation.

The first visual lock covers all 20 Clean Era packs, the global Corruption kit,
representative corrupted packs, Hybrid Host usage, and real Run compositions.
Production code begins only after that combined approval.

## Research basis

Research was checked on 2026-07-15. Popularity identifies candidates rather than
dictating route order; official game sources own each pack's visual reference.

- Current live-stream candidate pool: [TwitchMetrics 30-day game
  ranking](https://twitchmetrics.herokuapp.com/games/viewership),
  [SullyGnome Twitch statistics](https://sullygnome.com/?language=en), and
  [Streams Charts summer 2026 analysis](https://streamscharts.com/news/twitch-hits-11-month-peak-during-summer-game).
- Prestige-loop principles: [Tap Titans 2 prestige and Stage
  Rush](https://gamehive.helpshift.com/hc/en/3-tap-titans-2/faq/75-should-i-prestige-when/),
  [Cookie Clicker Ascension](https://cookieclicker.wiki.gg/wiki/Ascension), and
  [Anthony Pecorella's GDC idle-game math
  deck](https://media.gdcvault.com/gdc2015/presentations/Pecorella_Anthony_Idle_Games_The.pdf).
- Sports pack visual ownership: [EA Sports FC 26 cover
  reveal](https://news.ea.com/press-releases/press-releases-details/2025/The-Club-Is-Yours-With-EA-SPORTS-FC-26-Jude-Bellingham-and-Jamal-Musiala-Revealed-as-Cover-Stars-of-EA-SPORTS-FCS-Most-Community-Driven-Title/default.aspx),
  [FC 26 launch notes](https://www.ea.com/en/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-launch-update),
  [NBA 2K26](https://nba.2k.com/en-GB/2k26/), [Madden NFL
  26](https://www.ea.com/games/madden-nfl/madden-nfl-26), and [Madden gameplay
  deep dive](https://www.ea.com/games/madden-nfl/madden-nfl-26/news/madden-26-gridiron-notes-gameplay-deep-dive).
- Initial boss-reference checks: [World of Warcraft Icecrown
  Citadel](https://worldofwarcraft.blizzard.com/news/24013834/wrath-of-the-lich-king-classic-the-way-into-the-icecrown-citadel-is-open)
  and [Old School RuneScape TzTok-Jad](https://oldschool.runescape.wiki/w/TzTok-Jad).

These references justify candidate selection and progression principles; they do
not independently prescribe Zone 200. That milestone is the product-derived
result of 20 clean packs × 10 zones.
