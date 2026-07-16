import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const iconsRoot = path.join(root, 'assets/icons');

export function normalizeIcon(source) {
  const viewBox = source.match(/viewBox="([^"]+)"/)?.[1] || '0 0 32 32';
  const shapes = [...source.matchAll(/<(path|circle|line|polyline|polygon|rect)\b([^>]*)\/?\s*>/g)]
    .filter((match) => !(match[1] === 'rect' && /width="32"/.test(match[2]) && /height="32"/.test(match[2])))
    .map((match) => {
      const attrs = match[2]
        .replace(/\s(?:fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"/g, '')
        .trim()
        .replace(/\/+$/, '')
        .trim();
      return `<${match[1]} ${attrs}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = fs.readdirSync(iconsRoot).filter((file) => file.endsWith('.svg')).sort();
  for (const file of files) {
    const full = path.join(iconsRoot, file);
    fs.writeFileSync(full, normalizeIcon(fs.readFileSync(full, 'utf8')));
  }
  console.log(`ICONS ${files.length}`);
}
