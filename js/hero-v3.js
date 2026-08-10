/**
 * APN Host V3 — GLB-rendered clip player (primary hero body).
 *
 * The hero body is a set of short clips rendered offline from the canon 3D
 * model: assets/mascot/v3/{clip}.webp + {clip}.json.
 *
 * This loader is deterministic and strict about shape, but resilient to partial
 * asset loss. One bad clip does not wipe the whole persona; only missing clips
 * fall back to the next available semantics. Missing every clip still fails
 * fast so callers can fall back to rig / procedural V2.
 *
 * The runtime contract is:
 *  - frames: [{x,y,w,h}]
 *  - fps
 *  - frameSize
 *  - anchor: [0.5, 1]
 *  - trim: {x,y,w,h}
 */

import { clamp } from './formulas.js?v=golive-pr5';

export const V3_CLIPS = Object.freeze([
  'idle',
  'run',
  'attack',
  'crit',
  'sprint',
  'hit',
  'death',
  'celebrate',
]);

let V3 = null; // { clips: { name: { image, frames, fps, frameSize, anchor, trim } } }

const FALLBACK_ORDER = {
  death: ['death', 'hit', 'idle', 'run'],
  celebrate: ['celebrate', 'idle', 'run'],
  hit: ['hit', 'idle', 'run'],
  attack: ['attack', 'run', 'idle'],
  crit: ['crit', 'attack', 'run', 'idle'],
  sprint: ['sprint', 'run', 'idle'],
  idle: ['idle', 'run'],
  run: ['run', 'attack', 'idle'],
};

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`hero-v3: ${url} -> ${res.status}`);
  return res.json();
}

async function fetchImage(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`hero-v3: ${url} -> ${res.status}`);
  const blob = await res.blob();
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`hero-v3: decode failed ${url}`));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Fetch all clips in parallel. Partial failures are tolerated and logged; at
 * least one valid clip is required to activate V3.
 */
export async function loadHeroV3(basePath) {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const loaded = await Promise.all(
    V3_CLIPS.map(async (name) => {
      try {
        const [data, image] = await Promise.all([
          fetchJson(`${base}${name}.json`),
          fetchImage(`${base}${name}.webp`),
        ]);
        if (!data || !Array.isArray(data.frames) || data.frames.length === 0) {
          console.warn(`hero-v3: clip '${name}' has no frames`);
          return null;
        }
        const frameSize = data.frameSize || 256;
        const trim = data.trim || { x: 0, y: 0, w: frameSize, h: frameSize };
        return [
          name,
          {
            image,
            frames: data.frames,
            fps: data.fps || 12,
            frameSize,
            anchor: data.anchor || [0.5, 1],
            trim,
          },
        ];
      } catch (error) {
        console.warn(error?.message || `hero-v3: clip '${name}' failed`);
        return null;
      }
    })
  );
  const entries = loaded.filter((entry) => entry !== null);
  if (entries.length === 0) {
    throw new Error(`hero-v3: no valid clips found in ${base}`);
  }
  const missing = V3_CLIPS.filter((name) => !entries.some(([entryName]) => entryName === name));
  if (missing.length > 0) {
    console.info(`hero-v3: partial load (${entries.length}/${V3_CLIPS.length}) — missing ${missing.join(', ')}`);
  }
  V3 = { clips: Object.fromEntries(entries) };
  return V3;
}

export function heroV3Ready() {
  return !!V3;
}

/** Raw clip access for the renderer (null when not loaded). */
export function getV3Clip(name) {
  return V3 ? V3.clips[name] || null : null;
}

function pickSemanticState(st) {
  if ((st.defeatT || 0) > 0) return 'death';
  if ((st.levelT || 0) > 0 || (st.lootT || 0) > 0) return 'celebrate';
  if ((st.recoil || 0) > 0.4) return 'hit';
  if ((st.attack || 0) > 0.02) return st.crit ? 'crit' : 'attack';
  if (st.overdrive || st.sprint) return 'sprint';
  if (st.pose === 'idle' || st.pose === 'overdrive') return 'idle';
  return 'run';
}

/**
 * Map live game semantics to a { clip, frame } tuple with strict per-clip fallbacks.
 *
 * Recoil/death are forward-progress so the atlas starts from calm, ends on the
 * terminal pose, exactly as the shared animation convention expects.
 */
export function pickV3(st) {
  if (!V3) return null;
  const state = pickSemanticState(st);
  const clip = FALLBACK_ORDER[state].find((name) => !!V3.clips[name]);
  if (!clip) return null;
  const c = V3.clips[clip];

  if (clip === 'death') {
    const progress = 1 - clamp(st.defeatT || 0, 0, 1);
    return { clip, frame: Math.min(c.frames.length - 1, Math.round(progress * (c.frames.length - 1))) };
  }
  if (clip === 'hit') {
    const progress = 1 - clamp(st.recoil || 0, 0, 1);
    return { clip, frame: Math.min(c.frames.length - 1, Math.round(progress * (c.frames.length - 1))) };
  }
  if (clip === 'attack' || clip === 'crit') {
    return { clip, frame: Math.min(c.frames.length - 1, Math.floor(clamp(st.attack || 0, 0, 1) * (c.frames.length - 1))) };
  }
  return {
    clip,
    frame: Math.floor((st.t || 0) * c.fps) % c.frames.length,
  };
}

/**
 * Blit one V3 frame with feet anchored at the current transform origin.
 * H = target body height in px. Returns the dest rect { dx, dy, dw, dh }.
 */
export function drawV3Frame(ctx, clipName, frame, H) {
  const c = getV3Clip(clipName);
  if (!c) return null;
  const f = c.frames[frame] || c.frames[0];
  const tr = c.trim;
  const anchorX =
    c.anchorPx && Number.isFinite(c.anchorPx[0]) && Number.isFinite(c.anchorPx[1])
      ? c.anchorPx[0]
      : (Number.isFinite(c.anchor?.[0]) ? c.anchor[0] * c.frameSize : tr.w * 0.5);
  const anchorY =
    c.anchorPx && Number.isFinite(c.anchorPx[0]) && Number.isFinite(c.anchorPx[1])
      ? c.anchorPx[1]
      : (Number.isFinite(c.anchor?.[1]) ? c.anchor[1] * c.frameSize : tr.h);
  const scale = H / tr.h;
  const dw = tr.w * scale;
  const dh = tr.h * scale;
  const dx = -anchorX * scale;
  const dy = -anchorY * scale;
  ctx.drawImage(c.image, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
  return { dx, dy, dw, dh };
}
