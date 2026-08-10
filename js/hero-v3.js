/**
 * APN Hero V3 — authority-validated raster clip player (primary hero body).
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
  validateMotionClipDescriptor,
  validateMotionSetIndex,
} from './motion-bundle.js?v=gaf2d-motion-v1';
import {
  HERO_V3_CLIPS,
  MAX_HERO_DESCRIPTOR_BYTES,
  MAX_HERO_IMAGE_BYTES,
  MAX_HERO_SET_BYTES,
  validateHeroClipDescriptor,
  validateHeroSetManifest,
} from './hero-v3-contract.js?v=gaf2d-motion-v1';
import { visualFidelityEncodedLimit } from './visual-fidelity-v4.js?v=gaf2d-motion-v1';

export const V3_CLIPS = HERO_V3_CLIPS;

let V3 = null; // One validated set, one resident drawn clip, and at most one warm replacement.
let loadGeneration = 0;
let activeLoadController = null;
const fatalDecoder = new TextDecoder('utf-8', { fatal: true });
const VISUAL_FIDELITY_SOURCE_FAMILY = 'authored-semantic-v4';
const GENERIC_PREVIEW_SOURCE_FAMILIES = new Set([
  'authored-semantic-v3',
  VISUAL_FIDELITY_SOURCE_FAMILY,
]);

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

function clipGeometry(clip) {
  return {
    frameSize: clip.frameSize,
    trim: clip.trim,
    anchor: clip.anchor,
    presentation: clip.presentation,
  };
}

function setGeometry(set) {
  return {
    frameSize: set.frameSize,
    trim: {
      x: set.trim.x,
      y: set.trim.y,
      w: set.trim.width,
      h: set.trim.height,
    },
    anchor: [set.pivot.x, set.pivot.y],
    presentation: set.presentation,
  };
}

function assertConsistentModernClip(state, name, clip) {
  if (state?.status === 'historical') return;
  const sharedFields =
    state?.set?.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY
      ? [['full-frame size', 'frameSize']]
      : [
          ['full-frame size', 'frameSize'],
          ['shared trim', 'trim'],
          ['pivot', 'anchor'],
          ['presentation', 'presentation'],
        ];
  for (const [label, field] of sharedFields) {
    if (
      stableJson(clip?.[field]) !== stableJson(state.geometry?.[field])
    ) {
      throw new Error(
        `hero-v3: ${name} ${label} differs from the resident set geometry`,
      );
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

function runtimeClip(descriptor, image, status, options = {}) {
  if (status === 'historical') return { ...descriptor, image };
  if (options.genericMotion) {
    const visualFidelity =
      options.set?.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY;
    return {
      image,
      frames: descriptor.frames.map((frame) => ({
        x: frame.x,
        y: frame.y,
        w: frame.width,
        h: frame.height,
      })),
      fps: descriptor.fps,
      frameSize: options.set.frameSize,
      anchor: visualFidelity
        ? [descriptor.pivot.x, descriptor.pivot.y]
        : [options.set.pivot.x, options.set.pivot.y],
      presentation: visualFidelity
        ? descriptor.presentation
        : options.set.presentation,
      trim: visualFidelity
        ? {
            x: descriptor.trim.x,
            y: descriptor.trim.y,
            w: descriptor.trim.width,
            h: descriptor.trim.height,
          }
        : {
            x: options.set.trim.x,
            y: options.set.trim.y,
            w: options.set.trim.width,
            h: options.set.trim.height,
          },
    };
  }
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
  sourceFamily,
  selectedProfileSha256,
  signal,
}) {
  const record = set.clips[name];
  const genericMotion =
    sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY ||
    (allowUnapprovedPreview === true &&
      GENERIC_PREVIEW_SOURCE_FAMILIES.has(sourceFamily));
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
  const descriptorErrors = genericMotion
    ? validateMotionClipDescriptor(descriptor, name, set, {
        role: 'hero',
        ...(sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY
          ? {
              consumerRole: 'hero',
              selectedProfileSha256,
            }
          : {}),
        descriptorSha256: record.descriptorSha256,
        imageSha256: record.imageSha256,
      })
    : validateHeroClipDescriptor(descriptor, name, set, {
        allowUnapprovedPreview,
      });
  if (
    sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY &&
    !allowUnapprovedPreview &&
    (descriptor.authority !== 'approved_release' ||
      descriptor.status !== 'approved')
  ) {
    descriptorErrors.push(
      'production V4 descriptor requires approved_release authority',
    );
  }
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
    sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY
      ? visualFidelityEncodedLimit('hero')
      : MAX_HERO_IMAGE_BYTES,
    signal,
  );
  const imageHash = await hashBytes(imageBytes);
  if (imageHash !== record.imageSha256) {
    throw new Error(`hero-v3: ${name} image SHA-256 mismatch`);
  }
  const expected =
    genericMotion
      ? {
          width: descriptor.atlas.width,
          height: descriptor.atlas.height,
          bytes: descriptor.atlas.bytes,
        }
      : atlasFacts(descriptor, set.status);
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
    return runtimeClip(descriptor, image, set.status, {
      genericMotion,
      set,
    });
  } catch (error) {
    closeImage(image);
    throw error;
  }
}

/**
 * Load one hash-locked set index plus its current gameplay clip. Other clip
 * bodies stay cold until requested. A failed or stale replacement closes its
 * partial bitmap and leaves the previous set active.
 */
