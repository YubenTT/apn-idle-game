/**
 * APN layered editorial parallax world V2.
 *
 * Per-zone seeded mood (5 canonical APN palettes, crimson stays APN-primary
 * only in the night biome), pack background as the dimmed far plate when
 * decoded, procedural mid/near layers on top so every scene stays alive.
 * Static strips are cached offscreen per biome (the paintedMid pattern);
 * animated elements are cheap sin-based shapes. Reduced-motion gates drift.
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
 * reducedMotion, packBg (decoded Image|null) }.
 */
export function drawScenery(ctx, w, h, o) {
  const bio = biomeForZone(o.zone);
  const gy = o.gy;
  const scroll = o.scroll;
  const t = o.t;
  const still = !!o.reducedMotion;

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
  bloom.addColorStop(0, `rgba(${bio.glow},0.16)`);
  bloom.addColorStop(0.5, `rgba(${bio.glow},0.05)`);
  bloom.addColorStop(1, `rgba(${bio.glow},0)`);
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  if (o.packBg) {
    // 2 · pack plate as the FAR layer, dimmed, procedural life continues on top
    ctx.save();
    ctx.globalAlpha = 0.6;
    drawCover(ctx, o.packBg, 0, 0, w, h);
    ctx.restore();
    // biome wash ties the plate into the zone mood
    ctx.fillStyle = `rgba(${bio.glow},0.05)`;
    ctx.fillRect(0, 0, w, gy);
  } else {
    // 2 · far skyline silhouette
    ctx.globalAlpha = 0.85;
    tile(ctx, farStrip(bio), gy - Math.min(210, gy * 0.62) - 26, Math.min(210, gy * 0.62), w, scroll * 0.12);
    ctx.globalAlpha = 1;
  }

  // 3 · mid towers with lit windows
  const midH = Math.min(250, gy * 0.72);
  ctx.globalAlpha = o.packBg ? 0.66 : 0.95;
  tile(ctx, midStrip(bio), gy - midH - 6, midH, w, scroll * 0.28);
  ctx.globalAlpha = 1;

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
      ctx.fillStyle = `rgba(${bio.glow},${0.7 * blink})`;
      ctx.fillRect(bx + 12, by + 58, 30 + ((i * 37) % 40), 6);
    }
  }

  // 5 · signal rails with moving pulse dots
  const railY = gy - 108;
  ctx.strokeStyle = bio.rail;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, railY);
  ctx.lineTo(w, railY + 6);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (!still) {
    ctx.fillStyle = `rgba(${bio.glow},0.85)`;
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
  refl.addColorStop(0, `rgba(${bio.glow},0.12)`);
  refl.addColorStop(1, `rgba(${bio.glow},0)`);
  ctx.fillStyle = refl;
  ctx.fillRect(w * 0.42, gy, w * 0.52, 54);

  // horizon line
  const line = ctx.createLinearGradient(0, gy, w, gy);
  line.addColorStop(0, `rgba(${bio.glow},0)`);
  line.addColorStop(0.2, `rgba(${bio.glow},0.55)`);
  line.addColorStop(0.8, `rgba(${bio.glow},0.55)`);
  line.addColorStop(1, `rgba(${bio.glow},0)`);
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

  return bio;
}
