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
import { validateMotionPreviewBundle } from '../../js/motion-bundle.js';
import {
  HERO_PREVIEW_CLIP_GRAMMAR,
  HERO_PREVIEW_MATRIX_PROFILE_SHA256,
  HERO_PREVIEW_SET_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_GRAMMAR,
  HERO_PREVIEW_TOOLCHAIN_OPERATIONS,
  validateHeroClipDescriptor,
  validateHeroSetManifest,
} from '../../js/hero-v3-contract.js';

const PREVIEW_MANIFEST_GRAMMAR = 'apn-gaf2d-motion-preview-manifest-v1';
const SOURCE_FAMILY = 'authored-semantic-v2';
const BATCH_RELATIVE =
  `motion/${SOURCE_FAMILY}/batch-summary.json`;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_FRAME_BYTES = 32 * 1024 * 1024;
const MAX_REVIEW_HTML_BYTES = 48 * 1024 * 1024;
const COMMON_DECODED_BYTES = 6 * 1024 * 1024;
const BOSS_DECODED_BYTES = 8 * 1024 * 1024;
const HERO_DECODED_BYTES = 8 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const ASSET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PREVIEW_DERIVATIVE_TOOLCHAIN = Object.freeze({
  grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
  compositor: DERIVATIVE_TOOLCHAIN.compositor,
  operations: HERO_PREVIEW_TOOLCHAIN_OPERATIONS,
});

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
      arraysEqual(left?.frame_ids, right?.frame_ids),
    `${assetId}/${clipName} candidate and clip manifest differ`,
  );
}

function verifyBatch(batch) {
  requireFact(batch?.schema_version === 1, 'batch schema_version must be 1');
  requireFact(batch?.contract === 'apn-offline-authored-motion-v1', 'batch contract is not the offline authored profile');
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
    batch?.local_authored_clip_count === EXPECTED_COUNTS.clips,
    `batch local_authored_clip_count must be ${EXPECTED_COUNTS.clips}`,
  );
  requireFact(
    batch?.asset_count === EXPECTED_COUNTS.assets &&
      batch?.clip_count === EXPECTED_COUNTS.clips &&
      batch?.frame_count === EXPECTED_COUNTS.frames,
    'batch must contain exactly 7 assets, 39 clips, and 276 frames',
  );
  requireFact(
    Array.isArray(batch?.assets) &&
      batch.assets.length === EXPECTED_COUNTS.assets,
    'batch assets must contain exactly seven entries',
  );
  requireFact(
    Array.isArray(batch?.reject_reasons) &&
      batch.reject_reasons.length === 0,
    'batch reject_reasons must be empty',
  );
}

