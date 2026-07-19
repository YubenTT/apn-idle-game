/**
 * APN Host skeletal rig — generated art, engine-animated.
 *
 * Why this exists: AI flipbook frames strobed and drifted (user review);
 * the procedural Host animated beautifully because every frame is 60fps
 * interpolated math. So the AI produces ONE clean A-pose model sheet, the
 * offline cutter (scripts/gen/build_hero_rig.py) splits it into parts with
 * pivots + a skeleton, and THIS module poses those parts with the same gait
 * math that made the procedural Host feel alive. Canon look + butter motion.
 *
 * Parts (assets/mascot/v2/rig.webp + rig.json):
 *   head (pivot = neck), torso (pivot = hip-bottom), arm/leg (+ pre-darkened
 *   far variants), skeleton landmarks in design space (512 = full height,
 *   y measured UP from the ground), visor rect in head-local 0..1 coords.
 *
 * Missing rig = caller falls back to the flipbook/procedural body.
 */

import { clamp } from './formulas.js?v=golive-pr5';

const TAU = Math.PI * 2;
let RIG = null;

export function setHeroRig(image, data) {
  if (!image || !data || !data.parts || !data.parts.head || !data.skeleton) return;
  RIG = { image, parts: data.parts, skeleton: data.skeleton, visor: data.visor || null };
}

export function heroRigReady() {
  return !!RIG;
}

/** Draw one rig part anchored at (ax, ay) = pivot position, rotated `angle`. */
function drawPart(ctx, name, ax, ay, angle, ks, scaleY = 1) {
  const p = RIG.parts[name];
  if (!p) return 0;
  const r = p.rect;
  const w = r.w * ks;
  const h = r.h * ks * scaleY;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle);
  ctx.drawImage(RIG.image, r.x, r.y, r.w, r.h, -p.pivot.x * w, -p.pivot.y * h, w, h);
  ctx.restore();
  return r.h * ks; // natural length (unscaled) for hand/foot estimation
}

/**
 * Rig body. Called from drawHeroV2 INSIDE the shared juice transform stack
 * (bounce/lean/squash/lunge/hover/flinch already applied) — so the rig gets
 * every wave-1..3 feel for free. `env` carries the procedural clocks.
 */
