import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildGaf2dPreview } from '../scripts/assets/build-gaf2d-preview.mjs';

const ASSETS = [
  {
    assetId: 'apn-hero',
    manifestVersion: 2,
    clips: [
      ['idle', 8, 'loop', 12],
      ['run', 10, 'loop', 16],
      ['attack', 8, 'progress', 16],
      ['crit', 8, 'progress', 16],
      ['sprint', 10, 'loop', 20],
      ['hit', 4, 'progress', 16],
      ['death', 8, 'progress', 16],
      ['celebrate', 8, 'loop', 16],
    ],
  },
  {
    assetId: 'entry-runner',
    manifestVersion: 3,
    clips: creatureClips(),
  },
  {
    assetId: 'protocol-courier',
    manifestVersion: 3,
    clips: creatureClips(),
  },
  {
    assetId: 'signal-hunter',
    manifestVersion: 3,
    clips: creatureClips(),
  },
  {
    assetId: 'site-sentinel',
    manifestVersion: 3,
    clips: creatureClips(),
  },
  {
    assetId: 'site-warden',
    manifestVersion: 3,
    clips: [...creatureClips(), ['broken', 8, 'loop', 8]],
  },
  {
    assetId: 'veil-operator',
    manifestVersion: 3,
    clips: creatureClips(),
  },
];

function creatureClips() {
  return [
    ['idle', 8, 'loop', 8],
    ['advance', 8, 'loop', 10],
    ['engaged', 6, 'loop', 12],
    ['hit', 4, 'progress', 16],
    ['death', 8, 'progress', 8],
  ];
}

const sha256 = (bytes) =>
  crypto.createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const assert = (condition, message) => {
  if (!condition) throw new Error(`GAF2D preview build: ${message}`);
  console.log(`OK ${message}`);
};
const boundsInsideTrim = (bounds, trim) =>
  Number.isInteger(bounds?.x) &&
  bounds.x >= 0 &&
  Number.isInteger(bounds?.y) &&
  bounds.y >= 0 &&
  Number.isInteger(bounds?.width) &&
  bounds.width > 0 &&
  Number.isInteger(bounds?.height) &&
  bounds.height > 0 &&
  bounds.x + bounds.width <= trim.width &&
  bounds.y + bounds.height <= trim.height;
const write = (root, relative, bytes) => {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  return { relative, sha256: sha256(bytes) };
};

