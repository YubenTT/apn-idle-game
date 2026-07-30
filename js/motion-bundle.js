/**
 * Pure runtime contract for one character-owned GAF2D motion bundle.
 *
 * This module deliberately owns no fetch, decode, DOM, or render-loop state.
 * Callers validate once at the resource boundary, then use the deterministic
 * selector and one-call blitter from simulation state.
 */

import { validatePresentationRecord } from './stage-presentation.js?v=gaf2d-motion-v1';

export const MOTION_GRAMMAR = 'gaf2d-motion-bundle-v1';
export const MOTION_PREVIEW_GRAMMAR = 'gaf2d-motion-preview-v1';
export const MOTION_SET_INDEX_GRAMMAR = 'gaf2d-motion-set-index-v2';
export const MOTION_CLIP_GRAMMAR = 'gaf2d-motion-clip-v2';
export const REQUIRED_CLIPS = Object.freeze([
  'idle',
  'advance',
  'engaged',
  'hit',
  'death',
]);
export const LOOP_CLIPS = Object.freeze([
  'idle',
  'advance',
  'engaged',
  'broken',
]);
export const MAX_FRAMES_PER_CLIP = 64;
export const MAX_TOTAL_FRAMES = 256;
export const MAX_VALIDATION_ERRORS = 64;

const SHA256 = /^[a-f0-9]{64}$/;
const ASSET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOOP_CLIP_SET = new Set(LOOP_CLIPS);
const MIN_CLIP_FPS = 1;
const MAX_CLIP_FPS = 60;
const MAX_ATLAS_DIMENSION = 2048;
const COMMON_DECODED_BYTES = 6 * 1024 * 1024;
const BOSS_DECODED_BYTES = 8 * 1024 * 1024;
const REQUIRED_LINEAGE_HASHES = Object.freeze([
  'identityApprovalSha256',
  'motionApprovalSha256',
  'motionSetCandidateSha256',
  'motionSetApprovalSha256',
  'sourceManifestSha256',
  'exportArtifactSha256',
  'derivativeToolchainSha256',
]);
const EXPECTED_FRAME_COUNTS = Object.freeze({
  idle: 8,
  advance: 8,
  engaged: 6,
  hit: 4,
  death: 8,
  broken: 8,
});
const TOP_LEVEL_KEYS = new Set([
  'grammar',
  'assetId',
  'image',
  'atlas',
  'frameSize',
  'trim',
  'pivot',
  'clips',
  'lineage',
  'encoder',
]);
const PREVIEW_TOP_LEVEL_KEYS = new Set([
  'grammar',
  'authority',
  'assetId',
  'image',
  'atlas',
  'frameSize',
  'trim',
  'pivot',
  'clips',
  'presentation',
  'previewLineage',
  'encoder',
]);
const ATLAS_KEYS = new Set(['width', 'height', 'sha256']);
const SIZE_KEYS = new Set(['width', 'height']);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const PIVOT_KEYS = new Set(['x', 'y']);
const CLIP_KEYS = new Set(['playback', 'fps', 'frames']);
const LINEAGE_KEYS = new Set([
  ...REQUIRED_LINEAGE_HASHES,
  'rigApprovalSha256',
]);
const PREVIEW_LINEAGE_KEYS = new Set([
  'candidateId',
  'candidateSha256',
  'qaSummarySha256',
  'batchSummarySha256',
  'sourceManifestVersion',
]);
const PREVIEW_LINEAGE_HASHES = Object.freeze([
  'candidateSha256',
  'qaSummarySha256',
  'batchSummarySha256',
]);
const ENCODER_KEYS = new Set(['name', 'version', 'arguments']);
const EXACT_ENCODER_VERSION = '1.6.0';
const EXACT_ENCODER_ARGUMENTS = Object.freeze(['-exact', '-q', '90']);
const HIGH_CADENCE_SOURCE_FAMILY = 'authored-semantic-v3';
const HIGH_CADENCE_CONTRACTS = Object.freeze({
  character: Object.freeze({
    idle: Object.freeze({ frames: 30, fps: 30, playback: 'loop' }),
    advance: Object.freeze({ frames: 24, fps: 30, playback: 'loop' }),
    engaged: Object.freeze({ frames: 15, fps: 30, playback: 'loop' }),
    hit: Object.freeze({ frames: 8, fps: 32, playback: 'progress' }),
    death: Object.freeze({ frames: 30, fps: 30, playback: 'progress' }),
  }),
  boss: Object.freeze({
    idle: Object.freeze({ frames: 30, fps: 30, playback: 'loop' }),
    advance: Object.freeze({ frames: 24, fps: 30, playback: 'loop' }),
    engaged: Object.freeze({ frames: 15, fps: 30, playback: 'loop' }),
    hit: Object.freeze({ frames: 8, fps: 32, playback: 'progress' }),
    death: Object.freeze({ frames: 30, fps: 30, playback: 'progress' }),
    broken: Object.freeze({ frames: 30, fps: 30, playback: 'loop' }),
  }),
  hero: Object.freeze({
    idle: Object.freeze({ frames: 20, fps: 30, playback: 'loop' }),
    run: Object.freeze({ frames: 20, fps: 32, playback: 'loop' }),
    attack: Object.freeze({ frames: 15, fps: 30, playback: 'progress' }),
    crit: Object.freeze({ frames: 15, fps: 30, playback: 'progress' }),
    sprint: Object.freeze({ frames: 15, fps: 30, playback: 'loop' }),
    hit: Object.freeze({ frames: 8, fps: 32, playback: 'progress' }),
    death: Object.freeze({ frames: 15, fps: 30, playback: 'progress' }),
    celebrate: Object.freeze({ frames: 15, fps: 30, playback: 'loop' }),
  }),
});
const HIGH_CADENCE_SET_KEYS = new Set([
  'grammar',
  'authority',
  'status',
  'sourceFamily',
  'assetId',
  'role',
  'frameSize',
  'trim',
  'pivot',
  'presentation',
  'clips',
  'previewLineage',
  'toolchain',
]);
const HIGH_CADENCE_CLIP_KEYS = new Set([
  'grammar',
  'authority',
  'sourceFamily',
  'assetId',
  'name',
  'playback',
  'fps',
  'sourceFps',
  'cadenceProfile',
  'authoringMethod',
  'interpolationMethod',
  'holds',
  'markers',
  'frames',
  'atlas',
  'encoder',
]);
const HIGH_CADENCE_SET_ENTRY_KEYS = new Set([
  'descriptor',
  'descriptorSha256',
  'image',
  'imageSha256',
]);
const HIGH_CADENCE_FRAME_KEYS = new Set([
  'x',
  'y',
  'width',
  'height',
  'sourceSha256',
  'bodyPoseSha256',
]);
const HIGH_CADENCE_ATLAS_KEYS = new Set([
  'width',
  'height',
  'bytes',
  'sha256',
]);
const HIGH_CADENCE_HOLD_KEYS = new Set([
  'startIndex',
  'endIndex',
  'reason',
]);
const HIGH_CADENCE_MARKER_ROLES = new Set([
  'neutral',
  'anticipation',
  'contact',
  'maximum_excursion',
  'recovery',
  'return',
  'terminal',
]);
const HIGH_CADENCE_HOLD_REASONS = new Set([
  'anticipation',
  'impact',
  'acting',
  'terminal',
]);
const HIGH_CADENCE_LINEAGE_KEYS = new Set([
  'candidateId',
  'candidateSha256',
  'temporalEvidenceSha256',
  'qaSummarySha256',
  'batchSummarySha256',
  'sourceManifestVersion',
]);
const HIGH_CADENCE_LINEAGE_HASHES = Object.freeze([
  'candidateSha256',
  'temporalEvidenceSha256',
  'qaSummarySha256',
  'batchSummarySha256',
]);
const HIGH_CADENCE_TOOLCHAIN_KEYS = new Set([
  'grammar',
  'compositor',
  'encoder',
  'operations',
  'profileSha256',
]);
const HIGH_CADENCE_COMPOSITOR_KEYS = new Set(['name', 'version']);
const HIGH_CADENCE_MAX_IMAGE_BYTES = Object.freeze({
  character: 160 * 1024,
  boss: 240 * 1024,
  hero: 640 * 1024,
});

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function rectsOverlap(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function boundsInsideTrim(bounds, trim) {
  return (
    bounds.x + bounds.width <= trim.width &&
    bounds.y + bounds.height <= trim.height
  );
}

function rejectUnknownProperties(value, allowed, label, addError) {
  if (!isObject(value)) return;
  let count = 0;
  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue;
    count += 1;
    if (!allowed.has(key)) addError(`${label}: unexpected property "${key}"`);
    if (count > allowed.size) {
      addError(`${label}: expected at most ${allowed.size} properties`);
      break;
    }
  }
}

