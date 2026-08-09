#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_CWEBP_ARGUMENTS,
  DERIVATIVE_TOOLCHAIN,
  DERIVATIVE_TOOLCHAIN_SHA256,
  atomicPublishDirectory,
  canonicalJson,
  chooseDerivativeMatrix,
  validateDerivativeTools,
  webpSize,
} from './build-gaf2d-motion.mjs';
import {
  MOTION_CLIP_GRAMMAR,
  MOTION_SET_INDEX_GRAMMAR,
  validateMotionClipDescriptor,
  validateMotionPreviewBundle,
  validateMotionSetIndex,
} from '../../js/motion-bundle.js';
import {
  HERO_PREVIEW_CLIP_GRAMMAR,
  HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  HERO_PREVIEW_SET_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_OPERATIONS,
  validateHeroClipDescriptor,
  validateHeroSetManifest,
} from '../../js/hero-v3-contract.js';
import {
  VISUAL_FIDELITY_BUDGETS,
  visualFidelityDecodedLimit,
  visualFidelityEncodedLimit,
} from '../../js/visual-fidelity-v4.js';
import {
  ASSET_BUDGETS,
  MOTION_BUDGETS,
  walkFiles,
} from './lib.mjs';

const PREVIEW_MANIFEST_GRAMMAR = 'apn-gaf2d-motion-preview-manifest-v1';
const LEGACY_SOURCE_FAMILY = 'authored-semantic-v2';
const SMOOTH_SOURCE_FAMILY = 'authored-semantic-v3';
const VISUAL_FIDELITY_SOURCE_FAMILY = 'authored-semantic-v4';
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_FRAME_BYTES = 32 * 1024 * 1024;
const MAX_REVIEW_HTML_BYTES = 48 * 1024 * 1024;
const COMMON_DECODED_BYTES = 6 * 1024 * 1024;
const BOSS_DECODED_BYTES = 8 * 1024 * 1024;
const HERO_DECODED_BYTES = 8 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const ASSET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACTING_CONTRACT_RELATIVE =
  'briefs/authored-semantic-v3/acting-contract.json';
const V4_SELECTED_PROFILE_SHA256 =
  '76d15cc95e8a0bf2f40867abb09f375148679e71f3746e11d51130f83c463dd4';
const V4_SELECTION_AUTHORITY = Object.freeze({
  path: 'briefs/authored-semantic-v4/encoding-selection.json',
  sha256: '8bf75522baec0b7335ee892c2a986a94e048b45a33769d138f4ec72d3d632598',
});
const V4_TOOLCHAIN = Object.freeze({
  grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
  compositor: Object.freeze({
    name: 'HashBoundCopy',
    version: 'selected-webp-v1',
  }),
  operations: Object.freeze([
    'validate:v4-selected-webp:hash-bound-source',
    'validate:v4-selected-webp:exact-copy-byte-proof',
    'copy:v4-selected-webp:exact-media-bytes',
  ]),
});
const ACTING_CONTRACT_SNAPSHOT = fileURLToPath(
  new URL('./motion-v3-acting-contract.json', import.meta.url),
);
const ACTING_CONTRACT_SNAPSHOT_SHA256 =
  '976700bb8168f8f3113625674785b0c56eea13b8d4fcb1e73002f4729a2bb8e2';
const PREVIEW_DERIVATIVE_TOOLCHAIN = Object.freeze({
  grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
  compositor: DERIVATIVE_TOOLCHAIN.compositor,
  operations: HERO_PREVIEW_TOOLCHAIN_OPERATIONS,
});
const TEMPORAL_SET_KEYS = Object.freeze([
  'artifact_path',
  'asset_id',
  'candidate_id',
  'clip_order',
  'clips',
  'grammar',
  'schema_version',
]);
const TEMPORAL_CLIP_KEYS = Object.freeze([
  'authoring_method',
  'cadence_profile',
  'clip_name',
  'evidence',
  'fps',
  'frames',
  'holds',
  'interpolation_method',
  'markers',
  'playback',
  'source_fps',
]);
const TEMPORAL_FRAME_KEYS = Object.freeze([
  'frame_id',
  'path',
  'sha256',
]);
const TEMPORAL_HOLD_KEYS = Object.freeze([
  'end_index',
  'reason',
  'start_index',
]);
const TEMPORAL_MARKER_KEYS = Object.freeze(['frame_id', 'role']);
const TEMPORAL_EVIDENCE_KEYS = Object.freeze([
  'acceleration_ratios',
  'acceleration_spike_indices',
  'acceleration_spike_ratio_threshold',
  'adjacent_body_differences',
  'aligned_body_sha256',
  'check',
  'declared_hold_ranges',
  'distinct_pose_count',
  'distinct_pose_rate',
  'fps',
  'frame_count',
  'frame_ids',
  'frame_pixel_sha256',
  'indistinct_pose_ranges',
  'loop_velocity_discontinuity',
  'maximum_acceleration_ratio',
  'maximum_adjacent_body_difference',
  'maximum_velocity_ratio',
  'median_adjacent_body_difference',
  'motion_distances',
  'playback',
  'pose_distance_threshold',
  'pose_distances',
  'undeclared_duplicate_ranges',
  'velocity_ratios',
  'velocity_spike_indices',
  'velocity_spike_ratio_threshold',
]);
const REVIEW_EVIDENCE_KEYS = Object.freeze([
  'animation',
  'approval_command',
  'asset_id',
  'baseline_y',
  'candidate',
  'contact_sheet',
  'destination_path',
  'diagnostics',
  'pivot',
  'reference',
  'reject_reasons',
  'schema_version',
  'title',
]);
const REVIEW_IMAGE_KEYS = Object.freeze(['label', 'path']);
const SMOOTH_QA_REQUIRED_CLIP_KEYS = Object.freeze([
  'authoring_method',
  'body_pose_sha256',
  'cadence_profile',
  'declared_hold_transition_targets',
  'distinct_body_pose_count',
  'distinct_body_pose_rate',
  'false_hold_targets',
  'fps',
  'frame_count',
  'holds',
  'interpolation_method',
  'loop_closure_exact',
  'loop_sampling',
  'markers',
  'passed',
  'playback',
  'raster_temporal',
  'reject_reasons',
  'source_fps',
  'undeclared_duplicate_targets',
]);
const SMOOTH_QA_REQUIRED_RASTER_KEYS = Object.freeze([
  ...TEMPORAL_EVIDENCE_KEYS,
  'passed',
]);
const V4_BATCH_KEYS = Object.freeze([
  'asset_count',
  'asset_sets',
  'atomic_publish',
  'authority_status',
  'batch_inventory_sha256',
  'clip_count',
  'clip_descriptor_count',
  'clip_evidence_count',
  'clip_webp_atlas_count',
  'contract',
  'creative_approval',
  'derivative_set_count',
  'dry_run',
  'frame_count',
  'fresh_output_required',
  'master_png_count',
  'materialization_scope',
  'network_calls',
  'output_path',
  'overwrite',
  'per_frame_runtime_png_published',
  'profile',
  'provider_calls',
  'root_application_count',
  'schema_version',
  'source_authority',
]);
const V4_PROFILE_KEYS = Object.freeze([
  'profile_id',
  'profile_sha256',
  'selection_authority_path',
  'selection_authority_sha256',
]);
const V4_BATCH_SOURCE_AUTHORITY_KEYS = Object.freeze([
  'acting_contract_sha256',
  'asset_authorities',
  'batch_summary_path',
  'batch_summary_sha256',
  'encoding_selection_path',
  'encoding_selection_sha256',
  'revision',
  'v4_contract_path',
  'v4_contract_sha256',
]);
const V4_DERIVATIVE_SET_KEYS = Object.freeze([
  'asset_id',
  'authority_status',
  'clip_count',
  'clips',
  'contract',
  'consumer_scale',
  'creative_approval',
  'frame_count',
  'master_set_sha256',
  'profile',
  'runtime_density',
  'schema_version',
  'semantic_clip_order',
  'v3_lineage_sha256',
]);
const V4_DESCRIPTOR_PROFILE_KEYS = Object.freeze([
  'arguments',
  'decode_argv_template',
  'decoder',
  'encode_argv_template',
  'encoder',
  'profile_id',
  'profile_sha256',
  'selection_authority_path',
  'selection_authority_sha256',
]);
const V4_DESCRIPTOR_SOURCE_AUTHORITY_KEYS = Object.freeze([
  'pivot_ppm_canvas',
  'v3_acting_contract_sha256',
  'v3_batch_summary_path',
  'v3_batch_summary_sha256',
  'v3_clip_manifest_path',
  'v3_clip_manifest_sha256',
  'v3_pose_authority_path',
  'v3_pose_authority_sha256',
  'v3_pose_manifest_path',
  'v3_pose_manifest_sha256',
  'v3_producer_clip_manifest_path',
  'v3_producer_clip_manifest_sha256',
  'v3_transform_timeline_sha256',
]);
const V4_TOOL_VERSION_KEYS = Object.freeze(['name', 'version']);
const V4_EVIDENCE_KEYS = Object.freeze([
  'asset_id',
  'authority_status',
  'clip_id',
  'contract',
  'creative_approval',
  'mechanical_evidence',
  'prepack_manifest',
  'prepack_manifest_sha256',
  'prepack_runtime_pngs_published',
  'provider_calls',
  'schema_version',
]);
const V4_MECHANICAL_EVIDENCE_KEYS = Object.freeze([
  'asset_id',
  'authority_status',
  'clip_id',
  'contract',
  'creative_approval',
  'frame_count',
  'mechanical_qa',
  'network_calls',
  'pre_root_persisted',
  'provider_calls',
  'root_application_count_per_frame',
  'root_authority',
  'root_rerender_projection_used',
  'root_support_preserved',
  'runtime_derivatives_master_only',
  'schema_version',
  'transparent_rgb_zero',
  'v3_pose_match',
  'v3_root_match',
  'v3_timeline_match',
]);

