import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html', 'js/content.js', 'js/comedy.js', 'js/ui.js', 'js/game.js'];
const banned = [
  ['fantasy Mana term', /\bmana\b/i],
  ['currency-named upgrade', /Upgrade Signal/i],
  ['desktop-only Hover verb', /\bhover\b/i],
  ['non-canonical Reputation term', /\bReputation\b/i],
  ['currency presented as upgrade object', /Signal (?:Lv|upgrade)/i],
  ['player debug copy', /Damage \d+[^\n]*Crit \d+[^\n]*Utility \d+/i],
];

let failures = 0;
for (const relative of files) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  for (const [label, pattern] of banned) {
    if (pattern.test(source)) {
      console.error(`FAIL ${relative}: ${label}`);
      failures += 1;
    }
  }
}

if (failures) process.exit(1);
console.log(`COPY PASS ${files.length} player-facing sources`);
