/**
 * Hero V3 compatibility atlas contract — current historical runtime clips.
 *
 * The V3 clip player (js/hero-v3.js) is the primary hero renderer; load or
 * decode failure uses only the explicit legless identity-safe Canvas fallback.
 * Approved replacements are governed by `check-hero-v3-runtime.mjs`. This
 * compatibility gate locks:
 *  - all 8 semantic clips exist as {clip}.json + {clip}.webp
 *  - every json carries frames[] + fps + anchor (+ sane trim/frameSize)
 *  - every webp stays within the 1.5MB per-clip budget
 *  - runtime wiring: hero-v2 prefers V3, main.js bootstraps loadHeroV3
 * Run: node qa/check-hero-atlas.mjs (also wired into qa/run-tests.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as heroV2Runtime from '../js/hero-v2.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => {
  if (!condition) throw new Error(`HeroAtlas: ${message}`);
  console.log(`OK ${message}`);
};

const V3_DIR = path.join(root, 'assets/mascot/v3');
const CLIPS = ['idle', 'run', 'attack', 'crit', 'sprint', 'hit', 'death', 'celebrate'];

for (const name of CLIPS) {
  const jsonPath = path.join(V3_DIR, `${name}.json`);
  const webpPath = path.join(V3_DIR, `${name}.webp`);
  assert(fs.existsSync(jsonPath), `${name}.json exists`);
  assert(fs.existsSync(webpPath), `${name}.webp exists`);

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert(
    typeof data.source !== 'string' ||
      (!path.isAbsolute(data.source) &&
        !data.source.includes('\\') &&
        !data.source.split('/').includes('..')),
    `${name}: source provenance is portable and contains no machine-local path`,
  );
  assert(Array.isArray(data.frames) && data.frames.length > 0, `${name}: frames[] present (${data.frames?.length || 0})`);
  assert(typeof data.fps === 'number' && data.fps > 0, `${name}: fps present (${data.fps})`);
  assert(Array.isArray(data.anchor) && data.anchor.length === 2
    && data.anchor.every((a) => typeof a === 'number'), `${name}: anchor present ([${data.anchor}])`);
  assert(data.frameSize > 0, `${name}: frameSize present (${data.frameSize})`);
  assert(data.trim && data.trim.w > 0 && data.trim.h > 0, `${name}: trim union bbox sane (${data.trim?.w}x${data.trim?.h})`);
  for (const f of data.frames) {
    assert(f.w > 0 && f.h > 0, `${name}: frame rect sane (${f.w}x${f.h})`);
  }

  const webpMB = fs.statSync(webpPath).size / (1024 * 1024);
  assert(webpMB <= 1.5, `${name}.webp ${webpMB.toFixed(2)}MB <= 1.5MB budget`);
}

// Runtime wiring: hero-v2 prefers the V3 clip player. A decode/load failure
// may only use the explicit legless identity-safe Canvas silhouette.
const heroSrc = fs.readFileSync(path.join(root, 'js/hero-v2.js'), 'utf8');
assert(heroSrc.includes('heroV3Ready'), 'hero-v2 references heroV3Ready (V3 preferred)');
assert(heroSrc.includes('drawV3Frame'), 'hero-v2 draws V3 frames');
assert(
  !heroSrc.includes('hero-rig.js') &&
    !heroSrc.includes('heroRigReady') &&
    !heroSrc.includes('drawRigBody'),
  'hero-v2 has no skeletal rig fallback path',
);
assert(
  heroV2Runtime.IDENTITY_SAFE_FALLBACK_CONTRACT?.legCount === 0 &&
    heroV2Runtime.IDENTITY_SAFE_FALLBACK_CONTRACT?.body ===
      'floating-capsule',
  'Hero failure contract is explicitly legless and identity-safe',
);
const fallbackSource = heroSrc.match(
  /export function drawIdentitySafeFallback\([\s\S]*?\n\}/,
)?.[0] || '';
assert(
  fallbackSource.includes('drawReferenceHead') &&
    !/\b(?:leg|boot|foot)\b/i.test(fallbackSource),
  'identity-safe fallback implementation draws head/body/arms without leg geometry',
);
const mainSrc = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const previewSrc = fs.readFileSync(
  path.join(root, 'js/motion-preview.js'),
  'utf8',
);
assert(mainSrc.includes('loadHeroV3'), 'main.js references loadHeroV3');
assert(
  mainSrc.includes('loadHeroV3(motionPreview.heroBasePath') &&
    previewSrc.includes("const PRODUCTION_HERO_BASE = 'assets/mascot/v3/';") &&
    previewSrc.includes('heroBasePath: PRODUCTION_HERO_BASE'),
  'normal mode points at the historical V3 atlas through the fail-closed preview boundary',
);
assert(
  !mainSrc.includes('setHeroRig') &&
    !mainSrc.includes('assets/mascot/v2/rig.'),
  'main never fetches or installs the rejected biped rig fallback',
);

const mascotCanon = fs.readFileSync(
  path.join(root, 'brand/MASCOT-CANON.md'),
  'utf8',
);
assert(
  mascotCanon.includes('ADR-0015') &&
    mascotCanon.includes('`apn-hero`') &&
    mascotCanon.includes('assets/mascot/v3/'),
  'mascot canon names the current identity, decision, and runtime authorities',
);
assert(
  /no legs, feet, boots, or platform/i.test(mascotCanon),
  'mascot canon permanently locks the legless reference anatomy',
);
for (const staleAuthority of [
  'The GLB is the geometry source of truth',
  'Future pose and animation work is code in `hero-v2.js`',
  'V3 — engine-rendered canon (current)',
]) {
  assert(
    !mascotCanon.includes(staleAuthority),
    `mascot canon excludes stale authority: ${staleAuthority}`,
  );
}

const decisionIndex = fs.readFileSync(
  path.join(root, 'docs/decisions/README.md'),
  'utf8',
);
for (const decisionId of ['0003', '0005', '0010']) {
  assert(
    new RegExp(
      `\\[${decisionId}\\][^\\n]+\\| Superseded by ADR-0015`,
    ).test(decisionIndex),
    `decision index marks ADR-${decisionId} superseded by the legless authority`,
  );
}

const heroDecision = fs.readFileSync(
  path.join(root, 'docs/decisions/ADR-0015-legless-hero-runtime-authority.md'),
  'utf8',
);
assert(
  heroDecision.includes(
    'Supersedes: ADR-0003, ADR-0005, ADR-0010, and ADR-0012',
  ),
  'ADR-0015 explicitly closes every earlier GLB/biped Hero authority',
);

const productReconciliation = fs.readFileSync(
  path.join(root, 'docs/product/RECONCILIATION.md'),
  'utf8',
);
assert(
  productReconciliation.includes('Host identity / motion authority') &&
    productReconciliation.includes('ADR-0015'),
  'imported V3 product docs are reconciled to the current legless Hero authority',
);

console.log('HeroAtlas: ALL PASS');
