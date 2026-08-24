import { GAME_PACKS } from '../js/generated/game-packs.js';
import { C, isBossZone, typeHpMult } from '../js/formulas.js';
import {
  DEFAULT_WAVE_BEAT,
  WAVE_TYPES,
  enemyTypesForPackWave,
  rollWaveEnemyType,
  waveBeatForPack,
  waveTypeMixForPack,
} from '../js/wave-roster.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Wave roster: ${message}`);
  console.log(`OK ${message}`);
};

const PLAY_WAVES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const GATE_WAVE = 10;
const CHAMPION_TYPES = ['patch'];
const ELITE_TYPES = ['lag', 'spoiler', 'event'];
const ENVELOPE = 0.02;
const POOL_PACKS = GAME_PACKS.filter((pack) =>
  PLAY_WAVES.some((wave) => enemyTypesForPackWave(pack.id, wave)),
).map((pack) => pack.id);
const AUTHORED_PACKS = GAME_PACKS.filter((pack) => !POOL_PACKS.includes(pack.id));

const shareOf = (mix, types) => types.reduce((sum, type) => sum + mix[type], 0);
const hpBudget = (mix) =>
  WAVE_TYPES.reduce((sum, type) => sum + mix[type] * typeHpMult(type), 0);
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

const seededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const failing = (rows) => rows.filter((row) => !row.pass).map((row) => row.detail);
const summary = (text, rows) => {
  const failed = failing(rows).slice(0, 4);
  return failed.length ? `${text} — ${failed.join('; ')}` : text;
};

// —— (a) complete nine-wave table plus Gate semantics, for every Pack ——
assert(GAME_PACKS.length === 20, `catalog carries twenty Packs (${GAME_PACKS.length})`);
const shapeRows = [];
for (const pack of GAME_PACKS) {
  for (const wave of PLAY_WAVES) {
    const mix = waveTypeMixForPack(pack.id, wave);
    const complete =
      mix !== null &&
      Object.keys(mix).length === WAVE_TYPES.length &&
      WAVE_TYPES.every((type) => Number.isFinite(mix[type]) && mix[type] >= 0);
    const total = complete ? WAVE_TYPES.reduce((sum, type) => sum + mix[type], 0) : NaN;
    shapeRows.push({
      pass: complete && Math.abs(total - 1) < 1e-9 && mix.boss === 0,
      detail: `${pack.id} wave ${wave} total ${total}`,
    });
  }
}
assert(
  shapeRows.every((row) => row.pass),
  summary(`every Pack resolves nine normalized non-Gate waves (${shapeRows.length} tables)`, shapeRows),
);
const gateRows = GAME_PACKS.map((pack) => ({
  pass:
    waveTypeMixForPack(pack.id, GATE_WAVE).boss === 1 &&
    waveBeatForPack(pack.id, GATE_WAVE) === null,
  detail: `${pack.id} Gate wave`,
}));
assert(
  gateRows.every((row) => row.pass),
  summary(`wave ${GATE_WAVE} is the Gate for every Pack and takes no authored beat`, gateRows),
);
assert(
  Array.from({ length: 40 }, (unused, zone) => zone).every(
    (zone) => isBossZone(zone) === ((zone % 10) + 1 === GATE_WAVE),
  ),
  `boss cadence and wave ${GATE_WAVE} are the same rule`,
);
const rangeRows = [0, 11, -1, 1.5, null, undefined, 'three'].map((wave) => ({
  pass:
    waveTypeMixForPack('league', wave) === null &&
    waveBeatForPack('league', wave) === null,
  detail: `wave ${String(wave)}`,
}));
assert(
  rangeRows.every((row) => row.pass),
  summary(`out-of-range waves resolve nothing`, rangeRows),
);

