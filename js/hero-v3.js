/**
 * APN Hero V3 — approved raster clip player (primary hero body).
 *
 * The hero body is one set descriptor plus 8 hash-locked short clips:
 * assets/mascot/v3/set.json and {clip}.webp + {clip}.json. The set owns
 * approval status and exact per-file hashes. Approved descriptor geometry uses:
 *   frames: [{x,y,width,height}]
 *   fps                  clip playback rate
 *   frameSize            edge of the untrimmed cell frames were cut from
 *   anchor: [0.5, 1]     bottom-center ground anchor on the untrimmed frame
 *   trim: {x,y,w,h}      union bbox of content inside the untrimmed cell
 *
 * Paste math reconstructs the approved full-frame pivot after the shared trim
 * (ground anchor at the local origin, scale = H / trim.h):
 *   dx = (trim.x - frameWidth * anchor[0]) * scale
 *   dy = (trim.y - frameHeight * anchor[1]) * scale
 *   dw = trim.w * scale, dh = trim.h * scale
 *
 * This module owns loading, clip picking and the raw blit ONLY. Every juice
 * layer (shadow, squash & stretch, lunge, hover, glow, flashes, sparks)
 * stays procedural in hero-v2.js so replacement clips preserve the established
 * game feel. Historical descriptors stay explicitly historical behind a
 * bounded compatibility contract. Missing/failed V3 uses the caller's explicit
 * legless identity-safe Canvas silhouette. No DOM or fetch at import time.
 */

import { clamp } from './formulas.js?v=gaf2d-motion-v1';
import { withRuntimeVersion } from './cache.js?v=gaf2d-motion-v1';
import {
  HERO_V3_CLIPS,
  MAX_HERO_DESCRIPTOR_BYTES,
  MAX_HERO_IMAGE_BYTES,
  MAX_HERO_SET_BYTES,
  validateHeroClipDescriptor,
  validateHeroSetManifest,
} from './hero-v3-contract.js?v=gaf2d-motion-v1';

export const V3_CLIPS = HERO_V3_CLIPS;

let V3 = null; // { status, clips: { name: { image, frames, fps, frameSize, anchor, trim } } }
let loadGeneration = 0;
let activeLoadController = null;
const fatalDecoder = new TextDecoder('utf-8', { fatal: true });

const withHashToken = (url, sha256) => {
  const versioned = withRuntimeVersion(url);
  return `${versioned}&sha256=${sha256}`;
};

function closeImage(image) {
  image?.close?.();
}

