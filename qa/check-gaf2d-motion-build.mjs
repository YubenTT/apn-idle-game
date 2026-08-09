import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildGaf2dMotion,
  canonicalJson,
  DERIVATIVE_TOOLCHAIN_SHA256,
  webpSize,
} from '../scripts/assets/build-gaf2d-motion.mjs';
import {
  validateMotionBundle,
  validateMotionClipDescriptor,
  validateMotionSetIndex,
} from '../js/motion-bundle.js';

let MAGICK = process.env.MAGICK || null;
let CWEBP = process.env.CWEBP || null;
const ACTUAL_V4_PROJECT = process.env.APN_GAF2D_PROJECT
  ? path.resolve(process.env.APN_GAF2D_PROJECT)
  : null;
const HAS_ACTUAL_V4_RELEASE = Boolean(
  ACTUAL_V4_PROJECT &&
    fs.existsSync(
      path.join(
        ACTUAL_V4_PROJECT,
        'assets/entry-runner/export/release/manifest.json',
      ),
    ),
);
const CLIPS = {
  idle: { playback: 'loop', fps: 8, count: 8 },
  advance: { playback: 'loop', fps: 10, count: 8 },
  engaged: { playback: 'loop', fps: 12, count: 6 },
  hit: { playback: 'progress', fps: 16, count: 4 },
  death: { playback: 'progress', fps: 8, count: 8 },
  broken: { playback: 'loop', fps: 8, count: 8 },
};

let failures = 0;
function check(condition, message) {
  if (condition) {
    console.log(`OK ${message}`);
  } else {
    console.error(`FAIL ${message}`);
    failures += 1;
  }
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function canonicalSha256(value) {
  const sort = (entry) => {
    if (Array.isArray(entry)) return entry.map(sort);
    if (entry && typeof entry === 'object') {
      return Object.fromEntries(
        Object.keys(entry)
          .sort()
          .map((key) => [key, sort(entry[key])]),
      );
    }
    return entry;
  };
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(sort(value)))
    .digest('hex');
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, canonicalJson(value));
}

function run(command, arguments_) {
  execFileSync(command, arguments_, {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 8 * 1024 * 1024,
  });
}

function createPortableDerivativeTools(root) {
  const magick = path.join(root, 'portable-magick.mjs');
  fs.writeFileSync(
    magick,
    `#!/usr/bin/env node
import fs from 'node:fs';

const arguments_ = process.argv.slice(2);
if (arguments_[0] === '-version') {
  console.log('Version: ImageMagick 7.1.2-13 Q16-HDRI portable-test');
  process.exit(0);
}
const dimensions = (value) => {
  const match = /^(\\d+)x(\\d+)/.exec(value || '');
  if (!match) throw new Error('portable ImageMagick fixture has no dimensions');
  return { width: Number(match[1]), height: Number(match[2]) };
};
let size;
if (arguments_[0] === 'montage') {
  const tile = dimensions(arguments_[arguments_.indexOf('-tile') + 1]);
  const cell = dimensions(arguments_[arguments_.indexOf('-geometry') + 1]);
  size = { width: tile.width * cell.width, height: tile.height * cell.height };
} else if (arguments_.includes('-crop')) {
  size = dimensions(arguments_[arguments_.indexOf('-crop') + 1]);
} else {
  size = dimensions(arguments_[arguments_.indexOf('-size') + 1]);
}
const output = arguments_.at(-1);
if (!output?.startsWith('PNG32:')) throw new Error('portable ImageMagick fixture output is invalid');
const png = Buffer.alloc(24);
Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png, 0);
png.writeUInt32BE(13, 8);
png.write('IHDR', 12, 'ascii');
png.writeUInt32BE(size.width, 16);
png.writeUInt32BE(size.height, 20);
fs.writeFileSync(output.slice('PNG32:'.length), png);
`,
  );
  fs.chmodSync(magick, 0o755);

  const cwebp = path.join(root, 'portable-cwebp.mjs');
  fs.writeFileSync(
    cwebp,
    `#!/usr/bin/env node
import fs from 'node:fs';

const arguments_ = process.argv.slice(2);
if (arguments_[0] === '-version') {
  console.log('1.6.0');
  process.exit(0);
}
const outputIndex = arguments_.indexOf('-o');
if (outputIndex < 1 || outputIndex + 1 >= arguments_.length) {
  throw new Error('portable cwebp fixture operands are invalid');
}
const png = fs.readFileSync(arguments_[outputIndex - 1]);
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
const webp = Buffer.alloc(30);
webp.write('RIFF', 0, 'ascii');
webp.writeUInt32LE(22, 4);
webp.write('WEBP', 8, 'ascii');
webp.write('VP8X', 12, 'ascii');
webp.writeUInt32LE(10, 16);
webp.writeUIntLE(width - 1, 24, 3);
webp.writeUIntLE(height - 1, 27, 3);
fs.writeFileSync(arguments_[outputIndex + 1], webp);
`,
  );
  fs.chmodSync(cwebp, 0o755);
  return { magick, cwebp };
}