function createSource(root) {
  const batchAssets = [];
  for (const spec of ASSETS) {
    const candidateId = `${spec.assetId}-authored-semantic-v2`;
    const clipOrder = spec.clips.map(([name]) => name);
    const clips = {};
    const frames = [];
    let sourceIndex = 0;
    for (const [name, count, playback, fps] of spec.clips) {
      const frameIds = Array.from(
        { length: count },
        (_, index) => `${name}-${String(index).padStart(3, '0')}`,
      );
      clips[name] = {
        fps,
        frame_ids: frameIds,
        playback,
      };
      for (const frameId of frameIds) {
        const bytes = Buffer.from(`synthetic-frame:${spec.assetId}:${frameId}`);
        write(
          root,
          `motion/authored-semantic-v2/${spec.assetId}/frames/${frameId}.png`,
          bytes,
        );
        frames.push({
          duration_seconds: 1 / fps,
          frame_id: frameId,
          path: `assets/${spec.assetId}/work/motion/extracted/frames/${frameId}.png`,
          sha256: sha256(bytes),
          source_index: sourceIndex,
          timestamp_seconds: sourceIndex / fps,
        });
        sourceIndex += 1;
      }
    }

    const candidate = {
      asset_id: spec.assetId,
      candidate_id: candidateId,
      canvas_size: [640, 640],
      clip_order: clipOrder,
      clips,
      extraction_path: `assets/${spec.assetId}/work/motion/extraction.json`,
      extraction_sha256: 'e'.repeat(64),
      frames,
      grammar: 'gaf2d-motion-set-v2',
      review_evidence_path:
        `assets/${spec.assetId}/review/motion-set/${candidateId}/review-evidence.json`,
      review_evidence_sha256: '',
      review_frame_durations_milliseconds: frames.map(
        (frame) => Math.round(frame.duration_seconds * 1000),
      ),
      source_manifest_version: spec.manifestVersion,
    };
    const reviewHtmlPath =
      `assets/${spec.assetId}/review/motion-set/${candidateId}/review.html`;
    const reviewHtml = write(
      root,
      reviewHtmlPath,
      Buffer.from(`<html><body>${candidateId}</body></html>\n`),
    );
    const reviewEvidence = {
      asset_id: spec.assetId,
      candidate: { path: frames[0].path },
      destination_path: reviewHtmlPath,
      diagnostics: {
        clip_count: spec.clips.length,
        frame_count: frames.length,
        motion_set_id: candidateId,
      },
      reject_reasons: [],
      schema_version: 1,
    };
    const reviewEvidenceRecord = write(
      root,
      candidate.review_evidence_path,
      jsonBytes(reviewEvidence),
    );
    candidate.review_evidence_sha256 = reviewEvidenceRecord.sha256;

    const candidatePath =
      `assets/${spec.assetId}/review/motion-set/${candidateId}/candidate.json`;
    const candidateRecord = write(root, candidatePath, jsonBytes(candidate));
    const clipManifestPath =
      `motion/authored-semantic-v2/${spec.assetId}/clip-manifest.json`;
    const clipManifestRecord = write(
      root,
      clipManifestPath,
      jsonBytes({
        candidate_id: candidateId,
        clip_order: clipOrder,
        clips,
        schema_version: 2,
      }),
    );
    const frameHashesRecord = write(
      root,
      `motion/authored-semantic-v2/${spec.assetId}/frame-hashes.json`,
      jsonBytes({
        algorithm: 'sha256',
        frames: Object.fromEntries(
          frames.map((frame) => [frame.frame_id, frame.sha256]),
        ),
        schema_version: 1,
      }),
    );
    const qaSummaryPath =
      `motion/authored-semantic-v2/${spec.assetId}/qa-summary.json`;
    const qaSummaryRecord = write(
      root,
      qaSummaryPath,
      jsonBytes({
        asset_id: spec.assetId,
        canvas: [640, 640],
        clip_count: spec.clips.length,
        clips: spec.clips.map(([clip, frameCount, playback, fps]) => ({
          authoring_mode: 'native-authored',
          clip,
          fps,
          frame_count: frameCount,
          passed: true,
          playback,
          reject_reasons: [],
          semantic_checks_passed: true,
        })),
        creative_approval: 'human_required',
        frame_count: frames.length,
        local_authored_clip_count: spec.clips.length,
        mechanical_qa: 'passed',
        passed: true,
        provider_clip_count: 0,
        reject_reasons: [],
        schema_version: 1,
      }),
    );
    const assetManifest = {
      approvals: {
        identity: {
          sha256: 'd'.repeat(64),
          source_manifest_version: spec.manifestVersion,
        },
      },
      artifacts: {
        motion_set_candidate: {
          kind: 'motion_set_candidate',
          path: candidatePath,
          sha256: candidateRecord.sha256,
        },
        motion_set_review_evidence: {
          kind: 'review_evidence',
          path: candidate.review_evidence_path,
          sha256: reviewEvidenceRecord.sha256,
        },
        motion_set_review_html: {
          kind: 'review',
          path: reviewHtmlPath,
          sha256: reviewHtml.sha256,
        },
      },
      asset_id: spec.assetId,
      manifest_version: spec.manifestVersion,
      schema_version: 1,
      status: 'awaiting_motion_approval',
    };
    write(
      root,
      `assets/${spec.assetId}/asset.json`,
      jsonBytes(assetManifest),
    );
    batchAssets.push({
      asset_id: spec.assetId,
      clip_count: spec.clips.length,
      clip_manifest_path: clipManifestPath,
      clip_manifest_sha256: clipManifestRecord.sha256,
      frame_count: frames.length,
      frame_hashes_path:
        `motion/authored-semantic-v2/${spec.assetId}/frame-hashes.json`,
      frame_hashes_sha256: frameHashesRecord.sha256,
      local_authored_clip_count: spec.clips.length,
      passed: true,
      provider_clip_count: 0,
      qa_summary_path: qaSummaryPath,
      qa_summary_sha256: qaSummaryRecord.sha256,
    });
  }
  const batch = {
    asset_count: 7,
    assets: batchAssets,
    clip_count: 39,
    contract: 'apn-offline-authored-motion-v1',
    creative_approval: 'human_required',
    frame_count: 276,
    local_authored_clip_count: 39,
    mechanical_qa: 'passed',
    network_calls: 0,
    passed: true,
    provider_calls: 0,
    provider_clip_count: 0,
    reject_reasons: [],
    schema_version: 1,
  };
  write(
    root,
    'motion/authored-semantic-v2/batch-summary.json',
    jsonBytes(batch),
  );
}

function fakeDerivatives() {
  return {
    inspectFrame() {
      return {
        width: 640,
        height: 640,
        trim: { x: 176, y: 128, width: 128, height: 192 },
      };
    },
    validateTools() {
      return {
        cwebpVersion: '1.6.0',
        derivativeToolchainSha256:
          '79b3b980f7b360585605a491bf176f54adf264fb31ecade68c9f0e7348fb9a69',
      };
    },
    buildAtlas({ frameIds, atlasFacts, staged, matrix, outputName }) {
      const webpBytes = Buffer.from(
        `synthetic-webp:${frameIds.join(',')}:${matrix.width}x${matrix.height}`,
      );
      const webp = path.join(staged, outputName);
      fs.writeFileSync(webp, webpBytes);
      const referenceBounds = {
        x: 8,
        y: 4,
        width: atlasFacts.trim.width - 16,
        height: atlasFacts.trim.height - 8,
      };
      const motionBounds = {
        x: 2,
        y: 1,
        width: atlasFacts.trim.width - 4,
        height: atlasFacts.trim.height - 2,
      };
      return {
        webp,
        webpBytes,
        webpDimensions: { width: matrix.width, height: matrix.height },
        cellBounds: new Map(
          frameIds.map((frameId, index) => [
            frameId,
            index === 0 ? referenceBounds : motionBounds,
          ]),
        ),
      };
    },
  };
}

