import {
  drawMotionFrame,
  frameIndexForClip,
  validateMotionClipDescriptor,
  validateMotionSetIndex,
} from './motion-bundle.js?v=gaf2d-motion-v1';
import {
  HERO_V3_CLIPS,
  validateHeroClipDescriptor,
  validateHeroSetManifest,
} from './hero-v3-contract.js?v=gaf2d-motion-v1';
import { isMotionPreviewRequested } from './motion-preview.js?v=gaf2d-motion-v1';
import {
  validateConsumerScaleContract,
  validateQualityProfileBinding,
  visualFidelityEncodedLimit,
} from './visual-fidelity-v4.js?v=gaf2d-motion-v1';

const MAX_SET_BYTES = 64 * 1024;
const MAX_DESCRIPTOR_BYTES = 256 * 1024;
const MAX_HERO_IMAGE_BYTES = 640 * 1024;
const MAX_COMMON_MEDIA_BYTES = 6 * 1024 * 1024;
const MAX_BOSS_MEDIA_BYTES = 8 * 1024 * 1024;
const MAX_SMOOTH_CHARACTER_IMAGE_BYTES = 160 * 1024;
const MAX_SMOOTH_BOSS_IMAGE_BYTES = 240 * 1024;
const PREVIEW_STORAGE_PREFIX = 'apn-motion-review-v1';
const HERO_ASSET_ID = 'apn-hero';
const SHA256 = /^[a-f0-9]{64}$/;
const fatalDecoder = new TextDecoder('utf-8', { fatal: true });
const SMOOTH_TRANSFORM_KEYS = Object.freeze([
  'scalePpm',
  'sourceFrameSize',
  'sourceTrim',
  'runtimeFrameSize',
  'runtimeTrim',
]);
const SIZE_KEYS = Object.freeze(['width', 'height']);
const RECT_KEYS = Object.freeze(['x', 'y', 'width', 'height']);
const V4_ROOT_LINEAGE_KEYS = Object.freeze([
  'derivativeSetSha256',
  'masterSetSha256',
  'selectedProfileSha256',
  'sourceBatchSha256',
  'sourceManifestVersion',
  'v3LineageSha256',
]);

const ASSET_LABELS = Object.freeze({
  'apn-hero': 'APN Hero',
  'entry-runner': 'Entry Runner',
  'protocol-courier': 'Protocol Courier',
  'signal-hunter': 'Signal Hunter',
  'site-sentinel': 'Site Sentinel',
  'site-warden': 'Site Warden',
  'veil-operator': 'Veil Operator',
});
const COMMON_CREATURE_CLIPS = Object.freeze([
  'idle',
  'advance',
  'engaged',
  'hit',
  'death',
]);
const CREATURE_CLIPS = Object.freeze({
  'entry-runner': COMMON_CREATURE_CLIPS,
  'protocol-courier': COMMON_CREATURE_CLIPS,
  'signal-hunter': COMMON_CREATURE_CLIPS,
  'site-sentinel': COMMON_CREATURE_CLIPS,
  'site-warden': Object.freeze([...COMMON_CREATURE_CLIPS, 'broken']),
  'veil-operator': COMMON_CREATURE_CLIPS,
});
const CREATURE_ASSET_IDS = Object.freeze(Object.keys(CREATURE_CLIPS));
const CURRENT_REVIEW_SOURCE_FAMILY = 'authored-semantic-v4';
const HISTORICAL_REVIEW_SOURCE_FAMILY = 'authored-semantic-v3';
const CONSUMER_ROLES = Object.freeze({
  'apn-hero': 'hero',
  'entry-runner': 'standard',
  'protocol-courier': 'standard',
  'signal-hunter': 'standard',
  'site-sentinel': 'elite',
  'site-warden': 'boss',
  'veil-operator': 'standard',
});

export function isMotionReviewSourceFamily(sourceFamily) {
  return (
    sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY ||
    sourceFamily === HISTORICAL_REVIEW_SOURCE_FAMILY
  );
}

function fail(message) {
  throw new Error(`motion review: ${message}`);
}

function requireFact(condition, message) {
  if (!condition) fail(message);
}

export function configureDprCanvas(
  canvas,
  context,
  { cssWidth, cssHeight, dpr },
) {
  requireFact(
    Number.isFinite(cssWidth) && cssWidth > 0 &&
      Number.isFinite(cssHeight) && cssHeight > 0,
    'review canvas CSS dimensions are invalid',
  );
  const effectiveDpr = Math.min(2, Math.max(1, Number(dpr) || 1));
  const resolvedCssWidth = Math.round(cssWidth);
  const resolvedCssHeight = Math.round(cssHeight);
  const backingWidth = Math.round(resolvedCssWidth * effectiveDpr);
  const backingHeight = Math.round(resolvedCssHeight * effectiveDpr);
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;
  context.setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0);
  return Object.freeze({
    cssWidth: resolvedCssWidth,
    cssHeight: resolvedCssHeight,
    dpr: effectiveDpr,
    backingWidth,
    backingHeight,
  });
}

