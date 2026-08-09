import crypto from 'node:crypto';
import fs from 'node:fs';

import {
  isMotionPreviewRequested,
  loadMotionPreview,
} from '../js/motion-preview.js';
import {
  MOTION_CLIP_GRAMMAR,
  MOTION_SET_INDEX_GRAMMAR,
} from '../js/motion-bundle.js';
import {
  HERO_CLIP_CONTRACT,
  HERO_PREVIEW_CLIP_GRAMMAR,
  HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  HERO_PREVIEW_SET_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_OPERATIONS,
  MAX_HERO_IMAGE_BYTES,
} from '../js/hero-v3-contract.js';
import { GAME_PACKS } from '../js/generated/game-packs.js';

const encoder = new TextEncoder();
const sha256 = (bytes) =>
  crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const canonical = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const assert = (condition, message) => {
  if (!condition) throw new Error(`Motion preview: ${message}`);
  console.log(`OK ${message}`);
};
const loopback = (search = '?motion-preview=1') => ({
  hostname: '127.0.0.1',
  search,
});
const COMMON_RUNTIME_MEDIA_MAX_BYTES = 6 * 1024 * 1024;

assert(
  isMotionPreviewRequested(loopback()),
  '127.0.0.1 plus the exact query flag activates preview intent',
);
assert(
  isMotionPreviewRequested({
    hostname: 'localhost',
    search: '?motion-preview=1',
  }),
  'localhost plus the exact query flag activates preview intent',
);
for (const locationLike of [
  { hostname: '127.0.0.1', search: '?motion-preview=0' },
  { hostname: '127.0.0.1', search: '?motion-preview=true' },
  { hostname: '127.0.0.2', search: '?motion-preview=1' },
  { hostname: 'example.com', search: '?motion-preview=1' },
]) {
  assert(
    !isMotionPreviewRequested(locationLike),
    `preview intent rejects ${locationLike.hostname}${locationLike.search}`,
  );
}

const candidateFacts = (
  assetId,
  manifestVersion,
  sourceFamily = 'authored-semantic-v2',
  extra = {},
) => ({
  assetManifestSha256: '1'.repeat(64),
  candidateId: `${assetId}-${sourceFamily}`,
  candidateSha256: crypto
    .createHash('sha256')
    .update(`candidate:${assetId}:${sourceFamily}`)
    .digest('hex'),
  clipManifestSha256: '2'.repeat(64),
  frameHashesSha256: '3'.repeat(64),
  identitySha256: '4'.repeat(64),
  qaSummarySha256: crypto
    .createHash('sha256')
    .update(`qa:${assetId}`)
    .digest('hex'),
  reviewEvidenceSha256: '5'.repeat(64),
  reviewHtmlSha256: '6'.repeat(64),
  sourceManifestVersion: manifestVersion,
  ...extra,
});
const transform = {
  scalePpm: 500000,
  sourceFrameSize: { width: 640, height: 640 },
  sourceTrim: { x: 100, y: 80, width: 300, height: 400 },
  runtimeFrameSize: { width: 320, height: 320 },
  runtimeTrim: { x: 50, y: 40, width: 150, height: 200 },
};
const smoothHeroTransform = {
  scalePpm: 1_000_000,
  sourceFrameSize: { width: 128, height: 128 },
  sourceTrim: { x: 32, y: 16, width: 64, height: 96 },
  runtimeFrameSize: { width: 128, height: 128 },
  runtimeTrim: { x: 32, y: 16, width: 64, height: 96 },
};
const smoothCharacterTransform = {
  scalePpm: 1_000_000,
  sourceFrameSize: { width: 128, height: 128 },
  sourceTrim: { x: 16, y: 8, width: 96, height: 112 },
  runtimeFrameSize: { width: 128, height: 128 },
  runtimeTrim: { x: 16, y: 8, width: 96, height: 112 },
};
const encoderFacts = {
  name: 'cwebp',
  version: '1.6.0',
  arguments: ['-exact', '-q', '90'],
};
const files = new Map();
const put = (url, value) => {
  const bytes = Buffer.isBuffer(value) ? value : canonical(value);
  files.set(url, bytes);
  return { bytes, sha256: sha256(bytes) };
};

