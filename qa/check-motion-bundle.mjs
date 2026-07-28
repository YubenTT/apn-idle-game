import fs from 'node:fs';

import {
  LOOP_CLIPS,
  MOTION_GRAMMAR,
  REQUIRED_CLIPS,
  drawMotionFrame,
  frameIndexForClip,
  selectEnemyMotion,
  validateMotionBundle,
} from '../js/motion-bundle.js';

const readJson = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`./fixtures/motion-bundle/${name}`, import.meta.url), 'utf8'),
  );
const copy = (value) => structuredClone(value);
let failures = 0;
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    failures += 1;
  } else {
    console.log(`OK ${message}`);
  }
};

const valid = readJson('valid.json');
const combinedInvalid = readJson('invalid-overlap.json');

function addBrokenClip(bundle) {
  bundle.atlas.height = Math.max(bundle.atlas.height, 672);
  bundle.clips.broken = {
    playback: 'loop',
    fps: 8,
    frames: Array.from({ length: 8 }, (_, index) => ({
      x: index * 96,
      y: 560,
      width: 96,
      height: 112,
    })),
  };
  return bundle;
}

function validSiteWarden() {
  const bundle = copy(valid);
  bundle.assetId = 'site-warden';
  return addBrokenClip(bundle);
}

function bundleWithFrameCounts(counts) {
  const bundle = copy(valid);
  bundle.atlas.width = 2048;
  bundle.atlas.height = 768;
  bundle.trim = { x: 0, y: 0, width: 1, height: 1 };
  let cursor = 0;
  for (const [name, clip] of Object.entries(bundle.clips)) {
    const count = counts[name] ?? clip.frames.length;
    clip.frames = Array.from({ length: count }, () => {
      const frame = {
        x: cursor % 2048,
        y: Math.floor(cursor / 2048),
        width: 1,
        height: 1,
      };
      cursor += 1;
      return frame;
    });
  }
  return bundle;
}

function expectValid(bundle, expectedAssetId, message) {
  const errors = validateMotionBundle(bundle, expectedAssetId);
  assert(errors.length === 0, `${message} (${errors.join('; ')})`);
}

function expectInvalid(bundle, expectedAssetId, needle, message) {
  const errors = validateMotionBundle(bundle, expectedAssetId);
  assert(
    errors.some((error) => error.includes(needle)),
    `${message} (${errors.join('; ')})`,
  );
}

assert(MOTION_GRAMMAR === 'gaf2d-motion-bundle-v1', 'grammar is exact');
assert(
  REQUIRED_CLIPS.join('|') === 'idle|advance|engaged|hit|death',
  'required clip vocabulary is exact',
);
expectValid(valid, 'entry-runner', 'valid common motion bundle accepted');

const commonAtDecodedLimit = copy(valid);
commonAtDecodedLimit.atlas.width = 2048;
commonAtDecodedLimit.atlas.height = 768;
expectValid(
  commonAtDecodedLimit,
  'entry-runner',
  'common atlas accepts exactly 6 MiB RGBA and a 2048px dimension',
);

const wardenAtDecodedLimit = validSiteWarden();
wardenAtDecodedLimit.atlas.width = 2048;
wardenAtDecodedLimit.atlas.height = 1024;
expectValid(
  wardenAtDecodedLimit,
  'site-warden',
  'Site Warden accepts exactly 8 MiB RGBA with required broken clip',
);

const tooManyInOneClip = bundleWithFrameCounts({ idle: 65 });
expectInvalid(
  tooManyInOneClip,
  'entry-runner',
  'at most 64 frames',
  'clip frame count is capped at 64',
);

const tooManyTotalFrames = bundleWithFrameCounts({
  idle: 52,
  advance: 52,
  engaged: 52,
  hit: 52,
  death: 52,
});
expectInvalid(
  tooManyTotalFrames,
  'entry-runner',
  'at most 256 frames',
  'bundle frame count is capped at 256',
);

