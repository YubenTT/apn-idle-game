import {
  validateMotionClipDescriptor,
  validateMotionBundle,
  validateMotionPreviewBundle,
  validateMotionSetIndex,
} from './motion-bundle.js?v=enhanced-v1';

export const DEFAULT_MOTION_DEADLINE_MS = 10_000;
export const MAX_DESCRIPTOR_BYTES = 256 * 1024;

const textDecoder = new TextDecoder();

const motionKey = (packId, assetId) => `${packId}/${assetId}`;
const motionClipKey = (packId, assetId, clipName) =>
  `${packId}/${assetId}#${clipName}`;
const withCacheToken = (url, sha256) =>
  `${url}${url.includes('?') ? '&' : '?'}sha256=${sha256}`;

function closeImageOnce(entry) {
  if (!entry?.image || entry.imageClosed) return;
  entry.imageClosed = true;
  entry.image.close?.();
}

function createFailure(reason, message, silent = false) {
  const error = new Error(message);
  error.reason = reason;
  error.silent = silent;
  return error;
}

function classifyFailure(error) {
  if (error?.reason) return error.reason;
  if (error?.name === 'AbortError') return 'network';
  return 'network';
}

function diagnosticKey(packId, assetId, reason) {
  return `${packId}/${assetId}/${reason}`;
}

function recordDiagnostic(store, packId, assetId, reason, detail) {
  const key = diagnosticKey(packId, assetId, reason);
  if (store.diagnostics.has(key)) return;
  store.diagnostics.set(key, {
    code: 'motion-bundle-fallback',
    packId,
    assetId,
    reason,
    detail,
  });
}

async function defaultHashBytes(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function defaultDecodeImage(bytes) {
  const blob = new Blob([bytes], { type: 'image/webp' });
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }
  if (
    typeof Image === 'function' &&
    globalThis.URL?.createObjectURL &&
    globalThis.URL?.revokeObjectURL
  ) {
    const objectUrl = globalThis.URL.createObjectURL(blob);
    try {
      return await new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`decode failed: ${objectUrl}`));
        image.src = objectUrl;
      });
    } finally {
      globalThis.URL.revokeObjectURL(objectUrl);
    }
  }
  throw new Error('No image decoder available');
}

function createDetachedFailure(entry, reason, message) {
  return {
    key: entry.key,
    packId: entry.packId,
    assetId: entry.assetId,
    generation: entry.generation,
    status: 'failed',
    descriptor: entry.descriptor,
    image: null,
    error: { reason, message },
  };
}

function createSettleController() {
  let reject;
  const promise = new Promise((_, rej) => {
    reject = rej;
  });
  return {
    promise,
    reject,
    settled: false,
    fail(error) {
      if (this.settled) return;
      this.settled = true;
      reject(error);
    },
  };
}

function clearDeadline(store, entry) {
  if (entry.timerId == null) return;
  store.clearTimeout(entry.timerId);
  entry.timerId = null;
}

function startDeadline(store, entry) {
  entry.timerId = store.setTimeout(() => {
    entry.timedOut = true;
    entry.abortController.abort();
    entry.settle.fail(createFailure('network', 'motion warm timed out'));
  }, store.deadlineMs);
}

function settleSilently(entry, message) {
  entry.abortController.abort();
  entry.settle.fail(createFailure('network', message, true));
}

async function guarded(entry, operation, onLateResolve) {
  operation.catch(() => {});
  try {
    return await Promise.race([operation, entry.settle.promise]);
  } catch (error) {
    operation.then(
      (value) => {
        if (error === value) return;
        onLateResolve?.(value);
      },
      () => {},
    );
    throw error;
  }
}

