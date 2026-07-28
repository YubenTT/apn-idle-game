import { createHash } from 'node:crypto';
import fs from 'node:fs';

import {
  MAX_DESCRIPTOR_BYTES,
  createMotionStore,
  getMotionRecord,
  motionDiagnostics,
  releaseColdMotion,
  warmMotionSet,
} from '../js/motion-store.js';

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
    descriptor.atlas.sha256 = '0'.repeat(64);
    const imageBytes = encoder.encode(`atlas:${assetId}`);
    descriptor.atlas.sha256 = sha256Hex(imageBytes);
    const descriptorBytes = encoder.encode(JSON.stringify(descriptor));
    const descriptorSha256 = sha256Hex(descriptorBytes);
    characters[assetId] = {
      image: `assets/game-packs/valorant/characters/${assetId}/motion.webp`,
      descriptor: `assets/game-packs/valorant/characters/${assetId}/motion.json`,
      descriptorSha256,
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
