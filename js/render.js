/** APN Idle canvas — V2 scenery/targets/Host + combat juice overlays */

import { C, clamp, easeOutCubic, easeOutQuad } from './formulas.js?v=gaf2d-motion-v1';
import { getCurrentPackAssets } from './assets.js?v=gaf2d-motion-v1';
import { resolveHostClip } from './host-contract.js?v=gaf2d-motion-v1';
import { drawHeroV2 } from './hero-v2.js?v=gaf2d-motion-v1';
import {
  getV3Clip,
  getV3Presentation,
  pickV3,
} from './hero-v3.js?v=gaf2d-motion-v1';
import {
  STAGE_OVERHEAD_GAP,
  STAGE_ROLE_PRESENTATION,
  legacySquarePresentation,
  resolveActorGeometry,
  stageFitForActors,
} from './stage-presentation.js?v=gaf2d-motion-v1';
import { motionReduced } from './motion-preference.js?v=gaf2d-motion-v1';
import {
  drawMotionFrame,
  frameIndexForClip,
  selectEnemyMotion,
} from './motion-bundle.js?v=gaf2d-motion-v1';
import {
  failMotionRecord,
  getMotionRecord,
  motionDiagnostics,
} from './motion-store.js?v=gaf2d-motion-v1';
import { drawTarget } from './enemies-v2.js?v=gaf2d-motion-v1';
import { drawScenery } from './scenery-v2.js?v=gaf2d-motion-v1';
import { CREATURES, creatureKindFor } from './content.js?v=gaf2d-motion-v1';
import { creatureClipReady, drawCreature } from './creatures.js?v=gaf2d-motion-v1';
import { targetForEnemyType } from './wave-roster.js?v=gaf2d-motion-v1';

const LEGACY_ENEMY_PRESENTATION = legacySquarePresentation({ sourceSize: 1 });
const LEGACY_ENEMY_INTRINSICS = Object.freeze({
  frameSize: Object.freeze({ width: 1, height: 1 }),
  trim: Object.freeze({ x: 0, y: 0, width: 1, height: 1 }),
  pivot: Object.freeze({ x: 0.5, y: 1 }),
  presentation: LEGACY_ENEMY_PRESENTATION,
});
const STAGE_CLEARANCE_FALLBACK = 78;
const STAGE_CLEARANCE_MARGIN = 2;
const ENEMY_PLATE_COMPACT_FIT = 0.92;
const ENEMY_PLATE_HEIGHT = Object.freeze({
  compact: 30,
  standard: 54,
  boss: 62,
});

function enemyPlateHeight(role, fit) {
  if (fit < ENEMY_PLATE_COMPACT_FIT) return ENEMY_PLATE_HEIGHT.compact;
  return role === 'boss'
    ? ENEMY_PLATE_HEIGHT.boss
    : ENEMY_PLATE_HEIGHT.standard;
}

function enemyPlateClearance(role, fit) {
  return STAGE_OVERHEAD_GAP + enemyPlateHeight(role, fit);
}

/** Enemy type is trusted game state; asset IDs never self-assign scale. */
export function stageRoleForEnemy(enemy) {
  return enemy?.type === 'boss' ? 'boss' : 'standard';
}

function enemyIntrinsicsForMotion(motionInfo) {
  const descriptor =
    motionInfo?.status === 'ready' ? motionInfo.record?.descriptor : null;
  if (!descriptor?.presentation) return LEGACY_ENEMY_INTRINSICS;
  return {
    frameSize: descriptor.frameSize,
    trim: descriptor.trim,
    pivot: descriptor.pivot,
    presentation: descriptor.presentation,
  };
}

function resolveEnemyGeometry(enemy, groundY, fit, motionInfo) {
  return resolveActorGeometry({
    actorX: enemy.displayX,
    groundY,
    fit,
    role: stageRoleForEnemy(enemy),
    ...enemyIntrinsicsForMotion(motionInfo),
  });
}

/** Resolve the exact pack-atlas frame used by both Canvas and deterministic QA. */
export function enemyFrameFor(enemy) {
  if (!enemy) return null;
  const hpRatio = enemy.hpMax > 0 ? enemy.hp / enemy.hpMax : 1;
  return enemy.type === 'boss' && hpRatio < 0.34 ? 'boss-break' : enemy.frame;
}

/** Keep approved identity names intact while bounding unforeseen pack labels. */
export function enemyLabelForDisplay(labelSource, isBoss = false) {
  const label = String(labelSource || '');
  const limit = isBoss ? 20 : 18;
  return label.length > limit ? `${label.slice(0, limit - 1)}…` : label;
}

/** Name approved Valorant identities and V3 variants without changing legacy packs. */
export function bossBannerFor(activeBoss, zone = 0) {
  if (!activeBoss) return 'VERSION GATE';
  const kind = creatureKindFor(activeBoss, zone);
  const label = kind && CREATURES[kind]
    ? CREATURES[kind].label
    : activeBoss.packId === 'valorant'
      ? activeBoss.label
      : 'Version Gate';
  return String(label || 'Version Gate').toUpperCase();
}

/** Dock the timer below the fixed two-row DOM stage HUD. */
export function bossTimerYFor(stageHeight) {
  return Math.min(108, Math.max(0, stageHeight - 34));
}

