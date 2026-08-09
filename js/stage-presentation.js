/**
 * Pure bridge between intrinsic character geometry and APN-owned stage roles.
 * One presentation record resolves one source transform for every clip/frame.
 */

export const STAGE_ROLE_PRESENTATION = Object.freeze({
  hero: Object.freeze({ visibleBodyHeight: 96, visualGap: 6 }),
  standard: Object.freeze({ visibleBodyHeight: 72, visualGap: 2 }),
  elite: Object.freeze({ visibleBodyHeight: 84, visualGap: 2 }),
  boss: Object.freeze({ visibleBodyHeight: 112, visualGap: 2 }),
});

const SHA256 = /^[a-f0-9]{64}$/;
const MAX_ERRORS = 32;
const MAX_ACTORS = 64;
export const STAGE_OVERHEAD_GAP = 10;
const PRESENTATION_KEYS = new Set([
  'schemaVersion',
  'scaleContract',
  'reference',
  'visibleBounds',
  'motionBounds',
]);
const REFERENCE_KEYS = new Set(['clip', 'frameIndex', 'sourceSha256']);
const RECT_KEYS = new Set(['x', 'y', 'width', 'height']);
const SIZE_KEYS = new Set(['width', 'height']);
const PIVOT_KEYS = new Set(['x', 'y']);
const LEGACY_KEYS = new Set(['sourceSize', 'visibleInset']);
const FIT_KEYS = new Set([
  'groundY',
  'bannerClearance',
  'actors',
  'minFit',
  'maxFit',
]);

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function checkKeys(value, allowed, label, addError, exact = true) {
  if (!isObject(value)) {
    addError(`${label}: must be an object`);
    return false;
  }
  let count = 0;
  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue;
    count += 1;
    if (!allowed.has(key)) addError(`${label}: unexpected property "${key}"`);
    if (count > allowed.size) {
      addError(`${label}: too many properties`);
      break;
    }
  }
  if (exact) {
    for (const key of allowed) {
      if (!Object.hasOwn(value, key)) {
        addError(`${label}: missing property "${key}"`);
      }
    }
    if (count !== allowed.size) {
      addError(`${label}: expected exactly ${allowed.size} properties`);
    }
  }
  return true;
}

function finite(value, { positive = false, normalized = false } = {}) {
  if (!Number.isFinite(value)) return false;
  if (positive && value <= 0) return false;
  if (!positive && value < 0) return false;
  return !normalized || value <= 1;
}

function checkRect(rect, label, addError) {
  if (!checkKeys(rect, RECT_KEYS, label, addError)) return false;
  let valid = true;
  for (const key of ['x', 'y']) {
    if (!finite(rect[key])) {
      addError(`${label}.${key}: must be a finite non-negative number`);
      valid = false;
    }
  }
  for (const key of ['width', 'height']) {
    if (!finite(rect[key], { positive: true })) {
      addError(`${label}.${key}: must be a finite positive number`);
      valid = false;
    }
  }
  if (
    valid &&
    (!Number.isFinite(rect.x + rect.width) ||
      !Number.isFinite(rect.y + rect.height))
  ) {
    addError(`${label}: extent must remain finite`);
    valid = false;
  }
  return valid;
}

/**
 * Validate an untrusted, game-integration presentation record without throwing.
 * Descriptor owners separately bind the reference hash to their exact bytes.
 */
export function validatePresentationRecord(record, options = {}) {
  const errors = [];
  const addError = (message) => {
    if (errors.length < MAX_ERRORS) errors.push(message);
  };
  if (!checkKeys(record, PRESENTATION_KEYS, 'presentation', addError)) {
    return errors;
  }

  if (record.schemaVersion !== 1) {
    addError('presentation.schemaVersion: expected 1');
  }
  if (record.scaleContract !== 'visible-body') {
    addError('presentation.scaleContract: expected "visible-body"');
  }
  if (
    checkKeys(
      record.reference,
      REFERENCE_KEYS,
      'presentation.reference',
      addError,
    )
  ) {
    const expectedClip = options.referenceClip ?? 'idle';
    if (record.reference.clip !== expectedClip) {
      addError(`presentation.reference.clip: expected "${expectedClip}"`);
    }
    if (record.reference.frameIndex !== 0) {
      addError('presentation.reference.frameIndex: expected 0');
    }
    if (
      typeof record.reference.sourceSha256 !== 'string' ||
      !SHA256.test(record.reference.sourceSha256)
    ) {
      addError(
        'presentation.reference.sourceSha256: expected 64 lowercase hex characters',
      );
    }
  }

  const visibleValid = checkRect(
    record.visibleBounds,
    'presentation.visibleBounds',
    addError,
  );
  const motionValid = checkRect(
    record.motionBounds,
    'presentation.motionBounds',
    addError,
  );
  if (visibleValid && motionValid) {
    const visible = record.visibleBounds;
    const motion = record.motionBounds;
    if (
      motion.x > visible.x ||
      motion.y > visible.y ||
      motion.x + motion.width < visible.x + visible.width ||
      motion.y + motion.height < visible.y + visible.height
    ) {
      addError(
        'presentation.motionBounds: must contain presentation.visibleBounds',
      );
    }
  }
  return errors;
}

