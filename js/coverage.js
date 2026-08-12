export const COVERAGE_MAX_LEVEL = 5;
export const COVERAGE_MASTERY_COSTS = Object.freeze([25, 60, 120, 220, 360]);
const COVERAGE_YIELD_PER_LEVEL = 0.05;

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};

export const COVERAGE_SETS = deepFreeze([
  {
    id: 'S1',
    name: 'Tactical Feed',
    members: ['valorant', 'counter-strike-2', 'escape-from-tarkov'],
    openSlots: 0,
    capstone: 'Rapid Defuse',
    benefit: 'Version Gates in these Packs start 5% pre-damaged.',
    effect: 'gate_hp',
  },
  {
    id: 'S2',
    name: 'Hero Roster',
    members: ['overwatch', 'apex-legends', 'marvel-rivals'],
    openSlots: 0,
    capstone: 'Team-Up Echoes',
    benefit: 'A paired Echo treatment marks this Set in the Archive.',
    effect: 'cosmetic',
  },
  {
    id: 'S3',
    name: 'Prime Time',
    members: ['fc-26', 'nba-2k26', 'madden-nfl-26', 'rocket-league'],
    openSlots: 0,
    capstone: 'Clutch Window',
    benefit: 'Version Gates in these Packs award 10% more Notes.',
    effect: 'gate_notes',
  },
  {
    id: 'S4',
    name: 'Lane Wars',
    members: ['league', 'dota-2'],
    openSlots: 1,
    capstone: 'Last-Hit Bounty',
    benefit: 'The final normal target in these Packs awards 5% more Signal.',
    effect: 'final_signal',
  },
  {
    id: 'S5',
    name: 'Open Sandbox',
    members: ['minecraft', 'fortnite', 'grand-theft-auto-v'],
    openSlots: 0,
    capstone: 'Free Build',
    benefit: 'A permanent Route-card treatment marks this Set.',
    effect: 'cosmetic',
  },
  {
    id: 'S6',
    name: 'Nightmare Shift',
    members: ['dead-by-daylight', 'path-of-exile-2', 'elden-ring'],
    openSlots: 0,
    capstone: 'Hardened',
    benefit: 'Offline efficiency gains 5 points in these Packs, capped at 100%.',
    effect: 'offline_efficiency',
  },
  {
    id: 'S7',
    name: 'Long Grind',
    members: ['world-of-warcraft', 'old-school-runescape'],
    openSlots: 1,
    capstone: 'Idle Dividend',
    benefit: 'A persistent Long Grind badge marks this Set in the Archive.',
    effect: 'cosmetic',
  },
]);

const KNOWN_PACK_IDS = new Set(COVERAGE_SETS.flatMap((set) => set.members));
const KNOWN_SET_IDS = new Set(COVERAGE_SETS.map((set) => set.id));

const safeLevel = (value) =>
  Math.min(
    COVERAGE_MAX_LEVEL,
    Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0),
  );

const uniqueKnownSetIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === 'string' && KNOWN_SET_IDS.has(id)))]
    : [];

export function normalizeCoverageMeta(meta) {
  const source = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
  const masterySource =
    source.coverageMasteryByPack &&
    typeof source.coverageMasteryByPack === 'object' &&
    !Array.isArray(source.coverageMasteryByPack)
      ? source.coverageMasteryByPack
      : {};
  const coverageMasteryByPack = Object.fromEntries(
    Object.entries(masterySource)
      .filter(([packId, level]) => KNOWN_PACK_IDS.has(packId) && Number.isFinite(level))
      .map(([packId, level]) => [packId, safeLevel(level)])
      .filter(([, level]) => level > 0),
  );
  return {
    coverageMasteryByPack,
    claimedCoverageSetIds: uniqueKnownSetIds(source.claimedCoverageSetIds),
  };
}

export function ensureCoverageMeta(state) {
  if (!state.meta || typeof state.meta !== 'object' || Array.isArray(state.meta)) {
    state.meta = {};
  }
  const normalized = normalizeCoverageMeta(state.meta);
  state.meta.coverageMasteryByPack = normalized.coverageMasteryByPack;
  state.meta.claimedCoverageSetIds = normalized.claimedCoverageSetIds;
  return normalized;
}

