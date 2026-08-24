/**
 * APN layered editorial parallax world V2.
 *
 * Per-zone seeded mood (5 canonical APN palettes, crimson stays APN-primary
 * only in the night biome), pack background as the dimmed far plate when
 * decoded, procedural mid/near layers on top so every scene stays alive.
 * Static strips are cached offscreen per biome (the paintedMid pattern);
 * animated elements are cheap sin-based shapes. Reduced-motion gates drift.
 *
 * The active Pack also dresses the place: its authored props sheet becomes a
 * sparse near-ground set-dressing band, and the accent pair read out of that
 * same sheet tints the billboard glow and the signal rail. Both are optional —
 * a Pack without decoded props renders exactly the procedural scene.
 *
 * From Corruption epoch 1 on, the Pack's authored `corruption-mask.webp`
 * fissures crack the sky behind the world and a tier-stepped contamination
 * wash, rim, and glow shift carry the drift scene-wide. Tier 0 draws none of
 * it, so every Zone 1–200 scene is byte-identical to the clean build.
 */

const TAU = Math.PI * 2;

/** 5 canonical moods — enriched, token-consistent hues. */
export const BIOMES = [
  {
    id: 'night',
    name: 'Night Feed',
    skyTop: '#070d16',
    skyMid: '#0c1420',
    skyBot: '#0a1018',
    glow: '252,18,67',
    accent: '#FC1243',
    star: 'rgba(220,230,245,',
    aurora: null,
    far: '#0e1622',
    mid: '#152030',
    win: 'rgba(252,80,110,',
    win2: 'rgba(120,180,255,',
    rail: 'rgba(252,18,67,0.5)',
    card: '#141d29',
    ground: '#080d14',
    groundSheen: 'rgba(252,18,67,0.09)',
    ember: '255,120,140',
  },
  {
    id: 'cold',
    name: 'Cold Patch',
    skyTop: '#081420',
    skyMid: '#0b1a28',
    skyBot: '#0a1620',
    glow: '94,176,255',
    accent: '#5eb0ff',
    star: 'rgba(200,225,255,',
    aurora: 'rgba(94,176,255,',
    far: '#0d1c2a',
    mid: '#14293c',
    win: 'rgba(140,200,255,',
    win2: 'rgba(94,176,255,',
    rail: 'rgba(94,176,255,0.5)',
    card: '#12202f',
    ground: '#08111a',
    groundSheen: 'rgba(94,176,255,0.09)',
    ember: '170,210,255',
  },
  {
    id: 'heat',
    name: 'Launch Heat',
    skyTop: '#180e0a',
    skyMid: '#1d130c',
    skyBot: '#160f0a',
    glow: '230,184,77',
    accent: '#e6b84d',
    star: 'rgba(255,230,190,',
    aurora: null,
    far: '#221610',
    mid: '#2c1d12',
    win: 'rgba(255,210,120,',
    win2: 'rgba(230,184,77,',
    rail: 'rgba(230,184,77,0.5)',
    card: '#231a12',
    ground: '#120c08',
    groundSheen: 'rgba(230,184,77,0.09)',
    ember: '255,190,110',
  },
  {
    id: 'live',
    name: 'Live Green',
    skyTop: '#081410',
    skyMid: '#0b1a15',
    skyBot: '#0a1512',
    glow: '62,207,142',
    accent: '#3ecf8e',
    star: 'rgba(200,245,225,',
    aurora: 'rgba(62,207,142,',
    far: '#0e211a',
    mid: '#143026',
    win: 'rgba(140,235,190,',
    win2: 'rgba(62,207,142,',
    rail: 'rgba(62,207,142,0.5)',
    card: '#122419',
    ground: '#08120e',
    groundSheen: 'rgba(62,207,142,0.09)',
    ember: '150,240,190',
  },
  {
    id: 'spoiler',
    name: 'Spoiler Violet',
    skyTop: '#110c1a',
    skyMid: '#150f20',
    skyBot: '#100b18',
    glow: '176,124,255',
    accent: '#b07cff',
    star: 'rgba(230,215,255,',
    aurora: 'rgba(176,124,255,',
    far: '#1a1226',
    mid: '#221736',
    win: 'rgba(210,170,255,',
    win2: 'rgba(176,124,255,',
    rail: 'rgba(176,124,255,0.5)',
    card: '#1c1530',
    ground: '#0e0a16',
    groundSheen: 'rgba(176,124,255,0.09)',
    ember: '215,180,255',
  },
];

