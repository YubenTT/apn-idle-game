import { createHash } from 'node:crypto';
import fs from 'node:fs';

import {
  MAX_DESCRIPTOR_BYTES,
  createMotionStore,
  getMotionClipRecord,
  getMotionRecord,
  motionDiagnostics,
  pruneMotionClipResidency,
  releaseColdMotion,
  warmMotionClip,
  warmMotionSet,
} from '../js/motion-store.js';
import * as motionStoreRuntime from '../js/motion-store.js';

const encoder = new TextEncoder();

const assert = (condition, message) => {
  if (!condition) throw new Error(`Motion store: ${message}`);
  console.log(`OK ${message}`);
};

const sha256Hex = (bytes) =>
  createHash('sha256').update(Buffer.from(bytes)).digest('hex');

const readJson = (name) =>
  JSON.parse(
    fs.readFileSync(
      new URL(`./fixtures/motion-bundle/${name}`, import.meta.url),
      'utf8',
    ),
  );

function createClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(fn, delay) {
      const id = nextId++;
      timers.set(id, { fn, at: now + delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    tick(ms) {
      now += ms;
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= now)
        .sort((left, right) => left[1].at - right[1].at);
      for (const [id, timer] of due) {
        timers.delete(id);
        timer.fn();
      }
    },
    pendingCount() {
      return timers.size;
    },
  };
}

class FakeAbortSignal {
  constructor() {
    this.aborted = false;
    this.listeners = new Set();
  }

  addEventListener(type, listener) {
    if (type === 'abort') this.listeners.add(listener);
  }

  removeEventListener(type, listener) {
    if (type === 'abort') this.listeners.delete(listener);
  }

  dispatchAbort() {
    if (this.aborted) return;
    this.aborted = true;
    for (const listener of this.listeners) listener();
  }
}

class FakeAbortController {
  constructor() {
    this.signal = new FakeAbortSignal();
  }

