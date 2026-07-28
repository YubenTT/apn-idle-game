/**
 * Pure runtime contract for one character-owned GAF2D motion bundle.
 *
 * This module deliberately owns no fetch, decode, DOM, or render-loop state.
 * Callers validate once at the resource boundary, then use the deterministic
 * selector and one-call blitter from simulation state.
 */

export const MOTION_GRAMMAR = 'gaf2d-motion-bundle-v1';
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
const ATLAS_KEYS = new Set(['width', 'height', 'sha256']);
const SIZE_KEYS = new Set(['width', 'height']);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const PIVOT_KEYS = new Set(['x', 'y']);
const CLIP_KEYS = new Set(['playback', 'fps', 'frames']);
const LINEAGE_KEYS = new Set([
  ...REQUIRED_LINEAGE_HASHES,
  'rigApprovalSha256',
]);
const ENCODER_KEYS = new Set(['name', 'version', 'arguments']);
const EXACT_ENCODER_VERSION = '1.6.0';
const EXACT_ENCODER_ARGUMENTS = Object.freeze(['-exact', '-q', '90']);

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
export function validateMotionBundle(data, expectedAssetId, options = {}) {
  const errors = [];
  const addError = (message) => {
    if (errors.length < MAX_VALIDATION_ERRORS) errors.push(message);
  };
  const isBoss = options?.role === 'boss';
  if (!isObject(data)) return ['bundle: must be an object'];
  rejectUnknownProperties(data, TOP_LEVEL_KEYS, 'bundle', addError);

  if (data.grammar !== MOTION_GRAMMAR) {
    addError(`grammar: expected "${MOTION_GRAMMAR}"`);
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

  rejectUnknownProperties(data.pivot, PIVOT_KEYS, 'pivot', addError);
  if (
    !isObject(data.pivot) ||
    data.pivot.x !== 0.5 ||
    data.pivot.y !== 1
  ) {
    addError('pivot: must be the normalized bottom-center point (0.5, 1)');
  }

  if (!isObject(data.lineage)) {
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
  footY,
  height,
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
    !Number.isFinite(footY) ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    return null;
  }

  const scale = height / trim.height;
  const destination = {
    x: x + (trim.x - frameSize.width * pivot.x) * scale,
    y: footY + (trim.y - frameSize.height * pivot.y) * scale,
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
