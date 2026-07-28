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
const WARDEN_DECODED_BYTES = 8 * 1024 * 1024;
const BROKEN_ASSET_ID = 'site-warden';
const REQUIRED_LINEAGE_HASHES = Object.freeze([
  'identityApprovalSha256',
  'motionApprovalSha256',
  'motionSetCandidateSha256',
  'motionSetApprovalSha256',
  'sourceManifestSha256',
  'exportArtifactSha256',
]);

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

/**
 * Validate untrusted descriptor JSON without throwing.
 *
 * The expected asset ID comes from pack metadata and therefore also selects the
 * trusted decoded-byte class; an untrusted descriptor cannot promote itself to
 * the larger Site Warden allowance.
 */
export function validateMotionBundle(data, expectedAssetId) {
  const errors = [];
  const addError = (message) => {
    if (errors.length < MAX_VALIDATION_ERRORS) errors.push(message);
  };
  if (!isObject(data)) return ['bundle: must be an object'];

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
    const assetId =
      typeof expectedAssetId === 'string' ? expectedAssetId : data.assetId;
    const decodedLimit =
      assetId === BROKEN_ASSET_ID
        ? WARDEN_DECODED_BYTES
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
  const frameSizeValid =
    isObject(frameSize) &&
    isPositiveInteger(frameSize.width) &&
    isPositiveInteger(frameSize.height);
  if (!frameSizeValid) {
    addError('frameSize: width and height must be positive integers');
  }

  const trim = data.trim;
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

  if (
    !isObject(data.encoder) ||
    typeof data.encoder.name !== 'string' ||
    data.encoder.name.length === 0 ||
    typeof data.encoder.version !== 'string' ||
    data.encoder.version.length === 0 ||
    !Array.isArray(data.encoder.arguments) ||
    data.encoder.arguments.length === 0 ||
    !data.encoder.arguments.every((argument) => typeof argument === 'string')
  ) {
    addError(
      'encoder: name, version, and canonical string arguments are required',
    );
  }

  if (!isObject(data.clips)) {
    addError('clips: must be an object');
    return errors;
  }

  const clipNames = Object.keys(data.clips);
  const allowedClips = new Set([...REQUIRED_CLIPS, 'broken']);
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
  if (data.assetId === BROKEN_ASSET_ID && !ownsBrokenClip) {
    addError('clips: missing required clip "broken"');
  } else if (ownsBrokenClip && data.assetId !== BROKEN_ASSET_ID) {
    addError(`clips: "broken" is only allowed for "${BROKEN_ASSET_ID}"`);
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
      !Number.isFinite(clip.fps) ||
      clip.fps < MIN_CLIP_FPS ||
      clip.fps > MAX_CLIP_FPS
    ) {
      addError(
        `clips.${name}.fps: must be finite and within ${MIN_CLIP_FPS}..${MAX_CLIP_FPS}`,
      );
    }
    if (!Array.isArray(clip.frames) || clip.frames.length === 0) {
      addError(`clips.${name}.frames: must be a nonempty ordered array`);
      continue;
    }

    const framesToValidate = Math.min(
      clip.frames.length,
      MAX_FRAMES_PER_CLIP,
      Math.max(0, MAX_TOTAL_FRAMES - validatedFrameCount),
    );
    for (let index = 0; index < framesToValidate; index += 1) {
      const rect = clip.frames[index];
      const label = `clips.${name}.frames[${index}]`;
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
    Math.round(clamp(safeValue, 0, 1) * (count - 1)),
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
 * `context.assetId` and `context.clips` are the validated descriptor ownership
 * fields. A low-HP boss may select `broken` only when both identify Site Warden
 * and the current descriptor owns that clip.
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
    context.assetId === BROKEN_ASSET_ID &&
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