export const CANVAS_TONE_TOKENS = Object.freeze({
  signal: '--c-signal',
  notes: '--c-notes',
  sp: '--c-sp',
  zone: '--c-zone',
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
  const stageHud = parent.querySelector?.('.stage-hud');
  const stageClearance =
    Number.isFinite(stageHud?.offsetTop) &&
    Number.isFinite(stageHud?.offsetHeight)
      ? Math.ceil(stageHud.offsetTop + stageHud.offsetHeight) +
        STAGE_CLEARANCE_MARGIN
      : STAGE_CLEARANCE_FALLBACK;
  return { w, h, ctx, stageClearance };
}

export function draw(
  ctx,
  w,
  h,
  s,
  assetStore = null,
  stageClearance = STAGE_CLEARANCE_FALLBACK,
) {
  const gy = h * 0.86;
  s.world.groundY = gy;
  const t = s.world.time;
  const scroll = s.world.scrollSmooth;
  const shakeX = s.world.shake ? (Math.random() - 0.5) * s.world.shake : 0;
  const shakeY = s.world.shake ? (Math.random() - 0.5) * s.world.shake : 0;
  const packAssets = assetStore ? getCurrentPackAssets(assetStore, s.route) : null;
  const heroX = s.world.heroX;
  const enemyEnv = {
    zone: s.route?.zone ?? 0,
    meleeStop: heroX + C.MELEE_RANGE - 8,
    engagedId:
      s.world.enemies.find((e) => e.hp > 0 && e.x <= heroX + C.MELEE_RANGE)?.id || null,
  };
  const show = s.world.enemies.filter(
    (e) => e.hp > 0 || (e.deathT && e.deathT > 0),
  );
  const motionInfoByEnemyId = new Map(
    show.map((enemy) => [
      enemy.id,
      inspectEnemyMotion(enemy, packAssets, assetStore, {
        ...enemyEnv,
        t,
      }),
    ]),
  );
  const heroStageActor = {
    role: 'hero',
    presentation: heroIntrinsicGeometry().presentation,
  };
  const enemyStageActors = (plateFit) =>
    show.map((enemy) => {
      const role = stageRoleForEnemy(enemy);
      return {
        role,
        presentation: enemyIntrinsicsForMotion(
          motionInfoByEnemyId.get(enemy.id),
        ).presentation,
        overheadClearance: enemyPlateClearance(role, plateFit),
      };
    });
  const fitForPlateMode = (plateFit) =>
    stageFitForActors({
      groundY: gy,
      bannerClearance: stageClearance,
      actors: [
        heroStageActor,
        ...enemyStageActors(plateFit),
      ],
    });
  let stageFit = fitForPlateMode(1);
  if (show.length && stageFit < ENEMY_PLATE_COMPACT_FIT) {
    stageFit = Math.min(
      fitForPlateMode(ENEMY_PLATE_COMPACT_FIT - Number.EPSILON),
      ENEMY_PLATE_COMPACT_FIT - Number.EPSILON,
    );
  }
  s.world.stageFit = stageFit;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // --- layered editorial world (per-zone seeded mood, pack plate far layer) ---
  drawScenery(ctx, w, h, {
    zone: s.route?.zone ?? 0,
    gy,
    scroll,
    t,
    reducedMotion: motionReduced(s),
    packBg: packAssets?.ready && ready(packAssets.background) ? packAssets.background : null,
  });

  // alerts
  for (const a of s.world.alerts) drawAlert(ctx, a, t);

  // enemies (living + dying) — env mirrors game.js melee targeting so V3
  // creature clips (advance / attack / hit / death / broken) track the domain
  const actorGeometries = new Map();
  show.forEach((e) => {
    const geometry = drawEnemy(
      ctx,
      e,
      gy,
      t,
      packAssets,
      assetStore,
      motionReduced(s),
      stageFit,
      {
        ...enemyEnv,
        stageClearance,
        motionInfo: motionInfoByEnemyId.get(e.id),
      },
    );
    actorGeometries.set(e.id, geometry);
  });
  s.world.actorGeometries = actorGeometries;

  // hero
  drawHero(ctx, s.world.heroDisplayX, gy, s, t, stageFit);

  // particles
  for (const p of s.world.particles) drawParticle(ctx, p, actorGeometries);

  // shock rings (crit pops, death bursts, rank halo)
  for (const sh of s.world.shocks || []) {
    drawShock(ctx, sh, actorGeometries);
  }

  // Currency reward travels from the defeated target to its owning HUD chip.
  for (const flight of s.world.lootFlights || []) {
    drawLootFlight(ctx, flight, w, h, actorGeometries);
  }

  // confetti
  for (const c of s.world.confetti || []) drawConfettiBit(ctx, c);

  // floaters
  ctx.textAlign = 'center';
  for (const f of s.world.floaters) {
    if (f.anchorId !== null && f.anchorId !== undefined) {
      const geometry = actorGeometries.get(f.anchorId);
      if (geometry) {
        f.x = geometry.anchors.hitX;
        // Above the target's head, stacked by anchorLift — but never inside the
        // toast band (canvas y ≈112–162): short stages push text just under it.
        const headY = geometry.anchors.floaterY;
        const base = Math.max(headY, Math.min(170, gy - 32));
        f.y = base - (f.anchorLift || 0);
      }
    }
    const life = f.life || 1;
    const u = clamp(f.t / life, 0, 1);
    const a = easeOutCubic(u);
    const pop = f.huge ? 1 + (1 - u) * 0.75 : f.big ? 1 + (1 - u) * 0.4 : 1 + (1 - u) * 0.2;
    // Centered milestone counters live at stage center, not at the kill point.
    const fx = f.center ? w / 2 : f.x;
    const fy = f.center ? h * 0.42 : f.y;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(fx, fy);
    ctx.scale(pop, pop);
    const size = f.huge ? 24 : f.big ? 17 : 13;
    ctx.font = `900 ${size}px system-ui, -apple-system, sans-serif`;
    ctx.lineWidth = f.huge ? 5 : 3.5;
    ctx.strokeStyle = 'rgba(6,8,10,0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = resolveCanvasPaint(f.color);
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // celebration overlays (rank flash / zone-clear sweep / Go Live cinematic)
  if (s.ui.fx) {
    const fx = s.ui.fx;
    const fxLife = fx.life || 0.55;
    if (fx.kind === 'rank') {
      const a = clamp(fx.t / fxLife, 0, 1);
      ctx.fillStyle = `rgba(62,207,142,${0.12 * a})`;
      ctx.fillRect(0, 0, w, h);
    } else if (fx.kind === 'sweep') {
      drawZoneSweep(ctx, w, h, fx);
    } else if (fx.kind === 'golive') {
      drawGoLiveFx(ctx, w, h, fx, motionReduced(s));
    }
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
    const by = bossTimerYFor(h);
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
    // Zone-boss variant: the banner names whichever boss is actually on stage
    const activeBoss = s.world.enemies.find((e) => e.type === 'boss' && e.hp > 0);
    const banner = bossBannerFor(activeBoss, s.route?.zone ?? 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(6,10,16,0.92)';
    ctx.strokeText(banner, w / 2, by + 22);
    ctx.fillText(banner, w / 2, by + 22);
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

export function heroRuntimeSemantics(s, t) {
  const hero = s.run.hero;
  const attackClock = clamp(hero.attackAnim, 0, 1);
  // Keep the established 250 ms procedural lunge while the authored 8-frame
  // strip advances uniformly over its full 500 ms (8 frames / 16 fps).
  const attack = easeOutCubic(clamp(attackClock * 2 - 1, 0, 1));
  const crit = hero.attackCrit === true;
  const sprinting = s.world.sprinting && hero.energy > 0.5;
  const overdrive = !!hero.deepOn;
  const tracker = hero.trackerOn && hero.trackerStacks > 0.04;
  const pose = resolveHostClip({
    hitRecoil: hero.hitRecoil,
    attack,
    crit,
    overdrive,
    sprinting,
    tracker,
  });
  return {
    hero,
    attack,
    sprinting,
    overdrive,
    tracker,
    pose,
    selector: {
      t,
      attack: attackClock,
      crit,
      recoil: hero.hitRecoil,
      overdrive,
      sprint: sprinting,
      pose,
      defeatT: hero.defeatT || 0,
      levelT: hero.levelT || 0,
      lootT: hero.lootT || 0,
    },
  };
}

export function inspectHeroMotion(s, t = s?.world?.time || 0) {
  if (!s?.run?.hero || !s?.world) {
    return { status: 'unavailable', clip: null, fps: null, frameIndex: null };
  }
  const selected = pickV3(heroRuntimeSemantics(s, t).selector);
  if (!selected) {
    return { status: 'pending', clip: null, fps: null, frameIndex: null };
  }
  const clip = getV3Clip(selected.clip);
  return {
    status: clip ? 'ready' : 'failed',
    clip: selected.clip,
    fps: clip?.fps ?? null,
    frameIndex: selected.frame,
  };
}

const LEGACY_HERO_PRESENTATION = legacySquarePresentation({ sourceSize: 1 });
const LEGACY_HERO_INTRINSICS = Object.freeze({
  frameSize: Object.freeze({ width: 1, height: 1 }),
  trim: Object.freeze({ x: 0, y: 0, width: 1, height: 1 }),
  pivot: Object.freeze({ x: 0.5, y: 1 }),
  presentation: LEGACY_HERO_PRESENTATION,
});

function heroIntrinsicGeometry() {
  const idle = getV3Clip('idle');
  const presentation = getV3Presentation();
  if (!idle || !presentation) return LEGACY_HERO_INTRINSICS;
  const frameSize =
    typeof idle.frameSize === 'number'
      ? { width: idle.frameSize, height: idle.frameSize }
      : idle.frameSize;
  return {
    frameSize,
    trim: {
      x: idle.trim.x,
      y: idle.trim.y,
      width: idle.trim.w,
      height: idle.trim.h,
    },
    pivot: { x: idle.anchor[0], y: idle.anchor[1] },
    presentation,
  };
}

export function heroDrawOptions(actorX, groundY, fit = 1) {
  const geometry = resolveActorGeometry({
    actorX,
    groundY,
    fit,
    role: 'hero',
    ...heroIntrinsicGeometry(),
  });
  return Object.freeze({
    drawTrimHeight: geometry.drawTrimHeight,
    pivotY: geometry.pivotY,
    geometry,
  });
}

export function drawHero(ctx, x, gy, s, t, fit = 1) {
  const semantics = heroRuntimeSemantics(s, t);
  const h = semantics.hero;
  const attack = semantics.attack;
  const sprinting = semantics.sprinting;
  const overdrive = semantics.overdrive;
  const tracker = semantics.tracker;
  const hostPose = semantics.pose;
  const drawOptions = heroDrawOptions(x, gy, fit);
  const geometry = drawOptions.geometry;
  const bodyScale =
    geometry.body.height / STAGE_ROLE_PRESENTATION.hero.visibleBodyHeight;
  const auraX = geometry.anchors.auraX;
  const auraY = geometry.anchors.auraY;

  // Soft skill auras UNDER the character (no hard ring lines)
  if (tracker) {
    const st = Math.min(1, h.trackerStacks);
    const radius = (36 + st * 22) * bodyScale;
    const rg = ctx.createRadialGradient(
      auraX,
      auraY,
      4 * bodyScale,
      auraX,
      auraY,
      radius,
    );
    rg.addColorStop(0, `rgba(62,207,142,${0.1 + st * 0.12})`);
    rg.addColorStop(0.55, `rgba(62,207,142,${0.05 + st * 0.06})`);
    rg.addColorStop(1, 'rgba(62,207,142,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(auraX, auraY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Overdrive — clear crimson field + pulse rings (readable at a glance)
  if (overdrive) {
    const pulse = 0.5 + Math.sin(t * 7) * 0.5;
    const rad = (52 + pulse * 10) * bodyScale;
    const rg = ctx.createRadialGradient(
      auraX,
      auraY,
      4 * bodyScale,
      auraX,
      auraY,
      rad,
    );
    rg.addColorStop(0, `rgba(252,18,67,${0.28 + pulse * 0.1})`);
    rg.addColorStop(0.45, `rgba(252,18,67,${0.14 + pulse * 0.06})`);
    rg.addColorStop(1, 'rgba(252,18,67,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(auraX, auraY, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,90,120,${0.22 + pulse * 0.18})`;
    ctx.lineWidth = 2 * bodyScale;
    ctx.beginPath();
    ctx.arc(
      auraX,
      auraY,
      (28 + pulse * 6) * bodyScale,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.strokeStyle = `rgba(252,18,67,${0.12 + pulse * 0.1})`;
    ctx.lineWidth = 1.5 * bodyScale;
    ctx.beginPath();
    ctx.arc(
      auraX,
      auraY,
      (40 + pulse * 8) * bodyScale,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  // Procedural Host V2 — run_loop / scan / crit / sprint / overdrive / damage
  drawHeroV2(ctx, x, gy, {
    height: geometry.targetBodyHeight,
    ...drawOptions,
    time: t,
    attack,
    crit: semantics.selector.crit,
    motionSelector: semantics.selector,
    hitRecoil: h.hitRecoil,
    overdrive,
    sprinting,
    tracker,
    energy: h.energy,
    reducedMotion: motionReduced(s),
    pose: hostPose,
    levelT: h.levelT || 0,
    defeatT: h.defeatT || 0,
    lootT: h.lootT || 0,
  });

  // Overdrive crown flare above head (readable status)
  if (overdrive) {
    const fl = 0.55 + Math.sin(t * 9) * 0.35;
    const crownX = geometry.body.centerX;
    const crownY = geometry.motionEnvelope.top;
    ctx.fillStyle = `rgba(252,18,67,${0.35 + fl * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY - 4 * bodyScale);
    ctx.lineTo(crownX - 7 * bodyScale, crownY + 8 * bodyScale);
    ctx.lineTo(crownX + 7 * bodyScale, crownY + 8 * bodyScale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,200,210,${0.5 + fl * 0.4})`;
    ctx.beginPath();
    ctx.arc(
      crownX,
      crownY - 2 * bodyScale,
      2.2 * bodyScale,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Combo chip in the overhead slot
  if (s.stats.combo >= 3) {
    const chipX = geometry.body.centerX;
    const chipY =
      geometry.anchors.floaterY - (overdrive ? 10 * bodyScale : 0);
    ctx.fillStyle = 'rgba(12,16,20,0.82)';
    roundRect(ctx, chipX - 19, chipY, 38, 15, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(252,18,67,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fc1243';
    ctx.font = '800 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.stats.combo}×`, chipX, chipY + 11);
    // slim time-to-decay meter under the chip (informational, like an HP bar)
    const frac = clamp((s.stats.comboT || 0) / 2.4, 0, 1);
    ctx.fillStyle = 'rgba(12,16,20,0.7)';
    roundRect(ctx, chipX - 19, chipY + 18, 38, 4, 2);
    ctx.fill();
    if (frac > 0.02) {
      ctx.fillStyle = frac > 0.35 ? '#fc1243' : '#e6b84d';
      roundRect(
        ctx,
        chipX - 19,
        chipY + 18,
        Math.max(3, 38 * frac),
        4,
        2,
      );
      ctx.fill();
    }
  }
  return geometry;
}

export function inspectEnemyMotion(enemy, packAssets = null, assetStore = null, env = null) {
  const pack = packAssets?.pack || null;
  const target = pack ? targetForEnemyType(pack, enemy?.type) : null;
  const assetId = target?.id || null;
  const source = assetId ? pack?.motion?.characters?.[assetId] : null;
  const fallbackCount = assetStore?.motionStore
    ? motionDiagnostics(assetStore.motionStore).length
    : 0;
  if (!pack || !assetId || !source) {
    return {
      mode: 'unmapped',
      status: 'unmapped',
      assetId,
      clip: null,
      frameIndex: null,
      fallbacks: fallbackCount,
      target,
    };
  }
  const record = assetStore?.motionStore
    ? getMotionRecord(assetStore.motionStore, pack.id, assetId)
    : null;
  if (!record || record.status === 'pending') {
    return {
      mode: 'pending',
      status: 'pending',
      assetId,
      clip: null,
      frameIndex: null,
      fallbacks: fallbackCount,
      target,
    };
  }
  if (record.status === 'failed') {
    return {
      mode: 'static-fallback',
      status: 'failed',
      assetId,
      clip: null,
      frameIndex: null,
      fallbacks: fallbackCount,
      target,
    };
  }
  const selection = selectEnemyMotion(enemy, {
    assetId,
    clips: record.descriptor?.clips,
    meleeStop: env?.meleeStop,
    engagedId: env?.engagedId,
    time: env?.t,
    timestamp: env?.t,
  });
  const clip = record.descriptor?.clips?.[selection.clip];
  if (!clip) {
    return {
      mode: 'static-fallback',
      status: 'failed',
      assetId,
      clip: selection.clip,
      frameIndex: null,
      fallbacks: fallbackCount,
      target,
    };
  }
  return {
    mode: 'motion',
    status: 'ready',
    assetId,
    clip: selection.clip,
    fps: clip.fps,
    frameIndex: frameIndexForClip(clip, selection.value),
    fallbacks: fallbackCount,
    record,
    target,
  };
}

export function legacyCreatureKindForEnemy(
  enemy,
  packAssets = null,
  assetStore = null,
  env = null,
) {
  const motion = inspectEnemyMotion(enemy, packAssets, assetStore, env);
  return motion.status === 'unmapped'
    ? creatureKindFor(enemy, env?.zone ?? 0)
    : null;
}

export function legacyCreatureKindForStage(
  enemies,
  packAssets = null,
  assetStore = null,
  env = null,
) {
  if (!Array.isArray(enemies)) return null;
  for (const enemy of enemies) {
    const onStage =
      enemy?.hp > 0 ||
      (Number.isFinite(enemy?.deathT) && enemy.deathT > 0);
    if (!onStage) continue;
    const kind = legacyCreatureKindForEnemy(
      enemy,
      packAssets,
      assetStore,
      env,
    );
    if (kind) return kind;
  }
  return null;
}

export function drawEnemy(ctx, e, gy, t, packAssets = null, assetStore = null, reducedMotion = false, fit = 1, env = null) {
  const x = e.displayX;
  const dying = e.deathT > 0 && e.killed;
  const isBoss = e.type === 'boss';
  const atlas = packAssets?.ready && ready(packAssets.targets) ? packAssets.targets : null;
  const frameName = enemyFrameFor(e);
  const frame = packAssets?.targetData?.frames?.[frameName];
  const motionInfo =
    env?.motionInfo ||
    inspectEnemyMotion(e, packAssets, assetStore, {
      ...env,
      t,
    });
  const geometry = resolveEnemyGeometry(e, gy, fit, motionInfo);
  const size = geometry.drawTrimHeight;
  const footY = geometry.pivotY;
  if (motionInfo.status !== 'pending') {
    drawEnemyShadow(ctx, e, geometry);
  }

  let onStage = false;
  if (motionInfo.status === 'ready') {
    let failureDetail = 'motion frame blit returned no drawable frame';
    try {
      onStage = !!drawMotionFrame(
        ctx,
        motionInfo.record,
        motionInfo.clip,
        motionInfo.frameIndex,
        x,
        geometry.pivotY,
        geometry.drawTrimHeight,
      );
    } catch (error) {
      failureDetail = `motion frame blit failed: ${error?.message || String(error)}`;
      onStage = false;
    }
    if (!onStage && assetStore?.motionStore) {
      failMotionRecord(
        assetStore.motionStore,
        packAssets.pack.id,
        motionInfo.assetId,
        'decode',
        failureDetail,
      );
    }
  } else if (motionInfo.status === 'pending') {
    onStage = true;
  }

  const kind = env
    ? legacyCreatureKindForEnemy(e, packAssets, assetStore, env)
    : null;
  if (!onStage && motionInfo.status === 'unmapped') {
    onStage = !!(
      kind &&
      drawCreatureTarget(ctx, e, kind, {
        t,
        gy,
        size,
        reducedMotion,
        meleeStop: env.meleeStop,
        engagedId: env.engagedId,
        creatureStore: assetStore?.creatureStore,
        geometry,
      })
    );
  }
  if (!onStage && motionInfo.status !== 'pending') {
    drawTarget(ctx, e, {
      t,
      gy,
      size,
      atlas: atlas && frame?.rect ? atlas : null,
      frame: atlas && frame?.rect ? frame : null,
      reducedMotion,
      geometry,
    });
  }

  drawEnemyHitFlash(ctx, e, geometry);
  if (dying) return geometry; // no HP bar while dying

  if (e.priorityTagRank > 0) {
    const tagColor = resolveCanvasPaint({ tone: 'signal' });
    const { left, top, right, bottom } = geometry.motionEnvelope;
    const arm = Math.max(7, geometry.targetBodyHeight * 0.12);
    ctx.save();
    ctx.strokeStyle = tagColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.72 + Math.sin(t * 6) * 0.16;
    ctx.beginPath();
    ctx.moveTo(left + arm, top);
    ctx.lineTo(left, top);
    ctx.lineTo(left, top + arm);
    ctx.moveTo(right - arm, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, top + arm);
    ctx.moveTo(left, bottom - arm);
    ctx.lineTo(left, bottom);
    ctx.lineTo(left + arm, bottom);
    ctx.moveTo(right, bottom - arm);
    ctx.lineTo(right, bottom);
    ctx.lineTo(right - arm, bottom);
    ctx.stroke();
    ctx.restore();
  }

  const barW = isBoss ? 148 : 124;
  const compact = fit < ENEMY_PLATE_COMPACT_FIT;
  const bannerH = enemyPlateHeight(geometry.role, fit);
  const plateW = compact ? Math.max(64, barW * 0.62) : barW;
  const plateX = x - plateW / 2;
  const anchoredBarY = geometry.anchors.hpY - bannerH;
  const stageSafeTop = Number.isFinite(env?.stageClearance)
    ? env.stageClearance
    : anchoredBarY;
  const barY = Math.min(
    geometry.anchors.shadowY - bannerH,
    Math.max(anchoredBarY, stageSafeTop),
  );
  const ratio = clamp(e.hp / e.hpMax, 0, 1);
  ctx.fillStyle = compact ? 'rgba(7,16,25,0.88)' : 'rgba(7,16,25,0.94)';
  roundRect(ctx, plateX, barY, plateW, bannerH, compact ? 7 : 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(44,67,94,0.95)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#f3f7fb';
  ctx.font = `800 ${isBoss ? 11 : 10}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  const labelSource = kind && CREATURES[kind]
    ? CREATURES[kind].label
    : motionInfo.target?.label || e.label;
  const label = enemyLabelForDisplay(labelSource, isBoss);
  if (compact) {
    // Short stages keep one slim envelope-anchored component.
    ctx.fillStyle = '#f3f7fb';
    ctx.font = '800 9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, barY + 12);
    const trackY = barY + bannerH - 8;
    ctx.fillStyle = '#22364c';
    roundRect(ctx, plateX + 7, trackY, plateW - 14, 4, 2);
    ctx.fill();
    ctx.fillStyle = ratio > 0.3 ? '#fc1243' : '#e6b84d';
    if (ratio > 0.01) {
      roundRect(
        ctx,
        plateX + 7,
        trackY,
        Math.max(3, (plateW - 14) * ratio),
        4,
        2,
      );
      ctx.fill();
    }
    return geometry;
  }
  ctx.fillText(label, x, barY + 17);
  ctx.fillStyle = '#aab7c7';
  ctx.font = '700 9px system-ui,sans-serif';
  ctx.fillText(`${Math.ceil(e.hp)}/${e.hpMax}`, x, barY + 32);
  ctx.fillStyle = '#22364c';
  roundRect(ctx, plateX + 9, barY + bannerH - 14, plateW - 18, 8, 4);
  ctx.fill();
  ctx.fillStyle = ratio > 0.3 ? '#fc1243' : '#e6b84d';
  if (ratio > 0.01) {
    roundRect(
      ctx,
      plateX + 9,
      barY + bannerH - 14,
      Math.max(4, (plateW - 18) * ratio),
      8,
      4,
    );
    ctx.fill();
  }
  return geometry;
}

/* —— V3 vinyl creature stage ————————————————————————————————————————
 * Same juice contract as enemies-v2.drawTarget (ground shadow, spawn pop-in,
 * idle bob, hit squash + white bloom, crit core, death burst transforms) but
 * the body comes from the generated clip atlases via drawCreature. Domain
 * death timing/particles stay in game.js; this only paints. */

const TAU2 = Math.PI * 2;
const creatureFirstSeen = new WeakMap();

function creaturePhase(id) {
  let h = 0;
  const s = String(id || 'e');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ((h >>> 0) % 628) / 100;
}

function creatureSpawnScale(e, t) {
  let t0 = creatureFirstSeen.get(e);
  if (t0 == null) {
    t0 = t;
    creatureFirstSeen.set(e, t0);
  }
  const u = clamp((t - t0) / 0.32, 0, 1);
  if (u >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2; // easeOutBack
}

/**
 * Draw one V3 creature with the unified target juice. Returns false when no
 * usable clip atlas is decoded yet — caller then paints the procedural family.
 * Clip state machine: death on kill (progress) → hit on recoil (progress) →
 * Curator broken phase below 34% HP (loop, mirrors the Version Gate contract)
 * → advance while approaching (loop) → attack while engaged in melee (loop) →
 * idle otherwise (loop).
 */
function drawCreatureTarget(ctx, e, kind, o) {
  const {
    t,
    gy,
    size,
    reducedMotion,
    meleeStop,
    engagedId,
    creatureStore,
    geometry,
  } = o;
  const x = e.displayX;
  const dying = e.deathT > 0 && e.killed;
  const deathU = dying ? 1 - clamp(e.deathT / (e.deathMax || 0.5), 0, 1) : 0;
  const critU = e.critFlash > 0 && !dying ? clamp(e.critFlash / 0.16, 0, 1) : 0;
  const flashU = Math.max(e.hitFlash > 0 && !dying ? clamp(e.hitFlash / 0.12, 0, 1) : 0, critU);
  const hurtOff = !dying && e.hurt > 0 ? Math.sin(t * 40) * 1.5 : 0;
  const isBoss = e.type === 'boss';
  const footY = geometry.pivotY;
  const phase = creaturePhase(e.id);
  // Broken phase swap — the exact Version Gate threshold (render + enemies-v2
  // both use hp/hpMax < 0.34); hit/death still outrank it, like the classic boss.
  const breaking = kind === 'curator' && !dying && e.hp / e.hpMax < 0.34;

  let clip;
  let clipT;
  if (dying) {
    clip = 'death';
    clipT = deathU;
  } else if (e.hurt > 0) {
    clip = 'hit';
    clipT = 1 - clamp(e.hurt / 0.2, 0, 1);
  } else if (breaking) {
    clip = 'broken';
    clipT = t + phase;
  } else if (e.x > meleeStop + 0.5) {
    clip = 'advance';
    clipT = t + phase;
  } else if (engagedId === e.id) {
    clip = 'attack';
    clipT = t + phase;
  } else {
    clip = 'idle';
    clipT = t + phase;
  }
  // Missing atlas? Step down to a loop clip that exists, else bail out.
  if (!creatureClipReady(kind, clip, creatureStore)) {
    const fallback = ['idle', 'advance'].find((name) =>
      creatureClipReady(kind, name, creatureStore),
    );
    if (!fallback) return false;
    clip = fallback;
    clipT = t + phase;
  }

  // death transforms (ported 1:1 from the unified target draw)
  let sx = 1;
  let sy = 1;
  let alpha = 1;
  let dy = 0;
  if (dying) {
    const u = easeOutQuad(deathU);
    if (isBoss) {
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
    const pop = creatureSpawnScale(e, t);
    sx *= pop * (1 + flashU * 0.16);
    sy *= pop * (1 - flashU * 0.12);
    if (!reducedMotion) dy += Math.sin(t * 2.2 + phase) * 2;
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.translate(x + hurtOff, footY + dy);
  ctx.scale(sx || 0.01, sy);

  drawCreature(ctx, kind, clip, clipT, 0, 0, size, creatureStore);

  ctx.restore();
  ctx.globalAlpha = 1;
  return true;
}

function drawLootFlight(ctx, flight, w, h, actorGeometries) {
  const geometry = actorGeometries.get(flight.enemyId);
  if (geometry) {
    flight.x = geometry.anchors.lootX;
    if (!Number.isFinite(flight.y)) flight.y = geometry.anchors.lootY;
  }
  if (!Number.isFinite(flight.x) || !Number.isFinite(flight.y)) return;
  const u = easeOutCubic(1 - clamp(flight.t / flight.life, 0, 1));
  // Gear drops dive to the in-stage bag FAB (bottom-left); currency to the top chips.
  const isGear = flight.target === 'gear';
  const targetX = isGear ? 34 : flight.target === 'notes' ? w * 0.62 : w * 0.11;
  const targetY = isGear ? h - 38 : -56;
  const posAt = (uu) => ({
    x: flight.x + (targetX - flight.x) * uu,
    y: flight.y + (targetY - flight.y) * uu - Math.sin(uu * Math.PI) * 34,
  });
  const { x, y } = posAt(u);
  const paint = flight.color || { tone: flight.target === 'notes' ? 'notes' : 'signal' };
  ctx.save();
  // tiny rarity-colored trail behind a gear drop
  if (isGear) {
    for (let i = 1; i <= 4; i++) {
      const tu = clamp(u - i * 0.045, 0, 1);
      if (tu <= 0) break;
      const tp = posAt(tu);
      ctx.globalAlpha = Math.min(1, flight.t / 0.16) * (1 - i / 5.5) * 0.65;
      ctx.fillStyle = resolveCanvasPaint(paint);
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, Math.max(1.2, 3.4 - i * 0.55), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = Math.min(1, flight.t / 0.16);
  ctx.translate(x, y);
  ctx.rotate(u * Math.PI * 1.5);
  ctx.fillStyle = resolveCanvasPaint(paint);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Expanding shock ring (crit pop / death burst / rank halo). */
function drawShock(ctx, sh, actorGeometries) {
  if (sh.delay > 0) return;
  const geometry =
    sh.anchorId !== null && sh.anchorId !== undefined
      ? actorGeometries.get(sh.anchorId)
      : null;
  if (geometry && sh.anchorName === 'hit') {
    if (!Number.isFinite(sh.x)) sh.x = geometry.anchors.hitX;
    if (!Number.isFinite(sh.y)) sh.y = geometry.anchors.hitY;
  }
  if (!Number.isFinite(sh.x) || !Number.isFinite(sh.y)) return;
  const u = 1 - clamp(sh.t / (sh.life || 0.34), 0, 1);
  const r = 6 + easeOutCubic(u) * ((sh.r1 || 46) - 6);
  ctx.save();
  ctx.globalAlpha = (1 - u) * 0.85;
  ctx.strokeStyle = resolveCanvasPaint(sh.c);
  ctx.lineWidth = Math.max(1, (sh.w || 3) * (1 - u * 0.6));
  ctx.beginPath();
  ctx.arc(sh.x, sh.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEnemyShadow(ctx, enemy, geometry) {
  const dying = enemy.deathT > 0 && enemy.killed;
  const deathU = dying
    ? 1 - clamp(enemy.deathT / (enemy.deathMax || 0.5), 0, 1)
    : 0;
  const shrink = dying ? Math.max(0.2, 1 - easeOutQuad(deathU) * 0.72) : 1;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(
    geometry.anchors.shadowX,
    geometry.anchors.shadowY,
    Math.max(8, geometry.body.width * 0.34) * shrink,
    4.5 * shrink,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

/** Shared normal/critical hit flash for every body source. */
function drawEnemyHitFlash(ctx, e, geometry) {
  const dying = e.deathT > 0 && e.killed;
  if (dying) return;
  const critU = clamp((e.critFlash || 0) / 0.16, 0, 1);
  const hitU = clamp((e.hitFlash || 0) / 0.12, 0, 1);
  const u = Math.max(hitU, critU);
  if (u <= 0) return;
  const size = geometry.targetBodyHeight;
  const x = geometry.anchors.hitX;
  const y = geometry.anchors.hitY;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createRadialGradient(x, y, 1, x, y, size * 0.66);
  rg.addColorStop(0, `rgba(255,255,255,${0.95 * u})`);
  rg.addColorStop(0.4, `rgba(255,244,220,${0.5 * u})`);
  rg.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.66, 0, Math.PI * 2);
  ctx.fill();
  if (critU > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * critU})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = i * (Math.PI / 3) + 0.4;
      ctx.beginPath();
      ctx.moveTo(
        x + Math.cos(a) * size * 0.18 * critU,
        y + Math.sin(a) * size * 0.18 * critU,
      );
      ctx.lineTo(
        x + Math.cos(a) * size * (0.42 + 0.22 * critU),
        y + Math.sin(a) * size * (0.42 + 0.22 * critU),
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Zone-clear: quick full-width light sweep across the stage. */
function drawZoneSweep(ctx, w, h, fx) {
  const u = 1 - clamp(fx.t / (fx.life || 0.55), 0, 1);
  const band = w * 0.34;
  const x = -band + (w + band * 2) * easeOutCubic(u);
  const a = Math.sin(clamp(u, 0, 1) * Math.PI) * 0.32;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x - band, 0, x + band, 0);
  g.addColorStop(0, 'rgba(63,208,216,0)');
  g.addColorStop(0.5, `rgba(228,246,255,${a})`);
  g.addColorStop(1, 'rgba(63,208,216,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - band, 0);
  ctx.lineTo(x + band * 0.4, 0);
  ctx.lineTo(x + band, h);
  ctx.lineTo(x - band * 0.4, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Go Live mini-cinematic: screen flash, then a Live Mult count-up center-stage. */
function drawGoLiveFx(ctx, w, h, fx, reduced) {
  const life = fx.life || 1.5;
  const u = 1 - clamp(fx.t / life, 0, 1); // 0 → 1 over the beat
  // 1) screen flash on the first beat (motion juice — skipped when reduced)
  if (!reduced && u < 0.18) {
    ctx.fillStyle = `rgba(255,244,220,${0.5 * (1 - u / 0.18)})`;
    ctx.fillRect(0, 0, w, h);
  }
  // 2) centered Live Mult count-up (static final value under reduced motion)
  const cu = reduced ? 1 : easeOutCubic(clamp((u - 0.12) / 0.55, 0, 1));
  const val = (fx.from ?? 1) + ((fx.to ?? 1) - (fx.from ?? 1)) * cu;
  const a = Math.min(clamp(u / 0.1, 0, 1), clamp(fx.t / 0.3, 0, 1));
  const pop = reduced ? 1 : 1 + Math.max(0, 1 - u / 0.25) * 0.5;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(w / 2, h * 0.34);
  ctx.scale(pop, pop);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.font = '800 13px system-ui, -apple-system, sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(6,8,10,0.9)';
  ctx.strokeText('GO LIVE!', 0, -34);
  ctx.fillStyle = '#FC1243';
  ctx.fillText('GO LIVE!', 0, -34);
  ctx.font = '900 30px system-ui, -apple-system, sans-serif';
  ctx.lineWidth = 5;
  const label = `LIVE ×${val.toFixed(2)}`;
  ctx.strokeText(label, 0, 0);
  ctx.fillStyle = '#e6b84d';
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawParticle(ctx, p, actorGeometries) {
  const geometry =
    p.anchorId !== null && p.anchorId !== undefined
      ? actorGeometries.get(p.anchorId)
      : null;
  if (geometry && p.anchorName === 'hit') {
    if (!Number.isFinite(p.x)) p.x = geometry.anchors.hitX;
    if (!Number.isFinite(p.y)) p.y = geometry.anchors.hitY;
  }
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
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
  } else if (p.kind === 'shard') {
    // token-colored death shard (rotated quad)
    ctx.fillStyle = resolveCanvasPaint(p.c);
    const r = p.r || 3;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.55);
    ctx.lineTo(r * 0.8, -r * 0.3);
    ctx.lineTo(r, r * 0.55);
    ctx.lineTo(-r * 0.7, r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-r * 0.45, -r * 0.4, r * 0.5, r * 0.28);
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
