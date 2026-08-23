import { C } from './formulas.js?v=gaf2d-motion-v1';
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

export const WAVE_TYPES = Object.freeze([
  'stale',
  'rumor',
  'lag',
  'spoiler',
  'patch',
  'event',
  'boss',
]);

const WAVE_WEIGHT_TOTAL = 1000;
const GATE_WAVE = 10;

/**
 * Authored Pack composition rhythms — waves 1–9 as
 * `[patch, lag, spoiler, event, stale]` weights per 1000; `rumor` takes the
 * remainder. Wave 10 is the Gate and is owned by the boss-zone rule.
 *
 * Every table sums to 1260 patch weight and 900 elite-family weight across its
 * nine waves, so each Pack's expected champion (0.14) and elite (0.10) frequency
 * matches the probability table exactly. Packs differ in where those beats land
 * and which elite/common flavor carries them, never in the totals.
 *
 * Those two totals are the balance contract and are enforced by
 * `qa/check-wave-roster.mjs`. The flavor split inside a wave — how the elite
 * weight divides across lag/spoiler/event, and stale against rumor — carries the
 * same HP budget either way, so it is the free knob when the seeded pacing
 * profiles in `qa/check-balance-targets.mjs` need retuning.
 */
const PACK_WAVE_RHYTHMS = Object.freeze({
  // moba · lane phase, then the objective call
  league: [
    [0, 0, 0, 0, 600],
    [0, 0, 0, 0, 450],
    [60, 0, 40, 0, 500],
    [120, 0, 120, 40, 380],
    [140, 40, 120, 20, 340],
    [200, 40, 120, 40, 320],
    [280, 60, 60, 40, 280],
    [320, 40, 80, 40, 260],
    [140, 0, 0, 0, 430],
  ],
  // battle royale · supply drop early, circle compression late
  fortnite: [
    [60, 0, 0, 40, 480],
    [80, 0, 20, 180, 380],
    [100, 40, 0, 40, 430],
    [120, 40, 20, 20, 420],
    [140, 60, 20, 20, 380],
    [160, 60, 20, 20, 370],
    [180, 60, 40, 20, 350],
    [200, 60, 40, 20, 340],
    [220, 40, 20, 0, 360],
  ],
  // mmorpg · trash, mini-boss, trash, mini-boss
  'world-of-warcraft': [
    [60, 20, 0, 0, 470],
    [80, 20, 0, 0, 460],
    [120, 140, 20, 60, 340],
    [100, 20, 0, 0, 450],
    [120, 40, 0, 20, 410],
    [220, 140, 40, 60, 280],
    [140, 40, 0, 20, 400],
    [160, 40, 20, 20, 380],
    [260, 100, 40, 40, 280],
  ],
  // football · two halves, whistle beats on 5 and 9
  'fc-26': [
    [100, 20, 0, 20, 440],
    [120, 20, 0, 20, 430],
    [140, 20, 20, 40, 390],
    [220, 20, 20, 40, 350],
    [100, 160, 20, 20, 350],
    [120, 20, 20, 40, 400],
    [140, 20, 20, 40, 390],
    [220, 20, 20, 40, 350],
    [100, 180, 20, 20, 340],
  ],
  // sandbox survival · calm days, event nights on 4 and 8
  minecraft: [
    [60, 0, 0, 20, 480],
    [80, 0, 0, 20, 470],
    [120, 0, 20, 40, 420],
    [140, 140, 20, 40, 330],
    [100, 20, 0, 20, 440],
    [280, 20, 40, 80, 290],
    [120, 0, 20, 40, 420],
    [160, 140, 20, 40, 320],
    [200, 40, 40, 80, 320],
  ],
  // tactical shooter · save rounds, elite-forward mid, one full buy
  'counter-strike-2': [
    [20, 0, 0, 0, 520],
    [40, 0, 0, 20, 490],
    [100, 0, 20, 60, 430],
    [140, 20, 60, 140, 320],
    [160, 20, 60, 120, 320],
    [180, 20, 40, 100, 330],
    [320, 20, 20, 60, 290],
    [180, 20, 20, 40, 370],
    [120, 20, 0, 20, 420],
  ],
  // mmorpg · patient task grind that only pays out at the end
  'old-school-runescape': [
    [40, 0, 20, 0, 480],
    [60, 0, 20, 0, 470],
    [80, 0, 40, 0, 450],
    [80, 20, 40, 0, 440],
    [100, 20, 40, 0, 430],
    [120, 20, 80, 20, 380],
    [140, 20, 120, 20, 340],
    [280, 40, 120, 40, 280],
    [360, 60, 120, 40, 220],
  ],
  // basketball · scoring runs, momentum swings, buzzer
  'nba-2k26': [
    [80, 20, 0, 0, 470],
    [200, 60, 20, 20, 350],
    [80, 20, 20, 140, 370],
    [180, 40, 20, 20, 370],
    [80, 20, 0, 20, 440],
    [200, 60, 20, 20, 350],
    [80, 20, 20, 140, 370],
    [180, 40, 20, 20, 370],
    [180, 60, 40, 20, 350],
  ],
  // hero shooter · payload checkpoints on 2, 5, 8
  overwatch: [
    [80, 0, 20, 0, 470],
    [100, 20, 120, 40, 360],
    [100, 20, 20, 0, 440],
    [120, 0, 20, 20, 420],
    [240, 20, 120, 40, 290],
    [120, 0, 20, 20, 420],
    [140, 20, 20, 0, 410],
    [140, 20, 120, 40, 340],
    [220, 40, 100, 40, 300],
  ],
  // open world · escalating pursuit, both axes climbing every wave
  'grand-theft-auto-v': [
    [20, 0, 0, 0, 520],
    [40, 0, 0, 20, 490],
    [80, 0, 0, 40, 460],
    [100, 0, 20, 40, 430],
    [140, 20, 20, 60, 400],
    [180, 20, 40, 60, 360],
    [200, 40, 40, 80, 320],
    [240, 40, 40, 100, 290],
    [260, 40, 60, 120, 260],
  ],
  // football · four quarters, champion pulse closing each one
  'madden-nfl-26': [
    [80, 20, 20, 0, 450],
    [80, 0, 40, 20, 430],
    [240, 20, 60, 20, 330],
    [80, 20, 40, 20, 420],
    [100, 140, 20, 20, 360],
    [240, 20, 60, 20, 330],
    [80, 0, 20, 20, 450],
    [100, 20, 60, 40, 380],
    [260, 20, 120, 40, 280],
  ],
  // battle royale · contested drop first, ring pressure last
  'apex-legends': [
    [280, 80, 40, 40, 280],
    [240, 60, 20, 20, 330],
    [120, 20, 20, 0, 420],
    [80, 20, 0, 0, 450],
    [60, 20, 0, 0, 460],
    [80, 40, 20, 0, 430],
    [120, 60, 20, 20, 390],
    [140, 100, 40, 40, 340],
    [140, 120, 40, 60, 320],
  ],
  // moba · two jungle pulls, one contested pit
  'dota-2': [
    [40, 0, 0, 0, 500],
    [80, 0, 0, 40, 440],
    [100, 60, 20, 180, 320],
    [120, 0, 0, 40, 420],
    [260, 20, 20, 40, 330],
    [120, 20, 0, 40, 410],
    [140, 60, 40, 160, 300],
    [240, 20, 20, 60, 330],
    [160, 20, 0, 40, 390],
  ],
  // horror · near-silent generators, then the endgame collapse
  'dead-by-daylight': [
    [20, 20, 0, 0, 500],
    [40, 20, 0, 0, 490],
    [40, 20, 20, 0, 470],
    [60, 40, 20, 0, 450],
    [80, 40, 20, 20, 420],
    [100, 20, 20, 160, 350],
    [180, 60, 40, 20, 350],
    [320, 80, 40, 20, 270],
    [420, 100, 60, 60, 180],
  ],
  // action rpg · no quiet wave, champions clustered mid-map
  'path-of-exile-2': [
    [80, 40, 20, 20, 440],
    [100, 80, 20, 20, 390],
    [100, 60, 40, 20, 390],
    [120, 40, 20, 0, 420],
    [240, 60, 20, 20, 330],
    [260, 60, 20, 20, 320],
    [120, 40, 20, 20, 400],
    [120, 60, 40, 20, 380],
    [120, 60, 20, 40, 380],
  ],
  // hero shooter · paired spikes, quiet singles between them
  'marvel-rivals': [
    [60, 20, 0, 0, 480],
    [80, 20, 0, 0, 470],
    [200, 100, 40, 20, 320],
    [200, 100, 40, 20, 320],
    [80, 20, 0, 20, 450],
    [80, 20, 20, 0, 450],
    [220, 100, 40, 40, 300],
    [220, 100, 40, 40, 300],
    [120, 60, 20, 20, 390],
  ],
  // extraction shooter · escalating raid, then a quiet exit
  'escape-from-tarkov': [
    [40, 0, 20, 0, 490],
    [60, 0, 40, 0, 470],
    [80, 0, 60, 20, 440],
    [100, 20, 80, 20, 400],
    [140, 20, 100, 40, 360],
    [180, 20, 100, 40, 340],
    [300, 40, 100, 40, 270],
    [300, 20, 60, 20, 300],
    [60, 20, 20, 0, 460],
  ],
  // driving sport · kickoff, alternating scoring bursts, overtime
  'rocket-league': [
    [60, 20, 0, 140, 400],
    [180, 60, 20, 20, 360],
    [60, 20, 0, 0, 480],
    [200, 60, 20, 20, 350],
    [60, 20, 0, 0, 480],
    [200, 60, 20, 20, 350],
    [80, 20, 0, 20, 450],
    [220, 60, 40, 20, 330],
    [200, 60, 20, 160, 280],
  ],
  // action rpg · empty field, then a dense catacomb, then a champion
  'elden-ring': [
    [40, 0, 0, 0, 500],
    [60, 40, 40, 100, 380],
    [220, 0, 0, 20, 380],
    [80, 0, 0, 0, 460],
    [80, 60, 60, 120, 340],
    [240, 0, 20, 20, 360],
    [100, 0, 0, 0, 450],
    [100, 80, 60, 160, 300],
    [340, 20, 40, 60, 280],
  ],
});

