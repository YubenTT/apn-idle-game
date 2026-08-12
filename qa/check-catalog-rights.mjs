import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildCatalog } from '../scripts/assets/generate-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Catalog rights contract: ${message}`);
};

const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stableJson(value));
};

const targetRoles = ['common-a', 'common-b', 'common-c', 'elite', 'event'];
const fixturePack = (id, order, title, editorialReference) => ({
  schemaVersion: 1,
  catalogVersion: 1,
  id,
  order,
  title,
  editorialReference,
  genre: `genre-${order}`,
  zones: 10,
  targets: targetRoles.map((role) => ({
    id: `${id}-${role}`,
    role,
    label: `${title} ${role}`,
    frame: role,
    pivot: { x: 0.5, y: 1 },
  })),
  boss: {
    id: `${id}-boss`,
    label: `${title} Gate`,
    frame: 'boss',
    breakFrame: 'boss-break',
    pivot: { x: 0.5, y: 1 },
  },
  assets: {
    background: `assets/game-packs/${id}/background.webp`,
    targets: `assets/game-packs/${id}/targets.webp`,
    targetData: `assets/game-packs/${id}/targets.json`,
    props: `assets/game-packs/${id}/props.webp`,
    corruptionMask: `assets/game-packs/${id}/corruption-mask.webp`,
  },
  sourceBoard: `assets/game-packs/${id}/source-board.md`,
  corruptionMasks: ['signal-drift', 'corrupted', 'overrun', 'zero-day'],
  rights: `assets/game-packs/${id}/rights.json`,
  fallback: {
    mode: 'procedural-canvas',
    reasonCopy: 'Required Pack art is unavailable; APN Canvas preserves Route progress.',
    preserveProgress: true,
  },
});

const fixtureRights = (id, editorialReference) => ({
  schemaVersion: 1,
  mode: 'pending-review',
  reviewStatus: 'needs-legal-review',
  reviewedAt: null,
  reviewedBy: null,
  editorialReference,
  killSwitch: `disable-${id}`,
  licenseRecord: null,
  forbiddenMotifs: [`${editorialReference} marks`, `${editorialReference} character likenesses`],
  provenance: {
    sourceBoard: `assets/game-packs/${id}/source-board.md`,
    reviewEvidence: [],
  },
});

const fixturePolicy = (marks = [], pendingReviewWarnIds = ['fixture-pack']) => ({
  schemaVersion: 1,
  pendingReview: 'block',
  pendingReviewWarnIds,
  disabledKillSwitches: [],
  deniedRuntimeMarks: marks,
  deniedRuntimeTerms: ['Named Fixture Hero'],
  nonAffiliationNotice:
    'Independent editorial reference. APN is not affiliated with or endorsed by the referenced publisher.',
});

const fixtureResolvedRights = (id, editorialReference) => ({
  ...fixtureRights(id, editorialReference),
  mode: 'editorial-text-original-art',
  reviewStatus: 'approved-original-echo',
  reviewedAt: '2026-08-12T09:00:00Z',
  reviewedBy: 'Synthetic Fixture Reviewer',
  provenance: {
    sourceBoard: `assets/game-packs/${id}/source-board.md`,
    reviewEvidence: [{
      id: `${id}-originality-review`,
      kind: 'originality-review',
      sha256: 'b'.repeat(64),
    }],
  },
});

const addFixture = (fixtureRoot, pack, rights = fixtureRights(pack.id, pack.editorialReference)) => {
  const directory = path.join(fixtureRoot, 'assets/game-packs', pack.id);
  writeJson(path.join(directory, 'pack.json'), pack);
  writeJson(path.join(directory, 'rights.json'), rights);
  fs.writeFileSync(path.join(directory, 'source-board.md'), '# Synthetic catalog fixture\n');
};

