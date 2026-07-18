/** APN Idle canvas — V2 scenery/targets/Host + combat juice overlays */

import { C, clamp, easeOutCubic } from './formulas.js?v=golive-pr5';
import { getCurrentPackAssets } from './assets.js?v=golive-pr5';
import { HOST_PRESENTATION, resolveHostClip } from './host-contract.js?v=golive-pr5';
import { drawHeroV2 } from './hero-v2.js?v=golive-pr5';
import { drawTarget } from './enemies-v2.js?v=golive-pr5';
import { drawScenery } from './scenery-v2.js?v=golive-pr5';

const enemyRenderSize = (enemy) => enemy.type === 'boss' ? 136 : enemy.type === 'patch' ? 100 : 96;
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

function ready(img) {
  return img && (img._ready || img.complete) && img.naturalWidth > 0;
}

export function sizeCanvas(canvas) {
  const parent = canvas.parentElement;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = parent.clientWidth;
  const h = Math.max(160, parent.clientHeight);
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
  const packAssets = assetStore ? getCurrentPackAssets(assetStore, s.route) : null;
  // Fit combat cast + HP banners into short stages (landscape): scale the cast,
  // never crop feet or heads. 78 = banner (62) + gap (10) + margin (6); 136 = boss.
  const stageFit = clamp((gy - 78) / 136, 0.5, 1);

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // --- layered editorial world (per-zone seeded mood, pack plate far layer) ---
  drawScenery(ctx, w, h, {
    zone: s.route?.zone ?? 0,
    gy,
    scroll,
    t,
    reducedMotion: s.settings.reducedMotion,
    packBg: packAssets?.ready && ready(packAssets.background) ? packAssets.background : null,
  });

  // alerts
  for (const a of s.world.alerts) drawAlert(ctx, a, t);

  // enemies (living + dying)
  const show = s.world.enemies.filter((e) => e.hp > 0 || (e.deathT && e.deathT > 0));
  show.forEach((e) => drawEnemy(ctx, e, gy, t, packAssets, s.settings.reducedMotion, stageFit));

  // hero
  drawHero(ctx, s.world.heroDisplayX, gy, s, t, stageFit);

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
        f.y = gy - enemyRenderSize(anchor) * 0.82 * stageFit;
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

function drawHero(ctx, x, gy, s, t, fit = 1) {
  const h = s.run.hero;
  const attack = easeOutCubic(h.attackAnim);
  const sprinting = s.world.sprinting && h.energy > 0.5;
  const mh = HOST_PRESENTATION.target;
  const mhEff = mh * fit;
  const overdrive = !!h.deepOn;
  const tracker = h.trackerOn && h.trackerStacks > 0.04;
  const hostPose = resolveHostClip({
    hitRecoil: h.hitRecoil,
    attack,
    overdrive,
    sprinting,
    tracker,
  });
  const footY = gy - 2;

  // Soft skill auras UNDER the character (no hard ring lines)
  const cy = footY - mhEff * 0.42;
  if (tracker) {
    const st = Math.min(1, h.trackerStacks);
    const rg = ctx.createRadialGradient(x, cy, 4, x, cy, 36 + st * 22);
    rg.addColorStop(0, `rgba(62,207,142,${0.1 + st * 0.12})`);
    rg.addColorStop(0.55, `rgba(62,207,142,${0.05 + st * 0.06})`);
    rg.addColorStop(1, 'rgba(62,207,142,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, cy, 36 + st * 22, 0, Math.PI * 2);
    ctx.fill();
  }
  // Overdrive — clear crimson field + pulse rings (readable at a glance)
  if (overdrive) {
    const pulse = 0.5 + Math.sin(t * 7) * 0.5;
    const rad = 52 + pulse * 10;
    const rg = ctx.createRadialGradient(x, cy, 4, x, cy, rad);
    rg.addColorStop(0, `rgba(252,18,67,${0.28 + pulse * 0.1})`);
    rg.addColorStop(0.45, `rgba(252,18,67,${0.14 + pulse * 0.06})`);
    rg.addColorStop(1, 'rgba(252,18,67,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, cy, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,90,120,${0.22 + pulse * 0.18})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, cy, 28 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(252,18,67,${0.12 + pulse * 0.1})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, cy, 40 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Procedural Host V2 — run_loop / scan / crit / sprint / overdrive / damage
  drawHeroV2(ctx, x, footY, {
    height: mhEff,
    time: t,
    attack,
    crit: hostPose === 'crit',
    hitRecoil: h.hitRecoil,
    overdrive,
    sprinting,
    tracker,
    energy: h.energy,
    reducedMotion: s.settings.reducedMotion,
    pose: hostPose,
  });

  // Overdrive crown flare above head (readable status)
  if (overdrive) {
    const fl = 0.55 + Math.sin(t * 9) * 0.35;
    ctx.fillStyle = `rgba(252,18,67,${0.35 + fl * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(x, footY - mhEff - 4);
    ctx.lineTo(x - 7, footY - mhEff + 8);
    ctx.lineTo(x + 7, footY - mhEff + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,200,210,${0.5 + fl * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, footY - mhEff - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Combo chip in the overhead slot
  if (s.stats.combo >= 3) {
    const cyOff = mhEff + 18 + (overdrive ? 10 : 0);
    ctx.fillStyle = 'rgba(12,16,20,0.82)';
    roundRect(ctx, x - 19, footY - cyOff, 38, 15, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(252,18,67,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fc1243';
    ctx.font = '800 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.stats.combo}×`, x, footY - cyOff + 11);
  }
}

function drawEnemy(ctx, e, gy, t, packAssets = null, reducedMotion = false, fit = 1) {
  const x = e.displayX;
  const dying = e.deathT > 0 && e.killed;
  const isBoss = e.type === 'boss';
  const size = enemyRenderSize(e) * fit;
  const atlas = packAssets?.ready && ready(packAssets.targets) ? packAssets.targets : null;
  const frameName = isBoss && e.hp / e.hpMax < 0.34 ? 'boss-break' : e.frame;
  const frame = packAssets?.targetData?.frames?.[frameName];
  const footY = gy - 2;

  drawTarget(ctx, e, {
    t,
    gy,
    size,
    atlas: atlas && frame?.rect ? atlas : null,
    frame: atlas && frame?.rect ? frame : null,
    reducedMotion,
  });

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
  const compact = fit < 0.92; // short stages (landscape): slim nameplate, no big card
  const bannerH = compact ? 30 : isBoss ? 62 : 54;
  const barY = Math.max(compact ? 56 : 4, footY - size - bannerH - 8);
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
  if (compact) {
    // Short stages: the DOM stage-hud owns the sky, so the nameplate docks
    // under the target's feet — name + slim bar, always clear of overlays.
    const plateW = Math.max(64, barW * 0.62);
    const px = x - plateW / 2;
    const py = footY + 7;
    ctx.fillStyle = 'rgba(7,16,25,0.88)';
    roundRect(ctx, px, py, plateW, 22, 7);
    ctx.fill();
    ctx.fillStyle = '#f3f7fb';
    ctx.font = '800 9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, py + 10);
    ctx.fillStyle = '#22364c';
    roundRect(ctx, px + 7, py + 14, plateW - 14, 4, 2);
    ctx.fill();
    ctx.fillStyle = ratio > 0.3 ? '#fc1243' : '#e6b84d';
    if (ratio > 0.01) {
      roundRect(ctx, px + 7, py + 14, Math.max(3, (plateW - 14) * ratio), 4, 2);
      ctx.fill();
    }
    return;
  }
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
