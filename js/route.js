const DEFAULT_SEED = 0x41504e;
const FIRST_PACK_ID = 'valorant';
export const ECHO_TOTAL = 3;
export const ROUTE_HISTORY_LIMIT = 60;
export const SIGNAL_DRIFT_ZONE = 200;
const ECHO_WAVES = Object.freeze([3, 6, 9]);
const PACK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isPackId = (value) =>
  typeof value === 'string' && PACK_ID_PATTERN.test(value);

const finiteInt = (value, fallback = 0) =>
  Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;

const stringList = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter(isPackId))]
    : [];

const numericRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, item]) => isPackId(key) && Number.isFinite(item) && item >= 0
    ).map(([key, item]) => [key, Math.floor(item)])
  );
};

const echoRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, item]) =>
          isPackId(key) &&
          item &&
          typeof item === 'object' &&
          !Array.isArray(item),
      )
      .map(([key, item]) => [
        key,
        {
          found: Math.min(ECHO_TOTAL, finiteInt(item.found)),
          total: ECHO_TOTAL,
        },
      ]),
  );
};

const historyList = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        isPackId(item.packId) &&
        Number.isFinite(item.visit) &&
        item.visit >= 1 &&
        Number.isFinite(item.completedAtZone) &&
        item.completedAtZone >= 1,
    )
    .map((item) => ({
      packId: item.packId,
      visit: Math.max(1, Math.floor(item.visit)),
      tier: Math.min(4, finiteInt(item.tier)),
      completedAtZone: Math.max(1, Math.floor(item.completedAtZone)),
      clean: item.clean === true,
    }))
    .slice(0, ROUTE_HISTORY_LIMIT);
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
    echoProgressByPack: {},
    cleanCompletedPackIds: [],
    packVisitCountById: {},
    history: [],
    cleanEraCompleted: false,
    cleanEraCompletedAtZone: 0,
    catalogVersion: 1,
    seed: finiteInt(seed, DEFAULT_SEED) >>> 0,
  };
}

