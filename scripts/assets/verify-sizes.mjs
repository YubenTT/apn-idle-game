import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASSET_BUDGETS,
  MOTION_BUDGETS,
  checkFileBudget,
  readJson,
  sha256,
} from './lib.mjs';
import {
  HERO_V3_CLIPS,
  firstPlayableAssetPaths,
  PACK_TEXTURE_KEYS,
} from './first-playable.mjs';
import {
  validateMotionBundle,
  validateMotionClipDescriptor,
  validateMotionSetIndex,
} from '../../js/motion-bundle.js';
import {
  motionAssetIdsForRouteWindow,
  routeWaveIdentityUnion,
  routeWaveWindow,
} from '../../js/wave-roster.js';
import {
  LEGACY_CREATURE_ASSET_PATHS_BY_KIND,
} from '../../js/creatures.js';
import {
  VISUAL_FIDELITY_BUDGETS,
  visualFidelityDecodedLimit,
  visualFidelityEncodedLimit,
} from '../../js/visual-fidelity-v4.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PACK_IMAGE_KEYS = PACK_TEXTURE_KEYS.filter(
  (key) => key !== 'targetData',
);

function orderedPackManifests(rootDir) {
  const packsRoot = path.join(rootDir, 'assets/game-packs');
  if (!fs.existsSync(packsRoot)) return [];
  return fs
    .readdirSync(packsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packsRoot, entry.name, 'pack.json'))
    .filter((file) => fs.existsSync(file))
    .map(readJson)
    .sort(
      (left, right) =>
        (left?.order ?? Number.MAX_SAFE_INTEGER) -
          (right?.order ?? Number.MAX_SAFE_INTEGER) ||
        String(left?.id || '').localeCompare(String(right?.id || '')),
    );
}

function webpDimensions(file) {
  const bytes = fs.readFileSync(file);
  if (
    bytes.length < 30 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw new Error('not a WebP image');
  }

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const kind = bytes.toString('ascii', offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (kind === 'VP8X' && data + 10 <= bytes.length) {
      return {
        width:
          1 +
          bytes[data + 4] +
          (bytes[data + 5] << 8) +
          (bytes[data + 6] << 16),
        height:
          1 +
          bytes[data + 7] +
          (bytes[data + 8] << 8) +
          (bytes[data + 9] << 16),
      };
    }
    if (
      kind === 'VP8L' &&
      data + 5 <= bytes.length &&
      bytes[data] === 0x2f
    ) {
      return {
        width: 1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8),
        height:
          1 +
          ((bytes[data + 2] & 0xc0) >> 6) +
          (bytes[data + 3] << 2) +
          ((bytes[data + 4] & 0x0f) << 10),
      };
    }
    if (
      kind === 'VP8 ' &&
      data + 10 <= bytes.length &&
      bytes[data + 3] === 0x9d &&
      bytes[data + 4] === 0x01 &&
      bytes[data + 5] === 0x2a
    ) {
      return {
        width: bytes.readUInt16LE(data + 6) & 0x3fff,
        height: bytes.readUInt16LE(data + 8) & 0x3fff,
      };
    }
    offset = data + chunkSize + (chunkSize % 2);
  }
  throw new Error('WebP dimensions unavailable');
}

function defaultDecodedImageBytes(file) {
  const dimensions = webpDimensions(file);
  return dimensions.width * dimensions.height * 4;
}

function motionDescriptorDimensions(descriptor) {
  const width = descriptor?.atlas?.width;
  const height = descriptor?.atlas?.height;
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error('descriptor atlas dimensions must be positive integers');
  }
  return { width, height };
}

function budgetError(label, bytes, cap) {
  return `${label}: ${bytes} bytes exceeds ${cap}`;
}

function strictBudgetError(label, bytes, cap) {
  return `${label}: ${bytes} bytes must be below ${cap}`;
}

