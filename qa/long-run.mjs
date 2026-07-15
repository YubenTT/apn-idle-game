import { createState, simulateOffline } from '../js/game.js';
import {
  C,
  routeEnemyHp,
  routeKillsNeeded,
  offlineRouteBudget,
  scannerDamage,
  isBossZone,
} from '../js/formulas.js';

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
for (let zone = 0; zone <= 1000; zone++) {
  const paceScanner = Math.floor((zone % C.SEASON_ZONES) * C.ENEMY_PACE_SCANNER);
  const hp = routeEnemyHp(zone, paceScanner, 1, Math.min(4, Math.floor(zone / 200)));
  const hits = hp / scannerDamage(paceScanner);
  assert(Number.isFinite(hp) && hp > 0, `finite HP at Zone ${zone + 1}`);
  assert(routeKillsNeeded(zone) >= 1, `finite kill count at Zone ${zone + 1}`);
  assert(hits > 1, `on-curve target is not one-frame at Zone ${zone + 1}`);
  if (isBossZone(zone)) bossCount += 1;
}
assert(bossCount === 100, 'boss cadence remains every ten zones through Zone 1000');

console.log('OK offline season boundary');
console.log('OK deterministic offline recap');
console.log('OK deterministic save-relevant state');
console.log('OK finite Zone 1000 profile');
console.log('LONG RUN PASS');
