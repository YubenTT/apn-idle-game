/**
 * APN feed-noise creature family V2 + unified target presentation.
 *
 * Seven procedural types matching game domain e.type values. Every target —
 * pack atlas art OR procedural fallback — gets the same juice: ground shadow,
 * spawn pop-in, idle bob, hit squash + white bloom, death burst. Domain death
 * timing/particles stay in game.js; this module only paints.
 *
 * Creatures face LEFT (targets approach the Host from the right), foot pivot
 * at bottom-center, height = render size S. Flat 2-tone + ink outline + one
 * accent hue — same editorial language as the Host.
 */

import { clamp, easeOutQuad } from './formulas.js?v=golive-pr5';

const TAU = Math.PI * 2;

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

/** Deterministic per-enemy phase from its id (stable across frames). */
function phaseOf(id) {
  let h = 0;
  const s = String(id || 'e');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ((h >>> 0) % 628) / 100; // 0..6.28
}

/** First-seen clock for spawn pop-in (presentational only, no domain change). */
const firstSeen = new WeakMap();
function spawnScale(e, t) {
  let t0 = firstSeen.get(e);
  if (t0 == null) {
    t0 = t;
    firstSeen.set(e, t0);
  }
  const u = clamp((t - t0) / 0.32, 0, 1);
  if (u >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2; // easeOutBack
}

/**
 * Unified target draw. Keeps the exact domain death choreography; render.js
 * owns the HP banner, priority brackets, and floater anchors.
 * opts: { t, gy, atlas (Image|null), frame (atlas frame|null), reducedMotion }
 */
export function drawTarget(ctx, e, opts) {
  const { t, gy, atlas, frame, reducedMotion } = opts;
  const x = e.displayX;
  const dying = e.deathT > 0 && e.killed;
  const deathU = dying ? 1 - clamp(e.deathT / (e.deathMax || 0.5), 0, 1) : 0;
  const flashU = e.hitFlash > 0 && !dying ? clamp(e.hitFlash / 0.12, 0, 1) : 0;
  const hurtOff = !dying && e.hurt > 0 ? Math.sin(t * 40) * 1.5 : 0;
  const isBoss = e.type === 'boss';
  const isPatch = e.type === 'patch';
  const size = opts.size || (e.type === 'boss' ? 136 : e.type === 'patch' ? 100 : 96);
  const footY = gy - 2;
  const breaking = isBoss && e.hp / e.hpMax < 0.34;

  // death transforms (ported 1:1 from the legacy renderer)
  let sx = 1;
  let sy = 1;
  let rot = 0;
  let alpha = 1;
  let dy = 0;
  if (dying) {
    const u = easeOutQuad(deathU);
    if (isPatch) {
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
      sx = 1 + u * 0.35;
      sy = Math.max(0.05, 1 - u * 1.1);
      alpha = 1 - u * 0.9;
      dy = u * 8;
    }
  } else {
    // spawn pop + idle bob + hit squash (living targets only)
    const pop = spawnScale(e, t);
    sx *= pop * (1 + flashU * 0.16);
    sy *= pop * (1 - flashU * 0.12);
    if (!reducedMotion) dy += Math.sin(t * 2.2 + phaseOf(e.id)) * 2;
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  // shadow shrinks on death / jump
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + hurtOff, gy + 3, size * 0.26 * Math.abs(sx), 4.5 * Math.max(0.2, sy), 0, 0, TAU);
  ctx.fill();

  ctx.translate(x + hurtOff, footY + dy);
  ctx.rotate(rot);
  ctx.scale(sx || 0.01, sy);

  if (atlas && frame?.rect) {
    // Pack art stays pack art — juice comes from the shared transforms.
    const rect = frame.rect;
    ctx.drawImage(atlas, rect.x, rect.y, rect.w, rect.h, -size / 2, -size, size, size);
  } else {
    const paint = PAINTERS[e.type] || PAINTERS.stale;
    ctx.save();
    ctx.translate(0, -size); // painters work in a top-left 128-design box
    ctx.scale(size / 128, size / 128);
    paint(ctx, t + phaseOf(e.id), { flashU, breaking, reducedMotion, dying });
    ctx.restore();
  }

  // white hit bloom (both art paths)
  if (flashU > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * flashU * alpha;
    const rg = ctx.createRadialGradient(0, -size * 0.48, 2, 0, -size * 0.48, size * 0.52);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.35, 'rgba(255,190,200,0.4)');
    rg.addColorStop(1, 'rgba(255,80,100,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, -size * 0.48, size * 0.52, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // patch note “card shine” on death (kept from the legacy renderer)
  if (dying && isPatch) {
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#FC1243';
    rr(ctx, -size * 0.35, -size * 0.85, size * 0.7, size * 0.55, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = alpha * 0.7;
    ctx.font = '800 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOTE', 0, -size * 0.5);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

/* —— creature painters: 128-unit design box, foot pivot at (64, 128),
      facing LEFT. anim = { flashU, breaking, reducedMotion, dying } —— */

function paintStale(ctx, t, a) {
  const wob = a.reducedMotion ? 0 : Math.sin(t * 2.1) * 2;
  // stubby feet
  ctx.fillStyle = '#3d4854';
  rr(ctx, 40, 118, 18, 10, 4);
  ctx.fill();
  rr(ctx, 72, 118, 18, 10, 4);
  ctx.fill();
  // box body
  ctx.fillStyle = '#7c8a9c';
  ctx.strokeStyle = '#2b3644';
  ctx.lineWidth = 4;
  rr(ctx, 28, 42 + wob, 74, 78, 12);
  ctx.fill();
  ctx.stroke();
  // 2-tone shade
  ctx.fillStyle = '#5f6e80';
  rr(ctx, 28, 84 + wob, 74, 36, 10);
  ctx.fill();
  // antenna
  ctx.strokeStyle = '#2b3644';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(66, 44 + wob);
  ctx.lineTo(74, 24 + wob);
  ctx.stroke();
  ctx.fillStyle = Math.sin(t * 3) > 0 ? '#7fd4dc' : '#5f6e80';
  ctx.beginPath();
  ctx.arc(75, 22 + wob, 6, 0, TAU);
  ctx.fill();
  // clock-hand eyes (the "stale take" — time stuck)
  for (const ex of [48, 80]) {
    ctx.fillStyle = '#e8edf2';
    ctx.strokeStyle = '#2b3644';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ex, 66 + wob, 11, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#2b3644';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ex, 66 + wob);
    ctx.lineTo(ex + Math.cos(t * 0.7 + ex) * 6, 66 + wob + Math.sin(t * 0.7 + ex) * 6);
    ctx.moveTo(ex, 66 + wob);
    ctx.lineTo(ex + Math.cos(t * 0.12) * 4.5, 66 + wob + Math.sin(t * 0.12) * 4.5);
    ctx.stroke();
  }
  // flat mouth + dust specks
  ctx.strokeStyle = '#2b3644';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(54, 96 + wob);
  ctx.lineTo(76, 96 + wob);
  ctx.stroke();
  ctx.fillStyle = 'rgba(43,54,68,0.5)';
  ctx.fillRect(34, 50 + wob, 4, 4);
  ctx.fillRect(92, 108 + wob, 4, 4);
}

function paintRumor(ctx, t, a) {
  const flap = a.reducedMotion ? 0.3 : Math.sin(t * 6) * 0.55;
  // wings (behind)
  ctx.fillStyle = '#7c55c9';
  ctx.strokeStyle = '#3c2a63';
  ctx.lineWidth = 3.5;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(64 + s * 34, 66);
    ctx.rotate(s * (0.5 + flap * 0.6));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 26, -18, s * 34, 6);
    ctx.quadraticCurveTo(s * 18, 2, s * 12, 14);
    ctx.quadraticCurveTo(s * 6, 6, 0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // big ears
  ctx.fillStyle = '#a783f5';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(64 + s * 16, 34);
    ctx.rotate(s * (0.28 + (a.reducedMotion ? 0 : Math.sin(t * 2.4) * 0.08)));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 12, -26);
    ctx.lineTo(s * 20, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // speech-bubble body
  ctx.fillStyle = '#a783f5';
  ctx.strokeStyle = '#3c2a63';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 74, 34, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(44, 100);
  ctx.lineTo(34, 122);
  ctx.lineTo(56, 106);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // shade
  ctx.fillStyle = '#8a66dd';
  ctx.beginPath();
  ctx.arc(70, 84, 26, 0, TAU);
  ctx.fill();
  // whisper marks
  ctx.fillStyle = '#e6dbff';
  ctx.beginPath();
  ctx.arc(56, 66, 4, 0, TAU);
  ctx.arc(70, 66, 4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#e6dbff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(63, 80, 8, 0.3, Math.PI - 0.3);
  ctx.stroke();
  // tiny feet
  ctx.fillStyle = '#3c2a63';
  rr(ctx, 52, 116, 12, 8, 4);
  ctx.fill();
  rr(ctx, 70, 116, 12, 8, 4);
  ctx.fill();
}

function paintLag(ctx, t, a) {
  // stuttery hop: quantized squash steps
  const step = a.reducedMotion ? 0 : Math.floor(t * 3.2) % 3;
  const sq = step === 0 ? 0.94 : 1;
  const hopY = step === 2 ? -6 : 0;
  ctx.save();
  ctx.translate(64, 128 + hopY);
  ctx.scale(1 / sq, sq);
  // slime blob
  ctx.fillStyle = '#eab54f';
  ctx.strokeStyle = '#5d4313';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.quadraticCurveTo(-38, -34, -16, -46);
  ctx.quadraticCurveTo(0, -56 + Math.sin(t * 4) * 3, 16, -46);
  ctx.quadraticCurveTo(38, -34, 34, 0);
  ctx.quadraticCurveTo(0, 8, -34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // shade
  ctx.fillStyle = '#c89434';
  ctx.beginPath();
  ctx.ellipse(6, -14, 24, 12, 0, 0, TAU);
  ctx.fill();
  // face
  ctx.fillStyle = '#2b1e08';
  ctx.beginPath();
  ctx.arc(-12, -30, 4.5, 0, TAU);
  ctx.arc(10, -30, 4.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#2b1e08';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-1, -20, 7, 0.2, Math.PI - 0.6);
  ctx.stroke();
  ctx.restore();
  // buffering ring above
  ctx.strokeStyle = '#eab54f';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const spin = a.reducedMotion ? 0 : t * 3;
  ctx.beginPath();
  ctx.arc(64, 18, 12, spin, spin + Math.PI * 1.4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(234,181,79,0.35)';
  ctx.beginPath();
  ctx.arc(64, 18, 12, spin + Math.PI * 1.5, spin + Math.PI * 1.9);
  ctx.stroke();
}

function paintSpoiler(ctx, t, a) {
  const bob = a.reducedMotion ? 0 : Math.sin(t * 2.6) * 2.5;
  // horns
  ctx.fillStyle = '#7c4ab0';
  ctx.strokeStyle = '#452a63';
  ctx.lineWidth = 3.5;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(64 + s * 14, 40 + bob);
    ctx.quadraticCurveTo(64 + s * 26, 22 + bob, 64 + s * 20, 12 + bob);
    ctx.quadraticCurveTo(64 + s * 14, 24 + bob, 64 + s * 6, 34 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // round imp body
  ctx.fillStyle = '#a06cd4';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 78 + bob, 36, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8654bd';
  ctx.beginPath();
  ctx.arc(70, 90 + bob, 26, 0, TAU);
  ctx.fill();
  // jagged grin
  ctx.fillStyle = '#f3eaff';
  ctx.beginPath();
  ctx.moveTo(48, 94 + bob);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(48 + i * 8 + 4, 102 + bob);
    ctx.lineTo(48 + (i + 1) * 8, 94 + bob);
  }
  ctx.closePath();
  ctx.fill();
  // spoiler bar censor across the eyes (slight nervous jitter)
  const jit = a.reducedMotion ? 0 : Math.sin(t * 9) * 1.2;
  ctx.fillStyle = '#0d0a14';
  rr(ctx, 34, 56 + bob + jit, 60, 16, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  rr(ctx, 38, 59 + bob + jit, 20, 3, 1.5);
  ctx.fill();
  // claw feet
  ctx.fillStyle = '#452a63';
  rr(ctx, 46, 116, 14, 9, 4);
  ctx.fill();
  rr(ctx, 70, 116, 14, 9, 4);
  ctx.fill();
}

function paintPatch(ctx, t, a) {
  const tilt = a.reducedMotion ? 0 : Math.sin(t * 2.2) * 0.06;
  ctx.save();
  ctx.translate(64, 120);
  ctx.rotate(tilt);
  // little legs
  ctx.fillStyle = '#5e0a1e';
  rr(ctx, -20, -4, 14, 10, 4);
  ctx.fill();
  rr(ctx, 8, -4, 14, 10, 4);
  ctx.fill();
  // card body
  ctx.fillStyle = '#fc1243';
  ctx.strokeStyle = '#5e0a1e';
  ctx.lineWidth = 4;
  rr(ctx, -36, -100, 72, 96, 10);
  ctx.fill();
  ctx.stroke();
  // shade
  ctx.fillStyle = '#c00e36';
  rr(ctx, -36, -48, 72, 44, 9);
  ctx.fill();
  // folded corner
  ctx.fillStyle = '#ff5c7a';
  ctx.beginPath();
  ctx.moveTo(36, -100);
  ctx.lineTo(20, -100);
  ctx.lineTo(36, -84);
  ctx.closePath();
  ctx.fill();
  // header pin
  ctx.fillStyle = '#5e0a1e';
  ctx.beginPath();
  ctx.arc(0, -100, 5, 0, TAU);
  ctx.fill();
  // face
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-13, -72, 5, 0, TAU);
  ctx.arc(11, -72, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5e0a1e';
  ctx.beginPath();
  ctx.arc(-14, -72, 2.2, 0, TAU);
  ctx.arc(10, -72, 2.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-1, -62, 7, 0.3, Math.PI - 0.3);
  ctx.stroke();
  // NOTE label
  ctx.fillStyle = '#fff';
  ctx.font = '800 15px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NOTE', 0, -34);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  rr(ctx, -22, -24, 44, 4, 2);
  ctx.fill();
  ctx.restore();
}

function paintEvent(ctx, t, a) {
  const rot = a.reducedMotion ? 0.4 : t * 1.1;
  const pulse = a.reducedMotion ? 0.5 : 0.5 + Math.sin(t * 5) * 0.5;
  ctx.save();
  ctx.translate(64, 76);
  // radiating spikes
  ctx.fillStyle = '#1cc67e';
  ctx.strokeStyle = '#0a5e3c';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const ang = rot + (i * Math.PI) / 4;
    const len = i % 2 ? 34 : 46;
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(10, -7);
    ctx.lineTo(len, 0);
    ctx.lineTo(10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // core orb
  ctx.beginPath();
  ctx.arc(0, 0, 20 + pulse * 3, 0, TAU);
  ctx.fillStyle = '#1cc67e';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-4, -5, 9, 0, TAU);
  ctx.fillStyle = '#a7f3d0';
  ctx.fill();
  // face
  ctx.fillStyle = '#0a5e3c';
  ctx.beginPath();
  ctx.arc(-7, -2, 3, 0, TAU);
  ctx.arc(6, -2, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
  // twinkling sparks
  if (!a.reducedMotion) {
    ctx.fillStyle = '#a7f3d0';
    for (let i = 0; i < 3; i++) {
      const sx = 24 + i * 38;
      const sy = 30 + ((i * 41) % 60);
      const tw = Math.sin(t * 6 + i * 2.1) * 0.5 + 0.5;
      ctx.globalAlpha = tw * 0.8;
      ctx.fillRect(sx - 1.5, sy - 5, 3, 10);
      ctx.fillRect(sx - 5, sy - 1.5, 10, 3);
    }
    ctx.globalAlpha = 1;
  }
  // feet
  ctx.fillStyle = '#0a5e3c';
  rr(ctx, 50, 118, 13, 9, 4);
  ctx.fill();
  rr(ctx, 70, 118, 13, 9, 4);
  ctx.fill();
}

function paintBoss(ctx, t, a) {
  const sway = a.reducedMotion ? 0 : Math.sin(t * 1.6) * 1.5;
  const corePulse = 0.5 + Math.sin(t * (a.breaking ? 9 : 4)) * 0.5;
  ctx.save();
  ctx.translate(64, 128);
  // slab body
  ctx.fillStyle = '#141e2b';
  ctx.strokeStyle = '#05090f';
  ctx.lineWidth = 5;
  rr(ctx, -42 + sway * 0.3, -118, 84, 118, 8);
  ctx.fill();
  ctx.stroke();
  // top face (slab depth)
  ctx.fillStyle = '#1d2c3f';
  rr(ctx, -42 + sway * 0.3, -118, 84, 14, 7);
  ctx.fill();
  // panel seams
  ctx.strokeStyle = 'rgba(94,130,170,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-42 + sway * 0.3, -86);
  ctx.lineTo(42 + sway * 0.3, -86);
  ctx.moveTo(-42 + sway * 0.3, -52);
  ctx.lineTo(42 + sway * 0.3, -52);
  ctx.stroke();
  // gremlin face near the top
  ctx.fillStyle = '#e8f0f8';
  ctx.save();
  ctx.translate(sway, 0);
  ctx.beginPath();
  ctx.moveTo(-20, -96);
  ctx.lineTo(-6, -90);
  ctx.lineTo(-20, -86);
  ctx.closePath();
  ctx.moveTo(20, -96);
  ctx.lineTo(6, -90);
  ctx.lineTo(20, -86);
  ctx.closePath();
  ctx.fill();
  // jagged mouth
  ctx.beginPath();
  ctx.moveTo(-14, -76);
  for (let i = 0; i < 4; i++) {
    ctx.lineTo(-14 + i * 7 + 3.5, -71);
    ctx.lineTo(-14 + (i + 1) * 7, -76);
  }
  ctx.strokeStyle = '#e8f0f8';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  // red core
  const coreR = a.breaking ? 17 + corePulse * 4 : 13 + corePulse * 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(252,18,67,${0.25 + corePulse * (a.breaking ? 0.4 : 0.2)})`;
  ctx.beginPath();
  ctx.arc(sway * 0.5, -34, coreR + 9, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fc1243';
  ctx.beginPath();
  ctx.arc(sway * 0.5, -34, coreR, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#5e0a1e';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(sway * 0.5 - 4, -38, coreR * 0.3, 0, TAU);
  ctx.fill();
  // break state: cracks + exposed frame
  if (a.breaking) {
    ctx.strokeStyle = 'rgba(232,240,248,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-30, -102);
    ctx.lineTo(-18, -88);
    ctx.lineTo(-26, -70);
    ctx.lineTo(-10, -54);
    ctx.moveTo(34, -96);
    ctx.lineTo(22, -80);
    ctx.lineTo(30, -60);
    ctx.moveTo(-38, -40);
    ctx.lineTo(-20, -32);
    ctx.stroke();
    ctx.strokeStyle = '#fc1243';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sway * 0.5, -34, coreR + 5, 0, TAU);
    ctx.stroke();
  }
  // stubby arms
  ctx.strokeStyle = '#0d1520';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-42 + sway * 0.3, -60);
  ctx.lineTo(-52 + sway * 0.3, -44 + Math.sin(t * 2) * 2);
  ctx.moveTo(42 + sway * 0.3, -60);
  ctx.lineTo(52 + sway * 0.3, -44 - Math.sin(t * 2) * 2);
  ctx.stroke();
  ctx.restore();
}

const PAINTERS = {
  stale: paintStale,
  rumor: paintRumor,
  lag: paintLag,
  spoiler: paintSpoiler,
  patch: paintPatch,
  event: paintEvent,
  boss: paintBoss,
};
