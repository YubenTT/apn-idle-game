import fs from 'node:fs';
import { createHash } from 'node:crypto';

import {
  LOOP_CLIPS,
  MOTION_CLIP_GRAMMAR,
  MOTION_GRAMMAR,
  MOTION_PREVIEW_GRAMMAR,
  MOTION_SET_INDEX_GRAMMAR,
  REQUIRED_CLIPS,
  drawMotionFrame,
  frameIndexForClip,
  selectEnemyMotion,
  validateMotionBundle,
  validateMotionClipDescriptor,
  validateMotionPreviewBundle,
  validateMotionSetIndex,
} from '../js/motion-bundle.js';
import * as renderRuntime from '../js/render.js';
import { VISUAL_FIDELITY_BUDGETS } from '../js/visual-fidelity-v4.js';

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

const stageRoleForEnemy = renderRuntime.stageRoleForEnemy;
assert(
  typeof stageRoleForEnemy === 'function' &&
    stageRoleForEnemy({ type: 'stale' }) === 'standard' &&
    stageRoleForEnemy({ type: 'patch' }) === 'standard' &&
    stageRoleForEnemy({ type: 'boss' }) === 'boss',
  'trusted enemy state resolves standard and boss stage roles',
);

const geometryProbeContext = new Proxy(
  {},
  {
    get(_target, property) {
      if (
        property === 'createLinearGradient' ||
        property === 'createRadialGradient'
      ) {
        return () => ({ addColorStop() {} });
      }
      return () => {};
    },
    set() {
      return true;
    },
  },
);
const standardGeometry = renderRuntime.drawEnemy(
  geometryProbeContext,
  {
    id: 'stage-standard',
    type: 'stale',
    label: 'Broken Link',
    frame: 'common-a',
    x: 200,
    displayX: 200,
    hp: 10,
    hpMax: 10,
    deathT: 0,
    hurt: 0,
    killed: false,
    priorityTagRank: 0,
  },
  300,
  1,
  null,
  null,
  true,
  1,
  null,
);
assert(
  standardGeometry?.role === 'standard' &&
    standardGeometry.body.height === 72 &&
    standardGeometry.body.bottom === 298 &&
    standardGeometry.visualGap === 2,
  'drawEnemy returns exact standard 72 px body geometry with a 2 px gap',
);

const valid = readJson('valid.json');
const combinedInvalid = readJson('invalid-overlap.json');
const browserFixtureRoot = new URL('./fixtures/browser-motion/', import.meta.url);
const browserFixtureIntegrity = JSON.parse(
  fs.readFileSync(new URL('integrity.json', browserFixtureRoot), 'utf8'),
);
const sha256Bytes = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');

function smoothSetIndex(role = 'character') {
  const clips =
    role === 'hero'
      ? ['idle', 'run', 'attack', 'crit', 'sprint', 'hit', 'death', 'celebrate']
      : role === 'boss'
        ? ['idle', 'advance', 'engaged', 'hit', 'death', 'broken']
        : ['idle', 'advance', 'engaged', 'hit', 'death'];
  return {
    grammar: MOTION_SET_INDEX_GRAMMAR,
    authority: 'unapproved_preview',
    status: 'human_review_required',
    sourceFamily: 'authored-semantic-v3',
    assetId:
      role === 'hero'
        ? 'apn-hero'
        : role === 'boss'
          ? 'site-warden'
          : 'entry-runner',
    role,
    frameSize: { width: 128, height: 128 },
    trim: { x: 16, y: 8, width: 96, height: 112 },
    pivot: { x: 0.5, y: 1 },
    presentation: {
      schemaVersion: 1,
      scaleContract: 'visible-body',
      reference: {
        clip: 'idle',
        frameIndex: 0,
        sourceSha256: '1'.repeat(64),
      },
      visibleBounds: { x: 8, y: 4, width: 64, height: 88 },
      motionBounds: { x: 2, y: 1, width: 78, height: 96 },
    },
    clips: Object.fromEntries(
      clips.map((name) => [
        name,
        {
          descriptor: `${name}.json`,
          descriptorSha256: 'a'.repeat(64),
          image: `${name}.webp`,
          imageSha256: 'b'.repeat(64),
        },
      ]),
    ),
    previewLineage: {
      candidateId: `${
        role === 'hero'
          ? 'apn-hero'
          : role === 'boss'
            ? 'site-warden'
            : 'entry-runner'
      }-authored-semantic-v3`,
      candidateSha256: 'c'.repeat(64),
      temporalEvidenceSha256: 'd'.repeat(64),
      qaSummarySha256: 'e'.repeat(64),
      batchSummarySha256: 'f'.repeat(64),
      sourceManifestVersion: 4,
    },
    toolchain: {
      grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
      compositor: { name: 'ImageMagick', version: '7.1.2-13' },
      encoder: {
        name: 'cwebp',
        version: '1.6.0',
        arguments: ['-exact', '-q', '90'],
      },
      operations: [
        'crop:normalized-png:shared-trim:repage:png32',
        'resize:lanczos:shared-scale:exact-cell:png32',
        'montage:row-major:bounded-matrix:shared-cell:no-gap:transparent:alpha-on:png-color-type-6',
      ],
      profileSha256:
        '71f50b2378a4a588d9e49fb2d29700becb2b4a5ae37078a2af3280284eaa8013',
    },
  };
}

