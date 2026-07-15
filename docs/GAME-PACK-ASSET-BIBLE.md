# Game Pack Asset Bible

> Proposed visual-approval source for the Clean Era asset program. This file
> converts [GAME-PACK-ROUTE](./GAME-PACK-ROUTE.md) into research-backed art
> deliverables. Nothing here is a shipped runtime asset until the combined visual
> lock is approved.

## What must be produced

### Shared assets

| Set | Deliverable | Runtime intent |
|---|---|---|
| Host | canonical base animation atlas, six additive role accents, FX atlas | one GLB-derived character; fixed foot pivot |
| Corruption | four-tier fissure, redaction, parasite, armor, fracture, and environment overlays | reused by every pack; Tier 4 is the art cap |
| Encounter FX | scan beam, hit, crit, boss-break, loot pull, spawn/despawn | token-colored, pre-composited where possible |
| Route transitions | clean pack arrival, boss clear, End Season handoff, corruption reveal | no full-screen video; reduced-motion variant |
| Gear | four shipped slot families plus rarity/better-equipped marks | independent of game-pack identity |

### Per-pack assets

Each of the 20 Clean Era packs needs:

- one three-layer environment atlas: far, mid, ground;
- five small target/rival silhouettes;
- one final encounter and one readable break state;
- one prop atlas with four to eight identity anchors;
- one target corruption mask and one boss fracture mask;
- one `pack.json`, one pivot/rect manifest, and one source board.

Clean Era totals: **100 small targets, 20 final encounters, 20 break states,
60 background layers, 20 prop sets, and 40 corruption masks.** These are masters,
not simultaneously decoded textures.

## One visual grammar

- Textless raster art only. HTML/CSS/Canvas owns HUD text, buttons, numbers, and
  navigation.
- 2D Patchline editorial-action: consistent dark ink outline, two-tone fill, one
  controlled highlight, one grounded oval shadow.
- Side-on Run staging: Host on the left, encounter enters from the right, both
  share one ground plane and foot-center pivot.
- Recognizability comes from silhouette, environment, signature prop, and color
  hierarchy together. Logos and floating game-title text are not the solution.
- A target must survive a 72 px silhouette check; a boss must survive at 128 px.
- Every generated proof is redrawn into the APN grammar. Do not paste screenshots
  or mix realistic, painterly, 3D-toy, and cartoon rendering in one atlas.

## Clean Era source boards

Official references own visual facts. The proposed target families below are the
minimum proof set; the combined visual lock may replace a member without changing
the five-target-plus-final contract.

### 01 · Valorant · Zones 1–10

- Space: Bind-style tactical corridor, hard sightlines, site crates, teleporter
  geometry, planted-site telemetry.
- Small rivals: Jett, Cypher, Killjoy, Omen, KAY/O role silhouettes.
- Final: overclocked KAY/O guarding a planted Spike core; break state removes the
  outer suppression armor.