const creatureSpecs = [
  ['entry-runner', 'character'],
  ['protocol-courier', 'character'],
  ['signal-hunter', 'character'],
  ['site-sentinel', 'character'],
  ['site-warden', 'boss'],
  ['veil-operator', 'character'],
];
const sourceAssets = Object.fromEntries([
  ['apn-hero', candidateFacts('apn-hero', 2)],
  ...creatureSpecs.map(([assetId]) => [
    assetId,
    candidateFacts(assetId, 3),
  ]),
]);
const batchSummarySha256 = '7'.repeat(64);
const creaturePresentation = {
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
const heroPresentation = {
  schemaVersion: 1,
  scaleContract: 'visible-body',
  reference: {
    clip: 'idle',
    frameIndex: 0,
    sourceSha256: 'e'.repeat(64),
  },
  visibleBounds: { x: 8, y: 4, width: 48, height: 88 },
  motionBounds: { x: 2, y: 1, width: 60, height: 95 },
};

const validMotion = JSON.parse(
  fs.readFileSync(
    new URL('./fixtures/motion-bundle/valid.json', import.meta.url),
    'utf8',
  ),
);
const characters = {};
for (const [assetId, role] of creatureSpecs) {
  const descriptor = structuredClone(validMotion);
  descriptor.grammar = 'gaf2d-motion-preview-v1';
  descriptor.authority = 'unapproved_preview';
  descriptor.assetId = assetId;
  descriptor.presentation = structuredClone(creaturePresentation);
  descriptor.previewLineage = {
    candidateId: sourceAssets[assetId].candidateId,
    candidateSha256: sourceAssets[assetId].candidateSha256,
    qaSummarySha256: sourceAssets[assetId].qaSummarySha256,
    batchSummarySha256,
    sourceManifestVersion: sourceAssets[assetId].sourceManifestVersion,
  };
  delete descriptor.lineage;
  if (role === 'boss') {
    descriptor.atlas.height = 672;
    descriptor.clips.broken = {
      playback: 'loop',
      fps: 8,
      frames: Array.from({ length: 8 }, (_, index) => ({
        x: index * 96,
        y: 560,
        width: 96,
        height: 112,
      })),
    };
  }
  const descriptorPath =
    `.gaf2d-preview/characters/${assetId}/motion.json`;
  const imagePath =
    `.gaf2d-preview/characters/${assetId}/motion.webp`;
  const imageRecord = put(
    imagePath,
    Buffer.from(`synthetic preview media fixture:${assetId}`),
  );
  descriptor.atlas.sha256 = imageRecord.sha256;
  const descriptorRecord = put(descriptorPath, descriptor);
  characters[assetId] = {
    authority: 'unapproved_preview',
    role,
    descriptor: descriptorPath,
    descriptorSha256: descriptorRecord.sha256,
    image: imagePath,
    imageSha256: descriptor.atlas.sha256,
    transform,
  };
}

const heroLineage = {
  candidateId: sourceAssets['apn-hero'].candidateId,
  candidateSha256: sourceAssets['apn-hero'].candidateSha256,
  qaSummarySha256: sourceAssets['apn-hero'].qaSummarySha256,
  batchSummarySha256,
  sourceManifestVersion: 2,
};
const heroSetClips = {};
const heroManifestClips = {};
for (const [name, contract] of Object.entries(HERO_CLIP_CONTRACT)) {
  const imagePath = `.gaf2d-preview/hero/${name}.webp`;
  const imageRecord = put(
    imagePath,
    Buffer.from(`synthetic preview media fixture:apn-hero:${name}`),
  );
  const imageSha256 = imageRecord.sha256;
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
      bytes: 1024,
      sha256: imageSha256,
    },
    presentation: structuredClone(heroPresentation),
    previewLineage: heroLineage,
    encoder: encoderFacts,
  };
  const descriptorPath = `.gaf2d-preview/hero/${name}.json`;
  const descriptorRecord = put(descriptorPath, descriptor);
  heroSetClips[name] = {
    descriptor: `${name}.json`,
    descriptorSha256: descriptorRecord.sha256,
    image: `${name}.webp`,
    imageSha256,
  };
  heroManifestClips[name] = {
    descriptor: descriptorPath,
    descriptorSha256: descriptorRecord.sha256,
    image: imagePath,
    imageSha256,
  };
}
const heroSet = {
  grammar: HERO_PREVIEW_SET_GRAMMAR,
  status: 'preview',
  authority: 'unapproved_preview',
  clips: heroSetClips,
  previewLineage: heroLineage,
  toolchain: {
    grammar: HERO_PREVIEW_TOOLCHAIN_GRAMMAR,
    compositor: { name: 'ImageMagick', version: '7.1.2-13' },
    encoder: encoderFacts,
    operations: [...HERO_PREVIEW_TOOLCHAIN_OPERATIONS],
    profileSha256: HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  },
};
const heroSetRecord = put('.gaf2d-preview/hero/set.json', heroSet);
const manifest = {
  grammar: 'apn-gaf2d-motion-preview-manifest-v1',
  authority: 'unapproved_preview',
  status: 'human_review_required',
  sourceFamily: 'authored-semantic-v2',
  packId: 'valorant',
  counts: { assets: 7, clips: 39, frames: 276 },
  source: {
    batchSummarySha256,
    contract: 'apn-offline-authored-motion-v1',
    mechanicalQa: 'passed',
    creativeApproval: 'human_required',
    networkCalls: 0,
    providerCalls: 0,
    providerClipCount: 0,
  },
  assets: sourceAssets,
  hero: {
    authority: 'unapproved_preview',
    assetId: 'apn-hero',
    basePath: '.gaf2d-preview/hero/',
    set: '.gaf2d-preview/hero/set.json',
    setSha256: heroSetRecord.sha256,
    clips: heroManifestClips,
    transform,
  },
  characters,
  toolchain: {
    grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
    compositor: { name: 'ImageMagick', version: '7.1.2-13' },
    encoder: encoderFacts,
    operations: [...HERO_PREVIEW_TOOLCHAIN_OPERATIONS],
    profileSha256: HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  },
};
put('.gaf2d-preview/manifest.json', manifest);