function smoothClipDescriptor(set = smoothSetIndex(), name = 'idle') {
  const contracts = {
    character: {
      idle: [30, 30, 'loop'],
      advance: [24, 30, 'loop'],
      engaged: [15, 30, 'loop'],
      hit: [8, 32, 'progress'],
      death: [30, 30, 'progress'],
    },
    boss: {
      idle: [30, 30, 'loop'],
      advance: [24, 30, 'loop'],
      engaged: [15, 30, 'loop'],
      hit: [8, 32, 'progress'],
      death: [30, 30, 'progress'],
      broken: [30, 30, 'loop'],
    },
    hero: {
      idle: [20, 30, 'loop'],
      run: [20, 32, 'loop'],
      attack: [15, 30, 'progress'],
      crit: [15, 30, 'progress'],
      sprint: [15, 30, 'loop'],
      hit: [8, 32, 'progress'],
      death: [15, 30, 'progress'],
      celebrate: [15, 30, 'loop'],
    },
  };
  const [count, fps, playback] = contracts[set.role][name];
  const frames = Array.from({ length: count }, (_, index) => {
    const poseSha256 =
      index === count - 1 && playback === 'progress'
          ? String(count - 1).padStart(64, '0')
          : String(index + 1).padStart(64, '0');
    return {
      x: (index % 10) * 96,
      y: Math.floor(index / 10) * 112,
      width: 96,
      height: 112,
      sourceSha256: poseSha256,
      bodyPoseSha256: poseSha256,
    };
  });
  return {
    grammar: MOTION_CLIP_GRAMMAR,
    authority: 'unapproved_preview',
    sourceFamily: 'authored-semantic-v3',
    assetId: set.assetId,
    name,
    playback,
    fps,
    sourceFps: 12,
    cadenceProfile: 'continuous_30',
    authoringMethod: 'deterministic_part_rig',
    interpolationMethod: 'deterministic_part_transforms',
    holds: playback === 'progress'
      ? [{ startIndex: count - 2, endIndex: count - 1, reason: 'terminal' }]
      : [],
    markers: playback === 'loop'
      ? { neutral: 0, maximum_excursion: Math.floor(count / 2), return: count - 1 }
      : { anticipation: 0, contact: Math.floor(count / 2), terminal: count - 1 },
    frames,
    atlas: {
      width: 960,
      height: Math.ceil(count / 10) * 112,
      bytes: 1024,
      sha256: 'b'.repeat(64),
    },
    encoder: {
      name: 'cwebp',
      version: '1.6.0',
      arguments: ['-exact', '-q', '90'],
    },
  };
}

function visualFidelityV4SetIndex() {
  const set = smoothSetIndex('character');
  const profileSha256 = '4'.repeat(64);
  set.sourceFamily = 'authored-semantic-v4';
  set.frameSize = { width: 256, height: 256 };
  set.trim = { x: 32, y: 16, width: 192, height: 224 };
  set.presentation.visibleBounds = { x: 16, y: 8, width: 144, height: 176 };
  set.presentation.motionBounds = { x: 4, y: 2, width: 176, height: 208 };
  set.consumerScale = {
    grammar: 'gaf2d-consumer-scale-v4',
    role: 'standard',
    maximumCssBodyHeight: 72,
    maximumDpr: 2,
    displayedDevicePixels: 144,
    runtimeCanvasClass: 256,
    sourceVisiblePixels: 176,
    scaleRatio: { numerator: 144, denominator: 176 },
  };
  set.toolchain.encoder = {
    name: 'cwebp',
    version: '1.6.0',
    arguments: ['-exact', '-q', '94'],
    profileSha256,
  };
  set.toolchain.compositor = {
    name: 'HashBoundCopy',
    version: 'selected-webp-v1',
  };
  set.toolchain.operations = [
    'validate:v4-selected-webp:hash-bound-source',
    'validate:v4-selected-webp:exact-copy-byte-proof',
    'copy:v4-selected-webp:exact-media-bytes',
  ];
  set.toolchain.profileSha256 = profileSha256;
  set.lineage = {
    sourceBatchSha256: '1'.repeat(64),
    derivativeSetSha256: '2'.repeat(64),
    masterSetSha256: '7'.repeat(64),
    selectedProfileSha256: profileSha256,
    v3LineageSha256: '8'.repeat(64),
  };
  return set;
}

