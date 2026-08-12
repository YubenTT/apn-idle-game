import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ASSET_BUDGETS = Object.freeze({
  firstPlayable: 5 * 1024 * 1024 - 1,
  host: 650 * 1024,
  background: 150 * 1024,
  targets: 140 * 1024,
  propsAndMasks: 50 * 1024,
});

export const MOTION_GRAMMAR = 'gaf2d-motion-bundle-v1';
export const MOTION_BUDGETS = Object.freeze({
  commonCompressed: 160 * 1024,
  bossCompressed: 240 * 1024,
  heroCompressed: 640 * 1024,
  newMotionCompressed: 3.5 * 1024 * 1024,
  commonDecoded: 6 * 1024 * 1024,
  bossDecoded: 8 * 1024 * 1024,
  waveDecoded: 32 * 1024 * 1024,
  hotTextures: 64 * 1024 * 1024,
});
const TARGET_ROLES = Object.freeze([
  'common-a',
  'common-b',
  'common-c',
  'elite',
  'event',
]);
const TARGET_PROPERTIES = new Set(['id', 'role', 'label', 'frame', 'pivot']);
const BOSS_PROPERTIES = new Set(['id', 'label', 'frame', 'breakFrame', 'pivot']);
const ASSET_PROPERTIES = new Set([
  'background',
  'targets',
  'targetData',
  'props',
  'corruptionMask',
]);
const PIVOT_PROPERTIES = new Set(['x', 'y']);
const PACK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RIGHTS_MODES = new Set([
  'apn-original',
  'homage-only',
  'editorial-text-original-art',
  'licensed-spotlight',
  'blocked',
  'pending-review',
]);
const REVIEW_STATUSES = new Set([
  'needs-legal-review',
  'approved-original-echo',
  'licensed',
  'rejected',
]);
const PACK_PROPERTIES = new Set([
  'schemaVersion',
  'catalogVersion',
  'id',
  'order',
  'title',
  'editorialReference',
  'genre',
  'zones',
  'targets',
  'boss',
  'assets',
  'motion',
  'sourceBoard',
  'corruptionMasks',
  'rights',
  'fallback',
]);
const RIGHTS_PROPERTIES = new Set([
  'schemaVersion',
  'mode',
  'reviewStatus',
  'reviewedAt',
  'reviewedBy',
  'editorialReference',
  'killSwitch',
  'licenseRecord',
  'forbiddenMotifs',
  'provenance',
]);
const LICENSE_PROPERTIES = new Set([
  'recordId',
  'territories',
  'expiresAt',
  'allowedUses',
]);
const POLICY_PROPERTIES = new Set([
  'schemaVersion',
  'pendingReview',
  'pendingReviewWarnIds',
  'disabledKillSwitches',
  'deniedRuntimeMarks',
  'deniedRuntimeTerms',
  'nonAffiliationNotice',
]);

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const finite = (value) => Number.isFinite(value);
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isDateTime = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));

