const SHA256 = /^[a-f0-9]{64}$/;
const CONSUMER_SCALE_KEYS = Object.freeze([
  'grammar',
  'role',
  'maximumCssBodyHeight',
  'maximumDpr',
  'displayedDevicePixels',
  'runtimeCanvasClass',
  'sourceVisiblePixels',
  'scaleRatio',
]);
const SCALE_RATIO_KEYS = Object.freeze(['numerator', 'denominator']);
const QUALITY_PROFILE_KEYS = Object.freeze([
  'grammar',
  'selectedProfileSha256',
  'manifestProfileSha256',
  'encoderProfileSha256',
]);
const ROLE_BODY_HEIGHT = Object.freeze({
  hero: 96,
  standard: 72,
  elite: 84,
  boss: 112,
});
const RUNTIME_CANVAS_CLASSES = Object.freeze([256, 320]);
const ROLE_RUNTIME_CANVAS_CLASS = Object.freeze({
  hero: 320,
  standard: 256,
  elite: 256,
  boss: 320,
});
export const VISUAL_FIDELITY_BUDGETS = Object.freeze({
  commonEncodedBytes: 1.25 * 1024 * 1024,
  bossEncodedBytes: 2.25 * 1024 * 1024,
  heroEncodedBytes: 640 * 1024,
  commonDecodedBytes: 6 * 1024 * 1024,
  bossDecodedBytes: 10 * 1024 * 1024,
  heroDecodedBytes: 8 * 1024 * 1024,
  heroCompressedBytes: 3.5 * 1024 * 1024,
  newMotionCompressedBytes: 32 * 1024 * 1024,
  maxWaveDecodedBytes: 48 * 1024 * 1024,
  hotTexturesBytes: 64 * 1024 * 1024,
});

function normalizedRole(role) {
  if (role === 'hero' || role === 'boss') return role;
  if (role === 'character' || role === 'standard' || role === 'elite') {
    return 'standard';
  }
  return null;
}

export function visualFidelityEncodedLimit(role) {
  switch (normalizedRole(role)) {
    case 'hero':
      return VISUAL_FIDELITY_BUDGETS.heroEncodedBytes;
    case 'boss':
      return VISUAL_FIDELITY_BUDGETS.bossEncodedBytes;
    case 'standard':
      return VISUAL_FIDELITY_BUDGETS.commonEncodedBytes;
    default:
      return null;
  }
}

export function visualFidelityDecodedLimit(role) {
  switch (normalizedRole(role)) {
    case 'hero':
      return VISUAL_FIDELITY_BUDGETS.heroDecodedBytes;
    case 'boss':
      return VISUAL_FIDELITY_BUDGETS.bossDecodedBytes;
    case 'standard':
      return VISUAL_FIDELITY_BUDGETS.commonDecodedBytes;
    default:
      return null;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return (
    isObject(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

export function validateConsumerScaleContract(value) {
  const errors = [];
  if (!hasExactKeys(value, CONSUMER_SCALE_KEYS)) {
    return ['consumer scale has an unexpected property set'];
  }
  if (value.grammar !== 'gaf2d-consumer-scale-v4') {
    errors.push('consumer scale grammar must be gaf2d-consumer-scale-v4');
  }
  const expectedBodyHeight = ROLE_BODY_HEIGHT[value.role];
  if (!expectedBodyHeight) {
    errors.push('consumer scale role is not trusted');
  } else if (value.maximumCssBodyHeight !== expectedBodyHeight) {
    errors.push(`${value.role} maximum CSS body height must be ${expectedBodyHeight}`);
  }
  if (value.maximumDpr !== 2) {
    errors.push('consumer scale maximum DPR must be exactly 2');
  }
  if (
    !positiveInteger(value.displayedDevicePixels) ||
    value.displayedDevicePixels !== value.maximumCssBodyHeight * value.maximumDpr
  ) {
    errors.push('displayed device pixels must equal maximum CSS body height times DPR');
  }
  if (!RUNTIME_CANVAS_CLASSES.includes(value.runtimeCanvasClass)) {
    errors.push('runtime canvas class must be exactly 256 or 320');
  } else if (
    expectedBodyHeight &&
    value.runtimeCanvasClass !== ROLE_RUNTIME_CANVAS_CLASS[value.role]
  ) {
    errors.push(
      `${value.role} runtime canvas class must be ${ROLE_RUNTIME_CANVAS_CLASS[value.role]}`,
    );
  }
  if (!positiveInteger(value.sourceVisiblePixels)) {
    errors.push('source visible pixels must be a positive integer');
  } else if (value.sourceVisiblePixels > value.runtimeCanvasClass) {
    errors.push('source visible pixels cannot exceed the runtime canvas class');
  }
  if (!hasExactKeys(value.scaleRatio, SCALE_RATIO_KEYS)) {
    errors.push('scale ratio must contain exact numerator and denominator facts');
  } else if (
    value.scaleRatio.numerator !== value.displayedDevicePixels ||
    value.scaleRatio.denominator !== value.sourceVisiblePixels
  ) {
    errors.push('scale ratio must bind displayed device pixels over source visible pixels');
  }
  if (
    positiveInteger(value.sourceVisiblePixels) &&
    positiveInteger(value.displayedDevicePixels) &&
    value.sourceVisiblePixels < value.displayedDevicePixels
  ) {
    errors.push(
      'source visible pixels are below displayed device pixels; upscale is forbidden',
    );
  }
  return errors;
}

export function validateQualityProfileBinding(value) {
  const errors = [];
  if (!hasExactKeys(value, QUALITY_PROFILE_KEYS)) {
    return ['visual quality profile binding has an unexpected property set'];
  }
  if (value.grammar !== 'gaf2d-visual-quality-profile-binding-v4') {
    errors.push(
      'visual quality profile grammar must be gaf2d-visual-quality-profile-binding-v4',
    );
  }
  for (const field of [
    'selectedProfileSha256',
    'manifestProfileSha256',
    'encoderProfileSha256',
  ]) {
    if (!SHA256.test(value[field] || '')) {
      errors.push(`${field} must be a lowercase SHA-256`);
    }
  }
  if (
    new Set([
      value.selectedProfileSha256,
      value.manifestProfileSha256,
      value.encoderProfileSha256,
    ]).size !== 1
  ) {
    errors.push(
      'visual quality profile drift: selected, manifest, and encoder profiles differ',
    );
  }
  return errors;
}
