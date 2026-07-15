import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256, stableJson, walkFiles } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const assetsRoot = path.join(root, 'assets');
const output = path.join(assetsRoot, 'manifest.json');

export function generateManifest() {
  const catalogFile = path.join(assetsRoot, 'game-packs/catalog.json');
  const catalog = fs.existsSync(catalogFile) ? JSON.parse(fs.readFileSync(catalogFile, 'utf8')) : [];
  const hotIds = new Set(catalog.slice(0, 2).map((pack) => pack.id));
  const runtimeFiles = walkFiles(assetsRoot)
    .filter((file) => !file.includes(`${path.sep}master${path.sep}`))
    .filter((file) => file !== output)
    .filter((file) => /\.(webp|png|jpg|svg|glb|json)$/.test(file));
  const assets = runtimeFiles.map((file) => {
    const relative = path.relative(assetsRoot, file).replaceAll(path.sep, '/');
    const packMatch = relative.match(/^game-packs\/([^/]+)\/(background|targets|props|corruption-mask)\.webp$/);
    let kind = null;
    if (/^mascot\/apn-mascot-(?:base|idle)\.webp$/.test(relative) || relative === 'mascot-host.webp') kind = 'host';
    if (packMatch?.[2] === 'background') kind = 'background';
    if (packMatch?.[2] === 'targets') kind = 'targets';
    if (packMatch && ['props', 'corruption-mask'].includes(packMatch[2])) kind = 'propsAndMasks';
    return {
      id: relative,
      path: `assets/${relative}`,
      bytes: fs.statSync(file).size,
      sha256: sha256(file),
      ...(kind ? { kind } : {}),
      firstPlayable: !relative.startsWith('game-packs/') || (packMatch && hotIds.has(packMatch[1])),
    };
  });
  const manifest = {
    version: 1,
    generatedBy: 'scripts/assets/generate-manifest.mjs',
    assets,
    packs: catalog.map((pack, index) => ({ id: pack.id, hot: index < 2 })),
  };
  fs.writeFileSync(output, stableJson(manifest));
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = generateManifest();
  console.log(`ASSET MANIFEST ${manifest.assets.length}`);
}
