import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createState, goLive, canGoLive, goLiveAvailableZone } from '../js/game.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`Go Live contract: ${message}`);
};

const SCHEMA = JSON.parse(
  readFileSync(new URL('../docs/product/schemas/go-live-receipt.schema.json', import.meta.url), 'utf8')
);

/**
 * Minimal JSON-Schema (Draft 2020-12 subset) validator — enough for the receipt
 * contract (type/const/enum/minimum/minLength/minItems/required/properties/items/
 * additionalProperties). No ajv in this repo; full validation wiring lands in PR-7.
 * Returns an array of human-readable errors ([] === valid).
 */
export function validate(schema, value, path = '$') {
  const errors = [];
  const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

  if ('const' in schema && value !== schema.const) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} not in enum`);
  }
  if (schema.type) {
    const t = typeOf(value);
    const ok = schema.type === 'integer' ? t === 'number' && Number.isInteger(value) : t === schema.type;
    if (!ok) errors.push(`${path}: expected ${schema.type}, got ${t}`);
  }
  if (typeof value === 'number') {
    if ('minimum' in schema && value < schema.minimum) errors.push(`${path}: ${value} < minimum ${schema.minimum}`);
    if (!Number.isFinite(value)) errors.push(`${path}: non-finite number`);
  }
  if (typeof value === 'string' && 'minLength' in schema && value.length < schema.minLength) {
    errors.push(`${path}: string shorter than minLength ${schema.minLength}`);
  }
  if (Array.isArray(value)) {
    if ('minItems' in schema && value.length < schema.minItems) errors.push(`${path}: fewer than minItems ${schema.minItems}`);
    if (schema.items) value.forEach((item, i) => errors.push(...validate(schema.items, item, `${path}[${i}]`)));
  }
  if (schema.type === 'object' && typeOf(value) === 'object') {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}: missing required "${key}"`);
    }
    const props = schema.properties || {};
    for (const [key, v] of Object.entries(value)) {
      if (props[key]) errors.push(...validate(props[key], v, `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property "${key}"`);
    }
  }
  return errors;
}

/** Build a fresh state sitting on `zone` with an earned pending checkpoint. */
function atBoundary(zone, mutate = () => {}) {
  const s = createState();
  s.route.zone = zone;
  s.meta.pendingGoLiveZone = zone;
  mutate(s);
  return s;
}

export function checkGoLiveContract() {
  // Sanity: the validator has teeth (a good receipt passes, tampered ones fail).
  const probe = goLive(atBoundary(10));
  assert(validate(SCHEMA, probe).length === 0, 'reference receipt validates clean');
  assert(validate(SCHEMA, { ...probe, completedPackIds: 'nope' }).length > 0, 'validator rejects wrong array type');
  assert(validate(SCHEMA, { ...probe, extra: 1 }).length > 0, 'validator rejects additional property');
  assert(validate(SCHEMA, { ...probe, schema: 'other' }).length > 0, 'validator rejects wrong discriminator');

  // First checkpoint at zone 10; Route zone is KEPT, temp power reset.
  const first = atBoundary(10, (s) => { s.run.hero.level = 40; s.run.bytes = 1000; s.authority.shippedThisSeason = 200; });
  assert(canGoLive(first), 'Go Live available at first boundary (zone 10)');
  const r1 = goLive(first);
  assert(validate(SCHEMA, r1).length === 0, 'first receipt validates');
  assert(r1.boundaryZone === 10 && r1.goLiveCount === 1, 'first checkpoint boundary/count');
  assert(first.route.zone === 10, 'Route zone kept across Go Live');
  assert(first.run.hero.level === 1 && first.meta.live > 1, 'temp power reset, Live Mult grew');
  assert(first.meta.pendingGoLiveZone === 0 && first.meta.lastGoLiveZone === 10, 'pending cleared, guard advanced');

  // Idempotency: a second call on the same claimed boundary is a no-op.
  const r1b = goLive(first);
  assert(r1b.checkpointId === r1.checkpointId && first.meta.goLiveCount === 1, 'idempotent re-call returns same receipt');
  assert(goLiveAvailableZone(first) === 0 && !canGoLive(first), 'no checkpoint pending after claim');

  // Banked Notes fold into the receipt.
  const withNotes = atBoundary(30, (s) => { s.meta.lastGoLiveZone = 10; s.run.patches = 50; });
  const r2 = goLive(withNotes);
  assert(validate(SCHEMA, r2).length === 0, 'notes receipt validates');
  assert(r2.notesBanked === 50 && r2.repGained > 0 && r2.repTotal >= r2.repGained, 'notes banked → Rep');
  assert(withNotes.run.patches === 0, 'run Notes consumed by Go Live');

  // Migration marker (§7.6) + legacyContribution override.
  const migrated = atBoundary(20, (s) => { s.meta.goLiveCount = 3; });
  const r3 = goLive(migrated, null, { migratedFrom: 2, legacyContribution: 120 });
  assert(validate(SCHEMA, r3).length === 0, 'migration receipt validates');
  assert(r3.migration?.fromVersion === 2, 'migration marker recorded');
  assert(r3.cycleContribution === 120 && r3.liveGain > 0, 'legacyContribution feeds Live Mult');
  assert(r3.goLiveCount === 4, 'goLiveCount continues from migrated count');

  // Unavailable → null receipt, no mutation.
  const early = createState();
  early.route.zone = 5;
  const before = JSON.stringify(early.meta);
  assert(goLive(early) === null, 'Go Live returns null before the first boundary');
  assert(JSON.stringify(early.meta) === before, 'unavailable Go Live does not mutate');

  return [
    'receipt schema validates every emitted receipt',
    'validator rejects malformed receipts',
    'first checkpoint at zone 10 keeps Route',
    'idempotent re-call is a no-op',
    'banked Notes fold into the receipt',
    'migration marker + legacyContribution honored',
    'unavailable Go Live is a null no-op',
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const message of checkGoLiveContract()) console.log(`OK ${message}`);
  console.log('GO LIVE PASS');
}