function exactStringArrayEqual(left, right) {
  if (!Array.isArray(left) || left.length !== right.length) return false;
  for (let index = 0; index < right.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function boundedOwnKeys(value, maxKeys) {
  if (!isObject(value)) return { keys: [], overflow: false };
  const keys = [];
  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue;
    if (keys.length >= maxKeys) return { keys, overflow: true };
    keys.push(key);
  }
  return { keys, overflow: false };
}

/**
 * Validate untrusted descriptor JSON without throwing.
 *
 * The expected asset ID and optional role come from pack metadata. Descriptor
 * contents never select the trusted boss byte class or boss-only clip grammar.
 * Omitting options preserves the conservative non-boss contract.
 */
function validateMotionDescriptor(
  data,
  expectedAssetId,
  options = {},
  authorityMode = 'production',
) {
  const errors = [];
  const addError = (message) => {
    if (errors.length < MAX_VALIDATION_ERRORS) errors.push(message);
  };
  const isBoss = options?.role === 'boss';
  const isPreview = authorityMode === 'preview';
  if (!isObject(data)) return ['bundle: must be an object'];
  rejectUnknownProperties(
    data,
    isPreview ? PREVIEW_TOP_LEVEL_KEYS : TOP_LEVEL_KEYS,
    'bundle',
    addError,
  );

  const expectedGrammar = isPreview
    ? MOTION_PREVIEW_GRAMMAR
    : MOTION_GRAMMAR;
  if (data.grammar !== expectedGrammar) {
    addError(`grammar: expected "${expectedGrammar}"`);
  }

  if (typeof data.assetId !== 'string' || !ASSET_ID.test(data.assetId)) {
    addError('assetId: must be a portable lowercase asset ID');
  }
  if (
    typeof expectedAssetId === 'string' &&
    data.assetId !== expectedAssetId
  ) {
    addError(
      `assetId: expected "${expectedAssetId}", got "${String(data.assetId)}"`,
    );
  }

  if (data.image !== 'motion.webp') {
    addError('image: must be exactly the portable relative path "motion.webp"');
  }

  const atlas = data.atlas;
  rejectUnknownProperties(atlas, ATLAS_KEYS, 'atlas', addError);
  const atlasSizeValid =
    isObject(atlas) &&
    isPositiveInteger(atlas.width) &&
    isPositiveInteger(atlas.height);
  if (!atlasSizeValid) {
    addError('atlas: width and height must be positive integers');
  } else {
    if (
      atlas.width > MAX_ATLAS_DIMENSION ||
      atlas.height > MAX_ATLAS_DIMENSION
    ) {
      addError(
        `atlas: dimensions must be at most ${MAX_ATLAS_DIMENSION}x${MAX_ATLAS_DIMENSION}`,
      );
    }
    const decodedBytes = atlas.width * atlas.height * 4;
    const decodedLimit = isBoss
      ? BOSS_DECODED_BYTES
      : COMMON_DECODED_BYTES;
    if (decodedBytes > decodedLimit) {
      addError(
        `atlas: decoded RGBA bytes ${decodedBytes} exceed ${decodedLimit}`,
      );
    }
  }
  if (!SHA256.test(atlas?.sha256 || '')) {
    addError('atlas.sha256: must be a 64-character lowercase SHA-256');
  }

  const frameSize = data.frameSize;
  rejectUnknownProperties(frameSize, SIZE_KEYS, 'frameSize', addError);
  const frameSizeValid =
    isObject(frameSize) &&
    isPositiveInteger(frameSize.width) &&
    isPositiveInteger(frameSize.height);
  if (!frameSizeValid) {
    addError('frameSize: width and height must be positive integers');
  }

  const trim = data.trim;
  rejectUnknownProperties(trim, RECT_KEYS, 'trim', addError);
  const trimValid =
    isObject(trim) &&
    Number.isInteger(trim.x) &&
    trim.x >= 0 &&
    Number.isInteger(trim.y) &&
    trim.y >= 0 &&
    isPositiveInteger(trim.width) &&
    isPositiveInteger(trim.height);
  if (!trimValid) {
    addError('trim: must be a positive integer rectangle');
  } else if (
    frameSizeValid &&
    (trim.x + trim.width > frameSize.width ||
      trim.y + trim.height > frameSize.height)
  ) {
    addError('trim: must be inside the untrimmed frame size');
  }

  if (isPreview) {
    const presentationErrors = validatePresentationRecord(data.presentation);
    for (const error of presentationErrors) {
      addError(`presentation: ${error}`);
    }
    if (presentationErrors.length === 0 && trimValid) {
      for (const field of ['visibleBounds', 'motionBounds']) {
        if (!boundsInsideTrim(data.presentation[field], trim)) {
          addError(`presentation: ${field} is outside trim`);
        }
      }
    }
  }

  rejectUnknownProperties(data.pivot, PIVOT_KEYS, 'pivot', addError);
  if (
    !isObject(data.pivot) ||
    data.pivot.x !== 0.5 ||
    data.pivot.y !== 1
  ) {
    addError('pivot: must be the normalized bottom-center point (0.5, 1)');
  }

  if (isPreview) {
    if (data.authority !== 'unapproved_preview') {
      addError('authority: expected "unapproved_preview"');
    }
    if (!isObject(data.previewLineage)) {
      addError('previewLineage: must be an object');
    } else {
      rejectUnknownProperties(
        data.previewLineage,
        PREVIEW_LINEAGE_KEYS,
        'previewLineage',
        addError,
      );
      const expectedCandidateId =
        typeof expectedAssetId === 'string'
          ? `${expectedAssetId}-authored-semantic-v2`
          : null;
      if (
        typeof data.previewLineage.candidateId !== 'string' ||
        (expectedCandidateId !== null &&
          data.previewLineage.candidateId !== expectedCandidateId)
      ) {
        addError(
          `previewLineage.candidateId: expected "${String(expectedCandidateId)}"`,
        );
      }
      for (const field of PREVIEW_LINEAGE_HASHES) {
        if (!SHA256.test(data.previewLineage[field] || '')) {
          addError(
            `previewLineage.${field}: must be a 64-character lowercase SHA-256`,
          );
        }
      }
      if (!isPositiveInteger(data.previewLineage.sourceManifestVersion)) {
        addError(
          'previewLineage.sourceManifestVersion: must be a positive integer',
        );
      }
    }
  } else if (!isObject(data.lineage)) {
    addError('lineage: must be an object');
  } else {
    rejectUnknownProperties(data.lineage, LINEAGE_KEYS, 'lineage', addError);
    for (const field of REQUIRED_LINEAGE_HASHES) {
      if (!SHA256.test(data.lineage[field] || '')) {
        addError(
          `lineage.${field}: must be a 64-character lowercase SHA-256`,
        );
      }
    }
    if (
      data.lineage.rigApprovalSha256 !== undefined &&
      !SHA256.test(data.lineage.rigApprovalSha256)
    ) {
      addError(
        'lineage.rigApprovalSha256: must be a 64-character lowercase SHA-256',
      );
    }
  }

  rejectUnknownProperties(data.encoder, ENCODER_KEYS, 'encoder', addError);
  const encoderArguments = data.encoder?.arguments;
  if (
    !isObject(data.encoder) ||
    data.encoder.name !== 'cwebp' ||
    typeof data.encoder.version !== 'string' ||
    !Array.isArray(encoderArguments) ||
    encoderArguments.length === 0 ||
    encoderArguments.length > 64 ||
    !encoderArguments.every((argument) => typeof argument === 'string')
  ) {
    addError(
      'encoder: name, version, and canonical string arguments are required',
    );
  } else if (
    data.encoder.version !== EXACT_ENCODER_VERSION ||
    !exactStringArrayEqual(encoderArguments, EXACT_ENCODER_ARGUMENTS)
  ) {
    addError(
      'encoder.profile: must equal cwebp 1.6.0 with arguments ["-exact","-q","90"]',
    );
  }

  if (!isObject(data.clips)) {
    addError('clips: must be an object');
    return errors;
  }

  const { keys: clipNames, overflow: clipOverflow } = boundedOwnKeys(
    data.clips,
    REQUIRED_CLIPS.length + 1,
  );
  const allowedClips = new Set([...REQUIRED_CLIPS, 'broken']);
  if (clipOverflow) {
    addError(`clips: expected at most ${allowedClips.size} entries`);
    return errors;
  }
  for (const name of REQUIRED_CLIPS) {
    if (!Object.hasOwn(data.clips, name)) {
      addError(`clips: missing required clip "${name}"`);
    }
  }
  for (const name of clipNames) {
    if (!allowedClips.has(name)) {
      addError(`clips: unexpected clip "${name}"`);
    }
  }
  const ownsBrokenClip = Object.hasOwn(data.clips, 'broken');
  if (isBoss && !ownsBrokenClip) {
    addError('clips: missing required clip "broken"');
  } else if (!isBoss && ownsBrokenClip) {
    addError('clips: "broken" is forbidden for non-boss role');
  }

  let declaredTotalFrames = 0;
  for (const name of clipNames) {
    const frames = data.clips[name]?.frames;
    if (!Array.isArray(frames)) continue;
    if (frames.length > MAX_FRAMES_PER_CLIP) {
      addError(
        `clips.${name}.frames: must contain at most ${MAX_FRAMES_PER_CLIP} frames`,
      );
    }
    declaredTotalFrames = Math.min(
      MAX_TOTAL_FRAMES + 1,
      declaredTotalFrames + frames.length,
    );
  }
  if (declaredTotalFrames > MAX_TOTAL_FRAMES) {
    addError(`clips: must contain at most ${MAX_TOTAL_FRAMES} frames in total`);
  }

  const rectangles = [];
  let validatedFrameCount = 0;
  for (const name of clipNames) {
    const clip = data.clips[name];
    if (!isObject(clip)) {
      addError(`clips.${name}: must be an object`);
      continue;
    }
    rejectUnknownProperties(clip, CLIP_KEYS, `clips.${name}`, addError);

    const expectedPlayback = LOOP_CLIP_SET.has(name) ? 'loop' : 'progress';
    if (
      !['loop', 'progress'].includes(clip.playback) ||
      clip.playback !== expectedPlayback
    ) {
      addError(
        `clips.${name}.playback: expected "${expectedPlayback}", got "${String(clip.playback)}"`,
      );
    }
    if (
      !Number.isInteger(clip.fps) ||
      clip.fps < MIN_CLIP_FPS ||
      clip.fps > MAX_CLIP_FPS
    ) {
      addError(
        `clips.${name}.fps: must be an integer within ${MIN_CLIP_FPS}..${MAX_CLIP_FPS}`,
      );
    }
    if (!Array.isArray(clip.frames) || clip.frames.length === 0) {
      addError(`clips.${name}.frames: must be a nonempty ordered array`);
      continue;
    }
    const expectedFrameCount = EXPECTED_FRAME_COUNTS[name];
    if (
      Number.isInteger(expectedFrameCount) &&
      clip.frames.length !== expectedFrameCount
    ) {
      addError(
        `clips.${name}.frames: expected exactly ${expectedFrameCount} frames`,
      );
    }

    const framesToValidate = Math.min(
      clip.frames.length,
      MAX_FRAMES_PER_CLIP,
      Math.max(0, MAX_TOTAL_FRAMES - validatedFrameCount),
    );
    for (let index = 0; index < framesToValidate; index += 1) {
      const rect = clip.frames[index];
      const label = `clips.${name}.frames[${index}]`;
      rejectUnknownProperties(rect, RECT_KEYS, label, addError);
      const rectValid =
        isObject(rect) &&
        Number.isInteger(rect.x) &&
        rect.x >= 0 &&
        Number.isInteger(rect.y) &&
        rect.y >= 0 &&
        isPositiveInteger(rect.width) &&
        isPositiveInteger(rect.height);
      if (!rectValid) {
        addError(`${label}: must be a positive integer rectangle`);
        continue;
      }
      if (
        atlasSizeValid &&
        (rect.x + rect.width > atlas.width ||
          rect.y + rect.height > atlas.height)
      ) {
        addError(`${label}: outside atlas bounds`);
      }
      if (
        trimValid &&
        (rect.width !== trim.width || rect.height !== trim.height)
      ) {
        addError(`${label}: width and height must match shared trim`);
      }
      rectangles.push({ ...rect, label });
    }
    validatedFrameCount += framesToValidate;
  }

  overlapChecks: for (let left = 0; left < rectangles.length; left += 1) {
    for (let right = left + 1; right < rectangles.length; right += 1) {
      if (rectsOverlap(rectangles[left], rectangles[right])) {
        addError(
          `${rectangles[right].label}: overlaps ${rectangles[left].label}`,
        );
        if (errors.length >= MAX_VALIDATION_ERRORS) break overlapChecks;
      }
    }
  }

  return errors;
}

export function validateMotionBundle(data, expectedAssetId, options = {}) {
  return validateMotionDescriptor(
    data,
    expectedAssetId,
    options,
    'production',
  );
}

export function validateMotionPreviewBundle(
  data,
  expectedAssetId,
  options = {},
) {
  return validateMotionDescriptor(data, expectedAssetId, options, 'preview');
}

function exactHighCadenceKeys(value, allowed, label, addError) {
  if (!isObject(value)) {
    addError(`${label}: must be an object`);
    return false;
  }
  rejectUnknownProperties(value, allowed, label, addError);
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) {
      addError(`${label}: missing required property "${key}"`);
    }
  }
  return true;
}

