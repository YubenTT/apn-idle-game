import { GAME_PACKS } from './generated/game-packs.js?v=gaf2d-motion-v1';
import { packForRoute } from './route.js?v=gaf2d-motion-v1';
import { withRuntimeVersion } from './cache.js?v=gaf2d-motion-v1';

const browserImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Image failed: ${src}`));
  image.src = withRuntimeVersion(src);
});

const browserJson = async (src) => {
  const response = await fetch(withRuntimeVersion(src));
  if (!response.ok) throw new Error(`JSON failed ${response.status}: ${src}`);
  return response.json();
};

export function createAssetStore(options = {}) {
  return {
    packs: new Map(),
    pending: new Map(),
    currentId: null,
    nextId: null,
    catalog: options.catalog || GAME_PACKS,
    motionStore: options.motionStore || null,
    creatureStore: options.creatureStore || null,
    loadImage: options.loadImage || browserImage,
    loadJson: options.loadJson || browserJson,
    warn: options.warn || ((message) => console.warn(message)),
  };
}

export function packWindowForRoute(route, catalog = GAME_PACKS) {
  const current = packForRoute(route, catalog);
  const next = packForRoute({ ...route, zone: Math.max(0, route?.zone || 0) + 10 }, catalog);
  return [current, next].filter((pack, index, packs) => pack && packs.findIndex((item) => item.id === pack.id) === index);
}

async function optionalImage(store, src, label) {
  try {
    return await store.loadImage(src);
  } catch {
    store.warn(`${label}: optional props unavailable`);
    return null;
  }
}

async function loadPack(store, pack) {
  const [background, targets, targetData, props, corruptionMask] = await Promise.all([
    store.loadImage(pack.assets.background),
    store.loadImage(pack.assets.targets),
    store.loadJson(pack.assets.targetData),
    optionalImage(store, pack.assets.props, pack.id),
    optionalImage(store, pack.assets.corruptionMask, pack.id),
  ]);
  return { id: pack.id, pack, background, targets, targetData, props, corruptionMask, ready: true };
}

async function ensurePack(store, pack) {
  if (store.packs.has(pack.id)) return store.packs.get(pack.id);
  if (!store.pending.has(pack.id)) {
    store.pending.set(pack.id, loadPack(store, pack)
      .then((record) => {
        store.packs.set(pack.id, record);
        return record;
      })
      .catch((error) => {
        store.warn(`${pack.id}: required pack asset unavailable (${error.message})`);
        const fallback = { id: pack.id, pack, ready: false, error };
        store.packs.set(pack.id, fallback);
        return fallback;
      })
      .finally(() => store.pending.delete(pack.id)));
  }
  return store.pending.get(pack.id);
}

export function releaseColdPacks(store, keep) {
  for (const [id, record] of store.packs) {
    if (keep.has(id)) continue;
    for (const key of ['background', 'targets', 'props', 'corruptionMask']) record[key]?.close?.();
    store.packs.delete(id);
  }
}

export async function preloadRouteAssets(store, route) {
  const window = packWindowForRoute(route, store.catalog);
  store.currentId = window[0]?.id || null;
  store.nextId = window[1]?.id || null;
  await Promise.all(window.map((pack) => ensurePack(store, pack)));
  releaseColdPacks(store, new Set(window.map((pack) => pack.id)));
  return window.map((pack) => store.packs.get(pack.id));
}

export function getCurrentPackAssets(store, route) {
  const current = packForRoute(route, store.catalog);
  return current ? store.packs.get(current.id) || null : null;
}
