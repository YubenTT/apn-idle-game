/**
 * APN Host V2 — procedural Canvas hero (V2 Super Polish, Wave 1).
 *
 * One character, one locked silhouette (brand/MASCOT-CANON.md):
 * oversized spherical head (~52% of height), integrated black visor band,
 * floating capsule torso, short stubby arms, minimal oval shadow.
 *
 * Pure-ish: deterministic from opts + time. No DOM, no fetch, no allocations
 * in the hot path. Facing RIGHT, ground pivot at bottom-center.
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
 *   motionSelector exact authored V3 selector from render.js; independent of
 *                the shorter procedural attack envelope
 *   levelT/defeatT/lootT  optional 0..1 clip clocks (wired by later waves)
 */

import { clamp } from './formulas.js?v=enhanced-v1';
import {
  drawV3Frame,
  heroV3Ready,
  pickV3,
  resolveHeroV3Frame,
} from './hero-v3.js?v=enhanced-v1';

const T = 130; // design height in px (HOST_PRESENTATION.target)

// APN palette — canvas side of brand/tokens.css (crimson + dark inks)
const CRIM = '#fc1243';
const CRIM_HI = '#ff3a63';
const CRIM_DEEP = '#a3072f';
const CRIM_DARK = '#7d0a26';
const BORDO = '#571027'; // outline — dark wine, never pure black
const VISOR = '#060b12';

const TAU = Math.PI * 2;

/**
 * Approved V3 raster body + the SAME procedural overlay stack as the flipbook
 * path (overdrive glow, recoil blink, crit visor flash, fist spark) — only
 * the anchor geometry is re-derived from the V3 content box: bottom-center
 * ground anchor at the local origin, head sphere at the top of the box
 * (canon: head ≈ 52% of height, visor band ≈ 36% down from the content top).
 */
export function selectHeroV3Frame(o, st, clips) {
  const selector = o.motionSelector || {
    t: st.t,
    attack: st.attack,
    crit: st.crit,
    recoil: st.recoil,
    overdrive: st.over,
    sprint: !!o.sprinting,
    pose: o.pose,
    defeatT: o.defeatT || 0,
    levelT: o.levelT || 0,
    lootT: o.lootT || 0,
  };
  return clips ? pickV3(selector, clips) : resolveHeroV3Frame(selector);
}

