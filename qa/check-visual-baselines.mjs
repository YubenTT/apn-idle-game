import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'qa/screenshots/redesign-v1');
const screens = ['run', 'build', 'ship', 'hub', 'boosts', 'menu', 'gear'];
const viewports = {
  'ios-428x926': [428, 926],
  'android-412x915': [412, 915],
  'small-375x812': [375, 812],
  'embed-480x900': [480, 900],
  'landscape-844x390': [844, 390],
};

const expected = [];
for (const [viewport, [width, height]] of Object.entries(viewports)) {
  for (const screen of screens) expected.push({ file: `${viewport}-${screen}.jpg`, width, height });
}

const actual = fs.readdirSync(directory).filter((file) => file.endsWith('.jpg')).sort();
if (actual.length !== expected.length) throw new Error(`Visual baselines: expected ${expected.length}, found ${actual.length}`);

function jpegSize(bytes, label) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`Visual baselines: invalid JPEG ${label}`);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) break;
    offset += 2 + length;
  }
  throw new Error(`Visual baselines: missing JPEG size ${label}`);
}

for (const entry of expected) {
  const file = path.join(directory, entry.file);
  if (!fs.existsSync(file)) throw new Error(`Visual baselines: missing ${entry.file}`);
  const bytes = fs.readFileSync(file);
  const { width, height } = jpegSize(bytes, entry.file);
  if (width !== entry.width || height !== entry.height) {
    throw new Error(`Visual baselines: ${entry.file} is ${width}x${height}, expected ${entry.width}x${entry.height}`);
  }
}

console.log(`VISUAL BASELINES PASS ${expected.length} captures · ${screens.length} screens · ${Object.keys(viewports).length} viewports`);