const fetchCalls = [];
const fetchImpl = async (url) => {
  const clean = String(url).split('?')[0].replace(/^\.\//, '');
  fetchCalls.push(clean);
  const bytes = files.get(clean);
  if (!bytes) return { ok: false, status: 404 };
  return {
    ok: true,
    status: 200,
    headers: { get: () => String(bytes.byteLength) },
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
};
const hashBytes = async (bytes) => sha256(bytes);

const normal = await loadMotionPreview({
  locationLike: loopback(''),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
assert(
  normal.requested === false &&
    normal.active === false &&
    normal.packs === GAME_PACKS &&
    fetchCalls.length === 0,
  'normal mode preserves the exact production catalog and performs no preview fetch',
);

const productionProjection = JSON.stringify(GAME_PACKS);
const active = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
const previewValorant = active.packs.find((pack) => pack.id === 'valorant');
assert(
  active.requested === true &&
    active.active === true &&
    active.authority === 'unapproved_preview' &&
    active.manifestSha256 === sha256(files.get('.gaf2d-preview/manifest.json')) &&
    active.heroBasePath === '.gaf2d-preview/hero/',
  'valid complete boundary activates the explicit preview authority',
);
assert(
  previewValorant !== GAME_PACKS.find((pack) => pack.id === 'valorant') &&
    Object.keys(previewValorant.motion.characters).length === 6 &&
    Object.values(previewValorant.motion.characters).every(
      (record) => record.authority === 'unapproved_preview',
    ),
  'overlay clones only the Valorant motion map with six preview-owned records',
);
assert(
  JSON.stringify(GAME_PACKS) === productionProjection,
  'runtime overlay never mutates the frozen production pack catalog',
);
const mediaPreflightFailures = [];
const checkMediaPreflight = (condition, message) => {
  if (!condition) {
    mediaPreflightFailures.push(message);
    return;
  }
  console.log(`OK ${message}`);
};
checkMediaPreflight(
  fetchCalls.length === 1 + 1 + 8 + 8 + 6 + 6,
  'activation verifies the manifest, every descriptor, and all fourteen referenced WebP files',
);

let concurrentMediaReads = 0;
let maximumConcurrentMediaReads = 0;
const latencyFetchImpl = async (url) => {
  const clean = String(url).split('?')[0].replace(/^\.\//, '');
  const bytes = files.get(clean);
  if (!bytes) return { ok: false, status: 404 };
  return {
    ok: true,
    status: 200,
    headers: { get: () => String(bytes.byteLength) },
    arrayBuffer: async () => {
      const isMedia = clean.endsWith('.webp');
      if (isMedia) {
        concurrentMediaReads += 1;
        maximumConcurrentMediaReads = Math.max(
          maximumConcurrentMediaReads,
          concurrentMediaReads,
        );
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      try {
        return bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        );
      } finally {
        if (isMedia) concurrentMediaReads -= 1;
      }
    },
  };
};
const sequentialMediaPreflight = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl: latencyFetchImpl,
  hashBytes,
});
checkMediaPreflight(
  sequentialMediaPreflight.active === true &&
    maximumConcurrentMediaReads === 1,
  'media bodies are preflighted sequentially to bound transient memory',
);

const originalEntryBytes = files.get(
  '.gaf2d-preview/characters/entry-runner/motion.json',
);
files.set(
  '.gaf2d-preview/characters/entry-runner/motion.json',
  encoder.encode('{"tampered":true}\n'),
);
const failed = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
assert(
  failed.requested === true &&
    failed.active === false &&
    failed.packs === GAME_PACKS &&
    failed.heroBasePath === 'assets/mascot/v3/' &&
    failed.error.includes('entry-runner'),
  'one stale descriptor fails the entire preview closed to production-safe assets',
);
files.set(
  '.gaf2d-preview/characters/entry-runner/motion.json',
  originalEntryBytes,
);

const productionSafeFallback = (result) =>
  result.requested === true &&
  result.active === false &&
  result.authority === null &&
  result.packs === GAME_PACKS &&
  result.heroBasePath === 'assets/mascot/v3/' &&
  result.manifest === null &&
  result.batchSummarySha256 === null;

const heroRunImagePath = '.gaf2d-preview/hero/run.webp';
const originalHeroRunImage = files.get(heroRunImagePath);
files.set(
  heroRunImagePath,
  encoder.encode('corrupted synthetic Hero preview media'),
);
const corruptedHeroMedia = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
checkMediaPreflight(
  productionSafeFallback(corruptedHeroMedia) &&
    corruptedHeroMedia.error?.includes(
      'APN Hero/run preview image SHA-256 mismatch',
    ) &&
    !corruptedHeroMedia.error.includes('/Users/'),
  'one corrupted Hero WebP blocks preview activation without exposing a private path',
);
files.set(heroRunImagePath, originalHeroRunImage);

files.set(
  heroRunImagePath,
  Buffer.alloc(MAX_HERO_IMAGE_BYTES + 1, 0x68),
);
const oversizedHeroMedia = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
checkMediaPreflight(
  productionSafeFallback(oversizedHeroMedia) &&
    oversizedHeroMedia.error?.includes(
      `APN Hero/run preview image exceeds ${MAX_HERO_IMAGE_BYTES} bytes`,
    ),
  'one oversized Hero WebP is rejected at the Hero runtime safety cap',
);
files.set(heroRunImagePath, originalHeroRunImage);

const wardenImagePath =
  '.gaf2d-preview/characters/site-warden/motion.webp';
const originalWardenImage = files.get(wardenImagePath);
files.delete(wardenImagePath);
const missingCreatureMedia = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
checkMediaPreflight(
  productionSafeFallback(missingCreatureMedia) &&
    missingCreatureMedia.error?.includes(
      'site-warden preview image fetch failed with status 404',
    ) &&
    !missingCreatureMedia.error.includes('/Users/'),
  'one missing creature WebP blocks preview activation without exposing a private path',
);
files.set(wardenImagePath, originalWardenImage);

const entryImagePath =
  '.gaf2d-preview/characters/entry-runner/motion.webp';
const originalEntryImage = files.get(entryImagePath);
files.set(
  entryImagePath,
  Buffer.alloc(COMMON_RUNTIME_MEDIA_MAX_BYTES + 1, 0x65),
);
const oversizedCommonMedia = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
checkMediaPreflight(
  productionSafeFallback(oversizedCommonMedia) &&
    oversizedCommonMedia.error?.includes(
      `entry-runner preview image exceeds ${COMMON_RUNTIME_MEDIA_MAX_BYTES} bytes`,
    ),
  'one oversized common creature WebP is rejected at its decoded runtime safety cap',
);
files.set(entryImagePath, originalEntryImage);

assert(
  mediaPreflightFailures.length === 0,
  `all referenced preview media pass fail-closed preflight (${mediaPreflightFailures.join('; ')})`,
);

const smoothSourceAssets = Object.fromEntries([
  ['apn-hero', candidateFacts('apn-hero', 4, 'authored-semantic-v3', {
    actingContractSha256: '8'.repeat(64),
    temporalEvidenceSha256: '9'.repeat(64),
  })],
  ...creatureSpecs.map(([assetId]) => [
    assetId,
    candidateFacts(assetId, 4, 'authored-semantic-v3', {
      actingContractSha256: '8'.repeat(64),
      temporalEvidenceSha256: '9'.repeat(64),
    }),
  ]),
]);
const smoothHeroSetClips = {};
const smoothHeroManifestClips = {};
const smoothHeroSet = {
  grammar: MOTION_SET_INDEX_GRAMMAR,
  authority: 'unapproved_preview',
  status: 'human_review_required',
  sourceFamily: 'authored-semantic-v3',
  assetId: 'apn-hero',
  role: 'hero',
  frameSize: { width: 128, height: 128 },
  trim: { x: 32, y: 16, width: 64, height: 96 },
  pivot: { x: 0.5, y: 1 },
  presentation: structuredClone(heroPresentation),
  clips: smoothHeroSetClips,
  previewLineage: {
    candidateId: smoothSourceAssets['apn-hero'].candidateId,
    candidateSha256: smoothSourceAssets['apn-hero'].candidateSha256,
    temporalEvidenceSha256: smoothSourceAssets['apn-hero'].temporalEvidenceSha256,
    qaSummarySha256: smoothSourceAssets['apn-hero'].qaSummarySha256,
    batchSummarySha256,
    sourceManifestVersion: smoothSourceAssets['apn-hero'].sourceManifestVersion,
  },
  toolchain: {
    grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
    compositor: { name: 'ImageMagick', version: '7.1.2-13' },
    encoder: encoderFacts,
    operations: [...HERO_PREVIEW_TOOLCHAIN_OPERATIONS],
    profileSha256: HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  },
};
for (const [clipName, contract] of Object.entries({
  idle: { frames: 20, fps: 30, playback: 'loop' },
  run: { frames: 20, fps: 32, playback: 'loop' },
  attack: { frames: 15, fps: 30, playback: 'progress' },
  crit: { frames: 15, fps: 30, playback: 'progress' },
  sprint: { frames: 15, fps: 30, playback: 'loop' },
  hit: { frames: 8, fps: 32, playback: 'progress' },
  death: { frames: 15, fps: 30, playback: 'progress' },
  celebrate: { frames: 15, fps: 30, playback: 'loop' },
})) {
  const imagePath = `.gaf2d-preview/hero/${clipName}.webp`;
  const imageRecord = put(
    imagePath,
    Buffer.from(`synthetic smooth preview media fixture:apn-hero:${clipName}`),
  );
  const descriptor = {
    grammar: MOTION_CLIP_GRAMMAR,
    authority: 'unapproved_preview',
    sourceFamily: 'authored-semantic-v3',
    assetId: 'apn-hero',
    name: clipName,
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
      bytes: imageRecord.bytes.byteLength,
      sha256: imageRecord.sha256,
    },
    encoder: encoderFacts,
  };
  const descriptorPath = `.gaf2d-preview/hero/${clipName}.json`;
  const descriptorRecord = put(descriptorPath, descriptor);
  smoothHeroSetClips[clipName] = {
    descriptor: `${clipName}.json`,
    descriptorSha256: descriptorRecord.sha256,
    image: `${clipName}.webp`,
    imageSha256: imageRecord.sha256,
  };
  smoothHeroManifestClips[clipName] = {
    descriptor: descriptorPath,
    descriptorSha256: descriptorRecord.sha256,
    image: imagePath,
    imageSha256: imageRecord.sha256,
  };
}
const smoothHeroSetPath = '.gaf2d-preview/hero/set.json';
const smoothHeroSetRecord = put(smoothHeroSetPath, smoothHeroSet);
const smoothCharacters = {};
for (const [assetId, role] of creatureSpecs) {
  const clipContracts =
    role === 'boss'
      ? {
          idle: [30, 30, 'loop'],
          advance: [24, 30, 'loop'],
          engaged: [15, 30, 'loop'],
          hit: [8, 32, 'progress'],
          death: [30, 30, 'progress'],
          broken: [30, 30, 'loop'],
        }
      : {
          idle: [30, 30, 'loop'],
          advance: [24, 30, 'loop'],
          engaged: [15, 30, 'loop'],
          hit: [8, 32, 'progress'],
          death: [30, 30, 'progress'],
        };
  const setClips = {};
  const manifestClips = {};
  for (const [clipName, [count, fps, playback]] of Object.entries(clipContracts)) {
    const imagePath = `.gaf2d-preview/characters/${assetId}/${clipName}.webp`;
    const imageRecord = put(
      imagePath,
      Buffer.from(`synthetic smooth preview media fixture:${assetId}:${clipName}`),
    );
    const descriptor = {
      grammar: MOTION_CLIP_GRAMMAR,
      authority: 'unapproved_preview',
      sourceFamily: 'authored-semantic-v3',
      assetId,
      name: clipName,
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
      frames: Array.from({ length: count }, (_, index) => {
        const pose = String(
          playback === 'progress' && index === count - 1
            ? count - 1
            : index + 1,
        ).padStart(64, '0');
        return {
          x: (index % 10) * 96,
          y: Math.floor(index / 10) * 112,
          width: 96,
          height: 112,
          sourceSha256: pose,
          bodyPoseSha256: pose,
        };
      }),
      atlas: {
        width: 960,
        height: Math.ceil(count / 10) * 112,
        bytes: imageRecord.bytes.byteLength,
        sha256: imageRecord.sha256,
      },
      encoder: encoderFacts,
    };
    const descriptorPath = `.gaf2d-preview/characters/${assetId}/${clipName}.json`;
    const descriptorRecord = put(descriptorPath, descriptor);
    setClips[clipName] = {
      descriptor: `${clipName}.json`,
      descriptorSha256: descriptorRecord.sha256,
      image: `${clipName}.webp`,
      imageSha256: imageRecord.sha256,
    };
    manifestClips[clipName] = {
      descriptor: descriptorPath,
      descriptorSha256: descriptorRecord.sha256,
      image: imagePath,
      imageSha256: imageRecord.sha256,
    };
  }
  const set = {
    grammar: MOTION_SET_INDEX_GRAMMAR,
    authority: 'unapproved_preview',
    status: 'human_review_required',
    sourceFamily: 'authored-semantic-v3',
    assetId,
    role,
    frameSize: { width: 128, height: 128 },
    trim: { x: 16, y: 8, width: 96, height: 112 },
    pivot: { x: 0.5, y: 1 },
    presentation: structuredClone(creaturePresentation),
    clips: setClips,
    previewLineage: {
      candidateId: smoothSourceAssets[assetId].candidateId,
      candidateSha256: smoothSourceAssets[assetId].candidateSha256,
      temporalEvidenceSha256: smoothSourceAssets[assetId].temporalEvidenceSha256,
      qaSummarySha256: smoothSourceAssets[assetId].qaSummarySha256,
      batchSummarySha256,
      sourceManifestVersion: smoothSourceAssets[assetId].sourceManifestVersion,
    },
    toolchain: {
      grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
      compositor: { name: 'ImageMagick', version: '7.1.2-13' },
      encoder: encoderFacts,
      operations: [...HERO_PREVIEW_TOOLCHAIN_OPERATIONS],
      profileSha256: HERO_PREVIEW_MATRIX_PROFILE_SHA256,
    },
  };
  const setPath = `.gaf2d-preview/characters/${assetId}/set.json`;
  const setRecord = put(setPath, set);
  smoothCharacters[assetId] = {
    assetId,
    authority: 'unapproved_preview',
    role,
    basePath: `.gaf2d-preview/characters/${assetId}/`,
    set: setPath,
    setSha256: setRecord.sha256,
    clips: manifestClips,
    transform: smoothCharacterTransform,
  };
}
put('.gaf2d-preview/manifest-smooth.json', {
  grammar: 'apn-gaf2d-motion-preview-manifest-v1',
  authority: 'unapproved_preview',
  status: 'human_review_required',
  sourceFamily: 'authored-semantic-v3',
  packId: 'valorant',
  counts: { assets: 7, clips: 39, frames: 795 },
  source: {
    batchSummarySha256,
    contract: 'apn-offline-authored-motion-v3',
    mechanicalQa: 'passed',
    creativeApproval: 'human_required',
    networkCalls: 0,
    providerCalls: 0,
    providerClipCount: 0,
    actingContractPath: 'briefs/authored-semantic-v3/acting-contract.json',
    actingContractSha256: '8'.repeat(64),
  },
  assets: smoothSourceAssets,
  hero: {
    authority: 'unapproved_preview',
    assetId: 'apn-hero',
    role: 'hero',
    basePath: '.gaf2d-preview/hero/',
    set: smoothHeroSetPath,
    setSha256: smoothHeroSetRecord.sha256,
    clips: smoothHeroManifestClips,
    transform: smoothHeroTransform,
  },
  characters: smoothCharacters,
  toolchain: manifest.toolchain,
  budgets: {
    heroCompressed: { bytes: 1234, limit: 655360 },
    newMotionCompressed: { bytes: 5678, limit: 3.5 * 1024 * 1024 },
    maxWaveDecoded: { bytes: 91011, limit: 33554432 },
    hotTextures: { bytes: 121314, limit: 67108864 },
  },
});
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-smooth.json'),
);
const smoothFetchStart = fetchCalls.length;
const smoothPreview = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
const smoothActivationFetches = fetchCalls.slice(smoothFetchStart);
const smoothValorant = smoothPreview.packs.find((pack) => pack.id === 'valorant');
assert(
  smoothPreview.active === true &&
    smoothPreview.manifest?.sourceFamily === 'authored-semantic-v3' &&
    smoothPreview.manifest?.counts?.frames === 795 &&
    smoothPreview.manifest?.source?.contract === 'apn-offline-authored-motion-v3' &&
    smoothValorant?.motion?.characters?.['entry-runner']?.set?.endsWith('/set.json') &&
    smoothValorant?.motion?.characters?.['entry-runner']?.clips?.advance?.descriptor?.endsWith('/advance.json') &&
    smoothPreview.manifest?.hero?.role === 'hero' &&
    smoothPreview.manifest?.hero?.transform?.sourceFrameSize?.width === 128,
  `preview activation accepts the authored-semantic-v3 per-clip manifest and overlays set-owned creature motion records (${smoothPreview.error || 'no-error'})`,
);
assert(
  smoothActivationFetches.length === 8 &&
    smoothActivationFetches.filter((file) => file.endsWith('/set.json')).length === 7 &&
    smoothActivationFetches.every(
      (file) => file.endsWith('/set.json') || file.endsWith('/manifest.json'),
    ),
  'V3 activation validates one manifest and seven set indexes while every clip descriptor and image stays lazy',
);

const invalidSmoothManifest = JSON.parse(
  Buffer.from(files.get('.gaf2d-preview/manifest-smooth.json')).toString('utf8'),
);
invalidSmoothManifest.hero.transform.sourceFrameSize = { width: 640, height: 640 };
put('.gaf2d-preview/manifest-invalid-smooth.json', invalidSmoothManifest);
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-invalid-smooth.json'),
);
const invalidSmoothPreview = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
assert(
  invalidSmoothPreview.active === false &&
    invalidSmoothPreview.error?.includes('sourceFrameSize'),
  'preview activation rejects a smooth V3 transform that claims the historical 640px source canvas',
);
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-smooth.json'),
);
const invalidActingManifest = JSON.parse(
  Buffer.from(files.get('.gaf2d-preview/manifest-smooth.json')).toString('utf8'),
);
invalidActingManifest.assets['entry-runner'].actingContractSha256 = 'f'.repeat(64);
put('.gaf2d-preview/manifest-invalid-acting.json', invalidActingManifest);
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-invalid-acting.json'),
);
const invalidActingPreview = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
assert(
  invalidActingPreview.active === false &&
    invalidActingPreview.error?.includes('acting contract'),
  'preview activation rejects a smooth asset whose acting contract diverges from the root authority',
);
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-smooth.json'),
);
const invalidTemporalSet = JSON.parse(
  Buffer.from(files.get('.gaf2d-preview/characters/entry-runner/set.json')).toString('utf8'),
);
const validEntryRunnerSet = structuredClone(invalidTemporalSet);
invalidTemporalSet.previewLineage.temporalEvidenceSha256 = 'f'.repeat(64);
const invalidTemporalSetRecord = put(
  '.gaf2d-preview/characters/entry-runner/set.json',
  invalidTemporalSet,
);
const invalidTemporalManifest = JSON.parse(
  Buffer.from(files.get('.gaf2d-preview/manifest-smooth.json')).toString('utf8'),
);
invalidTemporalManifest.characters['entry-runner'].setSha256 =
  invalidTemporalSetRecord.sha256;
