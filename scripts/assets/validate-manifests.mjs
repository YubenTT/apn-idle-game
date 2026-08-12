import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from './generate-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packsRoot = path.join(root, 'assets/game-packs');

export function validateAllManifests(directory = packsRoot) {
  const files = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name, 'pack.json'))
    .filter((file) => fs.existsSync(file))
    .sort();
  const errors = [];
  let catalog = null;
  try {
    catalog = buildCatalog({
      rootDir: path.resolve(directory, '../..'),
      write: false,
      warn: () => {},
    });
  } catch (error) {
    errors.push(String(error?.message || error));
  }
  return {
    files,
    errors,
    packs: catalog?.packs || [],
    warnings: catalog?.warnings || [],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateAllManifests(process.argv[2] ? path.resolve(process.argv[2]) : packsRoot);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  console.log(`MANIFESTS PASS ${result.files.length}`);
}
