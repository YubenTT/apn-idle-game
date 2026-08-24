/** APN Idle content — skills, permanent Boosts, tips */

import { skillSpCost as buildSkillSpCost, isBossZone } from './formulas.js?v=gaf2d-motion-v1';

export const SEASON = {
  id: 'season_01',
  name: 'Launch Week Feed',
  zones: 20,
};

/** Permanent Rep boosts — survive Go Live */
export const META = {
  xp_posts: {
    id: 'xp_posts',
    name: 'Faster Ranks',
    desc: '+8% Rank XP per kill',
    base: 5,
    growth: 1.42,
    per: 0.08,
    category: 'Ranks',
    unit: 'percent',
    valueCue: 'Faster local rank cycles',
  },
  xp_global: {
    id: 'xp_global',
    name: 'Bonus XP',
    desc: '+6% all Rank XP',
    base: 5,
    growth: 1.42,
    per: 0.06,
    category: 'Ranks',
    unit: 'percent',
    valueCue: 'Improves every rank source',
  },
  signal_power: {
    id: 'signal_power',
    name: 'Signal Power',
    desc: '+5% damage · stacks with Live Mult',
    base: 8,
    growth: 1.48,
    per: 0.05,
    category: 'Combat',
    unit: 'percent',
    valueCue: 'All-run damage value',
  },
  feed_speed: {
    id: 'feed_speed',
    name: 'Move Speed',
    desc: '+3% march speed',
    base: 10,
    growth: 1.5,
    per: 0.03,
    category: 'Combat',
    unit: 'percent',
    valueCue: 'Shorter travel downtime',
  },
  byte_gain: {
    id: 'byte_gain',
    name: 'More Signal',
    desc: '+5% Signal from kills',
    base: 6,
    growth: 1.38,
    per: 0.05,
    category: 'Economy',
    unit: 'percent',
    valueCue: 'More Scanner upgrades',
  },
  patch_gain: {
    id: 'patch_gain',
    name: 'More Notes',
    desc: '+7% Notes from red Patch Notes',
    base: 9,
    growth: 1.45,
    per: 0.07,
    category: 'Economy',
    unit: 'percent',
    valueCue: 'More Notes to bank',
  },
  cold_start: {
    id: 'cold_start',
    name: 'Flat Damage',
    desc: '+3 flat damage · strong early',
    base: 12,
    growth: 1.65,
    per: 3,
    category: 'Combat',
    unit: 'flat',
    valueCue: 'Faster season starts',
  },
};

/**
 * Skills — no masks, no exclusive slots.
 * Three clear branches. All stackable and bought directly with SP.
 */
/**
 * Skills — stackable, no masks.
 * max is soft ceiling; SP cost rises every 5 ranks for long-session sink.
 */
export const SKILLS = {
  hotfix: {
    id: 'hotfix',
    tree: 'scan',
    name: 'Hotfix',
    short: 'Hotfix',
    max: 20,
    req: {},
    type: 'active',
    desc: 'Heavy hit on the nearest target. Costs 10 Focus.',
  },
  scroll_speed: {
    id: 'scroll_speed',
    tree: 'scan',
    name: 'Quick Scan',
    short: 'Quick Scan',
    max: 20,
    req: {},
    type: 'passive',
    desc: 'Faster auto-attacks and cheaper Sprint.',
  },
  live_tracker: {
    id: 'live_tracker',
    tree: 'scan',
    name: 'Live Tracker',
    short: 'Live Tracker',
    hud: 'Tracker',
    max: 25,
    req: {},
    type: 'toggle',
    desc: 'Damage ramps while you keep fighting. Strong on bosses.',
  },
  notify: {
    id: 'notify',
    tree: 'verify',
    name: 'Signal Ping',
    short: 'Signal Ping',
    max: 15,
    req: {},
    type: 'passive',
    desc: 'More energy/Signal orbs, better pickups.',
  },
  summary_burst: {
    id: 'summary_burst',
    tree: 'verify',
    name: 'Priority Tag',
    short: 'Priority Tag',
    hud: 'Priority',
    max: 15,
    req: {},
    type: 'active',
    desc: 'Mark the current target for increased Signal and Notes rewards. Costs 12 Focus.',
  },
  sharp_eye: {
    id: 'sharp_eye',
    tree: 'verify',
    name: 'Source Lock',
    short: 'Source Lock',
    max: 20,
    req: {},
    type: 'passive',
    desc: '+1.5% critical chance per rank.',
  },
  deep_dive: {
    id: 'deep_dive',
    tree: 'amplify',
    name: 'Overclock',
    short: 'Overclock',
    hud: 'Overclock',
    max: 20,
    req: {},
    type: 'toggle',
    desc: 'Big damage boost while active. Drains energy — grab orbs.',
  },
  amplify: {
    id: 'amplify',
    tree: 'amplify',
    name: 'Relay Power',
    short: 'Relay Power',
    max: 20,
    req: {},
    type: 'passive',
    desc: 'Hotfix, Priority Tag, Live Tracker, and Overclock hit harder.',
  },
  marathon: {
    id: 'marathon',
    tree: 'amplify',
    name: 'Always Live',
    short: 'Always Live',
    max: 15,
    req: {},
    type: 'passive',
    desc: '+energy regen and lower Sprint drain.',
  },
};

