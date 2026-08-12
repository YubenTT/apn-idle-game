import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { GAME_PACKS, PACK_BY_ID } from '../js/generated/game-packs.js';
import {
  createRouteState,
  packForRoute,
  scheduleNextSeason,
  corruptionTierFor,
} from '../js/route.js';
import {
  motionAssetIdsForRouteWindow,
  routeWaveIdentityUnion,
} from '../js/wave-roster.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Route contract: ${message}`);
};

export function checkRouteContract() {
  const catalogCount = GAME_PACKS.length;
  const cleanBoundary = catalogCount * 10;
  assert(catalogCount > 0, 'active Clean Era catalog is nonempty');
  assert(new Set(GAME_PACKS.map((pack) => pack.id)).size === catalogCount, 'unique pack IDs');
  assert(new Set(GAME_PACKS.map((pack) => pack.order)).size === catalogCount, 'unique pack order');
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
  assert(
    packForRoute({ ...fresh, zone: cleanBoundary - 1 }, GAME_PACKS).id === GAME_PACKS.at(-1).id,
    'final Clean Era zone resolves from the active catalog',
  );

  const mature = createRouteState(0x41504e);
  mature.zone = cleanBoundary;
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

  const motionPacks = GAME_PACKS.map((pack) => {
    const copy = structuredClone(pack);
    copy.motion = {
      grammar: 'gaf2d-motion-bundle-v1',
      characters: Object.fromEntries(
        [...copy.targets, copy.boss].map(({ id }) => [
          id,
          {
            image: `assets/game-packs/${copy.id}/characters/${id}/motion.webp`,
            descriptor: `assets/game-packs/${copy.id}/characters/${id}/motion.json`,
            descriptorSha256: 'a'.repeat(64),
          },
        ]),
      ),
    };
    return copy;
  });
  const valorantBoundary = {
    ...createRouteState(),
    zone: 9,
  };
  assert(
    [...motionAssetIdsForRouteWindow(valorantBoundary, motionPacks)].join('|') ===
      'valorant/site-warden|league/' +
        motionPacks[1].targets.map(({ id }) => id).join('|league/'),
    'clean 10→1 route window uses the real scheduler',
  );

  const scheduledBoundary = {
    ...createRouteState(),
    zone: cleanBoundary + 9,
    deck: ['valorant', 'fortnite'],
    seenPackIds: ['valorant', 'fortnite'],
  };
  assert(
    routeWaveIdentityUnion(scheduledBoundary, motionPacks)
      .map(({ packId, assetId }) => `${packId}/${assetId}`)
      .join('|') ===
      'valorant/site-warden|fortnite/' +
        motionPacks
          .find(({ id }) => id === 'fortnite')
          .targets.map(({ id }) => id)
          .join('|fortnite/'),
    'scheduled non-adjacent 10→1 route window uses the real scheduler',
  );

  const revisitBoundary = {
    ...scheduledBoundary,
    zone: cleanBoundary + 19,
  };
  assert(
    routeWaveIdentityUnion(revisitBoundary, motionPacks)[0]?.packId ===
      'fortnite' &&
      routeWaveIdentityUnion(revisitBoundary, motionPacks).some(
        ({ packId }) => packId === 'valorant',
      ),
    'revisit route window follows the scheduler deck order',
  );

  // Nav contract (ADR-0007): exactly five primary destinations + the separate Gear FAB.
  // PR-3 renamed the display labels (Ship→Go Live, Hub→Route) while keeping the data-panel
  // IDs stable (A1 display/ID split), so every sheet stays wired to its handler.
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const navMatch = html.match(/<nav class="hud-nav"[\s\S]*?<\/nav>/);
  assert(navMatch, 'hud-nav present in index.html');
  const navHtml = navMatch[0];
  const navBtnCount = (navHtml.match(/class="nav-btn"/g) || []).length;
  assert(navBtnCount === 5, `exactly five nav destinations (found ${navBtnCount})`);
  const dests = [
    ...navHtml.matchAll(
      /<button\b[^>]*\bdata-panel="([^"]+)"[^>]*class="nav-btn"[\s\S]*?<span>([^<]+)<\/span>\s*<\/button>/g,
    ),
  ].map((m) => ({ panel: m[1], label: m[2].trim() }));
  assert(dests.length === 5, `each nav destination exposes a text label (parsed ${dests.length})`);
  assert(
    dests.map((d) => d.panel).join(',') === 'skills,ship,hub,meta,settings',
    'nav destination IDs stay stable (A1 display/ID split)',
  );
  assert(
    dests.map((d) => d.label).join(',') === 'Build,Go Live,Route,Boosts,Menu',
    'nav labels are the PR-3 set (Build · Go Live · Route · Boosts · Menu)',
  );
  assert(!dests.some((d) => /\b(?:Ship|Hub|Weapon)\b/.test(d.label)), 'no retired nav label leaks');
  assert(
    html.includes('id="btn-bag"') &&
      html.includes('data-panel="gear"') &&
      !dests.some((d) => d.panel === 'gear'),
    'Gear stays a separate FAB outside the five (ADR-0007)',
  );

  return [
    `${catalogCount} active Clean Era Packs`,
    'stable IDs and order',
    'five targets + boss',
    'pure deterministic scheduler',
    'bounded corruption tier',
    'real clean/scheduled/revisit wave windows',
    'five nav destinations + separate Gear FAB (ADR-0007)',
    'nav labels Build · Go Live · Route · Boosts · Menu',
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const message of checkRouteContract()) console.log(`OK ${message}`);
  console.log('ROUTE PASS');
}
