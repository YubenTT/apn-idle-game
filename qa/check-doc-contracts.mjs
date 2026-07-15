import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const route = read('docs/GAME-PACK-ROUTE.md');
const vision = read('docs/VISION.md');
const art = read('brand/ART-DIRECTION.md');
const adr = read('docs/decisions/ADR-0004-game-pack-route.md');
const backlog = read('docs/REDESIGN-PLAN.md');
const failures = [];

if (!route.includes('20 distinct clean Game Packs')) {
  failures.push('route milestone');
}
if (!adr.includes('- Status: Accepted')) {
  failures.push('ADR-0004 status');
}
if (vision.includes('Copying third-party game characters as enemies')) {
  failures.push('VISION contradiction');
}
if (art.includes('We do **not** copy third-party game characters')) {
  failures.push('art contradiction');
}
if (!backlog.includes('I-003') || !backlog.includes('I-007')) {
  failures.push('foundation backlog');
}
if (!backlog.includes('The 32 focused issues') || !backlog.includes('22 Must + 10 Fix')) {
  failures.push('backlog counts');
}
if (!backlog.includes('only remaining user gate is Session 6')) {
  failures.push('user gate');
}

if (failures.length) {
  throw new Error(`Doc contract: ${failures.join(', ')}`);
}

console.log('OK route and art docs agree');