/** Deterministic per-zone mood: same zone always lands on the same biome,
 *  adjacent zones (mostly) differ. Zone 0 stays on-brand Night Feed. */
export function biomeForZone(zone) {
  const z = Math.max(0, zone | 0);
  if (z === 0) return BIOMES[0];
  const h = (Math.imul(z + 11, 2654435761) >>> 0) % 5;
  return BIOMES[h];
}

function makeCanvas(w, h) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/* —— cached static strips per biome ——————————————————————————— */

const stripCache = new Map();

/** Far skyline silhouette — tileable 768×220 strip. */
function farStrip(bio) {
  const key = `${bio.id}:far`;
  if (stripCache.has(key)) return stripCache.get(key);
  const c = makeCanvas(768, 220);
  if (!c) return null;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  let x = 0;
  g.fillStyle = bio.far;
  while (x < 768) {
    const bw = 40 + rnd() * 70;
    const bh = 60 + rnd() * 130;
    g.fillRect(x, 220 - bh, bw, bh);
    // antenna tips
    if (rnd() > 0.55) g.fillRect(x + bw * 0.4, 220 - bh - 14 - rnd() * 18, 3, 30);
    x += bw + 6 + rnd() * 22;
  }
  stripCache.set(key, c);
  return c;
}

/** Mid towers with lit windows — tileable 640×260 strip. */
function midStrip(bio) {
  const key = `${bio.id}:mid`;
  if (stripCache.has(key)) return stripCache.get(key);
  const c = makeCanvas(640, 260);
  if (!c) return null;
  const g = c.getContext('2d');
  let seed = 31;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  let x = 0;
  while (x < 640) {
    const bw = 46 + rnd() * 54;
    const bh = 90 + rnd() * 140;
    g.fillStyle = bio.mid;
    g.fillRect(x, 260 - bh, bw, bh);
    // roof notch
    g.fillRect(x + bw * 0.25, 260 - bh - 8, bw * 0.5, 8);
    // window grid — sparse lit windows in two hues
    for (let wy = 260 - bh + 12; wy < 244; wy += 14) {
      for (let wx = x + 7; wx < x + bw - 9; wx += 12) {
        const lit = rnd();
        if (lit > 0.62) {
          g.fillStyle = (lit > 0.85 ? bio.win2 : bio.win) + `${(0.25 + rnd() * 0.5).toFixed(2)})`;
          g.fillRect(wx, wy, 6, 8);
        }
      }
    }
    x += bw + 10 + rnd() * 26;
  }
  stripCache.set(key, c);
  return c;
}

/** Near props — antenna masts + server racks, tileable 720×150 strip. */
function nearStrip(bio) {
  const key = `${bio.id}:near`;
  if (stripCache.has(key)) return stripCache.get(key);
  const c = makeCanvas(720, 150);
  if (!c) return null;
  const g = c.getContext('2d');
  let seed = 53;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 4; i++) {
    const x = i * 180 + rnd() * 60;
    if (rnd() > 0.45) {
      // antenna mast
      g.fillStyle = '#101a26';
      g.fillRect(x, 20, 6, 130);
      g.beginPath();
      g.arc(x + 3, 16, 8, 0, TAU);
      g.fill();
      g.strokeStyle = bio.rail;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x - 14, 44);
      g.lineTo(x + 20, 44);
      g.moveTo(x - 10, 62);
      g.lineTo(x + 16, 62);
      g.stroke();
    } else {
      // server rack
      g.fillStyle = '#131c27';
      g.fillRect(x, 66, 40, 84);
      g.fillStyle = bio.win + '0.5)';
      for (let j = 0; j < 5; j++) g.fillRect(x + 6, 76 + j * 15, 28 * (0.4 + rnd() * 0.6), 4);
    }
  }
  stripCache.set(key, c);
  return c;
}

