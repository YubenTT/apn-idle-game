import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { GAME_PACKS } from '../js/generated/game-packs.js';
import { C, killsNeeded, routeEnemyHp } from '../js/formulas.js';
import {
  castHotfix,
  createState,
  GO_LIVE_CONTRACT,
  goLive,
  offlineYieldEfficiency,
  spawnEnemy,
  step,
} from '../js/game.js';
import { apply as applySave, load as loadSave, save as saveState, SAVE_KEY_V2 } from '../js/save.js';
import {
  COVERAGE_MASTERY_COSTS,
  COVERAGE_MAX_LEVEL,
  COVERAGE_SETS,
  buyCoverageMastery,
  claimCoverageSetCapstone,
  coverageBossHpMultiplier,
  coverageFinalTargetSignalMultiplier,
  coverageGateNotesMultiplier,
  coverageMasteryCost,
  coverageOfflineEfficiency,
  coverageSetStatus,
  coverageYieldMultiplier,
  isPackCovered,
  normalizeCoverageMeta,
} from '../js/coverage.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Coverage contract: ${message}`);
};

const coverPack = (state, packId) => {
  if (!state.route.cleanCompletedPackIds.includes(packId)) {
    state.route.cleanCompletedPackIds.push(packId);
  }
  state.route.echoProgressByPack[packId] = { found: 3, total: 3 };
};

const coveredState = (...packIds) => {
  const state = createState();
  for (const packId of packIds) coverPack(state, packId);
  return state;
};

