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
    indexHtml.includes('id="motion-preview-detail"'),
  'banner states its non-production authority and exposes a detail slot',
);

const bannerRule = gameCss.match(/\.motion-preview-banner\s*\{([^}]*)\}/)?.[1] || '';
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
  'heroV3AuthorityStatus',
  'fps: motion.fps',
  'authority: motion.record?.descriptor?.authority',
  'candidateSha256:',
  'motion.record?.descriptor?.previewLineage?.candidateSha256',
  'inspectHeroMotion',
  'heroMotion:',
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
  bannerRule.includes('background: var(--surface-900)') &&
    bannerRule.includes('font-size: var(--fs-label-s)') &&
    !bannerRule.includes('--compat-'),
  'new banner uses canonical design tokens',
);

console.log('MOTION PREVIEW UI PASS');
