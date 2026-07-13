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
  scan: { label: 'Damage', sub: '+weapon power', accent: '#fc1243' },
  verify: { label: 'Crit', sub: '+crit chance', accent: '#e6b84d' },
  amplify: { label: 'Utility', sub: '+skills & mana', accent: '#5eb0ff' },
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
  },
  xp_global: {
    id: 'xp_global',
    name: 'Bonus XP',
    desc: '+6% all Rank XP',
    base: 5,
    growth: 1.42,
    per: 0.06,
  },
  signal_power: {
    id: 'signal_power',
    name: 'Signal Power',
    desc: '+5% damage · stacks with Live & Pro',
    base: 8,
    growth: 1.48,
    per: 0.05,
  },
  feed_speed: {
    id: 'feed_speed',
    name: 'Move Speed',
    desc: '+3% march speed',
    base: 10,
    growth: 1.5,
    per: 0.03,
  },
  byte_gain: {
    id: 'byte_gain',
    name: 'More Signal',
    desc: '+5% Signal from kills',
    base: 6,
    growth: 1.38,
    per: 0.05,
  },
  patch_gain: {
    id: 'patch_gain',
    name: 'More Notes',
    desc: '+7% Notes from red Patch Notes',
    base: 9,
    growth: 1.45,
    per: 0.07,
  },
  cold_start: {
    id: 'cold_start',
    name: 'Flat Damage',
    desc: '+3 flat damage · strong early',
    base: 12,
    growth: 1.65,
    per: 3,
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
  kill: 'Upgrade Signal each season. Put SP into Damage / Crit / Utility, then unlock skills.',
  level: 'Rank up! Open Build — attributes first, then skills in that tree.',
  patch: 'Notes banked. Ship → permanent Rep → Boosts.',
  alert: 'Hover orbs for energy and Signal. Sprint burns energy.',
  boss: 'Version Gate drops gear and coins. Kill before the timer.',
  ship: 'Ship Notes for Rep. Stuck? Boosts + Gear + Signal upgrade.',
  combo: 'Feed streak! Bonus Signal while it holds.',
  season:
    'Checkpoint! Ship Notes, End Season: +Live Mult · Gear, Boosts & Pro stay · Signal Lv resets.',
  gear: 'Gear is permanent. Open Gear in the bottom nav anytime.',
  premium: 'APN Pro is optional permanent mult. 2× Boost spends coins (earn from bosses).',
};

export const TICKER_ITEMS = [
  { icon: 'valorant', color: '#ff4655', name: 'Valorant', kind: 'patch', text: 'Agent update notes live' },
  { icon: 'league', color: '#c8aa6e', name: 'League', kind: 'patch', text: '14.x balance patch' },
  { icon: 'wow', color: '#00aeff', name: 'WoW', kind: 'patch', text: 'Hotfixes this week' },
  { icon: 'ffxiv', color: '#1e90ff', name: 'FFXIV', kind: 'news', text: 'Live letter summary' },
  { icon: 'apex', color: '#da292a', name: 'Apex', kind: 'event', text: 'Ranked split event' },
  { icon: 'cs2', color: '#de9b35', name: 'CS2', kind: 'patch', text: 'Skin + map notes' },
  { icon: 'genshin', color: '#4cc2f1', name: 'Genshin', kind: 'guide', text: 'Banner guide refresh' },
  { icon: 'poe', color: '#af6025', name: 'Path of Exile', kind: 'patch', text: 'League patch preview' },
  { icon: 'diablo', color: '#c41e3a', name: 'Diablo IV', kind: 'patch', text: 'Seasonal hotfix' },
  { icon: 'r6', color: '#2a6ebb', name: 'R6 Siege', kind: 'video', text: 'Operator reveal' },
  { icon: 'overwatch', color: '#f99e1a', name: 'Overwatch 2', kind: 'patch', text: 'Hero balance' },
  { icon: 'fortnite', color: '#9d4dbb', name: 'Fortnite', kind: 'event', text: 'Season countdown' },
  { icon: 'starrail', color: '#4a6cf7', name: 'Star Rail', kind: 'guide', text: 'MoC clear guide' },
  { icon: 'tft', color: '#0ac8b9', name: 'TFT', kind: 'patch', text: 'Set mid-patch' },
  { icon: 'steam', color: '#1b2838', name: 'Steam', kind: 'news', text: 'Sale + major updates' },
  { icon: 'apn', color: '#fc1243', name: 'APN', kind: 'news', text: "Every game's notes, one feed" },
];
