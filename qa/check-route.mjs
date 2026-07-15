import { pathToFileURL } from 'node:url';
import { GAME_PACKS, PACK_BY_ID } from '../js/generated/game-packs.js';
import {
  createRouteState,
  packForRoute,
  scheduleNextSeason,
  corruptionTierFor,
} from '../js/route.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Route contract: ${message}`);
};

export function checkRouteContract() {
  assert(GAME_PACKS.length === 20, 'exactly 20 Clean Era packs');
  assert(new Set(GAME_PACKS.map((pack) => pack.id)).size === 20, 'unique pack IDs');
  assert(new Set(GAME_PACKS.map((pack) => pack.order)).size === 20, 'unique pack order');
  assert(PACK_BY_ID.valorant === GAME_PACKS[0], 'stable ID lookup');
  assert(Object.isFrozen(GAME_PACKS) && Object.isFrozen(GAME_PACKS[0]), 'generated catalog frozen');
  assert(GAME_PACKS.every((pack) => pack.zones === 10), 'ten zones per pack');
  assert(GAME_PACKS.every((pack) => pack.targets.length === 5), 'five targets per pack');
  assert(GAME_PACKS.every((pack) => pack.boss?.id), 'one boss per pack');

  const fresh = createRouteState(0x41504e);
  const freshBefore = JSON.stringify(fresh);
  const first = scheduleNextSeason(fresh, GAME_PACKS);
  assert(first.map((pack) => pack.id).join(',') === 'valorant,league', 'first season order');
  assert(first.every((pack) => pack.tier === 0), 'new packs debut Clean');
  assert(JSON.stringify(fresh) === freshBefore, 'scheduler is pure');
  assert(packForRoute({ ...fresh, zone: 0 }, GAME_PACKS).id === 'valorant', 'Zone 1 pack');
  assert(packForRoute({ ...fresh, zone: 199 }, GAME_PACKS).id === 'elden-ring', 'Zone 200 pack');

  const mature = createRouteState(0x41504e);
  mature.zone = 200;
  mature.seenPackIds = GAME_PACKS.map((pack) => pack.id);
  mature.lastSeenByPack = Object.fromEntries(GAME_PACKS.map((pack, index) => [pack.id, index * 10]));
  const revisitA = scheduleNextSeason(mature, GAME_PACKS);
  const revisitB = scheduleNextSeason(mature, GAME_PACKS);
  assert(revisitA.length === 2, 'two packs per season');
  assert(revisitA[0].id !== revisitA[1].id, 'no duplicate pack');
  assert(revisitA[0].genre !== revisitA[1].genre, 'no duplicate primary genre');
  assert(revisitA.every((pack) => pack.tier === 1), 'first revisit uses Signal Drift');
  assert(JSON.stringify(revisitA) === JSON.stringify(revisitB), 'seeded schedule deterministic');
  assert(corruptionTierFor(mature, revisitA[0].id) === 1, 'mature tier calculation');

  return [
    '20 Clean Era packs',
    'stable IDs and order',
    'five targets + boss',
    'pure deterministic scheduler',
    'bounded corruption tier',
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const message of checkRouteContract()) console.log(`OK ${message}`);
  console.log('ROUTE PASS');
}
