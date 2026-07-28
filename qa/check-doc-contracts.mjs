import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const route = read('docs/GAME-PACK-ROUTE.md');
const vision = read('docs/VISION.md');
const art = read('brand/ART-DIRECTION.md');
const adr = read('docs/decisions/ADR-0004-game-pack-route.md');
const backlog = read('docs/REDESIGN-PLAN.md');
const executionPlan = read('docs/superpowers/plans/2026-07-15-apn-idle-complete-redesign.md');
const mascotCanon = read('brand/MASCOT-CANON.md');
const assetBible = read('docs/GAME-PACK-ASSET-BIBLE.md');
const components = read('brand/COMPONENTS.md');
const progress = read('progress.md');
const roadmap = read('docs/ROADMAP.md');
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
if (!backlog.includes('original 33 focused issues') || !backlog.includes('25 Must + 10 Fix')) {
  failures.push('backlog counts');
}
if (!backlog.includes('R-006 owns the approved') || !backlog.includes('without additional visual-owner gates')) {
  failures.push('user gate');
}
if (executionPlan.includes('Separate Accessibility, Audio, Account, Purchases, Reset') || executionPlan.includes('demo purchase surface')) {
  failures.push('R-005 execution-plan supersession');
}
if (
  !mascotCanon.includes('owner-approved GAF2D `apn-hero` identity record') ||
  !mascotCanon.includes('No legs, feet, boots, or platform')
) {
  failures.push('current Hero authority');
}
if (
  assetBible.includes('canonical V3 GLB-derived clip atlases') ||
  assetBible.includes('one canonical Host pose/role sheet') ||
  !assetBible.includes('owner-approved GAF2D Hero clip set') ||
  !assetBible.includes('does not replace the exact per-character')
) {
  failures.push('asset-bible Hero authority');
}
if (
  components.includes('live procedural Host') ||
  !components.includes('approved Hero clip')
) {
  failures.push('component Hero authority');
}
if (progress.includes('Next user gate: approve the Host V2 motion proof')) {
  failures.push('stale Host V2 next gate');
}
if (roadmap.includes('Production asset pipeline, canonical Host atlas')) {
  failures.push('roadmap historical Hero authority');
}

if (failures.length) {
  throw new Error(`Doc contract: ${failures.join(', ')}`);
}

console.log('OK route and art docs agree');
