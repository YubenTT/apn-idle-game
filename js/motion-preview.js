import {
  validateMotionSetIndex,
  validateMotionPreviewBundle,
} from './motion-bundle.js?v=enhanced-v1';
import {
  HERO_V3_CLIPS,
  MAX_HERO_IMAGE_BYTES,
  validateHeroClipDescriptor,
  validateHeroSetManifest,
} from './hero-v3-contract.js?v=enhanced-v1';
import {
  validateConsumerScaleContract,
  validateQualityProfileBinding,
  VISUAL_FIDELITY_BUDGETS,
  visualFidelityEncodedLimit,
} from './visual-fidelity-v4.js?v=enhanced-v1';

const MANIFEST_PATH = '.gaf2d-preview/manifest.json';
const PRODUCTION_HERO_BASE = 'assets/mascot/v3/';
const MAX_MANIFEST_BYTES = 512 * 1024;
const MAX_SET_BYTES = 64 * 1024;
const MAX_DESCRIPTOR_BYTES = 256 * 1024;
const MAX_COMMON_MEDIA_BYTES = 6 * 1024 * 1024;
const MAX_BOSS_MEDIA_BYTES = 8 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const fatalDecoder = new TextDecoder('utf-8', { fatal: true });
const CHARACTER_ROLES = Object.freeze({
  'entry-runner': 'character',
  'protocol-courier': 'character',
  'signal-hunter': 'character',
  'site-sentinel': 'character',
  'site-warden': 'boss',
  'veil-operator': 'character',
});
const CONSUMER_ROLES = Object.freeze({
  'apn-hero': 'hero',
  'entry-runner': 'standard',
  'protocol-courier': 'standard',
  'signal-hunter': 'standard',
  'site-sentinel': 'elite',
  'site-warden': 'boss',
  'veil-operator': 'standard',
});
const VISUAL_FIDELITY_SOURCE_FAMILY = 'authored-semantic-v4';
const HISTORICAL_SMOOTH_BUDGETS = Object.freeze({
  heroCompressedBytes: 640 * 1024,
  newMotionCompressedBytes: 3.5 * 1024 * 1024,
  maxWaveDecodedBytes: 32 * 1024 * 1024,
  hotTexturesBytes: 64 * 1024 * 1024,
});
const SOURCE_ASSET_IDS = Object.freeze([
  'apn-hero',
  ...Object.keys(CHARACTER_ROLES),
]);
const TOP_KEYS = new Set([
  'grammar',
  'authority',
  'status',
  'sourceFamily',
  'packId',
  'counts',
  'source',
  'assets',
  'hero',
  'characters',
  'toolchain',
]);
const SMOOTH_TOP_KEYS = new Set([...TOP_KEYS, 'budgets']);
const COUNTS_KEYS = new Set(['assets', 'clips', 'frames']);
const SOURCE_KEYS = new Set([
  'batchSummarySha256',
  'contract',
  'mechanicalQa',
  'creativeApproval',
  'networkCalls',
  'providerCalls',
  'providerClipCount',
]);
const SMOOTH_SOURCE_KEYS = new Set([
  ...SOURCE_KEYS,
  'actingContractPath',
  'actingContractSha256',
]);
const SOURCE_ASSET_KEYS = new Set([
  'assetManifestSha256',
  'candidateId',
  'candidateSha256',
  'clipManifestSha256',
  'frameHashesSha256',
  'identitySha256',
  'qaSummarySha256',
  'reviewEvidenceSha256',
  'reviewHtmlSha256',
  'sourceManifestVersion',
]);
const SMOOTH_SOURCE_ASSET_KEYS = new Set([
  ...SOURCE_ASSET_KEYS,
  'actingContractSha256',
  'temporalEvidenceSha256',
]);
const VISUAL_FIDELITY_SOURCE_ASSET_KEYS = new Set([
  'derivativeSetSha256',
  'masterSetSha256',
  'selectedProfileSha256',
  'sourceBatchSha256',
  'sourceManifestVersion',
  'v3LineageSha256',
]);
const HERO_KEYS = new Set([
  'authority',
  'assetId',
  'basePath',
  'set',
  'setSha256',
  'clips',
  'transform',
]);
const SMOOTH_HERO_KEYS = new Set([...HERO_KEYS, 'role']);
const VISUAL_FIDELITY_HERO_KEYS = new Set([
  ...SMOOTH_HERO_KEYS,
  'consumerScale',
]);
const CHARACTER_KEYS = new Set([
  'authority',
  'role',
  'descriptor',
  'descriptorSha256',
  'image',
  'imageSha256',
  'transform',
]);
const SMOOTH_CHARACTER_KEYS = new Set([
  'assetId',
  'authority',
  'role',
  'basePath',
  'set',
  'setSha256',
  'clips',
  'transform',
]);
const VISUAL_FIDELITY_CHARACTER_KEYS = new Set([
  ...SMOOTH_CHARACTER_KEYS,
  'consumerScale',
]);
const FILE_KEYS = new Set([
  'descriptor',
  'descriptorSha256',
  'image',
  'imageSha256',
]);
const TRANSFORM_KEYS = new Set([
  'scalePpm',
  'sourceFrameSize',
  'sourceTrim',
  'runtimeFrameSize',
  'runtimeTrim',
]);
const SIZE_KEYS = new Set(['width', 'height']);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const TOOLCHAIN_KEYS = new Set([
  'grammar',
  'compositor',
  'encoder',
  'operations',
  'profileSha256',
]);
const BUDGETS_KEYS = new Set([
  'heroCompressed',
  'newMotionCompressed',
  'maxWaveDecoded',
  'hotTextures',
]);
const BUDGET_ENTRY_KEYS = new Set(['bytes', 'limit']);
const COMPOSITOR_KEYS = new Set(['name', 'version']);
const ENCODER_KEYS = new Set(['name', 'version', 'arguments']);
const VISUAL_FIDELITY_ENCODER_KEYS = new Set([
  ...ENCODER_KEYS,
  'profileSha256',
]);
const PREVIEW_OPERATIONS = Object.freeze([
  'crop:normalized-png:shared-trim:repage:png32',
  'resize:lanczos:shared-scale:exact-cell:png32',
  'montage:row-major:bounded-matrix:shared-cell:no-gap:transparent:alpha-on:png-color-type-6',
]);
const VISUAL_FIDELITY_OPERATIONS = Object.freeze([
  'validate:v4-selected-webp:hash-bound-source',
  'validate:v4-selected-webp:exact-copy-byte-proof',
  'copy:v4-selected-webp:exact-media-bytes',
]);
const PREVIEW_PROFILE_SHA256 =
  '71f50b2378a4a588d9e49fb2d29700becb2b4a5ae37078a2af3280284eaa8013';

