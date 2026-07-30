import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { STAGE_ROLE_PRESENTATION } from '../js/stage-presentation.js';

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
const assetEngine = read('docs/ASSET-ENGINE.md');
const artPipeline = read('docs/ART-PIPELINE.md');
const architecture = read('docs/ARCHITECTURE.md');
const decisionsIndex = read('docs/decisions/README.md');
const stageAdr = readIfPresent(
  new URL(
    '../docs/decisions/ADR-0017-visible-body-stage-presentation.md',
    import.meta.url,
  ),
);
const screenSpecs = read('docs/SCREEN-SPECS.md');
const qaChecklist = read('docs/QA-CHECKLIST.md');
const definitionOfDone = read('docs/DEFINITION-OF-DONE.md');

const gaf2dRoot =
  process.env.GAF2D_ROOT ?? path.join(os.homedir(), 'Documents', 'gaf2d');
const checkGaf2dGuidance =
  process.env.GAF2D_ROOT !== undefined || fs.existsSync(gaf2dRoot);
const gaf2dRepositoryGuidance = checkGaf2dGuidance
  ? [
      [
        'runtime integration',
        readIfPresent(path.join(gaf2dRoot, 'docs', 'runtime-integration.md')),
      ],
      [
        'repository skill',
        readIfPresent(path.join(gaf2dRoot, 'skills', 'gaf2d', 'SKILL.md')),
      ],
    ]
  : [];
const installedSkillPath =
  process.env.GAF2D_INSTALLED_SKILL_PATH ??
  path.join(os.homedir(), '.codex', 'skills', 'gaf2d', 'SKILL.md');
const checkInstalledSkill =
  process.env.GAF2D_INSTALLED_SKILL_PATH !== undefined ||
  fs.existsSync(installedSkillPath);
const gaf2dInstalledGuidance = checkInstalledSkill
  ? [['installed skill', readIfPresent(installedSkillPath)]]
  : [];
const gaf2dGuidance = [
  ...gaf2dRepositoryGuidance,
  ...gaf2dInstalledGuidance,
];

