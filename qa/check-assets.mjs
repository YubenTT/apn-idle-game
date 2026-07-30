import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  ASSET_BUDGETS,
  readJson,
  validateAtlasData,
  validatePackManifest,
} from '../scripts/assets/lib.mjs';
import { validateAllManifests } from '../scripts/assets/validate-manifests.mjs';
import { verifySizes } from '../scripts/assets/verify-sizes.mjs';
import { GAME_PACKS } from '../js/generated/game-packs.js';
import { generateManifest } from '../scripts/assets/generate-manifest.mjs';
import {
  HERO_V3_CLIPS,
  firstPlayableAssetPaths,
} from '../scripts/assets/first-playable.mjs';
import { LEGACY_CREATURE_BOOT_ASSET_PATHS } from '../js/creatures.js';
import { packAtlas } from '../scripts/assets/pack-atlas.mjs';
import { convertWebp } from '../scripts/assets/convert-webp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(root, 'qa/fixtures/assets');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Assets: ${message}`);
  console.log(`OK ${message}`);
};

function collectJsonFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectJsonFiles(absolute, files);
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(absolute);
  }
  return files;
}

function machineLocalPathFacts(value, location = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      machineLocalPathFacts(entry, `${location}[${index}]`, findings));
    return findings;
  }
  if (!value || typeof value !== 'object') return findings;
  for (const [key, entry] of Object.entries(value)) {
    const nextLocation = `${location}.${key}`;
    if (
      typeof entry === 'string' &&
      /(?:path|source)$/i.test(key) &&
      (path.posix.isAbsolute(entry) || path.win32.isAbsolute(entry))
    ) {
      findings.push(`${nextLocation}=${entry}`);
    } else {
      machineLocalPathFacts(entry, nextLocation, findings);
    }
  }
  return findings;
}

const nonPortableAssetMetadata = collectJsonFiles(path.join(root, 'assets'))
  .flatMap((file) =>
    machineLocalPathFacts(JSON.parse(fs.readFileSync(file, 'utf8')))
      .map((finding) => `${path.relative(root, file)}:${finding}`));
assert(
  nonPortableAssetMetadata.length === 0,
  `asset JSON contains no machine-local source/path metadata (${nonPortableAssetMetadata.join(', ')})`,
);

for (const script of [
  'scripts/assets/pack-atlas.mjs',
  'scripts/assets/build-gaf2d-targets.mjs',
  'scripts/assets/convert-webp.mjs',
  'scripts/assets/export-mascot.mjs',
  'scripts/assets/produce-game-packs.mjs',
]) {
  const source = fs.readFileSync(path.join(root, script), 'utf8');
  const signedTokenPrefix = ['?token=', 'eyJ'].join('');
  assert(!source.includes('/opt/homebrew/bin/'), `${script} has no Homebrew-only tool path`);
  assert(!source.includes('/Users/'), `${script} has no developer-only tool path`);
  assert(!source.includes(signedTokenPrefix), `${script} contains no signed source token`);
}

const validErrors = validateAtlasData(readJson(path.join(fixtures, 'valid/atlas.json')), 'valid');
assert(validErrors.length === 0, 'valid atlas keeps rect and foot pivot');

const missingErrors = validateAtlasData(readJson(path.join(fixtures, 'missing-pivot/atlas.json')), 'missing-pivot');
assert(missingErrors.some((error) => error.includes('missing-pivot/idle: missing pivot')), 'missing pivot rejected by asset and frame');

const boundsErrors = validateAtlasData(readJson(path.join(fixtures, 'out-of-bounds/atlas.json')), 'out-of-bounds');
assert(boundsErrors.some((error) => error.includes('out-of-bounds/idle: rect out of bounds')), 'out-of-bounds rect rejected by asset and frame');