/** Billboard panel base (per biome) — live headline bars drawn on top. */
function billboardBase(bio) {
  const key = `${bio.id}:bb`;
  if (stripCache.has(key)) return stripCache.get(key);
  const c = makeCanvas(150, 84);
  if (!c) return null;
  const g = c.getContext('2d');
  g.fillStyle = bio.card;
  g.strokeStyle = 'rgba(140,165,195,0.28)';
  g.lineWidth = 2;
  g.beginPath();
  if (g.roundRect) g.roundRect(1, 1, 148, 82, 8);
  else g.rect(1, 1, 148, 82);
  g.fill();
  g.stroke();
  // APN mark: small crimson circle-dot, no logo asset
  g.fillStyle = '#fc1243';
  g.beginPath();
  g.arc(16, 16, 6, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc(16, 16, 2.2, 0, TAU);
  g.fill();
  // headline plate
  g.fillStyle = 'rgba(200,215,235,0.12)';
  g.fillRect(10, 32, 130, 18);
  g.fillStyle = 'rgba(200,215,235,0.08)';
  g.fillRect(10, 56, 96, 10);
  stripCache.set(key, c);
  return c;
}

/** Star field per (biome, quantized viewport). */
function starField(bio, w, h) {
  const key = `${bio.id}:star:${w >> 6}:${h >> 6}`;
  if (stripCache.has(key)) return stripCache.get(key);
  const c = makeCanvas(w, h);
  if (!c) return null;
  const g = c.getContext('2d');
  let seed = 97;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 70; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h * 0.62;
    const r = rnd();
    g.fillStyle = `${bio.star}${(0.12 + r * 0.5).toFixed(2)})`;
    g.fillRect(sx, sy, r > 0.9 ? 2 : 1, r > 0.9 ? 2 : 1);
  }
  stripCache.set(key, c);
  return c;
}

/* —— pack set dressing (the authored props sheet) ————————————— */

/** `props.webp` ships one 512×128 strip: 4 authored 128×128 motifs, each
 *  planted on its own contact shadow at 87.5% of the cell height. Cell size is
 *  derived from the decoded image so the layout stays data-driven. */
const PROP_CELLS = 4;
const PROP_CONTACT = 0.875;

const packToneCache = new Map();
const glowCache = new Map();
const dressCache = new Map();
let dressPackId = null;

/** Knuth-multiply integer hash — the draw path stays free of Math.random. */
function mix32(a, b) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 2654435761);
  h = Math.imul(h ^ (b | 0), 2246822519);
  h ^= h >>> 13;
  return (h ^ (h >>> 7)) >>> 0;
}

function textSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function glowChannels(bio) {
  if (!glowCache.has(bio.id)) {
    glowCache.set(bio.id, bio.glow.split(',').map((channel) => Number(channel)));
  }
  return glowCache.get(bio.id);
}

/** Biome mood stays dominant; the Pack tone only tints it. */
function blendGlow(base, tint, amount) {
  return base
    .map((channel, index) => Math.round(channel + (tint[index] - channel) * amount))
    .join(',');
}

/**
 * Read the Pack's own accent pair out of its authored props sheet: one
 * offscreen readback per Pack, then cached. Flat vector fills dominate the
 * sheet, so the two heaviest saturated buckets are the authored palette roles.
 * Returns null when the sheet cannot be sampled — callers fall back to biome.
 */
