const KEY = 'apn_idle_save_v1';

export function save(s) {
  const data = {
    v: 1,
    ts: Date.now(),
    meta: s.meta,
    authority: s.authority,
    run: {
      zone: s.run.zone,
      killsInZone: s.run.killsInZone,
      bytes: s.run.bytes,
      patches: s.run.patches,
      hero: { ...s.run.hero, attackAnim: 0, hitRecoil: 0 },
    },
    ui: { tips: s.ui.tips, seasonDone: s.ui.seasonDone },
    settings: {
      reducedMotion: s.settings.reducedMotion,
      sfx: s.settings.sfx !== false,
    },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    s.settings.lastTs = data.ts;
    return true;
  } catch {
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return null;
    return d;
  } catch {
    return null;
  }
}

export function apply(s, d) {
  if (!d) return 0;
  Object.assign(s.meta, d.meta || {});
  if (d.authority) {
    s.authority.amount = d.authority.amount || 0;
    s.authority.shippedThisSeason = d.authority.shippedThisSeason || 0;
    s.authority.upgrades = { ...s.authority.upgrades, ...(d.authority.upgrades || {}) };
  }
  if (d.run) {
    s.run.zone = d.run.zone || 0;
    s.run.killsInZone = d.run.killsInZone || 0;
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
  }
  return Math.max(0, (Date.now() - (d.ts || Date.now())) / 1000);
}

export function clear() {
  localStorage.removeItem(KEY);
}
