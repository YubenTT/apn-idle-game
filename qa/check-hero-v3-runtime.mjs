import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HERO_APPROVED_CLIP_GRAMMAR,
  HERO_CLIP_CONTRACT,
  HERO_MATRIX_PROFILE_SHA256,
  HERO_PREVIEW_CLIP_GRAMMAR,
  HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  HERO_PREVIEW_SET_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_OPERATIONS,
  HERO_SET_GRAMMAR,
  HERO_TOOLCHAIN_GRAMMAR,
  HERO_TOOLCHAIN_OPERATIONS,
  HERO_V3_CLIP_CONTRACT,
  validateHeroClipDescriptor,
  validateHeroSetManifest,
} from '../js/hero-v3-contract.js';
import {
  MOTION_CLIP_GRAMMAR,
  MOTION_SET_INDEX_GRAMMAR,
} from '../js/motion-bundle.js';
import {
  disposeHeroV3,
  drawV3Frame,
  getV3Clip,
  getV3Presentation,
  heroV3AuthorityStatus,
  heroV3Ready,
  loadHeroV3,
} from '../js/hero-v3.js';
import * as heroV3Runtime from '../js/hero-v3.js';
import * as renderRuntime from '../js/render.js';
import { resolveActorGeometry } from '../js/stage-presentation.js';

const versionedHeroV3 = await import(
  '../js/hero-v3.js?v=gaf2d-motion-v1'
);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const heroRoot = path.join(root, 'assets/mascot/v3');
const encoder = new TextEncoder();
const assert = (condition, message) => {
  if (!condition) throw new Error(`HeroV3Runtime: ${message}`);
  console.log(`OK ${message}`);
};
const sha256 = (bytes) =>
  crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const canonical = (value) => `${JSON.stringify(value, null, 2)}\n`;

const heroAuthoritySources = [
  'js/hero-v2.js',
  'js/hero-v3.js',
  'js/hero-v3-contract.js',
  'scripts/assets/build-gaf2d-hero.mjs',
].map((relative) => fs.readFileSync(path.join(root, relative), 'utf8'));
assert(
  heroAuthoritySources.every(
    (source) =>
      !source.includes('HERO_V3_APPROVED_CONTRACT') &&
      !source.includes('approved V3 clip') &&
      !source.includes('approved V3 clips'),
  ),
  'unapproved V3 runtime source uses authority-neutral clip wording',
);
assert(
  HERO_V3_CLIP_CONTRACT === HERO_CLIP_CONTRACT,
  'Hero V3 clip contract has one authority-neutral canonical object',
);

const setBytes = fs.readFileSync(path.join(heroRoot, 'set.json'));
const productionSet = JSON.parse(setBytes.toString('utf8'));
assert(
  validateHeroSetManifest(productionSet).length === 0,
  'production Hero set descriptor is closed-world and valid',
);
assert(
  productionSet.grammar === HERO_SET_GRAMMAR &&
    productionSet.status === 'historical' &&
    productionSet.lineage === null &&
    productionSet.toolchain === null,
  'current Hero bytes are explicitly historical and claim no creative approval',
);

for (const [name, contract] of Object.entries(HERO_CLIP_CONTRACT)) {
  const record = productionSet.clips[name];
  const descriptorBytes = fs.readFileSync(path.join(heroRoot, record.descriptor));
  const imageBytes = fs.readFileSync(path.join(heroRoot, record.image));
  const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
  assert(
    sha256(descriptorBytes) === record.descriptorSha256 &&
      sha256(imageBytes) === record.imageSha256,
    `${name}: set hashes bind the exact descriptor and image bytes`,
  );
  assert(
    validateHeroClipDescriptor(descriptor, name, productionSet).length === 0,
    `${name}: historical descriptor remains bounded and portable`,
  );
  assert(
    descriptor.frames.length > 0 &&
      descriptor.frames.length <= 64 &&
      contract.frames > 0,
    `${name}: historical playback is bounded without claiming approved frame counts`,
  );
}

const approvedLineage = Object.fromEntries(
  [
    'identityApprovalSha256',
    'motionApprovalSha256',
    'motionSetCandidateSha256',
    'motionSetApprovalSha256',
    'rigApprovalSha256',
    'sourceManifestSha256',
    'exportArtifactSha256',
  ].map((key, index) => [key, String(index + 1).repeat(64)]),
);
const approvedEncoder = {
  name: 'cwebp',
  version: '1.6.0',
  arguments: ['-exact', '-q', '90'],
};
const approvedToolchain = {
  grammar: HERO_TOOLCHAIN_GRAMMAR,
  compositor: { name: 'ImageMagick', version: '7.1.2-13' },
  encoder: approvedEncoder,
  operations: [...HERO_TOOLCHAIN_OPERATIONS],
  profileSha256: HERO_MATRIX_PROFILE_SHA256,
};
const approvedSet = {
  ...structuredClone(productionSet),
  status: 'approved',
  lineage: approvedLineage,
  toolchain: approvedToolchain,
};
assert(
  validateHeroSetManifest(approvedSet).length === 0,
  'approved set requires complete identity, motion, rig, export, and toolchain lineage',
);

