import {
  allocSkill,
  createState,
  simulateOffline,
} from '../js/game.js';
import {
  C,
  isBossZone,
  routeEnemyHp,
  routeKillsNeeded,
  scannerDamage,
  typeHpMult,
} from '../js/formulas.js';
import {
  BUILD_QUEUES,
  installSeed,
  measurePacingProfiles,
  runProfile,
} from './pacing-profiles.mjs';

const TARGETS = Object.freeze({
  firstGoLiveMinutes: 15,
  scanZonesPerHourRatio: 1.2,
  verifyRepPerCycleRatio: 1.4,
  relayOfflineYieldRatio: 1.3,
  successorGateRatio: 0.9,
  maximumOrdinaryHits: 220,
  maximumBossHits: 2000,
  maximumOnCurveKills: 20,
  maximumOnCurveCombatMinutes: 31,
  maximumZone1000CombatHours: 325,
});

const failures = [];
const check = (condition, label, evidence) => {
  const rendered = typeof evidence === 'string' ? evidence : JSON.stringify(evidence);
  console.log(`${condition ? 'OK' : 'FAIL'} ${label} · ${rendered}`);
  if (!condition) failures.push(`${label}: ${rendered}`);
};

const ratio = (numerator, denominator) =>
  denominator > 0 ? numerator / denominator : Number.POSITIVE_INFINITY;

function makeOfflineState(relay) {
  const state = createState();
  state.settings.sfx = false;
  state.route.zone = 190;
  state.run.hero.sp = 15;
  if (relay) {
    let bought = true;
    while (bought) {
      bought = false;
      for (const id of BUILD_QUEUES.relay) {
        if (allocSkill(state, id)) bought = true;
      }
    }
  }
  return state;
}

function offlineOutcome(relay, hours) {
  const state = makeOfflineState(relay);
  installSeed(0x4f46464c);
  return simulateOffline(state, hours * 3600);
}

function measureOfflineOverflowYield(relay) {
  const simulated = offlineOutcome(relay, 3);
  const extended = offlineOutcome(relay, 4);
  return {
    signal: extended.signal - simulated.signal,
    notes: extended.notes - simulated.notes,
  };
}

function measureZone1000Budget() {
  let minimumNormalHits = Number.POSITIVE_INFINITY;
  let maximumOrdinaryHits = 0;
  let maximumBossHits = 0;
  let maximumKills = 0;
  let maximumCombatSeconds = 0;
  let totalCombatSeconds = 0;
  let bossCount = 0;
  for (let zone = 0; zone < 1000; zone += 1) {
    const paceScanner = Math.floor(
      (zone % C.SEASON_ZONES) * C.ENEMY_PACE_SCANNER,
    );
    const boss = isBossZone(zone);
    const hits =
      routeEnemyHp(
        zone,
        paceScanner,
        1,
        Math.min(4, Math.floor(zone / 200)),
        typeHpMult(boss ? 'boss' : 'normal'),
      ) / scannerDamage(paceScanner);
    const kills = routeKillsNeeded(zone);
    const combatSeconds = hits * kills * C.ATTACK_INTERVAL;
    if (boss) maximumBossHits = Math.max(maximumBossHits, hits);
    else {
      minimumNormalHits = Math.min(minimumNormalHits, hits);
      maximumOrdinaryHits = Math.max(maximumOrdinaryHits, hits);
    }
    maximumKills = Math.max(maximumKills, kills);
    maximumCombatSeconds = Math.max(maximumCombatSeconds, combatSeconds);
    totalCombatSeconds += combatSeconds;
    if (boss) bossCount += 1;
  }
  return {
    minimumNormalHits,
    maximumOrdinaryHits,
    maximumBossHits,
    maximumKills,
    maximumCombatMinutes: maximumCombatSeconds / 60,
    totalCombatHours: totalCombatSeconds / 3600,
    bossCount,
  };
}