export function drawRigBody(ctx, o, env) {
  const S = RIG.skeleton;
  const ks = (o.height || 130) / S.designHeight;
  const { t, ph, idle, sprint, over, crit, motion, vigor, reduced } = env;
  const attack = env.attack;
  const recoil = env.recoil;
  const thrust = env.thrust;
  const levelT = env.levelT;
  const defeatT = env.defeatT;
  const lootT = env.lootT;

  const hipY = -S.hipY * ks;
  const shoulderY = -S.shoulderY * ks;
  const neckY = -S.neckY * ks;
  const legX = Math.max(1.5, S.legHipX * ks * 0.45);
  const shoulderX = S.shoulderX * ks * 0.85;

  // —— gait angles (canvas rotation; negative = swing toward +x = forward) ——
  const amp = (idle ? 0.07 : sprint ? 0.8 : 0.58) * motion * vigor * (1 - defeatT * 0.7);
  const armAmp = (idle ? 0.05 : sprint ? 0.62 : 0.42) * motion * vigor * (1 - defeatT * 0.6);
  const ARM_IN = -0.62; // sprite is drawn 45° out — pull to near-vertical rest
  const celebrate = levelT > 0 ? Math.sin(clamp(levelT, 0, 1) * Math.PI) : 0;
  const lootLift = lootT > 0 ? Math.sin(clamp(lootT, 0, 1) * Math.PI) : 0;
  const reach = -1.5; // thrust target: arm forward-up toward the feed

  const swing = Math.sin(ph) * armAmp;
  const nearArmAngle = ARM_IN - swing + thrust * (reach - ARM_IN) - lootLift * 1.4 - celebrate * 2.1;
  const farArmAngle = ARM_IN + swing * 0.9 - celebrate * 2.1 + 0.08;

  // —— far limbs (pre-darkened parts, slight inward offset for depth) ————————
  drawPart(ctx, 'arm-far', -shoulderX * 0.8, shoulderY + 1 * ks * 4, farArmAngle, ks);
  const farLift = Math.max(0, Math.sin(ph));
  drawPart(ctx, 'leg-far', -legX * 0.7, hipY, Math.sin(ph) * amp, ks, 1 - farLift * 0.16);

  // —— near leg ————————————————————————————————————————————————
  const nearLift = Math.max(0, Math.sin(ph + Math.PI));
  drawPart(ctx, 'leg', legX, hipY, Math.sin(ph + Math.PI) * amp, ks, 1 - nearLift * 0.16);

  // —— torso (hip pivot at bottom) ————————————————————————————————
  drawPart(ctx, 'torso', 0, hipY + 1, thrust * 0.06 - recoil * 0.05, ks);

  // —— head + visor life ————————————————————————————————————————
  const headTilt = thrust * 0.12 - recoil * 0.3 + defeatT * 0.4;
  const hp = RIG.parts.head;
  const hw = hp.rect.w * ks;
  const hh = hp.rect.h * ks;
  ctx.save();
  ctx.translate(S.neckCX * ks, neckY);
  ctx.rotate(headTilt);
  ctx.drawImage(RIG.image, hp.rect.x, hp.rect.y, hp.rect.w, hp.rect.h,
    -hp.pivot.x * hw, -hp.pivot.y * hh, hw, hh);

  if (RIG.visor) {
    const v = RIG.visor;
    const vx = (v.x - hp.pivot.x) * hw;
    const vy = (v.y - hp.pivot.y) * hh;
    const vw = v.w * hw;
    const vh = v.h * hh;
    const lineY = vy + vh * 0.52;
    const lineH = Math.max(1.4, vh * 0.12);
    const blink = (t % 3.7) < 0.11 ? 0.25 : 1;
    const flicker = recoil > 0 ? (Math.sin(t * 60) > 0 ? 1 : 0.35) : 1;
    const dim = defeatT > 0 ? 1 - defeatT * 0.7 : 1;
    const glowA = (0.5 + (over ? 0.3 : 0) + thrust * 0.3) * blink * flicker * dim;
    ctx.fillStyle = recoil > 0.4 ? `rgba(255,235,240,${glowA})` : `rgba(255,92,122,${glowA})`;
    ctx.beginPath();
    ctx.roundRect(vx + vw * 0.14, lineY - lineH / 2, vw * 0.72, lineH, lineH / 2);
    ctx.fill();
    // sweeping highlight across the scan-line
    if (!reduced) {
      const sweep = (t % 3.8) / 3.8;
      if (sweep < 0.22) {
        const sx = vx + vw * 0.14 + (sweep / 0.22) * vw * 0.72;
        ctx.fillStyle = `rgba(255,255,255,${0.85 * Math.sin((sweep / 0.22) * Math.PI) * dim})`;
        ctx.beginPath();
        ctx.roundRect(sx - vw * 0.04, lineY - lineH * 0.8, vw * 0.08, lineH * 1.6, lineH / 2);
        ctx.fill();
      }
    }
    // crit visor flash
    if (crit && thrust > 0.5) {
      ctx.fillStyle = `rgba(255,255,255,${(thrust - 0.5) * 0.75})`;
      ctx.beginPath();
      ctx.roundRect(vx + vw * 0.05, vy + vh * 0.15, vw * 0.9, vh * 0.7, vh * 0.3);
      ctx.fill();
    }
  }
  ctx.restore();

  // —— near arm + mod-stick + impact spark ————————————————————————
  const armLen = drawPart(ctx, 'arm', shoulderX, shoulderY, nearArmAngle, ks) * 0.94;
  // hand = pivot + length along the arm's drawn direction (sprite ~45° out)
  const dir = 0.72 + nearArmAngle; // sprite rest direction + applied rotation
  const hx = shoulderX + Math.sin(dir) * armLen;
  const hy = shoulderY + Math.cos(dir) * armLen;

  if (thrust > 0.04 || crit) {
    const k = (o.height || 130) / 130;
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
    ctx.strokeStyle = '#571027';
    ctx.lineWidth = 1 * k;
    ctx.stroke();
    ctx.strokeStyle = '#fc1243';
    ctx.lineWidth = 1.8 * k;
    for (const d of [0.45, 0.72]) {
      const rx = hx + Math.cos(ang) * stickLen * d;
      const ry = hy + Math.sin(ang) * stickLen * d;
      ctx.beginPath();
      ctx.arc(rx, ry, 2.6 * k, 0, TAU);
      ctx.stroke();
    }
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
}