function fail(message) {
  throw new Error(`motion preview: ${message}`);
}

function requireFact(condition, message) {
  if (!condition) fail(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  requireFact(isObject(value), `${label} must be an object`);
  const actual = Object.keys(value);
  requireFact(
    actual.length === expected.size &&
      actual.every((key) => expected.has(key)),
    `${label} has an unexpected property set`,
  );
}

function arraysEqual(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function portablePreviewPath(value, expected, label) {
  const pathParts =
    typeof value === 'string'
      ? value.replace(/\/$/, '').split('/')
      : [];
  requireFact(
    value === expected &&
      typeof value === 'string' &&
      value.startsWith('.gaf2d-preview/') &&
      !value.includes('\\') &&
      !value.includes('://') &&
      !value.includes('?') &&
      !value.includes('#') &&
      pathParts.every((part) => part && part !== '..'),
    `${label} is not the expected portable preview path`,
  );
}

function validSize(value) {
  exactKeys(value, SIZE_KEYS, 'preview size');
  return (
    Number.isInteger(value.width) &&
    value.width > 0 &&
    Number.isInteger(value.height) &&
    value.height > 0
  );
}

function validRect(value) {
  exactKeys(value, RECT_KEYS, 'preview rect');
  return (
    Number.isInteger(value.x) &&
    value.x >= 0 &&
    Number.isInteger(value.y) &&
    value.y >= 0 &&
    Number.isInteger(value.width) &&
    value.width > 0 &&
    Number.isInteger(value.height) &&
    value.height > 0
  );
}

function validateTransform(value, label, options = {}) {
  exactKeys(value, TRANSFORM_KEYS, label);
  requireFact(
    Number.isInteger(value.scalePpm) &&
      value.scalePpm >= 100_000 &&
      value.scalePpm <= 1_000_000,
    `${label}.scalePpm is invalid`,
  );
  requireFact(validSize(value.sourceFrameSize), `${label}.sourceFrameSize is invalid`);
  requireFact(validRect(value.sourceTrim), `${label}.sourceTrim is invalid`);
  requireFact(validSize(value.runtimeFrameSize), `${label}.runtimeFrameSize is invalid`);
  requireFact(validRect(value.runtimeTrim), `${label}.runtimeTrim is invalid`);
  for (const [size, trim, prefix] of [
    [value.sourceFrameSize, value.sourceTrim, 'source'],
    [value.runtimeFrameSize, value.runtimeTrim, 'runtime'],
  ]) {
    requireFact(
      trim.x + trim.width <= size.width &&
        trim.y + trim.height <= size.height,
      `${label}.${prefix} trim leaves its frame`,
    );
  }
  if (options.smooth) {
    requireFact(
      value.sourceFrameSize.width === 128 && value.sourceFrameSize.height === 128,
      `${label}.sourceFrameSize must be exactly 128x128 for authored-semantic-v3`,
    );
    const scale = value.scalePpm / 1_000_000;
    requireFact(
      value.runtimeFrameSize.width === Math.round(value.sourceFrameSize.width * scale) &&
        value.runtimeFrameSize.height === Math.round(value.sourceFrameSize.height * scale),
      `${label}.runtimeFrameSize must equal round(sourceFrameSize * scalePpm)`,
    );
    requireFact(
      value.runtimeFrameSize.width <= value.sourceFrameSize.width &&
        value.runtimeFrameSize.height <= value.sourceFrameSize.height,
      `${label}.runtimeFrameSize cannot upscale authored-semantic-v3 source frames`,
    );
  }
  if (options.visualFidelity) {
    requireFact(
      value.sourceFrameSize.width === 512 &&
        value.sourceFrameSize.height === 512,
      `${label}.sourceFrameSize must be exactly 512x512 for authored-semantic-v4`,
    );
    requireFact(
      value.runtimeFrameSize.width === value.runtimeFrameSize.height &&
        [256, 320].includes(value.runtimeFrameSize.width),
      `${label}.runtimeFrameSize must be one square 256px or 320px derivative`,
    );
    const scale = value.scalePpm / 1_000_000;
    requireFact(
      value.runtimeFrameSize.width ===
        Math.round(value.sourceFrameSize.width * scale) &&
        value.runtimeFrameSize.height ===
          Math.round(value.sourceFrameSize.height * scale),
      `${label}.runtimeFrameSize must equal round(sourceFrameSize * scalePpm)`,
    );
    requireFact(
      value.runtimeTrim.x === Math.round(value.sourceTrim.x * scale) &&
        value.runtimeTrim.y === Math.round(value.sourceTrim.y * scale) &&
        value.runtimeTrim.width === Math.round(value.sourceTrim.width * scale) &&
        value.runtimeTrim.height === Math.round(value.sourceTrim.height * scale),
      `${label}.runtimeTrim must equal the one shared 512px source transform`,
    );
  }
}

function validateConsumerScale(value, expectedRole, transform, label) {
  const errors = validateConsumerScaleContract(value);
  requireFact(errors.length === 0, `${label} rejected: ${errors.join('; ')}`);
  requireFact(
    value.role === expectedRole,
    `${label}.role must equal trusted role "${expectedRole}"`,
  );
  requireFact(
    value.runtimeCanvasClass === transform.runtimeFrameSize.width &&
      value.runtimeCanvasClass === transform.runtimeFrameSize.height,
    `${label}.runtimeCanvasClass differs from the single runtime derivative`,
  );
}

function validateBudgets(value, { visualFidelity = false } = {}) {
  exactKeys(value, BUDGETS_KEYS, 'manifest.budgets');
  for (const key of Object.keys(value)) {
    exactKeys(value[key], BUDGET_ENTRY_KEYS, `manifest.budgets.${key}`);
    requireFact(
      Number.isInteger(value[key].bytes) &&
        value[key].bytes >= 0 &&
        Number.isInteger(value[key].limit) &&
        value[key].limit > 0 &&
        value[key].bytes <= value[key].limit,
      `manifest.budgets.${key} is invalid`,
    );
  }
  const expected = visualFidelity
    ? VISUAL_FIDELITY_BUDGETS
    : HISTORICAL_SMOOTH_BUDGETS;
  requireFact(
    value.heroCompressed.limit === expected.heroCompressedBytes &&
      value.newMotionCompressed.limit === expected.newMotionCompressedBytes &&
      value.maxWaveDecoded.limit === expected.maxWaveDecodedBytes &&
      value.hotTextures.limit === expected.hotTexturesBytes,
    'manifest.budgets limits are not the exact smooth runtime contract',
  );
}

function validateToolchain(value, options = {}) {
  exactKeys(value, TOOLCHAIN_KEYS, 'toolchain');
  exactKeys(value.compositor, COMPOSITOR_KEYS, 'toolchain.compositor');
  exactKeys(
    value.encoder,
    options.visualFidelity
      ? VISUAL_FIDELITY_ENCODER_KEYS
      : ENCODER_KEYS,
    'toolchain.encoder',
  );
  if (options.visualFidelity) {
    requireFact(
      value.grammar === 'apn-gaf2d-preview-matrix-toolchain-v1' &&
        value.compositor.name === 'HashBoundCopy' &&
        value.compositor.version === 'selected-webp-v1' &&
        value.encoder.name === 'cwebp' &&
        value.encoder.version === '1.6.0' &&
        Array.isArray(value.encoder.arguments) &&
        value.encoder.arguments.length > 0 &&
        value.encoder.arguments.length <= 64 &&
        value.encoder.arguments.every((argument) =>
          typeof argument === 'string') &&
        arraysEqual(value.operations, VISUAL_FIDELITY_OPERATIONS),
      'V4 toolchain structure is invalid',
    );
    const profileErrors = validateQualityProfileBinding({
      grammar: 'gaf2d-visual-quality-profile-binding-v4',
      selectedProfileSha256: value.profileSha256,
      manifestProfileSha256: value.profileSha256,
      encoderProfileSha256: value.encoder.profileSha256,
    });
    requireFact(
      profileErrors.length === 0,
      `V4 toolchain profile rejected: ${profileErrors.join('; ')}`,
    );
    return;
  }
  requireFact(
    value.grammar === 'apn-gaf2d-preview-matrix-toolchain-v1' &&
      value.compositor.name === 'ImageMagick' &&
      value.compositor.version === '7.1.2-13' &&
      value.encoder.name === 'cwebp' &&
      value.encoder.version === '1.6.0' &&
      arraysEqual(value.encoder.arguments, ['-exact', '-q', '90']) &&
      arraysEqual(value.operations, PREVIEW_OPERATIONS) &&
      value.profileSha256 === PREVIEW_PROFILE_SHA256,
    'toolchain differs from the pinned local preview profile',
  );
}

function validateSourceAsset(
  value,
  assetId,
  { smooth, visualFidelity, manifest },
) {
  if (visualFidelity) {
    exactKeys(value, VISUAL_FIDELITY_SOURCE_ASSET_KEYS, `assets.${assetId}`);
    for (const key of [
      'derivativeSetSha256',
      'masterSetSha256',
      'selectedProfileSha256',
      'sourceBatchSha256',
      'v3LineageSha256',
    ]) {
      requireFact(
        SHA256.test(value[key] || ''),
        `assets.${assetId}.${key} is invalid`,
      );
    }
    requireFact(
      value.sourceManifestVersion === 4 &&
        value.sourceBatchSha256 === manifest.source.batchSummarySha256 &&
        value.selectedProfileSha256 === manifest.toolchain.profileSha256,
      `assets.${assetId} V4 root lineage is stale`,
    );
    return;
  }
  exactKeys(
    value,
    smooth ? SMOOTH_SOURCE_ASSET_KEYS : SOURCE_ASSET_KEYS,
    `assets.${assetId}`,
  );
  requireFact(
    typeof value.candidateId === 'string' &&
      value.candidateId.startsWith(`${assetId}-authored-semantic-v`),
    `assets.${assetId}.candidateId is stale`,
  );
  for (const key of [
    'assetManifestSha256',
    'candidateSha256',
    'clipManifestSha256',
    'frameHashesSha256',
    'identitySha256',
    'qaSummarySha256',
    'reviewEvidenceSha256',
    'reviewHtmlSha256',
  ]) {
    requireFact(
      SHA256.test(value[key] || ''),
      `assets.${assetId}.${key} is invalid`,
    );
  }
  requireFact(
    Number.isInteger(value.sourceManifestVersion) &&
      value.sourceManifestVersion > 0,
    `assets.${assetId}.sourceManifestVersion is invalid`,
  );
  if (smooth) {
    requireFact(
      SHA256.test(value.actingContractSha256 || '') &&
        SHA256.test(value.temporalEvidenceSha256 || ''),
      `assets.${assetId} smooth lineage hashes are invalid`,
    );
  }
}

function validateManifest(manifest) {
  const visualFidelity =
    manifest.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY;
  const smooth =
    manifest.sourceFamily === 'authored-semantic-v3' || visualFidelity;
  exactKeys(manifest, smooth ? SMOOTH_TOP_KEYS : TOP_KEYS, 'manifest');
  requireFact(
    manifest.grammar === 'apn-gaf2d-motion-preview-manifest-v1' &&
      manifest.authority === 'unapproved_preview' &&
      manifest.status === 'human_review_required' &&
      [
        'authored-semantic-v2',
        'authored-semantic-v3',
        VISUAL_FIDELITY_SOURCE_FAMILY,
      ].includes(
        manifest.sourceFamily,
      ) &&
      manifest.packId === 'valorant',
    'manifest identity/authority is invalid',
  );
  exactKeys(manifest.counts, COUNTS_KEYS, 'manifest.counts');
  requireFact(
    manifest.counts.assets === 7 &&
      manifest.counts.clips === 39 &&
      manifest.counts.frames === (smooth ? 795 : 276),
    `manifest counts must be exactly 7/39/${smooth ? 795 : 276}`,
  );
  exactKeys(
    manifest.source,
    smooth ? SMOOTH_SOURCE_KEYS : SOURCE_KEYS,
    'manifest.source',
  );
  requireFact(
    SHA256.test(manifest.source.batchSummarySha256 || '') &&
      manifest.source.contract ===
        (visualFidelity
          ? 'apn-visual-fidelity-v4-batch-v1'
          : smooth
          ? 'apn-offline-authored-motion-v3'
          : 'apn-offline-authored-motion-v1') &&
      manifest.source.mechanicalQa === 'passed' &&
      manifest.source.creativeApproval === 'human_required' &&
      manifest.source.networkCalls === 0 &&
      manifest.source.providerCalls === 0 &&
      manifest.source.providerClipCount === 0,
    'manifest source gate is invalid',
  );
  if (smooth) {
    requireFact(
      manifest.source.actingContractPath ===
        'briefs/authored-semantic-v3/acting-contract.json' &&
        SHA256.test(manifest.source.actingContractSha256 || ''),
      'manifest smooth acting contract binding is invalid',
    );
  }
  requireFact(
    isObject(manifest.assets) &&
      Object.keys(manifest.assets).length === SOURCE_ASSET_IDS.length &&
      SOURCE_ASSET_IDS.every((assetId) =>
        Object.hasOwn(manifest.assets, assetId)),
    'manifest source asset membership is invalid',
  );
  for (const assetId of SOURCE_ASSET_IDS) {
    validateSourceAsset(manifest.assets[assetId], assetId, {
      smooth,
      visualFidelity,
      manifest,
    });
  }
  if (smooth && !visualFidelity) {
    requireFact(
      Object.values(manifest.assets).every(
        (asset) =>
          asset.actingContractSha256 ===
          manifest.source.actingContractSha256,
      ),
      'manifest smooth assets do not share the root acting contract authority',
    );
  }

  exactKeys(
    manifest.hero,
    visualFidelity
      ? VISUAL_FIDELITY_HERO_KEYS
      : smooth
        ? SMOOTH_HERO_KEYS
        : HERO_KEYS,
    'manifest.hero',
  );
  requireFact(
    manifest.hero.authority === 'unapproved_preview' &&
      manifest.hero.assetId === 'apn-hero' &&
      SHA256.test(manifest.hero.setSha256 || ''),
    'manifest Hero authority is invalid',
  );
  if (smooth) {
    requireFact(manifest.hero.role === 'hero', 'manifest.hero.role must be "hero"');
  }
  portablePreviewPath(
    manifest.hero.basePath,
    '.gaf2d-preview/hero/',
    'manifest.hero.basePath',
  );
  portablePreviewPath(
    manifest.hero.set,
    '.gaf2d-preview/hero/set.json',
    'manifest.hero.set',
  );
  requireFact(
    isObject(manifest.hero.clips) &&
      Object.keys(manifest.hero.clips).length === HERO_V3_CLIPS.length &&
      HERO_V3_CLIPS.every((name) =>
        Object.hasOwn(manifest.hero.clips, name)),
    'manifest Hero clip membership is invalid',
  );
  for (const name of HERO_V3_CLIPS) {
    const record = manifest.hero.clips[name];
    exactKeys(record, FILE_KEYS, `manifest.hero.clips.${name}`);
    portablePreviewPath(
      record.descriptor,
      `.gaf2d-preview/hero/${name}.json`,
      `manifest.hero.clips.${name}.descriptor`,
    );
    portablePreviewPath(
      record.image,
      `.gaf2d-preview/hero/${name}.webp`,
      `manifest.hero.clips.${name}.image`,
    );
    requireFact(
      SHA256.test(record.descriptorSha256 || '') &&
        SHA256.test(record.imageSha256 || ''),
      `manifest.hero.clips.${name} hashes are invalid`,
    );
  }
  validateTransform(manifest.hero.transform, 'manifest.hero.transform', {
    smooth: smooth && !visualFidelity,
    visualFidelity,
  });
  if (visualFidelity) {
    validateConsumerScale(
      manifest.hero.consumerScale,
      CONSUMER_ROLES['apn-hero'],
      manifest.hero.transform,
      'manifest.hero.consumerScale',
    );
  }

  requireFact(
    isObject(manifest.characters) &&
      Object.keys(manifest.characters).length ===
        Object.keys(CHARACTER_ROLES).length &&
      Object.keys(CHARACTER_ROLES).every((assetId) =>
        Object.hasOwn(manifest.characters, assetId)),
    'manifest creature membership is invalid',
  );
  for (const [assetId, role] of Object.entries(CHARACTER_ROLES)) {
    const record = manifest.characters[assetId];
    if (smooth) {
      exactKeys(
        record,
        visualFidelity
          ? VISUAL_FIDELITY_CHARACTER_KEYS
          : SMOOTH_CHARACTER_KEYS,
        `manifest.characters.${assetId}`,
      );
      requireFact(
        record.assetId === assetId &&
          record.authority === 'unapproved_preview' &&
          record.role === role &&
          SHA256.test(record.setSha256 || ''),
        `manifest.characters.${assetId} authority/set hash is invalid`,
      );
      portablePreviewPath(
        record.basePath,
        `.gaf2d-preview/characters/${assetId}/`,
        `manifest.characters.${assetId}.basePath`,
      );
      portablePreviewPath(
        record.set,
        `.gaf2d-preview/characters/${assetId}/set.json`,
        `manifest.characters.${assetId}.set`,
      );
      requireFact(
        isObject(record.clips) &&
          Object.keys(record.clips).length >= 5,
        `manifest.characters.${assetId}.clips are invalid`,
      );
      for (const [clipName, clipRecord] of Object.entries(record.clips)) {
        exactKeys(
          clipRecord,
          FILE_KEYS,
          `manifest.characters.${assetId}.clips.${clipName}`,
        );
        portablePreviewPath(
          clipRecord.descriptor,
          `.gaf2d-preview/characters/${assetId}/${clipName}.json`,
          `manifest.characters.${assetId}.clips.${clipName}.descriptor`,
        );
        portablePreviewPath(
          clipRecord.image,
          `.gaf2d-preview/characters/${assetId}/${clipName}.webp`,
          `manifest.characters.${assetId}.clips.${clipName}.image`,
        );
        requireFact(
          SHA256.test(clipRecord.descriptorSha256 || '') &&
            SHA256.test(clipRecord.imageSha256 || ''),
          `manifest.characters.${assetId}.clips.${clipName} hashes are invalid`,
        );
      }
    } else {
      exactKeys(record, CHARACTER_KEYS, `manifest.characters.${assetId}`);
      requireFact(
        record.authority === 'unapproved_preview' &&
          record.role === role &&
          SHA256.test(record.descriptorSha256 || '') &&
          SHA256.test(record.imageSha256 || ''),
        `manifest.characters.${assetId} authority/hashes are invalid`,
      );
      portablePreviewPath(
        record.descriptor,
        `.gaf2d-preview/characters/${assetId}/motion.json`,
        `manifest.characters.${assetId}.descriptor`,
      );
      portablePreviewPath(
        record.image,
        `.gaf2d-preview/characters/${assetId}/motion.webp`,
        `manifest.characters.${assetId}.image`,
      );
    }
    validateTransform(record.transform, `manifest.characters.${assetId}.transform`, {
      smooth: smooth && !visualFidelity,
      visualFidelity,
    });
    if (visualFidelity) {
      validateConsumerScale(
        record.consumerScale,
        CONSUMER_ROLES[assetId],
        record.transform,
        `manifest.characters.${assetId}.consumerScale`,
      );
    }
  }
  if (smooth) validateBudgets(manifest.budgets, { visualFidelity });
  validateToolchain(manifest.toolchain, { visualFidelity });
}

async function defaultHashBytes(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchBytes(fetchImpl, url, maximumBytes, label) {
  let response;
  try {
    response = await fetchImpl(url);
  } catch {
    fail(`${label} fetch failed`);
  }
  if (!response?.ok) {
    const status = Number.isInteger(response?.status)
      ? response.status
      : 'unknown';
    fail(`${label} fetch failed with status ${status}`);
  }
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    fail(`${label} exceeds ${maximumBytes} bytes`);
  }
  let buffer;
  try {
    buffer = await response.arrayBuffer();
  } catch {
    fail(`${label} response could not be read`);
  }
  let bytes;
  try {
    bytes = new Uint8Array(buffer);
  } catch {
    fail(`${label} response is not binary data`);
  }
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes) {
    fail(`${label} is empty or exceeds ${maximumBytes} bytes`);
  }
  return bytes;
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(fatalDecoder.decode(bytes));
  } catch {
    fail(`${label} is invalid UTF-8 JSON`);
  }
}