const freezeRect = ({ x, y, width, height }) =>
  Object.freeze({ x, y, width, height });

/**
 * Explicit compatibility adapter for a historical square/source-sized body.
 * The zero hash is a legacy sentinel, not a claim about authored source bytes.
 */
export function legacySquarePresentation(options = {}) {
  const errors = [];
  checkKeys(
    options,
    LEGACY_KEYS,
    'legacy square options',
    errors.push.bind(errors),
    false,
  );
  const sourceSize = options.sourceSize ?? 128;
  const visibleInset = options.visibleInset ?? 0;
  if (!finite(sourceSize, { positive: true })) {
    errors.push('sourceSize: must be a finite positive number');
  }
  if (!finite(visibleInset)) {
    errors.push('visibleInset: must be a finite non-negative number');
  }
  if (
    Number.isFinite(sourceSize) &&
    Number.isFinite(visibleInset) &&
    visibleInset * 2 >= sourceSize
  ) {
    errors.push('visibleInset: must leave a positive visible body');
  }
  if (errors.length) throw new RangeError(errors.join('; '));

  const visibleSize = sourceSize - visibleInset * 2;
  return Object.freeze({
    schemaVersion: 1,
    scaleContract: 'visible-body',
    reference: Object.freeze({
      clip: 'idle',
      frameIndex: 0,
      sourceSha256: '0'.repeat(64),
    }),
    visibleBounds: freezeRect({
      x: visibleInset,
      y: visibleInset,
      width: visibleSize,
      height: visibleSize,
    }),
    motionBounds: freezeRect({
      x: 0,
      y: 0,
      width: sourceSize,
      height: sourceSize,
    }),
  });
}

function geometryErrors({ actorX, groundY, fit, frameSize, trim, pivot }) {
  const errors = [];
  const addError = (message) => errors.push(message);
  if (!Number.isFinite(actorX)) addError('actorX: must be finite');
  if (!Number.isFinite(groundY)) addError('groundY: must be finite');
  if (!finite(fit, { positive: true })) {
    addError('fit: must be a finite positive number');
  }

  if (checkKeys(frameSize, SIZE_KEYS, 'frameSize', addError)) {
    for (const key of SIZE_KEYS) {
      if (!finite(frameSize[key], { positive: true })) {
        addError(`frameSize.${key}: must be a finite positive number`);
      }
    }
  }
  const trimValid = checkRect(trim, 'trim', addError);
  if (
    trimValid &&
    isObject(frameSize) &&
    Number.isFinite(frameSize.width) &&
    Number.isFinite(frameSize.height) &&
    (trim.x + trim.width > frameSize.width ||
      trim.y + trim.height > frameSize.height)
  ) {
    addError('trim: must be contained by frameSize');
  }
  if (checkKeys(pivot, PIVOT_KEYS, 'pivot', addError)) {
    for (const key of PIVOT_KEYS) {
      if (!finite(pivot[key], { normalized: true })) {
        addError(`pivot.${key}: must be normalized`);
      }
    }
  }
  return errors;
}

function resolveRect(input, rect) {
  const sourcePivotX = input.frameSize.width * input.pivot.x;
  const sourcePivotY = input.frameSize.height * input.pivot.y;
  const left =
    input.actorX +
    (input.trim.x + rect.x - sourcePivotX) * input.scale;
  const top =
    input.pivotY +
    (input.trim.y + rect.y - sourcePivotY) * input.scale;
  const width = rect.width * input.scale;
  const height = rect.height * input.scale;
  return Object.freeze({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  });
}