const approvedDescriptor = {
  grammar: HERO_APPROVED_CLIP_GRAMMAR,
  name: 'idle',
  playback: 'loop',
  fps: 12,
  frameSize: { width: 128, height: 128 },
  frames: Array.from({ length: HERO_CLIP_CONTRACT.idle.frames }, (_, index) => ({
    x: index * 64,
    y: 0,
    width: 64,
    height: 96,
  })),
  anchor: [0.5, 1],
  trim: { x: 32, y: 32, width: 64, height: 96 },
  atlas: {
    width: HERO_CLIP_CONTRACT.idle.frames * 64,
    height: 96,
    bytes: 1024,
    sha256: approvedSet.clips.idle.imageSha256,
  },
  lineage: approvedLineage,
  encoder: approvedEncoder,
};
assert(
  validateHeroClipDescriptor(approvedDescriptor, 'idle', approvedSet).length === 0,
  'approved descriptor matches the exact clip, pivot, atlas, lineage, and encoder contract',
);
const wrongApprovedCount = structuredClone(approvedDescriptor);
wrongApprovedCount.frames.pop();
assert(
  validateHeroClipDescriptor(wrongApprovedCount, 'idle', approvedSet)
    .some((error) => error.includes('exactly 8 frames')),
  'approved Hero clip cannot replace an exact motion contract with a partial clip',
);

const approvedRuntimeFiles = new Map();
const approvedRuntimeClips = {};
for (const [name, contract] of Object.entries(HERO_CLIP_CONTRACT)) {
  const imageBytes = encoder.encode(`approved-image-${name}`);
  const imageSha256 = sha256(imageBytes);
  const descriptor = {
    grammar: HERO_APPROVED_CLIP_GRAMMAR,
    name,
    playback: contract.playback,
    fps: 12,
    frameSize: { width: 128, height: 128 },
    frames: Array.from({ length: contract.frames }, (_, index) => ({
      x: index * 64,
      y: 0,
      width: 64,
      height: 96,
    })),
    anchor: [0.5, 1],
    trim: { x: 32, y: 32, width: 64, height: 96 },
    atlas: {
      width: contract.frames * 64,
      height: 96,
      bytes: imageBytes.byteLength,
      sha256: imageSha256,
    },
    lineage: approvedLineage,
    encoder: approvedEncoder,
  };
  const descriptorBytes = encoder.encode(canonical(descriptor));
  approvedRuntimeClips[name] = {
    descriptor: `${name}.json`,
    descriptorSha256: sha256(descriptorBytes),
    image: `${name}.webp`,
    imageSha256,
  };
  approvedRuntimeFiles.set(
    `assets/approved-v3/${name}.json`,
    descriptorBytes,
  );
  approvedRuntimeFiles.set(`assets/approved-v3/${name}.webp`, imageBytes);
}
const approvedRuntimeSet = {
  grammar: HERO_SET_GRAMMAR,
  status: 'approved',
  clips: approvedRuntimeClips,
  lineage: approvedLineage,
  toolchain: approvedToolchain,
};
approvedRuntimeFiles.set(
  'assets/approved-v3/set.json',
  encoder.encode(canonical(approvedRuntimeSet)),
);

