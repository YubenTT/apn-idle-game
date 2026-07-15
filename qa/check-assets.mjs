import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { readJson, validateAtlasData } from '../scripts/assets/lib.mjs';
import { validateAllManifests } from '../scripts/assets/validate-manifests.mjs';
import { verifySizes } from '../scripts/assets/verify-sizes.mjs';
import { generateManifest } from '../scripts/assets/generate-manifest.mjs';
import { packAtlas } from '../scripts/assets/pack-atlas.mjs';
import { convertWebp } from '../scripts/assets/convert-webp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(root, 'qa/fixtures/assets');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Assets: ${message}`);
  console.log(`OK ${message}`);
};

const validErrors = validateAtlasData(readJson(path.join(fixtures, 'valid/atlas.json')), 'valid');
assert(validErrors.length === 0, 'valid atlas keeps rect and foot pivot');

const missingErrors = validateAtlasData(readJson(path.join(fixtures, 'missing-pivot/atlas.json')), 'missing-pivot');
assert(missingErrors.some((error) => error.includes('missing-pivot/idle: missing pivot')), 'missing pivot rejected by asset and frame');

const boundsErrors = validateAtlasData(readJson(path.join(fixtures, 'out-of-bounds/atlas.json')), 'out-of-bounds');
assert(boundsErrors.some((error) => error.includes('out-of-bounds/idle: rect out of bounds')), 'out-of-bounds rect rejected by asset and frame');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-assets-'));
const spec = path.join(fixtures, 'valid/pack-spec.json');
const atlasPng = path.join(temp, 'atlas.png');
const atlasJson = path.join(temp, 'atlas.json');
const atlasWebp = path.join(temp, 'atlas.webp');
await packAtlas(spec, atlasPng, atlasJson);
await convertWebp(atlasPng, atlasWebp, 'targets');
const packedA = [atlasPng, atlasJson, atlasWebp].map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
await packAtlas(spec, atlasPng, atlasJson);
await convertWebp(atlasPng, atlasWebp, 'targets');
const packedB = [atlasPng, atlasJson, atlasWebp].map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
assert(JSON.stringify(packedA) === JSON.stringify(packedB), 'atlas and WebP output byte-stable across two runs');
fs.rmSync(temp, { recursive: true, force: true });

const oversized = verifySizes(path.join(fixtures, 'oversized/manifest.json'));
assert(oversized.errors.some((error) => error.includes('fixture-targets') && error.includes('exceeds')), 'oversized target rejected by asset name');
assert(oversized.errors.some((error) => error.includes('hot packs: 3 exceeds 2')), 'third hot pack rejected');

const manifests = validateAllManifests();
assert(manifests.files.length === 20 && manifests.errors.length === 0, '20 pack manifests valid');

const productionNames = ['background.webp', 'targets.webp', 'targets.json', 'props.webp', 'corruption-mask.webp', 'source-board.md'];
const productionPacks = [];
for (const manifestFile of manifests.files) {
  const directory = path.dirname(manifestFile);
  const present = productionNames.filter((name) => fs.existsSync(path.join(directory, name)));
  if (!present.length) continue;
  const packId = path.basename(directory);
  assert(present.length === productionNames.length, `${packId} production set complete`);
  const targetData = readJson(path.join(directory, 'targets.json'));
  const targetErrors = validateAtlasData(targetData, `${packId}/targets`);
  assert(targetErrors.length === 0, `${packId} target atlas valid`);
  const frames = ['common-a', 'common-b', 'common-c', 'elite', 'event', 'boss', 'boss-break'];
  assert(frames.every((name) => targetData.frames?.[name]), `${packId} has five targets, boss, and break state`);
  assert(frames.every((name) => targetData.frames[name].pivot?.x === 0.5 && targetData.frames[name].pivot?.y === 1), `${packId} foot-center pivots locked`);
  assert(frames.every((name) => targetData.frames[name].metrics?.direction === 'right-to-left'), `${packId} target direction locked`);
  const sourceBoard = fs.readFileSync(path.join(directory, 'source-board.md'), 'utf8');
  assert(sourceBoard.includes('textless APN Patchline') && sourceBoard.includes('no screenshot pixels or official logos ship'), `${packId} source evidence recorded`);
  const backgroundSource = fs.readFileSync(path.join(directory, 'master/background.svg'), 'utf8');
  for (const motif of ['apn-editorial-motifs', 'billboard', 'signal-rail', 'patchline', 'archive-lights']) {
    assert(backgroundSource.includes(`id="${motif}"`), `${packId} background locks ${motif}`);
  }
  assert(fs.statSync(path.join(directory, 'background.webp')).size <= 150 * 1024, `${packId} background stays under 150 KB`);
  productionPacks.push(packId);
}
assert([0, 5, 10, 15, 20].includes(productionPacks.length), `production lands in five-pack groups (${productionPacks.length})`);