export function coverageMasteryCost(currentLevel) {
  const level = Number.isFinite(currentLevel) ? Math.floor(currentLevel) : -1;
  return level >= 0 && level < COVERAGE_MAX_LEVEL
    ? COVERAGE_MASTERY_COSTS[level]
    : null;
}

export function coverageMasteryLevel(state, packId) {
  if (!KNOWN_PACK_IDS.has(packId)) return 0;
  return safeLevel(state?.meta?.coverageMasteryByPack?.[packId]);
}

export function isPackCovered(route, packId) {
  if (!KNOWN_PACK_IDS.has(packId)) return false;
  const gate = route?.cleanCompletedPackIds?.includes(packId) === true;
  const echoes = Math.max(
    0,
    Math.floor(Number(route?.echoProgressByPack?.[packId]?.found) || 0),
  );
  return gate && echoes >= 3;
}

export function coverageYieldMultiplier(state, packId, corruptionTier) {
  if (!(Number(corruptionTier) > 0)) return 1;
  return 1 + coverageMasteryLevel(state, packId) * COVERAGE_YIELD_PER_LEVEL;
}

export function buyCoverageMastery(state, packId) {
  if (!KNOWN_PACK_IDS.has(packId) || !isPackCovered(state?.route, packId)) return false;
  const normalized = ensureCoverageMeta(state);
  const level = safeLevel(normalized.coverageMasteryByPack[packId]);
  const cost = coverageMasteryCost(level);
  const rep = Number(state?.authority?.amount);
  if (cost == null || !Number.isFinite(rep) || rep < cost) return false;
  state.authority.amount = rep - cost;
  state.meta.coverageMasteryByPack[packId] = level + 1;
  return true;
}

const setDefinition = (setId, definitions = COVERAGE_SETS) =>
  definitions.find((set) => set?.id === setId) || null;

export function coverageSetStatus(state, route, setId, definitions = COVERAGE_SETS) {
  const set = setDefinition(setId, definitions);
  if (!set || !Array.isArray(set.members) || set.members.length === 0) return null;
  const coveredMembers = set.members.filter((packId) => isPackCovered(route, packId));
  const claimed = state?.meta?.claimedCoverageSetIds?.includes(setId) === true;
  return {
    id: set.id,
    state: claimed ? 'claimed' : coveredMembers.length === set.members.length ? 'ready' : 'progress',
    covered: coveredMembers.length,
    total: set.members.length,
    openSlots: Math.max(0, Math.floor(Number(set.openSlots) || 0)),
    members: [...set.members],
  };
}

export function claimCoverageSetCapstone(state, setId) {
  if (!KNOWN_SET_IDS.has(setId)) return false;
  const normalized = ensureCoverageMeta(state);
  if (normalized.claimedCoverageSetIds.includes(setId)) return false;
  const status = coverageSetStatus(state, state.route, setId);
  if (status?.state !== 'ready') return false;
  state.meta.claimedCoverageSetIds.push(setId);
  return true;
}

const capstoneActive = (state, setId, packId) => {
  const set = setDefinition(setId);
  return (
    set?.members.includes(packId) === true &&
    state?.meta?.claimedCoverageSetIds?.includes(setId) === true
  );
};

export const coverageBossHpMultiplier = (state, packId) =>
  capstoneActive(state, 'S1', packId) ? 0.95 : 1;

export const coverageGateNotesMultiplier = (state, packId, isGate) =>
  isGate && capstoneActive(state, 'S3', packId) ? 1.1 : 1;

export const coverageFinalTargetSignalMultiplier = (
  state,
  packId,
  isFinalNormalTarget,
) =>
  isFinalNormalTarget && capstoneActive(state, 'S4', packId) ? 1.05 : 1;

export function coverageOfflineEfficiency(state, packId, baseEfficiency) {
  const base = Math.min(1, Math.max(0, Number(baseEfficiency) || 0));
  return Math.min(1, base + (capstoneActive(state, 'S6', packId) ? 0.05 : 0));
}