function visualFidelityV4ClipDescriptor(
  set = visualFidelityV4SetIndex(),
  name = 'idle',
) {
  const descriptor = smoothClipDescriptor(set, name);
  const columns = 8;
  descriptor.sourceFamily = 'authored-semantic-v4';
  descriptor.frames = descriptor.frames.map((frame, index) => ({
    ...frame,
    x: (index % columns) * set.trim.width,
    y: Math.floor(index / columns) * set.trim.height,
    width: set.trim.width,
    height: set.trim.height,
  }));
  descriptor.atlas.width = columns * set.trim.width;
  descriptor.atlas.height =
    Math.ceil(descriptor.frames.length / columns) * set.trim.height;
  descriptor.trim =
    name === 'advance'
      ? { x: 24, y: 12, width: 176, height: 208 }
      : structuredClone(set.trim);
  descriptor.pivot =
    name === 'advance' ? { x: 0.546875, y: 0.953125 } : structuredClone(set.pivot);
  descriptor.presentation = {
    schemaVersion: 1,
    scaleContract: 'visible-body',
    reference: {
      clip: name,
      frameIndex: 0,
      sourceSha256: descriptor.frames[0].sourceSha256,
    },
    visibleBounds: {
      x: 0,
      y: Math.max(0, descriptor.trim.height - set.consumerScale.sourceVisiblePixels),
      width: descriptor.trim.width,
      height: set.consumerScale.sourceVisiblePixels,
    },
    motionBounds: {
      x: 0,
      y: 0,
      width: descriptor.trim.width,
      height: descriptor.trim.height,
    },
  };
  descriptor.lineage = {
    sourceBatchSha256: '1'.repeat(64),
    derivativeSetSha256: '2'.repeat(64),
    sourceDescriptorSha256: '3'.repeat(64),
    sourceEvidenceSha256: '4'.repeat(64),
    sourceMediaSha256: '5'.repeat(64),
    masterInventorySha256: '6'.repeat(64),
    masterSetSha256: '7'.repeat(64),
    selectedProfileSha256: set.toolchain.profileSha256,
    v3LineageSha256: '8'.repeat(64),
  };
  descriptor.encoder = structuredClone(set.toolchain.encoder);
  return descriptor;
}

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