export function reviewScaleMetrics(runtime, options = {}) {
  const mode = options.mode;
  requireFact(
    mode === 'actual-game-size' || mode === 'inspection',
    'review scale mode must be actual-game-size or inspection',
  );
  const consumerScale = runtime?.consumerScale;
  const errors = validateConsumerScaleContract(consumerScale);
  const dpr = Math.min(2, Math.max(1, Number(options.dpr) || 1));
  const sourceVisiblePixels = Number(consumerScale?.sourceVisiblePixels) || 0;
  const cssBodyHeight =
    mode === 'actual-game-size'
      ? Number(consumerScale?.maximumCssBodyHeight) || 0
      : Math.floor(sourceVisiblePixels / dpr);
  const displayedDevicePixels = Math.round(cssBodyHeight * dpr);
  const scaleRatio =
    sourceVisiblePixels > 0
      ? displayedDevicePixels / sourceVisiblePixels
      : Number.POSITIVE_INFINITY;
  const drawAllowed =
    errors.length === 0 &&
    cssBodyHeight > 0 &&
    Number.isFinite(scaleRatio) &&
    scaleRatio <= 1;
  return Object.freeze({
    mode,
    cssBodyHeight,
    dpr,
    displayedDevicePixels,
    sourceVisiblePixels,
    scaleRatio,
    runtimeCanvasClass: consumerScale?.runtimeCanvasClass ?? null,
    drawAllowed,
    viewCreditAllowed: drawAllowed && mode === 'actual-game-size',
    errors: Object.freeze([...errors]),
  });
}

export function reviewCycleComplete(runtime, elapsedSeconds) {
  if (
    !Number.isInteger(runtime?.frameCount) ||
    runtime.frameCount <= 0 ||
    !Number.isFinite(runtime?.fps) ||
    runtime.fps <= 0 ||
    !Number.isFinite(elapsedSeconds)
  ) {
    return false;
  }
  return Math.max(0, elapsedSeconds) >= runtime.frameCount / runtime.fps;
}

