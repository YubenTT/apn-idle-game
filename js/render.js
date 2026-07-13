/** APN Idle canvas — biomes, death juice, confetti, Host + enemies */

import { C, clamp, easeOutCubic, easeOutQuad } from './formulas.js';

const V = 'v8';
const sprites = {
  mascot: loadImg(`./assets/mascot-host.png?${V}`),
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
  return img && img._ready && img.naturalWidth > 0;
}

function biomeFor(zone) {
  return BIOMES[Math.floor(zone / 4) % BIOMES.length];
}

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

export function draw(ctx, w, h, s) {
  const gy = h * 0.78;
  s.world.groundY = gy;
  const t = s.world.time;
  const scroll = s.world.scrollSmooth;
  const shakeX = s.world.shake ? (Math.random() - 0.5) * s.world.shake : 0;
  const shakeY = s.world.shake ? (Math.random() - 0.5) * s.world.shake : 0;
  const bio = biomeFor(s.run.zone);

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

  // biome name (subtle — header already shows zone #)
  if (s.run.zone > 0 || s.world.time > 1) {
    drawBiomeTag(ctx, w, bio);
  }

  // alerts
  for (const a of s.world.alerts) drawAlert(ctx, a, t);

  // enemies (living + dying)
  const show = s.world.enemies.filter((e) => e.hp > 0 || (e.deathT && e.deathT > 0));
  show.forEach((e, i) => drawEnemy(ctx, e, gy, t, i));

  // hero
  drawHero(ctx, s.world.heroDisplayX, gy, s, t);

  // particles
  for (const p of s.world.particles) drawParticle(ctx, p);

  // confetti
  for (const c of s.world.confetti || []) drawConfettiBit(ctx, c);

  // floaters
  ctx.textAlign = 'center';
  for (const f of s.world.floaters) {
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
    ctx.fillStyle = f.color;
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

  // boss timer
  if (s.world.bossActive) {
    const ratio = clamp(s.world.bossTimer / C.BOSS_TIMER, 0, 1);
    const bx = w * 0.18;
    const bw = w * 0.64;
    ctx.fillStyle = 'rgba(10,14,19,0.8)';
    roundRect(ctx, bx, 14, bw, 12, 6);
    ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#A3072F');
    g.addColorStop(1, '#FC1243');
    ctx.fillStyle = g;
    roundRect(ctx, bx, 14, bw * ratio, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#F5F6F8';
    ctx.font = '700 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERSION GATE TIMER', w / 2, 42);
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

function drawBiomeTag(ctx, w, bio) {
  const label = bio.name || '';
  if (!label) return;
  ctx.save();
  ctx.font = '700 10px system-ui,sans-serif';
  const tw = ctx.measureText(label).width;
  const x = w - tw - 22;
  ctx.fillStyle = 'rgba(8,12,16,0.55)';
  roundRect(ctx, x, 10, tw + 14, 18, 6);
  ctx.fill();
  ctx.fillStyle = bio.accent;
  ctx.globalAlpha = 0.85;
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 7, 22);
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
  const recoil = h.hitRecoil * 4;
  const squashY = 1 - attack * 0.05;
  const squashX = 1 + attack * 0.06;
  const sprinting = s.world.sprinting;
  const img = ready(sprites.mascot) ? sprites.mascot : null;
  const footY = gy - FOOT_PAD + bob;
  const mh = 76;
  const mw = 76;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(x - recoil, gy + 3, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (sprinting || h.deepOn) {
    // speed lines / afterimage
    ctx.fillStyle = sprinting ? 'rgba(230,184,77,0.16)' : 'rgba(252,18,67,0.12)';
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.ellipse(x - recoil - i * 10, gy - 28, 10 + i, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sprinting) {
      ctx.strokeStyle = 'rgba(230,184,77,0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const ly = footY - 20 - i * 10;
        const lx = x - recoil - 28 - (i % 2) * 6;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - 14, ly);
        ctx.stroke();
      }
      // SPRINT tag
      ctx.fillStyle = 'rgba(12,16,20,0.85)';
      roundRect(ctx, x - 28, footY - mh - 40, 56, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#e6b84d';
      ctx.font = '800 10px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPRINT', x, footY - mh - 28);
    }
  }

  // scanner beam
  ctx.save();
  ctx.translate(x + 22 - recoil, footY - mh * 0.55);
  ctx.rotate(-0.15 - attack * 1.0);
  const grad = ctx.createLinearGradient(0, 0, 50, 0);
  grad.addColorStop(0, 'rgba(252,18,67,0.95)');
  grad.addColorStop(1, 'rgba(252,18,67,0)');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, -3, 42 + attack * 14, 6, 3);
  ctx.fill();
  // beam tip spark
  if (attack > 0.2) {
    ctx.fillStyle = `rgba(255,255,255,${attack})`;
    ctx.beginPath();
    ctx.arc(42 + attack * 14, 0, 3 + attack * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(x - recoil, footY);
  ctx.scale(squashX * -1, squashY);
  if (img) {
    ctx.drawImage(img, -mw / 2, -mh, mw, mh);
  } else {
    ctx.fillStyle = '#FC1243';
    ctx.beginPath();
    ctx.arc(0, -mh * 0.62, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const cy = footY - mh * 0.55;
  if (h.deepOn) {
    ctx.strokeStyle = 'rgba(252,18,67,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - recoil, cy, 38, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (h.summaryT > 0) {
    ctx.strokeStyle = 'rgba(94,176,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - recoil, cy, 90, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (h.trackerOn && h.trackerStacks > 0.05) {
    ctx.strokeStyle = `rgba(62,207,142,${0.25 + h.trackerStacks * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - recoil, cy, 32 + h.trackerStacks * 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (s.stats.combo >= 3) {
    ctx.fillStyle = 'rgba(12,16,20,0.88)';
    roundRect(ctx, x - 24, footY - mh - 24, 48, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#fc1243';
    ctx.font = '800 12px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.stats.combo}×`, x, footY - mh - 11);
  }
}

function drawEnemy(ctx, e, gy, t) {
  const x = e.displayX;
  const dying = e.deathT > 0 && e.killed;
  const deathU = dying ? 1 - clamp(e.deathT / (e.deathMax || 0.5), 0, 1) : 0;
  const flash = e.hitFlash > 0;
  const hurtOff = !dying && e.hurt > 0 ? Math.sin(t * 40) * 1.5 : 0;
  const isBoss = e.type === 'boss';
  const isPatch = e.type === 'patch';
  const size = isBoss ? 84 : isPatch ? 68 : 60;
  const sprite = sprites.enemies[e.type];
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

  if (ready(sprite)) {
    ctx.drawImage(sprite, -size / 2, -size, size, size);
    if (flash && !dying) {
      ctx.globalAlpha = 0.35 * alpha;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-size / 2, -size, size, size);
    }
  } else {
    ctx.fillStyle = flash ? '#fff' : e.color;
    roundRect(ctx, -16, -44, 32, 44, 6);
    ctx.fill();
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

  const barW = isBoss ? 52 : 38;
  const barY = footY - size - 12;
  const ratio = clamp(e.hp / e.hpMax, 0, 1);
  ctx.fillStyle = 'rgba(12,16,20,0.9)';
  roundRect(ctx, x - barW / 2, barY, barW, 6, 2);
  ctx.fill();
  ctx.fillStyle = ratio > 0.3 ? '#fc1243' : '#e6b84d';
  if (ratio > 0.01) {
    roundRect(ctx, x - barW / 2, barY, Math.max(2, barW * ratio), 6, 2);
    ctx.fill();
  }
  ctx.fillStyle = '#8b95a5';
  ctx.font = '600 9px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(e.hp)}/${e.hpMax}`, x, barY - 3);
  if (isBoss || isPatch) {
    ctx.fillStyle = e.color;
    ctx.font = '700 8px system-ui,sans-serif';
    ctx.fillText(e.label, x, barY - 13);
  }
}

function drawParticle(ctx, p) {
  const a = clamp(p.t / (p.life || 0.5), 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(p.x, p.y);
  if (p.rot) ctx.rotate(p.rot);
  if (p.kind === 'coin') {
    // diamond / note chip
    ctx.fillStyle = p.c;
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
  ctx.fillStyle = c.c;
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
