/** APN Idle canvas — biomes, death juice, confetti, Host + enemies */

import { C, clamp, easeOutCubic, easeOutQuad } from './formulas.js?v=golive-pr5';
import { getCurrentPackAssets } from './assets.js?v=golive-pr5';
import { HOST_PRESENTATION, resolveHostClip } from './host-contract.js?v=golive-pr5';

const V = 'v8';
let hostAtlas = null;
fetch(`./assets/mascot/atlas/apn-mascot-base.json?${V}`)
  .then((response) => response.json())
  .then((atlas) => { hostAtlas = atlas; })
  .catch(() => { hostAtlas = null; });
const sprites = {
  mascot: loadImg(`./assets/mascot/apn-mascot-base.webp?${V}`),
  enemies: {
    stale: loadImg(`./assets/enemies/stale.png?${V}`),
    rumor: loadImg(`./assets/enemies/rumor.png?${V}`),
    lag: loadImg(`./assets/enemies/lag.png?${V}`),
    spoiler: loadImg(`./assets/enemies/spoiler.png?${V}`),
    patch: loadImg(`./assets/enemies/patch.png?${V}`),
    event: loadImg(`./assets/enemies/event.png?${V}`),
    boss: loadImg(`./assets/enemies/boss.png?${V}`),
  },
};

const FOOT_PAD = 2;
const enemyRenderSize = (enemy) => enemy.type === 'boss' ? 128 : enemy.type === 'patch' ? 94 : 88;
export const CANVAS_TONE_TOKENS = Object.freeze({
  signal: '--c-signal',
  notes: '--c-notes',
  sp: '--c-sp',
});
const canvasToneColors = new Map();

function resolveCanvasPaint(paint) {
  if (typeof paint === 'string') return paint;
  const tone = paint?.tone;
  const token = CANVAS_TONE_TOKENS[tone];
  if (!token) throw new Error(`Unknown Canvas tone: ${tone || '(missing)'}`);
  if (canvasToneColors.has(tone)) return canvasToneColors.get(tone);
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!value) throw new Error(`Missing Canvas color token: ${token}`);
  canvasToneColors.set(tone, value);
  return value;
}

/** 5 biomes — painted midground strips (cached canvas “PNG” look) */
const BIOMES = [
  {
    id: 'night',
    name: 'Night Feed',
    top: '#0a1018',
    mid: '#10161f',
    ground: '#080c11',
    glow: '252,18,67',
    accent: '#FC1243',
    far: '#121a24',
    midCol: '#171f2a',
    paint: ['#0d1520', '#1a1020', '#FC1243'],
  },
  {
    id: 'cold',
    name: 'Cold Patch',
    top: '#0a1520',
    mid: '#0e1a26',
    ground: '#081018',
    glow: '94,176,255',
    accent: '#5eb0ff',
    far: '#102030',
    midCol: '#152838',
    paint: ['#0c1a28', '#143040', '#5eb0ff'],
  },
  {
    id: 'heat',
    name: 'Launch Heat',
    top: '#1a100c',
    mid: '#1c1410',
    ground: '#120c0a',
    glow: '230,184,77',
    accent: '#e6b84d',
    far: '#241810',
    midCol: '#2a1c14',
    paint: ['#1c1008', '#302010', '#e6b84d'],
  },
  {
    id: 'live',
    name: 'Live Green',
    top: '#0a1612',
    mid: '#0e1a16',
    ground: '#081210',
    glow: '62,207,142',
    accent: '#3ecf8e',
    far: '#10241c',
    midCol: '#143028',
    paint: ['#0a1814', '#143028', '#3ecf8e'],
  },
  {
    id: 'spoiler',
    name: 'Spoiler Violet',
    top: '#140e1c',
    mid: '#16101e',
    ground: '#0e0a14',
    glow: '192,132,252',
    accent: '#c084fc',
    far: '#1c1428',
    midCol: '#241830',
    paint: ['#140e1c', '#241830', '#c084fc'],
  },
];

/** Cached painted midground strips (512×180) — procedural “hand-painted” look */
const midCache = new Map();

