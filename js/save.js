import { normalizeGear, emptyGear, GEAR_SORTS, GEAR_FILTERS } from './loot.js?v=free-mvp-r005';
import { normalizeRoute } from './route.js?v=free-mvp-r005';
import { C } from './formulas.js?v=free-mvp-r005';

export const SAVE_KEY_V1 = 'apn_idle_save_v1';
export const SAVE_KEY_V2 = 'apn_idle_save_v2';
/** Current persisted save-schema version (Go Live checkpoint model, ADR-0008). */
export const SAVE_VERSION = 3;

export function save(s) {
  const data = {
    v: SAVE_VERSION,
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
      // The last receipt is a session/UI artifact — cross-reload idempotency
      // rides on lastGoLiveZone, so keep it out of the persisted blob.
      lastGoLive: undefined,
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
  // Write-guard: never let an older client clobber a newer save shape. A stale
  // CDN client (v2 code) loading null would otherwise overwrite a v3 save within
  // one autosave tick — refuse when the on-disk version is higher than ours.
  try {
    const existingRaw = localStorage.getItem(SAVE_KEY_V2);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw);
      if (Number.isFinite(existing?.v) && existing.v > data.v) {
        return false;
      }
    }
  } catch {
    // Corrupt/unreadable existing save → let the write proceed and heal it.
  }
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
  return (
    readVersion(SAVE_KEY_V2, 3) ||
    readVersion(SAVE_KEY_V2, 2) ||
    readVersion(SAVE_KEY_V1, 1)
  );
}

export function apply(s, d) {
  if (!d) return 0;
  s.v = SAVE_VERSION;
  s.route = normalizeRoute(d.v === 2 || d.v === 3 ? d.route : null, d.v === 1 ? d.run : null);
  Object.assign(s.meta, d.meta || {});
  // Migrate gear and preserve the retired demo-store bucket as inert data.
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
      ...d.meta.premium,
      pro: !!d.meta.premium.pro,
      coins: Number.isFinite(d.meta.premium.coins) ? d.meta.premium.coins : 0,
      boostEndsAt: Number.isFinite(d.meta.premium.boostEndsAt) ? d.meta.premium.boostEndsAt : 0,
      autoSprint: !!d.meta.premium.autoSprint,
      warpCdUntil: Number.isFinite(d.meta.premium.warpCdUntil) ? d.meta.premium.warpCdUntil : 0,
    };
  }
  if (d.meta?.hub) s.meta.hub = d.meta.hub;
  // —— Go Live migration (ADR-0008): season model → checkpoint model ——
  // The Object.assign above may have resurrected a legacy `meta.season`; fold it
  // into goLiveCount, derive the checkpoint fields, then delete `season` so it
  // can never linger as a shadow counter that drifts from goLiveCount.
  if (d.v !== 3) {
    s.meta.goLiveCount = Number.isFinite(d.meta?.season) ? d.meta.season : 0;
    s.meta.pendingGoLiveZone = 0;
    s.meta.lastGoLiveZone = 0;
    // A v2 `seasonDone` = a crossed-but-unspent 20-grid checkpoint. Honor it so
    // Go Live is available now (e.g. zone 27 → pending 20), not only at zone 40.
    if (d.ui?.seasonDone && s.route.zone > 0) {
      s.meta.pendingGoLiveZone = Math.floor(s.route.zone / C.SEASON_ZONES) * C.SEASON_ZONES;
    }
  }
  if (!Number.isFinite(s.meta.goLiveCount)) s.meta.goLiveCount = 0;
  if (!Number.isFinite(s.meta.pendingGoLiveZone)) s.meta.pendingGoLiveZone = 0;
  if (!Number.isFinite(s.meta.lastGoLiveZone)) s.meta.lastGoLiveZone = 0;
  delete s.meta.season;
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
    if (d.run.hero) {
      const hero = { ...d.run.hero };
      if (!Number.isFinite(hero.focus) && Number.isFinite(hero.mana)) hero.focus = hero.mana;
      delete hero.mana;
      Object.assign(s.run.hero, hero);
    }
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
