import {
  validateMotionPreviewBundle,
} from './motion-bundle.js?v=gaf2d-motion-v1';
import {
  HERO_V3_CLIPS,
  MAX_HERO_IMAGE_BYTES,
  validateHeroClipDescriptor,
  validateHeroSetManifest,
} from './hero-v3-contract.js?v=gaf2d-motion-v1';

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
const HERO_KEYS = new Set([
  'authority',
  'assetId',
  'basePath',
  'set',
  'setSha256',
  'clips',
  'transform',
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
const COMPOSITOR_KEYS = new Set(['name', 'version']);
const ENCODER_KEYS = new Set(['name', 'version', 'arguments']);
const PREVIEW_OPERATIONS = Object.freeze([
  'crop:normalized-png:shared-trim:repage:png32',
  'resize:lanczos:shared-scale:exact-cell:png32',
  'montage:row-major:bounded-matrix:shared-cell:no-gap:transparent:alpha-on:png-color-type-6',
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

function validateTransform(value, label) {
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
}

function validateToolchain(value) {
  exactKeys(value, TOOLCHAIN_KEYS, 'toolchain');
  exactKeys(value.compositor, COMPOSITOR_KEYS, 'toolchain.compositor');
  exactKeys(value.encoder, ENCODER_KEYS, 'toolchain.encoder');
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

function validateSourceAsset(value, assetId) {
  exactKeys(value, SOURCE_ASSET_KEYS, `assets.${assetId}`);
  requireFact(
    value.candidateId === `${assetId}-authored-semantic-v2`,
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
}

function validateManifest(manifest) {
  exactKeys(manifest, TOP_KEYS, 'manifest');
  requireFact(
    manifest.grammar === 'apn-gaf2d-motion-preview-manifest-v1' &&
      manifest.authority === 'unapproved_preview' &&
      manifest.status === 'human_review_required' &&
      manifest.sourceFamily === 'authored-semantic-v2' &&
      manifest.packId === 'valorant',
    'manifest identity/authority is invalid',
  );
  exactKeys(manifest.counts, COUNTS_KEYS, 'manifest.counts');
  requireFact(
    manifest.counts.assets === 7 &&
      manifest.counts.clips === 39 &&
      manifest.counts.frames === 276,
    'manifest counts must be exactly 7/39/276',
  );
  exactKeys(manifest.source, SOURCE_KEYS, 'manifest.source');
  requireFact(
    SHA256.test(manifest.source.batchSummarySha256 || '') &&
      manifest.source.contract === 'apn-offline-authored-motion-v1' &&
      manifest.source.mechanicalQa === 'passed' &&
      manifest.source.creativeApproval === 'human_required' &&
      manifest.source.networkCalls === 0 &&
      manifest.source.providerCalls === 0 &&
      manifest.source.providerClipCount === 0,
    'manifest source gate is invalid',
  );
  requireFact(
    isObject(manifest.assets) &&
      Object.keys(manifest.assets).length === SOURCE_ASSET_IDS.length &&
      SOURCE_ASSET_IDS.every((assetId) =>
        Object.hasOwn(manifest.assets, assetId)),
    'manifest source asset membership is invalid',
  );
  for (const assetId of SOURCE_ASSET_IDS) {
    validateSourceAsset(manifest.assets[assetId], assetId);
  }

  exactKeys(manifest.hero, HERO_KEYS, 'manifest.hero');
  requireFact(
    manifest.hero.authority === 'unapproved_preview' &&
      manifest.hero.assetId === 'apn-hero' &&
      SHA256.test(manifest.hero.setSha256 || ''),
    'manifest Hero authority is invalid',
  );
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
  validateTransform(manifest.hero.transform, 'manifest.hero.transform');

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
    validateTransform(
      record.transform,
      `manifest.characters.${assetId}.transform`,
    );
  }
  validateToolchain(manifest.toolchain);
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
}

function buildOverlay(packs, manifest) {
  const characters = Object.freeze(
    Object.fromEntries(
      Object.entries(manifest.characters).map(([assetId, record]) => [
        assetId,
        Object.freeze({
          authority: 'unapproved_preview',
          descriptor: record.descriptor,
          descriptorSha256: record.descriptorSha256,
          image: record.image,
        }),
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
    const manifest = parseJson(manifestBytes, 'preview manifest');
    validateManifest(manifest);

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

    return {
      requested: true,
      active: true,
      authority: 'unapproved_preview',
      packs: buildOverlay(packs, manifest),
      heroBasePath: manifest.hero.basePath,
      manifest,
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