function packTone(packId, props) {
  if (packToneCache.has(packId)) return packToneCache.get(packId);
  let tone = null;
  try {
    const plate = makeCanvas(props.naturalWidth, props.naturalHeight);
    if (plate) {
      const g = plate.getContext('2d', { willReadFrequently: true });
      g.drawImage(props, 0, 0);
      const { data } = g.getImageData(0, 0, plate.width, plate.height);
      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 220) continue;
        const r = data[i];
        const gr = data[i + 1];
        const b = data[i + 2];
        const peak = Math.max(r, gr, b);
        // drop the authored ink outline, the contact shadow, and near-greys
        if (peak < 70 || peak - Math.min(r, gr, b) < 42) continue;
        const key = ((r >> 4) << 8) | ((gr >> 4) << 4) | (b >> 4);
        const bucket = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
        bucket.n += 1;
        bucket.r += r;
        bucket.g += gr;
        bucket.b += b;
        buckets.set(key, bucket);
      }
      const ranked = [...buckets.values()].sort((x, y) => y.n - x.n);
      if (ranked.length) {
        const average = (bucket) => [
          Math.round(bucket.r / bucket.n),
          Math.round(bucket.g / bucket.n),
          Math.round(bucket.b / bucket.n),
        ];
        const accent = average(ranked[0]);
        const floor = ranked[0].n * 0.12;
        let second = accent;
        for (let i = 1; i < ranked.length && ranked[i].n >= floor; i += 1) {
          const candidate = average(ranked[i]);
          const gap =
            Math.abs(candidate[0] - accent[0]) +
            Math.abs(candidate[1] - accent[1]) +
            Math.abs(candidate[2] - accent[2]);
          if (gap > 90) {
            second = candidate;
            break;
          }
        }
        tone = { accent, second };
      }
    }
  } catch {
    tone = null;
  }
  packToneCache.set(packId, tone);
  return tone;
}

/** One authored prop cell sunk into the zone's night: enough of the Pack's own
 *  colour survives to read as its art, far too little to rival an actor. */
function dressCell(bio, props, cell, cw, ch) {
  const key = `${bio.id}:${cell}`;
  if (dressCache.has(key)) return dressCache.get(key);
  let plate = null;
  try {
    const c = makeCanvas(cw, ch);
    if (c) {
      const g = c.getContext('2d');
      g.drawImage(props, cell * cw, 0, cw, ch, 0, 0, cw, ch);
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = 0.66;
      g.fillStyle = bio.ground;
      g.fillRect(0, 0, cw, ch);
      // sky-lit top edge keeps the shape legible against the pack plate
      g.globalAlpha = 1;
      const rim = g.createLinearGradient(0, 0, 0, ch * 0.72);
      rim.addColorStop(0, `rgba(${bio.glow},0.24)`);
      rim.addColorStop(1, `rgba(${bio.glow},0)`);
      g.fillStyle = rim;
      g.fillRect(0, 0, cw, ch);
      g.globalCompositeOperation = 'source-over';
      plate = c;
    }
  } catch {
    plate = null;
  }
  dressCache.set(key, plate);
  return plate;
}

/** Sparse near-ground dressing band: deterministic per (Pack, zone, slot),
 *  planted on the ground line, parallaxed with the near layer, no time term —
 *  so reduced motion changes nothing about it. */