const productionPack = readJson(path.join(root, 'assets/game-packs/valorant/pack.json'));
const fixturePack = structuredClone(productionPack);
const validDescriptorSha256 = 'a'.repeat(64);
fixturePack.motion = {
  grammar: 'gaf2d-motion-bundle-v1',
  characters: {
    'entry-runner': {
      image: 'assets/game-packs/valorant/characters/entry-runner/motion.webp',
      descriptor: 'assets/game-packs/valorant/characters/entry-runner/motion.json',
      descriptorSha256: validDescriptorSha256,
    },
  },
};
assert(validatePackManifest(fixturePack).length === 0, 'optional pack motion map accepted');
const duplicateRole = structuredClone(fixturePack);
duplicateRole.targets[1].role = 'common-a';
assert(
  validatePackManifest(duplicateRole).some((error) => error.includes('target roles must be exactly')),
  'pack requires the exact five unique target roles',
);
const mismatchedRoleFrame = structuredClone(fixturePack);
mismatchedRoleFrame.targets[0].frame = 'elite';
assert(
  validatePackManifest(mismatchedRoleFrame).some((error) => error.includes('frame must equal role')),
  'target frame must equal its declared role',
);
const mismatchedBossFrames = structuredClone(fixturePack);
mismatchedBossFrames.boss.frame = 'elite';
assert(
  validatePackManifest(mismatchedBossFrames).some((error) => error.includes('boss frame must equal "boss"')),
  'boss frame stays locked to boss',
);
const unknownMotionField = structuredClone(fixturePack);
unknownMotionField.motion.debug = true;
assert(
  validatePackManifest(unknownMotionField).some((error) => error.includes('motion: unexpected property "debug"')),
  'motion object rejects unknown top-level fields',
);
const signedMotionField = structuredClone(fixturePack);
signedMotionField.motion.characters['entry-runner'].signedDescriptorUrl =
  'https://example.invalid/motion.json?token=secret';
assert(
  validatePackManifest(signedMotionField).some((error) =>
    error.includes('unexpected property "signedDescriptorUrl"'),
  ),
  'motion record rejects signed or private fields',
);
const missingDescriptorHash = structuredClone(fixturePack);
delete missingDescriptorHash.motion.characters['entry-runner'].descriptorSha256;
assert(
  validatePackManifest(missingDescriptorHash).some((error) =>
    error.includes('descriptorSha256'),
  ),
  'motion record requires an immutable descriptor hash',
);
assert(
  ['A'.repeat(64), 'g'.repeat(64), 'a'.repeat(63)].every((invalidHash) => {
    const invalidDescriptorHash = structuredClone(fixturePack);
    invalidDescriptorHash.motion.characters[
      'entry-runner'
    ].descriptorSha256 = invalidHash;
    return validatePackManifest(invalidDescriptorHash).some((error) =>
      error.includes('descriptorSha256'),
    );
  }),
  'motion descriptor hash must be exactly 64 lowercase hex characters',
);
const badGrammar = structuredClone(fixturePack);
badGrammar.motion.grammar = 'gaf2d-motion-bundle-v2';
assert(
  validatePackManifest(badGrammar).some((error) => error.includes('motion grammar')),
  'unknown pack motion grammar rejected',
);
const unknownCharacter = structuredClone(fixturePack);
unknownCharacter.motion.characters['unknown-runner'] =
  unknownCharacter.motion.characters['entry-runner'];
assert(
  validatePackManifest(unknownCharacter).some((error) => error.includes('unknown character')),
  'motion keys must name a target or boss ID',
);
const escapedMotion = structuredClone(fixturePack);
escapedMotion.motion.characters['entry-runner'].image =
  'assets/game-packs/valorant/characters/entry-runner/../motion.webp';