- Official basis: [maps](https://playvalorant.com/en-us/maps/), [beginner's
  guide](https://playvalorant.com/en-us/news/announcements/beginners-guide/), and
  [current agent patch references](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-00/).

### 02 · League of Legends · Zones 11–20

- Space: Summoner's Rift river approaching the Baron pit; lane stone, brush, and
  void contamination establish the arc.
- Small targets: melee minion, caster minion, cannon minion, Blue Sentinel, Red
  Brambleback.
- Final: Baron Nashor; break state exposes void plates and the inner maw.
- Official basis: [How to Play](https://www.leagueoflegends.com/en-gb/how-to-play/),
  [Baron visual revamp](https://www.leagueoflegends.com/en-gb/news/dev/dev-cat-cults-rift-mechs-and-barons-revamp/),
  and [gameplay preview](https://www.leagueoflegends.com/en-gb/news/game-updates/2024-gameplay-preview/).

### 03 · Fortnite · Zones 21–30

- Space: readable Island POI skyline, build pieces, supply-drop lane, and storm
  edge; bright shape language flattened into APN night.
- Small targets: henchman, cube fiend, loot llama, raptor, armored guard.
- Final: Storm King; break state shatters horn armor and exposes storm energy.
- Official basis: [Battle Royale](https://www.fortnite.com/@epic/battle-royale),
  [Storm King event](https://www.fortnite.com/news/fortnitemares-2019), and [Myths
  & Mortals](https://www.fortnite.com/news/make-history-in-fortnite-battle-royale-chapter-5-season-2-myths-mortals).

### 04 · World of Warcraft · Zones 31–40

- Space: Icecrown ramparts leading toward the Frozen Throne; blue-black ice,
  saronite spikes, chains, and citadel windows.
- Small targets: ghoul, geist, vrykul, abomination, death knight.
- Final: the Lich King; break state fractures the frozen throne aura and outer
  shoulder armor.
- Official basis: [Icecrown Citadel boss
  tour](https://worldofwarcraft.blizzard.com/news/24013834/wrath-of-the-lich-king-classic-the-way-into-the-icecrown-citadel-is-open)
  and [Wrath reveal recap](https://worldofwarcraft.blizzard.com/en-us/news/23783667/world-of-warcraft-reveal-news-round-up).

### 05 · EA Sports FC 26 · Zones 41–50

- Space: floodlit Bernabéu-scale stadium tunnel opening onto the pitch; broadcast
  boards and crowd tiers are props, not HUD.
- Small rivals: keeper, center-back, midfielder, winger, striker as distinctive
  player-card poses.
- Final: Bellingham and Musiala cover-star captain showdown; break state becomes
  an extra-time spotlight with fractured captain-card frame.
- Official basis: [FC 26](https://www.ea.com/games/ea-sports-fc/fc-26), [gameplay
  deep dive](https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive),
  and [World's Game](https://www.ea.com/games/ea-sports-fc/fc-26/features/fc-26-the-worlds-game).

### 06 · Minecraft · Zones 51–60

- Space: Overworld sunset transitions through stronghold portal into the End;
  block scale remains recognizable inside the common outline system.
- Small targets: zombie, skeleton, creeper, Enderman, iron golem.
- Final: Ender Dragon with obsidian spires and end crystals; break state removes
  crystal protection and exposes wing tears.
- Official basis: [Ender Dragon](https://www.minecraft.net/en-us/article/ender-dragon)
  and [biome guide](https://help.minecraft.net/hc/en-us/articles/360046470431-All-Biomes-in-Minecraft).

### 07 · Counter-Strike 2 · Zones 61–70

- Space: Dust-like sunlit defusal site translated into APN night, with crates,
  archways, smoke line, bombsite stencil, and planted C4 light.
- Small rivals: T entry, CT anchor, sniper, support, bomb carrier.
- Final: armored Master Agent defending the planted site; break state removes
  ballistic plates and opens the defuse window.
- Official basis: [CS2 introduction](https://counter-strike.net/cs2), [agent
  collection](https://www.counter-strike.net/shatteredweb), and [workshop map
  resources](https://www.counter-strike.net/workshop/workshopresources).

### 08 · Old School RuneScape · Zones 71–80

- Space: volcanic Fight Caves / Mor Ul Rek, lava seams, basalt stepping plates,
  and intentionally low-poly silhouettes preserved as editorial facets.
- Small targets: Tz-Kih, Tz-Kek, Tok-Xil, Yt-MejKot, Ket-Zek.
- Final: TzTok-Jad; break state cracks the obsidian hide and exposes lava core.
- Official basis: [Inferno dev
  blog](https://secure.runescape.com/m=news/dev-blog-brimstone--the-inferno?oldschool=1)
  and [TzHaar challenge](https://secure.runescape.com/m=news/tzhaar-ket-raks-challenges?oldschool=1).

### 09 · NBA 2K26 · Zones 81–90

- Space: night Triple Threat park transitioning to a Finals arena; hardwood,
  shot-clock glow, tunnel, and trophy plinth.
- Small rivals: point guard, shooter, wing, power forward, center as player-card
  poses with distinct body language.
- Final: Shai Gilgeous-Alexander, Angel Reese, and Carmelo Anthony cover trio;
  break state is a fourth-quarter clutch spotlight and split card frame.
- Official basis: [NBA 2K26](https://nba.2k.com/en-GB/2k26/), [MyTEAM Triple
  Threat](https://nba.2k.com/2k26/courtside-report/myteam/), and [player
  ratings](https://nba.2k.com/2k26/top-100-players/).

### 10 · Overwatch · Zones 91–100

- Space: Toronto invasion street with clean hero-shooter architecture, payload
  lane, Null Sector dropships, and readable cover blocks.
- Small targets: Slicer, Trooper, Stalker, Artillery, Charger war-bot roles.
- Final: Ramattra in Nemesis form; break state opens outer omnic armor and breaks
  the annihilation ring.
- Official basis: [Null Sector
  invasion](https://overwatch.blizzard.com/en-us/news/23989473/overwatch-2-invasion-is-here-with-new-adventures-a-new-hero-and-new-ways-to-play/),
  [enemy-design context](https://overwatch.blizzard.com/en-gb/news/23629160/behind-the-scenes-of-overwatch-2-s-development/),
  and [Ramattra](https://overwatch.blizzard.com/en-us/heroes/ramattra/).

### 11 · Grand Theft Auto V · Zones 101–110

- Space: Los Santos night heist route from street to casino vault; freeway
  silhouette, armored van, security doors, and planning-board motifs.
- Small targets: security guard, biker, gang enforcer, NOOSE officer, armored
  driver.
- Final: casino juggernaut and sealed vault set piece; break state removes helmet
  plate and opens the vault ring.
- Official basis: [GTA V](https://www.rockstargames.com/gta-v), [Diamond Casino
  Heist](https://www.rockstargames.com/newswire/article/o349k5525o8k52/The-Diamond-Casino-Heist-Coming-December-12th),
  and [heist setup](https://www.rockstargames.com/newswire/article/51974aa3a7k193/setting-up-for-gta-online-heists).

### 12 · Madden NFL 26 · Zones 111–120

- Space: snow-capable NFL stadium under blackout lights, tunnel smoke, yard
  markers, sideline equipment, and end-zone spectacle.
- Small rivals: cornerback, safety, linebacker, defensive end, nose tackle.
- Final: Saquon Barkley cover-star breakaway encounter against a goal-line wall;
  break state shatters the defense card and opens the end zone.
- Official basis: [Madden NFL 26](https://www.ea.com/games/madden-nfl/madden-nfl-26),
  [gameplay deep dive](https://www.ea.com/games/madden-nfl/madden-nfl-26/news/madden-26-gridiron-notes-gameplay-deep-dive),
  and [presentation](https://www.ea.com/games/madden-nfl/madden-nfl-26/news/madden-26-gridiron-notes-presentation-deep-dive).

### 13 · Apex Legends · Zones 121–130

- Space: World's Edge industrial lane, ring wall, jump tower, supply bin, and
  Hammond structures; terrain stays side-readable.
- Small targets: loot tick, spider, prowler, Spectre, rival recon Legend.
- Final: Revenant in a death-totem arena; break state fractures shadow armor and
  collapses the totem field.
- Official basis: [maps](https://www.ea.com/games/apex-legends/maps), [current
  recon language](https://www.ea.com/games/apex-legends/apex-legends/news/shockwave-patch-notes),
  and [current event mechanics](https://www.ea.com/games/apex-legends/apex-legends/news/aftershock-event).

### 14 · Dota 2 · Zones 131–140

- Space: river-to-Roshan-pit route with Radiant/Dire material split, watcher,
  rune point, trees, and stone ramp.
- Small targets: melee creep, ranged creep, siege creep, neutral satyr, Tormentor.
- Final: Roshan; break state removes outer rock plates and exposes rage fissures.
- Official basis: [Wandering Waters](https://www.dota2.com/wanderingwaters), [New
  Frontiers](https://www.dota2.com/newfrontiers), and [Roshan gameplay
  history](https://www.dota2.com/700/gameplay/).

### 15 · Dead by Daylight · Zones 141–150

- Space: Entity-built fog realm with generator, sacrificial hook, shack, pallets,
  and black root silhouettes; horror contrast without hiding targets.
- Small targets: crow swarm, crawling Entity claw, damaged generator apparition,
  masked trial shade, spectral survivor echo.
- Final: The Trapper framed by the Entity; break state snaps mask/trap armor while
  Entity claws remain environment framing.
- Official basis: [realms and maps](https://deadbydaylight.com/game/maps/), [The
  Entity](https://deadbydaylight.com/), and [Void Realm
  lore](https://deadbydaylight.com/news/void-realm-lore-explained/).

### 16 · Path of Exile 2 · Zones 151–160

- Space: corrupted Wraeclast ruin progressing toward the Burning Monolith;
  ossuary masonry, ritual pylons, ash, and restrained ember fields.
- Small targets: drowned undead, bone construct, corrupted beast, cultist, plated
  executioner.
- Final: Arbiter of Ash / pinnacle-arbiter silhouette; break state removes flame
  plates and opens the inner sigil.
- Official basis: [Path of Exile 2](https://www.pathofexile.com/poe2), [boss-design
  presentation](https://www.pathofexile.com/forum/view-thread/3434366), and [boss
  wallpaper set](https://www.pathofexile.com/forum/view-thread/3856010).

### 17 · Marvel Rivals · Zones 161–170

- Space: fractured Chronoverse Times Square / museum battlefield with comic-panel
  destruction, portals, and destructible cover silhouettes.
- Small rivals: Spider-Man, Rocket Raccoon, Iron Man, Magik, Venom role reads,
  redrawn in the common APN scale language.
- Final: Doctor Doom chronal armor encounter; break state splits the time-shield
  and exposes the armor core.
- Official basis: [game overview](https://www.marvelrivals.com/news/20241205/40185_1198409.html),
  [heroes](https://www.marvelrivals.com/heroes/), and [Museum of Contemplation
  map](https://www.marvelrivals.com/20260128/41525_1284020.html).

### 18 · Escape from Tarkov · Zones 171–180

- Space: Interchange mall route under emergency lighting; shuttered storefronts,
  loading bay, extraction sign, crates, and hard cover.
- Small targets: Scav, Raider, Rogue, PMC, Cultist.
- Final: Killa; break state removes visor/plate protection and exposes damaged
  track armor.
- Official basis: [boss spawn update](https://www.escapefromtarkov.com/news/id/336),
  [Reserve and Glukhar](https://www.escapefromtarkov.com/news/id/152), and [bot/boss
  behavior update](https://www.escapefromtarkov.com/news/id/343).

### 19 · Rocket League · Zones 181–190

- Space: DFH Stadium at night, side-on soccar pitch, boost pads, goal frame,
  broadcast truss, and airborne ball routes.
- Small rivals: Octane, Dominus, Breakout, Merc, and Fennec-like car silhouettes.
- Final: tournament champion armored Octane defending a charged goal orb; break
  state strips shield panels and triggers a readable demolition shell.
- Official basis: [10th anniversary DFH
  Stadium](https://www.rocketleague.com/news/celebrate-10-years-of-aerials-and-epic-saves-in-rocket-league-season-19),
  [arena/car foundation](https://www.rocketleague.com/news/rocket-league-coming-to-ps4--playstation-experience),
  and [Season 20 arenas](https://www.rocketleague.com/news/rocket-league-patch-notes-v2-56-season-20-live).

### 20 · Elden Ring · Zones 191–200

- Space: Limgrave approach into Stormveil Castle; windswept grass, ruined arches,
  ballista lane, grafted banners, and the castle silhouette.
- Small targets: wandering noble, imp, warhawk, Godrick soldier, troll.
- Final: Godrick the Grafted; break state removes grafted outer arms and exposes
  the dragon-arm phase silhouette.
- Official basis: [world and Stormveil
  overview](https://en.bandainamcoent.eu/elden-ring/news/what-elden-ring-about) and
  [official Elden Ring hub](https://en.bandainamcoent.eu/elden-ring/elden-ring).

## Global Corruption kit

The kit is additive and pack-agnostic:

| Tier | Target treatment | Environment treatment | Boss break |
|---:|---|---|---|
| 1 · Signal Drift | one controlled fissure + misplaced highlight | one distant anomaly | hairline fracture |
| 2 · Corrupted Build | redaction band + local parasite plate | infected prop cluster | two removable armor segments |
| 3 · Overrun | asymmetrical growth, silhouette still intact | midground infestation | broken outer shell + exposed core |
| 4 · Zero-Day | maximum high-contrast mutation | far/mid/ground scar alignment | final stable fracture pattern |

No runtime blur, color-matrix filter, or procedural black-noise blanket replaces
the authored masks. Tier 4 art is reused forever.

## Approval proof set

The single user gate contains:

1. five Clean Era contact sheets, four packs per sheet;
2. one canonical Host pose/role sheet derived from the existing reference;
3. one four-tier Corruption atlas proof;
4. later deterministic Run composites using the accepted art, real UI, muted
   audio, and right-to-left enemy entry.

Acceptance is visual-system approval, not approval of every future animation
frame. Rejected pack rows are redrawn before production atlases or game code are
created.
