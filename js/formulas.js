/** APN Idle — balance (1-enemy queue, multi-hit combat, addictive progress) */

export const C = {
  FIXED_DT: 1 / 60,

  // --- Combat base ---
  BASE_DAMAGE: 12,
  ATTACK_INTERVAL: 0.42,
  MOVE_SPEED: 100,

  // Sprint = real game speed-up (time scale) + combat juice
  SPRINT_TIME: 1.85, // multiplies sim dt while sprinting
  SPRINT_MULT: 1.35, // extra march (on top of time scale)
  SPRINT_ATK: 1.2, // extra attack-speed on top of time scale
  SPRINT_DMG: 1.08,
  SPRINT_DRAIN: 14, // per real-second feel (drains faster under time scale)
  SPRINT_SPAWN: 0.55, // spawn CD mult while sprinting

  ENERGY_MAX: 100,
  ENERGY_REGEN: 9,
  FOCUS_MAX: 60,
  FOCUS_REGEN: 1.3,
  CRIT_MULT: 2.0,
  XP_BASE: 16,
  XP_GROWTH: 1.26,
  BYTE_BASE: 3,

  // Weapon (run-only — resets on End Season)
  SCANNER_COST_BASE: 14,
  SCANNER_COST_GROWTH: 1.22, // steep sink → always something to buy
  SCANNER_DMG_GROWTH: 1.085, // soft so zone HP stays multi-hit

  // HP tracks pace weapon so multi-hit stays true without brick walls
  ENEMY_HP_BASE: 40,
  /** Pace scanner ≈ local season zone * this (weapon resets every season) */
  ENEMY_PACE_SCANNER: 0.9,
  /** Hits-to-kill at pace weapon (before attrs/boosts/live) */
  // Slightly snappier early, still multi-hit mid/late at pace
  ENEMY_HITS_BASE: 10.5,
  ENEMY_HITS_PER_ZONE: 0.75,
  /** Extra budget for attrs / skills / gear beyond bare weapon */
  ENEMY_POWER_BUDGET: 1.45,
  ENEMY_HP_STEP_EVERY: 5,
  ENEMY_HP_STEP_BONUS: 0.035,

  ZONE_KILLS: 10,
  ZONE_KILLS_PER5: 5,
  BOSS_HP_MULT: 9,
  BOSS_TIMER: 50,
  CHAMPION_CHANCE: 0.14,
  ELITE_CHANCE: 0.1,
  PATCH_FROM_CHAMP: 1,
  PATCH_FROM_BOSS: 4,
  SHIP_RATE: 1,
  OFFLINE_CAP: 8 * 3600,
  IDLE_EFF: 0.88,
  ALERT_INTERVAL: 3.2,
  SP_PER_LEVEL: 3,
  SEASON_ZONES: 20,
  /** First Go Live checkpoint lands early (tutorial prestige), then every SEASON_ZONES. */
  FIRST_GO_LIVE_ZONE: 10,
  /** Stop distance from hero center — keep enemies clearly separate (not “worn”) */
  MELEE_RANGE: 86,
  HIT_FLASH: 0.12,
  MAX_ENEMIES: 1,
  SPAWN_CD_MIN: 0.45,
  SPAWN_CD_MAX: 0.8,
};

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeOutQuad = (t) => 1 - (1 - t) ** 2;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function scannerCost(level) {
  return Math.floor(C.SCANNER_COST_BASE * C.SCANNER_COST_GROWTH ** level);
}

/**
 * Weapon damage for a scanner level.
 * Soft diminishing returns after Lv 25 so infinite Signal can't delete zones.
 */
export function scannerDamage(level, flat = 0) {
  const lv = Math.max(0, level | 0);
  let mult = 1;
  // first 25 levels: full growth; then soft; then very soft
  for (let i = 0; i < lv; i++) {
    if (i < 25) mult *= C.SCANNER_DMG_GROWTH;
    else if (i < 50) mult *= 1 + (C.SCANNER_DMG_GROWTH - 1) * 0.55;
    else mult *= 1 + (C.SCANNER_DMG_GROWTH - 1) * 0.28;
  }
  return (C.BASE_DAMAGE + flat) * mult;
}

export function xpToNext(level) {
  return Math.floor(40 * C.XP_GROWTH ** (level - 1));
}

/**
 * Enemy HP tracks the weapon curve so:
 * - Pace weapon (≈0.9× zone) → several hits (progress feels real)
 * - Lagging weapon → slog (upgrade dependency)
 * - Ahead weapon → faster clears, still rarely true one-shots until very ahead
 * Live Mult / Boosts / attrs sit outside this budget → still matter.
 */