function fixturePaths(root, assetId = 'entry-runner') {
  return {
    root,
    assetId,
    gaf2dProject: path.join(root, 'gaf2d-project'),
    releaseDir: path.join(
      root,
      'gaf2d-project',
      'assets',
      assetId,
      'export',
      'release',
    ),
    packFile: path.join(root, 'pack.json'),
    gaf2dExecutable: path.join(root, 'fake-gaf2d'),
  };
}

function writeFakeGaf2d(fixture) {
  const manifestPath = path.join(fixture.releaseDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const response = {
    ok: true,
    command: 'export',
    data: {
      asset_id: fixture.assetId,
      manifest_path: `assets/${fixture.assetId}/export/release/manifest.json`,
      files: manifest.files.map((record) => record.path),
      manifest_sha256: sha256File(manifestPath),
      file_hashes: Object.fromEntries(
        manifest.files.map((record) => [record.path, record.sha256]),
      ),
      dry_run: true,
    },
    error: null,
  };
  const rendered = JSON.stringify(response).replaceAll("'", "'\\''");
  fs.writeFileSync(
    fixture.gaf2dExecutable,
    `#!/bin/sh
if [ "$1" != "export" ] || [ "$2" != "${fixture.assetId}" ] || [ "$3" != "--project" ] || [ "$5" != "--dry-run" ] || [ "$6" != "--json" ]; then
  exit 9
fi
printf '%s\\n' '${rendered}'
`,
  );
  fs.chmodSync(fixture.gaf2dExecutable, 0o755);
}

function createApprovedExport(root, { assetId = 'entry-runner', boss = false } = {}) {
  const fixture = fixturePaths(root, assetId);
  const scratch = path.join(root, 'scratch');
  fs.mkdirSync(fixture.releaseDir, { recursive: true });
  fs.mkdirSync(scratch, { recursive: true });
  const normalizedPng = path.join(scratch, 'normalized.png');
  run(MAGICK, [
    '-size',
    '2x2',
    'xc:none',
    '-fill',
    '#ff3154ff',
    '-draw',
    'point 0,1',
    `PNG32:${normalizedPng}`,
  ]);
  const normalizedSha256 = sha256File(normalizedPng);
  const clipOrder = boss
    ? ['idle', 'advance', 'engaged', 'hit', 'death', 'broken']
    : ['idle', 'advance', 'engaged', 'hit', 'death'];
  const clips = {};
  const candidateFrames = [];
  const reviewDurations = [];
  let sourceIndex = 0;
  let clipStart = 0;
  for (const clipName of clipOrder) {
    const contract = CLIPS[clipName];
    const frameIds = Array.from(
      { length: contract.count },
      (_, index) => `${clipName}-${String(index).padStart(2, '0')}`,
    );
    clips[clipName] = {
      playback: contract.playback,
      fps: contract.fps,
      frame_ids: frameIds,
    };
    for (let index = 0; index < frameIds.length; index += 1) {
      candidateFrames.push({
        frame_id: frameIds[index],
        source_index: sourceIndex,
        timestamp_seconds: clipStart + index / contract.fps,
        duration_seconds: 1 / contract.fps,
        path: `assets/${assetId}/work/motion/extracted/frames/${frameIds[index]}.png`,
        sha256: normalizedSha256,
      });
      reviewDurations.push(Math.round(1000 / contract.fps));
      sourceIndex += 1;
    }
    clipStart += frameIds.length / contract.fps + 1;
  }
  const candidate = {
    grammar: 'gaf2d-motion-set-v2',
    candidate_id: `${assetId}-core`,
    asset_id: assetId,
    source_manifest_version: 7,
    extraction_path: `assets/${assetId}/work/motion/extraction/frames.json`,
    extraction_sha256: '1'.repeat(64),
    review_evidence_path: `assets/${assetId}/review/motion/review.webp`,
    review_evidence_sha256: '2'.repeat(64),
    canvas_size: [2, 2],
    clips,
    clip_order: clipOrder,
    frames: candidateFrames,
    review_frame_durations_milliseconds: reviewDurations,
  };
  const approval = {
    schema_version: 2,
    candidate,
    candidate_sha256: canonicalSha256(candidate),
    frames: candidateFrames.map((frame) => ({
      frame_id: frame.frame_id,
      path: `assets/${assetId}/approved/motion/frames/${frame.frame_id}.png`,
      sha256: frame.sha256,
    })),
    approver_label: 'synthetic-fixture-human',
    approved_at: '2026-07-28T00:00:00Z',
    review_evidence_path: candidate.review_evidence_path,
    review_evidence_sha256: candidate.review_evidence_sha256,
    review_html_path: `assets/${assetId}/review/motion/review.html`,
    review_html_sha256: '3'.repeat(64),
    temporal_proof_path: `assets/${assetId}/review/motion/temporal-proof.json`,
    temporal_proof_sha256: '4'.repeat(64),
  };
  const approvalRelative = 'motion/motion-set-approval.json';
  const approvalPath = path.join(fixture.releaseDir, approvalRelative);
  writeJson(approvalPath, approval);
  const approvalSha256 = sha256File(approvalPath);

  const identityRelative = 'identity/approved-identity.png';
  const identityPath = path.join(fixture.releaseDir, identityRelative);
  fs.mkdirSync(path.dirname(identityPath), { recursive: true });
  fs.copyFileSync(normalizedPng, identityPath);
  const identitySha256 = sha256File(identityPath);

  const normalizationRelative = 'runtime/motion/normalization.json';
  const normalizationFrames = candidateFrames.map((frame) => {
    const outputPath = `frames/${frame.frame_id}.png`;
    const exportedPath = path.join(
      fixture.releaseDir,
      'runtime',
      'motion',
      outputPath,
    );
    fs.mkdirSync(path.dirname(exportedPath), { recursive: true });
    fs.copyFileSync(normalizedPng, exportedPath);
    return {
      frame_id: frame.frame_id,
      source_sha256: frame.sha256,
      output_path: outputPath,
      output_sha256: normalizedSha256,
    };
  });
  const normalization = {
    schema_version: 1,
    approval_candidate_id: candidate.candidate_id,
    approval_candidate_sha256: approval.candidate_sha256,
    approved_frame_ids: candidateFrames.map((frame) => frame.frame_id),
    shared_transform: {
      source_size: [2, 2],
      target_size: [2, 2],
      scale: 1,
      source_anchor: [0.5, 1.5],
      target_anchor: [0.5, 1.5],
      used_body_masks: false,
    },
    body_measurement_excludes_detached_fx: false,
    scale_contract: 'body',
    frames: normalizationFrames,
  };
  writeJson(path.join(fixture.releaseDir, normalizationRelative), normalization);

  const atlasDirectory = path.join(
    fixture.releaseDir,
    'runtime',
    'atlas',
    'motion',
  );
  fs.mkdirSync(atlasDirectory, { recursive: true });
  const atlasPng = path.join(atlasDirectory, 'motion.png');
  run(MAGICK, [
    normalizedPng,
    '-crop',
    '1x1+0+1',
    '+repage',
    `PNG32:${atlasPng}`,
  ]);
  const atlasPageSha256 = sha256File(atlasPng);
  const firstFrameId = candidateFrames[0].frame_id;
  const atlasFrames = Object.fromEntries(
    candidateFrames.map((frame, index) => [
      frame.frame_id,
      {
        atlas_rect: { x: 0, y: 0, width: 1, height: 1 },
        source_size: { width: 2, height: 2 },
        sprite_source_rect: { x: 0, y: 1, width: 1, height: 1 },
        pivot_source: { x: 0.5, y: 1 },
        pivot_trimmed: { x: 0.5, y: 0 },
        source_sha256: normalizedSha256,
        approval_sha256: normalizedSha256,
        duplicate_of: index === 0 ? null : firstFrameId,
        scale_contract: 'body',
      },
    ]),
  );
  const atlas = {
    schema_version: 2,
    atlas: {
      name: 'motion',
      width: 1,
      height: 1,
      padding: 1,
      trim: true,
    },
    pages: {
      png: {
        file: 'motion.png',
        sha256: atlasPageSha256,
      },
    },
    frames: atlasFrames,
    clips,
    clip_order: clipOrder,
  };
  const atlasRelative = 'runtime/atlas/motion/motion.json';
  writeJson(path.join(fixture.releaseDir, atlasRelative), atlas);

  const runtimeRelatives = [
    normalizationRelative,
    ...normalizationFrames.map((frame) => `runtime/motion/${frame.output_path}`),
    atlasRelative,
    'runtime/atlas/motion/motion.png',
  ].sort();
  const approvals = {
    identity: {
      approval_kind: 'identity',
      sha256: identitySha256,
      source_manifest_version: candidate.source_manifest_version,
    },
    motion: {
      approval_kind: 'motion',
      sha256: approvalSha256,
      source_manifest_version: candidate.source_manifest_version,
    },
  };
  const lineage = {
    schema_version: 1,
    asset_id: assetId,
    artifacts: runtimeRelatives
      .map((relative) => {
        const suffix = relative.slice('runtime/'.length);
        return {
          artifact_path: `assets/${assetId}/work/runtime/${suffix}`,
          artifact_sha256: sha256File(path.join(fixture.releaseDir, relative)),
          approvals,
        };
      })
      .sort((left, right) => left.artifact_path.localeCompare(right.artifact_path)),
  };
  const lineageRelative = 'runtime/lineage.json';
  writeJson(path.join(fixture.releaseDir, lineageRelative), lineage);

  const exportRelatives = [
    identityRelative,
    approvalRelative,
    ...runtimeRelatives,
    lineageRelative,
  ];
  const exportManifest = {
    schema_version: 1,
    asset_id: assetId,
    configuration_hash: '5'.repeat(64),
    files: exportRelatives.map((relative) => ({
      path: relative,
      sha256: sha256File(path.join(fixture.releaseDir, relative)),
    })),
  };
  writeJson(path.join(fixture.releaseDir, 'manifest.json'), exportManifest);
  writeFakeGaf2d(fixture);
  writeJson(fixture.packFile, {
    id: 'valorant',
    targets: [{ id: boss ? 'entry-runner' : assetId }],
    boss: { id: boss ? assetId : 'site-warden' },
  });
  fs.rmSync(scratch, { recursive: true });
  return {
    ...fixture,
    approvalRelative,
    normalizationRelative,
    atlasRelative,
    lineageRelative,
    normalizedSha256,
    identitySha256,
    approvalSha256,
  };
}

function cloneFixture(base, destination) {
  fs.cpSync(base.root, destination, { recursive: true });
  return fixturePaths(destination, base.assetId);
}

function editJson(fixture, relative, mutate) {
  const file = path.join(fixture.releaseDir, relative);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(value);
  writeJson(file, value);
}

function refreshExportManifest(fixture, { refreshDryRun = true } = {}) {
  const manifestPath = path.join(fixture.releaseDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const record of manifest.files) {
    record.sha256 = sha256File(path.join(fixture.releaseDir, record.path));
  }
  writeJson(manifestPath, manifest);
  if (refreshDryRun) writeFakeGaf2d(fixture);
}

function buildOptions(fixture, outputParent, overrides = {}) {
  return {
    gaf2dProject: fixture.gaf2dProject,
    assetId: fixture.assetId,
    packFile: fixture.packFile,
    outputDir: path.join(outputParent, fixture.assetId),
    magickPath: MAGICK,
    cwebpPath: CWEBP,
    gaf2dExecutable: fixture.gaf2dExecutable,
    ...overrides,
  };
}

function createActualV4ExportFixture(root, assetId, { boss = false } = {}) {
  const fixture = fixturePaths(root, assetId);
  const sourceProject = ACTUAL_V4_PROJECT;
  assert(
    sourceProject,
    'APN_GAF2D_PROJECT is required for the optional actual-release integration lane',
  );
  const sourceReleaseDir = path.join(
    sourceProject,
    'assets',
    assetId,
    'export',
    'release',
  );
  fs.mkdirSync(fixture.gaf2dProject, { recursive: true });
  fs.mkdirSync(path.dirname(fixture.releaseDir), { recursive: true });
  fs.cpSync(sourceReleaseDir, fixture.releaseDir, { recursive: true });
  const approval = JSON.parse(
    fs.readFileSync(
      path.join(sourceReleaseDir, 'motion', 'motion-set-approval-v4.json'),
      'utf8',
    ),
  );
  const semantic = approval.candidate.semantic_authority;
  const batch = JSON.parse(
    fs.readFileSync(path.join(sourceProject, semantic.batch_summary.path), 'utf8'),
  );
  const batchAsset = batch.assets.find((entry) => entry.asset_id === assetId);
  const batchBase = path.posix.dirname(semantic.batch_summary.path);
  const requiredProjectFiles = [
    semantic.batch_summary.path,
    semantic.candidate_document.path,
    semantic.temporal_evidence.path,
    path.posix.join(batchBase, batchAsset.clip_manifest_path),
    path.posix.join(batchBase, batchAsset.qa_summary_path),
  ];
  for (const relative of requiredProjectFiles) {
    const source = path.join(sourceProject, relative);
    const destination = path.join(fixture.gaf2dProject, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  writeFakeGaf2d(fixture);
  writeJson(fixture.packFile, {
    id: 'valorant',
    targets: [{ id: boss ? 'entry-runner' : assetId }],
    boss: { id: boss ? assetId : 'site-warden' },
  });
  return fixture;
}

function manifestSubsetByPrefix(fixture, prefixes) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(fixture.releaseDir, 'manifest.json'), 'utf8'),
  );
  return manifest.files
    .filter((record) =>
      prefixes.some((prefix) => record.path.startsWith(prefix)),
    )
    .map((record) => [record.path, record.sha256]);
}

