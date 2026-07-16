import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, validatePackManifest } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packsRoot = path.join(root, 'assets/game-packs');

export function validateAllManifests(directory = packsRoot) {
  const files = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name, 'pack.json'))
    .filter((file) => fs.existsSync(file))
    .sort();
  const errors = files.flatMap((file) => validatePackManifest(readJson(file), path.basename(path.dirname(file))));
  const packs = files.map(readJson);
  if (new Set(packs.map((pack) => pack.id)).size !== packs.length) errors.push('catalog: duplicate pack id');
  if (new Set(packs.map((pack) => pack.order)).size !== packs.length) errors.push('catalog: duplicate pack order');
  return { files, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateAllManifests(process.argv[2] ? path.resolve(process.argv[2]) : packsRoot);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  console.log(`MANIFESTS PASS ${result.files.length}`);
}