const makeFixtureRoot = () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-rights-'));
  writeJson(
    path.join(fixtureRoot, 'assets/game-packs/catalog-policy.json'),
    fixturePolicy(['Fixture Game']),
  );
  addFixture(fixtureRoot, fixturePack('fixture-pack', 1, 'Signal Circuit', 'Fixture Game'));
  return fixtureRoot;
};

const expectFailure = (mutate, pattern, message) => {
  const fixtureRoot = makeFixtureRoot();
  try {
    mutate(fixtureRoot);
    let error = null;
    try {
      buildCatalog({ rootDir: fixtureRoot, write: false, warn: () => {} });
    } catch (caught) {
      error = caught;
    }
    assert(pattern.test(String(error?.message || '')), message);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
};

export function checkCatalogRightsContract() {
  const packSchema = JSON.parse(
    fs.readFileSync(path.join(root, 'docs/product/schemas/pack.schema.json'), 'utf8'),
  );
  const rightsSchema = JSON.parse(
    fs.readFileSync(path.join(root, 'docs/product/schemas/rights.schema.json'), 'utf8'),
  );
  const echoSchema = JSON.parse(
    fs.readFileSync(path.join(root, 'docs/product/schemas/echo-pack.schema.json'), 'utf8'),
  );
  assert(packSchema.additionalProperties === false, 'Pack pointer schema is closed');
  assert(
    packSchema.properties.fallback?.properties?.mode?.const === 'procedural-canvas',
    'Pack asset fallback names the real procedural Canvas behavior',
  );
  assert(
    packSchema.$defs?.target?.additionalProperties === false &&
      packSchema.$defs?.boss?.additionalProperties === false &&
      packSchema.$defs?.assets?.additionalProperties === false,
    'Pack target, boss, and asset boundaries are closed',
  );
  assert(rightsSchema.additionalProperties === false, 'rights authority schema is closed');
  assert(
    echoSchema.properties.rights?.$ref === 'rights.schema.json',
    'full Echo Pack schema reuses the canonical rights authority',
  );
  assert(
    ['schemaVersion', 'catalogVersion', 'editorialReference', 'rights', 'fallback'].every((key) =>
      packSchema.required.includes(key)),
    'Pack pointer schema requires version, editorial, rights, and fallback fields',
  );

  const fixtureRoot = makeFixtureRoot();
  try {
    const warnings = [];
    const result = buildCatalog({
      rootDir: fixtureRoot,
      write: false,
      warn: (message) => warnings.push(message),
    });
    assert(result.packs.length === 1, 'pending-review wave Pack remains available');
    assert(warnings.length === 1 && /pending-review/.test(warnings[0]), 'pending-review emits one deterministic warning');
    assert(
      result.packs[0].rights.mode === 'pending-review' &&
        result.packs[0].rights.reviewStatus === 'needs-legal-review' &&
        result.packs[0].rights.reviewedBy === null,
      'pending review never invents a legal approval',
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }

  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/pack.json');
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      pack.unreviewedRuntimeEscape = true;
      writeJson(file, pack);
    },
    /unexpected property/i,
    'unknown Pack properties fail closed',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/pack.json');
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      pack.targets[0].officialCharacterName = 'Named Fixture Hero';
      pack.boss.officialBossName = 'Named Fixture Boss';
      pack.assets.remoteOverride = 'https://example.invalid/official.webp';
      writeJson(file, pack);
    },
    /target.*unexpected property|boss.*unexpected property|assets.*unexpected property/i,
    'unknown target, boss, and asset properties fail closed at runtime',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/pack.json');
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      pack.assets.background = 'https://example.invalid/official.webp';
      writeJson(file, pack);
    },
    /background must equal.*assets\/game-packs\/fixture-pack\/background\.webp/i,
    'runtime asset paths are exact Pack-owned portable paths',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/rights.json');
      const rights = JSON.parse(fs.readFileSync(file, 'utf8'));
      rights.unreviewedAuthorityEscape = true;
      writeJson(file, rights);
    },
    /unexpected property/i,
    'unknown rights properties fail closed',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/pack.json');
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      pack.title = 'Fixture Game';
      writeJson(file, pack);
    },
    /runtime (?:title|identity).*editorial mark/i,
    'raw editorial mark cannot become a runtime title',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/pack.json');
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      pack.targets[0].label = 'Named Fixture Hero Elite';
      writeJson(file, pack);
    },
    /runtime identity.*denied.*Named Fixture Hero/i,
    'named third-party terms cannot become target or boss identity',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/pack.json');
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      delete pack.rights;
      writeJson(file, pack);
    },
    /rights pointer must equal/i,
    'missing rights pointer fails closed',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/pack.json');
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      pack.rights = '../outside.json';
      writeJson(file, pack);
    },
    /rights.*portable|rights.*escape|rights.*exact/i,
    'escaping rights pointer fails closed',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/rights.json');
      const rights = JSON.parse(fs.readFileSync(file, 'utf8'));
      rights.reviewStatus = 'approved-original-echo';
      rights.reviewedBy = 'Synthetic Lawyer';
      writeJson(file, rights);
    },
    /pending-review.*needs-legal-review|review evidence/i,
    'coordinated fake review fields fail closed',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/rights.json');
      const rights = JSON.parse(fs.readFileSync(file, 'utf8'));
      rights.mode = 'licensed-spotlight';
      rights.reviewStatus = 'licensed';
      rights.reviewedAt = '2026-08-12T12:00:00+03:00';
      rights.reviewedBy = 'Fixture Rights Owner';
      rights.licenseRecord = {
        recordId: 'fixture-license',
        territories: [],
        expiresAt: 'not-a-date',
        allowedUses: [''],
        unreviewedScope: true,
      };
      rights.provenance.reviewEvidence = [{
        id: 'fixture-license-evidence',
        kind: 'license',
        sha256: 'a'.repeat(64),
      }];
      writeJson(file, rights);
    },
    /licenseRecord.*unexpected property|licenseRecord.*territories|licenseRecord.*expiresAt|licenseRecord.*allowedUses/i,
    'licensed authority validates its complete closed scope',
  );
  expectFailure(
    (fixtureRoot) => {
      const file = path.join(fixtureRoot, 'assets/game-packs/fixture-pack/rights.json');
      fs.unlinkSync(file);
      fs.symlinkSync(path.join(fixtureRoot, 'assets/game-packs/catalog-policy.json'), file);
    },
    /symbolic link|resolves outside/i,
    'rights authority cannot be replaced by a symbolic link',
  );

  for (const mode of ['blocked', 'kill-switched']) {
    const blockedRoot = makeFixtureRoot();
    try {
      if (mode === 'blocked') {
        const file = path.join(blockedRoot, 'assets/game-packs/fixture-pack/rights.json');
        const rights = JSON.parse(fs.readFileSync(file, 'utf8'));
        rights.mode = 'blocked';
        rights.reviewStatus = 'rejected';
        writeJson(file, rights);
      } else {
        const file = path.join(blockedRoot, 'assets/game-packs/catalog-policy.json');
        const policy = JSON.parse(fs.readFileSync(file, 'utf8'));
        policy.disabledKillSwitches = ['disable-fixture-pack'];
        writeJson(file, policy);
      }
      const result = buildCatalog({ rootDir: blockedRoot, write: false, warn: () => {} });
      assert(result.packs.length === 0, `${mode} Pack is excluded from runtime output`);
    } finally {
      fs.rmSync(blockedRoot, { recursive: true, force: true });
    }
  }

  const expandedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-rights-expanded-'));
  try {
    const marks = [];
    for (let order = 1; order <= 21; order += 1) {
      const id = `fixture-${order}`;
      const editorial = `Editorial Game ${order}`;
      marks.push(editorial);
      addFixture(
        expandedRoot,
        fixturePack(id, order, `Signal Circuit ${order}`, editorial),
        fixtureResolvedRights(id, editorial),
      );
    }
    marks.push('Future Editorial Game');
    addFixture(
      expandedRoot,
      fixturePack('future-pending', 22, 'Future Signal Circuit', 'Future Editorial Game'),
    );
    writeJson(
      path.join(expandedRoot, 'assets/game-packs/catalog-policy.json'),
      fixturePolicy(marks, []),
    );
    const warnings = [];
    const result = buildCatalog({
      rootDir: expandedRoot,
      write: false,
      warn: (message) => warnings.push(message),
    });
    assert(result.packs.length === 21, 'a valid 21st Pack passes without count-specific code');
    assert(
      result.sourceCount === 22 &&
        warnings.length === 1 &&
        /future-pending.*blocked by policy/.test(warnings[0]),
      'a future unresolved Pack is excluded by default',
    );
  } finally {
    fs.rmSync(expandedRoot, { recursive: true, force: true });
  }

  const productionWarnings = [];
  const production = buildCatalog({
    rootDir: root,
    write: false,
    warn: (message) => productionWarnings.push(message),
  });
  assert(production.sourceCount > 0 && production.packs.length === production.sourceCount, 'all current non-blocked Packs resolve');
  assert(productionWarnings.length === production.sourceCount, 'every unresolved current Pack stays explicitly pending');
  assert(
    production.policy.pendingReview === 'block' &&
      production.policy.pendingReviewWarnIds.length === production.sourceCount &&
      production.packs.every((pack) =>
        production.policy.pendingReviewWarnIds.includes(pack.id)),
    'pending-review defaults to block and only the explicit current transition roster warns',
  );
  assert(
    production.packs.every((pack) => pack.title !== pack.editorialReference),
    'runtime titles are separate from editorial references',
  );
  const assetBible = fs.readFileSync(
    path.join(root, 'docs/GAME-PACK-ASSET-BIBLE.md'),
    'utf8',
  );
  const runtimeBriefs = assetBible
    .split(/(?=^- (?:Small targets|Small rivals|Final):)/m)
    .filter((section) => /^- (?:Small targets|Small rivals|Final):/.test(section))
    .map((section) => section.split(/\n- Official basis:/)[0])
    .join('\n');
  const normalizeBrief = (value) =>
    String(value)
      .normalize('NFKC')
      .toLocaleLowerCase('en-US')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  const normalizedBriefs = ` ${normalizeBrief(runtimeBriefs)} `;
  const leakedTerm = production.policy.deniedRuntimeTerms.find((term) =>
    normalizedBriefs.includes(` ${normalizeBrief(term)} `),
  );
  assert(!leakedTerm, `runtime art briefs contain no denied third-party term (${leakedTerm || 'none'})`);
  const generatorSource = fs.readFileSync(
    path.join(root, 'scripts/assets/generate-catalog.mjs'),
    'utf8',
  );
  assert(!/packs\.length\s*!==\s*20/.test(generatorSource), 'catalog generator has no hardcoded Pack count');

  return [
    'closed versioned Pack pointer schema',
    'truthful procedural Canvas asset fallback',
    'closed Pack target, boss, and asset boundaries',
    'canonical closed rights schema shared by full Echo Packs',
    'portable rights and provenance binding',
    'closed Pack and rights runtime boundaries',
    'closed licensed-use authority',
    'non-symlink rights authority',
    'raw-mark runtime-title denylist',
    'named-character runtime-identity denylist',
    'truthful pending-review warning',
    'blocked and kill-switched runtime exclusion',
    'review-evidence fail-closed gate',
    'resolved Pack-count generalization through Pack 21',
    'future pending-review defaults to blocked',
    'current catalog runtime/editorial split',
    'runtime art briefs use original archetypes',
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const message of checkCatalogRightsContract()) console.log(`OK ${message}`);
  console.log('CATALOG RIGHTS PASS');
}
