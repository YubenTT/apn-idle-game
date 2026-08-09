#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  atomicPublishDirectory,
  buildDerivativeAtlas,
  CANONICAL_CWEBP_ARGUMENTS,
  canonicalJson,
  chooseDerivativeMatrix,
  DERIVATIVE_TOOLCHAIN,
  DERIVATIVE_TOOLCHAIN_SHA256,
  loadValidatedGaf2dMotionSource,
  validateDerivativeTools,
} from './build-gaf2d-motion.mjs';
import { MOTION_BUDGETS } from './lib.mjs';
import {
  HERO_V3_CLIP_CONTRACT,
  HERO_V3_CLIPS,
  MAX_HERO_APPROVED_DECODED_BYTES,
  validateApprovedHeroDescriptor as validateSharedApprovedHeroDescriptor,
  validateHeroSet as validateSharedHeroSet,
} from '../../js/hero-v3-contract.js';

export const HERO_ASSET_ID = 'apn-hero';
export const HERO_CLIP_CONTRACT = Object.freeze({
  clipNames: HERO_V3_CLIPS,
  frameCounts: Object.freeze(
    Object.fromEntries(
      HERO_V3_CLIPS.map((name) => [
        name,
        HERO_V3_CLIP_CONTRACT[name].frames,
      ]),
    ),
  ),
  playback: Object.freeze(
    Object.fromEntries(
      HERO_V3_CLIPS.map((name) => [
        name,
        HERO_V3_CLIP_CONTRACT[name].playback,
      ]),
    ),
  ),
  requireRig: true,
});

const SHA256 = /^[a-f0-9]{64}$/;
const HERO_DECODED_CLIP_LIMIT = MAX_HERO_APPROVED_DECODED_BYTES;

function fail(message) {
  throw new Error(`GAF2D Hero build: ${message}`);
}

function requireFact(condition, message) {
  if (!condition) fail(message);
}