const itemAtlasFile = path.join(root, 'assets/items/item-atlas.json');
assert(fs.existsSync(itemAtlasFile), 'item atlas metadata exists');
const itemAtlas = readJson(itemAtlasFile);
const itemEntries = Object.values(itemAtlas.items || {});
assert(itemEntries.length === 12, 'item atlas contains twelve production items');
for (const material of ['matte-polymer', 'laminated-paper', 'anodized-metal']) {
  assert(itemEntries.filter((item) => item.material === material).length === 4, `${material} item family contains four pieces`);
}
assert(fs.statSync(path.join(root, itemAtlas.image)).size <= 128 * 1024, 'item runtime atlas stays under 128 KB');

const first = generateManifest();
const firstBytes = fs.readFileSync(path.join(root, 'assets/manifest.json'));
const firstHash = crypto.createHash('sha256').update(firstBytes).digest('hex');
const second = generateManifest();
const secondBytes = fs.readFileSync(path.join(root, 'assets/manifest.json'));
const secondHash = crypto.createHash('sha256').update(secondBytes).digest('hex');
assert(firstHash === secondHash && first.assets.length === second.assets.length, 'asset manifest generation byte-stable');

const sizes = verifySizes();
assert(sizes.errors.length === 0, `current assets fit budgets (${sizes.firstPlayable} first-playable bytes)`);
assert(sizes.hot.length <= 2, 'at most current and next packs marked hot');

const hostAtlasFile = path.join(root, 'assets/mascot/atlas/apn-mascot-base.json');
if (fs.existsSync(hostAtlasFile)) {
  const host = readJson(hostAtlasFile);
  const required = ['idle', 'run', 'scan', 'crit', 'loot', 'sprint', 'overdrive', 'damage', 'level', 'defeat'];
  assert(required.every((name) => host.frames?.[name]), 'Host atlas contains ten required poses');
  assert(host.meta?.source === 'assets/apn-mascot-glb-host.glb', 'Host atlas records canonical GLB source');
  assert(host.meta?.renderLock?.cameraY === 18 && host.meta?.renderLock?.cameraX === 9, 'Host camera lock recorded');
  const metrics = required.map((name) => host.frames[name].metrics);
  const footXs = metrics.map((item) => item.footX);
  const footYs = metrics.map((item) => item.footY);
  assert(Math.max(...footXs) - Math.min(...footXs) <= 1 && Math.max(...footYs) - Math.min(...footYs) <= 1, 'Host foot pivot stable within one pixel');
  const ratios = metrics.map((item) => item.headBodyRatio);
  assert((Math.max(...ratios) - Math.min(...ratios)) / Math.min(...ratios) <= 0.03, 'Host head/body ratio stable within three percent');
  assert(metrics.every((item) => item.visorCoverage >= 0.18), 'Host visor region non-empty in every pose');
}
console.log('ASSETS PASS');
