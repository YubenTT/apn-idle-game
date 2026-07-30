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

const SMOOTH_CREATURE_CLIPS = Object.freeze([
  Object.freeze(['idle', 30, 'loop', 30]),
  Object.freeze(['advance', 24, 'loop', 30]),
  Object.freeze(['engaged', 15, 'loop', 30]),
  Object.freeze(['hit', 8, 'progress', 32]),
  Object.freeze(['death', 30, 'progress', 30]),
]);
const SMOOTH_HERO_CLIPS = Object.freeze([
  Object.freeze(['idle', 20, 'loop', 30]),
  Object.freeze(['run', 20, 'loop', 32]),
  Object.freeze(['attack', 15, 'progress', 30]),
  Object.freeze(['crit', 15, 'progress', 30]),
  Object.freeze(['sprint', 15, 'loop', 30]),
  Object.freeze(['hit', 8, 'progress', 32]),
  Object.freeze(['death', 15, 'progress', 30]),
  Object.freeze(['celebrate', 15, 'loop', 30]),
]);
const SMOOTH_ASSETS = Object.freeze([
  Object.freeze({
    assetId: 'apn-hero',
    manifestVersion: 4,
    role: 'hero',
    clips: SMOOTH_HERO_CLIPS,
  }),
  ...[
    'entry-runner',
    'protocol-courier',
    'signal-hunter',
    'site-sentinel',
    'veil-operator',
  ].map((assetId) =>
    Object.freeze({
      assetId,
      manifestVersion: 4,
      role: 'character',
      clips: SMOOTH_CREATURE_CLIPS,
    })),
  Object.freeze({
    assetId: 'site-warden',
    manifestVersion: 4,
    role: 'boss',
    clips: Object.freeze([
      ...SMOOTH_CREATURE_CLIPS,
      Object.freeze(['broken', 30, 'loop', 30]),
    ]),
  }),
]);

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