function portableBasename(value, expected) {
  return (
    value === expected &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes('?') &&
    !value.includes('#')
  );
}

function highCadenceRole(options) {
  return ['character', 'boss', 'hero'].includes(options?.role)
    ? options.role
    : 'character';
}

function highCadenceDecodedLimit(role) {
  return role === 'character'
    ? COMMON_DECODED_BYTES
    : BOSS_DECODED_BYTES;
}

function validateHighCadenceEncoder(value, label, addError) {
  if (!exactHighCadenceKeys(value, ENCODER_KEYS, label, addError)) return;
  if (
    value.name !== 'cwebp' ||
    value.version !== EXACT_ENCODER_VERSION ||
    !exactStringArrayEqual(value.arguments, EXACT_ENCODER_ARGUMENTS)
  ) {
    addError(
      `${label}: must equal cwebp 1.6.0 with arguments ["-exact","-q","90"]`,
    );
  }
}

function validateHighCadenceToolchain(value, addError) {
  if (
    !exactHighCadenceKeys(
      value,
      HIGH_CADENCE_TOOLCHAIN_KEYS,
      'toolchain',
      addError,
    )
  ) {
    return;
  }
  if (value.grammar !== 'apn-gaf2d-preview-matrix-toolchain-v1') {
    addError(
      'toolchain.grammar: expected "apn-gaf2d-preview-matrix-toolchain-v1"',
    );
  }
  if (
    exactHighCadenceKeys(
      value.compositor,
      HIGH_CADENCE_COMPOSITOR_KEYS,
      'toolchain.compositor',
      addError,
    ) &&
    (
      value.compositor.name !== 'ImageMagick' ||
      value.compositor.version !== '7.1.2-13'
    )
  ) {
    addError('toolchain.compositor: expected ImageMagick 7.1.2-13');
  }
  validateHighCadenceEncoder(value.encoder, 'toolchain.encoder', addError);
  if (
    !exactStringArrayEqual(value.operations, [
      'crop:normalized-png:shared-trim:repage:png32',
      'resize:lanczos:shared-scale:exact-cell:png32',
      'montage:row-major:bounded-matrix:shared-cell:no-gap:transparent:alpha-on:png-color-type-6',
    ])
  ) {
    addError('toolchain.operations: preview derivative profile is not canonical');
  }
  if (
    value.profileSha256 !==
    '71f50b2378a4a588d9e49fb2d29700becb2b4a5ae37078a2af3280284eaa8013'
  ) {
    addError('toolchain.profileSha256: preview derivative profile is not pinned');
  }
}