put('.gaf2d-preview/manifest-invalid-temporal.json', invalidTemporalManifest);
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-invalid-temporal.json'),
);
const invalidTemporalPreview = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
assert(
  invalidTemporalPreview.active === false &&
    invalidTemporalPreview.error?.includes('temporal evidence'),
  'preview activation rejects a smooth set whose temporal evidence diverges from the root asset authority',
);
put(
  '.gaf2d-preview/characters/entry-runner/set.json',
  validEntryRunnerSet,
);
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-smooth.json'),
);
files.set(
  '.gaf2d-preview/characters/entry-runner/advance.webp',
  Buffer.alloc(160 * 1024 + 1, 0x61),
);
const oversizedSmoothCharacter = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
assert(
  oversizedSmoothCharacter.active === true &&
    oversizedSmoothCharacter.error === null,
  'V3 activation defers selected clip bytes and byte-limit enforcement to the lazy motion store',
);

const v4ProfileSha256 = '4'.repeat(64);
const v4ConsumerRoles = {
  'apn-hero': 'hero',
  'entry-runner': 'standard',
  'protocol-courier': 'standard',
  'signal-hunter': 'standard',
  'site-sentinel': 'elite',
  'site-warden': 'boss',
  'veil-operator': 'standard',
};
const v4RoleFacts = {
  hero: { css: 96, runtime: 320, visible: 214, trim: { x: 80, y: 20, width: 160, height: 280 } },
  standard: { css: 72, runtime: 256, visible: 176, trim: { x: 32, y: 16, width: 192, height: 224 } },
  elite: { css: 84, runtime: 256, visible: 184, trim: { x: 32, y: 16, width: 192, height: 224 } },
  boss: { css: 112, runtime: 320, visible: 256, trim: { x: 40, y: 20, width: 240, height: 280 } },
};
const v4ConsumerScale = (role) => {
  const facts = v4RoleFacts[role];
  return {
    grammar: 'gaf2d-consumer-scale-v4',
    role,
    maximumCssBodyHeight: facts.css,
    maximumDpr: 2,
    displayedDevicePixels: facts.css * 2,
    runtimeCanvasClass: facts.runtime,
    sourceVisiblePixels: facts.visible,
    scaleRatio: { numerator: facts.css * 2, denominator: facts.visible },
  };
};
const v4Transform = (role) => {
  const facts = v4RoleFacts[role];
  const scale = facts.runtime / 512;
  return {
    scalePpm: Math.round(scale * 1_000_000),
    sourceFrameSize: { width: 512, height: 512 },
    sourceTrim: {
      x: Math.round(facts.trim.x / scale),
      y: Math.round(facts.trim.y / scale),
      width: Math.round(facts.trim.width / scale),
      height: Math.round(facts.trim.height / scale),
    },
    runtimeFrameSize: { width: facts.runtime, height: facts.runtime },
    runtimeTrim: structuredClone(facts.trim),
  };
};
const v4Toolchain = structuredClone(manifest.toolchain);
v4Toolchain.compositor = {
  name: 'HashBoundCopy',
  version: 'selected-webp-v1',
};
v4Toolchain.encoder = {
  name: 'cwebp',
  version: '1.6.0',
  arguments: ['-exact', '-q', '94'],
  profileSha256: v4ProfileSha256,
};
v4Toolchain.operations = [
  'validate:v4-selected-webp:hash-bound-source',
  'validate:v4-selected-webp:exact-copy-byte-proof',
  'copy:v4-selected-webp:exact-media-bytes',
];
v4Toolchain.profileSha256 = v4ProfileSha256;