function drawPackDressing(ctx, w, gy, scroll, zone, packId, props, bio) {
  const cw = Math.floor(props.naturalWidth / PROP_CELLS);
  const ch = props.naturalHeight;
  if (cw < 8 || ch < 8) return;
  if (dressPackId !== packId) {
    dressPackId = packId;
    dressCache.clear();
  }
  const base = textSeed(packId) ^ Math.imul(zone + 1, 2654435761);
  const slots = 4;
  const span = w + 240;
  const step = span / slots;
  for (let slot = 0; slot < slots; slot += 1) {
    const raw = slot * step - scroll * 0.85;
    const lap = Math.floor(raw / span);
    const cx = raw - lap * span - 120;
    const seed = mix32(base + slot * 977, lap);
    if (seed % 6 === 0) continue; // keeps the band at 2–3 props per screen
    // one rotation per lap, then step by slot: neighbouring dressing never
    // repeats a motif, and the rotation itself moves with zone and lap
    const cell = (mix32(base, lap) + slot) % PROP_CELLS;
    const plate = dressCell(bio, props, cell, cw, ch);
    if (!plate) continue;
    const dh = 64 + ((seed >>> 9) % 32);
    const dw = dh * (cw / ch);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(
      plate,
      Math.round(cx - dw / 2),
      Math.round(gy + 2 - dh * PROP_CONTACT),
      Math.round(dw),
      Math.round(dh),
    );
    ctx.globalAlpha = 1;
  }
}

/* —— corruption drift (the authored corruption mask) ————————— */

/** `corruption-mask.webp` ships the same 512×128 strip shape as the props
 *  sheet: 4 authored 128×128 fissure cells on transparent ground, drawn as
 *  emitted light so a crack never muddies the plate underneath it. */
const DRIFT_CELLS = 4;
const DRIFT_ASPECT = 0.6;

/**
 * Tier-stepped drift treatment. `ink` is the fissure alpha, `wash` the flat
 * scene tint, `rim` the contamination vignette at the frame edge, `glowMix`
 * how far the biome glow bends toward the drift hue. Every value is bounded
 * well under the existing black vignette, and the whole layer sits behind
 * actors and behind the DOM HUD, so readability cannot regress with tier.
 */
const DRIFT_TIERS = Object.freeze([
  null,
  Object.freeze({ fissures: 3, ink: 0.28, hue: [176, 124, 255], wash: 0.042, rim: 0.14, glowMix: 0.14 }),
  Object.freeze({ fissures: 4, ink: 0.34, hue: [196, 100, 238], wash: 0.06, rim: 0.18, glowMix: 0.19 }),
  Object.freeze({ fissures: 5, ink: 0.4, hue: [214, 80, 190], wash: 0.076, rim: 0.22, glowMix: 0.24 }),
  Object.freeze({ fissures: 6, ink: 0.46, hue: [232, 64, 140], wash: 0.092, rim: 0.26, glowMix: 0.3 }),
]);

/** Resolve a Corruption tier to its treatment, or null for a clean scene. */
export function driftTreatmentForTier(tier) {
  const index = Number.isFinite(tier) ? Math.floor(tier) : 0;
  if (index <= 0) return null;
  return DRIFT_TIERS[Math.min(DRIFT_TIERS.length - 1, index)];
}

/**
 * Sky fissures: deterministic per (Pack, zone, slot, lap) through the same
 * integer hash the set dressing uses, parallaxed on the far plane, and with no
 * time term at all — the crack pattern is identical on every frame, so reduced
 * motion has nothing to gate and screenshot evidence stays stable.
 */
function drawDriftFissures(ctx, w, gy, scroll, zone, packId, mask, drift) {
  const cw = Math.floor(mask.naturalWidth / DRIFT_CELLS);
  const ch = mask.naturalHeight;
  if (cw < 8 || ch < 8) return;
  const base = textSeed(`${packId || 'route'}:drift`) ^ Math.imul(zone + 1, 2246822519);
  const span = w + 320;
  const step = span / drift.fissures;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let slot = 0; slot < drift.fissures; slot += 1) {
    const raw = slot * step - scroll * 0.2;
    const lap = Math.floor(raw / span);
    const cx = raw - lap * span - 160;
    const seed = mix32(base + slot * 6151, lap);
    const cell = (mix32(base, lap) + slot) % DRIFT_CELLS;
    const fh = gy * (0.52 + ((seed >>> 7) % 40) / 100);
    const fw = fh * (cw / ch) * DRIFT_ASPECT;
    const fy = gy - fh + ((seed >>> 17) % 18) - 10;
    ctx.globalAlpha = drift.ink * (0.72 + ((seed >>> 11) % 40) / 100);
    ctx.drawImage(
      mask,
      cell * cw,
      0,
      cw,
      ch,
      Math.round(cx - fw / 2),
      Math.round(fy),
      Math.round(fw),
      Math.round(fh),
    );
  }
  ctx.restore();
}