export function verifySizes(
  manifestFile = path.join(root, 'assets/manifest.json'),
  options = {},
) {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : root;
  const manifest = readJson(manifestFile);
  const explicitPacks = options.packs !== undefined;
  const packs = explicitPacks ? options.packs : orderedPackManifests(rootDir);
  const orderedPacks = [...packs].sort(
    (left, right) =>
      (left?.order ?? Number.MAX_SAFE_INTEGER) -
        (right?.order ?? Number.MAX_SAFE_INTEGER) ||
      String(left?.id || '').localeCompare(String(right?.id || '')),
  );
  const decodedImageBytes =
    options.decodedImageBytes || defaultDecodedImageBytes;
  const errors = [];
  let firstPlayable = 0;
  const grouped = new Map();
  const expectedFirstPlayablePaths =
    orderedPacks.length > 0
      ? firstPlayableAssetPaths(orderedPacks)
      : null;
  const manifestAssetPaths = new Set(
    (manifest.assets || []).map((asset) => asset.path),
  );

  for (const asset of manifest.assets || []) {
    const file = path.join(rootDir, asset.path);
    if (!fs.existsSync(file)) {
      errors.push(`${asset.id}: missing ${asset.path}`);
      continue;
    }
    const bytes = fs.statSync(file).size;
    const packGroup =
      asset.kind === 'propsAndMasks' &&
      asset.path.match(/assets\/game-packs\/([^/]+)\//)?.[1];
    if (packGroup) {
      grouped.set(packGroup, (grouped.get(packGroup) || 0) + bytes);
    }
    const budget =
      asset.budgetBytes ?? (packGroup ? null : ASSET_BUDGETS[asset.kind]);
    if (budget) {
      const error = checkFileBudget(file, budget, asset.id);
      if (error) errors.push(error);
    }
    const expectedFirstPlayable = expectedFirstPlayablePaths?.has(asset.path);
    if (
      expectedFirstPlayablePaths &&
      asset.firstPlayable !== expectedFirstPlayable
    ) {
      errors.push(
        `${asset.path}: firstPlayable must equal ${expectedFirstPlayable}`,
      );
    }
    if (expectedFirstPlayablePaths ? expectedFirstPlayable : asset.firstPlayable) {
      firstPlayable += bytes;
    }
  }
  for (const expectedPath of expectedFirstPlayablePaths || []) {
    if (!manifestAssetPaths.has(expectedPath)) {
      errors.push(
        `${expectedPath}: missing manifest asset record required by first-playable contract`,
      );
    }
  }
  for (const [packId, bytes] of grouped) {
    if (bytes > ASSET_BUDGETS.propsAndMasks) {
      errors.push(
        budgetError(
          `${packId} props+masks`,
          bytes,
          ASSET_BUDGETS.propsAndMasks,
        ),
      );
    }
  }
  if (firstPlayable >= ASSET_BUDGETS.firstPlayable) {
    errors.push(
      strictBudgetError(
        'first-playable',
        firstPlayable,
        ASSET_BUDGETS.firstPlayable,
      ),
    );
  }

  const hot = (manifest.packs || []).filter((pack) => pack.hot === true);
  if (hot.length > 2) errors.push(`hot packs: ${hot.length} exceeds 2`);

  const motionRecords = new Map();
  for (const pack of orderedPacks) {
    for (const [assetId, record] of Object.entries(
      pack?.motion?.characters || {},
    )) {
      const key = `${pack.id}/${assetId}`;
      const isBoss = pack?.boss?.id === assetId;
      const role = isBoss ? 'boss' : 'character';
      const perClipSource =
        record?.sourceFamily === 'authored-semantic-v4' &&
        typeof record?.set === 'string' &&
        record?.clips &&
        typeof record.clips === 'object';
      if (perClipSource) {
        const setFile = path.join(rootDir, record.set);
        if (!fs.existsSync(setFile)) {
          errors.push(`${assetId} motion: missing ${record.set}`);
          continue;
        }
        const setHash = sha256(setFile);
        if (setHash !== record.setSha256) {
          errors.push(
            `${assetId} motion set SHA-256: ${setHash} does not match ${record.setSha256 || 'missing'}`,
          );
        }
        let set;
        try {
          set = readJson(setFile);
        } catch (error) {
          errors.push(`${assetId} motion set: ${error.message}`);
          continue;
        }
        const setErrors = validateMotionSetIndex(set, assetId, {
          role,
          consumerRole: record.consumerScale?.role,
          selectedProfileSha256: record.selectedProfileSha256,
        });
        if (setErrors.length) {
          errors.push(`${assetId} motion set: ${setErrors.join('; ')}`);
          continue;
        }
        let compressed = fs.statSync(setFile).size;
        const decodedCandidates = [];
        for (const [clipName, clipSource] of Object.entries(record.clips)) {
          const descriptorFile = path.join(rootDir, clipSource.descriptor || '');
          const image = path.join(rootDir, clipSource.image || '');
          if (!fs.existsSync(descriptorFile)) {
            errors.push(`${assetId} ${clipName} descriptor: missing ${clipSource.descriptor}`);
            continue;
          }
          if (!fs.existsSync(image)) {
            errors.push(`${assetId} ${clipName} image: missing ${clipSource.image}`);
            continue;
          }
          const descriptorHash = sha256(descriptorFile);
          if (descriptorHash !== clipSource.descriptorSha256) {
            errors.push(
              `${assetId} ${clipName} descriptor SHA-256: ${descriptorHash} does not match ${clipSource.descriptorSha256 || 'missing'}`,
            );
          }
          let descriptor;
          try {
            descriptor = readJson(descriptorFile);
          } catch (error) {
            errors.push(`${assetId} ${clipName} descriptor: ${error.message}`);
            continue;
          }
          const descriptorErrors = validateMotionClipDescriptor(
            descriptor,
            clipName,
            set,
            {
              role,
              consumerRole: record.consumerScale?.role,
              descriptorSha256: clipSource.descriptorSha256,
              imageSha256: clipSource.imageSha256,
              selectedProfileSha256: record.selectedProfileSha256,
            },
          );
          if (descriptorErrors.length) {
            errors.push(
              `${assetId} ${clipName} descriptor: ${descriptorErrors.join('; ')}`,
            );
            continue;
          }
          const atlasHash = sha256(image);
          if (atlasHash !== descriptor.atlas.sha256) {
            errors.push(
              `${assetId} ${clipName} atlas SHA-256: ${atlasHash} does not match ${descriptor.atlas.sha256 || 'missing'}`,
            );
          }
          let descriptorDimensions;
          try {
            descriptorDimensions = motionDescriptorDimensions(descriptor);
          } catch (error) {
            errors.push(`${assetId} ${clipName} decoded: ${error.message}`);
            continue;
          }
          let imageDimensions;
          try {
            imageDimensions = webpDimensions(image);
          } catch (error) {
            errors.push(`${assetId} ${clipName} WebP: ${error.message}`);
            continue;
          }
          if (
            descriptorDimensions.width !== imageDimensions.width ||
            descriptorDimensions.height !== imageDimensions.height
          ) {
            errors.push(
              `${assetId} ${clipName} dimensions: descriptor ${descriptorDimensions.width}x${descriptorDimensions.height} does not match WebP ${imageDimensions.width}x${imageDimensions.height}`,
            );
          }
          const decoded = imageDimensions.width * imageDimensions.height * 4;
          const clipCompressed =
            fs.statSync(image).size + fs.statSync(descriptorFile).size;
          const compressedCap = visualFidelityEncodedLimit(role);
          const decodedCap = visualFidelityDecodedLimit(role);
          if (clipCompressed > compressedCap) {
            errors.push(
              budgetError(
                `${assetId} ${clipName} motion compressed`,
                clipCompressed,
                compressedCap,
              ),
            );
          }
          if (decoded > decodedCap) {
            errors.push(
              budgetError(
                `${assetId} ${clipName} motion decoded`,
                decoded,
                decodedCap,
              ),
            );
          }
          compressed += clipCompressed;
          decodedCandidates.push(decoded);
        }
        const decoded = decodedCandidates
          .sort((left, right) => right - left)
          .slice(0, 2)
          .reduce((sum, value) => sum + value, 0);
        motionRecords.set(key, { compressed, decoded });
        continue;
      }
      const image = path.join(rootDir, record.image || '');
      const descriptorFile = path.join(rootDir, record.descriptor || '');
      if (!fs.existsSync(image)) {
        errors.push(`${assetId} motion: missing ${record.image}`);
        continue;
      }
      if (!fs.existsSync(descriptorFile)) {
        errors.push(`${assetId} motion: missing ${record.descriptor}`);
        continue;
      }

      const descriptorHash = sha256(descriptorFile);
      if (descriptorHash !== record.descriptorSha256) {
        errors.push(
          `${assetId} motion descriptor SHA-256: ${descriptorHash} does not match ${record.descriptorSha256 || 'missing'}`,
        );
      }

      let descriptor;
      try {
        descriptor = readJson(descriptorFile);
      } catch (error) {
        errors.push(`${assetId} motion descriptor: ${error.message}`);
        continue;
      }
      const descriptorErrors = validateMotionBundle(descriptor, assetId, {
        role,
      });
      if (descriptorErrors.length) {
        errors.push(
          `${assetId} motion descriptor: ${descriptorErrors.join('; ')}`,
        );
        continue;
      }
      const atlasHash = sha256(image);
      if (atlasHash !== descriptor.atlas.sha256) {
        errors.push(
          `${assetId} motion atlas SHA-256: ${atlasHash} does not match ${descriptor.atlas.sha256 || 'missing'}`,
        );
      }
      let descriptorDimensions;
      try {
        descriptorDimensions = motionDescriptorDimensions(descriptor);
      } catch (error) {
        errors.push(`${assetId} motion decoded: ${error.message}`);
        continue;
      }
      let imageDimensions;
      try {
        imageDimensions = webpDimensions(image);
      } catch (error) {
        errors.push(`${assetId} motion WebP: ${error.message}`);
        continue;
      }
      if (
        descriptorDimensions.width !== imageDimensions.width ||
        descriptorDimensions.height !== imageDimensions.height
      ) {
        errors.push(
          `${assetId} motion dimensions: descriptor ${descriptorDimensions.width}x${descriptorDimensions.height} does not match WebP ${imageDimensions.width}x${imageDimensions.height}`,
        );
      }
      const decoded =
        imageDimensions.width * imageDimensions.height * 4;
      const compressed =
        fs.statSync(image).size + fs.statSync(descriptorFile).size;
      const compressedCap = isBoss
        ? MOTION_BUDGETS.bossCompressed
        : MOTION_BUDGETS.commonCompressed;
      const decodedCap = isBoss
        ? MOTION_BUDGETS.bossDecoded
        : MOTION_BUDGETS.commonDecoded;
      if (compressed > compressedCap) {
        errors.push(
          budgetError(`${assetId} motion compressed`, compressed, compressedCap),
        );
      }
      if (decoded > decodedCap) {
        errors.push(
          budgetError(`${assetId} motion decoded`, decoded, decodedCap),
        );
      }
      motionRecords.set(key, { compressed, decoded });
    }
  }

  let heroCompressed = 0;
  let heroNewMotionCompressed = 0;
  let heroDecoded = 0;
  const heroSet = path.join(rootDir, 'assets/mascot/v3/set.json');
  if (fs.existsSync(heroSet)) {
    heroNewMotionCompressed += fs.statSync(heroSet).size;
  }
  for (const clip of HERO_V3_CLIPS) {
    const image = path.join(rootDir, `assets/mascot/v3/${clip}.webp`);
    const descriptor = path.join(rootDir, `assets/mascot/v3/${clip}.json`);
    if (fs.existsSync(image)) {
      const bytes = fs.statSync(image).size;
      heroCompressed += bytes;
      heroNewMotionCompressed += bytes;
      try {
        heroDecoded += decodedImageBytes(image);
      } catch (error) {
        errors.push(`Hero ${clip} texture: ${error.message}`);
      }
    }
    if (fs.existsSync(descriptor)) {
      heroNewMotionCompressed += fs.statSync(descriptor).size;
    }
  }
  if (heroCompressed > MOTION_BUDGETS.heroCompressed) {
    errors.push(
      budgetError(
        'Hero motion compressed',
        heroCompressed,
        MOTION_BUDGETS.heroCompressed,
      ),
    );
  }

  let legacyCreatureDecoded = 0;
  for (const [kind, assetPaths] of Object.entries(
    LEGACY_CREATURE_ASSET_PATHS_BY_KIND,
  )) {
    let ownerDecoded = 0;
    for (const assetPath of assetPaths) {
      if (!assetPath.endsWith('.webp')) continue;
      const file = path.join(rootDir, assetPath);
      if (!fs.existsSync(file)) continue;
      try {
        ownerDecoded += decodedImageBytes(file);
      } catch (error) {
        errors.push(`${kind} legacy creature texture: ${error.message}`);
      }
    }
    legacyCreatureDecoded = Math.max(legacyCreatureDecoded, ownerDecoded);
  }

  const firstPack = orderedPacks[0];
  const visualFidelityMotion =
    orderedPacks.some((pack) =>
      Object.values(pack?.motion?.characters || {}).some(
        (record) => record?.sourceFamily === 'authored-semantic-v4',
      ),
    );
  const motionBudgetCaps = visualFidelityMotion
    ? {
        newMotionCompressed: VISUAL_FIDELITY_BUDGETS.newMotionCompressedBytes,
        waveDecoded: VISUAL_FIDELITY_BUDGETS.maxWaveDecodedBytes,
        hotTextures: VISUAL_FIDELITY_BUDGETS.hotTexturesBytes,
      }
    : {
        newMotionCompressed: MOTION_BUDGETS.newMotionCompressed,
        waveDecoded: MOTION_BUDGETS.waveDecoded,
        hotTextures: MOTION_BUDGETS.hotTextures,
      };
  let newMotionCompressed = heroNewMotionCompressed;
  for (const assetId of Object.keys(firstPack?.motion?.characters || {})) {
    newMotionCompressed +=
      motionRecords.get(`${firstPack.id}/${assetId}`)?.compressed || 0;
  }
  if (newMotionCompressed > motionBudgetCaps.newMotionCompressed) {
    errors.push(
      budgetError(
        'new motion compressed',
        newMotionCompressed,
        motionBudgetCaps.newMotionCompressed,
      ),
    );
  }

  const packTextureBytesById = new Map();
  for (const pack of orderedPacks) {
    let decoded = 0;
    for (const key of PACK_IMAGE_KEYS) {
      const assetPath = pack?.assets?.[key];
      if (!assetPath) continue;
      const file = path.join(rootDir, assetPath);
      if (!fs.existsSync(file)) {
        errors.push(`${pack.id} ${key} texture: missing ${assetPath}`);
        continue;
      }
      try {
        decoded += decodedImageBytes(file);
      } catch (error) {
        errors.push(`${pack.id} ${key} texture: ${error.message}`);
      }
    }
    packTextureBytesById.set(pack.id, decoded);
  }

  let maxWaveDecoded = 0;
  let maxHotTextures = heroDecoded + legacyCreatureDecoded;
  const checkRouteWindow = (route) => {
    const [current, next] = routeWaveWindow(route, orderedPacks);
    const decoded = [...motionAssetIdsForRouteWindow(route, orderedPacks)].reduce(
      (sum, key) =>
        sum + (motionRecords.get(key)?.decoded || 0),
      0,
    );
    maxWaveDecoded = Math.max(maxWaveDecoded, decoded);
    if (decoded > motionBudgetCaps.waveDecoded) {
      const label =
        current.pack?.id === next.pack?.id && current.wave < 10
          ? `${current.pack.id} waves ${current.wave}+${next.wave} motion decoded`
          : `${current.pack?.id || 'none'} wave 10 + ${next.pack?.id || 'none'} wave 1 motion decoded`;
      errors.push(
        budgetError(label, decoded, motionBudgetCaps.waveDecoded),
      );
    }
    const routePackIds = new Set(
      [current.pack?.id, next.pack?.id].filter(Boolean),
    );
    const routePackTextures = [...routePackIds].reduce(
      (sum, packId) => sum + (packTextureBytesById.get(packId) || 0),
      0,
    );
    const requiresLegacyCreature = routeWaveIdentityUnion(
      route,
      orderedPacks,
    ).some(({ packId, assetId }) => !motionRecords.has(`${packId}/${assetId}`));
    const routeHotTextures =
      heroDecoded +
      routePackTextures +
      decoded +
      (requiresLegacyCreature ? legacyCreatureDecoded : 0);
    maxHotTextures = Math.max(maxHotTextures, routeHotTextures);
  };

  const cleanZoneCount = orderedPacks.length * 10;
  for (let zone = 0; zone < cleanZoneCount; zone += 1) {
    checkRouteWindow({ zone });
  }

  const scheduledBoundaryZone = 209;
  const revisitBoundaryZone = 219;
  const seenPackIds = orderedPacks.map((pack) => pack.id);
  for (const currentPack of orderedPacks) {
    for (const nextPack of orderedPacks) {
      checkRouteWindow({
        zone: scheduledBoundaryZone,
        deck:
          currentPack.id === nextPack.id
            ? [currentPack.id]
            : [currentPack.id, nextPack.id],
        seenPackIds,
      });
      checkRouteWindow({
        zone: revisitBoundaryZone,
        deck:
          currentPack.id === nextPack.id
            ? [currentPack.id]
            : [currentPack.id, nextPack.id],
        seenPackIds,
      });
    }
  }
  if (orderedPacks.length > 0) {
    checkRouteWindow({
      zone: revisitBoundaryZone,
      seenPackIds,
      lastSeenByPack: Object.fromEntries(
        orderedPacks.map((pack, index) => [pack.id, index * 10]),
      ),
    });
  }

  const hotTextures = maxHotTextures;
  if (hotTextures >= motionBudgetCaps.hotTextures) {
    errors.push(
      strictBudgetError(
        'hot textures',
        hotTextures,
        motionBudgetCaps.hotTextures,
      ),
    );
  }

  return {
    errors,
    firstPlayable,
    hot: hot.map((pack) => pack.id),
    heroCompressed,
    legacyCreatureDecoded,
    newMotionCompressed,
    maxWaveDecoded,
    hotTextures,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = verifySizes(
    process.argv[2] ? path.resolve(process.argv[2]) : undefined,
  );
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  console.log(
    `SIZES PASS first-playable=${result.firstPlayable} hot=${result.hot.length}`,
  );
}
