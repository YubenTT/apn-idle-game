/** APN Idle content — skills, permanent Boosts, tips */

import { skillSpCost as buildSkillSpCost, isBossZone } from './formulas.js?v=golive-pr5';

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
 * V3 vinyl creatures — homage-original APN sentinels drawn from the generated
 * atlases in assets/creatures/ (loader: js/creatures.js, stage: js/render.js).
 * Presentational layer only: game.js domain types stay untouched and no
 * existing enemy kind is removed — creatureKindFor maps living targets onto
 * these kinds so the first zones rotate them in:
 *  - elites (lag/spoiler/event) → The Recon / The Hotshot, per-enemy stable
 *  - boss → The Curator on odd boss-zone ordinals (the FIRST boss zone
 *    included), classic Version Gate on even ones
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
  boss: 'Version Gate drops gear. Kill before the timer.',
  ship: 'Go Live to bank Notes for Rep. Stuck? Improve Boosts, Gear, or Scanner.',
  combo: 'Feed streak! Bonus Signal while it holds.',
  season:
    'Checkpoint! Go Live banks Notes → Rep and grows your Live Mult. Gear and Rep Boosts stay · run power resets.',
  gear: 'Loadout: Scanner · Chest · Legs · Visor. Tap an item to compare, equip, mark, or scrap.',
};

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