function paintedMid(bio) {
  if (midCache.has(bio.id)) return midCache.get(bio.id);
  const W = 512;
  const H = 180;
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!c) return null;
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  // base wash
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, bio.paint[0]);
  grad.addColorStop(0.55, bio.paint[1]);
  grad.addColorStop(1, bio.ground);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // soft hills / silhouette ridge
  g.fillStyle = bio.far;
  g.beginPath();
  g.moveTo(0, H * 0.72);
  for (let x = 0; x <= W; x += 16) {
    const y = H * 0.55 + Math.sin(x * 0.02) * 18 + Math.sin(x * 0.05) * 8;
    g.lineTo(x, y);
  }
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();
  // city / feed towers block-in
  for (let i = 0; i < 14; i++) {
    const x = (i * 40 + 12) % W;
    const bh = 40 + ((i * 37) % 55);
    const bw = 18 + (i % 3) * 8;
    g.fillStyle = bio.midCol;
    g.globalAlpha = 0.85;
    g.fillRect(x, H - bh - 8, bw, bh);
    // neon windows
    g.fillStyle = bio.accent;
    g.globalAlpha = 0.15 + (i % 4) * 0.05;
    for (let wy = H - bh + 6; wy < H - 16; wy += 10) {
      g.fillRect(x + 4, wy, bw - 8, 3);
    }
  }
  g.globalAlpha = 1;
  // painted accent strokes
  g.strokeStyle = bio.accent;
  g.globalAlpha = 0.12;
  g.lineWidth = 3;
  g.beginPath();
  for (let x = 0; x < W; x += 8) {
    const y = H * 0.35 + Math.sin(x * 0.03) * 20;
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.globalAlpha = 1;
  // fog band
  const fog = g.createLinearGradient(0, H * 0.5, 0, H);
  fog.addColorStop(0, 'rgba(0,0,0,0)');
  fog.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = fog;
  g.fillRect(0, 0, W, H);
  midCache.set(bio.id, c);
  return c;
}

function loadImg(src) {
  const img = new Image();
  img.src = src;
  img._ready = false;
  img.onload = () => {
    img._ready = true;
  };
  img.onerror = () => {
    img._ready = false;
  };
  return img;
}

function ready(img) {
  return img && (img._ready || img.complete) && img.naturalWidth > 0;
}

const FALLBACK_BIOME = BIOMES[0];

export function sizeCanvas(canvas) {
  const parent = canvas.parentElement;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = parent.clientWidth;
  const h = Math.max(220, parent.clientHeight);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h, ctx };
}

