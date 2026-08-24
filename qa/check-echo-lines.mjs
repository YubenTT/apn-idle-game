import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GAME_PACKS } from '../js/generated/game-packs.js';
import {
  ECHO_LINES,
  ECHO_LINE_MAX,
  creatureBossFlavor,
  echoLineFor,
  echoLinesFor,
} from '../js/content.js';
import { TITLE_TAGLINES, titleTaglineFor } from '../js/comedy.js';
import { ECHO_TOTAL } from '../js/route.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Echo lines: ${message}`);
  console.log(`OK ${message}`);
};

const policy = JSON.parse(
  fs.readFileSync(path.join(root, 'assets/game-packs/catalog-policy.json'), 'utf8'),
);

// Same normalization the catalog rights gate uses: compare whole tokens so a
// denied mark cannot hide inside punctuation or casing.
const normalize = (value) =>
  String(value)
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const packIds = GAME_PACKS.map((pack) => pack.id);
const keys = Object.keys(ECHO_LINES);
const allLines = keys.flatMap((key) => ECHO_LINES[key]);

assert(Object.isFrozen(ECHO_LINES), 'the Echo line table is immutable');
assert(
  keys.length === packIds.length && packIds.every((id) => keys.includes(id)),
  `every one of the ${packIds.length} active Packs owns Echo lines`,
);
assert(
  keys.every((key) => packIds.includes(key)),
  'no Echo lines are authored for a Pack outside the runtime catalog',
);
assert(
  keys.every((key) => Array.isArray(ECHO_LINES[key]) && ECHO_LINES[key].length === ECHO_TOTAL),
  `each Pack authors exactly ${ECHO_TOTAL} Echo lines (one per Echo wave)`,
);
assert(
  allLines.length === packIds.length * ECHO_TOTAL,
  `the archive holds ${packIds.length * ECHO_TOTAL} discovery lines`,
);
assert(
  new Set(allLines).size === allLines.length,
  'every Echo line is unique across the whole catalog',
);
assert(
  allLines.every((line) => typeof line === 'string' && line.trim().length > 0),
  'no Echo line is empty or non-textual',
);

const overLength = allLines.filter((line) => line.length > ECHO_LINE_MAX);
assert(
  overLength.length === 0,
  `every Echo line fits the ${ECHO_LINE_MAX}-character toast cap (longest ${Math.max(
    ...allLines.map((line) => line.length),
  )})`,
);

const haystack = ` ${allLines.map(normalize).join(' | ')} `;
const deniedHit = [...policy.deniedRuntimeMarks, ...policy.deniedRuntimeTerms].find((term) =>
  haystack.includes(` ${normalize(term)} `),
);
assert(
  !deniedHit,
  `Echo lines carry no denied runtime mark or term (${deniedHit || 'none'})`,
);

// Selection determinism: the discovery beat is a pure (packId, slot) lookup, so
// the sim-exercised Route path never draws from Math.random.
assert(
  packIds.every((id) =>
    Array.from({ length: ECHO_TOTAL }, (_, index) => echoLineFor(id, index)).every(
      (line, index) => line === ECHO_LINES[id][index],
    ),
  ),
  'echoLineFor resolves each Pack slot deterministically',
);
assert(
  !/Math\.random/.test(
    fs.readFileSync(path.join(root, 'js/content.js'), 'utf8').split('export const ECHO_LINES')[1] ||
      '',
  ),
  'the Echo content region consumes no RNG',
);

// Fail-safe: unknown ids, prototype keys, and out-of-range slots never render.
assert(
  echoLinesFor('unknown-pack') === null &&
    echoLinesFor('constructor') === null &&
    echoLinesFor('') === null &&
    echoLinesFor(null) === null &&
    echoLinesFor(42) === null,
  'echoLinesFor returns null for unknown, prototype, and non-string Pack ids',
);
assert(
  echoLineFor('unknown-pack', 0) === null &&
    echoLineFor('valorant', ECHO_TOTAL) === null &&
    echoLineFor('valorant', -1) === null &&
    echoLineFor('valorant', 1.9) === echoLineFor('valorant', 1) &&
    echoLineFor('valorant', Number.NaN) === null,
  'echoLineFor never returns undefined for an out-of-range or unknown slot',
);

// Boss flavor stays identity-neutral and deterministic.
const curatorLine = creatureBossFlavor({ type: 'boss', packId: 'league' }, 9);
assert(
  typeof curatorLine === 'string' && curatorLine.startsWith('The Curator ·'),
  `a legacy creature Gate speaks its own APN bio (${curatorLine})`,
);
assert(
  creatureBossFlavor({ type: 'boss', packId: 'league' }, 9) === curatorLine,
  'creature boss flavor is stable for the same Gate',
);
assert(
  creatureBossFlavor({ type: 'boss', packId: 'valorant' }, 9) === null &&
    creatureBossFlavor({ type: 'lag', packId: 'league', id: 'e1' }, 9) === null &&
    creatureBossFlavor(null, 9) === null,
  'pack-owned casts and non-boss targets keep their own identity',
);
assert(
  !haystack.includes(' curator ') && curatorLine.length <= ECHO_LINE_MAX,
  'the boss bio fits the same readable copy budget',
);

// Title-screen voice: deterministic rotation, no RNG, real copy.
assert(
  TITLE_TAGLINES.length > 0 && TITLE_TAGLINES.every((line) => typeof line === 'string' && line),
  `the title screen has ${TITLE_TAGLINES.length} taglines to rotate`,
);
assert(
  titleTaglineFor(0, 0) === TITLE_TAGLINES[0] &&
    titleTaglineFor(TITLE_TAGLINES.length, 0) === TITLE_TAGLINES[0] &&
    titleTaglineFor(1, 1) === TITLE_TAGLINES[2 % TITLE_TAGLINES.length],
  'the tagline rotation is a pure function of day and Go Live count',
);
assert(
  titleTaglineFor(-3, 0) === TITLE_TAGLINES[(TITLE_TAGLINES.length - 3 + TITLE_TAGLINES.length * 2) % TITLE_TAGLINES.length] &&
    typeof titleTaglineFor(Number.NaN, Number.NaN) === 'string',
  'the tagline rotation is total for negative and malformed inputs',
);

const shell = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(
  /class="title-role">You are the Host\./.test(shell) && shell.includes('id="title-tagline"'),
  'the title screen states the Host fantasy and reserves the tagline slot',
);
const mainSource = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
assert(
  mainSource.includes('titleTaglineFor(') && !/titleTaglineFor\([^)]*Math\.random/.test(mainSource),
  'the title screen fills its tagline through the deterministic helper',
);

const uiSource = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
assert(
  uiSource.includes('route-echo-lines') && uiSource.includes('data-echo-slot'),
  'the Echo Archive renders one addressable slot per Echo',
);
assert(
  uiSource.includes('· undiscovered'),
  'undiscovered Echo slots render an honest locked placeholder',
);
const gameSource = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
assert(
  gameSource.includes('echoLineFor(found.packId, found.slot - 1)'),
  'the discovery beat speaks the authored line on the toast channel',
);

console.log(
  `ECHO LINES PASS ${allLines.length} discovery lines · ${keys.length} Packs · ${TITLE_TAGLINES.length} taglines`,
);