const adversarial = copy(valid);
adversarial.atlas.width = 2048;
adversarial.atlas.height = 768;
const accessibleFrames = Array.from({ length: 64 }, () => ({
  x: 0,
  y: 0,
  width: 96,
  height: 112,
}));
const sparseFrames = new Array(10_000);
for (const [index, frame] of accessibleFrames.entries()) {
  sparseFrames[index] = frame;
}
adversarial.clips.idle.frames = new Proxy(sparseFrames, {
  get(target, property, receiver) {
    if (
      typeof property === 'string' &&
      /^(?:0|[1-9][0-9]*)$/.test(property) &&
      Number(property) >= 64
    ) {
      throw new Error(`validator read rejected excess frame ${property}`);
    }
    return Reflect.get(target, property, receiver);
  },
});
let adversarialErrors = null;
let adversarialThrow = null;
try {
  adversarialErrors = validateMotionBundle(adversarial, 'entry-runner');
} catch (error) {
  adversarialThrow = error;
}
assert(
  adversarialThrow === null,
  `excess frames are rejected without reading past the per-clip cap (${adversarialThrow?.message || ''})`,
);
assert(
  Array.isArray(adversarialErrors) && adversarialErrors.length === 64,
  `adversarial validation stops at exactly 64 emitted errors (${adversarialErrors?.length ?? 'threw'})`,
);
assert(
  adversarialErrors?.some((error) => error.includes('at most 64 frames')) &&
    adversarialErrors.some((error) => error.includes('at most 256 frames')),
  'adversarial validation reports both frame caps before the error ceiling',
);

