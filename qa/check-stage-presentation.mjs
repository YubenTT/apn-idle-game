import {
  STAGE_ROLE_PRESENTATION,
  legacySquarePresentation,
  resolveActorGeometry,
  stageFitForActors,
  validatePresentationRecord,
} from '../js/stage-presentation.js';

let failures = 0;
const assert = (condition, message) => {
  if (condition) console.log(`OK ${message}`);
  else {
    console.error(`FAIL ${message}`);
    failures += 1;
  }
};
const close = (actual, expected) =>
  Math.abs(actual - expected) < 1e-9;
const rejects = (operation, message) => {
  try {
    operation();
    assert(false, message);
  } catch {
    assert(true, message);
  }
};

assert(
  JSON.stringify(STAGE_ROLE_PRESENTATION) ===
    JSON.stringify({
      hero: { visibleBodyHeight: 96, visualGap: 6 },
      standard: { visibleBodyHeight: 72, visualGap: 2 },
      elite: { visibleBodyHeight: 84, visualGap: 2 },
      boss: { visibleBodyHeight: 112, visualGap: 2 },
    }),
  'role ladder is exact',
);
assert(
  Object.isFrozen(STAGE_ROLE_PRESENTATION) &&
    Object.values(STAGE_ROLE_PRESENTATION).every(Object.isFrozen),
  'role ladder is deeply immutable',
);

const presentation = {
  schemaVersion: 1,
  scaleContract: 'visible-body',
  reference: {
    clip: 'idle',
    frameIndex: 0,
    sourceSha256: 'a'.repeat(64),
  },
  visibleBounds: { x: 8, y: 6, width: 40, height: 50 },
  motionBounds: { x: 2, y: 1, width: 54, height: 61 },
};
assert(
  validatePresentationRecord(presentation).length === 0,
  'valid visible-body presentation record is accepted',
);

const geometryInput = {
  actorX: 200,
  groundY: 300,
  fit: 1,
  role: 'standard',
  frameSize: { width: 64, height: 64 },
  trim: { x: 4, y: 3, width: 56, height: 58 },
  pivot: { x: 0.5, y: 1 },
  presentation,
};
const geometry = resolveActorGeometry(geometryInput);
assert(
  geometry.body.height === 72 &&
    geometry.body.bottom === 298 &&
    geometry.body.top === 226,
  'standard body height and 2 px ground gap are exact',
);
assert(
  close(geometry.scale, 1.44) &&
    close(geometry.pivotY, 305.2) &&
    close(geometry.drawTrimHeight, 83.52),
  'scale, pivot, and trim draw height are exact',
);
assert(
  close(geometry.body.left, 171.2) &&
    close(geometry.body.right, 228.8) &&
    close(geometry.body.width, 57.6) &&
    geometry.body.centerX === 200 &&
    geometry.body.centerY === 262,
  'neutral body preserves horizontal pivot geometry',
);
assert(
  close(geometry.motionEnvelope.left, 162.56) &&
    close(geometry.motionEnvelope.top, 218.8) &&
    close(geometry.motionEnvelope.right, 240.32) &&
    close(geometry.motionEnvelope.bottom, 306.64) &&
    geometry.motionEnvelope.top < geometry.body.top,
  'motion envelope uses the same transform and protects authored poses',
);
assert(
  geometry.anchors.shadowX === 200 &&
    geometry.anchors.shadowY === 300 &&
    close(geometry.anchors.hpY, 208.8) &&
    close(geometry.anchors.floaterY, 198.8) &&
    geometry.anchors.auraY === 262 &&
    geometry.anchors.hitY === 262 &&
    geometry.anchors.lootY === 262,
  'ground, overhead, and body-center anchors share resolved geometry',
);
assert(
  [geometry, geometry.body, geometry.motionEnvelope, geometry.anchors].every(
    Object.isFrozen,
  ),
  'resolved actor geometry is deeply immutable',
);

const invalidRecordCases = [
  ['unexpected top-level key', (value) => { value.scale = 2; }],
  ['missing reference key', (value) => { delete value.reference.clip; }],
  [
    'non-neutral reference clip',
    (value) => { value.reference.clip = 'advance'; },
  ],
  [
    'non-neutral reference frame',
    (value) => { value.reference.frameIndex = 1; },
  ],
  [
    'stale hash shape',
    (value) => { value.reference.sourceSha256 = 'A'.repeat(64); },
  ],
  ['non-finite bound', (value) => { value.visibleBounds.x = Number.NaN; }],
  ['zero visible height', (value) => { value.visibleBounds.height = 0; }],
  ['negative bound origin', (value) => { value.motionBounds.y = -1; }],
  [
    'overflowing bound extent',
    (value) => {
      value.motionBounds.x = Number.MAX_VALUE;
      value.motionBounds.width = Number.MAX_VALUE;
    },
  ],
  [
    'visible bounds outside motion bounds',
    (value) => {
      value.motionBounds = { x: 9, y: 7, width: 38, height: 48 };
    },
  ],
  ['unexpected rectangle key', (value) => { value.visibleBounds.right = 48; }],
];
assert(
  validatePresentationRecord(null).length > 0,
  'non-object record fails closed',
);
for (const [label, mutate] of invalidRecordCases) {
  const value = structuredClone(presentation);
  mutate(value);
  assert(validatePresentationRecord(value).length > 0, `${label} fails closed`);
}
const propertyBomb = structuredClone(presentation);
for (let index = 0; index < 100; index += 1) {
  propertyBomb[`unexpected${index}`] = index;
}
const boundedErrors = validatePresentationRecord(propertyBomb);
assert(
  boundedErrors.length > 0 && boundedErrors.length <= 32,
  'closed-key validation has a bounded error surface',
);