assert(
  validatePackManifest(escapedMotion).some((error) => error.includes('motion.webp')),
  'motion image stays in its character-owned directory',
);
const duplicateMotionPath = structuredClone(fixturePack);
duplicateMotionPath.motion.characters['veil-operator'] = {
  image: duplicateMotionPath.motion.characters['entry-runner'].image,
  descriptor: duplicateMotionPath.motion.characters['entry-runner'].descriptor,
  descriptorSha256: validDescriptorSha256,
};
assert(
  validatePackManifest(duplicateMotionPath).some((error) => error.includes('duplicate motion path')),
  'motion image and descriptor paths are unique',
);
const motionlessBefore = JSON.stringify(productionPack);
assert(
  validatePackManifest(productionPack).length === 0 &&
    JSON.stringify(productionPack) === motionlessBefore &&
    productionPack.motion === undefined,
  'pack without motion stays valid and unchanged',
);

const firstPlayablePacks = readJson(
  path.join(fixtures, 'first-playable/packs.json'),
);
const firstPlayablePaths = firstPlayableAssetPaths(firstPlayablePacks);
assert(
  HERO_V3_CLIPS.every(
    (clip) =>
      firstPlayablePaths.has(`assets/mascot/v3/${clip}.webp`) &&
      firstPlayablePaths.has(`assets/mascot/v3/${clip}.json`),
  ),
  'all eight Hero V3 WebP and JSON files are first-playable',
);
assert(
  firstPlayablePaths.has('assets/mascot/v3/set.json'),
  'Hero set authority is part of the real first-playable request set',
);
for (const pack of firstPlayablePacks.slice(0, 2)) {
  assert(
    Object.values(pack.assets).every((assetPath) =>
      firstPlayablePaths.has(assetPath)),
    `${pack.id} current/next pack request set is first-playable`,
  );
}
assert(
  firstPlayablePaths.has(
    'assets/game-packs/valorant/characters/entry-runner/motion.webp',
  ) &&
    firstPlayablePaths.has(
      'assets/game-packs/valorant/characters/entry-runner/motion.json',
    ),
  'current Wave 1 possible motion is first-playable',
);
assert(
  !firstPlayablePaths.has(
    'assets/game-packs/valorant/characters/veil-operator/motion.webp',
  ) &&
    !firstPlayablePaths.has(
      'assets/game-packs/league/characters/lane-scout/motion.webp',
    ),
  'later-wave and next-pack motion stay cold',
);
assert(
  firstPlayablePaths.has('assets/apn-logo.svg') &&
    firstPlayablePaths.has('assets/items/item-atlas.webp') &&
    !firstPlayablePaths.has('assets/items/item-atlas.json'),
  'only boot-requested UI and item assets are first-playable',
);
assert(
  LEGACY_CREATURE_BOOT_ASSET_PATHS.length === 32 &&
    LEGACY_CREATURE_BOOT_ASSET_PATHS.every((assetPath) =>
      !firstPlayablePaths.has(assetPath),
    ),
  'legacy creature WebP and JSON files stay cold until an explicit fallback path requests them',
);
const mainSource = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const motionPreviewSource = fs.readFileSync(
  path.join(root, 'js/motion-preview.js'),
  'utf8',
);
assert(
  /\bloadHeroV3\(motionPreview\.heroBasePath,\s*\{\s*allowUnapprovedPreview:\s*motionPreview\.active,\s*\}\)/.test(
    mainSource,
  ) &&
    /const PRODUCTION_HERO_BASE = ['"]assets\/mascot\/v3\/['"]/.test(
      motionPreviewSource,
    ) &&
    /heroBasePath:\s*PRODUCTION_HERO_BASE/.test(motionPreviewSource) &&
    !/\bloadCreatures\(\)/.test(mainSource) &&
    /\bpreloadRouteAssets\(assetStore,\s*s\.route\)/.test(mainSource),
  'first-playable contract is gated by fail-closed Hero V3 and pack-shell boot loaders only',
);
const bootSource = mainSource.match(
  /async function boot\(\) \{([\s\S]*?)\n\}/,
)?.[1] || '';
assert(
  bootSource.includes('heroV3Load') &&
    bootSource.indexOf('heroV3Load') <
      bootSource.indexOf('apn-first-playable'),
  'first-playable waits for the complete Hero set to load or fail safely',
);
const currentWarmIndex = bootSource.indexOf(
  'await warmMotionRequests(currentRequests)',
);
const firstDrawIndex = bootSource.indexOf(
  'draw(view.ctx, view.w, view.h, s, assetStore)',
);
const readyMarkerIndex = bootSource.indexOf(
  "dataset.firstPlayable = 'ready'",
);
assert(
  currentWarmIndex >= 0 &&
    firstDrawIndex > currentWarmIndex &&
    readyMarkerIndex > firstDrawIndex &&
    !bootSource.includes('syncMotionWindow()') &&
    mainSource.includes("performance.mark?.('apn-first-playable')"),
  'first playable waits for current motion, draws and marks ready before any next-wave warm',
);
for (const coldPath of [
  'assets/apn-mascot-glb-host.glb',
  'assets/mascot-ref-sheet.jpg',
  'assets/mascot-host.webp',
  'assets/game-packs/fortnite/background.webp',
  'assets/game-packs/valorant/master/background.svg',
]) {
  assert(!firstPlayablePaths.has(coldPath), `${coldPath} stays cold`);
}

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
const sourcePacks = manifests.files
  .map((file) => readJson(file))
  .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