export async function loadHeroV3(basePath, options = {}) {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const fetchImpl = options.fetchImpl || globalThis.fetch.bind(globalThis);
  const decodeImage = options.decodeImage || defaultDecodeImage;
  const hashBytes = options.hashBytes || defaultHashBytes;
  const parseJsonImpl = options.parseJson || JSON.parse;
  const allowUnapprovedPreview =
    options.allowUnapprovedPreview === true;
  const sourceFamily = options.sourceFamily ?? null;
  const expectedSetSha256 = options.expectedSetSha256 ?? null;
  const consumerScale = options.consumerScale ?? null;
  const selectedProfileSha256 =
    options.selectedProfileSha256 ?? null;
  const initialClip = options.initialClip ?? 'run';
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
      expectedSetSha256
        ? withHashToken(`${base}set.json`, expectedSetSha256)
        : withRuntimeVersion(`${base}set.json`),
      MAX_HERO_SET_BYTES,
      controller.signal,
    );
    if (expectedSetSha256) {
      const setSha256 = await hashBytes(setBytes);
      if (setSha256 !== expectedSetSha256) {
        throw new Error(
          `hero-v3: set descriptor SHA-256 mismatch`,
        );
      }
    }
    const set = parseJson(setBytes, 'set descriptor', parseJsonImpl);
    const genericMotion =
      sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY ||
      (allowUnapprovedPreview &&
        GENERIC_PREVIEW_SOURCE_FAMILIES.has(sourceFamily));
    const setErrors = genericMotion
      ? validateMotionSetIndex(set, 'apn-hero', {
          role: 'hero',
          ...(sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY
            ? {
                consumerRole: 'hero',
                selectedProfileSha256,
              }
            : {}),
        })
      : validateHeroSetManifest(set, {
          allowUnapprovedPreview,
        });
    if (
      sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY &&
      !allowUnapprovedPreview &&
      !expectedSetSha256
    ) {
      setErrors.push('production V4 set requires an expected SHA-256');
    }
    if (
      sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY &&
      !allowUnapprovedPreview &&
      (set.authority !== 'approved_release' || set.status !== 'approved')
    ) {
      setErrors.push('production V4 set requires approved_release authority');
    }
    if (
      genericMotion &&
      sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY &&
      stableJson(set.consumerScale) !== stableJson(consumerScale)
    ) {
      setErrors.push(
        'consumerScale: set differs from the root preview manifest',
      );
    }
    if (setErrors.length > 0) {
      throw new Error(`hero-v3: set descriptor rejected: ${setErrors.join('; ')}`);
    }
    if (!V3_CLIPS.includes(initialClip) || !set.clips?.[initialClip]) {
      throw new Error(`hero-v3: invalid initial clip "${initialClip}"`);
    }
    const initial = await loadClip({
      base,
      name: initialClip,
      set,
      fetchImpl,
      decodeImage,
      hashBytes,
      parseJsonImpl,
      allowUnapprovedPreview,
      sourceFamily,
      selectedProfileSha256,
      signal: controller.signal,
    });
    candidate = {
      status: set.status,
      set,
      clips: { [initialClip]: initial },
      geometry:
        set.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY
          ? setGeometry(set)
          : clipGeometry(initial),
      lastDrawn: null,
      pending: null,
      failed: new Map(),
      clipGeneration: 0,
      loader: {
        base,
        set,
        fetchImpl,
        decodeImage,
        hashBytes,
        parseJsonImpl,
        allowUnapprovedPreview,
        sourceFamily,
        selectedProfileSha256,
        AbortControllerImpl,
      },
    };
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
  return !!V3 && Object.keys(V3.clips).length > 0;
}

export function heroV3AuthorityStatus() {
  return V3?.status || null;
}

export function disposeHeroV3() {
  loadGeneration += 1;
  activeLoadController?.abort();
  activeLoadController = null;
  V3?.pending?.controller?.abort();
  closeClipSet(V3);
  V3 = null;
}