export function draw(ctx, w, h, s, assetStore = null) {
  const gy = h * 0.86;
  s.world.groundY = gy;
  const t = s.world.time;
  const scroll = s.world.scrollSmooth;
  const shakeX = s.world.shake ? (Math.random() - 0.5) * s.world.shake : 0;
  const shakeY = s.world.shake ? (Math.random() - 0.5) * s.world.shake : 0;
  const bio = FALLBACK_BIOME;
  const packAssets = assetStore ? getCurrentPackAssets(assetStore, s.route) : null;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // --- sky ---
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, bio.top);
  bg.addColorStop(0.5, bio.mid);
  bg.addColorStop(1, bio.ground);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // bloom
  const bloom = ctx.createRadialGradient(w * 0.7, h * 0.28, 8, w * 0.7, h * 0.28, w * 0.6);
  bloom.addColorStop(0, `rgba(${bio.glow},0.18)`);
  bloom.addColorStop(0.45, `rgba(${bio.glow},0.05)`);
  bloom.addColorStop(1, `rgba(${bio.glow},0)`);
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  // soft orbs
  ctx.fillStyle = `rgba(${bio.glow},0.07)`;
  ctx.beginPath();
  ctx.arc(w * 0.16, h * 0.18, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(108,184,255,0.05)';
  ctx.beginPath();
  ctx.arc(w * 0.88, h * 0.14, 36, 0, Math.PI * 2);
  ctx.fill();

  // painted midground strip (parallax tile)
  const mid = paintedMid(bio);
  if (mid) {
    const mh = Math.min(gy * 0.85, 160);
    const my = gy - mh;
    const mw = mid.width * (mh / mid.height);
    const ox = -((scroll * 0.22) % mw);
    ctx.globalAlpha = 0.92;
    for (let x = ox - mw; x < w + mw; x += mw - 1) {
      ctx.drawImage(mid, x, my, mw, mh);
    }
    ctx.globalAlpha = 1;
  }

  // parallax props (near layers)
  drawFarSilhouettes(ctx, w, gy, scroll * 0.18, bio);
  drawMidProps(ctx, w, gy, scroll * 0.4, bio, t);
  drawFeedCards(ctx, w, gy, scroll * 0.55, bio, t);
  drawServerRacks(ctx, w, gy, scroll * 0.75, bio);

  // Catalog-driven environment owns the scene once decoded. The procedural
  // fallback above remains only for a missing/slow asset and never chooses a pack.
  if (packAssets?.ready && ready(packAssets.background)) {
    drawCover(ctx, packAssets.background, 0, 0, w, h);
  }

  // ground plane + texture
  ctx.fillStyle = bio.ground;
  ctx.fillRect(0, gy, w, h - gy);
  // ground sheen
  const gshine = ctx.createLinearGradient(0, gy, 0, h);
  gshine.addColorStop(0, `rgba(${bio.glow},0.08)`);
  gshine.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gshine;
  ctx.fillRect(0, gy, w, 28);

  // ground line
  const line = ctx.createLinearGradient(0, gy, w, gy);
  line.addColorStop(0, `rgba(${bio.glow},0)`);
  line.addColorStop(0.2, `rgba(${bio.glow},0.55)`);
  line.addColorStop(0.8, `rgba(${bio.glow},0.55)`);
  line.addColorStop(1, `rgba(${bio.glow},0)`);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  for (let x = 0; x <= w; x += 6) {
    ctx.lineTo(x, gy + Math.sin((x + scroll) * 0.03) * 1.4);
  }
  ctx.stroke();

  // lane dashes
  ctx.strokeStyle = 'rgba(48,56,66,0.65)';
  ctx.lineWidth = 1;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(0, gy + 18);
  ctx.lineTo(w, gy + 18);
  ctx.stroke();
  ctx.setLineDash([]);

  // dust motes
  if (!s.settings.reducedMotion) {
    for (let i = 0; i < 24; i++) {
      const ax = ((i * 91 + scroll * 0.55) % (w + 30)) - 15;
      const ay = ((i * 47 + t * 20) % (gy - 20)) + 10;
      ctx.globalAlpha = 0.12 + (i % 5) * 0.04;
      ctx.fillStyle = `rgba(200,210,220,1)`;
      ctx.fillRect(ax, ay, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // alerts
  for (const a of s.world.alerts) drawAlert(ctx, a, t);

  // enemies (living + dying)
  const show = s.world.enemies.filter((e) => e.hp > 0 || (e.deathT && e.deathT > 0));
  show.forEach((e) => drawEnemy(ctx, e, gy, t, packAssets));

  // hero
  drawHero(ctx, s.world.heroDisplayX, gy, s, t);

  // particles
  for (const p of s.world.particles) drawParticle(ctx, p);

  // Currency reward travels from the defeated target to its owning HUD chip.
  for (const flight of s.world.lootFlights || []) drawLootFlight(ctx, flight, s, w, gy);

  // confetti
  for (const c of s.world.confetti || []) drawConfettiBit(ctx, c);

  // floaters
  ctx.textAlign = 'center';
  for (const f of s.world.floaters) {
    if (f.anchorId) {
      const anchor = s.world.enemies.find((enemy) => enemy.id === f.anchorId);
      if (anchor) {
        f.x = anchor.displayX;
        f.y = gy - enemyRenderSize(anchor) * 0.82;
      }
    }
    const life = f.life || 1;
    const u = clamp(f.t / life, 0, 1);
    const a = easeOutCubic(u);
    const pop = f.big ? 1 + (1 - u) * 0.4 : 1 + (1 - u) * 0.2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(f.x, f.y);
    ctx.scale(pop, pop);
    const size = f.big ? 17 : 13;
    ctx.font = `900 ${size}px system-ui, -apple-system, sans-serif`;
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(6,8,10,0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = resolveCanvasPaint(f.color);
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // rank flash overlay
  if (s.ui.fx && s.ui.fx.kind === 'rank') {
    const a = clamp(s.ui.fx.t / 0.55, 0, 1);
    ctx.fillStyle = `rgba(62,207,142,${0.12 * a})`;
    ctx.fillRect(0, 0, w, h);
  }

  // vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.22, w / 2, h / 2, h * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // boss timer (below stage Zone/Rank HUD)
  if (s.world.bossActive) {
    const ratio = clamp(s.world.bossTimer / C.BOSS_TIMER, 0, 1);
    const bx = w * 0.18;
    const bw = w * 0.64;
    const by = 54;
    ctx.fillStyle = 'rgba(10,14,19,0.8)';
    roundRect(ctx, bx, by, bw, 10, 5);
    ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#A3072F');
    g.addColorStop(1, '#FC1243');
    ctx.fillStyle = g;
    roundRect(ctx, bx, by, bw * ratio, 10, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(245,246,248,0.85)';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERSION GATE', w / 2, by + 22);
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = Math.max(0, image.naturalHeight - sourceHeight);
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawPackTag(ctx, w, label, bio) {
  if (!label) return;
  ctx.save();
  ctx.font = '700 10px system-ui,sans-serif';
  const tw = ctx.measureText(label).width;
  const x = w - tw - 16;
  // Below in-stage Zone/Rank strip
  const y = 48;
  ctx.fillStyle = 'rgba(8,12,16,0.45)';
  roundRect(ctx, x, y, tw + 12, 16, 5);
  ctx.fill();
  ctx.fillStyle = bio.accent;
  ctx.globalAlpha = 0.75;
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 6, y + 11);
  ctx.restore();
}

function drawFarSilhouettes(ctx, w, gy, scroll, bio) {
  for (let i = 0; i < 6; i++) {
    const x = ((i * 160 - scroll) % (w + 200)) - 80;
    const h = 40 + (i % 3) * 18;
    ctx.fillStyle = bio.far;
    ctx.globalAlpha = 0.55;
    roundRect(ctx, x, gy - h - 20, 50 + (i % 2) * 30, h, 4);
    ctx.fill();
    // tiny window lights
    ctx.fillStyle = bio.accent;
    ctx.globalAlpha = 0.15 + (i % 3) * 0.05;
    for (let j = 0; j < 3; j++) {
      ctx.fillRect(x + 8 + j * 14, gy - h - 8, 6, 4);
    }
  }
  ctx.globalAlpha = 1;
}

function drawMidProps(ctx, w, gy, scroll, bio, t) {
  for (let i = 0; i < 5; i++) {
    const x = ((i * 190 - scroll) % (w + 220)) - 90;
    // feed tower / mast
    ctx.fillStyle = bio.midCol;
    ctx.fillRect(x + 18, gy - 95, 8, 95);
    ctx.beginPath();
    ctx.arc(x + 22, gy - 100, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bio.accent;
    ctx.globalAlpha = 0.35 + Math.sin(t * 3 + i) * 0.15;
    ctx.beginPath();
    ctx.arc(x + 22, gy - 100, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // billboard
    if (i % 2 === 0) {
      ctx.fillStyle = bio.midCol;
      roundRect(ctx, x + 40, gy - 70, 56, 36, 4);
      ctx.fill();
      ctx.fillStyle = bio.accent;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x + 40, gy - 70, 4, 36);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(245,246,248,0.12)';
      ctx.fillRect(x + 50, gy - 58, 36, 4);
      ctx.fillRect(x + 50, gy - 50, 24, 3);
    }
  }
}

function drawFeedCards(ctx, w, gy, scroll, bio, t) {
  const colors = [bio.accent, '#6cb8ff', '#d180ff', '#10B981', '#f0b964'];
  for (let i = 0; i < 5; i++) {
    const x = ((i * 175 - scroll * 0.7) % (w + 180)) - 90;
    const cardH = 30 + (i % 2) * 10;
    const y = gy - cardH - 52 - (i % 2) * 12;
    const bob = Math.sin(t * 2 + i) * 1.5;
    ctx.fillStyle = '#171D22';
    roundRect(ctx, x, y + bob, 74 + (i % 2) * 18, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(48,56,66,0.95)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = colors[i % colors.length];
    roundRect(ctx, x, y + bob, 4, cardH, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(245,246,248,0.16)';
    ctx.fillRect(x + 12, y + bob + 10, 42, 4);
    ctx.fillRect(x + 12, y + bob + 20, 28, 3);
  }
}

function drawServerRacks(ctx, w, gy, scroll, bio) {
  for (let i = 0; i < 5; i++) {
    const x = ((i * 200 - scroll) % (w + 220)) - 100;
    ctx.fillStyle = '#151a20';
    ctx.fillRect(x, gy - 70, 36, 70);
    ctx.fillStyle = i % 2 ? `rgba(${bio.glow},0.4)` : 'rgba(16,185,129,0.35)';
    for (let j = 0; j < 4; j++) {
      ctx.fillRect(x + 6, gy - 60 + j * 14, 24, 4);
    }
  }
}

function drawHero(ctx, x, gy, s, t) {
  const h = s.run.hero;
  const bob = Math.sin(t * 8) * 1.2;
  const attack = easeOutCubic(h.attackAnim);
  const recoil = h.hitRecoil * 3;
  const squashY = 1 - attack * 0.04;
  const squashX = 1 + attack * 0.05;
  const sprinting = s.world.sprinting && h.energy > 0.5;
  const img = ready(sprites.mascot) ? sprites.mascot : null;
  const footY = gy - FOOT_PAD + bob;
  const mh = HOST_PRESENTATION.target;
  const mw = HOST_PRESENTATION.target;
  const hx = x - recoil;
  // Visor / eye height on Host mascot (facing right after flip)
  const eyeX = hx + mh * 0.16;
  const eyeY = footY - mh * 0.64;
  const overdrive = !!h.deepOn;
  const hostPose = resolveHostClip({
    hitRecoil: h.hitRecoil,
    attack,
    overdrive,
    sprinting,
    tracker: h.trackerOn && h.trackerStacks > 0.04,
  });

  // Soft skill auras UNDER the character (no hard ring lines)
  const cy = footY - mh * 0.42;
  if (h.trackerOn && h.trackerStacks > 0.04) {
    const st = Math.min(1, h.trackerStacks);
    const rg = ctx.createRadialGradient(hx, cy, 4, hx, cy, 36 + st * 22);
    rg.addColorStop(0, `rgba(62,207,142,${0.1 + st * 0.12})`);
    rg.addColorStop(0.55, `rgba(62,207,142,${0.05 + st * 0.06})`);
    rg.addColorStop(1, 'rgba(62,207,142,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(hx, cy, 36 + st * 22, 0, Math.PI * 2);
    ctx.fill();
  }
  // Overdrive — clear crimson field + pulse rings (readable at a glance)
  if (overdrive) {
    const pulse = 0.5 + Math.sin(t * 7) * 0.5;
    const rad = 52 + pulse * 10;
    const rg = ctx.createRadialGradient(hx, cy, 4, hx, cy, rad);
    rg.addColorStop(0, `rgba(252,18,67,${0.28 + pulse * 0.1})`);
    rg.addColorStop(0.45, `rgba(252,18,67,${0.14 + pulse * 0.06})`);
    rg.addColorStop(1, 'rgba(252,18,67,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(hx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,90,120,${0.22 + pulse * 0.18})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, cy, 28 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(252,18,67,${0.12 + pulse * 0.1})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hx, cy, 40 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(hx, gy + 3, mh * 0.27, mh * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle sprint dust (no SPRINT billboard)
  if (sprinting) {
    ctx.fillStyle = 'rgba(230,184,77,0.1)';
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(hx - i * 9, gy - 22, 8 + i, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dual eye scanners — always-on idle beams, punch on attack (never a skull stick)
  // Reach matches MELEE stop so the beam meets the enemy, not through the mascot body
  const idlePulse = 0.55 + Math.sin(t * 6) * 0.08;
  const beamLen = 48 + attack * 42 + (overdrive ? 10 : 0);
  const beamAlpha = (0.28 + attack * 0.55) * idlePulse + (overdrive ? 0.12 : 0);
  for (const dy of [-3.2, 3.2]) {
    ctx.save();
    ctx.translate(eyeX, eyeY + dy);
    // soft eye glow (visor, not a prop stuck on the head)
    const eg = ctx.createRadialGradient(0, 0, 0, 0, 0, 4.5);
    eg.addColorStop(0, `rgba(255,140,160,${0.55 + attack * 0.4 + (overdrive ? 0.15 : 0)})`);
    eg.addColorStop(1, 'rgba(252,18,67,0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // beam core
    const g = ctx.createLinearGradient(0, 0, beamLen, 0);
    g.addColorStop(0, `rgba(252,18,67,${beamAlpha})`);
    g.addColorStop(0.4, `rgba(255,90,120,${beamAlpha * 0.5})`);
    g.addColorStop(1, 'rgba(252,18,67,0)');
    ctx.fillStyle = g;
    const bh = 1.2 + attack * 1.8 + (overdrive ? 0.4 : 0);
    ctx.beginPath();
    ctx.moveTo(1, -bh);
    ctx.lineTo(beamLen, -bh * 0.3);
    ctx.lineTo(beamLen, bh * 0.3);
    ctx.lineTo(1, bh);
    ctx.closePath();
    ctx.fill();
    if (attack > 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${attack * 0.75})`;
      ctx.beginPath();
      ctx.arc(beamLen * 0.9, 0, 1.4 + attack * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Body
  ctx.save();
  ctx.translate(hx, footY);
  ctx.scale(squashX, squashY);
  const frame = hostAtlas?.frames?.[hostPose] || hostAtlas?.frames?.idle;
  if (img && frame) {
    const rect = frame.rect;
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, -mw / 2, -mh, mw, mh);
  } else {
    ctx.fillStyle = '#FC1243';
    ctx.beginPath();
    ctx.arc(0, -mh * 0.62, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Overdrive crown flare above head (readable status)
  if (overdrive) {
    const fl = 0.55 + Math.sin(t * 9) * 0.35;
    ctx.fillStyle = `rgba(252,18,67,${0.35 + fl * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(hx, footY - mh - 4);
    ctx.lineTo(hx - 7, footY - mh + 8);
    ctx.lineTo(hx + 7, footY - mh + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,200,210,${0.5 + fl * 0.4})`;
    ctx.beginPath();
    ctx.arc(hx, footY - mh - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hit spark at eyes when attacking
  if (attack > 0.5) {
    ctx.fillStyle = `rgba(255,255,255,${(attack - 0.5) * 1.4})`;
    ctx.beginPath();
    ctx.arc(eyeX + 2, eyeY, 2 + attack * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (s.stats.combo >= 3) {
    ctx.fillStyle = 'rgba(12,16,20,0.82)';
    roundRect(ctx, hx - 18, footY - mh - 18 - (overdrive ? 10 : 0), 36, 14, 5);
    ctx.fill();
    ctx.fillStyle = '#fc1243';
    ctx.font = '800 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.stats.combo}×`, hx, footY - mh - 7 - (overdrive ? 10 : 0));
  }
}

function drawEnemy(ctx, e, gy, t, packAssets = null) {
  const x = e.displayX;
  const dying = e.deathT > 0 && e.killed;
  const deathU = dying ? 1 - clamp(e.deathT / (e.deathMax || 0.5), 0, 1) : 0;
  const flash = e.hitFlash > 0;
  const hurtOff = !dying && e.hurt > 0 ? Math.sin(t * 40) * 1.5 : 0;
  const isBoss = e.type === 'boss';
  const isPatch = e.type === 'patch';
  const size = enemyRenderSize(e);
  const sprite = sprites.enemies[e.type];
  const atlas = packAssets?.ready && ready(packAssets.targets) ? packAssets.targets : null;
  const frameName = isBoss && e.hp / e.hpMax < 0.34 ? 'boss-break' : e.frame;
  const frame = packAssets?.targetData?.frames?.[frameName];
  const footY = gy - FOOT_PAD;

  // death transforms
  let sx = 1;
  let sy = 1;
  let rot = 0;
  let alpha = 1;
  let dy = 0;
  if (dying) {
    const u = easeOutQuad(deathU);
    if (isPatch) {
      // card flip + float up
      sx = Math.cos(u * Math.PI * 0.9);
      sy = 1 - u * 0.15;
      rot = u * 0.4;
      dy = -u * 40;
      alpha = 1 - u * 0.85;
    } else if (isBoss) {
      sx = 1 + u * 0.2;
      sy = 1 - u * 0.55;
      alpha = 1 - u;
      dy = u * 10;
    } else {
      // squash pop
      sx = 1 + u * 0.35;
      sy = Math.max(0.05, 1 - u * 1.1);
      alpha = 1 - u * 0.9;
      dy = u * 8;
    }
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  // shadow shrinks on death
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(x + hurtOff, gy + 3, size * 0.26 * Math.abs(sx), 4.5 * Math.max(0.2, sy), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x + hurtOff, footY + dy);
  ctx.rotate(rot);
  ctx.scale(sx || 0.01, sy);

  if (atlas && frame?.rect) {
    const rect = frame.rect;
    ctx.drawImage(atlas, rect.x, rect.y, rect.w, rect.h, -size / 2, -size, size, size);
    if (flash && !dying) {
      const flashU = clamp(e.hitFlash / (C.HIT_FLASH || 0.12), 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45 * flashU * alpha;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(0, -size * 0.5, size * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (ready(sprite)) {
    ctx.drawImage(sprite, -size / 2, -size, size, size);
    // Soft hit bloom (no hard white rectangle)
    if (flash && !dying) {
      const flashU = clamp(e.hitFlash / (C.HIT_FLASH || 0.12), 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * flashU * alpha;
      const cx = 0;
      const cy = -size * 0.48;
      const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.52);
      rg.addColorStop(0, 'rgba(255,255,255,0.95)');
      rg.addColorStop(0.35, 'rgba(255,180,190,0.45)');
      rg.addColorStop(1, 'rgba(255,80,100,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.fillStyle = e.color;
    roundRect(ctx, -16, -44, 32, 44, 6);
    ctx.fill();
    if (flash && !dying) {
      ctx.globalAlpha = 0.4 * alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -22, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // patch note “card shine” on death
  if (dying && isPatch) {
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#FC1243';
    roundRect(ctx, -size * 0.35, -size * 0.85, size * 0.7, size * 0.55, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = alpha * 0.7;
    ctx.font = '800 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOTE', 0, -size * 0.5);
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  if (dying) return; // no HP bar while dying

  if (e.priorityTagRank > 0) {
    const tagColor = resolveCanvasPaint({ tone: 'signal' });
    const half = size * 0.43;
    const top = footY - size * 0.88;
    const bottom = footY - size * 0.08;
    const arm = Math.max(7, size * 0.12);
    ctx.save();
    ctx.strokeStyle = tagColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.72 + Math.sin(t * 6) * 0.16;
    ctx.beginPath();
    ctx.moveTo(x - half + arm, top);
    ctx.lineTo(x - half, top);
    ctx.lineTo(x - half, top + arm);
    ctx.moveTo(x + half - arm, top);
    ctx.lineTo(x + half, top);
    ctx.lineTo(x + half, top + arm);
    ctx.moveTo(x - half, bottom - arm);
    ctx.lineTo(x - half, bottom);
    ctx.lineTo(x - half + arm, bottom);
    ctx.moveTo(x + half, bottom - arm);
    ctx.lineTo(x + half, bottom);
    ctx.lineTo(x + half - arm, bottom);
    ctx.stroke();
    ctx.restore();
  }

  const barW = isBoss ? 148 : 112;
  const bannerH = isBoss ? 62 : 54;
  const barY = footY - size - bannerH - 10;
  const ratio = clamp(e.hp / e.hpMax, 0, 1);
  ctx.fillStyle = 'rgba(7,16,25,0.94)';
  roundRect(ctx, x - barW / 2, barY, barW, bannerH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(44,67,94,0.95)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#f3f7fb';
  ctx.font = `800 ${isBoss ? 11 : 10}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  const label = e.label.length > (isBoss ? 18 : 14) ? `${e.label.slice(0, isBoss ? 17 : 13)}…` : e.label;
  ctx.fillText(label, x, barY + 17);
  ctx.fillStyle = '#aab7c7';
  ctx.font = '700 9px system-ui,sans-serif';
  ctx.fillText(`${Math.ceil(e.hp)}/${e.hpMax}`, x, barY + 32);
  ctx.fillStyle = '#22364c';
  roundRect(ctx, x - barW / 2 + 9, barY + bannerH - 14, barW - 18, 8, 4);
  ctx.fill();
  ctx.fillStyle = ratio > 0.3 ? '#fc1243' : '#e6b84d';
  if (ratio > 0.01) {
    roundRect(ctx, x - barW / 2 + 9, barY + bannerH - 14, Math.max(4, (barW - 18) * ratio), 8, 4);
    ctx.fill();
  }
}

function drawLootFlight(ctx, flight, s, w, gy) {
  const anchor = s.world.enemies.find((enemy) => enemy.id === flight.enemyId);
  if (flight.y == null) flight.y = gy - (anchor ? enemyRenderSize(anchor) * 0.55 : 70);
  if (anchor) flight.x = anchor.displayX;
  const u = easeOutCubic(1 - clamp(flight.t / flight.life, 0, 1));
  const targetX = flight.target === 'notes' ? w * 0.62 : w * 0.11;
  const x = flight.x + (targetX - flight.x) * u;
  const y = flight.y + (-56 - flight.y) * u - Math.sin(u * Math.PI) * 34;
  ctx.save();
  ctx.globalAlpha = Math.min(1, flight.t / 0.16);
  ctx.translate(x, y);
  ctx.rotate(u * Math.PI * 1.5);
  ctx.fillStyle = resolveCanvasPaint({ tone: flight.target === 'notes' ? 'notes' : 'signal' });
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawParticle(ctx, p) {
  const a = clamp(p.t / (p.life || 0.5), 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(p.x, p.y);
  if (p.rot) ctx.rotate(p.rot);
  if (p.kind === 'coin') {
    // diamond / note chip
    ctx.fillStyle = resolveCanvasPaint(p.c);
    ctx.beginPath();
    const r = p.r || 4;
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.7, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.2, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(0, 0, p.r || 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawConfettiBit(ctx, c) {
  const a = clamp(c.t / (c.life || 1), 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(c.x, c.y);
  ctx.rotate(c.rot);
  ctx.fillStyle = resolveCanvasPaint(c.c);
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.restore();
}

function drawAlert(ctx, a, t) {
  const pulse = 0.65 + Math.sin(a.pulse) * 0.35;
  const col = a.kind === 'energy' ? '16,185,129' : '108,184,255';
  ctx.fillStyle = `rgba(${col},${0.22 * pulse})`;
  ctx.beginPath();
  ctx.arc(a.x, a.y, 18 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = a.kind === 'energy' ? '#10B981' : '#6cb8ff';
  ctx.beginPath();
  ctx.arc(a.x, a.y + Math.sin(t * 5) * 2, 6, 0, Math.PI * 2);
  ctx.fill();
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(a.x - 2, a.y - 2 + Math.sin(t * 5) * 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${col},${0.65 * pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(a.x, a.y, 13 + pulse * 5, 0, Math.PI * 2);
  ctx.stroke();
}
