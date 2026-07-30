/**
 * Pure, closed-world APN Hero clip-set contract.
 *
 * Historical runtime bytes stay playable without acquiring approval lineage.
 * A replacement may call itself approved only when the exact identity, complete
 * motion set, rig, export, and pinned derivative toolchain are all present.
 */

export const HERO_SET_GRAMMAR = 'gaf2d-hero-set-v1';
export const HERO_APPROVED_CLIP_GRAMMAR = 'gaf2d-hero-clip-v1';
export const HERO_PREVIEW_SET_GRAMMAR = 'gaf2d-hero-preview-set-v1';
export const HERO_PREVIEW_CLIP_GRAMMAR = 'gaf2d-hero-preview-clip-v1';
export const HERO_TOOLCHAIN_GRAMMAR = 'apn-gaf2d-hero-toolchain-v1';
export const HERO_MATRIX_PROFILE_GRAMMAR =
  'apn-gaf2d-matrix-toolchain-v1';
export const HERO_MATRIX_PROFILE_SHA256 =
  '79b3b980f7b360585605a491bf176f54adf264fb31ecade68c9f0e7348fb9a69';
export const HERO_TOOLCHAIN_OPERATIONS = Object.freeze([
  'crop:normalized-png:shared-trim:repage:png32',
  'montage:row-major:bounded-matrix:shared-cell:no-gap:transparent:alpha-on:png-color-type-6',
]);

export const HERO_V3_APPROVED_CONTRACT = Object.freeze({
  idle: Object.freeze({ frames: 8, playback: 'loop' }),
  run: Object.freeze({ frames: 10, playback: 'loop' }),
  attack: Object.freeze({ frames: 8, playback: 'progress' }),
  crit: Object.freeze({ frames: 8, playback: 'progress' }),
  sprint: Object.freeze({ frames: 10, playback: 'loop' }),
  hit: Object.freeze({ frames: 4, playback: 'progress' }),
  death: Object.freeze({ frames: 8, playback: 'progress' }),
  celebrate: Object.freeze({ frames: 8, playback: 'loop' }),
});
export const HERO_CLIP_CONTRACT = HERO_V3_APPROVED_CONTRACT;
export const HERO_V3_CLIPS = Object.freeze(
  Object.keys(HERO_V3_APPROVED_CONTRACT),
);