function rejectUnknownProperties(value, allowed, label, errors) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${label}: unexpected property "${key}"`);
  }
}

function validatePackPivot(pivot, label, errors) {
  if (!isObject(pivot)) {
    errors.push(`${label}: pivot is required`);
    return;
  }
  rejectUnknownProperties(pivot, PIVOT_PROPERTIES, `${label}/pivot`, errors);
  if (
    !finite(pivot.x) ||
    !finite(pivot.y) ||
    pivot.x < 0 ||
    pivot.x > 1 ||
    pivot.y < 0 ||
    pivot.y > 1
  ) {
    errors.push(`${label}: pivot must be normalized`);
  }
}

export function validateAtlasData(data, label = 'atlas') {
  const errors = [];
  const width = data?.meta?.size?.w;
  const height = data?.meta?.size?.h;
  if (!finite(width) || width <= 0 || !finite(height) || height <= 0) {
    errors.push(`${label}: invalid atlas size`);
    return errors;
  }
  const frames = data?.frames;
  if (!frames || typeof frames !== 'object' || Array.isArray(frames)) {
    errors.push(`${label}: missing frames`);
    return errors;
  }
  for (const [name, frame] of Object.entries(frames)) {
    const rect = frame?.rect;
    if (!rect || ![rect.x, rect.y, rect.w, rect.h].every(finite)) {
      errors.push(`${label}/${name}: invalid rect`);
      continue;
    }
    if (rect.x < 0 || rect.y < 0 || rect.w <= 0 || rect.h <= 0 || rect.x + rect.w > width || rect.y + rect.h > height) {
      errors.push(`${label}/${name}: rect out of bounds`);
    }
    const pivot = frame?.pivot;
    if (!pivot || !finite(pivot.x) || !finite(pivot.y)) {
      errors.push(`${label}/${name}: missing pivot`);
    } else if (pivot.x < 0 || pivot.x > 1 || pivot.y < 0 || pivot.y > 1) {
      errors.push(`${label}/${name}: pivot must be normalized`);
    }
    const source = frame?.sourceSize;
    if (!source || !finite(source.w) || !finite(source.h) || source.w < rect.w || source.h < rect.h) {
      errors.push(`${label}/${name}: invalid source size`);
    }
  }
  return errors;
}

export function validatePackManifest(pack, label = pack?.id || 'pack') {
  const errors = [];
  if (!isObject(pack)) return [`${label}: pack must be an object`];
  rejectUnknownProperties(pack, PACK_PROPERTIES, label, errors);
  if (pack.schemaVersion !== 1) errors.push(`${label}: schemaVersion must equal 1`);
  if (!Number.isInteger(pack.catalogVersion) || pack.catalogVersion < 1) {
    errors.push(`${label}: catalogVersion must be a positive integer`);
  }
  if (!PACK_ID_PATTERN.test(pack?.id || '')) errors.push(`${label}: invalid id`);
  if (!Number.isInteger(pack?.order) || pack.order < 1) errors.push(`${label}: invalid order`);
  if (pack?.zones !== 10) errors.push(`${label}: zones must equal 10`);
  if (!pack?.genre || typeof pack?.title !== 'string' || pack.title.length < 2 || pack.title.length > 40) {
    errors.push(`${label}: missing or invalid runtime title or genre`);
  }
  if (
    typeof pack.editorialReference !== 'string' ||
    pack.editorialReference.length < 1 ||
    pack.editorialReference.length > 120
  ) {
    errors.push(`${label}: editorialReference is required`);
  }
  const expectedRights = `assets/game-packs/${pack.id}/rights.json`;
  if (pack.rights !== expectedRights) {
    errors.push(`${label}: rights pointer must equal the portable path ${expectedRights}`);
  }
  const expectedSourceBoard = `assets/game-packs/${pack.id}/source-board.md`;
  if (pack.sourceBoard !== expectedSourceBoard) {
    errors.push(`${label}: source board must equal ${expectedSourceBoard}`);
  }
  if (
    !Array.isArray(pack.corruptionMasks) ||
    pack.corruptionMasks.length !== 4 ||
    new Set(pack.corruptionMasks).size !== 4 ||
    pack.corruptionMasks.some((value) => !PACK_ID_PATTERN.test(value || ''))
  ) {
    errors.push(`${label}: corruptionMasks must contain four unique portable ids`);
  }
  if (!isObject(pack.fallback)) {
    errors.push(`${label}: fallback is required`);
  } else {
    rejectUnknownProperties(
      pack.fallback,
      new Set(['mode', 'reasonCopy', 'preserveProgress']),
      `${label}/fallback`,
      errors,
    );
    if (pack.fallback.mode !== 'procedural-canvas') {
      errors.push(`${label}: fallback mode must equal "procedural-canvas"`);
    }
    if (
      typeof pack.fallback.reasonCopy !== 'string' ||
      pack.fallback.reasonCopy.length < 10 ||
      pack.fallback.reasonCopy.length > 160
    ) {
      errors.push(`${label}: fallback reasonCopy is invalid`);
    }
    if (pack.fallback.preserveProgress !== true) {
      errors.push(`${label}: fallback must preserve progress`);
    }
  }
  if (!Array.isArray(pack?.targets) || pack.targets.length !== 5) errors.push(`${label}: requires five targets`);
  if (
    Array.isArray(pack?.targets) &&
    new Set(pack.targets.map((target) => target?.id)).size !== pack.targets.length
  ) {
    errors.push(`${label}: duplicate target id`);
  }
  if (Array.isArray(pack?.targets)) {
    const roles = pack.targets.map((target) => target?.role);
    if (new Set(roles).size !== TARGET_ROLES.length || TARGET_ROLES.some((role) => !roles.includes(role))) {
      errors.push(`${label}: target roles must be exactly ${TARGET_ROLES.join(', ')}`);
    }
  }
  if (!isObject(pack.boss)) {
    errors.push(`${label}: incomplete boss`);
  } else {
    rejectUnknownProperties(pack.boss, BOSS_PROPERTIES, `${label}/boss`, errors);
    if (
      !PACK_ID_PATTERN.test(pack.boss.id || '') ||
      typeof pack.boss.label !== 'string' ||
      pack.boss.label.length < 2 ||
      pack.boss.label.length > 80
    ) {
      errors.push(`${label}: boss id or label is invalid`);
    }
    if (pack.boss.frame !== 'boss') errors.push(`${label}: boss frame must equal "boss"`);
    if (pack.boss.breakFrame !== 'boss-break') {
      errors.push(`${label}: boss breakFrame must equal "boss-break"`);
    }
    validatePackPivot(pack.boss.pivot, `${label}/boss`, errors);
  }
  for (const [index, target] of (pack?.targets || []).entries()) {
    const targetLabel = `${label}/targets[${index}]`;
    if (!isObject(target)) {
      errors.push(`${targetLabel}: incomplete target`);
      continue;
    }
    rejectUnknownProperties(target, TARGET_PROPERTIES, targetLabel, errors);
    if (
      !PACK_ID_PATTERN.test(target.id || '') ||
      typeof target.label !== 'string' ||
      target.label.length < 2 ||
      target.label.length > 80
    ) {
      errors.push(`${targetLabel}: target id or label is invalid`);
    }
    if (target.frame !== target.role) {
      errors.push(`${targetLabel}: frame must equal role`);
    }
    validatePackPivot(target.pivot, targetLabel, errors);
  }
  if (!isObject(pack.assets)) {
    errors.push(`${label}: assets must be an object`);
  } else {
    rejectUnknownProperties(pack.assets, ASSET_PROPERTIES, `${label}/assets`, errors);
    const expectedAssets = {
      background: `assets/game-packs/${pack.id}/background.webp`,
      targets: `assets/game-packs/${pack.id}/targets.webp`,
      targetData: `assets/game-packs/${pack.id}/targets.json`,
      props: `assets/game-packs/${pack.id}/props.webp`,
      corruptionMask: `assets/game-packs/${pack.id}/corruption-mask.webp`,
    };
    for (const [key, expected] of Object.entries(expectedAssets)) {
      if (pack.assets[key] !== expected) {
        errors.push(`${label}: ${key} must equal ${expected}`);
      }
    }
  }
  if (pack?.motion !== undefined) {
    if (
      !pack.motion ||
      typeof pack.motion !== 'object' ||
      Array.isArray(pack.motion)
    ) {
      errors.push(`${label}: motion must be an object`);
    } else {
      rejectUnknownProperties(
        pack.motion,
        new Set(['grammar', 'characters']),
        `${label}/motion`,
        errors,
      );
      if (pack.motion.grammar !== MOTION_GRAMMAR) {
        errors.push(
          `${label}: motion grammar must equal "${MOTION_GRAMMAR}"`,
        );
      }
      const characters = pack.motion.characters;
      if (
        !characters ||
        typeof characters !== 'object' ||
        Array.isArray(characters)
      ) {
        errors.push(`${label}: motion characters must be an object`);
      } else {
        const characterIds = new Set([
          ...(pack.targets || []).map((target) => target?.id),
          pack.boss?.id,
        ]);
        if (pack.id === 'valorant') characterIds.add('apn-hero');
        const seenPaths = new Set();
        for (const [assetId, record] of Object.entries(characters)) {
          const motionLabel = `${label}/motion/${assetId}`;
          if (!characterIds.has(assetId)) {
            errors.push(`${motionLabel}: unknown character`);
          }
          if (!record || typeof record !== 'object' || Array.isArray(record)) {
            errors.push(`${motionLabel}: motion record must be an object`);
            continue;
          }
          const perClipSource =
            typeof record.set === 'string' &&
            typeof record.setSha256 === 'string' &&
            record.clips &&
            typeof record.clips === 'object' &&
            !Array.isArray(record.clips);
          if (perClipSource) {
            rejectUnknownProperties(
              record,
              new Set([
                'authority',
                'role',
                'basePath',
                'set',
                'setSha256',
                'clips',
                'sourceFamily',
                'consumerScale',
                'selectedProfileSha256',
              ]),
              motionLabel,
              errors,
            );
            if (record.sourceFamily !== 'authored-semantic-v4') {
              errors.push(`${motionLabel}: sourceFamily must equal "authored-semantic-v4"`);
            }
            if (assetId === 'apn-hero' && record.role !== 'hero') {
              errors.push(`${motionLabel}: APN Hero role must equal "hero"`);
            }
            if (
              assetId === 'apn-hero' &&
              record.consumerScale?.role !== 'hero'
            ) {
              errors.push(`${motionLabel}: APN Hero consumer scale role must equal "hero"`);
            }
            if (!/^[0-9a-f]{64}$/.test(record.setSha256 || '')) {
              errors.push(`${motionLabel}: setSha256 must be 64 lowercase hex characters`);
            }
            if (!/^[0-9a-f]{64}$/.test(record.selectedProfileSha256 || '')) {
              errors.push(
                `${motionLabel}: selectedProfileSha256 must be 64 lowercase hex characters`,
              );
            }
            const expectedSet =
              `assets/game-packs/${pack.id}/characters/${assetId}/set.json`;
            if (record.set !== expectedSet) {
              errors.push(`${motionLabel}: set must equal ${expectedSet}`);
            }
            if (typeof record.basePath === 'string') {
              const expectedBase =
                `assets/game-packs/${pack.id}/characters/${assetId}/`;
              if (record.basePath !== expectedBase) {
                errors.push(`${motionLabel}: basePath must equal ${expectedBase}`);
              }
            }
            if (typeof record.set === 'string') seenPaths.add(record.set);
            for (const [clipName, clipRecord] of Object.entries(record.clips)) {
              if (!clipRecord || typeof clipRecord !== 'object' || Array.isArray(clipRecord)) {
                errors.push(`${motionLabel}/clips/${clipName}: clip source must be an object`);
                continue;
              }
              rejectUnknownProperties(
                clipRecord,
                new Set(['descriptor', 'descriptorSha256', 'image', 'imageSha256']),
                `${motionLabel}/clips/${clipName}`,
                errors,
              );
              if (!/^[0-9a-f]{64}$/.test(clipRecord.descriptorSha256 || '')) {
                errors.push(
                  `${motionLabel}/clips/${clipName}: descriptorSha256 must be 64 lowercase hex characters`,
                );
              }
              if (!/^[0-9a-f]{64}$/.test(clipRecord.imageSha256 || '')) {
                errors.push(
                  `${motionLabel}/clips/${clipName}: imageSha256 must be 64 lowercase hex characters`,
                );
              }
              for (const [field, extension] of [
                ['descriptor', 'json'],
                ['image', 'webp'],
              ]) {
                const value = clipRecord[field];
                if (typeof value === 'string' && seenPaths.has(value)) {
                  errors.push(`${motionLabel}: duplicate motion path ${value}`);
                }
                if (typeof value === 'string') seenPaths.add(value);
                const expected =
                  `assets/game-packs/${pack.id}/characters/${assetId}/${clipName}.${extension}`;
                if (value !== expected) {
                  errors.push(
                    `${motionLabel}/clips/${clipName}: ${field} must equal ${expected}`,
                  );
                }
              }
            }
            continue;
          }
          rejectUnknownProperties(
            record,
            new Set(['image', 'descriptor', 'descriptorSha256']),
            motionLabel,
            errors,
          );
          if (!/^[0-9a-f]{64}$/.test(record.descriptorSha256 || '')) {
            errors.push(
              `${motionLabel}: descriptorSha256 must be 64 lowercase hex characters`,
            );
          }
          for (const [field, filename] of [
            ['image', 'motion.webp'],
            ['descriptor', 'motion.json'],
          ]) {
            const value = record[field];
            if (typeof value === 'string' && seenPaths.has(value)) {
              errors.push(`${motionLabel}: duplicate motion path ${value}`);
            }
            if (typeof value === 'string') seenPaths.add(value);
            const expected =
              `assets/game-packs/${pack.id}/characters/${assetId}/${filename}`;
            if (value !== expected) {
              errors.push(
                `${motionLabel}: ${field} must equal ${expected}`,
              );
            }
          }
        }
      }
    }
  }
  return errors;
}

export function validateRightsDocument(rights, label = 'rights') {
  const errors = [];
  if (!isObject(rights)) return [`${label}: rights must be an object`];
  rejectUnknownProperties(rights, RIGHTS_PROPERTIES, label, errors);
  if (rights.schemaVersion !== 1) errors.push(`${label}: schemaVersion must equal 1`);
  if (!RIGHTS_MODES.has(rights.mode)) errors.push(`${label}: invalid rights mode`);
  if (!REVIEW_STATUSES.has(rights.reviewStatus)) {
    errors.push(`${label}: invalid reviewStatus`);
  }
  if (
    typeof rights.editorialReference !== 'string' ||
    rights.editorialReference.length > 120
  ) {
    errors.push(`${label}: invalid editorialReference`);
  }
  if (!PACK_ID_PATTERN.test(rights.killSwitch || '')) {
    errors.push(`${label}: invalid killSwitch`);
  }
  if (
    rights.reviewedBy !== null &&
    (typeof rights.reviewedBy !== 'string' || rights.reviewedBy.length < 1 || rights.reviewedBy.length > 120)
  ) {
    errors.push(`${label}: invalid reviewedBy`);
  }
  if (
    rights.reviewedAt !== null &&
    !isDateTime(rights.reviewedAt)
  ) {
    errors.push(`${label}: invalid reviewedAt`);
  }
  if (isObject(rights.licenseRecord)) {
    const license = rights.licenseRecord;
    const licenseLabel = `${label}/licenseRecord`;
    rejectUnknownProperties(license, LICENSE_PROPERTIES, licenseLabel, errors);
    if (
      typeof license.recordId !== 'string' ||
      license.recordId.length < 1 ||
      license.recordId.length > 120
    ) {
      errors.push(`${licenseLabel}: invalid recordId`);
    }
    if (
      !Array.isArray(license.territories) ||
      license.territories.length < 1 ||
      new Set(license.territories).size !== license.territories.length ||
      license.territories.some(
        (value) => typeof value !== 'string' || value.length < 2 || value.length > 64,
      )
    ) {
      errors.push(`${licenseLabel}: territories must be a unique nonempty string list`);
    }
    if (license.expiresAt !== null && !isDateTime(license.expiresAt)) {
      errors.push(`${licenseLabel}: invalid expiresAt`);
    }
    if (
      !Array.isArray(license.allowedUses) ||
      license.allowedUses.length < 1 ||
      new Set(license.allowedUses).size !== license.allowedUses.length ||
      license.allowedUses.some(
        (value) => typeof value !== 'string' || value.length < 2 || value.length > 240,
      )
    ) {
      errors.push(`${licenseLabel}: allowedUses must be a unique nonempty string list`);
    }
  }
  if (
    !Array.isArray(rights.forbiddenMotifs) ||
    rights.forbiddenMotifs.length < 1 ||
    rights.forbiddenMotifs.length > 40 ||
    new Set(rights.forbiddenMotifs).size !== rights.forbiddenMotifs.length ||
    rights.forbiddenMotifs.some(
      (value) => typeof value !== 'string' || value.length < 2 || value.length > 120,
    )
  ) {
    errors.push(`${label}: forbiddenMotifs must be a unique nonempty string list`);
  }
  if (!isObject(rights.provenance)) {
    errors.push(`${label}: provenance is required`);
  } else {
    rejectUnknownProperties(
      rights.provenance,
      new Set(['sourceBoard', 'reviewEvidence']),
      `${label}/provenance`,
      errors,
    );
    if (
      typeof rights.provenance.sourceBoard !== 'string' ||
      !/^assets\/game-packs\/[a-z0-9-]+\/source-board\.md$/.test(
        rights.provenance.sourceBoard,
      )
    ) {
      errors.push(`${label}: provenance sourceBoard is invalid`);
    }
    if (!Array.isArray(rights.provenance.reviewEvidence)) {
      errors.push(`${label}: reviewEvidence must be an array`);
    } else {
      for (const [index, record] of rights.provenance.reviewEvidence.entries()) {
        const recordLabel = `${label}/provenance/reviewEvidence[${index}]`;
        if (!isObject(record)) {
          errors.push(`${recordLabel}: record must be an object`);
          continue;
        }
        rejectUnknownProperties(
          record,
          new Set(['id', 'kind', 'sha256']),
          recordLabel,
          errors,
        );
        if (!PACK_ID_PATTERN.test(record.id || '')) errors.push(`${recordLabel}: invalid id`);
        if (!['legal-review', 'license', 'originality-review'].includes(record.kind)) {
          errors.push(`${recordLabel}: invalid kind`);
        }
        if (!SHA256_PATTERN.test(record.sha256 || '')) {
          errors.push(`${recordLabel}: invalid sha256`);
        }
      }
    }
  }
  if (rights.mode === 'pending-review') {
    if (
      rights.reviewStatus !== 'needs-legal-review' ||
      rights.reviewedAt !== null ||
      rights.reviewedBy !== null ||
      rights.licenseRecord !== null
    ) {
      errors.push(
        `${label}: pending-review must remain needs-legal-review with null reviewer, timestamp, and license`,
      );
    }
  }
  if (rights.mode === 'blocked' && rights.reviewStatus !== 'rejected') {
    errors.push(`${label}: blocked mode must have rejected reviewStatus`);
  }
  if (rights.mode === 'apn-original' && rights.editorialReference !== '') {
    errors.push(`${label}: apn-original must have an empty editorialReference`);
  }
  if (rights.mode === 'licensed-spotlight') {
    if (
      rights.reviewStatus !== 'licensed' ||
      !isObject(rights.licenseRecord) ||
      rights.reviewedAt === null ||
      rights.reviewedBy === null ||
      !Array.isArray(rights.provenance?.reviewEvidence) ||
      !rights.provenance.reviewEvidence.some((record) => record?.kind === 'license')
    ) {
      errors.push(`${label}: licensed-spotlight requires licensed review and licenseRecord`);
    }
  } else if (rights.licenseRecord !== null) {
    errors.push(`${label}: licenseRecord is allowed only for licensed-spotlight`);
  }
  if (
    ['apn-original', 'homage-only', 'editorial-text-original-art'].includes(rights.mode)
  ) {
    if (
      rights.reviewStatus !== 'approved-original-echo' ||
      rights.reviewedAt === null ||
      rights.reviewedBy === null ||
      !Array.isArray(rights.provenance?.reviewEvidence) ||
      rights.provenance.reviewEvidence.length === 0
    ) {
      errors.push(`${label}: resolved original-art mode requires human review evidence`);
    }
  }
  if (/fan-policy-noncommercial/i.test(JSON.stringify(rights))) {
    errors.push(`${label}: fan-policy-noncommercial framing is forbidden`);
  }
  return errors;
}

export function validateCatalogPolicy(policy, label = 'catalog-policy') {
  const errors = [];
  if (!isObject(policy)) return [`${label}: policy must be an object`];
  rejectUnknownProperties(policy, POLICY_PROPERTIES, label, errors);
  if (policy.schemaVersion !== 1) errors.push(`${label}: schemaVersion must equal 1`);
  if (!['warn', 'block'].includes(policy.pendingReview)) {
    errors.push(`${label}: pendingReview must equal warn or block`);
  }
  for (const [key, pattern] of [
    ['pendingReviewWarnIds', PACK_ID_PATTERN],
    ['disabledKillSwitches', PACK_ID_PATTERN],
    ['deniedRuntimeMarks', /\S/],
    ['deniedRuntimeTerms', /\S/],
  ]) {
    const values = policy[key];
    if (
      !Array.isArray(values) ||
      new Set(values).size !== values.length ||
      values.some((value) => typeof value !== 'string' || !pattern.test(value))
    ) {
      errors.push(`${label}: ${key} must be a unique string list`);
    }
  }
  if (
    typeof policy.nonAffiliationNotice !== 'string' ||
    policy.nonAffiliationNotice.length < 20 ||
    !/not affiliated/i.test(policy.nonAffiliationNotice)
  ) {
    errors.push(`${label}: nonAffiliationNotice must be explicit`);
  }
  return errors;
}

export function checkFileBudget(file, budget, label = path.basename(file)) {
  const bytes = fs.statSync(file).size;
  return bytes <= budget ? null : `${label}: ${bytes} bytes exceeds ${budget}`;
}

export function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(root, entry.name);
      return entry.isDirectory() ? walkFiles(full) : [full];
    });
}