const previewLineage = {
  candidateId: 'apn-hero-authored-semantic-v2',
  candidateSha256: 'a'.repeat(64),
  qaSummarySha256: 'b'.repeat(64),
  batchSummarySha256: 'c'.repeat(64),
  sourceManifestVersion: 2,
};
const previewPresentation = {
  schemaVersion: 1,
  scaleContract: 'visible-body',
  reference: {
    clip: 'idle',
    frameIndex: 0,
    sourceSha256: 'd'.repeat(64),
  },
  visibleBounds: { x: 8, y: 4, width: 48, height: 88 },
  motionBounds: { x: 2, y: 1, width: 60, height: 95 },
};
const previewRuntimeFiles = new Map();
const previewRuntimeClips = {};
for (const [name, contract] of Object.entries(HERO_CLIP_CONTRACT)) {
  const imageBytes = encoder.encode(`preview-image-${name}`);
  const imageSha256 = sha256(imageBytes);
  const descriptor = {
    grammar: HERO_PREVIEW_CLIP_GRAMMAR,
    authority: 'unapproved_preview',
    name,
    playback: contract.playback,
    fps: name === 'sprint' ? 20 : 12,
    frameSize: { width: 128, height: 128 },
    frames: Array.from({ length: contract.frames }, (_, index) => ({
      x: index * 64,
      y: 0,
      width: 64,
      height: 96,
    })),
    anchor: [0.5, 1],
    trim: { x: 32, y: 32, width: 64, height: 96 },
    atlas: {
      width: contract.frames * 64,
      height: 96,
      bytes: imageBytes.byteLength,
      sha256: imageSha256,
    },
    presentation: structuredClone(previewPresentation),
    previewLineage,
    encoder: approvedEncoder,
  };
  const descriptorBytes = encoder.encode(canonical(descriptor));
  previewRuntimeClips[name] = {
    descriptor: `${name}.json`,
    descriptorSha256: sha256(descriptorBytes),
    image: `${name}.webp`,
    imageSha256,
  };
  previewRuntimeFiles.set(
    `assets/preview-v3/${name}.json`,
    descriptorBytes,
  );
  previewRuntimeFiles.set(`assets/preview-v3/${name}.webp`, imageBytes);
}
const previewRuntimeSet = {
  grammar: HERO_PREVIEW_SET_GRAMMAR,
  status: 'preview',
  authority: 'unapproved_preview',
  clips: previewRuntimeClips,
  previewLineage,
  toolchain: {
    grammar: HERO_PREVIEW_TOOLCHAIN_GRAMMAR,
    compositor: { name: 'ImageMagick', version: '7.1.2-13' },
    encoder: approvedEncoder,
    operations: [...HERO_PREVIEW_TOOLCHAIN_OPERATIONS],
    profileSha256: HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  },
};
previewRuntimeFiles.set(
  'assets/preview-v3/set.json',
  encoder.encode(canonical(previewRuntimeSet)),
);
const smoothPreviewRuntimeFiles = new Map();
const smoothPreviewRuntimeClips = {};
const smoothPreviewPresentation = structuredClone(previewPresentation);
for (const [name, contract] of [
  ['idle', { frames: 20, fps: 30, playback: 'loop' }],
  ['run', { frames: 20, fps: 32, playback: 'loop' }],
  ['attack', { frames: 15, fps: 30, playback: 'progress' }],
  ['crit', { frames: 15, fps: 30, playback: 'progress' }],
  ['sprint', { frames: 15, fps: 30, playback: 'loop' }],
  ['hit', { frames: 8, fps: 32, playback: 'progress' }],
  ['death', { frames: 15, fps: 30, playback: 'progress' }],
  ['celebrate', { frames: 15, fps: 30, playback: 'loop' }],
]) {
  const imageBytes = encoder.encode(`smooth-preview-image-${name}`);
  const imageSha256 = sha256(imageBytes);
  const descriptor = {
    grammar: MOTION_CLIP_GRAMMAR,
    authority: 'unapproved_preview',
    sourceFamily: 'authored-semantic-v3',
    assetId: 'apn-hero',
    name,
    playback: contract.playback,
    fps: contract.fps,
    sourceFps: 12,
    cadenceProfile: 'continuous_30',
    authoringMethod: 'deterministic_part_rig',
    interpolationMethod: 'deterministic_part_transforms',
    holds: contract.playback === 'progress'
      ? [{ startIndex: contract.frames - 2, endIndex: contract.frames - 1, reason: 'terminal' }]
      : [],
    markers: contract.playback === 'loop'
      ? { neutral: 0, maximum_excursion: Math.floor(contract.frames / 2), return: contract.frames - 1 }
      : { anticipation: 0, contact: Math.floor(contract.frames / 2), terminal: contract.frames - 1 },
    frames: Array.from({ length: contract.frames }, (_, index) => {
      const pose = String(
        contract.playback === 'progress' && index === contract.frames - 1
          ? contract.frames - 1
          : index + 1,
      ).padStart(64, '0');
      return {
        x: (index % 10) * 64,
        y: Math.floor(index / 10) * 96,
        width: 64,
        height: 96,
        sourceSha256: pose,
        bodyPoseSha256: pose,
      };
    }),
    atlas: {
      width: 640,
      height: Math.ceil(contract.frames / 10) * 96,
      bytes: imageBytes.byteLength,
      sha256: imageSha256,
    },
    encoder: approvedEncoder,
  };
  const descriptorBytes = encoder.encode(canonical(descriptor));
  smoothPreviewRuntimeClips[name] = {
    descriptor: `${name}.json`,
    descriptorSha256: sha256(descriptorBytes),
    image: `${name}.webp`,
    imageSha256,
  };
  smoothPreviewRuntimeFiles.set(
    `assets/preview-smooth-v3/${name}.json`,
    descriptorBytes,
  );
  smoothPreviewRuntimeFiles.set(
    `assets/preview-smooth-v3/${name}.webp`,
    imageBytes,
  );
}
const smoothPreviewRuntimeSet = {
  grammar: MOTION_SET_INDEX_GRAMMAR,
  authority: 'unapproved_preview',
  status: 'human_review_required',
  sourceFamily: 'authored-semantic-v3',
  assetId: 'apn-hero',
  role: 'hero',
  frameSize: { width: 128, height: 128 },
  trim: { x: 32, y: 32, width: 64, height: 96 },
  pivot: { x: 0.5, y: 1 },
  presentation: smoothPreviewPresentation,
  clips: smoothPreviewRuntimeClips,
  previewLineage: {
    candidateId: 'apn-hero-authored-semantic-v3',
    candidateSha256: 'a'.repeat(64),
    temporalEvidenceSha256: 'f'.repeat(64),
    qaSummarySha256: 'b'.repeat(64),
    batchSummarySha256: 'c'.repeat(64),
    sourceManifestVersion: 4,
  },
  toolchain: {
    grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
    compositor: { name: 'ImageMagick', version: '7.1.2-13' },
    encoder: approvedEncoder,
    operations: [...HERO_PREVIEW_TOOLCHAIN_OPERATIONS],
    profileSha256: HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  },
};
smoothPreviewRuntimeFiles.set(
  'assets/preview-smooth-v3/set.json',
  encoder.encode(canonical(smoothPreviewRuntimeSet)),
);
const v4HeroProfileSha256 = '4'.repeat(64);
const v4HeroConsumerScale = {
  grammar: 'gaf2d-consumer-scale-v4',
  role: 'hero',
  maximumCssBodyHeight: 96,
  maximumDpr: 2,
  displayedDevicePixels: 192,
  runtimeCanvasClass: 320,
  sourceVisiblePixels: 214,
  scaleRatio: { numerator: 192, denominator: 214 },
};
const v4HeroRuntimeFiles = new Map();
const v4HeroRuntimeClips = {};
for (const [name, record] of Object.entries(smoothPreviewRuntimeSet.clips)) {
  const descriptor = JSON.parse(
    Buffer.from(
      smoothPreviewRuntimeFiles.get(`assets/preview-smooth-v3/${name}.json`),
    ).toString('utf8'),
  );
  const imageBytes = smoothPreviewRuntimeFiles.get(
    `assets/preview-smooth-v3/${name}.webp`,
  );
  const columns = 8;
  descriptor.sourceFamily = 'authored-semantic-v4';
  descriptor.frames = descriptor.frames.map((frame, index) => ({
    ...frame,
    x: (index % columns) * 160,
    y: Math.floor(index / columns) * 280,
    width: 160,
    height: 280,
  }));
  descriptor.atlas = {
    width: columns * 160,
    height: Math.ceil(descriptor.frames.length / columns) * 280,
    bytes: imageBytes.byteLength,
    sha256: record.imageSha256,
  };
  descriptor.trim =
    name === 'death'
      ? { x: 88, y: 28, width: 144, height: 244 }
      : { x: 80, y: 20, width: 160, height: 280 };
  descriptor.frames = descriptor.frames.map((frame, index) => ({
    ...frame,
    x: (index % columns) * descriptor.trim.width,
    y: Math.floor(index / columns) * descriptor.trim.height,
    width: descriptor.trim.width,
    height: descriptor.trim.height,
  }));
  descriptor.atlas = {
    width: columns * descriptor.trim.width,
    height: Math.ceil(descriptor.frames.length / columns) * descriptor.trim.height,
    bytes: imageBytes.byteLength,
    sha256: record.imageSha256,
  };
  descriptor.pivot =
    name === 'death' ? { x: 0.46875, y: 0.95625 } : { x: 0.5, y: 1 };
  descriptor.presentation = {
    ...structuredClone(smoothPreviewRuntimeSet.presentation),
    reference: {
      clip: name,
      frameIndex: 0,
      sourceSha256: descriptor.frames[0].sourceSha256,
    },
    visibleBounds:
      name === 'death'
        ? { x: 0, y: 64, width: 144, height: 180 }
        : { x: 8, y: 8, width: 144, height: 214 },
    motionBounds:
      name === 'death'
        ? { x: 0, y: 0, width: 144, height: 244 }
        : { x: 4, y: 2, width: 152, height: 276 },
  };
  descriptor.encoder = {
    name: 'cwebp',
    version: '1.6.0',
    arguments: ['-quiet', '-exact', '-lossless', '-q', '100', '-m', '6'],
    profileSha256: v4HeroProfileSha256,
  };
  descriptor.lineage = {
    sourceBatchSha256: '1'.repeat(64),
    derivativeSetSha256: '2'.repeat(64),
    sourceDescriptorSha256: '3'.repeat(64),
    sourceEvidenceSha256: '4'.repeat(64),
    sourceMediaSha256: record.imageSha256,
    masterInventorySha256: '5'.repeat(64),
    masterSetSha256: '6'.repeat(64),
    selectedProfileSha256: v4HeroProfileSha256,
    v3LineageSha256: '7'.repeat(64),
  };
  const descriptorBytes = encoder.encode(canonical(descriptor));
  v4HeroRuntimeClips[name] = {
    descriptor: `${name}.json`,
    descriptorSha256: sha256(descriptorBytes),
    image: `${name}.webp`,
    imageSha256: record.imageSha256,
  };
  v4HeroRuntimeFiles.set(
    `assets/preview-v4/${name}.json`,
    descriptorBytes,
  );
  v4HeroRuntimeFiles.set(
    `assets/preview-v4/${name}.webp`,
    imageBytes,
  );
}
const v4HeroRuntimeSet = {
  ...structuredClone(smoothPreviewRuntimeSet),
  sourceFamily: 'authored-semantic-v4',
  frameSize: { width: 320, height: 320 },
  trim: { x: 80, y: 20, width: 160, height: 280 },
  presentation: {
    ...structuredClone(smoothPreviewRuntimeSet.presentation),
    visibleBounds: { x: 8, y: 8, width: 144, height: 214 },
    motionBounds: { x: 4, y: 2, width: 152, height: 276 },
  },
  clips: v4HeroRuntimeClips,
  consumerScale: structuredClone(v4HeroConsumerScale),
  lineage: {
    sourceBatchSha256: '1'.repeat(64),
    derivativeSetSha256: '2'.repeat(64),
    masterSetSha256: '3'.repeat(64),
    selectedProfileSha256: v4HeroProfileSha256,
    v3LineageSha256: '4'.repeat(64),
  },
  toolchain: {
    ...structuredClone(smoothPreviewRuntimeSet.toolchain),
    compositor: {
      name: 'HashBoundCopy',
      version: 'selected-webp-v1',
    },
    encoder: {
      name: 'cwebp',
      version: '1.6.0',
      arguments: ['-quiet', '-exact', '-lossless', '-q', '100', '-m', '6'],
      profileSha256: v4HeroProfileSha256,
    },
    operations: [
      'validate:v4-selected-webp:hash-bound-source',
      'validate:v4-selected-webp:exact-copy-byte-proof',
      'copy:v4-selected-webp:exact-media-bytes',
    ],
    profileSha256: v4HeroProfileSha256,
  },
};
v4HeroRuntimeFiles.set(
  'assets/preview-v4/set.json',
  encoder.encode(canonical(v4HeroRuntimeSet)),
);
assert(
  validateHeroSetManifest(previewRuntimeSet).some(
    (error) => error.includes('preview') || error.includes('status'),
  ),
  'Hero preview set is rejected without explicit validator opt-in',
);
assert(
  validateHeroSetManifest(previewRuntimeSet, {
    allowUnapprovedPreview: true,
  }).length === 0,
  'Hero preview set validates under its separate explicit authority',
);

