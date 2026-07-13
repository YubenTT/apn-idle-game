/** APN Idle — balance (tuned for 1-enemy queue, readable combat) */

export const C = {
  FIXED_DT: 1 / 60,
  BASE_DAMAGE: 14,
  ATTACK_INTERVAL: 0.4,
  MOVE_SPEED: 100,
  SPRINT_MULT: 1.9,
  SPRINT_ATK: 1.45, // attack speed while sprinting
  SPRINT_DMG: 1.1, // small damage kick while sprinting
  SPRINT_DRAIN: 16,
  ENERGY_MAX: 100,
  ENERGY_REGEN: 8,
  MANA_MAX: 60,
  MANA_REGEN: 1.3,
  CRIT_MULT: 2.0,
  XP_BASE: 16,
  XP_GROWTH: 1.26,
  BYTE_BASE: 3,
  SCANNER_COST_BASE: 12,
  SCANNER_COST_GROWTH: 1.17,
  SCANNER_DMG_GROWTH: 1.12,
  // HP scales forever, softens after Z40 so late game stays playable
  ENEMY_HP_BASE: 22,
  ENEMY_HP_ZONE: 1.088,
  ENEMY_HP_STEP_EVERY: 5,
  ENEMY_HP_STEP: 1.18,
  ENEMY_HP_SOFT_AFTER: 40,
  ENEMY_HP_SOFT_ZONE: 1.045,
  ZONE_KILLS: 5,
  ZONE_KILLS_PER5: 1,
  BOSS_HP_MULT: 7.5,
  BOSS_TIMER: 55,
  CHAMPION_CHANCE: 0.14,
  ELITE_CHANCE: 0.1,
  PATCH_FROM_CHAMP: 1,
  PATCH_FROM_BOSS: 4,
  SHIP_RATE: 1,
  OFFLINE_CAP: 8 * 3600,
  IDLE_EFF: 0.88,
  ALERT_INTERVAL: 3.5,
  SP_PER_LEVEL: 3,
  /** Prestige checkpoint length — zones continue past this */
  SEASON_ZONES: 20,
  MELEE_RANGE: 54,
  HIT_FLASH: 0.12,
  // One fight at a time — idle classic
  MAX_ENEMIES: 1,
  SPAWN_CD_MIN: 0.55,
  SPAWN_CD_MAX: 0.95,
};

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeOutQuad = (t) => 1 - (1 - t) ** 2;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function scannerCost(level) {
  return Math.floor(C.SCANNER_COST_BASE * C.SCANNER_COST_GROWTH ** level);
}

export function scannerDamage(level, flat = 0) {
  return (C.BASE_DAMAGE + flat) * C.SCANNER_DMG_GROWTH ** level;
}

export function xpToNext(level) {
  return Math.floor(40 * C.XP_GROWTH ** (level - 1));
}

export function enemyHp(zone, typeMult = 1) {
  const z = Math.max(0, zone | 0);
  const soft = C.ENEMY_HP_SOFT_AFTER;
  let growth;
  if (z <= soft) {
    growth = C.ENEMY_HP_ZONE ** z;
  } else {
    growth = C.ENEMY_HP_ZONE ** soft * C.ENEMY_HP_SOFT_ZONE ** (z - soft);
  }
  const step = Math.floor(z / C.ENEMY_HP_STEP_EVERY);
  return Math.floor(C.ENEMY_HP_BASE * growth * C.ENEMY_HP_STEP ** step * typeMult);
}

export function killsNeeded(zone) {
  if (isBossZone(zone)) return 1;
  // Cap kill requirement growth so late zones stay snappy
  const bonus = Math.min(8, C.ZONE_KILLS_PER5 * Math.floor(zone / 5));
  return C.ZONE_KILLS + bonus;
}

export function isBossZone(zone) {
  return (zone + 1) % 10 === 0;
}

/** Display zone number (1-based) */
export function zoneDisplay(zone) {
  return (zone | 0) + 1;
}

/** Season number from absolute zone (1-based seasons) */
export function seasonFromZone(zone) {
  return Math.floor((zone | 0) / C.SEASON_ZONES) + 1;
}

/** True when finishing this zone hits a prestige checkpoint */
export function isSeasonCheckpoint(zoneAfterAdvance) {
  return zoneAfterAdvance > 0 && zoneAfterAdvance % C.SEASON_ZONES === 0;
}

export function typeHpMult(type) {
  if (type === 'boss') return C.BOSS_HP_MULT;
  if (type === 'patch') return 2.2;
  if (type === 'lag' || type === 'spoiler' || type === 'event') return 1.65;
  return 1;
}

export function liveGain(totalShipped) {
  return 0.04 * Math.log2(1 + totalShipped / 80);
}

export function metaCost(base, growth, level) {
  return Math.floor(base * growth ** level);
}

export function formatNum(n) {
  if (!Number.isFinite(n)) return '0';
  const a = Math.abs(n);
  if (a < 1000) return String(Math.floor(n));
  const u = ['', 'K', 'M', 'B', 'T'];
  let i = 0;
  let v = n;
  while (Math.abs(v) >= 1000 && i < u.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)}${u[i]}`;
}
