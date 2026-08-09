import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createPortableDerivativeTools } from './portable-derivative-tools.mjs';

import {
  buildGaf2dHero,
  HERO_CLIP_CONTRACT,
} from '../scripts/assets/build-gaf2d-hero.mjs';
import {
  validateApprovedHeroDescriptor,
  validateHeroSet,
} from '../js/hero-v3-contract.js';
import {
  canonicalJson,
  DERIVATIVE_TOOLCHAIN_SHA256,
  webpSize,
} from '../scripts/assets/build-gaf2d-motion.mjs';

let MAGICK = process.env.MAGICK || null;
let CWEBP = process.env.CWEBP || null;

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

function run(command, args) {
  execFileSync(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 8 * 1024 * 1024,
  });
}

function fixturePaths(root) {
  return {
    root,
    assetId: 'apn-hero',
    gaf2dProject: path.join(root, 'gaf2d-project'),
    releaseDir: path.join(
      root,
      'gaf2d-project',
      'assets',
      'apn-hero',
      'export',
      'release',
    ),
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
      manifest_path:
        'assets/apn-hero/export/release/manifest.json',
      files: manifest.files.map((record) => record.path),
      manifest_sha256: sha256File(manifestPath),
      file_hashes: Object.fromEntries(
        manifest.files.map((record) => [record.path, record.sha256]),
      ),
      dry_run: true,
    },
    error: null,
  };
  const json = JSON.stringify(response).replaceAll("'", "'\\''");
  fs.writeFileSync(
    fixture.gaf2dExecutable,
    `#!/bin/sh
if [ "$1" != "export" ] || [ "$2" != "apn-hero" ] || [ "$3" != "--project" ] || [ "$5" != "--dry-run" ] || [ "$6" != "--json" ]; then
  exit 9
fi
printf '%s\\n' '${json}'
`,
  );
  fs.chmodSync(fixture.gaf2dExecutable, 0o755);
}