/**
 * Validate the small hash-locked index for a high-cadence per-clip set.
 *
 * The trusted role comes from pack metadata; the document cannot promote
 * itself into the larger boss/hero decoded budget.
 */
export function validateMotionSetIndex(
  data,
  expectedAssetId,
  options = {},
) {
  const errors = [];
  const addError = (message) => {
    if (errors.length < MAX_VALIDATION_ERRORS) errors.push(message);
  };
  if (!isObject(data)) return ['set: must be an object'];
  exactHighCadenceKeys(
    data,
    HIGH_CADENCE_SET_KEYS,
    'set',
    addError,
  );
  const role = highCadenceRole(options);
  const contract = HIGH_CADENCE_CONTRACTS[role];

  if (data.grammar !== MOTION_SET_INDEX_GRAMMAR) {
    addError(`grammar: expected "${MOTION_SET_INDEX_GRAMMAR}"`);
  }
  if (data.authority !== 'unapproved_preview') {
    addError('authority: expected "unapproved_preview"');
  }
  if (data.status !== 'human_review_required') {
    addError('status: expected "human_review_required"');
  }
  if (data.sourceFamily !== HIGH_CADENCE_SOURCE_FAMILY) {
    addError(`sourceFamily: expected "${HIGH_CADENCE_SOURCE_FAMILY}"`);
  }
  if (
    typeof data.assetId !== 'string' ||
    !ASSET_ID.test(data.assetId) ||
    (typeof expectedAssetId === 'string' &&
      data.assetId !== expectedAssetId)
  ) {
    addError(`assetId: expected "${String(expectedAssetId)}"`);
  }
  if (data.role !== role) {
    addError(`role: expected trusted role "${role}"`);
  }

  const frameSize = data.frameSize;
  exactHighCadenceKeys(frameSize, SIZE_KEYS, 'frameSize', addError);
  const frameSizeValid =
    isObject(frameSize) &&
    isPositiveInteger(frameSize.width) &&
    isPositiveInteger(frameSize.height);
  if (!frameSizeValid) {
    addError('frameSize: width and height must be positive integers');
  }
  const trim = data.trim;
  exactHighCadenceKeys(trim, RECT_KEYS, 'trim', addError);
  const trimValid =
    isObject(trim) &&
    Number.isInteger(trim.x) &&
    trim.x >= 0 &&
    Number.isInteger(trim.y) &&
    trim.y >= 0 &&
    isPositiveInteger(trim.width) &&
    isPositiveInteger(trim.height);
  if (!trimValid) {
    addError('trim: must be a positive integer rectangle');
  } else if (
    frameSizeValid &&
    (
      trim.x + trim.width > frameSize.width ||
      trim.y + trim.height > frameSize.height
    )
  ) {
    addError('trim: must be inside the untrimmed frame size');
  }
  exactHighCadenceKeys(data.pivot, PIVOT_KEYS, 'pivot', addError);
  if (data.pivot?.x !== 0.5 || data.pivot?.y !== 1) {
    addError('pivot: must be the normalized bottom-center point (0.5, 1)');
  }
  const presentationErrors = validatePresentationRecord(data.presentation);
  for (const error of presentationErrors) {
    addError(`presentation: ${error}`);
  }
  if (presentationErrors.length === 0 && trimValid) {
    for (const field of ['visibleBounds', 'motionBounds']) {
      if (!boundsInsideTrim(data.presentation[field], trim)) {
        addError(`presentation: ${field} is outside trim`);
      }
    }
  }

  if (!isObject(data.clips)) {
    addError('clips: must be an object');
  } else {
    const expectedNames = Object.keys(contract);
    const {
      keys: clipNames,
      overflow: clipOverflow,
    } = boundedOwnKeys(data.clips, expectedNames.length + 1);
    if (clipOverflow) {
      addError(`clips: expected at most ${expectedNames.length} entries`);
    }
    for (const name of expectedNames) {
      if (!Object.hasOwn(data.clips, name)) {
        addError(`clips: missing required clip "${name}"`);
      }
    }
    for (const name of clipNames) {
      if (!Object.hasOwn(contract, name)) {
        addError(`clips: unexpected clip "${name}"`);
        continue;
      }
      const entry = data.clips[name];
      if (
        !exactHighCadenceKeys(
          entry,
          HIGH_CADENCE_SET_ENTRY_KEYS,
          `clips.${name}`,
          addError,
        )
      ) {
        continue;
      }
      if (!portableBasename(entry.descriptor, `${name}.json`)) {
        addError(`clips.${name}.descriptor: expected "${name}.json"`);
      }
      if (!portableBasename(entry.image, `${name}.webp`)) {
        addError(`clips.${name}.image: expected "${name}.webp"`);
      }
      if (!SHA256.test(entry.descriptorSha256 || '')) {
        addError(`clips.${name}.descriptorSha256: invalid SHA-256`);
      }
      if (!SHA256.test(entry.imageSha256 || '')) {
        addError(`clips.${name}.imageSha256: invalid SHA-256`);
      }
    }
  }

  if (
    exactHighCadenceKeys(
      data.previewLineage,
      HIGH_CADENCE_LINEAGE_KEYS,
      'previewLineage',
      addError,
    )
  ) {
    const expectedCandidateId =
      typeof expectedAssetId === 'string'
        ? `${expectedAssetId}-${HIGH_CADENCE_SOURCE_FAMILY}`
        : null;
    if (data.previewLineage.candidateId !== expectedCandidateId) {
      addError(
        `previewLineage.candidateId: expected "${String(expectedCandidateId)}"`,
      );
    }
    for (const field of HIGH_CADENCE_LINEAGE_HASHES) {
      if (!SHA256.test(data.previewLineage[field] || '')) {
        addError(`previewLineage.${field}: invalid SHA-256`);
      }
    }
    if (!isPositiveInteger(data.previewLineage.sourceManifestVersion)) {
      addError('previewLineage.sourceManifestVersion: must be a positive integer');
    }
  }
  validateHighCadenceToolchain(data.toolchain, addError);
  return errors;
}

