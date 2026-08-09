import fs from 'node:fs';
import path from 'node:path';

export function createPortableDerivativeTools(root) {
  const magick = path.join(root, 'portable-magick.mjs');
  fs.writeFileSync(
    magick,
    `#!/usr/bin/env node
import fs from 'node:fs';

const arguments_ = process.argv.slice(2);
if (arguments_[0] === '-version') {
  console.log('Version: ImageMagick 7.1.2-13 Q16-HDRI portable-test');
  process.exit(0);
}
const dimensions = (value) => {
  const match = /^(\\d+)x(\\d+)/.exec(value || '');
  if (!match) throw new Error('portable ImageMagick fixture has no dimensions');
  return { width: Number(match[1]), height: Number(match[2]) };
};
let size;
if (arguments_[0] === 'montage') {
  const tile = dimensions(arguments_[arguments_.indexOf('-tile') + 1]);
  const cell = dimensions(arguments_[arguments_.indexOf('-geometry') + 1]);
  size = { width: tile.width * cell.width, height: tile.height * cell.height };
} else if (arguments_.includes('-crop')) {
  size = dimensions(arguments_[arguments_.indexOf('-crop') + 1]);
} else {
  size = dimensions(arguments_[arguments_.indexOf('-size') + 1]);
}
const output = arguments_.at(-1);
if (!output?.startsWith('PNG32:')) throw new Error('portable ImageMagick fixture output is invalid');
const png = Buffer.alloc(24);
Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png, 0);
png.writeUInt32BE(13, 8);
png.write('IHDR', 12, 'ascii');
png.writeUInt32BE(size.width, 16);
png.writeUInt32BE(size.height, 20);
fs.writeFileSync(output.slice('PNG32:'.length), png);
`,
  );
  fs.chmodSync(magick, 0o755);

  const cwebp = path.join(root, 'portable-cwebp.mjs');
  fs.writeFileSync(
    cwebp,
    `#!/usr/bin/env node
import fs from 'node:fs';

const arguments_ = process.argv.slice(2);
if (arguments_[0] === '-version') {
  console.log('1.6.0');
  process.exit(0);
}
const outputIndex = arguments_.indexOf('-o');
if (outputIndex < 1 || outputIndex + 1 >= arguments_.length) {
  throw new Error('portable cwebp fixture operands are invalid');
}
const png = fs.readFileSync(arguments_[outputIndex - 1]);
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
const webp = Buffer.alloc(30);
webp.write('RIFF', 0, 'ascii');
webp.writeUInt32LE(22, 4);
webp.write('WEBP', 8, 'ascii');
webp.write('VP8X', 12, 'ascii');
webp.writeUInt32LE(10, 16);
webp.writeUIntLE(width - 1, 24, 3);
webp.writeUIntLE(height - 1, 27, 3);
fs.writeFileSync(arguments_[outputIndex + 1], webp);
`,
  );
  fs.chmodSync(cwebp, 0o755);
  return { magick, cwebp };
}