export function routeEnemyHp(
  zone,
  runPower = Math.floor(Math.max(0, zone | 0) * C.ENEMY_PACE_SCANNER),
  permanentMultiplier = 1,
  corruptionTier = 0,
  typeMult = 1
) {
  const z = Math.max(0, zone | 0);
  const localZone = z % C.SEASON_ZONES;
  const pace = Math.floor(localZone * C.ENEMY_PACE_SCANNER);
  const maturityHits = Math.min(55, Math.floor(z / C.SEASON_ZONES) * 10);
  const hits = C.ENEMY_HITS_BASE + localZone * C.ENEMY_HITS_PER_ZONE + maturityHits;
  const step =
    1 + C.ENEMY_HP_STEP_BONUS * Math.floor(localZone / C.ENEMY_HP_STEP_EVERY);
  const raw = scannerDamage(pace) * C.ENEMY_POWER_BUDGET * hits * step;
  const catchUp = 1 - Math.min(0.25, Math.max(0, pace - Math.max(0, runPower)) * 0.01);
  const permanentBudget = Math.min(14, Math.max(1, permanentMultiplier) ** 0.9);
  const corruptionBudget = 1 + 0.18 * Math.min(4, Math.max(0, corruptionTier | 0));
  return Math.floor(
    Math.max(C.ENEMY_HP_BASE, raw) * catchUp * permanentBudget * corruptionBudget * typeMult
  );
}

/** Compatibility wrapper for existing callers and external headless checks. */
export function enemyHp(zone, typeMult = 1) {
  const pace = Math.floor(
    (Math.max(0, zone | 0) % C.SEASON_ZONES) * C.ENEMY_PACE_SCANNER
  );
  return routeEnemyHp(zone, pace, 1, 0, typeMult);
}

/** Expected hits for a raw weapon level (debug / tests). */
export function expectedHits(zone, scannerLevel = 0, flat = 0) {
  const hp = enemyHp(zone);
  const dmg = scannerDamage(scannerLevel, flat);
  return hp / Math.max(1, dmg);
}

export function killsNeeded(zone) {
  if (isBossZone(zone)) return 1;
  const bonus = Math.min(10, C.ZONE_KILLS_PER5 * Math.floor(zone / 5));
  return C.ZONE_KILLS + bonus;
}

export const routeKillsNeeded = (zone) => killsNeeded(zone);

export function offlineRouteBudget(routeZone, seconds) {
  const zone = Math.max(0, routeZone | 0);
  return {
    seconds: Math.min(Math.max(0, Number(seconds) || 0), C.OFFLINE_CAP),
    boundary: (Math.floor(zone / C.SEASON_ZONES) + 1) * C.SEASON_ZONES,
  };
}

export function isBossZone(zone) {
  return (zone + 1) % 10 === 0;
}

export function zoneDisplay(zone) {
  return (zone | 0) + 1;
}

export function seasonFromZone(zone) {
  return Math.floor((zone | 0) / C.SEASON_ZONES) + 1;
}

export function isSeasonCheckpoint(zoneAfterAdvance) {
  return zoneAfterAdvance > 0 && zoneAfterAdvance % C.SEASON_ZONES === 0;
}

/**
 * Go Live checkpoint boundaries (ADR-0008): first at FIRST_GO_LIVE_ZONE (10),
 * then every SEASON_ZONES (20) → 10, 30, 50, 70, …
 */
export function isGoLiveBoundary(zone) {
  const z = zone | 0;
  return z >= C.FIRST_GO_LIVE_ZONE && (z - C.FIRST_GO_LIVE_ZONE) % C.SEASON_ZONES === 0;
}

/** Most recent Go Live boundary at or below `zone` (0 when none reached yet). */
export function goLiveBoundaryAtOrBelow(zone) {
  const z = zone | 0;
  if (z < C.FIRST_GO_LIVE_ZONE) return 0;
  return C.FIRST_GO_LIVE_ZONE + Math.floor((z - C.FIRST_GO_LIVE_ZONE) / C.SEASON_ZONES) * C.SEASON_ZONES;
}

/** Next Go Live boundary strictly above `zone`. */
export function nextGoLiveBoundary(zone) {
  const z = zone | 0;
  if (z < C.FIRST_GO_LIVE_ZONE) return C.FIRST_GO_LIVE_ZONE;
  return goLiveBoundaryAtOrBelow(z) + C.SEASON_ZONES;
}

export function typeHpMult(type) {
  if (type === 'boss') return C.BOSS_HP_MULT;
  if (type === 'patch') return 2.4;
  if (type === 'lag' || type === 'spoiler' || type === 'event') return 1.75;
  return 1;
}

/** Prestige Live Mult gain from Notes shipped this season (Rep banked). */
export function liveGain(shippedThisSeason) {
  return 0.05 * Math.log2(1 + shippedThisSeason / 60);
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
