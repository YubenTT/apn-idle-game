import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_BUILD_ID = 'gaf2d-motion-v1';
const assert = (condition, message) => {
  if (!condition) throw new Error(`Runtime cache: ${message}`);
  console.log(`OK ${message}`);
};

const cacheModule = path.join(root, 'js/cache.js');
assert(fs.existsSync(cacheModule), 'one runtime cache authority module exists');
const cacheRuntime = await import(cacheModule);
assert(
  cacheRuntime.RUNTIME_BUILD_ID === EXPECTED_BUILD_ID,
  `runtime build ID is exactly ${EXPECTED_BUILD_ID}`,
);

const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const indexFirstParty = [
  ...indexSource.matchAll(
    /<(?:link|img|script)\b[^>]*\b(?:href|src)="(\.\/[^"#]+(?:\?[^"#]+)?)"/g,
  ),
].map((match) => match[1]);
assert(indexFirstParty.length > 0, 'index exposes first-party cacheable entry points');
for (const reference of indexFirstParty) {
  assert(
    reference.endsWith(`?v=${EXPECTED_BUILD_ID}`),
    `index cache token is current: ${reference}`,
  );
}

const runtimeFiles = fs
  .readdirSync(path.join(root, 'js'), { recursive: true })
  .filter((name) => name.endsWith('.js'))
  .map((name) => path.join(root, 'js', name));
let importCount = 0;
for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const imports = [
    ...source.matchAll(
      /\b(?:from\s+|import\s*)['"](\.[^'"]+\.js(?:\?[^'"]+)?)['"]/g,
    ),
  ].map((match) => match[1]);
  for (const reference of imports) {
    importCount += 1;
    assert(
      reference.endsWith(`?v=${EXPECTED_BUILD_ID}`),
      `${path.relative(root, file)} import cache token is current: ${reference}`,
    );
  }
  for (const match of source.matchAll(/\?v=([A-Za-z0-9._-]+)/g)) {
    assert(
      match[1] === EXPECTED_BUILD_ID,
      `${path.relative(root, file)} contains no stale build ID`,
    );
  }
}
assert(importCount > 0, 'runtime module graph contains versioned imports');

for (const relative of ['js/assets.js', 'js/hero-v3.js', 'js/creatures.js']) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  assert(
    source.includes('withRuntimeVersion('),
    `${relative} versions every non-hash runtime asset request`,
  );
}

console.log('RUNTIME CACHE PASS');
