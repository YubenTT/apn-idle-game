import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMotionStore, warmMotionClip } from '../js/motion-store.js';
import { drawEnemy } from '../js/render.js';
import { resolveActorGeometry } from '../js/stage-presentation.js';
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
const SMOOTH_WAVE_ASSETS = Object.freeze([
  Object.freeze(['entry-runner']),
  Object.freeze(['veil-operator']),
  Object.freeze(['signal-hunter']),
  Object.freeze(['entry-runner', 'veil-operator']),
  Object.freeze(['site-sentinel']),
  Object.freeze(['entry-runner', 'signal-hunter']),
  Object.freeze(['veil-operator', 'site-sentinel']),
  Object.freeze([
    'entry-runner',
    'veil-operator',
    'signal-hunter',
    'site-sentinel',
  ]),
  Object.freeze(['protocol-courier']),
  Object.freeze(['site-warden']),
]);
const ACTING_CONTRACT_RELATIVE =
  'briefs/authored-semantic-v3/acting-contract.json';
const ACTING_CONTRACT_FILE = new URL(
  '../scripts/assets/motion-v3-acting-contract.json',
  import.meta.url,
);
const PREVIEW_BUILDER_FILE = new URL(
  '../scripts/assets/build-gaf2d-preview.mjs',
  import.meta.url,
);

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
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};
const authorityHash = (domain, payload) =>
  sha256(
    Buffer.concat([
      Buffer.from(`${domain}\0`, 'ascii'),
      Buffer.from(JSON.stringify(canonicalize(payload))),
    ]),
  );
const VALID_SELECTED_WEBP_BYTES = Buffer.from(
  'UklGRjgAAABXRUJQVlA4TCwAAAAvv8OfEAcQEREAUKT//ymi/6n//e9///vf//73v//+973//+9///ve///0PAQ==',
  'base64',
);
const inflateSelectedWebp = (minimumBytes) => {
  if (VALID_SELECTED_WEBP_BYTES.length >= minimumBytes) {
    return Buffer.from(VALID_SELECTED_WEBP_BYTES);
  }
  const payloadBytes = minimumBytes - VALID_SELECTED_WEBP_BYTES.length;
  const paddedPayloadBytes = payloadBytes + (payloadBytes % 2);
  const chunkLength = Buffer.alloc(4);
  chunkLength.writeUInt32LE(payloadBytes, 0);
  const junkChunk = Buffer.concat([
    Buffer.from('JUNK', 'ascii'),
    chunkLength,
    Buffer.alloc(paddedPayloadBytes, 0x6b),
  ]);
  const inflated = Buffer.concat([VALID_SELECTED_WEBP_BYTES, junkChunk]);
  inflated.writeUInt32LE(inflated.length - 8, 4);
  return inflated;
};
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

function createBuiltPreviewMotionHarness(outputRoot, manifest) {
  const normalizePreviewPath = (value) =>
    String(value)
      .replace(/^\.gaf2d-preview\//, '')
      .replace(/^\.\//, '');
  const descriptorByImageUrl = new Map();
  for (const [assetId, entry] of Object.entries(manifest.characters)) {
    const set = JSON.parse(
      fs.readFileSync(path.join(outputRoot, 'characters', assetId, 'set.json'), 'utf8'),
    );
    for (const [clipName, clip] of Object.entries(set.clips)) {
      const descriptor = JSON.parse(
        fs.readFileSync(
          path.join(outputRoot, 'characters', assetId, clip.descriptor),
          'utf8',
        ),
      );
      descriptorByImageUrl.set(
        `${entry.clips[clipName].image}?sha256=${entry.clips[clipName].imageSha256}`,
        descriptor,
      );
    }
  }
  const fetch = async (url) => {
    const pathname = url.split('?', 1)[0];
    const file = path.join(outputRoot, normalizePreviewPath(pathname));
    if (!fs.existsSync(file)) {
      return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    }
    const bytes = fs.readFileSync(file);
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  };
  const store = createMotionStore({
    allowUnapprovedPreview: true,
    fetch,
    hashBytes: async (bytes) => sha256(bytes),
    decodeImage: async (_bytes, meta) => {
      const descriptor = descriptorByImageUrl.get(meta.url);
      return {
        width: descriptor?.atlas?.width || 960,
        height: descriptor?.atlas?.height || 336,
        close() {},
      };
    },
  });
  return {
    store,
    pack: {
      id: manifest.packId,
      boss: { id: 'site-warden' },
      motion: {
        grammar: 'gaf2d-motion-bundle-v1',
        characters: manifest.characters,
      },
    },
  };
}

function createGeometryProbeContext() {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (
          property === 'createLinearGradient' ||
          property === 'createRadialGradient'
        ) {
          return () => ({ addColorStop() {} });
        }
        return () => {};
      },
      set() {
        return true;
      },
    },
  );
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function temporalEvidenceForClip(assetId, name, clip) {
  const frameCount = clip.frame_ids.length;
  const heldTargets = new Set(
    clip.holds.flatMap((hold) =>
      Array.from(
        { length: hold.end_index - hold.start_index },
        (_, index) => hold.start_index + index + 1,
      ),
    ),
  );
  const transitionTargets = [
    ...Array.from({ length: frameCount - 1 }, (_, index) => index + 1),
    ...(clip.playback === 'loop' ? [0] : []),
  ];
  const adjacentBodyDifferences = transitionTargets.map((target) =>
    heldTargets.has(target) ? 0 : 0.05,
  );
  const velocityRatios = transitionTargets.map((target) =>
    heldTargets.has(target) ? 0 : 1,
  );
  const accelerationRatios = Array.from(
    { length: Math.max(0, transitionTargets.length - 1) },
    () => 0,
  );
  const framePixelSha256 = [];
  const alignedBodySha256 = [];
  for (let index = 0; index < frameCount; index += 1) {
    if (heldTargets.has(index)) {
      framePixelSha256.push(framePixelSha256[index - 1]);
      alignedBodySha256.push(alignedBodySha256[index - 1]);
    } else {
      framePixelSha256.push(
        sha256(Buffer.from(`pixel:${assetId}:${name}:${index}`)),
      );
      alignedBodySha256.push(
        sha256(Buffer.from(`body:${assetId}:${name}:${index}`)),
      );
    }
  }
  const activeSlotCount = frameCount - heldTargets.size;
  return {
    check: 'temporal',
    playback: clip.playback,
    fps: clip.fps,
    frame_count: frameCount,
    frame_ids: [...clip.frame_ids],
    declared_hold_ranges: clip.holds.map((hold) => [
      hold.start_index,
      hold.end_index,
    ]),
    undeclared_duplicate_ranges: [],
    indistinct_pose_ranges: [],
    frame_pixel_sha256: framePixelSha256,
    aligned_body_sha256: alignedBodySha256,
    distinct_pose_count: activeSlotCount,
    distinct_pose_rate: clip.fps,
    pose_distance_threshold: 0.002,
    pose_distances: adjacentBodyDifferences,
    motion_distances: adjacentBodyDifferences,
    adjacent_body_differences: adjacentBodyDifferences,
    median_adjacent_body_difference: median(adjacentBodyDifferences),
    maximum_adjacent_body_difference:
      Math.max(...adjacentBodyDifferences),
    velocity_ratios: velocityRatios,
    maximum_velocity_ratio: Math.max(...velocityRatios),
    velocity_spike_ratio_threshold: 4,
    velocity_spike_indices: [],
    acceleration_ratios: accelerationRatios,
    maximum_acceleration_ratio:
      Math.max(0, ...accelerationRatios),
    acceleration_spike_ratio_threshold: 6,
    acceleration_spike_indices: [],
    loop_velocity_discontinuity:
      clip.playback === 'loop' ? 0.1 : null,
  };
}

function temporalSetEvidence(
  spec,
  candidateId,
  artifactPath,
  clips,
  frames,
) {
  const framesById = new Map(
    frames.map((frame) => [frame.frame_id, frame]),
  );
  return {
    schema_version: 3,
    grammar: 'gaf2d-motion-set-temporal-evidence-v3',
    asset_id: spec.assetId,
    candidate_id: candidateId,
    artifact_path: artifactPath,
    clip_order: Object.keys(clips),
    clips: Object.entries(clips).map(([name, clip]) => ({
      clip_name: name,
      playback: clip.playback,
      fps: clip.fps,
      source_fps: clip.source_fps,
      cadence_profile: clip.cadence_profile,
      authoring_method: clip.authoring_method,
      interpolation_method: clip.interpolation_method,
      frames: clip.frame_ids.map((frameId) => ({
        frame_id: frameId,
        path: framesById.get(frameId).path,
        sha256: framesById.get(frameId).sha256,
      })),
      holds: clip.holds.map((hold) => ({ ...hold })),
      markers: Object.entries(clip.markers)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([role, frameId]) => ({ role, frame_id: frameId })),
      evidence: temporalEvidenceForClip(
        spec.assetId,
        name,
        clip,
      ),
    })),
  };
}

