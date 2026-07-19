/**
 * Hero atlas contract — the generated canon Host sprite set.
 *
 * Locks the animation-quality rules that user review forced in:
 *  - a REAL 4-phase run cycle (run-1..4), never a 2-frame flipbook
 *  - head-anchored pivots: run frames must cluster tightly or the cycle wobbles
 *  - every semantic clip has a frame (fallbacks stay procedural)
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

const jsonPath = path.join(root, 'assets/mascot/v2/host.json');
const webpPath = path.join(root, 'assets/mascot/v2/host.webp');
assert(fs.existsSync(jsonPath), 'host.json exists');
assert(fs.existsSync(webpPath), 'host.webp exists');

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const frames = data.frames || {};
const names = Object.keys(frames);

const REQUIRED = ['idle', 'run-1', 'run-2', 'run-3', 'run-4', 'attack', 'charge', 'recoil', 'level', 'defeat', 'walk'];
for (const name of REQUIRED) {
  assert(frames[name], `frame present: ${name}`);
}
assert(frames['run-1'], 'real 4-phase run cycle (no 2-frame flipbook)');

for (const name of names) {
  const f = frames[name];
  assert(f.rect && f.rect.w >= 100 && f.rect.h >= 200, `${name}: rect sane (${f.rect?.w}x${f.rect?.h})`);
  assert(f.pivot && f.pivot.y === 1, `${name}: foot-bottom pivot`);
  assert(f.pivot.x >= 0.2 && f.pivot.x <= 0.85, `${name}: pivot.x in range (${f.pivot.x})`);
}

// run-cycle wobble contract: head pivots cluster, heights stay consistent
const runPivots = ['run-1', 'run-2', 'run-3', 'run-4'].map((n) => frames[n].pivot.x);
const mean = runPivots.reduce((a, b) => a + b, 0) / runPivots.length;
const std = Math.sqrt(runPivots.reduce((a, b) => a + (b - mean) ** 2, 0) / runPivots.length);
assert(std <= 0.06, `run cycle pivot stddev ${std.toFixed(3)} <= 0.06 (no mid-cycle wobble)`);
const runHeights = ['run-1', 'run-2', 'run-3', 'run-4'].map((n) => frames[n].rect.h);
const hMin = Math.min(...runHeights);
const hMax = Math.max(...runHeights);
assert(hMax / hMin <= 1.25, `run cycle height ratio ${(hMax / hMin).toFixed(2)} <= 1.25`);

assert(data.meta && data.meta.designHeight === 512, 'designHeight 512 locked');

const webpKB = fs.statSync(webpPath).size / 1024;
assert(webpKB <= 400, `host.webp ${Math.round(webpKB)}KB <= 400KB budget`);

// masters kept for every frame (editable source of truth)
for (const name of REQUIRED) {
  assert(fs.existsSync(path.join(root, `assets/mascot/v2/master/${name}.png`)), `master kept: ${name}.png`);
}

// runtime wiring: renderer consumes the cycle; bootstrap loads the atlas
const heroSrc = fs.readFileSync(path.join(root, 'js/hero-v2.js'), 'utf8');
assert(heroSrc.includes('setHeroSprites'), 'hero-v2 exports setHeroSprites');
assert(heroSrc.includes("frames['run-1']"), 'hero-v2 prefers the 4-phase cycle');
const mainSrc = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
assert(mainSrc.includes('assets/mascot/v2/host.webp') && mainSrc.includes('assets/mascot/v2/host.json'), 'main.js loads the hero atlas');
assert(mainSrc.includes('setHeroSprites'), 'main.js wires setHeroSprites');

console.log('HeroAtlas: ALL PASS');
