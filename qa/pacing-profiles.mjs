import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { C } from '../js/formulas.js';
import {
  allocSkill,
  branchMastery,
  buyMeta,
  buyScanner,
  castHotfix,
  castPriorityTag,
  canGoLive,
  createState,
  goLive,
  HOTFIX_FOCUS_COST,
  PRIORITY_FOCUS_COST,
  setSprint,
  skillLv,
  step,
} from '../js/game.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Pacing: ${message}`);
};

export function installSeed(seed = 0x41504e) {
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

export const BUILD_QUEUES = Object.freeze({
  scan: Object.freeze(['scroll_speed', 'live_tracker', 'hotfix']),
  verify: Object.freeze(['notify', 'sharp_eye', 'summary_burst']),
  relay: Object.freeze(['marathon', 'amplify', 'deep_dive']),
});

export function spendBuildSp(state, build) {
  const queue = BUILD_QUEUES[build];
  if (!queue) return;
  let bought = true;
  while (bought && state.run.hero.sp > 0) {
    bought = false;
    for (const id of queue) {
      if (allocSkill(state, id)) bought = true;
    }
  }
}

function exerciseBuild(state, build) {
  const target = state.world.enemies.find((enemy) => enemy.hp > 0);
  if (build === 'scan' && target && state.run.hero.focus >= HOTFIX_FOCUS_COST) {
    castHotfix(state);
  }
  if (
    build === 'verify' &&
    target &&
    !target.priorityTagRank &&
    state.run.hero.focus >= PRIORITY_FOCUS_COST
  ) {
    castPriorityTag(state);
  }
  if (build === 'relay' && skillLv(state, 'deep_dive') > 0) {
    state.run.hero.deepOn = true;
  }
}

export function runProfile({
  build,
  seed,
  checkInSeconds = 30,
  sprint = true,
  targetZone = 200,
  maxHours = 24,
}) {
  installSeed(seed);
  const state = createState();
  state.settings.sfx = false;
  let elapsed = 0;
  let seasonStartedAt = 0;
  let cycleStartedAt = 0;
  let firstGateTarget = 10;
  let nextCheckIn = 0;
  let firstBossSeconds = null;
  const seasonMinutes = [];
  const cycleFirstGateMinutes = [];
  const cycleFirstGates = [];
  const cycleReceipts = [];

  while (state.route.zone < targetZone && elapsed < maxHours * 3600) {
    if (elapsed >= nextCheckIn) {
      while (buyScanner(state));
      spendBuildSp(state, build);
      nextCheckIn = elapsed + checkInSeconds;
    }
    setSprint(state, sprint && state.run.hero.energy > 25);
    exerciseBuild(state, build);
    step(state, C.FIXED_DT);
    elapsed += C.FIXED_DT;

    if (firstGateTarget != null && state.route.zone >= firstGateTarget) {
      const gateMinutes = (elapsed - cycleStartedAt) / 60;
      cycleFirstGateMinutes.push(gateMinutes);
      cycleFirstGates.push({ zone: state.route.zone, minutes: gateMinutes });
      firstGateTarget = null;
      if (firstBossSeconds == null) firstBossSeconds = elapsed;
    }
    if (canGoLive(state)) {
      const receipt = goLive(state);
      assert(Boolean(receipt?.checkpointId), `${build} Go Live accepted at Zone ${state.route.zone}`);
      cycleReceipts.push({
        boundaryZone: receipt.boundaryZone,
        notesBanked: receipt.notesBanked,
        repGained: receipt.repGained,
        liveGain: receipt.liveGain,
      });
      while (buyMeta(state, 'signal_power'));
      seasonMinutes.push((elapsed - seasonStartedAt) / 60);
      seasonStartedAt = elapsed;
      cycleStartedAt = elapsed;
      firstGateTarget = state.route.zone + 10;
      nextCheckIn = elapsed;
    }
  }

  assert(state.settings.sfx === false, 'headless profile never enables SFX');
  assert(state.route.zone === targetZone, `profile reaches Zone ${targetZone} (got ${state.route.zone})`);
  if (targetZone === 200) {
    assert(seasonMinutes.length === 10, `${build} completes ten deterministic Go Live cycles`);
  }
  const totalHours = elapsed / 3600;
  const repPerCycle = cycleReceipts.length
    ? cycleReceipts.reduce((sum, receipt) => sum + receipt.repGained, 0) /
      cycleReceipts.length
    : 0;
  return {
    build,
    firstBossMinutes: firstBossSeconds / 60,
    firstSeasonMinutes: seasonMinutes[0],
    matureMedianMinutes: median(seasonMinutes.slice(2)),
    seasonMinutes,
    cycleFirstGateMinutes,
    cycleFirstGates,
    cycleReceipts,
    repPerCycle,
    zonesPerHour: targetZone / totalHours,
    totalHours,
    mastery: branchMastery(state, build),
  };
}

export function measurePacingProfiles() {
  return [
    runProfile({ build: 'scan', seed: 0x5343414e }),
    runProfile({ build: 'verify', seed: 0x56455249 }),
    runProfile({ build: 'relay', seed: 0x52454c41 }),
  ];
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  for (const profile of measurePacingProfiles()) {
    console.log(
      `BUILD ${profile.build} boss=${profile.firstBossMinutes.toFixed(1)}m first=${profile.firstSeasonMinutes.toFixed(1)}m mature=${profile.matureMedianMinutes.toFixed(1)}m zone200=${profile.totalHours.toFixed(1)}h mastery=${profile.mastery}`
    );
    assert(Number.isFinite(profile.totalHours), `${profile.build} timing stays finite`);
    assert(profile.totalHours > 0 && profile.totalHours < 24, `${profile.build} reaches Zone 200 without softlock`);
    assert(profile.mastery > 0, `${profile.build} spends SP only in its named branch`);
  }

  console.log('PACING PASS · 3 SEEDED BUILDS');
}
