/** APN Idle content — plain-language names + comedy */

/** Season length = prestige checkpoint (zones continue forever) */
export const SEASON = {
  id: 'season_01',
  name: 'Launch Week Feed',
  zones: 20,
};

/** Display labels for attributes (internal: scan / verify / amplify) */
export const ATTR_LABEL = {
  scan: 'Damage',
  verify: 'Crit',
  amplify: 'Skills',
};

/** Build panel — clear first-read meaning */
export const ATTR_META = {
  scan: { label: 'Damage', sub: 'weapon power', accent: '#fc1243' },
  verify: { label: 'Crit', sub: 'crit chance', accent: '#e6b84d' },
  amplify: { label: 'Skills', sub: 'skill power', accent: '#5eb0ff' },
};

export const META = {
  xp_posts: {
    id: 'xp_posts',
    name: 'Faster Ranks',
    desc: '+8% Rank XP per kill. Earn skill points sooner.',
    base: 5,
    growth: 1.42,
    per: 0.08,
  },
  xp_global: {
    id: 'xp_global',
    name: 'Bonus XP',
    desc: '+6% all Rank XP.',
    base: 5,
    growth: 1.42,
    per: 0.06,
  },
  signal_power: {
    id: 'signal_power',
    name: 'Weapon Damage',
    desc: '+5% weapon damage to all noise.',
    base: 8,
    growth: 1.48,
    per: 0.05,
  },
  feed_speed: {
    id: 'feed_speed',
    name: 'Move Speed',
    desc: '+3% march speed toward the next enemy.',
    base: 10,
    growth: 1.5,
    per: 0.03,
  },
  byte_gain: {
    id: 'byte_gain',
    name: 'More Signal',
    desc: '+5% Signal from kills.',
    base: 6,
    growth: 1.38,
    per: 0.05,
  },
  patch_gain: {
    id: 'patch_gain',
    name: 'More Notes',
    desc: '+7% Notes from red Patch Notes.',
    base: 9,
    growth: 1.45,
    per: 0.07,
  },
  cold_start: {
    id: 'cold_start',
    name: 'Flat Damage',
    desc: '+3 flat weapon damage. Strong early game.',
    base: 12,
    growth: 1.65,
    per: 3,
  },
};

export const SKILLS = {
  hotfix: {
    id: 'hotfix',
    tree: 'scan',
    name: 'Burst Hit',
    short: 'Burst',
    max: 12,
    req: { scan: 1 },
    type: 'active',
    accent: '#fc1243',
    desc: 'Instant heavy hit on the nearest enemy. Costs mana.',
  },
  live_tracker: {
    id: 'live_tracker',
    tree: 'scan',
    name: 'Damage Ramp',
    short: 'Ramp',
    max: 15,
    req: { scan: 5 },
    type: 'toggle',
    accent: '#3ecf8e',
    desc: 'Damage grows while you keep fighting. Great on bosses.',
  },
  summary_burst: {
    id: 'summary_burst',
    tree: 'verify',
    name: 'Area Blast',
    short: 'Area',
    max: 10,
    req: { verify: 1 },
    type: 'active',
    accent: '#5eb0ff',
    desc: 'Damage all nearby enemies + better orb rewards briefly.',
  },
  verified_mask: {
    id: 'verified_mask',
    tree: 'verify',
    name: 'Crit Mask',
    short: 'Crit',
    max: 1,
    req: { verify: 4 },
    type: 'mask',
    accent: '#fc1243',
    desc: 'One mask active: always crit + bonus damage.',
  },
  amplify: {
    id: 'amplify',
    tree: 'amplify',
    name: 'Skill Power',
    short: 'Power',
    max: 10,
    req: { amplify: 4 },
    type: 'passive',
    accent: '#c084fc',
    desc: 'All skills and Damage Ramp hit harder.',
  },
  deep_dive: {
    id: 'deep_dive',
    tree: 'amplify',
    name: 'Overdrive',
    short: 'Overdrive',
    max: 10,
    req: { amplify: 1 },
    type: 'toggle',
    accent: '#ff6b4a',
    desc: 'Big damage boost, drains energy. Grab orbs to sustain.',
  },
  notify: {
    id: 'notify',
    tree: 'verify',
    name: 'Extra Orbs',
    short: 'Orbs',
    max: 8,
    req: { verify: 1 },
    type: 'passive',
    accent: '#e6b84d',
    desc: 'More energy/Signal orbs spawn, better pickups.',
  },
  scroll_speed: {
    id: 'scroll_speed',
    tree: 'scan',
    name: 'Attack Speed',
    short: 'Speed',
    max: 12,
    req: { scan: 5 },
    type: 'passive',
    accent: '#5eb0ff',
    desc: 'Faster auto-attacks and cheaper sprint.',
  },
  editor_pick: {
    id: 'editor_pick',
    tree: 'amplify',
    name: 'Endless Sprint',
    short: 'Sprint',
    max: 1,
    req: { amplify: 8 },
    type: 'mask',
    accent: '#e6b84d',
    desc: 'One mask active: strong energy regen + free sprint feel.',
  },
};

/** Enemies = feed noise types */
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
  start: 'Kill noise. Grab Notes (red). Publish → Rep → Boosts. Upgrade Weapon with Signal.',
  kill: 'Spend Signal on Upgrade Weapon for more damage.',
  level: 'Rank up! Open Build — spend SP on Damage / Crit / Skills.',
  patch: 'Red Patch Notes drop Notes. Publish them for Rep.',
  alert: 'Tap glowing orbs for energy and Signal.',
  boss: 'Version Gate: kill it before the timer or it full-heals.',
  ship: 'Stuck? Publish Notes → Boosts → keep clearing.',
  combo: 'Feed streak! Bonus Signal while the streak holds.',
  season: 'Checkpoint! Publish Notes, then End Season for permanent Live Mult.',
};

/**
 * Live ticker — real icon files under assets/icons/
 */
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