/** SP cost to raise a skill from current level → next (scalable sink) */
export function skillSpCost(currentLv) {
  return buildSkillSpCost(currentLv);
}

/** Tree section order for Build UI */
export const SKILL_TREES = [
  { id: 'scan', mastery: 'scan', label: 'Scan', promise: 'Faster attacks and stronger pressure' },
  { id: 'verify', mastery: 'verify', label: 'Verify', promise: 'Critical hits and richer confirmed rewards' },
  { id: 'amplify', mastery: 'relay', label: 'Relay', promise: 'Stronger skills and longer idle continuity' },
];

/**
 * Named Corruption eras — the editorial voice of the 200→1000 stretch.
 *
 * Tier is the Corruption epoch (`floor(zone / 200)`, capped at 4), so the era
 * is a property of the Route, not of one Pack: a freshly debuted clean Pack in
 * a late epoch still plays inside that era's world. Tier 0 keeps the shipped
 * Clean-signal language untouched, so every Zone 1–200 surface is unchanged.
 *
 * Names are APN-original broadcast vocabulary. They carry no third-party mark
 * and no banned display form, and `qa/check-route-journey.mjs` asserts they
 * stay present, distinct, and mark-free.
 */
export const ERAS = Object.freeze([
  Object.freeze({
    tier: 0,
    name: 'Clean Signal',
    blurb: 'Canonical Packs. Nothing is bleeding into the feed yet.',
  }),
  Object.freeze({
    tier: 1,
    name: 'Static Hour',
    blurb: 'The first noise creeps in behind the broadcast.',
  }),
  Object.freeze({
    tier: 2,
    name: 'Dead Air',
    blurb: 'The feed still runs. Nothing answers on the other end.',
  }),
  Object.freeze({
    tier: 3,
    name: 'Feed Collapse',
    blurb: 'Patchlines fold into each other and stop agreeing.',
  }),
  Object.freeze({
    tier: 4,
    name: 'Total Blackout',
    blurb: 'Maximum readable mutation. The signal is all yours to hold.',
  }),
]);

/** Post-completion continuation label promised by GAME-PACK-ROUTE. */
export const ENDLESS_ERA_NAME = 'Endless Rating';

export const ERA_MAX_TIER = ERAS.length - 1;

/** Era record for a Corruption epoch tier; always resolves (clamped 0–4). */
export function eraForTier(tier) {
  const index = Number.isFinite(tier) ? Math.min(ERA_MAX_TIER, Math.max(0, Math.floor(tier))) : 0;
  return ERAS[index];
}

export function eraNameForTier(tier) {
  return eraForTier(tier).name;
}

/**
 * Display Zones whose Gate closes one era and opens the next. This is a label
 * table only — the epoch anchor itself stays the deliberate `SIGNAL_DRIFT_ZONE`
 * literal in `js/route.js`, and nothing here touches HP, timers, or geometry.
 */
export const MILESTONE_GATE_ZONES = Object.freeze([200, 400, 600, 800, 1000]);

/** Era a milestone Gate hands the Route over to, or null for an ordinary Gate. */
export function milestoneGateEraName(displayZone) {
  const zone = Number.isFinite(displayZone) ? Math.floor(displayZone) : 0;
  if (!MILESTONE_GATE_ZONES.includes(zone)) return null;
  const tier = MILESTONE_GATE_ZONES.indexOf(zone) + 1;
  return tier > ERA_MAX_TIER ? ENDLESS_ERA_NAME : ERAS[tier].name;
}

