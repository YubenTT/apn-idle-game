/** APN Idle content — skills, boosts, premium, tips */

export const SEASON = {
  id: 'season_01',
  name: 'Launch Week Feed',
  zones: 20,
};

/** Attributes (SP bank) */
export const ATTR_LABEL = {
  scan: 'Damage',
  verify: 'Crit',
  amplify: 'Utility',
};

export const ATTR_META = {
  scan: { label: 'Damage', sub: 'Raises weapon power' },
  verify: { label: 'Crit', sub: 'Raises crit chance' },
  amplify: { label: 'Utility', sub: 'Raises skill resources' },
};

/** Permanent Rep boosts — survive End Season */
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
    desc: '+5% damage · stacks with Live & Pro',
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
    valueCue: 'More Weapon upgrades',
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
    valueCue: 'More Notes to ship',
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
 * Three clear trees matching attributes. All stackable.
 * Unlock by putting SP into the matching attribute first.
 */
/**
 * Skills — stackable, no masks.
 * max is soft ceiling; SP cost rises every 5 ranks for long-session sink.
 */
export const SKILLS = {
  hotfix: {
    id: 'hotfix',
    tree: 'scan',
    name: 'Burst Hit',
    short: 'Burst',
    max: 20,
    req: { scan: 1 },
    type: 'active',
    desc: 'Heavy hit on the nearest enemy. Costs mana.',
  },
  scroll_speed: {
    id: 'scroll_speed',
    tree: 'scan',
    name: 'Attack Speed',
    short: 'Speed',
    max: 20,
    req: { scan: 3 },
    type: 'passive',
    desc: 'Faster auto-attacks and cheaper Sprint.',
  },
  live_tracker: {
    id: 'live_tracker',
    tree: 'scan',
    name: 'Damage Ramp',
    short: 'Ramp',
    max: 25,
    req: { scan: 5 },
    type: 'toggle',
    desc: 'Damage ramps while you keep fighting. Strong on bosses.',
  },
  notify: {
    id: 'notify',
    tree: 'verify',
    name: 'Extra Orbs',
    short: 'Orbs',
    max: 15,
    req: { verify: 1 },
    type: 'passive',
    desc: 'More energy/Signal orbs, better pickups.',
  },
  summary_burst: {
    id: 'summary_burst',
    tree: 'verify',
    name: 'Area Blast',
    short: 'Area',
    max: 15,
    req: { verify: 3 },
    type: 'active',
    desc: 'Brief AoE damage + better orb rewards.',
  },
  sharp_eye: {
    id: 'sharp_eye',
    tree: 'verify',
    name: 'Sharp Eye',
    short: 'Crit+',
    max: 20,
    req: { verify: 5 },
    type: 'passive',
    desc: '+1.5% crit chance per rank (stacks with Crit attr).',
  },
  deep_dive: {
    id: 'deep_dive',
    tree: 'amplify',
    name: 'Overdrive',
    short: 'Overdrive',
    max: 20,
    req: { amplify: 1 },
    type: 'toggle',
    desc: 'Big damage boost while active. Drains energy — grab orbs.',
  },
  amplify: {
    id: 'amplify',
    tree: 'amplify',
    name: 'Skill Power',
    short: 'Power',
    max: 20,
    req: { amplify: 3 },
    type: 'passive',
    desc: 'Actives, Ramp, and Overdrive hit harder.',
  },
  marathon: {
    id: 'marathon',
    tree: 'amplify',
    name: 'Marathon',
    short: 'Stamina',
    max: 15,
    req: { amplify: 5 },
    type: 'passive',
    desc: '+energy regen and lower Sprint drain.',
  },
};

/** SP cost to raise a skill from current level → next (scalable sink) */
export function skillSpCost(currentLv) {
  return 1 + Math.floor(Math.max(0, currentLv) / 5);
}

/** Tree section order for Build UI */
export const SKILL_TREES = [
  { id: 'scan', label: 'Damage skills', attr: 'scan' },
  { id: 'verify', label: 'Crit skills', attr: 'verify' },
  { id: 'amplify', label: 'Utility skills', attr: 'amplify' },
];

/** Next skill gate for an attribute; presentation reads the same source as unlock rules. */
export function nextSkillUnlock(attr, currentLevel) {
  const level = Math.max(0, Number(currentLevel) || 0);
  return Object.values(SKILLS)
    .filter((skill) => skill.tree === attr && Number(skill.req?.[attr] || 0) > level)
    .sort((a, b) => Number(a.req?.[attr] || 0) - Number(b.req?.[attr] || 0))[0] || null;
}

