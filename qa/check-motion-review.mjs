import crypto from 'node:crypto';
import fs from 'node:fs';

import {
  createMotionReviewCatalog,
  createMotionReviewSession,
  createViewedStore,
  isMotionReviewRequested,
  loadMotionReviewClip,
  reviewAuthorityScope,
  reviewCycleComplete,
  reviewRuntimeDrawSource,
  reviewScaleMetrics,
  reviewEntryKey,
} from '../js/motion-review.js';
import * as motionReviewContract from '../js/motion-review.js';
import {
  MOTION_CLIP_GRAMMAR,
  MOTION_SET_INDEX_GRAMMAR,
} from '../js/motion-bundle.js';
import { VISUAL_FIDELITY_BUDGETS } from '../js/visual-fidelity-v4.js';

const encoder = new TextEncoder();
const sha256 = (bytes) =>
  crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Motion review: ${message}`);
  console.log(`OK ${message}`);
};

const reviewSource = fs.readFileSync(
  new URL('../js/motion-review.js', import.meta.url),
  'utf8',
);
const continuitySource = fs.readFileSync(
  new URL('./browser/chrome-motion-continuity.mjs', import.meta.url),
  'utf8',
);
assert(
  !/#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/i.test(reviewSource),
  'review canvas uses canonical CSS tokens instead of raw palette literals',
);
const isMotionReviewSourceFamily =
  motionReviewContract.isMotionReviewSourceFamily;
assert(
  typeof isMotionReviewSourceFamily === 'function' &&
    isMotionReviewSourceFamily('authored-semantic-v4') &&
    isMotionReviewSourceFamily('authored-semantic-v3') &&
    !isMotionReviewSourceFamily('authored-semantic-v5') &&
    /isMotionReviewSourceFamily\(manifest\.sourceFamily\)/.test(
      continuitySource,
    ),
  'continuity source-family gate accepts current V4, retains historical V3, and rejects unknown families',
);

const heroClips = ['idle', 'run', 'attack', 'crit', 'sprint', 'hit', 'death', 'celebrate'];
const characterContracts = {
  'entry-runner': ['idle', 'advance', 'engaged', 'hit', 'death'],
  'protocol-courier': ['idle', 'advance', 'engaged', 'hit', 'death'],
  'signal-hunter': ['idle', 'advance', 'engaged', 'hit', 'death'],
  'site-sentinel': ['idle', 'advance', 'engaged', 'hit', 'death'],
  'site-warden': ['idle', 'advance', 'engaged', 'hit', 'death', 'broken'],
  'veil-operator': ['idle', 'advance', 'engaged', 'hit', 'death'],
};
const clipFacts = {
  idle: [30, 30, 'loop'],
  run: [20, 32, 'loop'],
  attack: [15, 30, 'progress'],
  crit: [15, 30, 'progress'],
  sprint: [15, 30, 'loop'],
  hit: [8, 32, 'progress'],
  death: [15, 30, 'progress'],
  celebrate: [15, 30, 'loop'],
  advance: [24, 30, 'loop'],
  engaged: [15, 30, 'loop'],
  broken: [30, 30, 'loop'],
};
const smoothCharacterTransform = {
  scalePpm: 1_000_000,
  sourceFrameSize: { width: 128, height: 128 },
  sourceTrim: { x: 16, y: 8, width: 96, height: 112 },
  runtimeFrameSize: { width: 128, height: 128 },
  runtimeTrim: { x: 16, y: 8, width: 96, height: 112 },
};

const files = new Map();
const put = (path, value) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  files.set(path, bytes);
  return { bytes, sha256: sha256(bytes) };
};

const manifest = {
  grammar: 'apn-gaf2d-motion-preview-manifest-v1',
  authority: 'unapproved_preview',
  status: 'human_review_required',
  sourceFamily: 'authored-semantic-v3',
  packId: 'valorant',
  counts: { assets: 7, clips: 39, frames: 795 },
  source: {
    batchSummarySha256: '7'.repeat(64),
    contract: 'apn-offline-authored-motion-v3',
    mechanicalQa: 'passed',
    creativeApproval: 'human_required',
    networkCalls: 0,
    providerCalls: 0,
    providerClipCount: 0,
    actingContractPath: 'briefs/authored-semantic-v3/acting-contract.json',
    actingContractSha256: 'e'.repeat(64),
  },
  assets: {},
  hero: null,
  characters: {},
  toolchain: {
    grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
    compositor: { name: 'ImageMagick', version: '7.1.2-13' },
    encoder: { name: 'cwebp', version: '1.6.0', arguments: ['-exact', '-q', '90'] },
    operations: [
      'crop:normalized-png:shared-trim:repage:png32',
      'resize:lanczos:shared-scale:exact-cell:png32',
      'montage:row-major:bounded-matrix:shared-cell:no-gap:transparent:alpha-on:png-color-type-6',
    ],
    profileSha256: '71f50b2378a4a588d9e49fb2d29700becb2b4a5ae37078a2af3280284eaa8013',
  },
  budgets: {
    heroCompressed: { bytes: 1234, limit: 655360 },
    newMotionCompressed: { bytes: 5678, limit: 3.5 * 1024 * 1024 },
    maxWaveDecoded: { bytes: 91011, limit: 33554432 },
    hotTextures: { bytes: 121314, limit: 67108864 },
  },
};
const heroSet = {
  grammar: MOTION_SET_INDEX_GRAMMAR,
  authority: 'unapproved_preview',
  status: 'human_review_required',
  sourceFamily: 'authored-semantic-v3',
  assetId: 'apn-hero',
  role: 'hero',
  frameSize: { width: 128, height: 128 },
  trim: { x: 32, y: 16, width: 64, height: 96 },
  pivot: { x: 0.5, y: 1 },
  presentation: {
    schemaVersion: 1,
    scaleContract: 'visible-body',
    reference: { clip: 'idle', frameIndex: 0, sourceSha256: '3'.repeat(64) },
    visibleBounds: { x: 10, y: 6, width: 44, height: 88 },
    motionBounds: { x: 4, y: 2, width: 56, height: 92 },
  },
  clips: {},
  previewLineage: {
    candidateId: 'apn-hero-authored-semantic-v3',
    candidateSha256: '1'.repeat(64),
    temporalEvidenceSha256: 'f'.repeat(64),
    qaSummarySha256: '2'.repeat(64),
    batchSummarySha256: manifest.source.batchSummarySha256,
    sourceManifestVersion: 4,
  },
  toolchain: manifest.toolchain,
};

for (const clipName of heroClips) {
  const [count, fps, playback] = clipFacts[clipName];
  const imagePath = `.gaf2d-preview/hero/${clipName}.webp`;
  const image = put(imagePath, Buffer.from(`hero:${clipName}`));
  const descriptor = {
    grammar: MOTION_CLIP_GRAMMAR,
    authority: 'unapproved_preview',
    sourceFamily: 'authored-semantic-v3',
    assetId: 'apn-hero',
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
    frames: Array.from({ length: count }, (_, index) => ({
      x: (index % 10) * 64,
      y: Math.floor(index / 10) * 96,
      width: 64,
      height: 96,
      sourceSha256: String(index + 1).padStart(64, '0'),
      bodyPoseSha256: String(index + 1).padStart(64, '0'),
    })),
    atlas: {
      width: 640,
      height: Math.ceil(count / 10) * 96,
      bytes: image.bytes.byteLength,
      sha256: image.sha256,
    },
    encoder: heroSet.toolchain.encoder,
  };
  const descriptorPath = `.gaf2d-preview/hero/${clipName}.json`;
  const descriptorRecord = put(descriptorPath, descriptor);
  heroSet.clips[clipName] = {
    descriptor: `${clipName}.json`,
    descriptorSha256: descriptorRecord.sha256,
    image: `${clipName}.webp`,
    imageSha256: image.sha256,
  };
}
const heroSetRecord = put('.gaf2d-preview/hero/set.json', heroSet);
manifest.hero = {
  authority: 'unapproved_preview',
  assetId: 'apn-hero',
  role: 'hero',
  basePath: '.gaf2d-preview/hero/',
  set: '.gaf2d-preview/hero/set.json',
  setSha256: heroSetRecord.sha256,
  clips: Object.fromEntries(
    heroClips.map((clipName) => [
      clipName,
      {
        descriptor: `.gaf2d-preview/hero/${clipName}.json`,
        descriptorSha256: heroSet.clips[clipName].descriptorSha256,
        image: `.gaf2d-preview/hero/${clipName}.webp`,
        imageSha256: heroSet.clips[clipName].imageSha256,
      },
    ]),
  ),
  transform: {
    scalePpm: 1_000_000,
    sourceFrameSize: { width: 128, height: 128 },
    sourceTrim: { x: 32, y: 16, width: 64, height: 96 },
    runtimeFrameSize: { width: 128, height: 128 },
    runtimeTrim: { x: 32, y: 16, width: 64, height: 96 },
  },
};
manifest.assets['apn-hero'] = {
  assetManifestSha256: '8'.repeat(64),
  candidateId: 'apn-hero-authored-semantic-v3',
  candidateSha256: '1'.repeat(64),
  clipManifestSha256: '9'.repeat(64),
  frameHashesSha256: 'a'.repeat(64),
  identitySha256: 'b'.repeat(64),
  qaSummarySha256: '2'.repeat(64),
  reviewEvidenceSha256: 'c'.repeat(64),
  reviewHtmlSha256: 'd'.repeat(64),
  sourceManifestVersion: 4,
  actingContractSha256: 'e'.repeat(64),
  temporalEvidenceSha256: 'f'.repeat(64),
};

for (const [assetId, clipOrder] of Object.entries(characterContracts)) {
  manifest.assets[assetId] = {
    assetManifestSha256: '8'.repeat(64),
    candidateId: `${assetId}-authored-semantic-v3`,
    candidateSha256: '1'.repeat(64),
    clipManifestSha256: '9'.repeat(64),
    frameHashesSha256: 'a'.repeat(64),
    identitySha256: 'b'.repeat(64),
    qaSummarySha256: '2'.repeat(64),
    reviewEvidenceSha256: 'c'.repeat(64),
    reviewHtmlSha256: 'd'.repeat(64),
    sourceManifestVersion: 4,
    actingContractSha256: 'e'.repeat(64),
    temporalEvidenceSha256: 'f'.repeat(64),
  };
  const role = assetId === 'site-warden' ? 'boss' : 'character';
  const set = {
    grammar: 'gaf2d-motion-set-index-v2',
    authority: 'unapproved_preview',
    status: 'human_review_required',
    sourceFamily: 'authored-semantic-v3',
    assetId,
    role,
    frameSize: { width: 128, height: 128 },
    trim: { x: 16, y: 8, width: 96, height: 112 },
    pivot: { x: 0.5, y: 1 },
    presentation: {
      schemaVersion: 1,
      scaleContract: 'visible-body',
      reference: { clip: 'idle', frameIndex: 0, sourceSha256: '3'.repeat(64) },
      visibleBounds: { x: 10, y: 10, width: 60, height: 86 },
      motionBounds: { x: 2, y: 2, width: 78, height: 94 },
    },
    clips: {},
    previewLineage: {
      candidateId: `${assetId}-authored-semantic-v3`,
      candidateSha256: '1'.repeat(64),
      temporalEvidenceSha256: 'f'.repeat(64),
      qaSummarySha256: '2'.repeat(64),
      batchSummarySha256: manifest.source.batchSummarySha256,
      sourceManifestVersion: 4,
    },
    toolchain: manifest.toolchain,
  };
  for (const clipName of clipOrder) {
    const [count, fps, playback] = clipFacts[clipName];
    const imagePath = `.gaf2d-preview/characters/${assetId}/${clipName}.webp`;
    const image = put(imagePath, Buffer.from(`${assetId}:${clipName}`));
    const descriptor = {
      grammar: 'gaf2d-motion-clip-v2',
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
        const bodyPoseSha256 = String(
          playback === 'progress' && index === count - 1 ? count - 1 : index + 1,
        ).padStart(64, '0');
        return {
          x: (index % 10) * 96,
          y: Math.floor(index / 10) * 112,
          width: 96,
          height: 112,
          sourceSha256: bodyPoseSha256,
          bodyPoseSha256,
        };
      }),
      atlas: {
        width: 960,
        height: Math.ceil(count / 10) * 112,
        bytes: image.bytes.byteLength,
        sha256: image.sha256,
      },
      encoder: manifest.toolchain.encoder,
    };
    const descriptorPath = `.gaf2d-preview/characters/${assetId}/${clipName}.json`;
    const descriptorRecord = put(descriptorPath, descriptor);
    set.clips[clipName] = {
      descriptor: `${clipName}.json`,
      descriptorSha256: descriptorRecord.sha256,
      image: `${clipName}.webp`,
      imageSha256: image.sha256,
    };
  }
  const setRecord = put(`.gaf2d-preview/characters/${assetId}/set.json`, set);
  manifest.characters[assetId] = {
    authority: 'unapproved_preview',
    role,
    basePath: `.gaf2d-preview/characters/${assetId}/`,
    set: `.gaf2d-preview/characters/${assetId}/set.json`,
    setSha256: setRecord.sha256,
    clips: Object.fromEntries(
      clipOrder.map((clipName) => [
        clipName,
        {
          descriptor: `.gaf2d-preview/characters/${assetId}/${clipName}.json`,
          descriptorSha256: set.clips[clipName].descriptorSha256,
          image: `.gaf2d-preview/characters/${assetId}/${clipName}.webp`,
          imageSha256: set.clips[clipName].imageSha256,
        },
      ]),
    ),
    transform: smoothCharacterTransform,
  };
}

const v4Files = new Map(files);
const putV4 = (path, value) => {
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  v4Files.set(path, bytes);
  return { bytes, sha256: sha256(bytes) };
};
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
const v4Manifest = structuredClone(manifest);
v4Manifest.sourceFamily = 'authored-semantic-v4';
v4Manifest.source.contract = 'apn-visual-fidelity-v4-batch-v1';
v4Manifest.source.batchSummarySha256 = '1'.repeat(64);
v4Manifest.toolchain = structuredClone(v4Toolchain);

for (const assetId of ['apn-hero', ...Object.keys(characterContracts)]) {
  const consumerRole = v4ConsumerRoles[assetId];
  const rootRecord =
    assetId === 'apn-hero'
      ? v4Manifest.hero
      : v4Manifest.characters[assetId];
  rootRecord.transform = v4Transform(consumerRole);
  rootRecord.consumerScale = v4ConsumerScale(consumerRole);
  const set = JSON.parse(Buffer.from(files.get(rootRecord.set)).toString('utf8'));
  set.sourceFamily = 'authored-semantic-v4';
  set.frameSize = structuredClone(rootRecord.transform.runtimeFrameSize);
  set.trim = structuredClone(rootRecord.transform.runtimeTrim);
  set.presentation.visibleBounds = {
    x: 16,
    y: 8,
    width: set.trim.width - 32,
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
  for (const clipName of Object.keys(rootRecord.clips)) {
    const clipRecord = rootRecord.clips[clipName];
    const descriptor = JSON.parse(
      Buffer.from(files.get(clipRecord.descriptor)).toString('utf8'),
    );
    const columns = consumerRole === 'boss' ? 6 : 8;
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
    descriptor.trim = structuredClone(set.trim);
    descriptor.pivot =
      clipName === 'advance' ? { x: 0.48, y: 0.98 } : { x: 0.5, y: 1 };
    const clipVisiblePixels =
      rootRecord.consumerScale.sourceVisiblePixels +
      (clipName === 'advance' ? 4 : 0);
    descriptor.presentation = {
      schemaVersion: 1,
      scaleContract: 'visible-body',
      reference: {
        clip: clipName,
        frameIndex: 0,
        sourceSha256: descriptor.frames[0].sourceSha256,
      },
      visibleBounds: {
        x: 16,
        y: Math.max(0, set.trim.height - clipVisiblePixels),
        width: Math.max(1, set.trim.width - 32),
        height: clipVisiblePixels,
      },
      motionBounds: {
        x: 0,
        y: 0,
        width: set.trim.width,
        height: set.trim.height,
      },
    };
    descriptor.encoder = structuredClone(v4Toolchain.encoder);
    descriptor.lineage = {
      sourceBatchSha256: '1'.repeat(64),
      derivativeSetSha256: '2'.repeat(64),
      sourceDescriptorSha256: '3'.repeat(64),
      sourceEvidenceSha256: '4'.repeat(64),
      sourceMediaSha256: '5'.repeat(64),
      masterInventorySha256: '6'.repeat(64),
      masterSetSha256: '7'.repeat(64),
      selectedProfileSha256: v4ProfileSha256,
      v3LineageSha256: '8'.repeat(64),
    };
    const descriptorRecord = putV4(clipRecord.descriptor, descriptor);
    clipRecord.descriptorSha256 = descriptorRecord.sha256;
    set.clips[clipName].descriptorSha256 = descriptorRecord.sha256;
  }
  const setRecord = putV4(rootRecord.set, set);
  rootRecord.setSha256 = setRecord.sha256;
}

assert(
  isMotionReviewRequested({ hostname: '127.0.0.1', search: '?motion-preview=1&motion-review=1' }),
  'review gate requires loopback preview plus explicit review query',
);
assert(
  !isMotionReviewRequested({ hostname: '127.0.0.1', search: '?motion-preview=1' }),
  'review gate stays off without explicit review query',
);

const catalog = createMotionReviewCatalog(manifest);
assert(catalog.length === 39, 'catalog resolves all 39 actual clips');
assert(
  catalog.filter((entry) => entry.assetId === 'apn-hero').length === 8 &&
    catalog.filter((entry) => entry.assetId === 'site-warden').length === 6,
  'catalog preserves hero and boss clip membership',
);
const v4Catalog = createMotionReviewCatalog(v4Manifest);
assert(
  v4Catalog.length === 39 &&
    v4Catalog.every((entry) => entry.sourceFamily === 'authored-semantic-v4') &&
    v4Catalog.find((entry) => entry.assetId === 'apn-hero')?.consumerScale?.runtimeCanvasClass === 320 &&
    v4Catalog.find((entry) => entry.assetId === 'apn-hero')?.consumerScale?.sourceVisiblePixels === 214 &&
    v4Catalog.find((entry) => entry.assetId === 'site-sentinel')?.consumerScale?.role === 'elite' &&
    v4Catalog.find((entry) => entry.assetId === 'protocol-courier')?.consumerScale?.role === 'standard' &&
    v4Catalog.find((entry) => entry.assetId === 'apn-hero')?.v4Lineage?.sourceManifestVersion === 4,
  'current review catalog resolves one trusted role-aware V4 derivative for all 39 clips',
);
assert(
  typeof reviewAuthorityScope === 'function',
  'review authority scope API is present',
);
const historicalScope = reviewAuthorityScope(manifest, '1'.repeat(64));
const currentScope = reviewAuthorityScope(v4Manifest, '2'.repeat(64));
assert(
  historicalScope !== currentScope &&
    currentScope.includes(v4Manifest.source.batchSummarySha256) &&
    currentScope.includes(v4Manifest.assets['apn-hero'].derivativeSetSha256) &&
    currentScope.includes('2'.repeat(64)),
  'viewed storage scope binds batch, source family, V4 derivative set, and exact manifest SHA',
);

const memoryStorage = new Map();
const viewed = createViewedStore(
  {
    getItem: (key) => memoryStorage.get(key) || null,
    setItem: (key, value) => memoryStorage.set(key, value),
  },
  manifest.source.batchSummarySha256,
);
assert(
  viewed.isViewed('apn-hero', 'idle') === false,
  'viewed store starts cold',
);
viewed.markViewed('apn-hero', 'idle', 123);
assert(
  viewed.isViewed('apn-hero', 'idle') &&
    viewed.countViewed(catalog) === 1 &&
    memoryStorage.get(viewed.key).includes(reviewEntryKey('apn-hero', 'idle')),
  'viewed store persists per-clip review state',
);
const currentScopedViewed = createViewedStore(
  {
    getItem: (key) => memoryStorage.get(key) || null,
    setItem: (key, value) => memoryStorage.set(key, value),
  },
  currentScope,
);
assert(
  currentScopedViewed.isViewed('apn-hero', 'idle') === false,
  'historical V3 viewed credit cannot leak into the current V4 authority scope',
);
const v4Viewed = createViewedStore(
  {
    getItem: (key) => memoryStorage.get(key) || null,
    setItem: (key, value) => memoryStorage.set(key, value),
  },
  `${v4Manifest.source.batchSummarySha256}-v4`,
);
for (const entry of v4Catalog) {
  const [frameCount, fps, playback] = clipFacts[entry.clipName];
  const reviewRuntime = { ...entry, frameCount, fps, playback };
  const metrics = reviewScaleMetrics(reviewRuntime, {
    mode: 'actual-game-size',
    dpr: 2,
  });
  if (
    metrics.viewCreditAllowed &&
    reviewCycleComplete(reviewRuntime, frameCount / fps)
  ) {
    v4Viewed.markViewed(entry.assetId, entry.clipName, 456);
  }
}
assert(
  v4Viewed.countViewed(v4Catalog) === 39,
  'actual-game-size DPR2 full-cycle credit reaches exactly 39/39 for V4',
);

const fetchImpl = async (url) => {
  const clean = String(url).split('?')[0];
  const bytes = files.get(clean);
  if (!bytes) return { ok: false, status: 404, headers: { get: () => null } };
  return {
    ok: true,
    status: 200,
    headers: { get: () => String(bytes.byteLength) },
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
};
const runtime = await loadMotionReviewClip(
  catalog.find((entry) => entry.assetId === 'entry-runner' && entry.clipName === 'advance'),
  {
    fetchImpl,
    hashBytes: async (bytes) => sha256(bytes),
    decodeImage: async () => ({ width: 960, height: 336, close() {} }),
  },
);
assert(
  runtime.assetId === 'entry-runner' &&
    runtime.clipName === 'advance' &&
    runtime.fps === 30 &&
    runtime.playback === 'loop' &&
    runtime.frameCount === 24,
  'review clip loader returns exact validated runtime facts for a creature clip',
);
const v4FetchCalls = [];
const v4RuntimeEntry = v4Catalog.find(
  (entry) => entry.assetId === 'entry-runner' && entry.clipName === 'advance',
);
const v4Runtime = await loadMotionReviewClip(v4RuntimeEntry, {
  fetchImpl: async (url) => {
    const clean = String(url).split('?')[0];
    v4FetchCalls.push(clean);
    const bytes = v4Files.get(clean);
    if (!bytes) return { ok: false, status: 404, headers: { get: () => null } };
    return {
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.byteLength) },
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  },
  hashBytes: async (bytes) => sha256(bytes),
  decodeImage: async () => ({ width: 1536, height: 672, close() {} }),
});
assert(
  v4Runtime.sourceFamily === 'authored-semantic-v4' &&
    v4Runtime.consumerScale.role === 'standard' &&
    v4Runtime.consumerScale.runtimeCanvasClass === 256 &&
    v4Runtime.consumerScale.sourceVisiblePixels === 180 &&
    v4Runtime.consumerScale.scaleRatio.denominator === 180 &&
    v4Runtime.presentation.visibleBounds.height === 180 &&
    v4Runtime.pivot.x === 0.48 &&
    v4FetchCalls.join('|') ===
      [v4RuntimeEntry.set, v4RuntimeEntry.descriptor, v4RuntimeEntry.image].join('|'),
  'V4 review fetches and decodes only the selected set and selected clip media',
);
const higherV4Files = new Map(v4Files);
const higherV4Entry = structuredClone(v4RuntimeEntry);
{
  const descriptor = JSON.parse(
    Buffer.from(higherV4Files.get(higherV4Entry.descriptor)).toString('utf8'),
  );
  const mediaBytes = Buffer.alloc(196370, 0x61);
  descriptor.atlas.bytes = mediaBytes.length;
  descriptor.atlas.sha256 = sha256(mediaBytes);
  higherV4Files.set(higherV4Entry.image, mediaBytes);
  const descriptorBytes = Buffer.from(`${JSON.stringify(descriptor, null, 2)}\n`);
  higherV4Files.set(higherV4Entry.descriptor, descriptorBytes);
  higherV4Entry.imageSha256 = sha256(mediaBytes);
  higherV4Entry.descriptorSha256 = sha256(descriptorBytes);
  const set = JSON.parse(
    Buffer.from(higherV4Files.get(higherV4Entry.set)).toString('utf8'),
  );
  set.clips[higherV4Entry.clipName].imageSha256 = higherV4Entry.imageSha256;
  set.clips[higherV4Entry.clipName].descriptorSha256 = higherV4Entry.descriptorSha256;
  const setBytes = Buffer.from(`${JSON.stringify(set, null, 2)}\n`);
  higherV4Files.set(higherV4Entry.set, setBytes);
  higherV4Entry.setSha256 = sha256(setBytes);
}
const higherV4Runtime = await loadMotionReviewClip(higherV4Entry, {
  fetchImpl: async (url) => {
    const clean = String(url).split('?')[0];
    const bytes = higherV4Files.get(clean);
    if (!bytes) return { ok: false, status: 404, headers: { get: () => null } };
    return {
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.byteLength) },
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  },
  hashBytes: async (bytes) => sha256(bytes),
  decodeImage: async () => ({ width: 1536, height: 672, close() {} }),
});
assert(
  higherV4Runtime.assetId === 'entry-runner' &&
    higherV4Runtime.image.width === 1536,
  'V4 review accepts provisional selected media above the retired V3 fetch cap',
);
let aboveV4Rejected = false;
try {
  const oversizedV4Files = new Map(v4Files);
  const oversizedV4Entry = structuredClone(v4RuntimeEntry);
  const descriptor = JSON.parse(
    Buffer.from(oversizedV4Files.get(oversizedV4Entry.descriptor)).toString('utf8'),
  );
  const mediaBytes = Buffer.alloc(
    VISUAL_FIDELITY_BUDGETS.commonEncodedBytes + 1,
    0x61,
  );
  descriptor.atlas.bytes = mediaBytes.length;
  descriptor.atlas.sha256 = sha256(mediaBytes);
  oversizedV4Files.set(oversizedV4Entry.image, mediaBytes);
  const descriptorBytes = Buffer.from(`${JSON.stringify(descriptor, null, 2)}\n`);
  oversizedV4Files.set(oversizedV4Entry.descriptor, descriptorBytes);
  oversizedV4Entry.imageSha256 = sha256(mediaBytes);
  oversizedV4Entry.descriptorSha256 = sha256(descriptorBytes);
  const set = JSON.parse(
    Buffer.from(oversizedV4Files.get(oversizedV4Entry.set)).toString('utf8'),
  );
  set.clips[oversizedV4Entry.clipName].imageSha256 = oversizedV4Entry.imageSha256;
  set.clips[oversizedV4Entry.clipName].descriptorSha256 = oversizedV4Entry.descriptorSha256;
  const setBytes = Buffer.from(`${JSON.stringify(set, null, 2)}\n`);
  oversizedV4Files.set(oversizedV4Entry.set, setBytes);
  oversizedV4Entry.setSha256 = sha256(setBytes);
  await loadMotionReviewClip(oversizedV4Entry, {
    fetchImpl: async (url) => {
      const clean = String(url).split('?')[0];
      const bytes = oversizedV4Files.get(clean);
      if (!bytes) return { ok: false, status: 404, headers: { get: () => null } };
      return {
        ok: true,
        status: 200,
        headers: { get: () => String(bytes.byteLength) },
        arrayBuffer: async () =>
          bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      };
    },
    hashBytes: async (bytes) => sha256(bytes),
    decodeImage: async () => ({ width: 1536, height: 672, close() {} }),
  });
} catch (error) {
  aboveV4Rejected = true;
}
assert(
  aboveV4Rejected,
  'V4 review rejects one byte above the rounded measured selected-media fetch cap',
);
const heroRuntime = await loadMotionReviewClip(
  catalog.find((entry) => entry.assetId === 'apn-hero' && entry.clipName === 'run'),
  {
    fetchImpl,
    hashBytes: async (bytes) => sha256(bytes),
    decodeImage: async () => ({ width: 640, height: 192, close() {} }),
  },
);
assert(
  heroRuntime.assetId === 'apn-hero' &&
    heroRuntime.clipName === 'run' &&
    heroRuntime.fps === 32 &&
    heroRuntime.playback === 'loop' &&
    heroRuntime.frameCount === 20 &&
    heroRuntime.trim.width === 64,
  'review clip loader returns exact validated runtime facts for a generic Hero V3 clip',
);
const normalizedSource = reviewRuntimeDrawSource({
  descriptor: {
    trim: { x: 0, y: 0, width: 9, height: 9 },
    frameSize: { width: 9, height: 9 },
    anchor: [0, 0],
  },
  frameSize: { width: 128, height: 128 },
  trim: { x: 32, y: 16, width: 64, height: 96 },
  pivot: { x: 0.5, y: 1 },
  image: { width: 1, height: 1 },
});
assert(
  normalizedSource.set.frameSize.width === 128 &&
    normalizedSource.set.trim.width === 64 &&
    normalizedSource.set.pivot.y === 1,
  'review draw source consumes loader-normalized runtime frameSize, trim, and pivot universally',
);

let mismatchedImageClosed = 0;
let mismatchedImageRejected = false;
try {
  await loadMotionReviewClip(
    catalog.find((entry) => entry.assetId === 'entry-runner' && entry.clipName === 'advance'),
    {
      fetchImpl,
      hashBytes: async (bytes) => sha256(bytes),
      decodeImage: async () => ({
        width: 959,
        height: 336,
        close() {
          mismatchedImageClosed += 1;
        },
      }),
    },
  );
} catch (error) {
  mismatchedImageRejected = String(error.message).includes('decoded dimensions');
}
assert(
  mismatchedImageRejected && mismatchedImageClosed === 1,
  'review loader rejects and closes a hash-bound image with wrong decoded dimensions',
);

const malformed = structuredClone(manifest);
malformed.characters['entry-runner'].clips.advance.descriptor =
  '.gaf2d-preview/characters/entry-runner/../escape.json';
let malformedRejected = false;
try {
  createMotionReviewCatalog(malformed);
} catch (error) {
  malformedRejected = String(error.message).includes('portable preview path');
}
assert(
  malformedRejected,
  'catalog fails closed on malformed preview clip paths',
);

const wrongMembership = structuredClone(manifest);
wrongMembership.characters['entry-runner'].clips.dance =
  wrongMembership.characters['entry-runner'].clips.death;
delete wrongMembership.characters['entry-runner'].clips.death;
let wrongMembershipRejected = false;
try {
  createMotionReviewCatalog(wrongMembership);
} catch (error) {
  wrongMembershipRejected = String(error.message).includes('clip membership');
}
assert(
  wrongMembershipRejected,
  'catalog fails closed when a 39-count manifest swaps one required clip name',
);

const wrongCounts = structuredClone(manifest);
wrongCounts.counts.frames = 794;
let wrongCountsRejected = false;
try {
  createMotionReviewCatalog(wrongCounts);
} catch (error) {
  wrongCountsRejected = String(error.message).includes('7/39/795');
}
assert(
  wrongCountsRejected,
  'catalog fails closed when manifest no longer binds the exact 7/39/795 smooth batch',
);

const wrongHeroTransform = structuredClone(manifest);
wrongHeroTransform.hero.transform.sourceFrameSize = { width: 640, height: 640 };
let wrongHeroTransformRejected = false;
try {
  createMotionReviewCatalog(wrongHeroTransform);
} catch (error) {
  wrongHeroTransformRejected = String(error.message).includes('sourceFrameSize');
}
assert(
  wrongHeroTransformRejected,
  'catalog fails closed when the Hero V3 transform claims the historical 640px source canvas',
);
const wrongActing = structuredClone(manifest);
wrongActing.assets['entry-runner'].actingContractSha256 = '0'.repeat(64);
let wrongActingRejected = false;
try {
  createMotionReviewCatalog(wrongActing);
} catch (error) {
  wrongActingRejected = String(error.message).includes('acting contract');
}
assert(
  wrongActingRejected,
  'catalog fails closed when one smooth asset diverges from the root acting contract authority',
);
const wrongTemporalFiles = new Map(files);
const wrongTemporalSetPath = '.gaf2d-preview/characters/entry-runner/set.json';
const wrongTemporalSet = JSON.parse(
  Buffer.from(wrongTemporalFiles.get(wrongTemporalSetPath)).toString('utf8'),
);
wrongTemporalSet.previewLineage.temporalEvidenceSha256 = '0'.repeat(64);
const wrongTemporalSetBytes = Buffer.from(
  `${JSON.stringify(wrongTemporalSet, null, 2)}\n`,
);
wrongTemporalFiles.set(
  wrongTemporalSetPath,
  wrongTemporalSetBytes,
);
let wrongTemporalRejected = false;
try {
  await loadMotionReviewClip(
    {
      ...catalog.find((entry) => entry.assetId === 'entry-runner' && entry.clipName === 'advance'),
      setSha256: sha256(wrongTemporalSetBytes),
    },
    {
      fetchImpl: async (url) => {
        const clean = String(url).split('?')[0];
        const bytes = wrongTemporalFiles.get(clean);
        if (!bytes) return { ok: false, status: 404, headers: { get: () => null } };
        return {
          ok: true,
          status: 200,
          headers: { get: () => String(bytes.byteLength) },
          arrayBuffer: async () =>
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        };
      },
      hashBytes: async (bytes) => sha256(bytes),
      decodeImage: async () => ({ width: 960, height: 336, close() {} }),
    },
  );
} catch (error) {
  wrongTemporalRejected = String(error.message).includes('temporal evidence');
}
assert(
  wrongTemporalRejected,
  'review loader rejects a smooth set whose temporal evidence diverges from the root asset authority',
);
const oversizedReviewFiles = new Map(files);
oversizedReviewFiles.set(
  '.gaf2d-preview/characters/entry-runner/advance.webp',
  Buffer.alloc(160 * 1024 + 1, 0x61),
);
let oversizedReviewRejected = false;
try {
  await loadMotionReviewClip(
    catalog.find((entry) => entry.assetId === 'entry-runner' && entry.clipName === 'advance'),
    {
      fetchImpl: async (url) => {
        const clean = String(url).split('?')[0];
        const bytes = oversizedReviewFiles.get(clean);
        if (!bytes) return { ok: false, status: 404, headers: { get: () => null } };
        return {
          ok: true,
          status: 200,
          headers: { get: () => String(bytes.byteLength) },
          arrayBuffer: async () =>
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        };
      },
      hashBytes: async (bytes) => sha256(bytes),
      decodeImage: async () => ({ width: 960, height: 336, close() {} }),
    },
  );
} catch (error) {
  oversizedReviewRejected = String(error.message).includes('exceeds 163840 bytes');
}
assert(
  oversizedReviewRejected,
  'review loader rejects a smooth character clip above the exact 160 KiB cap',
);

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};
const pendingLoads = new Map([
  ['asset-a:idle', deferred()],
  ['asset-b:idle', deferred()],
  ['asset-c:idle', deferred()],
  ['asset-d:idle', deferred()],
]);
const closeCounts = new Map();
const loadedRuntime = (assetId) => ({
  assetId,
  clipName: 'idle',
  image: {
    close() {
      closeCounts.set(assetId, (closeCounts.get(assetId) || 0) + 1);
    },
  },
});
const activated = [];
const loadErrors = [];
const session = createMotionReviewSession({
  loadClip: ({ assetId, clipName }) =>
    pendingLoads.get(`${assetId}:${clipName}`).promise,
  onRuntime: (loaded) => activated.push(loaded.assetId),
  onError: (error) => loadErrors.push(error.message),
});
const loadA = session.select({ assetId: 'asset-a', clipName: 'idle' });
const loadB = session.select({ assetId: 'asset-b', clipName: 'idle' });
pendingLoads.get('asset-a:idle').resolve(loadedRuntime('asset-a'));
pendingLoads.get('asset-b:idle').resolve(loadedRuntime('asset-b'));
await Promise.all([loadA, loadB]);
assert(
  activated.join(',') === 'asset-b' && closeCounts.get('asset-a') === 1,
  'late stale review load is closed and cannot replace the newest selection',
);
const loadC = session.select({ assetId: 'asset-c', clipName: 'idle' });
assert(
  closeCounts.get('asset-b') === 1,
  'selecting a new clip releases the previous decoded bitmap immediately',
);
pendingLoads.get('asset-c:idle').resolve(loadedRuntime('asset-c'));
await loadC;
const loadD = session.select({ assetId: 'asset-d', clipName: 'idle' });
session.destroy();
pendingLoads.get('asset-d:idle').resolve(loadedRuntime('asset-d'));
await loadD;
assert(
  closeCounts.get('asset-c') === 1 && closeCounts.get('asset-d') === 1,
  'destroy closes the active bitmap and any later stale completion',
);
assert(loadErrors.length === 0, 'intentional stale loads emit no review error');

console.log('MOTION REVIEW PASS');
