import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ASSET_BUDGETS = Object.freeze({
  firstPlayable: 5 * 1024 * 1024 - 1,
  host: 650 * 1024,
  background: 150 * 1024,
  targets: 140 * 1024,
  propsAndMasks: 50 * 1024,
});

export const MOTION_GRAMMAR = 'gaf2d-motion-bundle-v1';
export const MOTION_BUDGETS = Object.freeze({
  commonCompressed: 160 * 1024,
  bossCompressed: 240 * 1024,
  heroCompressed: 640 * 1024,
  newMotionCompressed: 3.5 * 1024 * 1024,
  commonDecoded: 6 * 1024 * 1024,
  bossDecoded: 8 * 1024 * 1024,
  waveDecoded: 32 * 1024 * 1024,
  hotTextures: 64 * 1024 * 1024,
});
const TARGET_ROLES = Object.freeze([
  'common-a',
  'common-b',
  'common-c',
  'elite',
  'event',
]);

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const finite = (value) => Number.isFinite(value);
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function rejectUnknownProperties(value, allowed, label, errors) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label}: unexpected property "${key}"`);
  }
}

export function validateAtlasData(data, label = 'atlas') {
  const errors = [];
  const width = data?.meta?.size?.w;
  const height = data?.meta?.size?.h;
  if (!finite(width) || width <= 0 || !finite(height) || height <= 0) {
    errors.push(`${label}: invalid atlas size`);
    return errors;
  }
  const frames = data?.frames;
  if (!frames || typeof frames !== 'object' || Array.isArray(frames)) {
    errors.push(`${label}: missing frames`);
    return errors;
  }
  for (const [name, frame] of Object.entries(frames)) {
    const rect = frame?.rect;
    if (!rect || ![rect.x, rect.y, rect.w, rect.h].every(finite)) {
      errors.push(`${label}/${name}: invalid rect`);
      continue;
    }
    if (rect.x < 0 || rect.y < 0 || rect.w <= 0 || rect.h <= 0 || rect.x + rect.w > width || rect.y + rect.h > height) {
      errors.push(`${label}/${name}: rect out of bounds`);
    }
    const pivot = frame?.pivot;
    if (!pivot || !finite(pivot.x) || !finite(pivot.y)) {
      errors.push(`${label}/${name}: missing pivot`);
    } else if (pivot.x < 0 || pivot.x > 1 || pivot.y < 0 || pivot.y > 1) {
      errors.push(`${label}/${name}: pivot must be normalized`);
    }
    const source = frame?.sourceSize;
    if (!source || !finite(source.w) || !finite(source.h) || source.w < rect.w || source.h < rect.h) {
      errors.push(`${label}/${name}: invalid source size`);
    }
  }
  return errors;
}

export function validatePackManifest(pack, label = pack?.id || 'pack') {
  const errors = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pack?.id || '')) errors.push(`${label}: invalid id`);
  if (!Number.isInteger(pack?.order) || pack.order < 1) errors.push(`${label}: invalid order`);
  if (pack?.zones !== 10) errors.push(`${label}: zones must equal 10`);
  if (!pack?.genre || !pack?.title) errors.push(`${label}: missing title or genre`);
  if (!Array.isArray(pack?.targets) || pack.targets.length !== 5) errors.push(`${label}: requires five targets`);
  if (
    Array.isArray(pack?.targets) &&
    new Set(pack.targets.map((target) => target?.id)).size !== pack.targets.length
  ) {
    errors.push(`${label}: duplicate target id`);
  }
  if (Array.isArray(pack?.targets)) {
    const roles = pack.targets.map((target) => target?.role);
    if (new Set(roles).size !== TARGET_ROLES.length || TARGET_ROLES.some((role) => !roles.includes(role))) {
      errors.push(`${label}: target roles must be exactly ${TARGET_ROLES.join(', ')}`);
    }
  }
  if (!pack?.boss?.id || !pack?.boss?.frame || !pack?.boss?.breakFrame || !pack?.boss?.pivot) {
    errors.push(`${label}: incomplete boss`);
  } else {
    if (pack.boss.frame !== 'boss') errors.push(`${label}: boss frame must equal "boss"`);
    if (pack.boss.breakFrame !== 'boss-break') {
      errors.push(`${label}: boss breakFrame must equal "boss-break"`);
    }
  }
  for (const target of pack?.targets || []) {
    if (!target?.id || !target.role || !target.frame || !target.pivot) {
      errors.push(`${label}/${target?.id || 'target'}: incomplete target`);
      continue;
    }
    if (target.frame !== target.role) {
      errors.push(`${label}/${target.id}: frame must equal role`);
    }
  }
  for (const key of ['background', 'targets', 'targetData', 'props', 'corruptionMask']) {
    if (!pack?.assets?.[key]) errors.push(`${label}: missing asset ${key}`);
  }
  if (!pack?.sourceBoard) errors.push(`${label}: missing source board`);

  if (pack?.motion !== undefined) {
    if (
      !pack.motion ||
      typeof pack.motion !== 'object' ||
      Array.isArray(pack.motion)
    ) {
      errors.push(`${label}: motion must be an object`);
    } else {
      rejectUnknownProperties(
        pack.motion,
        new Set(['grammar', 'characters']),
        `${label}/motion`,
        errors,
      );
      if (pack.motion.grammar !== MOTION_GRAMMAR) {
        errors.push(
          `${label}: motion grammar must equal "${MOTION_GRAMMAR}"`,
        );
      }
      const characters = pack.motion.characters;
      if (
        !characters ||
        typeof characters !== 'object' ||
        Array.isArray(characters)
      ) {
        errors.push(`${label}: motion characters must be an object`);
      } else {
        const characterIds = new Set([
          ...(pack.targets || []).map((target) => target?.id),
          pack.boss?.id,
        ]);
        const seenPaths = new Set();
        for (const [assetId, record] of Object.entries(characters)) {
          const motionLabel = `${label}/motion/${assetId}`;
          if (!characterIds.has(assetId)) {
            errors.push(`${motionLabel}: unknown character`);
          }
          if (!record || typeof record !== 'object' || Array.isArray(record)) {
            errors.push(`${motionLabel}: motion record must be an object`);
            continue;
          }
          const perClipSource =
            typeof record.set === 'string' &&
            typeof record.setSha256 === 'string' &&
            record.clips &&
            typeof record.clips === 'object' &&
            !Array.isArray(record.clips);
          if (perClipSource) {
            rejectUnknownProperties(
              record,
              new Set([
                'authority',
                'role',
                'basePath',
                'set',
                'setSha256',
                'clips',
                'sourceFamily',
                'consumerScale',
                'selectedProfileSha256',
              ]),
              motionLabel,
              errors,
            );
            if (record.sourceFamily !== 'authored-semantic-v4') {
              errors.push(`${motionLabel}: sourceFamily must equal "authored-semantic-v4"`);
            }
            if (!/^[0-9a-f]{64}$/.test(record.setSha256 || '')) {
              errors.push(`${motionLabel}: setSha256 must be 64 lowercase hex characters`);
            }
            if (!/^[0-9a-f]{64}$/.test(record.selectedProfileSha256 || '')) {
              errors.push(
                `${motionLabel}: selectedProfileSha256 must be 64 lowercase hex characters`,
              );
            }
            const expectedSet =
              `assets/game-packs/${pack.id}/characters/${assetId}/set.json`;
            if (record.set !== expectedSet) {
              errors.push(`${motionLabel}: set must equal ${expectedSet}`);
            }
            if (typeof record.basePath === 'string') {
              const expectedBase =
                `assets/game-packs/${pack.id}/characters/${assetId}/`;
              if (record.basePath !== expectedBase) {
                errors.push(`${motionLabel}: basePath must equal ${expectedBase}`);
              }
            }
            if (typeof record.set === 'string') seenPaths.add(record.set);
            for (const [clipName, clipRecord] of Object.entries(record.clips)) {
              if (!clipRecord || typeof clipRecord !== 'object' || Array.isArray(clipRecord)) {
                errors.push(`${motionLabel}/clips/${clipName}: clip source must be an object`);
                continue;
              }
              rejectUnknownProperties(
                clipRecord,
                new Set(['descriptor', 'descriptorSha256', 'image', 'imageSha256']),
                `${motionLabel}/clips/${clipName}`,
                errors,
              );
              if (!/^[0-9a-f]{64}$/.test(clipRecord.descriptorSha256 || '')) {
                errors.push(
                  `${motionLabel}/clips/${clipName}: descriptorSha256 must be 64 lowercase hex characters`,
                );
              }
              if (!/^[0-9a-f]{64}$/.test(clipRecord.imageSha256 || '')) {
                errors.push(
                  `${motionLabel}/clips/${clipName}: imageSha256 must be 64 lowercase hex characters`,
                );
              }
              for (const [field, extension] of [
                ['descriptor', 'json'],
                ['image', 'webp'],
              ]) {
                const value = clipRecord[field];
                if (typeof value === 'string' && seenPaths.has(value)) {
                  errors.push(`${motionLabel}: duplicate motion path ${value}`);
                }
                if (typeof value === 'string') seenPaths.add(value);
                const expected =
                  `assets/game-packs/${pack.id}/characters/${assetId}/${clipName}.${extension}`;
                if (value !== expected) {
                  errors.push(
                    `${motionLabel}/clips/${clipName}: ${field} must equal ${expected}`,
                  );
                }
              }
            }
            continue;
          }
          rejectUnknownProperties(
            record,
            new Set(['image', 'descriptor', 'descriptorSha256']),
            motionLabel,
            errors,
          );
          if (!/^[0-9a-f]{64}$/.test(record.descriptorSha256 || '')) {
            errors.push(
              `${motionLabel}: descriptorSha256 must be 64 lowercase hex characters`,
            );
          }
          for (const [field, filename] of [
            ['image', 'motion.webp'],
            ['descriptor', 'motion.json'],
          ]) {
            const value = record[field];
            if (typeof value === 'string' && seenPaths.has(value)) {
              errors.push(`${motionLabel}: duplicate motion path ${value}`);
            }
            if (typeof value === 'string') seenPaths.add(value);
            const expected =
              `assets/game-packs/${pack.id}/characters/${assetId}/${filename}`;
            if (value !== expected) {
              errors.push(
                `${motionLabel}: ${field} must equal ${expected}`,
              );
            }
          }
        }
      }
    }
  }
  return errors;
}

export function checkFileBudget(file, budget, label = path.basename(file)) {
  const bytes = fs.statSync(file).size;
  return bytes <= budget ? null : `${label}: ${bytes} bytes exceeds ${budget}`;
}

export function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(root, entry.name);
      return entry.isDirectory() ? walkFiles(full) : [full];
    });
}
