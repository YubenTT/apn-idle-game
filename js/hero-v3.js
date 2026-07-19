/**
 * APN Host V3 — GLB-rendered clip player (primary hero body).
 *
 * The hero body is a set of 8 short clips rendered offline from the canon 3D
 * model: assets/mascot/v3/{clip}.webp + {clip}.json. Each atlas is a
 * horizontal strip of trimmed frames; the json carries:
 *   frames: [{x,y,w,h}]  trimmed rects in the strip (w/h == trim.w/trim.h)
 *   fps                  clip playback rate
 *   frameSize            edge of the untrimmed cell frames were cut from
 *   anchor: [0.5, 1]     feet anchor INSIDE the trim union bbox (bottom-center)
 *   trim: {x,y,w,h}      union bbox of content inside the untrimmed cell
 *
 * Paste math (feet at the local origin, scale = H / trim.h so the body is
 * exactly H tall with feet on the ground):
 *   dx = -(trim.x + trim.w * anchor[0]) * scale
 *   dy = -(trim.y + trim.h * anchor[1]) * scale
 *   dw = trim.w * scale, dh = trim.h * scale
 *
 * This module owns loading, clip picking and the raw blit ONLY. Every juice
 * layer (shadow, squash & stretch, lunge, hover, glow, flashes, sparks)
 * stays procedural in hero-v2.js so the V3 body feels identical to the old
 * paths. Missing/failed V3 = caller falls back to rig/flipbook/procedural.
 * No DOM, no fetch at import time — headless tests never touch the network.
 */

import { clamp } from './formulas.js?v=golive-pr5';

export const V3_CLIPS = Object.freeze([
  'idle', 'run', 'attack', 'crit', 'sprint', 'hit', 'death', 'celebrate',
]);

let V3 = null; // { clips: { name: { image, frames, fps, frameSize, anchor, trim } } }

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`hero-v3: ${url} -> ${res.status}`);
  return res.json();
}

async function fetchImage(url) {
  const res = await fetch(url);
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
 * Fetch all 8 clips (json + webp) in parallel. Resolves when every clip is
 * ready; rejects on the first failure so the caller can fall back to the rig.
 */
export async function loadHeroV3(basePath) {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const entries = await Promise.all(V3_CLIPS.map(async (name) => {
    const [data, image] = await Promise.all([
      fetchJson(`${base}${name}.json`),
      fetchImage(`${base}${name}.webp`),
    ]);
    if (!data || !Array.isArray(data.frames) || data.frames.length === 0) {
      throw new Error(`hero-v3: clip '${name}' has no frames`);
    }
    const frameSize = data.frameSize || 256;
    const trim = data.trim || { x: 0, y: 0, w: frameSize, h: frameSize };
    return [name, {
      image,
      frames: data.frames,
      fps: data.fps || 12,
      frameSize,
      anchor: data.anchor || [0.5, 1],
      trim,
    }];
  }));
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
 * Attack follows the established engine convention: attack = 1 at impact
 * shows the strike frame, decay plays the follow-through back to rest.
 */
export function pickV3(st) {
  if (!V3) return null;
  const loop = (name) => {
    const c = V3.clips[name];
    return { clip: name, frame: Math.floor(st.t * c.fps) % c.frames.length };
  };
  const scrub = (name, progress) => {
    const c = V3.clips[name];
    const n = c.frames.length;
    return { clip: name, frame: Math.min(n - 1, Math.round(clamp(progress, 0, 1) * (n - 1))) };
  };

  // defeat — death plays forward over the decaying clock, holds last frame
  if ((st.defeatT || 0) > 0) return scrub('death', 1 - clamp(st.defeatT, 0, 1));
  // level-up / gear pull — celebrate loops for the whole window
  if ((st.levelT || 0) > 0 || (st.lootT || 0) > 0) return loop('celebrate');
  // damage flinch — hit plays forward as the recoil envelope decays
  if ((st.recoil || 0) > 0.4) return scrub('hit', 1 - clamp(st.recoil, 0, 1));
  // strike — crit/attack frame tracks the eased attack phase (windup→impact)
  if ((st.attack || 0) > 0.02) return scrub(st.crit ? 'crit' : 'attack', st.attack);
  // overdrive / sprint locomotion
  if (st.overdrive || st.sprint) return loop('sprint');
  // planted idle (Gear niche / overdrive idle pose)
  if (st.pose === 'idle' || st.pose === 'overdrive') return loop('idle');
  // default locomotion
  return loop('run');
}

/**
 * Blit one V3 frame with feet anchored at the current transform origin.
 * H = target body height in px. Returns the dest rect { dx, dy, dw, dh }
 * (content box, feet at bottom-center) so callers can position overlays;
 * null when the clip is unavailable.
 */
export function drawV3Frame(ctx, clipName, frame, H) {
  const c = getV3Clip(clipName);
  if (!c) return null;
  const f = c.frames[frame] || c.frames[0];
  const tr = c.trim;
  const scale = H / tr.h;
  const dw = tr.w * scale;
  const dh = tr.h * scale;
  const dx = -(tr.x + tr.w * c.anchor[0]) * scale;
  const dy = -(tr.y + tr.h * c.anchor[1]) * scale;
  ctx.drawImage(c.image, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
  return { dx, dy, dw, dh };
}
