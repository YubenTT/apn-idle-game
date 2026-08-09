import { createAssetStore, preloadRouteAssets, getCurrentPackAssets, releaseColdPacks, packWindowForRoute } from '../js/assets.js';
import { createRouteState } from '../js/route.js';
import { firstPlayableAssetPaths } from '../scripts/assets/first-playable.mjs';
import { LEGACY_CREATURE_BOOT_ASSET_PATHS } from '../js/creatures.js';
import { packWavePairIdentityUnion } from '../js/wave-roster.js';
import { GAME_PACKS } from '../js/generated/game-packs.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Asset loader: ${message}`);
  console.log(`OK ${message}`);
};

const loads = [];
const loadImage = async (src) => {
  loads.push(src);
  if (src.includes('/props.webp')) throw new Error('optional prop missing');
  return { src, close() { this.closed = true; } };
};
const loadJson = async (src) => {
  loads.push(src);
  return { src, frames: { 'common-a': {}, 'common-b': {}, 'common-c': {}, elite: {}, event: {}, boss: {}, 'boss-break': {} } };
};
const warn = [];
const store = createAssetStore({ loadImage, loadJson, warn: (message) => warn.push(message) });
const route = createRouteState();

const injectedValorant = {
  ...GAME_PACKS.find((pack) => pack.id === 'valorant'),
  previewAuthority: 'unapproved_preview',
};
const injectedCatalog = GAME_PACKS.map((pack) =>
  pack.id === 'valorant' ? injectedValorant : pack,
);
const injectedWarn = [];
const injectedStore = createAssetStore({
  catalog: injectedCatalog,
  loadImage,
  loadJson,
  warn: (message) => injectedWarn.push(message),
});
assert(
  packWindowForRoute(route, injectedCatalog)[0]?.previewAuthority ===
    'unapproved_preview',
  'route window honors an explicitly injected runtime catalog',
);
await preloadRouteAssets(injectedStore, route);
assert(
  injectedStore.catalog === injectedCatalog &&
    getCurrentPackAssets(injectedStore, route)?.pack?.previewAuthority ===
      'unapproved_preview',
  'asset store owns and resolves the injected runtime pack without touching defaults',
);

const firstWindow = packWindowForRoute(route);
assert(firstWindow.map((pack) => pack.id).join(',') === 'valorant,league', 'current and next pack window');
await preloadRouteAssets(store, route);
const firstPlayable = firstPlayableAssetPaths(firstWindow);
assert(
  loads.every((assetPath) => firstPlayable.has(assetPath)),
  'real current/next pack network requests are first-playable',
);
assert(
  LEGACY_CREATURE_BOOT_ASSET_PATHS.every((assetPath) => !firstPlayable.has(assetPath)),
  'legacy creature atlases are no longer first-playable boot assets',
);
assert(store.packs.size === 2, 'two decoded pack records maximum');
assert(store.currentId === 'valorant' && store.nextId === 'league', 'store ownership recorded');
assert(getCurrentPackAssets(store, route)?.id === 'valorant', 'current pack lookup');
assert(warn.length === 2 && warn.every((message) => message.includes('optional props')), 'missing optional prop warns without blocking');

route.zone = 10;
await preloadRouteAssets(store, route);
assert(store.packs.size === 2 && store.packs.has('league') && store.packs.has('fortnite'), 'season transition releases stale pack');
assert(store.packs.get('valorant') == null, 'cold pack reference removed');

route.zone = 199;
await preloadRouteAssets(store, route);
assert(store.currentId === 'elden-ring', 'Zone 200 current pack');
assert(store.packs.size <= 2, 'Zone 200 respects decoded cap');

route.zone = 200;
route.seenPackIds = firstWindow.map((pack) => pack.id);
await preloadRouteAssets(store, route);
assert(store.packs.size <= 2, 'Zone 201 respects decoded cap');
releaseColdPacks(store, new Set([store.currentId]));
assert(store.packs.size === 1, 'explicit cold release');

const scheduled = createRouteState();
scheduled.zone = 200;
scheduled.deck = ['valorant', 'fortnite'];
scheduled.seenPackIds = ['valorant', 'fortnite'];
const scheduledWindow = packWindowForRoute(scheduled);
assert(
  scheduledWindow.map((pack) => pack.id).join(',') === 'valorant,fortnite',
  'scheduled window preserves an explicit non-adjacent pack pairing',
);
const scheduledUnion = packWavePairIdentityUnion(
  scheduledWindow[0],
  10,
  scheduledWindow[1],
  1,
);
assert(
  scheduledUnion.some(
    ({ packId, assetId }) =>
      packId === 'valorant' && assetId === 'site-warden',
  ) &&
    scheduledUnion.filter(({ packId }) => packId === 'fortnite').length === 5,
  'scheduled 10→1 identity union is conservative across non-adjacent packs',
);
scheduled.zone = 210;
assert(
  packWindowForRoute(scheduled).map((pack) => pack.id).join(',') ===
    'fortnite,valorant',
  'revisit window preserves the scheduler reverse pairing',
);

console.log(`ASSET LOADER PASS ${loads.length} resource attempts`);
