/**
 * GAF2D first-pack contract.
 *
 * Locks the approved six-identity source map, runtime atlas, authored Wave 1–10
 * cast, and Valorant precedence over the legacy V3 creature renderer.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { C } from '../js/formulas.js';

import {
  createState,
  enemyTypesForPackWave,
  pickEnemyTypeForPackWave,
  spawnEnemy,
  step,
} from '../js/game.js';
import { creatureKindFor, TIPS } from '../js/content.js';
import {
  bossBannerFor,
  drawEnemy,
  bossTimerYFor,
  enemyFrameFor,
  enemyLabelForDisplay,
  inspectEnemyMotion,
  stageRoleForEnemy,
} from '../js/render.js';
import {
  approvalMatchesCurrentManifest,
  eraseArgumentsForFrame,
} from '../scripts/assets/build-gaf2d-targets.mjs';
import {
  MOTION_BUDGETS,
  validatePackManifest,
} from '../scripts/assets/lib.mjs';
import { verifySizes } from '../scripts/assets/verify-sizes.mjs';
import {
  packWaveIdentityIds,
  packWavePairIdentityUnion,
  targetForEnemyType,
} from '../js/wave-roster.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packDir = path.join(root, 'assets/game-packs/valorant');
const assert = (condition, message) => {
  if (!condition) throw new Error(`GAF2D Valorant: ${message}`);
  console.log(`OK ${message}`);
};
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

assert(
  MOTION_BUDGETS.bossCompressed === 240 * 1024 &&
    MOTION_BUDGETS.bossDecoded === 8 * 1024 * 1024,
  'reusable motion budgets are role-named and carry no current boss identity debt',
);

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

const expectedIdentityPools = [
  ['entry-runner'],
  ['veil-operator'],
  ['signal-hunter'],
  ['entry-runner', 'veil-operator'],
  ['site-sentinel'],
  ['entry-runner', 'signal-hunter'],
  ['veil-operator', 'site-sentinel'],
  ['entry-runner', 'veil-operator', 'signal-hunter', 'site-sentinel'],
  ['protocol-courier'],
  ['site-warden'],
];
for (let wave = 1; wave <= 10; wave += 1) {
assert(
  packWaveIdentityIds(pack, wave).join('|') ===
      expectedIdentityPools[wave - 1].join('|'),
    `Wave ${wave} identity authority resolves the exact character union`,
  );
}

const syntheticEnemy = {
  id: 'motion-runner',
  type: 'stale',
  label: 'Entry Runner',
  frame: 'common-a',
  x: 220,
  displayX: 220,
  hp: 100,
  hpMax: 100,
  deathT: 0,
  hurt: 0,
  killed: false,
  priorityTagRank: 0,
};
const syntheticMotionPack = structuredClone(pack);
syntheticMotionPack.motion = {
  grammar: 'gaf2d-motion-bundle-v1',
  characters: {
    'entry-runner': {
      image: 'assets/game-packs/valorant/characters/entry-runner/motion.webp',
      descriptor: 'assets/game-packs/valorant/characters/entry-runner/motion.json',
      descriptorSha256: '1'.repeat(64),
    },
    'site-warden': {
      image: 'assets/game-packs/valorant/characters/site-warden/motion.webp',
      descriptor: 'assets/game-packs/valorant/characters/site-warden/motion.json',
      descriptorSha256: '2'.repeat(64),
    },
  },
};
const syntheticPackAssets = {
  ready: true,
  pack: syntheticMotionPack,
  targets: { _ready: true, naturalWidth: 896, naturalHeight: 128 },
  targetData: {
    frames: {
      'common-a': {
        rect: { x: 0, y: 0, w: 128, h: 128 },
      },
    },
  },
};
const syntheticEnv = {
  zone: 0,
  meleeStop: 170,
  engagedId: null,
  t: 1.25,
};
const syntheticRecord = {
  status: 'ready',
  image: { width: 128, height: 128 },
  descriptor: {
    clips: {
      advance: {
        playback: 'loop',
        fps: 8,
        frames: [{ x: 0, y: 0, width: 64, height: 64 }],
      },
      idle: {
        playback: 'loop',
        fps: 8,
        frames: [{ x: 0, y: 0, width: 64, height: 64 }],
      },
      hit: {
        playback: 'progress',
        fps: 8,
        frames: [{ x: 0, y: 0, width: 64, height: 64 }],
      },
      death: {
        playback: 'progress',
        fps: 8,
        frames: [{ x: 0, y: 0, width: 64, height: 64 }],
      },
      broken: {
        playback: 'loop',
        fps: 8,
        frames: [{ x: 0, y: 0, width: 64, height: 64 }],
      },
    },
    trim: { x: 0, y: 0, width: 64, height: 64 },
    frameSize: { width: 64, height: 64 },
    pivot: { x: 0.5, y: 1 },
    presentation: {
      schemaVersion: 1,
      scaleContract: 'visible-body',
      reference: {
        clip: 'idle',
        frameIndex: 0,
        sourceSha256: '3'.repeat(64),
      },
      visibleBounds: { x: 8, y: 5, width: 48, height: 52 },
      motionBounds: { x: 2, y: 1, width: 60, height: 62 },
    },
  },
};
const syntheticStore = {
  motionStore: {
    entries: new Map(),
    diagnostics: new Map(),
  },
};
const syntheticKey = `${syntheticMotionPack.id}/entry-runner`;
syntheticStore.motionStore.entries.set(syntheticKey, { status: 'pending' });
assert(
  inspectEnemyMotion(syntheticEnemy, syntheticPackAssets, syntheticStore, syntheticEnv).status === 'pending',
  'mapped current-wave identity reports pending while its bundle is warming',
);
syntheticStore.motionStore.entries.set(syntheticKey, { status: 'failed' });
assert(
  inspectEnemyMotion(syntheticEnemy, syntheticPackAssets, syntheticStore, syntheticEnv).status === 'failed',
  'mapped current-wave identity reports failed when the bundle falls back',
);
syntheticStore.motionStore.entries.set(syntheticKey, syntheticRecord);
const readyMotion = inspectEnemyMotion(syntheticEnemy, syntheticPackAssets, syntheticStore, syntheticEnv);
assert(
  readyMotion.status === 'ready' &&
    readyMotion.assetId === 'entry-runner' &&
    readyMotion.clip === 'advance',
  'mapped current-wave identity resolves its authored motion clip before any static fallback',
);
function createCanvasProbe({ rejectFirstDraw = false } = {}) {
  const calls = [];
  let drawCount = 0;
  const ctx = new Proxy({}, {
    get(_target, key) {
      if (key === 'drawImage') {
        return (...args) => {
          drawCount += 1;
          if (rejectFirstDraw && drawCount === 1) {
            throw new Error('synthetic ready blit failure');
          }
          calls.push(args);
        };
      }
      if (key === 'createLinearGradient' || key === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      return () => {};
    },
    set() {
      return true;
    },
  });
  return { ctx, calls };
}
function createStageAnchorProbe() {
  const events = [];
  let pathTop = null;
  let pathHeight = null;
  const ctx = new Proxy(
    {},
    {
      get(_target, key) {
        if (
          key === 'createLinearGradient' ||
          key === 'createRadialGradient'
        ) {
          return (...args) => {
            events.push({ method: key, args });
            return { addColorStop() {} };
          };
        }
        return (...args) => {
          if (key === 'beginPath') {
            pathTop = null;
            pathHeight = null;
          }
          if (key === 'moveTo' && pathTop === null) pathTop = args[1];
          if (
            key === 'arcTo' &&
            pathTop !== null &&
            pathHeight === null
          ) {
            pathHeight = args[3] - pathTop;
          }
          events.push({
            method: key,
            args,
            pathTop,
            pathHeight,
          });
        };
      },
      set() {
        return true;
      },
    },
  );
  return { ctx, events };
}
let probe = createCanvasProbe();
syntheticStore.motionStore.entries.set(syntheticKey, { status: 'pending' });
drawEnemy(probe.ctx, syntheticEnemy, 320, 1.25, syntheticPackAssets, syntheticStore, false, 1, syntheticEnv);
assert(probe.calls.length === 0, 'pending mapped identity draws no static fallback body');
probe = createCanvasProbe();
syntheticStore.motionStore.entries.set(syntheticKey, { status: 'failed' });
drawEnemy(probe.ctx, syntheticEnemy, 320, 1.25, syntheticPackAssets, syntheticStore, false, 1, syntheticEnv);
assert(probe.calls.length > 0, 'failed mapped identity falls back to the static target atlas');
probe = createCanvasProbe();
syntheticStore.motionStore.entries.set(syntheticKey, syntheticRecord);
const entryGeometry = drawEnemy(
  probe.ctx,
  syntheticEnemy,
  320,
  1.25,
  syntheticPackAssets,
  syntheticStore,
  false,
  1,
  syntheticEnv,
);
assert(
  probe.calls.length > 0 &&
    stageRoleForEnemy(syntheticEnemy) === 'standard' &&
    entryGeometry.role === 'standard' &&
    entryGeometry.body.height === 72 &&
    entryGeometry.body.bottom === 318 &&
    entryGeometry.visualGap === 2,
  'authored Entry Runner resolves an exact 72 px body with a 2 px ground gap',
);
const bossKey = `${syntheticMotionPack.id}/site-warden`;
const syntheticBoss = {
  ...syntheticEnemy,
  id: 'motion-warden',
  type: 'boss',
  label: 'Site Warden',
  frame: 'boss',
  x: 160,
  displayX: 240,
  hp: 100,
  hpMax: 100,
};
syntheticStore.motionStore.entries.set(bossKey, syntheticRecord);
const idleBossProbe = createCanvasProbe();
const idleBossGeometry = drawEnemy(
  idleBossProbe.ctx,
  syntheticBoss,
  320,
  1.25,
  syntheticPackAssets,
  syntheticStore,
  false,
  1,
  syntheticEnv,
);
const brokenBossProbe = createCanvasProbe();
const brokenBossGeometry = drawEnemy(
  brokenBossProbe.ctx,
  { ...syntheticBoss, hp: 33 },
  320,
  1.25,
  syntheticPackAssets,
  syntheticStore,
  false,
  1,
  syntheticEnv,
);
assert(
  stageRoleForEnemy(syntheticBoss) === 'boss' &&
    idleBossGeometry.role === 'boss' &&
    brokenBossGeometry.role === 'boss' &&
    idleBossGeometry.body.height === 112 &&
    idleBossGeometry.body.bottom === 318 &&
    idleBossGeometry.visualGap === 2 &&
    JSON.stringify(idleBossGeometry) === JSON.stringify(brokenBossGeometry) &&
    idleBossProbe.calls[0]?.slice(5).join('|') ===
      brokenBossProbe.calls[0]?.slice(5).join('|'),
  'Site Warden idle and broken clips keep one exact 112 px body transform with a 2 px gap',
);
globalThis.document = globalThis.document || { documentElement: {} };
globalThis.getComputedStyle =
  globalThis.getComputedStyle ||
  (() => ({ getPropertyValue: () => '#6cb8ff' }));
const anchorProbe = createStageAnchorProbe();
const anchoredGeometry = drawEnemy(
  anchorProbe.ctx,
  {
    ...syntheticEnemy,
    priorityTagRank: 1,
    hurt: 0.1,
    hitFlash: 0.06,
  },
  320,
  1.25,
  syntheticPackAssets,
  syntheticStore,
  false,
  1,
  syntheticEnv,
);
const priorityStrokeIndex = anchorProbe.events.findIndex(
  ({ method }) => method === 'stroke',
);
const priorityTop = anchorProbe.events.find(
  ({ method }, index) => method === 'moveTo' && index < priorityStrokeIndex,
)?.args?.[1];
const hpTop = anchorProbe.events.find(
  ({ method }, index) => method === 'moveTo' && index > priorityStrokeIndex,
)?.args?.[1];
const hitGradient = anchorProbe.events.find(
  ({ method }) => method === 'createRadialGradient',
)?.args;
assert(
  Math.abs(priorityTop - 240.46153846153845) < 1e-9 &&
    Math.abs(hpTop - 176.46153846153845) < 1e-9 &&
    hitGradient?.[0] === 220 &&
    hitGradient?.[1] === 282 &&
    anchoredGeometry.anchors.hitY === 282 &&
    anchoredGeometry.anchors.lootY === 282,
  `priority, HP, hit, and loot facts consume the authored motion envelope and body anchors (${JSON.stringify({
    priorityTop,
    hpTop,
    hitGradient,
    hitY: anchoredGeometry.anchors.hitY,
    lootY: anchoredGeometry.anchors.lootY,
  })})`,
);
const compactProbe = createStageAnchorProbe();
const compactGeometry = drawEnemy(
  compactProbe.ctx,
  syntheticEnemy,
  320,
  1.25,
  syntheticPackAssets,
  syntheticStore,
  false,
  0.75,
  syntheticEnv,
);
const compactPanels = compactProbe.events.filter(
  ({ method, pathHeight }) =>
    method === 'fill' && pathHeight >= 20,
);
const compactLabel = compactProbe.events.find(
  ({ method, args }) =>
    method === 'fillText' && args[0] === syntheticEnemy.label,
);
const compactTrack = compactProbe.events.find(
  ({ method, pathHeight }) =>
    method === 'fill' && pathHeight === 4,
);
assert(
  Math.abs(compactGeometry.anchors.hpY - 250.34615384615387) < 1e-9 &&
    Math.abs(compactGeometry.body.bottom - 318.5) < 1e-9 &&
    compactPanels.length === 1 &&
    Math.abs(compactPanels[0].pathTop - 220.34615384615387) < 1e-9 &&
    Math.abs(compactLabel?.args?.[2] - 232.34615384615387) < 1e-9 &&
    Math.abs(compactTrack?.pathTop - 242.34615384615387) < 1e-9,
  'compact HP/name plate is one functional envelope-anchored component',
);
const authoredDeathProbe = createStageAnchorProbe();
const authoredDeathGeometry = drawEnemy(
  authoredDeathProbe.ctx,
  {
    ...syntheticEnemy,
    hp: 0,
    killed: true,
    deathT: 0.25,
    deathMax: 0.5,
  },
  320,
  1.25,
  syntheticPackAssets,
  syntheticStore,
  false,
  1,
  syntheticEnv,
);
const deathShadow = authoredDeathProbe.events.find(
  ({ method }) => method === 'ellipse',
)?.args;
assert(
  authoredDeathGeometry.role === 'standard' &&
    authoredDeathGeometry.body.height === 72 &&
    deathShadow?.[0] === authoredDeathGeometry.anchors.shadowX &&
    deathShadow?.[1] === authoredDeathGeometry.anchors.shadowY &&
    authoredDeathProbe.events.some(({ method }) => method === 'drawImage') &&
    !authoredDeathProbe.events.some(({ method }) => method === 'fillText'),
  'ready authored death keeps shared role scale and shadow while hiding HP',
);
probe = createCanvasProbe({ rejectFirstDraw: true });
syntheticStore.motionStore.entries.set(syntheticKey, {
  ...syntheticRecord,
  image: {
    ...syntheticRecord.image,
    closed: 0,
    close() {
      this.closed += 1;
    },
  },
});
let readyBlitThrew = false;
try {
  drawEnemy(
    probe.ctx,
    syntheticEnemy,
    320,
    1.25,
    syntheticPackAssets,
    syntheticStore,
    false,
    1,
    syntheticEnv,
  );
} catch {
  readyBlitThrew = true;
}
const rejectedBlitRecord =
  syntheticStore.motionStore.entries.get(syntheticKey);
assert(
  !readyBlitThrew &&
    rejectedBlitRecord?.status === 'failed' &&
    rejectedBlitRecord.error?.reason === 'decode',
  'ready blit rejection becomes an observable failed record without escaping render',
);
assert(
  syntheticStore.motionStore.diagnostics.has(
    `${syntheticMotionPack.id}/entry-runner/decode`,
  ),
  'ready blit rejection records one structured decode fallback diagnostic',
);
assert(
  probe.calls.length > 0,
  'ready blit rejection draws the static target fallback in the same frame',
);

const blockedSpawnState = createState();
blockedSpawnState.route.zone = 0;
blockedSpawnState.world.spawnCd = 0;
step(blockedSpawnState, C.FIXED_DT, { allowSpawn: false });
assert(
  blockedSpawnState.world.enemies.length === 0,
  'simulation blocks next spawn while the required current-wave motion set is still pending',
);
step(blockedSpawnState, C.FIXED_DT, { allowSpawn: true });
assert(
  blockedSpawnState.world.enemies.length === 1,
  'simulation resumes spawning once the required current-wave motion set has settled',
);
assert(
  targetForEnemyType(pack, 'patch')?.id === 'site-sentinel' &&
    targetForEnemyType(pack, 'boss')?.id === 'site-warden',
  'runtime target lookup shares the identity authority',
);
const futurePack = readJson(
  path.join(root, 'assets/game-packs/fortnite/pack.json'),
);
const reorderedFuturePack = structuredClone(futurePack);
reorderedFuturePack.targets.reverse();
assert(
  targetForEnemyType(reorderedFuturePack, 'stale')?.id ===
    futurePack.targets.find(({ role }) => role === 'common-a')?.id &&
    targetForEnemyType(reorderedFuturePack, 'patch')?.id ===
      futurePack.targets.find(({ role }) => role === 'elite')?.id,
  'future pack lookup follows declared roles instead of target array order',
);
assert(
  [true, 1.5, '1'].every(
    (invalidWave) =>
      enemyTypesForPackWave('valorant', invalidWave) === null &&
      packWaveIdentityIds(pack, invalidWave).length === 0,
  ),
  'wave authority rejects booleans, fractions, and numeric strings',
);
assert(
  packWaveIdentityIds(futurePack, 1).join('|') ===
    futurePack.targets.map((target) => target.id).join('|'),
  'unknown future pack non-boss waves conservatively include every target',
);
assert(
  packWaveIdentityIds(futurePack, 10).join('|') === futurePack.boss.id,
  'unknown future pack boss wave resolves only its boss',
);
const boundaryUnion = packWavePairIdentityUnion(pack, 10, futurePack, 1);
assert(
  boundaryUnion.map(({ packId, assetId }) => `${packId}/${assetId}`).join('|') ===
    [
      'valorant/site-warden',
      ...futurePack.targets.map((target) => `fortnite/${target.id}`),
    ].join('|'),
  '10→1 non-adjacent pack pairing preserves both pack-qualified identity sets',
);
const revisitUnion = packWavePairIdentityUnion(
  futurePack,
  10,
  futurePack,
  1,
);
assert(
  revisitUnion.length === 6 &&
    revisitUnion[0].assetId === futurePack.boss.id,
  'revisit pairing keeps boss and next-wave identities without catalog assumptions',
);

const motionPack = structuredClone(pack);
motionPack.motion = {
  grammar: 'gaf2d-motion-bundle-v1',
  characters: Object.fromEntries(
    [...motionPack.targets.map((target) => target.id), motionPack.boss.id].map(
      (assetId) => [
        assetId,
        {
          image: `assets/game-packs/valorant/characters/${assetId}/motion.webp`,
          descriptor: `assets/game-packs/valorant/characters/${assetId}/motion.json`,
          descriptorSha256: 'a'.repeat(64),
        },
      ],
    ),
  ),
};
assert(
  validatePackManifest(motionPack).length === 0,
  'six-character authored motion map is a valid future pack fixture',
);

const budgetRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-motion-budgets-'));
const budgetManifest = path.join(budgetRoot, 'manifest.json');
fs.writeFileSync(
  budgetManifest,
  JSON.stringify({ assets: [], packs: [{ id: 'valorant', hot: true }] }),
);
const descriptorFixture = readJson(
  path.join(root, 'qa/fixtures/motion-bundle/valid.json'),
);
const decodedOverrides = new Map();
const writeSized = (relative, bytes) => {
  const file = path.join(budgetRoot, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.closeSync(fs.openSync(file, 'w'));
  fs.truncateSync(file, bytes);
  return file;
};
const writeWebp = (relative, bytes, width, height) => {
  const file = path.join(budgetRoot, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const output = Buffer.alloc(Math.max(bytes, 30));
  output.write('RIFF', 0, 'ascii');
  output.writeUInt32LE(output.length - 8, 4);
  output.write('WEBP', 8, 'ascii');
  output.write('VP8X', 12, 'ascii');
  output.writeUInt32LE(10, 16);
  const encodedWidth = width - 1;
  const encodedHeight = height - 1;
  output[24] = encodedWidth & 0xff;
  output[25] = (encodedWidth >> 8) & 0xff;
  output[26] = (encodedWidth >> 16) & 0xff;
  output[27] = encodedHeight & 0xff;
  output[28] = (encodedHeight >> 8) & 0xff;
  output[29] = (encodedHeight >> 16) & 0xff;
  fs.writeFileSync(file, output);
  return file;
};
for (const [assetId, record] of Object.entries(motionPack.motion.characters)) {
  const descriptor = structuredClone(descriptorFixture);
  descriptor.assetId = assetId;
  let imageWidth = 2048;
  let imageHeight = 768;
  if (assetId === 'site-warden') {
    descriptor.clips.broken = {
      playback: 'loop',
      fps: 8,
      frames: Array.from({ length: 8 }, (_, index) => ({
        x: index * 96,
        y: 560,
        width: 96,
        height: 112,
      })),
    };
    descriptor.atlas.width = 2048;
    descriptor.atlas.height = 1024;
    imageHeight = 1025;
  } else if (assetId === 'entry-runner') {
    imageHeight = 1152;
  }
  const descriptorFile = path.join(budgetRoot, record.descriptor);
  fs.mkdirSync(path.dirname(descriptorFile), { recursive: true });
  fs.writeFileSync(descriptorFile, JSON.stringify(descriptor));
  record.descriptorSha256 =
    assetId === 'veil-operator'
      ? 'f'.repeat(64)
      : sha256(descriptorFile);
  writeWebp(
    record.image,
    assetId === 'site-warden'
      ? MOTION_BUDGETS.bossCompressed + 1
      : MOTION_BUDGETS.commonCompressed + 64 * 1024,
    imageWidth,
    imageHeight,
  );
}
let remainingHeroCompressed = MOTION_BUDGETS.heroCompressed + 1;
for (const [index, clip] of [
  'idle',
  'run',
  'attack',
  'crit',
  'sprint',
  'hit',
  'death',
  'celebrate',
].entries()) {
  const clipsLeft = 8 - index;
  const bytes = Math.ceil(remainingHeroCompressed / clipsLeft);
  remainingHeroCompressed -= bytes;
  const heroPath = `assets/mascot/v3/${clip}.webp`;
  writeSized(heroPath, bytes);
  writeSized(`assets/mascot/v3/${clip}.json`, 1);
  decodedOverrides.set(path.join(budgetRoot, heroPath), 4);
}
for (const assetPath of Object.values(motionPack.assets)) {
  if (assetPath.endsWith('.json')) {
    writeSized(assetPath, 1);
  } else {
    const file = writeSized(assetPath, 1);
    decodedOverrides.set(file, 4);
  }
}
const middlePack = structuredClone(readJson(
  path.join(root, 'assets/game-packs/league/pack.json'),
));
middlePack.motion = {
  grammar: 'gaf2d-motion-bundle-v1',
  characters: {
    [middlePack.targets[0].id]: {
      image: `assets/game-packs/${middlePack.id}/characters/${middlePack.targets[0].id}/motion.webp`,
      descriptor: `assets/game-packs/${middlePack.id}/characters/${middlePack.targets[0].id}/motion.json`,
      descriptorSha256: 'c'.repeat(64),
    },
  },
};
for (const [assetId, record] of Object.entries(middlePack.motion.characters)) {
  const descriptor = structuredClone(descriptorFixture);
  descriptor.assetId = assetId;
  descriptor.debug = true;
  const descriptorFile = path.join(budgetRoot, record.descriptor);
  fs.mkdirSync(path.dirname(descriptorFile), { recursive: true });
  fs.writeFileSync(descriptorFile, JSON.stringify(descriptor));
  record.descriptorSha256 = sha256(descriptorFile);
  writeWebp(record.image, 30, 768, 560);
}
const futureMotionPack = structuredClone(futurePack);
futureMotionPack.motion = {
  grammar: 'gaf2d-motion-bundle-v1',
  characters: Object.fromEntries(
    [
      ...futureMotionPack.targets.slice(0, 2),
      futureMotionPack.boss,
    ].map(({ id: assetId }) => [
      assetId,
      {
        image: `assets/game-packs/fortnite/characters/${assetId}/motion.webp`,
        descriptor: `assets/game-packs/fortnite/characters/${assetId}/motion.json`,
        descriptorSha256: 'b'.repeat(64),
      },
    ]),
  ),
};
for (const [assetId, record] of Object.entries(
  futureMotionPack.motion.characters,
)) {
  const descriptor = structuredClone(descriptorFixture);
  descriptor.assetId = assetId;
  const isBoss = assetId === futureMotionPack.boss.id;
  if (isBoss) {
    descriptor.atlas.width = 2048;
    descriptor.atlas.height = 1024;
    descriptor.clips.broken = {
      playback: 'loop',
      fps: 8,
      frames: Array.from({ length: 8 }, (_, index) => ({
        x: index * 96,
        y: 560,
        width: 96,
        height: 112,
      })),
    };
  }
  const descriptorFile = path.join(budgetRoot, record.descriptor);
  fs.mkdirSync(path.dirname(descriptorFile), { recursive: true });
  fs.writeFileSync(descriptorFile, JSON.stringify(descriptor));
  record.descriptorSha256 = sha256(descriptorFile);
  writeWebp(
    record.image,
    isBoss ? MOTION_BUDGETS.commonCompressed + 1 : 30,
    2048,
    isBoss ? 1024 : 2048,
  );
}
const budgetResult = verifySizes(budgetManifest, {
  rootDir: budgetRoot,
  packs: [motionPack, middlePack, futureMotionPack],
  decodedImageBytes: (file) => decodedOverrides.get(file) ?? 4,
});
assert(
  budgetResult.errors.some(
    (error) =>
      error.includes('entry-runner motion dimensions:') &&
      error.includes('descriptor 768x560') &&
      error.includes('WebP 2048x1152'),
  ),
  'forged small descriptor cannot hide the actual large WebP dimensions',
);
assert(
  budgetResult.errors.some(
    (error) =>
      error.includes(`${middlePack.targets[0].id} motion descriptor:`) &&
      error.includes('bundle: unexpected property "debug"'),
  ),
  'hash-correct malformed descriptor is rejected by the closed-world validator before budgeting',
);
assert(
  budgetResult.errors.some(
    (error) =>
      error.includes('veil-operator motion descriptor SHA-256:') &&
      error.includes('does not match'),
  ),
  'pack-owned descriptor hash is verified against descriptor bytes',
);
assert(
  budgetResult.errors.some(
    (error) =>
      error.includes('entry-runner motion atlas SHA-256:') &&
      error.includes('does not match'),
  ),
  'descriptor-owned atlas hash is verified against motion.webp bytes offline',
);
assert(
  !budgetResult.errors.some(
    (error) =>
      error.includes(`${futureMotionPack.boss.id} motion descriptor:`) &&
      error.includes('broken'),
  ),
  'offline verifier grants broken ownership to any pack-declared boss ID',
);
assert(
  !budgetResult.errors.some(
    (error) =>
      error.includes(`${futureMotionPack.boss.id} motion compressed:`) ||
      error.includes(`${futureMotionPack.boss.id} motion decoded:`),
  ),
  'offline verifier applies boss compressed and decoded caps to a future boss ID',
);
for (const [needle, message] of [
  ['entry-runner motion compressed:', 'common motion compressed cap names the asset'],
  ['entry-runner motion decoded:', 'common motion decoded cap names the asset'],
  ['site-warden motion compressed:', 'Site Warden compressed cap names the asset'],
  ['site-warden motion decoded:', 'Site Warden decoded cap names the asset'],
  ['Hero motion compressed:', 'Hero aggregate compressed cap is enforced'],
  ['new motion compressed:', 'new-motion aggregate compressed cap is enforced'],
  ['valorant waves 8+9 motion decoded:', 'current and next wave decoded cap is enforced'],
  [
    'valorant wave 10 + fortnite wave 1 motion decoded:',
    'non-adjacent scheduled boundary pair is budgeted',
  ],
]) {
  assert(
    budgetResult.errors.some(
      (error) =>
        error.includes(needle) &&
        error.includes('bytes') &&
        error.includes('exceeds'),
    ),
    message,
  );
}

const hotRoot = path.join(budgetRoot, 'hot-equality');
const hotPack = structuredClone(pack);
for (const [index, assetPath] of Object.values(hotPack.assets).entries()) {
  const file = writeSized(
    path.relative(budgetRoot, path.join(hotRoot, assetPath)),
    1,
  );
  decodedOverrides.set(
    file,
    index === 0 ? MOTION_BUDGETS.hotTextures : 0,
  );
}
const hotManifest = path.join(hotRoot, 'manifest.json');
fs.mkdirSync(path.dirname(hotManifest), { recursive: true });
fs.writeFileSync(
  hotManifest,
  JSON.stringify({ assets: [], packs: [{ id: hotPack.id, hot: true }] }),
);
const hotResult = verifySizes(hotManifest, {
  rootDir: hotRoot,
  packs: [hotPack],
  decodedImageBytes: (file) => decodedOverrides.get(file) ?? 0,
});
assert(
  hotResult.errors.some(
    (error) =>
      error.includes(`hot textures: ${MOTION_BUDGETS.hotTextures} bytes`) &&
      error.includes(`below ${MOTION_BUDGETS.hotTextures}`),
  ),
  'hot-texture total equal to the exclusive 64 MiB cap fails',
);
fs.rmSync(budgetRoot, { recursive: true, force: true });

console.log('GAF2D VALORANT PASS');
