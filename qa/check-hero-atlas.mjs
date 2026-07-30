/**
 * Hero V3 clip atlas contract — GLB-rendered canon Host clips.
 *
 * The V3 clip player (js/hero-v3.js) is the primary hero renderer; the V2
 * skeletal rig remains only as a load-failure fallback. This contract locks:
 *  - all 8 semantic clips exist as {clip}.json + {clip}.webp
 *  - every json carries frames[] + fps + anchor (+ sane trim/frameSize)
 *  - every webp stays within the 1.5MB per-clip budget
 *  - runtime wiring: hero-v2 prefers V3, main.js bootstraps loadHeroV3
 * Run: node qa/check-hero-atlas.mjs (also wired into qa/run-tests.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// runtime wiring: hero-v2 prefers the V3 clip player; main.js loads it and
// keeps the V2 rig strictly as a fallback.
const heroSrc = fs.readFileSync(path.join(root, 'js/hero-v2.js'), 'utf8');
assert(heroSrc.includes('heroV3Ready'), 'hero-v2 references heroV3Ready (V3 preferred)');
assert(heroSrc.includes('drawV3Frame'), 'hero-v2 draws V3 frames');
const mainSrc = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
assert(mainSrc.includes('loadHeroV3'), 'main.js references loadHeroV3');
assert(mainSrc.includes('assets/mascot/v3/'), 'main.js points at the V3 atlas dir');
assert(mainSrc.includes('setHeroRig'), 'main.js keeps the V2 rig as fallback');

console.log('HeroAtlas: ALL PASS');
