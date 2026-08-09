import { packForRoute } from './route.js?v=gaf2d-motion-v1';

const VALORANT_WAVE_POOLS = Object.freeze([
  Object.freeze(['stale']),
  Object.freeze(['rumor']),
  Object.freeze(['lag']),
  Object.freeze(['stale', 'rumor']),
  Object.freeze(['patch']),
  Object.freeze(['stale', 'lag']),
  Object.freeze(['rumor', 'patch']),
  Object.freeze(['stale', 'rumor', 'lag', 'patch']),
  Object.freeze(['event']),
  Object.freeze(['boss']),
]);

const TARGET_ROLE_BY_TYPE = Object.freeze({
  stale: 'common-a',
  rumor: 'common-b',
  lag: 'common-c',
  spoiler: 'elite',
  patch: 'elite',
  event: 'event',
});

const validPackWave = (value) => {
  return Number.isInteger(value) && value >= 1 && value <= 10
    ? value
    : null;
};

const routeZone = (route) => {
  const zone = Number(route?.zone);
  return Number.isFinite(zone) && zone >= 0 ? Math.floor(zone) : 0;
};

const uniqueStrings = (values) => [
  ...new Set(values.filter((value) => typeof value === 'string' && value)),
];

/**
 * Return the authored enemy-type pool for a 1-based pack wave.
 * `null` preserves the existing probability table for packs without one.
 */
export function enemyTypesForPackWave(packId, packWave) {
  if (packId !== 'valorant') return null;
  const wave = validPackWave(packWave);
  return wave ? VALORANT_WAVE_POOLS[wave - 1] : null;
}

/** Resolve one runtime enemy type to its pack-owned target identity. */
export function targetForEnemyType(pack, type) {
  if (!pack) return null;
  if (type === 'boss') return pack.boss || null;
  const role = TARGET_ROLE_BY_TYPE[type];
  return role
    ? pack.targets?.find((target) => target?.role === role) || null
    : null;
}

/**
 * Return every identity that can appear in one wave.
 *
 * Authored packs use their exact pool. Unknown/future packs stay conservative:
 * any target may appear on waves 1–9 under the legacy probability table, while
 * wave 10 remains the boss-only boundary.
 */
export function packWaveIdentityIds(pack, packWave) {
  const wave = validPackWave(packWave);
  if (!pack || !wave) return [];
  const authoredTypes = enemyTypesForPackWave(pack.id, wave);
  if (authoredTypes) {
    return uniqueStrings(
      authoredTypes.map((type) => targetForEnemyType(pack, type)?.id),
    );
  }
  if (wave === 10) return uniqueStrings([pack.boss?.id]);
  return uniqueStrings((pack.targets || []).map((target) => target?.id));
}

/**
 * Pack-qualified identity union for an explicit current/next wave pair.
 */
export function packWavePairIdentityUnion(
  currentPack,
  currentWave,
  nextPack,
  nextWave,
) {
  const union = [];
  const seen = new Set();
  for (const [pack, wave] of [
    [currentPack, currentWave],
    [nextPack, nextWave],
  ]) {
    if (!pack?.id) continue;
    for (const assetId of packWaveIdentityIds(pack, wave)) {
      const key = `${pack.id}/${assetId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      union.push({ packId: pack.id, assetId });
    }
  }
  return union;
}

/**
 * Resolve the current and next simulation wave through the production route
 * scheduler. The next wave is zone + 1, including the 10→1 pack boundary.
 */
export function routeWaveWindow(route, packs) {
  const zone = routeZone(route);
  const currentRoute = { ...route, zone };
  const nextRoute = { ...route, zone: zone + 1 };
  return [
    {
      pack: packForRoute(currentRoute, packs),
      wave: (zone % 10) + 1,
    },
    {
      pack: packForRoute(nextRoute, packs),
      wave: ((zone + 1) % 10) + 1,
    },
  ];
}

/** Every pack-qualified identity reachable in the real current/next window. */
export function routeWaveIdentityUnion(route, packs) {
  const [current, next] = routeWaveWindow(route, packs);
  return packWavePairIdentityUnion(
    current.pack,
    current.wave,
    next.pack,
    next.wave,
  );
}

/**
 * Motion resource keys reachable in the real current/next route window.
 * Pack qualification prevents equal asset IDs in different packs colliding.
 */
export function motionAssetIdsForRouteWindow(route, packs) {
  const packById = new Map((packs || []).map((pack) => [pack.id, pack]));
  return new Set(
    routeWaveIdentityUnion(route, packs)
      .filter(({ packId, assetId }) =>
        Object.hasOwn(
          packById.get(packId)?.motion?.characters || {},
          assetId,
        ),
      )
      .map(({ packId, assetId }) => `${packId}/${assetId}`),
  );
}