async function fetchHashLockedBytes({
  fetchImpl,
  hashBytes,
  url,
  expectedSha256,
  maximumBytes,
  label,
}) {
  const bytes = await fetchBytes(fetchImpl, url, maximumBytes, label);
  let actualSha256;
  try {
    actualSha256 = await hashBytes(bytes);
  } catch {
    fail(`${label} SHA-256 could not be computed`);
  }
  requireFact(
    actualSha256 === expectedSha256,
    `${label} SHA-256 mismatch`,
  );
  return bytes;
}

async function fetchHashLockedJson(options) {
  const bytes = await fetchHashLockedBytes(options);
  const { label } = options;
  return parseJson(bytes, label);
}

function validatePreviewLineage(lineage, manifest, assetId, label) {
  const source = manifest.assets[assetId];
  requireFact(
    lineage?.candidateId === source.candidateId &&
      lineage?.candidateSha256 === source.candidateSha256 &&
      lineage?.qaSummarySha256 === source.qaSummarySha256 &&
      lineage?.batchSummarySha256 ===
        manifest.source.batchSummarySha256 &&
      lineage?.sourceManifestVersion === source.sourceManifestVersion,
    `${label} differs from the root source authority`,
  );
  if (Object.hasOwn(source, 'temporalEvidenceSha256')) {
    requireFact(
      lineage?.temporalEvidenceSha256 === source.temporalEvidenceSha256,
      `${label} differs from the root temporal evidence authority`,
    );
  }
}

