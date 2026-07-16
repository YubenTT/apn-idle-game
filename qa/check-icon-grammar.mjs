import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const inline = fs.readFileSync(path.join(root, 'js/icons.js'), 'utf8');
if (!inline.includes('stroke="currentColor"') || !inline.includes('stroke-width="2"')) fail.push('inline icons lack 2px currentColor stroke');
if (!inline.includes('stroke-linecap="round"') || !inline.includes('stroke-linejoin="round"')) fail.push('inline icons lack rounded terminals');
const files = fs.readdirSync(path.join(root, 'assets/icons')).filter((file) => file.endsWith('.svg')).sort();
for (const file of files) {
  const source = fs.readFileSync(path.join(root, 'assets/icons', file), 'utf8');
  if (/gradient|#[0-9a-f]{3,8}|rgba?\(|hsla?\(/i.test(source)) fail.push(`${file}: raw color or gradient`);
  if (source.includes('//>')) fail.push(`${file}: malformed self-closing element`);
  if (!source.includes('stroke="currentColor"') || !source.includes('stroke-width="2"')) fail.push(`${file}: wrong stroke`);
  if (!source.includes('stroke-linecap="round"') || !source.includes('stroke-linejoin="round"')) fail.push(`${file}: wrong terminals`);
  if ((source.match(/<(?:path|circle|line|polyline|polygon|rect)\b/g) || []).length > 4) fail.push(`${file}: too much interior detail`);
}
if (fail.length) throw new Error(`Icon grammar:\n${fail.join('\n')}`);
console.log(`ICONS PASS ${files.length} feed marks + inline set`);