const mutations = [
  {
    message: 'non-object descriptor rejected',
    make: () => null,
    expectedAssetId: 'entry-runner',
    needle: 'bundle:',
  },
  {
    message: 'wrong grammar rejected',
    mutate: (bundle) => {
      bundle.grammar = 'gaf2d-motion-bundle-v2';
    },
    needle: 'grammar:',
  },
  {
    message: 'malformed asset ID rejected',
    mutate: (bundle) => {
      bundle.assetId = 'Entry Runner';
    },
    needle: 'portable lowercase asset ID',
  },
  {
    message: 'wrong expected asset ID rejected',
    expectedAssetId: 'veil-operator',
    needle: 'assetId: expected',
  },
  {
    message: 'absolute image path rejected',
    mutate: (bundle) => {
      bundle.image = '/motion.webp';
    },
    needle: 'image:',
  },
  {
    message: 'URL image path rejected',
    mutate: (bundle) => {
      bundle.image = 'https://example.invalid/motion.webp';
    },
    needle: 'image:',
  },
  {
    message: 'raw traversal image path rejected',
    mutate: (bundle) => {
      bundle.image = '../motion.webp';
    },
    needle: 'image:',
  },
  {
    message: 'encoded traversal image path rejected',
    mutate: (bundle) => {
      bundle.image = '%2e%2e/motion.webp';
    },
    needle: 'image:',
  },
  {
    message: 'query-bearing image path rejected',
    mutate: (bundle) => {
      bundle.image = 'motion.webp?token=secret';
    },
    needle: 'image:',
  },
  {
    message: 'fragment-bearing image path rejected',
    mutate: (bundle) => {
      bundle.image = 'motion.webp#frame';
    },
    needle: 'image:',
  },
  {
    message: 'wrong image extension rejected',
    mutate: (bundle) => {
      bundle.image = 'motion.png';
    },
    needle: 'image:',
  },
  {
    message: 'wrong portable image name rejected',
    mutate: (bundle) => {
      bundle.image = 'atlas.webp';
    },
    needle: 'image:',
  },
  {
    message: 'non-positive atlas dimension rejected',
    mutate: (bundle) => {
      bundle.atlas.width = 0;
    },
    needle: 'positive integers',
  },
  {
    message: 'fractional atlas dimension rejected',
    mutate: (bundle) => {
      bundle.atlas.width = 768.5;
    },
    needle: 'positive integers',
  },
  {
    message: 'atlas dimension above 2048 rejected',
    mutate: (bundle) => {
      bundle.atlas.width = 2049;
    },
    needle: 'at most 2048x2048',
  },
  {
    message: 'common atlas above 6 MiB RGBA rejected',
    mutate: (bundle) => {
      bundle.atlas.width = 2048;
      bundle.atlas.height = 769;
    },
    needle: 'decoded RGBA bytes',
  },
  {
    message: 'Site Warden atlas above 8 MiB RGBA rejected',
    make: validSiteWarden,
    expectedAssetId: 'site-warden',
    mutate: (bundle) => {
      bundle.atlas.width = 2048;
      bundle.atlas.height = 1025;
    },
    needle: 'decoded RGBA bytes',
  },
  {
    message: 'invalid atlas SHA-256 rejected',
    mutate: (bundle) => {
      bundle.atlas.sha256 = 'ABC';
    },
    needle: 'atlas.sha256',
  },
  {
    message: 'invalid frame size rejected',
    mutate: (bundle) => {
      bundle.frameSize.width = 0;
    },
    needle: 'frameSize:',
  },
  {
    message: 'invalid trim rectangle rejected',
    mutate: (bundle) => {
      bundle.trim.x = -1;
    },
    needle: 'trim:',
  },
  {
    message: 'trim outside frame size rejected',
    mutate: (bundle) => {
      bundle.trim.x = 33;
    },
    needle: 'inside the untrimmed frame size',
  },
  {
    message: 'non-bottom-center pivot rejected',
    mutate: (bundle) => {
      bundle.pivot.x = 0.4;
    },
    needle: 'pivot:',
  },
  {
    message: 'missing lineage structure rejected',
    mutate: (bundle) => {
      bundle.lineage = null;
    },
    needle: 'lineage:',
  },
  {
    message: 'invalid lineage SHA-256 rejected',
    mutate: (bundle) => {
      bundle.lineage.identityApprovalSha256 = 'A'.repeat(64);
    },
    needle: 'lineage.identityApprovalSha256',
  },
  {
    message: 'invalid optional rig SHA-256 rejected',
    mutate: (bundle) => {
      bundle.lineage.rigApprovalSha256 = 'bad';
    },
    needle: 'lineage.rigApprovalSha256',
  },
  {
    message: 'missing encoder structure rejected',
    mutate: (bundle) => {
      bundle.encoder = null;
    },
    needle: 'encoder:',
  },
  {
    message: 'non-string encoder argument rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', 90];
    },
    needle: 'encoder:',
  },
  {
    message: 'empty encoder argument list rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = [];
    },
    needle: 'encoder:',
  },
  {
    message: 'non-positive clip FPS rejected',
    mutate: (bundle) => {
      bundle.clips.idle.fps = 0;
    },
    needle: 'clips.idle.fps',
  },
  {
    message: 'tiny positive clip FPS rejected',
    mutate: (bundle) => {
      bundle.clips.idle.fps = Number.MIN_VALUE;
    },
    needle: 'clips.idle.fps',
  },
  {
    message: 'extreme finite clip FPS rejected',
    mutate: (bundle) => {
      bundle.clips.idle.fps = Number.MAX_VALUE;
    },
    needle: 'clips.idle.fps',
  },
  {
    message: 'wrong semantic playback rejected',
    mutate: (bundle) => {
      bundle.clips.idle.playback = 'progress';
    },
    needle: 'clips.idle.playback',
  },
  {
    message: 'unsupported playback rejected',
    mutate: (bundle) => {
      bundle.clips.idle.playback = 'pingpong';
    },
    needle: 'clips.idle.playback',
  },
  {
    message: 'empty frame array rejected',
    mutate: (bundle) => {
      bundle.clips.hit.frames = [];
    },
    needle: 'clips.hit.frames',
  },
  {
    message: 'missing required clip rejected',
    mutate: (bundle) => {
      delete bundle.clips.engaged;
    },
    needle: 'missing required clip "engaged"',
  },
  {
    message: 'unexpected clip rejected',
    mutate: (bundle) => {
      bundle.atlas.height = 672;
      bundle.clips.attack = {
        playback: 'progress',
        fps: 8,
        frames: [{ x: 0, y: 560, width: 96, height: 112 }],
      };
    },
    needle: 'unexpected clip "attack"',
  },
  {
    message: 'broken clip forbidden for non-Warden asset',
    mutate: addBrokenClip,
    needle: '"broken" is only allowed',
  },
  {
    message: 'broken clip required for Site Warden asset',
    make: () => {
      const bundle = copy(valid);
      bundle.assetId = 'site-warden';
      return bundle;
    },
    expectedAssetId: 'site-warden',
    needle: 'missing required clip "broken"',
  },
  {
    message: 'fractional frame rectangle rejected',
    mutate: (bundle) => {
      bundle.clips.idle.frames[0].x = 0.5;
    },
    needle: 'positive integer rectangle',
  },
  {
    message: 'out-of-bounds frame rectangle rejected',
    mutate: (bundle) => {
      bundle.clips.idle.frames[0].y = 560;
    },
    needle: 'outside atlas bounds',
  },
  {
    message: 'overlapping frame rectangle rejected',
    mutate: (bundle) => {
      bundle.clips.idle.frames[1].x = 48;
    },
    needle: 'overlaps',
  },
  {
    message: 'frame rectangle differing from shared trim rejected',
    mutate: (bundle) => {
      bundle.clips.idle.frames[0].width = 95;
    },
    needle: 'must match shared trim',
  },
];