function createHeroExport(root) {
  const fixture = fixturePaths(root);
  const scratch = path.join(root, 'scratch');
  fs.mkdirSync(fixture.releaseDir, { recursive: true });
  fs.mkdirSync(scratch, { recursive: true });
  const framePng = path.join(scratch, 'frame.png');
  run(MAGICK, [
    '-size',
    '2x2',
    'xc:none',
    '-fill',
    '#ff3154ff',
    '-draw',
    'point 0,1',
    `PNG32:${framePng}`,
  ]);
  const frameSha256 = sha256File(framePng);
  const clips = {};
  const candidateFrames = [];
  const reviewDurations = [];
  let sourceIndex = 0;
  let clipStart = 0;
  for (const clipName of HERO_CLIP_CONTRACT.clipNames) {
    const fps =
      clipName === 'hit'
        ? 16
        : ['attack', 'crit'].includes(clipName)
          ? 12
          : 8;
    const frameIds = Array.from(
      { length: HERO_CLIP_CONTRACT.frameCounts[clipName] },
      (_, index) => `${clipName}-${String(index).padStart(2, '0')}`,
    );
    clips[clipName] = {
      playback: HERO_CLIP_CONTRACT.playback[clipName],
      fps,
      frame_ids: frameIds,
    };
    for (let index = 0; index < frameIds.length; index += 1) {
      candidateFrames.push({
        frame_id: frameIds[index],
        source_index: sourceIndex,
        timestamp_seconds: clipStart + index / fps,
        duration_seconds: 1 / fps,
        path: `assets/apn-hero/work/motion/extracted/frames/${frameIds[index]}.png`,
        sha256: frameSha256,
      });
      reviewDurations.push(Math.round(1000 / fps));
      sourceIndex += 1;
    }
    clipStart += frameIds.length / fps + 1;
  }
  const candidate = {
    grammar: 'gaf2d-motion-set-v2',
    candidate_id: 'apn-hero-core',
    asset_id: 'apn-hero',
    source_manifest_version: 11,
    extraction_path:
      'assets/apn-hero/work/motion/extraction/frames.json',
    extraction_sha256: '1'.repeat(64),
    review_evidence_path:
      'assets/apn-hero/review/motion/review.webp',
    review_evidence_sha256: '2'.repeat(64),
    canvas_size: [2, 2],
    clips,
    clip_order: [...HERO_CLIP_CONTRACT.clipNames],
    frames: candidateFrames,
    review_frame_durations_milliseconds: reviewDurations,
  };
  const approval = {
    schema_version: 2,
    candidate,
    candidate_sha256: canonicalSha256(candidate),
    frames: candidateFrames.map((frame) => ({
      frame_id: frame.frame_id,
      path: `assets/apn-hero/approved/motion/frames/${frame.frame_id}.png`,
      sha256: frame.sha256,
    })),
    approver_label: 'synthetic-fixture-human',
    approved_at: '2026-07-28T00:00:00Z',
    review_evidence_path: candidate.review_evidence_path,
    review_evidence_sha256: candidate.review_evidence_sha256,
    review_html_path:
      'assets/apn-hero/review/motion/review.html',
    review_html_sha256: '3'.repeat(64),
    temporal_proof_path:
      'assets/apn-hero/review/motion/temporal-proof.json',
    temporal_proof_sha256: '4'.repeat(64),
  };
  const approvalRelative = 'motion/motion-set-approval.json';
  writeJson(
    path.join(fixture.releaseDir, approvalRelative),
    approval,
  );
  const approvalSha256 = sha256File(
    path.join(fixture.releaseDir, approvalRelative),
  );

  const identityRelative = 'identity/approved-identity.png';
  fs.mkdirSync(
    path.dirname(path.join(fixture.releaseDir, identityRelative)),
    { recursive: true },
  );
  fs.copyFileSync(
    framePng,
    path.join(fixture.releaseDir, identityRelative),
  );
  const identitySha256 = sha256File(
    path.join(fixture.releaseDir, identityRelative),
  );
  const rigRelative = 'rig/rig-manifest.json';
  writeJson(path.join(fixture.releaseDir, rigRelative), {
    schema_version: 1,
    asset_id: 'apn-hero',
    fixture: true,
  });
  const rigSha256 = sha256File(
    path.join(fixture.releaseDir, rigRelative),
  );

  const normalizationRelative = 'runtime/motion/normalization.json';
  const normalizationFrames = candidateFrames.map((frame) => {
    const outputPath = `frames/${frame.frame_id}.png`;
    const output = path.join(
      fixture.releaseDir,
      'runtime',
      'motion',
      outputPath,
    );
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(framePng, output);
    return {
      frame_id: frame.frame_id,
      source_sha256: frame.sha256,
      output_path: outputPath,
      output_sha256: frameSha256,
    };
  });
  writeJson(
    path.join(fixture.releaseDir, normalizationRelative),
    {
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
        used_body_masks: true,
      },
      body_measurement_excludes_detached_fx: true,
      scale_contract: 'body',
      frames: normalizationFrames,
    },
  );

  const atlasRelative = 'runtime/atlas/motion/motion.json';
  const atlasPngRelative = 'runtime/atlas/motion/motion.png';
  const atlasPng = path.join(fixture.releaseDir, atlasPngRelative);
  fs.mkdirSync(path.dirname(atlasPng), { recursive: true });
  run(MAGICK, [
    framePng,
    '-crop',
    '1x1+0+1',
    '+repage',
    `PNG32:${atlasPng}`,
  ]);
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
        source_sha256: frameSha256,
        approval_sha256: frameSha256,
        duplicate_of: index === 0 ? null : firstFrameId,
        scale_contract: 'body',
      },
    ]),
  );
  writeJson(path.join(fixture.releaseDir, atlasRelative), {
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
        sha256: sha256File(atlasPng),
      },
    },
    frames: atlasFrames,
    clips,
    clip_order: [...HERO_CLIP_CONTRACT.clipNames],
  });

  const runtimeRelatives = [
    normalizationRelative,
    ...normalizationFrames.map(
      (frame) => `runtime/motion/${frame.output_path}`,
    ),
    atlasRelative,
    atlasPngRelative,
  ].sort();
  const bindings = {
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
    rig: {
      approval_kind: 'rig',
      sha256: rigSha256,
      source_manifest_version: candidate.source_manifest_version,
    },
  };
  const lineageRelative = 'runtime/lineage.json';
  writeJson(path.join(fixture.releaseDir, lineageRelative), {
    schema_version: 1,
    asset_id: 'apn-hero',
    artifacts: runtimeRelatives
      .map((relative) => ({
        artifact_path:
          `assets/apn-hero/work/runtime/${relative.slice('runtime/'.length)}`,
        artifact_sha256: sha256File(
          path.join(fixture.releaseDir, relative),
        ),
        approvals: bindings,
      }))
      .sort((left, right) =>
        left.artifact_path.localeCompare(right.artifact_path),
      ),
  });
  const exportRelatives = [
    identityRelative,
    approvalRelative,
    rigRelative,
    ...runtimeRelatives,
    lineageRelative,
  ];
  writeJson(path.join(fixture.releaseDir, 'manifest.json'), {
    schema_version: 1,
    asset_id: 'apn-hero',
    configuration_hash: '5'.repeat(64),
    files: exportRelatives.map((relative) => ({
      path: relative,
      sha256: sha256File(path.join(fixture.releaseDir, relative)),
    })),
  });
  writeFakeGaf2d(fixture);
  fs.rmSync(scratch, { recursive: true });
  return {
    ...fixture,
    rigSha256,
    approvalRelative,
    lineageRelative,
  };
}