function holdAllowsRepeatedTransition(holds, frameIndex) {
  return holds.some(
    (hold) =>
      Number.isInteger(hold?.startIndex) &&
      Number.isInteger(hold?.endIndex) &&
      frameIndex > hold.startIndex &&
      frameIndex <= hold.endIndex,
  );
}

/**
 * Validate one high-cadence descriptor against its already validated set.
 *
 * Callers may pass hashes/bytes computed from fetched resources. Omitting
 * those optional facts still validates the closed descriptor grammar.
 */
export function validateMotionClipDescriptor(
  data,
  expectedClipName,
  set,
  options = {},
) {
  const errors = [];
  const addError = (message) => {
    if (errors.length < MAX_VALIDATION_ERRORS) errors.push(message);
  };
  if (!isObject(data)) return ['clip: must be an object'];
  exactHighCadenceKeys(
    data,
    HIGH_CADENCE_CLIP_KEYS,
    'clip',
    addError,
  );
  const role = highCadenceRole(options);
  const contract = HIGH_CADENCE_CONTRACTS[role]?.[expectedClipName];
  const setEntry = set?.clips?.[expectedClipName];

  if (data.grammar !== MOTION_CLIP_GRAMMAR) {
    addError(`grammar: expected "${MOTION_CLIP_GRAMMAR}"`);
  }
  if (data.authority !== 'unapproved_preview') {
    addError('authority: expected "unapproved_preview"');
  }
  if (data.sourceFamily !== HIGH_CADENCE_SOURCE_FAMILY) {
    addError(`sourceFamily: expected "${HIGH_CADENCE_SOURCE_FAMILY}"`);
  }
  if (data.assetId !== set?.assetId) {
    addError(`assetId: expected "${String(set?.assetId)}"`);
  }
  if (
    typeof expectedClipName !== 'string' ||
    !contract ||
    data.name !== expectedClipName
  ) {
    addError(`name: expected exact ${role} clip "${String(expectedClipName)}"`);
  }
  if (contract) {
    if (data.playback !== contract.playback) {
      addError(
        `playback: expected "${contract.playback}", got "${String(data.playback)}"`,
      );
    }
    if (data.fps !== contract.fps) {
      addError(`fps: expected exact ${contract.fps}`);
    }
  }
  if (
    !Number.isInteger(data.sourceFps) ||
    data.sourceFps < 1 ||
    data.sourceFps > MAX_CLIP_FPS
  ) {
    addError(`sourceFps: must be an integer within 1..${MAX_CLIP_FPS}`);
  }
  if (data.cadenceProfile !== 'continuous_30') {
    addError('cadenceProfile: expected "continuous_30"');
  }
  if (
    data.authoringMethod !== 'deterministic_part_rig' ||
    data.interpolationMethod !== 'deterministic_part_transforms'
  ) {
    addError(
      'cadence provenance: continuous-30 output requires deterministic part transforms',
    );
  }
  if (
    Number.isInteger(data.sourceFps) &&
    Number.isInteger(data.fps) &&
    data.sourceFps < data.fps &&
    (
      data.authoringMethod !== 'deterministic_part_rig' ||
      data.interpolationMethod !== 'deterministic_part_transforms'
    )
  ) {
    addError('cadence uplift requires deterministic part transforms');
  }

  const holds = Array.isArray(data.holds) ? data.holds : [];
  if (!Array.isArray(data.holds)) {
    addError('holds: must be an ordered array');
  } else if (contract && data.holds.length > contract.frames) {
    addError(`holds: expected at most ${contract.frames} ranges`);
  }
  const holdsToValidate = holds.slice(
    0,
    contract?.frames ?? MAX_FRAMES_PER_CLIP,
  );
  let heldFrames = 0;
  let previousHoldEnd = -1;
  for (
    let index = 0;
    index < holdsToValidate.length;
    index += 1
  ) {
    const hold = holdsToValidate[index];
    exactHighCadenceKeys(
      hold,
      HIGH_CADENCE_HOLD_KEYS,
      `holds[${index}]`,
      addError,
    );
    if (
      !Number.isInteger(hold?.startIndex) ||
      hold.startIndex < 0 ||
      !Number.isInteger(hold?.endIndex) ||
      hold.endIndex <= hold.startIndex ||
      (contract && hold.endIndex >= contract.frames)
    ) {
      addError(`holds[${index}]: invalid inclusive clip range`);
    }
    if (hold?.startIndex <= previousHoldEnd) {
      addError(`holds[${index}]: ranges must be ordered and non-overlapping`);
    }
    if (!HIGH_CADENCE_HOLD_REASONS.has(hold?.reason)) {
      addError(`holds[${index}].reason: unsupported hold reason`);
    }
    if (
      Number.isInteger(hold?.startIndex) &&
      Number.isInteger(hold?.endIndex)
    ) {
      heldFrames += hold.endIndex - hold.startIndex + 1;
      previousHoldEnd = hold.endIndex;
    }
  }
  if (contract && heldFrames >= contract.frames) {
    addError('holds: cannot cover the complete clip');
  }

  if (!isObject(data.markers)) {
    addError('markers: must be an object');
  } else {
    const {
      keys: markerRoles,
      overflow: markerOverflow,
    } = boundedOwnKeys(
      data.markers,
      HIGH_CADENCE_MARKER_ROLES.size + 1,
    );
    if (markerOverflow) {
      addError(
        `markers: expected at most ${HIGH_CADENCE_MARKER_ROLES.size} roles`,
      );
    }
    for (const roleName of markerRoles) {
      const frameIndex = data.markers[roleName];
      if (!HIGH_CADENCE_MARKER_ROLES.has(roleName)) {
        addError(`markers: unexpected role "${roleName}"`);
      }
      if (
        !Number.isInteger(frameIndex) ||
        frameIndex < 0 ||
        (contract && frameIndex >= contract.frames)
      ) {
        addError(`markers.${roleName}: must identify a frame index`);
      }
    }
    const required =
      data.playback === 'loop'
        ? ['neutral', 'maximum_excursion', 'return']
        : ['anticipation', 'terminal'];
    for (const roleName of required) {
      if (!Object.hasOwn(data.markers, roleName)) {
        addError(`markers: missing required role "${roleName}"`);
      }
    }
    if (
      data.playback === 'progress' &&
      !Object.hasOwn(data.markers, 'contact') &&
      !Object.hasOwn(data.markers, 'maximum_excursion')
    ) {
      addError('markers: progress clip needs contact or maximum_excursion');
    }
  }

  const atlas = data.atlas;
  exactHighCadenceKeys(
    atlas,
    HIGH_CADENCE_ATLAS_KEYS,
    'atlas',
    addError,
  );
  const atlasSizeValid =
    isObject(atlas) &&
    isPositiveInteger(atlas.width) &&
    isPositiveInteger(atlas.height);
  if (!atlasSizeValid) {
    addError('atlas: width and height must be positive integers');
  } else {
    if (
      atlas.width > MAX_ATLAS_DIMENSION ||
      atlas.height > MAX_ATLAS_DIMENSION
    ) {
      addError(
        `atlas: dimensions must be at most ${MAX_ATLAS_DIMENSION}x${MAX_ATLAS_DIMENSION}`,
      );
    }
    const decodedBytes = atlas.width * atlas.height * 4;
    const limit = highCadenceDecodedLimit(role);
    if (decodedBytes > limit) {
      addError(`atlas: decoded RGBA bytes ${decodedBytes} exceed ${limit}`);
    }
  }
  if (
    !isPositiveInteger(atlas?.bytes) ||
    atlas.bytes > HIGH_CADENCE_MAX_IMAGE_BYTES[role]
  ) {
    addError(
      `atlas.bytes: must fit the ${HIGH_CADENCE_MAX_IMAGE_BYTES[role]} byte ${role} clip budget`,
    );
  }
  if (!SHA256.test(atlas?.sha256 || '')) {
    addError('atlas.sha256: invalid SHA-256');
  }
  if (setEntry?.imageSha256 !== atlas?.sha256) {
    addError('image SHA-256: descriptor differs from its set index');
  }
  if (
    options.imageSha256 !== undefined &&
    options.imageSha256 !== setEntry?.imageSha256
  ) {
    addError('image SHA-256: fetched image bytes differ from the set index');
  }
  if (
    options.descriptorSha256 !== undefined &&
    options.descriptorSha256 !== setEntry?.descriptorSha256
  ) {
    addError(
      'descriptor SHA-256: fetched descriptor bytes differ from the set index',
    );
  }
  if (
    options.imageBytes !== undefined &&
    options.imageBytes !== atlas?.bytes
  ) {
    addError('atlas.bytes: fetched image length differs from the descriptor');
  }

  const frames = Array.isArray(data.frames) ? data.frames : [];
  if (!Array.isArray(data.frames)) {
    addError('frames: must be an ordered array');
  } else if (contract && frames.length !== contract.frames) {
    addError(`frames: expected exactly ${contract.frames} frames`);
  }
  const rectangles = [];
  for (
    let index = 0;
    index < Math.min(frames.length, MAX_FRAMES_PER_CLIP);
    index += 1
  ) {
    const frame = frames[index];
    const label = `frames[${index}]`;
    exactHighCadenceKeys(
      frame,
      HIGH_CADENCE_FRAME_KEYS,
      label,
      addError,
    );
    const valid =
      isObject(frame) &&
      Number.isInteger(frame.x) &&
      frame.x >= 0 &&
      Number.isInteger(frame.y) &&
      frame.y >= 0 &&
      isPositiveInteger(frame.width) &&
      isPositiveInteger(frame.height);
    if (!valid) {
      addError(`${label}: must be a positive integer rectangle`);
      continue;
    }
    if (
      frame.width !== set?.trim?.width ||
      frame.height !== set?.trim?.height
    ) {
      addError(`${label}: must match the set-wide shared trim`);
    }
    if (
      atlasSizeValid &&
      (
        frame.x + frame.width > atlas.width ||
        frame.y + frame.height > atlas.height
      )
    ) {
      addError(`${label}: outside atlas bounds`);
    }
    if (!SHA256.test(frame.sourceSha256 || '')) {
      addError(`${label}.sourceSha256: invalid SHA-256`);
    }
    if (!SHA256.test(frame.bodyPoseSha256 || '')) {
      addError(`${label}.bodyPoseSha256: invalid SHA-256`);
    }
    rectangles.push({ ...frame, label });
  }
  for (let left = 0; left < rectangles.length; left += 1) {
    for (let right = left + 1; right < rectangles.length; right += 1) {
      if (rectsOverlap(rectangles[left], rectangles[right])) {
        addError(`${rectangles[right].label}: overlaps an earlier frame`);
        break;
      }
    }
  }
  for (let index = 1; index < frames.length; index += 1) {
    if (
      frames[index]?.bodyPoseSha256 !==
      frames[index - 1]?.bodyPoseSha256
    ) {
      continue;
    }
    if (!holdAllowsRepeatedTransition(holdsToValidate, index)) {
      addError(`frames[${index}]: undeclared repeated body pose`);
    }
  }
  for (const hold of holdsToValidate) {
    if (
      !Number.isInteger(hold?.startIndex) ||
      !Number.isInteger(hold?.endIndex)
    ) {
      continue;
    }
    for (
      let index = hold.startIndex + 1;
      index <= Math.min(hold.endIndex, frames.length - 1);
      index += 1
    ) {
      if (
        frames[index]?.bodyPoseSha256 !==
        frames[index - 1]?.bodyPoseSha256
      ) {
        addError(`frames[${index}]: declared hold changes body pose`);
      }
    }
  }
  if (
    data.playback === 'loop' &&
    frames.length > 1 &&
    frames[0]?.bodyPoseSha256 !== frames.at(-1)?.bodyPoseSha256
  ) {
    addError('frames: loop must preserve the authored first/last closure');
  }
  validateHighCadenceEncoder(data.encoder, 'encoder', addError);
  return errors;
}

