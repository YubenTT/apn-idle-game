import { createAssetStore, preloadRouteAssets, getCurrentPackAssets, releaseColdPacks, packWindowForRoute } from '../js/assets.js';
import { createRouteState } from '../js/route.js';

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
const loadJson = async (src) => ({ src, frames: { 'common-a': {}, 'common-b': {}, 'common-c': {}, elite: {}, event: {}, boss: {}, 'boss-break': {} } });
const warn = [];
const store = createAssetStore({ loadImage, loadJson, warn: (message) => warn.push(message) });
const route = createRouteState();

const firstWindow = packWindowForRoute(route);
assert(firstWindow.map((pack) => pack.id).join(',') === 'valorant,league', 'current and next pack window');
await preloadRouteAssets(store, route);
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

console.log(`ASSET LOADER PASS ${loads.length} resource attempts`);
