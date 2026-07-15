import { normalizeGear, emptyGear, GEAR_SORTS, GEAR_FILTERS } from './loot.js';
import { normalizeRoute } from './route.js';

export const SAVE_KEY_V1 = 'apn_idle_save_v1';
export const SAVE_KEY_V2 = 'apn_idle_save_v2';

export function save(s) {
  const data = {
    v: 2,
    ts: Date.now(),
    meta: {
      ...s.meta,
      gear: normalizeGear(s.meta.gear),
      premium: s.meta.premium || {
        pro: false,
        coins: 0,
        boostEndsAt: 0,
        autoSprint: false,
        warpCdUntil: 0,
      },
      hub: s.meta.hub || null,
    },
    authority: s.authority,
    route: normalizeRoute(s.route),
    run: {
      bytes: s.run.bytes,
      patches: s.run.patches,
      hero: { ...s.run.hero, attackAnim: 0, hitRecoil: 0 },
    },
    ui: { tips: s.ui.tips, seasonDone: s.ui.seasonDone },
    settings: {
      reducedMotion: s.settings.reducedMotion,
      sfx: s.settings.sfx !== false,
      gearSort: GEAR_SORTS.includes(s.settings.gearSort) ? s.settings.gearSort : 'power',
      gearFilter: GEAR_FILTERS.includes(s.settings.gearFilter) ? s.settings.gearFilter : 'all',
    },
  };
  try {
    localStorage.setItem(SAVE_KEY_V2, JSON.stringify(data));
    s.settings.lastTs = data.ts;
    return true;
  } catch {
    return false;
  }
}

export function load() {
  const readVersion = (key, version) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data?.v === version ? data : null;
    } catch {
      return null;
    }
  };
  return readVersion(SAVE_KEY_V2, 2) || readVersion(SAVE_KEY_V1, 1);
}

export function apply(s, d) {
  if (!d) return 0;
  s.v = 2;
  s.route = normalizeRoute(d.v === 2 ? d.route : null, d.v === 1 ? d.run : null);
  Object.assign(s.meta, d.meta || {});
  // migrate gear (armor → chest, full 6-slot) + premium
  s.meta.gear = normalizeGear(d.meta?.gear || s.meta.gear || emptyGear());
  if (!s.meta.premium) {
    s.meta.premium = {
      pro: false,
      coins: 0,
      boostEndsAt: 0,
      autoSprint: false,
      warpCdUntil: 0,
    };
  }
  if (d.meta?.premium) {
    s.meta.premium = {
      pro: !!d.meta.premium.pro,
      coins: d.meta.premium.coins || 0,
      boostEndsAt: d.meta.premium.boostEndsAt || 0,
      autoSprint: !!(d.meta.premium.autoSprint || d.meta.premium.pro),
      warpCdUntil: d.meta.premium.warpCdUntil || 0,
    };
  }
  if (d.meta?.hub) s.meta.hub = d.meta.hub;
  // strip legacy mask skills from save
  if (s.run.hero) {
    delete s.run.hero.mask;
    if (s.run.hero.skills) {
      delete s.run.hero.skills.verified_mask;
      delete s.run.hero.skills.editor_pick;
    }
  }
  if (d.authority) {
    s.authority.amount = d.authority.amount || 0;
    s.authority.shippedThisSeason = d.authority.shippedThisSeason || 0;
    s.authority.upgrades = { ...s.authority.upgrades, ...(d.authority.upgrades || {}) };
  }
  if (d.run) {
    s.run.bytes = d.run.bytes || 0;
    s.run.patches = d.run.patches || 0;
    if (d.run.hero) Object.assign(s.run.hero, d.run.hero);
  }
  if (d.ui) {
    s.ui.tips = d.ui.tips || {};
    s.ui.seasonDone = !!d.ui.seasonDone;
  }
  if (d.settings) {
    s.settings.reducedMotion = !!d.settings.reducedMotion;
    s.settings.sfx = d.settings.sfx !== false;
    s.settings.gearSort = GEAR_SORTS.includes(d.settings.gearSort) ? d.settings.gearSort : 'power';
    s.settings.gearFilter = GEAR_FILTERS.includes(d.settings.gearFilter) ? d.settings.gearFilter : 'all';
  }
  return Math.max(0, (Date.now() - (d.ts || Date.now())) / 1000);
}

export function clear() {
  localStorage.removeItem(SAVE_KEY_V2);
  localStorage.removeItem(SAVE_KEY_V1);
}