async function fetchBytes(store, url, signal) {
  const response = await store.fetch(url, { signal });
  if (!response?.ok) {
    throw createFailure('network', `fetch failed ${response?.status ?? 'unknown'}: ${url}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function loadMotionEntry(store, entry, pack, source) {
  const descriptorUrl = withCacheToken(source.descriptor, source.descriptorSha256);
  entry.descriptorUrl = descriptorUrl;

  const descriptorBytes = await guarded(
    entry,
    fetchBytes(store, descriptorUrl, entry.abortController.signal),
  );
  if (descriptorBytes.byteLength > MAX_DESCRIPTOR_BYTES) {
    throw createFailure(
      'descriptor',
      `descriptor exceeds ${MAX_DESCRIPTOR_BYTES} bytes: ${descriptorBytes.byteLength}`,
    );
  }
  const descriptorHash = await store.hashBytes(descriptorBytes);
  if (descriptorHash !== source.descriptorSha256) {
    throw createFailure(
      'hash',
      `descriptor SHA-256 mismatch: expected ${source.descriptorSha256}, got ${descriptorHash}`,
    );
  }

  let descriptor;
  try {
    descriptor = store.parseJson(textDecoder.decode(descriptorBytes));
  } catch (error) {
    throw createFailure('descriptor', `descriptor JSON invalid: ${error.message}`);
  }
  const previewOwned =
    store.allowUnapprovedPreview === true &&
    source.authority === 'unapproved_preview';
  const validateDescriptor = previewOwned
    ? validateMotionPreviewBundle
    : validateMotionBundle;
  const validationErrors = validateDescriptor(descriptor, entry.assetId, {
    role: pack?.boss?.id === entry.assetId ? 'boss' : 'character',
  });
  if (validationErrors.length > 0) {
    throw createFailure('descriptor', validationErrors.join('; '));
  }

  const imageUrl = withCacheToken(source.image, descriptor.atlas.sha256);
  entry.imageUrl = imageUrl;
  const imageBytes = await guarded(
    entry,
    fetchBytes(store, imageUrl, entry.abortController.signal),
  );
  const imageHash = await store.hashBytes(imageBytes);
  if (imageHash !== descriptor.atlas.sha256) {
    throw createFailure(
      'hash',
      `atlas SHA-256 mismatch: expected ${descriptor.atlas.sha256}, got ${imageHash}`,
    );
  }
  let image;
  try {
    image = await guarded(
      entry,
      store.decodeImage(imageBytes, {
        url: imageUrl,
        packId: pack.id,
        assetId: entry.assetId,
        signal: entry.abortController.signal,
      }),
      (lateImage) => lateImage?.close?.(),
    );
  } catch (error) {
    if (error?.reason || error?.name === 'AbortError') throw error;
    throw createFailure(
      'decode',
      `image decode failed: ${error?.message || String(error)}`,
    );
  }
  if (
    image.width !== descriptor.atlas.width ||
    image.height !== descriptor.atlas.height
  ) {
    image.close?.();
    throw createFailure(
      'decode',
      `decoded dimensions mismatch: expected ${descriptor.atlas.width}x${descriptor.atlas.height}, got ${image.width}x${image.height}`,
    );
  }
  return { descriptor, image };
}

function isPerClipSource(source) {
  return (
    source !== null &&
    typeof source === 'object' &&
    typeof source.set === 'string' &&
    typeof source.setSha256 === 'string' &&
    source.clips !== null &&
    typeof source.clips === 'object'
  );
}

function perClipValidationOptions(pack, assetId, source) {
  const role = pack?.boss?.id === assetId ? 'boss' : 'character';
  if (source?.sourceFamily !== 'authored-semantic-v4') return { role };
  return {
    role,
    consumerRole: source.consumerScale?.role,
    selectedProfileSha256: source.selectedProfileSha256,
  };
}

async function loadMotionSetEntry(store, entry, pack, source) {
  const setUrl = withCacheToken(source.set, source.setSha256);
  entry.descriptorUrl = setUrl;
  const setBytes = await guarded(
    entry,
    fetchBytes(store, setUrl, entry.abortController.signal),
  );
  if (setBytes.byteLength > MAX_DESCRIPTOR_BYTES) {
    throw createFailure(
      'descriptor',
      `set exceeds ${MAX_DESCRIPTOR_BYTES} bytes: ${setBytes.byteLength}`,
    );
  }
  const setHash = await store.hashBytes(setBytes);
  if (setHash !== source.setSha256) {
    throw createFailure(
      'hash',
      `set SHA-256 mismatch: expected ${source.setSha256}, got ${setHash}`,
    );
  }
  let set;
  try {
    set = store.parseJson(textDecoder.decode(setBytes));
  } catch (error) {
    throw createFailure('descriptor', `set JSON invalid: ${error.message}`);
  }
  const validationErrors = validateMotionSetIndex(
    set,
    entry.assetId,
    perClipValidationOptions(pack, entry.assetId, source),
  );
  if (
    source.sourceFamily === 'authored-semantic-v4' &&
    set.sourceFamily !== source.sourceFamily
  ) {
    validationErrors.unshift(
      `sourceFamily: expected root authority "${source.sourceFamily}"`,
    );
  }
  if (validationErrors.length > 0) {
    throw createFailure('descriptor', validationErrors.join('; '));
  }
  return { descriptor: set, image: null };
}

async function loadMotionClipEntry(store, entry, pack, assetEntry, clipName) {
  const source = pack?.motion?.characters?.[assetEntry.assetId];
  const clipSource = source?.clips?.[clipName];
  if (!clipSource) {
    throw createFailure(
      'descriptor',
      `clip "${clipName}" is not owned by motion asset "${assetEntry.assetId}"`,
    );
  }
  const descriptorUrl = withCacheToken(
    clipSource.descriptor,
    clipSource.descriptorSha256,
  );
  entry.descriptorUrl = descriptorUrl;
  const descriptorBytes = await guarded(
    entry,
    fetchBytes(store, descriptorUrl, entry.abortController.signal),
  );
  if (descriptorBytes.byteLength > MAX_DESCRIPTOR_BYTES) {
    throw createFailure(
      'descriptor',
      `descriptor exceeds ${MAX_DESCRIPTOR_BYTES} bytes: ${descriptorBytes.byteLength}`,
    );
  }
  const descriptorHash = await store.hashBytes(descriptorBytes);
  if (descriptorHash !== clipSource.descriptorSha256) {
    throw createFailure(
      'hash',
      `descriptor SHA-256 mismatch: expected ${clipSource.descriptorSha256}, got ${descriptorHash}`,
    );
  }
  let descriptor;
  try {
    descriptor = store.parseJson(textDecoder.decode(descriptorBytes));
  } catch (error) {
    throw createFailure('descriptor', `descriptor JSON invalid: ${error.message}`);
  }
  const validationErrors = validateMotionClipDescriptor(
    descriptor,
    clipName,
    assetEntry.descriptor,
    {
      ...perClipValidationOptions(pack, assetEntry.assetId, source),
      descriptorSha256: clipSource.descriptorSha256,
      imageSha256: clipSource.imageSha256,
    },
  );
  if (validationErrors.length > 0) {
    throw createFailure('descriptor', validationErrors.join('; '));
  }

  const imageUrl = withCacheToken(clipSource.image, clipSource.imageSha256);
  entry.imageUrl = imageUrl;
  const imageBytes = await guarded(
    entry,
    fetchBytes(store, imageUrl, entry.abortController.signal),
  );
  const imageHash = await store.hashBytes(imageBytes);
  if (imageHash !== clipSource.imageSha256) {
    throw createFailure(
      'hash',
      `atlas SHA-256 mismatch: expected ${clipSource.imageSha256}, got ${imageHash}`,
    );
  }
  const fetchedValidationErrors = validateMotionClipDescriptor(
    descriptor,
    clipName,
    assetEntry.descriptor,
    {
      ...perClipValidationOptions(pack, assetEntry.assetId, source),
      descriptorSha256: clipSource.descriptorSha256,
      imageSha256: clipSource.imageSha256,
      imageBytes: imageBytes.byteLength,
    },
  );
  if (fetchedValidationErrors.length > 0) {
    throw createFailure('descriptor', fetchedValidationErrors.join('; '));
  }
  let image;
  try {
    image = await guarded(
      entry,
      store.decodeImage(imageBytes, {
        url: imageUrl,
        packId: pack.id,
        assetId: assetEntry.assetId,
        clipName,
        signal: entry.abortController.signal,
      }),
      (lateImage) => lateImage?.close?.(),
    );
  } catch (error) {
    if (error?.reason || error?.name === 'AbortError') throw error;
    throw createFailure(
      'decode',
      `image decode failed: ${error?.message || String(error)}`,
    );
  }
  if (
    image.width !== descriptor.atlas.width ||
    image.height !== descriptor.atlas.height
  ) {
    image.close?.();
    throw createFailure(
      'decode',
      `decoded dimensions mismatch: expected ${descriptor.atlas.width}x${descriptor.atlas.height}, got ${image.width}x${image.height}`,
    );
  }
  entry.set = assetEntry.descriptor;
  return { descriptor, image };
}

function releaseEntry(store, key, entry, message) {
  if (entry.status === 'pending') {
    settleSilently(entry, message);
  }
  clearDeadline(store, entry);
  closeImageOnce(entry);
  store.entries.delete(key);
}

function releaseSiblingMotionClips(store, packId, assetId, keepKey) {
  const prefix = `${motionKey(packId, assetId)}#`;
  for (const [key, entry] of store.entries) {
    if (!key.startsWith(prefix) || key === keepKey) continue;
    releaseEntry(store, key, entry, 'motion clip warm superseded');
  }
}

function beginLoad(
  store,
  pack,
  assetId,
  source,
  generation,
  loader = loadMotionEntry,
  key = motionKey(pack.id, assetId),
) {
  const entry = {
    key,
    packId: pack.id,
    assetId,
    generation,
    status: 'pending',
    descriptor: null,
    image: null,
    error: null,
    imageClosed: false,
    timedOut: false,
    descriptorUrl: null,
    imageUrl: null,
    abortController: new store.AbortController(),
    settle: createSettleController(),
    timerId: null,
    promise: null,
  };
  store.entries.set(key, entry);
  startDeadline(store, entry);
  entry.promise = loader(store, entry, pack, source)
    .then(({ descriptor, image }) => {
      clearDeadline(store, entry);
      const current = store.entries.get(key);
      if (current !== entry || current.generation !== generation) {
        image.close?.();
        return createDetachedFailure(entry, 'network', 'stale completion');
      }
      entry.status = 'ready';
      entry.descriptor = descriptor;
      entry.image = image;
      entry.error = null;
      return entry;
    })
    .catch((error) => {
      clearDeadline(store, entry);
      const current = store.entries.get(key);
      const stale = current !== entry || current.generation !== generation;
      if (stale) {
        closeImageOnce(entry);
        return createDetachedFailure(entry, classifyFailure(error), error.message);
      }
      const silent = error?.silent === true;
      const reason =
        entry.timedOut && error?.name === 'AbortError'
          ? 'network'
          : classifyFailure(error);
      if (silent || (error?.name === 'AbortError' && !entry.timedOut)) {
        store.entries.delete(key);
        closeImageOnce(entry);
        return createDetachedFailure(entry, reason, error.message);
      }
      entry.status = 'failed';
      entry.image = null;
      entry.error = { reason, message: error.message };
      recordDiagnostic(store, pack.id, assetId, reason, error.message);
      return entry;
    });
  return entry;
}

export function createMotionStore(options = {}) {
  return {
    entries: new Map(),
    diagnostics: new Map(),
    fetch: options.fetch || globalThis.fetch.bind(globalThis),
    decodeImage: options.decodeImage || defaultDecodeImage,
    hashBytes: options.hashBytes || defaultHashBytes,
    parseJson: options.parseJson || JSON.parse,
    allowUnapprovedPreview: options.allowUnapprovedPreview === true,
    setTimeout:
      options.setTimeout || globalThis.setTimeout.bind(globalThis),
    clearTimeout:
      options.clearTimeout || globalThis.clearTimeout.bind(globalThis),
    AbortController: options.AbortController || globalThis.AbortController,
    deadlineMs: options.deadlineMs ?? DEFAULT_MOTION_DEADLINE_MS,
  };
}

export async function warmMotionSet(store, pack, assetIds) {
  const characters = pack?.motion?.characters || {};
  for (const assetId of assetIds) {
    if (!characters[assetId]) {
      throw new Error(`Motion asset "${assetId}" is not owned by pack "${pack?.id || 'unknown'}"`);
    }
  }
  return Promise.all(
    assetIds.map(async (assetId) => {
      const key = motionKey(pack.id, assetId);
      const source = characters[assetId];
      const descriptorUrl = isPerClipSource(source)
        ? withCacheToken(source.set, source.setSha256)
        : withCacheToken(source.descriptor, source.descriptorSha256);
      const existing = store.entries.get(key);
      if (existing) {
        if (
          existing.status === 'pending' &&
          existing.descriptorUrl === descriptorUrl
        ) {
          return existing.promise;
        }
        if (
          existing.status === 'ready' &&
          existing.descriptorUrl === descriptorUrl
        ) {
          return existing;
        }
        if (existing.status === 'pending') {
          settleSilently(existing, 'motion warm superseded');
        } else {
          closeImageOnce(existing);
        }
      }
      const generation = (existing?.generation || 0) + 1;
      return beginLoad(
        store,
        pack,
        assetId,
        source,
        generation,
        isPerClipSource(source) ? loadMotionSetEntry : loadMotionEntry,
      ).promise;
    }),
  );
}

export function getMotionRecord(store, packId, assetId) {
  return store.entries.get(motionKey(packId, assetId)) || null;
}

export async function warmMotionClip(store, pack, assetId, clipName) {
  const source = pack?.motion?.characters?.[assetId];
  if (!isPerClipSource(source)) {
    throw new Error(`Motion asset "${assetId}" does not expose per-clip preview media`);
  }
  const [assetEntry] = await warmMotionSet(store, pack, [assetId]);
  if (!assetEntry || assetEntry.status !== 'ready') return assetEntry;
  const key = motionClipKey(pack.id, assetId, clipName);
  const clipSource = source.clips[clipName];
  if (!clipSource) {
    throw new Error(`Motion clip "${clipName}" is not owned by asset "${assetId}"`);
  }
  const descriptorUrl = withCacheToken(
    clipSource.descriptor,
    clipSource.descriptorSha256,
  );
  const existing = store.entries.get(key);
  if (existing) {
    if (
      existing.status === 'pending' &&
      existing.descriptorUrl === descriptorUrl
    ) {
      return existing.promise;
    }
    if (
      existing.status === 'ready' &&
      existing.descriptorUrl === descriptorUrl
    ) {
      return existing;
    }
    if (existing.status === 'pending') {
      settleSilently(existing, 'motion clip warm superseded');
    } else {
      closeImageOnce(existing);
    }
  }
  const generation = (existing?.generation || 0) + 1;
  return beginLoad(
    store,
    pack,
    assetId,
    source,
    generation,
    (localStore, entry) =>
      loadMotionClipEntry(localStore, entry, pack, assetEntry, clipName),
    key,
  ).promise;
}

export function getMotionClipRecord(store, packId, assetId, clipName) {
  return store.entries.get(motionClipKey(packId, assetId, clipName)) || null;
}

/** A per-clip set index is metadata, not a drawable first-spawn body. */
export function motionClipSettled(
  store,
  packId,
  assetId,
  clipName = 'advance',
) {
  const setRecord = getMotionRecord(store, packId, assetId);
  if (!setRecord || setRecord.status === 'pending') return false;
  if (setRecord.status === 'failed') return true;
  if (
    ![
      'authored-semantic-v3',
      'authored-semantic-v4',
    ].includes(setRecord.descriptor?.sourceFamily)
  ) {
    return true;
  }
  const clipRecord = getMotionClipRecord(
    store,
    packId,
    assetId,
    clipName,
  );
  return !!clipRecord &&
    (clipRecord.status === 'ready' || clipRecord.status === 'failed');
}

export function pruneMotionClipResidency(store, keepKeys) {
  for (const [key, entry] of store.entries) {
    if (!key.includes('#') || keepKeys.has(key)) continue;
    releaseEntry(store, key, entry, 'motion clip warm superseded');
  }
}

export function failMotionRecord(
  store,
  packId,
  assetId,
  reason = 'decode',
  detail = 'motion frame blit failed',
  clipName = null,
) {
  const key =
    typeof clipName === 'string' && clipName.length > 0
      ? motionClipKey(packId, assetId, clipName)
      : motionKey(packId, assetId);
  const entry = store.entries.get(key);
  if (!entry || entry.status !== 'ready') return entry || null;
  closeImageOnce(entry);
  entry.status = 'failed';
  entry.image = null;
  entry.error = { reason, message: detail };
  recordDiagnostic(store, packId, assetId, reason, detail);
  return entry;
}

export function releaseColdMotion(store, keepKeys) {
  for (const [key, entry] of store.entries) {
    const parentKey = key.includes('#') ? key.split('#', 1)[0] : key;
    if (keepKeys.has(key) || keepKeys.has(parentKey)) continue;
    releaseEntry(store, key, entry, 'motion warm released');
  }
}

export function motionDiagnostics(store) {
  return [...store.diagnostics.values()];
}
