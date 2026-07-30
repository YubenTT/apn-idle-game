import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HERO_APPROVED_CLIP_GRAMMAR,
  HERO_CLIP_CONTRACT,
  HERO_MATRIX_PROFILE_SHA256,
  HERO_PREVIEW_CLIP_GRAMMAR,
  HERO_PREVIEW_SET_GRAMMAR,
  HERO_SET_GRAMMAR,
  HERO_TOOLCHAIN_GRAMMAR,
  HERO_TOOLCHAIN_OPERATIONS,
  validateHeroClipDescriptor,
  validateHeroSetManifest,
} from '../js/hero-v3-contract.js';
import {
  disposeHeroV3,
  drawV3Frame,
  heroV3AuthorityStatus,
  heroV3Ready,
  loadHeroV3,
} from '../js/hero-v3.js';

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
  toolchain: approvedToolchain,
};
previewRuntimeFiles.set(
  'assets/preview-v3/set.json',
  encoder.encode(canonical(previewRuntimeSet)),
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
const first = createHarness();
await loadHeroV3('assets/mascot/v3/', first);
assert(
  heroV3Ready() && heroV3AuthorityStatus() === 'historical',
  'hash-valid historical set loads without being relabelled approved',
);
assert(
  first.fetches.filter((url) => url.includes('sha256=')).length === 16,
  'every Hero descriptor and image request carries its immutable file hash',
);
const historicalIdle = JSON.parse(
  fs.readFileSync(path.join(heroRoot, 'idle.json'), 'utf8'),
);
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

const replacement = createHarness();
await loadHeroV3('assets/mascot/v3/', replacement);
assert(
  first.bitmaps.length === 8 &&
    first.bitmaps.every((bitmap) => bitmap.closed === 1),
  'successful set replacement closes every previous bitmap exactly once',
);

const failed = createHarness({ tamperDescriptor: 'celebrate' });
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
  !failed.fetches.some((url) => url.includes('/celebrate.webp')),
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
  'complete approved replacement becomes authoritative and releases the historical set',
);
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

disposeHeroV3();
assert(
  preview.bitmaps.every((bitmap) => bitmap.closed === 1) &&
    !heroV3Ready() &&
    heroV3AuthorityStatus() === null,
  'explicit disposal closes the active set and clears its authority status',
);

assert(
  canonical(productionSet) === setBytes.toString('utf8'),
  'production Hero set uses canonical stable JSON bytes',
);

console.log('HERO V3 RUNTIME PASS');