// —— (b) analytic balance envelope, per Pack ——
const envelope = GAME_PACKS.map((pack) => {
  const mixes = PLAY_WAVES.map((wave) => waveTypeMixForPack(pack.id, wave));
  return {
    id: pack.id,
    pooled: POOL_PACKS.includes(pack.id),
    champion: mean(mixes.map((mix) => shareOf(mix, CHAMPION_TYPES))),
    elite: mean(mixes.map((mix) => shareOf(mix, ELITE_TYPES))),
    hpMult: mean(mixes.map(hpBudget)),
  };
});
const authoredEnvelope = envelope.filter((row) => !row.pooled);
const championRows = authoredEnvelope.map((row) => ({
  pass: Math.abs(row.champion - C.CHAMPION_CHANCE) <= ENVELOPE,
  detail: `${row.id} ${row.champion.toFixed(4)}`,
}));
assert(
  championRows.every((row) => row.pass),
  summary(`every authored Pack holds champion frequency inside ${C.CHAMPION_CHANCE}±${ENVELOPE}`, championRows),
);
const eliteRows = authoredEnvelope.map((row) => ({
  pass: Math.abs(row.elite - C.ELITE_CHANCE) <= ENVELOPE,
  detail: `${row.id} ${row.elite.toFixed(4)}`,
}));
assert(
  eliteRows.every((row) => row.pass),
  summary(`every authored Pack holds elite frequency inside ${C.ELITE_CHANCE}±${ENVELOPE}`, eliteRows),
);
const probabilityHpMult =
  C.CHAMPION_CHANCE * typeHpMult('patch') +
  C.ELITE_CHANCE * typeHpMult('lag') +
  (1 - C.CHAMPION_CHANCE - C.ELITE_CHANCE) * typeHpMult('stale');
const budgetRows = authoredEnvelope.map((row) => ({
  pass: Math.abs(row.hpMult - probabilityHpMult) < 1e-9,
  detail: `${row.id} ${row.hpMult.toFixed(6)}`,
}));
assert(
  budgetRows.every((row) => row.pass),
  summary(`every authored Pack carries the probability-table HP budget ${probabilityHpMult.toFixed(4)}`, budgetRows),
);

// —— (c) deterministic selection under a seeded stream ——
const streamFor = (packId) =>
  PLAY_WAVES.map((wave) => {
    const random = seededRandom(0x41504e + wave);
    return Array.from({ length: 64 }, () =>
      rollWaveEnemyType(waveBeatForPack(packId, wave), random),
    ).join(',');
  }).join('|');
const determinismRows = GAME_PACKS.map((pack) => ({
  pass: streamFor(pack.id) === streamFor(pack.id),
  detail: pack.id,
}));
assert(
  determinismRows.every((row) => row.pass),
  summary(`seeded selection is byte-deterministic for every Pack`, determinismRows),
);
assert(
  rollWaveEnemyType(waveBeatForPack('league', 1), () => 0) === 'stale' &&
    rollWaveEnemyType(waveBeatForPack('league', 1), () => 0.999999) === 'rumor',
  'a beat spans its authored mix from the first ladder step to the last',
);
const SAMPLES = 40000;
const samplingRows = [];
for (const pack of AUTHORED_PACKS) {
  for (const wave of PLAY_WAVES) {
    const beat = waveBeatForPack(pack.id, wave);
    const mix = waveTypeMixForPack(pack.id, wave);
    const observed = Object.fromEntries(WAVE_TYPES.map((type) => [type, 0]));
    const random = seededRandom(0x57415645 + wave);
    for (let i = 0; i < SAMPLES; i += 1) observed[rollWaveEnemyType(beat, random)] += 1;
    const drift = Math.max(
      ...WAVE_TYPES.map((type) => Math.abs(observed[type] / SAMPLES - mix[type])),
    );
    samplingRows.push({ pass: drift < 0.012, detail: `${pack.id} wave ${wave} drift ${drift.toFixed(4)}` });
  }
}
assert(
  samplingRows.every((row) => row.pass),
  summary(`sampled selection matches every authored analytic mix (${samplingRows.length} waves × ${SAMPLES})`, samplingRows),
);

