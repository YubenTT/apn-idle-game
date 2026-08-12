import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html', 'js/content.js', 'js/comedy.js', 'js/ui.js', 'js/game.js', 'js/hub.js'];
const banned = [
  ['fantasy Mana term', /\bmana\b/i],
  ['currency-named upgrade', /Upgrade Signal/i],
  ['desktop-only Hover verb', /\bhover\b/i],
  ['non-canonical Reputation term', /\bReputation\b/i],
  ['currency presented as upgrade object', /Signal (?:Lv|upgrade)/i],
  ['player debug copy', /Damage \d+[^\n]*Crit \d+[^\n]*Utility \d+/i],
  // PR-2 retires the two-action ship/leave model for the single Go Live checkpoint.
  // Matches player copy ("End Season", "End-Season") but not code identifiers
  // (leaveSeason, END_SEASON_CONTRACT, shippedThisSeason) — those have no space/hyphen split.
  ['retired End-Season action copy', /End[\s-]+Season/i],
  // PR-3 renames the run-power upgrade → Scanner and the prestige action → Go Live.
  // The A1 display/ID split (AUDIT B-3) keeps every lowercase identifier and CSS class:
  // data-panel="ship", ship-row/ship-info, cta-weapon-icon, slot id 'weapon', shipPatches,
  // s.ui.panel === 'ship'. So these bans match ONLY the Title/UPPER display forms a player
  // reads ("Weapon", "WEAPON Lv", "Ship Notes") — never the lowercase code forms.
  ['retired Weapon label', /\bWeapon\b|\bWEAPON\b/],
  ['retired Ship label', /\bShip\b|\bSHIP\b/],
  ['retired Area action', /\bArea\b/i],
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

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
if (
  !index.includes('>not affiliated</small>') ||
  !index.includes('APN is not affiliated with or endorsed by the referenced publisher')
) {
  console.error('FAIL index.html: missing visible non-affiliation notice');
  failures += 1;
}
if (
  !ui.includes("pack?.editorialReference || 'APN Patchline'") ||
  !ui.includes("current?.title || 'APN Patchline'")
) {
  console.error('FAIL js/ui.js: runtime and editorial Pack names are not separated');
  failures += 1;
}

if (failures) process.exit(1);
console.log(`COPY PASS ${files.length} player-facing sources`);