const STAGE_ROLES = ['hero', 'standard', 'elite', 'boss'];
const stageRole = (role) => STAGE_ROLE_PRESENTATION[role];
const contains = (label, fragment) => ({
  label,
  matches: (content) => content.includes(fragment),
});
const matches = (label, pattern) => ({
  label,
  matches: (content) => pattern.test(content),
});
const tableRole = (role) => {
  const { visibleBodyHeight, visualGap } = stageRole(role);
  return contains(
    `${role} ${visibleBodyHeight}/${visualGap} table row`,
    `| \`${role}\` | ${visibleBodyHeight} px | ${visualGap} px |`,
  );
};
const inlineRole = (role) => {
  const { visibleBodyHeight, visualGap } = stageRole(role);
  return matches(
    `${role} ${visibleBodyHeight}/${visualGap} inline pair`,
    new RegExp(
      `\`${role}\`\\s+${visibleBodyHeight}(?:\\s*px)?\\s*\\/\\s*` +
        `${visualGap}(?!\\d)(?:\\s*px)?`,
    ),
  );
};
const everyTableRole = () => STAGE_ROLES.map(tableRole);
const everyInlineRole = () => STAGE_ROLES.map(inlineRole);
const roleHeightShorthand = STAGE_ROLES.map((role) => {
  const label = role === 'hero' ? 'Hero' : role;
  return `${label} ${stageRole(role).visibleBodyHeight}`;
}).join(', ');
const heroPresentation = stageRole('hero');
const stageDocumentObligations = [
  {
    path: 'brand/ART-DIRECTION.md',
    content: art,
    obligations: [
      contains(
        'runtime source routing',
        '[`STAGE_ROLE_PRESENTATION`](../js/stage-presentation.js)',
      ),
      ...everyTableRole(),
      contains(
        'role shorthand',
        `Proof shorthand: ${roleHeightShorthand}.`,
      ),
      contains('neutral scale rule', 'Neutral visible-body height chooses scale'),
      contains('label envelope rule', 'body-only motion envelope protects'),
      contains('shared transform rule', 'one shared transform'),
      contains(
        'per-frame grounding prohibition',
        'frame-by-frame grounding is forbidden',
      ),
    ],
  },
  {
    path: 'brand/MASCOT-CANON.md',
    content: mascotCanon,
    obligations: [
      matches(
        `Hero ${heroPresentation.visibleBodyHeight}/${heroPresentation.visualGap} pair`,
        new RegExp(
          'The `hero` role presents[\\s\\S]{0,100}' +
            `${heroPresentation.visibleBodyHeight} px[\\s\\S]{0,60}` +
            `${heroPresentation.visualGap} px hover gap`,
        ),
      ),
      contains('neutral scale rule', 'neutral body bounds choose that scale'),
      contains('body-only union envelope', 'body-only union motion'),
      contains('shared Hero transform', 'same source pivot, scale, and translation'),
      contains(
        'individual-frame prohibition',
        'Do not crop, resize, or ground individual frames',
      ),
      contains('renderer-owned shadow', 'renderer-owned oval shadow'),
    ],
  },
  {
    path: 'docs/ASSET-ENGINE.md',
    content: assetEngine,
    obligations: [
      contains(
        'ADR routing',
        '[ADR-0017](./decisions/ADR-0017-visible-body-stage-presentation.md)',
      ),
      contains('GAF intrinsic ownership', 'GAF2D owns the source canvas'),
      contains('game role ownership', 'APN owns the explicit role'),
      contains(
        'runtime source routing',
        '`STAGE_ROLE_PRESENTATION` is the runtime authority',
      ),
      ...everyTableRole(),
      contains('neutral reference', 'declares a neutral reference frame'),
      contains('hash-bound geometry', 'hash-binds its body-visible bounds'),
      contains('body-only union envelope', 'body-only union motion envelope'),
      contains('neutral scale rule', 'Neutral body bounds choose scale'),
      contains('label clearance rule', 'motion-envelope bounds protect labels'),
      contains('fail-closed importer', 'The importer fails closed'),
      contains('per-frame prohibition', 'without per-frame grounding'),
      contains('schema boundary', 'does not change GAF2D schema version 1'),
    ],
  },
  {
    path: 'docs/ART-PIPELINE.md',
    content: artPipeline,
    obligations: [
      contains('neutral reference', 'Declare one neutral reference frame'),
      contains('body-only union envelope', 'body-only union motion envelope'),
      contains('hash binding', 'hash-bind both'),
      contains('fail-closed handoff', 'Fail closed before decode or draw'),
      contains(
        'runtime source routing',
        'Assign the game role from `STAGE_ROLE_PRESENTATION`',
      ),
      ...everyInlineRole(),
      contains('neutral scale rule', 'neutral body choose scale'),
      contains('shared transform', 'one shared transform'),
      contains(
        'current-frame prohibition',
        'Never remeasure, resize, or ground the current frame',
      ),
      contains('human gates', 'release remain human gates'),
    ],
  },
  {
    path: 'docs/ARCHITECTURE.md',
    content: architecture,
    obligations: [
      contains('stage module contract', '### `stage-presentation.js`'),
      contains(
        'ADR routing',
        '[ADR-0017](./decisions/ADR-0017-visible-body-stage-presentation.md)',
      ),
      contains(
        'Host source routing',
        'Hero stage size comes from `stage-presentation.js`',
      ),
      contains('runtime source routing', '`STAGE_ROLE_PRESENTATION` owns exact'),
      ...everyInlineRole(),
      contains('hash-bound neutral bounds', 'hash-bound neutral visible bounds'),
      contains('body-only union envelope', 'body-only union motion'),
      contains('neutral scale rule', 'Neutral bounds choose role scale'),
      contains('label clearance rule', 'motion envelope protects labels'),
      contains('shared transform', 'same scale and pivot translation'),
      contains('consumer routing', 'shared resolved actor geometry'),
      contains('per-frame prohibition', 'grounding individual frames'),
    ],
  },
  {
    path: 'docs/decisions/ADR-0017-visible-body-stage-presentation.md',
    content: stageAdr,
    obligations: [
      contains('accepted status', '- Status: Accepted'),
      contains('decision section', '## Decision'),
      contains('GAF intrinsic ownership', 'GAF2D owns source canvas'),
      contains('game role ownership', 'APN owns role assignment'),
      contains(
        'runtime source routing',
        '`STAGE_ROLE_PRESENTATION` is the exact role authority',
      ),
      ...everyTableRole(),
      contains('neutral reference', 'explicit neutral reference frame'),
      contains('neutral scale rule', 'neutral visible bounds choose scale'),
      contains('body-only union envelope', 'body-only union motion envelope'),
      contains('label clearance rule', 'protects HP plates'),
      contains(
        'per-frame prohibition',
        'per-frame alpha grounding is prohibited',
      ),
      contains('fail-closed importer', 'The importer fails closed'),
      contains('human approvals', 'release remain human approvals'),
      contains('schema boundary', 'schema-version-1 change'),
    ],
  },
  {
    path: 'docs/decisions/README.md',
    content: decisionsIndex,
    obligations: [
      contains(
        'accepted ADR-0017 index entry',
        '| [0017](./ADR-0017-visible-body-stage-presentation.md) | Neutral visible-body bounds set game role scale; one transform preserves acting | Accepted |',
      ),
    ],
  },
  {
    path: 'docs/SCREEN-SPECS.md',
    content: screenSpecs,
    obligations: [
      contains('runtime source routing', '`STAGE_ROLE_PRESENTATION` ladder'),
      ...everyInlineRole(),
      contains(
        'visible-body contract',
        'measurements describe the neutral visible body, not an atlas cell',
      ),
      contains('neutral scale rule', 'neutral bounds choose scale'),
      contains('body-only envelope', 'body-only motion envelope'),
      contains('label clearance', 'enemy HP plate, priority brackets, floaters'),
      contains('shared actor geometry', 'same resolved actor geometry'),
      contains('individual-frame prohibition', 'individual animation frame'),
    ],
  },
  {
    path: 'docs/QA-CHECKLIST.md',
    content: qaChecklist,
    obligations: [
      ...everyInlineRole(),
      contains('shared transform', 'one scale/pivot transform is shared'),
      contains('body-only envelope', 'Body-only motion envelopes contain'),
      contains('label clearance', 'keep HP plates, priority brackets, floaters'),
      contains('renderer-owned shadow', 'shadows stay renderer-owned and grounded'),
    ],
  },
  {
    path: 'docs/DEFINITION-OF-DONE.md',
    content: definitionOfDone,
    obligations: [
      contains('stage geometry gate', '**Stage geometry is shared**'),
      contains(
        'neutral role scale',
        'neutral visible bounds choose the named role',
      ),
      contains(
        'body-only label clearance',
        'body-only motion envelope protects labels',
      ),
      matches(
        'shared motion-set transform',
        /complete\s+motion set keeps one scale\/pivot/,
      ),
      contains('individual-frame prohibition', 'no frame is independently'),
    ],
  },
];
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
for (const { path: documentPath, content, obligations } of stageDocumentObligations) {
  for (const obligation of obligations) {
    if (!obligation.matches(content)) {
      failures.push(`${documentPath}: ${obligation.label}`);
    }
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