const catalogPacks = readJson(path.join(root, 'assets/game-packs/catalog.json'));
assert(
  JSON.stringify(catalogPacks) === JSON.stringify(sourcePacks),
  'catalog.json is the canonical sorted projection of every pack manifest',
);
assert(
  JSON.stringify(GAME_PACKS) === JSON.stringify(sourcePacks),
  'generated game packs module matches canonical pack projection including motion metadata',
);

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
  const masterDir = path.join(directory, 'master');
  if (fs.existsSync(masterDir)) {
    const foreign = fs.readdirSync(masterDir).filter((name) => !/\.(svg|md)$/.test(name));
    assert(foreign.length === 0, `${packId} master holds only generated sources (no vendored pixels: ${foreign.join(', ') || 'clean'})`);
  }
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

const generatedManifestPath = path.join(temp, 'manifest.json');
const first = generateManifest({ outputFile: generatedManifestPath });
const firstBytes = fs.readFileSync(generatedManifestPath);
const firstHash = crypto.createHash('sha256').update(firstBytes).digest('hex');
const second = generateManifest({ outputFile: generatedManifestPath });
const secondBytes = fs.readFileSync(generatedManifestPath);
const secondHash = crypto.createHash('sha256').update(secondBytes).digest('hex');
assert(firstHash === secondHash && first.assets.length === second.assets.length, 'asset manifest generation byte-stable');
const generatedByPath = new Map(first.assets.map((asset) => [asset.path, asset]));
for (const hotPath of [
  'assets/mascot/v3/idle.webp',
  'assets/mascot/v3/idle.json',
  'assets/mascot/v3/set.json',
  'assets/game-packs/valorant/background.webp',
  'assets/game-packs/valorant/targets.json',
  'assets/game-packs/league/corruption-mask.webp',
  'assets/apn-logo.svg',
  'assets/items/item-atlas.webp',
]) {
  assert(
    generatedByPath.get(hotPath)?.firstPlayable === true,
    `${hotPath} manifest record matches a real boot request`,
  );
}
for (const coldPath of [
  'assets/apn-mascot-glb-host.glb',
  'assets/mascot-ref-sheet.jpg',
  'assets/game-packs/fortnite/background.webp',
  'assets/creatures/curator/idle.webp',
  'assets/creatures/curator/idle.json',
]) {
  assert(
    generatedByPath.get(coldPath)?.firstPlayable === false,
    `${coldPath} manifest record stays cold`,
  );
}