/**
 * Select an ordered frame from either a simulation timestamp or 0..1 progress.
 */
export function frameIndexForClip(clip, value) {
  const count = clip.frames.length;
  const safeValue = Number.isFinite(value) ? value : 0;
  if (clip.playback === 'loop') {
    const cycleSeconds = count / clip.fps;
    const cyclePosition = Math.max(0, safeValue) % cycleSeconds;
    return Math.min(count - 1, Math.floor(cyclePosition * clip.fps));
  }
  return Math.min(
    count - 1,
    Math.floor(clamp(safeValue, 0, 1) * count),
  );
}

function phaseForEntity(id) {
  let hash = 0;
  const value = String(id || 'enemy');
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return ((hash >>> 0) % 628) / 100;
}

function simulationTimestamp(context) {
  for (const value of [context?.timestamp, context?.time, context?.t]) {
    if (Number.isFinite(value)) return Math.max(0, value);
  }
  return 0;
}

/**
 * Resolve the exact creature clip precedence from current simulation state.
 *
 * `context.clips` is validated descriptor ownership. A low-HP boss may select
 * `broken` only when the current descriptor owns that clip. The validator and
 * motion store are responsible for admitting it only for the pack-declared
 * boss, so this selector never relies on a character ID allowlist.
 */
export function selectEnemyMotion(enemy, context = {}) {
  const loopValue =
    simulationTimestamp(context) + phaseForEntity(enemy?.id);
  const deathT = Number.isFinite(enemy?.deathT) ? enemy.deathT : 0;
  const deathMax =
    Number.isFinite(enemy?.deathMax) && enemy.deathMax > 0
      ? enemy.deathMax
      : 0.5;

  if (enemy?.killed && deathT > 0) {
    return {
      clip: 'death',
      value: 1 - clamp(deathT / deathMax, 0, 1),
    };
  }

  const hurt = Number.isFinite(enemy?.hurt) ? enemy.hurt : 0;
  if (hurt > 0) {
    const hurtMax =
      Number.isFinite(context.hurtMax) && context.hurtMax > 0
        ? context.hurtMax
        : 0.2;
    return {
      clip: 'hit',
      value: 1 - clamp(hurt / hurtMax, 0, 1),
    };
  }

  const hpRatio =
    Number.isFinite(enemy?.hp) &&
    Number.isFinite(enemy?.hpMax) &&
    enemy.hpMax > 0
      ? enemy.hp / enemy.hpMax
      : 1;
  const ownsBrokenClip =
    isObject(context.clips) &&
    Object.hasOwn(context.clips, 'broken');
  if (enemy?.type === 'boss' && ownsBrokenClip && hpRatio < 0.34) {
    return { clip: 'broken', value: loopValue };
  }

  const x = Number.isFinite(enemy?.x) ? enemy.x : 0;
  const meleeStop = Number.isFinite(context.meleeStop)
    ? context.meleeStop
    : 0;
  if (x > meleeStop + 0.5) {
    return { clip: 'advance', value: loopValue };
  }
  if (context.engagedId === enemy?.id) {
    return { clip: 'engaged', value: loopValue };
  }
  return { clip: 'idle', value: loopValue };
}