/** Scene-wide contamination: flat wash plus a hue vignette at the edges. */
function drawDriftWash(ctx, w, h, gy, drift) {
  const hue = drift.hue.join(',');
  ctx.fillStyle = `rgba(${hue},${drift.wash})`;
  ctx.fillRect(0, 0, w, h);
  const edge = ctx.createRadialGradient(
    w / 2,
    gy * 0.62,
    Math.min(w, h) * 0.28,
    w / 2,
    gy * 0.62,
    Math.max(w, h) * 0.78,
  );
  edge.addColorStop(0, `rgba(${hue},0)`);
  edge.addColorStop(0.55, `rgba(${hue},${drift.rim * 0.35})`);
  edge.addColorStop(1, `rgba(${hue},${drift.rim})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
}

function drawCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = Math.max(0, image.naturalHeight - sourceHeight);
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

/** Tile a cached strip across the viewport with parallax offset. */
function tile(ctx, strip, y, hgt, w, scrollPx) {
  if (!strip) return;
  const sw = strip.width * (hgt / strip.height);
  const ox = -(((scrollPx % sw) + sw) % sw);
  for (let x = ox - sw; x < w + sw; x += sw - 1) {
    ctx.drawImage(strip, x, y, sw, hgt);
  }
}

/* —— main entry ———————————————————————————————————————— */

/**
 * Draw the full scene behind actors. o = { zone, gy, scroll, t,
 * reducedMotion, packBg (decoded Image|null), packProps (decoded Image|null),
 * packCorruption (decoded Image|null), packId (string|null),
 * driftTier (0–4) }.
 */
export function drawScenery(ctx, w, h, o) {
  const bio = biomeForZone(o.zone);
  const gy = o.gy;
  const scroll = o.scroll;
  const t = o.t;
  const still = !!o.reducedMotion;
  const props = o.packId && o.packProps ? o.packProps : null;
  const tone = props ? packTone(o.packId, props) : null;
  const glow = glowChannels(bio);
  const drift = driftTreatmentForTier(o.driftTier);
  const driftMask = drift && o.packCorruption ? o.packCorruption : null;
  // Pack identity threads into exactly two procedural accents; every other
  // glow on the scene stays pure biome so the zone mood still leads.
  const billboardGlow = tone ? blendGlow(glow, tone.accent, 0.4) : bio.glow;
  const railGlow = tone ? blendGlow(glow, tone.second, 0.4) : bio.glow;
  const railStroke = tone ? `rgba(${railGlow},0.5)` : bio.rail;
  // Drift bends the scene's own light toward the era hue. Tier 0 keeps the
  // exact biome string, so a clean scene emits identical paint.
  const sceneGlow = drift ? blendGlow(glow, drift.hue, drift.glowMix) : bio.glow;

  // 1 · sky
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, bio.skyTop);
  sky.addColorStop(0.55, bio.skyMid);
  sky.addColorStop(1, bio.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // stars
  const stars = starField(bio, w, h);
  if (stars) {
    ctx.globalAlpha = 0.9;
    ctx.drawImage(stars, 0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  // aurora bands (cold / live / spoiler)
  if (bio.aurora) {
    const drift = still ? 0 : t * 6;
    for (let band = 0; band < 2; band++) {
      ctx.fillStyle = `${bio.aurora}${0.05 - band * 0.015})`;
      ctx.beginPath();
      const baseY = h * (0.14 + band * 0.1);
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= w; x += 24) {
        ctx.lineTo(x, baseY + Math.sin((x + drift * (band + 1)) * 0.014 + band * 2) * 16);
      }
      for (let x = w; x >= 0; x -= 24) {
        ctx.lineTo(x, baseY + 34 + Math.sin((x + drift * (band + 1)) * 0.011 + band * 2 + 1) * 18);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // horizon bloom
  const bloom = ctx.createRadialGradient(w * 0.68, gy * 0.5, 8, w * 0.68, gy * 0.5, w * 0.65);
  bloom.addColorStop(0, `rgba(${sceneGlow},0.16)`);
  bloom.addColorStop(0.5, `rgba(${sceneGlow},0.05)`);
  bloom.addColorStop(1, `rgba(${sceneGlow},0)`);
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  if (o.packBg) {
    // 2 · pack plate as the FAR layer, dimmed, procedural life continues on top
    ctx.save();
    ctx.globalAlpha = 0.68;
    drawCover(ctx, o.packBg, 0, 0, w, h);
    ctx.restore();
    // biome wash ties the plate into the zone mood without veiling the motif
    ctx.fillStyle = `rgba(${sceneGlow},0.035)`;
    ctx.fillRect(0, 0, w, gy);
  } else {
    // 2 · far skyline silhouette
    ctx.globalAlpha = 0.85;
    tile(ctx, farStrip(bio), gy - Math.min(210, gy * 0.62) - 26, Math.min(210, gy * 0.62), w, scroll * 0.12);
    ctx.globalAlpha = 1;
  }

  // 3 · mid towers with lit windows
  const midH = Math.min(250, gy * 0.72);
  ctx.globalAlpha = o.packBg ? 0.6 : 0.95;
  tile(ctx, midStrip(bio), gy - midH - 6, midH, w, scroll * 0.28);
  ctx.globalAlpha = 1;

  // 3b · drift fissures crack the sky and the towers, still behind the near
  // plane and every actor, so depth reads and readability never regresses
  if (driftMask) {
    drawDriftFissures(ctx, w, gy, scroll, o.zone, o.packId, driftMask, drift);
  }

  // 4 · animated billboards (fake APN headline bars — no real logos)
  const bb = billboardBase(bio);
  if (bb) {
    for (let i = 0; i < 3; i++) {
      const spacing = 300;
      const bx = ((i * spacing - scroll * 0.42) % (w + spacing) + (w + spacing)) % (w + spacing) - 150;
      const by = gy - 190 - (i % 2) * 46;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(bb, bx, by, 150, 84);
      ctx.globalAlpha = 1;
      // scrolling headline bar + blink
      const crawl = still ? 0.4 : ((t * 0.35 + i * 0.33) % 1);
      ctx.fillStyle = i === 0 ? 'rgba(252,18,67,0.75)' : `${bio.win}0.7)`;
      ctx.fillRect(bx + 12 + crawl * 108, by + 36, 22, 10);
      const blink = still ? 1 : (Math.sin(t * 2.4 + i * 2) > 0 ? 1 : 0.35);
      ctx.fillStyle = `rgba(${billboardGlow},${0.7 * blink})`;
      ctx.fillRect(bx + 12, by + 58, 30 + ((i * 37) % 40), 6);
    }
  }

  // 5 · signal rails with moving pulse dots
  const railY = gy - 108;
  ctx.strokeStyle = railStroke;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, railY);
  ctx.lineTo(w, railY + 6);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (!still) {
    ctx.fillStyle = `rgba(${railGlow},0.85)`;
    for (let i = 0; i < 6; i++) {
      const px = ((i * 170 + t * 46 - scroll * 0.55) % (w + 60) + (w + 60)) % (w + 60) - 30;
      const py = railY + (px / w) * 6;
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, TAU);
      ctx.fill();
    }
  }

  // 6 · floating feed cards
  for (let i = 0; i < 4; i++) {
    const spacing = 240;
    const cx = ((i * spacing - scroll * 0.68) % (w + spacing) + (w + spacing)) % (w + spacing) - 120;
    const cardW = 84 + (i % 2) * 22;
    const cardH = 34 + (i % 2) * 8;
    const cy = gy - cardH - 64 - (i % 3) * 26 + (still ? 0 : Math.sin(t * 1.7 + i * 1.3) * 3);
    ctx.fillStyle = bio.card;
    ctx.strokeStyle = 'rgba(140,165,195,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx, cy, cardW, cardH, 7);
    else ctx.rect(cx, cy, cardW, cardH);
    ctx.fill();
    ctx.stroke();
    // accent spine + text lines
    ctx.fillStyle = i === 1 ? '#fc1243' : bio.accent;
    ctx.fillRect(cx, cy + 4, 4, cardH - 8);
    ctx.fillStyle = 'rgba(220,232,245,0.2)';
    ctx.fillRect(cx + 13, cy + 9, cardW - 30, 4);
    ctx.fillStyle = 'rgba(220,232,245,0.12)';
    ctx.fillRect(cx + 13, cy + 19, cardW - 46, 3.5);
  }

  // 7 · near props
  ctx.globalAlpha = 0.95;
  tile(ctx, nearStrip(bio), gy - 148, 148, w, scroll * 0.85);
  ctx.globalAlpha = 1;

  // 7b · pack set dressing — shares the near plane, still behind every actor
  // and behind the ground plate, so the props plant on the horizon line
  if (props) drawPackDressing(ctx, w, gy, scroll, o.zone, o.packId, props, bio);

  // 8 · ground plane + sheen + reflection
  const gg = ctx.createLinearGradient(0, gy, 0, h);
  gg.addColorStop(0, bio.ground);
  gg.addColorStop(1, '#04070b');
  ctx.fillStyle = gg;
  ctx.fillRect(0, gy, w, h - gy);
  ctx.fillStyle = bio.groundSheen;
  ctx.fillRect(0, gy, w, 26);
  // fake reflection streaks below the horizon glow
  const refl = ctx.createLinearGradient(0, gy, 0, gy + 54);
  refl.addColorStop(0, `rgba(${sceneGlow},0.12)`);
  refl.addColorStop(1, `rgba(${sceneGlow},0)`);
  ctx.fillStyle = refl;
  ctx.fillRect(w * 0.42, gy, w * 0.52, 54);

  // horizon line
  const line = ctx.createLinearGradient(0, gy, w, gy);
  line.addColorStop(0, `rgba(${sceneGlow},0)`);
  line.addColorStop(0.2, `rgba(${sceneGlow},0.55)`);
  line.addColorStop(0.8, `rgba(${sceneGlow},0.55)`);
  line.addColorStop(1, `rgba(${sceneGlow},0)`);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  for (let x = 0; x <= w; x += 8) {
    ctx.lineTo(x, gy + Math.sin((x + scroll) * 0.03) * 1.3);
  }
  ctx.stroke();

  // lane dashes
  ctx.strokeStyle = 'rgba(90,110,135,0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([12, 16]);
  ctx.beginPath();
  ctx.moveTo(0, gy + 20);
  ctx.lineTo(w, gy + 20);
  ctx.stroke();
  ctx.setLineDash([]);

  // 9 · drifting embers / dust
  if (!still) {
    for (let i = 0; i < 16; i++) {
      const ax = ((i * 97 + scroll * 0.5 + t * 6) % (w + 30)) - 15;
      const ay = ((i * 53 + t * 14) % (gy - 30)) + 12;
      ctx.globalAlpha = 0.1 + (i % 5) * 0.045;
      ctx.fillStyle = `rgba(${bio.ember},1)`;
      ctx.fillRect(ax, ay, i % 4 === 0 ? 3 : 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // 10 · scene-wide contamination — last scenery pass, so the whole world sits
  // inside the era. Actors, overlays, and the DOM HUD all paint above it.
  if (drift) drawDriftWash(ctx, w, h, gy, drift);

  return bio;
}
