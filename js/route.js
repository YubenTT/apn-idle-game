const DEFAULT_SEED = 0x41504e;
const FIRST_PACK_ID = 'valorant';

const finiteInt = (value, fallback = 0) =>
  Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;

const stringList = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === 'string' && item.length > 0))]
    : [];

const numericRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, item]) => key.length > 0 && Number.isFinite(item) && item >= 0
    ).map(([key, item]) => [key, Math.floor(item)])
  );
};

export function createRouteState(seed = DEFAULT_SEED) {
  return {
    zone: 0,
    killsInZone: 0,
    currentPackId: FIRST_PACK_ID,
    seenPackIds: [],
    corruptionByPack: {},
    lastSeenByPack: {},
    deck: [],
    catalogVersion: 1,
    seed: finiteInt(seed, DEFAULT_SEED) >>> 0,
  };
}

export function normalizeRoute(route, legacyRun = null) {
  const base = createRouteState();
  const source = route && typeof route === 'object' ? route : {};
  const legacy = legacyRun && typeof legacyRun === 'object' ? legacyRun : {};
  const currentPackId =
    typeof source.currentPackId === 'string' && source.currentPackId.length > 0
      ? source.currentPackId
      : FIRST_PACK_ID;

  return {
    ...base,
    zone: finiteInt(source.zone, finiteInt(legacy.zone)),
    killsInZone: finiteInt(source.killsInZone, finiteInt(legacy.killsInZone)),
    currentPackId,
    seenPackIds: stringList(source.seenPackIds),
    corruptionByPack: numericRecord(source.corruptionByPack),
    lastSeenByPack: numericRecord(source.lastSeenByPack),
    deck: stringList(source.deck),
    catalogVersion: Math.max(1, finiteInt(source.catalogVersion, 1)),
    seed: finiteInt(source.seed, DEFAULT_SEED) >>> 0,
  };
}

export const routeZoneDisplay = (route) => finiteInt(route?.zone) + 1;
export const packZoneDisplay = (route) => (finiteInt(route?.zone) % 10) + 1;
export const nextSeasonBoundary = (zone) =>
  (Math.floor(finiteInt(zone) / 20) + 1) * 20;