/**
 * Draw one shared-trim atlas frame at a normalized bottom-center pivot.
 */
export function drawMotionFrame(
  ctx,
  record,
  clipName,
  frameIndex,
  x,
  pivotY,
  drawTrimHeight,
) {
  const descriptor = record?.descriptor;
  const clip = descriptor?.clips?.[clipName];
  const frame = clip?.frames?.[frameIndex];
  const trim = descriptor?.trim;
  const frameSize = descriptor?.frameSize;
  const pivot = descriptor?.pivot;
  if (
    typeof ctx?.drawImage !== 'function' ||
    !record?.image ||
    !frame ||
    !trim ||
    !frameSize ||
    !pivot ||
    !Number.isFinite(x) ||
    !Number.isFinite(pivotY) ||
    !Number.isFinite(drawTrimHeight) ||
    drawTrimHeight <= 0
  ) {
    return null;
  }

  const scale = drawTrimHeight / trim.height;
  const destination = {
    x: x + (trim.x - frameSize.width * pivot.x) * scale,
    y: pivotY + (trim.y - frameSize.height * pivot.y) * scale,
    width: trim.width * scale,
    height: trim.height * scale,
  };
  ctx.drawImage(
    record.image,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    destination.x,
    destination.y,
    destination.width,
    destination.height,
  );
  return {
    clip: clipName,
    frameIndex,
    source: { ...frame },
    destination,
  };
}