export function normalizeRoute(route, legacyRun = null) {
  const base = createRouteState();
  const source = route && typeof route === 'object' ? route : {};
  const legacy = legacyRun && typeof legacyRun === 'object' ? legacyRun : {};
  const zone = finiteInt(source.zone, finiteInt(legacy.zone));
  const currentPackId =
    isPackId(source.currentPackId)
      ? source.currentPackId
      : FIRST_PACK_ID;
  const seenPackIds = stringList(source.seenPackIds);
  const corruptionByPack = Object.fromEntries(
    Object.entries(numericRecord(source.corruptionByPack)).map(([key, value]) => [
      key,
      Math.min(4, value),
    ]),
  );
  // `seenPackIds` is historical proof that a Pack Gate was completed. Union it
  // with the new explicit list so progress earned while an older v3 rollback is
  // active is folded back into the new journey instead of being discarded.
  const cleanCompletedPackIds = stringList([
    ...stringList(source.cleanCompletedPackIds),
    ...seenPackIds,
  ]);
  const packVisitCountById = numericRecord(source.packVisitCountById);
  for (const packId of seenPackIds) {
    packVisitCountById[packId] = Math.max(
      finiteInt(packVisitCountById[packId]),
      1 + finiteInt(corruptionByPack[packId]),
    );
  }
  const lastSeenByPack = numericRecord(source.lastSeenByPack);
  const reconstructedHistory = historyList(source.history);
  for (const packId of seenPackIds) {
    const completedAtZone = finiteInt(lastSeenByPack[packId]);
    const latestRecordedZone = reconstructedHistory.reduce(
      (latest, entry) =>
        entry.packId === packId
          ? Math.max(latest, entry.completedAtZone)
          : latest,
      0,
    );
    if (completedAtZone <= latestRecordedZone) continue;
    const visit = Math.max(1, finiteInt(packVisitCountById[packId], 1));
    reconstructedHistory.push({
      packId,
      visit,
      tier: Math.min(4, finiteInt(corruptionByPack[packId])),
      completedAtZone,
      clean: visit === 1,
    });
  }
  reconstructedHistory.sort(
    (a, b) => b.completedAtZone - a.completedAtZone,
  );
  const history = reconstructedHistory.slice(0, ROUTE_HISTORY_LIMIT);
  const legacyJourneyShape =
    source.echoProgressByPack === undefined &&
    source.cleanCompletedPackIds === undefined &&
    source.cleanEraCompleted === undefined;
  const legacyCleanEraCompleted =
    legacyJourneyShape &&
    zone >= SIGNAL_DRIFT_ZONE &&
    cleanCompletedPackIds.length >= SIGNAL_DRIFT_ZONE / 10;
  const cleanEraCompleted =
    source.cleanEraCompleted === true || legacyCleanEraCompleted;

  return {
    ...base,
    zone,
    killsInZone: finiteInt(source.killsInZone, finiteInt(legacy.killsInZone)),
    currentPackId,
    seenPackIds,
    corruptionByPack,
    lastSeenByPack,
    deck: stringList(source.deck),
    echoProgressByPack: echoRecord(source.echoProgressByPack),
    cleanCompletedPackIds,
    packVisitCountById,
    history,
    cleanEraCompleted,
    cleanEraCompletedAtZone: cleanEraCompleted
      ? legacyCleanEraCompleted
        ? SIGNAL_DRIFT_ZONE
        : finiteInt(source.cleanEraCompletedAtZone)
      : 0,
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

export function echoProgressFor(route, packId) {
  const progress = route?.echoProgressByPack?.[packId];
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    return { found: 0, total: ECHO_TOTAL };
  }
  return {
    found: Math.min(ECHO_TOTAL, finiteInt(progress.found)),
    total: ECHO_TOTAL,
  };
}

const cloneRoute = (route) => ({
  ...route,
  seenPackIds: [...route.seenPackIds],
  corruptionByPack: { ...route.corruptionByPack },
  lastSeenByPack: { ...route.lastSeenByPack },
  deck: [...route.deck],
  echoProgressByPack: Object.fromEntries(
    Object.entries(route.echoProgressByPack).map(([packId, progress]) => [
      packId,
      { ...progress },
    ]),
  ),
  cleanCompletedPackIds: [...route.cleanCompletedPackIds],
  packVisitCountById: { ...route.packVisitCountById },
  history: route.history.map((entry) => ({ ...entry })),
});

/**
 * Pure Route-domain transition for one completed zone. Combat owns the kill;
 * this helper owns only durable journey state and emits small UI-facing facts.
 */
export function recordRouteZoneClear(route, catalog, completedZone) {
  const current = normalizeRoute(route);
  const zone = finiteInt(completedZone, current.zone);
  if (zone !== current.zone) {
    throw new RangeError('completed Route zone must equal the current Route zone');
  }

  const packs = orderedCatalog(catalog || []);
  const completedPack = packForRoute(current, packs);
  const next = cloneRoute(current);
  const completedWave = (zone % 10) + 1;
  let echo = null;
  let completion = null;

  if (completedPack) {
    const echoIndex = ECHO_WAVES.indexOf(completedWave);
    if (echoIndex >= 0) {
      const slot = echoIndex + 1;
      const progress = echoProgressFor(current, completedPack.id);
      if (progress.found < slot) {
        next.echoProgressByPack[completedPack.id] = {
          found: slot,
          total: ECHO_TOTAL,
        };
        echo = { packId: completedPack.id, slot, total: ECHO_TOTAL };
      }
    }
  }

  next.zone = zone + 1;
  next.killsInZone = 0;

  if (completedPack && completedWave === 10) {
    const alreadySeen = current.seenPackIds.includes(completedPack.id);
    const visit = finiteInt(current.packVisitCountById[completedPack.id]) + 1;
    const tier = Math.min(4, finiteInt(completedPack.tier));

    next.packVisitCountById[completedPack.id] = visit;
    next.lastSeenByPack[completedPack.id] = next.zone;
    if (!alreadySeen) {
      next.seenPackIds.push(completedPack.id);
      if (!next.cleanCompletedPackIds.includes(completedPack.id)) {
        next.cleanCompletedPackIds.push(completedPack.id);
      }
    } else {
      next.corruptionByPack[completedPack.id] = Math.min(
        4,
        finiteInt(current.corruptionByPack[completedPack.id]) + 1,
      );
    }

    completion = {
      packId: completedPack.id,
      visit,
      tier,
      completedAtZone: next.zone,
      clean: !alreadySeen,
    };
    next.history = [completion, ...current.history].slice(0, ROUTE_HISTORY_LIMIT);

    const allActivePacksComplete =
      packs.length > 0 &&
      packs.every((pack) => next.cleanCompletedPackIds.includes(pack.id));
    if (!next.cleanEraCompleted && allActivePacksComplete) {
      next.cleanEraCompleted = true;
      next.cleanEraCompletedAtZone = next.zone;
    }

    const cleanBoundary = packs.length * 10;
    if (zone >= cleanBoundary) {
      const postgamePackIndex = Math.floor(zone / 10) - packs.length;
      if (postgamePackIndex % 2 === 0) {
        next.deck = current.deck.length
          ? [...current.deck]
          : scheduleNextSeason(current, packs).map((pack) => pack.id);
      } else {
        next.deck = [];
      }
    }
  }

  const nextPack = packForRoute(next, packs);
  if (nextPack) next.currentPackId = nextPack.id;

  return {
    route: next,
    echo,
    completion,
    nextPackId: nextPack?.id || null,
  };
}

/** Read-only projection shared by Route UI, QA text, and browser evidence. */
export function routeJourney(route, catalog) {
  const currentRoute = normalizeRoute(route);
  const packs = orderedCatalog(catalog || []);
  const current = packForRoute(currentRoute, packs);
  const nextBoundaryZone = (Math.floor(currentRoute.zone / 10) + 1) * 10;
  const boundaryPreview = recordRouteZoneClear(
    { ...currentRoute, zone: nextBoundaryZone - 1, killsInZone: 0 },
    packs,
    nextBoundaryZone - 1,
  );
  const next = packForRoute(boundaryPreview.route, packs);
  const activeIds = new Set(packs.map((pack) => pack.id));
  const completedCount = currentRoute.cleanCompletedPackIds.filter((packId) =>
    activeIds.has(packId),
  ).length;
  const completed =
    currentRoute.cleanEraCompleted ||
    (packs.length > 0 && completedCount === packs.length);
  const tier = Math.min(4, finiteInt(current?.tier));

  return {
    current,
    next,
    packWave: (currentRoute.zone % 10) + 1,
    echo: echoProgressFor(currentRoute, current?.id),
    cleanEra: {
      completed,
      completedCount,
      total: packs.length,
      completedAtZone: currentRoute.cleanEraCompletedAtZone,
    },
    signalDrift: {
      unlocked: currentRoute.zone >= SIGNAL_DRIFT_ZONE,
      tier,
      label: tier > 0 ? `Signal Drift ${tier}` : 'Clean',
    },
    history: currentRoute.history.map((entry) => ({ ...entry })),
  };
}
