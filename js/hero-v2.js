/**
 * APN Host V2 — procedural Canvas hero (V2 Super Polish, Wave 1).
 *
 * One character, one locked silhouette (brand/MASCOT-CANON.md):
 * oversized spherical head (~52% of height), integrated black visor band,
 * slim torso, short stubby arms, small boots, minimal oval shadow.
 *
 * Pure-ish: deterministic from opts + time. No DOM, no fetch, no allocations
 * in the hot path. Facing RIGHT, foot pivot at bottom-center.
 *
 * Animation vocabulary (opts):
 *   time         world seconds (drives run_loop, breathe, blink, visor sweep)
 *   attack       0..1 eased strike intensity (1 at impact, decays) — scan/crit
 *   crit         true when the strike is a crit (bigger wind-up, white spark)
 *   hitRecoil    0..1 damage flinch (1 at impact, decays)
 *   overdrive    hover + chest-core pulse + brighter visor
 *   sprinting    forward lean, faster cycle, scarf streamed back
 *   tracker      subtle green rim on the chest core
 *   energy       0..100 — low energy softens the bounce
 *   reducedMotion gates squash amplitude and secondary motion
 *   pose         resolved semantic clip ('run'|'sprint'|'scan'|'crit'|
 *                'damage'|'overdrive'|'idle'|'level'|'defeat'|'loot')
 *   levelT/defeatT/lootT  optional 0..1 clip clocks (wired by later waves)
 */

import { clamp } from './formulas.js?v=golive-pr5';
import { heroRigReady, drawRigBody } from './hero-rig.js?v=golive-pr5';

const T = 130; // design height in px (HOST_PRESENTATION.target)

// APN palette — canvas side of brand/tokens.css (crimson + dark inks)
const CRIM = '#fc1243';
const CRIM_HI = '#ff3a63';
const CRIM_DEEP = '#a3072f';
const CRIM_DARK = '#7d0a26';
const BORDO = '#571027'; // outline — dark wine, never pure black
const INK2 = '#16283c';
const INK3 = '#1e3a55';
const BOOT = '#16283c';
const VISOR = '#060b12';
const SCAN = '#ff5c7a';
const RIM = 'rgba(255,176,196,0.8)';
const GOLD = '#e6b84d';
const GREEN = '#3ecf8e';

const TAU = Math.PI * 2;

// —— generated canon sprite atlas (optional; loaded by main.js) ————————————
// When assets/mascot/v2/host.{webp,json} is present the Host body renders the
// canon generated poses. Every juice layer (shadow, squash & stretch, lunge,
// hover, halo, sparks, flashes) stays procedural so both paths feel identical.
// Missing atlas = procedural fallback — headless tests never load images.
let SPR = null;

export function setHeroSprites(image, data) {
  if (!image || !data || !data.frames) return;
  SPR = {
    image,
    frames: data.frames,
    designH: (data.meta && data.meta.designHeight) || 512,
  };
}

export function heroSpritesReady() {
  return !!SPR;
}

/** Map the live animation vocabulary to the best atlas frame. */
function pickFrame(o, attack, recoil, sprint, t) {
  const frames = SPR.frames;
  let name;
  if ((o.defeatT || 0) > 0) name = 'defeat';
  else if ((o.levelT || 0) > 0) name = 'level';
  else if ((o.lootT || 0) > 0) name = 'walk';
  else if (recoil > 0.4) name = 'recoil';
  else if (attack > 0.55) name = 'attack';
  else if (attack > 0.18) name = 'charge'; // wind-up crouch before the strike
  else if (o.pose === 'idle' || o.pose === 'overdrive') name = 'idle';
  else if (o.pose === 'loot') name = 'walk';
  else {
    // 4-phase generated cycle when present (contact/recoil/contact/push-off);
    // the 2-frame flipbook stays only as a legacy fallback.
    const fps = sprint ? 14 : 10;
    if (frames['run-1']) name = `run-${(Math.floor(t * fps) % 4) + 1}`;
    else name = Math.floor(t * fps) % 2 === 0 ? 'run-a' : 'run-b';
  }
  return frames[name] ? name : null;
}

