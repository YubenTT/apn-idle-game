const fidelity = await import('../js/visual-fidelity-v4.js').catch(() => ({}));
const review = await import('../js/motion-review.js').catch(() => ({}));

const failures = [];

function check(name, callback) {
  try {
    callback();
    console.log(`OK ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error?.message || error}`);
  }
}

function requireFact(condition, message) {
  if (!condition) throw new Error(message);
}

function consumerScale(overrides = {}) {
  return {
    grammar: 'gaf2d-consumer-scale-v4',
    role: 'hero',
    maximumCssBodyHeight: 96,
    maximumDpr: 2,
    displayedDevicePixels: 192,
    runtimeCanvasClass: 320,
    sourceVisiblePixels: 214,
    scaleRatio: { numerator: 192, denominator: 214 },
    ...overrides,
  };
}

check('128 px source is rejected for DPR2 maximum-role rendering', () => {
  requireFact(
    typeof fidelity.validateConsumerScaleContract === 'function',
    'Visual Fidelity V4 consumer-scale validator is missing',
  );
  const errors = fidelity.validateConsumerScaleContract(
    consumerScale({
      runtimeCanvasClass: 128,
      sourceVisiblePixels: 101,
      scaleRatio: { numerator: 192, denominator: 101 },
    }),
  );
  requireFact(
    errors.some((error) => /upscale|visible pixels|canvas class/i.test(error)),
    `128 px source was not rejected by the density gate (${errors.join('; ')})`,
  );
});

check('review backing store follows CSS pixels multiplied by DPR', () => {
  requireFact(
    typeof review.configureDprCanvas === 'function',
    'DPR-aware review backing-store API is missing',
  );
  const transforms = [];
  const canvas = { width: 320, height: 320, style: {} };
  const context = {
    setTransform(...values) {
      transforms.push(values);
    },
  };
  const facts = review.configureDprCanvas(canvas, context, {
    cssWidth: 320,
    cssHeight: 240,
    dpr: 2,
  });
  requireFact(canvas.width === 640 && canvas.height === 480, 'backing store is not 640x480');
  requireFact(
    transforms.some(
      (values) =>
        values.length === 6 &&
        values[0] === 2 &&
        values[1] === 0 &&
        values[2] === 0 &&
        values[3] === 2 &&
        values[4] === 0 &&
        values[5] === 0,
    ),
    'review context was not transformed into CSS-pixel coordinates at DPR2',
  );
  requireFact(
    facts?.cssWidth === 320 && facts?.cssHeight === 240 && facts?.dpr === 2,
    'review backing-store facts are incomplete',
  );
});

check('source visible pixels below displayed device pixels fail closed', () => {
  requireFact(
    typeof fidelity.validateConsumerScaleContract === 'function',
    'Visual Fidelity V4 consumer-scale validator is missing',
  );
  const errors = fidelity.validateConsumerScaleContract(
    consumerScale({
      sourceVisiblePixels: 191,
      scaleRatio: { numerator: 192, denominator: 191 },
    }),
  );
  requireFact(
    errors.some((error) => /source visible pixels.*displayed device pixels|upscale/i.test(error)),
    `undersized visible source passed (${errors.join('; ')})`,
  );
});

check('bounded Hero witness requires 320 runtime class and rejects the old 256 assumption', () => {
  const witnessErrors = fidelity.validateConsumerScaleContract(
    consumerScale(),
  );
  const oldClassErrors = fidelity.validateConsumerScaleContract(
    consumerScale({
      runtimeCanvasClass: 256,
      sourceVisiblePixels: 171,
      scaleRatio: { numerator: 192, denominator: 171 },
    }),
  );
  const unknownClassErrors = fidelity.validateConsumerScaleContract(
    consumerScale({ runtimeCanvasClass: 384 }),
  );
  requireFact(
    witnessErrors.length === 0 &&
      oldClassErrors.some(
        (error) => /hero runtime canvas class must be 320/i.test(error),
      ) &&
      oldClassErrors.some(
        (error) => /source visible pixels.*displayed device pixels|upscale/i.test(error),
      ) &&
      unknownClassErrors.some(
        (error) => /runtime canvas class must be exactly 256 or 320/i.test(error),
      ),
    `bounded Hero class contract drifted (witness=${witnessErrors.join('; ')}; old=${oldClassErrors.join('; ')}; unknown=${unknownClassErrors.join('; ')})`,
  );
});