function verifySourceAsset(root, batchRecord, spec) {
  const { assetId } = spec;
  requireFact(ASSET_ID.test(assetId), `asset ID "${assetId}" is invalid`);
  requireFact(batchRecord?.asset_id === assetId, `${assetId} batch entry is missing`);
  requireFact(batchRecord?.passed === true, `${assetId} batch passed must be true`);
  requireFact(
    batchRecord?.provider_clip_count === 0,
    `${assetId} provider_clip_count must be 0`,
  );
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
    `${assetId}-${SOURCE_FAMILY}/candidate.json`;
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
    candidate?.grammar === 'gaf2d-motion-set-v2' &&
      candidate?.asset_id === assetId &&
      candidate?.candidate_id === `${assetId}-${SOURCE_FAMILY}`,
    `${assetId} candidate identity/grammar is invalid`,
  );
  requireFact(
    candidate?.source_manifest_version === assetManifest.manifest_version,
    `${assetId} candidate source manifest version is stale`,
  );
  requireFact(
    arraysEqual(candidate?.canvas_size, [640, 640]),
    `${assetId} candidate canvas must be 640x640`,
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
    batchRecord.clip_manifest_path,
    batchRecord.clip_manifest_sha256,
    `${assetId} clip manifest`,
  );
  const clipManifest = clipManifestRecord.value;
  requireFact(
    clipManifest?.schema_version === 2 &&
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
        candidateClip.fps <= 60,
      `${assetId}/${expected.name} clip contract is invalid`,
    );
    exactClipFacts(candidateClip, manifestClip, assetId, expected.name);
  }

  const qaRecord = readTrackedJson(
    root,
    batchRecord.qa_summary_path,
    batchRecord.qa_summary_sha256,
    `${assetId} QA summary`,
  );
  const qa = qaRecord.value;
  requireFact(
    qa?.schema_version === 1 &&
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
  const qaClips = new Map(
    (Array.isArray(qa.clips) ? qa.clips : []).map((clip) => [
      clip.clip,
      clip,
    ]),
  );
  for (const expected of spec.clips) {
    const sourceClip = candidate.clips[expected.name];
    const qaClip = qaClips.get(expected.name);
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
  requireFact(
    reviewRecord.value?.asset_id === assetId &&
      reviewRecord.value?.destination_path ===
        assetManifest?.artifacts?.motion_set_review_html?.path,
    `${assetId} review evidence does not bind its current review HTML`,
  );
  const reviewHtmlArtifact =
    assetManifest.artifacts.motion_set_review_html;
  const reviewHtmlRecord = readTracked(
    root,
    reviewHtmlArtifact.path,
    reviewHtmlArtifact.sha256,
    `${assetId} review HTML`,
    MAX_REVIEW_HTML_BYTES,
  );

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

  const frameHashesRelative =
    `motion/${SOURCE_FAMILY}/${assetId}/frame-hashes.json`;
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
      Object.keys(frameHashes.frames).length === expectedFrameIds.length,
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
      `motion/${SOURCE_FAMILY}/${assetId}/frames/${expectedFrameId}.png`;
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

  return {
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
    frameSize: { width: 640, height: 640 },
    frameIds: expectedFrameIds,
    frames,
  };
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
      `${source.assetId}/${frameId} canvas is not 640x640`,
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

function sourceManifestRecord(source) {
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
  };
}

export function buildGaf2dPreview(options = {}) {
  requireFact(options.gaf2dProjectRoot, 'GAF2D project root is required');
  requireFact(options.outputRoot, 'preview output root is required');
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
    BATCH_RELATIVE,
    'batch summary',
  );
  const { bytes: batchBytes, value: batch } =
    readJsonBytes(batchFile, 'batch summary');
  verifyBatch(batch);
  const batchSummarySha256 = sha256Bytes(batchBytes);
  const batchByAsset = new Map(
    batch.assets.map((record) => [record.asset_id, record]),
  );
  requireFact(
    batchByAsset.size === EXPECTED_COUNTS.assets &&
      ASSET_SPECS.every((spec) => batchByAsset.has(spec.assetId)),
    'batch asset membership differs from the exact APN preview cast',
  );
  const sources = ASSET_SPECS.map((spec) =>
    verifySourceAsset(sourceRoot, batchByAsset.get(spec.assetId), spec),
  );

  const encoderArguments =
    options.encoderArguments ?? [...CANONICAL_CWEBP_ARGUMENTS];
  const cwebpPath = options.cwebpPath ?? process.env.CWEBP ?? 'cwebp';
  const magickPath = options.magickPath ?? process.env.MAGICK ?? 'magick';
  const derivatives = {
    inspectFrame:
      options.derivatives?.inspectFrame ??
      ((file) => defaultInspectFrame(file, magickPath)),
    validateTools:
      options.derivatives?.validateTools ?? validateDerivativeTools,
    buildAtlas:
      options.derivatives?.buildAtlas ?? buildScaledPreviewAtlas,
  };
  const toolFacts = derivatives.validateTools(
    cwebpPath,
    magickPath,
    encoderArguments,
  );
  requireFact(
    toolFacts?.cwebpVersion === '1.6.0' &&
      toolFacts?.derivativeToolchainSha256 ===
        DERIVATIVE_TOOLCHAIN_SHA256,
    'derivative toolchain does not match the pinned preview profile',
  );

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
      if (source.role === 'hero') {
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
    const manifest = {
      grammar: PREVIEW_MANIFEST_GRAMMAR,
      authority: 'unapproved_preview',
      status: 'human_review_required',
      sourceFamily: SOURCE_FAMILY,
      packId: 'valorant',
      counts: { ...EXPECTED_COUNTS },
      source: {
        batchSummarySha256,
        contract: batch.contract,
        mechanicalQa: batch.mechanical_qa,
        creativeApproval: batch.creative_approval,
        networkCalls: batch.network_calls,
        providerCalls: batch.provider_calls,
        providerClipCount: batch.provider_clip_count,
      },
      assets: Object.fromEntries(
        sources.map((source) => [
          source.assetId,
          sourceManifestRecord(source),
        ]),
      ),
      hero,
      characters,
      toolchain: {
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
        !serialized.includes(path.resolve(cwebpPath)) &&
        !serialized.includes(path.resolve(magickPath)),
      'preview manifest leaked a machine-local path',
    );
    const publish = atomicPublishDirectory(staged, outputRoot);
    published = true;
    return {
      passed: true,
      authority: 'unapproved_preview',
      status: 'human_review_required',
      counts: { ...EXPECTED_COUNTS },
      manifestSha256: sha256Bytes(manifestBytes),
      output: path.basename(outputRoot),
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