const sizes = verifySizes(generatedManifestPath);
assert(sizes.errors.length === 0, `current assets fit budgets (${sizes.firstPlayable} first-playable bytes)`);
assert(sizes.hot.length <= 2, 'at most current and next packs marked hot');
assert(
  sizes.legacyCreatureDecoded > 0 &&
    sizes.hotTextures >= sizes.legacyCreatureDecoded,
  'hot-texture accounting includes one lazily resident legacy creature owner',
);
const staleManifest = structuredClone(first);
const staleHot = staleManifest.assets.find(
  (asset) => asset.path === 'assets/mascot/v3/idle.webp',
);
const staleCold = staleManifest.assets.find(
  (asset) => asset.path === 'assets/apn-mascot-glb-host.glb',
);
staleHot.firstPlayable = false;
staleCold.firstPlayable = true;
const staleManifestPath = path.join(temp, 'manifest-stale.json');
fs.writeFileSync(staleManifestPath, JSON.stringify(staleManifest));
const staleResult = verifySizes(staleManifestPath, {
  packs: sourcePacks,
});
assert(
  staleResult.errors.some((error) =>
    error.includes('assets/mascot/v3/idle.webp') &&
    error.includes('firstPlayable must equal true'),
  ) &&
    staleResult.errors.some((error) =>
      error.includes('assets/apn-mascot-glb-host.glb') &&
      error.includes('firstPlayable must equal false'),
    ),
  'stale first-playable flags are rejected against the canonical boot request set',
);
const normalCliStaleResult = verifySizes(staleManifestPath);
assert(
  normalCliStaleResult.errors.some((error) =>
    error.includes('assets/mascot/v3/idle.webp') &&
    error.includes('firstPlayable must equal true'),
  ) &&
    normalCliStaleResult.errors.some((error) =>
      error.includes('assets/apn-mascot-glb-host.glb') &&
      error.includes('firstPlayable must equal false'),
    ),
  'normal verifier discovery rejects stale first-playable flags without injected packs',
);

const missingManifestRecord = structuredClone(first);
missingManifestRecord.assets = missingManifestRecord.assets.filter(
  (asset) => asset.path !== 'assets/mascot/v3/idle.webp',
);
const missingManifestRecordPath = path.join(
  temp,
  'manifest-missing-first-playable-record.json',
);
fs.writeFileSync(
  missingManifestRecordPath,
  JSON.stringify(missingManifestRecord),
);
const missingManifestRecordResult = verifySizes(missingManifestRecordPath);
assert(
  missingManifestRecordResult.errors.some(
    (error) =>
      error.includes('assets/mascot/v3/idle.webp') &&
      error.includes('missing manifest asset record'),
  ),
  'normal verifier discovery rejects a missing canonical first-playable manifest record',
);

const strictRoot = path.join(temp, 'strict-first-playable');
const strictAsset = path.join(strictRoot, 'assets/exact.bin');
fs.mkdirSync(path.dirname(strictAsset), { recursive: true });
fs.closeSync(fs.openSync(strictAsset, 'w'));
fs.truncateSync(strictAsset, ASSET_BUDGETS.firstPlayable);
const strictManifest = path.join(strictRoot, 'manifest.json');
fs.writeFileSync(
  strictManifest,
  JSON.stringify({
    assets: [
      {
        id: 'exact-first-playable',
        path: 'assets/exact.bin',
        firstPlayable: true,
      },
    ],
    packs: [],
  }),
);
const strictSizes = verifySizes(strictManifest, {
  rootDir: strictRoot,
  packs: [],
});
assert(
  strictSizes.errors.some(
    (error) =>
      error.includes(`first-playable: ${ASSET_BUDGETS.firstPlayable} bytes`) &&
      error.includes(`below ${ASSET_BUDGETS.firstPlayable}`),
  ),
  'first-playable total equal to the exclusive cap fails',
);
fs.rmSync(temp, { recursive: true, force: true });

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