function closeClipSet(set) {
  if (!set?.clips) return;
  for (const clip of Object.values(set.clips)) closeImage(clip.image);
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
  }
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(',')}}`;
}

function assertConsistentModernSet(set) {
  if (set?.status === 'historical') return;
  const idle = set?.clips?.idle;
  if (!idle) throw new Error('hero-v3: modern set is missing idle');
  const sharedFields = [
    ['full-frame size', 'frameSize'],
    ['shared trim', 'trim'],
    ['pivot', 'anchor'],
    ['presentation', 'presentation'],
  ];
  for (const name of V3_CLIPS) {
    const clip = set.clips[name];
    for (const [label, field] of sharedFields) {
      if (stableJson(clip?.[field]) !== stableJson(idle[field])) {
        throw new Error(`hero-v3: ${name} ${label} differs from idle`);
      }
    }
  }
}

async function defaultHashBytes(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchBounded(fetchImpl, url, maximumBytes, signal) {
  const response = await fetchImpl(url, { signal });
  if (!response?.ok) {
    throw new Error(`hero-v3: ${url} -> ${response?.status ?? 'unknown'}`);
  }
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error(`hero-v3: ${url} exceeds ${maximumBytes} bytes`);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maximumBytes) {
    throw new Error(`hero-v3: ${url} exceeds ${maximumBytes} bytes`);
  }
  return new Uint8Array(buffer);
}

async function defaultDecodeImage(bytes) {
  const blob = new Blob([bytes], { type: 'image/webp' });
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  if (
    typeof Image !== 'function' ||
    !globalThis.URL?.createObjectURL ||
    !globalThis.URL?.revokeObjectURL
  ) {
    throw new Error('hero-v3: no image decoder available');
  }
  const objectUrl = globalThis.URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('hero-v3: image decode failed'));
      img.src = objectUrl;
    });
  } finally {
    globalThis.URL.revokeObjectURL(objectUrl);
  }
}

function parseJson(bytes, label, parseJson) {
  try {
    return parseJson(fatalDecoder.decode(bytes));
  } catch (error) {
    throw new Error(`hero-v3: ${label} is invalid UTF-8 JSON: ${error.message}`);
  }
}

function atlasFacts(descriptor, status) {
  return status !== 'historical'
    ? {
        width: descriptor.atlas.width,
        height: descriptor.atlas.height,
        bytes: descriptor.atlas.bytes,
      }
    : {
        width: descriptor.atlas.w,
        height: descriptor.atlas.h,
        bytes: descriptor.atlas.bytes,
      };
}

function runtimeClip(descriptor, image, status) {
  if (status === 'historical') return { ...descriptor, image };
  return {
    image,
    frames: descriptor.frames.map((frame) => ({
      x: frame.x,
      y: frame.y,
      w: frame.width,
      h: frame.height,
    })),
    fps: descriptor.fps,
    frameSize: descriptor.frameSize,
    anchor: descriptor.anchor,
    presentation: descriptor.presentation,
    trim: {
      x: descriptor.trim.x,
      y: descriptor.trim.y,
      w: descriptor.trim.width,
      h: descriptor.trim.height,
    },
  };
}

async function loadClip({
  base,
  name,
  set,
  fetchImpl,
  decodeImage,
  hashBytes,
  parseJsonImpl,
  allowUnapprovedPreview,
  signal,
}) {
  const record = set.clips[name];
  const descriptorUrl = withHashToken(
    `${base}${record.descriptor}`,
    record.descriptorSha256,
  );
  const descriptorBytes = await fetchBounded(
    fetchImpl,
    descriptorUrl,
    MAX_HERO_DESCRIPTOR_BYTES,
    signal,
  );
  const descriptorHash = await hashBytes(descriptorBytes);
  if (descriptorHash !== record.descriptorSha256) {
    throw new Error(
      `hero-v3: ${name} descriptor SHA-256 mismatch`,
    );
  }
  const descriptor = parseJson(
    descriptorBytes,
    `${name} descriptor`,
    parseJsonImpl,
  );
  const descriptorErrors = validateHeroClipDescriptor(
    descriptor,
    name,
    set,
    { allowUnapprovedPreview },
  );
  if (descriptorErrors.length > 0) {
    throw new Error(
      `hero-v3: ${name} descriptor rejected: ${descriptorErrors.join('; ')}`,
    );
  }

  const imageUrl = withHashToken(
    `${base}${record.image}`,
    record.imageSha256,
  );
  const imageBytes = await fetchBounded(
    fetchImpl,
    imageUrl,
    MAX_HERO_IMAGE_BYTES,
    signal,
  );
  const imageHash = await hashBytes(imageBytes);
  if (imageHash !== record.imageSha256) {
    throw new Error(`hero-v3: ${name} image SHA-256 mismatch`);
  }
  const expected = atlasFacts(descriptor, set.status);
  if (imageBytes.byteLength !== expected.bytes) {
    throw new Error(
      `hero-v3: ${name} image byte count differs from its descriptor`,
    );
  }
  let image;
  try {
    image = await decodeImage(imageBytes, {
      name,
      descriptor,
      status: set.status,
      url: imageUrl,
      signal,
    });
    if (
      image?.width !== expected.width ||
      image?.height !== expected.height
    ) {
      throw new Error(
        `hero-v3: ${name} decoded dimensions differ from its descriptor`,
      );
    }
    return runtimeClip(descriptor, image, set.status);
  } catch (error) {
    closeImage(image);
    throw error;
  }
}

/**
 * Load one complete hash-locked set. A failed or stale replacement closes every
 * partial bitmap and leaves the previous complete set active.
 */
export async function loadHeroV3(basePath, options = {}) {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const fetchImpl = options.fetchImpl || globalThis.fetch.bind(globalThis);
  const decodeImage = options.decodeImage || defaultDecodeImage;
  const hashBytes = options.hashBytes || defaultHashBytes;
  const parseJsonImpl = options.parseJson || JSON.parse;
  const allowUnapprovedPreview =
    options.allowUnapprovedPreview === true;
  const AbortControllerImpl =
    options.AbortController || globalThis.AbortController;
  const generation = ++loadGeneration;
  activeLoadController?.abort();
  const controller = new AbortControllerImpl();
  activeLoadController = controller;
  let candidate = null;
  try {
    const setBytes = await fetchBounded(
      fetchImpl,
      withRuntimeVersion(`${base}set.json`),
      MAX_HERO_SET_BYTES,
      controller.signal,
    );
    const set = parseJson(setBytes, 'set descriptor', parseJsonImpl);
    const setErrors = validateHeroSetManifest(set, {
      allowUnapprovedPreview,
    });
    if (setErrors.length > 0) {
      throw new Error(`hero-v3: set descriptor rejected: ${setErrors.join('; ')}`);
    }
    const settled = await Promise.allSettled(
      V3_CLIPS.map((name) =>
        loadClip({
          base,
          name,
          set,
          fetchImpl,
          decodeImage,
          hashBytes,
          parseJsonImpl,
          allowUnapprovedPreview,
          signal: controller.signal,
        }),
      ),
    );
    const entries = {};
    for (let index = 0; index < settled.length; index += 1) {
      const result = settled[index];
      if (result.status === 'fulfilled') {
        entries[V3_CLIPS[index]] = result.value;
      }
    }
    candidate = { status: set.status, clips: entries };
    const failed = settled.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
    assertConsistentModernSet(candidate);
    if (
      generation !== loadGeneration ||
      activeLoadController !== controller ||
      controller.signal.aborted
    ) {
      throw new Error('hero-v3: stale set load');
    }
    const previous = V3;
    V3 = candidate;
    candidate = null;
    activeLoadController = null;
    closeClipSet(previous);
    return V3;
  } catch (error) {
    closeClipSet(candidate);
    if (activeLoadController === controller) activeLoadController = null;
    throw error;
  }
}

export function heroV3Ready() {
  return !!V3;
}

export function heroV3AuthorityStatus() {
  return V3?.status || null;
}

export function disposeHeroV3() {
  loadGeneration += 1;
  activeLoadController?.abort();
  activeLoadController = null;
  closeClipSet(V3);
  V3 = null;
}

/** Raw clip access for the renderer (null when not loaded). */
export function getV3Clip(name) {
  return V3 ? V3.clips[name] || null : null;
}

export function getV3Presentation() {
  return V3?.clips?.idle?.presentation || null;
}

/**
 * Map live game semantics to { clip, frame }.
 *
 * st: { t, attack (0..1 eased, 1 at impact decays), crit, recoil (1 at
 * impact decays), overdrive, sprint, pose, defeatT, levelT, lootT }.
 *
 * Note on direction: the game's clip clocks (defeatT/levelT/lootT) and the
 * recoil envelope are 1 at the trigger and decay to 0, so "progress" for
 * death/hit is (1 - clock) — the rendered strip plays FORWARD (frame 0 =
 * standing, last frame = collapsed/recovered) and clamps on the last frame.
 * Attack follows the engine's decaying clock: attack = 1 at trigger and
 * approaches 0, so its authored forward progress is (1 - attack).
 */
export function pickV3(st, clips = V3?.clips) {
  if (!clips) return null;
  const loop = (name) => {
    const c = clips[name];
    return { clip: name, frame: Math.floor(st.t * c.fps) % c.frames.length };
  };
  const sequence = (name, progress) => {
    const c = clips[name];
    const n = c.frames.length;
    return {
      clip: name,
      frame: Math.min(n - 1, Math.floor(clamp(progress, 0, 1) * n)),
    };
  };

  // defeat — death plays forward over the decaying clock, holds last frame
  if ((st.defeatT || 0) > 0) {
    return sequence('death', 1 - clamp(st.defeatT, 0, 1));
  }
  // level-up / gear pull — celebrate loops for the whole window
  if ((st.levelT || 0) > 0 || (st.lootT || 0) > 0) return loop('celebrate');
  // damage flinch — hit plays forward as the recoil envelope decays
  if ((st.recoil || 0) > 0.02) {
    return sequence('hit', 1 - clamp(st.recoil, 0, 1));
  }
  // strike — the decaying attack clock advances wind-up → impact → follow-through
  if ((st.attack || 0) > 0.02) {
    return sequence(st.crit ? 'crit' : 'attack', 1 - clamp(st.attack, 0, 1));
  }
  // overdrive / sprint locomotion
  if (st.overdrive || st.sprint) return loop('sprint');
  // planted idle (Gear niche / overdrive idle pose)
  if (st.pose === 'idle' || st.pose === 'overdrive') return loop('idle');
  // default locomotion
  return loop('run');
}

/**
 * Blit one V3 frame with its source pivot at the current transform origin.
 * drawTrimHeight is the resolved shared-trim height in px. Returns the
 * destination rect { dx, dy, dw, dh }
 * (content box, ground anchor at bottom-center) so callers can place overlays;
 * null when the clip is unavailable.
 */
export function drawV3Frame(ctx, clipName, frame, drawTrimHeight) {
  const c = getV3Clip(clipName);
  if (!c) return null;
  const f = c.frames[frame] || c.frames[0];
  const tr = c.trim;
  const scale = drawTrimHeight / tr.h;
  const frameWidth =
    typeof c.frameSize === 'number' ? c.frameSize : c.frameSize.width;
  const frameHeight =
    typeof c.frameSize === 'number' ? c.frameSize : c.frameSize.height;
  const dw = tr.w * scale;
  const dh = tr.h * scale;
  const dx = (tr.x - frameWidth * c.anchor[0]) * scale;
  const dy = (tr.y - frameHeight * c.anchor[1]) * scale;
  ctx.drawImage(c.image, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
  return { dx, dy, dw, dh };
}