function createSource(root, options = {}) {
  const sourceFamily = options.sourceFamily ?? 'authored-semantic-v2';
  if (sourceFamily === 'authored-semantic-v4') {
    createVisualFidelitySource(root);
    return;
  }
  const smooth = sourceFamily === 'authored-semantic-v3';
  const canvasSize = options.canvasSize ?? (smooth ? 128 : 640);
  const assets = smooth ? SMOOTH_ASSETS : ASSETS;
  const actingContractBytes = smooth
    ? fs.readFileSync(ACTING_CONTRACT_FILE)
    : null;
  const actingContract = smooth
    ? JSON.parse(actingContractBytes.toString('utf8'))
    : null;
  const actingBinding = smooth
    ? {
        acting_contract_path_base: 'project-root',
        acting_contract_path: ACTING_CONTRACT_RELATIVE,
        acting_contract_sha256: sha256(actingContractBytes),
      }
    : {};
  if (smooth) {
    write(root, ACTING_CONTRACT_RELATIVE, actingContractBytes);
  }
  const batchAssets = [];
  for (const spec of assets) {
    const actingAsset = smooth
      ? actingContract.assets[spec.assetId]
      : null;
    const candidateId = `${spec.assetId}-${sourceFamily}`;
    const clipOrder = spec.clips.map(([name]) => name);
    const clips = {};
    const frames = [];
    let sourceIndex = 0;
    for (const [name, count, playback, fps] of spec.clips) {
      const actingClip = smooth ? actingAsset.clips[name] : null;
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
              source_fps: actingClip.source_fps,
              cadence_profile: actingClip.cadence_profile,
              authoring_method: actingClip.authoring_method,
              interpolation_method:
                actingClip.interpolation_method,
              holds: actingClip.holds.map((hold) => ({ ...hold })),
              markers: { ...actingClip.markers },
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
        const semanticHold = smooth
          ? clips[name].holds.find(
              (hold) =>
                clipFrameIndex > hold.start_index &&
                clipFrameIndex <= hold.end_index,
            )
          : null;
        const sourceFrameId = falseCadenceDuplicate
          ? frameIds[clipFrameIndex - 1]
          : semanticHold
            ? frameIds[semanticHold.start_index]
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
      canvas_size: [canvasSize, canvasSize],
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
    let temporalEvidence = null;
    if (smooth) {
      const temporalEvidencePath =
        `assets/${spec.assetId}/review/motion-set/${candidateId}/temporal-evidence.json`;
      temporalEvidence = temporalSetEvidence(
        spec,
        candidateId,
        temporalEvidencePath,
        clips,
        frames,
      );
      const temporalEvidenceRecord = write(
        root,
        temporalEvidencePath,
        jsonBytes(temporalEvidence),
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
      schema_version: 1,
      asset_id: spec.assetId,
      title: `Named motion-set review: ${spec.assetId} / ${candidateId}`,
      reference: {
        label: 'Approved identity',
        path: `assets/${spec.assetId}/approved/identity/reference.png`,
      },
      candidate: {
        label: `${clipOrder[0]} / ${frames[0].frame_id}`,
        path: frames[0].path,
      },
      contact_sheet: frames.map((frame) => ({
        label: frame.frame_id,
        path: frame.path,
      })),
      animation: {
        label: 'Full named motion-set temporal proof (review cadence only)',
        path:
          `assets/${spec.assetId}/review/motion-set/${candidateId}/temporal-proof.webp`,
      },
      pivot: [canvasSize / 2, canvasSize - 1],
      baseline_y: canvasSize - 1,
      diagnostics: {
        stage: 'motion_set',
        clip_count: spec.clips.length,
        clip_order: clipOrder.join(','),
        frame_count: frames.length,
        motion_set_id: candidateId,
        ...(smooth
          ? {
              temporal_evidence_path:
                candidate.temporal_evidence_path,
              temporal_evidence_sha256:
                candidate.temporal_evidence_sha256,
              ...Object.fromEntries(
                clipOrder.map((clipName) => [
                  `temporal_qa_${clipName}`,
                  'motion_temporal_valid',
                ]),
              ),
            }
          : {}),
      },
      reject_reasons: [],
      approval_command: [
        'gaf2d',
        'approve',
        'motion-set',
        spec.assetId,
        candidateId,
        '--project',
        '.',
      ],
      destination_path: reviewHtmlPath,
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
        ...(smooth ? actingBinding : {}),
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
    const smoothQaClips = smooth
      ? Object.fromEntries(
          spec.clips.map(([clip, frameCount, playback, fps]) => {
            const clipContract = clips[clip];
            const rasterTemporal = temporalEvidence.clips.find(
              (record) => record.clip_name === clip,
            ).evidence;
            const bodyPoseSha256 =
              rasterTemporal.aligned_body_sha256;
            const declaredHoldTransitionTargets =
              clipContract.holds.flatMap((hold) =>
                Array.from(
                  {
                    length:
                      hold.end_index - hold.start_index,
                  },
                  (_, index) => hold.start_index + index + 1,
                ),
              );
            return [
              clip,
              {
                authoring_method:
                  clipContract.authoring_method,
                body_pose_sha256: bodyPoseSha256,
                cadence_profile:
                  clipContract.cadence_profile,
                declared_hold_transition_targets:
                  declaredHoldTransitionTargets,
                distinct_body_pose_count:
                  rasterTemporal.distinct_pose_count,
                distinct_body_pose_rate:
                  rasterTemporal.distinct_pose_rate,
                false_hold_targets: [],
                frame_count: frameCount,
                fps,
                holds: clipContract.holds,
                interpolation_method:
                  clipContract.interpolation_method,
                loop_closure_exact:
                  playback === 'loop' ? false : null,
                loop_sampling:
                  playback === 'loop'
                    ? 'periodic_pre_wrap'
                    : null,
                markers: clipContract.markers,
                passed: true,
                playback,
                raster_temporal: {
                  ...rasterTemporal,
                  passed: true,
                },
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
              ...actingBinding,
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
            canvas_height: canvasSize,
            canvas_width: canvasSize,
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
            ...actingBinding,
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
            ...actingBinding,
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
      ? {
          ...actingBinding,
          artifact_path_base: 'batch-summary-parent',
        }
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

function createVisualFidelitySource(root) {
  createSource(root, { sourceFamily: 'authored-semantic-v3' });
  const selectionAuthority = {
    path: 'briefs/authored-semantic-v4/encoding-selection.json',
    sha256: '8bf75522baec0b7335ee892c2a986a94e048b45a33769d138f4ec72d3d632598',
  };
  const contractAuthority = {
    path: 'briefs/authored-semantic-v4/contract.json',
    sha256: 'cf3020a6e62d51996f90f90af9ca8e32f1e378b51274a519c28f133b0f9ccb75',
  };
  const profileSha256 =
    '76d15cc95e8a0bf2f40867abb09f375148679e71f3746e11d51130f83c463dd4';
  const sharedWebpBytes = VALID_SELECTED_WEBP_BYTES;
  const sharedDecodedCanvas = [960, 640];
  const sharedDecodedBytes = sharedDecodedCanvas[0] * sharedDecodedCanvas[1] * 4;
  const v4Boundary = 'motion/authored-semantic-v4';
  const writeV4 = (relative, bytes) =>
    write(root, path.posix.join(v4Boundary, relative), bytes);
  const roleFacts = {
    hero: {
      consumerRole: 'hero',
      runtime: 320,
      css: 96,
      sourceVisible: 214,
      trimWidth: 60,
    },
    character: {
      consumerRole: 'standard',
      runtime: 256,
      css: 72,
      sourceVisible: 160,
      trimWidth: 48,
    },
    elite: {
      consumerRole: 'elite',
      runtime: 256,
      css: 84,
      sourceVisible: 184,
      trimWidth: 52,
    },
    boss: {
      consumerRole: 'boss',
      runtime: 320,
      css: 112,
      sourceVisible: 256,
      trimWidth: 60,
    },
  };
  const v3BatchPath = path.join(root, 'motion/authored-semantic-v3/batch-summary.json');
  const v3Batch = JSON.parse(fs.readFileSync(v3BatchPath, 'utf8'));
  const assetAuthorities = [];
  const v3AssetRecords = new Map();
  for (const record of v3Batch.assets) {
    v3AssetRecords.set(record.asset_id, record);
  }
  for (const spec of SMOOTH_ASSETS) {
    const v3AssetRoot = path.join(root, 'motion/authored-semantic-v3', spec.assetId);
    const producerRoot = path.join(v3AssetRoot, 'producer-v2-authority');
    fs.mkdirSync(producerRoot, { recursive: true });
    const poseAuthorityRelative = `${spec.assetId}/producer-v2-authority/pose-authority.json`;
    const producerClipRelative = `${spec.assetId}/producer-v2-authority/clip-manifest.json`;
    const poseAuthorityPayload = {
      grammar: 'gaf2d-motion-pose-authority-v3',
      pivot_x_ppm_canvas: 500000,
      pivot_y_ppm_canvas: 500000,
      schema_version: 3,
    };
    const producerClipPayload = {
      clip_order: spec.clips.map(([clipName]) => clipName),
      pose_authority_path: 'pose-authority.json',
      schema_version: 3,
    };
    const poseAuthorityRecord = write(
      root,
      path.posix.join('motion', 'authored-semantic-v3', poseAuthorityRelative),
      jsonBytes(poseAuthorityPayload),
    );
    const producerClipRecord = write(
      root,
      path.posix.join('motion', 'authored-semantic-v3', producerClipRelative),
      jsonBytes(producerClipPayload),
    );
    const clipManifestPath = path.join(v3AssetRoot, 'clip-manifest.json');
    const clipManifest = JSON.parse(fs.readFileSync(clipManifestPath, 'utf8'));
    clipManifest.pose_authority_path = poseAuthorityRelative;
    clipManifest.pose_authority_sha256 = poseAuthorityRecord.sha256;
    fs.writeFileSync(clipManifestPath, jsonBytes(clipManifest));
    const clipManifestSha256 = sha256(fs.readFileSync(clipManifestPath));
    const qaSummaryPath = path.join(v3AssetRoot, 'qa-summary.json');
    const qaSummary = JSON.parse(fs.readFileSync(qaSummaryPath, 'utf8'));
    qaSummary.pose_authority_path = poseAuthorityRelative;
    qaSummary.pose_authority_sha256 = poseAuthorityRecord.sha256;
    fs.writeFileSync(qaSummaryPath, jsonBytes(qaSummary));
    const qaSummarySha256 = sha256(fs.readFileSync(qaSummaryPath));
    const provenancePath = path.join(v3AssetRoot, 'provenance.json');
    const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    provenance.pose_authority_path = poseAuthorityRelative;
    provenance.pose_authority_sha256 = poseAuthorityRecord.sha256;
    provenance.producer_clip_manifest_path = producerClipRelative;
    provenance.producer_clip_manifest_sha256 = producerClipRecord.sha256;
    fs.writeFileSync(provenancePath, jsonBytes(provenance));
    const provenanceSha256 = sha256(fs.readFileSync(provenancePath));
    const batchRecord = v3AssetRecords.get(spec.assetId);
    batchRecord.clip_manifest_sha256 = clipManifestSha256;
    batchRecord.qa_summary_sha256 = qaSummarySha256;
    batchRecord.provenance_sha256 = provenanceSha256;
    batchRecord.pose_authority_path = poseAuthorityRelative;
    batchRecord.pose_authority_sha256 = poseAuthorityRecord.sha256;
    batchRecord.producer_clip_manifest_path = producerClipRelative;
    batchRecord.producer_clip_manifest_sha256 = producerClipRecord.sha256;
    assetAuthorities.push({
      asset_id: spec.assetId,
      clip_manifest_path: batchRecord.clip_manifest_path,
      clip_manifest_sha256: clipManifestSha256,
      pose_manifest_path: batchRecord.pose_manifest_path,
      pose_manifest_sha256: batchRecord.pose_manifest_sha256,
      pose_authority_path: poseAuthorityRelative,
      pose_authority_sha256: poseAuthorityRecord.sha256,
      producer_clip_manifest_path: producerClipRelative,
      producer_clip_manifest_sha256: producerClipRecord.sha256,
    });
  }
  fs.writeFileSync(v3BatchPath, jsonBytes(v3Batch));
  const v3BatchSha256 = sha256(fs.readFileSync(v3BatchPath));
  const assetSets = [];
  for (const spec of SMOOTH_ASSETS) {
    const v3Root = path.join(root, 'motion/authored-semantic-v3', spec.assetId);
    const clipManifest = JSON.parse(
      fs.readFileSync(path.join(v3Root, 'clip-manifest.json'), 'utf8'),
    );
    const qaSummary = JSON.parse(
      fs.readFileSync(path.join(v3Root, 'qa-summary.json'), 'utf8'),
    );
    const bodyPoseByClip = Object.fromEntries(
      Object.entries(qaSummary.clips).map(([clipName, clip]) => [
        clipName,
        clip.body_pose_sha256,
      ]),
    );
    const consumerFacts =
      spec.assetId === 'site-sentinel'
        ? roleFacts.elite
        : spec.role === 'hero'
          ? roleFacts.hero
          : spec.role === 'boss'
            ? roleFacts.boss
            : roleFacts.character;
    const sourceAuthority = assetAuthorities.find(
      (entry) => entry.asset_id === spec.assetId,
    );
    const clipBindings = [];
    const semanticClipOrder = [];
    const consumerScales = [];
    const masterFragments = [];
    const lineageFragments = [];
    for (const [clipName, frameCount, playback, fps] of spec.clips) {
      const clipFrames = clipManifest.clips[clipName].frame_ids;
      const sourceVisiblePixels =
        consumerFacts.sourceVisible +
        (clipName === 'advance' ? 8 : clipName === 'hit' ? -4 : 0);
      const trim = {
        x: clipName === 'advance' ? 18 : 16,
        y: clipName === 'hit' ? 10 : 8,
        width: consumerFacts.trimWidth,
        height: sourceVisiblePixels,
      };
      const runtimePivot = [
        Math.floor(consumerFacts.runtime / 2) + (clipName === 'advance' ? 4 : 0),
        consumerFacts.runtime - 12 - (clipName === 'hit' ? 6 : 0),
      ];
      const mechanicalEvidence = {
        asset_id: spec.assetId,
        authority_status: 'unapproved_candidate',
        clip_id: clipName,
        contract: 'apn-visual-fidelity-v4-evidence',
        creative_approval: 'human_required',
        frame_count: frameCount,
        mechanical_qa: 'passed',
        network_calls: 0,
        pre_root_persisted: false,
        provider_calls: 0,
        root_application_count_per_frame: 1,
        root_authority: 'sealed_v3_producer_root_and_pivot',
        root_rerender_projection_used: false,
        root_support_preserved: true,
        runtime_derivatives_master_only: true,
        schema_version: 1,
        transparent_rgb_zero: true,
        v3_pose_match: true,
        v3_root_match: true,
        v3_timeline_match: true,
      };
      const prepackFrames = [];
      const descriptorFrames = [];
      const masterInventory = [];
      const runtimeInventory = [];
      const timelineFrames = [];
      const matrix = {
        columns: Math.min(frameCount, Math.max(1, Math.floor(sharedDecodedCanvas[0] / trim.width))),
      };
      matrix.rows = Math.ceil(frameCount / matrix.columns);
      for (let index = 0; index < frameCount; index += 1) {
        const frameId = clipFrames[index];
        const masterRelative = `${spec.assetId}/clips/${clipName}/masters/${frameId}.png`;
        const masterRecord = write(
          root,
          path.posix.join(v4Boundary, masterRelative),
          Buffer.from(`synthetic-v4-master:${spec.assetId}:${frameId}`),
        );
        const runtimeHash = sha256(
          Buffer.from(`synthetic-v4-runtime:${spec.assetId}:${frameId}`),
        );
        const bodyPoseSha = bodyPoseByClip[clipName][index];
        const frameAuthority = {
          applied_pose_sha256: sha256(
            Buffer.from(`applied:${spec.assetId}:${frameId}`),
          ),
          body_pose_sha256: bodyPoseSha,
          canonical_root_transform: {
            rotation_mdeg: 0,
            scale_x_ppm: 1_000_000,
            scale_y_ppm: 1_000_000,
            translate_x_ppm_canvas: index * 100,
            translate_y_ppm_canvas: 0,
          },
          frame_id: frameId,
          full_pose_sha256: sha256(
            Buffer.from(`full:${spec.assetId}:${frameId}`),
          ),
          master: {
            canonical_rgba_sha256: sha256(
              Buffer.from(`master-rgba:${spec.assetId}:${frameId}`),
            ),
            canvas: [512, 512],
            file_sha256: masterRecord.sha256,
            path: masterRelative,
          },
          requested_pose_sha256: sha256(
            Buffer.from(`requested:${spec.assetId}:${frameId}`),
          ),
          runtime: {
            canonical_rgba_sha256: runtimeHash,
            file_sha256: sha256(
              Buffer.from(`runtime-file:${spec.assetId}:${frameId}`),
            ),
            source_master_canonical_rgba_sha256: sha256(
              Buffer.from(`master-rgba:${spec.assetId}:${frameId}`),
            ),
            source_master_file_sha256: masterRecord.sha256,
          },
        };
        timelineFrames.push({
          body_pose_sha256: bodyPoseSha,
          canonical_root_transform: frameAuthority.canonical_root_transform,
          frame_id: frameId,
        });
        prepackFrames.push({
          ...frameAuthority,
          pose: { frame_id: frameId },
          pre_root: {
            canonical_rgba_sha256: sha256(
              Buffer.from(`pre-root:${spec.assetId}:${frameId}`),
            ),
            canvas: [512, 512],
            persisted: false,
            visible_bounds: [trim.x, trim.y, trim.x + trim.width, trim.y + trim.height],
            visible_height_px: sourceVisiblePixels,
          },
          root_application_count: 1,
        });
        descriptorFrames.push({
          ...frameAuthority,
          atlas_rect: [
            (index % matrix.columns) * trim.width,
            Math.floor(index / matrix.columns) * trim.height,
            trim.width,
            trim.height,
          ],
          packed_cell_canonical_rgba_sha256: sha256(
            Buffer.from(`packed:${spec.assetId}:${frameId}`),
          ),
        });
        masterInventory.push({ frame_id: frameId, ...frameAuthority.master });
        runtimeInventory.push({ frame_id: frameId, ...frameAuthority.runtime });
      }
      const timelineSha256 = authorityHash(
        'gaf2d:apn-v3-canonical-transform-timeline-v1',
        {
          asset_id: spec.assetId,
          clip: clipName,
          fps,
          frames: timelineFrames.map((frame, index) => ({
            ...frame,
            timing: {
              duration_denominator: fps,
              duration_numerator: 1,
              timestamp_denominator: fps,
              timestamp_numerator: index,
            },
          })),
          holds: clipManifest.clips[clipName].holds,
          playback,
        },
      );
      const prepackManifest = {
        asset_id: spec.assetId,
        authority_status: 'unapproved_candidate',
        clip_id: clipName,
        contract: 'apn-visual-fidelity-v4-clip',
        creative_approval: 'human_required',
        derivative_sets_per_asset: 1,
        encoding_evaluation: {
          application_status: 'required_for_selected_boundary',
          published_runtime_authority: 'per_clip_lossless_webp_atlas_only',
          selected_profile_id: 'lossless-webp',
          selected_profile_sha256: profileSha256,
          selection_authority_path: selectionAuthority.path,
          selection_authority_sha256: selectionAuthority.sha256,
          status: 'selected',
        },
        fps,
        frame_count: frameCount,
        frames: prepackFrames,
        master_canvas: [512, 512],
        network_calls: 0,
        playback,
        pre_root_persisted: false,
        provider_calls: 0,
        render_strategy: 'native-arbitrary-canvas-v3-track-v1',
        revision: 'authored-semantic-v4',
        root_authority: 'sealed_v3_producer_root_and_pivot',
        runtime_density: consumerFacts.runtime,
        runtime_measurement: {
          derivative_canvas: [consumerFacts.runtime, consumerFacts.runtime],
          device_pixel_ratio: 2,
          displayed_device_pixels: consumerFacts.css * 2,
          fail_closed_density_upgrade: false,
          master_visible_bounds: [trim.x, trim.y, trim.x + trim.width, trim.y + trim.height],
          master_visible_pixels: sourceVisiblePixels * 2,
          scale_ratio_denominator: sourceVisiblePixels,
          scale_ratio_numerator: consumerFacts.css * 2,
          scale_ratio_ppm: Math.round((consumerFacts.css * 2 * 1_000_000) / sourceVisiblePixels),
          source_canvas: [512, 512],
          source_visible_bounds: [trim.x, trim.y, trim.x + trim.width, trim.y + trim.height],
          source_visible_pixels: sourceVisiblePixels,
          upscale: false,
        },
        runtime_profile: {
          density: consumerFacts.runtime,
          maximum_css_body_height: consumerFacts.css,
          role: consumerFacts.consumerRole,
        },
        schema_version: 1,
        source_authority: {
          pivot_ppm_canvas: [500000, 500000],
          v3_acting_contract_sha256: sha256(fs.readFileSync(path.join(root, ACTING_CONTRACT_RELATIVE))),
          v3_batch_summary_path: 'motion/authored-semantic-v3/batch-summary.json',
          v3_batch_summary_sha256: v3BatchSha256,
          v3_clip_manifest_path: sourceAuthority.clip_manifest_path,
          v3_clip_manifest_sha256: sourceAuthority.clip_manifest_sha256,
          v3_pose_authority_path: sourceAuthority.pose_authority_path,
          v3_pose_authority_sha256: sourceAuthority.pose_authority_sha256,
          v3_pose_manifest_path: sourceAuthority.pose_manifest_path,
          v3_pose_manifest_sha256: sourceAuthority.pose_manifest_sha256,
          v3_producer_clip_manifest_path: sourceAuthority.producer_clip_manifest_path,
          v3_producer_clip_manifest_sha256: sourceAuthority.producer_clip_manifest_sha256,
          v3_transform_timeline_sha256: timelineSha256,
        },
      };
      lineageFragments.push({
        clip_id: clipName,
        source_authority: prepackManifest.source_authority,
      });
      const prepackManifestSha256 = sha256(jsonBytes(prepackManifest));
      const packEvidence = {
        asset_id: spec.assetId,
        authority_status: 'unapproved_candidate',
        clip_id: clipName,
        contract: 'apn-visual-fidelity-v4-clip-pack-evidence-v1',
        creative_approval: 'human_required',
        mechanical_evidence: mechanicalEvidence,
        prepack_manifest: prepackManifest,
        prepack_manifest_sha256: prepackManifestSha256,
        prepack_runtime_pngs_published: false,
        provider_calls: 0,
        schema_version: 1,
      };
      const evidenceRelative = `${spec.assetId}/clips/${clipName}/evidence.json`;
      const evidenceRecord = writeV4(evidenceRelative, jsonBytes(packEvidence));
      const mediaRelative = `${spec.assetId}/clips/${clipName}/derivative/lossless.webp`;
      const mediaRecord = writeV4(mediaRelative, sharedWebpBytes);
      const consumerScale = {
        grammar: 'gaf2d-consumer-scale-v4',
        role: consumerFacts.consumerRole,
        maximum_css_body_height: consumerFacts.css,
        maximum_dpr_numerator: 2,
        maximum_dpr_denominator: 1,
        displayed_device_pixels: consumerFacts.css * 2,
        runtime_canvas_class: consumerFacts.runtime,
        source_visible_pixels: sourceVisiblePixels,
        scale_ratio: {
          numerator: consumerFacts.css * 2,
          denominator: sourceVisiblePixels,
        },
      };
      consumerScales.push(consumerScale);
      const descriptor = {
        asset_id: spec.assetId,
        authority_status: 'unapproved_candidate',
        clip_id: clipName,
        contract: 'apn-visual-fidelity-v4-clip-descriptor-v1',
        consumer_scale: consumerScale,
        creative_approval: 'human_required',
        evidence: {
          path: evidenceRelative,
          sha256: evidenceRecord.sha256,
        },
        frames: descriptorFrames,
        master_inventory_sha256: authorityHash(
          'gaf2d:apn-v4-master-inventory-v1',
          masterInventory,
        ),
        media: {
          alpha_byte_exact: true,
          decoded_bytes: sharedDecodedBytes,
          decoded_canvas: sharedDecodedCanvas,
          decoded_canonical_rgba_sha256: sha256(
            Buffer.from(`decoded-canonical:${spec.assetId}:${clipName}`),
          ),
          decoded_rgba_byte_exact: true,
          encoded_bytes: sharedWebpBytes.length,
          file_sha256: mediaRecord.sha256,
          path: mediaRelative,
          transparent_rgb_zero: true,
        },
        packing: {
          matrix,
          scale_ppm: 1_000_000,
          shared_pivot: {
            runtime_canvas_pixels: runtimePivot,
            trimmed_cell_pixels: [runtimePivot[0] - trim.x, runtimePivot[1] - trim.y],
          },
          source_pivot_ppm_canvas: [500000, 500000],
          source_trim: trim,
        },
        prepack_manifest_sha256: prepackManifestSha256,
        profile: {
          arguments: ['-quiet', '-exact', '-lossless', '-q', '100', '-m', '6'],
          decode_argv_template: [
            'dwebp',
            '-quiet',
            '{candidate_webp}',
            '-o',
            '{decoded_png}',
          ],
          decoder: {
            name: 'dwebp',
            version: '1.6.0',
          },
          encode_argv_template: [
            'cwebp',
            '-quiet',
            '-exact',
            '-lossless',
            '-q',
            '100',
            '-m',
            '6',
            '{atlas_png}',
            '-o',
            '{candidate_webp}',
          ],
          encoder: {
            name: 'cwebp',
            version: '1.6.0',
          },
          profile_id: 'lossless-webp',
          profile_sha256: profileSha256,
          selection_authority_path: selectionAuthority.path,
          selection_authority_sha256: selectionAuthority.sha256,
        },
        runtime_canvas: [consumerFacts.runtime, consumerFacts.runtime],
        runtime_frame_inventory_sha256: authorityHash(
          'gaf2d:apn-v4-runtime-frame-inventory-v1',
          runtimeInventory,
        ),
        runtime_profile: prepackManifest.runtime_profile,
        schema_version: 1,
        semantic: {
          fps,
          frame_count: frameCount,
          frame_order: clipFrames,
          playback,
        },
        source_authority: prepackManifest.source_authority,
      };
      const descriptorRelative = `${spec.assetId}/clips/${clipName}/descriptor.json`;
      const descriptorRecord = writeV4(descriptorRelative, jsonBytes(descriptor));
      clipBindings.push({
        clip_id: clipName,
        descriptor_path: descriptorRelative,
        descriptor_sha256: descriptorRecord.sha256,
        fps,
        frame_count: frameCount,
        media_file_sha256: mediaRecord.sha256,
        media_path: mediaRelative,
        playback,
      });
      semanticClipOrder.push({ clip_id: clipName, fps, frame_count: frameCount, playback });
      masterFragments.push({
        clip_id: clipName,
        frame_count: frameCount,
        master_inventory_sha256: descriptor.master_inventory_sha256,
      });
    }
    const minVisible = Math.min(...consumerScales.map((value) => value.source_visible_pixels));
    const derivativeSet = {
      asset_id: spec.assetId,
      authority_status: 'unapproved_candidate',
      clip_count: clipBindings.length,
      clips: clipBindings,
      contract: 'apn-visual-fidelity-v4-derivative-set-v1',
      consumer_scale: {
        ...consumerScales[0],
        source_visible_pixels: minVisible,
        scale_ratio: {
          numerator: consumerScales[0].displayed_device_pixels,
          denominator: minVisible,
        },
      },
      creative_approval: 'human_required',
      frame_count: spec.clips.reduce((sum, clip) => sum + clip[1], 0),
      master_set_sha256: authorityHash(
        'gaf2d:apn-v4-master-set-v1',
        masterFragments,
      ),
      profile: {
        profile_id: 'lossless-webp',
        profile_sha256: profileSha256,
        selection_authority_path: selectionAuthority.path,
        selection_authority_sha256: selectionAuthority.sha256,
      },
      runtime_density: consumerFacts.runtime,
      schema_version: 1,
      semantic_clip_order: semanticClipOrder,
      v3_lineage_sha256: authorityHash(
        'gaf2d:apn-v4-asset-v3-lineage-v1',
        lineageFragments,
      ),
    };
    const derivativeSetRelative = `${spec.assetId}/derivative-set.json`;
    const derivativeSetRecord = writeV4(derivativeSetRelative, jsonBytes(derivativeSet));
    assetSets.push({
      asset_id: spec.assetId,
      clip_count: derivativeSet.clip_count,
      frame_count: derivativeSet.frame_count,
      master_set_sha256: derivativeSet.master_set_sha256,
      path: derivativeSetRelative,
      sha256: derivativeSetRecord.sha256,
    });
  }
  write(
    root,
    'motion/authored-semantic-v4/batch-summary.json',
    jsonBytes({
      asset_count: assetSets.length,
      asset_sets: assetSets,
      atomic_publish: true,
      authority_status: 'unapproved_candidate',
      batch_inventory_sha256: authorityHash(
        'gaf2d:apn-v4-selected-batch-v1',
        assetSets,
      ),
      clip_count: 39,
      clip_descriptor_count: 39,
      clip_evidence_count: 39,
      clip_webp_atlas_count: 39,
      contract: 'apn-visual-fidelity-v4-batch-v1',
      creative_approval: 'human_required',
      derivative_set_count: 7,
      dry_run: false,
      frame_count: 795,
      fresh_output_required: true,
      master_png_count: 795,
      materialization_scope: 'exact_full_7_39_795',
      network_calls: 0,
      output_path: 'motion/authored-semantic-v4',
      overwrite: false,
      per_frame_runtime_png_published: false,
      profile: {
        profile_id: 'lossless-webp',
        profile_sha256: profileSha256,
        selection_authority_path: selectionAuthority.path,
        selection_authority_sha256: selectionAuthority.sha256,
      },
      provider_calls: 0,
      root_application_count: 795,
      schema_version: 1,
      source_authority: {
        acting_contract_sha256: sha256(fs.readFileSync(path.join(root, ACTING_CONTRACT_RELATIVE))),
        asset_authorities: assetAuthorities,
        batch_summary_path: 'motion/authored-semantic-v3/batch-summary.json',
        batch_summary_sha256: v3BatchSha256,
        encoding_selection_path: selectionAuthority.path,
        encoding_selection_sha256: selectionAuthority.sha256,
        revision: 'authored-semantic-v3',
        v4_contract_path: contractAuthority.path,
        v4_contract_sha256: contractAuthority.sha256,
      },
    }),
  );
}

function refreshV4AssetHashes(root, assetId) {
  const v4Root = path.join(root, 'motion/authored-semantic-v4');
  const setFile = path.join(v4Root, assetId, 'derivative-set.json');
  const set = JSON.parse(fs.readFileSync(setFile, 'utf8'));
  const descriptors = new Map(
    set.clips.map((clip) => [
      clip.clip_id,
      JSON.parse(
        fs.readFileSync(path.join(v4Root, clip.descriptor_path), 'utf8'),
      ),
    ]),
  );
  set.master_set_sha256 = authorityHash(
    'gaf2d:apn-v4-master-set-v1',
    set.clips.map((clip) => ({
      clip_id: clip.clip_id,
      frame_count: clip.frame_count,
      master_inventory_sha256:
        descriptors.get(clip.clip_id).master_inventory_sha256,
    })),
  );
  set.v3_lineage_sha256 = authorityHash(
    'gaf2d:apn-v4-asset-v3-lineage-v1',
    set.clips.map((clip) => ({
      clip_id: clip.clip_id,
      source_authority: descriptors.get(clip.clip_id).source_authority,
    })),
  );
  fs.writeFileSync(setFile, jsonBytes(set));
  const setSha256 = sha256(fs.readFileSync(setFile));
  const batchFile = path.join(v4Root, 'batch-summary.json');
  const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
  const assetSet = batch.asset_sets.find((entry) => entry.asset_id === assetId);
  assetSet.sha256 = setSha256;
  batch.batch_inventory_sha256 = authorityHash(
    'gaf2d:apn-v4-selected-batch-v1',
    batch.asset_sets,
  );
  fs.writeFileSync(batchFile, jsonBytes(batch));
}

function fakeDerivatives(options = {}) {
  return {
    inspectFrame(file) {
      const smooth = file.includes(
        `${path.sep}motion${path.sep}authored-semantic-v3${path.sep}`,
      );
      return {
        width: smooth ? 128 : 640,
        height: smooth ? 128 : 640,
        trim: smooth
          ? { x: 24, y: 16, width: 80, height: 104 }
          : { x: 176, y: 128, width: 128, height: 192 },
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
      const requestedBytes = options.imageSizeFor?.({
        frameIds,
        outputName,
        staged,
      });
      const webpBytes = Number.isInteger(requestedBytes)
        ? Buffer.alloc(requestedBytes, 0x5a)
        : Buffer.from(
            `synthetic-webp:${frameIds.join(',')}:${matrix.width}x${matrix.height}`,
          );
      const webp = path.join(staged, outputName);
      fs.writeFileSync(webp, webpBytes);
      const webpDimensions =
        options.dimensionsFor?.({
          frameIds,
          outputName,
          staged,
        }) ?? {
          width: matrix.width,
          height: matrix.height,
        };
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
        webpDimensions,
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

function buildRejects(options, expectedMessage) {
  try {
    buildGaf2dPreview(options);
    return false;
  } catch (error) {
    return error.message.includes(expectedMessage);
  }
}

function rewriteSmoothEvidence(root, assetId, kind, mutate) {
  const candidateId = `${assetId}-authored-semantic-v3`;
  const candidateRelative =
    `assets/${assetId}/review/motion-set/${candidateId}/candidate.json`;
  const manifestRelative = `assets/${assetId}/asset.json`;
  const candidate = JSON.parse(
    fs.readFileSync(path.join(root, candidateRelative), 'utf8'),
  );
  const evidenceRelative =
    kind === 'temporal'
      ? candidate.temporal_evidence_path
      : candidate.review_evidence_path;
  const evidence = JSON.parse(
    fs.readFileSync(path.join(root, evidenceRelative), 'utf8'),
  );
  mutate(evidence);
  const evidenceRecord = write(root, evidenceRelative, jsonBytes(evidence));
  let reboundReviewRecord = null;
  if (kind === 'temporal') {
    candidate.temporal_evidence_sha256 = evidenceRecord.sha256;
    const review = JSON.parse(
      fs.readFileSync(
        path.join(root, candidate.review_evidence_path),
        'utf8',
      ),
    );
    review.diagnostics.temporal_evidence_sha256 =
      evidenceRecord.sha256;
    reboundReviewRecord = write(
      root,
      candidate.review_evidence_path,
      jsonBytes(review),
    );
    candidate.review_evidence_sha256 =
      reboundReviewRecord.sha256;
  } else {
    candidate.review_evidence_sha256 = evidenceRecord.sha256;
  }
  const candidateRecord = write(
    root,
    candidateRelative,
    jsonBytes(candidate),
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, manifestRelative), 'utf8'),
  );
  manifest.artifacts.motion_set_candidate.sha256 =
    candidateRecord.sha256;
  const artifactKey = kind === 'temporal'
    ? 'motion_set_temporal_evidence'
    : 'motion_set_review_evidence';
  manifest.artifacts[artifactKey].sha256 = evidenceRecord.sha256;
  if (reboundReviewRecord) {
    manifest.artifacts.motion_set_review_evidence.sha256 =
      reboundReviewRecord.sha256;
  }
  write(root, manifestRelative, jsonBytes(manifest));
}

function rewriteSmoothQaClip(root, assetId, clipName, mutate) {
  const qaRelative =
    `motion/authored-semantic-v3/${assetId}/qa-summary.json`;
  const batchRelative =
    'motion/authored-semantic-v3/batch-summary.json';
  const qa = JSON.parse(
    fs.readFileSync(path.join(root, qaRelative), 'utf8'),
  );
  mutate(qa.clips[clipName]);
  const qaRecord = write(root, qaRelative, jsonBytes(qa));
  const batch = JSON.parse(
    fs.readFileSync(path.join(root, batchRelative), 'utf8'),
  );
  const batchAsset = batch.assets.find(
    (asset) => asset.asset_id === assetId,
  );
  batchAsset.qa_summary_sha256 = qaRecord.sha256;
  write(root, batchRelative, jsonBytes(batch));
}

function rewriteNearFullHold(root) {
  const assetId = 'entry-runner';
  const clipName = 'death';
  const candidateId = `${assetId}-authored-semantic-v3`;
  const candidateRelative =
    `assets/${assetId}/review/motion-set/${candidateId}/candidate.json`;
  const manifestRelative = `assets/${assetId}/asset.json`;
  const batchRelative =
    'motion/authored-semantic-v3/batch-summary.json';
  const clipManifestRelative =
    `motion/authored-semantic-v3/${assetId}/clip-manifest.json`;
  const frameHashesRelative =
    `motion/authored-semantic-v3/${assetId}/frame-hashes.json`;
  const qaRelative =
    `motion/authored-semantic-v3/${assetId}/qa-summary.json`;
  const candidate = JSON.parse(
    fs.readFileSync(path.join(root, candidateRelative), 'utf8'),
  );
  const clip = candidate.clips[clipName];
  const hold = {
    start_index: 0,
    end_index: clip.frame_ids.length - 2,
    reason: 'terminal',
  };
  clip.holds = [hold];

  const frameHashes = JSON.parse(
    fs.readFileSync(path.join(root, frameHashesRelative), 'utf8'),
  );
  const heldBytes = Buffer.from(
    `synthetic-frame:${assetId}:${clipName}-000`,
  );
  const heldSha256 = sha256(heldBytes);
  for (let index = 1; index <= hold.end_index; index += 1) {
    const frameId = clip.frame_ids[index];
    write(
      root,
      `motion/authored-semantic-v3/${assetId}/frames/${frameId}.png`,
      heldBytes,
    );
    candidate.frames.find(
      (frame) => frame.frame_id === frameId,
    ).sha256 = heldSha256;
    frameHashes.frames[frameId] = heldSha256;
  }
  const frameHashesRecord = write(
    root,
    frameHashesRelative,
    jsonBytes(frameHashes),
  );

  const clipManifest = JSON.parse(
    fs.readFileSync(path.join(root, clipManifestRelative), 'utf8'),
  );
  clipManifest.clips[clipName].holds = [hold];
  const clipManifestRecord = write(
    root,
    clipManifestRelative,
    jsonBytes(clipManifest),
  );

  const temporal = JSON.parse(
    fs.readFileSync(
      path.join(root, candidate.temporal_evidence_path),
      'utf8',
    ),
  );
  const temporalClip = temporal.clips.find(
    (record) => record.clip_name === clipName,
  );
  temporalClip.holds = [hold];
  for (let index = 1; index <= hold.end_index; index += 1) {
    temporalClip.frames[index].sha256 = heldSha256;
  }
  const evidence = temporalClip.evidence;
  const transitionCount = clip.frame_ids.length - 1;
  const activeBodySha256 = sha256(
    Buffer.from(`body:${assetId}:${clipName}:0`),
  );
  const activePixelSha256 = sha256(
    Buffer.from(`pixel:${assetId}:${clipName}:0`),
  );
  evidence.declared_hold_ranges = [
    [hold.start_index, hold.end_index],
  ];
  evidence.frame_pixel_sha256 = Array.from(
    { length: clip.frame_ids.length },
    (_, index) =>
      index <= hold.end_index
        ? activePixelSha256
        : sha256(Buffer.from(`pixel:${assetId}:${clipName}:${index}`)),
  );
  evidence.aligned_body_sha256 = Array.from(
    { length: clip.frame_ids.length },
    (_, index) =>
      index <= hold.end_index
        ? activeBodySha256
        : sha256(Buffer.from(`body:${assetId}:${clipName}:${index}`)),
  );
  evidence.distinct_pose_count = 2;
  evidence.distinct_pose_rate = clip.fps;
  evidence.pose_distances = Array.from(
    { length: transitionCount },
    (_, index) => (index === transitionCount - 1 ? 0.05 : 0),
  );
  evidence.motion_distances = [...evidence.pose_distances];
  evidence.adjacent_body_differences = [...evidence.pose_distances];
  evidence.median_adjacent_body_difference = 0;
  evidence.maximum_adjacent_body_difference = 0.05;
  evidence.velocity_ratios = Array.from(
    { length: transitionCount },
    (_, index) => (index === transitionCount - 1 ? 1 : 0),
  );
  evidence.maximum_velocity_ratio = 1;
  evidence.acceleration_ratios = Array.from(
    { length: transitionCount - 1 },
    () => 0,
  );
  evidence.maximum_acceleration_ratio = 0;
  const temporalRecord = write(
    root,
    candidate.temporal_evidence_path,
    jsonBytes(temporal),
  );
  candidate.temporal_evidence_sha256 = temporalRecord.sha256;

  const review = JSON.parse(
    fs.readFileSync(
      path.join(root, candidate.review_evidence_path),
      'utf8',
    ),
  );
  review.diagnostics.temporal_evidence_sha256 =
    temporalRecord.sha256;
  const reviewRecord = write(
    root,
    candidate.review_evidence_path,
    jsonBytes(review),
  );
  candidate.review_evidence_sha256 = reviewRecord.sha256;

  const qa = JSON.parse(
    fs.readFileSync(path.join(root, qaRelative), 'utf8'),
  );
  const qaClip = qa.clips[clipName];
  qaClip.holds = [hold];
  qaClip.declared_hold_transition_targets = Array.from(
    { length: hold.end_index - hold.start_index },
    (_, index) => index + 1,
  );
  qaClip.body_pose_sha256 = [
    ...evidence.aligned_body_sha256,
  ];
  qaClip.distinct_body_pose_count = evidence.distinct_pose_count;
  qaClip.distinct_body_pose_rate = evidence.distinct_pose_rate;
  qaClip.raster_temporal = { ...evidence, passed: true };
  const qaRecord = write(root, qaRelative, jsonBytes(qa));
  const candidateRecord = write(
    root,
    candidateRelative,
    jsonBytes(candidate),
  );

  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, manifestRelative), 'utf8'),
  );
  manifest.artifacts.motion_set_candidate.sha256 =
    candidateRecord.sha256;
  manifest.artifacts.motion_set_review_evidence.sha256 =
    reviewRecord.sha256;
  manifest.artifacts.motion_set_temporal_evidence.sha256 =
    temporalRecord.sha256;
  write(root, manifestRelative, jsonBytes(manifest));

  const batch = JSON.parse(
    fs.readFileSync(path.join(root, batchRelative), 'utf8'),
  );
  const batchAsset = batch.assets.find(
    (record) => record.asset_id === assetId,
  );
  batchAsset.clip_manifest_sha256 = clipManifestRecord.sha256;
  batchAsset.frame_hashes_sha256 = frameHashesRecord.sha256;
  batchAsset.qa_summary_sha256 = qaRecord.sha256;
  write(root, batchRelative, jsonBytes(batch));
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
    sourceFamily: 'authored-semantic-v2',
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
  const defaulted = buildGaf2dPreview({
    gaf2dProjectRoot: sourceRoot,
    outputRoot: path.join(smoothTemporaryRoot, 'game', '.gaf2d-preview-default'),
    derivatives: fakeDerivatives(),
  });
  assert(
    defaulted.passed === true &&
      JSON.stringify(defaulted.counts) ===
        JSON.stringify({ assets: 7, clips: 39, frames: 795 }),
    'preview builder defaults to the current authored-semantic-v3 batch',
  );
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
  const opaqueQaSource = path.join(
    smoothTemporaryRoot,
    'opaque-producer-qa-source',
  );
  createSource(opaqueQaSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  rewriteSmoothEvidence(
    opaqueQaSource,
    'apn-hero',
    'temporal',
    (evidence) => {
      evidence.pose_authority_path =
        'work/manual/motion/fixture/producer-v2-authority';
      evidence.pose_authority_sha256 = 'f'.repeat(64);
      const temporalClip = evidence.clips.find(
        (clip) => clip.clip_name === 'idle',
      );
      temporalClip.producer_owned_future_clip_field = true;
      temporalClip.frames[0].producer_owned_future_frame_field = true;
      const raster = temporalClip.evidence;
      raster.producer_owned_future_evidence = {
        schema_version: 99,
      };
      raster.cadence_basis = 'producer-owned-fixture-v2';
      raster.pose_distances[0] = 0.001;
      raster.adjacent_body_differences[0] = 0.001;
      raster.median_adjacent_body_difference = median(
        raster.adjacent_body_differences,
      );
      raster.maximum_adjacent_body_difference = Math.max(
        ...raster.adjacent_body_differences,
      );
      raster.velocity_ratios[0] = 1.5;
      raster.maximum_velocity_ratio = Math.max(
        ...raster.velocity_ratios,
      );
    },
  );
  rewriteSmoothQaClip(
    opaqueQaSource,
    'apn-hero',
    'idle',
    (qaClip) => {
      qaClip.full_pose_sha256 = [...qaClip.body_pose_sha256];
      qaClip.sampling_profile = 'producer-owned-fixture-v1';
      qaClip.secondary_action = {
        future_profile_fact: true,
      };
      qaClip.semantic_transform_seam = {
        passed: true,
      };
      qaClip.transform_seam = {
        passed: true,
      };
      qaClip.transform_timeline_sha256 = 'e'.repeat(64);
      qaClip.producer_owned_future_field = {
        schema_version: 99,
      };
      qaClip.body_pose_sha256[0] = 'c'.repeat(64);
      qaClip.raster_temporal.producer_owned_future_evidence = {
        schema_version: 100,
      };
      qaClip.raster_temporal.cadence_basis =
        'producer-owned-fixture-v2';
      qaClip.raster_temporal.pose_distances[0] = 0.001;
      qaClip.raster_temporal.adjacent_body_differences[0] = 0.001;
      qaClip.raster_temporal.median_adjacent_body_difference = median(
        qaClip.raster_temporal.adjacent_body_differences,
      );
      qaClip.raster_temporal.maximum_adjacent_body_difference = Math.max(
        ...qaClip.raster_temporal.adjacent_body_differences,
      );
      qaClip.raster_temporal.velocity_ratios[0] = 1.5;
      qaClip.raster_temporal.maximum_velocity_ratio = Math.max(
        ...qaClip.raster_temporal.velocity_ratios,
      );
    },
  );
  const opaqueQaOutput = path.join(
    smoothTemporaryRoot,
    'opaque-producer-qa-output',
  );
  let opaqueQaFailure = null;
  let opaqueQaPassed = false;
  try {
    opaqueQaPassed = buildGaf2dPreview({
      ...options,
      gaf2dProjectRoot: opaqueQaSource,
      outputRoot: opaqueQaOutput,
    }).passed === true;
  } catch (error) {
    opaqueQaFailure = error;
  }
  assert(
    opaqueQaPassed,
    'V3 preview accepts hash-bound opaque producer-owned QA extensions' +
      (opaqueQaFailure ? `: ${opaqueQaFailure.message}` : ''),
  );
  assert(
    JSON.parse(
      fs.readFileSync(
        path.join(opaqueQaOutput, 'hero', 'idle.json'),
        'utf8',
      ),
    ).frames[0].bodyPoseSha256 === 'c'.repeat(64),
    'V3 preview preserves the producer-owned cadence-body hash in runtime descriptors',
  );
  const missingQaSource = path.join(
    smoothTemporaryRoot,
    'missing-consumer-qa-source',
  );
  createSource(missingQaSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  rewriteSmoothQaClip(
    missingQaSource,
    'apn-hero',
    'idle',
    (qaClip) => {
      delete qaClip.frame_count;
    },
  );
  assert(
    buildRejects(
      {
        ...options,
        gaf2dProjectRoot: missingQaSource,
        outputRoot: path.join(
          smoothTemporaryRoot,
          'missing-consumer-qa-output',
        ),
      },
      'must contain required consumer keys',
    ),
    'V3 preview still rejects a missing consumer-owned QA field',
  );
  const smoothTransforms = [
    manifest.hero.transform,
    ...Object.values(manifest.characters).map(
      (character) => character.transform,
    ),
  ];
  assert(
    smoothTransforms.every(
      (transform) =>
        transform.scalePpm === 1_000_000 &&
        transform.sourceFrameSize.width === 128 &&
        transform.sourceFrameSize.height === 128 &&
        transform.runtimeFrameSize.width === 128 &&
        transform.runtimeFrameSize.height === 128,
    ),
    'V3 preview consumes the canonical 128px source without upscaling',
  );
  const staleCanvasSource = path.join(
    smoothTemporaryRoot,
    'stale-v2-canvas-source',
  );
  createSource(staleCanvasSource, {
    sourceFamily: 'authored-semantic-v3',
    canvasSize: 640,
  });
  assert(
    buildRejects(
      {
        ...options,
        gaf2dProjectRoot: staleCanvasSource,
        outputRoot: path.join(
          smoothTemporaryRoot,
          'stale-v2-canvas-output',
        ),
      },
      'candidate canvas must be 128x128',
    ),
    'V3 preview rejects the historical 640px V2 canvas before derivative work',
  );
  const actingContractSha256 = sha256(
    fs.readFileSync(ACTING_CONTRACT_FILE),
  );
  const previewBuilderSource = fs.readFileSync(
    PREVIEW_BUILDER_FILE,
    'utf8',
  );
  assert(
    !previewBuilderSource.includes('ACTING_SECONDARY_ACTION_PROFILES') &&
      !previewBuilderSource.includes('ACTING_CONTRACT_TOP_KEYS') &&
      !previewBuilderSource.includes('ACTING_ASSET_KEYS') &&
      !previewBuilderSource.includes('ACTING_CLIP_KEYS') &&
      !previewBuilderSource.includes('verifyActingClipBinding') &&
      !previewBuilderSource.includes('authority.value.assets') &&
      !previewBuilderSource.includes(
        'secondary_action profile is not canonical',
      ) &&
      !previewBuilderSource.includes(
        'clamped_c2_progress_all_controls_s0_1_2_3_4_5_6_o0_4_8_12_17_21_25_terminal_hold_v1',
      ),
    'preview consumer hash-binds acting authority without parsing producer-owned semantics',
  );
  assert(
    actingContractSha256 ===
        '976700bb8168f8f3113625674785b0c56eea13b8d4fcb1e73002f4729a2bb8e2' &&
      manifest.source.actingContractPath ===
        ACTING_CONTRACT_RELATIVE &&
      manifest.source.actingContractSha256 ===
        actingContractSha256 &&
      Object.values(manifest.assets).every(
        (asset) =>
          asset.actingContractSha256 ===
          actingContractSha256,
      ),
    'V3 preview lineage hash-binds the repo-versioned acting contract',
  );
  assert(
    JSON.stringify(Object.keys(manifest.budgets).sort()) ===
      JSON.stringify([
        'heroCompressed',
        'hotTextures',
        'maxWaveDecoded',
        'newMotionCompressed',
      ]) &&
      manifest.budgets.heroCompressed.limit === 640 * 1024 &&
      manifest.budgets.newMotionCompressed.limit ===
        3.5 * 1024 * 1024 &&
      manifest.budgets.maxWaveDecoded.limit === 32 * 1024 * 1024 &&
      manifest.budgets.hotTextures.limit === 64 * 1024 * 1024 &&
      Object.values(manifest.budgets).every(
        (entry) => entry.bytes <= entry.limit,
      ) &&
      !Object.hasOwn(manifest.budgets, 'firstPlayable') &&
      first.budgets.heroCompressed <= 640 * 1024 &&
      first.budgets.newMotionCompressed <=
        3.5 * 1024 * 1024 &&
      first.budgets.firstPlayable < 5 * 1024 * 1024 - 1 &&
      first.budgets.maxWaveDecoded <= 32 * 1024 * 1024 &&
      first.budgets.hotTextures < 64 * 1024 * 1024 &&
      manifest.budgets.heroCompressed.bytes ===
        first.budgets.heroCompressed &&
      manifest.budgets.newMotionCompressed.bytes ===
        first.budgets.newMotionCompressed &&
      manifest.budgets.maxWaveDecoded.bytes ===
        first.budgets.maxWaveDecoded &&
      manifest.budgets.hotTextures.bytes ===
        first.budgets.hotTextures,
    'V3 output records the exact four-key compressed and decoded aggregate manifest budgets',
  );
  const heroResidentDecoded = Object.values(manifest.hero.clips).reduce(
    (sum, clip) => {
      const descriptor = JSON.parse(
        fs.readFileSync(
          path.join(
            outputRoot,
            clip.descriptor.replace(/^\.gaf2d-preview\//, ''),
          ),
          'utf8',
        ),
      );
      return sum + descriptor.atlas.width * descriptor.atlas.height * 4;
    },
    0,
  );
  const residentDecodedByAsset = new Map(
    Object.entries(manifest.characters).map(([assetId, character]) => [
      assetId,
      Object.values(character.clips).reduce((sum, clip) => {
        const descriptor = JSON.parse(
          fs.readFileSync(
            path.join(
              outputRoot,
              clip.descriptor.replace(/^\.gaf2d-preview\//, ''),
            ),
            'utf8',
          ),
        );
        return sum + descriptor.atlas.width * descriptor.atlas.height * 4;
      }, 0),
    ]),
  );
  const expectedMaxWaveDecoded = SMOOTH_WAVE_ASSETS.reduce(
    (maximum, currentWaveAssets, index) => {
      const nextWaveAssets =
        SMOOTH_WAVE_ASSETS[(index + 1) % SMOOTH_WAVE_ASSETS.length];
      const residentDecoded = [...new Set([...currentWaveAssets, ...nextWaveAssets])]
        .reduce(
          (sum, assetId) => sum + (residentDecodedByAsset.get(assetId) ?? 0),
          0,
        );
      return Math.max(maximum, residentDecoded);
    },
    0,
  );
  const expectedHotTextures = heroResidentDecoded + expectedMaxWaveDecoded;
  assert(
    manifest.budgets.maxWaveDecoded.bytes === expectedMaxWaveDecoded &&
      manifest.budgets.hotTextures.bytes === expectedHotTextures &&
      residentDecodedByAsset.get('entry-runner') >
        Math.max(
          ...Object.values(manifest.characters['entry-runner'].clips).map(
            (clip) => {
              const descriptor = JSON.parse(
                fs.readFileSync(
                  path.join(
                    outputRoot,
                    clip.descriptor.replace(/^\.gaf2d-preview\//, ''),
                  ),
                  'utf8',
                ),
              );
              return descriptor.atlas.width * descriptor.atlas.height * 4;
            },
          ),
        ),
    'V3 output budgets sum independently loadable same-asset creature clips for wave and hot decoded residency',
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
      entry.setSha256 === sha256(setBytes) &&
      set.previewLineage.temporalEvidenceSha256 ===
        manifest.assets['entry-runner'].temporalEvidenceSha256 &&
      set.frameSize.width === entry.transform.runtimeFrameSize.width &&
      set.frameSize.height === entry.transform.runtimeFrameSize.height &&
      set.trim.width === entry.transform.runtimeTrim.width &&
      set.trim.height === entry.transform.runtimeTrim.height,
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
  {
    const runtime = createBuiltPreviewMotionHarness(outputRoot, manifest);
    const expectedSet = JSON.parse(
      fs.readFileSync(
        path.join(outputRoot, 'characters', 'entry-runner', 'set.json'),
        'utf8',
      ),
    );
    const warmed = await warmMotionClip(
      runtime.store,
      runtime.pack,
      'entry-runner',
      'advance',
    );
    const syntheticEnemy = {
      id: 'preview-entry-runner',
      type: 'stale',
      label: 'Entry Runner',
      frame: 'common-a',
      x: 220,
      displayX: 220,
      hp: 10,
      hpMax: 10,
      deathT: 0,
      hurt: 0,
      killed: false,
      priorityTagRank: 0,
      packId: 'valorant',
    };
    const assetStore = { motionStore: runtime.store };
    const env = {
      meleeStop: false,
      engagedId: null,
      t: 1.25,
      timestamp: 1.25,
    };
    const actual = drawEnemy(
      createGeometryProbeContext(),
      syntheticEnemy,
      320,
      1.25,
      { pack: runtime.pack, ready: false },
      assetStore,
      false,
      1,
      {
        ...env,
        motionInfo: {
          status: 'ready',
          assetId: 'entry-runner',
          clip: 'advance',
          frameIndex: 0,
          record: warmed,
        },
      },
    );
    const expected = resolveActorGeometry({
      actorX: syntheticEnemy.displayX,
      groundY: 320,
      fit: 1,
      role: 'standard',
      frameSize: expectedSet.frameSize,
      trim: expectedSet.trim,
      pivot: expectedSet.pivot,
      presentation: expectedSet.presentation,
    });
    assert(
      warmed.status === 'ready' &&
        !Object.hasOwn(warmed.descriptor, 'presentation') &&
        Object.hasOwn(expectedSet, 'presentation') &&
        actual.anchors.hpY === expected.anchors.hpY &&
        actual.motionEnvelope.top === expected.motionEnvelope.top &&
        actual.drawTrimHeight === expected.drawTrimHeight,
      'built V3 set ownership flows through store and render using set-owned stage geometry',
    );
  }

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
      heroSet.previewLineage.temporalEvidenceSha256 ===
        manifest.assets['apn-hero'].temporalEvidenceSha256 &&
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
      wardenSet.previewLineage.temporalEvidenceSha256 ===
        manifest.assets['site-warden'].temporalEvidenceSha256 &&
      wardenSet.clips.broken.descriptorSha256 ===
        sha256(wardenBrokenBytes) &&
      wardenBroken.frames.length === 30 &&
      wardenBroken.fps === 30 &&
      wardenBroken.atlas.width * wardenBroken.atlas.height * 4 <=
        8 * 1024 * 1024 &&
      wardenBroken.atlas.bytes + wardenBrokenBytes.length <=
        240 * 1024,
    'Site Warden/broken preserves its exact 30@30 contract and boss budgets',
  );

  const temporalSource = path.join(
    smoothTemporaryRoot,
    'bad-temporal-source',
  );
  createSource(temporalSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  rewriteSmoothEvidence(
    temporalSource,
    'entry-runner',
    'temporal',
    (evidence) => {
      evidence.clips[0].evidence.loop_velocity_discontinuity = 0.251;
    },
  );
  assert(
    buildRejects(
      {
        ...options,
        gaf2dProjectRoot: temporalSource,
        outputRoot: path.join(
          smoothTemporaryRoot,
          'bad-temporal-output',
        ),
      },
      'loop velocity',
    ),
    'V3 builder rejects hash-consistent GAF evidence with a bad loop seam',
  );

  const temporalRejectCases = [
    {
      name: 'cadence',
      expectedMessage: 'cadence',
      mutate(evidence) {
        evidence.clips[0].evidence.distinct_pose_rate = 29.999;
      },
    },
    {
      name: 'indistinct',
      expectedMessage: 'indistinct pose ranges',
      mutate(evidence) {
        evidence.clips[0].evidence.indistinct_pose_ranges = [[0, 1]];
      },
    },
    {
      name: 'duplicate',
      expectedMessage: 'undeclared duplicate ranges',
      mutate(evidence) {
        evidence.clips[0].evidence.undeclared_duplicate_ranges = [[0, 1]];
      },
    },
    {
      name: 'spike',
      expectedMessage: 'velocity or acceleration spikes',
      mutate(evidence) {
        const temporal = evidence.clips[0].evidence;
        temporal.motion_distances[0] = 0.5;
        temporal.velocity_ratios[0] = 10;
        temporal.maximum_velocity_ratio = 10;
        temporal.velocity_spike_indices = [1];
        temporal.acceleration_ratios[0] = 1_000_000;
        temporal.maximum_acceleration_ratio = 1_000_000;
        temporal.acceleration_spike_indices = [2];
      },
    },
  ];
  for (const testCase of temporalRejectCases) {
    const rejectedSource = path.join(
      smoothTemporaryRoot,
      `bad-temporal-${testCase.name}-source`,
    );
    createSource(rejectedSource, {
      sourceFamily: 'authored-semantic-v3',
    });
    rewriteSmoothEvidence(
      rejectedSource,
      'entry-runner',
      'temporal',
      testCase.mutate,
    );
    assert(
      buildRejects(
        {
          ...options,
          gaf2dProjectRoot: rejectedSource,
          outputRoot: path.join(
            smoothTemporaryRoot,
            `bad-temporal-${testCase.name}-output`,
          ),
        },
        testCase.expectedMessage,
      ),
      `V3 builder rejects hash-consistent ${testCase.name} temporal evidence`,
    );
  }

  const reviewSource = path.join(
    smoothTemporaryRoot,
    'rejected-review-source',
  );
  createSource(reviewSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  rewriteSmoothEvidence(
    reviewSource,
    'entry-runner',
    'review',
    (evidence) => {
      evidence.reject_reasons = [
        "Temporal QA rejects clip 'idle': motion_temporal_invalid",
      ];
      evidence.diagnostics.temporal_qa_idle =
        'REJECT:motion_temporal_invalid';
    },
  );
  assert(
    buildRejects(
      {
        ...options,
        gaf2dProjectRoot: reviewSource,
        outputRoot: path.join(
          smoothTemporaryRoot,
          'rejected-review-output',
        ),
      },
      'review evidence',
    ),
    'V3 builder rejects hash-consistent review evidence with mechanical rejects',
  );

  const heroBudgetSource = path.join(
    smoothTemporaryRoot,
    'hero-budget-source',
  );
  createSource(heroBudgetSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  assert(
    buildRejects(
      {
        ...options,
        gaf2dProjectRoot: heroBudgetSource,
        outputRoot: path.join(
          smoothTemporaryRoot,
          'hero-budget-output',
        ),
        derivatives: fakeDerivatives({
          imageSizeFor: ({ staged }) =>
            staged.endsWith(`${path.sep}hero`) ? 100 * 1024 : 1024,
        }),
      },
      'Hero motion compressed',
    ),
    'V3 generated output rejects aggregate Hero WebP above 640 KiB',
  );

  const expandedAggregateSource = path.join(
    smoothTemporaryRoot,
    'expanded-aggregate-source',
  );
  createSource(expandedAggregateSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  const expandedAggregate = buildGaf2dPreview({
    ...options,
    gaf2dProjectRoot: expandedAggregateSource,
    outputRoot: path.join(
      smoothTemporaryRoot,
      'expanded-aggregate-output',
    ),
    derivatives: fakeDerivatives({
      imageSizeFor: () => 70 * 1024,
    }),
  });
  assert(
    expandedAggregate.passed === true &&
      expandedAggregate.budgets.newMotionCompressed >
        Math.floor(1.8 * 1024 * 1024) &&
      expandedAggregate.budgets.newMotionCompressed <=
        3.5 * 1024 * 1024,
    'V3 generated output accepts a realistic full-set fixture above the retired 1.8 MiB ceiling and within 3.5 MiB',
  );

  const aggregateBudgetSource = path.join(
    smoothTemporaryRoot,
    'aggregate-budget-source',
  );
  createSource(aggregateBudgetSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  assert(
    buildRejects(
      {
        ...options,
        gaf2dProjectRoot: aggregateBudgetSource,
        outputRoot: path.join(
          smoothTemporaryRoot,
          'aggregate-budget-output',
        ),
        derivatives: fakeDerivatives({
          imageSizeFor: ({ staged }) =>
            staged.endsWith(`${path.sep}hero`) ? 1024 : 120 * 1024,
        }),
      },
      'new motion compressed',
    ),
    'V3 generated output rejects WebP plus JSON above 3.5 MiB',
  );

  const hotBudgetSource = path.join(
    smoothTemporaryRoot,
    'hot-budget-source',
  );
  createSource(hotBudgetSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  assert(
    buildRejects(
      {
        ...options,
        gaf2dProjectRoot: hotBudgetSource,
        outputRoot: path.join(
          smoothTemporaryRoot,
          'hot-budget-output',
        ),
        derivatives: fakeDerivatives({
          dimensionsFor: () => ({
            width: 1024,
            height: 1536,
          }),
        }),
      },
      'current/next wave motion decoded',
    ),
    'V3 generated output rejects a decoded current/next-wave residency at 32 MiB or above',
  );

  const actingSource = path.join(
    smoothTemporaryRoot,
    'acting-contract-mismatch-source',
  );
  createSource(actingSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  const actingBatchPath = path.join(
    actingSource,
    'motion/authored-semantic-v3/batch-summary.json',
  );
  const actingBatch = JSON.parse(
    fs.readFileSync(actingBatchPath, 'utf8'),
  );
  actingBatch.acting_contract_path_base = 'project-root';
  actingBatch.acting_contract_path =
    'briefs/authored-semantic-v3/acting-contract.json';
  actingBatch.acting_contract_sha256 = '0'.repeat(64);
  fs.writeFileSync(actingBatchPath, jsonBytes(actingBatch));
  assert(
    buildRejects(
      {
        ...options,
        gaf2dProjectRoot: actingSource,
        outputRoot: path.join(
          smoothTemporaryRoot,
          'acting-contract-mismatch-output',
        ),
      },
      'acting contract',
    ),
    'V3 builder rejects a batch not bound to the canonical APN acting contract',
  );

  const holdLaunderingSource = path.join(
    smoothTemporaryRoot,
    'hold-laundering-source',
  );
  createSource(holdLaunderingSource, {
    sourceFamily: 'authored-semantic-v3',
  });
  rewriteNearFullHold(holdLaunderingSource);
  assert(
    buildRejects(
      {
        ...options,
        gaf2dProjectRoot: holdLaunderingSource,
        outputRoot: path.join(
          smoothTemporaryRoot,
          'hold-laundering-output',
        ),
      },
      'terminal hold must end at the final frame',
    ),
    'V3 builder rejects a fully hash-consistent near-full hold laundering attempt',
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

  const v4SourceRoot = path.join(
    smoothTemporaryRoot,
    'visual-fidelity-source',
  );
  const v4OutputRoot = path.join(
    smoothTemporaryRoot,
    'visual-fidelity-output',
    '.gaf2d-preview',
  );
  createSource(v4SourceRoot, {
    sourceFamily: 'authored-semantic-v4',
  });
  const v4Build = buildGaf2dPreview({
    gaf2dProjectRoot: v4SourceRoot,
    outputRoot: v4OutputRoot,
    sourceFamily: 'authored-semantic-v4',
  });
  const v4Manifest = JSON.parse(
    fs.readFileSync(path.join(v4OutputRoot, 'manifest.json'), 'utf8'),
  );
  const v4Entry = v4Manifest.characters['entry-runner'];
  const v4Set = JSON.parse(
    fs.readFileSync(
      path.join(v4OutputRoot, 'characters', 'entry-runner', 'set.json'),
      'utf8',
    ),
  );
  const v4Idle = JSON.parse(
    fs.readFileSync(
      path.join(v4OutputRoot, 'characters', 'entry-runner', 'idle.json'),
      'utf8',
    ),
  );
  const v4Hit = JSON.parse(
    fs.readFileSync(
      path.join(v4OutputRoot, 'characters', 'entry-runner', 'hit.json'),
      'utf8',
    ),
  );
  assert(
    v4Build.passed === true &&
      JSON.stringify(v4Build.counts) ===
        JSON.stringify({ assets: 7, clips: 39, frames: 795 }) &&
      v4Manifest.sourceFamily === 'authored-semantic-v4' &&
      v4Entry.consumerScale.sourceVisiblePixels === 156 &&
      v4Set.consumerScale.sourceVisiblePixels === 156 &&
      v4Set.presentation.reference.clip === 'idle' &&
      v4Set.presentation.visibleBounds.height === 160 &&
      v4Hit.presentation.visibleBounds.height === 156 &&
      v4Set.toolchain.operations[0] ===
        'validate:v4-selected-webp:hash-bound-source' &&
      v4Idle.trim.height !==
        JSON.parse(
          fs.readFileSync(
            path.join(v4OutputRoot, 'characters', 'entry-runner', 'advance.json'),
            'utf8',
          ),
        ).trim.height,
    'V4 preview build consumes the selected-only source profile with per-clip geometry and copy-only toolchain facts',
  );
  assert(
    fs.readFileSync(
      path.join(v4OutputRoot, 'characters', 'entry-runner', 'idle.webp'),
    ).equals(
      fs.readFileSync(
        path.join(
          v4SourceRoot,
          'motion/authored-semantic-v4/entry-runner/clips/idle/derivative/lossless.webp',
        ),
      ),
    ),
    'V4 preview copies the selected WebP bytes exactly with no reencode',
  );
  const v4HeroResidentDecoded = Object.values(v4Manifest.hero.clips)
    .map((clip) => {
      const descriptor = JSON.parse(
        fs.readFileSync(
          path.join(v4OutputRoot, clip.descriptor.replace(/^\.gaf2d-preview\//, '')),
          'utf8',
        ),
      );
      return descriptor.atlas.width * descriptor.atlas.height * 4;
    })
    .sort((left, right) => right - left)
    .slice(0, 2)
    .reduce((sum, value) => sum + value, 0);
  const v4ResidentDecodedByAsset = new Map(
    Object.entries(v4Manifest.characters).map(([assetId, character]) => [
      assetId,
      Object.values(character.clips)
        .map((clip) => {
          const descriptor = JSON.parse(
            fs.readFileSync(
              path.join(
                v4OutputRoot,
                clip.descriptor.replace(/^\.gaf2d-preview\//, ''),
              ),
              'utf8',
            ),
          );
          return descriptor.atlas.width * descriptor.atlas.height * 4;
        })
        .sort((left, right) => right - left)
        .slice(0, 2)
        .reduce((sum, value) => sum + value, 0),
    ]),
  );
  const v4ExpectedMaxWaveDecoded = SMOOTH_WAVE_ASSETS.reduce(
    (maximum, currentWaveAssets, index) => {
      const nextWaveAssets =
        SMOOTH_WAVE_ASSETS[(index + 1) % SMOOTH_WAVE_ASSETS.length];
      const residentDecoded = [...new Set([...currentWaveAssets, ...nextWaveAssets])]
        .reduce(
          (sum, assetId) => sum + (v4ResidentDecodedByAsset.get(assetId) ?? 0),
          0,
        );
      return Math.max(maximum, residentDecoded);
    },
    0,
  );
  assert(
    JSON.stringify(Object.keys(v4Manifest.budgets).sort()) ===
      JSON.stringify([
        'heroCompressed',
        'hotTextures',
        'maxWaveDecoded',
        'newMotionCompressed',
      ]) &&
      v4Manifest.budgets.heroCompressed.limit === 3.5 * 1024 * 1024 &&
      v4Manifest.budgets.newMotionCompressed.limit === 32 * 1024 * 1024 &&
      v4Manifest.budgets.maxWaveDecoded.limit === 48 * 1024 * 1024 &&
      v4Manifest.budgets.hotTextures.limit === 64 * 1024 * 1024 &&
      v4Build.budgets.heroCompressed === v4Manifest.budgets.heroCompressed.bytes &&
      v4Build.budgets.newMotionCompressed === v4Manifest.budgets.newMotionCompressed.bytes &&
      v4Build.budgets.maxWaveDecoded === v4ExpectedMaxWaveDecoded &&
      v4Manifest.budgets.maxWaveDecoded.bytes === v4ExpectedMaxWaveDecoded &&
      v4Manifest.budgets.hotTextures.bytes ===
        v4HeroResidentDecoded + v4ExpectedMaxWaveDecoded &&
      !Object.hasOwn(v4Build.budgets, 'firstPlayable'),
    'V4 output records selected-only compressed and decoded manifest budgets without first-playable carryover',
  );
  const tamperCases = [
    {
      name: 'set',
      message: 'derivative set',
      mutate(root) {
        const file = path.join(
          root,
          'motion/authored-semantic-v4/entry-runner/derivative-set.json',
        );
        const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        payload.consumer_scale.source_visible_pixels = 159;
        payload.consumer_scale.scale_ratio.denominator = 159;
        fs.writeFileSync(file, jsonBytes(payload));
      },
    },
    {
      name: 'descriptor',
      message: 'descriptor consumer scale',
      mutate(root) {
        const file = path.join(
          root,
          'motion/authored-semantic-v4/entry-runner/clips/idle/descriptor.json',
        );
        const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        payload.consumer_scale.source_visible_pixels = 159;
        payload.consumer_scale.scale_ratio.denominator = 159;
        fs.writeFileSync(file, jsonBytes(payload));
        const setFile = path.join(root, 'motion/authored-semantic-v4/entry-runner/derivative-set.json');
        const set = JSON.parse(fs.readFileSync(setFile, 'utf8'));
        set.clips.find((clip) => clip.clip_id === 'idle').descriptor_sha256 =
          sha256(fs.readFileSync(file));
        fs.writeFileSync(setFile, jsonBytes(set));
        refreshV4AssetHashes(root, 'entry-runner');
      },
    },
    {
      name: 'media',
      message: 'selected WebP media',
      mutate(root) {
        fs.writeFileSync(
          path.join(
            root,
            'motion/authored-semantic-v4/entry-runner/clips/idle/derivative/lossless.webp',
          ),
          Buffer.from('tampered-media'),
        );
      },
    },
    {
      name: 'evidence',
      message: 'clip evidence',
      mutate(root) {
        const file = path.join(
          root,
          'motion/authored-semantic-v4/entry-runner/clips/idle/evidence.json',
        );
        const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        payload.mechanical_evidence.mechanical_qa = 'tampered';
        fs.writeFileSync(file, jsonBytes(payload));
      },
    },
    {
      name: 'batch-inventory',
      message: 'batch inventory authority',
      mutate(root) {
        const file = path.join(
          root,
          'motion/authored-semantic-v4/batch-summary.json',
        );
        const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        payload.batch_inventory_sha256 = '0'.repeat(64);
        fs.writeFileSync(file, jsonBytes(payload));
      },
    },
    {
      name: 'batch-source-authority',
      message: 'contract/selection binding',
      mutate(root) {
        const file = path.join(
          root,
          'motion/authored-semantic-v4/batch-summary.json',
        );
        const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        payload.source_authority.v4_contract_sha256 = '0'.repeat(64);
        fs.writeFileSync(file, jsonBytes(payload));
      },
    },
    {
      name: 'descriptor-profile',
      message: 'V4 descriptor authority drifted',
      mutate(root) {
        const file = path.join(
          root,
          'motion/authored-semantic-v4/entry-runner/clips/idle/descriptor.json',
        );
        const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        payload.profile.decode_argv_template[0] = 'not-dwebp';
        fs.writeFileSync(file, jsonBytes(payload));
        const setFile = path.join(root, 'motion/authored-semantic-v4/entry-runner/derivative-set.json');
        const set = JSON.parse(fs.readFileSync(setFile, 'utf8'));
        set.clips.find((clip) => clip.clip_id === 'idle').descriptor_sha256 =
          sha256(fs.readFileSync(file));
        fs.writeFileSync(setFile, jsonBytes(set));
        refreshV4AssetHashes(root, 'entry-runner');
      },
    },
    {
      name: 'evidence-prepack',
      message: 'V4 prepack manifest authority drifted',
      mutate(root) {
        const evidenceFile = path.join(
          root,
          'motion/authored-semantic-v4/entry-runner/clips/idle/evidence.json',
        );
        const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
        evidence.prepack_manifest.encoding_evaluation.status = 'tampered';
        evidence.prepack_manifest_sha256 = sha256(jsonBytes(evidence.prepack_manifest));
        fs.writeFileSync(evidenceFile, jsonBytes(evidence));
        const descriptorFile = path.join(
          root,
          'motion/authored-semantic-v4/entry-runner/clips/idle/descriptor.json',
        );
        const descriptor = JSON.parse(fs.readFileSync(descriptorFile, 'utf8'));
        descriptor.prepack_manifest_sha256 = evidence.prepack_manifest_sha256;
        descriptor.evidence.sha256 = sha256(fs.readFileSync(evidenceFile));
        fs.writeFileSync(descriptorFile, jsonBytes(descriptor));
        const setFile = path.join(root, 'motion/authored-semantic-v4/entry-runner/derivative-set.json');
        const set = JSON.parse(fs.readFileSync(setFile, 'utf8'));
        set.clips.find((clip) => clip.clip_id === 'idle').descriptor_sha256 =
          sha256(fs.readFileSync(descriptorFile));
        fs.writeFileSync(setFile, jsonBytes(set));
        refreshV4AssetHashes(root, 'entry-runner');
      },
    },
  ];
  for (const testCase of tamperCases) {
    const source = path.join(smoothTemporaryRoot, `v4-${testCase.name}-source`);
    createSource(source, { sourceFamily: 'authored-semantic-v4' });
    testCase.mutate(source);
    assert(
      buildRejects(
        {
          gaf2dProjectRoot: source,
          outputRoot: path.join(
            smoothTemporaryRoot,
            `v4-${testCase.name}-output`,
            '.gaf2d-preview',
          ),
          sourceFamily: 'authored-semantic-v4',
        },
        testCase.message,
      ),
      `V4 preview rejects ${testCase.name} tamper before publishing`,
    );
  }
} finally {
  fs.rmSync(smoothTemporaryRoot, { recursive: true, force: true });
}

console.log('GAF2D PREVIEW BUILD PASS');