function validateTransformBinding(set, transform, label) {
  requireFact(
    set?.frameSize?.width === transform.runtimeFrameSize.width &&
      set?.frameSize?.height === transform.runtimeFrameSize.height,
    `${label} frameSize differs from its manifest transform`,
  );
  requireFact(
    set?.trim?.x === transform.runtimeTrim.x &&
      set?.trim?.y === transform.runtimeTrim.y &&
      set?.trim?.width === transform.runtimeTrim.width &&
      set?.trim?.height === transform.runtimeTrim.height,
    `${label} trim differs from its manifest transform`,
  );
}

function validateVisualFidelityBinding(manifest, set, record, label) {
  const source = manifest.assets[record.assetId];
  requireFact(
    JSON.stringify(set.consumerScale) ===
      JSON.stringify(record.consumerScale),
    `${label} consumer scale differs from the root manifest`,
  );
  const profileErrors = validateQualityProfileBinding({
    grammar: 'gaf2d-visual-quality-profile-binding-v4',
    selectedProfileSha256: manifest.toolchain.profileSha256,
    manifestProfileSha256: set.toolchain?.profileSha256,
    encoderProfileSha256: set.toolchain?.encoder?.profileSha256,
  });
  requireFact(
    profileErrors.length === 0,
    `${label} quality profile rejected: ${profileErrors.join('; ')}`,
  );
  requireFact(
    set.lineage?.sourceBatchSha256 === source.sourceBatchSha256 &&
      set.lineage?.derivativeSetSha256 === source.derivativeSetSha256 &&
      set.lineage?.masterSetSha256 === source.masterSetSha256 &&
      set.lineage?.selectedProfileSha256 === source.selectedProfileSha256 &&
      set.lineage?.v3LineageSha256 === source.v3LineageSha256,
    `${label} V4 derivative lineage differs from the root authority`,
  );
}

