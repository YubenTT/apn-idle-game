#!/usr/bin/env node

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateMotionBundle,
  validateMotionClipDescriptor,
  validateMotionSetIndex,
} from '../../js/motion-bundle.js';
import { MOTION_BUDGETS } from './lib.mjs';

const SHA256 = /^[a-f0-9]{64}$/;
const ASSET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GAF_IDENTIFIER = /^[a-z0-9][a-z0-9_-]{0,95}$/;
const MAX_GAF_EXPORT_FILES = 1024;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;
const MAX_ATLAS_DIMENSION = 2048;
const TIMING_TOLERANCE_SECONDS = 0.000001;
const CWEBP_VERSION = '1.6.0';
const IMAGEMAGICK_VERSION = '7.1.2-13';
export const CANONICAL_CWEBP_ARGUMENTS = Object.freeze([
  '-exact',
  '-q',
  '90',
]);
const COMMON_CLIPS = Object.freeze([
  'idle',
  'advance',
  'engaged',
  'hit',
  'death',
]);
const BOSS_CLIPS = Object.freeze([...COMMON_CLIPS, 'broken']);
const CLIP_COUNTS = Object.freeze({
  idle: 8,
  advance: 8,
  engaged: 6,
  hit: 4,
  death: 8,
  broken: 8,
});
const COMMON_CREATURE_CONTRACT = Object.freeze({
  clipNames: COMMON_CLIPS,
  frameCounts: CLIP_COUNTS,
  playback: Object.freeze({
    idle: 'loop',
    advance: 'loop',
    engaged: 'loop',
    hit: 'progress',
    death: 'progress',
  }),
  requireRig: false,
});
const BOSS_CREATURE_CONTRACT = Object.freeze({
  clipNames: BOSS_CLIPS,
  frameCounts: CLIP_COUNTS,
  playback: Object.freeze({
    ...COMMON_CREATURE_CONTRACT.playback,
    broken: 'loop',
  }),
  requireRig: false,
});

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function fail(message) {
  throw new Error(`GAF2D motion build: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function exactKeys(value, keys, label) {
  assert(isObject(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assert(
    actual.length === expected.length &&
      actual.every((key, index) => key === expected[index]),
    `${label} must contain exactly ${expected.join(', ')}`,
  );
}

function isPortablePath(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.includes('?') ||
    value.includes('#')
  ) {
    return false;
  }
  const parsed = path.posix.parse(value);
  const parts = value.split('/');
  return (
    parsed.root === '' &&
    !value.startsWith('/') &&
    !value.includes('://') &&
    parts.every((part) => part !== '' && part !== '.' && part !== '..') &&
    path.posix.normalize(value) === value
  );
}

function portablePath(value, label) {
  assert(isPortablePath(value), `${label} must be a canonical portable relative path`);
  return value;
}

function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortJson(value[key])]),
  );
}

export function canonicalJson(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

function canonicalSha256(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(sortJson(value)), 'utf8'));
}

export const DERIVATIVE_TOOLCHAIN = Object.freeze({
  grammar: 'apn-gaf2d-matrix-toolchain-v1',
  compositor: Object.freeze({
    name: 'ImageMagick',
    version: IMAGEMAGICK_VERSION,
  }),
  operations: Object.freeze([
    'crop:normalized-png:shared-trim:repage:png32',
    'montage:row-major:bounded-matrix:shared-cell:no-gap:transparent:alpha-on:png-color-type-6',
  ]),
});
export const DERIVATIVE_TOOLCHAIN_SHA256 = canonicalSha256(
  DERIVATIVE_TOOLCHAIN,
);
const V4_RUNTIME_TOOLCHAIN = Object.freeze({
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

function writeCanonical(file, value) {
  const bytes = Buffer.from(canonicalJson(value), 'utf8');
  fs.writeFileSync(file, bytes, { flag: 'wx' });
  return bytes;
}

function v4ConsumerRoleFor(assetId, role) {
  if (assetId === 'site-sentinel') return 'elite';
  if (role === 'boss') return 'boss';
  return 'standard';
}

function markerIndices(sourceClip, assetId, clipName) {
  return Object.fromEntries(
    Object.entries(sourceClip.markers).map(([role, frameId]) => {
      const index = sourceClip.frame_ids.indexOf(frameId);
      assert(index >= 0, `${assetId}/${clipName} marker "${role}" leaves its clip`);
      return [role, index];
    }),
  );
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

function readBoundedFile(file, maximumBytes, label) {
  assert(fs.existsSync(file), `${label} is missing`);
  const stats = fs.lstatSync(file);
  assert(stats.isFile() && !stats.isSymbolicLink(), `${label} must be a regular file`);
  assert(stats.size > 0 && stats.size <= maximumBytes, `${label} exceeds its byte boundary`);
  return fs.readFileSync(file);
}

function readJson(file, label) {
  const bytes = readBoundedFile(file, MAX_JSON_BYTES, label);
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    fail(`${label} is not valid UTF-8 JSON`);
  }
}

function walkRelease(directory, root, files = []) {
  const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
    const stats = fs.lstatSync(absolute);
    assert(!stats.isSymbolicLink(), `export entry "${relative}" must not be a symbolic link`);
    if (stats.isDirectory()) {
      walkRelease(absolute, root, files);
    } else {
      assert(stats.isFile(), `export entry "${relative}" must be a regular file`);
      files.push(relative);
    }
  }
  return files;
}

function resolveReleaseFile(releaseDir, relative, label) {
  portablePath(relative, label);
  const absolute = path.resolve(releaseDir, ...relative.split('/'));
  const root = path.resolve(releaseDir);
  assert(
    absolute.startsWith(`${root}${path.sep}`),
    `${label} escapes the GAF2D export`,
  );
  return absolute;
}

function validateRelease(gaf2dProject, assetId) {
  const project = path.resolve(gaf2dProject);
  assert(fs.existsSync(project), 'GAF2D project root is missing');
  const projectStats = fs.lstatSync(project);
  assert(
    projectStats.isDirectory() && !projectStats.isSymbolicLink(),
    'GAF2D project root must be a real directory',
  );
  const releaseDir = path.join(project, 'assets', assetId, 'export', 'release');
  assert(
    fs.existsSync(releaseDir),
    'current GAF2D export/release directory is missing or unsafe',
  );
  const releaseStats = fs.lstatSync(releaseDir);
  assert(
    releaseStats.isDirectory() && !releaseStats.isSymbolicLink(),
    'current GAF2D export/release directory is missing or unsafe',
  );
  const manifestPath = path.join(releaseDir, 'manifest.json');
  const manifestBytes = readBoundedFile(
    manifestPath,
    MAX_JSON_BYTES,
    'GAF2D export manifest',
  );
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    fail('GAF2D export manifest is not valid UTF-8 JSON');
  }
  exactKeys(
    manifest,
    ['schema_version', 'asset_id', 'configuration_hash', 'files'],
    'GAF2D export manifest',
  );
  assert(manifest.schema_version === 1, 'GAF2D export manifest schema must be 1');
  assert(manifest.asset_id === assetId, 'GAF2D export targets a different asset');
  assert(
    SHA256.test(manifest.configuration_hash),
    'GAF2D export configuration hash is invalid',
  );
  assert(
    Array.isArray(manifest.files) &&
      manifest.files.length > 0 &&
      manifest.files.length <= MAX_GAF_EXPORT_FILES,
    'GAF2D export file list is empty or exceeds its boundary',
  );
  assert(
    manifestBytes.equals(Buffer.from(canonicalJson(manifest), 'utf8')),
    'GAF2D export manifest must use canonical JSON',
  );

  const byPath = new Map();
  for (let index = 0; index < manifest.files.length; index += 1) {
    const record = manifest.files[index];
    exactKeys(record, ['path', 'sha256'], `GAF2D export files[${index}]`);
    portablePath(record.path, `GAF2D export files[${index}].path`);
    assert(SHA256.test(record.sha256), `GAF2D export hash for "${record.path}" is invalid`);
    assert(!byPath.has(record.path), `GAF2D export path "${record.path}" is duplicated`);
    const absolute = resolveReleaseFile(releaseDir, record.path, 'GAF2D export artifact');
    const bytes = readBoundedFile(
      absolute,
      MAX_ARTIFACT_BYTES,
      `GAF2D export artifact "${record.path}"`,
    );
    assert(
      sha256Bytes(bytes) === record.sha256,
      `GAF2D export artifact "${record.path}" has a stale hash`,
    );
    byPath.set(record.path, { ...record, absolute });
  }

  const actualFiles = walkRelease(releaseDir, releaseDir);
  const expectedFiles = ['manifest.json', ...byPath.keys()].sort();
  actualFiles.sort();
  assert(
    actualFiles.length === expectedFiles.length &&
      actualFiles.every((file, index) => file === expectedFiles[index]),
    'GAF2D export contains unlisted or missing files',
  );
  return {
    project,
    releaseDir,
    manifest,
    manifestPath,
    manifestSha256: sha256Bytes(manifestBytes),
    byPath,
  };
}

function validateCurrentGaf2dExport(release, assetId, gaf2dExecutable) {
  let stdout;
  try {
    stdout = execFileSync(
      gaf2dExecutable,
      [
        'export',
        assetId,
        '--project',
        release.project,
        '--dry-run',
        '--json',
      ],
      {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  } catch (error) {
    const detail = String(
      error?.stdout || error?.stderr || error?.message || '',
    ).trim();
    fail(
      `current GAF2D export dry-run failed${detail ? `: ${detail}` : ''}`,
    );
  }
  let response;
  try {
    response = JSON.parse(stdout);
  } catch {
    fail('current GAF2D export dry-run returned invalid JSON');
  }
  exactKeys(
    response,
    ['ok', 'command', 'data', 'error'],
    'GAF2D export dry-run response',
  );
  assert(
    response.ok === true &&
      response.command === 'export' &&
      response.error === null,
    `current GAF2D export dry-run rejected the project: ${String(
      response?.error?.message || 'unknown error',
    )}`,
  );
  exactKeys(
    response.data,
    [
      'asset_id',
      'manifest_path',
      'files',
      'manifest_sha256',
      'file_hashes',
      'dry_run',
    ],
    'GAF2D export dry-run data',
  );
  const expectedFiles = release.manifest.files.map((record) => record.path);
  const expectedHashes = Object.fromEntries(
    release.manifest.files.map((record) => [record.path, record.sha256]),
  );
  assert(
    response.data.asset_id === assetId &&
      response.data.dry_run === true &&
      response.data.manifest_path ===
        `assets/${assetId}/export/release/manifest.json` &&
      response.data.manifest_sha256 === release.manifestSha256 &&
      arraysEqual(response.data.files, expectedFiles) &&
      canonicalSha256(response.data.file_hashes) ===
        canonicalSha256(expectedHashes),
    'on-disk release is stale relative to the current GAF2D project/export dry-run',
  );
}

function findJsonAuthority(release, predicate, label) {
  const matches = [];
  for (const [relative, record] of release.byPath) {
    if (!relative.endsWith('.json')) continue;
    const payload = readJson(record.absolute, `GAF2D export "${relative}"`);
    if (predicate(payload)) matches.push({ relative, record, payload });
  }
  assert(matches.length === 1, `GAF2D export must contain exactly one ${label}`);
  return matches[0];
}

function arraysEqual(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function validatePositiveSize(value, label) {
  exactKeys(value, ['width', 'height'], label);
  assert(
    Number.isInteger(value.width) &&
      value.width > 0 &&
      Number.isInteger(value.height) &&
      value.height > 0,
    `${label} must contain positive integer dimensions`,
  );
}

function validateRect(value, label) {
  exactKeys(value, ['x', 'y', 'width', 'height'], label);
  assert(
    Number.isInteger(value.x) &&
      value.x >= 0 &&
      Number.isInteger(value.y) &&
      value.y >= 0 &&
      Number.isInteger(value.width) &&
      value.width > 0 &&
      Number.isInteger(value.height) &&
      value.height > 0,
    `${label} must be a positive integer rectangle`,
  );
}

function validatePair(value, label, { integers = false } = {}) {
  assert(Array.isArray(value) && value.length === 2, `${label} must contain two values`);
  assert(
    value.every((entry) =>
      integers ? Number.isInteger(entry) && entry > 0 : Number.isFinite(entry),
    ),
    `${label} contains invalid values`,
  );
}

function validateApproval(approval, assetId, contract) {
  if (
    approval?.schema_version === 1 ||
    approval?.candidate?.grammar === 'gaf2d-motion-set-v1'
  ) {
    fail(
      'legacy GAF2D motion-set v1 is readable but renewal as v2 is required before APN build',
    );
  }
  exactKeys(
    approval,
    [
      'schema_version',
      'candidate',
      'candidate_sha256',
      'frames',
      'approver_label',
      'approved_at',
      'review_evidence_path',
      'review_evidence_sha256',
      'review_html_path',
      'review_html_sha256',
      'temporal_proof_path',
      'temporal_proof_sha256',
    ],
    'motion-set approval',
  );
  assert(approval.schema_version === 2, 'motion-set approval schema must be 2');
  assert(
    typeof approval.approver_label === 'string' && approval.approver_label.length > 0,
    'motion-set approval requires a human approver label',
  );
  assert(
    typeof approval.approved_at === 'string' &&
      Number.isFinite(Date.parse(approval.approved_at)),
    'motion-set approval timestamp is invalid',
  );
  const candidate = approval.candidate;
  exactKeys(
    candidate,
    [
      'grammar',
      'candidate_id',
      'asset_id',
      'source_manifest_version',
      'extraction_path',
      'extraction_sha256',
      'review_evidence_path',
      'review_evidence_sha256',
      'canvas_size',
      'clips',
      'clip_order',
      'frames',
      'review_frame_durations_milliseconds',
    ],
    'motion-set candidate',
  );
  assert(candidate.grammar === 'gaf2d-motion-set-v2', 'motion-set candidate must use V2');
  assert(
    GAF_IDENTIFIER.test(candidate.candidate_id),
    'motion-set candidate ID is invalid',
  );
  assert(candidate.asset_id === assetId, 'motion-set candidate targets a different asset');
  assert(
    Number.isInteger(candidate.source_manifest_version) &&
      candidate.source_manifest_version >= 1,
    'motion-set source manifest version is invalid',
  );
  portablePath(candidate.extraction_path, 'motion-set extraction path');
  portablePath(candidate.review_evidence_path, 'motion-set review evidence path');
  assert(
    SHA256.test(candidate.extraction_sha256) &&
      SHA256.test(candidate.review_evidence_sha256),
    'motion-set source or review hash is invalid',
  );
  validatePair(candidate.canvas_size, 'motion-set canvas size', { integers: true });

  const requiredClips = contract.clipNames;
  assert(
    Array.isArray(candidate.clip_order) &&
      candidate.clip_order.length === requiredClips.length &&
      new Set(candidate.clip_order).size === candidate.clip_order.length &&
      requiredClips.every((name) => candidate.clip_order.includes(name)),
    `motion-set clip membership must be exactly ${requiredClips.join(', ')}`,
  );
  assert(
    isObject(candidate.clips) &&
      Object.keys(candidate.clips).length === requiredClips.length &&
      requiredClips.every((name) => own(candidate.clips, name)),
    `motion-set clips must be exactly ${requiredClips.join(', ')}`,
  );

  const orderedFrameIds = [];
  const expectedReviewDurations = [];
  for (const clipName of candidate.clip_order) {
    const clip = candidate.clips[clipName];
    exactKeys(clip, ['playback', 'fps', 'frame_ids'], `motion-set clip "${clipName}"`);
    const expectedPlayback = contract.playback[clipName];
    assert(
      clip.playback === expectedPlayback,
      `motion-set clip "${clipName}" playback must be ${expectedPlayback}`,
    );
    assert(
      Number.isInteger(clip.fps) && clip.fps >= 1 && clip.fps <= 60,
      `motion-set clip "${clipName}" FPS must be an integer in 1..60`,
    );
    assert(
      Array.isArray(clip.frame_ids) &&
        clip.frame_ids.length === contract.frameCounts[clipName] &&
        new Set(clip.frame_ids).size === clip.frame_ids.length &&
        clip.frame_ids.every((frameId) => GAF_IDENTIFIER.test(frameId)),
      `motion-set clip "${clipName}" must contain exactly ${contract.frameCounts[clipName]} unique frames`,
    );
    orderedFrameIds.push(...clip.frame_ids);
    expectedReviewDurations.push(
      ...clip.frame_ids.map(() => Math.max(1, Math.round(1000 / clip.fps))),
    );
  }
  assert(
    new Set(orderedFrameIds).size === orderedFrameIds.length,
    'motion-set frames must be assigned exactly once',
  );
  assert(
    arraysEqual(
      candidate.review_frame_durations_milliseconds,
      expectedReviewDurations,
    ),
    'motion-set review cadence is stale for its fixed integer FPS',
  );
  assert(
    Array.isArray(candidate.frames) &&
      candidate.frames.length === orderedFrameIds.length,
    'motion-set frame records are incomplete',
  );
  const candidateFrames = new Map();
  for (let index = 0; index < candidate.frames.length; index += 1) {
    const frame = candidate.frames[index];
    exactKeys(
      frame,
      [
        'frame_id',
        'source_index',
        'timestamp_seconds',
        'duration_seconds',
        'path',
        'sha256',
      ],
      `motion-set frame[${index}]`,
    );
    assert(
      frame.frame_id === orderedFrameIds[index],
      'motion-set frame records must follow exact clip order',
    );
    assert(
      Number.isInteger(frame.source_index) && frame.source_index >= 0,
      `motion-set frame "${frame.frame_id}" source index is invalid`,
    );
    assert(
      Number.isFinite(frame.timestamp_seconds) &&
        Number.isFinite(frame.duration_seconds) &&
        frame.duration_seconds > 0,
      `motion-set frame "${frame.frame_id}" timing is invalid`,
    );
    portablePath(frame.path, `motion-set frame "${frame.frame_id}" path`);
    assert(
      SHA256.test(frame.sha256),
      `motion-set frame "${frame.frame_id}" hash is invalid`,
    );
    candidateFrames.set(frame.frame_id, frame);
  }
  for (const clipName of candidate.clip_order) {
    const clip = candidate.clips[clipName];
    const expectedInterval = 1 / clip.fps;
    const frames = clip.frame_ids.map((frameId) => candidateFrames.get(frameId));
    for (const frame of frames) {
      assert(
        Math.abs(frame.duration_seconds - expectedInterval) <=
          TIMING_TOLERANCE_SECONDS,
        `motion-set clip "${clipName}" has variable-rate frame duration`,
      );
    }
    for (let index = 1; index < frames.length; index += 1) {
      assert(
        Math.abs(
          frames[index].timestamp_seconds -
            frames[index - 1].timestamp_seconds -
            expectedInterval,
        ) <= TIMING_TOLERANCE_SECONDS,
        `motion-set clip "${clipName}" has variable-rate timestamps`,
      );
    }
  }

  assert(
    SHA256.test(approval.candidate_sha256) &&
      approval.candidate_sha256 === canonicalSha256(candidate),
    'motion-set candidate metadata hash is stale',
  );
  assert(
    Array.isArray(approval.frames) &&
      approval.frames.length === orderedFrameIds.length,
    'motion-set approval frame lock is incomplete',
  );
  for (let index = 0; index < approval.frames.length; index += 1) {
    const frame = approval.frames[index];
    exactKeys(frame, ['frame_id', 'path', 'sha256'], `approved frame[${index}]`);
    const candidateFrame = candidateFrames.get(orderedFrameIds[index]);
    assert(
      frame.frame_id === orderedFrameIds[index] &&
        frame.sha256 === candidateFrame.sha256,
      'motion-set approval frame IDs or hashes are stale',
    );
    portablePath(frame.path, `approved frame "${frame.frame_id}" path`);
  }
  for (const field of [
    'review_evidence_path',
    'review_html_path',
    'temporal_proof_path',
  ]) {
    portablePath(approval[field], `motion-set approval ${field}`);
  }
  for (const field of [
    'review_evidence_sha256',
    'review_html_sha256',
    'temporal_proof_sha256',
  ]) {
    assert(SHA256.test(approval[field]), `motion-set approval ${field} is invalid`);
  }
  assert(
    approval.review_evidence_path === candidate.review_evidence_path &&
      approval.review_evidence_sha256 === candidate.review_evidence_sha256,
    'motion-set approval review evidence is stale',
  );
  return {
    candidate,
    candidateSha256: approval.candidate_sha256,
    orderedFrameIds,
    candidateFrames,
    approvedFrames: new Map(
      approval.frames.map((frame) => [frame.frame_id, frame]),
    ),
  };
}

function joinExportSibling(baseRelative, childRelative, label) {
  portablePath(childRelative, label);
  const joined = path.posix.normalize(
    path.posix.join(path.posix.dirname(baseRelative), childRelative),
  );
  return portablePath(joined, label);
}

function pngSize(bytes, label) {
  assert(
    bytes.length >= 24 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      ) &&
      bytes.toString('ascii', 12, 16) === 'IHDR',
    `${label} is not a PNG`,
  );
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

export function webpSize(bytes, label = 'WebP') {
  assert(
    bytes.length >= 30 &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP',
    `${label} has an invalid RIFF/WebP header`,
  );
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const payload = offset + 8;
    assert(payload + length <= bytes.length, `${label} has a truncated ${fourcc} chunk`);
    if (fourcc === 'VP8X') {
      assert(length >= 10, `${label} has a truncated VP8X chunk`);
      return {
        width: bytes.readUIntLE(payload + 4, 3) + 1,
        height: bytes.readUIntLE(payload + 7, 3) + 1,
      };
    }
    if (fourcc === 'VP8L') {
      assert(
        length >= 5 && bytes[payload] === 0x2f,
        `${label} has an invalid VP8L chunk`,
      );
      const packed = bytes.readUInt32LE(payload + 1);
      return {
        width: (packed & 0x3fff) + 1,
        height: ((packed >>> 14) & 0x3fff) + 1,
      };
    }
    if (fourcc === 'VP8 ') {
      assert(
        length >= 10 &&
          bytes[payload + 3] === 0x9d &&
          bytes[payload + 4] === 0x01 &&
          bytes[payload + 5] === 0x2a,
        `${label} has an invalid VP8 frame header`,
      );
      return {
        width: bytes.readUInt16LE(payload + 6) & 0x3fff,
        height: bytes.readUInt16LE(payload + 8) & 0x3fff,
      };
    }
    offset = payload + length + (length % 2);
  }
  fail(`${label} contains no supported image chunk`);
}

function imageSize(file, label) {
  const bytes = readBoundedFile(file, MAX_ARTIFACT_BYTES, label);
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return pngSize(bytes, label);
  }
  return webpSize(bytes, label);
}

function validateNormalization(authority, approvalFacts, release) {
  const normalization = authority.payload;
  exactKeys(
    normalization,
    [
      'schema_version',
      'approval_candidate_id',
      'approval_candidate_sha256',
      'approved_frame_ids',
      'shared_transform',
      'body_measurement_excludes_detached_fx',
      'scale_contract',
      'frames',
    ],
    'GAF2D normalization',
  );
  assert(normalization.schema_version === 1, 'GAF2D normalization schema must be 1');
  assert(
    normalization.approval_candidate_id === approvalFacts.candidate.candidate_id &&
      normalization.approval_candidate_sha256 ===
        approvalFacts.candidateSha256,
    'GAF2D normalization is stale for the approved candidate',
  );
  assert(
    arraysEqual(normalization.approved_frame_ids, approvalFacts.orderedFrameIds),
    'GAF2D normalization approved frame order is stale',
  );
  assert(
    normalization.scale_contract === 'body',
    'APN character motion requires the GAF2D body scale contract',
  );
  assert(
    typeof normalization.body_measurement_excludes_detached_fx === 'boolean',
    'GAF2D normalization detached-FX fact is invalid',
  );
  const transform = normalization.shared_transform;
  exactKeys(
    transform,
    [
      'source_size',
      'target_size',
      'scale',
      'source_anchor',
      'target_anchor',
      'used_body_masks',
    ],
    'GAF2D shared transform',
  );
  validatePair(transform.source_size, 'GAF2D transform source size', {
    integers: true,
  });
  validatePair(transform.target_size, 'GAF2D transform target size', {
    integers: true,
  });
  validatePair(transform.source_anchor, 'GAF2D transform source anchor');
  validatePair(transform.target_anchor, 'GAF2D transform target anchor');
  assert(
    Number.isFinite(transform.scale) &&
      transform.scale > 0 &&
      typeof transform.used_body_masks === 'boolean',
    'GAF2D shared transform is invalid',
  );
  const [targetWidth, targetHeight] = transform.target_size;
  assert(
    Math.abs(transform.target_anchor[0] - targetWidth / 2) <= 1 &&
      Math.abs(transform.target_anchor[1] - targetHeight) <= 1,
    'GAF2D shared transform must preserve a bottom-center pivot within one pixel',
  );
  assert(
    Array.isArray(normalization.frames) &&
      normalization.frames.length === approvalFacts.orderedFrameIds.length,
    'GAF2D normalization frame set is incomplete',
  );
  const frames = new Map();
  for (let index = 0; index < normalization.frames.length; index += 1) {
    const frame = normalization.frames[index];
    exactKeys(
      frame,
      ['frame_id', 'source_sha256', 'output_path', 'output_sha256'],
      `GAF2D normalized frame[${index}]`,
    );
    const frameId = approvalFacts.orderedFrameIds[index];
    const approved = approvalFacts.approvedFrames.get(frameId);
    assert(
      frame.frame_id === frameId && frame.source_sha256 === approved.sha256,
      `GAF2D normalized frame "${frameId}" source lineage is stale`,
    );
    assert(
      SHA256.test(frame.output_sha256),
      `GAF2D normalized frame "${frameId}" output hash is invalid`,
    );
    const relative = joinExportSibling(
      authority.relative,
      frame.output_path,
      `GAF2D normalized frame "${frameId}" output path`,
    );
    const record = release.byPath.get(relative);
    assert(record, `GAF2D normalized frame "${frameId}" is absent from the export`);
    assert(
      record.sha256 === frame.output_sha256,
      `GAF2D normalized frame "${frameId}" changed after normalization`,
    );
    const size = imageSize(record.absolute, `GAF2D normalized frame "${frameId}"`);
    assert(
      size.width === targetWidth && size.height === targetHeight,
      `GAF2D normalized frame "${frameId}" has a mixed canvas transform`,
    );
    frames.set(frameId, { ...frame, relative, absolute: record.absolute });
  }
  return {
    normalization,
    transform,
    frameSize: { width: targetWidth, height: targetHeight },
    frames,
  };
}

function rectsOverlap(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function sameRect(left, right) {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

function validateAtlas(authority, approvalFacts, normalizationFacts, release) {
  const manifest = authority.payload;
  if (manifest?.schema_version === 1) {
    fail('legacy GAF2D atlas v1 is readable but renewal as v2 is required before APN build');
  }
  exactKeys(
    manifest,
    ['schema_version', 'atlas', 'pages', 'frames', 'clips', 'clip_order'],
    'GAF2D atlas manifest',
  );
  assert(manifest.schema_version === 2, 'GAF2D atlas manifest schema must be 2');
  exactKeys(
    manifest.atlas,
    ['name', 'width', 'height', 'padding', 'trim'],
    'GAF2D atlas geometry',
  );
  assert(manifest.atlas.name === 'motion', 'GAF2D atlas must be named "motion"');
  assert(
    Number.isInteger(manifest.atlas.width) &&
      manifest.atlas.width > 0 &&
      manifest.atlas.width <= MAX_ATLAS_DIMENSION &&
      Number.isInteger(manifest.atlas.height) &&
      manifest.atlas.height > 0 &&
      manifest.atlas.height <= MAX_ATLAS_DIMENSION &&
      Number.isInteger(manifest.atlas.padding) &&
      manifest.atlas.padding >= 0 &&
      typeof manifest.atlas.trim === 'boolean',
    'GAF2D atlas geometry is invalid or oversized',
  );
  assert(
    arraysEqual(manifest.clip_order, approvalFacts.candidate.clip_order),
    'GAF2D atlas clip order is stale for the motion approval',
  );
  exactKeys(
    manifest.clips,
    approvalFacts.candidate.clip_order,
    'GAF2D atlas clips',
  );
  for (const clipName of manifest.clip_order) {
    const clip = manifest.clips[clipName];
    exactKeys(clip, ['playback', 'fps', 'frame_ids'], `GAF2D atlas clip "${clipName}"`);
    const approvedClip = approvalFacts.candidate.clips[clipName];
    assert(
      clip.playback === approvedClip.playback &&
        clip.fps === approvedClip.fps &&
        arraysEqual(clip.frame_ids, approvedClip.frame_ids),
      `GAF2D atlas clip "${clipName}" is stale for the motion approval`,
    );
  }

  assert(
    isObject(manifest.pages) && Object.keys(manifest.pages).length > 0,
    'GAF2D atlas has no page',
  );
  const pageRelatives = [];
  for (const [format, page] of Object.entries(manifest.pages)) {
    assert(['png', 'webp'].includes(format), `GAF2D atlas format "${format}" is unsupported`);
    exactKeys(page, ['file', 'sha256'], `GAF2D atlas ${format} page`);
    assert(
      typeof page.file === 'string' &&
        !page.file.includes('/') &&
        !page.file.includes('\\') &&
        page.file === `motion.${format}`,
      `GAF2D atlas ${format} page path is not canonical`,
    );
    assert(SHA256.test(page.sha256), `GAF2D atlas ${format} page hash is invalid`);
    const relative = joinExportSibling(
      authority.relative,
      page.file,
      `GAF2D atlas ${format} page`,
    );
    const record = release.byPath.get(relative);
    assert(record, `GAF2D atlas ${format} page is absent from the export`);
    assert(record.sha256 === page.sha256, `GAF2D atlas ${format} page hash is stale`);
    const size = imageSize(record.absolute, `GAF2D atlas ${format} page`);
    assert(
      size.width === manifest.atlas.width && size.height === manifest.atlas.height,
      `GAF2D atlas ${format} page dimensions are stale`,
    );
    pageRelatives.push(relative);
  }

  exactKeys(manifest.frames, approvalFacts.orderedFrameIds, 'GAF2D atlas frames');
  const frameMetadata = new Map();
  let commonPivot = null;
  const expectedPivot = {
    x: Math.min(
      normalizationFacts.transform.target_anchor[0],
      normalizationFacts.frameSize.width - 1,
    ),
    y: Math.min(
      normalizationFacts.transform.target_anchor[1],
      normalizationFacts.frameSize.height - 1,
    ),
  };
  let minimumX = Number.POSITIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumX = 0;
  let maximumY = 0;
  for (const frameId of approvalFacts.orderedFrameIds) {
    const frame = manifest.frames[frameId];
    exactKeys(
      frame,
      [
        'atlas_rect',
        'source_size',
        'sprite_source_rect',
        'pivot_source',
        'pivot_trimmed',
        'source_sha256',
        'approval_sha256',
        'duplicate_of',
        'scale_contract',
      ],
      `GAF2D atlas frame "${frameId}"`,
    );
    validateRect(frame.atlas_rect, `GAF2D atlas frame "${frameId}" atlas rect`);
    validatePositiveSize(
      frame.source_size,
      `GAF2D atlas frame "${frameId}" source size`,
    );
    validateRect(
      frame.sprite_source_rect,
      `GAF2D atlas frame "${frameId}" sprite source rect`,
    );
    exactKeys(frame.pivot_source, ['x', 'y'], `GAF2D atlas frame "${frameId}" pivot`);
    exactKeys(
      frame.pivot_trimmed,
      ['x', 'y'],
      `GAF2D atlas frame "${frameId}" trimmed pivot`,
    );
    const rect = frame.atlas_rect;
    const sourceRect = frame.sprite_source_rect;
    const expectedOutput = normalizationFacts.frames.get(frameId).output_sha256;
    assert(
      rect.x + rect.width <= manifest.atlas.width &&
        rect.y + rect.height <= manifest.atlas.height,
      `GAF2D atlas frame "${frameId}" is outside atlas bounds`,
    );
    assert(
      sourceRect.x + sourceRect.width <= frame.source_size.width &&
        sourceRect.y + sourceRect.height <= frame.source_size.height &&
        rect.width === sourceRect.width &&
        rect.height === sourceRect.height,
      `GAF2D atlas frame "${frameId}" cannot reconstruct its source`,
    );
    assert(
      frame.source_size.width === normalizationFacts.frameSize.width &&
        frame.source_size.height === normalizationFacts.frameSize.height,
      `GAF2D atlas frame "${frameId}" has a mixed shared transform`,
    );
    assert(
      Number.isFinite(frame.pivot_source.x) &&
        Number.isFinite(frame.pivot_source.y) &&
        Number.isFinite(frame.pivot_trimmed.x) &&
        Number.isFinite(frame.pivot_trimmed.y),
      `GAF2D atlas frame "${frameId}" pivot is invalid`,
    );
    assert(
      Math.abs(
        frame.pivot_trimmed.x - (frame.pivot_source.x - sourceRect.x),
      ) <= 1e-9 &&
        Math.abs(
          frame.pivot_trimmed.y - (frame.pivot_source.y - sourceRect.y),
        ) <= 1e-9,
      `GAF2D atlas frame "${frameId}" trimmed pivot is stale`,
    );
    if (commonPivot === null) {
      commonPivot = { ...frame.pivot_source };
    } else {
      assert(
        frame.pivot_source.x === commonPivot.x &&
          frame.pivot_source.y === commonPivot.y,
        `GAF2D atlas frame "${frameId}" has a mixed pivot`,
      );
    }
    assert(
      Math.abs(frame.pivot_source.x - expectedPivot.x) <= 1e-9 &&
        Math.abs(frame.pivot_source.y - expectedPivot.y) <= 1e-9,
      `GAF2D atlas frame "${frameId}" pivot is stale for the exact shared normalization transform`,
    );
    assert(
      frame.source_sha256 === expectedOutput &&
        frame.approval_sha256 === expectedOutput,
      `GAF2D atlas frame "${frameId}" source approval hash is stale`,
    );
    assert(
      frame.scale_contract === 'body',
      `GAF2D atlas frame "${frameId}" must use the body scale contract`,
    );
    assert(
      frame.duplicate_of === null ||
        (typeof frame.duplicate_of === 'string' &&
          approvalFacts.orderedFrameIds.includes(frame.duplicate_of) &&
          frame.duplicate_of !== frameId),
      `GAF2D atlas frame "${frameId}" has an invalid duplicate target`,
    );
    minimumX = Math.min(minimumX, sourceRect.x);
    minimumY = Math.min(minimumY, sourceRect.y);
    maximumX = Math.max(maximumX, sourceRect.x + sourceRect.width);
    maximumY = Math.max(maximumY, sourceRect.y + sourceRect.height);
    frameMetadata.set(frameId, frame);
  }
  for (const [frameId, frame] of frameMetadata) {
    if (frame.duplicate_of !== null) {
      const canonical = frameMetadata.get(frame.duplicate_of);
      assert(
        canonical.duplicate_of === null && sameRect(frame.atlas_rect, canonical.atlas_rect),
        `GAF2D atlas frame "${frameId}" has a stale duplicate alias`,
      );
    }
  }
  const frames = [...frameMetadata.entries()];
  for (let left = 0; left < frames.length; left += 1) {
    for (let right = left + 1; right < frames.length; right += 1) {
      const [leftId, leftFrame] = frames[left];
      const [rightId, rightFrame] = frames[right];
      if (!rectsOverlap(leftFrame.atlas_rect, rightFrame.atlas_rect)) continue;
      const leftCanonical = leftFrame.duplicate_of ?? leftId;
      const rightCanonical = rightFrame.duplicate_of ?? rightId;
      assert(
        leftCanonical === rightCanonical &&
          sameRect(leftFrame.atlas_rect, rightFrame.atlas_rect),
        `GAF2D atlas frames "${leftId}" and "${rightId}" overlap without one canonical alias`,
      );
    }
  }
  return {
    atlas: manifest,
    frameMetadata,
    pageRelatives,
    trim: {
      x: minimumX,
      y: minimumY,
      width: maximumX - minimumX,
      height: maximumY - minimumY,
    },
  };
}

function validateRuntimeLineage(
  authority,
  approvalAuthority,
  approvalFacts,
  normalizationAuthority,
  normalizationFacts,
  atlasAuthority,
  atlasFacts,
  release,
) {
  const lineage = authority.payload;
  exactKeys(lineage, ['schema_version', 'asset_id', 'artifacts'], 'runtime lineage');
  assert(lineage.schema_version === 1, 'runtime lineage schema must be 1');
  assert(lineage.asset_id === approvalFacts.candidate.asset_id, 'runtime lineage asset is stale');
  assert(
    Array.isArray(lineage.artifacts) && lineage.artifacts.length > 0,
    'runtime lineage is empty',
  );
  const originalPaths = lineage.artifacts.map((artifact) => artifact?.artifact_path);
  assert(
    arraysEqual(originalPaths, [...originalPaths].sort()),
    'runtime lineage artifacts must use canonical path order',
  );
  const prefix = `assets/${approvalFacts.candidate.asset_id}/work/runtime/`;
  const byExportPath = new Map();
  let commonApprovals = null;
  for (let index = 0; index < lineage.artifacts.length; index += 1) {
    const artifact = lineage.artifacts[index];
    exactKeys(
      artifact,
      ['artifact_path', 'artifact_sha256', 'approvals'],
      `runtime lineage artifact[${index}]`,
    );
    portablePath(artifact.artifact_path, `runtime lineage artifact[${index}].path`);
    assert(
      artifact.artifact_path.startsWith(prefix),
      `runtime lineage artifact "${artifact.artifact_path}" is outside the asset runtime`,
    );
    assert(
      SHA256.test(artifact.artifact_sha256),
      `runtime lineage artifact "${artifact.artifact_path}" hash is invalid`,
    );
    const exportPath = `runtime/${artifact.artifact_path.slice(prefix.length)}`;
    const exportRecord = release.byPath.get(exportPath);
    assert(
      exportRecord && exportRecord.sha256 === artifact.artifact_sha256,
      `runtime lineage artifact "${artifact.artifact_path}" is absent or stale in the export`,
    );
    assert(!byExportPath.has(exportPath), `runtime lineage path "${exportPath}" is duplicated`);
    assert(isObject(artifact.approvals), `runtime lineage approvals for "${exportPath}" are invalid`);
    const approvalKinds = Object.keys(artifact.approvals).sort();
    assert(
      approvalKinds.length >= 2 &&
        approvalKinds.length <= 3 &&
        approvalKinds[0] === 'identity' &&
        approvalKinds.includes('motion') &&
        approvalKinds.every((kind) => ['identity', 'motion', 'rig'].includes(kind)),
      `runtime lineage for "${exportPath}" lacks exact identity/motion authority`,
    );
    const hashes = {};
    for (const kind of approvalKinds) {
      const binding = artifact.approvals[kind];
      exactKeys(
        binding,
        ['approval_kind', 'sha256', 'source_manifest_version'],
        `runtime lineage ${kind} binding`,
      );
      assert(
        binding.approval_kind === kind &&
          SHA256.test(binding.sha256) &&
          binding.source_manifest_version ===
            approvalFacts.candidate.source_manifest_version,
        `runtime lineage ${kind} binding is stale`,
      );
      hashes[kind] = binding.sha256;
    }
    if (commonApprovals === null) {
      commonApprovals = hashes;
    } else {
      assert(
        canonicalSha256(hashes) === canonicalSha256(commonApprovals),
        'runtime artifacts are bound to mixed approval generations',
      );
    }
    byExportPath.set(exportPath, artifact);
  }

  const runtimeFiles = [...release.byPath.keys()]
    .filter((relative) => relative.startsWith('runtime/'))
    .filter((relative) => relative !== authority.relative)
    .sort();
  const lineageFiles = [...byExportPath.keys()].sort();
  assert(
    arraysEqual(runtimeFiles, lineageFiles),
    'runtime lineage must exactly cover every exported runtime artifact',
  );
  const requiredRuntimeFiles = [
    normalizationAuthority.relative,
    ...[...normalizationFacts.frames.values()].map((frame) => frame.relative),
    atlasAuthority.relative,
    ...atlasFacts.pageRelatives,
  ];
  assert(
    requiredRuntimeFiles.every((relative) => byExportPath.has(relative)),
    'runtime lineage does not cover the complete motion derivative',
  );

  const motionApprovalSha256 = approvalAuthority.record.sha256;
  assert(
    commonApprovals.motion === motionApprovalSha256,
    'runtime motion approval binding does not match the exported motion-set approval',
  );
  const nonRuntimeHashes = new Set(
    [...release.byPath.entries()]
      .filter(([relative]) => !relative.startsWith('runtime/'))
      .map(([, record]) => record.sha256),
  );
  assert(
    nonRuntimeHashes.has(commonApprovals.identity),
    'runtime identity approval hash is not present in the current export',
  );
  if (commonApprovals.rig !== undefined) {
    assert(
      nonRuntimeHashes.has(commonApprovals.rig),
      'runtime rig approval hash is not present in the current export',
    );
  }
  return {
    identityApprovalSha256: commonApprovals.identity,
    motionApprovalSha256: commonApprovals.motion,
    ...(commonApprovals.rig
      ? { rigApprovalSha256: commonApprovals.rig }
      : {}),
  };
}

function validateMotionApprovalV4(approval, assetId, contract, approvalSha256) {
  exactKeys(
    approval,
    [
      'approved_at',
      'approver_label',
      'candidate',
      'candidate_sha256',
      'review_evidence_path',
      'review_evidence_sha256',
      'review_html_path',
      'review_html_sha256',
      'schema_version',
    ],
    'motion-set approval v4',
  );
  assert(approval.schema_version === 4, 'motion-set approval v4 schema must be 4');
  assert(
    typeof approval.approver_label === 'string' && approval.approver_label.length > 0,
    'motion-set approval v4 requires a human approver label',
  );
  assert(
    typeof approval.approved_at === 'string' &&
      Number.isFinite(Date.parse(approval.approved_at)),
    'motion-set approval v4 timestamp is invalid',
  );
  for (const field of [
    'candidate_sha256',
    'review_evidence_sha256',
    'review_html_sha256',
  ]) {
    assert(SHA256.test(approval[field]), `motion-set approval v4 ${field} is invalid`);
  }
  for (const field of ['review_evidence_path', 'review_html_path']) {
    portablePath(approval[field], `motion-set approval v4 ${field}`);
  }
  const candidate = approval.candidate;
  exactKeys(
    candidate,
    [
      'asset_id',
      'candidate_id',
      'fidelity_evidence',
      'grammar',
      'lossless_masters',
      'runtime_derivatives',
      'semantic_authority',
      'source_manifest_version',
    ],
    'motion-set candidate v4',
  );
  assert(candidate.grammar === 'gaf2d-motion-set-v4', 'motion-set candidate must use V4');
  assert(candidate.asset_id === assetId, 'motion-set candidate targets a different asset');
  assert(GAF_IDENTIFIER.test(candidate.candidate_id), 'motion-set candidate v4 ID is invalid');
  assert(
    Number.isInteger(candidate.source_manifest_version) &&
      candidate.source_manifest_version >= 1,
    'motion-set candidate v4 source manifest version is invalid',
  );
  assert(
    approval.candidate_sha256 === canonicalSha256(candidate),
    'motion-set candidate v4 metadata hash is stale',
  );
  const derivatives = Array.isArray(candidate.runtime_derivatives)
    ? candidate.runtime_derivatives
    : [];
  assert(derivatives.length > 0, 'motion-set candidate v4 has no runtime derivative');
  const approvedDerivative = derivatives.find(
    (entry) =>
      entry?.grammar === 'gaf2d-runtime-derivative-binding-v4' &&
      entry?.manifest?.path ===
        `motion/authored-semantic-v4/${assetId}/derivative-set.json`,
  );
  assert(approvedDerivative, 'motion-set candidate v4 lacks the canonical visual-fidelity derivative');
  assert(
    SHA256.test(approvedDerivative.manifest?.sha256 || ''),
    'motion-set candidate v4 manifest hash is invalid',
  );
  assert(
    approvedDerivative.files?.every(
      (file) =>
        isObject(file) &&
        isPortablePath(file.path) &&
        SHA256.test(file.sha256 || ''),
    ),
    'motion-set candidate v4 runtime file binding is invalid',
  );
  assert(
    Array.isArray(contract?.clipNames) &&
      contract.clipNames.length > 0 &&
      contract.clipNames.every((clipName) =>
        approvedDerivative.files.some((file) =>
          file.path ===
            `motion/authored-semantic-v4/${assetId}/clips/${clipName}/descriptor.json`,
        ),
      ),
    'motion-set candidate v4 clip membership is stale',
  );
  return {
    approval,
    approvalSha256,
    candidate,
    derivative: approvedDerivative,
  };
}

function validateVisualFidelityDerivativeSet(
  release,
  assetId,
  contract,
  derivativeFacts,
) {
  const relative = 'runtime/atlas/v4/derivative-set.json';
  const record = release.byPath.get(relative);
  assert(record, 'visual-fidelity derivative-set export is missing');
  const payload = readJson(record.absolute, 'visual-fidelity derivative-set');
  exactKeys(
    payload,
    [
      'asset_id',
      'authority_status',
      'clip_count',
      'clips',
      'consumer_scale',
      'contract',
      'creative_approval',
      'frame_count',
      'master_set_sha256',
      'profile',
      'runtime_density',
      'schema_version',
      'semantic_clip_order',
      'v3_lineage_sha256',
    ],
    'visual-fidelity derivative-set',
  );
  assert(payload.schema_version === 1, 'visual-fidelity derivative-set schema must be 1');
  assert(
    payload.contract === 'apn-visual-fidelity-v4-derivative-set-v1',
    'visual-fidelity derivative-set contract is invalid',
  );
  assert(payload.asset_id === assetId, 'visual-fidelity derivative-set targets a different asset');
  assert(
    payload.authority_status === 'unapproved_candidate' &&
      payload.creative_approval === 'human_required',
    'visual-fidelity derivative-set approval state drifted',
  );
  assert(
    payload.clip_count === contract.clipNames.length &&
      Array.isArray(payload.clips) &&
      payload.clips.length === contract.clipNames.length,
    'visual-fidelity derivative-set clip count is stale',
  );
  assert(
    Array.isArray(payload.semantic_clip_order) &&
      payload.semantic_clip_order.length === contract.clipNames.length &&
      payload.semantic_clip_order.every(
        (entry, index) => entry?.clip_id === contract.clipNames[index],
      ),
    'visual-fidelity derivative-set semantic clip order is stale',
  );
  assert(
    payload.clips.every(
      (clip, index) =>
        isObject(clip) &&
        clip.clip_id === contract.clipNames[index] &&
        SHA256.test(clip.descriptor_sha256 || '') &&
        SHA256.test(clip.media_file_sha256 || ''),
    ),
    'visual-fidelity derivative-set clip authority is invalid',
  );
  assert(
    payload.profile?.profile_id === 'lossless-webp' &&
      SHA256.test(payload.profile?.profile_sha256 || '') &&
      SHA256.test(payload.profile?.selection_authority_sha256 || ''),
    'visual-fidelity derivative-set profile binding is invalid',
  );
  assert(
    payload.consumer_scale?.role === derivativeFacts.derivative.consumer_scale?.role,
    'visual-fidelity derivative-set consumer scale role drifted',
  );
  assert(
    record.sha256 === derivativeFacts.derivative.manifest.sha256,
    'visual-fidelity derivative-set hash drifted from the approved derivative binding',
  );
  const clipFiles = [];
  const clipRecords = [];
  for (const clip of payload.clips) {
    const descriptorRelative =
      `runtime/atlas/v4/clips/${clip.clip_id}/descriptor.json`;
    const descriptorRecord = release.byPath.get(descriptorRelative);
    assert(
      descriptorRecord?.sha256 === clip.descriptor_sha256,
      `visual-fidelity descriptor for "${clip.clip_id}" drifted`,
    );
    const evidenceRelative =
      `runtime/atlas/v4/clips/${clip.clip_id}/evidence.json`;
    const evidenceRecord = release.byPath.get(evidenceRelative);
    assert(evidenceRecord, `visual-fidelity evidence for "${clip.clip_id}" is missing`);
    const mediaRelative =
      `runtime/atlas/v4/clips/${clip.clip_id}/derivative/lossless.webp`;
    const mediaRecord = release.byPath.get(mediaRelative);
    assert(
      mediaRecord?.sha256 === clip.media_file_sha256,
      `visual-fidelity media for "${clip.clip_id}" drifted`,
    );
    clipFiles.push(descriptorRelative, evidenceRelative, mediaRelative);
    clipRecords.push({
      clipId: clip.clip_id,
      derivative: clip,
      descriptorRelative,
      descriptorRecord,
      evidenceRelative,
      evidenceRecord,
      mediaRelative,
      mediaRecord,
    });
  }
  assert(
    derivativeFacts.derivative.files.length === clipFiles.length &&
      derivativeFacts.derivative.files.every((file) => {
        const prefix = `motion/authored-semantic-v4/${assetId}/clips/`;
        assert(
          typeof file.path === 'string' && file.path.startsWith(prefix),
          `visual-fidelity source file "${String(file.path)}" is not asset-contained`,
        );
        const relative = `runtime/atlas/v4/${file.path.slice(
          `motion/authored-semantic-v4/${assetId}/`.length,
        )}`;
        return release.byPath.get(relative)?.sha256 === file.sha256;
      }),
    'approved derivative source bindings drifted from the exported V4 runtime files',
  );
  return {
    authority: { relative, record, payload },
    clipFiles: clipFiles.sort(),
    clipRecords,
  };
}

function validateVisualFidelityLineage(release, assetId, derivativeFacts, setFacts) {
  const relative = 'runtime/atlas/v4/visual-fidelity-lineage.json';
  const record = release.byPath.get(relative);
  assert(record, 'visual-fidelity lineage export is missing');
  const payload = readJson(record.absolute, 'visual-fidelity lineage');
  exactKeys(
    payload,
    [
      'asset_id',
      'candidate_document_path',
      'candidate_document_sha256',
      'candidate_sha256',
      'consumer_scale',
      'derivative_id',
      'encoder_profile_sha256',
      'grammar',
      'motion_approval_path',
      'motion_approval_sha256',
      'runtime_files',
      'runtime_manifest_path',
      'runtime_manifest_sha256',
      'source_master_manifest_path',
      'source_master_manifest_sha256',
      'source_runtime_manifest_path',
      'source_runtime_manifest_sha256',
    ],
    'visual-fidelity lineage',
  );
  assert(
    payload.grammar === 'gaf2d-visual-fidelity-derivative-lineage-v4',
    'visual-fidelity lineage grammar is invalid',
  );
  assert(payload.asset_id === assetId, 'visual-fidelity lineage targets a different asset');
  assert(
    payload.motion_approval_path ===
      `assets/${assetId}/approved/motion/motion-set-approval-v4.json` &&
      payload.motion_approval_sha256 === derivativeFacts.approvalSha256,
    'visual-fidelity lineage motion approval binding drifted',
  );
  assert(
    payload.candidate_sha256 === derivativeFacts.approval.candidate_sha256,
    'visual-fidelity lineage candidate binding drifted',
  );
  assert(
    payload.runtime_manifest_path ===
      `assets/${assetId}/work/runtime/atlas/v4/derivative-set.json` &&
      payload.runtime_manifest_sha256 === setFacts.authority.record.sha256 &&
      payload.source_runtime_manifest_path ===
        `motion/authored-semantic-v4/${assetId}/derivative-set.json` &&
      payload.source_runtime_manifest_sha256 ===
        derivativeFacts.derivative.manifest.sha256,
    'visual-fidelity lineage runtime manifest binding drifted',
  );
  assert(
    Array.isArray(payload.runtime_files) &&
      payload.runtime_files.length === setFacts.clipFiles.length,
    'visual-fidelity lineage runtime file set is incomplete',
  );
  const runtimeFiles = payload.runtime_files.map((entry) => {
    exactKeys(entry, ['path', 'sha256'], 'visual-fidelity lineage runtime file');
    portablePath(entry.path, 'visual-fidelity lineage runtime file path');
    assert(
      entry.path.startsWith(`assets/${assetId}/work/runtime/atlas/v4/`),
      `visual-fidelity lineage file "${entry.path}" escapes the asset runtime`,
    );
    const relative = `runtime/${entry.path.slice(`assets/${assetId}/work/runtime/`.length)}`;
    assert(
      release.byPath.get(relative)?.sha256 === entry.sha256,
      `visual-fidelity lineage file "${relative}" drifted`,
    );
    return relative;
  });
  assert(
    arraysEqual(runtimeFiles.sort(), [...setFacts.clipFiles].sort()),
    'visual-fidelity lineage runtime file coverage drifted',
  );
  return {
    authority: { relative, record, payload },
    runtimeFiles: runtimeFiles.sort(),
  };
}

function validateGenericRuntimeExportLineage(release, assetId, approvalSha256, copiedRuntimeFiles) {
  const relative = 'runtime/lineage.json';
  const record = release.byPath.get(relative);
  assert(record, 'runtime export lineage is missing');
  const payload = readJson(record.absolute, 'runtime export lineage');
  exactKeys(payload, ['schema_version', 'asset_id', 'artifacts'], 'runtime export lineage');
  assert(payload.schema_version === 1, 'runtime export lineage schema must be 1');
  assert(payload.asset_id === assetId, 'runtime export lineage asset drifted');
  const covered = [];
  for (const artifact of payload.artifacts || []) {
    exactKeys(artifact, ['artifact_path', 'artifact_sha256', 'approvals'], 'runtime export lineage artifact');
    portablePath(artifact.artifact_path, 'runtime export lineage artifact path');
    assert(
      artifact.artifact_path.startsWith(`assets/${assetId}/work/runtime/`),
      `runtime export lineage artifact "${artifact.artifact_path}" escapes the asset runtime`,
    );
    const relativePath = `runtime/${artifact.artifact_path.slice(`assets/${assetId}/work/runtime/`.length)}`;
    assert(
      release.byPath.get(relativePath)?.sha256 === artifact.artifact_sha256,
      `runtime export lineage artifact "${relativePath}" drifted`,
    );
    assert(isObject(artifact.approvals), `runtime export lineage approvals for "${relativePath}" are invalid`);
    assert(
      artifact.approvals.motion?.approval_kind === 'motion' &&
        artifact.approvals.motion?.sha256 === approvalSha256,
      `runtime export lineage motion approval for "${relativePath}" drifted`,
    );
    assert(
      artifact.approvals.identity?.approval_kind === 'identity' &&
        SHA256.test(artifact.approvals.identity?.sha256 || ''),
      `runtime export lineage identity approval for "${relativePath}" is invalid`,
    );
    covered.push(relativePath);
  }
  assert(
    arraysEqual(covered.sort(), [...copiedRuntimeFiles].sort()),
    'runtime export lineage does not cover the exact copied runtime files',
  );
  return { authority: { relative, record, payload } };
}

function loadValidatedVisualFidelityV4Source(release, assetId, contract) {
  const approvalRelative = 'motion/motion-set-approval-v4.json';
  const approvalRecord = release.byPath.get(approvalRelative);
  assert(approvalRecord, 'motion-set approval v4 export is missing');
  const derivativeFacts = validateMotionApprovalV4(
    readJson(approvalRecord.absolute, 'motion-set approval v4'),
    assetId,
    contract,
    approvalRecord.sha256,
  );
  const setFacts = validateVisualFidelityDerivativeSet(
    release,
    assetId,
    contract,
    derivativeFacts,
  );
  const visualFidelityLineage = validateVisualFidelityLineage(
    release,
    assetId,
    derivativeFacts,
    setFacts,
  );
  const runtimeFiles = [
    ...visualFidelityLineage.runtimeFiles,
    setFacts.authority.relative,
    visualFidelityLineage.authority.relative,
  ].sort();
  const genericLineage = validateGenericRuntimeExportLineage(
    release,
    assetId,
    derivativeFacts.approvalSha256,
    runtimeFiles,
  );
  const copiedFiles = [
    approvalRelative,
    genericLineage.authority.relative,
    ...runtimeFiles,
  ].sort();
  return {
    mode: 'visual-fidelity-v4-copy',
    release,
    approvalAuthority: {
      relative: approvalRelative,
      record: approvalRecord,
      payload: derivativeFacts.approval,
    },
    derivativeFacts,
    setFacts,
    visualFidelityLineage,
    genericLineage,
    copiedFiles,
  };
}

function resolveProjectFile(projectRoot, relative, label) {
  portablePath(relative, label);
  const absolute = path.resolve(projectRoot, ...relative.split('/'));
  const root = path.resolve(projectRoot);
  assert(
    absolute.startsWith(`${root}${path.sep}`),
    `${label} escapes the GAF2D project`,
  );
  return absolute;
}

function readTrackedProjectJson(projectRoot, relative, expectedSha256, label) {
  assert(SHA256.test(expectedSha256 || ''), `${label} hash is invalid`);
  const absolute = resolveProjectFile(projectRoot, relative, label);
  const bytes = readBoundedFile(absolute, MAX_JSON_BYTES, label);
  assert(sha256Bytes(bytes) === expectedSha256, `${label} drifted`);
  return {
    absolute,
    bytes,
    value: JSON.parse(bytes.toString('utf8')),
  };
}

function readTrackedProjectBytes(projectRoot, relative, expectedSha256, label) {
  assert(SHA256.test(expectedSha256 || ''), `${label} hash is invalid`);
  const absolute = resolveProjectFile(projectRoot, relative, label);
  const bytes = readBoundedFile(absolute, MAX_ARTIFACT_BYTES, label);
  assert(sha256Bytes(bytes) === expectedSha256, `${label} drifted`);
  return { absolute, bytes };
}

function loadValidatedVisualFidelityProjection(source, role) {
  const semanticAuthority = source.derivativeFacts.approval.candidate.semantic_authority;
  exactKeys(
    semanticAuthority,
    [
      'acting_contract',
      'approved_identity_sha256',
      'batch_summary',
      'candidate_document',
      'candidate_sha256',
      'canonical_root_track',
      'grammar',
      'pose_authority',
      'pose_manifest',
      'temporal_evidence',
    ],
    'visual-fidelity semantic authority',
  );
  assert(
    semanticAuthority.grammar === 'gaf2d-semantic-authority-v3-binding-v4',
    'visual-fidelity semantic authority grammar is invalid',
  );
  const candidateRecord = readTrackedProjectJson(
    source.release.project,
    semanticAuthority.candidate_document.path,
    semanticAuthority.candidate_document.sha256,
    'V3 semantic candidate document',
  );
  const candidate = candidateRecord.value;
  assert(
    candidate.asset_id === source.release.manifest.asset_id &&
      candidate.candidate_id.startsWith(`${source.release.manifest.asset_id}-`),
    'V3 semantic candidate binding drifted',
  );
  const batchRecord = readTrackedProjectJson(
    source.release.project,
    semanticAuthority.batch_summary.path,
    semanticAuthority.batch_summary.sha256,
    'V3 batch summary',
  );
  const batch = batchRecord.value;
  const batchAsset = (Array.isArray(batch.assets) ? batch.assets : []).find(
    (entry) => entry?.asset_id === source.release.manifest.asset_id,
  );
  assert(batchAsset, 'V3 batch summary asset record is missing');
  const batchBase = path.posix.dirname(semanticAuthority.batch_summary.path);
  const clipManifestRecord = readTrackedProjectJson(
    source.release.project,
    path.posix.join(batchBase, batchAsset.clip_manifest_path),
    batchAsset.clip_manifest_sha256,
    'V3 clip manifest',
  );
  const clipManifest = clipManifestRecord.value;
  const qaRecord = readTrackedProjectJson(
    source.release.project,
    path.posix.join(batchBase, batchAsset.qa_summary_path),
    batchAsset.qa_summary_sha256,
    'V3 QA summary',
  );
  const qa = qaRecord.value;
  readTrackedProjectJson(
    source.release.project,
    semanticAuthority.temporal_evidence.path,
    semanticAuthority.temporal_evidence.sha256,
    'V3 temporal evidence',
  );
  const clips = [];
  for (const clipRecord of source.setFacts.clipRecords) {
    const descriptor = readJson(
      clipRecord.descriptorRecord.absolute,
      `${clipRecord.clipId} V4 clip descriptor`,
    );
    assert(
      descriptor.evidence?.sha256 === clipRecord.evidenceRecord.sha256 &&
        descriptor.evidence?.path ===
          `${source.release.manifest.asset_id}/clips/${clipRecord.clipId}/evidence.json`,
      `visual-fidelity evidence binding for "${clipRecord.clipId}" drifted`,
    );
    assert(
      descriptor.media?.file_sha256 === clipRecord.mediaRecord.sha256 &&
        descriptor.media?.path === clipRecord.derivative.media_path,
      `visual-fidelity media binding for "${clipRecord.clipId}" drifted`,
    );
    const sourceAuthority = descriptor.source_authority;
    const sourceClip = candidate.clips?.[clipRecord.clipId];
    const clipManifestClip = clipManifest.clips?.[clipRecord.clipId];
    const qaClip = qa.clips?.[clipRecord.clipId];
    assert(sourceClip, `V3 semantic clip "${clipRecord.clipId}" is missing`);
    assert(clipManifestClip, `V3 clip manifest "${clipRecord.clipId}" is missing`);
    assert(qaClip, `V3 QA clip "${clipRecord.clipId}" is missing`);
    assert(
      sourceAuthority?.v3_acting_contract_sha256 === semanticAuthority.acting_contract.sha256 &&
        sourceAuthority?.v3_batch_summary_path === semanticAuthority.batch_summary.path &&
        sourceAuthority?.v3_batch_summary_sha256 === semanticAuthority.batch_summary.sha256 &&
        sourceAuthority?.v3_clip_manifest_path === batchAsset.clip_manifest_path &&
        sourceAuthority?.v3_clip_manifest_sha256 === batchAsset.clip_manifest_sha256 &&
        sourceAuthority?.v3_pose_manifest_path === batchAsset.pose_manifest_path &&
        sourceAuthority?.v3_pose_manifest_sha256 === batchAsset.pose_manifest_sha256 &&
        sourceAuthority?.v3_pose_authority_path === batchAsset.pose_authority_path &&
        sourceAuthority?.v3_pose_authority_sha256 === batchAsset.pose_authority_sha256 &&
        sourceAuthority?.v3_producer_clip_manifest_path ===
          batchAsset.producer_clip_manifest_path &&
        sourceAuthority?.v3_producer_clip_manifest_sha256 ===
          batchAsset.producer_clip_manifest_sha256 &&
        sourceAuthority?.v3_transform_timeline_sha256 ===
          clipManifestClip.transform_timeline_sha256,
      `visual-fidelity source authority for "${clipRecord.clipId}" drifted`,
    );
    assert(
      Array.isArray(qaClip.body_pose_sha256) &&
        qaClip.body_pose_sha256.length === descriptor.frames.length,
      `V3 QA body pose projection for "${clipRecord.clipId}" drifted`,
    );
    clips.push({
      clipId: clipRecord.clipId,
      descriptor,
      descriptorSha256: clipRecord.descriptorRecord.sha256,
      mediaSha256: clipRecord.mediaRecord.sha256,
      mediaBytes: fs.readFileSync(clipRecord.mediaRecord.absolute),
      sourceClip,
      bodyPoseSha256: qaClip.body_pose_sha256,
    });
  }
  return {
    assetId: source.release.manifest.asset_id,
    role,
    candidate,
    candidateSha256: semanticAuthority.candidate_sha256,
    temporalEvidenceSha256: semanticAuthority.temporal_evidence.sha256,
    qaSummarySha256: batchAsset.qa_summary_sha256,
    batchSummarySha256: semanticAuthority.batch_summary.sha256,
    manifestVersion: source.derivativeFacts.approval.candidate.source_manifest_version,
    derivativeSetSha256: source.setFacts.authority.record.sha256,
    masterSetSha256: source.setFacts.authority.payload.master_set_sha256,
    selectedProfileSha256: source.setFacts.authority.payload.profile.profile_sha256,
    v3LineageSha256: source.setFacts.authority.payload.v3_lineage_sha256,
    consumerScale: source.setFacts.authority.payload.consumer_scale,
    motionApprovalSha256: source.approvalAuthority.record.sha256,
    visualFidelityLineageSha256:
      source.visualFidelityLineage.authority.record.sha256,
    runtimeLineageSha256: source.genericLineage.authority.record.sha256,
    clips,
  };
}

function buildApprovedVisualFidelityMotionSet(source, outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const setClips = {};
  const setLineage = {
    sourceBatchSha256: source.batchSummarySha256,
    derivativeSetSha256: source.derivativeSetSha256,
    masterSetSha256: source.masterSetSha256,
    selectedProfileSha256: source.selectedProfileSha256,
    v3LineageSha256: source.v3LineageSha256,
  };
  const setReleaseLineage = {
    motionApprovalSha256: source.motionApprovalSha256,
    derivativeSetSha256: source.derivativeSetSha256,
    visualFidelityLineageSha256: source.visualFidelityLineageSha256,
    runtimeLineageSha256: source.runtimeLineageSha256,
  };
  const descriptorBuilds = new Map();
  let aggregateTrim = null;
  let aggregatePresentation = null;
  let encoderArguments = null;
  for (const clipSource of source.clips) {
    const runtimeCanvas = clipSource.descriptor.runtime_canvas;
    const trim = { ...clipSource.descriptor.packing.source_trim };
    const pivot = {
      x:
        clipSource.descriptor.packing.shared_pivot.runtime_canvas_pixels[0] /
        runtimeCanvas[0],
      y:
        clipSource.descriptor.packing.shared_pivot.runtime_canvas_pixels[1] /
        runtimeCanvas[1],
    };
    const frames = clipSource.descriptor.frames.map((frame, index) => ({
      x: frame.atlas_rect[0],
      y: frame.atlas_rect[1],
      width: frame.atlas_rect[2],
      height: frame.atlas_rect[3],
      sourceSha256: frame.master.file_sha256,
      bodyPoseSha256: clipSource.bodyPoseSha256[index],
    }));
    const projected = {
      grammar: 'gaf2d-motion-clip-v2',
      authority: 'approved_release',
      status: 'approved',
      sourceFamily: 'authored-semantic-v4',
      assetId: source.assetId,
      name: clipSource.clipId,
      playback: clipSource.sourceClip.playback,
      fps: clipSource.sourceClip.fps,
      sourceFps: clipSource.sourceClip.source_fps,
      cadenceProfile: clipSource.sourceClip.cadence_profile,
      authoringMethod: clipSource.sourceClip.authoring_method,
      interpolationMethod: clipSource.sourceClip.interpolation_method,
      holds: clipSource.sourceClip.holds.map((hold) => ({
        startIndex: hold.start_index,
        endIndex: hold.end_index,
        reason: hold.reason,
      })),
      markers: markerIndices(clipSource.sourceClip, source.assetId, clipSource.clipId),
      frames,
      atlas: {
        width: clipSource.descriptor.media.decoded_canvas[0],
        height: clipSource.descriptor.media.decoded_canvas[1],
        bytes: clipSource.mediaBytes.length,
        sha256: clipSource.mediaSha256,
      },
      trim,
      pivot,
      presentation: v4ClipPresentation(
        trim,
        clipSource.descriptor.consumer_scale,
        clipSource.clipId,
        clipSource.descriptor.frames[0].master.file_sha256,
      ),
      lineage: {
        ...setLineage,
        sourceDescriptorSha256: clipSource.descriptorSha256,
        sourceEvidenceSha256: clipSource.descriptor.evidence.sha256,
        sourceMediaSha256: clipSource.mediaSha256,
        masterInventorySha256: clipSource.descriptor.master_inventory_sha256,
      },
      releaseLineage: {
        sourceDescriptorSha256: clipSource.descriptorSha256,
        sourceEvidenceSha256: clipSource.descriptor.evidence.sha256,
        sourceMediaSha256: clipSource.mediaSha256,
        masterInventorySha256: clipSource.descriptor.master_inventory_sha256,
        ...setReleaseLineage,
      },
      encoder: {
        name: 'cwebp',
        version: '1.6.0',
        arguments: [...clipSource.descriptor.profile.arguments],
        profileSha256: source.selectedProfileSha256,
      },
    };
    encoderArguments = encoderArguments ?? projected.encoder.arguments;
    assert(
      JSON.stringify(projected.encoder.arguments) === JSON.stringify(encoderArguments),
      `${source.assetId} V4 projected clip encoder arguments drifted`,
    );
    const descriptorPath = path.join(outputDirectory, `${clipSource.clipId}.json`);
    const mediaPath = path.join(outputDirectory, `${clipSource.clipId}.webp`);
    const descriptorBytes = writeCanonical(descriptorPath, projected);
    fs.writeFileSync(mediaPath, clipSource.mediaBytes, { flag: 'wx' });
    assert(
      sha256File(mediaPath) === clipSource.mediaSha256,
      `${source.assetId}/${clipSource.clipId} exact WebP copy changed after write`,
    );
    setClips[clipSource.clipId] = {
      descriptor: `${clipSource.clipId}.json`,
      descriptorSha256: sha256Bytes(descriptorBytes),
      image: `${clipSource.clipId}.webp`,
      imageSha256: clipSource.mediaSha256,
    };
    descriptorBuilds.set(clipSource.clipId, {
      descriptor: projected,
      descriptorSha256: sha256Bytes(descriptorBytes),
      imageSha256: clipSource.mediaSha256,
      imageBytes: clipSource.mediaBytes.length,
    });
    if (!aggregatePresentation) {
      aggregateTrim = trim;
      aggregatePresentation = projected.presentation;
    }
  }
  const frameSize = {
    width: source.consumerScale.runtime_canvas_class,
    height: source.consumerScale.runtime_canvas_class,
  };
  const set = {
    grammar: 'gaf2d-motion-set-index-v2',
    authority: 'approved_release',
    status: 'approved',
    sourceFamily: 'authored-semantic-v4',
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
      candidateId: source.candidate.candidate_id,
      candidateSha256: source.candidateSha256,
      temporalEvidenceSha256: source.temporalEvidenceSha256,
      qaSummarySha256: source.qaSummarySha256,
      batchSummarySha256: source.batchSummarySha256,
      sourceManifestVersion: source.manifestVersion,
    },
    lineage: setLineage,
    releaseLineage: setReleaseLineage,
    toolchain: {
      grammar: V4_RUNTIME_TOOLCHAIN.grammar,
      compositor: { ...V4_RUNTIME_TOOLCHAIN.compositor },
      encoder: {
        name: 'cwebp',
        version: '1.6.0',
        arguments: [...encoderArguments],
        profileSha256: source.selectedProfileSha256,
      },
      operations: [...V4_RUNTIME_TOOLCHAIN.operations],
      profileSha256: source.selectedProfileSha256,
    },
  };
  const setErrors = validateMotionSetIndex(set, source.assetId, {
    role: source.role,
    consumerRole: v4ConsumerRoleFor(source.assetId, source.role),
    selectedProfileSha256: source.selectedProfileSha256,
  });
  assert(
    setErrors.length === 0,
    `${source.assetId} V4 motion-set index failed runtime validation: ${setErrors.join('; ')}`,
  );
  for (const [clipName, build] of descriptorBuilds) {
    const descriptorErrors = validateMotionClipDescriptor(
      build.descriptor,
      clipName,
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
    assert(
      descriptorErrors.length === 0,
      `${source.assetId}/${clipName} V4 clip descriptor failed runtime validation: ${descriptorErrors.join('; ')}`,
    );
  }
  const setBytes = writeCanonical(path.join(outputDirectory, 'set.json'), set);
  return {
    setSha256: sha256Bytes(setBytes),
    files: Object.fromEntries(
      ['set.json', ...source.clips.flatMap((clip) => [`${clip.clipId}.json`, `${clip.clipId}.webp`])]
        .map((relative) => [relative, sha256File(path.join(outputDirectory, relative))]),
    ),
  };
}

function trustedPackRole(packFile, assetId) {
  const resolved = path.resolve(packFile);
  const pack = readJson(resolved, 'trusted APN pack manifest');
  assert(ASSET_ID.test(pack?.id || ''), 'trusted APN pack ID is invalid');
  assert(Array.isArray(pack?.targets), 'trusted APN pack targets are missing');
  const targetIds = pack.targets.map((target) => target?.id);
  assert(
    targetIds.every((id) => ASSET_ID.test(id || '')) &&
      new Set(targetIds).size === targetIds.length,
    'trusted APN pack target IDs are invalid or duplicated',
  );
  assert(ASSET_ID.test(pack?.boss?.id || ''), 'trusted APN pack boss ID is invalid');
  const isTarget = targetIds.includes(assetId);
  const isBoss = pack.boss.id === assetId;
  assert(
    Number(isTarget) + Number(isBoss) === 1,
    `asset "${assetId}" must have exactly one trusted target or boss role`,
  );
  return { role: isBoss ? 'boss' : 'character', packId: pack.id };
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

export function validateDerivativeTools(
  cwebpPath,
  magickPath,
  encoderArguments,
) {
  assert(
    arraysEqual(encoderArguments, CANONICAL_CWEBP_ARGUMENTS),
    'encoder arguments must be exactly ["-exact","-q","90"]; operands are added internally',
  );
  const cwebpVersion = toolOutput(cwebpPath, ['-version'], 'cwebp version probe')
    .split(/\s+/)[0];
  assert(
    cwebpVersion === CWEBP_VERSION,
    `cwebp version must be exactly ${CWEBP_VERSION}`,
  );
  const magickVersion = toolOutput(magickPath, ['-version'], 'ImageMagick version probe');
  const magickMatch = magickVersion.match(/^Version: ImageMagick ([^\s]+)/m);
  assert(
    magickMatch?.[1] === IMAGEMAGICK_VERSION,
    `ImageMagick version must be exactly ${IMAGEMAGICK_VERSION}`,
  );
  return {
    cwebpVersion,
    derivativeToolchainSha256: DERIVATIVE_TOOLCHAIN_SHA256,
  };
}

export function chooseDerivativeMatrix(
  frameCount,
  cellWidth,
  cellHeight,
  decodedLimit,
) {
  const maximumColumns = Math.min(
    frameCount,
    Math.floor(MAX_ATLAS_DIMENSION / cellWidth),
  );
  const maximumRows = Math.floor(MAX_ATLAS_DIMENSION / cellHeight);
  let best = null;
  for (let columns = 1; columns <= maximumColumns; columns += 1) {
    const rows = Math.ceil(frameCount / columns);
    if (rows > maximumRows) continue;
    const width = columns * cellWidth;
    const height = rows * cellHeight;
    const decodedBytes = width * height * 4;
    if (decodedBytes > decodedLimit) continue;
    const candidate = {
      columns,
      rows,
      width,
      height,
      decodedBytes,
      slots: columns * rows,
      longestEdge: Math.max(width, height),
    };
    if (
      best === null ||
      candidate.slots < best.slots ||
      (candidate.slots === best.slots &&
        candidate.longestEdge < best.longestEdge) ||
      (candidate.slots === best.slots &&
        candidate.longestEdge === best.longestEdge &&
        candidate.columns < best.columns)
    ) {
      best = candidate;
    }
  }
  assert(best !== null, 'logical frames cannot fit the APN atlas bounds and decoded budget');
  return best;
}

export function atomicPublishDirectory(staged, destination) {
  const parent = path.dirname(destination);
  const backup = path.join(
    parent,
    `.${path.basename(destination)}.${crypto.randomUUID()}.backup`,
  );
  let movedExisting = false;
  if (fs.existsSync(destination)) {
    const stats = fs.lstatSync(destination);
    assert(
      stats.isDirectory() && !stats.isSymbolicLink(),
      'output destination must be a real directory',
    );
    fs.renameSync(destination, backup);
    movedExisting = true;
  }
  try {
    fs.renameSync(staged, destination);
  } catch (error) {
    if (movedExisting) fs.renameSync(backup, destination);
    throw error;
  }
  let cleanupWarning = null;
  if (movedExisting) {
    try {
      fs.rmSync(backup, { recursive: true });
    } catch (error) {
      cleanupWarning =
        `published output is current, but previous backup cleanup remains at ` +
        `"${path.basename(backup)}": ${String(error?.message || error)}`;
    }
  }
  return { cleanupWarning };
}

export function buildDerivativeAtlas({
  frameIds,
  normalizationFacts,
  atlasFacts,
  staged,
  matrix,
  magickPath,
  cwebpPath,
  encoderArguments,
  outputName = 'motion.webp',
  workPrefix = 'motion',
}) {
  assert(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(workPrefix),
    'derivative work prefix is invalid',
  );
  assert(
    /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/.test(outputName),
    'derivative WebP output name is invalid',
  );
  const cellsDir = path.join(staged, `.${workPrefix}-cells`);
  fs.mkdirSync(cellsDir);
  const cellFiles = [];
  for (let index = 0; index < frameIds.length; index += 1) {
    const frameId = frameIds[index];
    const source = normalizationFacts.frames.get(frameId).absolute;
    const cell = path.join(cellsDir, `${String(index).padStart(3, '0')}.png`);
    const trim = atlasFacts.trim;
    toolOutput(
      magickPath,
      [
        source,
        '-crop',
        `${trim.width}x${trim.height}+${trim.x}+${trim.y}`,
        '+repage',
        `PNG32:${cell}`,
      ],
      `ImageMagick crop for "${frameId}"`,
    );
    const size = imageSize(cell, `derived cell "${frameId}"`);
    assert(
      size.width === trim.width && size.height === trim.height,
      `derived cell "${frameId}" changed shared trim geometry`,
    );
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
    'ImageMagick matrix pack',
  );
  const pngDimensions = imageSize(atlasPng, 'derived PNG atlas');
  assert(
    pngDimensions.width === matrix.width && pngDimensions.height === matrix.height,
    'derived PNG atlas dimensions do not match its matrix',
  );
  const webp = path.join(staged, outputName);
  toolOutput(
    cwebpPath,
    [...encoderArguments, atlasPng, '-o', webp],
    'cwebp encoding',
  );
  const webpBytes = readBoundedFile(webp, MAX_ARTIFACT_BYTES, 'derived motion.webp');
  const webpDimensions = webpSize(webpBytes, 'derived motion.webp');
  assert(
    webpDimensions.width === matrix.width && webpDimensions.height === matrix.height,
    'derived WebP intrinsic dimensions do not match the descriptor matrix',
  );
  fs.rmSync(cellsDir, { recursive: true });
  fs.unlinkSync(atlasPng);
  return { webp, webpBytes, webpDimensions };
}

export function loadValidatedGaf2dMotionSource(options, contract) {
  const assetId = options?.assetId;
  assert(ASSET_ID.test(assetId || ''), 'asset ID must be portable lowercase kebab-case');
  assert(options?.gaf2dProject, 'GAF2D project root is required');
  assert(
    Array.isArray(contract?.clipNames) &&
      contract.clipNames.length > 0 &&
      new Set(contract.clipNames).size === contract.clipNames.length,
    'derivative clip contract is invalid',
  );
  for (const clipName of contract.clipNames) {
    assert(GAF_IDENTIFIER.test(clipName), `derivative clip contract for "${clipName}" is invalid`);
  }
  const release = validateRelease(options.gaf2dProject, assetId);
  validateCurrentGaf2dExport(
    release,
    assetId,
    options.gaf2dExecutable ?? process.env.GAF2D ?? 'gaf2d',
  );
  if (release.byPath.has('motion/motion-set-approval-v4.json')) {
    return loadValidatedVisualFidelityV4Source(release, assetId, contract);
  }
  for (const clipName of contract.clipNames) {
    assert(
      Number.isInteger(contract.frameCounts?.[clipName]) &&
        contract.frameCounts[clipName] >= 2 &&
        ['loop', 'progress'].includes(contract.playback?.[clipName]),
      `derivative clip contract for "${clipName}" is invalid`,
    );
  }
  const approvalAuthority = findJsonAuthority(
    release,
    (payload) =>
      isObject(payload?.candidate) &&
      typeof payload.candidate.grammar === 'string' &&
      payload.candidate.grammar.startsWith('gaf2d-motion-set-v'),
    'motion-set approval',
  );
  const normalizationAuthority = findJsonAuthority(
    release,
    (payload) =>
      isObject(payload?.shared_transform) &&
      Array.isArray(payload?.approved_frame_ids) &&
      Array.isArray(payload?.frames),
    'motion normalization manifest',
  );
  const atlasAuthority = findJsonAuthority(
    release,
    (payload) =>
      isObject(payload?.atlas) &&
      isObject(payload?.pages) &&
      isObject(payload?.frames) &&
      typeof payload?.schema_version === 'number',
    'motion atlas manifest',
  );
  const lineageAuthority = findJsonAuthority(
    release,
    (payload) =>
      payload?.schema_version === 1 &&
      typeof payload?.asset_id === 'string' &&
      Array.isArray(payload?.artifacts),
    'runtime lineage bundle',
  );
  assert(
    lineageAuthority.relative === 'runtime/lineage.json',
    'runtime lineage must use the canonical export path runtime/lineage.json',
  );
  const approvalFacts = validateApproval(
    approvalAuthority.payload,
    assetId,
    contract,
  );
  const normalizationFacts = validateNormalization(
    normalizationAuthority,
    approvalFacts,
    release,
  );
  const atlasFacts = validateAtlas(
    atlasAuthority,
    approvalFacts,
    normalizationFacts,
    release,
  );
  const lineageFacts = validateRuntimeLineage(
    lineageAuthority,
    approvalAuthority,
    approvalFacts,
    normalizationAuthority,
    normalizationFacts,
    atlasAuthority,
    atlasFacts,
    release,
  );
  if (contract.requireRig) {
    assert(
      SHA256.test(lineageFacts.rigApprovalSha256 || ''),
      'Hero derivative requires current identity, motion, and rig approval lineage',
    );
  }
  return {
    release,
    approvalAuthority,
    approvalFacts,
    normalizationAuthority,
    normalizationFacts,
    atlasAuthority,
    atlasFacts,
    lineageAuthority,
    lineageFacts,
  };
}

export function buildGaf2dMotion(options) {
  const assetId = options?.assetId;
  assert(ASSET_ID.test(assetId || ''), 'asset ID must be portable lowercase kebab-case');
  assert(options?.gaf2dProject, 'GAF2D project root is required');
  assert(options?.packFile, 'trusted APN pack manifest is required');
  assert(options?.outputDir, 'output directory is required');
  const outputDir = path.resolve(options.outputDir);
  assert(
    path.basename(outputDir) === assetId,
    `output directory must end with the exact asset ID "${assetId}"`,
  );
  const roleFacts = trustedPackRole(options.packFile, assetId);
  const source = loadValidatedGaf2dMotionSource(
    options,
    roleFacts.role === 'boss'
      ? BOSS_CREATURE_CONTRACT
      : COMMON_CREATURE_CONTRACT,
  );
  if (source.mode === 'visual-fidelity-v4-copy') {
    const parent = path.dirname(outputDir);
    fs.mkdirSync(parent, { recursive: true });
    const parentStats = fs.lstatSync(parent);
    assert(
      parentStats.isDirectory() && !parentStats.isSymbolicLink(),
      'output parent must be a real directory',
    );
    const staged = fs.mkdtempSync(path.join(parent, `.${assetId}.motion.`));
    let published = false;
    try {
      const projectedSource = loadValidatedVisualFidelityProjection(
        source,
        roleFacts.role,
      );
      const projected = buildApprovedVisualFidelityMotionSet(
        projectedSource,
        staged,
      );
      const publish = atomicPublishDirectory(staged, outputDir);
      published = true;
      return {
        assetId,
        packId: roleFacts.packId,
        role: roleFacts.role,
        mode: 'visual-fidelity-v4-copy',
        outputDir,
        files: projected.files,
        atlas: null,
        source: {
          exportManifestSha256: source.release.manifestSha256,
          motionSetApprovalSha256: source.approvalAuthority.record.sha256,
          derivativeSetSha256: source.setFacts.authority.record.sha256,
          visualFidelityLineageSha256:
            source.visualFidelityLineage.authority.record.sha256,
          runtimeLineageSha256: source.genericLineage.authority.record.sha256,
          setSha256: projected.setSha256,
        },
        warnings: publish.cleanupWarning ? [publish.cleanupWarning] : [],
      };
    } finally {
      if (!published && fs.existsSync(staged)) {
        fs.rmSync(staged, { recursive: true });
      }
    }
  }
  const {
    release,
    approvalAuthority,
    approvalFacts,
    normalizationFacts,
    atlasFacts,
    lineageFacts,
  } = source;
  assert(
    !outputDir.startsWith(`${release.project}${path.sep}`) &&
      outputDir !== release.project,
    'APN output must remain outside the GAF2D project',
  );
  const encoderArguments =
    options.encoderArguments ?? [...CANONICAL_CWEBP_ARGUMENTS];
  const cwebpPath = options.cwebpPath ?? process.env.CWEBP ?? 'cwebp';
  const magickPath = options.magickPath ?? process.env.MAGICK ?? 'magick';
  const toolFacts = validateDerivativeTools(
    cwebpPath,
    magickPath,
    encoderArguments,
  );
  const decodedLimit =
    roleFacts.role === 'boss'
      ? MOTION_BUDGETS.bossDecoded
      : MOTION_BUDGETS.commonDecoded;
  const matrix = chooseDerivativeMatrix(
    approvalFacts.orderedFrameIds.length,
    atlasFacts.trim.width,
    atlasFacts.trim.height,
    decodedLimit,
  );

  const parent = path.dirname(outputDir);
  fs.mkdirSync(parent, { recursive: true });
  const parentStats = fs.lstatSync(parent);
  assert(
    parentStats.isDirectory() && !parentStats.isSymbolicLink(),
    'output parent must be a real directory',
  );
  const staged = fs.mkdtempSync(path.join(parent, `.${assetId}.motion.`));
  let published = false;
  try {
    const image = buildDerivativeAtlas({
      frameIds: approvalFacts.orderedFrameIds,
      normalizationFacts,
      atlasFacts,
      staged,
      matrix,
      magickPath,
      cwebpPath,
      encoderArguments,
    });
    const clips = {};
    let cursor = 0;
    for (const clipName of approvalFacts.candidate.clip_order) {
      const sourceClip = approvalFacts.candidate.clips[clipName];
      clips[clipName] = {
        playback: sourceClip.playback,
        fps: sourceClip.fps,
        frames: sourceClip.frame_ids.map(() => {
          const index = cursor;
          cursor += 1;
          return {
            x: (index % matrix.columns) * atlasFacts.trim.width,
            y: Math.floor(index / matrix.columns) * atlasFacts.trim.height,
            width: atlasFacts.trim.width,
            height: atlasFacts.trim.height,
          };
        }),
      };
    }
    const descriptor = {
      grammar: 'gaf2d-motion-bundle-v1',
      assetId,
      image: 'motion.webp',
      atlas: {
        width: image.webpDimensions.width,
        height: image.webpDimensions.height,
        sha256: sha256Bytes(image.webpBytes),
      },
      frameSize: normalizationFacts.frameSize,
      trim: atlasFacts.trim,
      pivot: { x: 0.5, y: 1 },
      clips,
      lineage: {
        identityApprovalSha256: lineageFacts.identityApprovalSha256,
        motionApprovalSha256: lineageFacts.motionApprovalSha256,
        motionSetCandidateSha256: approvalFacts.candidateSha256,
        motionSetApprovalSha256: approvalAuthority.record.sha256,
        sourceManifestSha256: approvalFacts.candidate.extraction_sha256,
        exportArtifactSha256: release.manifestSha256,
        derivativeToolchainSha256:
          toolFacts.derivativeToolchainSha256,
        ...(lineageFacts.rigApprovalSha256
          ? { rigApprovalSha256: lineageFacts.rigApprovalSha256 }
          : {}),
      },
      encoder: {
        name: 'cwebp',
        version: toolFacts.cwebpVersion,
        arguments: [...encoderArguments],
      },
    };
    const descriptorErrors = validateMotionBundle(descriptor, assetId, {
      role: roleFacts.role === 'boss' ? 'boss' : 'character',
    });
    assert(
      descriptorErrors.length === 0,
      `derived descriptor failed the runtime contract: ${descriptorErrors.join('; ')}`,
    );
    const descriptorPath = path.join(staged, 'motion.json');
    fs.writeFileSync(descriptorPath, canonicalJson(descriptor), {
      encoding: 'utf8',
      flag: 'wx',
    });
    const descriptorBytes = fs.readFileSync(descriptorPath);
    const descriptorText = descriptorBytes.toString('utf8');
    assert(
      !descriptorText.includes(release.project) &&
        !descriptorText.includes(release.releaseDir) &&
        !descriptorText.includes(path.resolve(cwebpPath)) &&
        !descriptorText.includes(path.resolve(magickPath)),
      'derived descriptor leaked a machine-local path',
    );
    const compressedLimit =
      roleFacts.role === 'boss'
        ? MOTION_BUDGETS.bossCompressed
        : MOTION_BUDGETS.commonCompressed;
    assert(
      image.webpBytes.length + descriptorBytes.length <= compressedLimit,
      `derived bundle exceeds the ${compressedLimit}-byte ${roleFacts.role} compressed budget`,
    );
    const stagedFiles = fs.readdirSync(staged).sort();
    assert(
      arraysEqual(stagedFiles, ['motion.json', 'motion.webp']),
      'staged APN bundle must contain exactly motion.json and motion.webp',
    );
    const publish = atomicPublishDirectory(staged, outputDir);
    published = true;
    return {
      assetId,
      packId: roleFacts.packId,
      role: roleFacts.role,
      outputDir,
      files: {
        'motion.json': sha256File(path.join(outputDir, 'motion.json')),
        'motion.webp': sha256File(path.join(outputDir, 'motion.webp')),
      },
      atlas: {
        width: matrix.width,
        height: matrix.height,
        decodedBytes: matrix.decodedBytes,
      },
      source: {
        exportManifestSha256: release.manifestSha256,
        motionSetApprovalSha256: approvalAuthority.record.sha256,
      },
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
    '--asset-id',
    '--pack',
    '--output',
    '--cwebp',
    '--magick',
    '--gaf2d',
  ]);
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      json = true;
      continue;
    }
    assert(allowed.has(token), `unknown argument "${token}"`);
    const value = argv[index + 1];
    assert(value && !value.startsWith('--'), `argument "${token}" requires a value`);
    values[token] = value;
    index += 1;
  }
  for (const required of [
    '--gaf2d-project',
    '--asset-id',
    '--pack',
    '--output',
  ]) {
    assert(values[required], `missing required argument "${required}"`);
  }
  return { values, json };
}

function main() {
  try {
    const { values, json } = parseArguments(process.argv.slice(2));
    const result = buildGaf2dMotion({
      gaf2dProject: values['--gaf2d-project'],
      assetId: values['--asset-id'],
      packFile: values['--pack'],
      outputDir: values['--output'],
      ...(values['--cwebp'] ? { cwebpPath: values['--cwebp'] } : {}),
      ...(values['--magick'] ? { magickPath: values['--magick'] } : {}),
      ...(values['--gaf2d']
        ? { gaf2dExecutable: values['--gaf2d'] }
        : {}),
    });
    if (json) {
      process.stdout.write(`${JSON.stringify({ ok: true, data: result })}\n`);
    } else {
      process.stdout.write(
        `GAF2D MOTION ${result.assetId} ${result.files['motion.webp']}\n`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (process.argv.includes('--json')) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: { message } })}\n`);
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
