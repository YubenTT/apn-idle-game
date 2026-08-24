import { createState, simulateOffline } from '../js/game.js';
import {
  C,
  routeEnemyHp,
  routeKillsNeeded,
  offlineRouteBudget,
  scannerDamage,
  isBossZone,
  typeHpMult,
} from '../js/formulas.js';
import { GAME_PACKS } from '../js/generated/game-packs.js';
import {
  PATCHLINE_COMPLETE_ZONE,
  createRouteState,
  normalizeRoute,
  recordRouteZoneClear,
} from '../js/route.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Long run: ${message}`);
};

function installSeed(seed = 0x41504e) {
  let state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seededProgressState() {
  const state = createState();
  state.route.zone = 93;
  state.run.hero.scanner = 20;
  state.run.hero.scan = 12;
  state.settings.sfx = false;
  return state;
}

installSeed();
const stateA = seededProgressState();
const summaryA = simulateOffline(stateA, 8 * 3600);
assert(stateA.route.zone === 100, `offline stops at Zone 100 season boundary (got ${stateA.route.zone})`);
assert(summaryA.zones === 7, 'offline reports seven bounded zones');
assert(summaryA.overflowSeconds > 0, 'offline reports overflow time');
assert(summaryA.stoppedAtSeasonBoundary === true, 'offline boundary flag');
assert(stateA.route.echoProgressByPack.overwatch?.found === 3, 'offline Pack progress records all three Echoes');
assert(
  stateA.route.history[0]?.packId === 'overwatch' &&
    stateA.route.history[0]?.completedAtZone === 100,
  'offline Gate clear records exact Pack history',
);

installSeed();
const stateB = seededProgressState();
const summaryB = simulateOffline(stateB, 8 * 3600);
assert(JSON.stringify(summaryA) === JSON.stringify(summaryB), 'offline recap deterministic');
const stableSnapshot = (state) => ({
  route: state.route,
  run: {
    bytes: state.run.bytes,
    patches: state.run.patches,
    hero: state.run.hero,
  },
  kills: state.meta.kills,
  bosses: state.meta.bosses,
});
assert(
  JSON.stringify(stableSnapshot(stateA)) === JSON.stringify(stableSnapshot(stateB)),
  'save-relevant offline state deterministic'
);

const budget = offlineRouteBudget(93, 8 * 3600);
assert(budget.boundary === 100, 'budget chooses next End Season');
assert(budget.seconds === C.OFFLINE_CAP, 'budget respects offline cap');

let bossCount = 0;
let minimumOrdinaryHits = Number.POSITIVE_INFINITY;
let maximumOrdinaryHits = 0;
let maximumBossHits = 0;
let maximumKills = 0;
let maximumCombatSeconds = 0;
let totalCombatSeconds = 0;
for (let zone = 0; zone < 1000; zone++) {
  const paceScanner = Math.floor((zone % C.SEASON_ZONES) * C.ENEMY_PACE_SCANNER);
  const boss = isBossZone(zone);
  const hp = routeEnemyHp(
    zone,
    paceScanner,
    1,
    Math.min(4, Math.floor(zone / 200)),
    typeHpMult(boss ? 'boss' : 'normal'),
  );
  const hits = hp / scannerDamage(paceScanner);
  const kills = routeKillsNeeded(zone);
  const combatSeconds = hits * kills * C.ATTACK_INTERVAL;
  assert(Number.isFinite(hp) && hp > 0, `finite HP at Zone ${zone + 1}`);
  assert(kills >= 1, `positive kill count at Zone ${zone + 1}`);
  if (boss) {
    maximumBossHits = Math.max(maximumBossHits, hits);
    bossCount += 1;
  } else {
    minimumOrdinaryHits = Math.min(minimumOrdinaryHits, hits);
    maximumOrdinaryHits = Math.max(maximumOrdinaryHits, hits);
  }
  maximumKills = Math.max(maximumKills, kills);
  maximumCombatSeconds = Math.max(maximumCombatSeconds, combatSeconds);
  totalCombatSeconds += combatSeconds;
}
assert(minimumOrdinaryHits > 1, 'ordinary targets remain multi-frame through Zone 1000');
assert(maximumOrdinaryHits <= 220, 'ordinary on-curve hits stay at or below 220');
assert(maximumBossHits <= 2000, 'Gate on-curve hits stay at or below 2000');
assert(maximumKills <= 20, 'per-zone kill count stays at or below 20');
assert(maximumCombatSeconds / 60 <= 31, 'per-zone on-curve combat stays at or below 31 minutes');
assert(totalCombatSeconds / 3600 <= 325, 'Zone-1000 on-curve combat budget stays at or below 325 hours');
assert(bossCount === 100, 'boss cadence remains every ten zones through Zone 1000');

// The stated ending is pinned to the same Gate the cadence above counts: the
// 100th Gate is cleared at route zone 999, and clearing it is what mints the
// one-time Patchline Complete record.
const finalGateZone = PATCHLINE_COMPLETE_ZONE - 1;
assert(isBossZone(finalGateZone), 'Zone 1000 is a Gate zone');
const beforeFinalGate = normalizeRoute({ ...createRouteState(), zone: finalGateZone });
assert(
  beforeFinalGate.patchlineCompleted === false,
  'Patchline Complete is unearned while the 100th Gate stands',
);
const finalGate = recordRouteZoneClear(beforeFinalGate, GAME_PACKS, finalGateZone);
assert(
  finalGate.patchline?.atZone === PATCHLINE_COMPLETE_ZONE &&
    finalGate.route.patchlineCompleted === true,
  'clearing the 100th Gate mints Patchline Complete exactly at Zone 1000',
);
assert(
  recordRouteZoneClear(finalGate.route, GAME_PACKS, finalGate.route.zone).patchline === null,
  'Endless Rating play never re-mints the completion record',
);

console.log('OK offline two-Pack safety boundary');
console.log('OK offline Echo and Pack history');
console.log('OK deterministic offline recap');
console.log('OK deterministic save-relevant state');
console.log(
  `OK bounded Zone 1000 work (${minimumOrdinaryHits.toFixed(2)} min ordinary hits · ${maximumOrdinaryHits.toFixed(2)} max ordinary · ${maximumBossHits.toFixed(2)} max Gate · ${(maximumCombatSeconds / 60).toFixed(2)} max minutes · ${(totalCombatSeconds / 3600).toFixed(2)} aggregate hours)`,
);
console.log('OK Patchline Complete pinned to the 100th Gate');
console.log('LONG RUN PASS');