/**
 * A beat is the exact draw ladder the spawn selector walks: champion share,
 * elite-family share, then the conditional flavor splits inside each family.
 */
const beatFromWeights = ([patch, lag, spoiler, event, stale]) => {
  const elite = lag + spoiler + event;
  const flavored = spoiler + event;
  const common = WAVE_WEIGHT_TOTAL - patch - elite;
  return Object.freeze({
    patch: patch / WAVE_WEIGHT_TOTAL,
    elite: elite / WAVE_WEIGHT_TOTAL,
    lagShare: elite ? lag / elite : 0,
    spoilerShare: flavored ? spoiler / flavored : 0,
    staleShare: common ? stale / common : 0,
  });
};

/** Probability-table beat — the defensive fallback for an unauthored Pack ID. */
export const DEFAULT_WAVE_BEAT = Object.freeze({
  patch: C.CHAMPION_CHANCE,
  elite: C.ELITE_CHANCE,
  lagShare: 0.5,
  spoilerShare: 0.5,
  staleShare: 0.5,
});

const PACK_WAVE_BEATS = Object.freeze(
  Object.fromEntries(
    Object.entries(PACK_WAVE_RHYTHMS).map(([packId, waves]) => [
      packId,
      Object.freeze(waves.map(beatFromWeights)),
    ]),
  ),
);

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

