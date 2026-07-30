import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const read = (relativePath) =>
  fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const readIfPresent = (filePath) =>
  fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

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
const stageDoctrine = [
  read('brand/ART-DIRECTION.md'),
  read('brand/MASCOT-CANON.md'),
  read('docs/ASSET-ENGINE.md'),
  read('docs/ART-PIPELINE.md'),
  read('docs/ARCHITECTURE.md'),
  read('docs/decisions/README.md'),
  readIfPresent(
    new URL(
      '../docs/decisions/ADR-0017-visible-body-stage-presentation.md',
      import.meta.url,
    ),
  ),
  read('docs/SCREEN-SPECS.md'),
  read('docs/QA-CHECKLIST.md'),
  read('docs/DEFINITION-OF-DONE.md'),
].join('\n');
const gaf2dRoot =
  process.env.GAF2D_ROOT ?? path.join(os.homedir(), 'Documents', 'gaf2d');
const checkGaf2dGuidance =
  process.env.GAF2D_ROOT !== undefined || fs.existsSync(gaf2dRoot);
const gaf2dGuidance = checkGaf2dGuidance
  ? [
      [
        'runtime integration',
        readIfPresent(path.join(gaf2dRoot, 'docs', 'runtime-integration.md')),
      ],
      [
        'repository skill',
        readIfPresent(path.join(gaf2dRoot, 'skills', 'gaf2d', 'SKILL.md')),
      ],
      [
        'installed skill',
        readIfPresent(
          path.join(os.homedir(), '.codex', 'skills', 'gaf2d', 'SKILL.md'),
        ),
      ],
    ]
  : [];
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
for (const phrase of [
  'visible-body height',
  'motion envelope',
  'one shared transform',
  'Hero 96',
  'standard 72',
  'boss 112',
  'frame-by-frame grounding is forbidden',
]) {
  if (!stageDoctrine.includes(phrase)) {
    failures.push(`stage presentation doctrine: ${phrase}`);
  }
}
for (const [label, guidance] of gaf2dGuidance) {
  for (const phrase of [
    'GAF2D owns intrinsic geometry',
    'the game owns role scale',
    'declare one neutral reference frame',
    'hash-bind visible and union motion bounds',
    'never ground each frame independently',
    'mechanical geometry does not approve motion',
  ]) {
    if (!guidance.includes(phrase)) {
      failures.push(`GAF2D ${label}: ${phrase}`);
    }
  }
}

if (failures.length) {
  throw new Error(`Doc contract: ${failures.join(', ')}`);
}

console.log('OK route and art docs agree');