/** Raw clip access for the renderer (null when not loaded). */
export function getV3Clip(name) {
  return V3 ? V3.clips[name] || null : null;
}

export function getV3Presentation() {
  if (V3?.set?.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY) {
    return V3.set.presentation || null;
  }
  return V3?.geometry?.presentation || null;
}

/** Geometry remains resident independently of the bounded bitmap cache. */
export function getV3Geometry(selected = null) {
  if (!V3) return null;
  const clipName = selected?.clip;
  const clip = clipName ? V3.clips[clipName] : null;
  return clip ? clipGeometry(clip) : V3.geometry || null;
}

/**
 * Warm exactly one semantic clip. A newer semantic request cancels an older
 * pending request; the last successfully drawn clip remains resident until the
 * replacement is both decoded and drawn.
 */
export async function warmHeroV3Clip(name) {
  const state = V3;
  if (!state) throw new Error('hero-v3: set is not loaded');
  if (!V3_CLIPS.includes(name) || !state.set?.clips?.[name]) {
    throw new Error(`hero-v3: unknown clip "${name}"`);
  }
  if (state.clips[name]) return state.clips[name];
  if (state.pending?.name === name) return state.pending.promise;

  if (state.pending) {
    state.pending.controller.abort();
    state.pending = null;
  }
  const generation = ++state.clipGeneration;
  const controller = new state.loader.AbortControllerImpl();
  const promise = loadClip({
    base: state.loader.base,
    name,
    set: state.loader.set,
    fetchImpl: state.loader.fetchImpl,
    decodeImage: state.loader.decodeImage,
    hashBytes: state.loader.hashBytes,
    parseJsonImpl: state.loader.parseJsonImpl,
    allowUnapprovedPreview: state.loader.allowUnapprovedPreview,
    sourceFamily: state.loader.sourceFamily,
    selectedProfileSha256: state.loader.selectedProfileSha256,
    signal: controller.signal,
  })
    .then((clip) => {
      if (
        V3 !== state ||
        state.pending?.generation !== generation ||
        controller.signal.aborted
      ) {
        closeImage(clip.image);
        throw new Error('hero-v3: stale clip load');
      }
      try {
        assertConsistentModernClip(state, name, clip);
      } catch (error) {
        closeImage(clip.image);
        throw error;
      }
      const retainedName =
        state.lastDrawn?.clip || Object.keys(state.clips)[0] || null;
      state.clips[name] = clip;
      for (const [residentName, resident] of Object.entries(state.clips)) {
        if (residentName === name || residentName === retainedName) continue;
        closeImage(resident.image);
        delete state.clips[residentName];
      }
      state.failed.delete(name);
      state.pending = null;
      return clip;
    })
    .catch((error) => {
      if (V3 === state && state.pending?.generation === generation) {
        state.pending = null;
        if (!controller.signal.aborted) state.failed.set(name, error);
      }
      throw error;
    });
  state.pending = { name, generation, controller, promise };
  return promise;
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
    return {
      clip: name,
      frame: c
        ? Math.floor(st.t * c.fps) % c.frames.length
        : 0,
    };
  };
  const sequence = (name, progress) => {
    const c = clips[name];
    const n = c?.frames?.length || 1;
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
 * Resolve a semantic Hero pose without ever returning an undrawable cold clip.
 * The requested clip warms in the background while the exact last authored
 * frame remains visible.
 */
export function resolveHeroV3Frame(st) {
  if (!V3) return null;
  const requested = pickV3(st, V3.clips);
  if (!requested) return null;
  if (V3.clips[requested.clip]) {
    return {
      ...requested,
      requestedClip: requested.clip,
      warming: false,
    };
  }
  const warming = !V3.failed.has(requested.clip);
  if (warming) {
    void warmHeroV3Clip(requested.clip).catch(() => {});
  }
  const retained =
    V3.lastDrawn && V3.clips[V3.lastDrawn.clip]
      ? V3.lastDrawn
      : (() => {
          const clip = Object.keys(V3.clips)[0];
          const runtime = V3.clips[clip];
          return {
            clip,
            frame: Math.floor((st.t || 0) * runtime.fps) % runtime.frames.length,
          };
        })();
  return {
    ...retained,
    requestedClip: requested.clip,
    warming,
    failed: !warming,
  };
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
  if (V3 && V3.clips[clipName] === c) {
    V3.geometry = clipGeometry(c);
    V3.lastDrawn = { clip: clipName, frame };
    for (const [residentName, resident] of Object.entries(V3.clips)) {
      if (residentName === clipName) continue;
      closeImage(resident.image);
      delete V3.clips[residentName];
    }
  }
  return { dx, dy, dw, dh };
}