function drawV3Body(ctx, o, st) {
  const sel = selectHeroV3Frame(o, st);
  if (!sel) return;
  const H = o.drawTrimHeight || o.height || T;

  // overdrive under-glow behind the body (identical to the flipbook path)
  const dh0 = H;
  if (st.over) {
    const pulse = 0.5 + Math.sin(st.t * 7) * 0.5;
    const gy = -dh0 * 0.45;
    const rg = ctx.createRadialGradient(0, gy, 2, 0, gy, dh0 * 0.62);
    rg.addColorStop(0, `rgba(252,18,67,${0.34 + pulse * 0.14})`);
    rg.addColorStop(1, 'rgba(252,18,67,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, gy, dh0 * 0.62, 0, TAU);
    ctx.fill();
  }

  const r = drawV3Frame(ctx, sel.clip, sel.frame, H);
  if (!r) return;
  const { dx, dy, dw, dh } = r;

  // head/visor zone on the rendered head sphere (top of the content box)
  const headX = dx + dw * 0.5;
  const headY = dy + dh * 0.36;
  const headR = dh * 0.27;

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

  // fist spark at impact (right of content center, mid-body — same offsets
  // the flipbook path used relative to its frame)
  const spark = clamp((st.attack - 0.45) / 0.5, 0, 1);
  if (spark > 0) {
    const hot = st.crit;
    const hx = dx + dw * 0.62;
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

export const IDENTITY_SAFE_FALLBACK_CONTRACT = Object.freeze({
  body: 'floating-capsule',
  legCount: 0,
  head: 'crimson-sphere',
  visor: 'black-wrap',
});

function drawReferenceHead(ctx, k, cy, radius, st) {
  ctx.fillStyle = CRIM;
  ctx.strokeStyle = BORDO;
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.arc(0, cy, radius, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, cy, radius, 0, TAU);
  ctx.clip();
  const shade = ctx.createLinearGradient(
    -radius,
    cy - radius,
    radius,
    cy + radius,
  );
  shade.addColorStop(0, CRIM_HI);
  shade.addColorStop(0.55, CRIM);
  shade.addColorStop(1, CRIM_DEEP);
  ctx.fillStyle = shade;
  ctx.fillRect(-radius, cy - radius, radius * 2, radius * 2);

  ctx.fillStyle = VISOR;
  rr(
    ctx,
    -radius * 0.86,
    cy - radius * 0.25,
    radius * 1.72,
    radius * 0.52,
    radius * 0.22,
  );
  ctx.fill();
  if (st.recoil > 0.3 || (st.crit && st.attack > 0.5)) {
    ctx.fillStyle = `rgba(255,255,255,${Math.max(
      st.recoil * 0.35,
      (st.attack - 0.5) * 0.8,
    )})`;
    rr(
      ctx,
      -radius * 0.78,
      cy - radius * 0.16,
      radius * 1.56,
      radius * 0.32,
      radius * 0.14,
    );
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(255,235,240,0.42)';
  ctx.beginPath();
  ctx.ellipse(
    -radius * 0.34,
    cy - radius * 0.48,
    radius * 0.24,
    radius * 0.13,
    -0.55,
    0,
    TAU,
  );
  ctx.fill();
}

export function drawIdentitySafeFallback(ctx, k, t, st) {
  const bodyTop = -63 * k;
  const bodyHeight = 55 * k;
  const armSwing = Math.sin(t * 5.2) * 2.5 * k * st.motion;

  ctx.strokeStyle = CRIM_DARK;
  limb(
    ctx,
    -8 * k,
    bodyTop + 14 * k,
    -19 * k,
    bodyTop + 31 * k - armSwing,
    7 * k,
  );

  ctx.fillStyle = CRIM;
  ctx.strokeStyle = BORDO;
  ctx.lineWidth = 2 * k;
  rr(ctx, -13 * k, bodyTop, 26 * k, bodyHeight, 13 * k);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = CRIM_HI;
  rr(ctx, -8 * k, bodyTop + 4 * k, 8 * k, bodyHeight - 12 * k, 4 * k);
  ctx.fill();
  ctx.restore();

  drawReferenceHead(ctx, k, -91 * k, 34 * k, st);

  ctx.strokeStyle = CRIM;
  limb(
    ctx,
    8 * k,
    bodyTop + 14 * k,
    20 * k + st.attack * 7 * k,
    bodyTop + 29 * k + armSwing,
    7 * k,
  );
}

/**
 * Draw the Host. (x, groundY) names the actor and scene ground anchors.
 * Resolved callers pass drawTrimHeight, pivotY, and geometry together; legacy
 * callers retain the bounded height/groundY compatibility path.
 */
export function drawHeroV2(ctx, x, groundY, opts = {}) {
  const o = opts;
  const t = o.time || 0;
  const attack = clamp(o.attack || 0, 0, 1);
  const recoil = clamp(o.hitRecoil || 0, 0, 1);
  const sprint = !!o.sprinting;
  const over = !!o.overdrive;
  const crit = !!o.crit;
  const reduced = !!o.reducedMotion;
  const levelT = clamp(o.levelT || 0, 0, 1);
  const defeatT = clamp(o.defeatT || 0, 0, 1);
  const k = (o.geometry?.body?.height || o.height || T) / T;
  const motion = reduced ? 0.45 : 1;

  // —— clip clocks ————————————————————————————————————————
  // 'idle' pose: no locomotion; weight rests on the breathe
  // cycle (visor sweep + blink keep the character alive). Used by the Gear niche.
  const idle = o.pose === 'idle';
  // Sprite body decision comes FIRST: the authority-validated V3 clip player is the
  // primary renderer. Any V3 load/decode failure uses one deliberately simple
  // identity-safe Canvas silhouette rather than a second character design.
  const v3On = heroV3Ready();
  const phase = t * (sprint ? 15 : 10.5);
  const idleSway = (0.5 + Math.sin(t * 2.1) * 0.5) * 0.9 * k * motion;
  const bounce = v3On
    ? (idle ? idleSway : 0)
    : (idle
        ? idleSway
        : Math.abs(Math.sin(phase)) *
          (sprint ? 4.2 : 2.6) *
          k *
          motion);
  const breathe = Math.sin(t * 2.1) * (idle ? 0.022 : 0.014) * motion;
  const thrust = attack; // 1 at impact, decays to 0
  const lunge = (crit ? 16 : 10.5) * k * thrust;
  const hover = over ? (2.4 + Math.sin(t * 6.5) * 1.4 * motion) * k : 0;
  const flinch = recoil * 7 * k * motion;
  const buckle = defeatT * 0.16;
  const jump = levelT > 0 ? Math.sin(levelT * Math.PI) * 12 * k : 0;

  // —— ground shadow: minimal oval, 18–22% opacity ————————————
  const shK = 1 - clamp((hover + jump) / (30 * k), 0, 0.45);
  const shadowX = o.geometry?.anchors?.shadowX ?? x;
  const shadowY = o.geometry?.anchors?.shadowY ?? groundY;
  ctx.save();
  ctx.translate(shadowX, shadowY);
  ctx.fillStyle = 'rgba(4,8,12,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 3 * k, 30 * k * shK, 6.4 * k * shK, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Body motion is isolated from the renderer-owned ground shadow.
  const pivotY = o.pivotY ?? groundY;
  ctx.save();
  ctx.translate(x - flinch, pivotY - hover - jump);

  // Subtle sprint trail behind the floating silhouette.
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

  // body group: bounce + lean + squash & stretch (ground pivot preserved)
  const lean = (idle ? 0.02 : sprint ? 0.15 : 0.05) + thrust * (crit ? 0.26 : 0.15) - recoil * 0.24;
  ctx.translate(lunge * 0.35, -bounce * 0.5);
  ctx.rotate(lean * 0.4 - buckle * 0.5);
  ctx.scale(
    (1 + thrust * (crit ? 0.1 : 0.065) + breathe) * (1 + buckle * 0.2),
    (1 - thrust * (crit ? 0.085 : 0.055) - breathe) * (1 - buckle),
  );
  ctx.translate(lunge * 0.65, -bounce * 0.5);

  const headCy = -88 * k;
  const headR = 33 * k;

  // —— body: authority-validated V3 clips > identity-safe Canvas silhouette —————
  if (v3On) {
    drawV3Body(ctx, o, { t, attack, recoil, crit, over });
  } else {
    drawIdentitySafeFallback(ctx, k, t, { attack, recoil, crit, motion });
  }

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