for (const testCase of mutations) {
  const bundle = testCase.make ? testCase.make() : copy(valid);
  testCase.mutate?.(bundle);
  expectInvalid(
    bundle,
    testCase.expectedAssetId || 'entry-runner',
    testCase.needle,
    testCase.message,
  );
}

assert(
  validateMotionBundle(combinedInvalid, 'entry-runner').length >= 8,
  'combined synthetic invalid fixture remains broadly rejected',
);

assert(
  frameIndexForClip(valid.clips.idle, 0.2) !==
    frameIndexForClip(valid.clips.idle, 0.4),
  'loop frame selection uses simulation timestamp',
);
assert(
  frameIndexForClip(valid.clips.death, 1) === 7,
  'progress clip holds its final frame',
);
assert(
  frameIndexForClip(valid.clips.death, -1) === 0,
  'progress clip clamps before its first frame',
);
const hugeTimestampFrame = frameIndexForClip(
  valid.clips.idle,
  Number.MAX_VALUE,
);
assert(
  Number.isInteger(hugeTimestampFrame) &&
    hugeTimestampFrame >= 0 &&
    hugeTimestampFrame < valid.clips.idle.frames.length,
  `huge finite loop timestamp stays in frame range (${hugeTimestampFrame})`,
);

const warden = validSiteWarden();
const wardenContext = {
  timestamp: 0.4,
  meleeStop: 120,
  engagedId: 'engaged-enemy',
  assetId: 'site-warden',
  clips: warden.clips,
};
const baseEnemy = {
  id: 'enemy',
  type: 'stale',
  killed: false,
  deathT: 0,
  deathMax: 0.5,
  hurt: 0,
  hp: 100,
  hpMax: 100,
  x: 120,
};

const everyState = {
  ...baseEnemy,
  id: 'engaged-enemy',
  type: 'boss',
  killed: true,
  deathT: 0.25,
  hurt: 0.1,
  hp: 20,
  x: 200,
};
const deathSelection = selectEnemyMotion(everyState, wardenContext);
assert(deathSelection.clip === 'death', 'death outranks all colliding states');
assert(deathSelection.value === 0.5, 'death uses deathT/deathMax progress');

const hitBrokenAdvanceEngaged = {
  ...everyState,
  killed: false,
  deathT: 0,
};
const hitSelection = selectEnemyMotion(hitBrokenAdvanceEngaged, wardenContext);
assert(hitSelection.clip === 'hit', 'hit outranks broken, advance, and engaged');
assert(hitSelection.value === 0.5, 'hit uses the existing hurt clock');