// —— (d) creature-pool Packs stay pool-authoritative ——
assert(
  POOL_PACKS.length === 1 && POOL_PACKS[0] === 'valorant',
  `creature pools own exactly one Pack (${POOL_PACKS.join(',') || 'none'})`,
);
const poolRows = [];
for (const packId of POOL_PACKS) {
  for (const wave of [...PLAY_WAVES, GATE_WAVE]) {
    const pool = enemyTypesForPackWave(packId, wave);
    const mix = waveTypeMixForPack(packId, wave);
    const uniform =
      Array.isArray(pool) &&
      pool.length > 0 &&
      WAVE_TYPES.every(
        (type) =>
          Math.abs(mix[type] - pool.filter((entry) => entry === type).length / pool.length) < 1e-12,
      );
    poolRows.push({
      pass: uniform && waveBeatForPack(packId, wave) === null,
      detail: `${packId} wave ${wave}`,
    });
  }
}
assert(
  poolRows.every((row) => row.pass),
  summary(`pool Packs report their uniform pool and take no authored beat — no double-apply`, poolRows),
);
const VALORANT_POOL_TABLE = [
  'stale',
  'rumor',
  'lag',
  'stale|rumor',
  'patch',
  'stale|lag',
  'rumor|patch',
  'stale|rumor|lag|patch',
  'event',
  'boss',
].join(' / ');
assert(
  [...PLAY_WAVES, GATE_WAVE]
    .map((wave) => enemyTypesForPackWave('valorant', wave).join('|'))
    .join(' / ') === VALORANT_POOL_TABLE,
  'valorant creature pool table is unchanged across all ten waves',
);

// —— (e) unauthored Pack IDs fall back to the probability table ——
const fallbackRows = ['not-a-pack', '', null, undefined, 'valorant-2'].map((packId) => {
  const mix = waveTypeMixForPack(packId, 4);
  return {
    pass:
      waveBeatForPack(packId, 4) === null &&
      Math.abs(shareOf(mix, CHAMPION_TYPES) - C.CHAMPION_CHANCE) < 1e-12 &&
      Math.abs(shareOf(mix, ELITE_TYPES) - C.ELITE_CHANCE) < 1e-12,
    detail: String(packId),
  };
});
assert(
  fallbackRows.every((row) => row.pass),
  summary(`unknown Pack IDs fall back to the probability table`, fallbackRows),
);
assert(
  DEFAULT_WAVE_BEAT.patch === C.CHAMPION_CHANCE &&
    DEFAULT_WAVE_BEAT.elite === C.ELITE_CHANCE &&
    DEFAULT_WAVE_BEAT.lagShare === 0.5 &&
    DEFAULT_WAVE_BEAT.spoilerShare === 0.5 &&
    DEFAULT_WAVE_BEAT.staleShare === 0.5,
  'fallback beat is the probability table, read from the balance constants',
);
assert(
  rollWaveEnemyType(null, () => 0.001) === 'patch' &&
    rollWaveEnemyType(undefined, () => 0.2) !== 'patch',
  'a missing beat still rolls through the probability table',
);

// —— (f) no two Packs share a wave table ——
const signatures = new Map();
for (const pack of GAME_PACKS) {
  const signature = PLAY_WAVES.map((wave) => {
    const mix = waveTypeMixForPack(pack.id, wave);
    return WAVE_TYPES.map((type) => mix[type].toFixed(6)).join(':');
  }).join('|');
  const twin = signatures.get(signature);
  if (twin) throw new Error(`Wave roster: ${pack.id} repeats the ${twin} wave table`);
  signatures.set(signature, pack.id);
}
assert(
  signatures.size === GAME_PACKS.length,
  `all ${GAME_PACKS.length} Packs play a different composition rhythm`,
);

console.log('ENVELOPE · champion · elite · HP budget');
for (const row of envelope) {
  console.log(
    `  ${row.id.padEnd(22)} ${row.champion.toFixed(4)} · ${row.elite.toFixed(4)} · ${row.hpMult.toFixed(4)}${
      row.pooled ? ' · creature pool (exempt)' : ''
    }`,
  );
}
console.log(
  `WAVE ROSTER PASS ${AUTHORED_PACKS.length} authored + ${POOL_PACKS.length} pool Packs`,
);