const v4Manifest = JSON.parse(
  Buffer.from(files.get('.gaf2d-preview/manifest-smooth.json')).toString('utf8'),
);
v4Manifest.sourceFamily = 'authored-semantic-v4';
v4Manifest.source.contract = 'apn-visual-fidelity-v4-batch-v1';
v4Manifest.source.batchSummarySha256 = '1'.repeat(64);
v4Manifest.toolchain = structuredClone(v4Toolchain);
v4Manifest.budgets = {
  heroCompressed: { bytes: 1234, limit: 3.5 * 1024 * 1024 },
  newMotionCompressed: { bytes: 5678, limit: 32 * 1024 * 1024 },
  maxWaveDecoded: { bytes: 91011, limit: 48 * 1024 * 1024 },
  hotTextures: { bytes: 121314, limit: 64 * 1024 * 1024 },
};
for (const assetId of ['apn-hero', ...creatureSpecs.map(([id]) => id)]) {
  const role = v4ConsumerRoles[assetId];
  const rootRecord =
    assetId === 'apn-hero'
      ? v4Manifest.hero
      : v4Manifest.characters[assetId];
  rootRecord.transform = v4Transform(role);
  rootRecord.consumerScale = v4ConsumerScale(role);
  const set = JSON.parse(
    Buffer.from(files.get(rootRecord.set)).toString('utf8'),
  );
  set.sourceFamily = 'authored-semantic-v4';
  set.frameSize = structuredClone(rootRecord.transform.runtimeFrameSize);
  set.trim = structuredClone(rootRecord.transform.runtimeTrim);
  set.presentation.visibleBounds = {
    x: 16,
    y: 8,
    width: Math.min(set.trim.width - 32, set.trim.width),
    height: rootRecord.consumerScale.sourceVisiblePixels,
  };
  set.presentation.motionBounds = {
    x: 4,
    y: 2,
    width: set.trim.width - 8,
    height: set.trim.height - 4,
  };
  set.consumerScale = structuredClone(rootRecord.consumerScale);
  set.toolchain = structuredClone(v4Toolchain);
  set.lineage = {
    sourceBatchSha256: '1'.repeat(64),
    derivativeSetSha256: '2'.repeat(64),
    masterSetSha256: '7'.repeat(64),
    selectedProfileSha256: v4ProfileSha256,
    v3LineageSha256: '8'.repeat(64),
  };
  v4Manifest.assets[assetId] = {
    derivativeSetSha256: set.lineage.derivativeSetSha256,
    masterSetSha256: set.lineage.masterSetSha256,
    selectedProfileSha256: set.lineage.selectedProfileSha256,
    sourceBatchSha256: set.lineage.sourceBatchSha256,
    sourceManifestVersion: 4,
    v3LineageSha256: set.lineage.v3LineageSha256,
  };
  const setRecord = put(rootRecord.set, set);
  rootRecord.setSha256 = setRecord.sha256;
}
put('.gaf2d-preview/manifest-v4.json', v4Manifest);
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-v4.json'),
);
const v4FetchStart = fetchCalls.length;
const v4Preview = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
const v4ActivationFetches = fetchCalls.slice(v4FetchStart);
const v4Valorant = v4Preview.packs.find((pack) => pack.id === 'valorant');
const v4OverlayCharacters = v4Valorant?.motion?.characters;
assert(
  v4Preview.active === true &&
    v4Preview.manifestSha256 ===
      sha256(files.get('.gaf2d-preview/manifest-v4.json')) &&
    v4Preview.manifest?.sourceFamily === 'authored-semantic-v4' &&
    v4Preview.manifest?.source?.contract ===
      'apn-visual-fidelity-v4-batch-v1' &&
    v4Preview.manifest?.hero?.transform?.sourceFrameSize?.width === 512 &&
    v4Preview.manifest?.hero?.consumerScale?.runtimeCanvasClass === 320 &&
    v4Preview.manifest?.hero?.consumerScale?.sourceVisiblePixels === 214 &&
    v4Preview.manifest?.characters?.['site-warden']?.consumerScale?.runtimeCanvasClass === 320 &&
    v4OverlayCharacters?.['entry-runner']?.sourceFamily ===
      'authored-semantic-v4' &&
    v4OverlayCharacters?.['entry-runner']?.consumerScale?.role === 'standard' &&
    v4OverlayCharacters?.['entry-runner']?.selectedProfileSha256 ===
      v4ProfileSha256 &&
    v4OverlayCharacters?.['site-sentinel']?.consumerScale?.role === 'elite' &&
    v4OverlayCharacters?.['site-warden']?.consumerScale?.role === 'boss',
  `preview activation consumes the V4 single role-aware derivative while retaining V3 semantic authority (${v4Preview.error || 'no-error'})`,
);
assert(
  v4ActivationFetches.length === 8 &&
    v4ActivationFetches.filter((file) => file.endsWith('/set.json')).length === 7 &&
    v4ActivationFetches.every(
      (file) => file.endsWith('/set.json') || file.endsWith('/manifest.json'),
    ),
  'V4 activation keeps every clip descriptor and image selected-only and cold',
);