check('actual-game-size and inspection metrics stay DPR-aware and no-upscale', () => {
  requireFact(
    typeof review.reviewScaleMetrics === 'function',
    'review scale-metrics API is missing',
  );
  const runtime = { consumerScale: consumerScale() };
  const actual = review.reviewScaleMetrics(runtime, {
    mode: 'actual-game-size',
    dpr: 2,
  });
  requireFact(
      actual.cssBodyHeight === 96 &&
      actual.displayedDevicePixels === 192 &&
      actual.sourceVisiblePixels === 214 &&
      actual.scaleRatio === 192 / 214 &&
      actual.drawAllowed === true &&
      actual.viewCreditAllowed === true,
    `actual-game-size metrics are wrong (${JSON.stringify(actual)})`,
  );
  const inspection = review.reviewScaleMetrics(runtime, {
    mode: 'inspection',
    dpr: 2,
  });
  requireFact(
    inspection.cssBodyHeight === 107 &&
      inspection.displayedDevicePixels === 214 &&
      inspection.scaleRatio === 1 &&
      inspection.drawAllowed === true &&
      inspection.viewCreditAllowed === false,
    `inspection metrics are wrong (${JSON.stringify(inspection)})`,
  );
  const blocked = review.reviewScaleMetrics(
    {
      consumerScale: consumerScale({
        sourceVisiblePixels: 191,
        scaleRatio: { numerator: 192, denominator: 191 },
      }),
    },
    { mode: 'actual-game-size', dpr: 2 },
  );
  requireFact(
    blocked.scaleRatio > 1 &&
      blocked.drawAllowed === false &&
      blocked.viewCreditAllowed === false,
    `ratio>1 did not block draw and credit (${JSON.stringify(blocked)})`,
  );
});

check('all 39 loop and progress contracts require one complete cycle', () => {
  requireFact(
    typeof review.reviewCycleComplete === 'function',
    'review full-cycle API is missing',
  );
  const hero = [
    [20, 30, 'loop'],
    [20, 32, 'loop'],
    [15, 30, 'progress'],
    [15, 30, 'progress'],
    [15, 30, 'loop'],
    [8, 32, 'progress'],
    [15, 30, 'progress'],
    [15, 30, 'loop'],
  ];
  const common = [
    [30, 30, 'loop'],
    [24, 30, 'loop'],
    [15, 30, 'loop'],
    [8, 32, 'progress'],
    [30, 30, 'progress'],
  ];
  const contracts = [...hero, ...common, ...common, ...common, ...common, ...common, ...common];
  contracts.push([30, 30, 'loop']);
  requireFact(contracts.length === 39, `fixture has ${contracts.length}/39 clips`);
  for (const [frameCount, fps, playback] of contracts) {
    const runtime = { frameCount, fps, playback };
    const cycleSeconds = frameCount / fps;
    requireFact(
      review.reviewCycleComplete(runtime, cycleSeconds - 0.000_001) === false,
      `${playback} clip received early view credit`,
    );
    requireFact(
      review.reviewCycleComplete(runtime, cycleSeconds) === true,
      `${playback} clip did not receive full-cycle credit`,
    );
  }
});

check('view credit combines actual mode, valid density, and one full cycle', () => {
  requireFact(
    typeof review.reviewCreditEligible === 'function',
    'review credit eligibility API is missing',
  );
  const runtime = {
    consumerScale: consumerScale(),
    frameCount: 30,
    fps: 30,
    playback: 'loop',
  };
  const actual = review.reviewScaleMetrics(runtime, {
    mode: 'actual-game-size',
    dpr: 2,
  });
  const inspection = review.reviewScaleMetrics(runtime, {
    mode: 'inspection',
    dpr: 2,
  });
  const invalidDensity = review.reviewScaleMetrics(
    {
      ...runtime,
      consumerScale: consumerScale({
        sourceVisiblePixels: 191,
        scaleRatio: { numerator: 192, denominator: 191 },
      }),
    },
    { mode: 'actual-game-size', dpr: 2 },
  );
  requireFact(
    review.reviewCreditEligible(runtime, 1, actual) === true &&
      review.reviewCreditEligible(runtime, 0.999, actual) === false &&
      review.reviewCreditEligible(runtime, 1, inspection) === false &&
      review.reviewCreditEligible(runtime, 1, invalidDensity) === false,
    'review credit did not require actual + density<=1 + full cycle',
  );
});