function cloneFixture(base, destination) {
  fs.cpSync(base.root, destination, { recursive: true });
  return fixturePaths(destination);
}

function editJson(fixture, relative, mutate) {
  const file = path.join(fixture.releaseDir, relative);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(value);
  writeJson(file, value);
}

function refreshManifest(fixture, { refreshDryRun = true } = {}) {
  const manifestPath = path.join(fixture.releaseDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const record of manifest.files) {
    record.sha256 = sha256File(path.join(fixture.releaseDir, record.path));
  }
  writeJson(manifestPath, manifest);
  if (refreshDryRun) writeFakeGaf2d(fixture);
}

function options(fixture, outputParent, overrides = {}) {
  return {
    gaf2dProject: fixture.gaf2dProject,
    outputDir: path.join(outputParent, 'v3'),
    gaf2dExecutable: fixture.gaf2dExecutable,
    magickPath: MAGICK,
    cwebpPath: CWEBP,
    ...overrides,
  };
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

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'apn-gaf2d-hero-'),
);
try {
  if (!MAGICK || !CWEBP) {
    const portableTools = createPortableDerivativeTools(temporaryRoot);
    MAGICK ||= portableTools.magick;
    CWEBP ||= portableTools.cwebp;
  }
  const fixture = createHeroExport(path.join(temporaryRoot, 'approved'));
  const first = buildGaf2dHero(
    options(fixture, path.join(temporaryRoot, 'build-a')),
  );
  const second = buildGaf2dHero(
    options(fixture, path.join(temporaryRoot, 'build-b')),
  );
  check(
    JSON.stringify(first.files) === JSON.stringify(second.files),
    'two clean Hero builds are byte-identical across all seventeen set files',
  );
  check(
    Object.keys(first.files).length === 17 &&
      first.outputDir.startsWith(temporaryRoot),
    'Hero QA publishes only to its temporary complete-set boundary',
  );
  const setText = fs.readFileSync(
    path.join(first.outputDir, 'set.json'),
    'utf8',
  );
  const set = JSON.parse(setText);
  check(
    setText === canonicalJson(set) &&
      validateHeroSet(set).length === 0,
    'approved Hero set is canonical and passes its closed-world validator',
  );
  check(
    set.status === 'approved' &&
      set.lineage.rigApprovalSha256 === fixture.rigSha256 &&
      set.toolchain.profileSha256 ===
        DERIVATIVE_TOOLCHAIN_SHA256,
    'Hero set binds exact identity, motion, rig, export, and compositor authority',
  );
  let everyClipValid = true;
  for (const clipName of HERO_CLIP_CONTRACT.clipNames) {
    const record = set.clips[clipName];
    const descriptorPath = path.join(first.outputDir, record.descriptor);
    const imagePath = path.join(first.outputDir, record.image);
    const descriptorText = fs.readFileSync(descriptorPath, 'utf8');
    const descriptor = JSON.parse(descriptorText);
    const imageBytes = fs.readFileSync(imagePath);
    const dimensions = webpSize(imageBytes);
    const rectKeys = descriptor.frames.map(
      (frame) =>
        `${frame.x},${frame.y},${frame.width},${frame.height}`,
    );
    everyClipValid &&=
      descriptorText === canonicalJson(descriptor) &&
      validateApprovedHeroDescriptor(
        descriptor,
        clipName,
        set,
      ).length === 0 &&
      sha256File(descriptorPath) === record.descriptorSha256 &&
      sha256File(imagePath) === record.imageSha256 &&
      dimensions.width === descriptor.atlas.width &&
      dimensions.height === descriptor.atlas.height &&
      new Set(rectKeys).size === rectKeys.length &&
      !Object.hasOwn(descriptor, 'presentation') &&
      !descriptorText.includes(fixture.gaf2dProject);
  }
  check(
    everyClipValid,
    'all eight production Hero clips preserve exact V1 keys, counts, cells, hashes, dimensions, and portable metadata',
  );
  check(
    first.webpBytes <= 640 * 1024,
    `all Hero WebP bytes fit the 640 KiB set budget (${first.webpBytes})`,
  );

  const stale = cloneFixture(
    fixture,
    path.join(temporaryRoot, 'negative-stale'),
  );
  editJson(stale, fixture.approvalRelative, (approval) => {
    approval.approver_label = 'stale-but-self-consistent';
  });
  refreshManifest(stale, { refreshDryRun: false });
  expectFailure(
    'Hero builder rejects a self-consistent release stale against live GAF dry-run',
    () =>
      buildGaf2dHero(
        options(stale, path.join(temporaryRoot, 'negative-stale-out')),
      ),
    'stale relative to the current GAF2D project',
  );

  const count = cloneFixture(
    fixture,
    path.join(temporaryRoot, 'negative-count'),
  );
  editJson(count, fixture.approvalRelative, (approval) => {
    approval.candidate.clips.attack.frame_ids.pop();
  });
  refreshManifest(count);
  expectFailure(
    'Hero builder rejects incomplete exact eight-clip acting authority',
    () =>
      buildGaf2dHero(
        options(count, path.join(temporaryRoot, 'negative-count-out')),
      ),
    'exactly 8 unique frames',
  );

  const noRig = cloneFixture(
    fixture,
    path.join(temporaryRoot, 'negative-rig'),
  );
  editJson(noRig, fixture.lineageRelative, (lineage) => {
    for (const artifact of lineage.artifacts) {
      delete artifact.approvals.rig;
    }
  });
  refreshManifest(noRig);
  expectFailure(
    'Hero builder rejects otherwise valid motion without current rig lineage',
    () =>
      buildGaf2dHero(
        options(noRig, path.join(temporaryRoot, 'negative-rig-out')),
      ),
    'requires current identity, motion, and rig',
  );

  const wrongVersion = path.join(temporaryRoot, 'wrong-cwebp');
  fs.writeFileSync(wrongVersion, '#!/bin/sh\necho 9.9.9\n');
  fs.chmodSync(wrongVersion, 0o755);
  expectFailure(
    'Hero builder rejects unrecorded encoder drift before staging',
    () =>
      buildGaf2dHero(
        options(fixture, path.join(temporaryRoot, 'negative-tool-out'), {
          cwebpPath: wrongVersion,
        }),
      ),
    'cwebp version must be exactly 1.6.0',
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true });
}

if (failures > 0) {
  console.error(`GAF2D HERO BUILD FAIL ${failures}`);
  process.exit(1);
}
console.log('GAF2D HERO BUILD PASS');
