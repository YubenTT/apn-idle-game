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

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const finite = (value) => Number.isFinite(value);

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
  if (pack?.zones !== 10) errors.push(`${label}: zones must equal 10`);
  if (!Array.isArray(pack?.targets) || pack.targets.length !== 5) errors.push(`${label}: requires five targets`);
  if (!pack?.boss?.frame || !pack?.boss?.breakFrame || !pack?.boss?.pivot) errors.push(`${label}: incomplete boss`);
  for (const target of pack?.targets || []) {
    if (!target.frame || !target.pivot) errors.push(`${label}/${target.id || 'target'}: incomplete target`);
  }
  for (const key of ['background', 'targets', 'targetData', 'props', 'corruptionMask']) {
    if (!pack?.assets?.[key]) errors.push(`${label}: missing asset ${key}`);
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