const invalidV4Source = structuredClone(v4Manifest);
invalidV4Source.hero.transform.sourceFrameSize.width = 511;
put('.gaf2d-preview/manifest-invalid-v4-source.json', invalidV4Source);
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-invalid-v4-source.json'),
);
const invalidV4SourcePreview = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
assert(
  invalidV4SourcePreview.active === false &&
    invalidV4SourcePreview.error?.includes('512x512'),
  'V4 preview rejects a manifest that does not bind the 512px master canvas',
);

const invalidV4Lineage = structuredClone(v4Manifest);
invalidV4Lineage.assets['apn-hero'].derivativeSetSha256 = '9'.repeat(64);
put('.gaf2d-preview/manifest-invalid-v4-lineage.json', invalidV4Lineage);
files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-invalid-v4-lineage.json'),
);
const invalidV4LineagePreview = await loadMotionPreview({
  locationLike: loopback(),
  packs: GAME_PACKS,
  fetchImpl,
  hashBytes,
});
assert(
  invalidV4LineagePreview.active === false &&
    invalidV4LineagePreview.error?.includes('V4 derivative lineage'),
  'V4 preview rejects a root derivative-set hash that differs from the selected set',
);

files.set(
  '.gaf2d-preview/manifest.json',
  files.get('.gaf2d-preview/manifest-v4.json'),
);

console.log('MOTION PREVIEW PASS');