function fileProjection(root) {
  const result = {};
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else {
        result[path.relative(root, absolute).replaceAll(path.sep, '/')] =
          sha256(fs.readFileSync(absolute));
      }
    }
  };
  visit(root);
  return result;
}

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'apn-gaf2d-preview-test-'),
);
try {
  const sourceRoot = path.join(temporaryRoot, 'gaf-project');
  const outputRoot = path.join(temporaryRoot, 'game', '.gaf2d-preview');
  createSource(sourceRoot);
  const options = {
    gaf2dProjectRoot: sourceRoot,
    outputRoot,
    derivatives: fakeDerivatives(),
  };
  const first = buildGaf2dPreview(options);
  const firstProjection = fileProjection(outputRoot);
  const second = buildGaf2dPreview(options);
  const secondProjection = fileProjection(outputRoot);
  assert(first.passed === true && second.passed === true, 'two builds pass');
  assert(
    JSON.stringify(firstProjection) === JSON.stringify(secondProjection),
    'unchanged source produces byte-identical preview output',
  );
  assert(
    first.manifestSha256 === second.manifestSha256,
    'unchanged source produces the same preview manifest hash',
  );
  const manifestText = fs.readFileSync(
    path.join(outputRoot, 'manifest.json'),
    'utf8',
  );
  const manifest = JSON.parse(manifestText);
  assert(
    manifest.authority === 'unapproved_preview' &&
      manifest.status === 'human_review_required',
    'manifest declares unapproved human-review authority',
  );
  assert(
    JSON.stringify(manifest.counts) ===
      JSON.stringify({ assets: 7, clips: 39, frames: 276 }),
    'manifest binds the exact 7 asset / 39 clip / 276 frame candidate',
  );
  assert(
    !manifestText.includes(temporaryRoot) &&
      !manifestText.includes('ApprovalSha256'),
    'preview output contains no machine path or production approval field',
  );
  const creatureDescriptors = Object.keys(manifest.characters).map(
    (assetId) => ({
      assetId,
      descriptor: JSON.parse(
        fs.readFileSync(
          path.join(outputRoot, 'characters', assetId, 'motion.json'),
          'utf8',
        ),
      ),
    }),
  );
  const heroDescriptors = Object.keys(manifest.hero.clips).map((clipName) =>
    JSON.parse(
      fs.readFileSync(
        path.join(outputRoot, 'hero', `${clipName}.json`),
        'utf8',
      ),
    ),
  );
  const allSevenAssets = [
    { assetId: 'apn-hero', descriptor: heroDescriptors[0] },
    ...creatureDescriptors,
  ];
  assert(
    allSevenAssets.length === 7 &&
      allSevenAssets.every(({ assetId, descriptor }) => {
        const presentation = descriptor.presentation;
        return (
          presentation?.scaleContract === 'visible-body' &&
          presentation.reference.clip === 'idle' &&
          presentation.reference.frameIndex === 0 &&
          presentation.reference.sourceSha256 ===
            sha256(Buffer.from(`synthetic-frame:${assetId}:idle-000`)) &&
          boundsInsideTrim(presentation.visibleBounds, descriptor.trim) &&
          boundsInsideTrim(presentation.motionBounds, descriptor.trim)
        );
      }),
    'all seven preview assets bind bounded neutral and union presentation geometry',
  );
  assert(
    heroDescriptors.length === 8 &&
      heroDescriptors.every(
        (descriptor) =>
          JSON.stringify(descriptor.presentation) ===
          JSON.stringify(heroDescriptors[0].presentation),
      ),
    'every Hero clip descriptor binds the same asset-level presentation record',
  );

  const batchPath = path.join(
    sourceRoot,
    'motion/authored-semantic-v2/batch-summary.json',
  );
  const goodBatchBytes = fs.readFileSync(batchPath);
  const badBatch = JSON.parse(goodBatchBytes);
  badBatch.provider_calls = 1;
  fs.writeFileSync(batchPath, jsonBytes(badBatch));
  assert(
    (() => {
      try {
        buildGaf2dPreview(options);
        return false;
      } catch (error) {
        return error.message.includes('provider_calls');
      }
    })(),
    'nonzero paid-provider calls are rejected before derivative work',
  );
  fs.writeFileSync(batchPath, goodBatchBytes);

  const candidatePath = path.join(
    sourceRoot,
    'assets/entry-runner/review/motion-set/entry-runner-authored-semantic-v2/candidate.json',
  );
  fs.appendFileSync(candidatePath, Buffer.from(' '));
  assert(
    (() => {
      try {
        buildGaf2dPreview(options);
        return false;
      } catch (error) {
        return error.message.includes('candidate') &&
          error.message.includes('SHA-256');
      }
    })(),
    'stale registered candidate bytes are rejected by hash',
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log('GAF2D PREVIEW BUILD PASS');