/**
 * Premium / monetization catalog (structure ready for real IAP).
 * Free path is complete; Pro & boosts are optional power/convenience.
 */
export const PREMIUM = {
  pro: {
    id: 'pro',
    name: 'APN Pro',
    priceLabel: 'One-time',
    mult: 1.25,
    benefits: [
      '×1.25 damage, Signal & Notes forever',
      'Auto-Sprint included (no hold)',
      'Better offline gains',
      'Pro badge',
    ],
  },
  /** Convenience — was free “Endless Sprint” mask; now Pro / coin unlock */
  auto_sprint: {
    id: 'auto_sprint',
    name: 'Auto-Sprint',
    coinCost: 80,
    desc: 'Sprint stays on without holding. Still drains energy.',
  },
  boost_2x: {
    id: 'boost_2x',
    name: '2× Boost',
    minutes: 30,
    mult: 2,
    coinCost: 40,
    desc: '2× damage, Signal & Notes for 30 minutes.',
  },
  /** Skip-ahead: runs offline sim for N seconds (not free endless power) */
  time_warp: {
    id: 'time_warp',
    name: 'Time Warp +1h',
    seconds: 3600,
    coinCost: 30,
    desc: 'Fast-forward 1 hour of idle progress. Once every few minutes.',
  },
  packs: [
    { id: 'coins_100', coins: 100, priceLabel: 'Starter', tag: null },
    { id: 'coins_500', coins: 500, priceLabel: 'Bundle', tag: 'Best' },
  ],
  /**
   * Premium gear boxes — coin sink that fills the 6-slot loadout.
   * Free path still gets boss/elite drops; boxes are optional power.
   */
  boxes: [
    {
      id: 'box_signal',
      name: 'Signal Crate',
      coinCost: 25,
      luck: 1.25,
      rolls: 1,
      preferEmpty: true,
      desc: '1 random piece. Fills empty slots first.',
    },
    {
      id: 'box_rare',
      name: 'Rare Bundle',
      coinCost: 70,
      luck: 1.9,
      minRarity: 'green',
      rolls: 1,
      preferEmpty: true,
      desc: '1 piece · Uncommon+ bias. Solid slot filler.',
    },
    {
      id: 'box_epic',
      name: 'Epic Cache',
      coinCost: 160,
      luck: 2.7,
      minRarity: 'blue',
      rolls: 1,
      preferEmpty: false,
      desc: '1 piece · Rare+ bias · Unique chance.',
    },
    {
      id: 'box_loadout',
      name: 'Loadout Box',
      coinCost: 110,
      luck: 1.55,
      rolls: 2,
      preferEmpty: true,
      desc: '2 pieces · prioritizes empty slots.',
    },
  ],
  coinsPerBoss: 3,
  coinsPerShip: 1,
  coinsPerSeason: 15,
};

export const ENEMY_FLAVOR = {
  stale: { label: 'Stale Post', color: '#697384', kind: 'normal' },
  rumor: { label: 'Fake Leak', color: '#A7AFBC', kind: 'normal' },
  lag: { label: 'Broken Link', color: '#3B82F6', kind: 'elite' },
  spoiler: { label: 'Spoiler', color: '#d180ff', kind: 'elite' },
  patch: { label: 'Patch Note', color: '#FC1243', kind: 'patch' },
  event: { label: 'Event Spam', color: '#10B981', kind: 'elite' },
  boss: { label: 'Version Gate', color: '#FF2F4B', kind: 'boss' },
};

export const TIPS = {
  start:
    'Clear noise → Signal upgrades + Build SP. Red Notes → Ship for Rep. Bosses drop permanent Gear.',
  kill: 'Upgrade Weapon each season. Put SP into Damage / Crit / Utility, then unlock skills.',
  level: 'Rank up! Open Build — attributes first, then skills in that tree.',
  patch: 'Notes banked. Ship → permanent Rep → Boosts.',
  alert: 'Hover orbs for energy and Signal. Sprint burns energy.',
  boss: 'Version Gate drops gear and coins. Kill before the timer.',
  ship: 'Ship Notes for Rep. Stuck? Boosts + Gear + Signal upgrade.',
  combo: 'Feed streak! Bonus Signal while it holds.',
  season:
    'Checkpoint! Ship Notes, End Season: +Live Mult · Gear, Boosts & Pro stay · Signal Lv resets.',
  gear: 'Loadout: Weapon · Chest · Legs · Visor. Tap stats · Hold sell junk for Signal. Boxes in Menu.',
  premium: 'APN Pro optional. Coins → Boosts & Gear Boxes. Free drops still fill the loadout.',
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