export function resolveActorGeometry(input = {}) {
  const {
    actorX,
    groundY,
    fit,
    role,
    frameSize,
    trim,
    pivot,
    presentation,
  } = input;
  const presentationErrors = validatePresentationRecord(presentation, {
    referenceClip: presentation?.reference?.clip ?? 'idle',
  });
  if (presentationErrors.length) {
    throw new Error(presentationErrors.join('; '));
  }
  if (!Object.hasOwn(STAGE_ROLE_PRESENTATION, role)) {
    throw new Error(`unknown stage role "${String(role)}"`);
  }
  const inputErrors = geometryErrors(input);
  if (inputErrors.length) throw new Error(inputErrors.join('; '));

  const roleContract = STAGE_ROLE_PRESENTATION[role];
  const targetBodyHeight = roleContract.visibleBodyHeight * fit;
  const visualGap = roleContract.visualGap * fit;
  const scale = targetBodyHeight / presentation.visibleBounds.height;
  const sourcePivotY = frameSize.height * pivot.y;
  const visibleBottomFromPivot =
    sourcePivotY -
    (trim.y +
      presentation.visibleBounds.y +
      presentation.visibleBounds.height);
  const pivotY =
    groundY - visualGap + visibleBottomFromPivot * scale;
  const rectInput = {
    actorX,
    frameSize,
    trim,
    pivot,
    pivotY,
    scale,
  };
  const resolvedBody = resolveRect(rectInput, presentation.visibleBounds);
  const bodyBottom = groundY - visualGap;
  const bodyTop = bodyBottom - targetBodyHeight;
  const body = Object.freeze({
    ...resolvedBody,
    top: bodyTop,
    bottom: bodyBottom,
    height: targetBodyHeight,
    centerY: bodyTop + targetBodyHeight / 2,
  });
  const resolvedMotion = resolveRect(
    rectInput,
    presentation.motionBounds,
  );
  const motionEnvelope = Object.freeze({
    left: resolvedMotion.left,
    top: resolvedMotion.top,
    right: resolvedMotion.right,
    bottom: resolvedMotion.bottom,
  });
  const anchors = Object.freeze({
    shadowX: body.centerX,
    shadowY: groundY,
    hpY: motionEnvelope.top - STAGE_OVERHEAD_GAP,
    floaterY: motionEnvelope.top - STAGE_OVERHEAD_GAP * 2,
    auraX: body.centerX,
    auraY: body.centerY,
    hitX: body.centerX,
    hitY: body.centerY,
    lootX: body.centerX,
    lootY: body.centerY,
  });
  const outputNumbers = [
    targetBodyHeight,
    visualGap,
    scale,
    pivotY,
    trim.height * scale,
    ...Object.values(body),
    ...Object.values(motionEnvelope),
    ...Object.values(anchors),
  ];
  if (!outputNumbers.every(Number.isFinite)) {
    throw new RangeError('resolved actor geometry must remain finite');
  }
  return Object.freeze({
    role,
    targetBodyHeight,
    visualGap,
    scale,
    pivotY,
    drawTrimHeight: trim.height * scale,
    body,
    motionEnvelope,
    anchors,
  });
}

/**
 * Fit the active cast's tallest authored envelope below fixed stage chrome.
 */
export function stageFitForActors(options = {}) {
  const optionErrors = [];
  checkKeys(
    options,
    FIT_KEYS,
    'stage fit options',
    optionErrors.push.bind(optionErrors),
    false,
  );
  const {
    groundY,
    bannerClearance = 78,
    actors,
    minFit = 0.5,
    maxFit = 1,
  } = options;
  if (!finite(groundY)) {
    optionErrors.push('groundY: must be a finite non-negative number');
  }
  if (!finite(bannerClearance)) {
    optionErrors.push(
      'bannerClearance: must be a finite non-negative number',
    );
  }
  if (!Array.isArray(actors) || actors.length > MAX_ACTORS) {
    optionErrors.push(`actors: must contain at most ${MAX_ACTORS} actors`);
  }
  if (
    !Number.isFinite(minFit) ||
    !Number.isFinite(maxFit) ||
    minFit <= 0 ||
    minFit > maxFit ||
    maxFit > 1
  ) {
    optionErrors.push('fit bounds: expected 0 < minFit <= maxFit <= 1');
  }
  if (optionErrors.length) throw new RangeError(optionErrors.join('; '));
  if (actors.length === 0) return maxFit;

  const availableHeight = groundY - bannerClearance;
  let fitLimit = maxFit;
  const actorErrors = [];
  for (const [index, actor] of actors.entries()) {
    if (!isObject(actor) || !Object.hasOwn(STAGE_ROLE_PRESENTATION, actor.role)) {
      actorErrors.push(`actors[${index}]: unknown stage role`);
      continue;
    }
    const errors = validatePresentationRecord(actor.presentation);
    actorErrors.push(...errors.map((error) => `actors[${index}]: ${error}`));
    if (errors.length) continue;
    const overheadClearance = actor.overheadClearance ?? 0;
    if (!finite(overheadClearance)) {
      actorErrors.push(
        `actors[${index}].overheadClearance: must be a finite non-negative number`,
      );
      continue;
    }
    const role = STAGE_ROLE_PRESENTATION[actor.role];
    const visibleBottom =
      actor.presentation.visibleBounds.y +
      actor.presentation.visibleBounds.height;
    const motionTop = actor.presentation.motionBounds.y;
    const requiredHeight =
      role.visualGap +
      role.visibleBodyHeight *
        ((visibleBottom - motionTop) /
          actor.presentation.visibleBounds.height);
    fitLimit = Math.min(
      fitLimit,
      (availableHeight - overheadClearance) / requiredHeight,
    );
  }
  if (actorErrors.length) throw new Error(actorErrors.join('; '));
  return Math.min(
    maxFit,
    Math.max(minFit, fitLimit),
  );
}
