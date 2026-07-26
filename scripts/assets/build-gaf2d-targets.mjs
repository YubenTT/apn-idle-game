import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { stableJson } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const defaultPackDir = path.join(root, 'assets/game-packs/valorant');
const MAGICK = process.env.MAGICK || 'magick';
const CWEBP = process.env.CWEBP || 'cwebp';
const SHA256 = /^[a-f0-9]{64}$/;
const STATUSES_WITH_APPROVAL = new Set(['identity_approved', 'ready_to_export', 'exported']);

const hashFile = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function fail(message) {
  throw new Error(`GAF2D targets: ${message}`);
}

function portablePath(base, relative, label) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split('/').includes('..')) {
    fail(`${label} must be a portable relative path`);
  }
  const resolved = path.resolve(base, relative);
  const prefix = `${path.resolve(base)}${path.sep}`;
  if (!resolved.startsWith(prefix)) fail(`${label} escapes the GAF2D project`);
  return resolved;
}

function parseArgs(argv) {
  const options = { gaf2dProject: '', packDir: defaultPackDir, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--gaf2d-project') options.gaf2dProject = argv[++index] || '';
    else if (arg === '--pack-dir') options.packDir = path.resolve(argv[++index] || '');
    else if (arg === '--json') options.json = true;
    else fail(`unknown argument ${arg}`);
  }
  if (!options.gaf2dProject) fail('--gaf2d-project is required');
  options.gaf2dProject = path.resolve(options.gaf2dProject);
  return options;
}

function validateConfig(config) {
  if (config?.schemaVersion !== 1 || config?.sourceAuthority !== 'gaf2d') {
    fail('unsupported source mapping');
  }
  const atlas = config.atlas;
  if (
    atlas?.cellWidth !== 128 ||
    atlas?.cellHeight !== 128 ||
    atlas?.columns !== 7 ||
    atlas?.paddingBottom !== 2 ||
    atlas?.pivot?.x !== 0.5 ||
    atlas?.pivot?.y !== 1 ||
    atlas?.direction !== 'right-to-left'
  ) {
    fail('atlas contract must remain 7 × 128px with a bottom-center pivot');
  }
  const names = config.frames?.map((frame) => frame.frame);
  const expected = ['common-a', 'common-b', 'common-c', 'elite', 'event', 'boss', 'boss-break'];
  if (names?.join('|') !== expected.join('|')) fail('frame order does not match the runtime contract');
}

