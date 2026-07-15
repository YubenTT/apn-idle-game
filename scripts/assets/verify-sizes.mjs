import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_BUDGETS, checkFileBudget, readJson } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function verifySizes(manifestFile = path.join(root, 'assets/manifest.json')) {
  const manifest = readJson(manifestFile);
  const errors = [];
  let firstPlayable = 0;
  const grouped = new Map();
  for (const asset of manifest.assets || []) {
    const file = path.join(root, asset.path);
    if (!fs.existsSync(file)) {
      errors.push(`${asset.id}: missing ${asset.path}`);
      continue;
    }
    const packGroup = asset.kind === 'propsAndMasks' && asset.path.match(/assets\/game-packs\/([^/]+)\//)?.[1];
    if (packGroup) grouped.set(packGroup, (grouped.get(packGroup) || 0) + fs.statSync(file).size);
    const budget = asset.budgetBytes ?? (packGroup ? null : ASSET_BUDGETS[asset.kind]);
    if (budget) {
      const error = checkFileBudget(file, budget, asset.id);
      if (error) errors.push(error);
    }
    if (asset.firstPlayable) firstPlayable += fs.statSync(file).size;
  }
  for (const [packId, bytes] of grouped) {
    if (bytes > ASSET_BUDGETS.propsAndMasks) errors.push(`${packId} props+masks: ${bytes} bytes exceeds ${ASSET_BUDGETS.propsAndMasks}`);
  }
  if (firstPlayable > ASSET_BUDGETS.firstPlayable) errors.push(`first-playable: ${firstPlayable} bytes exceeds ${ASSET_BUDGETS.firstPlayable}`);
  const hot = (manifest.packs || []).filter((pack) => pack.hot === true);
  if (hot.length > 2) errors.push(`hot packs: ${hot.length} exceeds 2`);
  return { errors, firstPlayable, hot: hot.map((pack) => pack.id) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = verifySizes(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  console.log(`SIZES PASS first-playable=${result.firstPlayable} hot=${result.hot.length}`);
}
