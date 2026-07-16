import { C } from '../js/formulas.js';
import {
  allocAttr,
  buyMeta,
  buyScanner,
  createState,
  leaveSeason,
  setSprint,
  shipPatches,
  step,
} from '../js/game.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Pacing: ${message}`);
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

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

function runProfile({ checkInSeconds, sprint }) {
  installSeed();
  const state = createState();
  state.settings.sfx = false;
  let elapsed = 0;
  let seasonStartedAt = 0;
  let nextCheckIn = 0;
  let firstBossSeconds = null;
  const seasonMinutes = [];

  while (state.route.zone < 200 && elapsed < 24 * 3600) {
    if (elapsed >= nextCheckIn) {
      while (buyScanner(state));
      while (state.run.hero.sp > 0) allocAttr(state, 'scan');
      nextCheckIn = elapsed + checkInSeconds;
    }
    setSprint(state, sprint && state.run.hero.energy > 25);
    step(state, C.FIXED_DT);
    elapsed += C.FIXED_DT;

    if (firstBossSeconds == null && state.route.zone >= 10) firstBossSeconds = elapsed;
    if (state.ui.seasonDone) {
      shipPatches(state);
      while (buyMeta(state, 'signal_power'));
      seasonMinutes.push((elapsed - seasonStartedAt) / 60);
      assert(leaveSeason(state), `End Season accepted at Zone ${state.route.zone}`);
      seasonStartedAt = elapsed;
      nextCheckIn = elapsed;
    }
  }

  assert(state.settings.sfx === false, 'headless profile never enables SFX');
  assert(state.route.zone === 200, `profile reaches Corruption unlock (got ${state.route.zone})`);
  assert(seasonMinutes.length === 10, 'ten clean seasons complete');
  return {
    firstBossMinutes: firstBossSeconds / 60,
    firstSeasonMinutes: seasonMinutes[0],
    matureMedianMinutes: median(seasonMinutes.slice(2)),
    seasonMinutes,
    totalHours: elapsed / 3600,
  };
}

const active = runProfile({ checkInSeconds: 30, sprint: true });
const idle = runProfile({ checkInSeconds: 20 * 60, sprint: false });

console.log(
  `PACE active boss=${active.firstBossMinutes.toFixed(1)}m season=${active.firstSeasonMinutes.toFixed(1)}m mature=${active.matureMedianMinutes.toFixed(1)}m corruption=${active.totalHours.toFixed(1)}h`
);
console.log(
  `PACE idle boss=${idle.firstBossMinutes.toFixed(1)}m season=${idle.firstSeasonMinutes.toFixed(1)}m mature=${idle.matureMedianMinutes.toFixed(1)}m calendar=${(idle.totalHours / 6).toFixed(1)}d`
);

assert(active.firstBossMinutes >= 8 && active.firstBossMinutes <= 12, 'active first boss window');
assert(active.firstSeasonMinutes >= 25 && active.firstSeasonMinutes <= 40, 'active first season window');
assert(idle.firstBossMinutes >= 15 && idle.firstBossMinutes <= 25, 'idle first boss window');
assert(idle.firstSeasonMinutes >= 45 && idle.firstSeasonMinutes <= 75, 'idle first season window');
assert(active.matureMedianMinutes >= 35 && active.matureMedianMinutes <= 70, 'active mature median');
assert(idle.matureMedianMinutes >= 60 && idle.matureMedianMinutes <= 120, 'idle mature median');
assert(active.totalHours >= 9.5 && active.totalHours <= 16, 'active Corruption unlock window');
const idleCalendarDays = idle.totalHours / 6;
assert(idleCalendarDays >= 2 && idleCalendarDays <= 4, 'idle Corruption calendar window');

console.log('PACING PASS');
