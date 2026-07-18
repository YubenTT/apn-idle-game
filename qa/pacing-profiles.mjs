import { C } from '../js/formulas.js';
import {
  allocSkill,
  branchMastery,
  buyMeta,
  buyScanner,
  canGoLive,
  createState,
  goLive,
  setSprint,
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

const BUILD_QUEUES = Object.freeze({
  scan: Object.freeze(['scroll_speed', 'live_tracker', 'hotfix']),
  verify: Object.freeze(['notify', 'sharp_eye', 'summary_burst']),
  relay: Object.freeze(['marathon', 'amplify', 'deep_dive']),
});

function spendBuildSp(state, build) {
  const queue = BUILD_QUEUES[build];
  let bought = true;
  while (bought && state.run.hero.sp > 0) {
    bought = false;
    for (const id of queue) {
      if (allocSkill(state, id)) bought = true;
    }
  }
}

function runProfile({ build, seed, checkInSeconds, sprint }) {
  installSeed(seed);
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
      spendBuildSp(state, build);
      nextCheckIn = elapsed + checkInSeconds;
    }
    setSprint(state, sprint && state.run.hero.energy > 25);
    step(state, C.FIXED_DT);
    elapsed += C.FIXED_DT;

    if (firstBossSeconds == null && state.route.zone >= 10) firstBossSeconds = elapsed;
    if (canGoLive(state)) {
      const receipt = goLive(state);
      assert(Boolean(receipt?.checkpointId), `${build} Go Live accepted at Zone ${state.route.zone}`);
      while (buyMeta(state, 'signal_power'));
      seasonMinutes.push((elapsed - seasonStartedAt) / 60);
      seasonStartedAt = elapsed;
      nextCheckIn = elapsed;
    }
  }

  assert(state.settings.sfx === false, 'headless profile never enables SFX');
  assert(state.route.zone === 200, `profile reaches Corruption unlock (got ${state.route.zone})`);
  assert(seasonMinutes.length === 10, `${build} completes ten deterministic Go Live cycles`);
  return {
    build,
    firstBossMinutes: firstBossSeconds / 60,
    firstSeasonMinutes: seasonMinutes[0],
    matureMedianMinutes: median(seasonMinutes.slice(2)),
    seasonMinutes,
    totalHours: elapsed / 3600,
    mastery: branchMastery(state, build),
  };
}

const profiles = [
  runProfile({ build: 'scan', seed: 0x5343414e, checkInSeconds: 30, sprint: true }),
  runProfile({ build: 'verify', seed: 0x56455249, checkInSeconds: 30, sprint: true }),
  runProfile({ build: 'relay', seed: 0x52454c41, checkInSeconds: 30, sprint: true }),
];

for (const profile of profiles) {
  console.log(
    `BUILD ${profile.build} boss=${profile.firstBossMinutes.toFixed(1)}m first=${profile.firstSeasonMinutes.toFixed(1)}m mature=${profile.matureMedianMinutes.toFixed(1)}m zone200=${profile.totalHours.toFixed(1)}h mastery=${profile.mastery}`
  );
  assert(Number.isFinite(profile.totalHours), `${profile.build} timing stays finite`);
  assert(profile.totalHours > 0 && profile.totalHours < 24, `${profile.build} reaches Zone 200 without softlock`);
  assert(profile.mastery > 0, `${profile.build} spends SP only in its named branch`);
}

console.log('PACING PASS · 3 SEEDED BUILDS');