function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function arraysEqual(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function approvedLineage(source) {
  const facts = {
    identityApprovalSha256:
      source.lineageFacts.identityApprovalSha256,
    motionApprovalSha256:
      source.lineageFacts.motionApprovalSha256,
    motionSetCandidateSha256:
      source.approvalFacts.candidateSha256,
    motionSetApprovalSha256:
      source.approvalAuthority.record.sha256,
    rigApprovalSha256:
      source.lineageFacts.rigApprovalSha256,
    sourceManifestSha256:
      source.approvalFacts.candidate.extraction_sha256,
    exportArtifactSha256: source.release.manifestSha256,
  };
  requireFact(
    Object.values(facts).every((value) => SHA256.test(value || '')),
    'approved Hero lineage is incomplete',
  );
  return facts;
}

function approvedToolchain(toolFacts, encoderArguments) {
  return {
    grammar: 'apn-gaf2d-hero-toolchain-v1',
    compositor: {
      name: DERIVATIVE_TOOLCHAIN.compositor.name,
      version: DERIVATIVE_TOOLCHAIN.compositor.version,
    },
    encoder: {
      name: 'cwebp',
      version: toolFacts.cwebpVersion,
      arguments: [...encoderArguments],
    },
    operations: [...DERIVATIVE_TOOLCHAIN.operations],
    profileSha256: DERIVATIVE_TOOLCHAIN_SHA256,
  };
}

export function buildGaf2dHero(options) {
  requireFact(options?.gaf2dProject, 'GAF2D project root is required');
  requireFact(options?.outputDir, 'Hero V3 output directory is required');
  const outputDir = path.resolve(options.outputDir);
  requireFact(
    path.basename(outputDir) === 'v3',
    'Hero output directory must end with the exact runtime boundary "v3"',
  );
  const source = loadValidatedGaf2dMotionSource(
    {
      ...options,
      assetId: HERO_ASSET_ID,
    },
    HERO_CLIP_CONTRACT,
  );
  requireFact(
    outputDir !== source.release.project &&
      !outputDir.startsWith(`${source.release.project}${path.sep}`),
    'Hero output must remain outside the GAF2D project',
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
  const lineage = approvedLineage(source);
  const toolchain = approvedToolchain(toolFacts, encoderArguments);
  const parent = path.dirname(outputDir);
  fs.mkdirSync(parent, { recursive: true });
  const parentStats = fs.lstatSync(parent);
  requireFact(
    parentStats.isDirectory() && !parentStats.isSymbolicLink(),
    'Hero output parent must be a real directory',
  );
  const staged = fs.mkdtempSync(path.join(parent, '.v3.hero.'));
  let published = false;
  try {
    const setClips = {};
    const resultFiles = {};
    let webpBytesTotal = 0;
    for (const clipName of HERO_CLIP_CONTRACT.clipNames) {
      const clip = source.approvalFacts.candidate.clips[clipName];
      const matrix = chooseDerivativeMatrix(
        clip.frame_ids.length,
        source.atlasFacts.trim.width,
        source.atlasFacts.trim.height,
        HERO_DECODED_CLIP_LIMIT,
      );
      const image = buildDerivativeAtlas({
        frameIds: clip.frame_ids,
        normalizationFacts: source.normalizationFacts,
        atlasFacts: source.atlasFacts,
        staged,
        matrix,
        magickPath,
        cwebpPath,
        encoderArguments,
        outputName: `${clipName}.webp`,
        workPrefix: clipName,
      });
      const frames = clip.frame_ids.map((_, index) => ({
        x: (index % matrix.columns) * source.atlasFacts.trim.width,
        y:
          Math.floor(index / matrix.columns) *
          source.atlasFacts.trim.height,
        width: source.atlasFacts.trim.width,
        height: source.atlasFacts.trim.height,
      }));
      const descriptor = {
        grammar: 'gaf2d-hero-clip-v1',
        name: clipName,
        playback: clip.playback,
        fps: clip.fps,
        frameSize: { ...source.normalizationFacts.frameSize },
        frames,
        anchor: [0.5, 1],
        trim: { ...source.atlasFacts.trim },
        atlas: {
          width: image.webpDimensions.width,
          height: image.webpDimensions.height,
          bytes: image.webpBytes.length,
          sha256: sha256Bytes(image.webpBytes),
        },
        lineage: { ...lineage },
        encoder: {
          name: 'cwebp',
          version: toolFacts.cwebpVersion,
          arguments: [...encoderArguments],
        },
      };
      const descriptorErrors = validateSharedApprovedHeroDescriptor(
        descriptor,
        clipName,
      );
      requireFact(
        descriptorErrors.length === 0,
        `${clipName} descriptor failed: ${descriptorErrors.join('; ')}`,
      );
      const descriptorPath = path.join(staged, `${clipName}.json`);
      fs.writeFileSync(descriptorPath, canonicalJson(descriptor), {
        encoding: 'utf8',
        flag: 'wx',
      });
      const descriptorText = fs.readFileSync(descriptorPath, 'utf8');
      requireFact(
        !descriptorText.includes(source.release.project) &&
          !descriptorText.includes(source.release.releaseDir),
        `${clipName} descriptor leaked a machine-local GAF2D path`,
      );
      const descriptorSha256 = sha256File(descriptorPath);
      const imageSha256 = sha256File(image.webp);
      setClips[clipName] = {
        descriptor: `${clipName}.json`,
        descriptorSha256,
        image: `${clipName}.webp`,
        imageSha256,
      };
      resultFiles[`${clipName}.json`] = descriptorSha256;
      resultFiles[`${clipName}.webp`] = imageSha256;
      webpBytesTotal += image.webpBytes.length;
    }
    requireFact(
      webpBytesTotal <= MOTION_BUDGETS.heroCompressed,
      `all Hero WebP clips exceed the ${MOTION_BUDGETS.heroCompressed}-byte budget`,
    );
    const set = {
      grammar: 'gaf2d-hero-set-v1',
      status: 'approved',
      clips: setClips,
      lineage,
      toolchain,
    };
    const setErrors = validateSharedHeroSet(set);
    requireFact(
      setErrors.length === 0,
      `Hero set failed: ${setErrors.join('; ')}`,
    );
    for (const clipName of HERO_CLIP_CONTRACT.clipNames) {
      const descriptor = JSON.parse(
        fs.readFileSync(path.join(staged, `${clipName}.json`), 'utf8'),
      );
      const descriptorErrors = validateSharedApprovedHeroDescriptor(
        descriptor,
        clipName,
        set,
      );
      requireFact(
        descriptorErrors.length === 0,
        `${clipName} descriptor/set binding failed: ${descriptorErrors.join('; ')}`,
      );
    }
    const setPath = path.join(staged, 'set.json');
    fs.writeFileSync(setPath, canonicalJson(set), {
      encoding: 'utf8',
      flag: 'wx',
    });
    resultFiles['set.json'] = sha256File(setPath);
    const expectedFiles = [
      ...HERO_CLIP_CONTRACT.clipNames.flatMap((clip) => [
        `${clip}.json`,
        `${clip}.webp`,
      ]),
      'set.json',
    ].sort();
    requireFact(
      arraysEqual(fs.readdirSync(staged).sort(), expectedFiles),
      'staged Hero V3 set must contain exactly set.json and its sixteen clip files',
    );
    const publish = atomicPublishDirectory(staged, outputDir);
    published = true;
    return {
      assetId: HERO_ASSET_ID,
      status: 'approved',
      outputDir,
      files: Object.fromEntries(
        Object.keys(resultFiles)
          .sort()
          .map((name) => [name, sha256File(path.join(outputDir, name))]),
      ),
      webpBytes: webpBytesTotal,
      source: {
        exportManifestSha256: source.release.manifestSha256,
        motionSetApprovalSha256:
          source.approvalAuthority.record.sha256,
        rigApprovalSha256: source.lineageFacts.rigApprovalSha256,
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
    '--output',
    '--gaf2d',
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
    requireFact(value && !value.startsWith('--'), `${token} requires a value`);
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
    const result = buildGaf2dHero({
      gaf2dProject: values['--gaf2d-project'],
      outputDir: values['--output'],
      ...(values['--gaf2d']
        ? { gaf2dExecutable: values['--gaf2d'] }
        : {}),
      ...(values['--cwebp'] ? { cwebpPath: values['--cwebp'] } : {}),
      ...(values['--magick'] ? { magickPath: values['--magick'] } : {}),
    });
    if (json) {
      process.stdout.write(`${JSON.stringify({ ok: true, data: result })}\n`);
    } else {
      process.stdout.write(`GAF2D HERO ${result.files['set.json']}\n`);
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
