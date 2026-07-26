/**
 * GAF2D first-pack contract.
 *
 * Locks the approved six-identity source map, runtime atlas, authored Wave 1–10
 * cast, and Valorant precedence over the legacy V3 creature renderer.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  createState,
  enemyTypesForPackWave,
  pickEnemyTypeForPackWave,
  spawnEnemy,
} from '../js/game.js';
import { creatureKindFor, TIPS } from '../js/content.js';
import {
  bossBannerFor,
  bossTimerYFor,
  enemyFrameFor,
  enemyLabelForDisplay,
} from '../js/render.js';
import {
  approvalMatchesCurrentManifest,
  eraseArgumentsForFrame,
} from '../scripts/assets/build-gaf2d-targets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packDir = path.join(root, 'assets/game-packs/valorant');
const assert = (condition, message) => {
  if (!condition) throw new Error(`GAF2D Valorant: ${message}`);
  console.log(`OK ${message}`);
};
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const sourcesPath = path.join(packDir, 'gaf2d-sources.json');
assert(fs.existsSync(sourcesPath), 'portable GAF2D source mapping exists');
const sources = readJson(sourcesPath);
const expectedFrames = ['common-a', 'common-b', 'common-c', 'elite', 'event', 'boss', 'boss-break'];
const expectedAssets = [
  'entry-runner',
  'veil-operator',
  'signal-hunter',
  'site-sentinel',
  'protocol-courier',
  'site-warden',
  'site-warden',
];
assert(sources.schemaVersion === 1 && sources.sourceAuthority === 'gaf2d', 'GAF2D source authority is explicit');
assert(
  sources.frames?.map((frame) => frame.frame).join('|') === expectedFrames.join('|'),
  'seven runtime cells keep the canonical frame order',
);
assert(
  sources.frames?.map((frame) => frame.assetId).join('|') === expectedAssets.join('|'),
  'six approved identities map to five targets, boss, and boss break',
);
assert(
  sources.frames.every(
    (frame) =>
      /^[a-f0-9]{64}$/.test(frame.sourceSha256) &&
      frame.sourceSha256 === frame.approvalSha256 &&
      !path.isAbsolute(frame.sourcePath) &&
      !frame.sourcePath.includes('..'),
  ),
  'source records are portable and hash-locked to identity approvals',
);
assert(
  new Set(sources.frames.map((frame) => frame.assetId)).size === 6,
  'exactly six creature identities ship',
);
assert(
  sources.toolchain?.imageMagick === '7.1.2-13' && sources.toolchain?.cwebp === '1.6.0',
  'runtime derivative records its exact ImageMagick and cwebp versions',
);
const approvalFixture = {
  manifest_version: 7,
  approvals: { identity: { source_manifest_version: 7 } },
};
assert(
  approvalMatchesCurrentManifest(approvalFixture, { sourceManifestVersion: 7 }),
  'builder accepts an approval only when it matches the current manifest version',
);
assert(
  !approvalMatchesCurrentManifest(
    { ...approvalFixture, manifest_version: 8 },
    { sourceManifestVersion: 7 },
  ),
  'builder rejects an approval made against a stale manifest version',
);
const bossBreakSource = sources.frames.find((frame) => frame.frame === 'boss-break');
assert(
  eraseArgumentsForFrame(bossBreakSource).join('|') ===
    '-alpha|on|-channel|A|-fill|black|-draw|rectangle 0,0 165,49|+channel',
  'boss-break recipe removes the detached neighboring platform fragment',
);

const targetDataPath = path.join(packDir, 'targets.json');
const targetsPath = path.join(packDir, 'targets.webp');
const targetData = readJson(targetDataPath);
assert(targetData.meta?.grammar === 'gaf2d-static-v1', 'runtime metadata declares the GAF2D static lane');
assert(
  targetData.meta?.sourceManifestSha256 === sha256(sourcesPath),
  'runtime metadata locks the source manifest hash',
);
assert(
  targetData.meta?.toolchain?.imageMagick === sources.toolchain.imageMagick &&
    targetData.meta?.toolchain?.cwebp === sources.toolchain.cwebp,
  'runtime metadata carries the recorded derivative toolchain',
);
assert(
  targetData.meta?.size?.w === 896 && targetData.meta?.size?.h === 128,
  'runtime atlas is exactly 896×128',
);
assert(
  expectedFrames.every((name, index) => {
    const frame = targetData.frames?.[name];
    return (
      frame?.rect?.x === index * 128 &&
      frame.rect.y === 0 &&
      frame.rect.w === 128 &&
      frame.rect.h === 128 &&
      frame.sourceSize?.w === 128 &&
      frame.sourceSize?.h === 128 &&
      frame.trimOffset?.x === 0 &&
      frame.trimOffset?.y === 0 &&
      frame.pivot?.x === 0.5 &&
      frame.pivot?.y === 1 &&
      frame.metrics?.direction === 'right-to-left'
    );
  }),
  'all seven cells are untrimmed, foot-centered, and right-to-left',
);
assert(fs.statSync(targetsPath).size <= 140 * 1024, 'GAF2D target atlas stays within 140 KB');
assert(sha256(targetsPath) === sources.derivative?.targetsSha256, 'runtime WebP matches its recorded derivative hash');
const rgba = execFileSync(
  'ffmpeg',
  ['-v', 'error', '-i', targetsPath, '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'],
  { maxBuffer: 896 * 128 * 4 + 1024 },
);
assert(rgba.length === 896 * 128 * 4, 'runtime WebP decodes to the expected RGBA pixel surface');

function alphaAt(cell, x, y) {
  return rgba[(y * 896 + cell * 128 + x) * 4 + 3];
}

function alphaMetricsForCell(cell) {
  let foreground = 0;
  let minX = 128;
  let minY = 128;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < 128; y += 1) {
    for (let x = 0; x < 128; x += 1) {
      if (alphaAt(cell, x, y) <= 8) continue;
      foreground += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { foreground, minX, minY, maxX, maxY };
}

for (let cell = 0; cell < expectedFrames.length; cell += 1) {
  const metrics = alphaMetricsForCell(cell);
  const ratio = metrics.foreground / (128 * 128);
  assert(
    [alphaAt(cell, 0, 0), alphaAt(cell, 127, 0), alphaAt(cell, 0, 127), alphaAt(cell, 127, 127)]
      .every((alpha) => alpha === 0) &&
      ratio >= 0.08 &&
      ratio <= 0.72 &&
      metrics.maxY >= 118 &&
      (metrics.minX + metrics.maxX) / 2 >= 40 &&
      (metrics.minX + metrics.maxX) / 2 <= 88,
    `${expectedFrames[cell]} pixels keep transparent corners, useful occupancy, and a centered ground contact`,
  );
}

function foregroundComponentAreas(cell) {
  const mask = new Uint8Array(128 * 128);
  const seen = new Uint8Array(mask.length);
  for (let y = 0; y < 128; y += 1) {
    for (let x = 0; x < 128; x += 1) {
      mask[y * 128 + x] = alphaAt(cell, x, y) > 8 ? 1 : 0;
    }
  }
  const areas = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;
    let area = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const index = stack.pop();
      area += 1;
      const x = index % 128;
      const y = Math.floor(index / 128);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX < 0 || nextX >= 128 || nextY < 0 || nextY >= 128) continue;
          const next = nextY * 128 + nextX;
          if (!mask[next] || seen[next]) continue;
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    areas.push(area);
  }
  return areas.sort((a, b) => b - a);
}

const breakComponents = foregroundComponentAreas(expectedFrames.indexOf('boss-break'));
assert(
  breakComponents.filter((area) => area >= 64).length === 1,
  'boss-break pixels contain one coherent foreground with no detached neighboring fragment',
);

const expectedPools = [
  ['stale'],
  ['rumor'],
  ['lag'],
  ['stale', 'rumor'],
  ['patch'],
  ['stale', 'lag'],
  ['rumor', 'patch'],
  ['stale', 'rumor', 'lag', 'patch'],
  ['event'],
  ['boss'],
];
for (let wave = 1; wave <= 10; wave += 1) {
  const actual = enemyTypesForPackWave('valorant', wave);
  assert(
    Array.isArray(actual) && actual.join('|') === expectedPools[wave - 1].join('|'),
    `Wave ${wave} cast is authored (${expectedPools[wave - 1].join(' / ')})`,
  );
}
assert(enemyTypesForPackWave('league', 1) === null, 'other packs preserve their existing random cast');
assert(pickEnemyTypeForPackWave('valorant', 4, () => 0) === 'stale', 'mixed wave can select its first identity');
assert(pickEnemyTypeForPackWave('valorant', 4, () => 0.999) === 'rumor', 'mixed wave can select its last identity');
assert(pickEnemyTypeForPackWave('league', 4, () => 0.5) === null, 'mixed-wave helper does not alter other packs');

const expectedSpawnFrames = [
  'common-a',
  'common-b',
  'common-c',
  'common-a',
  'elite',
  'common-a',
  'common-b',
  'common-a',
  'event',
  'boss',
];
const savedRandom = Math.random;
try {
  Math.random = () => 0;
  for (let wave = 1; wave <= 10; wave += 1) {
    const state = createState();
    state.route.zone = wave - 1;
    state.route.killsInZone = 0;
    state.world.bossActive = false;
    const enemy = spawnEnemy(state);
    assert(
      enemy?.packId === 'valorant' && enemy.frame === expectedSpawnFrames[wave - 1],
      `Wave ${wave} spawn resolves the approved pack frame (${expectedSpawnFrames[wave - 1]})`,
    );
  }
} finally {
  Math.random = savedRandom;
}

for (const enemy of [
  { id: 'gaf-boss', type: 'boss', packId: 'valorant' },
  { id: 'gaf-elite', type: 'lag', packId: 'valorant' },
  { id: 'gaf-event', type: 'event', packId: 'valorant' },
]) {
  assert(creatureKindFor(enemy, 9) === null, `Valorant ${enemy.type} keeps its approved GAF2D body`);
}
assert(
  creatureKindFor({ id: 'legacy-boss', type: 'boss', packId: 'league' }, 9) === 'curator',
  'legacy V3 creature routing remains available outside Valorant',
);

const pack = readJson(path.join(packDir, 'pack.json'));
assert(
  pack.targets.map((target) => target.label).join('|') ===
    'Entry Runner|Veil Operator|Signal Hunter|Site Sentinel|Protocol Courier',
  'first-pack target labels match the approved identities',
);
assert(pack.boss?.label === 'Site Warden', 'first-pack boss label matches the approved identity');
assert(
  bossBannerFor({ id: 'site-warden', type: 'boss', packId: 'valorant', label: 'Site Warden' }, 9) ===
    'SITE WARDEN',
  'boss timer banner names the active approved identity',
);
assert(
  bossBannerFor({ id: 'league-boss', type: 'boss', packId: 'league', label: 'Baron Patch' }, 19) ===
    'VERSION GATE',
  'non-Valorant even-ordinal bosses keep the legacy Version Gate banner',
);
assert(
  bossTimerYFor(216) === 108 && bossTimerYFor(160) === 108,
  'boss timer clears the two-row stage HUD even in the shortest supported stage',
);
assert(!TIPS.boss.includes('Version Gate'), 'first-pack boss tip does not contradict the Site Warden identity');
assert(
  enemyLabelForDisplay('Protocol Courier', false) === 'Protocol Courier',
  'event identity keeps its full readable runtime label',
);
assert(
  enemyLabelForDisplay('An Intentionally Overlong Creature Name', false) === 'An Intentionally …',
  'unexpectedly long target labels still truncate safely',
);
assert(
  enemyFrameFor({ type: 'boss', frame: 'boss', hp: 33, hpMax: 100 }) === 'boss-break',
  'boss uses its break frame below 34% HP',
);
assert(
  enemyFrameFor({ type: 'boss', frame: 'boss', hp: 34, hpMax: 100 }) === 'boss',
  'boss keeps its normal frame at the 34% boundary',
);

console.log('GAF2D VALORANT PASS');