function validBoss(assetId = 'site-warden') {
  const bundle = copy(valid);
  bundle.assetId = assetId;
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

function expectValid(bundle, expectedAssetId, message, options) {
  const errors = validateMotionBundle(bundle, expectedAssetId, options);
  assert(errors.length === 0, `${message} (${errors.join('; ')})`);
}

function expectInvalid(bundle, expectedAssetId, needle, message, options) {
  const errors = validateMotionBundle(bundle, expectedAssetId, options);
  assert(
    errors.some((error) => error.includes(needle)),
    `${message} (${errors.join('; ')})`,
  );
}

function asPreview(bundle, assetId = bundle.assetId) {
  const preview = copy(bundle);
  preview.grammar = MOTION_PREVIEW_GRAMMAR;
  preview.authority = 'unapproved_preview';
  preview.presentation = {
    schemaVersion: 1,
    scaleContract: 'visible-body',
    reference: {
      clip: 'idle',
      frameIndex: 0,
      sourceSha256: 'd'.repeat(64),
    },
    visibleBounds: { x: 8, y: 4, width: 64, height: 88 },
    motionBounds: { x: 2, y: 1, width: 78, height: 96 },
  };
  preview.previewLineage = {
    candidateId: `${assetId}-authored-semantic-v2`,
    candidateSha256: 'a'.repeat(64),
    qaSummarySha256: 'b'.repeat(64),
    batchSummarySha256: 'c'.repeat(64),
    sourceManifestVersion: 3,
  };
  delete preview.lineage;
  return preview;
}

assert(MOTION_GRAMMAR === 'gaf2d-motion-bundle-v1', 'grammar is exact');
assert(
  MOTION_PREVIEW_GRAMMAR === 'gaf2d-motion-preview-v1',
  'preview grammar is explicit and exact',
);
assert(
  MOTION_SET_INDEX_GRAMMAR === 'gaf2d-motion-set-index-v2' &&
    MOTION_CLIP_GRAMMAR === 'gaf2d-motion-clip-v2',
  'high-cadence set and clip grammars are explicit and versioned',
);
assert(
  REQUIRED_CLIPS.join('|') === 'idle|advance|engaged|hit|death',
  'required clip vocabulary is exact',
);
{
  const set = smoothSetIndex();
  const descriptor = smoothClipDescriptor(set);
  const setErrors = validateMotionSetIndex(set, 'entry-runner', {
    role: 'character',
  });
  const descriptorErrors = validateMotionClipDescriptor(
    descriptor,
    'idle',
    set,
    {
      role: 'character',
      descriptorSha256: 'a'.repeat(64),
      imageSha256: 'b'.repeat(64),
    },
  );
  assert(
    setErrors.length === 0,
    `V2 per-clip set index accepts exact character vocabulary (${setErrors.join('; ')})`,
  );
  assert(
    descriptorErrors.length === 0,
    `V2 high-cadence clip accepts genuine deterministic-part provenance (${descriptorErrors.join('; ')})`,
  );

  const missing = copy(set);
  delete missing.clips.engaged;
  assert(
    validateMotionSetIndex(missing, 'entry-runner', { role: 'character' })
      .some((error) => error.includes('missing required clip "engaged"')),
    'V2 set index rejects a missing required clip',
  );

  const unknown = copy(set);
  unknown.clips.teleport = copy(unknown.clips.idle);
  assert(
    validateMotionSetIndex(unknown, 'entry-runner', { role: 'character' })
      .some((error) => error.includes('unexpected clip "teleport"')),
    'V2 set index rejects unknown clip keys',
  );

  const badHash = copy(descriptor);
  badHash.atlas.sha256 = '9'.repeat(64);
  assert(
    validateMotionClipDescriptor(
      badHash,
      'idle',
      set,
      {
        role: 'character',
        descriptorSha256: 'a'.repeat(64),
        imageSha256: 'b'.repeat(64),
      },
    ).some((error) => error.includes('image SHA-256')),
    'V2 clip descriptor rejects an index/image hash mismatch',
  );

  const wrongResourceHash = validateMotionClipDescriptor(
    descriptor,
    'idle',
    set,
    {
      role: 'character',
      descriptorSha256: '8'.repeat(64),
      imageSha256: 'b'.repeat(64),
    },
  );
  assert(
    wrongResourceHash.some((error) => error.includes('descriptor SHA-256')),
    'V2 clip descriptor rejects fetched descriptor bytes not bound by the set index',
  );

  const overflow = copy(descriptor);
  overflow.atlas.width = 2048;
  overflow.atlas.height = 769;
  assert(
    validateMotionClipDescriptor(overflow, 'idle', set, {
      role: 'character',
    }).some((error) => error.includes('decoded RGBA bytes')),
    'V2 common clip rejects per-clip decoded overflow',
  );

  const falseCadence = copy(descriptor);
  falseCadence.frames[2].bodyPoseSha256 =
    falseCadence.frames[1].bodyPoseSha256;
  assert(
    validateMotionClipDescriptor(falseCadence, 'idle', set, {
      role: 'character',
    }).some((error) => error.includes('undeclared repeated body pose')),
    'V3 continuous cadence rejects repeated low-rate raster poses outside holds',
  );

  const fakeUplift = copy(descriptor);
  fakeUplift.authoringMethod = 'native_frames';
  fakeUplift.interpolationMethod = 'none';
  assert(
    validateMotionClipDescriptor(fakeUplift, 'idle', set, {
      role: 'character',
    }).some((error) => error.includes('deterministic part transforms')),
    'V3 cadence uplift cannot be relabeled native low-rate frames',
  );

  const bossSet = smoothSetIndex('boss');
  const bossBroken = smoothClipDescriptor(bossSet, 'broken');
  bossBroken.atlas.bytes = 240 * 1024;
  assert(
    validateMotionClipDescriptor(
      bossBroken,
      'broken',
      bossSet,
      { role: 'boss' },
    ).length === 0,
    'V2 boss clip accepts the exact 240 KiB compressed budget',
  );
  bossBroken.atlas.bytes += 1;
  assert(
    validateMotionClipDescriptor(
      bossBroken,
      'broken',
      bossSet,
      { role: 'boss' },
    ).some((error) => error.includes('245760 byte boss clip budget')),
    'V2 boss clip rejects one byte above its compressed budget',
  );
}
{
  const set = visualFidelityV4SetIndex();
  const descriptor = visualFidelityV4ClipDescriptor(set);
  const setErrors = validateMotionSetIndex(set, 'entry-runner', {
    role: 'character',
    consumerRole: 'standard',
  });
  const descriptorErrors = validateMotionClipDescriptor(
    descriptor,
    'idle',
    set,
    {
      role: 'character',
      consumerRole: 'standard',
      descriptorSha256: 'a'.repeat(64),
      imageSha256: 'b'.repeat(64),
      selectedProfileSha256: set.toolchain.profileSha256,
    },
  );
  assert(
    setErrors.length === 0,
    `V4 set accepts one role-aware 256px derivative while preserving V3 lineage (${setErrors.join('; ')})`,
  );
  assert(
    descriptorErrors.length === 0,
    `V4 clip accepts the selected generic quality profile without a hardcoded quality rule (${descriptorErrors.join('; ')})`,
  );
  const advance = visualFidelityV4ClipDescriptor(set, 'advance');
  const drawCalls = [];
  const drawn = drawMotionFrame(
    { drawImage(...args) { drawCalls.push(args); } },
    {
      image: { width: advance.atlas.width, height: advance.atlas.height },
      descriptor: advance,
      set,
    },
    'advance',
    0,
    200,
    300,
    104,
  );
  assert(
    set.previewLineage.candidateId === 'entry-runner-authored-semantic-v3',
    'V4 derivative keeps V3 semantic candidate lineage',
  );
  assert(
    drawCalls.length === 1 &&
      drawn.destination.height === 104 &&
      drawn.destination.width === 88 &&
      drawn.destination.x !== 200 + (set.trim.x - set.frameSize.width * set.pivot.x) * (104 / set.trim.height),
    'V4 draw uses clip-owned trim and pivot instead of the set-wide shared geometry',
  );

  assert(
    validateMotionSetIndex(set, 'entry-runner', {
      role: 'character',
      consumerRole: 'standard',
      selectedProfileSha256: '5'.repeat(64),
    }).some((error) => /profile.*drift/i.test(error)),
    'V4 set rejects root-selected profile drift before clip activation',
  );

  const independentlyRoundedVisible = copy(set);
  independentlyRoundedVisible.presentation.visibleBounds.height -= 1;
  assert(
    validateMotionSetIndex(independentlyRoundedVisible, 'entry-runner', {
      role: 'character',
      consumerRole: 'standard',
    }).length === 0,
    'V4 set accepts independently rounded presentation geometry when both density facts forbid upscale',
  );

  const undersizedVisible = copy(set);
  undersizedVisible.presentation.visibleBounds.height =
    undersizedVisible.consumerScale.displayedDevicePixels - 1;
  assert(
    validateMotionSetIndex(undersizedVisible, 'entry-runner', {
      role: 'character',
      consumerRole: 'standard',
    }).some((error) => /presentation.*displayed device pixels/i.test(error)),
    'V4 set rejects presentation geometry below displayed device pixels',
  );

  const wrongRole = copy(set);
  wrongRole.consumerScale.role = 'elite';
  wrongRole.consumerScale.maximumCssBodyHeight = 84;
  wrongRole.consumerScale.displayedDevicePixels = 168;
  wrongRole.consumerScale.scaleRatio.numerator = 168;
  assert(
    validateMotionSetIndex(wrongRole, 'entry-runner', {
      role: 'character',
      consumerRole: 'standard',
    }).some((error) => /consumer scale role.*trusted/i.test(error)),
    'V4 set cannot self-promote its trusted consumer role',
  );

  const profileDrift = copy(descriptor);
  profileDrift.encoder.profileSha256 = '5'.repeat(64);
  assert(
    validateMotionClipDescriptor(profileDrift, 'idle', set, {
      role: 'character',
      consumerRole: 'standard',
      selectedProfileSha256: set.toolchain.profileSha256,
    }).some((error) => /profile.*drift|profile.*differ/i.test(error)),
    'V4 clip rejects encoder profile drift from manifest and set authority',
  );

  const higherCommonBytes = copy(descriptor);
  higherCommonBytes.atlas.bytes = 196370;
  assert(
    validateMotionClipDescriptor(higherCommonBytes, 'idle', set, {
      role: 'character',
      consumerRole: 'standard',
      selectedProfileSha256: set.toolchain.profileSha256,
      imageBytes: higherCommonBytes.atlas.bytes,
    }).length === 0,
    'V4 common clip accepts provisional selected media above the retired V3 cap',
  );

  const bossSet = smoothSetIndex('boss');
  bossSet.sourceFamily = 'authored-semantic-v4';
  bossSet.assetId = 'site-warden';
  bossSet.frameSize = { width: 320, height: 320 };
  bossSet.trim = { x: 48, y: 32, width: 224, height: 256 };
  bossSet.presentation.visibleBounds = { x: 16, y: 8, width: 176, height: 224 };
  bossSet.presentation.motionBounds = { x: 4, y: 2, width: 208, height: 256 };
  bossSet.consumerScale = {
    grammar: 'gaf2d-consumer-scale-v4',
    role: 'boss',
    maximumCssBodyHeight: 112,
    maximumDpr: 2,
    displayedDevicePixels: 224,
    runtimeCanvasClass: 320,
    sourceVisiblePixels: 224,
    scaleRatio: { numerator: 224, denominator: 224 },
  };
  bossSet.toolchain = structuredClone(set.toolchain);
  bossSet.lineage = {
    sourceBatchSha256: '1'.repeat(64),
    derivativeSetSha256: '2'.repeat(64),
    masterSetSha256: '7'.repeat(64),
    selectedProfileSha256: set.toolchain.profileSha256,
    v3LineageSha256: '8'.repeat(64),
  };
  bossSet.consumerScale.role = 'boss';
  const bossDescriptor = visualFidelityV4ClipDescriptor(bossSet, 'broken');
  bossDescriptor.atlas.bytes = 352820;
  assert(
    validateMotionClipDescriptor(bossDescriptor, 'broken', bossSet, {
      role: 'boss',
      consumerRole: 'boss',
      selectedProfileSha256: bossSet.toolchain.profileSha256,
      imageBytes: bossDescriptor.atlas.bytes,
    }).length === 0,
    'V4 boss clip accepts provisional selected media above the retired V3 cap',
  );

  const aboveV4 = copy(descriptor);
  aboveV4.atlas.bytes = VISUAL_FIDELITY_BUDGETS.commonEncodedBytes + 1;
  assert(
    validateMotionClipDescriptor(aboveV4, 'idle', set, {
      role: 'character',
      consumerRole: 'standard',
      selectedProfileSha256: set.toolchain.profileSha256,
      imageBytes: aboveV4.atlas.bytes,
    }).some((error) =>
      error.includes(
        `${VISUAL_FIDELITY_BUDGETS.commonEncodedBytes} byte character clip budget`,
      ),
    ),
    'V4 clip rejects one byte above the rounded measured selected-media cap',
  );
}
expectValid(valid, 'entry-runner', 'valid common motion bundle accepted');
assert(
  !Object.hasOwn(valid, 'presentation') &&
    validateMotionBundle(valid, 'entry-runner').length === 0,
  'unchanged production V1 bundle remains valid without preview presentation metadata',
);
{
  const preview = asPreview(valid);
  const previewErrors = validateMotionPreviewBundle(
    preview,
    'entry-runner',
  );
  assert(
    previewErrors.length === 0,
    `preview descriptor accepts bounded motion geometry (${previewErrors.join('; ')})`,
  );
  expectInvalid(
    preview,
    'entry-runner',
    'grammar',
    'production validator rejects the unapproved preview grammar',
  );
  const approvalLeak = copy(preview);
  approvalLeak.lineage = copy(valid.lineage);
  assert(
    validateMotionPreviewBundle(approvalLeak, 'entry-runner').some(
      (error) =>
        error.includes('unexpected property "lineage"') ||
        error.includes('expected at most'),
    ),
    'preview grammar rejects production approval lineage',
  );
  const wrongCandidate = copy(preview);
  wrongCandidate.previewLineage.candidateId =
    'another-character-authored-semantic-v2';
  assert(
    validateMotionPreviewBundle(wrongCandidate, 'entry-runner').some(
      (error) => error.includes('candidateId'),
    ),
    'preview candidate identity is bound to the expected asset',
  );
  const presentationMutations = [
    {
      message: 'preview descriptor requires presentation metadata',
      mutate: (bundle) => {
        delete bundle.presentation;
      },
      needle: 'presentation:',
    },
    {
      message: 'preview presentation reference is the neutral idle clip',
      mutate: (bundle) => {
        bundle.presentation.reference.clip = 'advance';
      },
      needle: 'presentation.reference.clip',
    },
    {
      message: 'preview presentation reference is the current neutral frame',
      mutate: (bundle) => {
        bundle.presentation.reference.frameIndex = 1;
      },
      needle: 'presentation.reference.frameIndex',
    },
    {
      message: 'preview presentation bounds stay inside the shared trim',
      mutate: (bundle) => {
        bundle.presentation.motionBounds.width = 95;
      },
      needle: 'outside trim',
    },
    {
      message: 'preview motion envelope contains the neutral body',
      mutate: (bundle) => {
        bundle.presentation.motionBounds = {
          x: 9,
          y: 5,
          width: 63,
          height: 87,
        };
      },
      needle: 'must contain',
    },
    {
      message: 'preview presentation rejects zero visible body height',
      mutate: (bundle) => {
        bundle.presentation.visibleBounds.height = 0;
      },
      needle: 'finite positive number',
    },
    {
      message: 'preview presentation binds a lowercase source SHA-256',
      mutate: (bundle) => {
        bundle.presentation.reference.sourceSha256 = 'D'.repeat(64);
      },
      needle: 'sourceSha256',
    },
    {
      message: 'preview presentation is closed to unknown properties',
      mutate: (bundle) => {
        bundle.presentation.sourcePath = '/private/frame.png';
      },
      needle: 'unexpected property "sourcePath"',
    },
  ];
  for (const { message, mutate, needle } of presentationMutations) {
    const invalidPresentation = copy(preview);
    mutate(invalidPresentation);
    const errors = validateMotionPreviewBundle(
      invalidPresentation,
      'entry-runner',
    );
    assert(
      errors.some((error) => error.includes(needle)),
      `${message} (${errors.join('; ')})`,
    );
  }
}
assert(
  browserFixtureIntegrity.grammar === 'apn-browser-motion-fixture-v1' &&
    browserFixtureIntegrity.generator === 'generate.mjs' &&
    browserFixtureIntegrity.encoder?.name === 'cwebp' &&
    browserFixtureIntegrity.encoder?.version === '1.6.0' &&
    JSON.stringify(browserFixtureIntegrity.encoder?.arguments) ===
      JSON.stringify(['-exact', '-q', '90']),
  'browser fixture integrity authority pins its generator and encoder',
);
for (const assetId of ['entry-runner', 'veil-operator']) {
  const descriptorBytes = fs.readFileSync(
    new URL(`${assetId}/motion.json`, browserFixtureRoot),
  );
  const atlasBytes = fs.readFileSync(
    new URL(`${assetId}/motion.webp`, browserFixtureRoot),
  );
  const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
  const expected = browserFixtureIntegrity.assets?.[assetId];
  assert(
    expected?.descriptorSha256 === sha256Bytes(descriptorBytes) &&
      expected?.atlasSha256 === sha256Bytes(atlasBytes),
    `${assetId} browser fixture matches its checked-in integrity hashes`,
  );
  assert(
    descriptor.atlas?.sha256 === sha256Bytes(atlasBytes),
    `${assetId} browser descriptor binds its exact synthetic atlas`,
  );
  expectValid(
    descriptor,
    assetId,
    `${assetId} browser fixture satisfies the production motion grammar`,
  );
}

const commonAtDecodedLimit = copy(valid);
commonAtDecodedLimit.atlas.width = 2048;
commonAtDecodedLimit.atlas.height = 768;
expectValid(
  commonAtDecodedLimit,
  'entry-runner',
  'common atlas accepts exactly 6 MiB RGBA and a 2048px dimension',
);

const renamedBossAtDecodedLimit = validBoss('patch-overseer');
renamedBossAtDecodedLimit.atlas.width = 2048;
renamedBossAtDecodedLimit.atlas.height = 1024;
expectValid(
  renamedBossAtDecodedLimit,
  'patch-overseer',
  'trusted renamed boss accepts exactly 8 MiB RGBA with required broken clip',
  { role: 'boss' },
);
expectInvalid(
  validBoss('site-warden'),
  'site-warden',
  '"broken" is forbidden for non-boss role',
  'asset ID cannot self-promote into boss authority',
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

const hugeClipMap = copy(valid);
for (let index = 0; index < 1000; index += 1) {
  Object.defineProperty(hugeClipMap.clips, `unexpected-${index}`, {
    enumerable: true,
    get() {
      throw new Error(`validator touched unexpected clip ${index}`);
    },
  });
}
let hugeClipErrors = null;
let hugeClipThrow = null;
try {
  hugeClipErrors = validateMotionBundle(hugeClipMap, 'entry-runner');
} catch (error) {
  hugeClipThrow = error;
}
assert(
  hugeClipThrow === null,
  `huge clip map is rejected without touching unexpected clip records (${hugeClipThrow?.message || ''})`,
);
assert(
  Array.isArray(hugeClipErrors) &&
    hugeClipErrors.some((error) => error.includes('clips: expected at most 6 entries')),
  'huge clip map is rejected by bounded clip-key validation',
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
    message: 'unknown top-level property rejected',
    mutate: (bundle) => {
      bundle.debug = true;
    },
    needle: 'bundle: unexpected property "debug"',
  },
  {
    message: 'unknown atlas property rejected',
    mutate: (bundle) => {
      bundle.atlas.url = 'motion.webp';
    },
    needle: 'atlas: unexpected property "url"',
  },
  {
    message: 'unknown frame-size property rejected',
    mutate: (bundle) => {
      bundle.frameSize.depth = 1;
    },
    needle: 'frameSize: unexpected property "depth"',
  },
  {
    message: 'unknown trim property rejected',
    mutate: (bundle) => {
      bundle.trim.rotated = false;
    },
    needle: 'trim: unexpected property "rotated"',
  },
  {
    message: 'unknown pivot property rejected',
    mutate: (bundle) => {
      bundle.pivot.unit = 'normalized';
    },
    needle: 'pivot: unexpected property "unit"',
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
    message: 'trusted boss atlas above 8 MiB RGBA rejected',
    make: () => validBoss('future-gatekeeper'),
    expectedAssetId: 'future-gatekeeper',
    options: { role: 'boss' },
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
    message: 'unknown lineage property rejected',
    mutate: (bundle) => {
      bundle.lineage.sourcePath = '/private/source.png';
    },
    needle: 'lineage: unexpected property "sourcePath"',
  },
  {
    message: 'missing encoder structure rejected',
    mutate: (bundle) => {
      bundle.encoder = null;
    },
    needle: 'encoder:',
  },
  {
    message: 'unknown encoder version rejected',
    mutate: (bundle) => {
      bundle.encoder.version = '999.999.999';
    },
    needle: 'encoder.profile',
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
    message: 'unknown encoder property rejected',
    mutate: (bundle) => {
      bundle.encoder.command = 'cwebp';
    },
    needle: 'encoder: unexpected property "command"',
  },
  {
    message: 'wrong encoder argument order rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-q', '90', '-exact'];
    },
    needle: 'encoder.profile',
  },
  {
    message: 'wrong encoder quality rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', '-q', '89'];
    },
    needle: 'encoder.profile',
  },
  {
    message: 'extra encoder argument rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', '-q', '90', '-quiet'];
    },
    needle: 'encoder.profile',
  },
  {
    message: 'huge encoder argument vector rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = Array.from({ length: 65 }, () => '-exact');
    },
    needle: 'encoder:',
  },
  {
    message: 'absolute encoder operand rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', '/private/source.png'];
    },
    needle: 'encoder.profile',
  },
  {
    message: 'URL encoder operand rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', 'https://example.invalid/source'];
    },
    needle: 'encoder.profile',
  },
  {
    message: 'secret-bearing encoder query rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', 'q=90&token=secret'];
    },
    needle: 'encoder.profile',
  },
  {
    message: 'output operand flag rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', '-o'];
    },
    needle: 'encoder.profile',
  },
  {
    message: 'raw secret-like encoder operand rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', 'credential-shaped-test-value'];
    },
    needle: 'encoder.profile',
  },
  {
    message: 'unknown encoder option rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', '-future-magic'];
    },
    needle: 'encoder.profile',
  },
  {
    message: 'duplicate encoder option rejected',
    mutate: (bundle) => {
      bundle.encoder.arguments = ['-exact', '-q', '90', '-q', '80'];
    },
    needle: 'encoder.profile',
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
    message: 'fractional clip FPS rejected',
    mutate: (bundle) => {
      bundle.clips.idle.fps = 7.5;
    },
    needle: 'clips.idle.fps',
  },
  {
    message: 'unknown clip property rejected',
    mutate: (bundle) => {
      bundle.clips.idle.reverse = false;
    },
    needle: 'clips.idle: unexpected property "reverse"',
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
    message: 'wrong exact clip frame count rejected',
    mutate: (bundle) => {
      bundle.clips.hit.frames.pop();
    },
    needle: 'clips.hit.frames: expected exactly 4 frames',
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
    message: 'broken clip forbidden for non-boss role',
    mutate: addBrokenClip,
    needle: '"broken" is forbidden for non-boss role',
  },
  {
    message: 'broken clip required for any trusted boss role',
    make: () => {
      const bundle = copy(valid);
      bundle.assetId = 'future-gatekeeper';
      return bundle;
    },
    expectedAssetId: 'future-gatekeeper',
    options: { role: 'boss' },
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
  {
    message: 'unknown frame-rectangle property rejected',
    mutate: (bundle) => {
      bundle.clips.idle.frames[0].rotated = false;
    },
    needle: 'clips.idle.frames[0]: unexpected property "rotated"',
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
    testCase.options,
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
const refreshRates = [60, 90, 120, 144];
assert(
  refreshRates.join('|') === '60|90|120|144',
  'refresh-rate independence QA covers 60, 90, 120, and 144 Hz',
);
const commonElapsedTimestamps = Array.from(
  { length: 13 },
  (_value, step) => step / 6,
);
const frameIndexContractOracle = (clip, value) => {
  const count = clip.frames.length;
  const safeValue = Number.isFinite(value) ? value : 0;
  if (clip.playback === 'loop') {
    return (
      Math.floor(Math.max(0, safeValue) * clip.fps) % count
    );
  }
  const progress = Math.min(1, Math.max(0, safeValue));
  return Math.min(count - 1, Math.floor(progress * count));
};
const elapsedTimeAuthority = commonElapsedTimestamps.map((timestamp) =>
  frameIndexContractOracle(valid.clips.idle, timestamp),
);
for (const refreshHz of refreshRates) {
  const everyRepaintMatchesContract = Array.from(
    { length: refreshHz * 2 + 1 },
    (_value, tick) => tick,
  ).every((tick) => {
    const elapsedSeconds = tick / refreshHz;
    const runtimeFrame = frameIndexForClip(
      valid.clips.idle,
      elapsedSeconds,
    );
    return (
      runtimeFrame ===
      frameIndexContractOracle(valid.clips.idle, elapsedSeconds)
    );
  });
  assert(
    everyRepaintMatchesContract,
    `${refreshHz} Hz selects the contract frame at every repaint tick across two seconds`,
  );
  const repaintFramesAtCommonTimes = commonElapsedTimestamps.map(
    (timestamp) => {
      const repaintTick = Math.round(timestamp * refreshHz);
      return frameIndexForClip(
        valid.clips.idle,
        repaintTick / refreshHz,
      );
    },
  );
  assert(
    repaintFramesAtCommonTimes.join('|') ===
      elapsedTimeAuthority.join('|'),
    `${refreshHz} Hz repaint schedule matches elapsed-time authority at common exact timestamps`,
  );
}
const idleCycleSeconds =
  valid.clips.idle.frames.length / valid.clips.idle.fps;
assert(
  frameIndexForClip(valid.clips.idle, 0) ===
    frameIndexForClip(valid.clips.idle, idleCycleSeconds),
  'loop clip wraps to its first frame at one exact cycle',
);
assert(
  frameIndexForClip(valid.clips.death, 1) === 7,
  'progress clip holds its final frame',
);
assert(
  frameIndexForClip(valid.clips.death, -1) === 0,
  'progress clip clamps before its first frame',
);
assert(
  [0, 0.249999, 0.25, 0.5, 0.75, 1].map((value) =>
    frameIndexForClip(valid.clips.hit, value),
  ).join('|') === '0|0|1|2|3|3',
  'progress clip uses equal normalized bins and holds the final frame at one',
);
assert(
  [-1, 0, 0.249999, 0.25, 0.5, 0.75, 1, 2].every(
    (value) =>
      frameIndexForClip(valid.clips.hit, value) ===
      frameIndexContractOracle(valid.clips.hit, value),
  ),
  'progress clip selection matches the normalized contract oracle',
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

const renamedBoss = validBoss('patch-overseer');
const bossContext = {
  timestamp: 0.4,
  meleeStop: 120,
  engagedId: 'engaged-enemy',
  assetId: 'patch-overseer',
  clips: renamedBoss.clips,
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
const deathSelection = selectEnemyMotion(everyState, bossContext);
assert(deathSelection.clip === 'death', 'death outranks all colliding states');
assert(deathSelection.value === 0.5, 'death uses deathT/deathMax progress');

const hitBrokenAdvanceEngaged = {
  ...everyState,
  killed: false,
  deathT: 0,
};
const hitSelection = selectEnemyMotion(hitBrokenAdvanceEngaged, bossContext);
assert(hitSelection.clip === 'hit', 'hit outranks broken, advance, and engaged');
assert(hitSelection.value === 0.5, 'hit uses the existing hurt clock');

const brokenAdvanceEngaged = {
  ...hitBrokenAdvanceEngaged,
  hurt: 0,
};
assert(
  selectEnemyMotion(brokenAdvanceEngaged, bossContext).clip === 'broken',
  'owned broken clip on a renamed boss outranks advance and engaged',
);

const brokenlessBossContext = {
  ...bossContext,
  clips: valid.clips,
};
assert(
  selectEnemyMotion(brokenAdvanceEngaged, brokenlessBossContext).clip ===
    'advance',
  'boss context without broken ownership never selects broken',
);
assert(
  selectEnemyMotion(brokenAdvanceEngaged, {
    ...bossContext,
    assetId: 'another-future-boss',
  }).clip === 'broken',
  'selector follows validated broken ownership instead of a hardcoded asset ID',
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
  selectEnemyMotion(advanceAndEngaged, bossContext).clip === 'advance',
  'advance outranks engaged when both states collide',
);

const engaged = {
  ...baseEnemy,
  id: 'engaged-enemy',
};
assert(
  selectEnemyMotion(engaged, bossContext).clip === 'engaged',
  'stationary melee reaction uses engaged, not attack',
);
assert(
  selectEnemyMotion(baseEnemy, bossContext).clip === 'idle',
  'unengaged stationary enemy idles',
);

const firstLoop = selectEnemyMotion(advanceAndEngaged, bossContext);
const laterLoop = selectEnemyMotion(advanceAndEngaged, {
  ...bossContext,
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
