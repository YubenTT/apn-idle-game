/**
 * V3 vinyl creature atlases — The Curator / The Recon / The Hotshot.
 *
 * Self-contained loader + blitter for the generated clip atlases under
 * assets/creatures/. Sixteen atlases total (curator 6, recon 5, hotshot 5;
 * hotshot files carry a `hotshot-` name prefix). Each clip JSON follows the
 * shared atlas contract: { frames:[{x,y,w,h}], fps, frameSize, anchor:[0.5,1],
 * trim:{x,y,w,h} } — the trim rect is the visible sprite inside one frameSize
 * box, anchored foot-center.
 *
 * Clip playback modes:
 *  - LOOP clips (idle / advance / broken): `t` is wall-clock seconds; the frame
 *    is `floor(t * fps) % frames.length`.
 *  - PROGRESS clips (attack / hit / death): `t` is a 0→1 progress clamped to
 *    the final frame, so one-shots freeze on their last pose.
 *
 * Everything fails soft: until an atlas is ready, drawCreature returns false
 * and render.js keeps the procedural feed-noise family on stage.
 */

const CLIPS = {
  curator: ['idle', 'advance', 'attack', 'hit', 'death', 'broken'],
  recon: ['idle', 'advance', 'attack', 'hit', 'death'],
  hotshot: ['idle', 'advance', 'attack', 'hit', 'death'],
};
const FILE_PREFIX = { curator: '', recon: '', hotshot: 'hotshot-' };
const LOOP_CLIPS = new Set(['idle', 'advance', 'broken']);

/** `${kind}/${clip}` → { img, meta, ready } */
const store = new Map();
let startPromise = null;

const keyOf = (kind, clip) => `${kind}/${clip}`;
const srcOf = (kind, clip, ext) =>
  `assets/creatures/${kind}/${FILE_PREFIX[kind] || ''}${clip}.${ext}`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image failed: ${src}`));
    img.src = `./${src}`;
  });
}

async function loadJson(src) {
  const response = await fetch(`./${src}`);
  if (!response.ok) throw new Error(`JSON failed ${response.status}: ${src}`);
  return response.json();
}

function contractOk(meta) {
  return (
    meta &&
    Array.isArray(meta.frames) &&
    meta.frames.length > 0 &&
    meta.frames.every((f) => Number.isFinite(f.x) && Number.isFinite(f.y) && f.w > 0 && f.h > 0) &&
    Number.isFinite(meta.fps) &&
    meta.fps > 0 &&
    meta.trim &&
    meta.trim.w > 0 &&
    meta.trim.h > 0
  );
}

async function loadClip(kind, clip) {
  const entry = { img: null, meta: null, ready: false };
  store.set(keyOf(kind, clip), entry);
  try {
    const [img, meta] = await Promise.all([
      loadImage(srcOf(kind, clip, 'webp')),
      loadJson(srcOf(kind, clip, 'json')),
    ]);
    if (contractOk(meta)) {
      entry.img = img;
      entry.meta = meta;
      entry.ready = true;
    }
  } catch {
    /* not-ready: the procedural family keeps covering this creature */
  }
}

// ORCHESTRATOR: call loadCreatures() at boot (main.js wire-up) — safe to call
// more than once; all sixteen atlases load in parallel and failures degrade
// to the procedural fallback per clip.
export function loadCreatures() {
  if (!startPromise) {
    const jobs = [];
    for (const kind of Object.keys(CLIPS)) {
      for (const clip of CLIPS[kind]) jobs.push(loadClip(kind, clip));
    }
    startPromise = Promise.all(jobs);
  }
  return startPromise;
}

/** True once every clip of every creature kind is decoded and drawable. */
export function creaturesReady() {
  for (const kind of Object.keys(CLIPS)) {
    for (const clip of CLIPS[kind]) {
      if (!store.get(keyOf(kind, clip))?.ready) return false;
    }
  }
  return true;
}

/** Per-clip readiness so render.js can fall back clip-by-clip. */
export function creatureClipReady(kind, clip) {
  return !!store.get(keyOf(kind, clip))?.ready;
}

/**
 * Blit one frame at foot pivot (x, footY) with drawn height `height`.
 * Loop clips read `t` as seconds; progress clips read `t` as 0→1.
 * Returns false (draws nothing) when the clip atlas is not ready.
 */
export function drawCreature(ctx, kind, clip, t, x, footY, height) {
  const entry = store.get(keyOf(kind, clip));
  if (!entry?.ready) return false;
  const { img, meta } = entry;
  const frames = meta.frames;
  const n = frames.length;
  const i = LOOP_CLIPS.has(clip)
    ? Math.floor(Math.max(0, t) * meta.fps) % n
    : Math.min(n - 1, Math.floor(Math.min(1, Math.max(0, t)) * n));
  const f = frames[i];
  const tr = meta.trim;
  const s = height / tr.h;
  ctx.drawImage(
    img,
    f.x,
    f.y,
    f.w,
    f.h,
    x - (tr.x + tr.w * 0.5) * s,
    footY - (tr.y + tr.h) * s,
    tr.w * s,
    tr.h * s
  );
  return true;
}
