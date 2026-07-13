/** Hub — daily / weekly objectives + season track (engagement loop) */

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t - ys) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}

/** Objective definitions — rewards use game currencies only:
 *  signal (season soft), sp, rep (permanent), coins (premium) */
export const DAILY_DEFS = [
  {
    id: 'd_kills',
    label: 'Clear feed noise',
    desc: 'Defeat enemies',
    target: 40,
    metric: 'kills',
    reward: { sp: 2, signal: 40 },
  },
  {
    id: 'd_zones',
    label: 'Push zones',
    desc: 'Advance zone progress',
    target: 4,
    metric: 'zones',
    reward: { coins: 8, signal: 60 },
  },
  {
    id: 'd_ship',
    label: 'Ship Notes',
    desc: 'Ship Notes once',
    target: 1,
    metric: 'ships',
    reward: { rep: 3, coins: 5 },
  },
  {
    id: 'd_orbs',
    label: 'Grab orbs',
    desc: 'Collect energy / Signal orbs',
    target: 12,
    metric: 'orbs',
    reward: { sp: 1, signal: 50 },
  },
];

export const WEEKLY_DEFS = [
  {
    id: 'w_boss',
    label: 'Version Gates',
    desc: 'Clear bosses',
    target: 5,
    metric: 'bosses',
    reward: { coins: 25, rep: 12 },
  },
  {
    id: 'w_notes',
    label: 'Bank Notes',
    desc: 'Notes earned this week',
    target: 40,
    metric: 'notes',
    reward: { coins: 20, sp: 4 },
  },
  {
    id: 'w_gear',
    label: 'Loot gear',
    desc: 'Gear drops this week',
    target: 3,
    metric: 'gear',
    reward: { coins: 15, signal: 120 },
  },
];

export function emptyHub() {
  return {
    dayKey: dayKey(),
    weekKey: weekKey(),
    daily: { kills: 0, zones: 0, ships: 0, orbs: 0, zoneBase: 0, claimed: {} },
    weekly: { bosses: 0, notes: 0, gear: 0, claimed: {} },
    seasonXp: 0,
    seasonClaimed: {},
  };
}

/** Roll day/week windows; preserve progress if same key */
export function ensureHub(s) {
  if (!s.meta.hub) s.meta.hub = emptyHub();
  const h = s.meta.hub;
  const dk = dayKey();
  const wk = weekKey();
  if (h.dayKey !== dk) {
    h.dayKey = dk;
    h.daily = {
      kills: 0,
      zones: 0,
      ships: 0,
      orbs: 0,
      zoneBase: s.run?.zone || 0,
      claimed: {},
    };
  }
  if (h.weekKey !== wk) {
    h.weekKey = wk;
    h.weekly = { bosses: 0, notes: 0, gear: 0, claimed: {} };
  }
  if (h.daily.zoneBase == null) h.daily.zoneBase = s.run?.zone || 0;
  return h;
}

export function hubProgress(hub, def, period) {
  const bag = period === 'daily' ? hub.daily : hub.weekly;
  if (def.metric === 'zones') {
    return Math.min(def.target, Math.max(0, (bag.zones || 0)));
  }
  return Math.min(def.target, bag[def.metric] || 0);
}

export function hubDone(hub, def, period) {
  return hubProgress(hub, def, period) >= def.target;
}

export function hubClaimed(hub, def, period) {
  const bag = period === 'daily' ? hub.daily : hub.weekly;
  return !!bag.claimed[def.id];
}

/** Track events from game loop */
export function hubOnKill(s, e) {
  const h = ensureHub(s);
  h.daily.kills = (h.daily.kills || 0) + 1;
  if (e.type === 'boss') h.weekly.bosses = (h.weekly.bosses || 0) + 1;
  if (e.type === 'patch' || e.type === 'boss') {
    // notes estimated in onKill after patches added — call hubOnNotes separately
  }
  // zone advances tracked via hubOnZone
  h.seasonXp = (h.seasonXp || 0) + (e.type === 'boss' ? 25 : e.type === 'patch' ? 8 : 2);
}

export function hubOnZone(s) {
  const h = ensureHub(s);
  const advanced = Math.max(0, s.run.zone - (h.daily.zoneBase || 0));
  h.daily.zones = advanced;
  h.seasonXp = (h.seasonXp || 0) + 12;
}

export function hubOnShip(s, notesShipped) {
  const h = ensureHub(s);
  h.daily.ships = (h.daily.ships || 0) + 1;
  h.weekly.notes = (h.weekly.notes || 0) + Math.max(0, notesShipped | 0);
  h.seasonXp = (h.seasonXp || 0) + 15;
}

export function hubOnOrb(s) {
  const h = ensureHub(s);
  h.daily.orbs = (h.daily.orbs || 0) + 1;
}

export function hubOnGear(s) {
  const h = ensureHub(s);
  h.weekly.gear = (h.weekly.gear || 0) + 1;
  h.seasonXp = (h.seasonXp || 0) + 20;
}

/** Season track levels — long drip of cosmetics-feel rewards */
export function seasonLevel(xp) {
  let lv = 1;
  let need = 100;
  let rem = xp | 0;
  while (rem >= need && lv < 99) {
    rem -= need;
    lv += 1;
    need = Math.floor(100 * 1.12 ** Math.min(lv, 40));
  }
  return { level: lv, into: rem, need };
}

export const SEASON_MILESTONES = [
  { lv: 5, reward: { coins: 10, signal: 80 }, label: '5' },
  { lv: 10, reward: { coins: 20, sp: 3 }, label: '10' },
  { lv: 15, reward: { coins: 25, rep: 8 }, label: '15' },
  { lv: 20, reward: { coins: 40, sp: 5 }, label: '20' },
  { lv: 30, reward: { coins: 60, rep: 15 }, label: '30' },
  { lv: 40, reward: { coins: 80, sp: 8 }, label: '40' },
];

/** Human reward chips — never show legacy "bytes" */
export function formatReward(reward) {
  if (!reward) return [];
  const out = [];
  const n = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v));
  if (reward.signal || reward.bytes) out.push({ k: 'sig', v: `+${n(reward.signal || reward.bytes)}` });
  if (reward.sp) out.push({ k: 'sp', v: `+${reward.sp}` });
  if (reward.rep || reward.authority) out.push({ k: 'rep', v: `+${n(reward.rep || reward.authority)}` });
  if (reward.coins) out.push({ k: 'coin', v: `+${reward.coins}` });
  if (reward.patches) out.push({ k: 'notes', v: `+${n(reward.patches)}` });
  return out;
}

export function formatRewardText(reward) {
  return formatReward(reward)
    .map((r) => `${r.v} ${r.k === 'coin' ? 'coins' : r.k}`)
    .join(' · ');
}

/** Apply claim rewards onto state (signal → run.bytes, rep → authority) */
export function applyReward(s, reward) {
  if (!reward) return;
  if (reward.sp) s.run.hero.sp += reward.sp;
  const sig = (reward.signal || 0) + (reward.bytes || 0);
  if (sig) s.run.bytes += sig;
  const rep = (reward.rep || 0) + (reward.authority || 0);
  if (rep) s.authority.amount += rep;
  if (reward.coins) {
    if (!s.meta.premium) s.meta.premium = { pro: false, coins: 0, boostEndsAt: 0 };
    s.meta.premium.coins += reward.coins;
  }
  if (reward.patches) s.run.patches += reward.patches;
}