function buildOverlay(packs, manifest) {
  const smooth = [
    'authored-semantic-v3',
    VISUAL_FIDELITY_SOURCE_FAMILY,
  ].includes(manifest.sourceFamily);
  const characters = Object.freeze(
    Object.fromEntries(
      Object.entries(manifest.characters).map(([assetId, record]) => [
        assetId,
        Object.freeze(
          smooth
            ? {
                authority: 'unapproved_preview',
                role: record.role,
                basePath: record.basePath,
                set: record.set,
                setSha256: record.setSha256,
                clips: structuredClone(record.clips),
                ...(record.consumerScale
                  ? { consumerScale: structuredClone(record.consumerScale) }
                  : {}),
                ...(manifest.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY
                  ? {
                      sourceFamily: VISUAL_FIDELITY_SOURCE_FAMILY,
                      selectedProfileSha256:
                        manifest.toolchain.profileSha256,
                    }
                  : {}),
              }
            : {
                authority: 'unapproved_preview',
                descriptor: record.descriptor,
                descriptorSha256: record.descriptorSha256,
                image: record.image,
              },
        ),
      ]),
    ),
  );
  const motion = Object.freeze({
    grammar: 'gaf2d-motion-preview-map-v1',
    authority: 'unapproved_preview',
    characters,
  });
  let foundValorant = false;
  const overlay = packs.map((pack) => {
    if (pack.id !== manifest.packId) return pack;
    foundValorant = true;
    return Object.freeze({ ...pack, motion });
  });
  requireFact(foundValorant, 'production catalog has no Valorant pack');
  return Object.freeze(overlay);
}