export const ENEMY_FLAVOR = {
  stale: { label: 'Broken Link', color: '#697384', kind: 'normal' },
  rumor: { label: 'Fake Leak', color: '#A7AFBC', kind: 'normal' },
  lag: { label: 'Broken Link', color: '#3B82F6', kind: 'elite' },
  spoiler: { label: 'Fake Leak', color: '#d180ff', kind: 'elite' },
  patch: { label: 'Patch Note', color: '#FC1243', kind: 'patch' },
  event: { label: 'Event Surge', color: '#10B981', kind: 'elite' },
  boss: { label: 'Version Gate', color: '#FF2F4B', kind: 'boss' },
};

/**
 * Legacy V3 vinyl creatures — homage-original APN sentinels drawn from generated
 * atlases in assets/creatures/ (loader: js/creatures.js, stage: js/render.js).
 * Presentational layer only: game.js domain types stay untouched and no
 * existing enemy kind is removed. Complete pack-owned casts such as Valorant
 * keep their approved atlas; elsewhere creatureKindFor maps living targets:
 *  - elites (lag/spoiler/event) → The Recon / The Hotshot, per-enemy stable
 *  - boss → The Curator on odd boss-zone ordinals, classic Version Gate on even
 * The Curator mirrors the Version Gate broken-phase contract: below 34% HP its
 * base clip swaps to `broken` (wired in render.js).
 */
export const CREATURES = {
  curator: {
    kind: 'curator',
    label: 'The Curator',
    role: 'boss',
    color: '#e6b84d',
    desc: 'Gold-shaded sentinel of the feed, sniper-cane in hand. Decides which notes deserve to go live — a zone-boss variant beside the Version Gate.',
  },
  recon: {
    kind: 'recon',
    label: 'The Recon',
    role: 'elite',
    color: '#6cb8ff',
    desc: 'Whiteout scout with a bow, tracking your scroll from the cold end of the feed. Elite regular from the first zones on.',
  },
  hotshot: {
    kind: 'hotshot',
    label: 'The Hotshot',
    role: 'elite',
    color: '#FF8A3D',
    desc: 'Ember striker juggling a live fire orb. Showboat elite regular who wants your streak ended on stream.',
  },
};
export const CREATURE_KINDS = Object.freeze(Object.keys(CREATURES));

const CREATURE_ELITE_TYPES = new Set(['lag', 'spoiler', 'event']);
const CREATURE_ELITE_ROTATION = ['recon', 'hotshot'];

