import crypto from 'node:crypto';
import fs from 'node:fs';

import {
  isMotionPreviewRequested,
  loadMotionPreview,
} from '../js/motion-preview.js';
import {
  HERO_CLIP_CONTRACT,
  HERO_PREVIEW_CLIP_GRAMMAR,
  HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  HERO_PREVIEW_SET_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_OPERATIONS,
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

const candidateFacts = (assetId, manifestVersion) => ({
  assetManifestSha256: '1'.repeat(64),
  candidateId: `${assetId}-authored-semantic-v2`,
  candidateSha256: crypto
    .createHash('sha256')
    .update(`candidate:${assetId}`)
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
});
const transform = {
  scalePpm: 500000,
  sourceFrameSize: { width: 640, height: 640 },
  sourceTrim: { x: 100, y: 80, width: 300, height: 400 },
  runtimeFrameSize: { width: 320, height: 320 },
  runtimeTrim: { x: 50, y: 40, width: 150, height: 200 },
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
  const imageSha256 = crypto
    .createHash('sha256')
    .update(`image:${name}`)
    .digest('hex');
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
    previewLineage: heroLineage,
    encoder: encoderFacts,
  };
  const descriptorPath = `.gaf2d-preview/hero/${name}.json`;
  const imagePath = `.gaf2d-preview/hero/${name}.webp`;
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
assert(
  fetchCalls.length === 1 + 1 + 8 + 6,
  'activation verifies manifest, Hero set, eight Hero descriptors, and six creature descriptors',
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

console.log('MOTION PREVIEW PASS');