export function reviewCreditEligible(runtime, elapsedSeconds, scaleMetrics) {
  return (
    scaleMetrics &&
    scaleMetrics.viewCreditAllowed === true &&
    scaleMetrics.scaleRatio <= 1 &&
    reviewCycleComplete(runtime, elapsedSeconds)
  );
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactPortablePath(value, prefix, suffix, label) {
  requireFact(
    typeof value === 'string' &&
      value.startsWith(prefix) &&
      value.endsWith(suffix) &&
      !value.includes('..') &&
      !value.includes('\\') &&
      !value.includes('://') &&
      !value.includes('?') &&
      !value.includes('#'),
    `${label} is not a portable preview path`,
  );
}

function clipCycleSeconds(runtime) {
  const frameSeconds = runtime.frameCount / runtime.fps;
  return runtime.playback === 'loop' ? frameSeconds : frameSeconds + 0.35;
}

function progressValueForRuntime(runtime, elapsedSeconds) {
  if (runtime.playback === 'loop') return Math.max(0, elapsedSeconds);
  const frameSeconds = runtime.frameCount / runtime.fps;
  const cycleSeconds = clipCycleSeconds(runtime);
  const phase = Math.max(0, elapsedSeconds) % cycleSeconds;
  return Math.min(phase / frameSeconds, 1);
}

function assetIdOrder() {
  return [HERO_ASSET_ID, ...CREATURE_ASSET_IDS];
}

function hasExactKeys(value, expected) {
  return (
    isObject(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function exactObjectKeys(value, expected, label) {
  requireFact(
    isObject(value) &&
      Object.keys(value).length === expected.length &&
      expected.every((key) => Object.hasOwn(value, key)),
    `${label} has an unexpected property set`,
  );
}

function validateSmoothTransform(value, label, sourceFamily) {
  exactObjectKeys(value, SMOOTH_TRANSFORM_KEYS, label);
  for (const [field, keys] of [
    ['sourceFrameSize', SIZE_KEYS],
    ['runtimeFrameSize', SIZE_KEYS],
    ['sourceTrim', RECT_KEYS],
    ['runtimeTrim', RECT_KEYS],
  ]) {
    exactObjectKeys(value[field], keys, `${label}.${field}`);
  }
  requireFact(
    Number.isInteger(value.scalePpm) &&
      value.scalePpm >= 100_000 &&
      value.scalePpm <= 1_000_000,
    `${label}.scalePpm is invalid`,
  );
  const scale = value.scalePpm / 1_000_000;
  if (sourceFamily === HISTORICAL_REVIEW_SOURCE_FAMILY) {
    requireFact(
      value.sourceFrameSize.width === 128 && value.sourceFrameSize.height === 128,
      `${label}.sourceFrameSize must be exactly 128x128`,
    );
  } else {
    requireFact(
      value.sourceFrameSize.width === 512 && value.sourceFrameSize.height === 512,
      `${label}.sourceFrameSize must be exactly 512x512`,
    );
    requireFact(
      value.runtimeFrameSize.width === value.runtimeFrameSize.height &&
        [256, 320].includes(value.runtimeFrameSize.width),
      `${label}.runtimeFrameSize must be one square 256px or 320px derivative`,
    );
  }
  requireFact(
    value.runtimeFrameSize.width === Math.round(value.sourceFrameSize.width * scale) &&
      value.runtimeFrameSize.height === Math.round(value.sourceFrameSize.height * scale),
    `${label}.runtimeFrameSize must equal round(sourceFrameSize * scalePpm)`,
  );
  requireFact(
    value.runtimeFrameSize.width <= value.sourceFrameSize.width &&
      value.runtimeFrameSize.height <= value.sourceFrameSize.height,
    `${label}.runtimeFrameSize cannot upscale source frames`,
  );
  if (sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY) {
    requireFact(
      value.runtimeTrim.x === Math.round(value.sourceTrim.x * scale) &&
        value.runtimeTrim.y === Math.round(value.sourceTrim.y * scale) &&
        value.runtimeTrim.width === Math.round(value.sourceTrim.width * scale) &&
        value.runtimeTrim.height === Math.round(value.sourceTrim.height * scale),
      `${label}.runtimeTrim must equal the shared 512px source transform`,
    );
  }
}

function validateReviewConsumerScale(value, assetId, transform, label) {
  const errors = validateConsumerScaleContract(value);
  requireFact(errors.length === 0, `${label} rejected: ${errors.join('; ')}`);
  requireFact(
    value.role === CONSUMER_ROLES[assetId],
    `${label}.role differs from trusted game role`,
  );
  requireFact(
    value.runtimeCanvasClass === transform.runtimeFrameSize.width &&
      value.runtimeCanvasClass === transform.runtimeFrameSize.height,
    `${label}.runtimeCanvasClass differs from the single runtime derivative`,
  );
}

export function isMotionReviewRequested(locationLike = globalThis.location) {
  if (!isMotionPreviewRequested(locationLike)) return false;
  const parameters = new URLSearchParams(String(locationLike?.search || ''));
  return parameters.get('motion-review') === '1';
}

export function reviewEntryKey(assetId, clipName) {
  return `${assetId}:${clipName}`;
}

export function reviewAuthorityScope(manifest, manifestSha256) {
  const batchSummarySha256 = manifest?.source?.batchSummarySha256;
  const assetAuthoritySha256 =
    manifest?.sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY
      ? manifest?.assets?.[HERO_ASSET_ID]?.derivativeSetSha256
      : manifest?.assets?.[HERO_ASSET_ID]?.candidateSha256;
  requireFact(
    SHA256.test(batchSummarySha256 || '') &&
      SHA256.test(assetAuthoritySha256 || '') &&
      SHA256.test(manifestSha256 || '') &&
      [
        HISTORICAL_REVIEW_SOURCE_FAMILY,
        CURRENT_REVIEW_SOURCE_FAMILY,
      ].includes(manifest?.sourceFamily),
    'review authority scope is incomplete',
  );
  return [
    batchSummarySha256,
    manifest.sourceFamily,
    assetAuthoritySha256,
    manifestSha256,
  ].join(':');
}

export function createViewedStore(storage, batchSummarySha256) {
  const key = `${PREVIEW_STORAGE_PREFIX}:${batchSummarySha256}`;
  let cache = null;
  function read() {
    if (cache) return cache;
    try {
      const raw = storage?.getItem?.(key);
      const parsed = raw ? JSON.parse(raw) : {};
      cache = isObject(parsed) ? parsed : {};
    } catch {
      cache = {};
    }
    return cache;
  }
  function write(next) {
    cache = next;
    try {
      storage?.setItem?.(key, JSON.stringify(next));
    } catch {
      /* ignore localStorage failures */
    }
  }
  return {
    key,
    isViewed(assetId, clipName) {
      return Number.isFinite(read()[reviewEntryKey(assetId, clipName)] || NaN);
    },
    markViewed(assetId, clipName, timestamp = Date.now()) {
      const next = { ...read() };
      next[reviewEntryKey(assetId, clipName)] = timestamp;
      write(next);
      return next;
    },
    countViewed(entries) {
      return entries.filter((entry) => this.isViewed(entry.assetId, entry.clipName)).length;
    },
  };
}

export function createMotionReviewCatalog(manifest) {
  const current =
    manifest?.sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY;
  const historical =
    manifest?.sourceFamily === HISTORICAL_REVIEW_SOURCE_FAMILY;
  requireFact(
    manifest?.authority === 'unapproved_preview' &&
      (current || historical) &&
      manifest?.counts?.assets === 7 &&
      manifest?.counts?.clips === 39 &&
      manifest?.counts?.frames === 795 &&
      manifest?.source?.contract ===
        (current
          ? 'apn-visual-fidelity-v4-batch-v1'
          : 'apn-offline-authored-motion-v3') &&
      typeof manifest?.source?.batchSummarySha256 === 'string' &&
      SHA256.test(manifest.source.batchSummarySha256) &&
      manifest?.source?.actingContractPath ===
        'briefs/authored-semantic-v3/acting-contract.json' &&
      SHA256.test(manifest?.source?.actingContractSha256 || ''),
    'manifest does not expose the exact 7/39/795 smooth preview authority',
  );
  requireFact(
    hasExactKeys(manifest.characters, CREATURE_ASSET_IDS) &&
      hasExactKeys(manifest.assets, [HERO_ASSET_ID, ...CREATURE_ASSET_IDS]),
    'manifest asset membership is not the canonical seven-character batch',
  );
  if (current) {
    requireFact(
      Object.values(manifest.assets).every(
        (asset) =>
          hasExactKeys(asset, V4_ROOT_LINEAGE_KEYS) &&
          V4_ROOT_LINEAGE_KEYS.filter(
            (key) => key !== 'sourceManifestVersion',
          ).every((key) => SHA256.test(asset[key] || '')) &&
          asset.sourceManifestVersion === 4 &&
          asset.sourceBatchSha256 === manifest.source.batchSummarySha256 &&
          asset.selectedProfileSha256 === manifest.toolchain?.profileSha256,
      ),
      'manifest V4 root derivative lineage is incomplete or stale',
    );
    const profileErrors = validateQualityProfileBinding({
      grammar: 'gaf2d-visual-quality-profile-binding-v4',
      selectedProfileSha256: manifest.toolchain?.profileSha256,
      manifestProfileSha256: manifest.toolchain?.profileSha256,
      encoderProfileSha256: manifest.toolchain?.encoder?.profileSha256,
    });
    requireFact(
      profileErrors.length === 0,
      `manifest V4 quality profile rejected: ${profileErrors.join('; ')}`,
    );
  } else {
    requireFact(
      Object.values(manifest.assets).every(
        (asset) =>
          asset?.actingContractSha256 ===
          manifest.source.actingContractSha256,
      ),
      'manifest smooth assets do not share the root acting contract authority',
    );
  }
  const entries = [];
  for (const assetId of assetIdOrder()) {
    if (assetId === HERO_ASSET_ID) {
      const hero = manifest.hero;
      requireFact(
        hero?.authority === 'unapproved_preview' &&
          hero?.assetId === HERO_ASSET_ID &&
          hero?.role === 'hero' &&
          SHA256.test(hero?.setSha256 || ''),
        'Hero review authority is invalid',
      );
      validateSmoothTransform(
        hero.transform,
        'Hero transform',
        manifest.sourceFamily,
      );
      if (current) {
        validateReviewConsumerScale(
          hero.consumerScale,
          assetId,
          hero.transform,
          'Hero consumer scale',
        );
      }
      exactPortablePath(
        hero.basePath,
        '.gaf2d-preview/hero/',
        '/',
        'Hero basePath',
      );
      exactPortablePath(
        hero.set,
        '.gaf2d-preview/hero/',
        'set.json',
        'Hero set',
      );
      for (const clipName of HERO_V3_CLIPS) {
        const clip = hero.clips?.[clipName];
        requireFact(isObject(clip), `Hero clip "${clipName}" is missing`);
        exactPortablePath(
          clip.descriptor,
          '.gaf2d-preview/hero/',
          `${clipName}.json`,
          `Hero ${clipName} descriptor`,
        );
        exactPortablePath(
          clip.image,
          '.gaf2d-preview/hero/',
          `${clipName}.webp`,
          `Hero ${clipName} image`,
        );
        requireFact(
          SHA256.test(clip.descriptorSha256 || '') &&
            SHA256.test(clip.imageSha256 || ''),
          `Hero ${clipName} hashes are invalid`,
        );
        entries.push({
          assetId,
          assetLabel: ASSET_LABELS[assetId],
          role: 'hero',
          clipName,
          descriptor: clip.descriptor,
          descriptorSha256: clip.descriptorSha256,
          image: clip.image,
          imageSha256: clip.imageSha256,
          set: hero.set,
          setSha256: hero.setSha256,
          transform: hero.transform,
          authority: hero.authority,
          sourceFamily: manifest.sourceFamily,
          consumerScale: current
            ? structuredClone(hero.consumerScale)
            : null,
          selectedProfileSha256: current
            ? manifest.toolchain.profileSha256
            : null,
          candidateSha256: manifest.assets[assetId]?.candidateSha256 || null,
          temporalEvidenceSha256:
            manifest.assets[assetId]?.temporalEvidenceSha256 || null,
          v4Lineage: current
            ? structuredClone(manifest.assets[assetId])
            : null,
        });
      }
      continue;
    }
    const character = manifest.characters?.[assetId];
    requireFact(
      character?.authority === 'unapproved_preview' &&
        SHA256.test(character?.setSha256 || ''),
      `${assetId} review authority is invalid`,
    );
    validateSmoothTransform(
      character.transform,
      `${assetId} transform`,
      manifest.sourceFamily,
    );
    if (current) {
      validateReviewConsumerScale(
        character.consumerScale,
        assetId,
        character.transform,
        `${assetId} consumer scale`,
      );
    }
    exactPortablePath(
      character.basePath,
      `.gaf2d-preview/characters/${assetId}/`,
      '/',
      `${assetId} basePath`,
    );
    exactPortablePath(
      character.set,
      `.gaf2d-preview/characters/${assetId}/`,
      'set.json',
      `${assetId} set`,
    );
    const requiredClips = CREATURE_CLIPS[assetId];
    requireFact(
      hasExactKeys(character.clips, requiredClips),
      `${assetId} clip membership is invalid`,
    );
    for (const clipName of requiredClips) {
      const clip = character.clips[clipName];
      exactPortablePath(
        clip.descriptor,
        `.gaf2d-preview/characters/${assetId}/`,
        `${clipName}.json`,
        `${assetId}/${clipName} descriptor`,
      );
      exactPortablePath(
        clip.image,
        `.gaf2d-preview/characters/${assetId}/`,
        `${clipName}.webp`,
        `${assetId}/${clipName} image`,
      );
      requireFact(
        SHA256.test(clip.descriptorSha256 || '') &&
          SHA256.test(clip.imageSha256 || ''),
        `${assetId}/${clipName} hashes are invalid`,
      );
      entries.push({
        assetId,
        assetLabel: ASSET_LABELS[assetId] || assetId,
        role: character.role,
        clipName,
        descriptor: clip.descriptor,
        descriptorSha256: clip.descriptorSha256,
        image: clip.image,
        imageSha256: clip.imageSha256,
        set: character.set,
        setSha256: character.setSha256,
        transform: character.transform,
        authority: character.authority,
        sourceFamily: manifest.sourceFamily,
        consumerScale: current
          ? structuredClone(character.consumerScale)
          : null,
        selectedProfileSha256: current
          ? manifest.toolchain.profileSha256
          : null,
        candidateSha256: manifest.assets[assetId]?.candidateSha256 || null,
        temporalEvidenceSha256:
          manifest.assets[assetId]?.temporalEvidenceSha256 || null,
        v4Lineage: current
          ? structuredClone(manifest.assets[assetId])
          : null,
      });
    }
  }
  requireFact(entries.length === 39, 'review catalog must contain exactly 39 clips');
  return Object.freeze(entries);
}

function validateRuntimeTransformBinding(set, transform, label) {
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

export function reviewRuntimeDrawSource(runtime) {
  return {
    descriptor: runtime.descriptor,
    set: {
      frameSize: runtime.frameSize,
      trim: runtime.trim,
      pivot: runtime.pivot,
    },
    image: runtime.image,
  };
}

async function defaultHashBytes(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchBounded(fetchImpl, url, maximumBytes) {
  const response = await fetchImpl(url);
  if (!response?.ok) fail(`${url} fetch failed with status ${response?.status ?? 'unknown'}`);
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    fail(`${url} exceeds ${maximumBytes} bytes`);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > maximumBytes) {
    fail(`${url} is empty or exceeds ${maximumBytes} bytes`);
  }
  return new Uint8Array(buffer);
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
  const bytes = await fetchBounded(fetchImpl, url, maximumBytes);
  const actualSha256 = await hashBytes(bytes);
  requireFact(actualSha256 === expectedSha256, `${label} SHA-256 mismatch`);
  return bytes;
}

async function defaultDecodeImage(bytes) {
  const blob = new Blob([bytes], { type: 'image/webp' });
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  throw new Error('motion review: no image decoder available');
}

export async function loadMotionReviewClip(entry, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const hashBytes = options.hashBytes ?? defaultHashBytes;
  const decodeImage = options.decodeImage ?? defaultDecodeImage;
  const setBytes = await fetchHashLockedBytes({
    fetchImpl,
    hashBytes,
    url: entry.set,
    expectedSha256: entry.setSha256,
    maximumBytes: MAX_SET_BYTES,
    label: `${entry.assetId} review set`,
  });
  const set = parseJson(setBytes, `${entry.assetId} review set`);
  const genericHighCadence = [
    HISTORICAL_REVIEW_SOURCE_FAMILY,
    CURRENT_REVIEW_SOURCE_FAMILY,
  ].includes(entry.sourceFamily);
  if (entry.role === 'hero' && !genericHighCadence) {
    const setErrors = validateHeroSetManifest(set, { allowUnapprovedPreview: true });
    requireFact(setErrors.length === 0, `Hero set rejected: ${setErrors.join('; ')}`);
  } else {
    const setErrors = validateMotionSetIndex(set, entry.assetId, {
      role: entry.role,
      ...(entry.sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY
        ? { consumerRole: entry.consumerScale?.role }
        : {}),
    });
    requireFact(setErrors.length === 0, `${entry.assetId} set rejected: ${setErrors.join('; ')}`);
  }
  if (entry.sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY) {
    requireFact(
      set.lineage?.sourceBatchSha256 === entry.v4Lineage?.sourceBatchSha256 &&
        set.lineage?.derivativeSetSha256 ===
          entry.v4Lineage?.derivativeSetSha256 &&
        set.lineage?.masterSetSha256 === entry.v4Lineage?.masterSetSha256 &&
        set.lineage?.selectedProfileSha256 ===
          entry.v4Lineage?.selectedProfileSha256 &&
        set.lineage?.v3LineageSha256 === entry.v4Lineage?.v3LineageSha256,
      `${entry.assetId} set V4 derivative lineage differs from the root asset authority`,
    );
  } else {
    requireFact(
      set.previewLineage?.temporalEvidenceSha256 ===
        entry.temporalEvidenceSha256,
      `${entry.assetId} set temporal evidence differs from the root asset authority`,
    );
  }
  validateRuntimeTransformBinding(
    set,
    entry.transform,
    `${entry.assetId} review set`,
  );
  if (entry.sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY) {
    requireFact(
      JSON.stringify(set.consumerScale) ===
        JSON.stringify(entry.consumerScale),
      `${entry.assetId} set consumer scale differs from the root manifest`,
    );
    const profileErrors = validateQualityProfileBinding({
      grammar: 'gaf2d-visual-quality-profile-binding-v4',
      selectedProfileSha256: entry.selectedProfileSha256,
      manifestProfileSha256: set.toolchain?.profileSha256,
      encoderProfileSha256: set.toolchain?.encoder?.profileSha256,
    });
    requireFact(
      profileErrors.length === 0,
      `${entry.assetId} set quality profile rejected: ${profileErrors.join('; ')}`,
    );
  }
  const descriptorBytes = await fetchHashLockedBytes({
    fetchImpl,
    hashBytes,
    url: entry.descriptor,
    expectedSha256: entry.descriptorSha256,
    maximumBytes: MAX_DESCRIPTOR_BYTES,
    label: `${entry.assetId}/${entry.clipName} descriptor`,
  });
  const descriptor = parseJson(
    descriptorBytes,
    `${entry.assetId}/${entry.clipName} descriptor`,
  );
  if (entry.role === 'hero' && !genericHighCadence) {
    const errors = validateHeroClipDescriptor(
      descriptor,
      entry.clipName,
      set,
      { allowUnapprovedPreview: true },
    );
    requireFact(errors.length === 0, `Hero/${entry.clipName} descriptor rejected: ${errors.join('; ')}`);
  } else {
    const errors = validateMotionClipDescriptor(
      descriptor,
      entry.clipName,
      set,
      {
        role: entry.role,
        ...(entry.sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY
          ? {
              consumerRole: entry.consumerScale?.role,
              selectedProfileSha256: entry.selectedProfileSha256,
            }
          : {}),
        descriptorSha256: entry.descriptorSha256,
        imageSha256: entry.imageSha256,
      },
    );
    requireFact(errors.length === 0, `${entry.assetId}/${entry.clipName} descriptor rejected: ${errors.join('; ')}`);
  }
  const imageBytes = await fetchHashLockedBytes({
    fetchImpl,
    hashBytes,
    url: entry.image,
    expectedSha256: entry.imageSha256,
    maximumBytes:
      entry.sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY
        ? visualFidelityEncodedLimit(entry.consumerScale?.role ?? entry.role)
        : genericHighCadence
        ? entry.role === 'hero'
          ? MAX_HERO_IMAGE_BYTES
          : entry.role === 'boss'
            ? MAX_SMOOTH_BOSS_IMAGE_BYTES
            : MAX_SMOOTH_CHARACTER_IMAGE_BYTES
        : entry.role === 'hero'
          ? MAX_HERO_IMAGE_BYTES
          : entry.role === 'boss'
            ? MAX_BOSS_MEDIA_BYTES
            : MAX_COMMON_MEDIA_BYTES,
    label: `${entry.assetId}/${entry.clipName} image`,
  });
  requireFact(
    imageBytes.byteLength === descriptor.atlas.bytes,
    `${entry.assetId}/${entry.clipName} image length differs from its descriptor`,
  );
  const image = await decodeImage(imageBytes, {
    url: entry.image,
    assetId: entry.assetId,
    clipName: entry.clipName,
  });
  if (
    image?.width !== descriptor.atlas.width ||
    image?.height !== descriptor.atlas.height
  ) {
    image?.close?.();
    fail(`${entry.assetId}/${entry.clipName} decoded dimensions do not match the descriptor atlas`);
  }
  const visualFidelity =
    entry.sourceFamily === CURRENT_REVIEW_SOURCE_FAMILY;
  const runtime = visualFidelity
    ? {
        frameSize: set.frameSize,
        trim: descriptor.trim,
        pivot: descriptor.pivot,
        presentation: descriptor.presentation,
      }
    : entry.role === 'hero'
      ? genericHighCadence
        ? {
            frameSize: set.frameSize,
            trim: set.trim,
            pivot: set.pivot,
            presentation: set.presentation,
          }
        : {
            frameSize: descriptor.frameSize,
            trim: descriptor.trim,
            pivot: { x: descriptor.anchor[0], y: descriptor.anchor[1] },
            presentation: descriptor.presentation,
          }
      : {
          frameSize: set.frameSize,
          trim: set.trim,
          pivot: set.pivot,
          presentation: set.presentation,
        };
  let consumerScale = entry.consumerScale;
  if (visualFidelity) {
    const sourceVisiblePixels = runtime.presentation.visibleBounds.height;
    consumerScale = {
      ...entry.consumerScale,
      sourceVisiblePixels,
      scaleRatio: {
        numerator: entry.consumerScale.displayedDevicePixels,
        denominator: sourceVisiblePixels,
      },
    };
    const consumerScaleErrors =
      validateConsumerScaleContract(consumerScale);
    requireFact(
      consumerScaleErrors.length === 0,
      `${entry.assetId}/${entry.clipName} drawable consumer scale rejected: ${consumerScaleErrors.join('; ')}`,
    );
  }
  const frameCount = descriptor.frames.length;
  return {
    ...entry,
    consumerScale,
    image,
    set,
    descriptor,
    fps: descriptor.fps,
    playback: descriptor.playback,
    frameCount,
    frameSize: runtime.frameSize,
    trim: runtime.trim,
    pivot: runtime.pivot,
    presentation: runtime.presentation,
  };
}

export function createMotionReviewSession(options = {}) {
  const loadClip = options.loadClip ?? loadMotionReviewClip;
  const onRuntime = options.onRuntime ?? (() => {});
  const onError = options.onError ?? (() => {});
  let generation = 0;
  let activeRuntime = null;
  let destroyed = false;

  const closeRuntime = (runtime) => runtime?.image?.close?.();

  return {
    async select(entry) {
      if (destroyed) return null;
      const selectedGeneration = ++generation;
      closeRuntime(activeRuntime);
      activeRuntime = null;
      let runtime;
      try {
        runtime = await loadClip(entry);
      } catch (error) {
        if (!destroyed && selectedGeneration === generation) onError(error);
        return null;
      }
      if (destroyed || selectedGeneration !== generation) {
        closeRuntime(runtime);
        return null;
      }
      activeRuntime = runtime;
      onRuntime(runtime);
      return runtime;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation += 1;
      closeRuntime(activeRuntime);
      activeRuntime = null;
    },
  };
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function optionNode(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

export function mountMotionReviewSurface(options = {}) {
  const panel = options.panel;
  const motionPreview = options.motionPreview;
  const locationLike = options.locationLike ?? globalThis.location;
  if (!panel || !isMotionReviewRequested(locationLike)) return null;
  if (
    !motionPreview?.active ||
    motionPreview?.manifest?.sourceFamily !== CURRENT_REVIEW_SOURCE_FAMILY
  ) {
    panel.hidden = false;
    panel.dataset.state = 'blocked';
    panel.querySelector('[data-role=\"review-status\"]').textContent =
      'Review surface blocked · current V4 preview package missing';
    return null;
  }
  const manifest = motionPreview.manifest;
  const entries = createMotionReviewCatalog(manifest);
  const viewed = createViewedStore(
    options.storage ?? globalThis.localStorage,
    reviewAuthorityScope(manifest, motionPreview.manifestSha256),
  );
  panel.hidden = false;
  panel.dataset.state = 'active';
  const statusNode = panel.querySelector('[data-role="review-status"]');
  const assetSelect = panel.querySelector('[data-role="review-asset"]');
  const clipSelect = panel.querySelector('[data-role="review-clip"]');
  const modeSelect = panel.querySelector('[data-role="review-mode"]');
  const factsNode = panel.querySelector('[data-role="review-facts"]');
  const viewedNode = panel.querySelector('[data-role="review-viewed"]');
  const canvas = panel.querySelector('[data-role="review-canvas"]');
  const ctx = canvas?.getContext?.('2d');
  requireFact(statusNode && assetSelect && clipSelect && modeSelect && factsNode && viewedNode && canvas && ctx, 'review surface markup is incomplete');
  const requestFrame = options.requestAnimationFrame ?? globalThis.requestAnimationFrame.bind(globalThis);
  const cancelFrame = options.cancelAnimationFrame ?? globalThis.cancelAnimationFrame.bind(globalThis);
  const now = options.now ?? (() => globalThis.performance.now());
  const guideColor =
    options.guideColor ??
    globalThis.getComputedStyle?.(panel)?.getPropertyValue('--border-600')?.trim() ??
    '';

  const assetIds = [...new Set(entries.map((entry) => entry.assetId))];
  clearNode(assetSelect);
  for (const assetId of assetIds) {
    assetSelect.appendChild(optionNode(assetId, ASSET_LABELS[assetId] || assetId));
  }

  let selectedAssetId = assetIds[0];
  let selectedClipName = entries.find((entry) => entry.assetId === selectedAssetId)?.clipName || '';
  let reviewMode = modeSelect.value === 'inspection'
    ? 'inspection'
    : 'actual-game-size';
  let activeRuntime = null;
  let startedAt = now();
  let rafId = null;
  let markedViewed = false;
  const session = createMotionReviewSession({
    loadClip: options.loadClip,
    onError(error) {
      activeRuntime = null;
      panel.dataset.state = 'error';
      statusNode.textContent = `Review blocked · ${error?.message || 'clip load failed'}`;
      factsNode.textContent = 'No unverified frame was displayed.';
    },
  });

  const entryFor = () =>
    entries.find(
      (entry) =>
        entry.assetId === selectedAssetId &&
        entry.clipName === selectedClipName,
    ) || null;

  function refreshViewedFacts() {
    viewedNode.textContent =
      `${viewed.countViewed(entries)}/${entries.length} viewed · ${
        viewed.isViewed(selectedAssetId, selectedClipName) ? 'selected clip viewed' : 'selected clip pending'
      }`;
  }

  function populateClipSelect() {
    const assetEntries = entries.filter((entry) => entry.assetId === selectedAssetId);
    clearNode(clipSelect);
    for (const entry of assetEntries) {
      const prefix = viewed.isViewed(entry.assetId, entry.clipName) ? '✓ ' : '';
      clipSelect.appendChild(optionNode(entry.clipName, `${prefix}${entry.clipName}`));
    }
    if (!assetEntries.some((entry) => entry.clipName === selectedClipName)) {
      selectedClipName = assetEntries[0]?.clipName || '';
    }
    clipSelect.value = selectedClipName;
  }

  function drawFrame(now) {
    if (!activeRuntime) return;
    const seconds = Math.max(0, (now - startedAt) / 1000);
    const value = progressValueForRuntime(activeRuntime, seconds);
    const frameIndex = frameIndexForClip(
      {
        frames: activeRuntime.descriptor.frames,
        fps: activeRuntime.fps,
        playback: activeRuntime.playback,
      },
      value,
    );
    const trim = activeRuntime.trim;
    const canvasRect = canvas.getBoundingClientRect?.();
    const canvasFacts = configureDprCanvas(canvas, ctx, {
      cssWidth: canvasRect?.width || 320,
      cssHeight: canvasRect?.height || canvasRect?.width || 320,
      dpr: options.devicePixelRatio ?? globalThis.devicePixelRatio ?? 1,
    });
    ctx.clearRect(0, 0, canvasFacts.cssWidth, canvasFacts.cssHeight);
    const scaleMetrics = reviewScaleMetrics(activeRuntime, {
      mode: reviewMode,
      dpr: canvasFacts.dpr,
    });
    const ratioLabel = Number.isFinite(scaleMetrics.scaleRatio)
      ? scaleMetrics.scaleRatio.toFixed(4)
      : 'blocked';
    const modeLabel =
      reviewMode === 'actual-game-size'
        ? 'Actual game size'
        : 'Inspection';
    if (!scaleMetrics.drawAllowed) {
      panel.dataset.state = 'blocked';
      statusNode.textContent =
        `Review blocked · density ratio ${ratioLabel}`;
      factsNode.textContent =
        `${modeLabel} · CSS body ${scaleMetrics.cssBodyHeight}px · DPR ${scaleMetrics.dpr} · device px ${scaleMetrics.displayedDevicePixels} · source visible ${scaleMetrics.sourceVisiblePixels}px · ratio ${ratioLabel} · NO DRAW · NO CREDIT`;
      rafId = requestFrame(drawFrame);
      return;
    }
    panel.dataset.state = 'active';
    const centerX = canvasFacts.cssWidth / 2;
    const pivotY = canvasFacts.cssHeight - 34;
    const sourceVisibleHeight =
      activeRuntime.presentation.visibleBounds.height;
    const drawTrimHeight =
      scaleMetrics.cssBodyHeight * trim.height / sourceVisibleHeight;
    drawMotionFrame(
      ctx,
      reviewRuntimeDrawSource(activeRuntime),
      activeRuntime.clipName,
      frameIndex,
      centerX,
      pivotY,
      drawTrimHeight,
    );
    if (guideColor) {
      ctx.strokeStyle = guideColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(24, pivotY + 1);
      ctx.lineTo(canvasFacts.cssWidth - 24, pivotY + 1);
      ctx.stroke();
    }
    factsNode.textContent =
      `${activeRuntime.assetLabel} · ${activeRuntime.clipName} · ${modeLabel} · CSS body ${scaleMetrics.cssBodyHeight}px · DPR ${scaleMetrics.dpr} · device px ${scaleMetrics.displayedDevicePixels} · source visible ${scaleMetrics.sourceVisiblePixels}px · ratio ${ratioLabel} · frame ${frameIndex + 1}/${activeRuntime.frameCount} · LOCAL ONLY · UNAPPROVED`;
    if (!markedViewed) {
      if (reviewCreditEligible(activeRuntime, seconds, scaleMetrics)) {
        viewed.markViewed(activeRuntime.assetId, activeRuntime.clipName);
        markedViewed = true;
        populateClipSelect();
        refreshViewedFacts();
      }
    }
    rafId = requestFrame(drawFrame);
  }

  async function selectClip() {
    if (rafId != null) cancelFrame(rafId);
    rafId = null;
    activeRuntime = null;
    const entry = entryFor();
    if (!entry) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    statusNode.textContent = `Loading ${entry.assetLabel} · ${entry.clipName}`;
    factsNode.textContent = 'Loading and verifying the selected clip…';
    const runtime = await session.select(entry);
    if (!runtime) return;
    activeRuntime = runtime;
    startedAt = now();
    markedViewed = viewed.isViewed(entry.assetId, entry.clipName);
    panel.dataset.state = 'active';
    factsNode.textContent =
      `${entry.assetLabel} · ${entry.clipName} · ${runtime.playback} · ${runtime.fps} FPS · frame 1/${runtime.frameCount} · LOCAL ONLY · UNAPPROVED`;
    statusNode.textContent =
      `Reviewing ${entry.assetLabel} · ${entry.clipName} · ${entry.role}`;
    refreshViewedFacts();
    rafId = requestFrame(drawFrame);
  }

  assetSelect.addEventListener('change', async () => {
    selectedAssetId = assetSelect.value;
    selectedClipName = entries.find((entry) => entry.assetId === selectedAssetId)?.clipName || '';
    populateClipSelect();
    await selectClip();
  });
  clipSelect.addEventListener('change', async () => {
    selectedClipName = clipSelect.value;
    await selectClip();
  });
  modeSelect.addEventListener('change', () => {
    reviewMode = modeSelect.value === 'inspection'
      ? 'inspection'
      : 'actual-game-size';
    startedAt = now();
    markedViewed = viewed.isViewed(selectedAssetId, selectedClipName);
  });

  populateClipSelect();
  assetSelect.value = selectedAssetId;
  clipSelect.value = selectedClipName;
  modeSelect.value = reviewMode;
  void selectClip();
  return {
    entries,
    viewed,
    destroy() {
      if (rafId != null) cancelFrame(rafId);
      rafId = null;
      activeRuntime = null;
      session.destroy();
    },
  };
}
