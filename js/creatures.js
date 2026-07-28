/**
 * Legacy V3 vinyl creatures.
 *
 * These atlases are an owner-specific fallback for packs without authored
 * character motion. The runtime warms one actual on-stage owner outside the
 * render hot path; there is intentionally no eager "load every creature" API.
 */

import { withRuntimeVersion } from './cache.js?v=gaf2d-motion-v1';

const CLIPS = Object.freeze({
  curator: Object.freeze([
    'idle',
    'advance',
    'attack',
    'hit',
    'death',
    'broken',
  ]),
  recon: Object.freeze(['idle', 'advance', 'attack', 'hit', 'death']),
  hotshot: Object.freeze(['idle', 'advance', 'attack', 'hit', 'death']),
});
const FILE_PREFIX = Object.freeze({
  curator: '',
  recon: '',
  hotshot: 'hotshot-',
});
const LOOP_CLIPS = new Set(['idle', 'advance', 'broken']);

const keyOf = (kind, clip) => `${kind}/${clip}`;
const srcOf = (kind, clip, extension) =>
  `assets/creatures/${kind}/${FILE_PREFIX[kind] || ''}${clip}.${extension}`;

export const LEGACY_CREATURE_ASSET_PATHS_BY_KIND = Object.freeze(
  Object.fromEntries(
    Object.entries(CLIPS).map(([kind, clips]) => [
      kind,
      Object.freeze(
        clips.flatMap((clip) => [
          srcOf(kind, clip, 'webp'),
          srcOf(kind, clip, 'json'),
        ]),
      ),
    ]),
  ),
);

// Compatibility name for manifest tests: these are possible legacy assets,
// not boot requests. The first-playable contract keeps every path cold.
export const LEGACY_CREATURE_BOOT_ASSET_PATHS = Object.freeze(
  Object.values(LEGACY_CREATURE_ASSET_PATHS_BY_KIND).flat(),
);

function browserImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image failed: ${src}`));
    image.src = withRuntimeVersion(src);
  });
}

async function browserJson(src) {
  const response = await fetch(withRuntimeVersion(src));
  if (!response.ok) {
    throw new Error(`JSON failed ${response.status}: ${src}`);
  }
  return response.json();
}

export function createCreatureStore(options = {}) {
  return {
    entries: new Map(),
    pending: new Map(),
    generations: new Map(),
    closedImages: new WeakSet(),
    loadImage: options.loadImage || browserImage,
    loadJson: options.loadJson || browserJson,
  };
}

function contractOk(meta) {
  return (
    meta &&
    Array.isArray(meta.frames) &&
    meta.frames.length > 0 &&
    meta.frames.every(
      (frame) =>
        Number.isFinite(frame.x) &&
        Number.isFinite(frame.y) &&
        frame.w > 0 &&
        frame.h > 0,
    ) &&
    Number.isFinite(meta.fps) &&
    meta.fps > 0 &&
    Number.isFinite(meta.frameSize) &&
    meta.frameSize > 0 &&
    Array.isArray(meta.anchor) &&
    meta.anchor.length === 2 &&
    meta.anchor[0] === 0.5 &&
    meta.anchor[1] === 1 &&
    meta.trim &&
    Number.isFinite(meta.trim.x) &&
    meta.trim.x >= 0 &&
    Number.isFinite(meta.trim.y) &&
    meta.trim.y >= 0 &&
    meta.trim.w > 0 &&
    meta.trim.h > 0 &&
    meta.trim.x + meta.trim.w <= meta.frameSize &&
    meta.trim.y + meta.trim.h <= meta.frameSize
  );
}

function closeImageOnce(store, image) {
  if (!image || store.closedImages.has(image)) return;
  store.closedImages.add(image);
  image.close?.();
}

async function loadClip(store, kind, clip, generation) {
  const [imageResult, metaResult] = await Promise.allSettled([
    store.loadImage(srcOf(kind, clip, 'webp')),
    store.loadJson(srcOf(kind, clip, 'json')),
  ]);
  const image = imageResult.status === 'fulfilled' ? imageResult.value : null;
  const meta = metaResult.status === 'fulfilled' ? metaResult.value : null;
  if (
    store.generations.get(kind) !== generation ||
    !image ||
    !contractOk(meta)
  ) {
    closeImageOnce(store, image);
    return null;
  }
  const entry = { kind, clip, image, meta, ready: true };
  store.entries.set(keyOf(kind, clip), entry);
  return entry;
}

function ensureClip(store, kind, clip, generation) {
  const key = keyOf(kind, clip);
  const existing = store.entries.get(key);
  if (existing?.ready) return Promise.resolve(existing);
  const pending = store.pending.get(key);
  if (pending) return pending;
  const promise = loadClip(store, kind, clip, generation).finally(() => {
    if (store.pending.get(key) === promise) store.pending.delete(key);
  });
  store.pending.set(key, promise);
  return promise;
}

export function warmCreatureKind(store, kind) {
  const clips = CLIPS[kind];
  if (!clips) {
    return Promise.reject(new Error(`Unknown legacy creature kind: ${kind}`));
  }
  if (!store.generations.has(kind)) store.generations.set(kind, 0);
  const generation = store.generations.get(kind);
  return Promise.all(
    clips.map((clip) => ensureClip(store, kind, clip, generation)),
  );
}

export function releaseColdCreatureKinds(store, keepKinds) {
  for (const kind of Object.keys(CLIPS)) {
    if (keepKinds.has(kind)) continue;
    store.generations.set(kind, (store.generations.get(kind) || 0) + 1);
    for (const clip of CLIPS[kind]) {
      const key = keyOf(kind, clip);
      closeImageOnce(store, store.entries.get(key)?.image);
      store.entries.delete(key);
      store.pending.delete(key);
    }
  }
}

export function creatureClipReady(kind, clip, store) {
  return !!store?.entries.get(keyOf(kind, clip))?.ready;
}

export function creatureStoreDecodedBytes(store) {
  let total = 0;
  for (const entry of store.entries.values()) {
    if (!entry.ready) continue;
    const width = entry.image?.naturalWidth || entry.image?.width || 0;
    const height = entry.image?.naturalHeight || entry.image?.height || 0;
    total += width * height * 4;
  }
  return total;
}

/**
 * Blit one frame at foot pivot (x, footY) with drawn height `height`.
 * Loop clips read `time` as seconds; progress clips read `time` as 0..1.
 */
export function drawCreature(
  ctx,
  kind,
  clip,
  time,
  x,
  footY,
  height,
  store,
) {
  const entry = store?.entries.get(keyOf(kind, clip));
  if (!entry?.ready) return false;
  const { image, meta } = entry;
  const frames = meta.frames;
  const frameCount = frames.length;
  const frameIndex = LOOP_CLIPS.has(clip)
    ? Math.floor(Math.max(0, time) * meta.fps) % frameCount
    : Math.min(
        frameCount - 1,
        Math.floor(Math.min(1, Math.max(0, time)) * frameCount),
      );
  const frame = frames[frameIndex];
  const trim = meta.trim;
  const scale = height / trim.h;
  ctx.drawImage(
    image,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    x + (trim.x - meta.frameSize * meta.anchor[0]) * scale,
    footY + (trim.y - meta.frameSize * meta.anchor[1]) * scale,
    trim.w * scale,
    trim.h * scale,
  );
  return true;
}