const installSeed = (seed) => {
  let value = seed >>> 0;
  Math.random = () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

const killReward = ({ zone, covered = [], claimed = null, mastery = null, final = false }) => {
  const originalRandom = Math.random;
  try {
    installSeed(0x434f5645);
    const state = coveredState(...covered);
    state.settings.sfx = false;
    state.route.zone = zone;
    state.route.killsInZone = final ? killsNeeded(zone) - 1 : 0;
    if (zone >= 200) {
      state.route.seenPackIds = [...covered];
      state.route.deck = ['valorant', 'league'];
    }
    if (claimed) claimCoverageSetCapstone(state, claimed);
    if (mastery) state.meta.coverageMasteryByPack = { ...mastery };
    state.run.hero.skills.hotfix = 1;
    state.run.hero.focus = C.FOCUS_MAX;
    step(state, 1);
    const enemy = state.world.enemies.find((item) => item.hp > 0);
    assert(Boolean(enemy), `reward fixture spawned at zone ${zone}`);
    enemy.hp = 1;
    installSeed(0x52455744);
    castHotfix(state);
    return { signal: state.run.bytes, notes: state.run.patches };
  } finally {
    Math.random = originalRandom;
  }
};

export function checkCoverageContract() {
  assert(COVERAGE_MAX_LEVEL === 5, 'mastery has exactly five levels');
  assert(
    JSON.stringify(COVERAGE_MASTERY_COSTS) === '[25,60,120,220,360]',
    'mastery uses the accepted Rep curve',
  );
  assert(
    COVERAGE_MASTERY_COSTS.every((cost, level) => coverageMasteryCost(level) === cost) &&
      coverageMasteryCost(5) === null,
    'next-level cost is exact and max level is closed',
  );

  assert(COVERAGE_SETS.length === 7, 'runtime exposes seven non-empty Sets');
  assert(COVERAGE_SETS.every((set) => set.members.length > 0), 'no empty Set is rendered');
  const allMembers = COVERAGE_SETS.flatMap((set) => set.members);
  assert(new Set(allMembers).size === allMembers.length, 'each current Pack belongs to one Set');
  assert(
    [...allMembers].sort().join(',') === GAME_PACKS.map((pack) => pack.id).sort().join(','),
    'Set membership covers the current catalog without a hardcoded count',
  );
  assert(
    COVERAGE_SETS.find((set) => set.id === 'S4')?.openSlots === 1 &&
      COVERAGE_SETS.find((set) => set.id === 'S7')?.openSlots === 1,
    'S4 and S7 retain one non-blocking open slot',
  );

  const firstVisit = coveredState('valorant');
  firstVisit.authority.amount = 1000;
  assert(isPackCovered(firstVisit.route, 'valorant'), 'Gate plus all three Echoes covers a Pack');
  firstVisit.route.echoProgressByPack.valorant.found = 2;
  assert(!isPackCovered(firstVisit.route, 'valorant'), 'a missing Echo keeps a Pack uncovered');
  firstVisit.route.echoProgressByPack.valorant.found = 3;

  const liveBeforeMastery = firstVisit.meta.live;
  assert(buyCoverageMastery(firstVisit, 'valorant'), 'covered Pack mastery can be bought with Rep');
  assert(
    firstVisit.authority.amount === 975 && firstVisit.meta.coverageMasteryByPack.valorant === 1,
    'mastery spends exactly the next-level Rep cost',
  );
  assert(firstVisit.meta.live === liveBeforeMastery, 'mastery never changes Live Mult');
  assert(coverageYieldMultiplier(firstVisit, 'valorant', 0) === 1, 'mastery gives no first-visit yield');
  assert(coverageYieldMultiplier(firstVisit, 'valorant', 1) === 1.05, 'mastery is scoped to a revisit');
  assert(coverageYieldMultiplier(firstVisit, 'league', 1) === 1, 'mastery never leaks to another Pack');
  while (buyCoverageMastery(firstVisit, 'valorant')) {}
  assert(
    firstVisit.meta.coverageMasteryByPack.valorant === 5 &&
      coverageYieldMultiplier(firstVisit, 'valorant', 4) === 1.25,
    'mastery caps at level five and +25 percent',
  );
  const repAtCap = firstVisit.authority.amount;
  assert(!buyCoverageMastery(firstVisit, 'valorant'), 'max mastery cannot be bought again');
  assert(firstVisit.authority.amount === repAtCap, 'failed mastery purchase spends nothing');
  assert(!buyCoverageMastery(firstVisit, 'unknown-pack'), 'unknown Pack mastery fails closed');

  const tactical = COVERAGE_SETS.find((set) => set.id === 'S1');
  const ready = coveredState(...tactical.members);
  ready.authority.amount = 321;
  assert(coverageSetStatus(ready, ready.route, 'S1').state === 'ready', 'covered members make a Set claimable');
  const repBeforeClaim = ready.authority.amount;
  const liveBeforeClaim = ready.meta.live;
  assert(claimCoverageSetCapstone(ready, 'S1'), 'ready capstone requires an explicit claim');
  assert(
    ready.meta.claimedCoverageSetIds.join(',') === 'S1' &&
      ready.authority.amount === repBeforeClaim &&
      ready.meta.live === liveBeforeClaim,
    'capstone claim is earned-by-play and currency-free',
  );
  assert(!claimCoverageSetCapstone(ready, 'S1'), 'capstone claim is idempotent');
  const futureS1 = { ...tactical, members: [...tactical.members, 'future-tactical-pack'] };
  assert(
    coverageSetStatus(ready, ready.route, 'S1', [futureS1]).state === 'claimed',
    'a future Set member never revokes a claimed capstone',
  );
  const incomplete = coveredState(tactical.members[0]);
  assert(!claimCoverageSetCapstone(incomplete, 'S1'), 'incomplete Set cannot claim a capstone');

  assert(coverageBossHpMultiplier(ready, 'valorant') === 0.95, 'Rapid Defuse pre-damages an S1 Gate by 5 percent');
  assert(coverageBossHpMultiplier(ready, 'league') === 1, 'Rapid Defuse stays inside S1');
  const prime = coveredState(...COVERAGE_SETS.find((set) => set.id === 'S3').members);
  claimCoverageSetCapstone(prime, 'S3');
  assert(coverageGateNotesMultiplier(prime, 'fc-26', true) === 1.1, 'Clutch Window adds 10 percent Gate Notes in S3');
  assert(coverageGateNotesMultiplier(prime, 'fc-26', false) === 1, 'Clutch Window never changes normal Notes');
  assert(coverageGateNotesMultiplier(prime, 'valorant', true) === 1, 'Clutch Window stays inside S3');
  const lanes = coveredState(...COVERAGE_SETS.find((set) => set.id === 'S4').members);
  claimCoverageSetCapstone(lanes, 'S4');
  assert(coverageFinalTargetSignalMultiplier(lanes, 'league', true) === 1.05, 'Last-Hit Bounty adds 5 percent final-target Signal in S4');
  assert(coverageFinalTargetSignalMultiplier(lanes, 'league', false) === 1, 'Last-Hit Bounty changes only the final normal target');
  assert(coverageFinalTargetSignalMultiplier(lanes, 'valorant', true) === 1, 'Last-Hit Bounty stays inside S4');
  const nightmare = coveredState(...COVERAGE_SETS.find((set) => set.id === 'S6').members);
  claimCoverageSetCapstone(nightmare, 'S6');
  assert(coverageOfflineEfficiency(nightmare, 'elden-ring', 0.88) === 0.93, 'Hardened adds five offline-efficiency points in S6');
  assert(coverageOfflineEfficiency(nightmare, 'elden-ring', 0.98) === 1, 'Hardened remains capped at active yield');
  assert(coverageOfflineEfficiency(nightmare, 'league', 0.88) === 0.88, 'Hardened stays inside S6');
  nightmare.route.zone = 199;
  assert(
    offlineYieldEfficiency(nightmare) === 0.93,
    'production offline boundary applies Hardened to the current S6 Pack',
  );

  const revisitControl = killReward({
    zone: 200,
    covered: ['valorant'],
  });
  const revisitMastered = killReward({
    zone: 200,
    covered: ['valorant'],
    mastery: { valorant: 5 },
  });
  assert(
    revisitMastered.signal > revisitControl.signal * 1.24,
    'production kill rewards apply Pack mastery only on a revisit',
  );
  const laneMembers = COVERAGE_SETS.find((set) => set.id === 'S4').members;
  const laneControl = killReward({ zone: 10, covered: laneMembers, final: true });
  const laneClaimed = killReward({
    zone: 10,
    covered: laneMembers,
    claimed: 'S4',
    final: true,
  });
  assert(
    laneClaimed.signal > laneControl.signal * 1.049,
    'production final-target reward applies Last-Hit Bounty',
  );
  const primeMembers = COVERAGE_SETS.find((set) => set.id === 'S3').members;
  const primeControl = killReward({ zone: 49, covered: primeMembers });
  const primeClaimed = killReward({ zone: 49, covered: primeMembers, claimed: 'S3' });
  assert(
    primeClaimed.notes === primeControl.notes * 1.1,
    'production Gate reward applies Clutch Window',
  );

  const hpBase = routeEnemyHp(209, 9, 4, 1, 1);
  const hpUnit = routeEnemyHp(209, 9, 1, 1, 1);
  assert(
    hpBase / hpUnit > 1.8 && hpBase / hpUnit < 1.9,
    'permanent-power HP budget uses the accepted 0.45 exponent',
  );
  const bossWithoutCapstone = createState();
  bossWithoutCapstone.route.zone = 9;
  const normalBoss = spawnEnemy(bossWithoutCapstone);
  const bossWithCapstone = coveredState(...tactical.members);
  bossWithCapstone.route.zone = 9;
  claimCoverageSetCapstone(bossWithCapstone, 'S1');
  const primedBoss = spawnEnemy(bossWithCapstone);
  assert(
    primedBoss.hpMax === normalBoss.hpMax &&
      primedBoss.hp === Math.floor(primedBoss.hpMax * 0.95),
    'production spawn starts Rapid Defuse at 95 percent without shrinking Gate max HP',
  );

  const malformed = normalizeCoverageMeta({
    coverageMasteryByPack: {
      valorant: 99,
      league: -2,
      '<img>': 4,
      'unknown-pack': 3,
    },
    claimedCoverageSetIds: ['S1', 'S9', '', 2, 'S1'],
  });
  assert(
    JSON.stringify(malformed) ===
      '{"coverageMasteryByPack":{"valorant":5},"claimedCoverageSetIds":["S1"]}',
    'coverage save state sanitizes, clamps, and rejects unknown IDs',
  );
  assert(
    JSON.stringify(normalizeCoverageMeta(malformed)) === JSON.stringify(malformed),
    'coverage normalization is idempotent',
  );

  const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const memory = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    },
  });
  const persisted = coveredState(...tactical.members);
  persisted.authority.amount = 100;
  buyCoverageMastery(persisted, 'valorant');
  claimCoverageSetCapstone(persisted, 'S1');
  assert(saveState(persisted), 'coverage save writes successfully');
  const oldClientBlob = JSON.parse(memory.get(SAVE_KEY_V2));
  assert(oldClientBlob.meta.coverageMasteryByPack.valorant === 1, 'mastery persists in v3 meta');
  assert(oldClientBlob.meta.claimedCoverageSetIds.join(',') === 'S1', 'claimed Sets persist in v3 meta');
  const restored = createState();
  applySave(restored, loadSave());
  assert(
    JSON.stringify(restored.meta.coverageMasteryByPack) === '{"valorant":1}' &&
      restored.meta.claimedCoverageSetIds.join(',') === 'S1',
    'coverage survives current save round trip',
  );
  restored.route.zone = 10;
  restored.meta.pendingGoLiveZone = 10;
  const beforeGoLive = JSON.stringify(normalizeCoverageMeta(restored.meta));
  assert(goLive(restored)?.boundaryZone === 10, 'coverage preservation fixture can Go Live');
  assert(
    JSON.stringify(normalizeCoverageMeta(restored.meta)) === beforeGoLive,
    'Go Live preserves mastery and claimed capstones',
  );
  assert(
    GO_LIVE_CONTRACT.keeps.includes('Coverage and Sets'),
    'Go Live tells the player that Coverage and Sets stay',
  );
  if (previousLocalStorage === undefined) delete globalThis.localStorage;
  else Object.defineProperty(globalThis, 'localStorage', previousLocalStorage);

  const source = fs.readFileSync(new URL('../js/coverage.js', import.meta.url), 'utf8');
  assert(!/economyMult|meta\.live/.test(source), 'capstone domain cannot read or write the global multiplier');
  assert(!/coins|premium|purchase|store/i.test(source), 'capstone domain has no purchase path');

  return [
    'five-level Pack mastery and exact Rep curve',
    'revisit-only bounded yield',
    'seven complete catalog-derived Sets',
    'earned explicit permanent capstones',
    'four scoped bounded numeric effects',
    'softened permanent-power HP budget',
    'sanitized save, Go Live, and rollback-safe meta',
    'single-global-multiplier and no-purchase firewall',
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const line of checkCoverageContract()) console.log(`OK ${line}`);
  console.log('COVERAGE PASS');
}