function response(bytes) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => String(bytes.byteLength) },
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

const files = new Map([['assets/mascot/v3/set.json', setBytes]]);
for (const record of Object.values(productionSet.clips)) {
  files.set(
    `assets/mascot/v3/${record.descriptor}`,
    fs.readFileSync(path.join(heroRoot, record.descriptor)),
  );
  files.set(
    `assets/mascot/v3/${record.image}`,
    fs.readFileSync(path.join(heroRoot, record.image)),
  );
}

function createHarness({ tamperDescriptor = null, sourceFiles = files } = {}) {
  const fetches = [];
  const bitmaps = [];
  const fetchImpl = async (url) => {
    fetches.push(url);
    const clean = String(url).split('?')[0].replace(/^\.\//, '');
    let bytes = sourceFiles.get(clean);
    if (tamperDescriptor && clean.endsWith(`/${tamperDescriptor}.json`)) {
      bytes = encoder.encode('{"tampered":true}\n');
    }
    return bytes ? response(bytes) : { ok: false, status: 404 };
  };
  const decodeImage = async (_bytes, context) => {
    const atlas =
      context.status !== 'historical'
        ? {
            width: context.descriptor.atlas.width,
            height: context.descriptor.atlas.height,
          }
        : {
            width: context.descriptor.atlas.w,
            height: context.descriptor.atlas.h,
          };
    const bitmap = {
      width: atlas.width,
      height: atlas.height,
      closed: 0,
      close() {
        this.closed += 1;
      },
    };
    bitmaps.push(bitmap);
    return bitmap;
  };
  return { fetches, bitmaps, fetchImpl, decodeImage };
}

disposeHeroV3();
assert(
  typeof heroV3Runtime.resolveHeroV3Frame === 'function' &&
    typeof heroV3Runtime.warmHeroV3Clip === 'function',
  'Hero runtime exposes explicit lazy clip request and transition arbitration',
);
const first = createHarness();
await loadHeroV3('assets/mascot/v3/', {
  ...first,
  expectedSetSha256: sha256(setBytes),
});
assert(
  heroV3Ready() && heroV3AuthorityStatus() === 'historical',
  'hash-valid historical set loads without being relabelled approved',
);
assert(
  first.fetches.filter((url) => url.includes('sha256=')).length === 3 &&
    first.fetches.some((url) => url.includes('/run.json')) &&
    first.fetches.some((url) => url.includes('/run.webp')),
  'Hero boot fetches only the set and current run clip with immutable hashes',
);
assert(
  first.fetches.some((url) => url.includes('set.json') && url.includes('sha256=')),
  'Hero set request carries its immutable set hash when one is expected',
);
assert(
  !first.fetches.some((url) => url.includes('/death.json')) &&
    !first.fetches.some((url) => url.includes('/death.webp')),
  'Hero death media stays cold until the death semantic is requested',
);
const runBeforeTransition = getV3Clip('run');
drawV3Frame({ drawImage() {} }, 'run', 0, 96);
const heldRun = heroV3Runtime.resolveHeroV3Frame({
  t: 0,
  attack: 0,
  crit: false,
  recoil: 0,
  defeatT: 1,
});
assert(
  heldRun?.clip === 'run' &&
    heldRun?.requestedClip === 'death' &&
    heldRun?.warming === true,
  'cold Hero death transition retains the last authored run frame while warming',
);
await heroV3Runtime.warmHeroV3Clip('death');
const readyDeath = heroV3Runtime.resolveHeroV3Frame({
  t: 0,
  attack: 0,
  crit: false,
  recoil: 0,
  defeatT: 1,
});
assert(
  readyDeath?.clip === 'death' &&
    first.fetches.some((url) => url.includes('/death.json')) &&
    first.fetches.some((url) => url.includes('/death.webp')),
  'Hero death descriptor and image load only after the death semantic is requested',
);
drawV3Frame({ drawImage() {} }, 'death', readyDeath.frame, 96);
assert(
  getV3Clip('run') === null &&
    getV3Clip('death') !== null &&
    runBeforeTransition?.image?.closed === 1,
  'successful Hero clip replacement prunes the previous bitmap after the new frame draws',
);
const historicalIdle = JSON.parse(
  fs.readFileSync(path.join(heroRoot, 'idle.json'), 'utf8'),
);
await heroV3Runtime.warmHeroV3Clip('idle');
let drawArguments = null;
const destination = drawV3Frame(
  {
    drawImage(...arguments_) {
      drawArguments = arguments_;
    },
  },
  'idle',
  0,
  historicalIdle.trim.h,
);
assert(
  destination?.dx ===
    historicalIdle.trim.x -
      historicalIdle.frameSize * historicalIdle.anchor[0] &&
    destination?.dy ===
      historicalIdle.trim.y -
        historicalIdle.frameSize * historicalIdle.anchor[1] &&
    drawArguments?.[5] === destination.dx &&
    drawArguments?.[6] === destination.dy,
  'Hero blit reconstructs the shared full-frame bottom-center pivot after union trimming',
);

await heroV3Runtime.warmHeroV3Clip('attack');
const supersededAttack = getV3Clip('attack');
await heroV3Runtime.warmHeroV3Clip('sprint');
assert(
  getV3Clip('idle') !== null &&
    getV3Clip('attack') === null &&
    getV3Clip('sprint') !== null &&
    supersededAttack?.image?.closed === 1,
  'Hero lazy cache keeps only the last drawn clip plus one undrawn replacement',
);
drawV3Frame({ drawImage() {} }, 'sprint', 0, 96);

const replacement = createHarness();
await loadHeroV3('assets/mascot/v3/', replacement);
assert(
  first.bitmaps.length === 5 &&
    first.bitmaps.every((bitmap) => bitmap.closed === 1),
  'successful set replacement closes every resident previous bitmap exactly once',
);

const failed = createHarness({ tamperDescriptor: 'run' });
await loadHeroV3('assets/mascot/v3/', failed).then(
  () => {
    throw new Error('tampered descriptor unexpectedly loaded');
  },
  () => {},
);
assert(
  heroV3Ready() && heroV3AuthorityStatus() === 'historical',
  'failed replacement keeps the previous complete Hero set active',
);
assert(
  !failed.fetches.some((url) => url.includes('/run.webp')),
  'descriptor hash failure blocks the matching image fetch and decode',
);
assert(
  failed.bitmaps.every((bitmap) => bitmap.closed === 1),
  'failed multi-clip load closes every partial bitmap',
);

const approved = createHarness({ sourceFiles: approvedRuntimeFiles });
await loadHeroV3('assets/approved-v3/', approved);
assert(
  heroV3AuthorityStatus() === 'approved' &&
    replacement.bitmaps.every((bitmap) => bitmap.closed === 1),
  'approved lazy replacement becomes authoritative and releases the historical set',
);
await heroV3Runtime.warmHeroV3Clip('idle');
let approvedDrawArguments = null;
const approvedDestination = drawV3Frame(
  {
    drawImage(...arguments_) {
      approvedDrawArguments = arguments_;
    },
  },
  'idle',
  0,
  96,
);
assert(
  approvedDestination?.dx === -32 &&
    approvedDestination?.dy === -96 &&
    approvedDrawArguments?.[5] === -32 &&
    approvedDrawArguments?.[6] === -96,
  'approved width/height descriptors reconstruct the same full-frame pivot contract',
);

const previewWithoutOptIn = createHarness({
  sourceFiles: previewRuntimeFiles,
});
await loadHeroV3('assets/preview-v3/', previewWithoutOptIn).then(
  () => {
    throw new Error('preview Hero unexpectedly loaded without opt-in');
  },
  () => {},
);
assert(
  heroV3AuthorityStatus() === 'approved',
  'rejected preview Hero cannot replace the active approved set',
);

const preview = createHarness({ sourceFiles: previewRuntimeFiles });
await loadHeroV3('assets/preview-v3/', {
  ...preview,
  allowUnapprovedPreview: true,
});
assert(
  heroV3AuthorityStatus() === 'preview',
  'Hero preview becomes active only through the explicit loader opt-in',
);
const swappedSetFiles = new Map(approvedRuntimeFiles);
swappedSetFiles.set(
  'assets/approved-v3/set.json',
  previewRuntimeFiles.get('assets/preview-v3/set.json'),
);
const swappedSet = createHarness({ sourceFiles: swappedSetFiles });
await loadHeroV3('assets/approved-v3/', {
  ...swappedSet,
  expectedSetSha256: sha256(
    approvedRuntimeFiles.get('assets/approved-v3/set.json'),
  ),
}).then(
  () => {
    throw new Error('swapped set unexpectedly loaded');
  },
  () => {},
);
assert(
  heroV3AuthorityStatus() === 'preview',
  'a swapped but otherwise valid Hero set cannot replace the active set when the expected hash is bound',
);
const presentation = getV3Presentation();
assert(
  presentation?.visibleBounds.height > 0 &&
    presentation?.motionBounds.height >= presentation.visibleBounds.height,
  'Hero runtime retains one validated presentation record',
);
const previewRuntimeGeometry = heroV3Runtime.getV3Geometry();
const geometry = resolveActorGeometry({
  actorX: 120,
  groundY: 300,
  fit: 1,
  role: 'hero',
  frameSize: previewRuntimeGeometry.frameSize,
  trim: {
    x: previewRuntimeGeometry.trim.x,
    y: previewRuntimeGeometry.trim.y,
    width: previewRuntimeGeometry.trim.w,
    height: previewRuntimeGeometry.trim.h,
  },
  pivot: { x: 0.5, y: 1 },
  presentation,
});
assert(geometry.body.height === 96, 'Hero visible body resolves to 96 px');
assert(geometry.body.bottom === 294, 'Hero keeps the approved 6 px hover');
const rendererPreview = createHarness({ sourceFiles: previewRuntimeFiles });
await versionedHeroV3.loadHeroV3('assets/preview-v3/', {
  ...rendererPreview,
  allowUnapprovedPreview: true,
});
const authoredDrawOptions = renderRuntime.heroDrawOptions?.(120, 300, 1);
assert(
  authoredDrawOptions?.drawTrimHeight === geometry.drawTrimHeight &&
    authoredDrawOptions?.pivotY === geometry.pivotY &&
    authoredDrawOptions?.geometry.body.height === 96 &&
    authoredDrawOptions?.geometry.body.bottom === 294,
  'renderer passes authored trim height, pivot, and resolved Hero geometry together',
);
const smoothPreview = createHarness({ sourceFiles: smoothPreviewRuntimeFiles });
await loadHeroV3('assets/preview-smooth-v3/', {
  ...smoothPreview,
  allowUnapprovedPreview: true,
  sourceFamily: 'authored-semantic-v3',
});
assert(
  heroV3AuthorityStatus() === 'human_review_required' &&
    getV3Clip('run')?.frameSize?.width === 128 &&
    getV3Presentation()?.visibleBounds?.height === smoothPreviewPresentation.visibleBounds.height,
  'generic Hero V3 preview loads through the authored-semantic-v3 runtime path',
);
const v4Hero = createHarness({ sourceFiles: v4HeroRuntimeFiles });
const v4HeroSetBytes = v4HeroRuntimeFiles.get('assets/preview-v4/set.json');
await loadHeroV3('assets/preview-v4/', {
  ...v4Hero,
  allowUnapprovedPreview: true,
  sourceFamily: 'authored-semantic-v4',
  expectedSetSha256: sha256(v4HeroSetBytes),
  consumerScale: structuredClone(v4HeroConsumerScale),
  selectedProfileSha256: v4HeroProfileSha256,
});
const residentV4Run = getV3Clip('run');
const runGeometry = resolveActorGeometry({
  actorX: 120,
  groundY: 300,
  fit: 1,
  role: 'hero',
  frameSize: { width: residentV4Run.frameSize.width, height: residentV4Run.frameSize.height },
  trim: {
    x: residentV4Run.trim.x,
    y: residentV4Run.trim.y,
    width: residentV4Run.trim.w,
    height: residentV4Run.trim.h,
  },
  pivot: { x: residentV4Run.anchor[0], y: residentV4Run.anchor[1] },
  presentation: residentV4Run.presentation,
});
drawV3Frame(
  { drawImage() {} },
  'run',
  0,
  runGeometry.drawTrimHeight,
);
assert(
  heroV3AuthorityStatus() === 'human_review_required' &&
    residentV4Run?.frameSize?.width === 320 &&
    residentV4Run?.trim?.w === 160 &&
    getV3Presentation()?.visibleBounds?.height === 214 &&
    getV3Presentation()?.reference?.clip === 'idle' &&
    residentV4Run?.presentation?.reference?.clip === 'run' &&
    v4Hero.fetches.filter((url) => url.includes('sha256=')).length === 3 &&
    v4Hero.fetches.some((url) => url.includes('/run.json')) &&
    v4Hero.fetches.some((url) => url.includes('/run.webp')) &&
    !v4Hero.fetches.some((url) => url.includes('/death.')) &&
    renderRuntime.heroDrawOptions?.(120, 300, 1).geometry.body.height === runGeometry.body.height,
  'Hero V4 activation keeps neutral set presentation for stage fit, clip presentation for draw, and fetches only the selected run clip',
);
await heroV3Runtime.warmHeroV3Clip('death');
const v4DeathState = {
  run: {
    hero: {
      attackAnim: 0,
      attackCrit: false,
      energy: 100,
      deepOn: true,
      trackerOn: true,
      trackerStacks: 1,
      hitRecoil: 0,
      levelT: 0,
      defeatT: 1,
      lootT: 0,
    },
  },
  world: { sprinting: false },
  stats: { combo: 0, comboT: 0 },
  settings: { reducedMotion: false },
};
const deathContext = {
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  scale() {},
  beginPath() {},
  closePath() {},
  lineTo() {},
  arcTo() {},
  arc() {},
  ellipse() {},
  fill() {},
  stroke() {},
  drawImage() {},
  createLinearGradient() {
    return { addColorStop() {} };
  },
  createRadialGradient() {
    return { addColorStop() {} };
  },
  moveTo() {},
  fillText() {},
};
const drawnV4DeathGeometry = renderRuntime.drawHero?.(
  deathContext,
  120,
  300,
  v4DeathState,
  0.25,
  1,
);
const selectedV4DeathGeometry = renderRuntime.heroDrawOptions?.(
  120,
  300,
  1,
  { clip: 'death' },
)?.geometry;
assert(
  drawnV4DeathGeometry?.motionEnvelope?.top ===
    selectedV4DeathGeometry?.motionEnvelope?.top &&
    drawnV4DeathGeometry?.motionEnvelope?.top !== runGeometry.motionEnvelope.top,
  'Hero V4 render resolves clip-owned retained geometry from the selected death clip before draw',
);
const driftedV4Hero = createHarness({ sourceFiles: v4HeroRuntimeFiles });
await loadHeroV3('assets/preview-v4/', {
  ...driftedV4Hero,
  allowUnapprovedPreview: true,
  sourceFamily: 'authored-semantic-v4',
  expectedSetSha256: sha256(v4HeroSetBytes),
  consumerScale: structuredClone(v4HeroConsumerScale),
  selectedProfileSha256: '5'.repeat(64),
}).then(
  () => {
    throw new Error('profile-drifted V4 Hero unexpectedly loaded');
  },
  () => {},
);
assert(
  getV3Clip('run') === residentV4Run &&
    driftedV4Hero.fetches.length === 1 &&
    driftedV4Hero.bitmaps.length === 0,
  'Hero V4 profile drift fails closed before clip fetch/decode and retains the active frame set',
);
await loadHeroV3('assets/preview-v3/', {
  ...preview,
  allowUnapprovedPreview: true,
});
const overlayCalls = {
  gradients: [],
  moves: [],
  text: [],
};
const overlayGradient = { addColorStop() {} };
const overlayContext = {
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  scale() {},
  beginPath() {},
  closePath() {},
  lineTo() {},
  arcTo() {},
  arc() {},
  ellipse() {},
  fill() {},
  stroke() {},
  drawImage() {},
  createLinearGradient() {
    return overlayGradient;
  },
  createRadialGradient(...arguments_) {
    overlayCalls.gradients.push(arguments_);
    return overlayGradient;
  },
  moveTo(...arguments_) {
    overlayCalls.moves.push(arguments_);
  },
  fillText(...arguments_) {
    overlayCalls.text.push(arguments_);
  },
};
const overlayState = {
  run: {
    hero: {
      attackAnim: 0,
      attackCrit: false,
      energy: 100,
      deepOn: true,
      trackerOn: true,
      trackerStacks: 1,
      hitRecoil: 0,
      levelT: 0,
      defeatT: 0,
      lootT: 0,
    },
  },
  world: { sprinting: false },
  stats: { combo: 3, comboT: 1 },
  settings: { reducedMotion: false },
};
const drawnGeometry = renderRuntime.drawHero?.(
  overlayContext,
  120,
  300,
  overlayState,
  0.25,
  1,
);
assert(
  drawnGeometry?.body.height === authoredDrawOptions.geometry.body.height &&
    drawnGeometry?.body.bottom === authoredDrawOptions.geometry.body.bottom &&
    overlayCalls.gradients[0]?.[0] === drawnGeometry.anchors.auraX &&
    overlayCalls.gradients[0]?.[1] === drawnGeometry.anchors.auraY &&
    overlayCalls.moves.some(
      ([x, y]) =>
        x === drawnGeometry.body.centerX &&
        y === drawnGeometry.motionEnvelope.top - 4,
    ) &&
    overlayCalls.text.some(
      ([text, x, y]) =>
        text === '3×' &&
        x === drawnGeometry.body.centerX &&
        y === drawnGeometry.anchors.floaterY + 1,
    ),
  'Hero aura, crown, and combo overlay positions consume the resolved geometry',
);

function modernSetWithClipMutation(sourceFiles, base, clipName, mutate) {
  const mutated = new Map(sourceFiles);
  const descriptorPath = `${base}/${clipName}.json`;
  const setPath = `${base}/set.json`;
  const descriptor = JSON.parse(
    Buffer.from(mutated.get(descriptorPath)).toString('utf8'),
  );
  mutate(descriptor);
  const descriptorBytes = encoder.encode(canonical(descriptor));
  const set = JSON.parse(Buffer.from(mutated.get(setPath)).toString('utf8'));
  set.clips[clipName].descriptorSha256 = sha256(descriptorBytes);
  mutated.set(descriptorPath, descriptorBytes);
  mutated.set(setPath, encoder.encode(canonical(set)));
  return mutated;
}

for (const testCase of [
  {
    label: 'full-frame size',
    base: 'assets/preview-v3',
    sourceFiles: previewRuntimeFiles,
    mutate(descriptor) {
      descriptor.frameSize.width += 1;
    },
  },
  {
    label: 'shared trim',
    base: 'assets/preview-v3',
    sourceFiles: previewRuntimeFiles,
    mutate(descriptor) {
      descriptor.trim.x -= 1;
    },
  },
  {
    label: 'pivot',
    base: 'assets/preview-v3',
    sourceFiles: previewRuntimeFiles,
    mutate(descriptor) {
      descriptor.anchor = [0.5, 0.99];
    },
  },
  {
    label: 'presentation',
    base: 'assets/preview-v3',
    sourceFiles: previewRuntimeFiles,
    mutate(descriptor) {
      descriptor.presentation.visibleBounds.x += 1;
    },
  },
  {
    label: 'approved full-frame size',
    base: 'assets/approved-v3',
    sourceFiles: approvedRuntimeFiles,
    mutate(descriptor) {
      descriptor.frameSize.width += 1;
    },
  },
]) {
  const mismatchedFiles = modernSetWithClipMutation(
    testCase.sourceFiles,
    testCase.base,
    'run',
    testCase.mutate,
  );
  const mismatched = createHarness({ sourceFiles: mismatchedFiles });
  let rejected = false;
  await loadHeroV3(`${testCase.base}/`, {
    ...mismatched,
    allowUnapprovedPreview: testCase.base.includes('preview'),
    initialClip: 'idle',
  });
  await heroV3Runtime.warmHeroV3Clip('run').then(
    () => {},
    () => {
      rejected = true;
    },
  );
  assert(
    rejected &&
      heroV3AuthorityStatus() ===
        (testCase.base.includes('approved') ? 'approved' : 'preview') &&
      mismatched.bitmaps[0]?.closed === 0 &&
      mismatched.bitmaps.slice(1).every((bitmap) => bitmap.closed === 1),
    `modern Hero set rejects clip-local ${testCase.label} drift`,
  );
}

disposeHeroV3();
versionedHeroV3.disposeHeroV3();
const legacyDrawOptions = renderRuntime.heroDrawOptions?.(120, 300, 1);
assert(
  preview.bitmaps.every((bitmap) => bitmap.closed === 1) &&
    rendererPreview.bitmaps.every((bitmap) => bitmap.closed === 1) &&
    !heroV3Ready() &&
    heroV3AuthorityStatus() === null,
  'explicit disposal closes the active set and clears its authority status',
);
assert(
  legacyDrawOptions?.drawTrimHeight === 96 &&
    legacyDrawOptions?.pivotY === 294 &&
    legacyDrawOptions?.geometry.body.height === 96 &&
    legacyDrawOptions?.geometry.body.bottom === 294,
  'renderer safe fallback uses one explicit legacy Hero geometry adapter',
);

assert(
  canonical(productionSet) === setBytes.toString('utf8'),
  'production Hero set uses canonical stable JSON bytes',
);

console.log('HERO V3 RUNTIME PASS');
