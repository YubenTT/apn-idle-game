import { pathToFileURL } from 'node:url';
import { GAME_PACKS } from '../js/generated/game-packs.js';
import { C, killsNeeded } from '../js/formulas.js';
import { createState, goLive, step } from '../js/game.js';
import {
  SAVE_KEY_V2,
  apply as applySave,
  load as loadSave,
  save as saveState,
} from '../js/save.js';
import {
  ECHO_TOTAL,
  createRouteState,
  echoProgressFor,
  normalizeRoute,
  recordRouteZoneClear,
  routeJourney,
} from '../js/route.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Route journey contract: ${message}`);
};

const clearThrough = (route, lastCompletedZone, catalog = GAME_PACKS) => {
  let current = route;
  while (current.zone <= lastCompletedZone) {
    current = recordRouteZoneClear(current, catalog, current.zone).route;
  }
  return current;
};

export function checkRouteJourneyContract() {
  assert(ECHO_TOTAL === 3, 'every Pack owns exactly three Echo slots');

  const fresh = createRouteState(0x41504e);
  const freshBytes = JSON.stringify(fresh);
  assert(
    JSON.stringify(echoProgressFor(fresh, 'valorant')) ===
      JSON.stringify({ found: 0, total: 3 }),
    'fresh Echo projection is honest 0/3',
  );
  assert(
    JSON.stringify(fresh) === freshBytes,
    'reading fresh Echo progress does not invent persisted discoveries',
  );
  routeJourney(fresh, GAME_PACKS);
  assert(JSON.stringify(fresh) === freshBytes, 'journey projection is pure');

  let valorant = { ...fresh, zone: 2, killsInZone: 9 };
  const firstClear = recordRouteZoneClear(valorant, GAME_PACKS, 2);
  assert(JSON.stringify(valorant) === JSON.stringify({ ...fresh, zone: 2, killsInZone: 9 }), 'zone transition is pure');
  assert(firstClear.route.zone === 3 && firstClear.route.killsInZone === 0, 'zone clear advances once and resets kills');
  assert(firstClear.echo?.slot === 1 && firstClear.echo?.packId === 'valorant', 'wave 3 discovers Echo slot 1');
  assert(echoProgressFor(firstClear.route, 'valorant').found === 1, 'first Echo persists');

  valorant = clearThrough(firstClear.route, 5);
  assert(echoProgressFor(valorant, 'valorant').found === 2, 'wave 6 discovers Echo slot 2');
  valorant = clearThrough(valorant, 8);
  assert(echoProgressFor(valorant, 'valorant').found === 3, 'wave 9 discovers Echo slot 3');
  const valorantGate = recordRouteZoneClear(valorant, GAME_PACKS, 9);
  assert(valorantGate.completion?.packId === 'valorant', 'wave 10 records the completed Pack');
  assert(valorantGate.completion?.visit === 1 && valorantGate.completion?.clean === true, 'first Gate is clean visit one');
  assert(valorantGate.route.currentPackId === GAME_PACKS[1].id, 'Gate advances to the next Pack');
  assert(valorantGate.route.cleanCompletedPackIds.join(',') === 'valorant', 'clean completion is persisted once');
  assert(valorantGate.route.history.length === 1 && valorantGate.route.history[0].completedAtZone === 10, 'history records exact boundary');

  let cleanEra = createRouteState(0x41504e);
  cleanEra = clearThrough(cleanEra, GAME_PACKS.length * 10 - 1);
  assert(cleanEra.zone === GAME_PACKS.length * 10, 'clean pass ends at catalog-derived boundary');
  assert(cleanEra.cleanCompletedPackIds.length === GAME_PACKS.length, 'every active Pack is clean-complete');
  assert(cleanEra.cleanEraCompleted === true, 'Clean Era completion is monotonic state');
  assert(cleanEra.cleanEraCompletedAtZone === GAME_PACKS.length * 10, 'Clean Era completion boundary is exact');
  const cleanJourney = routeJourney(cleanEra, GAME_PACKS);
  assert(cleanJourney.cleanEra.completed === true, 'journey projects Clean Era Complete');
  assert(cleanJourney.cleanEra.completedCount === GAME_PACKS.length, 'journey projects exact completed count');
  assert(cleanJourney.cleanEra.total === GAME_PACKS.length, 'journey total derives from catalog');
  assert(cleanJourney.signalDrift.unlocked === true, 'Zone 200 reveals Signal Drift');
  assert(cleanJourney.current?.tier === 1, 'first postgame visit starts at Drift tier 1');
  assert(cleanJourney.next?.id && cleanJourney.next.id !== cleanJourney.current.id, 'journey reveals a distinct next Pack');

  const extraCatalog = [
    ...GAME_PACKS,
    { ...GAME_PACKS.at(-1), id: 'fixture-pack', title: 'Fixture Pack', genre: 'fixture', order: GAME_PACKS.length + 1 },
  ];
  const expandedFresh = routeJourney(createRouteState(), extraCatalog);
  assert(expandedFresh.cleanEra.total === GAME_PACKS.length + 1, 'new Pack changes totals without a hardcoded count');
  const expandedExisting = routeJourney(cleanEra, extraCatalog);
  assert(expandedExisting.cleanEra.completed === true, 'catalog expansion never revokes an earned Clean Era');
  assert(expandedExisting.cleanEra.completedCount === GAME_PACKS.length, 'expansion preserves exact prior completion count');
  assert(expandedExisting.signalDrift.unlocked === true, 'Signal Drift stays anchored to Zone 200 after catalog expansion');

  const postgamePreview = routeJourney(cleanEra, GAME_PACKS);
  const firstPostgamePack = postgamePreview.current.id;
  const promisedNextPack = postgamePreview.next.id;
  const firstPostgameClear = clearThrough(cleanEra, 209);
  assert(firstPostgameClear.history[0].packId === firstPostgamePack, 'postgame completion matches the visible current Pack');
  assert(routeJourney(firstPostgameClear, GAME_PACKS).current.id === promisedNextPack, 'postgame transition keeps the promised next Pack');
  const promisedNextPair = routeJourney(firstPostgameClear, GAME_PACKS).next.id;
  const secondPostgameClear = clearThrough(firstPostgameClear, 219);
  assert(
    routeJourney(secondPostgameClear, GAME_PACKS).current.id === promisedNextPair,
    'second postgame Pack transitions to the next Pack that Route promised',
  );

  let longRoute = createRouteState(0x41504e);
  longRoute = clearThrough(longRoute, 609);
  assert(longRoute.history.length === 60, 'recent Pack history is bounded at 60');
  assert(longRoute.history[0].completedAtZone === 610, 'history keeps newest completion first');
  assert(
    Object.values(longRoute.packVisitCountById).reduce((sum, count) => sum + count, 0) === 61,
    'exact visit counts outlive bounded history',
  );
  assert(
    Math.max(...Object.values(longRoute.corruptionByPack)) <= 4,
    'persisted corruption remains bounded at tier 4',
  );

  const malformed = normalizeRoute({
    zone: 200,
    echoProgressByPack: {
      valorant: { found: 99, total: 99 },
      league: { found: -4, total: 3 },
      broken: 'three',
    },
    cleanCompletedPackIds: ['valorant', '', 9, 'valorant'],
    packVisitCountById: {
      valorant: 2.9,
      league: -1,
      broken: 'many',
      '<img src=x onerror=alert(1)>': 2,
    },
    history: [
      { packId: 'valorant', visit: 2.8, tier: 99, completedAtZone: 210.9, clean: false },
      { packId: '<img src=x onerror=alert(1)>', visit: 1, tier: 0, completedAtZone: 10, clean: true },
      { packId: '', visit: 1, tier: 0, completedAtZone: 10, clean: true },
      null,
    ],
    cleanEraCompleted: 'yes',
    cleanEraCompletedAtZone: -2,
  });
  assert(JSON.stringify(malformed.echoProgressByPack.valorant) === '{"found":3,"total":3}', 'Echo counts clamp to 3/3');
  assert(JSON.stringify(malformed.echoProgressByPack.league) === '{"found":0,"total":3}', 'negative Echo count sanitizes to zero');
  assert(!malformed.echoProgressByPack.broken, 'malformed Echo entry is dropped');
  assert(malformed.cleanCompletedPackIds.join(',') === 'valorant', 'clean Pack IDs sanitize and deduplicate');
  assert(JSON.stringify(malformed.packVisitCountById) === '{"valorant":2}', 'visit counts sanitize');
  assert(
    malformed.history.length === 1 && malformed.history[0].tier === 4,
    'history sanitizes unsafe Pack IDs and clamps tier',
  );
  assert(malformed.cleanEraCompleted === false && malformed.cleanEraCompletedAtZone === 0, 'completion flags require valid truth');
  assert(JSON.stringify(normalizeRoute(malformed)) === JSON.stringify(malformed), 'Route normalization is idempotent');

  const legacy = createState();
  applySave(legacy, {
    v: 3,
    ts: Date.now(),
    meta: {},
    route: {
      zone: 200,
      seenPackIds: GAME_PACKS.map((pack) => pack.id),
      corruptionByPack: { valorant: 2 },
    },
    run: {},
  });
  assert(legacy.route.cleanCompletedPackIds.length === GAME_PACKS.length, 'legacy seen Packs migrate to clean completions');
  assert(legacy.route.packVisitCountById.valorant === 3, 'legacy corruption reconstructs the minimum exact visit count');
  assert(
    legacy.route.cleanEraCompleted === true &&
      legacy.route.cleanEraCompletedAtZone === 200,
    'pre-Echo Zone-200 save persists its earned Clean Era monotonically',
  );
  assert(routeJourney(legacy.route, GAME_PACKS).cleanEra.completed === true, 'legacy Zone-200 save projects earned Clean Era');

  const saveMemory = new Map();
  globalThis.localStorage = {
    getItem: (key) => saveMemory.get(key) ?? null,
    setItem: (key, value) => saveMemory.set(key, String(value)),
    removeItem: (key) => saveMemory.delete(key),
  };
  const persisted = createState();
  persisted.route = cleanEra;
  assert(saveState(persisted) === true, 'journey save writes successfully');
  const currentBlob = JSON.parse(saveMemory.get(SAVE_KEY_V2));
  assert(
    currentBlob.meta?.routeJourney?.schema === 'apn.route-journey' &&
      currentBlob.meta.routeJourney.version === 1,
    'save carries a v3-opaque Route journey rollback capsule',
  );
  const reloaded = createState();
  applySave(reloaded, loadSave());
  assert(JSON.stringify(reloaded.route) === JSON.stringify(cleanEra), 'journey state survives exact save round trip');
  const rollbackBlob = {
    ...currentBlob,
    route: Object.fromEntries(
      [
        'zone',
        'killsInZone',
        'currentPackId',
        'seenPackIds',
        'corruptionByPack',
        'lastSeenByPack',
        'deck',
        'catalogVersion',
        'seed',
      ].map((key) => [key, currentBlob.route[key]]),
    ),
  };
  const restoredAfterRollback = createState();
  applySave(restoredAfterRollback, rollbackBlob);
  assert(
    JSON.stringify(restoredAfterRollback.route) === JSON.stringify(cleanEra),
    'an old v3 serializer can round-trip without deleting Route journey state',
  );
  const partial = createState();
  partial.route = valorantGate.route;
  assert(saveState(partial) === true, 'partial journey save writes successfully');
  const partialBlob = JSON.parse(saveMemory.get(SAVE_KEY_V2));
  const advancedDuringRollback = {
    ...partialBlob,
    route: {
      ...partialBlob.route,
      zone: 20,
      currentPackId: GAME_PACKS[2].id,
      seenPackIds: [GAME_PACKS[0].id, GAME_PACKS[1].id],
      lastSeenByPack: { [GAME_PACKS[0].id]: 10, [GAME_PACKS[1].id]: 20 },
    },
  };
  for (const key of [
    'echoProgressByPack',
    'cleanCompletedPackIds',
    'packVisitCountById',
    'history',
    'cleanEraCompleted',
    'cleanEraCompletedAtZone',
  ]) {
    delete advancedDuringRollback.route[key];
  }
  const restoredRollbackProgress = createState();
  applySave(restoredRollbackProgress, advancedDuringRollback);
  assert(
    restoredRollbackProgress.route.cleanCompletedPackIds.join(',') ===
      `${GAME_PACKS[0].id},${GAME_PACKS[1].id}`,
    'Pack completions earned while rolled back merge into the preserved journey',
  );
  assert(
    restoredRollbackProgress.route.packVisitCountById[GAME_PACKS[1].id] === 1,
    'rollback-era Pack completion reconstructs its minimum visit count',
  );
  assert(
    restoredRollbackProgress.route.history[0]?.packId === GAME_PACKS[1].id &&
      restoredRollbackProgress.route.history[0]?.completedAtZone === 20,
    'rollback-era Pack completion reconstructs its newest history entry',
  );
  reloaded.route.zone = 210;
  reloaded.meta.pendingGoLiveZone = 210;
  const beforeGoLive = JSON.stringify(reloaded.route);
  assert(goLive(reloaded)?.boundaryZone === 210, 'deep Go Live is available for preservation test');
  assert(JSON.stringify(reloaded.route) === beforeGoLive, 'Go Live preserves all Route journey state');

  const integrated = createState();
  integrated.route.zone = 2;
  integrated.route.killsInZone = killsNeeded(2) - 1;
  integrated.run.hero.scanner = 40;
  for (let index = 0; index < 60 * 6 && integrated.route.zone === 2; index += 1) {
    step(integrated, C.FIXED_DT);
  }
  assert(integrated.route.zone === 3, 'combat reaches the wave-3 Route transition');
  assert(
    echoProgressFor(integrated.route, 'valorant').found === 1,
    'combat zone clear uses the Route transition and persists Echo 1',
  );

  return [
    'three deterministic Echo discoveries per Pack',
    'pure one-zone Route transition',
    'Pack completion and bounded exact history',
    'catalog-derived monotonic Clean Era',
    'visible bounded Signal Drift',
    'extensible journey projection',
    'sanitized idempotent save shape',
    'legacy and current save round trip',
    'old-client rollback capsule preserves journey state',
    'Go Live preserves Route journey state',
    'combat integration owns no shadow Route mutation',
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const message of checkRouteJourneyContract()) console.log(`OK ${message}`);
  console.log('ROUTE JOURNEY PASS');
}