check('quality profile and manifest drift fail closed', () => {
  requireFact(
    typeof fidelity.validateQualityProfileBinding === 'function',
    'Visual Fidelity V4 quality-profile validator is missing',
  );
  const errors = fidelity.validateQualityProfileBinding({
    grammar: 'gaf2d-visual-quality-profile-binding-v4',
    selectedProfileSha256: 'a'.repeat(64),
    manifestProfileSha256: 'a'.repeat(64),
    encoderProfileSha256: 'b'.repeat(64),
  });
  requireFact(
    errors.some((error) => /profile.*drift|profile.*differ/i.test(error)),
    `quality profile drift passed (${errors.join('; ')})`,
  );
});

check('quality binding accepts an A/B-selected generic profile hash', () => {
  const profileSha256 = 'c'.repeat(64);
  const errors = fidelity.validateQualityProfileBinding({
    grammar: 'gaf2d-visual-quality-profile-binding-v4',
    selectedProfileSha256: profileSha256,
    manifestProfileSha256: profileSha256,
    encoderProfileSha256: profileSha256,
  });
  requireFact(
    errors.length === 0,
    `generic selected profile hash was rejected (${errors.join('; ')})`,
  );
});

check('round V4 budgets cover the sealed real 7/39/795 candidate with headroom', () => {
  const budgets = fidelity.VISUAL_FIDELITY_BUDGETS;
  requireFact(budgets, 'Visual Fidelity V4 budgets are missing');

  const measured = {
    heroClipEncoded: 506_248,
    commonClipEncoded: 1_057_610,
    bossClipEncoded: 1_944_276,
    bossClipDecoded: 8_490_240,
    heroSetEncoded: 2_961_626,
    allSelectedWebpEncoded: 23_629_008,
    newMotionCompressed: 23_965_723,
    maxWaveDecoded: 39_191_760,
    hotTextures: 44_764_880,
  };

  requireFact(
    budgets.heroEncodedBytes === 640 * 1024 &&
      budgets.commonEncodedBytes === 1.25 * 1024 * 1024 &&
      budgets.bossEncodedBytes === 2.25 * 1024 * 1024 &&
      budgets.bossDecodedBytes === 10 * 1024 * 1024 &&
      budgets.heroCompressedBytes === 3.5 * 1024 * 1024 &&
      budgets.newMotionCompressedBytes === 32 * 1024 * 1024 &&
      budgets.maxWaveDecodedBytes === 48 * 1024 * 1024 &&
      budgets.hotTexturesBytes === 64 * 1024 * 1024,
    `V4 budget authority is not the single rounded measured contract (${JSON.stringify(budgets)})`,
  );
  requireFact(
    measured.heroClipEncoded < budgets.heroEncodedBytes &&
      measured.commonClipEncoded < budgets.commonEncodedBytes &&
      measured.bossClipEncoded < budgets.bossEncodedBytes &&
      measured.bossClipDecoded < budgets.bossDecodedBytes &&
      measured.heroSetEncoded < budgets.heroCompressedBytes &&
      measured.allSelectedWebpEncoded < budgets.newMotionCompressedBytes &&
      measured.newMotionCompressed < budgets.newMotionCompressedBytes &&
      measured.maxWaveDecoded < budgets.maxWaveDecodedBytes &&
      measured.hotTextures < budgets.hotTexturesBytes,
    'sealed V4 candidate no longer fits the rounded measured budget contract',
  );
});

if (failures.length) {
  throw new Error(`VISUAL FIDELITY V4 RED\n${failures.join('\n')}`);
}

console.log('VISUAL FIDELITY V4 PASS');
