import fs from 'node:fs';

const indexHtml = fs.readFileSync(
  new URL('../index.html', import.meta.url),
  'utf8',
);
const gameCss = fs.readFileSync(
  new URL('../css/game.css', import.meta.url),
  'utf8',
);
const mainJs = fs.readFileSync(
  new URL('../js/main.js', import.meta.url),
  'utf8',
);
const motionReviewJs = fs.readFileSync(
  new URL('../js/motion-review.js', import.meta.url),
  'utf8',
);

const assert = (condition, message) => {
  if (!condition) throw new Error(`Motion preview UI: ${message}`);
  console.log(`OK ${message}`);
};

assert(
  /id="motion-preview-banner"[^>]*role="status"[^>]*aria-live="polite"[^>]*hidden/.test(
    indexHtml,
  ),
  'local preview banner is hidden, announced status markup by default',
);
assert(
  indexHtml.includes('UNAPPROVED MOTION PREVIEW · LOCAL ONLY') &&
    indexHtml.includes('id="motion-preview-title"') &&
    indexHtml.includes('id="motion-preview-detail"') &&
    indexHtml.includes('Awaiting preview manifest') &&
    !indexHtml.includes('276 frames'),
  'banner states its non-production authority and keeps detail copy manifest-driven',
);
assert(
  indexHtml.includes('id="motion-review-panel"') &&
    indexHtml.includes('data-role="review-asset"') &&
    indexHtml.includes('data-role="review-clip"') &&
    indexHtml.includes('data-role="review-mode"') &&
    indexHtml.includes('value="actual-game-size"') &&
    indexHtml.includes('value="inspection"') &&
    indexHtml.includes('data-role="review-canvas"'),
  'loopback review panel exposes asset, clip, actual-game-size, inspection, and canvas controls',
);
assert(
  motionReviewJs.includes('reviewScaleMetrics(activeRuntime') &&
    motionReviewJs.includes('reviewCreditEligible(activeRuntime') &&
    motionReviewJs.includes('scaleMetrics.viewCreditAllowed') &&
    motionReviewJs.includes('source visible') &&
    motionReviewJs.includes('device px') &&
    motionReviewJs.includes('ratio') &&
    motionReviewJs.includes('DPR'),
  'review draw path exposes density metrics and gates credit through actual-mode scale facts',
);

const bannerRule = gameCss.match(/\.motion-preview-banner\s*\{([^}]*)\}/)?.[1] || '';
const reviewSurface = gameCss.slice(
  gameCss.indexOf('.motion-review-panel'),
  gameCss.indexOf('.hud-brand'),
);
assert(
  bannerRule.includes('display: flex') &&
    !/\bposition\s*:\s*(?:absolute|fixed)\b/.test(bannerRule),
  'banner participates in layout instead of covering gameplay',
);
assert(
  /\.motion-preview-banner\[hidden\]\s*\{[^}]*display:\s*none/.test(gameCss),
  'hidden preview banner cannot be revealed by its flex declaration',
);
for (const [selector, label] of [
  ['#toast\\.toast-banner', 'toast'],
  ['\\.coach-hint', 'coach hint'],
  ['\\.motion-preview-banner', 'preview banner'],
]) {
  assert(
    new RegExp(`${selector}\\[hidden\\]\\s*\\{[^}]*display:\\s*none`).test(
      gameCss,
    ),
    `hidden ${label} overrides its component display declaration`,
  );
}

for (const signal of [
  'motionPreview.requested',
  'motionPreview.active',
  'motionPreview.authority',
  'motionPreview.batchSummarySha256',
  'motionPreview.error',
  'reviewRequested: isMotionReviewRequested(location)',
  'heroV3AuthorityStatus',
  'fps: motion.fps',
  'authority: motion.record?.descriptor?.authority',
  'sourceFamily:',
  'motionApprovalSha256:',
  'runtimeLineageSha256:',
  'derivativeSetSha256:',
  'selectedProfileSha256:',
  'candidateSha256:',
  'motion.record?.descriptor?.previewLineage?.candidateSha256',
  'motion.record?.set?.previewLineage?.candidateSha256',
  'motion.record?.descriptor?.releaseLineage?.motionApprovalSha256',
  'inspectHeroMotion',
  'heroMotion:',
  'mountMotionReviewSurface',
  'setReducedMotion: (value) => motionPreference.setSaved(value)',
]) {
  assert(
    mainJs.includes(signal),
    `runtime evidence includes ${signal}`,
  );
}
assert(
  mainJs.includes("banner.dataset.state = motionPreview.active ? 'active' : 'failed'"),
  'requested preview always exposes active or safe-fallback state',
);
assert(
  mainJs.includes('motionPreview: {') &&
    mainJs.includes('heroStatus: heroV3AuthorityStatus()') &&
    mainJs.includes('heroAuthority: motionPreview.active') &&
    mainJs.includes("bannerTitle.textContent = 'LOCAL MOTION PREVIEW BLOCKED'"),
  'browser evidence distinguishes Hero status, authority, and blocked fallback',
);
assert(
  mainJs.includes(
    'consumerScale: motionPreview.manifest?.hero?.consumerScale ?? null',
  ) &&
    /selectedProfileSha256:\s*motionPreview\.manifest\?\.toolchain\?\.profileSha256\s*\?\?\s*null/.test(
      mainJs,
    ),
  'Hero loader receives the root V4 consumer-scale and selected-profile authority',
);
assert(
  bannerRule.includes('background: var(--surface-900)') &&
    bannerRule.includes('font-size: var(--fs-label-s)') &&
    !bannerRule.includes('--compat-'),
  'new banner uses canonical design tokens',
);
assert(
  reviewSurface.includes('min-height: var(--touch-min)') &&
    reviewSurface.includes('font-size: var(--fs-label-s)') &&
    !reviewSurface.includes('--compat-'),
  'motion review controls use canonical type tokens and 44px touch targets',
);

console.log('MOTION PREVIEW UI PASS');