export function isMotionPreviewRequested(locationLike = globalThis.location) {
  const hostname = String(locationLike?.hostname || '');
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') return false;
  const parameters = new URLSearchParams(String(locationLike?.search || ''));
  return parameters.get('motion-preview') === '1';
}

export async function loadMotionPreview(options = {}) {
  const packs = options.packs;
  requireFact(Array.isArray(packs), 'production pack catalog is required');
  const locationLike = options.locationLike ?? globalThis.location;
  const requested = isMotionPreviewRequested(locationLike);
  const fallback = {
    requested,
    active: false,
    authority: null,
    packs,
    heroBasePath: PRODUCTION_HERO_BASE,
    manifest: null,
    manifestSha256: null,
    batchSummarySha256: null,
    error: null,
  };
  if (!requested) return fallback;

  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const hashBytes = options.hashBytes ?? defaultHashBytes;
  try {
    const manifestBytes = await fetchBytes(
      fetchImpl,
      MANIFEST_PATH,
      MAX_MANIFEST_BYTES,
      'preview manifest',
    );
    let manifestSha256;
    try {
      manifestSha256 = await hashBytes(manifestBytes);
    } catch {
      fail('preview manifest SHA-256 could not be computed');
    }
    requireFact(
      SHA256.test(manifestSha256 || ''),
      'preview manifest SHA-256 is invalid',
    );
    const manifest = parseJson(manifestBytes, 'preview manifest');
    validateManifest(manifest);

    if (
      manifest.sourceFamily === 'authored-semantic-v3' ||
      manifest.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY
    ) {
      const visualFidelity =
        manifest.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY;
      const heroSet = await fetchHashLockedJson({
        fetchImpl,
        hashBytes,
        url: manifest.hero.set,
        expectedSha256: manifest.hero.setSha256,
        maximumBytes: MAX_SET_BYTES,
        label: 'APN Hero preview set',
      });
      const heroSetErrors = validateMotionSetIndex(heroSet, 'apn-hero', {
        role: 'hero',
        ...(visualFidelity ? { consumerRole: 'hero' } : {}),
      });
      requireFact(
        heroSetErrors.length === 0,
        `APN Hero preview set rejected: ${heroSetErrors.join('; ')}`,
      );
      if (!visualFidelity) {
        validatePreviewLineage(
          heroSet.previewLineage,
          manifest,
          'apn-hero',
          'APN Hero preview set lineage',
        );
      }
      validateTransformBinding(
        heroSet,
        manifest.hero.transform,
        'APN Hero preview set',
      );
      if (visualFidelity) {
        validateVisualFidelityBinding(
          manifest,
          heroSet,
          manifest.hero,
          'APN Hero preview set',
        );
      }
      for (const name of HERO_V3_CLIPS) {
        const record = manifest.hero.clips[name];
        requireFact(
          heroSet.clips?.[name]?.descriptor === `${name}.json` &&
            heroSet.clips?.[name]?.descriptorSha256 === record.descriptorSha256 &&
            heroSet.clips?.[name]?.image === `${name}.webp` &&
            heroSet.clips?.[name]?.imageSha256 === record.imageSha256,
          `APN Hero/${name} set and root manifest differ`,
        );
      }
      const creatureSets = await Promise.all(
        Object.entries(CHARACTER_ROLES).map(async ([assetId, role]) => {
          const record = manifest.characters[assetId];
          const set = await fetchHashLockedJson({
            fetchImpl,
            hashBytes,
            url: record.set,
            expectedSha256: record.setSha256,
            maximumBytes: MAX_SET_BYTES,
            label: `${assetId} preview set`,
          });
          const errors = validateMotionSetIndex(set, assetId, {
            role,
            ...(visualFidelity
              ? { consumerRole: CONSUMER_ROLES[assetId] }
              : {}),
          });
          requireFact(
            errors.length === 0,
            `${assetId} preview set rejected: ${errors.join('; ')}`,
          );
          if (!visualFidelity) {
            validatePreviewLineage(
              set.previewLineage,
              manifest,
              assetId,
              `${assetId} preview set lineage`,
            );
            requireFact(
              manifest.assets[assetId].actingContractSha256 ===
                manifest.source.actingContractSha256,
              `${assetId} acting contract differs from the smooth root authority`,
            );
          }
          validateTransformBinding(
            set,
            record.transform,
            `${assetId} preview set`,
          );
          if (visualFidelity) {
            validateVisualFidelityBinding(
              manifest,
              set,
              record,
              `${assetId} preview set`,
            );
          }
          return { assetId, role, record, set };
        }),
      );
      for (const { assetId, role, record, set } of creatureSets) {
        for (const [clipName, clipRecord] of Object.entries(record.clips)) {
          requireFact(
            set.clips?.[clipName]?.descriptor === `${clipName}.json` &&
              set.clips?.[clipName]?.descriptorSha256 ===
                clipRecord.descriptorSha256 &&
              set.clips?.[clipName]?.image === `${clipName}.webp` &&
              set.clips?.[clipName]?.imageSha256 === clipRecord.imageSha256,
            `${assetId}/${clipName} set and root manifest differ`,
          );
        }
      }
    } else {
      const set = await fetchHashLockedJson({
        fetchImpl,
        hashBytes,
        url: manifest.hero.set,
        expectedSha256: manifest.hero.setSha256,
        maximumBytes: MAX_SET_BYTES,
        label: 'APN Hero preview set',
      });
      const setErrors = validateHeroSetManifest(set, {
        allowUnapprovedPreview: true,
      });
      requireFact(
        setErrors.length === 0,
        `APN Hero preview set rejected: ${setErrors.join('; ')}`,
      );
      validatePreviewLineage(
        set.previewLineage,
        manifest,
        'apn-hero',
        'APN Hero preview set lineage',
      );
      const heroMedia = await Promise.all(
        HERO_V3_CLIPS.map(async (name) => {
          const record = manifest.hero.clips[name];
          const setRecord = set.clips[name];
          requireFact(
            setRecord?.descriptor === `${name}.json` &&
              setRecord?.descriptorSha256 === record.descriptorSha256 &&
              setRecord?.image === `${name}.webp` &&
              setRecord?.imageSha256 === record.imageSha256,
            `APN Hero/${name} set and root manifest differ`,
          );
          const descriptor = await fetchHashLockedJson({
            fetchImpl,
            hashBytes,
            url: record.descriptor,
            expectedSha256: record.descriptorSha256,
            maximumBytes: MAX_DESCRIPTOR_BYTES,
            label: `APN Hero/${name} preview descriptor`,
          });
          const errors = validateHeroClipDescriptor(
            descriptor,
            name,
            set,
            { allowUnapprovedPreview: true },
          );
          requireFact(
            errors.length === 0,
            `APN Hero/${name} preview descriptor rejected: ${errors.join('; ')}`,
          );
          requireFact(
            descriptor.atlas.sha256 === record.imageSha256,
            `APN Hero/${name} image hash differs from its descriptor`,
          );
          validatePreviewLineage(
            descriptor.previewLineage,
            manifest,
            'apn-hero',
            `APN Hero/${name} preview lineage`,
          );
          return { name, record };
        }),
      );
      for (const { name, record } of heroMedia) {
        await fetchHashLockedBytes({
          fetchImpl,
          hashBytes,
          url: record.image,
          expectedSha256: record.imageSha256,
          maximumBytes: MAX_HERO_IMAGE_BYTES,
          label: `APN Hero/${name} preview image`,
        });
      }
      const creatureMedia = await Promise.all(
        Object.entries(CHARACTER_ROLES).map(async ([assetId, role]) => {
          const record = manifest.characters[assetId];
          const descriptor = await fetchHashLockedJson({
            fetchImpl,
            hashBytes,
            url: record.descriptor,
            expectedSha256: record.descriptorSha256,
            maximumBytes: MAX_DESCRIPTOR_BYTES,
            label: `${assetId} preview descriptor`,
          });
          const errors = validateMotionPreviewBundle(
            descriptor,
            assetId,
            { role },
          );
          requireFact(
            errors.length === 0,
            `${assetId} preview descriptor rejected: ${errors.join('; ')}`,
          );
          requireFact(
            descriptor.atlas.sha256 === record.imageSha256,
            `${assetId} image hash differs from its descriptor`,
          );
          validatePreviewLineage(
            descriptor.previewLineage,
            manifest,
            assetId,
            `${assetId} preview lineage`,
          );
          return { assetId, record, role };
        }),
      );
      for (const { assetId, record, role } of creatureMedia) {
        await fetchHashLockedBytes({
          fetchImpl,
          hashBytes,
          url: record.image,
          expectedSha256: record.imageSha256,
          maximumBytes:
            role === 'boss'
              ? MAX_BOSS_MEDIA_BYTES
              : MAX_COMMON_MEDIA_BYTES,
          label: `${assetId} preview image`,
        });
      }
    }

    return {
      requested: true,
      active: true,
      authority: 'unapproved_preview',
      packs: buildOverlay(packs, manifest),
      heroBasePath: manifest.hero.basePath,
      manifest,
      manifestSha256,
      batchSummarySha256: manifest.source.batchSummarySha256,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error &&
      error.message.startsWith('motion preview: ')
        ? error.message
        : 'motion preview: preview preflight failed';
    return {
      ...fallback,
      error: message,
    };
  }
}