function createSource(root, options = {}) {
  const sourceFamily = options.sourceFamily ?? 'authored-semantic-v2';
  const smooth = sourceFamily === 'authored-semantic-v3';
  const assets = smooth ? SMOOTH_ASSETS : ASSETS;
  const batchAssets = [];
  for (const spec of assets) {
    const candidateId = `${spec.assetId}-${sourceFamily}`;
    const clipOrder = spec.clips.map(([name]) => name);
    const clips = {};
    const frames = [];
    let sourceIndex = 0;
    for (const [name, count, playback, fps] of spec.clips) {
      const frameIds = Array.from(
        { length: count },
        (_, index) => `${name}-${String(index).padStart(3, '0')}`,
      );
      const markers = playback === 'loop'
        ? {
            neutral: frameIds[0],
            maximum_excursion: frameIds[Math.floor(count / 2)],
            return: frameIds[count - 1],
          }
        : {
            anticipation: frameIds[0],
            contact: frameIds[Math.floor(count / 2)],
            terminal: frameIds[count - 1],
          };
      clips[name] = {
        fps,
        frame_ids: frameIds,
        playback,
        ...(smooth
          ? {
              source_fps: 12,
              cadence_profile: 'continuous_30',
              authoring_method: 'deterministic_part_rig',
              interpolation_method: 'deterministic_part_transforms',
              holds: playback === 'progress'
                ? [{
                    start_index: count - 2,
                    end_index: count - 1,
                    reason: 'terminal',
                  }]
                : [],
              markers,
            }
          : {}),
      };
      for (let clipFrameIndex = 0; clipFrameIndex < frameIds.length; clipFrameIndex += 1) {
        const frameId = frameIds[clipFrameIndex];
        const falseCadenceDuplicate =
          options.falseCadence === true &&
          spec.assetId === 'entry-runner' &&
          name === 'idle' &&
          clipFrameIndex === 2;
        const semanticDuplicate =
          smooth &&
          (
            (playback === 'loop' && clipFrameIndex === frameIds.length - 1) ||
            (playback === 'progress' &&
              clipFrameIndex === frameIds.length - 1)
          );
        const sourceFrameId = falseCadenceDuplicate
          ? frameIds[clipFrameIndex - 1]
          : semanticDuplicate && playback === 'loop'
            ? frameIds[0]
            : semanticDuplicate
              ? frameIds[clipFrameIndex - 1]
              : frameId;
        const bytes = Buffer.from(
          `synthetic-frame:${spec.assetId}:${sourceFrameId}`,
        );
        write(
          root,
          `motion/${sourceFamily}/${spec.assetId}/frames/${frameId}.png`,
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
      grammar: smooth ? 'gaf2d-motion-set-v3' : 'gaf2d-motion-set-v2',
      review_evidence_path:
        `assets/${spec.assetId}/review/motion-set/${candidateId}/review-evidence.json`,
      review_evidence_sha256: '',
      review_frame_durations_milliseconds: frames.map(
        (frame) => Math.round(frame.duration_seconds * 1000),
      ),
      source_manifest_version: spec.manifestVersion,
    };
    if (smooth) {
      const temporalEvidenceRecord = write(
        root,
        `assets/${spec.assetId}/review/motion-set/${candidateId}/temporal-evidence.json`,
        jsonBytes({
          grammar: 'gaf2d-motion-set-temporal-evidence-v3',
          asset_id: spec.assetId,
          candidate_id: candidateId,
          clip_order: clipOrder,
          clips: clipOrder.map((clip_name) => ({ clip_name })),
        }),
      );
      candidate.temporal_evidence_path = temporalEvidenceRecord.relative;
      candidate.temporal_evidence_sha256 = temporalEvidenceRecord.sha256;
    }
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
      `motion/${sourceFamily}/${spec.assetId}/clip-manifest.json`;
    const clipManifestRecord = write(
      root,
      clipManifestPath,
      jsonBytes({
        candidate_id: candidateId,
        clip_order: clipOrder,
        clips,
        schema_version: smooth ? 3 : 2,
      }),
    );
    const frameHashesRecord = write(
      root,
      `motion/${sourceFamily}/${spec.assetId}/frame-hashes.json`,
      jsonBytes({
        algorithm: 'sha256',
        frames: Object.fromEntries(
          frames.map((frame) => [frame.frame_id, frame.sha256]),
        ),
        schema_version: 1,
      }),
    );
    const qaSummaryPath =
      `motion/${sourceFamily}/${spec.assetId}/qa-summary.json`;
    const framesById = new Map(
      frames.map((frame) => [frame.frame_id, frame]),
    );
    const smoothQaClips = smooth
      ? Object.fromEntries(
          spec.clips.map(([clip, frameCount, playback, fps]) => {
        const clipContract = clips[clip];
        const bodyPoseSha256 = clipContract.frame_ids.map(
          (frameId) => framesById.get(frameId).sha256,
        );
        const declaredHoldTransitionTargets =
          clipContract.holds.flatMap((hold) =>
            Array.from(
              { length: hold.end_index - hold.start_index },
              (_, index) => hold.start_index + index + 1,
            ),
          );
        const activeSlots =
          frameCount - declaredHoldTransitionTargets.length;
            return [
              clip,
              {
            authoring_method: clipContract.authoring_method,
            body_pose_sha256: bodyPoseSha256,
            cadence_profile: clipContract.cadence_profile,
            declared_hold_transition_targets:
              declaredHoldTransitionTargets,
            distinct_body_pose_count: activeSlots,
            distinct_body_pose_rate: fps,
            false_hold_targets: [],
            frame_count: frameCount,
            fps,
            holds: clipContract.holds,
            interpolation_method:
              clipContract.interpolation_method,
            loop_closure_exact:
              playback === 'loop' ? true : null,
            markers: clipContract.markers,
            passed: true,
            playback,
            reject_reasons: [],
            source_fps: clipContract.source_fps,
            undeclared_duplicate_targets: [],
              },
            ];
          }),
        )
      : null;
    const qaSummaryRecord = write(
      root,
      qaSummaryPath,
      jsonBytes(
        smooth
          ? {
              asset_id: spec.assetId,
              clip_count: spec.clips.length,
              clips: smoothQaClips,
              creative_approval: 'human_required',
              frame_count: frames.length,
              mechanical_qa: 'passed',
              network_calls: 0,
              passed: true,
              provider_calls: 0,
              reject_reasons: [],
              schema_version: 3,
            }
          : {
              asset_id: spec.assetId,
              canvas: [640, 640],
              clip_count: spec.clips.length,
              clips: spec.clips.map(
                ([clip, frameCount, playback, fps]) => ({
                  authoring_mode: 'native-authored',
                  clip,
                  fps,
                  frame_count: frameCount,
                  passed: true,
                  playback,
                  reject_reasons: [],
                  semantic_checks_passed: true,
                }),
              ),
              creative_approval: 'human_required',
              frame_count: frames.length,
              local_authored_clip_count: spec.clips.length,
              mechanical_qa: 'passed',
              passed: true,
              provider_clip_count: 0,
              reject_reasons: [],
              schema_version: 1,
            },
      ),
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
        ...(smooth
          ? {
              motion_set_temporal_evidence: {
                kind: 'review_evidence',
                path: candidate.temporal_evidence_path,
                sha256: candidate.temporal_evidence_sha256,
              },
            }
          : {}),
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
    const decodedFrameRecord = smooth
      ? write(
          root,
          `motion/${sourceFamily}/${spec.assetId}/decoded-frames.json`,
          jsonBytes({
            canvas_height: 640,
            canvas_width: 640,
            frames: frames.map((frame) => ({
              duration_seconds: frame.duration_seconds,
              frame_id: frame.frame_id,
              path: `frames/${frame.frame_id}.png`,
              timestamp_seconds: frame.timestamp_seconds,
            })),
            schema_version: 1,
          }),
        )
      : null;
    const poseManifestRecord = smooth
      ? write(
          root,
          `motion/${sourceFamily}/${spec.assetId}/pose-manifest.json`,
          jsonBytes({
            asset_id: spec.assetId,
            clip_order: clipOrder,
            clips: {},
            revision: sourceFamily,
            schema_version: 3,
          }),
        )
      : null;
    const provenanceRecord = smooth
      ? write(
          root,
          `motion/${sourceFamily}/${spec.assetId}/provenance.json`,
          jsonBytes({
            asset_id: spec.assetId,
            network_calls: 0,
            provider_calls: 0,
            revision: sourceFamily,
            schema_version: 3,
          }),
        )
      : null;
    batchAssets.push({
      asset_id: spec.assetId,
      clip_count: spec.clips.length,
      clip_manifest_path: smooth
        ? `${spec.assetId}/clip-manifest.json`
        : clipManifestPath,
      clip_manifest_sha256: clipManifestRecord.sha256,
      frame_count: frames.length,
      frame_hashes_path:
        smooth
          ? `${spec.assetId}/frame-hashes.json`
          : `motion/${sourceFamily}/${spec.assetId}/frame-hashes.json`,
      frame_hashes_sha256: frameHashesRecord.sha256,
      local_authored_clip_count: spec.clips.length,
      passed: true,
      provider_clip_count: 0,
      qa_summary_path: smooth
        ? `${spec.assetId}/qa-summary.json`
        : qaSummaryPath,
      qa_summary_sha256: qaSummaryRecord.sha256,
      ...(smooth
        ? {
            decoded_frame_manifest_path:
              `${spec.assetId}/decoded-frames.json`,
            decoded_frame_manifest_sha256:
              decodedFrameRecord.sha256,
            network_calls: 0,
            pose_manifest_path: `${spec.assetId}/pose-manifest.json`,
            pose_manifest_sha256: poseManifestRecord.sha256,
            provider_calls: 0,
            provenance_path: `${spec.assetId}/provenance.json`,
            provenance_sha256: provenanceRecord.sha256,
            reject_reasons: [],
          }
        : {}),
    });
  }
  const batch = {
    ...(smooth
      ? { artifact_path_base: 'batch-summary-parent' }
      : {}),
    asset_count: 7,
    assets: batchAssets,
    clip_count: 39,
    contract: smooth
      ? 'apn-offline-authored-motion-v3'
      : 'apn-offline-authored-motion-v1',
    creative_approval: 'human_required',
    frame_count: smooth ? 795 : 276,
    local_authored_clip_count: 39,
    mechanical_qa: 'passed',
    network_calls: 0,
    passed: true,
    provider_calls: 0,
    provider_clip_count: 0,
    reject_reasons: [],
    ...(smooth ? { revision: sourceFamily } : {}),
    schema_version: smooth ? 3 : 1,
  };
  write(
    root,
    `motion/${sourceFamily}/batch-summary.json`,
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

const smoothTemporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'apn-gaf2d-smooth-preview-test-'),
);
try {
  const sourceRoot = path.join(smoothTemporaryRoot, 'gaf-project');
  const outputRoot = path.join(
    smoothTemporaryRoot,
    'game',
    '.gaf2d-preview',
  );
  createSource(sourceRoot, { sourceFamily: 'authored-semantic-v3' });
  const options = {
    gaf2dProjectRoot: sourceRoot,
    outputRoot,
    sourceFamily: 'authored-semantic-v3',
    derivatives: fakeDerivatives(),
  };
  const first = buildGaf2dPreview(options);
  const firstProjection = fileProjection(outputRoot);
  const second = buildGaf2dPreview(options);
  const secondProjection = fileProjection(outputRoot);
  assert(
    first.passed === true &&
      JSON.stringify(first.counts) ===
        JSON.stringify({ assets: 7, clips: 39, frames: 795 }),
    'V3 per-clip preview build binds the exact 7/39/795 source',
  );
  assert(
    JSON.stringify(firstProjection) === JSON.stringify(secondProjection),
    'V3 per-clip preview output is byte-identical across two builds',
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(outputRoot, 'manifest.json'), 'utf8'),
  );
  assert(
    manifest.sourceFamily === 'authored-semantic-v3' &&
      manifest.authority === 'unapproved_preview' &&
      manifest.status === 'human_review_required',
    'V3 preview remains unapproved and human-gated',
  );
  const entry = manifest.characters['entry-runner'];
  const setFile = path.join(
    outputRoot,
    'characters',
    'entry-runner',
    'set.json',
  );
  const setBytes = fs.readFileSync(setFile);
  const set = JSON.parse(setBytes);
  assert(
    set.grammar === 'gaf2d-motion-set-index-v2' &&
      entry.set.endsWith('/set.json') &&
      entry.setSha256 === sha256(setBytes),
    'character manifest hash-binds its V2 per-clip set index',
  );
  assert(
    JSON.stringify(Object.keys(set.clips)) ===
      JSON.stringify(['advance', 'death', 'engaged', 'hit', 'idle']) &&
      set.clips.idle.descriptor === 'idle.json' &&
      set.clips.idle.image === 'idle.webp',
    'character set index contains the exact required clip entries',
  );
  const descriptors = Object.fromEntries(
    Object.keys(set.clips).map((clipName) => {
      const descriptorFile = path.join(
        outputRoot,
        'characters',
        'entry-runner',
        `${clipName}.json`,
      );
      const imageFile = path.join(
        outputRoot,
        'characters',
        'entry-runner',
        `${clipName}.webp`,
      );
      const descriptorBytes = fs.readFileSync(descriptorFile);
      const imageBytes = fs.readFileSync(imageFile);
      assert(
        sha256(descriptorBytes) ===
            set.clips[clipName].descriptorSha256 &&
          sha256(imageBytes) === set.clips[clipName].imageSha256,
        `entry-runner/${clipName} exact descriptor and image hashes are index-bound`,
      );
      return [clipName, JSON.parse(descriptorBytes)];
    }),
  );
  assert(
    descriptors.idle.frames.length === 30 &&
      descriptors.advance.frames.length === 24 &&
      descriptors.engaged.frames.length === 15 &&
      descriptors.hit.frames.length === 8 &&
      descriptors.death.frames.length === 30,
    'entry-runner per-clip descriptors preserve all 107 genuine V3 pose slots',
  );
  assert(
    Object.values(descriptors).every(
      (descriptor) =>
        descriptor.cadenceProfile === 'continuous_30' &&
        descriptor.authoringMethod === 'deterministic_part_rig' &&
        descriptor.interpolationMethod ===
          'deterministic_part_transforms' &&
        descriptor.atlas.width <= 2048 &&
        descriptor.atlas.height <= 2048 &&
        descriptor.atlas.width * descriptor.atlas.height * 4 <=
          6 * 1024 * 1024,
    ),
    'every common clip preserves V3 cadence provenance and decoded limits',
  );
  assert(
    Object.values(descriptors).every(
      (descriptor) => !Object.hasOwn(descriptor, 'presentation'),
    ) &&
      set.presentation.reference.clip === 'idle' &&
      set.presentation.reference.sourceSha256 ===
        sha256(Buffer.from('synthetic-frame:entry-runner:idle-000')),
    'one character-wide presentation record owns every independently packed clip',
  );

  const heroSetBytes = fs.readFileSync(
    path.join(outputRoot, 'hero', 'set.json'),
  );
  const heroSet = JSON.parse(heroSetBytes);
  const heroRunBytes = fs.readFileSync(
    path.join(outputRoot, 'hero', 'run.json'),
  );
  const heroRun = JSON.parse(heroRunBytes);
  assert(
    manifest.hero.setSha256 === sha256(heroSetBytes) &&
      heroSet.role === 'hero' &&
      heroSet.clips.run.descriptorSha256 === sha256(heroRunBytes) &&
      heroRun.frames.length === 20 &&
      heroRun.fps === 32 &&
      heroRun.atlas.width * heroRun.atlas.height * 4 <=
        8 * 1024 * 1024 &&
      heroRun.atlas.bytes <= 640 * 1024,
    'APN Hero/run preserves its exact 20@32 contract and bounded per-clip hashes',
  );

  const wardenManifest = manifest.characters['site-warden'];
  const wardenSetBytes = fs.readFileSync(
    path.join(outputRoot, 'characters', 'site-warden', 'set.json'),
  );
  const wardenSet = JSON.parse(wardenSetBytes);
  const wardenBrokenBytes = fs.readFileSync(
    path.join(
      outputRoot,
      'characters',
      'site-warden',
      'broken.json',
    ),
  );
  const wardenBroken = JSON.parse(wardenBrokenBytes);
  assert(
    wardenManifest.setSha256 === sha256(wardenSetBytes) &&
      wardenSet.role === 'boss' &&
      wardenSet.clips.broken.descriptorSha256 ===
        sha256(wardenBrokenBytes) &&
      wardenBroken.frames.length === 30 &&
      wardenBroken.fps === 30 &&
      wardenBroken.atlas.width * wardenBroken.atlas.height * 4 <=
        8 * 1024 * 1024 &&
      wardenBroken.atlas.bytes <= 240 * 1024,
    'Site Warden/broken preserves its exact 30@30 contract and boss budgets',
  );

  const falseSource = path.join(smoothTemporaryRoot, 'false-gaf-project');
  const falseOutput = path.join(
    smoothTemporaryRoot,
    'false-game',
    '.gaf2d-preview',
  );
  createSource(falseSource, {
    sourceFamily: 'authored-semantic-v3',
    falseCadence: true,
  });
  assert(
    (() => {
      try {
        buildGaf2dPreview({
          ...options,
          gaf2dProjectRoot: falseSource,
          outputRoot: falseOutput,
        });
        return false;
      } catch (error) {
        return error.message.includes('undeclared repeated body pose');
      }
    })(),
    'V3 builder rejects a continuous-30 profile made from repeated low-rate frames',
  );
} finally {
  fs.rmSync(smoothTemporaryRoot, { recursive: true, force: true });
}

console.log('GAF2D PREVIEW BUILD PASS');