function expectFailure(message, action, needle) {
  try {
    action();
    check(false, `${message} (unexpected success)`);
  } catch (error) {
    check(
      String(error?.message || error).includes(needle),
      `${message} (${String(error?.message || error)})`,
    );
  }
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-gaf2d-motion-'));
try {
  if (!MAGICK || !CWEBP) {
    const portableTools = createPortableDerivativeTools(temporaryRoot);
    MAGICK ||= portableTools.magick;
    CWEBP ||= portableTools.cwebp;
  }
  const common = createApprovedExport(path.join(temporaryRoot, 'common'));
  const first = buildGaf2dMotion(
    buildOptions(common, path.join(temporaryRoot, 'build-a')),
  );
  const second = buildGaf2dMotion(
    buildOptions(common, path.join(temporaryRoot, 'build-b')),
  );
  check(
    first.files['motion.json'] === second.files['motion.json'] &&
      first.files['motion.webp'] === second.files['motion.webp'],
    'same approved export produces byte-identical JSON and WebP in two clean builds',
  );
  const descriptorPath = path.join(first.outputDir, 'motion.json');
  const descriptorText = fs.readFileSync(descriptorPath, 'utf8');
  const descriptor = JSON.parse(descriptorText);
  check(
    descriptorText === canonicalJson(descriptor),
    'builder emits recursively key-sorted canonical JSON',
  );
  check(
    validateMotionBundle(descriptor, common.assetId).length === 0,
    'derived common descriptor passes the production runtime validator',
  );
  const physicalFrames = Object.values(descriptor.clips).flatMap(
    (clip) => clip.frames,
  );
  check(
    physicalFrames.length === 34 &&
      new Set(
        physicalFrames.map(
          (frame) =>
            `${frame.x},${frame.y},${frame.width},${frame.height}`,
        ),
      ).size === 34,
    'all 34 logical frames receive distinct physical cells despite GAF aliases',
  );
  const webpBytes = fs.readFileSync(path.join(first.outputDir, 'motion.webp'));
  check(
    webpSize(webpBytes).width === descriptor.atlas.width &&
      webpSize(webpBytes).height === descriptor.atlas.height,
    'emitted WebP header dimensions equal the descriptor',
  );
  check(
    fs.readdirSync(first.outputDir).sort().join('|') ===
      'motion.json|motion.webp',
    'published bundle contains only portable runtime derivatives',
  );
  check(
    !descriptorText.includes(common.gaf2dProject) &&
      descriptor.encoder.arguments.join('|') === '-exact|-q|90' &&
      descriptor.encoder.version === '1.6.0' &&
      descriptor.lineage.derivativeToolchainSha256 ===
        DERIVATIVE_TOOLCHAIN_SHA256,
    'descriptor stores no local operands and locks cwebp plus the exact compositor profile',
  );

  const boss = createApprovedExport(path.join(temporaryRoot, 'boss'), {
    assetId: 'site-warden',
    boss: true,
  });
  const bossResult = buildGaf2dMotion(
    buildOptions(boss, path.join(temporaryRoot, 'build-boss')),
  );
  const bossDescriptor = JSON.parse(
    fs.readFileSync(path.join(bossResult.outputDir, 'motion.json'), 'utf8'),
  );
  check(
    bossResult.role === 'boss' &&
      bossDescriptor.clips.broken.frames.length === 8 &&
      validateMotionBundle(bossDescriptor, boss.assetId, { role: 'boss' })
        .length === 0,
    'trusted pack boss role requires and admits the eight-frame broken clip',
  );

  if (HAS_ACTUAL_V4_RELEASE) {
    const actualV4 = createActualV4ExportFixture(
      path.join(temporaryRoot, 'actual-v4-common'),
      'entry-runner',
    );
    const actualV4First = buildGaf2dMotion(
      buildOptions(actualV4, path.join(temporaryRoot, 'actual-v4-build-a'), {
        cwebpPath: '/nonexistent-copy-only-cwebp',
        magickPath: '/nonexistent-copy-only-magick',
      }),
    );
    const actualV4Second = buildGaf2dMotion(
      buildOptions(actualV4, path.join(temporaryRoot, 'actual-v4-build-b'), {
        cwebpPath: '/nonexistent-copy-only-cwebp',
        magickPath: '/nonexistent-copy-only-magick',
      }),
    );
    const expectedActualV4 = manifestSubsetByPrefix(actualV4, [
      'runtime/atlas/v4/clips/',
    ]);
    const actualV4Set = JSON.parse(
      fs.readFileSync(path.join(actualV4First.outputDir, 'set.json'), 'utf8'),
    );
    check(
      actualV4First.files['set.json'] === actualV4Second.files['set.json'] &&
        actualV4Set.authority === 'approved_release' &&
        actualV4Set.status === 'approved' &&
        validateMotionSetIndex(actualV4Set, 'entry-runner', {
          role: 'character',
          consumerRole: 'standard',
          selectedProfileSha256: actualV4Set.toolchain.profileSha256,
        }).length === 0,
      'real V4 release projects a deterministic approved runtime set',
    );
    check(
      !Object.hasOwn(actualV4First.files, 'motion.json') &&
        !Object.hasOwn(actualV4First.files, 'motion.webp') &&
        !Object.keys(actualV4First.files).some((file) =>
          file.startsWith('runtime/atlas/v4/'),
        ),
      'real V4 promotion does not substitute a legacy bundle or expose raw release layout',
    );
    check(
      Object.keys(actualV4First.files).sort().join('|') ===
        'advance.json|advance.webp|death.json|death.webp|engaged.json|engaged.webp|hit.json|hit.webp|idle.json|idle.webp|set.json',
      'real V4 promotion publishes only runtime set plus selected clip descriptors and WebPs',
    );
    check(
      expectedActualV4.every(([relative, sha]) => {
        if (!relative.endsWith('lossless.webp')) {
          return true;
        }
        const clipName = relative.split('/')[4];
        return actualV4First.files[`${clipName}.webp`] === sha;
      }),
      'real V4 promotion keeps exact clip WebP bytes from the approved release',
    );
    for (const clipName of ['idle', 'advance', 'engaged', 'hit', 'death']) {
      const descriptor = JSON.parse(
        fs.readFileSync(
          path.join(actualV4First.outputDir, `${clipName}.json`),
          'utf8',
        ),
      );
      check(
        descriptor.authority === 'approved_release' &&
          descriptor.status === 'approved' &&
          validateMotionClipDescriptor(descriptor, clipName, actualV4Set, {
            role: 'character',
            consumerRole: 'standard',
            descriptorSha256: actualV4Set.clips[clipName].descriptorSha256,
            imageSha256: actualV4Set.clips[clipName].imageSha256,
            selectedProfileSha256: actualV4Set.toolchain.profileSha256,
          }).length === 0,
        `${clipName} V4 clip descriptor projects as an approved runtime descriptor`,
      );
    }
  } else {
    check(
      true,
      'actual V4 release integration lane is optional without APN_GAF2D_PROJECT',
    );
  }

  const heroPackFile = path.join(temporaryRoot, 'hero-v4-pack.json');
  writeJson(heroPackFile, {
    id: 'valorant',
    targets: [{ id: 'apn-hero' }],
    boss: { id: 'site-warden' },
  });
  const missingHeroProject = path.join(
    temporaryRoot,
    'missing-hero-gaf2d-project',
  );
  fs.mkdirSync(missingHeroProject, { recursive: true });
  expectFailure(
    'Hero without a current export release fails closed instead of substituting preview or V3 bytes',
    () =>
      buildGaf2dMotion({
        gaf2dProject: missingHeroProject,
        assetId: 'apn-hero',
        packFile: heroPackFile,
        outputDir: path.join(temporaryRoot, 'hero-v4-build', 'apn-hero'),
      }),
    'export/release directory is missing or unsafe',
  );

  if (HAS_ACTUAL_V4_RELEASE) {
    const tamperedV4 = createActualV4ExportFixture(
      path.join(temporaryRoot, 'actual-v4-tampered'),
      'entry-runner',
    );
    editJson(tamperedV4, 'runtime/atlas/v4/derivative-set.json', (set) => {
      set.clips[0].descriptor_sha256 = '0'.repeat(64);
    });
    refreshExportManifest(tamperedV4);
    expectFailure(
      'tampered V4 derivative-set descriptor binding is rejected before publication',
      () =>
        buildGaf2dMotion(
          buildOptions(
            tamperedV4,
            path.join(temporaryRoot, 'actual-v4-tampered-out'),
            {
              cwebpPath: '/nonexistent-copy-only-cwebp',
              magickPath: '/nonexistent-copy-only-magick',
            },
          ),
        ),
      'visual-fidelity',
    );
  }

  const staleRelease = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-stale-release'),
  );
  editJson(
    staleRelease,
    'motion/motion-set-approval.json',
    (approval) => {
      approval.approver_label = 'self-consistent-but-not-current';
    },
  );
  refreshExportManifest(staleRelease, { refreshDryRun: false });
  expectFailure(
    'self-consistent stale release is rejected against the live GAF2D export dry-run',
    () =>
      buildGaf2dMotion(
        buildOptions(
          staleRelease,
          path.join(temporaryRoot, 'negative-stale-release-out'),
        ),
      ),
    'stale relative to the current GAF2D project',
  );

  const v1 = cloneFixture(common, path.join(temporaryRoot, 'negative-v1'));
  editJson(v1, 'motion/motion-set-approval.json', (approval) => {
    approval.schema_version = 1;
    approval.candidate.grammar = 'gaf2d-motion-set-v1';
  });
  refreshExportManifest(v1);
  expectFailure(
    'readable legacy V1 approval is rejected with an explicit renewal requirement',
    () =>
      buildGaf2dMotion(
        buildOptions(v1, path.join(temporaryRoot, 'negative-v1-out')),
      ),
    'renewal as v2 is required',
  );

  const missing = cloneFixture(common, path.join(temporaryRoot, 'negative-missing'));
  editJson(missing, 'motion/motion-set-approval.json', (approval) => {
    delete approval.candidate.clips.engaged;
  });
  refreshExportManifest(missing);
  expectFailure(
    'incomplete required clip membership is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(missing, path.join(temporaryRoot, 'negative-missing-out')),
      ),
    'motion-set clips must be exactly',
  );

  const playback = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-playback'),
  );
  editJson(playback, 'motion/motion-set-approval.json', (approval) => {
    approval.candidate.clips.hit.playback = 'loop';
  });
  refreshExportManifest(playback);
  expectFailure(
    'wrong progress/loop playback is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(
          playback,
          path.join(temporaryRoot, 'negative-playback-out'),
        ),
      ),
    'playback must be progress',
  );

  const count = cloneFixture(common, path.join(temporaryRoot, 'negative-count'));
  editJson(count, 'motion/motion-set-approval.json', (approval) => {
    approval.candidate.clips.idle.frame_ids.pop();
  });
  refreshExportManifest(count);
  expectFailure(
    'wrong exact frame count is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(count, path.join(temporaryRoot, 'negative-count-out')),
      ),
    'exactly 8 unique frames',
  );

  const floatFps = cloneFixture(common, path.join(temporaryRoot, 'negative-fps'));
  editJson(floatFps, 'motion/motion-set-approval.json', (approval) => {
    approval.candidate.clips.idle.fps = 8.5;
  });
  refreshExportManifest(floatFps);
  expectFailure(
    'non-integer FPS is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(floatFps, path.join(temporaryRoot, 'negative-fps-out')),
      ),
    'FPS must be an integer',
  );

  const variable = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-variable'),
  );
  editJson(variable, 'motion/motion-set-approval.json', (approval) => {
    approval.candidate.frames[0].duration_seconds = 0.2;
  });
  refreshExportManifest(variable);
  expectFailure(
    'variable source timing is rejected instead of silently discarded',
    () =>
      buildGaf2dMotion(
        buildOptions(
          variable,
          path.join(temporaryRoot, 'negative-variable-out'),
        ),
      ),
    'variable-rate frame duration',
  );

  const portable = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-portable'),
  );
  editJson(portable, 'motion/motion-set-approval.json', (approval) => {
    approval.frames[0].path = '/private/source.png';
  });
  refreshExportManifest(portable);
  expectFailure(
    'machine-local approval paths are rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(
          portable,
          path.join(temporaryRoot, 'negative-portable-out'),
        ),
      ),
    'canonical portable relative path',
  );

  const mixed = cloneFixture(common, path.join(temporaryRoot, 'negative-mixed'));
  editJson(mixed, 'runtime/atlas/motion/motion.json', (atlas) => {
    atlas.frames['advance-00'].pivot_source.x = 1;
    atlas.frames['advance-00'].pivot_trimmed.x = 1;
  });
  refreshExportManifest(mixed);
  expectFailure(
    'mixed per-frame pivot is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(mixed, path.join(temporaryRoot, 'negative-mixed-out')),
      ),
    'mixed pivot',
  );

  const shiftedPivot = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-shifted-pivot'),
  );
  editJson(shiftedPivot, 'runtime/atlas/motion/motion.json', (atlas) => {
    for (const frame of Object.values(atlas.frames)) {
      frame.pivot_source.x = 1;
      frame.pivot_trimmed.x = 1;
    }
  });
  refreshExportManifest(shiftedPivot);
  expectFailure(
    'uniform but stale pivot is rejected against the exact shared transform',
    () =>
      buildGaf2dMotion(
        buildOptions(
          shiftedPivot,
          path.join(temporaryRoot, 'negative-shifted-pivot-out'),
        ),
      ),
    'exact shared normalization transform',
  );

  const overlap = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-overlap'),
  );
  editJson(overlap, 'runtime/atlas/motion/motion.json', (atlas) => {
    atlas.frames['idle-01'].duplicate_of = null;
  });
  refreshExportManifest(overlap);
  expectFailure(
    'unapproved GAF atlas overlap is rejected while declared aliases remain expandable',
    () =>
      buildGaf2dMotion(
        buildOptions(
          overlap,
          path.join(temporaryRoot, 'negative-overlap-out'),
        ),
      ),
    'overlap without one canonical alias',
  );

  const oversized = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-oversized'),
  );
  editJson(oversized, 'runtime/atlas/motion/motion.json', (atlas) => {
    atlas.atlas.width = 4096;
  });
  refreshExportManifest(oversized);
  expectFailure(
    'oversized GAF atlas is rejected before derivation',
    () =>
      buildGaf2dMotion(
        buildOptions(
          oversized,
          path.join(temporaryRoot, 'negative-oversized-out'),
        ),
      ),
    'invalid or oversized',
  );

  const identity = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-identity'),
  );
  editJson(identity, 'runtime/lineage.json', (lineage) => {
    for (const artifact of lineage.artifacts) {
      artifact.approvals.identity.sha256 = '6'.repeat(64);
    }
  });
  refreshExportManifest(identity);
  expectFailure(
    'identity approval binding absent from the current export is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(
          identity,
          path.join(temporaryRoot, 'negative-identity-out'),
        ),
      ),
    'identity approval hash is not present',
  );

  const motion = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-motion'),
  );
  editJson(motion, 'runtime/lineage.json', (lineage) => {
    for (const artifact of lineage.artifacts) {
      artifact.approvals.motion.sha256 = '7'.repeat(64);
    }
  });
  refreshExportManifest(motion);
  expectFailure(
    'stale runtime motion approval binding is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(
          motion,
          path.join(temporaryRoot, 'negative-motion-out'),
        ),
      ),
    'does not match the exported motion-set approval',
  );

  const rig = cloneFixture(common, path.join(temporaryRoot, 'negative-rig'));
  editJson(rig, 'runtime/lineage.json', (lineage) => {
    for (const artifact of lineage.artifacts) {
      artifact.approvals.rig = {
        approval_kind: 'rig',
        sha256: '8'.repeat(64),
        source_manifest_version: 7,
      };
    }
  });
  refreshExportManifest(rig);
  expectFailure(
    'declared rig approval binding absent from the current export is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(rig, path.join(temporaryRoot, 'negative-rig-out')),
      ),
    'rig approval hash is not present',
  );

  const changed = cloneFixture(
    common,
    path.join(temporaryRoot, 'negative-changed'),
  );
  fs.writeFileSync(
    path.join(
      changed.releaseDir,
      'runtime/motion/frames/idle-00.png',
    ),
    Buffer.from('changed'),
  );
  expectFailure(
    'changed normalized source bytes are rejected by the export hash lock',
    () =>
      buildGaf2dMotion(
        buildOptions(
          changed,
          path.join(temporaryRoot, 'negative-changed-out'),
        ),
      ),
    'stale hash',
  );

  expectFailure(
    'unsafe or nondeterministic cwebp arguments cannot be supplied',
    () =>
      buildGaf2dMotion(
        buildOptions(common, path.join(temporaryRoot, 'negative-args-out'), {
          encoderArguments: ['-exact', '-q', '90', '-mt'],
        }),
      ),
    'encoder arguments must be exactly',
  );

  const wrongVersion = path.join(temporaryRoot, 'wrong-version-cwebp');
  fs.writeFileSync(wrongVersion, '#!/bin/sh\necho 0.0.0\n');
  fs.chmodSync(wrongVersion, 0o755);
  expectFailure(
    'unknown cwebp tool version is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(
          common,
          path.join(temporaryRoot, 'negative-version-out'),
          { cwebpPath: wrongVersion },
        ),
      ),
    'cwebp version must be exactly 1.6.0',
  );

  const wrongMagick = path.join(temporaryRoot, 'wrong-version-magick');
  fs.writeFileSync(
    wrongMagick,
    '#!/bin/sh\necho "Version: ImageMagick 7.9.9 Q16-HDRI test"\n',
  );
  fs.chmodSync(wrongMagick, 0o755);
  expectFailure(
    'unrecorded ImageMagick version drift is rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(
          common,
          path.join(temporaryRoot, 'negative-magick-version-out'),
          { magickPath: wrongMagick },
        ),
      ),
    'ImageMagick version must be exactly 7.1.2-13',
  );

  const wrongWebpSource = path.join(temporaryRoot, 'wrong-size.png');
  run(MAGICK, ['-size', '2x2', 'xc:#ff3154ff', `PNG32:${wrongWebpSource}`]);
  const wrongWebp = path.join(temporaryRoot, 'wrong-size.webp');
  run(CWEBP, ['-exact', '-q', '90', wrongWebpSource, '-o', wrongWebp]);
  const fakeCwebp = path.join(temporaryRoot, 'wrong-size-cwebp');
  const quotedWrongWebp = wrongWebp.replaceAll("'", "'\\''");
  fs.writeFileSync(
    fakeCwebp,
    `#!/bin/sh
if [ "$1" = "-version" ]; then
  echo 1.6.0
  exit 0
fi
while [ "$#" -gt 0 ]; do
  if [ "$1" = "-o" ]; then
    shift
    cp '${quotedWrongWebp}' "$1"
    exit 0
  fi
  shift
done
exit 1
`,
  );
  fs.chmodSync(fakeCwebp, 0o755);
  const preservedOutput = path.join(
    temporaryRoot,
    'atomic-output',
    common.assetId,
  );
  fs.mkdirSync(preservedOutput, { recursive: true });
  fs.writeFileSync(path.join(preservedOutput, 'keep.txt'), 'previous-release\n');
  expectFailure(
    'WebP/descriptor dimension mismatch fails before publication',
    () =>
      buildGaf2dMotion(
        buildOptions(common, path.dirname(preservedOutput), {
          outputDir: preservedOutput,
          cwebpPath: fakeCwebp,
        }),
      ),
    'intrinsic dimensions do not match',
  );
  check(
    fs.readFileSync(path.join(preservedOutput, 'keep.txt'), 'utf8') ===
      'previous-release\n',
    'failed derivation preserves the complete previous character directory',
  );

  const cleanupParent = path.join(temporaryRoot, 'cleanup-warning');
  const cleanupOutput = path.join(cleanupParent, common.assetId);
  fs.mkdirSync(cleanupOutput, { recursive: true });
  fs.writeFileSync(path.join(cleanupOutput, 'old.txt'), 'previous\n');
  const originalRmSync = fs.rmSync;
  fs.rmSync = (target, options) => {
    if (
      path.dirname(String(target)) === cleanupParent &&
      String(target).endsWith('.backup')
    ) {
      throw new Error('injected backup cleanup failure');
    }
    return originalRmSync(target, options);
  };
  let cleanupResult;
  try {
    cleanupResult = buildGaf2dMotion(
      buildOptions(common, cleanupParent),
    );
  } finally {
    fs.rmSync = originalRmSync;
  }
  check(
    cleanupResult.warnings.length === 1 &&
      fs.readdirSync(cleanupOutput).sort().join('|') ===
        'motion.json|motion.webp',
    'post-publish backup cleanup failure reports a warning without false build failure',
  );
  for (const entry of fs.readdirSync(cleanupParent)) {
    if (entry.endsWith('.backup')) {
      fs.rmSync(path.join(cleanupParent, entry), { recursive: true });
    }
  }

  const extra = cloneFixture(common, path.join(temporaryRoot, 'negative-extra'));
  fs.writeFileSync(path.join(extra.releaseDir, 'unlisted.txt'), 'unexpected\n');
  expectFailure(
    'unlisted export artifacts are rejected',
    () =>
      buildGaf2dMotion(
        buildOptions(extra, path.join(temporaryRoot, 'negative-extra-out')),
      ),
    'unlisted or missing files',
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true });
}

if (failures > 0) {
  console.error(`GAF2D MOTION BUILD FAIL ${failures}`);
  process.exit(1);
}
console.log('GAF2D MOTION BUILD PASS');