rejects(
  () => resolveActorGeometry({ ...geometryInput, role: 'giant' }),
  'unknown stage role fails closed',
);
rejects(
  () => resolveActorGeometry({ ...geometryInput, actorX: Infinity }),
  'non-finite actor placement fails closed',
);
rejects(
  () => resolveActorGeometry({ ...geometryInput, fit: 0 }),
  'non-positive stage fit fails closed',
);
rejects(
  () =>
    resolveActorGeometry({
      ...geometryInput,
      trim: { x: 4, y: 3, width: 61, height: 58 },
    }),
  'trim outside the source frame fails closed',
);
rejects(
  () =>
    resolveActorGeometry({
      ...geometryInput,
      pivot: { x: 0.5, y: 1.1 },
    }),
  'pivot outside normalized source space fails closed',
);

const legacy = legacySquarePresentation({
  sourceSize: 64,
  visibleInset: 4,
});
assert(
  JSON.stringify(legacy.visibleBounds) ===
    JSON.stringify({ x: 4, y: 4, width: 56, height: 56 }) &&
    JSON.stringify(legacy.motionBounds) ===
      JSON.stringify({ x: 0, y: 0, width: 64, height: 64 }),
  'legacy square adapter preserves inset body and full motion envelope',
);
assert(
  validatePresentationRecord(legacy).length === 0 &&
    [legacy, legacy.reference, legacy.visibleBounds, legacy.motionBounds].every(
      Object.isFrozen,
    ),
  'legacy square adapter is valid and deeply immutable',
);
assert(
  JSON.stringify(legacySquarePresentation()) ===
    JSON.stringify({
      schemaVersion: 1,
      scaleContract: 'visible-body',
      reference: {
        clip: 'idle',
        frameIndex: 0,
        sourceSha256: '0'.repeat(64),
      },
      visibleBounds: { x: 0, y: 0, width: 128, height: 128 },
      motionBounds: { x: 0, y: 0, width: 128, height: 128 },
    }),
  'legacy square adapter defaults are deterministic',
);
rejects(
  () => legacySquarePresentation({ sourceSize: 0 }),
  'legacy square adapter rejects non-positive size',
);
rejects(
  () => legacySquarePresentation({ sourceSize: 64, visibleInset: 32 }),
  'legacy square adapter rejects a body-removing inset',
);

const bossPresentation = {
  schemaVersion: 1,
  scaleContract: 'visible-body',
  reference: {
    clip: 'idle',
    frameIndex: 0,
    sourceSha256: 'b'.repeat(64),
  },
  visibleBounds: { x: 8, y: 8, width: 40, height: 40 },
  motionBounds: { x: 3, y: 3, width: 50, height: 50 },
};
const actors = [
  { role: 'hero', presentation: legacySquarePresentation() },
  { role: 'standard', presentation },
  { role: 'boss', presentation: bossPresentation },
];
assert(
  close(
    stageFitForActors({
      groundY: 190,
      bannerClearance: 78,
      actors,
    }),
    0.8,
  ),
  'actor-list stage fit uses the tallest role motion envelope',
);
assert(
  stageFitForActors({ groundY: 400, bannerClearance: 78, actors }) === 1 &&
    stageFitForActors({ groundY: 90, bannerClearance: 78, actors }) === 0.5 &&
    stageFitForActors({ groundY: 100, actors: [] }) === 1,
  'actor-list stage fit is bounded and empty casts retain full scale',
);
rejects(
  () =>
    stageFitForActors({
      groundY: 200,
      actors: [{ role: 'giant', presentation }],
    }),
  'stage fit rejects unknown roles',
);
rejects(
  () => stageFitForActors({ groundY: Number.NaN, actors }),
  'stage fit rejects non-finite stage geometry',
);

if (failures) {
  console.error(`STAGE PRESENTATION FAIL (${failures})`);
  process.exit(1);
}
console.log('STAGE PRESENTATION PASS');