function validateToolchain(config) {
  const recorded = config?.toolchain;
  if (!recorded?.imageMagick || !recorded?.cwebp) fail('exact toolchain versions are required');
  const magickOutput = execFileSync(MAGICK, ['-version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const cwebpOutput = execFileSync(CWEBP, ['-version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const imageMagick = magickOutput.match(/ImageMagick\s+([^\s]+)/)?.[1] || '';
  const cwebp = cwebpOutput.trim().split(/\s+/)[0] || '';
  if (imageMagick !== recorded.imageMagick || cwebp !== recorded.cwebp) {
    fail(
      `toolchain mismatch (ImageMagick ${imageMagick || 'unknown'}, cwebp ${cwebp || 'unknown'}; ` +
      `expected ${recorded.imageMagick} and ${recorded.cwebp})`,
    );
  }
}

export function approvalMatchesCurrentManifest(manifest, frame) {
  const approvalVersion = manifest?.approvals?.identity?.source_manifest_version;
  return (
    Number.isInteger(approvalVersion) &&
    approvalVersion === manifest?.manifest_version &&
    approvalVersion === frame?.sourceManifestVersion
  );
}

export function eraseArgumentsForFrame(frame) {
  const eraseRects = frame?.eraseRects ?? [];
  if (!Array.isArray(eraseRects)) fail(`${frame?.frame || 'frame'} eraseRects must be an array`);
  const args = [];
  for (const rect of eraseRects) {
    const valid =
      ['x', 'y', 'w', 'h'].every((key) => Number.isInteger(rect?.[key])) &&
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.w >= 1 &&
      rect.h >= 1 &&
      rect.x + rect.w <= frame.crop.w &&
      rect.y + rect.h <= frame.crop.h;
    if (!valid) fail(`${frame.frame} has an invalid erase rectangle`);
    args.push(
      '-alpha',
      'on',
      '-channel',
      'A',
      '-fill',
      'black',
      '-draw',
      `rectangle ${rect.x},${rect.y} ${rect.x + rect.w - 1},${rect.y + rect.h - 1}`,
      '+channel',
    );
  }
  return args;
}

function validateApprovedSource(projectRoot, frame) {
  if (!SHA256.test(frame.sourceSha256) || frame.sourceSha256 !== frame.approvalSha256) {
    fail(`${frame.frame} does not lock one approved source hash`);
  }
  const manifestFile = portablePath(projectRoot, frame.manifestPath, `${frame.frame} manifestPath`);
  const sourceFile = portablePath(projectRoot, frame.sourcePath, `${frame.frame} sourcePath`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const approval = manifest?.approvals?.identity;
  const expectedSelectedPath = path.relative(path.dirname(manifestFile), sourceFile).replaceAll(path.sep, '/');
  if (manifest.asset_id !== frame.assetId) fail(`${frame.frame} asset ID mismatch`);
  if (!STATUSES_WITH_APPROVAL.has(manifest.status)) fail(`${frame.frame} identity is not approved`);
  if (approval?.sha256 !== frame.approvalSha256) fail(`${frame.frame} approval hash mismatch`);
  if (!approvalMatchesCurrentManifest(manifest, frame)) {
    fail(`${frame.frame} approval is stale for the current manifest version`);
  }
  if (approval?.selected_artifact_path !== expectedSelectedPath) {
    fail(`${frame.frame} approved artifact path mismatch`);
  }
  if (!fs.existsSync(sourceFile)) fail(`${frame.frame} approved source is missing`);
  if (hashFile(sourceFile) !== frame.sourceSha256) fail(`${frame.frame} approved source bytes changed`);
  for (const key of ['x', 'y', 'w', 'h']) {
    if (!Number.isInteger(frame.crop?.[key]) || frame.crop[key] < (key === 'w' || key === 'h' ? 1 : 0)) {
      fail(`${frame.frame} has an invalid crop`);
    }
  }
  for (const key of ['w', 'h']) {
    if (!Number.isInteger(frame.fit?.[key]) || frame.fit[key] < 1 || frame.fit[key] > 126) {
      fail(`${frame.frame} has an invalid fit box`);
    }
  }
  return sourceFile;
}

function makeCell(sourceFile, frame, outputFile, atlas) {
  const crop = `${frame.crop.w}x${frame.crop.h}+${frame.crop.x}+${frame.crop.y}`;
  const fit = `${frame.fit.w}x${frame.fit.h}>`;
  const contentHeight = atlas.cellHeight - atlas.paddingBottom;
  const eraseArgs = eraseArgumentsForFrame(frame);
  execFileSync(
    MAGICK,
    [
      sourceFile,
      '-crop',
      crop,
      '+repage',
      ...eraseArgs,
      '-trim',
      '+repage',
      '-filter',
      'Lanczos',
      '-resize',
      fit,
      '-gravity',
      'South',
      '-background',
      'none',
      '-extent',
      `${atlas.cellWidth}x${contentHeight}`,
      '-gravity',
      'North',
      '-extent',
      `${atlas.cellWidth}x${atlas.cellHeight}`,
      outputFile,
    ],
    { stdio: 'pipe' },
  );
  const dimensions = execFileSync(MAGICK, ['identify', '-format', '%wx%h', outputFile], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (dimensions !== '128x128') fail(`${frame.frame} produced ${dimensions}, expected 128x128`);
}

function targetMetadata(config, sourceManifestSha256) {
  const frames = Object.fromEntries(
    config.frames.map((source, index) => [
      source.frame,
      {
        rect: { x: index * 128, y: 0, w: 128, h: 128 },
        sourceSize: { w: 128, h: 128 },
        trimOffset: { x: 0, y: 0 },
        pivot: { x: 0.5, y: 1 },
        metrics: {
          silhouetteAt72: true,
          bossAt128: source.frame.startsWith('boss'),
          direction: 'right-to-left',
          identity: source.assetId,
        },
        provenance: {
          authority: 'gaf2d',
          assetId: source.assetId,
          approvalSha256: source.approvalSha256,
        },
      },
    ]),
  );
  return {
    frames,
    meta: {
      image: 'targets.webp',
      size: { w: 896, h: 128 },
      scale: 1,
      packId: 'valorant',
      grammar: 'gaf2d-static-v1',
      sourceManifest: 'gaf2d-sources.json',
      sourceManifestSha256,
      toolchain: config.toolchain,
    },
  };
}

export function buildGaf2dTargets({ gaf2dProject, packDir = defaultPackDir }) {
  const configFile = path.join(packDir, 'gaf2d-sources.json');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  validateConfig(config);
  validateToolchain(config);
  const sourceManifestSha256 = hashFile(configFile);
  const tempDir = fs.mkdtempSync(path.join(packDir, '.gaf2d-build-'));
  try {
    const cells = config.frames.map((frame, index) => {
      const sourceFile = validateApprovedSource(gaf2dProject, frame);
      const outputFile = path.join(tempDir, `${String(index).padStart(2, '0')}-${frame.frame}.png`);
      makeCell(sourceFile, frame, outputFile, config.atlas);
      return outputFile;
    });
    const atlasPng = path.join(tempDir, 'targets.png');
    const atlasWebp = path.join(tempDir, 'targets.webp');
    const atlasJson = path.join(tempDir, 'targets.json');
    execFileSync(MAGICK, [...cells, '+append', atlasPng], { stdio: 'pipe' });
    const dimensions = execFileSync(MAGICK, ['identify', '-format', '%wx%h', atlasPng], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (dimensions !== '896x128') fail(`atlas produced ${dimensions}, expected 896x128`);
    execFileSync(
      CWEBP,
      ['-quiet', '-q', '82', '-alpha_q', '90', '-m', '6', '-mt', atlasPng, '-o', atlasWebp],
      { stdio: 'pipe' },
    );
    fs.writeFileSync(atlasJson, stableJson(targetMetadata(config, sourceManifestSha256)));
    const targetsSha256 = hashFile(atlasWebp);
    const expectedHash = config.derivative?.targetsSha256;
    if (expectedHash && targetsSha256 !== expectedHash) {
      fail(`runtime WebP hash ${targetsSha256} does not match recorded ${expectedHash}`);
    }
    fs.renameSync(atlasWebp, path.join(packDir, 'targets.webp'));
    fs.renameSync(atlasJson, path.join(packDir, 'targets.json'));
    return {
      atlasBytes: fs.statSync(path.join(packDir, 'targets.webp')).size,
      frames: config.frames.length,
      sourceManifestSha256,
      targetDataSha256: hashFile(path.join(packDir, 'targets.json')),
      targetsSha256,
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const result = buildGaf2dTargets(options);
  if (options.json) console.log(JSON.stringify({ ok: true, data: result }));
  else console.log(`GAF2D TARGETS ${result.frames} frames ${result.atlasBytes} bytes ${result.targetsSha256}`);
}