const COMMON_CLIPS = Object.freeze([
  Object.freeze({ name: 'idle', frames: 8, playback: 'loop' }),
  Object.freeze({ name: 'advance', frames: 8, playback: 'loop' }),
  Object.freeze({ name: 'engaged', frames: 6, playback: 'loop' }),
  Object.freeze({ name: 'hit', frames: 4, playback: 'progress' }),
  Object.freeze({ name: 'death', frames: 8, playback: 'progress' }),
]);
const HERO_CLIPS = Object.freeze([
  Object.freeze({ name: 'idle', frames: 8, playback: 'loop' }),
  Object.freeze({ name: 'run', frames: 10, playback: 'loop' }),
  Object.freeze({ name: 'attack', frames: 8, playback: 'progress' }),
  Object.freeze({ name: 'crit', frames: 8, playback: 'progress' }),
  Object.freeze({ name: 'sprint', frames: 10, playback: 'loop' }),
  Object.freeze({ name: 'hit', frames: 4, playback: 'progress' }),
  Object.freeze({ name: 'death', frames: 8, playback: 'progress' }),
  Object.freeze({ name: 'celebrate', frames: 8, playback: 'loop' }),
]);
const ASSET_SPECS = Object.freeze([
  Object.freeze({
    assetId: 'apn-hero',
    role: 'hero',
    clips: HERO_CLIPS,
  }),
  Object.freeze({
    assetId: 'entry-runner',
    role: 'character',
    clips: COMMON_CLIPS,
  }),
  Object.freeze({
    assetId: 'protocol-courier',
    role: 'character',
    clips: COMMON_CLIPS,
  }),
  Object.freeze({
    assetId: 'signal-hunter',
    role: 'character',
    clips: COMMON_CLIPS,
  }),
  Object.freeze({
    assetId: 'site-sentinel',
    role: 'character',
    clips: COMMON_CLIPS,
  }),
  Object.freeze({
    assetId: 'site-warden',
    role: 'boss',
    clips: Object.freeze([
      ...COMMON_CLIPS,
      Object.freeze({ name: 'broken', frames: 8, playback: 'loop' }),
    ]),
  }),
  Object.freeze({
    assetId: 'veil-operator',
    role: 'character',
    clips: COMMON_CLIPS,
  }),
]);
const EXPECTED_COUNTS = Object.freeze({
  assets: 7,
  clips: 39,
  frames: 276,
});
const SMOOTH_EXPECTED_COUNTS = Object.freeze({
  assets: 7,
  clips: 39,
  frames: 795,
});
const SMOOTH_COMMON_CLIPS = Object.freeze([
  Object.freeze({ name: 'idle', frames: 30, fps: 30, playback: 'loop' }),
  Object.freeze({ name: 'advance', frames: 24, fps: 30, playback: 'loop' }),
  Object.freeze({ name: 'engaged', frames: 15, fps: 30, playback: 'loop' }),
  Object.freeze({ name: 'hit', frames: 8, fps: 32, playback: 'progress' }),
  Object.freeze({ name: 'death', frames: 30, fps: 30, playback: 'progress' }),
]);
const SMOOTH_HERO_CLIPS = Object.freeze([
  Object.freeze({ name: 'idle', frames: 20, fps: 30, playback: 'loop' }),
  Object.freeze({ name: 'run', frames: 20, fps: 32, playback: 'loop' }),
  Object.freeze({ name: 'attack', frames: 15, fps: 30, playback: 'progress' }),
  Object.freeze({ name: 'crit', frames: 15, fps: 30, playback: 'progress' }),
  Object.freeze({ name: 'sprint', frames: 15, fps: 30, playback: 'loop' }),
  Object.freeze({ name: 'hit', frames: 8, fps: 32, playback: 'progress' }),
  Object.freeze({ name: 'death', frames: 15, fps: 30, playback: 'progress' }),
  Object.freeze({ name: 'celebrate', frames: 15, fps: 30, playback: 'loop' }),
]);
const SMOOTH_ASSET_SPECS = Object.freeze([
  Object.freeze({
    assetId: 'apn-hero',
    role: 'hero',
    clips: SMOOTH_HERO_CLIPS,
  }),
  Object.freeze({
    assetId: 'entry-runner',
    role: 'character',
    clips: SMOOTH_COMMON_CLIPS,
  }),
  Object.freeze({
    assetId: 'protocol-courier',
    role: 'character',
    clips: SMOOTH_COMMON_CLIPS,
  }),
  Object.freeze({
    assetId: 'signal-hunter',
    role: 'character',
    clips: SMOOTH_COMMON_CLIPS,
  }),
  Object.freeze({
    assetId: 'site-sentinel',
    role: 'character',
    clips: SMOOTH_COMMON_CLIPS,
  }),
  Object.freeze({
    assetId: 'site-warden',
    role: 'boss',
    clips: Object.freeze([
      ...SMOOTH_COMMON_CLIPS,
      Object.freeze({
        name: 'broken',
        frames: 30,
        fps: 30,
        playback: 'loop',
      }),
    ]),
  }),
  Object.freeze({
    assetId: 'veil-operator',
    role: 'character',
    clips: SMOOTH_COMMON_CLIPS,
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
const SOURCE_PROFILES = Object.freeze({
  [LEGACY_SOURCE_FAMILY]: Object.freeze({
    sourceFamily: LEGACY_SOURCE_FAMILY,
    batchRelative:
      `motion/${LEGACY_SOURCE_FAMILY}/batch-summary.json`,
    candidateGrammar: 'gaf2d-motion-set-v2',
    batchSchemaVersion: 1,
    batchContract: 'apn-offline-authored-motion-v1',
    clipManifestVersion: 2,
    pathsRelativeToBatch: false,
    qaSchemaVersion: 1,
    counts: EXPECTED_COUNTS,
    specs: ASSET_SPECS,
    perClip: false,
    canvasSize: Object.freeze([640, 640]),
  }),
  [SMOOTH_SOURCE_FAMILY]: Object.freeze({
    sourceFamily: SMOOTH_SOURCE_FAMILY,
    batchRelative:
      `motion/${SMOOTH_SOURCE_FAMILY}/batch-summary.json`,
    candidateGrammar: 'gaf2d-motion-set-v3',
    batchSchemaVersion: 3,
    batchContract: 'apn-offline-authored-motion-v3',
    clipManifestVersion: 3,
    pathsRelativeToBatch: true,
    qaSchemaVersion: 3,
    counts: SMOOTH_EXPECTED_COUNTS,
    specs: SMOOTH_ASSET_SPECS,
    perClip: true,
    canvasSize: Object.freeze([128, 128]),
  }),
  [VISUAL_FIDELITY_SOURCE_FAMILY]: Object.freeze({
    sourceFamily: VISUAL_FIDELITY_SOURCE_FAMILY,
    batchRelative:
      `motion/${VISUAL_FIDELITY_SOURCE_FAMILY}/batch-summary.json`,
    batchSchemaVersion: 1,
    batchContract: 'apn-visual-fidelity-v4-batch-v1',
    counts: SMOOTH_EXPECTED_COUNTS,
    specs: SMOOTH_ASSET_SPECS,
    visualFidelity: true,
    perClip: true,
    pathsRelativeToBatch: true,
  }),
});

function fail(message) {
  throw new Error(`GAF2D preview: ${message}`);
}

function requireFact(condition, message) {
  if (!condition) fail(message);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function arraysEqual(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function strictlyIncreasingFrameIndices(value, frameCount) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every(
      (index, position) =>
        Number.isInteger(index) &&
        index >= 0 &&
        index < frameCount &&
        (position === 0 || index > value[position - 1]),
    )
  );
}

function jsonEqual(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function exactObjectKeys(value, expected, label) {
  requireFact(isObject(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  requireFact(
    arraysEqual(actual, wanted),
    `${label} must contain exactly ${wanted.join(', ')}`,
  );
}

function requiredObjectKeys(value, required, label) {
  requireFact(isObject(value), `${label} must be an object`);
  const missing = required.filter(
    (key) => !Object.prototype.hasOwnProperty.call(value, key),
  );
  requireFact(
    missing.length === 0,
    `${label} must contain required consumer keys: ${missing.join(', ')}`,
  );
}

function objectProjection(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}

function compactCanonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => compactCanonicalJson(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${compactCanonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function authorityHash(domain, payload) {
  return sha256Bytes(
    Buffer.concat([
      Buffer.from(`${domain}\0`, 'utf8'),
      Buffer.from(compactCanonicalJson(payload)),
    ]),
  );
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function finiteNumberArray(value, length, label, maximum = 1_000_000) {
  requireFact(
    Array.isArray(value) &&
      value.length === length &&
      value.every(
        (item) =>
          finiteNumber(item) &&
          item >= 0 &&
          item <= maximum,
      ),
    `${label} must contain exactly ${length} bounded finite numbers`,
  );
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function exactFinite(value, expected) {
  return finiteNumber(value) && Math.abs(value - expected) <= 1e-12;
}

function validateTemporalRanges(value, frameCount, label) {
  requireFact(Array.isArray(value), `${label} must be an array`);
  let previousEnd = -1;
  const targets = new Set();
  for (const range of value) {
    requireFact(
      Array.isArray(range) &&
        range.length === 2 &&
        Number.isInteger(range[0]) &&
        range[0] >= 0 &&
        Number.isInteger(range[1]) &&
        range[1] > range[0] &&
        range[1] < frameCount &&
        range[0] > previousEnd,
      `${label} must contain ordered disjoint inclusive ranges`,
    );
    previousEnd = range[1];
    for (let target = range[0] + 1; target <= range[1]; target += 1) {
      targets.add(target);
    }
  }
  return targets;
}

function verifyTemporalMotionEvidence(
  evidence,
  sourceClip,
  assetId,
  clipName,
) {
  const label = `${assetId}/${clipName} GAF temporal evidence`;
  requiredObjectKeys(evidence, TEMPORAL_EVIDENCE_KEYS, label);
  const frameCount = sourceClip.frame_ids.length;
  const transitionCount =
    sourceClip.playback === 'loop' ? frameCount : frameCount - 1;
  requireFact(
    evidence.check === 'temporal' &&
      evidence.playback === sourceClip.playback &&
      evidence.fps === sourceClip.fps &&
      evidence.frame_count === frameCount &&
      arraysEqual(evidence.frame_ids, sourceClip.frame_ids),
    `${label} does not bind the exact clip`,
  );
  const expectedHoldRanges = sourceClip.holds.map((hold) => [
    hold.start_index,
    hold.end_index,
  ]);
  requireFact(
    jsonEqual(evidence.declared_hold_ranges, expectedHoldRanges),
    `${label} declared holds differ from the exact clip`,
  );
  const heldTargets = validateTemporalRanges(
    evidence.declared_hold_ranges,
    frameCount,
    `${label}.declared_hold_ranges`,
  );
  validateTemporalRanges(
    evidence.undeclared_duplicate_ranges,
    frameCount,
    `${label}.undeclared_duplicate_ranges`,
  );
  validateTemporalRanges(
    evidence.indistinct_pose_ranges,
    frameCount,
    `${label}.indistinct_pose_ranges`,
  );
  requireFact(
    evidence.undeclared_duplicate_ranges.length === 0,
    `${label} rejects undeclared duplicate ranges`,
  );
  requireFact(
    evidence.indistinct_pose_ranges.length === 0,
    `${label} rejects indistinct pose ranges`,
  );
  for (const field of ['frame_pixel_sha256', 'aligned_body_sha256']) {
    requireFact(
      Array.isArray(evidence[field]) &&
        evidence[field].length === frameCount &&
        evidence[field].every((hash) => SHA256.test(hash)),
      `${label}.${field} must bind every frame`,
    );
  }
  requireFact(
    Number.isInteger(evidence.distinct_pose_count) &&
      evidence.distinct_pose_count === frameCount - heldTargets.size &&
      finiteNumber(evidence.distinct_pose_rate) &&
      evidence.distinct_pose_rate >= 30 &&
      exactFinite(evidence.distinct_pose_rate, sourceClip.fps),
    `${label} rejects inadequate or inconsistent distinct-pose cadence`,
  );
  requireFact(
    evidence.pose_distance_threshold === 0.002 &&
      evidence.velocity_spike_ratio_threshold === 4 &&
      evidence.acceleration_spike_ratio_threshold === 6,
    `${label} does not use canonical GAF thresholds`,
  );
  finiteNumberArray(
    evidence.pose_distances,
    transitionCount,
    `${label}.pose_distances`,
    1,
  );
  finiteNumberArray(
    evidence.motion_distances,
    transitionCount,
    `${label}.motion_distances`,
  );
  finiteNumberArray(
    evidence.adjacent_body_differences,
    transitionCount,
    `${label}.adjacent_body_differences`,
    1,
  );
  requireFact(
    arraysEqual(
      evidence.pose_distances,
      evidence.adjacent_body_differences,
    ),
    `${label} pose-distance evidence is inconsistent`,
  );
  requireFact(
    exactFinite(
      evidence.median_adjacent_body_difference,
      median(evidence.adjacent_body_differences),
    ) &&
      exactFinite(
        evidence.maximum_adjacent_body_difference,
        Math.max(...evidence.adjacent_body_differences),
      ),
    `${label} adjacent-body summary is inconsistent`,
  );
  finiteNumberArray(
    evidence.velocity_ratios,
    transitionCount,
    `${label}.velocity_ratios`,
  );
  finiteNumberArray(
    evidence.acceleration_ratios,
    Math.max(0, transitionCount - 1),
    `${label}.acceleration_ratios`,
  );
  const transitionTargets = [
    ...Array.from(
      { length: frameCount - 1 },
      (_, index) => index + 1,
    ),
    ...(sourceClip.playback === 'loop' ? [0] : []),
  ];
  const activeTransitions = transitionTargets.map(
    (target) => !heldTargets.has(target),
  );
  for (let index = 0; index < transitionTargets.length; index += 1) {
    const target = transitionTargets[index];
    const held = heldTargets.has(target);
    if (!held) continue;
    const previous = target === 0 ? frameCount - 1 : target - 1;
    requireFact(
      evidence.pose_distances[index] <
          evidence.pose_distance_threshold &&
        evidence.frame_pixel_sha256[target] ===
          evidence.frame_pixel_sha256[previous] &&
        evidence.aligned_body_sha256[target] ===
          evidence.aligned_body_sha256[previous],
      `${label} declared holds are inconsistent`,
    );
  }
  const accelerationActive = activeTransitions
    .slice(1)
    .map((value, index) => value && activeTransitions[index]);
  requireFact(
    exactFinite(
      evidence.maximum_velocity_ratio,
      Math.max(0, ...evidence.velocity_ratios),
    ) &&
      exactFinite(
        evidence.maximum_acceleration_ratio,
        Math.max(0, ...evidence.acceleration_ratios),
      ),
    `${label} spike summaries are inconsistent`,
  );
  const expectedVelocitySpikes = transitionTargets.filter(
    (_target, index) =>
      activeTransitions[index] &&
      evidence.velocity_ratios[index] >
        evidence.velocity_spike_ratio_threshold,
  );
  const expectedAccelerationSpikes = transitionTargets
    .slice(1)
    .filter(
      (_target, index) =>
        accelerationActive[index] &&
        evidence.acceleration_ratios[index] >
          evidence.acceleration_spike_ratio_threshold,
    );
  requireFact(
    arraysEqual(
      evidence.velocity_spike_indices,
      expectedVelocitySpikes,
    ) &&
      arraysEqual(
        evidence.acceleration_spike_indices,
        expectedAccelerationSpikes,
      ),
    `${label} temporal spike index evidence is inconsistent`,
  );
  requireFact(
    Array.isArray(evidence.velocity_spike_indices) &&
      evidence.velocity_spike_indices.length === 0 &&
      Array.isArray(evidence.acceleration_spike_indices) &&
      evidence.acceleration_spike_indices.length === 0,
    `${label} rejects temporal velocity or acceleration spikes`,
  );
  if (sourceClip.playback === 'loop') {
    requireFact(
      evidence.frame_pixel_sha256[0] !==
          evidence.frame_pixel_sha256.at(-1) &&
        evidence.aligned_body_sha256[0] !==
          evidence.aligned_body_sha256.at(-1),
      `${label} must use periodic [0,1) sampling with a pre-wrap last frame`,
    );
    requireFact(
      finiteNumber(evidence.loop_velocity_discontinuity) &&
        evidence.loop_velocity_discontinuity <= 0.25,
      `${label} loop velocity discontinuity exceeds 0.25`,
    );
  } else {
    requireFact(
      evidence.loop_velocity_discontinuity === null,
      `${label} progress clip cannot claim a loop seam`,
    );
  }
  return [...evidence.aligned_body_sha256];
}

function verifyTemporalSetEvidence(
  document,
  candidate,
  spec,
  assetId,
) {
  const label = `${assetId} GAF temporal evidence`;
  requiredObjectKeys(document, TEMPORAL_SET_KEYS, label);
  requireFact(
    document.schema_version === 3 &&
      document.grammar ===
        'gaf2d-motion-set-temporal-evidence-v3' &&
      document.asset_id === assetId &&
      document.candidate_id === candidate.candidate_id &&
      document.artifact_path === candidate.temporal_evidence_path &&
      arraysEqual(document.clip_order, candidate.clip_order) &&
      Array.isArray(document.clips) &&
      document.clips.length === candidate.clip_order.length,
    `${label} does not bind the exact candidate`,
  );
  const candidateFrames = new Map(
    candidate.frames.map((frame) => [frame.frame_id, frame]),
  );
  const bodyPoseSha256 = new Map();
  for (let index = 0; index < candidate.clip_order.length; index += 1) {
    const clipName = candidate.clip_order[index];
    const sourceClip = candidate.clips[clipName];
    const temporalClip = document.clips[index];
    const clipLabel = `${label}/${clipName}`;
    requiredObjectKeys(temporalClip, TEMPORAL_CLIP_KEYS, clipLabel);
    requireFact(
      temporalClip.clip_name === clipName &&
        temporalClip.playback === sourceClip.playback &&
        temporalClip.fps === sourceClip.fps &&
        temporalClip.source_fps === sourceClip.source_fps &&
        temporalClip.cadence_profile ===
          sourceClip.cadence_profile &&
        temporalClip.authoring_method ===
          sourceClip.authoring_method &&
        temporalClip.interpolation_method ===
          sourceClip.interpolation_method,
      `${clipLabel} facts differ from the candidate`,
    );
    requireFact(
      Array.isArray(temporalClip.frames) &&
        temporalClip.frames.length === sourceClip.frame_ids.length,
      `${clipLabel} frames are incomplete`,
    );
    for (let frameIndex = 0; frameIndex < temporalClip.frames.length; frameIndex += 1) {
      const temporalFrame = temporalClip.frames[frameIndex];
      const frameId = sourceClip.frame_ids[frameIndex];
      const candidateFrame = candidateFrames.get(frameId);
      requiredObjectKeys(
        temporalFrame,
        TEMPORAL_FRAME_KEYS,
        `${clipLabel}.frames[${frameIndex}]`,
      );
      requireFact(
        temporalFrame.frame_id === frameId &&
          temporalFrame.path === candidateFrame?.path &&
          temporalFrame.sha256 === candidateFrame?.sha256,
        `${clipLabel}/${frameId} path/hash differs from the candidate`,
      );
    }
    for (let holdIndex = 0; holdIndex < temporalClip.holds.length; holdIndex += 1) {
      requiredObjectKeys(
        temporalClip.holds[holdIndex],
        TEMPORAL_HOLD_KEYS,
        `${clipLabel}.holds[${holdIndex}]`,
      );
    }
    requireFact(
      jsonEqual(temporalClip.holds, sourceClip.holds),
      `${clipLabel} holds differ from the candidate`,
    );
    const expectedMarkers = Object.entries(sourceClip.markers)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([role, frameId]) => ({ role, frame_id: frameId }));
    for (let markerIndex = 0; markerIndex < temporalClip.markers.length; markerIndex += 1) {
      requiredObjectKeys(
        temporalClip.markers[markerIndex],
        TEMPORAL_MARKER_KEYS,
        `${clipLabel}.markers[${markerIndex}]`,
      );
    }
    requireFact(
      jsonEqual(temporalClip.markers, expectedMarkers),
      `${clipLabel} markers differ from the candidate`,
    );
    const bodyHashes = verifyTemporalMotionEvidence(
      temporalClip.evidence,
      sourceClip,
      assetId,
      clipName,
    );
    for (let frameIndex = 1; frameIndex < temporalClip.frames.length; frameIndex += 1) {
      const sourceDuplicate =
        temporalClip.frames[frameIndex].sha256 ===
        temporalClip.frames[frameIndex - 1].sha256;
      requireFact(
        !sourceDuplicate ||
          holdAllowsRepeatedTransition(
            sourceClip.holds,
            frameIndex,
          ),
        `${assetId}/${clipName} has an undeclared repeated body pose at frame ${frameIndex}`,
      );
      requireFact(
        sourceDuplicate ===
          (
            temporalClip.evidence.frame_pixel_sha256[frameIndex] ===
            temporalClip.evidence.frame_pixel_sha256[frameIndex - 1]
          ),
        `${clipLabel} source and raster duplicate evidence differ`,
      );
    }
    bodyPoseSha256.set(clipName, bodyHashes);
  }
  requireFact(
    bodyPoseSha256.size === spec.clips.length,
    `${label} does not bind the exact APN clip set`,
  );
  return bodyPoseSha256;
}

function verifyReviewImage(value, label) {
  exactObjectKeys(value, REVIEW_IMAGE_KEYS, label);
  requireFact(
    typeof value.label === 'string' &&
      value.label.length > 0,
    `${label}.label must be nonempty`,
  );
  portableRelativePath(value.path, `${label}.path`);
}

function verifyMotionReviewEvidence(
  review,
  candidate,
  temporalEvidenceSha256,
  assetId,
  reviewHtmlPath,
) {
  const label = `${assetId} review evidence`;
  exactObjectKeys(review, REVIEW_EVIDENCE_KEYS, label);
  requireFact(
    review.schema_version === 1 &&
      review.asset_id === assetId &&
      typeof review.title === 'string' &&
      review.title.length > 0 &&
      review.destination_path === reviewHtmlPath,
    `${label} identity/destination is invalid`,
  );
  verifyReviewImage(review.reference, `${label}.reference`);
  verifyReviewImage(review.candidate, `${label}.candidate`);
  verifyReviewImage(review.animation, `${label}.animation`);
  requireFact(
    review.reference.path.startsWith(
      `assets/${assetId}/approved/identity/`,
    ) &&
      review.candidate.path === candidate.frames[0]?.path &&
      review.animation.path ===
        candidate.review_evidence_path.replace(
          /review-evidence\.json$/,
          'temporal-proof.webp',
        ),
    `${label} media does not bind the current candidate`,
  );
  requireFact(
    Array.isArray(review.contact_sheet) &&
      review.contact_sheet.length === candidate.frames.length,
    `${label}.contact_sheet must bind every frame`,
  );
  for (let index = 0; index < review.contact_sheet.length; index += 1) {
    verifyReviewImage(
      review.contact_sheet[index],
      `${label}.contact_sheet[${index}]`,
    );
    requireFact(
      review.contact_sheet[index].label.includes(
        candidate.frames[index].frame_id,
      ) &&
        review.contact_sheet[index].path ===
          candidate.frames[index].path,
      `${label}.contact_sheet[${index}] differs from the candidate`,
    );
  }
  requireFact(
    Array.isArray(review.pivot) &&
      review.pivot.length === 2 &&
      review.pivot.every(finiteNumber) &&
      review.pivot[0] === candidate.canvas_size[0] / 2 &&
      review.pivot[1] === candidate.canvas_size[1] - 1 &&
      review.baseline_y === candidate.canvas_size[1] - 1,
    `${label} pivot/baseline differs from the candidate canvas`,
  );
  requireFact(
    isObject(review.diagnostics) &&
      review.diagnostics.stage === 'motion_set' &&
      review.diagnostics.motion_set_id === candidate.candidate_id &&
      review.diagnostics.clip_count === candidate.clip_order.length &&
      review.diagnostics.clip_order ===
        candidate.clip_order.join(',') &&
      review.diagnostics.frame_count === candidate.frames.length &&
      review.diagnostics.temporal_evidence_path ===
        candidate.temporal_evidence_path &&
      review.diagnostics.temporal_evidence_sha256 ===
        temporalEvidenceSha256,
    `${label} mechanical diagnostics do not bind the current candidate`,
  );
  requireFact(
    Object.values(review.diagnostics).every(
      (value) =>
        typeof value !== 'string' ||
        !value.startsWith('REJECT:'),
    ),
    `${label} contains a mechanical rejection`,
  );
  for (const clipName of candidate.clip_order) {
    requireFact(
      review.diagnostics[`temporal_qa_${clipName}`] ===
        'motion_temporal_valid',
      `${label} mechanical result rejects ${clipName}`,
    );
  }
  requireFact(
    Array.isArray(review.reject_reasons) &&
      review.reject_reasons.length === 0,
    `${label} contains reject reasons`,
  );
  requireFact(
    arraysEqual(review.approval_command, [
      'gaf2d',
      'approve',
      'motion-set',
      assetId,
      candidate.candidate_id,
      '--project',
      '.',
    ]),
    `${label} approval command is stale`,
  );
}

function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function portableRelativePath(value, label) {
  requireFact(
    typeof value === 'string' &&
      value.length > 0 &&
      !path.isAbsolute(value) &&
      !value.includes('\\') &&
      !value.includes('://') &&
      !value.includes('?') &&
      !value.includes('#') &&
      value.split('/').every((part) => part && part !== '.' && part !== '..'),
    `${label} must be a portable relative path`,
  );
  return value;
}

function resolveInside(root, relative, label) {
  portableRelativePath(relative, label);
  const resolved = path.resolve(root, relative);
  requireFact(
    resolved.startsWith(`${root}${path.sep}`),
    `${label} escapes the GAF2D project`,
  );
  return resolved;
}

function readBoundedFile(file, maximumBytes, label) {
  const stats = fs.lstatSync(file);
  requireFact(
    stats.isFile() && !stats.isSymbolicLink(),
    `${label} must be a regular file`,
  );
  requireFact(
    stats.size > 0 && stats.size <= maximumBytes,
    `${label} exceeds its byte boundary`,
  );
  return fs.readFileSync(file);
}

function readJsonBytes(file, label) {
  const bytes = readBoundedFile(file, MAX_JSON_BYTES, label);
  try {
    return { bytes, value: JSON.parse(bytes.toString('utf8')) };
  } catch {
    fail(`${label} is not valid UTF-8 JSON`);
  }
}

function canonicalActingContract() {
  const { bytes, value } = readJsonBytes(
    ACTING_CONTRACT_SNAPSHOT,
    'repo V3 acting contract snapshot',
  );
  requireFact(
    sha256Bytes(bytes) === ACTING_CONTRACT_SNAPSHOT_SHA256,
    'repo V3 acting contract snapshot digest is stale',
  );
  requireFact(
    bytes.equals(Buffer.from(canonicalJson(value))),
    'repo V3 acting contract snapshot must use canonical JSON bytes',
  );
  return {
    bytes,
    path: ACTING_CONTRACT_RELATIVE,
    pathBase: 'project-root',
    sha256: sha256Bytes(bytes),
  };
}

function verifyActingContractBinding(record, authority, label) {
  requireFact(
    record?.acting_contract_path_base === authority.pathBase &&
      record?.acting_contract_path === authority.path &&
      record?.acting_contract_sha256 === authority.sha256,
    `${label} acting contract binding is invalid`,
  );
}

function readTracked(root, relative, expectedSha256, label, maximumBytes) {
  requireFact(
    SHA256.test(expectedSha256 || ''),
    `${label} expected SHA-256 is invalid`,
  );
  const absolute = resolveInside(root, relative, label);
  const bytes = readBoundedFile(absolute, maximumBytes, label);
  requireFact(
    sha256Bytes(bytes) === expectedSha256,
    `${label} SHA-256 differs from the current registered source`,
  );
  return { absolute, bytes, relative };
}

function readTrackedJson(
  root,
  relative,
  expectedSha256,
  label,
) {
  const record = readTracked(
    root,
    relative,
    expectedSha256,
    label,
    MAX_JSON_BYTES,
  );
  try {
    return {
      ...record,
      value: JSON.parse(record.bytes.toString('utf8')),
    };
  } catch {
    fail(`${label} is not valid UTF-8 JSON`);
  }
}

function exactClipFacts(left, right, assetId, clipName) {
  requireFact(
    left?.fps === right?.fps &&
      left?.playback === right?.playback &&
      arraysEqual(left?.frame_ids, right?.frame_ids) &&
      (
        left?.cadence_profile === undefined ||
        (
          left.cadence_profile === right?.cadence_profile &&
          left.source_fps === right?.source_fps &&
          left.authoring_method === right?.authoring_method &&
          left.interpolation_method === right?.interpolation_method &&
          JSON.stringify(left.holds) === JSON.stringify(right?.holds) &&
          JSON.stringify(left.markers) === JSON.stringify(right?.markers)
        )
      ),
    `${assetId}/${clipName} candidate and clip manifest differ`,
  );
}

function verifySmoothClipAuthority(assetId, expected, clip) {
  requireFact(
    clip?.fps === expected.fps &&
      Number.isInteger(clip?.source_fps) &&
      clip.source_fps >= 1 &&
      clip.source_fps <= 60 &&
      clip?.cadence_profile === 'continuous_30' &&
      clip?.authoring_method === 'deterministic_part_rig' &&
      clip?.interpolation_method === 'deterministic_part_transforms',
    `${assetId}/${expected.name} V3 cadence requires deterministic part transforms`,
  );
  requireFact(
    Array.isArray(clip.holds) && isObject(clip.markers),
    `${assetId}/${expected.name} V3 holds/markers are missing`,
  );
  let previousEnd = -1;
  let heldFrames = 0;
  for (const hold of clip.holds) {
    requireFact(
      Number.isInteger(hold?.start_index) &&
        hold.start_index >= 0 &&
        Number.isInteger(hold?.end_index) &&
        hold.end_index > hold.start_index &&
        hold.end_index < expected.frames &&
        hold.start_index > previousEnd &&
        ['anticipation', 'impact', 'acting', 'terminal'].includes(hold.reason),
      `${assetId}/${expected.name} V3 hold range is invalid`,
    );
    if (hold.reason === 'terminal') {
      requireFact(
        hold.end_index === expected.frames - 1,
        `${assetId}/${expected.name} V3 terminal hold must end at the final frame`,
      );
    }
    if (hold.reason === 'anticipation') {
      requireFact(
        hold.start_index === 0,
        `${assetId}/${expected.name} V3 anticipation hold must start at the first frame`,
      );
    }
    previousEnd = hold.end_index;
    heldFrames += hold.end_index - hold.start_index + 1;
  }
  requireFact(
    heldFrames < expected.frames,
    `${assetId}/${expected.name} V3 holds cover the complete clip`,
  );
  const markerIds = Object.values(clip.markers);
  requireFact(
    markerIds.length > 0 &&
      markerIds.every((frameId) => clip.frame_ids.includes(frameId)),
    `${assetId}/${expected.name} V3 markers leave the exact clip`,
  );
  const markerRoles = new Set(Object.keys(clip.markers));
  if (clip.playback === 'loop') {
    requireFact(
      ['neutral', 'maximum_excursion', 'return'].every((role) =>
        markerRoles.has(role)),
      `${assetId}/${expected.name} V3 loop markers are incomplete`,
    );
  } else {
    requireFact(
      markerRoles.has('anticipation') &&
        markerRoles.has('terminal') &&
        (
          markerRoles.has('contact') ||
          markerRoles.has('maximum_excursion')
        ),
      `${assetId}/${expected.name} V3 progress markers are incomplete`,
    );
  }
}

function holdAllowsRepeatedTransition(holds, frameIndex) {
  return holds.some(
    (hold) =>
      frameIndex > hold.start_index &&
      frameIndex <= hold.end_index,
  );
}

function verifySmoothFrameCadence(source) {
  for (const clipName of source.candidate.clip_order) {
    const clip = source.candidate.clips[clipName];
    const hashes = source.bodyPoseSha256.get(clipName);
    requireFact(
      Array.isArray(hashes) &&
        hashes.length === clip.frame_ids.length,
      `${source.assetId}/${clipName} body-pose evidence is incomplete`,
    );
    for (let index = 1; index < hashes.length; index += 1) {
      if (hashes[index] !== hashes[index - 1]) continue;
      requireFact(
        holdAllowsRepeatedTransition(clip.holds, index),
        `${source.assetId}/${clipName} has an undeclared repeated body pose at frame ${index}`,
      );
    }
  }
}

function verifyBatch(batch, profile, actingAuthority) {
  const { counts } = profile;
  requireFact(
    batch?.schema_version === profile.batchSchemaVersion,
    `batch schema_version must be ${profile.batchSchemaVersion}`,
  );
  requireFact(
    batch?.contract === profile.batchContract,
    `batch contract must be "${profile.batchContract}"`,
  );
  if (profile.perClip) {
    verifyActingContractBinding(
      batch,
      actingAuthority,
      'V3 batch summary',
    );
    requireFact(
      batch?.artifact_path_base === 'batch-summary-parent' &&
        batch?.revision === profile.sourceFamily,
      'V3 batch path base/revision is invalid',
    );
  }
  requireFact(batch?.passed === true, 'batch passed must be true');
  requireFact(batch?.mechanical_qa === 'passed', 'batch mechanical_qa must be "passed"');
  requireFact(
    batch?.creative_approval === 'human_required',
    'batch creative_approval must remain "human_required"',
  );
  for (const field of [
    'network_calls',
    'provider_calls',
    'provider_clip_count',
  ]) {
    requireFact(batch?.[field] === 0, `batch ${field} must be 0`);
  }
  requireFact(
    batch?.local_authored_clip_count === counts.clips,
    `batch local_authored_clip_count must be ${counts.clips}`,
  );
  requireFact(
    batch?.asset_count === counts.assets &&
      batch?.clip_count === counts.clips &&
      batch?.frame_count === counts.frames,
    `batch must contain exactly ${counts.assets} assets, ${counts.clips} clips, and ${counts.frames} frames`,
  );
  requireFact(
    Array.isArray(batch?.assets) &&
      batch.assets.length === counts.assets,
    'batch assets must contain exactly seven entries',
  );
  requireFact(
    Array.isArray(batch?.reject_reasons) &&
      batch.reject_reasons.length === 0,
    'batch reject_reasons must be empty',
  );
}

function batchArtifactPath(profile, relative, label) {
  portableRelativePath(relative, label);
  return profile.pathsRelativeToBatch
    ? `motion/${profile.sourceFamily}/${relative}`
    : relative;
}

function verifySourceAsset(
  root,
  batchRecord,
  spec,
  profile,
  actingAuthority,
  batchSummarySha256 = null,
) {
  const { assetId } = spec;
  requireFact(ASSET_ID.test(assetId), `asset ID "${assetId}" is invalid`);
  requireFact(batchRecord?.asset_id === assetId, `${assetId} batch entry is missing`);
  requireFact(batchRecord?.passed === true, `${assetId} batch passed must be true`);
  requireFact(
    batchRecord?.provider_clip_count === 0,
    `${assetId} provider_clip_count must be 0`,
  );
  if (profile.perClip) {
    verifyActingContractBinding(
      batchRecord,
      actingAuthority,
      `${assetId} V3 batch asset summary`,
    );
    requireFact(
      batchRecord?.network_calls === 0 &&
        batchRecord?.provider_calls === 0 &&
        batchRecord?.passed === true &&
        Array.isArray(batchRecord?.reject_reasons) &&
        batchRecord.reject_reasons.length === 0,
      `${assetId} V3 batch safety/mechanical facts are invalid`,
    );
  }
  const expectedFrameCount = spec.clips.reduce(
    (total, clip) => total + clip.frames,
    0,
  );
  requireFact(
    batchRecord?.clip_count === spec.clips.length &&
      batchRecord?.local_authored_clip_count === spec.clips.length &&
      batchRecord?.frame_count === expectedFrameCount,
    `${assetId} batch clip/frame counts differ from the runtime contract`,
  );

  const assetManifestRelative = `assets/${assetId}/asset.json`;
  const assetManifestFile = resolveInside(
    root,
    assetManifestRelative,
    `${assetId} asset manifest`,
  );
  const { bytes: assetManifestBytes, value: assetManifest } =
    readJsonBytes(assetManifestFile, `${assetId} asset manifest`);
  requireFact(
    assetManifest?.schema_version === 1 &&
      assetManifest?.asset_id === assetId &&
      Number.isInteger(assetManifest?.manifest_version) &&
      assetManifest.manifest_version > 0,
    `${assetId} asset manifest identity/version is invalid`,
  );
  requireFact(
    assetManifest?.status === 'awaiting_motion_approval',
    `${assetId} must remain awaiting_motion_approval`,
  );
  requireFact(
    isObject(assetManifest?.approvals) &&
      Object.keys(assetManifest.approvals).length === 1 &&
      isObject(assetManifest.approvals.identity) &&
      SHA256.test(assetManifest.approvals.identity.sha256 || ''),
    `${assetId} must have identity authority only`,
  );
  requireFact(
    assetManifest.approvals.identity.source_manifest_version ===
      assetManifest.manifest_version,
    `${assetId} identity authority is stale`,
  );

  const candidateArtifact = assetManifest?.artifacts?.motion_set_candidate;
  const expectedCandidatePath =
    `assets/${assetId}/review/motion-set/` +
    `${assetId}-${profile.sourceFamily}/candidate.json`;
  requireFact(
    candidateArtifact?.kind === 'motion_set_candidate' &&
      candidateArtifact?.path === expectedCandidatePath,
    `${assetId} current motion-set candidate registration is invalid`,
  );
  const candidateRecord = readTrackedJson(
    root,
    candidateArtifact.path,
    candidateArtifact.sha256,
    `${assetId} candidate`,
  );
  const candidate = candidateRecord.value;
  requireFact(
    candidate?.grammar === profile.candidateGrammar &&
      candidate?.asset_id === assetId &&
      candidate?.candidate_id === `${assetId}-${profile.sourceFamily}`,
    `${assetId} candidate identity/grammar is invalid`,
  );
  requireFact(
    candidate?.source_manifest_version === assetManifest.manifest_version,
    `${assetId} candidate source manifest version is stale`,
  );
  requireFact(
    arraysEqual(candidate?.canvas_size, profile.canvasSize),
    `${assetId} candidate canvas must be ${profile.canvasSize[0]}x${profile.canvasSize[1]}`,
  );

  const expectedClipOrder = spec.clips.map((clip) => clip.name);
  requireFact(
    arraysEqual(candidate?.clip_order, expectedClipOrder) &&
      isObject(candidate?.clips) &&
      Object.keys(candidate.clips).length === expectedClipOrder.length,
    `${assetId} candidate clip vocabulary/order is invalid`,
  );
  const clipManifestRecord = readTrackedJson(
    root,
    batchArtifactPath(
      profile,
      batchRecord.clip_manifest_path,
      `${assetId} clip manifest path`,
    ),
    batchRecord.clip_manifest_sha256,
    `${assetId} clip manifest`,
  );
  const clipManifest = clipManifestRecord.value;
  if (profile.perClip) {
    verifyActingContractBinding(
      clipManifest,
      actingAuthority,
      `${assetId} V3 clip manifest`,
    );
  }
  requireFact(
    clipManifest?.schema_version === profile.clipManifestVersion &&
      clipManifest?.candidate_id === candidate.candidate_id &&
      arraysEqual(clipManifest?.clip_order, expectedClipOrder),
    `${assetId} clip manifest identity/order is invalid`,
  );
  for (const expected of spec.clips) {
    const candidateClip = candidate.clips[expected.name];
    const manifestClip = clipManifest.clips?.[expected.name];
    requireFact(
      candidateClip?.playback === expected.playback &&
        Array.isArray(candidateClip?.frame_ids) &&
        candidateClip.frame_ids.length === expected.frames &&
        Number.isInteger(candidateClip?.fps) &&
        candidateClip.fps >= 1 &&
        candidateClip.fps <= 60 &&
        (!profile.perClip || candidateClip.fps === expected.fps),
      `${assetId}/${expected.name} clip contract is invalid`,
    );
    if (profile.perClip) {
      verifySmoothClipAuthority(assetId, expected, candidateClip);
    }
    exactClipFacts(candidateClip, manifestClip, assetId, expected.name);
  }

  const qaRecord = readTrackedJson(
    root,
    batchArtifactPath(
      profile,
      batchRecord.qa_summary_path,
      `${assetId} QA summary path`,
    ),
    batchRecord.qa_summary_sha256,
    `${assetId} QA summary`,
  );
  const qa = qaRecord.value;
  const qaBodyPoseSha256 = new Map();
  const qaRasterTemporal = new Map();
  let qaClips;
  if (profile.perClip) {
    verifyActingContractBinding(
      qa,
      actingAuthority,
      `${assetId} V3 QA summary`,
    );
    requireFact(
      qa?.schema_version === profile.qaSchemaVersion &&
        qa?.asset_id === assetId &&
        qa?.passed === true &&
        qa?.mechanical_qa === 'passed' &&
        qa?.creative_approval === 'human_required' &&
        qa?.network_calls === 0 &&
        qa?.provider_calls === 0 &&
        qa?.clip_count === spec.clips.length &&
        qa?.frame_count === expectedFrameCount &&
        isObject(qa?.clips) &&
        Object.keys(qa.clips).length === spec.clips.length &&
        Array.isArray(qa?.reject_reasons) &&
        qa.reject_reasons.length === 0,
      `${assetId} V3 mechanical QA boundary is invalid`,
    );
    qaClips = new Map(Object.entries(qa.clips));
    requireFact(
      batchRecord.provenance_path ===
        `${assetId}/provenance.json`,
      `${assetId} V3 provenance path is invalid`,
    );
    const provenanceRecord = readTrackedJson(
      root,
      batchArtifactPath(
        profile,
        batchRecord.provenance_path,
        `${assetId} provenance path`,
      ),
      batchRecord.provenance_sha256,
      `${assetId} provenance`,
    );
    const provenance = provenanceRecord.value;
    verifyActingContractBinding(
      provenance,
      actingAuthority,
      `${assetId} V3 provenance`,
    );
    requireFact(
      provenance?.schema_version === 3 &&
        provenance?.asset_id === assetId &&
        provenance?.revision === profile.sourceFamily &&
        provenance?.network_calls === 0 &&
        provenance?.provider_calls === 0,
      `${assetId} V3 provenance safety facts are invalid`,
    );
  } else {
    requireFact(
      qa?.schema_version === profile.qaSchemaVersion &&
        qa?.asset_id === assetId &&
        qa?.passed === true &&
        qa?.mechanical_qa === 'passed' &&
        qa?.creative_approval === 'human_required' &&
        qa?.provider_clip_count === 0 &&
        qa?.local_authored_clip_count === spec.clips.length &&
        qa?.clip_count === spec.clips.length &&
        qa?.frame_count === expectedFrameCount &&
        arraysEqual(qa?.canvas, [640, 640]) &&
        Array.isArray(qa?.reject_reasons) &&
        qa.reject_reasons.length === 0,
      `${assetId} mechanical QA boundary is invalid`,
    );
    qaClips = new Map(
      (Array.isArray(qa.clips) ? qa.clips : []).map((clip) => [
        clip.clip,
        clip,
      ]),
    );
  }
  for (const expected of spec.clips) {
    const sourceClip = candidate.clips[expected.name];
    const qaClip = qaClips.get(expected.name);
    if (profile.perClip) {
      requiredObjectKeys(
        qaClip,
        SMOOTH_QA_REQUIRED_CLIP_KEYS,
        `${assetId}/${expected.name} V3 QA clip`,
      );
      const declaredHoldTargets = sourceClip.holds.flatMap((hold) =>
        Array.from(
          { length: hold.end_index - hold.start_index },
          (_, index) => hold.start_index + index + 1,
        ),
      );
      requireFact(
        qaClip?.passed === true &&
          qaClip?.frame_count === expected.frames &&
          qaClip?.playback === expected.playback &&
          qaClip?.fps === sourceClip.fps &&
          qaClip?.source_fps === sourceClip.source_fps &&
          qaClip?.cadence_profile === sourceClip.cadence_profile &&
          qaClip?.authoring_method === sourceClip.authoring_method &&
          qaClip?.interpolation_method ===
            sourceClip.interpolation_method &&
          JSON.stringify(qaClip?.holds) ===
            JSON.stringify(sourceClip.holds) &&
          JSON.stringify(qaClip?.markers) ===
            JSON.stringify(sourceClip.markers) &&
          Array.isArray(qaClip?.body_pose_sha256) &&
          qaClip.body_pose_sha256.length === expected.frames &&
          qaClip.body_pose_sha256.every((hash) => SHA256.test(hash)) &&
          arraysEqual(
            qaClip?.declared_hold_transition_targets,
            declaredHoldTargets,
          ) &&
          Number.isInteger(qaClip?.distinct_body_pose_count) &&
          qaClip.distinct_body_pose_count > 0 &&
          Number.isFinite(qaClip?.distinct_body_pose_rate) &&
          qaClip.distinct_body_pose_rate >= 30 &&
          (
            expected.playback === 'loop'
              ? qaClip?.loop_closure_exact === false &&
                qaClip?.loop_sampling === 'periodic_pre_wrap'
              : qaClip?.loop_closure_exact === null
                && qaClip?.loop_sampling === null
          ) &&
          isObject(qaClip?.raster_temporal) &&
          qaClip.raster_temporal.passed === true &&
          Array.isArray(qaClip?.false_hold_targets) &&
          qaClip.false_hold_targets.length === 0 &&
          Array.isArray(qaClip?.undeclared_duplicate_targets) &&
          qaClip.undeclared_duplicate_targets.length === 0 &&
          Array.isArray(qaClip?.reject_reasons) &&
          qaClip.reject_reasons.length === 0,
        `${assetId}/${expected.name} V3 temporal/mechanical QA is invalid`,
      );
      qaBodyPoseSha256.set(
        expected.name,
        [...qaClip.body_pose_sha256],
      );
      requiredObjectKeys(
        qaClip.raster_temporal,
        SMOOTH_QA_REQUIRED_RASTER_KEYS,
        `${assetId}/${expected.name} raster temporal QA`,
      );
      qaRasterTemporal.set(
        expected.name,
        objectProjection(
          qaClip.raster_temporal,
          TEMPORAL_EVIDENCE_KEYS,
        ),
      );
    } else {
      requireFact(
        qaClip?.passed === true &&
          qaClip?.semantic_checks_passed === true &&
          qaClip?.authoring_mode === 'native-authored' &&
          qaClip?.frame_count === expected.frames &&
          qaClip?.playback === expected.playback &&
          qaClip?.fps === sourceClip.fps &&
          Array.isArray(qaClip?.reject_reasons) &&
          qaClip.reject_reasons.length === 0,
        `${assetId}/${expected.name} mechanical QA is invalid`,
      );
    }
  }

  const reviewArtifact =
    assetManifest?.artifacts?.motion_set_review_evidence;
  requireFact(
    reviewArtifact?.kind === 'review_evidence' &&
      reviewArtifact?.path === candidate.review_evidence_path &&
      reviewArtifact?.sha256 === candidate.review_evidence_sha256,
    `${assetId} review evidence registration is stale`,
  );
  const reviewRecord = readTrackedJson(
    root,
    reviewArtifact.path,
    reviewArtifact.sha256,
    `${assetId} review evidence`,
  );
  if (!profile.perClip) {
    requireFact(
      reviewRecord.value?.asset_id === assetId &&
        reviewRecord.value?.destination_path ===
          assetManifest?.artifacts?.motion_set_review_html?.path,
      `${assetId} review evidence does not bind its current review HTML`,
    );
  }
  const reviewHtmlArtifact =
    assetManifest.artifacts.motion_set_review_html;
  const expectedReviewHtmlPath =
    `assets/${assetId}/review/motion-set/` +
    `${assetId}-${profile.sourceFamily}/review.html`;
  requireFact(
    reviewHtmlArtifact?.kind === 'review' &&
      reviewHtmlArtifact?.path === expectedReviewHtmlPath &&
      reviewRecord.value?.destination_path ===
        expectedReviewHtmlPath,
    `${assetId} review HTML registration is stale`,
  );
  const reviewHtmlRecord = readTracked(
    root,
    reviewHtmlArtifact.path,
    reviewHtmlArtifact.sha256,
    `${assetId} review HTML`,
    MAX_REVIEW_HTML_BYTES,
  );
  let temporalEvidenceSha256 = null;
  let temporalEvidenceDocument = null;
  if (profile.perClip) {
    const temporalArtifact =
      assetManifest?.artifacts?.motion_set_temporal_evidence;
    requireFact(
      temporalArtifact?.kind === 'review_evidence' &&
        temporalArtifact?.path === candidate.temporal_evidence_path &&
        temporalArtifact?.sha256 === candidate.temporal_evidence_sha256,
      `${assetId} V3 temporal evidence registration is stale`,
    );
    const temporalRecord = readTrackedJson(
      root,
      temporalArtifact.path,
      temporalArtifact.sha256,
      `${assetId} temporal evidence`,
    );
    temporalEvidenceDocument = temporalRecord.value;
    temporalEvidenceSha256 = temporalArtifact.sha256;
  }

  requireFact(
    Array.isArray(candidate?.frames) &&
      candidate.frames.length === expectedFrameCount,
    `${assetId} candidate frame list is incomplete`,
  );
  const expectedFrameIds = expectedClipOrder.flatMap(
    (clipName) => candidate.clips[clipName].frame_ids,
  );
  requireFact(
    new Set(expectedFrameIds).size === expectedFrameIds.length,
    `${assetId} frame IDs are duplicated`,
  );
  requireFact(
    arraysEqual(
      candidate.frames.map((frame) => frame.frame_id),
      expectedFrameIds,
    ),
    `${assetId} candidate frame order differs from its clips`,
  );
  if (profile.perClip) {
    verifyTemporalSetEvidence(
      temporalEvidenceDocument,
      candidate,
      spec,
      assetId,
    );
    verifyMotionReviewEvidence(
      reviewRecord.value,
      candidate,
      temporalEvidenceSha256,
      assetId,
      expectedReviewHtmlPath,
    );
    for (const clipName of expectedClipOrder) {
      const temporalClip = temporalEvidenceDocument.clips.find(
        (clip) => clip.clip_name === clipName,
      );
      requireFact(
        jsonEqual(
          qaRasterTemporal.get(clipName),
          objectProjection(
            temporalClip?.evidence,
            TEMPORAL_EVIDENCE_KEYS,
          ),
        ),
        `${assetId}/${clipName} consumer QA projection differs from canonical GAF raster evidence`,
      );
    }
  }

  const frameHashesRelative =
    profile.pathsRelativeToBatch
      ? batchArtifactPath(
          profile,
          batchRecord.frame_hashes_path,
          `${assetId} frame hash manifest path`,
        )
      : `motion/${profile.sourceFamily}/${assetId}/frame-hashes.json`;
  const frameHashesFile = resolveInside(
    root,
    frameHashesRelative,
    `${assetId} frame hash manifest`,
  );
  const {
    bytes: frameHashesBytes,
    value: frameHashes,
  } = readJsonBytes(frameHashesFile, `${assetId} frame hash manifest`);
  requireFact(
    frameHashes?.schema_version === 1 &&
      frameHashes?.algorithm === 'sha256' &&
      isObject(frameHashes?.frames) &&
      Object.keys(frameHashes.frames).length === expectedFrameIds.length &&
      (
        !profile.perClip ||
        batchRecord.frame_hashes_sha256 ===
          sha256Bytes(frameHashesBytes)
      ),
    `${assetId} frame hash manifest is invalid`,
  );
  const frames = new Map();
  for (let index = 0; index < candidate.frames.length; index += 1) {
    const frame = candidate.frames[index];
    const expectedFrameId = expectedFrameIds[index];
    requireFact(
      frame?.frame_id === expectedFrameId &&
        frame?.source_index === index &&
        SHA256.test(frame?.sha256 || '') &&
        frameHashes.frames[expectedFrameId] === frame.sha256,
      `${assetId}/${expectedFrameId} candidate frame authority is invalid`,
    );
    const frameRelative =
      `motion/${profile.sourceFamily}/${assetId}/frames/${expectedFrameId}.png`;
    const record = readTracked(
      root,
      frameRelative,
      frame.sha256,
      `${assetId}/${expectedFrameId} frame`,
      MAX_FRAME_BYTES,
    );
    frames.set(expectedFrameId, {
      ...record,
      sha256: frame.sha256,
    });
  }

  const source = {
    assetId,
    role: spec.role,
    manifestVersion: assetManifest.manifest_version,
    assetManifestSha256: sha256Bytes(assetManifestBytes),
    identitySha256: assetManifest.approvals.identity.sha256,
    candidate,
    candidateSha256: candidateArtifact.sha256,
    qaSummarySha256: batchRecord.qa_summary_sha256,
    clipManifestSha256: batchRecord.clip_manifest_sha256,
    frameHashesSha256: sha256Bytes(frameHashesBytes),
    reviewEvidenceSha256: reviewArtifact.sha256,
    reviewHtmlSha256: sha256Bytes(reviewHtmlRecord.bytes),
    temporalEvidenceSha256,
    actingContractSha256: actingAuthority?.sha256 ?? null,
    batchSummarySha256,
    batchSummaryPath: profile.batchRelative,
    frameSize: {
      width: candidate.canvas_size[0],
      height: candidate.canvas_size[1],
    },
    frameIds: expectedFrameIds,
    frames,
    bodyPoseSha256: qaBodyPoseSha256,
    clipManifestPath: batchRecord.clip_manifest_path,
    poseManifestPath: batchRecord.pose_manifest_path ?? null,
    poseManifestSha256: batchRecord.pose_manifest_sha256 ?? null,
    poseAuthorityPath: batchRecord.pose_authority_path ?? null,
    poseAuthoritySha256: batchRecord.pose_authority_sha256 ?? null,
    producerClipManifestPath: batchRecord.producer_clip_manifest_path ?? null,
    producerClipManifestSha256: batchRecord.producer_clip_manifest_sha256 ?? null,
  };
  if (profile.perClip) {
    verifySmoothFrameCadence(source);
  }
  return source;
}

function toolOutput(command, arguments_, label) {
  try {
    return execFileSync(command, arguments_, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const detail = String(error?.stderr || error?.message || '').trim();
    fail(`${label} failed${detail ? `: ${detail}` : ''}`);
  }
}

function defaultInspectFrame(file, magickPath) {
  const canvasText = toolOutput(
    magickPath,
    ['identify', '-format', '%w %h', file],
    `ImageMagick canvas probe for "${path.basename(file)}"`,
  );
  const trimText = toolOutput(
    magickPath,
    [file, '-trim', '-format', '%w %h %X %Y', 'info:'],
    `ImageMagick alpha trim for "${path.basename(file)}"`,
  );
  const [width, height] = canvasText.split(/\s+/).map(Number);
  const trimMatch = trimText.match(
    /^(\d+)\s+(\d+)\s+([+-]\d+)\s+([+-]\d+)$/,
  );
  requireFact(trimMatch, `cannot parse trim geometry for "${path.basename(file)}"`);
  return {
    width,
    height,
    trim: {
      x: Number(trimMatch[3]),
      y: Number(trimMatch[4]),
      width: Number(trimMatch[1]),
      height: Number(trimMatch[2]),
    },
  };
}

function inspectUnionTrim(source, inspectFrame, magickPath) {
  let left = source.frameSize.width;
  let top = source.frameSize.height;
  let right = 0;
  let bottom = 0;
  for (const frameId of source.frameIds) {
    const record = source.frames.get(frameId);
    const facts = inspectFrame(record.absolute, magickPath);
    requireFact(
      facts?.width === source.frameSize.width &&
        facts?.height === source.frameSize.height,
      `${source.assetId}/${frameId} canvas differs from its ${source.frameSize.width}x${source.frameSize.height} candidate authority`,
    );
    const trim = facts?.trim;
    requireFact(
      Number.isInteger(trim?.x) &&
        trim.x >= 0 &&
        Number.isInteger(trim?.y) &&
        trim.y >= 0 &&
        Number.isInteger(trim?.width) &&
        trim.width > 0 &&
        Number.isInteger(trim?.height) &&
        trim.height > 0 &&
        trim.x + trim.width <= source.frameSize.width &&
        trim.y + trim.height <= source.frameSize.height,
      `${source.assetId}/${frameId} alpha bounds are invalid`,
    );
    left = Math.min(left, trim.x);
    top = Math.min(top, trim.y);
    right = Math.max(right, trim.x + trim.width);
    bottom = Math.max(bottom, trim.y + trim.height);
  }
  requireFact(
    right > left && bottom > top,
    `${source.assetId} union trim is empty`,
  );
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function choosePreviewGeometry(
  frameCount,
  sourceFrameSize,
  sourceTrim,
  decodedLimit,
) {
  for (
    let scalePpm = 1_000_000;
    scalePpm >= 100_000;
    scalePpm -= 1_000
  ) {
    const scale = scalePpm / 1_000_000;
    const frameSize = {
      width: Math.max(1, Math.round(sourceFrameSize.width * scale)),
      height: Math.max(1, Math.round(sourceFrameSize.height * scale)),
    };
    const trim = {
      x: Math.max(0, Math.round(sourceTrim.x * scale)),
      y: Math.max(0, Math.round(sourceTrim.y * scale)),
      width: Math.max(1, Math.round(sourceTrim.width * scale)),
      height: Math.max(1, Math.round(sourceTrim.height * scale)),
    };
    trim.width = Math.min(trim.width, frameSize.width - trim.x);
    trim.height = Math.min(trim.height, frameSize.height - trim.y);
    if (trim.width <= 0 || trim.height <= 0) continue;
    try {
      const matrix = chooseDerivativeMatrix(
        frameCount,
        trim.width,
        trim.height,
        decodedLimit,
      );
      return { scalePpm, frameSize, trim, matrix };
    } catch (error) {
      if (!String(error?.message || error).includes('cannot fit')) {
        throw error;
      }
    }
  }
  fail('motion frames cannot fit the preview atlas bounds after shared scaling');
}

function buildScaledPreviewAtlas({
  frameIds,
  normalizationFacts,
  sourceTrim,
  atlasFacts,
  staged,
  matrix,
  magickPath,
  cwebpPath,
  encoderArguments,
  outputName,
  workPrefix,
}) {
  requireFact(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workPrefix),
    'preview derivative work prefix is invalid',
  );
  requireFact(
    /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/.test(outputName),
    'preview derivative output name is invalid',
  );
  const cellsDirectory = path.join(staged, `.${workPrefix}-cells`);
  fs.mkdirSync(cellsDirectory);
  const cellFiles = [];
  const cellBounds = new Map();
  for (let index = 0; index < frameIds.length; index += 1) {
    const frameId = frameIds[index];
    const source = normalizationFacts.frames.get(frameId)?.absolute;
    requireFact(source, `preview source frame "${frameId}" is missing`);
    const cell = path.join(
      cellsDirectory,
      `${String(index).padStart(3, '0')}.png`,
    );
    toolOutput(
      magickPath,
      [
        source,
        '-crop',
        `${sourceTrim.width}x${sourceTrim.height}+${sourceTrim.x}+${sourceTrim.y}`,
        '+repage',
        '-filter',
        'Lanczos',
        '-resize',
        `${atlasFacts.trim.width}x${atlasFacts.trim.height}!`,
        '-alpha',
        'on',
        '-define',
        'png:color-type=6',
        `PNG32:${cell}`,
      ],
      `ImageMagick preview transform for "${frameId}"`,
    );
    const cellFacts = defaultInspectFrame(cell, magickPath);
    requireFact(
      cellFacts.width === atlasFacts.trim.width &&
        cellFacts.height === atlasFacts.trim.height,
      `preview cell "${frameId}" changed shared geometry`,
    );
    const bounds = cellFacts.trim;
    requireFact(
      Number.isInteger(bounds?.x) &&
        bounds.x >= 0 &&
        Number.isInteger(bounds?.y) &&
        bounds.y >= 0 &&
        Number.isInteger(bounds?.width) &&
        bounds.width > 0 &&
        Number.isInteger(bounds?.height) &&
        bounds.height > 0 &&
        bounds.x + bounds.width <= atlasFacts.trim.width &&
        bounds.y + bounds.height <= atlasFacts.trim.height,
      `preview cell "${frameId}" alpha bounds are invalid`,
    );
    cellBounds.set(frameId, { ...bounds });
    cellFiles.push(cell);
  }
  const atlasPng = path.join(staged, `.${workPrefix}.png`);
  toolOutput(
    magickPath,
    [
      'montage',
      ...cellFiles,
      '-tile',
      `${matrix.columns}x${matrix.rows}`,
      '-geometry',
      `${atlasFacts.trim.width}x${atlasFacts.trim.height}+0+0`,
      '-background',
      'none',
      '-alpha',
      'on',
      '-define',
      'png:color-type=6',
      `PNG32:${atlasPng}`,
    ],
    `ImageMagick preview matrix for "${workPrefix}"`,
  );
  const pngDimensions = toolOutput(
    magickPath,
    ['identify', '-format', '%w %h', atlasPng],
    `ImageMagick preview atlas probe for "${workPrefix}"`,
  )
    .split(/\s+/)
    .map(Number);
  requireFact(
    pngDimensions[0] === matrix.width &&
      pngDimensions[1] === matrix.height,
    `preview atlas "${workPrefix}" dimensions differ from its matrix`,
  );
  const webp = path.join(staged, outputName);
  toolOutput(
    cwebpPath,
    [...encoderArguments, atlasPng, '-o', webp],
    `cwebp preview encoding for "${workPrefix}"`,
  );
  const webpBytes = readBoundedFile(
    webp,
    MAX_FRAME_BYTES,
    `preview WebP "${workPrefix}"`,
  );
  const webpDimensions = webpSize(
    webpBytes,
    `preview WebP "${workPrefix}"`,
  );
  requireFact(
    webpDimensions.width === matrix.width &&
      webpDimensions.height === matrix.height,
    `preview WebP "${workPrefix}" dimensions differ from its descriptor`,
  );
  fs.rmSync(cellsDirectory, { recursive: true });
  fs.unlinkSync(atlasPng);
  return { webp, webpBytes, webpDimensions, cellBounds };
}

function frameRectangles(frameIds, matrix, trim) {
  return frameIds.map((_, index) => ({
    x: (index % matrix.columns) * trim.width,
    y: Math.floor(index / matrix.columns) * trim.height,
    width: trim.width,
    height: trim.height,
  }));
}

function validCellBounds(bounds) {
  return (
    Number.isInteger(bounds?.x) &&
    bounds.x >= 0 &&
    Number.isInteger(bounds?.y) &&
    bounds.y >= 0 &&
    Number.isInteger(bounds?.width) &&
    bounds.width > 0 &&
    Number.isInteger(bounds?.height) &&
    bounds.height > 0
  );
}

function unionBounds(boundsRecords) {
  requireFact(boundsRecords.length > 0, 'preview alpha bounds are empty');
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = 0;
  let bottom = 0;
  for (const bounds of boundsRecords) {
    requireFact(validCellBounds(bounds), 'preview alpha bounds are invalid');
    left = Math.min(left, bounds.x);
    top = Math.min(top, bounds.y);
    right = Math.max(right, bounds.x + bounds.width);
    bottom = Math.max(bottom, bounds.y + bounds.height);
  }
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function presentationRecord(source, cellBounds) {
  const idle = source.candidate.clips.idle;
  requireFact(
    idle && idle.frame_ids.length > 0,
    `${source.assetId} has no idle reference`,
  );
  requireFact(
    cellBounds instanceof Map &&
      cellBounds.size === source.frameIds.length,
    `${source.assetId} preview cell bounds differ from its exact frame set`,
  );
  const orderedBounds = source.frameIds.map((frameId) => {
    const bounds = cellBounds.get(frameId);
    requireFact(
      validCellBounds(bounds),
      `${source.assetId}/${frameId} preview alpha bounds are invalid`,
    );
    return bounds;
  });
  const referenceId = idle.frame_ids[0];
  const referenceFrame = source.frames.get(referenceId);
  requireFact(
    referenceFrame && cellBounds.has(referenceId),
    `${source.assetId} idle reference frame is missing`,
  );
  return {
    schemaVersion: 1,
    scaleContract: 'visible-body',
    reference: {
      clip: 'idle',
      frameIndex: 0,
      sourceSha256: referenceFrame.sha256,
    },
    visibleBounds: { ...cellBounds.get(referenceId) },
    motionBounds: unionBounds(orderedBounds),
  };
}

function mergeCellBounds(target, frameIds, sourceBounds, label) {
  requireFact(
    sourceBounds instanceof Map && sourceBounds.size === frameIds.length,
    `${label} derivative cell bounds differ from its exact frame set`,
  );
  for (const frameId of frameIds) {
    const bounds = sourceBounds.get(frameId);
    requireFact(
      validCellBounds(bounds) && !target.has(frameId),
      `${label}/${frameId} derivative alpha bounds are invalid or duplicated`,
    );
    target.set(frameId, bounds);
  }
}

function previewLineage(source, batchSummarySha256) {
  return {
    candidateId: source.candidate.candidate_id,
    candidateSha256: source.candidateSha256,
    qaSummarySha256: source.qaSummarySha256,
    batchSummarySha256,
    sourceManifestVersion: source.manifestVersion,
  };
}

function encoderFacts(toolFacts, encoderArguments) {
  return {
    name: 'cwebp',
    version: toolFacts.cwebpVersion,
    arguments: [...encoderArguments],
  };
}

function smoothPreviewLineage(source, batchSummarySha256) {
  requireFact(
    SHA256.test(source.temporalEvidenceSha256 || ''),
    `${source.assetId} V3 temporal evidence hash is missing`,
  );
  return {
    candidateId: source.candidate.candidate_id,
    candidateSha256: source.candidateSha256,
    temporalEvidenceSha256: source.temporalEvidenceSha256,
    qaSummarySha256: source.qaSummarySha256,
    batchSummarySha256,
    sourceManifestVersion: source.manifestVersion,
  };
}

function markerIndices(sourceClip, assetId, clipName) {
  return Object.fromEntries(
    Object.entries(sourceClip.markers).map(([role, frameId]) => {
      const index = sourceClip.frame_ids.indexOf(frameId);
      requireFact(
        index >= 0,
        `${assetId}/${clipName} marker "${role}" leaves its clip`,
      );
      return [role, index];
    }),
  );
}

function buildPerClipMotionSet({
  source,
  staged,
  batchSummarySha256,
  derivatives,
  magickPath,
  cwebpPath,
  encoderArguments,
  toolFacts,
}) {
  const relativeDirectory =
    source.role === 'hero'
      ? 'hero'
      : path.posix.join('characters', source.assetId);
  const outputDirectory = path.join(
    staged,
    ...relativeDirectory.split('/'),
  );
  fs.mkdirSync(outputDirectory, { recursive: true });
  const sourceTrim = inspectUnionTrim(
    source,
    derivatives.inspectFrame,
    magickPath,
  );
  const maximumClipFrames = Math.max(
    ...source.candidate.clip_order.map(
      (clipName) => source.candidate.clips[clipName].frame_ids.length,
    ),
  );
  const decodedLimit =
    source.role === 'character'
      ? COMMON_DECODED_BYTES
      : BOSS_DECODED_BYTES;
  const geometry = choosePreviewGeometry(
    maximumClipFrames,
    source.frameSize,
    sourceTrim,
    decodedLimit,
  );
  const { trim, frameSize, scalePpm } = geometry;
  const encoder = encoderFacts(toolFacts, encoderArguments);
  const clipBuilds = new Map();
  const cellBounds = new Map();

  for (const clipName of source.candidate.clip_order) {
    const sourceClip = source.candidate.clips[clipName];
    const matrix = chooseDerivativeMatrix(
      sourceClip.frame_ids.length,
      trim.width,
      trim.height,
      decodedLimit,
    );
    const image = derivatives.buildAtlas({
      frameIds: sourceClip.frame_ids,
      normalizationFacts: { frames: source.frames },
      sourceTrim,
      atlasFacts: { trim },
      staged: outputDirectory,
      matrix,
      magickPath,
      cwebpPath,
      encoderArguments,
      outputName: `${clipName}.webp`,
      workPrefix: `${source.assetId}-${clipName}`,
    });
    const imageBytes = Buffer.from(image.webpBytes);
    mergeCellBounds(
      cellBounds,
      sourceClip.frame_ids,
      image.cellBounds,
      `${source.assetId}/${clipName}`,
    );
    clipBuilds.set(clipName, { image, imageBytes, matrix });
  }

  const presentation = presentationRecord(source, cellBounds);
  const descriptorBuilds = new Map();
  const setClips = {};
  const manifestClips = {};
  for (const clipName of source.candidate.clip_order) {
    const sourceClip = source.candidate.clips[clipName];
    const { image, imageBytes, matrix } = clipBuilds.get(clipName);
    const rectangles = frameRectangles(
      sourceClip.frame_ids,
      matrix,
      trim,
    );
    const descriptor = {
      grammar: MOTION_CLIP_GRAMMAR,
      authority: 'unapproved_preview',
      sourceFamily: SMOOTH_SOURCE_FAMILY,
      assetId: source.assetId,
      name: clipName,
      playback: sourceClip.playback,
      fps: sourceClip.fps,
      sourceFps: sourceClip.source_fps,
      cadenceProfile: sourceClip.cadence_profile,
      authoringMethod: sourceClip.authoring_method,
      interpolationMethod: sourceClip.interpolation_method,
      holds: sourceClip.holds.map((hold) => ({
        startIndex: hold.start_index,
        endIndex: hold.end_index,
        reason: hold.reason,
      })),
      markers: markerIndices(
        sourceClip,
        source.assetId,
        clipName,
      ),
      frames: rectangles.map((rectangle, index) => ({
        ...rectangle,
        sourceSha256:
          source.frames.get(sourceClip.frame_ids[index]).sha256,
        bodyPoseSha256:
          source.bodyPoseSha256.get(clipName)[index],
      })),
      atlas: {
        width: image.webpDimensions.width,
        height: image.webpDimensions.height,
        bytes: imageBytes.length,
        sha256: sha256Bytes(imageBytes),
      },
      encoder,
    };
    const descriptorBytes = writeCanonical(
      path.join(outputDirectory, `${clipName}.json`),
      descriptor,
    );
    const compressedLimit =
      source.role === 'boss'
        ? MOTION_BUDGETS.bossCompressed
        : source.role === 'hero'
          ? MOTION_BUDGETS.heroCompressed
          : MOTION_BUDGETS.commonCompressed;
    requireFact(
      imageBytes.length + descriptorBytes.length <= compressedLimit,
      `${source.assetId}/${clipName} motion compressed exceeds ${compressedLimit} bytes`,
    );
    const descriptorSha256 = sha256Bytes(descriptorBytes);
    const imageSha256 = sha256Bytes(imageBytes);
    setClips[clipName] = {
      descriptor: `${clipName}.json`,
      descriptorSha256,
      image: `${clipName}.webp`,
      imageSha256,
    };
    const publicBase =
      `.gaf2d-preview/${relativeDirectory}`;
    manifestClips[clipName] = {
      descriptor: `${publicBase}/${clipName}.json`,
      descriptorSha256,
      image: `${publicBase}/${clipName}.webp`,
      imageSha256,
    };
    descriptorBuilds.set(clipName, {
      descriptor,
      descriptorSha256,
      imageSha256,
      imageBytes: imageBytes.length,
    });
  }

  const set = {
    grammar: MOTION_SET_INDEX_GRAMMAR,
    authority: 'unapproved_preview',
    status: 'human_review_required',
    sourceFamily: SMOOTH_SOURCE_FAMILY,
    assetId: source.assetId,
    role: source.role,
    frameSize,
    trim,
    pivot: { x: 0.5, y: 1 },
    presentation,
    clips: setClips,
    previewLineage: smoothPreviewLineage(
      source,
      batchSummarySha256,
    ),
    toolchain: {
      grammar: PREVIEW_DERIVATIVE_TOOLCHAIN.grammar,
      compositor: { ...DERIVATIVE_TOOLCHAIN.compositor },
      encoder,
      operations: [...PREVIEW_DERIVATIVE_TOOLCHAIN.operations],
      profileSha256: HERO_PREVIEW_MATRIX_PROFILE_SHA256,
    },
  };
  const setErrors = validateMotionSetIndex(
    set,
    source.assetId,
    { role: source.role },
  );
  requireFact(
    setErrors.length === 0,
    `${source.assetId} V2 motion-set index failed runtime validation: ${setErrors.join('; ')}`,
  );
  for (const clipName of source.candidate.clip_order) {
    const build = descriptorBuilds.get(clipName);
    const descriptorErrors = validateMotionClipDescriptor(
      build.descriptor,
      clipName,
      set,
      {
        role: source.role,
        descriptorSha256: build.descriptorSha256,
        imageSha256: build.imageSha256,
        imageBytes: build.imageBytes,
      },
    );
    requireFact(
      descriptorErrors.length === 0,
      `${source.assetId}/${clipName} V2 clip descriptor failed runtime validation: ${descriptorErrors.join('; ')}`,
    );
  }
  const setBytes = writeCanonical(
    path.join(outputDirectory, 'set.json'),
    set,
  );
  const publicBase = `.gaf2d-preview/${relativeDirectory}/`;
  return {
    authority: 'unapproved_preview',
    assetId: source.assetId,
    role: source.role,
    basePath: publicBase,
    set: `${publicBase}set.json`,
    setSha256: sha256Bytes(setBytes),
    clips: manifestClips,
    transform: {
      scalePpm,
      sourceFrameSize: source.frameSize,
      sourceTrim,
      runtimeFrameSize: frameSize,
      runtimeTrim: trim,
    },
  };
}

function writeCanonical(file, value) {
  fs.writeFileSync(file, canonicalJson(value), {
    encoding: 'utf8',
    flag: 'wx',
  });
  return fs.readFileSync(file);
}

function buildCreature({
  source,
  staged,
  batchSummarySha256,
  derivatives,
  magickPath,
  cwebpPath,
  encoderArguments,
  toolFacts,
}) {
  const outputDirectory = path.join(staged, 'characters', source.assetId);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const sourceTrim = inspectUnionTrim(
    source,
    derivatives.inspectFrame,
    magickPath,
  );
  const decodedLimit =
    source.role === 'boss' ? BOSS_DECODED_BYTES : COMMON_DECODED_BYTES;
  const geometry = choosePreviewGeometry(
    source.frameIds.length,
    source.frameSize,
    sourceTrim,
    decodedLimit,
  );
  const { trim, frameSize, matrix, scalePpm } = geometry;
  const image = derivatives.buildAtlas({
    frameIds: source.frameIds,
    normalizationFacts: { frames: source.frames },
    sourceTrim,
    atlasFacts: { trim },
    staged: outputDirectory,
    matrix,
    magickPath,
    cwebpPath,
    encoderArguments,
    outputName: 'motion.webp',
    workPrefix: source.assetId,
  });
  const imageBytes = Buffer.from(image.webpBytes);
  const presentation = presentationRecord(source, image.cellBounds);
  const rectangles = frameRectangles(source.frameIds, matrix, trim);
  let cursor = 0;
  const clips = {};
  for (const clipName of source.candidate.clip_order) {
    const clip = source.candidate.clips[clipName];
    clips[clipName] = {
      playback: clip.playback,
      fps: clip.fps,
      frames: clip.frame_ids.map(() => {
        const rectangle = rectangles[cursor];
        cursor += 1;
        return rectangle;
      }),
    };
  }
  const descriptor = {
    grammar: 'gaf2d-motion-preview-v1',
    authority: 'unapproved_preview',
    assetId: source.assetId,
    image: 'motion.webp',
    atlas: {
      width: image.webpDimensions.width,
      height: image.webpDimensions.height,
      sha256: sha256Bytes(imageBytes),
    },
    frameSize,
    trim,
    pivot: { x: 0.5, y: 1 },
    clips,
    presentation,
    previewLineage: previewLineage(source, batchSummarySha256),
    encoder: encoderFacts(toolFacts, encoderArguments),
  };
  const errors = validateMotionPreviewBundle(
    descriptor,
    source.assetId,
    { role: source.role },
  );
  requireFact(
    errors.length === 0,
    `${source.assetId} preview descriptor failed runtime validation: ${errors.join('; ')}`,
  );
  const descriptorBytes = writeCanonical(
    path.join(outputDirectory, 'motion.json'),
    descriptor,
  );
  return {
    authority: 'unapproved_preview',
    role: source.role,
    descriptor:
      `.gaf2d-preview/characters/${source.assetId}/motion.json`,
    descriptorSha256: sha256Bytes(descriptorBytes),
    image:
      `.gaf2d-preview/characters/${source.assetId}/motion.webp`,
    imageSha256: sha256Bytes(imageBytes),
    transform: {
      scalePpm,
      sourceFrameSize: source.frameSize,
      sourceTrim,
      runtimeFrameSize: frameSize,
      runtimeTrim: trim,
    },
  };
}

function buildHero({
  source,
  staged,
  batchSummarySha256,
  derivatives,
  magickPath,
  cwebpPath,
  encoderArguments,
  toolFacts,
}) {
  const outputDirectory = path.join(staged, 'hero');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const sourceTrim = inspectUnionTrim(
    source,
    derivatives.inspectFrame,
    magickPath,
  );
  const maximumClipFrames = Math.max(
    ...source.candidate.clip_order.map(
      (clipName) => source.candidate.clips[clipName].frame_ids.length,
    ),
  );
  const geometry = choosePreviewGeometry(
    maximumClipFrames,
    source.frameSize,
    sourceTrim,
    HERO_DECODED_BYTES,
  );
  const { trim, frameSize, scalePpm } = geometry;
  const lineage = previewLineage(source, batchSummarySha256);
  const encoder = encoderFacts(toolFacts, encoderArguments);
  const setClips = {};
  const manifestClips = {};
  const clipBuilds = new Map();
  const cellBounds = new Map();
  for (const clipName of source.candidate.clip_order) {
    const sourceClip = source.candidate.clips[clipName];
    const matrix = chooseDerivativeMatrix(
      sourceClip.frame_ids.length,
      trim.width,
      trim.height,
      HERO_DECODED_BYTES,
    );
    const image = derivatives.buildAtlas({
      frameIds: sourceClip.frame_ids,
      normalizationFacts: { frames: source.frames },
      sourceTrim,
      atlasFacts: { trim },
      staged: outputDirectory,
      matrix,
      magickPath,
      cwebpPath,
      encoderArguments,
      outputName: `${clipName}.webp`,
      workPrefix: `hero-${clipName}`,
    });
    const imageBytes = Buffer.from(image.webpBytes);
    mergeCellBounds(
      cellBounds,
      sourceClip.frame_ids,
      image.cellBounds,
      `${source.assetId}/${clipName}`,
    );
    clipBuilds.set(clipName, { image, imageBytes, matrix });
  }
  const presentation = presentationRecord(source, cellBounds);
  for (const clipName of source.candidate.clip_order) {
    const sourceClip = source.candidate.clips[clipName];
    const { image, imageBytes, matrix } = clipBuilds.get(clipName);
    const descriptor = {
      grammar: HERO_PREVIEW_CLIP_GRAMMAR,
      authority: 'unapproved_preview',
      name: clipName,
      playback: sourceClip.playback,
      fps: sourceClip.fps,
      frameSize,
      frames: frameRectangles(sourceClip.frame_ids, matrix, trim),
      anchor: [0.5, 1],
      trim,
      atlas: {
        width: image.webpDimensions.width,
        height: image.webpDimensions.height,
        bytes: imageBytes.length,
        sha256: sha256Bytes(imageBytes),
      },
      presentation,
      previewLineage: lineage,
      encoder,
    };
    const descriptorFile = path.join(outputDirectory, `${clipName}.json`);
    const descriptorBytes = writeCanonical(descriptorFile, descriptor);
    setClips[clipName] = {
      descriptor: `${clipName}.json`,
      descriptorSha256: sha256Bytes(descriptorBytes),
      image: `${clipName}.webp`,
      imageSha256: sha256Bytes(imageBytes),
    };
    manifestClips[clipName] = {
      descriptor:
        `.gaf2d-preview/hero/${clipName}.json`,
      descriptorSha256: sha256Bytes(descriptorBytes),
      image:
        `.gaf2d-preview/hero/${clipName}.webp`,
      imageSha256: sha256Bytes(imageBytes),
    };
  }
  const set = {
    grammar: HERO_PREVIEW_SET_GRAMMAR,
    status: 'preview',
    authority: 'unapproved_preview',
    clips: setClips,
    previewLineage: lineage,
    toolchain: {
      grammar: HERO_PREVIEW_TOOLCHAIN_GRAMMAR,
      compositor: { ...DERIVATIVE_TOOLCHAIN.compositor },
      encoder,
      operations: [...HERO_PREVIEW_TOOLCHAIN_OPERATIONS],
      profileSha256: HERO_PREVIEW_MATRIX_PROFILE_SHA256,
    },
  };
  const setErrors = validateHeroSetManifest(set, {
    allowUnapprovedPreview: true,
  });
  requireFact(
    setErrors.length === 0,
    `APN Hero preview set failed runtime validation: ${setErrors.join('; ')}`,
  );
  for (const clipName of source.candidate.clip_order) {
    const descriptor = JSON.parse(
      fs.readFileSync(
        path.join(outputDirectory, `${clipName}.json`),
        'utf8',
      ),
    );
    const errors = validateHeroClipDescriptor(
      descriptor,
      clipName,
      set,
      { allowUnapprovedPreview: true },
    );
    requireFact(
      errors.length === 0,
      `APN Hero/${clipName} preview descriptor failed runtime validation: ${errors.join('; ')}`,
    );
  }
  const setBytes = writeCanonical(path.join(outputDirectory, 'set.json'), set);
  return {
    authority: 'unapproved_preview',
    assetId: source.assetId,
    basePath: '.gaf2d-preview/hero/',
    set: '.gaf2d-preview/hero/set.json',
    setSha256: sha256Bytes(setBytes),
    clips: manifestClips,
    transform: {
      scalePpm,
      sourceFrameSize: source.frameSize,
      sourceTrim,
      runtimeFrameSize: frameSize,
      runtimeTrim: trim,
    },
  };
}

function smoothOutputBudgets(staged, sources) {
  const decodedByAsset = new Map();
  let heroCompressed = 0;
  let heroDecoded = 0;
  let newMotionCompressed = 0;

  for (const source of sources) {
    const relativeDirectory =
      source.role === 'hero'
        ? 'hero'
        : path.join('characters', source.assetId);
    const outputDirectory = path.join(staged, relativeDirectory);
    const setFile = path.join(outputDirectory, 'set.json');
    newMotionCompressed += fs.statSync(setFile).size;
    let residentDecoded = 0;
    for (const clipName of source.candidate.clip_order) {
      const imageFile = path.join(outputDirectory, `${clipName}.webp`);
      const descriptorFile = path.join(
        outputDirectory,
        `${clipName}.json`,
      );
      const imageBytes = fs.statSync(imageFile).size;
      const descriptorBytes = fs.statSync(descriptorFile).size;
      const descriptor = JSON.parse(
        fs.readFileSync(descriptorFile, 'utf8'),
      );
      const decoded =
        descriptor.atlas.width * descriptor.atlas.height * 4;
      newMotionCompressed += imageBytes + descriptorBytes;
      residentDecoded += decoded;
      if (source.role === 'hero') {
        heroCompressed += imageBytes;
        heroDecoded += decoded;
      }
    }
    decodedByAsset.set(source.assetId, residentDecoded);
  }

  requireFact(
    heroCompressed <= MOTION_BUDGETS.heroCompressed,
    `Hero motion compressed: ${heroCompressed} bytes exceeds ${MOTION_BUDGETS.heroCompressed}`,
  );
  requireFact(
    newMotionCompressed <= MOTION_BUDGETS.newMotionCompressed,
    `new motion compressed: ${newMotionCompressed} bytes exceeds ${MOTION_BUDGETS.newMotionCompressed}`,
  );

  let maxWaveDecoded = 0;
  for (let index = 0; index < SMOOTH_WAVE_ASSETS.length; index += 1) {
    const nextIndex = (index + 1) % SMOOTH_WAVE_ASSETS.length;
    const currentAndNext = new Set([
      ...SMOOTH_WAVE_ASSETS[index],
      ...SMOOTH_WAVE_ASSETS[nextIndex],
    ]);
    const decoded = [...currentAndNext].reduce(
      (sum, assetId) => sum + (decodedByAsset.get(assetId) ?? 0),
      0,
    );
    maxWaveDecoded = Math.max(maxWaveDecoded, decoded);
  }
  requireFact(
    maxWaveDecoded <= MOTION_BUDGETS.waveDecoded,
    `current/next wave motion decoded: ${maxWaveDecoded} bytes exceeds ${MOTION_BUDGETS.waveDecoded}`,
  );

  const hotTextures = heroDecoded + maxWaveDecoded;
  requireFact(
    hotTextures < MOTION_BUDGETS.hotTextures,
    `hot textures: ${hotTextures} bytes must stay below ${MOTION_BUDGETS.hotTextures}`,
  );
  return {
    heroCompressed,
    newMotionCompressed,
    maxWaveDecoded,
    hotTextures,
  };
}

function visualFidelityClipCompressedLimit(role) {
  return visualFidelityEncodedLimit(role);
}

function visualFidelityClipDecodedLimit(role) {
  return visualFidelityDecodedLimit(role);
}

function selectedResidentDecodedBytes(source) {
  const clipDecoded = source.clips
    .map((clip) => clip.descriptor.media.decoded_bytes)
    .sort((left, right) => right - left);
  return (clipDecoded[0] ?? 0) + (clipDecoded[1] ?? 0);
}

function visualFidelityOutputBudgets(staged, sources) {
  const decodedByAsset = new Map();
  let heroCompressed = 0;
  let heroDecoded = 0;
  let newMotionCompressed = 0;

  for (const source of sources) {
    const relativeDirectory =
      source.role === 'hero'
        ? 'hero'
        : path.join('characters', source.assetId);
    const outputDirectory = path.join(staged, relativeDirectory);
    const setFile = path.join(outputDirectory, 'set.json');
    newMotionCompressed += fs.statSync(setFile).size;
    let assetCompressed = 0;
    for (const clipSource of source.clips) {
      const outputDescriptorPath = path.join(
        outputDirectory,
        `${clipSource.expected.name}.json`,
      );
      const outputDescriptorBytes = fs.statSync(outputDescriptorPath).size;
      const encodedBytes = clipSource.descriptor.media.encoded_bytes;
      const decodedBytes = clipSource.descriptor.media.decoded_bytes;
      requireFact(
        encodedBytes === clipSource.mediaBytes.length,
        `${source.assetId}/${clipSource.expected.name} descriptor encoded bytes drifted`,
      );
      requireFact(
        decodedBytes ===
          clipSource.descriptor.media.decoded_canvas[0] *
            clipSource.descriptor.media.decoded_canvas[1] *
            4,
        `${source.assetId}/${clipSource.expected.name} descriptor decoded bytes drifted`,
      );
      requireFact(
        encodedBytes <= visualFidelityClipCompressedLimit(source.role),
        `${source.assetId}/${clipSource.expected.name} selected WebP bytes exceed the role clip budget`,
      );
      requireFact(
        decodedBytes <= visualFidelityClipDecodedLimit(source.role),
        `${source.assetId}/${clipSource.expected.name} selected decoded RGBA exceeds the role clip budget`,
      );
      assetCompressed += encodedBytes + outputDescriptorBytes;
      if (source.role === 'hero') {
        heroCompressed += encodedBytes;
      }
      newMotionCompressed += encodedBytes + outputDescriptorBytes;
    }
    const residentDecoded = selectedResidentDecodedBytes(source);
    decodedByAsset.set(source.assetId, residentDecoded);
    if (source.role === 'hero') heroDecoded = residentDecoded;
  }

  requireFact(
    heroCompressed <= VISUAL_FIDELITY_BUDGETS.heroCompressedBytes,
    `Hero motion compressed: ${heroCompressed} bytes exceeds ${VISUAL_FIDELITY_BUDGETS.heroCompressedBytes}`,
  );
  requireFact(
    newMotionCompressed <= VISUAL_FIDELITY_BUDGETS.newMotionCompressedBytes,
    `new motion compressed: ${newMotionCompressed} bytes exceeds ${VISUAL_FIDELITY_BUDGETS.newMotionCompressedBytes}`,
  );

  let maxWaveDecoded = 0;
  for (let index = 0; index < SMOOTH_WAVE_ASSETS.length; index += 1) {
    const nextIndex = (index + 1) % SMOOTH_WAVE_ASSETS.length;
    const currentAndNext = new Set([
      ...SMOOTH_WAVE_ASSETS[index],
      ...SMOOTH_WAVE_ASSETS[nextIndex],
    ]);
    const decoded = [...currentAndNext].reduce(
      (sum, assetId) => sum + (decodedByAsset.get(assetId) ?? 0),
      0,
    );
    maxWaveDecoded = Math.max(maxWaveDecoded, decoded);
  }
  requireFact(
    maxWaveDecoded <= VISUAL_FIDELITY_BUDGETS.maxWaveDecodedBytes,
    `current/next wave motion decoded: ${maxWaveDecoded} bytes exceeds ${VISUAL_FIDELITY_BUDGETS.maxWaveDecodedBytes}`,
  );

  const hotTextures = heroDecoded + maxWaveDecoded;
  requireFact(
    hotTextures < VISUAL_FIDELITY_BUDGETS.hotTexturesBytes,
    `hot textures: ${hotTextures} bytes must stay below ${VISUAL_FIDELITY_BUDGETS.hotTexturesBytes}`,
  );
  return {
    heroCompressed,
    newMotionCompressed,
    maxWaveDecoded,
    hotTextures,
  };
}

function stagedBytes(staged) {
  return walkFiles(staged).reduce(
    (sum, file) => sum + fs.statSync(file).size,
    0,
  );
}

function v4ConsumerRoleFor(assetId, role) {
  if (assetId === 'site-sentinel') return 'elite';
  if (role === 'hero') return 'hero';
  if (role === 'boss') return 'boss';
  return 'standard';
}

function v4ExpectedDensity(role) {
  return role === 'hero' || role === 'boss' ? 320 : 256;
}

function v4RuntimeProfileMatches(consumerScale, role, assetId) {
  return (
    consumerScale?.role === v4ConsumerRoleFor(assetId, role) &&
    consumerScale?.runtime_canvas_class === v4ExpectedDensity(role)
  );
}

function v4LineageFromSet(source) {
  return {
    sourceBatchSha256: source.batchSummarySha256,
    derivativeSetSha256: source.derivativeSetSha256,
    masterSetSha256: source.masterSetSha256,
    selectedProfileSha256: source.selectedProfileSha256,
    v3LineageSha256: source.v3LineageSha256,
  };
}

function v4ClipPresentation(trim, consumerScale, clipName, sourceSha256) {
  const visibleHeight = Math.min(trim.height, consumerScale.source_visible_pixels);
  return {
    schemaVersion: 1,
    scaleContract: 'visible-body',
    reference: {
      clip: clipName,
      frameIndex: 0,
      sourceSha256,
    },
    visibleBounds: {
      x: 0,
      y: trim.height - visibleHeight,
      width: trim.width,
      height: visibleHeight,
    },
    motionBounds: {
      x: 0,
      y: 0,
      width: trim.width,
      height: trim.height,
    },
  };
}

function verifyVisualFidelityBatch(batch, profile) {
  exactObjectKeys(batch, V4_BATCH_KEYS, 'V4 batch summary');
  exactObjectKeys(batch?.profile, V4_PROFILE_KEYS, 'V4 batch profile');
  exactObjectKeys(
    batch?.source_authority,
    V4_BATCH_SOURCE_AUTHORITY_KEYS,
    'V4 batch source authority',
  );
  requireFact(batch?.schema_version === profile.batchSchemaVersion, 'V4 batch schema_version must be 1');
  requireFact(batch?.contract === profile.batchContract, 'V4 batch contract is invalid');
  requireFact(
    batch?.authority_status === 'unapproved_candidate' &&
      batch?.creative_approval === 'human_required' &&
      batch?.dry_run === false &&
      batch?.materialization_scope === 'exact_full_7_39_795',
    'V4 batch must remain an exact unapproved full candidate',
  );
  requireFact(
    batch?.atomic_publish === true &&
      batch?.fresh_output_required === true &&
      batch?.output_path === 'motion/authored-semantic-v4' &&
      batch?.overwrite === false,
    'V4 batch atomic publish boundary drifted',
  );
  requireFact(batch?.per_frame_runtime_png_published === false, 'V4 batch must remain selected-only without runtime PNGs');
  requireFact(
    batch?.asset_count === profile.counts.assets &&
      batch?.clip_count === profile.counts.clips &&
      batch?.frame_count === profile.counts.frames,
    'V4 batch must contain the exact 7/39/795 authority',
  );
  requireFact(
    batch?.clip_descriptor_count === profile.counts.clips &&
      batch?.clip_evidence_count === profile.counts.clips &&
      batch?.clip_webp_atlas_count === profile.counts.clips &&
      batch?.derivative_set_count === profile.counts.assets &&
      batch?.master_png_count === profile.counts.frames &&
      batch?.root_application_count === profile.counts.frames,
    'V4 batch inventory counts drifted',
  );
  requireFact(
    batch?.profile?.profile_sha256 === V4_SELECTED_PROFILE_SHA256 &&
      batch?.profile?.profile_id === 'lossless-webp' &&
      batch?.profile?.selection_authority_path === V4_SELECTION_AUTHORITY.path &&
      batch?.profile?.selection_authority_sha256 === V4_SELECTION_AUTHORITY.sha256,
    'V4 selected profile binding drifted',
  );
  requireFact(
      batch?.source_authority?.encoding_selection_path === V4_SELECTION_AUTHORITY.path &&
      batch?.source_authority?.encoding_selection_sha256 === V4_SELECTION_AUTHORITY.sha256 &&
      batch?.source_authority?.v4_contract_path ===
        'briefs/authored-semantic-v4/contract.json' &&
      batch?.source_authority?.v4_contract_sha256 ===
        'cf3020a6e62d51996f90f90af9ca8e32f1e378b51274a519c28f133b0f9ccb75',
    'V4 source authority contract/selection binding drifted',
  );
  requireFact(
    batch?.network_calls === 0 && batch?.provider_calls === 0,
    'V4 batch safety boundary drifted',
  );
  requireFact(
    Array.isArray(batch?.asset_sets) && batch.asset_sets.length === profile.counts.assets,
    'V4 batch asset set membership differs from the exact APN cast',
  );
  requireFact(
    batch.batch_inventory_sha256 ===
      authorityHash('gaf2d:apn-v4-selected-batch-v1', batch.asset_sets),
    'V4 batch inventory authority drifted',
  );
}

function verifyVisualFidelityAsset(root, batchRecord, spec, batchSummarySha256, v3Source) {
  const v4Root = path.join(root, 'motion', 'authored-semantic-v4');
  requireFact(batchRecord?.asset_id === spec.assetId, `${spec.assetId} V4 batch asset order drifted`);
  const setRecord = readTrackedJson(
    v4Root,
    batchRecord.path,
    batchRecord.sha256,
    `${spec.assetId} V4 derivative set`,
  );
  const derivativeSet = setRecord.value;
  exactObjectKeys(
    derivativeSet,
    V4_DERIVATIVE_SET_KEYS,
    `${spec.assetId} V4 derivative set`,
  );
  exactObjectKeys(
    derivativeSet?.profile,
    V4_PROFILE_KEYS,
    `${spec.assetId} V4 derivative set profile`,
  );
  requireFact(
    derivativeSet?.contract === 'apn-visual-fidelity-v4-derivative-set-v1' &&
      derivativeSet?.asset_id === spec.assetId &&
      derivativeSet?.clip_count === spec.clips.length &&
      derivativeSet?.frame_count === spec.clips.reduce((sum, clip) => sum + clip.frames, 0),
    `${spec.assetId} V4 derivative set authority drifted`,
  );
  requireFact(
    derivativeSet?.profile?.profile_id === 'lossless-webp' &&
      derivativeSet?.profile?.profile_sha256 === V4_SELECTED_PROFILE_SHA256 &&
      derivativeSet?.profile?.selection_authority_path === V4_SELECTION_AUTHORITY.path &&
      derivativeSet?.profile?.selection_authority_sha256 === V4_SELECTION_AUTHORITY.sha256,
    `${spec.assetId} V4 derivative set selected profile drifted`,
  );
  requireFact(
    derivativeSet?.runtime_density === v4ExpectedDensity(spec.role) &&
      v4RuntimeProfileMatches(derivativeSet.consumer_scale, spec.role, spec.assetId),
    `${spec.assetId} V4 derivative set consumer scale drifted`,
  );
  const clips = [];
  for (const expected of spec.clips) {
    const clipRecord = derivativeSet.clips.find((clip) => clip.clip_id === expected.name);
    requireFact(
      clipRecord &&
        clipRecord.frame_count === expected.frames &&
        clipRecord.fps === expected.fps &&
        clipRecord.playback === expected.playback,
      `${spec.assetId}/${expected.name} V4 derivative set semantic clip order drifted`,
    );
    const descriptorRecord = readTrackedJson(
      v4Root,
      clipRecord.descriptor_path,
      clipRecord.descriptor_sha256,
      `${spec.assetId}/${expected.name} V4 clip descriptor`,
    );
    const descriptor = descriptorRecord.value;
    exactObjectKeys(
      descriptor?.profile,
      V4_DESCRIPTOR_PROFILE_KEYS,
      `${spec.assetId}/${expected.name} V4 descriptor profile`,
    );
    exactObjectKeys(
      descriptor?.profile?.encoder,
      V4_TOOL_VERSION_KEYS,
      `${spec.assetId}/${expected.name} V4 encoder tool`,
    );
    exactObjectKeys(
      descriptor?.profile?.decoder,
      V4_TOOL_VERSION_KEYS,
      `${spec.assetId}/${expected.name} V4 decoder tool`,
    );
    exactObjectKeys(
      descriptor?.source_authority,
      V4_DESCRIPTOR_SOURCE_AUTHORITY_KEYS,
      `${spec.assetId}/${expected.name} V4 source authority`,
    );
    const mediaBytes = readTracked(
      v4Root,
      clipRecord.media_path,
      clipRecord.media_file_sha256,
      `${spec.assetId}/${expected.name} V4 selected WebP media`,
      MAX_FRAME_BYTES,
    ).bytes;
    requireFact(
      v4RuntimeProfileMatches(descriptor?.consumer_scale, spec.role, spec.assetId),
      `${spec.assetId}/${expected.name} descriptor consumer scale drifted`,
    );
    requireFact(
      descriptor?.contract === 'apn-visual-fidelity-v4-clip-descriptor-v1' &&
        descriptor?.semantic?.frame_count === expected.frames &&
        descriptor?.semantic?.fps === expected.fps &&
        descriptor?.semantic?.playback === expected.playback &&
        descriptor?.profile?.profile_id === 'lossless-webp' &&
        descriptor?.profile?.profile_sha256 === V4_SELECTED_PROFILE_SHA256 &&
        arraysEqual(descriptor?.profile?.arguments, ['-quiet', '-exact', '-lossless', '-q', '100', '-m', '6']) &&
        arraysEqual(descriptor?.profile?.encode_argv_template, [
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
        ]) &&
        arraysEqual(descriptor?.profile?.decode_argv_template, [
          'dwebp',
          '-quiet',
          '{candidate_webp}',
          '-o',
          '{decoded_png}',
        ]) &&
        descriptor?.profile?.encoder?.name === 'cwebp' &&
        descriptor?.profile?.encoder?.version === '1.6.0' &&
        descriptor?.profile?.decoder?.name === 'dwebp' &&
        descriptor?.profile?.decoder?.version === '1.6.0' &&
        descriptor?.profile?.selection_authority_path === V4_SELECTION_AUTHORITY.path &&
        descriptor?.profile?.selection_authority_sha256 === V4_SELECTION_AUTHORITY.sha256 &&
        descriptor?.media?.file_sha256 === clipRecord.media_file_sha256 &&
        descriptor?.media?.path === clipRecord.media_path &&
        descriptor?.media?.encoded_bytes === mediaBytes.length &&
        descriptor?.media?.decoded_bytes ===
          descriptor?.media?.decoded_canvas?.[0] *
            descriptor?.media?.decoded_canvas?.[1] *
            4 &&
        descriptor?.media?.alpha_byte_exact === true &&
        descriptor?.media?.decoded_rgba_byte_exact === true &&
        descriptor?.media?.transparent_rgb_zero === true &&
        descriptor?.evidence?.path === `${spec.assetId}/clips/${expected.name}/evidence.json`,
      `${spec.assetId}/${expected.name} V4 descriptor authority drifted`,
    );
    requireFact(
      jsonEqual(webpSize(mediaBytes), {
        width: descriptor.media.decoded_canvas[0],
        height: descriptor.media.decoded_canvas[1],
      }),
      `${spec.assetId}/${expected.name} V4 selected WebP intrinsic canvas drifted`,
    );
    requireFact(
      descriptor?.source_authority?.v3_acting_contract_sha256 ===
        v3Source.actingContractSha256 &&
        descriptor?.source_authority?.v3_batch_summary_path ===
          v3Source.batchSummaryPath &&
        descriptor?.source_authority?.v3_batch_summary_sha256 ===
          v3Source.batchSummarySha256 &&
        descriptor?.source_authority?.v3_clip_manifest_path ===
          v3Source.clipManifestPath &&
        descriptor?.source_authority?.v3_clip_manifest_sha256 ===
          v3Source.clipManifestSha256 &&
        descriptor?.source_authority?.v3_pose_manifest_path ===
          v3Source.poseManifestPath &&
        descriptor?.source_authority?.v3_pose_manifest_sha256 ===
          v3Source.poseManifestSha256 &&
        descriptor?.source_authority?.v3_pose_authority_path ===
          v3Source.poseAuthorityPath &&
        descriptor?.source_authority?.v3_pose_authority_sha256 ===
          v3Source.poseAuthoritySha256 &&
        descriptor?.source_authority?.v3_producer_clip_manifest_path ===
          v3Source.producerClipManifestPath &&
        descriptor?.source_authority?.v3_producer_clip_manifest_sha256 ===
          v3Source.producerClipManifestSha256,
      `${spec.assetId}/${expected.name} V4 source authority drifted`,
    );
    const evidence = readTrackedJson(
      v4Root,
      descriptor.evidence.path,
      descriptor.evidence.sha256,
      `${spec.assetId}/${expected.name} V4 clip evidence`,
    ).value;
    exactObjectKeys(
      evidence,
      V4_EVIDENCE_KEYS,
      `${spec.assetId}/${expected.name} V4 clip evidence`,
    );
    exactObjectKeys(
      evidence?.mechanical_evidence,
      V4_MECHANICAL_EVIDENCE_KEYS,
      `${spec.assetId}/${expected.name} V4 mechanical evidence`,
    );
    requireFact(
      descriptor?.consumer_scale?.role ===
        evidence?.prepack_manifest?.runtime_profile?.role &&
        descriptor?.consumer_scale?.maximum_css_body_height ===
          evidence?.prepack_manifest?.runtime_profile?.maximum_css_body_height &&
        descriptor?.consumer_scale?.displayed_device_pixels ===
          evidence?.prepack_manifest?.runtime_measurement?.displayed_device_pixels &&
        descriptor?.consumer_scale?.runtime_canvas_class ===
          evidence?.prepack_manifest?.runtime_density &&
        descriptor?.consumer_scale?.source_visible_pixels ===
          evidence?.prepack_manifest?.runtime_measurement?.source_visible_pixels &&
        descriptor?.consumer_scale?.scale_ratio?.numerator ===
          evidence?.prepack_manifest?.runtime_measurement?.scale_ratio_numerator &&
        descriptor?.consumer_scale?.scale_ratio?.denominator ===
          evidence?.prepack_manifest?.runtime_measurement?.scale_ratio_denominator,
      `${spec.assetId}/${expected.name} descriptor consumer scale drifted`,
    );
    requireFact(
      evidence?.prepack_manifest?.asset_id === spec.assetId &&
        evidence?.prepack_manifest?.clip_id === expected.name &&
        evidence?.prepack_manifest?.contract === 'apn-visual-fidelity-v4-clip' &&
        evidence?.prepack_manifest?.authority_status === 'unapproved_candidate' &&
        evidence?.prepack_manifest?.creative_approval === 'human_required' &&
        evidence?.prepack_manifest?.derivative_sets_per_asset === 1 &&
        evidence?.prepack_manifest?.encoding_evaluation?.application_status ===
          'required_for_selected_boundary' &&
        evidence?.prepack_manifest?.encoding_evaluation?.published_runtime_authority ===
          'per_clip_lossless_webp_atlas_only' &&
        evidence?.prepack_manifest?.encoding_evaluation?.selected_profile_id ===
          'lossless-webp' &&
        evidence?.prepack_manifest?.encoding_evaluation?.selected_profile_sha256 ===
          V4_SELECTED_PROFILE_SHA256 &&
        evidence?.prepack_manifest?.encoding_evaluation?.selection_authority_path ===
          V4_SELECTION_AUTHORITY.path &&
        evidence?.prepack_manifest?.encoding_evaluation?.selection_authority_sha256 ===
          V4_SELECTION_AUTHORITY.sha256 &&
        evidence?.prepack_manifest?.encoding_evaluation?.status === 'selected',
      `${spec.assetId}/${expected.name} V4 prepack manifest authority drifted`,
    );
    requireFact(
      evidence?.contract === 'apn-visual-fidelity-v4-clip-pack-evidence-v1' &&
        evidence?.mechanical_evidence?.contract === 'apn-visual-fidelity-v4-evidence' &&
        evidence?.mechanical_evidence?.mechanical_qa === 'passed' &&
        evidence?.mechanical_evidence?.network_calls === 0 &&
        evidence?.mechanical_evidence?.provider_calls === 0 &&
        evidence?.mechanical_evidence?.runtime_derivatives_master_only === true &&
        evidence?.mechanical_evidence?.transparent_rgb_zero === true &&
        evidence?.mechanical_evidence?.v3_pose_match === true &&
        evidence?.mechanical_evidence?.v3_root_match === true &&
        evidence?.mechanical_evidence?.v3_timeline_match === true &&
        evidence?.prepack_manifest_sha256 ===
          sha256Bytes(
            Buffer.from(`${JSON.stringify(evidence.prepack_manifest, null, 2)}\n`),
          ) &&
        evidence?.prepack_manifest_sha256 === descriptor.prepack_manifest_sha256,
      `${spec.assetId}/${expected.name} V4 clip evidence drifted`,
    );
    clips.push({
      expected,
      descriptor,
      descriptorSha256: clipRecord.descriptor_sha256,
      mediaBytes,
      mediaSha256: clipRecord.media_file_sha256,
      mediaPath: clipRecord.media_path,
    });
  }
  requireFact(
    derivativeSet.master_set_sha256 ===
      authorityHash(
        'gaf2d:apn-v4-master-set-v1',
        derivativeSet.clips.map((clip) => ({
          clip_id: clip.clip_id,
          frame_count: clip.frame_count,
          master_inventory_sha256:
            clips.find((entry) => entry.expected.name === clip.clip_id)
              ?.descriptor.master_inventory_sha256,
        })),
      ),
    `${spec.assetId} V4 derivative set master inventory authority drifted`,
  );
  requireFact(
    derivativeSet.v3_lineage_sha256 ===
      authorityHash(
        'gaf2d:apn-v4-asset-v3-lineage-v1',
        derivativeSet.clips.map((clip) => ({
          clip_id: clip.clip_id,
          source_authority: clips.find(
            (entry) => entry.expected.name === clip.clip_id,
          )?.descriptor.source_authority,
        })),
      ),
    `${spec.assetId} V4 derivative set V3 lineage authority drifted`,
  );
  return {
    assetId: spec.assetId,
    role: spec.role,
    manifestVersion: 4,
    batchSummarySha256,
    derivativeSet,
    derivativeSetSha256: batchRecord.sha256,
    masterSetSha256: derivativeSet.master_set_sha256,
    selectedProfileSha256: derivativeSet.profile.profile_sha256,
    v3LineageSha256: derivativeSet.v3_lineage_sha256,
    consumerScale: derivativeSet.consumer_scale,
    v3Source,
    clips,
  };
}

function buildVisualFidelityMotionSet({ source, staged, batchSummarySha256 }) {
  const relativeDirectory =
    source.role === 'hero'
      ? 'hero'
      : path.posix.join('characters', source.assetId);
  const outputDirectory = path.join(staged, ...relativeDirectory.split('/'));
  fs.mkdirSync(outputDirectory, { recursive: true });
  const setClips = {};
  const manifestClips = {};
  const descriptorBuilds = new Map();
  const setLineage = v4LineageFromSet(source);
  let aggregateTrim = null;
  let aggregatePivot = null;
  let aggregatePresentation = null;
  for (const clipSource of source.clips) {
    const { expected, descriptor, descriptorSha256, mediaBytes, mediaSha256, mediaPath } =
      clipSource;
    const v3Clip = source.v3Source.candidate.clips[expected.name];
    const v3BodyPoseSha256 = source.v3Source.bodyPoseSha256.get(expected.name);
    const runtimeCanvas = descriptor.runtime_canvas;
    const trim = {
      ...descriptor.packing.source_trim,
    };
    const pivot = {
      x: descriptor.packing.shared_pivot.runtime_canvas_pixels[0] / runtimeCanvas[0],
      y: descriptor.packing.shared_pivot.runtime_canvas_pixels[1] / runtimeCanvas[1],
    };
    const frames = descriptor.frames.map((frame, index) => ({
      x: frame.atlas_rect[0],
      y: frame.atlas_rect[1],
      width: frame.atlas_rect[2],
      height: frame.atlas_rect[3],
      sourceSha256: frame.master.file_sha256,
      bodyPoseSha256: v3BodyPoseSha256[index],
    }));
    const projected = {
      grammar: MOTION_CLIP_GRAMMAR,
      authority: 'unapproved_preview',
      sourceFamily: VISUAL_FIDELITY_SOURCE_FAMILY,
      assetId: source.assetId,
      name: expected.name,
      playback: v3Clip.playback,
      fps: v3Clip.fps,
      sourceFps: v3Clip.source_fps,
      cadenceProfile: v3Clip.cadence_profile,
      authoringMethod: v3Clip.authoring_method,
      interpolationMethod: v3Clip.interpolation_method,
      holds: v3Clip.holds.map((hold) => ({
        startIndex: hold.start_index,
        endIndex: hold.end_index,
        reason: hold.reason,
      })),
      markers: markerIndices(v3Clip, source.assetId, expected.name),
      frames,
      atlas: {
        width: descriptor.media.decoded_canvas[0],
        height: descriptor.media.decoded_canvas[1],
        bytes: mediaBytes.length,
        sha256: mediaSha256,
      },
      trim,
      pivot,
      presentation: v4ClipPresentation(
        trim,
        descriptor.consumer_scale,
        expected.name,
        descriptor.frames[0].master.file_sha256,
      ),
      lineage: {
        ...setLineage,
        sourceDescriptorSha256: descriptorSha256,
        sourceEvidenceSha256: descriptor.evidence.sha256,
        sourceMediaSha256: mediaSha256,
        masterInventorySha256: descriptor.master_inventory_sha256,
      },
      encoder: {
        name: 'cwebp',
        version: '1.6.0',
        arguments: ['-quiet', '-exact', '-lossless', '-q', '100', '-m', '6'],
        profileSha256: source.selectedProfileSha256,
      },
    };
    const outputDescriptorPath = path.join(outputDirectory, `${expected.name}.json`);
    const outputMediaPath = path.join(outputDirectory, `${expected.name}.webp`);
    const descriptorBytes = writeCanonical(outputDescriptorPath, projected);
    fs.writeFileSync(outputMediaPath, mediaBytes, { flag: 'wx' });
    setClips[expected.name] = {
      descriptor: `${expected.name}.json`,
      descriptorSha256: sha256Bytes(descriptorBytes),
      image: `${expected.name}.webp`,
      imageSha256: mediaSha256,
    };
    const publicBase = `.gaf2d-preview/${relativeDirectory}`;
    manifestClips[expected.name] = {
      descriptor: `${publicBase}/${expected.name}.json`,
      descriptorSha256: sha256Bytes(descriptorBytes),
      image: `${publicBase}/${expected.name}.webp`,
      imageSha256: mediaSha256,
    };
    descriptorBuilds.set(expected.name, {
      descriptor: projected,
      descriptorSha256: sha256Bytes(descriptorBytes),
      imageSha256: mediaSha256,
      imageBytes: mediaBytes.length,
    });
    if (!aggregatePresentation) {
      aggregateTrim = trim;
      aggregatePivot = pivot;
      aggregatePresentation = projected.presentation;
    }
  }
  const frameSize = {
    width: source.derivativeSet.runtime_density,
    height: source.derivativeSet.runtime_density,
  };
  const set = {
    grammar: MOTION_SET_INDEX_GRAMMAR,
    authority: 'unapproved_preview',
    status: 'human_review_required',
    sourceFamily: VISUAL_FIDELITY_SOURCE_FAMILY,
    assetId: source.assetId,
    role: source.role,
    frameSize,
    trim: aggregateTrim,
    pivot: { x: 0.5, y: 1 },
    presentation: aggregatePresentation,
    clips: setClips,
    consumerScale: {
      grammar: source.consumerScale.grammar,
      role: source.consumerScale.role,
      maximumCssBodyHeight: source.consumerScale.maximum_css_body_height,
      maximumDpr: source.consumerScale.maximum_dpr_numerator,
      displayedDevicePixels: source.consumerScale.displayed_device_pixels,
      runtimeCanvasClass: source.consumerScale.runtime_canvas_class,
      sourceVisiblePixels: source.consumerScale.source_visible_pixels,
      scaleRatio: {
        numerator: source.consumerScale.scale_ratio.numerator,
        denominator: source.consumerScale.scale_ratio.denominator,
      },
    },
    previewLineage: {
      candidateId: source.v3Source.candidate.candidate_id,
      candidateSha256: source.v3Source.candidateSha256,
      temporalEvidenceSha256: source.v3Source.temporalEvidenceSha256,
      qaSummarySha256: source.v3Source.qaSummarySha256,
      batchSummarySha256,
      sourceManifestVersion: source.v3Source.manifestVersion,
    },
    lineage: setLineage,
    toolchain: {
      grammar: V4_TOOLCHAIN.grammar,
      compositor: { ...V4_TOOLCHAIN.compositor },
      encoder: {
        name: 'cwebp',
        version: '1.6.0',
        arguments: ['-quiet', '-exact', '-lossless', '-q', '100', '-m', '6'],
        profileSha256: source.selectedProfileSha256,
      },
      operations: [...V4_TOOLCHAIN.operations],
      profileSha256: source.selectedProfileSha256,
    },
  };
  const setErrors = validateMotionSetIndex(set, source.assetId, {
    role: source.role,
    consumerRole: v4ConsumerRoleFor(source.assetId, source.role),
    selectedProfileSha256: source.selectedProfileSha256,
  });
  requireFact(
    setErrors.length === 0,
    `${source.assetId} V4 motion-set index failed runtime validation: ${setErrors.join('; ')}`,
  );
  for (const { expected } of source.clips) {
    const build = descriptorBuilds.get(expected.name);
    const descriptorErrors = validateMotionClipDescriptor(
      build.descriptor,
      expected.name,
      set,
      {
        role: source.role,
        consumerRole: v4ConsumerRoleFor(source.assetId, source.role),
        descriptorSha256: build.descriptorSha256,
        imageSha256: build.imageSha256,
        imageBytes: build.imageBytes,
        selectedProfileSha256: source.selectedProfileSha256,
      },
    );
    requireFact(
      descriptorErrors.length === 0,
      `${source.assetId}/${expected.name} V4 clip descriptor failed runtime validation: ${descriptorErrors.join('; ')}`,
    );
  }
  const setBytes = writeCanonical(path.join(outputDirectory, 'set.json'), set);
  const publicBase = `.gaf2d-preview/${relativeDirectory}/`;
  return {
    authority: 'unapproved_preview',
    assetId: source.assetId,
    role: source.role,
    basePath: publicBase,
    set: `${publicBase}set.json`,
    setSha256: sha256Bytes(setBytes),
    clips: manifestClips,
    consumerScale: set.consumerScale,
    transform: {
      scalePpm: Math.round((frameSize.width / 512) * 1_000_000),
      sourceFrameSize: { width: 512, height: 512 },
      sourceTrim: {
        x: Math.round((aggregateTrim.x * 512) / frameSize.width),
        y: Math.round((aggregateTrim.y * 512) / frameSize.height),
        width: Math.round((aggregateTrim.width * 512) / frameSize.width),
        height: Math.round((aggregateTrim.height * 512) / frameSize.height),
      },
      runtimeFrameSize: frameSize,
      runtimeTrim: aggregateTrim,
    },
  };
}

function sourceManifestRecord(source) {
  if (source.derivativeSet) {
    return {
      derivativeSetSha256: source.derivativeSetSha256,
      masterSetSha256: source.masterSetSha256,
      selectedProfileSha256: source.selectedProfileSha256,
      sourceBatchSha256: source.batchSummarySha256,
      sourceManifestVersion: source.manifestVersion,
      v3LineageSha256: source.v3LineageSha256,
    };
  }
  return {
    assetManifestSha256: source.assetManifestSha256,
    candidateId: source.candidate.candidate_id,
    candidateSha256: source.candidateSha256,
    clipManifestSha256: source.clipManifestSha256,
    frameHashesSha256: source.frameHashesSha256,
    identitySha256: source.identitySha256,
    qaSummarySha256: source.qaSummarySha256,
    reviewEvidenceSha256: source.reviewEvidenceSha256,
    reviewHtmlSha256: source.reviewHtmlSha256,
    sourceManifestVersion: source.manifestVersion,
    ...(source.actingContractSha256
      ? { actingContractSha256: source.actingContractSha256 }
      : {}),
    ...(source.temporalEvidenceSha256
      ? { temporalEvidenceSha256: source.temporalEvidenceSha256 }
      : {}),
  };
}

export function buildGaf2dPreview(options = {}) {
  requireFact(options.gaf2dProjectRoot, 'GAF2D project root is required');
  requireFact(options.outputRoot, 'preview output root is required');
  const sourceFamily =
    options.sourceFamily ?? SMOOTH_SOURCE_FAMILY;
  const profile = SOURCE_PROFILES[sourceFamily];
  requireFact(
    profile,
    `source family must be "${LEGACY_SOURCE_FAMILY}" or "${SMOOTH_SOURCE_FAMILY}"`,
  );
  const sourceRoot = path.resolve(options.gaf2dProjectRoot);
  const outputRoot = path.resolve(options.outputRoot);
  const sourceStats = fs.lstatSync(sourceRoot);
  requireFact(
    sourceStats.isDirectory() && !sourceStats.isSymbolicLink(),
    'GAF2D project root must be a real directory',
  );
  requireFact(
    outputRoot !== sourceRoot &&
      !outputRoot.startsWith(`${sourceRoot}${path.sep}`),
    'preview output must remain outside the GAF2D source project',
  );

  const batchFile = resolveInside(
    sourceRoot,
    profile.batchRelative,
    'batch summary',
  );
  const { bytes: batchBytes, value: batch } =
    readJsonBytes(batchFile, 'batch summary');
  const visualFidelity = profile.visualFidelity === true;
  const actingAuthority =
    profile.perClip || visualFidelity
      ? canonicalActingContract()
      : null;
  if (actingAuthority) {
    const sourceContract = readTracked(
      sourceRoot,
      actingAuthority.path,
      actingAuthority.sha256,
      'GAF2D V3 acting contract',
      MAX_JSON_BYTES,
    );
    requireFact(
      sourceContract.bytes.equals(actingAuthority.bytes),
      'GAF2D V3 acting contract differs from the repo snapshot',
    );
  }
  if (visualFidelity) {
    verifyVisualFidelityBatch(batch, profile);
  } else {
    verifyBatch(batch, profile, actingAuthority);
  }
  const batchSummarySha256 = sha256Bytes(batchBytes);
  const v3Sources = visualFidelity
    ? (() => {
        const v3Profile = SOURCE_PROFILES[SMOOTH_SOURCE_FAMILY];
        const v3BatchFile = resolveInside(
          sourceRoot,
          v3Profile.batchRelative,
          'V3 batch summary',
        );
        const { bytes: v3BatchBytes, value: v3Batch } = readJsonBytes(
          v3BatchFile,
          'V3 batch summary',
        );
        const v3BatchSummarySha256 = sha256Bytes(v3BatchBytes);
        verifyBatch(v3Batch, v3Profile, actingAuthority);
        const v3BatchByAsset = new Map(
          v3Batch.assets.map((record) => [record.asset_id, record]),
        );
        return new Map(
          v3Profile.specs.map((spec) => [
            spec.assetId,
            verifySourceAsset(
              sourceRoot,
              v3BatchByAsset.get(spec.assetId),
              spec,
              v3Profile,
              actingAuthority,
              v3BatchSummarySha256,
            ),
          ]),
        );
      })()
    : null;
  const sources = visualFidelity
    ? (() => {
        const batchByAsset = new Map(
          batch.asset_sets.map((record) => [record.asset_id, record]),
        );
        requireFact(
          batchByAsset.size === profile.counts.assets &&
            profile.specs.every((spec) => batchByAsset.has(spec.assetId)),
          'V4 batch asset membership differs from the exact APN preview cast',
        );
        return profile.specs.map((spec) =>
          verifyVisualFidelityAsset(
            sourceRoot,
            batchByAsset.get(spec.assetId),
            spec,
            batchSummarySha256,
            v3Sources.get(spec.assetId),
          ),
        );
      })()
    : (() => {
        const batchByAsset = new Map(
          batch.assets.map((record) => [record.asset_id, record]),
        );
        requireFact(
          batchByAsset.size === profile.counts.assets &&
            profile.specs.every((spec) => batchByAsset.has(spec.assetId)),
          'batch asset membership differs from the exact APN preview cast',
        );
        return profile.specs.map((spec) =>
          verifySourceAsset(
            sourceRoot,
            batchByAsset.get(spec.assetId),
            spec,
            profile,
            actingAuthority,
            batchSummarySha256,
          ),
        );
      })();

  const encoderArguments = visualFidelity
    ? null
    : options.encoderArguments ?? [...CANONICAL_CWEBP_ARGUMENTS];
  const cwebpPath = visualFidelity
    ? null
    : options.cwebpPath ?? process.env.CWEBP ?? 'cwebp';
  const magickPath = visualFidelity
    ? null
    : options.magickPath ?? process.env.MAGICK ?? 'magick';
  const derivatives = visualFidelity
    ? null
    : {
        inspectFrame:
          options.derivatives?.inspectFrame ??
          ((file) => defaultInspectFrame(file, magickPath)),
        validateTools:
          options.derivatives?.validateTools ?? validateDerivativeTools,
        buildAtlas:
          options.derivatives?.buildAtlas ?? buildScaledPreviewAtlas,
      };
  const toolFacts = visualFidelity
    ? null
    : derivatives.validateTools(
        cwebpPath,
        magickPath,
        encoderArguments,
      );
  if (!visualFidelity) {
    requireFact(
      toolFacts?.cwebpVersion === '1.6.0' &&
        toolFacts?.derivativeToolchainSha256 ===
          DERIVATIVE_TOOLCHAIN_SHA256,
      'derivative toolchain does not match the pinned preview profile',
    );
  }

  const parent = path.dirname(outputRoot);
  fs.mkdirSync(parent, { recursive: true });
  const parentStats = fs.lstatSync(parent);
  requireFact(
    parentStats.isDirectory() && !parentStats.isSymbolicLink(),
    'preview output parent must be a real directory',
  );
  const staged = fs.mkdtempSync(
    path.join(parent, `.${path.basename(outputRoot)}.`),
  );
  let published = false;
  try {
    const characters = {};
    let hero;
    for (const source of sources) {
      if (visualFidelity) {
        const result = buildVisualFidelityMotionSet({
          source,
          staged,
          batchSummarySha256,
        });
        if (source.role === 'hero') {
          hero = result;
        } else {
          characters[source.assetId] = result;
        }
      } else if (profile.perClip) {
        const result = buildPerClipMotionSet({
          source,
          staged,
          batchSummarySha256,
          derivatives,
          magickPath,
          cwebpPath,
          encoderArguments,
          toolFacts,
        });
        if (source.role === 'hero') {
          hero = result;
        } else {
          characters[source.assetId] = result;
        }
      } else if (source.role === 'hero') {
        hero = buildHero({
          source,
          staged,
          batchSummarySha256,
          derivatives,
          magickPath,
          cwebpPath,
          encoderArguments,
          toolFacts,
        });
      } else {
        characters[source.assetId] = buildCreature({
          source,
          staged,
          batchSummarySha256,
          derivatives,
          magickPath,
          cwebpPath,
          encoderArguments,
          toolFacts,
        });
      }
    }
    requireFact(hero, 'APN Hero preview output is missing');
    const measuredBudgets = profile.perClip
      ? visualFidelity
        ? visualFidelityOutputBudgets(staged, sources)
        : smoothOutputBudgets(staged, sources)
      : null;
    const manifest = {
      grammar: PREVIEW_MANIFEST_GRAMMAR,
      authority: 'unapproved_preview',
      status: 'human_review_required',
      sourceFamily,
      packId: 'valorant',
      counts: { ...profile.counts },
      source: {
        batchSummarySha256,
        contract: batch.contract,
        mechanicalQa: batch.mechanical_qa ?? 'passed',
        creativeApproval: batch.creative_approval,
        networkCalls: batch.network_calls,
        providerCalls: batch.provider_calls,
        providerClipCount: batch.provider_clip_count ?? 0,
        ...(actingAuthority
          ? {
              actingContractPath: actingAuthority.path,
              actingContractSha256: actingAuthority.sha256,
            }
          : {}),
      },
      assets: Object.fromEntries(
        sources.map((source) => [
          source.assetId,
          sourceManifestRecord(source),
        ]),
      ),
      hero,
      characters,
      ...(measuredBudgets
        ? {
            budgets: {
              heroCompressed: {
                bytes: measuredBudgets.heroCompressed,
                limit: visualFidelity
                  ? VISUAL_FIDELITY_BUDGETS.heroCompressedBytes
                  : MOTION_BUDGETS.heroCompressed,
              },
              newMotionCompressed: {
                bytes: measuredBudgets.newMotionCompressed,
                limit: visualFidelity
                  ? VISUAL_FIDELITY_BUDGETS.newMotionCompressedBytes
                  : MOTION_BUDGETS.newMotionCompressed,
              },
              maxWaveDecoded: {
                bytes: measuredBudgets.maxWaveDecoded,
                limit: visualFidelity
                  ? VISUAL_FIDELITY_BUDGETS.maxWaveDecodedBytes
                  : MOTION_BUDGETS.waveDecoded,
              },
              hotTextures: {
                bytes: measuredBudgets.hotTextures,
                limit: visualFidelity
                  ? VISUAL_FIDELITY_BUDGETS.hotTexturesBytes
                  : MOTION_BUDGETS.hotTextures,
              },
            },
          }
        : {}),
      toolchain: visualFidelity
        ? {
            grammar: V4_TOOLCHAIN.grammar,
            compositor: { ...V4_TOOLCHAIN.compositor },
            encoder: {
              name: 'cwebp',
              version: '1.6.0',
              arguments: [
                '-quiet',
                '-exact',
                '-lossless',
                '-q',
                '100',
                '-m',
                '6',
              ],
              profileSha256: V4_SELECTED_PROFILE_SHA256,
            },
            operations: [...V4_TOOLCHAIN.operations],
            profileSha256: V4_SELECTED_PROFILE_SHA256,
          }
        : {
            grammar: PREVIEW_DERIVATIVE_TOOLCHAIN.grammar,
            compositor: { ...DERIVATIVE_TOOLCHAIN.compositor },
            encoder: encoderFacts(toolFacts, encoderArguments),
            operations: [...PREVIEW_DERIVATIVE_TOOLCHAIN.operations],
            profileSha256: HERO_PREVIEW_MATRIX_PROFILE_SHA256,
          },
    };
    const manifestBytes = writeCanonical(
      path.join(staged, 'manifest.json'),
      manifest,
    );
    const serialized = manifestBytes.toString('utf8');
    requireFact(
      !serialized.includes(sourceRoot) &&
        !serialized.includes(outputRoot) &&
        (!cwebpPath || !serialized.includes(path.resolve(cwebpPath))) &&
        (!magickPath || !serialized.includes(path.resolve(magickPath))),
      'preview manifest leaked a machine-local path',
    );
    const firstPlayable = stagedBytes(staged);
    if (profile.perClip && !visualFidelity) {
      requireFact(
        firstPlayable < ASSET_BUDGETS.firstPlayable,
        `first-playable: ${firstPlayable} bytes must stay below ${ASSET_BUDGETS.firstPlayable}`,
      );
    }
    const publish = atomicPublishDirectory(staged, outputRoot);
    published = true;
    return {
      passed: true,
      authority: 'unapproved_preview',
      status: 'human_review_required',
      counts: { ...profile.counts },
      manifestSha256: sha256Bytes(manifestBytes),
      output: path.basename(outputRoot),
      ...(measuredBudgets
        ? {
            budgets: {
              ...measuredBudgets,
              ...(visualFidelity ? {} : { firstPlayable }),
            },
          }
        : {}),
      warnings: publish.cleanupWarning ? [publish.cleanupWarning] : [],
    };
  } finally {
    if (!published && fs.existsSync(staged)) {
      fs.rmSync(staged, { recursive: true });
    }
  }
}

function parseArguments(argv) {
  const values = {};
  const allowed = new Set([
    '--gaf2d-project',
    '--output',
    '--source-family',
    '--cwebp',
    '--magick',
  ]);
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      json = true;
      continue;
    }
    requireFact(allowed.has(token), `unknown argument "${token}"`);
    const value = argv[index + 1];
    requireFact(
      value && !value.startsWith('--'),
      `argument "${token}" requires a value`,
    );
    values[token] = value;
    index += 1;
  }
  for (const required of ['--gaf2d-project', '--output']) {
    requireFact(values[required], `missing required argument "${required}"`);
  }
  return { values, json };
}

function main() {
  try {
    const { values, json } = parseArguments(process.argv.slice(2));
    const result = buildGaf2dPreview({
      gaf2dProjectRoot: values['--gaf2d-project'],
      outputRoot: values['--output'],
      ...(values['--source-family']
        ? { sourceFamily: values['--source-family'] }
        : {}),
      ...(values['--cwebp']
        ? { cwebpPath: values['--cwebp'] }
        : {}),
      ...(values['--magick']
        ? { magickPath: values['--magick'] }
        : {}),
    });
    if (json) {
      process.stdout.write(`${JSON.stringify({ ok: true, data: result })}\n`);
    } else {
      process.stdout.write(
        `GAF2D PREVIEW ${result.counts.assets}/${result.counts.clips}/${result.counts.frames} ${result.manifestSha256}\n`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (process.argv.includes('--json')) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, error: { message } })}\n`,
      );
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
