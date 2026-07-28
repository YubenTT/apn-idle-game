import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const width = 128;
const height = 80;
const cell = 16;
const assetIds = ['entry-runner', 'veil-operator'];
const pixels = Buffer.alloc(width * height * 3);

const sha256 = (file) =>
  createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function paintRect(x0, y0, x1, y1, [red, green, blue]) {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const offset = (y * width + x) * 3;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
    }
  }
}

function paintRow(row, colors) {
  colors.forEach((color, index) => {
    const x = index * cell;
    const y = row * cell;
    paintRect(x, y, x + cell - 1, y + cell - 1, color);
  });
}

paintRow(0, [
  [215, 25, 74],
  [44, 123, 182],
  [26, 150, 65],
  [253, 174, 97],
  [118, 42, 131],
  [0, 166, 166],
  [255, 217, 47],
  [230, 97, 1],
]);

const limbPositions = [
  [1, 9],
  [11, 3],
  [1, 3],
  [11, 9],
  [1, 3],
  [11, 9],
  [1, 9],
  [11, 3],
];
for (let index = 0; index < 8; index += 1) {
  const x = index * cell;
  const y = cell;
  paintRect(x, y, x + 15, y + 15, [16, 24, 40]);
  paintRect(x + 5, y + 2, x + 10, y + 14, [239, 35, 60]);
  const [limbX, limbY] = limbPositions[index];
  paintRect(x + limbX, y + limbY, x + limbX + 3, y + limbY + 4, [0, 255, 255]);
}

paintRow(2, [
  [38, 70, 83],
  [42, 157, 143],
  [233, 196, 106],
  [244, 162, 97],
  [231, 111, 81],
  [131, 56, 236],
]);
paintRow(3, [
  [255, 255, 255],
  [255, 190, 11],
  [251, 86, 7],
  [255, 0, 110],
]);
paintRow(4, [
  [3, 4, 94],
  [2, 62, 138],
  [0, 119, 182],
  [0, 150, 199],
  [0, 180, 216],
  [72, 202, 228],
  [144, 224, 239],
  [202, 240, 248],
]);

const version = execFileSync('cwebp', ['-version'], { encoding: 'utf8' }).trim();
if (!version.startsWith('1.6.0')) {
  throw new Error(`browser-motion fixture requires cwebp 1.6.0, got ${version}`);
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-browser-motion-'));
try {
  const ppm = path.join(temporary, 'motion.ppm');
  fs.writeFileSync(
    ppm,
    Buffer.concat([
      Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii'),
      pixels,
    ]),
  );
  const firstAtlas = path.join(root, assetIds[0], 'motion.webp');
  execFileSync(
    'cwebp',
    ['-exact', '-q', '90', ppm, '-o', firstAtlas],
    { stdio: 'ignore' },
  );
  fs.copyFileSync(firstAtlas, path.join(root, assetIds[1], 'motion.webp'));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

const atlasSha256 = sha256(path.join(root, assetIds[0], 'motion.webp'));
const assets = {};
for (const assetId of assetIds) {
  const assetRoot = path.join(root, assetId);
  const atlas = path.join(assetRoot, 'motion.webp');
  const descriptor = path.join(assetRoot, 'motion.json');
  if (sha256(atlas) !== atlasSha256) {
    throw new Error(`${assetId}: generated atlas bytes diverged`);
  }
  const source = fs.readFileSync(descriptor, 'utf8');
  const updated = source.replace(
    /"sha256": "[0-9a-f]{64}"/,
    `"sha256": "${atlasSha256}"`,
  );
  if (updated === source && !source.includes(`"sha256": "${atlasSha256}"`)) {
    throw new Error(`${assetId}: descriptor atlas hash field is missing`);
  }
  fs.writeFileSync(descriptor, updated);
  assets[assetId] = {
    descriptorSha256: sha256(descriptor),
    atlasSha256,
  };
}

fs.writeFileSync(
  path.join(root, 'integrity.json'),
  `${JSON.stringify({
    grammar: 'apn-browser-motion-fixture-v1',
    generator: 'generate.mjs',
    encoder: {
      name: 'cwebp',
      version: '1.6.0',
      arguments: ['-exact', '-q', '90'],
    },
    assets,
  }, null, 2)}\n`,
);

console.log(JSON.stringify({ status: 'ok', atlasSha256, assets }, null, 2));