/** Deterministic per-enemy pick (stable across frames, like render phases). */
function creatureHash(id) {
  let h = 0;
  const s = String(id || 'e');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** 1-based count of boss zones up to `zone`; cadence stays owned by formulas. */
function bossZoneOrdinal(zone) {
  let n = 0;
  for (let z = 0; z <= zone; z += 1) if (isBossZone(z)) n += 1;
  return n;
}

/**
 * Resolve an enemy to a V3 creature kind, or null to keep the procedural
 * feed-noise family. Pure + deterministic — safe to call every frame.
 */
export function creatureKindFor(enemy, zone = 0) {
  if (!enemy) return null;
  // The first pack owns a complete, identity-approved GAF2D cast. Its pack
  // atlas must never be replaced by the legacy V3 creature rotation.
  if (enemy.packId === 'valorant') return null;
  if (enemy.type === 'boss') {
    return bossZoneOrdinal(zone) % 2 === 1 ? 'curator' : null;
  }
  if (CREATURE_ELITE_TYPES.has(enemy.type)) {
    return CREATURE_ELITE_ROTATION[creatureHash(enemy.id) % CREATURE_ELITE_ROTATION.length];
  }
  return null;
}

export const TIPS = {
  start:
    'Clear noise → Signal funds Scanner upgrades. Build spends SP. Go Live to bank Notes for permanent Rep.',
  kill: 'Upgrade Scanner each run. Spend SP directly in Scan, Verify, or Relay.',
  level: 'Rank up! Open Build and strengthen one focused branch.',
  patch: 'Notes banked. Go Live → permanent Rep → Boosts.',
  alert: 'Collect orbs for Energy and Signal. Sprint spends Energy.',
  boss: 'Final target drops gear. Kill before the timer.',
  ship: 'Go Live to bank Notes for Rep. Stuck? Improve Boosts, Gear, or Scanner.',
  combo: 'Feed streak! Bonus Signal while it holds.',
  season:
    'Checkpoint! Go Live banks Notes → Rep and grows your Live Mult. Gear and Rep Boosts stay · run power resets.',
  gear: 'Loadout: Scanner · Chest · Legs · Visor. Tap an item to compare, equip, mark, or scrap.',
};

/**
 * Patch Echo discovery lines — the APN editorial voice, spoken in-game.
 *
 * Three lines per Pack, one per Echo wave (3 / 6 / 9), keyed by Pack id and
 * indexed by Echo slot, so selection is a pure function of `(packId, index)`:
 * no RNG draw ever enters the Route/spawn/kill path. Each line riffs on that
 * Pack's own APN runtime title and genre — never on a third-party mark, place,
 * or character name — so `deniedRuntimeMarks`/`deniedRuntimeTerms` stay out of
 * runtime copy. `qa/check-echo-lines.mjs` asserts coverage, uniqueness, the
 * length cap, mark safety, and the accessor's fail-safe.
 */
export const ECHO_LINE_MAX = 90;

export const ECHO_LINES = Object.freeze({
  valorant: Object.freeze([
    'The defuse timer and the patch note argued. The patch note won by 0.4 seconds.',
    'They nerfed one pixel-perfect angle and filed it under quality-of-life.',
    'The site went quiet at last. The changelog kept talking anyway.',
  ]),
  league: Object.freeze([
    'A lane went missing for nine minutes. The notes recorded it as intended.',
    'One champion got half a percent. The feed lost an entire weekend to it.',
    'The jungle timer outlived three roadmaps and one very formal apology.',
  ]),
  fortnite: Object.freeze([
    'The storm closed on a build so tall it needed its own patch note.',
    'A season ended mid-sentence. The archive kept the sentence.',
    'Patch day deleted one ramp. Two thousand builders filed grief in the replies.',
  ]),
  'world-of-warcraft': Object.freeze([
    'A guild dissolved over a single loot roll. The notes called it social content.',
    'The raid cleared at 4 a.m. and nobody wrote it down except us.',
    'Eleven expansions in, the tank still pulls before the healer is ready.',
  ]),
  'fc-26': Object.freeze([
    'A rating dropped by one point and an entire market crashed before lunch.',
    'The pack odds were published. Nobody read them. Everybody quoted them.',
    'They patched the through-ball. The excuse for missing it survived the patch.',
  ]),
  minecraft: Object.freeze([
    'The first tree ever punched is still in the changelog, load-bearing.',
    'One block texture changed and the feed held a week of memorial posts.',
    'A world save from 2011 booted fine. The patch notes from 2011 did not.',
  ]),
  'counter-strike-2': Object.freeze([
    'A smoke behaved differently on Tuesday. No note. Just physics and vibes.',
    'The eco round became a strategy, then a meme, then a balance pass.',
    'Someone found a one-pixel gap. It got a hotfix and a small funeral.',
  ]),
  'old-school-runescape': Object.freeze([
    'A poll failed by 0.3% and the feed discussed it for six calendar years.',
    'Two hundred hours of clicking, one line in the update log. Fair trade.',
    'The drop rate was fine. The player was unlucky. Both notes are filed.',
  ]),
  'nba-2k26': Object.freeze([
    'The shot meter changed overnight and every jumper filed a formal complaint.',
    'A buzzer beater was nerfed for realism. Realism was never consulted.',
    'The badge notes ran longer than the actual playoff run.',
  ]),
  overwatch: Object.freeze([
    'The payload stopped one meter short and the feed took it personally.',
    'A support got 5% and the tank mains had a manifesto out by morning.',
    'Role queue arrived. Peace did not.',
  ]),
  'grand-theft-auto-v': Object.freeze([
    'The fifth star arrived before the getaway did. Notes: working as intended.',
    'An online heist paid twice. The hotfix took eleven days and made a legend.',
    'Twelve years of patch notes, and the radio station outlives every one.',
  ]),
  'madden-nfl-26': Object.freeze([
    'Fourth and goal, and the sim engine chose violence. Patched by Thursday.',
    'A playbook glitch became meta, then a tournament ban, then one small note.',
    'The kicker was fixed. The kicker is never fixed.',
  ]),
  'apex-legends': Object.freeze([
    'Two squads fought honestly. A third had simply read the patch notes.',
    'The loot pool rotated at 3 a.m. and nobody survived the confusion.',
    'They buffed movement by a hair. By Friday everyone could fly.',
  ]),
  'dota-2': Object.freeze([
    'One patch rewrote the whole map and landed with no press release at all.',
    'The last hit was clean. The argument about it lasted four hours.',
    'A single item moved 25 gold and the meta filed for relocation.',
  ]),
  'dead-by-daylight': Object.freeze([
    'The hook timer moved two seconds and both sides claimed betrayal.',
    'A survivor looped one corner for nine minutes. Patched, then unpatched.',
    'The hunter got a buff on Tuesday and an apology note by Thursday.',
  ]),
  'path-of-exile-2': Object.freeze([
    'The loot filter hid the best drop of the year. Working as configured.',
    'One line of passive tree notes. Nine hundred pages of community reply.',
    'Trade chat has archived itself into a language outsiders cannot read.',
  ]),
  'marvel-rivals': Object.freeze([
    'A team-up was too much fun, so the notes came for it by season two.',
    'The cape physics got a hotfix nobody asked for and everybody noticed.',
    'Patch day: one hero rose, one fell, one was quietly forgotten.',
  ]),
  'escape-from-tarkov': Object.freeze([
    'The good gear stayed in the stash for eleven wipes. It is still there.',
    'The extraction was forty meters away. The patch note was closer.',
    'Insurance returned the helmet. It did not return the six hours.',
  ]),
  'rocket-league': Object.freeze([
    'A boost pad respawned one frame late and the leaderboard felt it.',
    'The aerial was perfect, the net was not, the replay went live regardless.',
    'They tuned the ball by one percent. Every muscle memory filed a complaint.',
  ]),
  'elden-ring': Object.freeze([
    'The boss was patched for fairness. The feed took that as a personal insult.',
    'Two hundred deaths, one dodge learned, zero patch notes involved.',
    'They buffed a starter stick and the whole kingdom respec’d overnight.',
  ]),
});

/** Authored Echo lines for a Pack, or null for an unknown/absent Pack id. */
export function echoLinesFor(packId) {
  if (typeof packId !== 'string' || !Object.hasOwn(ECHO_LINES, packId)) return null;
  const lines = ECHO_LINES[packId];
  return Array.isArray(lines) && lines.length > 0 ? lines : null;
}

/** One Echo line by zero-based slot; null whenever the Pack or slot is unknown. */
export function echoLineFor(packId, index) {
  const lines = echoLinesFor(packId);
  if (!lines) return null;
  const slot = Number.isFinite(index) ? Math.floor(index) : -1;
  if (slot < 0 || slot >= lines.length) return null;
  return lines[slot];
}

/**
 * Boss flavor for the legacy V3 creature Gates only — the approved pack-owned
 * casts keep their own identity. Deterministic (creatureKindFor is pure) and
 * identity-neutral: the bio is APN-original copy already shipped in CREATURES.
 */
export function creatureBossFlavor(enemy, zone = 0) {
  const kind = creatureKindFor(enemy, zone);
  const creature = kind ? CREATURES[kind] : null;
  if (!creature || creature.role !== 'boss') return null;
  const opener = String(creature.desc || '').split('. ')[0];
  if (!opener) return null;
  return `${creature.label} · ${opener.replace(/\.$/, '')}.`;
}

export const FEED_COPY = {
  'tactical-shooter': 'Round update notes live',
  moba: 'Balance notes live',
  'battle-royale': 'Season update live',
  mmorpg: 'Hotfix notes live',
  'hero-shooter': 'Hero balance live',
  'sports-football': 'Roster update live',
  'sports-basketball': 'Season tuning live',
  'sports-driving': 'Playlist update live',
  'sandbox-survival': 'World update live',
  'open-world-action': 'Online update live',
  'action-rpg': 'Balance hotfix live',
  'asymmetric-horror': 'Trial update live',
  'extraction-shooter': 'Wipe update live',
};