  abort() {
    this.signal.dispatchAbort();
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeBitmap(width, height) {
  return {
    width,
    height,
    closed: 0,
    close() {
      this.closed += 1;
    },
  };
}

function buildPack(assetIds, options = {}) {
  const valid = readJson('valid.json');
  const characters = {};
  const descriptorBytesById = new Map();
  const imageBytesById = new Map();
  const descriptors = new Map();
  for (const assetId of assetIds) {
    const descriptor = structuredClone(valid);
    descriptor.assetId = assetId;
    if (assetId === options.bossId) {
      descriptor.atlas.height = Math.max(descriptor.atlas.height, 672);
      descriptor.clips.broken = {
        playback: 'loop',
        fps: 8,
        frames: Array.from({ length: 8 }, (_, index) => ({
          x: index * 96,
          y: 560,
          width: 96,
          height: 112,
        })),
      };
    }
    if (options.preview) {
      descriptor.grammar = 'gaf2d-motion-preview-v1';
      descriptor.authority = 'unapproved_preview';
      descriptor.presentation = {
        schemaVersion: 1,
        scaleContract: 'visible-body',
        reference: {
          clip: 'idle',
          frameIndex: 0,
          sourceSha256: 'd'.repeat(64),
        },
        visibleBounds: { x: 8, y: 4, width: 64, height: 88 },
        motionBounds: { x: 2, y: 1, width: 78, height: 96 },
      };
      descriptor.previewLineage = {
        candidateId: `${assetId}-authored-semantic-v2`,
        candidateSha256: 'a'.repeat(64),
        qaSummarySha256: 'b'.repeat(64),
        batchSummarySha256: 'c'.repeat(64),
        sourceManifestVersion: 3,
      };
      delete descriptor.lineage;
    }
    descriptor.atlas.sha256 = '0'.repeat(64);
    const imageBytes = encoder.encode(`atlas:${assetId}`);
    descriptor.atlas.sha256 = sha256Hex(imageBytes);
    const descriptorBytes = encoder.encode(JSON.stringify(descriptor));
    const descriptorSha256 = sha256Hex(descriptorBytes);
    characters[assetId] = {
      image: `assets/game-packs/valorant/characters/${assetId}/motion.webp`,
      descriptor: `assets/game-packs/valorant/characters/${assetId}/motion.json`,
      descriptorSha256,
      ...(options.preview ? { authority: 'unapproved_preview' } : {}),
    };
    descriptorBytesById.set(assetId, descriptorBytes);
    imageBytesById.set(assetId, imageBytes);
    descriptors.set(assetId, descriptor);
  }
  return {
    pack: {
      id: 'valorant',
      boss: options.bossId ? { id: options.bossId } : undefined,
      motion: {
        grammar: 'gaf2d-motion-bundle-v1',
        characters,
      },
    },
    descriptorBytesById,
    imageBytesById,
    descriptors,
  };
}

function buildSmoothPack(assetIds, options = {}) {
  const contracts = {
    character: {
      idle: [30, 30, 'loop'],
      advance: [24, 30, 'loop'],
      engaged: [15, 30, 'loop'],
      hit: [8, 32, 'progress'],
      death: [30, 30, 'progress'],
    },
    boss: {
      idle: [30, 30, 'loop'],
      advance: [24, 30, 'loop'],
      engaged: [15, 30, 'loop'],
      hit: [8, 32, 'progress'],
      death: [30, 30, 'progress'],
      broken: [30, 30, 'loop'],
    },
  };
  const characters = {};
  const setBytesById = new Map();
  const clipBytesById = new Map();
  const imageBytesByClip = new Map();
  const sets = new Map();
  for (const assetId of assetIds) {
    const role = assetId === options.bossId ? 'boss' : 'character';
    const roleContract = contracts[role];
    const visualFidelity =
      options.sourceFamily === 'authored-semantic-v4';
    const consumerRole =
      options.consumerRoles?.[assetId] ??
      (role === 'boss' ? 'boss' : 'standard');
    const v4RoleFacts = {
      standard: {
        css: 72,
        runtime: 256,
        visible: 176,
        trim: { x: 32, y: 16, width: 192, height: 224 },
        columns: 8,
      },
      elite: {
        css: 84,
        runtime: 256,
        visible: 184,
        trim: { x: 32, y: 16, width: 192, height: 224 },
        columns: 8,
      },
      boss: {
        css: 112,
        runtime: 320,
        visible: 256,
        trim: { x: 40, y: 20, width: 240, height: 280 },
        columns: 6,
      },
    };
    const roleFacts = visualFidelity ? v4RoleFacts[consumerRole] : null;
    const frameSize = visualFidelity
      ? { width: roleFacts.runtime, height: roleFacts.runtime }
      : { width: 128, height: 128 };
    const trim = visualFidelity
      ? structuredClone(roleFacts.trim)
      : { x: 16, y: 8, width: 96, height: 112 };
    const consumerScale = visualFidelity
      ? {
          grammar: 'gaf2d-consumer-scale-v4',
          role: consumerRole,
          maximumCssBodyHeight: roleFacts.css,
          maximumDpr: 2,
          displayedDevicePixels: roleFacts.css * 2,
          runtimeCanvasClass: roleFacts.runtime,
          sourceVisiblePixels: roleFacts.visible,
          scaleRatio: {
            numerator: roleFacts.css * 2,
            denominator: roleFacts.visible,
          },
        }
      : null;
    const profileSha256 = options.selectedProfileSha256 ?? '4'.repeat(64);
    const v4Toolchain = {
      grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
      compositor: {
        name: 'HashBoundCopy',
        version: 'selected-webp-v1',
      },
      encoder: {
        name: 'cwebp',
        version: '1.6.0',
        arguments: ['-quiet', '-exact', '-lossless', '-q', '100', '-m', '6'],
        profileSha256,
      },
      operations: [
        'validate:v4-selected-webp:hash-bound-source',
        'validate:v4-selected-webp:exact-copy-byte-proof',
        'copy:v4-selected-webp:exact-media-bytes',
      ],
      profileSha256,
    };
    const set = {
      grammar: 'gaf2d-motion-set-index-v2',
      authority: 'unapproved_preview',
      status: 'human_review_required',
      sourceFamily: visualFidelity
        ? 'authored-semantic-v4'
        : 'authored-semantic-v3',
      assetId,
      role,
      frameSize,
      trim,
      pivot: { x: 0.5, y: 1 },
      presentation: {
        schemaVersion: 1,
        scaleContract: 'visible-body',
        reference: {
          clip: 'idle',
          frameIndex: 0,
          sourceSha256: '1'.repeat(64),
        },
        visibleBounds: visualFidelity
          ? {
              x: 16,
              y: 8,
              width: trim.width - 32,
              height: roleFacts.visible,
            }
          : { x: 8, y: 4, width: 64, height: 88 },
        motionBounds: visualFidelity
          ? {
              x: 4,
              y: 2,
              width: trim.width - 8,
              height: trim.height - 4,
            }
          : { x: 2, y: 1, width: 78, height: 96 },
      },
      clips: {},
      ...(visualFidelity
        ? { consumerScale: structuredClone(consumerScale) }
        : {}),
      previewLineage: {
        candidateId: `${assetId}-authored-semantic-v3`,
        candidateSha256: '2'.repeat(64),
        temporalEvidenceSha256: '3'.repeat(64),
        qaSummarySha256: '4'.repeat(64),
        batchSummarySha256: '5'.repeat(64),
        sourceManifestVersion: 4,
      },
      ...(visualFidelity
        ? {
            lineage: {
              sourceBatchSha256: '6'.repeat(64),
              derivativeSetSha256: '7'.repeat(64),
              masterSetSha256: '8'.repeat(64),
              selectedProfileSha256: profileSha256,
              v3LineageSha256: '9'.repeat(64),
            },
            toolchain: v4Toolchain,
          }
        : {
            toolchain: {
              grammar: 'apn-gaf2d-preview-matrix-toolchain-v1',
              compositor: { name: 'ImageMagick', version: '7.1.2-13' },
              encoder: {
                name: 'cwebp',
                version: '1.6.0',
                arguments: ['-exact', '-q', '90'],
              },
              operations: [
                'crop:normalized-png:shared-trim:repage:png32',
                'resize:lanczos:shared-scale:exact-cell:png32',
                'montage:row-major:bounded-matrix:shared-cell:no-gap:transparent:alpha-on:png-color-type-6',
              ],
              profileSha256:
                '71f50b2378a4a588d9e49fb2d29700becb2b4a5ae37078a2af3280284eaa8013',
            },
          }),
    };
    const clipBytes = new Map();
    const imageBytes = new Map();
    for (const [clipName, [count, fps, playback]] of Object.entries(
      roleContract,
    )) {
      const clipImageBytes = encoder.encode(`smooth:${assetId}:${clipName}`);
      const clipImageSha256 = sha256Hex(clipImageBytes);
      const descriptor = {
        grammar: 'gaf2d-motion-clip-v2',
        authority: 'unapproved_preview',
        sourceFamily: visualFidelity
          ? 'authored-semantic-v4'
          : 'authored-semantic-v3',
        assetId,
        name: clipName,
        playback,
        fps,
        sourceFps: 12,
        cadenceProfile: 'continuous_30',
        authoringMethod: 'deterministic_part_rig',
        interpolationMethod: 'deterministic_part_transforms',
        holds: playback === 'progress'
          ? [{ startIndex: count - 2, endIndex: count - 1, reason: 'terminal' }]
          : [],
        markers: playback === 'loop'
          ? {
              neutral: 0,
              maximum_excursion: Math.floor(count / 2),
              return: count - 1,
            }
          : {
              anticipation: 0,
              contact: Math.floor(count / 2),
              terminal: count - 1,
            },
        frames: Array.from({ length: count }, (_, index) => {
          const frameSha256 = String(index + 1).padStart(64, '0');
          const poseSha256 =
            playback === 'progress' && index === count - 1
              ? String(count - 1).padStart(64, '0')
              : frameSha256;
          return {
            x: (index % (roleFacts?.columns ?? 10)) * trim.width,
            y: Math.floor(index / (roleFacts?.columns ?? 10)) * trim.height,
            width: trim.width,
            height: trim.height,
            sourceSha256: frameSha256,
            bodyPoseSha256: poseSha256,
          };
        }),
        atlas: {
          width: (roleFacts?.columns ?? 10) * trim.width,
          height:
            Math.ceil(count / (roleFacts?.columns ?? 10)) * trim.height,
          bytes: clipImageBytes.byteLength,
          sha256: clipImageSha256,
        },
        encoder: {
          name: 'cwebp',
          version: '1.6.0',
          arguments: visualFidelity
            ? ['-quiet', '-exact', '-lossless', '-q', '100', '-m', '6']
            : ['-exact', '-q', '90'],
          ...(visualFidelity ? { profileSha256 } : {}),
        },
        ...(visualFidelity
          ? {
              trim: structuredClone(trim),
              pivot: { x: 0.5, y: 1 },
              presentation: {
                ...structuredClone(set.presentation),
                reference: {
                  clip: clipName,
                  frameIndex: 0,
                  sourceSha256: String(1).padStart(64, '0'),
                },
              },
              lineage: {
                sourceBatchSha256: set.lineage.sourceBatchSha256,
                derivativeSetSha256: set.lineage.derivativeSetSha256,
                sourceDescriptorSha256: 'a'.repeat(64),
                sourceEvidenceSha256: 'b'.repeat(64),
                sourceMediaSha256: clipImageSha256,
                masterInventorySha256: 'c'.repeat(64),
                masterSetSha256: set.lineage.masterSetSha256,
                selectedProfileSha256: profileSha256,
                v3LineageSha256: set.lineage.v3LineageSha256,
              },
            }
          : {}),
      };
      const descriptorBytes = encoder.encode(JSON.stringify(descriptor));
      const descriptorSha256 = sha256Hex(descriptorBytes);
      set.clips[clipName] = {
        descriptor: `${clipName}.json`,
        descriptorSha256,
        image: `${clipName}.webp`,
        imageSha256: clipImageSha256,
      };
      clipBytes.set(clipName, descriptorBytes);
      imageBytes.set(clipName, clipImageBytes);
    }
    const setBytes = encoder.encode(JSON.stringify(set));
    const setSha256 = sha256Hex(setBytes);
    characters[assetId] = {
      authority: 'unapproved_preview',
      role,
      basePath: `assets/game-packs/valorant/characters/${assetId}/`,
      set: `assets/game-packs/valorant/characters/${assetId}/set.json`,
      setSha256,
      clips: Object.fromEntries(
        Object.entries(set.clips).map(([clipName, record]) => [
          clipName,
          {
            descriptor: `assets/game-packs/valorant/characters/${assetId}/${record.descriptor}`,
            descriptorSha256: record.descriptorSha256,
            image: `assets/game-packs/valorant/characters/${assetId}/${record.image}`,
            imageSha256: record.imageSha256,
          },
        ]),
      ),
      ...(visualFidelity
        ? {
            sourceFamily: 'authored-semantic-v4',
            consumerScale: structuredClone(consumerScale),
            selectedProfileSha256: profileSha256,
          }
        : {}),
    };
    setBytesById.set(assetId, setBytes);
    clipBytesById.set(assetId, clipBytes);
    imageBytesByClip.set(assetId, imageBytes);
    sets.set(assetId, set);
  }
  return {
    pack: {
      id: 'valorant',
      boss: options.bossId ? { id: options.bossId } : undefined,
      motion: {
        grammar: 'gaf2d-motion-bundle-v1',
        characters,
      },
    },
    setBytesById,
    clipBytesById,
    imageBytesByClip,
    sets,
  };
}

function createHarness(options = {}) {
  const assetIds = options.assetIds || [
    'entry-runner',
    'veil-operator',
    'signal-hunter',
    'site-sentinel',
    'protocol-courier',
  ];
  const fixture = buildPack(assetIds, options);
  const clock = createClock();
  const fetchCalls = [];
  const counts = { json: 0, image: 0 };
  const aborts = [];
  const bitmapById = new Map();
  const pendingFetches = new Map();
  const pendingDecodes = new Map();
  const descriptorBytesByUrl = new Map();
  const imageBytesByUrl = new Map();
  const urlToAssetId = new Map();
  let parseCount = 0;

  for (const [assetId, record] of Object.entries(fixture.pack.motion.characters)) {
    const descriptorBytes =
      options.overrideDescriptorBytes?.(assetId, fixture.descriptorBytesById.get(assetId)) ||
      fixture.descriptorBytesById.get(assetId);
    const descriptorSha256 =
      options.overrideDescriptorSha256?.(assetId, descriptorBytes) ||
      record.descriptorSha256;
    record.descriptorSha256 = descriptorSha256;
    const descriptorUrl = `${record.descriptor}?sha256=${descriptorSha256}`;
    const imageUrl = `${record.image}?sha256=${fixture.descriptors.get(assetId).atlas.sha256}`;
    descriptorBytesByUrl.set(
      descriptorUrl,
      descriptorBytes,
    );
    imageBytesByUrl.set(
      imageUrl,
      options.overrideImageBytes?.(assetId, fixture.imageBytesById.get(assetId)) ||
        fixture.imageBytesById.get(assetId),
    );
    urlToAssetId.set(descriptorUrl, assetId);
    urlToAssetId.set(imageUrl, assetId);
  }

  const fetchImpl = async (url, requestOptions = {}) => {
    fetchCalls.push(url);
    const assetId = urlToAssetId.get(url) || 'unknown';
    const signal = requestOptions.signal;
    if (url.endsWith('.json') || url.includes('.json?')) counts.json += 1;
    if (url.endsWith('.webp') || url.includes('.webp?')) counts.image += 1;
    if (signal) {
      signal.addEventListener('abort', () => aborts.push(url));
    }
    if (requestOptions.signal?.aborted) {
      const error = new Error(`aborted ${url}`);
      error.name = 'AbortError';
      throw error;
    }
    if (options.deferFetchFor?.has?.(assetId)) {
      options.deferFetchFor.delete(assetId);
      const gate = deferred();
      pendingFetches.set(assetId, gate);
      if (!options.ignoreAbortFor?.has?.(assetId)) {
        requestOptions.signal?.addEventListener('abort', () => {
          const error = new Error(`aborted ${url}`);
          error.name = 'AbortError';
          gate.reject(error);
        });
      }
      return gate.promise;
    }
    const bytes = descriptorBytesByUrl.get(url) || imageBytesByUrl.get(url);
    if (bytes == null) {
      return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    }
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  };

  const decodeImage = async (bytes, context = {}) => {
    const assetId = context.assetId;
    const bitmap = options.makeBitmap?.(assetId, bytes, context) ||
      makeBitmap(
        options.widthForAsset?.(assetId) || fixture.descriptors.get(assetId).atlas.width,
        options.heightForAsset?.(assetId) || fixture.descriptors.get(assetId).atlas.height,
      );
    bitmapById.set(assetId, bitmap);
    if (options.deferDecodeFor?.has?.(assetId)) {
      options.deferDecodeFor.delete(assetId);
      const gate = deferred();
      pendingDecodes.set(assetId, { gate, bitmap });
      if (!options.ignoreAbortFor?.has?.(assetId)) {
        context.signal?.addEventListener('abort', () => {
          const error = new Error(`aborted decode ${assetId}`);
          error.name = 'AbortError';
          gate.reject(error);
        });
      }
      await gate.promise;
    }
    return bitmap;
  };

  const store = createMotionStore({
    fetch: options.fetch || fetchImpl,
    decodeImage,
    hashBytes: async (bytes) => sha256Hex(bytes),
    parseJson: (text) => {
      parseCount += 1;
      return JSON.parse(text);
    },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    AbortController: FakeAbortController,
    deadlineMs: options.deadlineMs,
    allowUnapprovedPreview: options.allowUnapprovedPreview,
  });

  return {
    store,
    pack: fixture.pack,
    counts,
    clock,
    fetchCalls,
    aborts,
    bitmapById,
    pendingFetches,
    pendingDecodes,
    parseCount: () => parseCount,
  };
}

function createSmoothHarness(options = {}) {
  const assetIds = options.assetIds || ['entry-runner'];
  const fixture = buildSmoothPack(assetIds, options);
  const clock = createClock();
  const fetchCalls = [];
  const counts = { json: 0, image: 0 };
  const bitmapByUrl = new Map();
  const decodeCalls = [];
  const setBytesByUrl = new Map();
  const clipBytesByUrl = new Map();
  const imageBytesByUrl = new Map();
  const clipDescriptorByAssetClip = new Map();
  for (const [assetId, record] of Object.entries(fixture.pack.motion.characters)) {
    const setBytes =
      options.overrideSetBytes?.(assetId, fixture.setBytesById.get(assetId)) ||
      fixture.setBytesById.get(assetId);
    let clipIndex =
      options.overrideClipSetIndex?.(assetId, fixture.sets.get(assetId)) ||
      JSON.parse(Buffer.from(setBytes).toString('utf8'));
    if (!clipIndex || typeof clipIndex !== 'object') {
      clipIndex = fixture.sets.get(assetId);
    }
    const setSha256 = sha256Hex(setBytes);
    record.setSha256 = setSha256;
    record.clips = Object.fromEntries(
      Object.entries(clipIndex.clips).map(([clipName, clipRecord]) => [
        clipName,
        {
          descriptor: `assets/game-packs/valorant/characters/${assetId}/${clipRecord.descriptor}`,
          descriptorSha256: clipRecord.descriptorSha256,
          image: `assets/game-packs/valorant/characters/${assetId}/${clipRecord.image}`,
          imageSha256: clipRecord.imageSha256,
        },
      ]),
    );
    setBytesByUrl.set(
      `${record.set}?sha256=${setSha256}`,
      setBytes,
    );
    for (const [clipName, clipRecord] of Object.entries(record.clips)) {
      const clipBytes =
        options.overrideClipBytes?.(
          assetId,
          clipName,
          fixture.clipBytesById.get(assetId).get(clipName),
          clipRecord,
        ) || fixture.clipBytesById.get(assetId).get(clipName);
      clipDescriptorByAssetClip.set(
        `${assetId}/${clipName}`,
        JSON.parse(Buffer.from(clipBytes).toString('utf8')),
      );
      clipBytesByUrl.set(
        `${clipRecord.descriptor}?sha256=${clipRecord.descriptorSha256}`,
        clipBytes,
      );
      imageBytesByUrl.set(
        `${clipRecord.image}?sha256=${clipRecord.imageSha256}`,
        options.overrideClipImageBytes?.(
          assetId,
          clipName,
          fixture.imageBytesByClip.get(assetId).get(clipName),
          clipRecord,
        ) || fixture.imageBytesByClip.get(assetId).get(clipName),
      );
    }
  }
  const fetchImpl = async (url) => {
    fetchCalls.push(url);
    if (url.endsWith('.json') || url.includes('.json?')) counts.json += 1;
    if (url.endsWith('.webp') || url.includes('.webp?')) counts.image += 1;
    const bytes =
      setBytesByUrl.get(url) ||
      clipBytesByUrl.get(url) ||
      imageBytesByUrl.get(url);
    if (bytes == null) {
      return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    }
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  };
  const decodeImage = async (bytes, meta = {}) => {
    const key = meta.url || 'unknown';
    decodeCalls.push(meta);
    const descriptor = clipDescriptorByAssetClip.get(
      `${meta.assetId}/${meta.clipName}`,
    );
    const bitmap = makeBitmap(
      descriptor?.atlas?.width || 960,
      descriptor?.atlas?.height || 336,
    );
    bitmapByUrl.set(key, bitmap);
    return bitmap;
  };
  return {
    pack: fixture.pack,
    counts,
    fetchCalls,
    bitmapByUrl,
    decodeCalls,
    store: createMotionStore({
      allowUnapprovedPreview: true,
      fetch: fetchImpl,
      hashBytes: async (bytes) => sha256Hex(bytes),
      decodeImage,
      parseJson: JSON.parse,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      AbortController: FakeAbortController,
    }),
  };
}

{
  const harness = createHarness({ preview: true });
  const [record] = await warmMotionSet(
    harness.store,
    harness.pack,
    ['entry-runner'],
  );
  assert(
    record.status === 'failed' &&
      record.error?.reason === 'descriptor',
    'preview descriptor fails closed when the motion store lacks explicit opt-in',
  );
}

{
  const harness = createHarness({
    preview: true,
    allowUnapprovedPreview: true,
  });
  const [record] = await warmMotionSet(
    harness.store,
    harness.pack,
    ['entry-runner'],
  );
  assert(
    record.status === 'ready' &&
      record.descriptor.authority === 'unapproved_preview',
    'preview descriptor loads only when source authority and store opt-in agree',
  );
}

{
  const harness = createHarness({
    preview: true,
    allowUnapprovedPreview: true,
  });
  delete harness.pack.motion.characters['entry-runner'].authority;
  const [record] = await warmMotionSet(
    harness.store,
    harness.pack,
    ['entry-runner'],
  );
  assert(
    record.status === 'failed' &&
      record.error?.reason === 'descriptor',
    'store opt-in alone cannot promote an unowned preview descriptor',
  );
}

{
  const harness = createSmoothHarness();
  assert(
    typeof motionStoreRuntime.motionClipSettled === 'function',
    'motion store exposes an exact selected-clip spawn gate',
  );
  const [setRecord] = await warmMotionSet(harness.store, harness.pack, [
    'entry-runner',
  ]);
  assert(
    setRecord.status === 'ready' &&
      setRecord.descriptor?.grammar === 'gaf2d-motion-set-index-v2' &&
      harness.counts.json === 1 &&
      harness.counts.image === 0,
    'high-cadence warmMotionSet loads only the set index before any clip is requested',
  );
  assert(
    getMotionClipRecord(
      harness.store,
      'valorant',
      'entry-runner',
      'advance',
    ) === null,
    'no high-cadence clip record exists before the clip is requested',
  );
  assert(
    motionStoreRuntime.motionClipSettled(
      harness.store,
      'valorant',
      'entry-runner',
      'advance',
    ) === false,
    'ready set index alone cannot open the first-spawn gate',
  );
  const advanceRecord = await warmMotionClip(
    harness.store,
    harness.pack,
    'entry-runner',
    'advance',
  );
  assert(
    advanceRecord.status === 'ready' &&
      advanceRecord.descriptor?.grammar === 'gaf2d-motion-clip-v2' &&
      advanceRecord.set?.grammar === 'gaf2d-motion-set-index-v2' &&
      harness.counts.json === 2 &&
      harness.counts.image === 1,
    'high-cadence warmMotionClip lazily loads exactly one selected clip descriptor and image',
  );
  assert(
    motionStoreRuntime.motionClipSettled(
      harness.store,
      'valorant',
      'entry-runner',
      'advance',
    ) === true,
    'first-spawn gate opens only after the selected advance clip settles',
  );
}

{
  const profileSha256 = '4'.repeat(64);
  const harness = createSmoothHarness({
    assetIds: ['entry-runner', 'site-sentinel', 'site-warden'],
    bossId: 'site-warden',
    sourceFamily: 'authored-semantic-v4',
    selectedProfileSha256: profileSha256,
    consumerRoles: {
      'entry-runner': 'standard',
      'site-sentinel': 'elite',
      'site-warden': 'boss',
    },
  });
  const setRecords = await warmMotionSet(
    harness.store,
    harness.pack,
    ['entry-runner', 'site-sentinel', 'site-warden'],
  );
  assert(
    setRecords.every((record) => record.status === 'ready') &&
      harness.counts.json === 3 &&
      harness.counts.image === 0,
    'V4 set warm trusts standard, elite, and boss consumer roles without fetching clip bodies',
  );
  assert(
    motionStoreRuntime.motionClipSettled(
      harness.store,
      'valorant',
      'entry-runner',
      'advance',
    ) === false,
    'V4 set metadata alone cannot open the selected-clip spawn gate',
  );
  const advanceRecord = await warmMotionClip(
    harness.store,
    harness.pack,
    'entry-runner',
    'advance',
  );
  assert(
    advanceRecord.status === 'ready' &&
      advanceRecord.descriptor?.sourceFamily === 'authored-semantic-v4' &&
      harness.counts.json === 4 &&
      harness.counts.image === 1 &&
      harness.fetchCalls.every(
        (url) => !url.includes('/idle.') && !url.includes('/death.'),
      ),
    'V4 selected clip forwards the root profile and keeps sibling descriptor/image media cold',
  );
  assert(
    motionStoreRuntime.motionClipSettled(
      harness.store,
      'valorant',
      'entry-runner',
      'advance',
    ) === true,
    'V4 spawn gate opens after the selected advance clip settles',
  );
}

{
  const harness = createSmoothHarness({
    sourceFamily: 'authored-semantic-v4',
    selectedProfileSha256: '4'.repeat(64),
    consumerRoles: { 'entry-runner': 'standard' },
  });
  const [setRecord] = await warmMotionSet(
    harness.store,
    harness.pack,
    ['entry-runner'],
  );
  assert(
    setRecord.status === 'ready',
    'V4 set accepts the root-selected quality profile before clip activation',
  );
  harness.pack.motion.characters['entry-runner'].selectedProfileSha256 =
    '5'.repeat(64);
  const driftedClip = await warmMotionClip(
    harness.store,
    harness.pack,
    'entry-runner',
    'advance',
  );
  assert(
    driftedClip.status === 'failed' &&
      driftedClip.error?.reason === 'descriptor' &&
      harness.counts.image === 0,
    'V4 clip profile drift fails before image fetch/decode',
  );
}

{
  const harness = createSmoothHarness({
    sourceFamily: 'authored-semantic-v4',
    selectedProfileSha256: '4'.repeat(64),
    consumerRoles: { 'entry-runner': 'standard' },
  });
  harness.pack.motion.characters['entry-runner'].consumerScale = {
    grammar: 'gaf2d-consumer-scale-v4',
    role: 'elite',
    maximumCssBodyHeight: 84,
    maximumDpr: 2,
    displayedDevicePixels: 168,
    runtimeCanvasClass: 256,
    sourceVisiblePixels: 176,
    scaleRatio: { numerator: 168, denominator: 176 },
  };
  const [roleDrift] = await warmMotionSet(
    harness.store,
    harness.pack,
    ['entry-runner'],
  );
  assert(
    roleDrift.status === 'failed' &&
      roleDrift.error?.reason === 'descriptor',
    'V4 set cannot replace the trusted overlay consumer role with its own role claim',
  );
}

{
  const harness = createSmoothHarness();
  Object.assign(harness.pack.motion.characters['entry-runner'], {
    sourceFamily: 'authored-semantic-v4',
    selectedProfileSha256: '4'.repeat(64),
    consumerScale: {
      grammar: 'gaf2d-consumer-scale-v4',
      role: 'standard',
      maximumCssBodyHeight: 72,
      maximumDpr: 2,
      displayedDevicePixels: 144,
      runtimeCanvasClass: 256,
      sourceVisiblePixels: 176,
      scaleRatio: { numerator: 144, denominator: 176 },
    },
  });
  const [familyDrift] = await warmMotionSet(
    harness.store,
    harness.pack,
    ['entry-runner'],
  );
  assert(
    familyDrift.status === 'failed' &&
      familyDrift.error?.reason === 'descriptor',
    'V4 overlay source-family authority cannot activate a V3 set body',
  );
}

{
  const harness = createSmoothHarness();
  const warmedByClip = new Map();
  for (const clipName of ['advance', 'engaged', 'hit', 'death']) {
    const record = await warmMotionClip(
      harness.store,
      harness.pack,
      'entry-runner',
      clipName,
    );
    assert(record.status === 'ready', `${clipName} clip warms successfully`);
    warmedByClip.set(clipName, record);
    for (const sibling of ['advance', 'engaged', 'hit', 'death']) {
      const siblingRecord = getMotionClipRecord(
        harness.store,
        'valorant',
        'entry-runner',
        sibling,
      );
      const expectedResident = warmedByClip.has(sibling);
      assert(
        expectedResident
          ? siblingRecord?.key === `valorant/entry-runner#${sibling}` &&
              siblingRecord.status === 'ready'
          : siblingRecord === null,
        expectedResident
          ? `${clipName} warm keeps sibling clip ${sibling} resident until frame arbitration`
          : `${clipName} warm does not materialize untouched sibling clip ${sibling}`,
      );
    }
  }
  pruneMotionClipResidency(
    harness.store,
    new Set([
      'valorant/entry-runner#advance',
      'valorant/entry-runner#death',
    ]),
  );
  assert(
    getMotionClipRecord(harness.store, 'valorant', 'entry-runner', 'advance')?.status === 'ready' &&
      getMotionClipRecord(harness.store, 'valorant', 'entry-runner', 'death')?.status === 'ready',
    'frame arbitration keeps both requested sibling clips resident',
  );
  assert(
    getMotionClipRecord(harness.store, 'valorant', 'entry-runner', 'engaged') === null &&
      getMotionClipRecord(harness.store, 'valorant', 'entry-runner', 'hit') === null,
    'frame arbitration evicts unrequested sibling clips after selection is known',
  );
  for (const [clipName, record] of warmedByClip) {
    const bitmap = harness.bitmapByUrl.get(record.imageUrl);
    const expectedClosed = clipName === 'engaged' || clipName === 'hit' ? 1 : 0;
    assert(
      bitmap?.closed === expectedClosed,
      `frame arbitration preserves exact close accounting for ${clipName}`,
    );
  }
  releaseColdMotion(
    harness.store,
    new Set(['valorant/entry-runner']),
  );
  assert(
    harness.bitmapByUrl.get(
      'assets/game-packs/valorant/characters/entry-runner/death.webp?sha256=' +
        harness.pack.motion.characters['entry-runner'].clips.death.imageSha256,
    )?.closed === 0,
    'kept asset window preserves the final resident sibling clip',
  );
  releaseColdMotion(harness.store, new Set());
  assert(
    harness.bitmapByUrl.get(
      'assets/game-packs/valorant/characters/entry-runner/death.webp?sha256=' +
        harness.pack.motion.characters['entry-runner'].clips.death.imageSha256,
    )?.closed === 1,
    'asset-window release closes the final resident sibling clip exactly once',
  );
}

{
  const mismatchFixture = buildSmoothPack(['entry-runner']);
  const mismatchedAdvance = JSON.parse(
    Buffer.from(
      mismatchFixture.clipBytesById.get('entry-runner').get('advance'),
    ).toString('utf8'),
  );
  mismatchedAdvance.atlas.bytes -= 1;
  const mismatchedAdvanceBytes = encoder.encode(
    JSON.stringify(mismatchedAdvance),
  );
  const mismatchedSet = structuredClone(
    mismatchFixture.sets.get('entry-runner'),
  );
  mismatchedSet.clips.advance.descriptorSha256 = sha256Hex(
    mismatchedAdvanceBytes,
  );
  const mismatchedSetBytes = encoder.encode(JSON.stringify(mismatchedSet));
  const harness = createSmoothHarness({
    overrideSetBytes(assetId, bytes) {
      if (assetId !== 'entry-runner') return bytes;
      return mismatchedSetBytes;
    },
    overrideClipBytes(assetId, clipName, bytes) {
      if (assetId !== 'entry-runner' || clipName !== 'advance') return bytes;
      return mismatchedAdvanceBytes;
    },
  });
  const record = await warmMotionClip(
    harness.store,
    harness.pack,
    'entry-runner',
    'advance',
  );
  assert(
    record.status === 'failed' &&
      record.error?.reason === 'descriptor' &&
      record.error.message.includes('fetched image length differs from the descriptor'),
    'high-cadence clip rejects a fetched image length that differs from atlas.bytes',
  );
  assert(
    motionStoreRuntime.motionClipSettled(
      harness.store,
      'valorant',
      'entry-runner',
      'advance',
    ) === true,
    'failed selected advance clip settles the spawn gate for safe static fallback',
  );
  assert(
    harness.decodeCalls.length === 0,
    'high-cadence fetched image length mismatch fails before decode',
  );
}

{
  const harness = createHarness();
  const [first, second] = await Promise.all([
    warmMotionSet(harness.store, harness.pack, ['entry-runner']),
    warmMotionSet(harness.store, harness.pack, ['entry-runner']),
  ]);
  const record = getMotionRecord(harness.store, 'valorant', 'entry-runner');
  assert(first[0] === second[0], 'duplicate loads coalesce to one record');
  assert(
    harness.counts.json === 1 && harness.counts.image === 1,
    'duplicate warm calls coalesce descriptor and image fetches',
  );
  assert(
    harness.fetchCalls[0].endsWith(
      `motion.json?sha256=${harness.pack.motion.characters['entry-runner'].descriptorSha256}`,
    ) &&
      harness.fetchCalls[1].includes(`motion.webp?sha256=${record.descriptor.atlas.sha256}`),
    'descriptor and image URLs carry immutable hash cache tokens',
  );
  assert(
    harness.fetchCalls[0].includes('.json?sha256=') &&
      harness.fetchCalls[1].includes('.webp?sha256='),
    'descriptor fetch completes before image fetch starts',
  );
  assert(record?.status === 'ready', 'successful warm stores a ready record');
  releaseColdMotion(harness.store, new Set());
  assert(
    harness.bitmapById.get('entry-runner')?.closed === 1,
    'releasing a cold ready entry closes the bitmap exactly once',
  );
}

{
  const harness = createHarness({
    assetIds: ['future-gatekeeper'],
    bossId: 'future-gatekeeper',
  });
  const [record] = await warmMotionSet(
    harness.store,
    harness.pack,
    ['future-gatekeeper'],
  );
  assert(
    record.status === 'ready' &&
      Object.hasOwn(record.descriptor.clips, 'broken'),
    'store trusts the pack boss role for a renamed future boss descriptor',
  );
}

{
  const harness = createHarness({
    overrideDescriptorBytes: (assetId, bytes) =>
      assetId === 'entry-runner' ? encoder.encode('{not json') : bytes,
  });
  const failed = await warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  const record = failed[0];
  assert(record.status === 'failed', 'bad descriptor hash yields a failed state');
  assert(
    motionDiagnostics(harness.store).some(
      (entry) =>
        entry.packId === 'valorant' &&
        entry.assetId === 'entry-runner' &&
        entry.reason === 'hash',
    ),
    'descriptor bytes are hash-verified before JSON parsing',
  );
  assert(harness.counts.image === 0, 'descriptor hash failure blocks image fetch');
}

{
  const oversized = encoder.encode('x'.repeat(MAX_DESCRIPTOR_BYTES + 1));
  const harness = createHarness({
    overrideDescriptorBytes: (assetId, bytes) =>
      assetId === 'entry-runner' ? oversized : bytes,
    overrideDescriptorSha256: (assetId, bytes) =>
      assetId === 'entry-runner' ? sha256Hex(bytes) : null,
  });
  const [record] = await warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  assert(record.status === 'failed', 'oversized descriptor bytes fail before parsing');
  assert(harness.parseCount() === 0, 'oversized descriptor bytes are rejected before JSON.parse');
  assert(harness.counts.image === 0, 'oversized descriptor bytes block image fetch');
  assert(
    motionDiagnostics(harness.store).filter(
      (entry) =>
        entry.packId === 'valorant' &&
        entry.assetId === 'entry-runner' &&
        entry.reason === 'descriptor',
    ).length === 1,
    'oversized descriptor bytes emit one descriptor diagnostic',
  );
}

{
  const harness = createHarness({
    overrideImageBytes: (assetId, bytes) =>
      assetId === 'entry-runner' ? encoder.encode(`wrong:${assetId}`) : bytes,
  });
  const [record] = await warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  assert(record.status === 'failed', 'atlas hash mismatch fails the record');
  await warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  assert(
    motionDiagnostics(harness.store).filter(
      (entry) => entry.assetId === 'entry-runner' && entry.reason === 'hash',
    ).length === 1,
    'atlas bytes are hash-verified before decode with deduplicated diagnostics',
  );
}

{
  const harness = createHarness({
    widthForAsset: () => 2048,
    heightForAsset: () => 2048,
  });
  const [record] = await warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  assert(record.status === 'failed', 'decoded dimension mismatch fails the record');
  assert(
    motionDiagnostics(harness.store).some(
      (entry) => entry.assetId === 'entry-runner' && entry.reason === 'decode',
    ),
    'decoded intrinsic dimensions must exactly match the descriptor',
  );
}

{
  const harness = createHarness({
    makeBitmap: () => {
      throw new Error('synthetic decoder rejection');
    },
  });
  const [record] = await warmMotionSet(
    harness.store,
    harness.pack,
    ['entry-runner'],
  );
  assert(
    record.status === 'failed' && record.error?.reason === 'decode',
    'decoder rejection is classified as decode instead of network',
  );
  assert(
    motionDiagnostics(harness.store).some(
      (entry) =>
        entry.assetId === 'entry-runner' &&
        entry.reason === 'decode' &&
        entry.detail.includes('synthetic decoder rejection'),
    ),
    'decoder rejection emits one structured decode diagnostic',
  );
}

{
  const harness = createHarness();
  const warmed = await warmMotionSet(harness.store, harness.pack, [
    'entry-runner',
    'veil-operator',
    'signal-hunter',
    'site-sentinel',
    'protocol-courier',
  ]);
  assert(warmed.length === 5, 'five-asset warm set resolves one record per asset');
  assert(
    warmed.every((record) => record.status === 'ready'),
    'five-asset warm set resolves to ready records',
  );
}

{
  const harness = createHarness({
    deadlineMs: 10_000,
    deferFetchFor: new Set(['entry-runner']),
  });
  const pending = warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  harness.clock.tick(10_000);
  const [record] = await pending;
  assert(record.status === 'failed', 'default 10-second deadline fails a stuck request');
  await warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  assert(
    motionDiagnostics(harness.store).filter(
      (entry) =>
        entry.packId === 'valorant' &&
        entry.assetId === 'entry-runner' &&
        entry.reason === 'network',
    ).length === 1,
    'timeout emits exactly one deduplicated structured diagnostic',
  );
}

{
  const harness = createHarness({
    deadlineMs: 10_000,
    deferFetchFor: new Set(['entry-runner']),
    ignoreAbortFor: new Set(['entry-runner']),
  });
  const pending = warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  for (let tries = 0; tries < 8 && !harness.pendingFetches.has('entry-runner'); tries += 1) {
    await Promise.resolve();
  }
  harness.clock.tick(10_000);
  const [record] = await pending;
  assert(
    record.status === 'failed' && record.error?.reason === 'network',
    'timeout settles even when fetch ignores abort',
  );
  assert(
    motionDiagnostics(harness.store).filter(
      (entry) =>
        entry.packId === 'valorant' &&
        entry.assetId === 'entry-runner' &&
        entry.reason === 'network',
    ).length === 1,
    'uncooperative fetch timeout still emits one network diagnostic',
  );
  harness.pendingFetches.get('entry-runner').resolve({
    ok: true,
    status: 200,
    arrayBuffer: async () => new ArrayBuffer(0),
  });
  await Promise.resolve();
}

{
  const harness = createHarness({
    deferFetchFor: new Set(['entry-runner']),
  });
  void warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  releaseColdMotion(harness.store, new Set());
  assert(
    getMotionRecord(harness.store, 'valorant', 'entry-runner') === null,
    'cold release removes a pending record immediately',
  );
  assert(harness.aborts.length === 1, 'cold release aborts a pending request');
}

{
  const harness = createHarness({
    deferFetchFor: new Set(['entry-runner']),
    ignoreAbortFor: new Set(['entry-runner']),
  });
  const pending = warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  for (let tries = 0; tries < 8 && !harness.pendingFetches.has('entry-runner'); tries += 1) {
    await Promise.resolve();
  }
  releaseColdMotion(harness.store, new Set());
  const [record] = await pending;
  assert(
    record.status === 'failed' && record.error?.reason === 'network',
    'cold release settles silently even when fetch ignores abort',
  );
  assert(
    motionDiagnostics(harness.store).length === 0,
    'intentional cold release during uncooperative fetch records no diagnostic',
  );
  harness.pendingFetches.get('entry-runner').resolve({
    ok: true,
    status: 200,
    arrayBuffer: async () => new ArrayBuffer(0),
  });
  await Promise.resolve();
}

{
  const harness = createHarness({
    deferDecodeFor: new Set(['entry-runner']),
    ignoreAbortFor: new Set(['entry-runner']),
  });
  const firstLoad = warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  for (let tries = 0; tries < 20 && !harness.pendingDecodes.has('entry-runner'); tries += 1) {
    await Promise.resolve();
  }
  releaseColdMotion(harness.store, new Set());
  harness.pendingDecodes.get('entry-runner').gate.resolve();
  const [firstRecord] = await firstLoad;
  assert(firstRecord.status === 'failed', 'late completion cannot resurrect a removed record');
  assert(
    harness.bitmapById.get('entry-runner')?.closed === 1,
    'late decode closes its bitmap when the generation is stale',
  );
  const [secondRecord] = await warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  assert(secondRecord.status === 'ready', 'asset can be rewarmed after a stale completion');
}

{
  const harness = createHarness({
    deadlineMs: 10_000,
    deferDecodeFor: new Set(['entry-runner']),
    ignoreAbortFor: new Set(['entry-runner']),
  });
  const pending = warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  for (let tries = 0; tries < 20 && !harness.pendingDecodes.has('entry-runner'); tries += 1) {
    await Promise.resolve();
  }
  harness.clock.tick(10_000);
  const [record] = await pending;
  assert(
    record.status === 'failed' && record.error?.reason === 'network',
    'timeout settles even when decode ignores abort',
  );
  const bitmap = harness.bitmapById.get('entry-runner');
  harness.pendingDecodes.get('entry-runner').gate.resolve();
  for (let tries = 0; tries < 8 && bitmap?.closed !== 1; tries += 1) {
    await Promise.resolve();
  }
  assert(bitmap?.closed === 1, 'late decoded bitmap closes once after timeout');
}

{
  const harness = createHarness({
    deferDecodeFor: new Set(['entry-runner']),
    ignoreAbortFor: new Set(['entry-runner']),
  });
  const pending = warmMotionSet(harness.store, harness.pack, ['entry-runner']);
  for (let tries = 0; tries < 20 && !harness.pendingDecodes.has('entry-runner'); tries += 1) {
    await Promise.resolve();
  }
  releaseColdMotion(harness.store, new Set());
  const [record] = await pending;
  assert(
    record.status === 'failed' && record.error?.reason === 'network',
    'cold release settles silently even when decode ignores abort',
  );
  assert(
    motionDiagnostics(harness.store).length === 0,
    'intentional cold release during uncooperative decode records no diagnostic',
  );
  const bitmap = harness.bitmapById.get('entry-runner');
  harness.pendingDecodes.get('entry-runner').gate.resolve();
  for (let tries = 0; tries < 8 && bitmap?.closed !== 1; tries += 1) {
    await Promise.resolve();
  }
  assert(bitmap?.closed === 1, 'late decoded bitmap closes once after cold release');
}

{
  const harness = createHarness();
  let threw = false;
  try {
    await warmMotionSet(harness.store, harness.pack, ['missing-id']);
  } catch {
    threw = true;
  }
  assert(threw, 'warm set rejects an ID absent from the pack motion map');
  assert(harness.fetchCalls.length === 0, 'absent IDs are rejected before any fetch');
}

assert(
  createHarness().clock.pendingCount() === 0,
  'deterministic clock starts empty',
);

console.log('MOTION STORE PASS');