export const MAX_HERO_SET_BYTES = 64 * 1024;
export const MAX_HERO_DESCRIPTOR_BYTES = 128 * 1024;
export const MAX_HERO_IMAGE_BYTES = 1.5 * 1024 * 1024;
export const MAX_HERO_ATLAS_DIMENSION = 4096;
export const MAX_HERO_APPROVED_DECODED_BYTES = 8 * 1024 * 1024;
const MAX_HERO_FRAMES_PER_CLIP = 64;
const MAX_ERRORS = 64;
const SHA256 = /^[a-f0-9]{64}$/;
const TOP_KEYS = new Set([
  'grammar',
  'status',
  'clips',
  'lineage',
  'toolchain',
]);
const PREVIEW_TOP_KEYS = new Set([
  'grammar',
  'status',
  'authority',
  'clips',
  'previewLineage',
  'toolchain',
]);
const SET_CLIP_KEYS = new Set([
  'descriptor',
  'descriptorSha256',
  'image',
  'imageSha256',
]);
const LINEAGE_KEYS = new Set([
  'identityApprovalSha256',
  'motionApprovalSha256',
  'motionSetCandidateSha256',
  'motionSetApprovalSha256',
  'rigApprovalSha256',
  'sourceManifestSha256',
  'exportArtifactSha256',
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
const TOOLCHAIN_KEYS = new Set([
  'grammar',
  'compositor',
  'encoder',
  'operations',
  'profileSha256',
]);
const COMPOSITOR_KEYS = new Set(['name', 'version']);
const ENCODER_KEYS = new Set(['name', 'version', 'arguments']);
const LEGACY_DESCRIPTOR_KEYS = new Set([
  'name',
  'fps',
  'frameSize',
  'frames',
  'anchor',
  'anchorPx',
  'trim',
  'atlas',
  'source',
]);
const APPROVED_DESCRIPTOR_KEYS = new Set([
  'grammar',
  'name',
  'playback',
  'fps',
  'frameSize',
  'frames',
  'anchor',
  'trim',
  'atlas',
  'lineage',
  'encoder',
]);
const PREVIEW_DESCRIPTOR_KEYS = new Set([
  'grammar',
  'authority',
  'name',
  'playback',
  'fps',
  'frameSize',
  'frames',
  'anchor',
  'trim',
  'atlas',
  'previewLineage',
  'encoder',
]);
const LEGACY_RECT_KEYS = new Set(['x', 'y', 'w', 'h']);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const SIZE_KEYS = new Set(['width', 'height']);
const APPROVED_ATLAS_KEYS = new Set([
  'width',
  'height',
  'bytes',
  'sha256',
]);
const LEGACY_ATLAS_KEYS = new Set(['w', 'h', 'bytes']);

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const positiveInteger = (value) => Number.isInteger(value) && value > 0;

function exactKeys(value, expected, label, addError) {
  if (!isObject(value)) {
    addError(`${label}: must be an object`);
    return false;
  }
  const actual = Object.keys(value);
  if (
    actual.length !== expected.size ||
    actual.some((key) => !expected.has(key))
  ) {
    addError(
      `${label}: must contain exactly ${[...expected].sort().join(', ')}`,
    );
    return false;
  }
  return true;
}

function arraysEqual(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  );
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
  }
  if (!isObject(value)) return JSON.stringify(value);
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(',')}}`;
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

function portableRelativePath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.includes('://') &&
    !value.includes('?') &&
    !value.includes('#') &&
    value.split('/').every((part) => part && part !== '.' && part !== '..')
  );
}

function validSize(value, keys = SIZE_KEYS) {
  return (
    isObject(value) &&
    [...keys].every((key) => positiveInteger(value[key]))
  );
}

function validRect(value, keys = RECT_KEYS) {
  const [xKey, yKey, widthKey, heightKey] =
    keys === LEGACY_RECT_KEYS
      ? ['x', 'y', 'w', 'h']
      : ['x', 'y', 'width', 'height'];
  return (
    isObject(value) &&
    Number.isInteger(value[xKey]) &&
    value[xKey] >= 0 &&
    Number.isInteger(value[yKey]) &&
    value[yKey] >= 0 &&
    positiveInteger(value[widthKey]) &&
    positiveInteger(value[heightKey])
  );
}

function rectanglesOverlap(left, right, legacy = false) {
  const width = legacy ? 'w' : 'width';
  const height = legacy ? 'h' : 'height';
  return (
    left.x < right.x + right[width] &&
    left.x + left[width] > right.x &&
    left.y < right.y + right[height] &&
    left.y + left[height] > right.y
  );
}

function validateLineage(value, label, addError) {
  if (!exactKeys(value, LINEAGE_KEYS, label, addError)) return;
  for (const key of LINEAGE_KEYS) {
    if (!SHA256.test(value[key] || '')) {
      addError(`${label}.${key}: must be a lowercase SHA-256`);
    }
  }
}

function validatePreviewLineage(value, assetId, label, addError) {
  if (!exactKeys(value, PREVIEW_LINEAGE_KEYS, label, addError)) return;
  if (value.candidateId !== `${assetId}-authored-semantic-v2`) {
    addError(
      `${label}.candidateId: expected "${assetId}-authored-semantic-v2"`,
    );
  }
  for (const key of PREVIEW_LINEAGE_HASHES) {
    if (!SHA256.test(value[key] || '')) {
      addError(`${label}.${key}: must be a lowercase SHA-256`);
    }
  }
  if (!positiveInteger(value.sourceManifestVersion)) {
    addError(`${label}.sourceManifestVersion: must be a positive integer`);
  }
}

function validateEncoder(value, label, addError) {
  if (!exactKeys(value, ENCODER_KEYS, label, addError)) return;
  if (
    value.name !== 'cwebp' ||
    value.version !== '1.6.0' ||
    !arraysEqual(value.arguments, ['-exact', '-q', '90'])
  ) {
    addError(
      `${label}: must equal cwebp 1.6.0 with arguments ["-exact","-q","90"]`,
    );
  }
}

function validateToolchain(value, addError) {
  if (!exactKeys(value, TOOLCHAIN_KEYS, 'toolchain', addError)) return;
  if (value.grammar !== HERO_TOOLCHAIN_GRAMMAR) {
    addError(`toolchain.grammar: expected "${HERO_TOOLCHAIN_GRAMMAR}"`);
  }
  if (
    exactKeys(value.compositor, COMPOSITOR_KEYS, 'toolchain.compositor', addError)
    && (
      value.compositor.name !== 'ImageMagick' ||
      value.compositor.version !== '7.1.2-13'
    )
  ) {
    addError('toolchain.compositor: expected ImageMagick 7.1.2-13');
  }
  validateEncoder(value.encoder, 'toolchain.encoder', addError);
  if (!arraysEqual(value.operations, HERO_TOOLCHAIN_OPERATIONS)) {
    addError('toolchain.operations: derivative operation profile is not canonical');
  }
  if (value.profileSha256 !== HERO_MATRIX_PROFILE_SHA256) {
    addError(
      `toolchain.profileSha256: expected ${HERO_MATRIX_PROFILE_SHA256}`,
    );
  }
}

export function validateHeroSetManifest(data, options = {}) {
  const errors = [];
  const addError = (message) => {
    if (errors.length < MAX_ERRORS) errors.push(message);
  };
  const isPreview =
    data?.status === 'preview' ||
    data?.grammar === HERO_PREVIEW_SET_GRAMMAR;
  const expectedKeys = isPreview ? PREVIEW_TOP_KEYS : TOP_KEYS;
  if (!exactKeys(data, expectedKeys, 'set', addError)) return errors;
  const expectedGrammar = isPreview
    ? HERO_PREVIEW_SET_GRAMMAR
    : HERO_SET_GRAMMAR;
  if (data.grammar !== expectedGrammar) {
    addError(`grammar: expected "${expectedGrammar}"`);
  }
  if (isPreview && data.status !== 'preview') {
    addError('status: expected "preview"');
  } else if (!isPreview && !['historical', 'approved'].includes(data.status)) {
    addError('status: expected "historical" or "approved"');
  }
  if (
    !isObject(data.clips) ||
    Object.keys(data.clips).length !== HERO_V3_CLIPS.length ||
    HERO_V3_CLIPS.some((name) => !Object.hasOwn(data.clips, name))
  ) {
    addError(`clips: must contain exactly ${HERO_V3_CLIPS.join(', ')}`);
  } else {
    for (const name of HERO_V3_CLIPS) {
      const clip = data.clips[name];
      if (!exactKeys(clip, SET_CLIP_KEYS, `clips.${name}`, addError)) continue;
      if (!portableBasename(clip.descriptor, `${name}.json`)) {
        addError(`clips.${name}.descriptor: expected "${name}.json"`);
      }
      if (!portableBasename(clip.image, `${name}.webp`)) {
        addError(`clips.${name}.image: expected "${name}.webp"`);
      }
      if (!SHA256.test(clip.descriptorSha256 || '')) {
        addError(`clips.${name}.descriptorSha256: invalid SHA-256`);
      }
      if (!SHA256.test(clip.imageSha256 || '')) {
        addError(`clips.${name}.imageSha256: invalid SHA-256`);
      }
    }
  }
  if (isPreview) {
    if (options.allowUnapprovedPreview !== true) {
      addError('preview set: explicit allowUnapprovedPreview opt-in is required');
    }
    if (data.authority !== 'unapproved_preview') {
      addError('preview set.authority: expected "unapproved_preview"');
    }
    validatePreviewLineage(
      data.previewLineage,
      'apn-hero',
      'previewLineage',
      addError,
    );
    validateToolchain(data.toolchain, addError);
  } else if (data.status === 'historical') {
    if (data.lineage !== null || data.toolchain !== null) {
      addError('historical set: lineage and toolchain must both be null');
    }
  } else if (data.status === 'approved') {
    validateLineage(data.lineage, 'lineage', addError);
    validateToolchain(data.toolchain, addError);
  }
  return errors;
}

export const validateHeroSet = validateHeroSetManifest;

function validateFrames(
  frames,
  atlas,
  trim,
  { legacy, exactCount, label, addError },
) {
  if (
    !Array.isArray(frames) ||
    frames.length === 0 ||
    frames.length > MAX_HERO_FRAMES_PER_CLIP
  ) {
    addError(
      `${label}.frames: must contain 1..${MAX_HERO_FRAMES_PER_CLIP} frames`,
    );
    return;
  }
  if (exactCount !== null && frames.length !== exactCount) {
    addError(`${label}.frames: expected exactly ${exactCount} frames`);
  }
  const rectKeys = legacy ? LEGACY_RECT_KEYS : RECT_KEYS;
  const widthKey = legacy ? 'w' : 'width';
  const heightKey = legacy ? 'h' : 'height';
  const atlasWidth = legacy ? atlas?.w : atlas?.width;
  const atlasHeight = legacy ? atlas?.h : atlas?.height;
  const trimWidth = legacy ? trim?.w : trim?.width;
  const trimHeight = legacy ? trim?.h : trim?.height;
  const validFrames = [];
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    if (
      !exactKeys(frame, rectKeys, `${label}.frames[${index}]`, addError) ||
      !validRect(frame, rectKeys)
    ) {
      addError(`${label}.frames[${index}]: invalid rectangle`);
      continue;
    }
    if (
      frame[widthKey] !== trimWidth ||
      frame[heightKey] !== trimHeight
    ) {
      addError(`${label}.frames[${index}]: must match the shared trim size`);
    }
    if (
      Number.isInteger(atlasWidth) &&
      Number.isInteger(atlasHeight) &&
      (frame.x + frame[widthKey] > atlasWidth ||
        frame.y + frame[heightKey] > atlasHeight)
    ) {
      addError(`${label}.frames[${index}]: outside atlas bounds`);
    }
    validFrames.push(frame);
  }
  for (let left = 0; left < validFrames.length; left += 1) {
    for (let right = left + 1; right < validFrames.length; right += 1) {
      if (rectanglesOverlap(validFrames[left], validFrames[right], legacy)) {
        addError(`${label}.frames[${right}]: overlaps an earlier frame`);
        return;
      }
    }
  }
}

function validateHistoricalDescriptor(data, clipName, addError) {
  if (
    !exactKeys(
      data,
      LEGACY_DESCRIPTOR_KEYS,
      `historical ${clipName}`,
      addError,
    )
  ) {
    return;
  }
  if (data.name !== clipName) {
    addError(`historical ${clipName}.name: expected "${clipName}"`);
  }
  if (!Number.isInteger(data.fps) || data.fps < 1 || data.fps > 60) {
    addError(`historical ${clipName}.fps: expected integer 1..60`);
  }
  if (!positiveInteger(data.frameSize) || data.frameSize > 4096) {
    addError(`historical ${clipName}.frameSize: invalid`);
  }
  if (!arraysEqual(data.anchor, [0.5, 1])) {
    addError(`historical ${clipName}.anchor: expected [0.5,1]`);
  }
  if (
    !Array.isArray(data.anchorPx) ||
    data.anchorPx.length !== 2 ||
    data.anchorPx.some((value) => !Number.isFinite(value))
  ) {
    addError(`historical ${clipName}.anchorPx: invalid`);
  }
  if (
    !exactKeys(data.trim, LEGACY_RECT_KEYS, `historical ${clipName}.trim`, addError)
    || !validRect(data.trim, LEGACY_RECT_KEYS)
  ) {
    addError(`historical ${clipName}.trim: invalid rectangle`);
  } else if (
    data.trim.x + data.trim.w > data.frameSize ||
    data.trim.y + data.trim.h > data.frameSize
  ) {
    addError(`historical ${clipName}.trim: outside frameSize`);
  }
  if (
    !exactKeys(
      data.atlas,
      LEGACY_ATLAS_KEYS,
      `historical ${clipName}.atlas`,
      addError,
    ) ||
    !validSize(data.atlas, new Set(['w', 'h'])) ||
    !positiveInteger(data.atlas.bytes) ||
    data.atlas.w > MAX_HERO_ATLAS_DIMENSION ||
    data.atlas.h > MAX_HERO_ATLAS_DIMENSION ||
    data.atlas.bytes > MAX_HERO_IMAGE_BYTES
  ) {
    addError(`historical ${clipName}.atlas: invalid or over budget`);
  }
  if (!portableRelativePath(data.source)) {
    addError(`historical ${clipName}.source: must be a portable relative path`);
  }
  validateFrames(data.frames, data.atlas, data.trim, {
    legacy: true,
    exactCount: null,
    label: `historical ${clipName}`,
    addError,
  });
}

function validateModernHeroDescriptor(
  data,
  clipName,
  setManifest = null,
  authorityMode = 'approved',
) {
  const errors = [];
  const addError = (message) => {
    if (errors.length < MAX_ERRORS) errors.push(message);
  };
  const isPreview = authorityMode === 'preview';
  const label = `${authorityMode} ${clipName}`;
  const contract = HERO_V3_APPROVED_CONTRACT[clipName];
  if (!contract) {
    return [`${authorityMode} clip: unknown name "${String(clipName)}"`];
  }
  if (
    !exactKeys(
      data,
      isPreview ? PREVIEW_DESCRIPTOR_KEYS : APPROVED_DESCRIPTOR_KEYS,
      label,
      addError,
    )
  ) {
    return errors;
  }
  const expectedGrammar = isPreview
    ? HERO_PREVIEW_CLIP_GRAMMAR
    : HERO_APPROVED_CLIP_GRAMMAR;
  if (data.grammar !== expectedGrammar) {
    addError(
      `${label}.grammar: expected "${expectedGrammar}"`,
    );
  }
  if (isPreview && data.authority !== 'unapproved_preview') {
    addError(`${label}.authority: expected "unapproved_preview"`);
  }
  if (data.name !== clipName) {
    addError(`${label}.name: expected "${clipName}"`);
  }
  if (data.playback !== contract.playback) {
    addError(
      `${label}.playback: expected "${contract.playback}"`,
    );
  }
  if (!Number.isInteger(data.fps) || data.fps < 1 || data.fps > 60) {
    addError(`${label}.fps: expected integer 1..60`);
  }
  if (
    !exactKeys(
      data.frameSize,
      SIZE_KEYS,
      `${label}.frameSize`,
      addError,
    ) ||
    !validSize(data.frameSize) ||
    data.frameSize.width > MAX_HERO_ATLAS_DIMENSION ||
      data.frameSize.height > MAX_HERO_ATLAS_DIMENSION
  ) {
    addError(`${label}.frameSize: invalid`);
  }
  if (!arraysEqual(data.anchor, [0.5, 1])) {
    addError(`${label}.anchor: expected [0.5,1]`);
  }
  if (
    !exactKeys(data.trim, RECT_KEYS, `${label}.trim`, addError) ||
    !validRect(data.trim)
  ) {
    addError(`${label}.trim: invalid rectangle`);
  } else if (
    data.trim.x + data.trim.width > data.frameSize?.width ||
    data.trim.y + data.trim.height > data.frameSize?.height
  ) {
    addError(`${label}.trim: outside frameSize`);
  }
  if (
    !exactKeys(
      data.atlas,
      APPROVED_ATLAS_KEYS,
      `${label}.atlas`,
      addError,
    ) ||
    !validSize(data.atlas) ||
    !positiveInteger(data.atlas.bytes) ||
    data.atlas.width > MAX_HERO_ATLAS_DIMENSION ||
    data.atlas.height > MAX_HERO_ATLAS_DIMENSION ||
    data.atlas.width * data.atlas.height * 4 >
      MAX_HERO_APPROVED_DECODED_BYTES ||
    data.atlas.bytes > MAX_HERO_IMAGE_BYTES ||
    !SHA256.test(data.atlas.sha256 || '')
  ) {
    addError(`${label}.atlas: invalid or over budget`);
  }
  if (isPreview) {
    validatePreviewLineage(
      data.previewLineage,
      'apn-hero',
      `${label}.previewLineage`,
      addError,
    );
  } else {
    validateLineage(data.lineage, `${label}.lineage`, addError);
  }
  validateEncoder(data.encoder, `${label}.encoder`, addError);
  validateFrames(data.frames, data.atlas, data.trim, {
    legacy: false,
    exactCount: contract.frames,
    label,
    addError,
  });
  if (
    setManifest?.status === authorityMode ||
    (isPreview && setManifest?.status === 'preview')
  ) {
    const setClip = setManifest.clips?.[clipName];
    if (data.atlas?.sha256 !== setClip?.imageSha256) {
      addError(`${label}.atlas.sha256: differs from set image hash`);
    }
    const descriptorLineage = isPreview
      ? data.previewLineage
      : data.lineage;
    const setLineage = isPreview
      ? setManifest.previewLineage
      : setManifest.lineage;
    if (stableJson(descriptorLineage) !== stableJson(setLineage)) {
      addError(`${label}.lineage: differs from set lineage`);
    }
    if (
      stableJson(data.encoder) !== stableJson(setManifest.toolchain?.encoder)
    ) {
      addError(`${label}.encoder: differs from set toolchain`);
    }
  }
  return errors;
}

export function validateApprovedHeroDescriptor(
  data,
  clipName,
  setManifest = null,
) {
  return validateModernHeroDescriptor(
    data,
    clipName,
    setManifest,
    'approved',
  );
}

export function validatePreviewHeroDescriptor(
  data,
  clipName,
  setManifest = null,
) {
  return validateModernHeroDescriptor(
    data,
    clipName,
    setManifest,
    'preview',
  );
}

export function validateHeroClipDescriptor(
  data,
  clipName,
  setManifest,
  options = {},
) {
  if (setManifest?.status === 'approved') {
    return validateApprovedHeroDescriptor(data, clipName, setManifest);
  }
  if (setManifest?.status === 'preview') {
    if (options.allowUnapprovedPreview !== true) {
      return ['preview clip: explicit allowUnapprovedPreview opt-in is required'];
    }
    return validatePreviewHeroDescriptor(data, clipName, setManifest);
  }
  const errors = [];
  const addError = (message) => {
    if (errors.length < MAX_ERRORS) errors.push(message);
  };
  validateHistoricalDescriptor(data, clipName, addError);
  return errors;
}
