import { HERO_V3_CLIPS as HERO_CLIP_NAMES } from '../../js/hero-v3-contract.js';
import { packForRoute } from '../../js/route.js';
import {
  packWaveIdentityIds,
  routeWaveWindow,
} from '../../js/wave-roster.js';

export const HERO_V3_CLIPS = HERO_CLIP_NAMES;

export const PACK_TEXTURE_KEYS = Object.freeze([
  'background',
  'targets',
  'targetData',
  'props',
  'corruptionMask',
]);

const BOOT_UI_ASSET_PATHS = Object.freeze([
  'assets/apn-logo.svg',
  'assets/items/item-atlas.webp',
]);

export function motionAssetIdsForPackWave(pack, packWave) {
  return packWaveIdentityIds(pack, packWave).filter(
    (assetId) =>
      pack?.motion?.characters &&
      Object.hasOwn(pack.motion.characters, assetId),
  );
}

/**
 * Exact compressed asset request set before the initial simulation starts.
 */
export function firstPlayableAssetPaths(packs) {
  const paths = new Set([
    ...BOOT_UI_ASSET_PATHS,
    'assets/mascot/v3/set.json',
  ]);
  for (const clip of HERO_V3_CLIPS) {
    paths.add(`assets/mascot/v3/${clip}.webp`);
    paths.add(`assets/mascot/v3/${clip}.json`);
  }

  const orderedPacks = [...(Array.isArray(packs) ? packs : [])].sort(
    (left, right) =>
      (left?.order ?? Number.MAX_SAFE_INTEGER) -
        (right?.order ?? Number.MAX_SAFE_INTEGER) ||
      String(left?.id || '').localeCompare(String(right?.id || '')),
  );
  const initialRoute = { zone: 0 };
  const initialPackWindow = [
    packForRoute(initialRoute, orderedPacks),
    packForRoute({ ...initialRoute, zone: 10 }, orderedPacks),
  ].filter(
    (pack, index, window) =>
      pack && window.findIndex((candidate) => candidate?.id === pack.id) === index,
  );
  for (const pack of initialPackWindow) {
    for (const key of PACK_TEXTURE_KEYS) {
      const assetPath = pack?.assets?.[key];
      if (typeof assetPath === 'string') paths.add(assetPath);
    }
  }

  const [{ pack: currentPack, wave: currentWave }] = routeWaveWindow(
    initialRoute,
    orderedPacks,
  );
  for (const assetId of motionAssetIdsForPackWave(currentPack, currentWave)) {
    const record = currentPack.motion.characters[assetId];
    if (typeof record?.image === 'string') paths.add(record.image);
    if (typeof record?.descriptor === 'string') paths.add(record.descriptor);
  }
  return paths;
}