/** Canon sprite body + procedural overlays (glow, flashes, fist spark). */
function drawSpriteBody(ctx, name, o, st) {
  const f = SPR.frames[name];
  const H = o.height || T;
  const scale = H / SPR.designH;
  const dw = f.rect.w * scale;
  const dh = f.rect.h * scale;

  // overdrive under-glow behind the body
  if (st.over) {
    const pulse = 0.5 + Math.sin(st.t * 7) * 0.5;
    const gy = -dh * 0.45;
    const rg = ctx.createRadialGradient(0, gy, 2, 0, gy, dh * 0.62);
    rg.addColorStop(0, `rgba(252,18,67,${0.34 + pulse * 0.14})`);
    rg.addColorStop(1, 'rgba(252,18,67,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, gy, dh * 0.62, 0, TAU);
    ctx.fill();
  }

  ctx.drawImage(SPR.image, f.rect.x, f.rect.y, f.rect.w, f.rect.h,
    -f.pivot.x * dw, -f.pivot.y * dh, dw, dh);

  // head zone ≈ 17% below frame top (tracks crouched frames automatically)
  const headX = (0.5 - f.pivot.x) * dw;
  const headY = -dh + dh * 0.17;
  const headR = dh * 0.21;

  // damage blink — white/red flicker across the visor zone
  if (st.recoil > 0.3) {
    const on = Math.sin(st.t * 60) > 0;
    ctx.fillStyle = on
      ? `rgba(255,235,240,${st.recoil * 0.5})`
      : `rgba(252,18,67,${st.recoil * 0.28})`;
    ctx.beginPath();
    ctx.ellipse(headX, headY, headR * 0.85, headR * 0.42, 0, 0, TAU);
    ctx.fill();
  }
  // crit visor flash
  if (st.crit && st.attack > 0.5) {
    ctx.fillStyle = `rgba(255,255,255,${(st.attack - 0.5) * 0.8})`;
    ctx.beginPath();
    ctx.ellipse(headX, headY, headR * 0.95, headR * 0.48, 0, 0, TAU);
    ctx.fill();
  }

  // fist spark at impact (attack frame: fist ≈ 62% across, 52% down)
  const spark = clamp((st.attack - 0.45) / 0.5, 0, 1);
  if (spark > 0) {
    const hot = st.crit;
    const hx = (0.62 - f.pivot.x) * dw;
    const hy = -0.52 * dh;
    const k = H / T;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hot ? `rgba(255,255,255,${0.9 * spark})` : `rgba(255,120,140,${0.75 * spark})`;
    ctx.beginPath();
    ctx.arc(0, 0, (2.2 + spark * 3.2) * k, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = hot ? `rgba(255,240,245,${spark})` : `rgba(252,18,67,${0.8 * spark})`;
    ctx.lineWidth = 1.4 * k;
    for (let i = 0; i < 4; i++) {
      const a = st.t * 24 + i * (Math.PI / 2);
      const d = (4 + spark * 7) * k;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 2 * k, Math.sin(a) * 2 * k);
      ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function rr(ctx, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}

/** Capsule (thick rounded line) between two points. */
function limb(ctx, x1, y1, x2, y2, w) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Draw the Host. (x, footY) is the foot pivot in canvas space; h is total
 * height in px (caller passes HOST_PRESENTATION.target).
 */
export function drawHeroV2(ctx, x, footY, opts = {}) {
  const o = opts;
  const t = o.time || 0;
  const attack = clamp(o.attack || 0, 0, 1);
  const recoil = clamp(o.hitRecoil || 0, 0, 1);
  const sprint = !!o.sprinting;
  const over = !!o.overdrive;
  const crit = !!o.crit;
  const tracker = !!o.tracker;
  const reduced = !!o.reducedMotion;
  const energy = o.energy == null ? 100 : o.energy;
  const levelT = clamp(o.levelT || 0, 0, 1);
  const defeatT = clamp(o.defeatT || 0, 0, 1);
  const lootT = clamp(o.lootT || 0, 0, 1);
  const k = (o.height || T) / T;
  const motion = reduced ? 0.45 : 1;
  const vigor = 0.82 + 0.18 * clamp(energy / 40, 0, 1); // tired = softer bounce

  // —— clip clocks ————————————————————————————————————————
  // 'idle' pose: no locomotion — legs planted, weight rests on the breathe
  // cycle (visor sweep + blink keep the character alive). Used by the Gear niche.
  const idle = o.pose === 'idle';
  // Sprite body decision comes FIRST: the skeletal rig (canon parts, engine
  // animated) outranks the flipbook; the flipbook only serves when the rig
  // cannot load. Flipbook frames also carry their own verticality, so the
  // procedural run bounce is damped for flipbook but kept for rig/procedural.
  const rigOn = heroRigReady();
  const spriteFrame = !rigOn && SPR && pickFrame(o, attack, recoil, sprint, t);
  const freq = idle ? 0 : (sprint ? 15 : 10.5) * (0.9 + 0.1 * vigor);
  const ph = t * freq;
  const stride = (idle ? 0 : sprint ? 11 : 8) * k;
  const lift = (idle ? 0 : sprint ? 7.5 : 5) * k * motion * vigor;
  const idleSway = (0.5 + Math.sin(t * 2.1) * 0.5) * 0.9 * k * motion;
  const bounce = spriteFrame
    ? (idle ? idleSway : 0)
    : (idle ? idleSway : Math.abs(Math.sin(ph)) * (sprint ? 4.2 : 2.6) * k * motion * vigor);
  const breathe = Math.sin(t * 2.1) * (idle ? 0.022 : 0.014) * motion;
  const thrust = attack; // 1 at impact, decays to 0
  const lunge = (crit ? 16 : 10.5) * k * thrust;
  const hover = over ? (2.4 + Math.sin(t * 6.5) * 1.4 * motion) * k : 0;
  const flinch = recoil * 7 * k;
  const buckle = defeatT * 0.16; // knees give out
  const jump = levelT > 0 ? Math.sin(levelT * Math.PI) * 12 * k : 0;

  ctx.save();
  ctx.translate(x - flinch, footY - hover - jump);

  // —— ground shadow: minimal oval, 18–22% opacity ————————————
  const shK = 1 - clamp((hover + jump) / (30 * k), 0, 0.45);
  ctx.fillStyle = 'rgba(4,8,12,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 3 * k, 30 * k * shK, 6.4 * k * shK, 0, 0, TAU);
  ctx.fill();

  // sprint dust puffs behind boots
  if (sprint && !reduced) {
    ctx.fillStyle = 'rgba(210,220,232,0.1)';
    for (let i = 1; i <= 3; i++) {
      const pu = (t * 3 + i * 0.33) % 1;
      ctx.globalAlpha = 0.12 * (1 - pu);
      ctx.beginPath();
      ctx.ellipse(-14 * k - i * 8 * k - pu * 14 * k, -4 * k - pu * 10 * k, (4 + pu * 6) * k, (3 + pu * 4) * k, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // body group: bounce + lean + squash & stretch (foot pivot preserved)
  const lean = (idle ? 0.02 : sprint ? 0.15 : 0.05) + thrust * (crit ? 0.26 : 0.15) - recoil * 0.24;
  ctx.translate(lunge * 0.35, -bounce * 0.5);
  ctx.rotate(lean * 0.4 - buckle * 0.5);
  ctx.scale(
    (1 + thrust * (crit ? 0.1 : 0.065) + breathe) * (1 + buckle * 0.2),
    (1 - thrust * (crit ? 0.085 : 0.055) - breathe) * (1 - buckle),
  );
  ctx.translate(lunge * 0.65, -bounce * 0.5);

  const hipY = -32 * k;
  const shoulderY = -56 * k;
  const headCy = -88 * k;
  const headR = 33 * k;

  // —— body: skeletal rig (canon parts) > flipbook fallback > procedural ————
  // All three paths reuse the juice transforms above (shadow, squash, lunge,
  // hover, flinch) and the halo below, so they feel identical.
  // (procedural fallback intentionally keeps flat indentation for a clean diff)
  if (rigOn) {
    drawRigBody(ctx, o, { t, ph, idle, sprint, over, crit, motion, vigor, reduced, attack, thrust, recoil, levelT, defeatT, lootT });
  } else if (spriteFrame) {
    drawSpriteBody(ctx, spriteFrame, o, { t, attack, recoil, crit, over });
  } else {

  // —— scarf (behind body, follow-through lag) ————————————————
  drawScarf(ctx, k, t, idle ? 1.2 : freq, motion, sprint, recoil, defeatT);

  // —— far arm (darker, behind torso) —————————————————————————
  const farSwing = Math.sin(ph + Math.PI) * 0.5 * motion * vigor;
  ctx.strokeStyle = '#12202f';
  limb(ctx, -3 * k, shoulderY + 2 * k, -3 * k + Math.sin(farSwing) * 12 * k, shoulderY + 13 * k + Math.abs(Math.cos(ph)) * 2 * k, 6.5 * k);

  // —— legs: alternating boot cycle ———————————————————————————
  for (let i = 0; i < 2; i++) {
    const lp = ph + i * Math.PI;
    const fx = Math.cos(lp) * stride;
    const fy = -Math.max(0, Math.sin(lp)) * lift;
    const far = i === 0;
    ctx.strokeStyle = far ? '#12202f' : INK3;
    limb(ctx, 0, hipY, fx * 0.55, (hipY + fy) * 0.5, 7.5 * k);
    limb(ctx, fx * 0.55, (hipY + fy) * 0.5, fx, fy - 3 * k, 7 * k);
    // boot
    ctx.save();
    ctx.translate(fx, fy - 2 * k);
    ctx.rotate(-Math.cos(lp) * 0.25);
    ctx.fillStyle = far ? '#12202f' : BOOT;
    ctx.strokeStyle = BORDO;
    ctx.lineWidth = 1.4 * k;
    rr(ctx, -6.5 * k, -4.5 * k, 13 * k, 8 * k, 3.5 * k);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = far ? CRIM_DARK : CRIM;
    rr(ctx, -6.5 * k, 1.2 * k, 13 * k, 2.6 * k, 1.3 * k);
    ctx.fill();
    ctx.restore();
  }

  // —— torso: dark techwear + crimson seams + signal core ————————
  ctx.beginPath();
  ctx.moveTo(-11 * k, hipY + 2 * k);
  ctx.quadraticCurveTo(-13 * k, -46 * k, -10 * k, shoulderY - 2 * k);
  ctx.quadraticCurveTo(0, shoulderY - 7 * k, 10 * k, shoulderY - 2 * k);
  ctx.quadraticCurveTo(13 * k, -46 * k, 11 * k, hipY + 2 * k);
  ctx.quadraticCurveTo(0, hipY + 6 * k, -11 * k, hipY + 2 * k);
  ctx.closePath();
  ctx.fillStyle = INK2;
  ctx.fill();
  ctx.strokeStyle = BORDO;
  ctx.lineWidth = 2 * k;
  ctx.stroke();
  // top-light (subtle, flat editorial)
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(190,215,240,0.09)';
  ctx.beginPath();
  ctx.ellipse(-4 * k, shoulderY + 2 * k, 12 * k, 9 * k, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
  // crimson seams
  ctx.strokeStyle = CRIM;
  ctx.lineWidth = 1.6 * k;
  ctx.beginPath();
  ctx.moveTo(-7 * k, shoulderY + 3 * k);
  ctx.quadraticCurveTo(-8 * k, -46 * k, -6 * k, hipY);
  ctx.moveTo(7 * k, shoulderY + 3 * k);
  ctx.quadraticCurveTo(8 * k, -46 * k, 6 * k, hipY);
  ctx.stroke();
  // belt
  ctx.fillStyle = CRIM;
  rr(ctx, -10 * k, hipY - 1 * k, 20 * k, 3.2 * k, 1.6 * k);
  ctx.fill();
  // chest signal core (pulses in overdrive; tracker tints it green)
  const corePulse = over ? 0.5 + Math.sin(t * 7) * 0.5 : 0.35 + Math.sin(t * 2.4) * 0.1;
  const coreR = (3 + (over ? corePulse * 1.6 : 0)) * k;
  ctx.fillStyle = tracker ? GREEN : CRIM_HI;
  ctx.globalAlpha = 0.28 + corePulse * 0.3;
  ctx.beginPath();
  ctx.arc(5 * k, -49 * k, coreR + 3.4 * k, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(5 * k, -49 * k, coreR, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(4.2 * k, -49.8 * k, 1.1 * k, 0, TAU);
  ctx.fill();

  // —— head: crimson hood + cowl point + visor ————————————————
  drawHead(ctx, k, t, headCy, headR, { over, recoil, thrust, crit, defeatT, motion, reduced });

  // —— near arm + mod-stick (attack/crit) ——————————————————————
  const swing = Math.sin(ph) * 0.5 * motion * vigor;
  const restX = 3 * k + Math.sin(swing) * 12 * k;
  const restY = shoulderY + 13 * k + Math.abs(Math.cos(ph + Math.PI)) * 2 * k;
  const reachX = 22 * k; // thrust hand target
  const reachY = shoulderY + 3 * k;
  const loot = lootT > 0 ? Math.sin(lootT * Math.PI) : 0;
  const hx = restX + (reachX - restX) * thrust;
  const hy = restY + (reachY - restY) * thrust - loot * 22 * k;
  ctx.strokeStyle = INK3;
  limb(ctx, 2 * k, shoulderY + 2 * k, (2 * k + hx) * 0.5, (shoulderY + hy) * 0.5 + 3 * k, 7 * k);
  limb(ctx, (2 * k + hx) * 0.5, (shoulderY + hy) * 0.5 + 3 * k, hx, hy, 6.2 * k);
  // crimson cuff
  ctx.fillStyle = CRIM;
  ctx.beginPath();
  ctx.arc(hx, hy, 3.6 * k, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = BORDO;
  ctx.lineWidth = 1.2 * k;
  ctx.stroke();

  if (thrust > 0.04 || crit) {
    const ang = -0.1 - thrust * 0.08;
    const stickLen = 26 * k;
    const tx = hx + Math.cos(ang) * stickLen;
    const ty = hy + Math.sin(ang) * stickLen;
    ctx.strokeStyle = '#0e1a28';
    ctx.lineWidth = 4.6 * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = BORDO;
    ctx.lineWidth = 1 * k;
    ctx.stroke();
    // crimson rings
    ctx.strokeStyle = CRIM;
    ctx.lineWidth = 1.8 * k;
    for (const d of [0.45, 0.72]) {
      const rx = hx + Math.cos(ang) * stickLen * d;
      const ry = hy + Math.sin(ang) * stickLen * d;
      ctx.beginPath();
      ctx.arc(rx, ry, 2.6 * k, 0, TAU);
      ctx.stroke();
    }
    // muzzle spark at tip
    const spark = clamp((thrust - 0.45) / 0.5, 0, 1);
    if (spark > 0) {
      const hot = crit;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hot ? `rgba(255,255,255,${0.9 * spark})` : `rgba(255,120,140,${0.75 * spark})`;
      ctx.beginPath();
      ctx.arc(0, 0, (2.2 + spark * 3.2) * k, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = hot ? `rgba(255,240,245,${spark})` : `rgba(252,18,67,${0.8 * spark})`;
      ctx.lineWidth = 1.4 * k;
      for (let i = 0; i < 4; i++) {
        const a = t * 24 + i * (Math.PI / 2);
        const d = (4 + spark * 7) * k;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 2 * k, Math.sin(a) * 2 * k);
        ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  } // end procedural fallback body (sprite path already drew the body)

  // level-up halo pop
  if (levelT > 0) {
    const u = 1 - levelT;
    ctx.strokeStyle = `rgba(230,184,77,${0.75 * levelT})`;
    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.ellipse(0, headCy - headR - 6 * k, (8 + u * 20) * k, (3 + u * 7) * k, 0, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}

/** Hooded head + visor with scan-line, sweep, blink, rim light. */
function drawHead(ctx, k, t, cy, R, st) {
  // cowl point trailing back-left
  ctx.fillStyle = CRIM;
  ctx.strokeStyle = BORDO;
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.moveTo(-R * 0.55, cy - R * 0.82);
  ctx.quadraticCurveTo(-R - 13 * k, cy - R * 0.55, -R - 10 * k, cy + 2 * k);
  ctx.quadraticCurveTo(-R - 4 * k, cy + 6 * k, -R * 0.9, cy + 4 * k);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // hood sphere
  ctx.beginPath();
  ctx.arc(0, cy, R, 0, TAU);
  ctx.fillStyle = CRIM;
  ctx.fill();
  ctx.stroke();

  // 2-tone shade + top light + rim, clipped to the sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, cy, R, 0, TAU);
  ctx.clip();
  ctx.fillStyle = CRIM_DEEP;
  ctx.beginPath();
  ctx.ellipse(6 * k, cy + R * 0.62, R * 0.95, R * 0.6, 0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,228,0.14)';
  ctx.beginPath();
  ctx.ellipse(-R * 0.38, cy - R * 0.42, R * 0.55, R * 0.4, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  // rim light upper-left
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1.6 * k;
  ctx.beginPath();
  ctx.arc(0, cy, R - 1 * k, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();

  // —— visor band (wraps the head, front toward +x) ——————————————
  const vx = 7 * k;
  const vy = cy - 1 * k;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, cy, R, 0, TAU);
  ctx.clip();
  ctx.fillStyle = VISOR;
  rr(ctx, vx - 26 * k, vy - 7.5 * k, 42 * k, 15 * k, 7 * k);
  ctx.fill();
  ctx.strokeStyle = 'rgba(87,16,39,0.9)';
  ctx.lineWidth = 1.6 * k;
  ctx.stroke();
  // inner scan-line (dims on blink, flashes on damage)
  const blink = (t % 3.7) < 0.11 ? 0.25 : 1;
  const flicker = st.recoil > 0 ? (Math.sin(t * 60) > 0 ? 1 : 0.35) : 1;
  const dim = st.defeatT > 0 ? 1 - st.defeatT * 0.7 : 1;
  const glowA = (0.55 + (st.over ? 0.3 : 0) + st.thrust * 0.3) * blink * flicker * dim;
  ctx.fillStyle = st.recoil > 0.4 ? `rgba(255,235,240,${glowA})` : `rgba(255,92,122,${glowA})`;
  rr(ctx, vx - 20 * k, vy - 1.6 * k, 30 * k, 3.2 * k, 1.6 * k);
  ctx.fill();
  // sweeping highlight across the scan-line
  if (!st.reduced) {
    const sweep = (t % 3.8) / 3.8;
    if (sweep < 0.22) {
      const sx = vx - 20 * k + (sweep / 0.22) * 30 * k;
      ctx.fillStyle = `rgba(255,255,255,${0.85 * Math.sin((sweep / 0.22) * Math.PI) * dim})`;
      rr(ctx, sx - 1.5 * k, vy - 2.2 * k, 3 * k, 4.4 * k, 1.5 * k);
      ctx.fill();
    }
  }
  // crit visor flash
  if (st.crit && st.thrust > 0.5) {
    ctx.fillStyle = `rgba(255,255,255,${(st.thrust - 0.5) * 0.9})`;
    rr(ctx, vx - 26 * k, vy - 7.5 * k, 42 * k, 15 * k, 7 * k);
    ctx.fill();
  }
  ctx.restore();
}

/** Short crimson scarf with follow-through lag; streams back when sprinting. */
function drawScarf(ctx, k, t, freq, motion, sprint, recoil, defeatT) {
  const stretch = sprint ? 1.6 : 1;
  const baseX = -6 * k;
  const baseY = -60 * k;
  // neck wrap
  ctx.fillStyle = CRIM_DEEP;
  ctx.strokeStyle = BORDO;
  ctx.lineWidth = 1.6 * k;
  rr(ctx, baseX - 6 * k, baseY - 3 * k, 16 * k, 6.5 * k, 3 * k);
  ctx.fill();
  ctx.stroke();
  // ribbon: 4 lagging points, unrolled (no per-frame allocation)
  const f = freq * 0.85;
  const x0 = baseX - 4 * k;
  const y0 = baseY + 1 * k;
  const x1 = baseX - (4 + 8.5 * stretch) * k;
  const y1 = baseY + 2.3 * k + (Math.sin(t * f - 0.95) * 3.2 + recoil * 1.5) * k * motion + defeatT * 2 * k;
  const x2 = baseX - (4 + 17 * stretch) * k;
  const y2 = baseY + 3.6 * k + (Math.sin(t * f - 1.9) * 4.9 + recoil * 3) * k * motion + defeatT * 4 * k;
  const x3 = baseX - (4 + 25.5 * stretch) * k;
  const y3 = baseY + 4.9 * k + (Math.sin(t * f - 2.85) * 6.6 + recoil * 4.5) * k * motion + defeatT * 6 * k;
  const x4 = baseX - (4 + 34 * stretch) * k;
  const y4 = baseY + 6.2 * k + (Math.sin(t * f - 3.8) * 8.3 + recoil * 6) * k * motion + defeatT * 8 * k;
  ctx.fillStyle = CRIM;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 5.5 * k);
  ctx.lineTo(x1, y1 - 5.5 * k);
  ctx.lineTo(x2, y2 - 4.3 * k);
  ctx.lineTo(x3, y3 - 3.3 * k);
  ctx.lineTo(x4, y4 - 2.6 * k);
  ctx.lineTo(x4, y4 + 2.6 * k);
  ctx.lineTo(x3, y3 + 3.3 * k);
  ctx.lineTo(x2, y2 + 4.3 * k);
  ctx.lineTo(x1, y1 + 5.5 * k);
  ctx.lineTo(x0, y0 + 5.5 * k);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // editorial stripe near the tip
  ctx.strokeStyle = CRIM_DARK;
  ctx.lineWidth = 1.4 * k;
  ctx.beginPath();
  ctx.moveTo(x4 + 2 * k, y4 - 2 * k);
  ctx.lineTo(x4 + 2 * k, y4 + 2 * k);
  ctx.stroke();
}