const brokenAdvanceEngaged = {
  ...hitBrokenAdvanceEngaged,
  hurt: 0,
};
assert(
  selectEnemyMotion(brokenAdvanceEngaged, wardenContext).clip === 'broken',
  'owned Site Warden broken clip outranks advance and engaged',
);

const brokenlessBossContext = {
  ...wardenContext,
  clips: valid.clips,
};
assert(
  selectEnemyMotion(brokenAdvanceEngaged, brokenlessBossContext).clip ===
    'advance',
  'Site Warden context without broken ownership never selects broken',
);
assert(
  selectEnemyMotion(brokenAdvanceEngaged, {
    ...wardenContext,
    assetId: 'entry-runner',
  }).clip === 'advance',
  'broken clip ownership with the wrong asset identity never selects broken',
);
assert(
  selectEnemyMotion(brokenAdvanceEngaged, {
    timestamp: 0.4,
    meleeStop: 120,
    engagedId: 'engaged-enemy',
  }).clip === 'advance',
  'boss type alone never selects broken',
);

const advanceAndEngaged = {
  ...baseEnemy,
  id: 'engaged-enemy',
  x: 121,
};
assert(
  selectEnemyMotion(advanceAndEngaged, wardenContext).clip === 'advance',
  'advance outranks engaged when both states collide',
);

const engaged = {
  ...baseEnemy,
  id: 'engaged-enemy',
};
assert(
  selectEnemyMotion(engaged, wardenContext).clip === 'engaged',
  'stationary melee reaction uses engaged, not attack',
);
assert(
  selectEnemyMotion(baseEnemy, wardenContext).clip === 'idle',
  'unengaged stationary enemy idles',
);

const firstLoop = selectEnemyMotion(advanceAndEngaged, wardenContext);
const laterLoop = selectEnemyMotion(advanceAndEngaged, {
  ...wardenContext,
  timestamp: 0.65,
});
assert(
  Math.abs(laterLoop.value - firstLoop.value - 0.25) < Number.EPSILON * 4,
  'loop value uses simulation time plus stable entity phase',
);

const calls = [];
const image = { id: 'synthetic-motion-bitmap' };
const ctx = {
  drawImage(...args) {
    calls.push(args);
  },
};
const drawn = drawMotionFrame(
  ctx,
  { descriptor: valid, image },
  'idle',
  2,
  200,
  300,
  224,
);
assert(calls.length === 1, 'motion frame uses one drawImage call');
assert(
  calls[0][0] === image &&
    calls[0].slice(1).join('|') === '192|0|96|112|104|60|192|224',
  'blitter applies the shared trim and bottom-center pivot',
);
assert(
  drawn?.clip === 'idle' && drawn?.frameIndex === 2,
  'blitter returns selected frame evidence',
);
assert(
  drawMotionFrame(
    ctx,
    { descriptor: valid, image },
    'missing',
    0,
    0,
    0,
    100,
  ) === null && calls.length === 1,
  'missing clip draws nothing',
);

assert(Object.isFrozen(LOOP_CLIPS), 'exported loop clip vocabulary is frozen');
try {
  if (typeof LOOP_CLIPS.add === 'function') {
    LOOP_CLIPS.add('death');
  } else {
    LOOP_CLIPS.push('death');
  }
} catch {
  // A frozen array rejects the attempted consumer mutation in ES-module strict mode.
}
const exportedLoopsContainDeath =
  typeof LOOP_CLIPS.has === 'function'
    ? LOOP_CLIPS.has('death')
    : LOOP_CLIPS.includes('death');
assert(
  !exportedLoopsContainDeath,
  'consumer mutation cannot add death to exported loop vocabulary',
);
const isolatedPlayback = copy(valid);
isolatedPlayback.clips.death.playback = 'loop';
expectInvalid(
  isolatedPlayback,
  'entry-runner',
  'clips.death.playback',
  'consumer mutation cannot alter private playback semantics',
);

if (failures > 0) {
  throw new Error(`Motion bundle: ${failures} check(s) failed`);
}
console.log('MOTION BUNDLE PASS');
