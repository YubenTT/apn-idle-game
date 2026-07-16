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

const orderedCatalog = (catalog) => [...catalog].sort((a, b) => a.order - b.order);

const hashId = (id) => {
  let hash = 2166136261;
  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const xorshift32 = (seed) => {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
};

const chooseDifferentGenre = (candidates, chosen) =>
  candidates.find((pack) => !chosen.some((item) => item.id === pack.id || item.genre === pack.genre)) ||
  candidates.find((pack) => !chosen.some((item) => item.id === pack.id));

export function corruptionTierFor(route, packId) {
  if (!stringList(route?.seenPackIds).includes(packId)) return 0;
  const epochTier = Math.min(4, Math.floor(finiteInt(route?.zone) / 200));
  const completedTier = finiteInt(route?.corruptionByPack?.[packId]);
  return Math.min(epochTier, completedTier + 1);
}

export function scheduleNextSeason(route, catalog) {
  const packs = orderedCatalog(catalog || []);
  if (packs.length === 0) return [];
  const seen = new Set(stringList(route?.seenPackIds));
  const unseen = packs.filter((pack) => !seen.has(pack.id));
  const selected = [];

  if (unseen.length > 0) {
    selected.push(unseen[0]);
    const second = chooseDifferentGenre(unseen.slice(1), selected);
    if (second) selected.push(second);
  }

  if (selected.length < 2) {
    const seed = finiteInt(route?.seed, DEFAULT_SEED) >>> 0;
    const lastSeen = route?.lastSeenByPack || {};
    const revisit = packs
      .filter((pack) => seen.has(pack.id) && !selected.some((item) => item.id === pack.id))
      .sort((a, b) => {
        const recency = finiteInt(lastSeen[a.id], 0) - finiteInt(lastSeen[b.id], 0);
        if (recency !== 0) return recency;
        const aTie = xorshift32(seed ^ hashId(a.id));
        const bTie = xorshift32(seed ^ hashId(b.id));
        return aTie - bTie || a.order - b.order;
      });
    while (selected.length < 2) {
      const next = chooseDifferentGenre(revisit, selected);
      if (!next) break;
      selected.push(next);
      revisit.splice(revisit.indexOf(next), 1);
    }
  }

  return selected.map((pack) => ({
    ...pack,
    tier: seen.has(pack.id) ? corruptionTierFor(route, pack.id) : 0,
  }));
}

export function packForRoute(route, catalog) {
  const packs = orderedCatalog(catalog || []);
  if (packs.length === 0) return null;
  const zone = finiteInt(route?.zone);
  const cleanIndex = Math.floor(zone / 10);
  if (cleanIndex < packs.length) return { ...packs[cleanIndex], tier: 0 };

  const deck = stringList(route?.deck);
  const scheduled = deck.length
    ? deck.map((id) => packs.find((pack) => pack.id === id)).filter(Boolean).map((pack) => ({
        ...pack,
        tier: corruptionTierFor(route, pack.id),
      }))
    : scheduleNextSeason(route, packs);
  if (scheduled.length === 0) return { ...packs[0], tier: corruptionTierFor(route, packs[0].id) };
  return scheduled[Math.floor(zone / 10) % scheduled.length];
}