/**
 * Authored composition beat for a 1-based pack wave.
 * `null` routes the caller to the probability table: Packs whose composition is
 * already authored as creature pools, the Gate wave, and unknown Pack IDs.
 */
export function waveBeatForPack(packId, packWave) {
  const wave = validPackWave(packWave);
  if (!wave || wave === GATE_WAVE) return null;
  return PACK_WAVE_BEATS[packId]?.[wave - 1] || null;
}

/** Walk one beat's draw ladder. Falls back to the probability table beat. */
export function rollWaveEnemyType(beat, random = Math.random) {
  const ladder = beat || DEFAULT_WAVE_BEAT;
  const roll = random();
  if (roll < ladder.patch) return 'patch';
  if (roll < ladder.patch + ladder.elite) {
    return random() < ladder.lagShare
      ? 'lag'
      : random() < ladder.spoilerShare
        ? 'spoiler'
        : 'event';
  }
  return random() < ladder.staleShare ? 'stale' : 'rumor';
}

const emptyMix = () =>
  Object.fromEntries(WAVE_TYPES.map((type) => [type, 0]));

/**
 * Analytic type frequencies for one pack wave — the balance-envelope authority.
 * Creature-pool Packs report their pool as a uniform mix; every other Pack
 * reports its authored beat (or the probability table when unauthored).
 */
export function waveTypeMixForPack(packId, packWave) {
  const wave = validPackWave(packWave);
  if (!wave) return null;
  const mix = emptyMix();
  const pool = enemyTypesForPackWave(packId, wave);
  if (pool?.length) {
    for (const type of pool) mix[type] += 1 / pool.length;
    return Object.freeze(mix);
  }
  if (wave === GATE_WAVE) {
    mix.boss = 1;
    return Object.freeze(mix);
  }
  const beat = waveBeatForPack(packId, wave) || DEFAULT_WAVE_BEAT;
  const lag = beat.elite * beat.lagShare;
  const flavored = beat.elite - lag;
  const common = 1 - beat.patch - beat.elite;
  mix.stale = common * beat.staleShare;
  mix.rumor = common - mix.stale;
  mix.lag = lag;
  mix.spoiler = flavored * beat.spoilerShare;
  mix.event = flavored - mix.spoiler;
  mix.patch = beat.patch;
  return Object.freeze(mix);
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