const profiles = measurePacingProfiles();
for (const profile of profiles) {
  check(
    profile.firstSeasonMinutes <= TARGETS.firstGoLiveMinutes,
    `${profile.build} first Go Live <= ${TARGETS.firstGoLiveMinutes}m`,
    `${profile.firstSeasonMinutes.toFixed(2)}m`,
  );
  check(
    profile.totalHours > 0 && profile.totalHours < 24,
    `${profile.build} reaches Zone 200 inside the explicit 24h budget`,
    `${profile.totalHours.toFixed(2)}h`,
  );

  // The authored maturity budget stops growing at Zone 120. Use the final
  // three first-Gate observations so both successor cycles are post-ceiling
  // outcomes; every ratio must pass, with no median or outlier allowance.
  const settledGates = profile.cycleFirstGates.filter(
    (gate) => gate.zone >= 160 && gate.zone <= 200,
  );
  const successorRatios = settledGates.slice(1).map(
    (gate, index) => gate.minutes / settledGates[index].minutes,
  );
  check(
    successorRatios.length === 2 &&
      successorRatios.every((value) => value <= TARGETS.successorGateRatio),
    `${profile.build} each settled successor first Gate is >=10% faster`,
    successorRatios.map((value) => `${value.toFixed(3)}x`).join(' / '),
  );
}

const comparisonSeed = 0x56414c55;
const scanComparison = runProfile({ build: 'scan', seed: comparisonSeed });
const verifyComparison = runProfile({ build: 'verify', seed: comparisonSeed });
const neutralComparison = runProfile({ build: 'neutral', seed: comparisonSeed });
const scanRatio = ratio(
  scanComparison.zonesPerHour,
  neutralComparison.zonesPerHour,
);
const verifyRatio = ratio(
  verifyComparison.repPerCycle,
  scanComparison.repPerCycle,
);
check(
  scanRatio >= TARGETS.scanZonesPerHourRatio,
  'Scan zones/hour is >=20% above the same-seed neutral build',
  `${scanRatio.toFixed(3)}x`,
);
check(
  verifyRatio >= TARGETS.verifyRepPerCycleRatio,
  'Verify Rep/cycle is >=40% above the same-seed Scan build',
  `${verifyRatio.toFixed(3)}x`,
);

const neutralOffline = measureOfflineOverflowYield(false);
const relayOffline = measureOfflineOverflowYield(true);
const relaySignalRatio = ratio(relayOffline.signal, neutralOffline.signal);
const relayNotesRatio = ratio(relayOffline.notes, neutralOffline.notes);
check(
  relaySignalRatio >= TARGETS.relayOfflineYieldRatio &&
    relayNotesRatio >= TARGETS.relayOfflineYieldRatio,
  'Relay offline overflow yield is >=30% above neutral',
  `Signal ${relaySignalRatio.toFixed(3)}x · Notes ${relayNotesRatio.toFixed(3)}x`,
);

const zone1000 = measureZone1000Budget();
check(
  zone1000.minimumNormalHits > 1,
  'ordinary targets remain multi-frame through Zone 1000',
  `${zone1000.minimumNormalHits.toFixed(2)} minimum on-curve hits`,
);
check(
  zone1000.maximumOrdinaryHits <= TARGETS.maximumOrdinaryHits &&
    zone1000.maximumBossHits <= TARGETS.maximumBossHits &&
    zone1000.maximumKills <= TARGETS.maximumOnCurveKills &&
    zone1000.maximumCombatMinutes <= TARGETS.maximumOnCurveCombatMinutes &&
    zone1000.totalCombatHours <= TARGETS.maximumZone1000CombatHours &&
    zone1000.bossCount === 100,
  'Zone 1000 has bounded actionable work, not a finite-only pass',
  zone1000,
);

const deterministicA = runProfile({
  build: 'scan',
  seed: 0x44455445,
  targetZone: 30,
});
const deterministicB = runProfile({
  build: 'scan',
  seed: 0x44455445,
  targetZone: 30,
});
check(
  JSON.stringify(deterministicA) === JSON.stringify(deterministicB),
  'active seeded profile is byte-deterministic',
  'two same-seed Zone-30 outcomes match',
);

if (failures.length) {
  throw new Error(`Balance targets failed (${failures.length})\n${failures.join('\n')}`);
}

console.log('BALANCE TARGETS PASS');
