/** APN Idle canvas — V2 scenery/targets/Host + combat juice overlays */

import { C, clamp, easeOutCubic, easeOutQuad } from './formulas.js?v=enhanced-v1';
import { getCurrentPackAssets } from './assets.js?v=enhanced-v1';
import { resolveHostClip } from './host-contract.js?v=enhanced-v1';
import { drawHeroV2 } from './hero-v2.js?v=enhanced-v1';
import {
  getV3Clip,
  getV3Geometry,
  getV3Presentation,
  resolveHeroV3Frame,
} from './hero-v3.js?v=enhanced-v1';
import {
  STAGE_OVERHEAD_GAP,
  STAGE_ROLE_PRESENTATION,
  legacySquarePresentation,
  resolveActorGeometry,
  stageFitForActors,
} from './stage-presentation.js?v=enhanced-v1';
import { motionReduced } from './motion-preference.js?v=enhanced-v1';
import {
  drawMotionFrame,
  frameIndexForClip,
  selectEnemyMotion,
} from './motion-bundle.js?v=enhanced-v1';
import {
  failMotionRecord,
  getMotionClipRecord,
  getMotionRecord,
  motionDiagnostics,
  pruneMotionClipResidency,
  warmMotionClip,
} from './motion-store.js?v=enhanced-v1';
import { drawTarget } from './enemies-v2.js?v=enhanced-v1';
import { drawScenery } from './scenery-v2.js?v=enhanced-v1';
import {
  CREATURES,
  creatureKindFor,
  milestoneGateEraName,
} from './content.js?v=enhanced-v1';
import { corruptionTierFor } from './route.js?v=enhanced-v1';
import { creatureClipReady, drawCreature } from './creatures.js?v=enhanced-v1';
import {
  packWaveIdentityIds,
  targetForEnemyType,
} from './wave-roster.js?v=enhanced-v1';

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
const BOSS_TIMER_BAR_HEIGHT = 10;
const BOSS_TIMER_FUNCTION_HEIGHT = 24;
const BOSS_TIMER_EDGE_MARGIN = 16;
const BOSS_TIMER_PLATE_GAP = 12;

function enemyPlateHeight(role, fit) {
  if (fit < ENEMY_PLATE_COMPACT_FIT) return ENEMY_PLATE_HEIGHT.compact;
  return role === 'boss'
    ? ENEMY_PLATE_HEIGHT.boss
    : ENEMY_PLATE_HEIGHT.standard;
}

function enemyPlateClearance(role, fit) {
  return STAGE_OVERHEAD_GAP + enemyPlateHeight(role, fit);
}

function rectsOverlap(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function stageFunctionalLayout({
  actorX,
  geometry,
  fit,
  stageClearance,
  stageWidth,
  stageHeight,
  includeBossTimer = false,
}) {
  let plate = null;
  if (geometry) {
    const compact = fit < ENEMY_PLATE_COMPACT_FIT;
    const baseWidth = geometry.role === 'boss' ? 148 : 124;
    const height = enemyPlateHeight(geometry.role, fit);
    const width = compact ? Math.max(64, baseWidth * 0.62) : baseWidth;
    const anchoredY = geometry.anchors.hpY - height;
    const safeTop = Number.isFinite(stageClearance)
      ? stageClearance
      : anchoredY;
    plate = Object.freeze({
      x: actorX - width / 2,
      y: Math.min(
        geometry.anchors.shadowY - height,
        Math.max(anchoredY, safeTop),
      ),
      width,
      height,
    });
  }

  if (!includeBossTimer) {
    return Object.freeze({ plate, timer: null });
  }

  const timerY = bossTimerYFor(stageHeight);
  const defaultTimer = {
    x: stageWidth * 0.18,
    y: timerY,
    width: stageWidth * 0.64,
    height: BOSS_TIMER_FUNCTION_HEIGHT,
    barHeight: BOSS_TIMER_BAR_HEIGHT,
    labelX: stageWidth / 2,
    labelY: timerY + 22,
  };
  let timer = defaultTimer;
  if (plate && rectsOverlap(plate, defaultTimer)) {
    const rightX = plate.x + plate.width + BOSS_TIMER_PLATE_GAP;
    const lanes = [
      {
        x: BOSS_TIMER_EDGE_MARGIN,
        width: Math.max(
          0,
          plate.x - BOSS_TIMER_PLATE_GAP - BOSS_TIMER_EDGE_MARGIN,
        ),
      },
      {
        x: rightX,
        width: Math.max(
          0,
          stageWidth - BOSS_TIMER_EDGE_MARGIN - rightX,
        ),
      },
    ];
    const lane = lanes[1].width >= lanes[0].width ? lanes[1] : lanes[0];
    timer = {
      ...defaultTimer,
      x: lane.x,
      width: lane.width,
      labelX: lane.x + lane.width / 2,
    };
  }
  return Object.freeze({
    plate,
    timer: Object.freeze(timer),
  });
}

/**
 * Enemy types that present one step above a common target.
 *
 * This is the 1.75x HP family (`typeHpMult`), the same three types
 * `ENEMY_FLAVOR` marks `kind: 'elite'`, and the same three `creatureKindFor`
 * dresses in the legacy elite creature bodies. `event` is included for exactly
 * that reason: it is the same HP tier wearing the same bodies, so excluding it
 * would draw one identity at two different sizes on consecutive waves.
 *
 * `patch` is deliberately absent. It is the champion tier, not an elite: its own
 * `ENEMY_FLAVOR` kind, its own drop rule, and no rung of its own on the ladder.
 * Where a Pack authored it a larger body, its approved identity says so and the
 * approval rule in `stageRoleForEnemy` carries it — Valorant's Patch Note wears
 * Site Sentinel and presents at elite scale for that reason, not because the
 * enemy type asked for it.
 */
const ELITE_STAGE_TYPES = new Set(['lag', 'spoiler', 'event']);
/** Approved roles an enemy body may claim; `hero` is never a target. */
const ENEMY_CONSUMER_ROLES = new Set(['standard', 'elite', 'boss']);

/**
 * Approved stage role for one enemy body, in strict precedence:
 *
 * 1. `boss` is trusted game state and outranks every presentation fact.
 * 2. A motion-mapped identity presents at the role its approved
 *    `consumerScale` states. Approval data is sealed and already carries its
 *    own no-upscale proof, so an approved `standard` identity is never grown to
 *    84 px just because an elite-tier type happens to wear it.
 * 3. Otherwise the enemy type decides. Packs without authored motion draw
 *    freely scalable atlas cells and legacy creature frames, so the elite family
 *    reads at the 84 px rung there.
 *
 * Enemy type is trusted game state; asset IDs never self-assign scale — the role
 * is read from the pack-level approval record, never from the asset ID.
 */
export function stageRoleForEnemy(enemy, motionInfo = null) {
  if (enemy?.type === 'boss') return 'boss';
  const approved = motionInfo?.consumerRole;
  if (typeof approved === 'string' && ENEMY_CONSUMER_ROLES.has(approved)) {
    return approved;
  }
  return ELITE_STAGE_TYPES.has(enemy?.type) ? 'elite' : 'standard';
}

function enemyIntrinsicsForMotion(motionInfo) {
  const record =
    motionInfo?.status === 'ready' ? motionInfo.record : null;
  const clipDescriptor = record?.descriptor;
  if (
    clipDescriptor?.sourceFamily === 'authored-semantic-v4' &&
    clipDescriptor?.presentation &&
    clipDescriptor?.trim &&
    clipDescriptor?.pivot
  ) {
    return {
      frameSize: record?.set?.frameSize,
      trim: clipDescriptor.trim,
      pivot: clipDescriptor.pivot,
      presentation: clipDescriptor.presentation,
    };
  }
  const descriptor =
    record?.set && typeof record.set === 'object'
      ? record.set
      : record?.descriptor;
  if (!descriptor?.presentation) {
    if (clipDescriptor?.presentation) {
      return {
        frameSize: clipDescriptor.frameSize,
        trim: clipDescriptor.trim,
        pivot: clipDescriptor.pivot,
        presentation: clipDescriptor.presentation,
      };
    }
    return LEGACY_ENEMY_INTRINSICS;
  }
  return {
    frameSize: descriptor.frameSize,
    trim: descriptor.trim,
    pivot: descriptor.pivot,
    presentation: descriptor.presentation,
  };
}

export function enemyStagePresentationForMotion(motionInfo) {
  const record =
    motionInfo?.status === 'ready' ? motionInfo.record : null;
  if (
    record?.set?.sourceFamily === 'authored-semantic-v4' &&
    record.set.presentation
  ) {
    return record.set.presentation;
  }
  return enemyIntrinsicsForMotion(motionInfo).presentation;
}

function resolveEnemyGeometry(enemy, groundY, fit, motionInfo) {
  return resolveActorGeometry({
    actorX: enemy.displayX,
    groundY,
    fit,
    role: stageRoleForEnemy(enemy, motionInfo),
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

/**
 * Name approved Valorant identities and V3 variants without changing legacy
 * packs. A milestone Gate (display Zone 200/400/600/800/1000) additionally
 * carries the era it hands the Route over to. This is label text only — the
 * boss HP budget, the timer, and every plate/timer rectangle are untouched, and
 * ordinary Gates (every tier-0 Valorant zone included) render byte-identically.
 */
export function bossBannerFor(activeBoss, zone = 0) {
  if (!activeBoss) return 'VERSION GATE';
  const kind = creatureKindFor(activeBoss, zone);
  const label = kind && CREATURES[kind]
    ? CREATURES[kind].label
    : activeBoss.packId === 'valorant'
      ? activeBoss.label
      : 'Version Gate';
  const milestoneEra = milestoneGateEraName((zone | 0) + 1);
  const banner = milestoneEra
    ? `${label || 'Version Gate'} · ${milestoneEra}`
    : label || 'Version Gate';
  return String(banner).toUpperCase();
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

/** Interpolate display roots only; authored body pixels remain discrete. */
export function interpolateRootPosition(previous, current, alpha = 1) {
  const resolvedCurrent = Number.isFinite(current) ? current : 0;
  const resolvedPrevious = Number.isFinite(previous)
    ? previous
    : resolvedCurrent;
  const resolvedAlpha = Number.isFinite(alpha)
    ? clamp(alpha, 0, 1)
    : 1;
  return resolvedPrevious +
    (resolvedCurrent - resolvedPrevious) * resolvedAlpha;
}

function presentationNoise(seed) {
  const sample = Math.sin(seed) * 43758.5453123;
  return sample - Math.floor(sample);
}

// Render continuity is presentation state, never simulation state. Weak keys
// release each retained frame automatically when the world drops its enemy
// object after death, so the cache follows the domain object's lifecycle
// without adding serializable fields or requiring an unbounded id registry.
const enemyMotionRetention = new WeakMap();

// Stage layout and effect origins are repaint-owned presentation state. The
// state key releases the complete stage snapshot with the game session, while
// each effect key releases its retained origin when fixed-step cleanup drops
// that transient object. Neither cache is serializable or reachable from the
// domain tree.
const stagePresentationRetention = new WeakMap();
const effectOriginRetention = new WeakMap();

export function inspectStagePresentation(state) {
  return stagePresentationRetention.get(state)?.snapshot || null;
}

function liveEffects(state) {
  return [
    ...(state.world.floaters || []),
    ...(state.world.particles || []),
    ...(state.world.lootFlights || []),
    ...(state.world.shocks || []),
    ...(state.world.confetti || []),
  ];
}

function retainStagePresentation(
  state,
  { groundY, stageFit, heroGeometry, actorGeometries },
) {
  const previous = stagePresentationRetention.get(state);
  const retainedActorGeometries = new Map(actorGeometries);
  for (const effect of liveEffects(state)) {
    if (effect.anchorKind !== 'enemy' || effect.anchorId === null) continue;
    if (retainedActorGeometries.has(effect.anchorId)) continue;
    const retained = previous?.actorGeometries?.get(effect.anchorId);
    if (retained) retainedActorGeometries.set(effect.anchorId, retained);
  }
  const actors = Object.freeze(
    [...actorGeometries].map(([id, geometry]) =>
      Object.freeze({ id, geometry }),
    ),
  );
  const snapshot = Object.freeze({
    groundY,
    stageFit,
    heroGeometry,
    actors,
  });
  const presentation = Object.freeze({
    groundY,
    stageFit,
    heroGeometry,
    actorGeometries: retainedActorGeometries,
    snapshot,
  });
  stagePresentationRetention.set(state, presentation);
  return presentation;
}

function geometryAnchor(effect, geometry, presentation) {
  const name = effect.anchorName;
  if (name === 'ground' || name === 'shadow') {
    return {
      x: geometry.anchors.shadowX,
      y: geometry.anchors.shadowY,
    };
  }
  if (name === 'floater') {
    if (effect.anchorKind === 'hero') {
      return {
        x: geometry.anchors.hitX,
        y:
          presentation.groundY -
          geometry.targetBodyHeight -
          24,
      };
    }
    return {
      x: geometry.anchors.hitX,
      y: Math.max(
        geometry.anchors.floaterY,
        Math.min(170, presentation.groundY - 32),
      ),
    };
  }
  if (name === 'loot') {
    return { x: geometry.anchors.lootX, y: geometry.anchors.lootY };
  }
  return { x: geometry.anchors.hitX, y: geometry.anchors.hitY };
}

function fallbackAnchor(effect, presentation) {
  if (!Number.isFinite(effect.anchorFallbackX)) return null;
  const role = Object.hasOwn(
    STAGE_ROLE_PRESENTATION,
    effect.anchorRole,
  )
    ? effect.anchorRole
    : 'standard';
  const targetBodyHeight =
    STAGE_ROLE_PRESENTATION[role].visibleBodyHeight * presentation.stageFit;
  const visualGap =
    STAGE_ROLE_PRESENTATION[role].visualGap * presentation.stageFit;
  const bodyBottom = presentation.groundY - visualGap;
  if (effect.anchorName === 'ground' || effect.anchorName === 'shadow') {
    return { x: effect.anchorFallbackX, y: presentation.groundY };
  }
  if (effect.anchorName === 'floater') {
    const y =
      role === 'hero'
        ? presentation.groundY - targetBodyHeight - 24
        : Math.max(
            bodyBottom - targetBodyHeight - STAGE_OVERHEAD_GAP * 2,
            Math.min(170, presentation.groundY - 32),
          );
    return { x: effect.anchorFallbackX, y };
  }
  return {
    x: effect.anchorFallbackX,
    y: bodyBottom - targetBodyHeight / 2,
  };
}

function resolveEffectOrigin(effect, presentation, follow = false) {
  if (
    effect.anchorKind !== 'enemy' &&
    effect.anchorKind !== 'hero'
  ) {
    return null;
  }
  const geometry =
    effect.anchorKind === 'hero'
      ? presentation.heroGeometry
      : presentation.actorGeometries.get(effect.anchorId);
  const current = geometry
    ? geometryAnchor(effect, geometry, presentation)
    : fallbackAnchor(effect, presentation);
  const retained = effectOriginRetention.get(effect) || null;
  if (current && (follow || !retained)) {
    const origin = Object.freeze({ x: current.x, y: current.y });
    effectOriginRetention.set(effect, origin);
    return origin;
  }
  return retained || current;
}

function retainedEnemyMotion(enemy) {
  return enemy && typeof enemy === 'object'
    ? enemyMotionRetention.get(enemy) || null
    : null;
}

function retainEnemyMotion(enemy, retained) {
  if (!enemy || typeof enemy !== 'object') return;
  enemyMotionRetention.set(enemy, retained);
}

/**
 * Keep the drawable predecessor plus its warming replacement. With no actor on
 * stage, retain only current-wave advance media so the spawn gate cannot race
 * the renderer's bounded-cache pruning.
 */
export function motionClipKeepKeysForStage(
  enemies,
  motionInfoByEnemyId,
  pack,
  zone = 0,
) {
  const keepClipKeys = new Set();
  if (!pack?.motion?.characters) return keepClipKeys;
  const packWave = ((Math.max(0, Math.floor(zone)) % 10) + 1);
  for (const assetId of packWaveIdentityIds(pack, packWave)) {
    if (pack.motion.characters[assetId]?.clips?.advance) {
      keepClipKeys.add(`${pack.id}/${assetId}#advance`);
    }
  }
  for (const enemy of enemies) {
    const motionInfo = motionInfoByEnemyId.get(enemy.id);
    const assetId = motionInfo?.assetId;
    const source = assetId ? pack.motion.characters[assetId] : null;
    const retained = retainedEnemyMotion(enemy);
    if (
      retained?.packId === pack.id &&
      retained.assetId === assetId &&
      source?.clips?.[retained.clip]
    ) {
      keepClipKeys.add(`${pack.id}/${assetId}#${retained.clip}`);
    }
    if (
      motionInfo?.requestedStatus === 'pending' &&
      source?.clips?.[motionInfo.requestedClip]
    ) {
      keepClipKeys.add(`${pack.id}/${assetId}#${motionInfo.requestedClip}`);
    } else if (
      !retained &&
      motionInfo?.status === 'ready' &&
      source?.clips?.[motionInfo.clip]
    ) {
      keepClipKeys.add(`${pack.id}/${assetId}#${motionInfo.clip}`);
    }
  }
  return keepClipKeys;
}

export function draw(
  ctx,
  w,
  h,
  s,
  assetStore = null,
  stageClearance = STAGE_CLEARANCE_FALLBACK,
  rootAlpha = 1,
) {
  const gy = h * 0.86;
  const t = s.world.time;
  const scroll = interpolateRootPosition(
    s.world.previousScrollSmooth,
    s.world.scrollSmooth,
    rootAlpha,
  );
  const repaintTime = t + clamp(rootAlpha, 0, 1) * C.FIXED_DT;
  const shakeX = s.world.shake
    ? (presentationNoise(repaintTime * 1009 + 17) - 0.5) * s.world.shake
    : 0;
  const shakeY = s.world.shake
    ? (presentationNoise(repaintTime * 1013 + 29) - 0.5) * s.world.shake
    : 0;
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
    presentation:
      getV3Presentation() || heroIntrinsicGeometry().presentation,
  };
  const enemyStageActors = (plateFit) =>
    show.map((enemy) => {
      const motionInfo = motionInfoByEnemyId.get(enemy.id);
      const role = stageRoleForEnemy(enemy, motionInfo);
      return {
        role,
        presentation: enemyStagePresentationForMotion(motionInfo),
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
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // --- layered editorial world (per-zone seeded mood, pack plate far layer) ---
  // Drift tier is the Pack's own Corruption tier, read from the same pure Route
  // helper the scheduler uses. A Pack that failed to decode reports tier 0, so a
  // procedural fallback scene renders exactly as it does today.
  const driftTier =
    packAssets?.ready && packAssets.id
      ? corruptionTierFor(s.route, packAssets.id)
      : 0;
  drawScenery(ctx, w, h, {
    zone: s.route?.zone ?? 0,
    gy,
    scroll,
    t,
    reducedMotion: motionReduced(s),
    packBg: packAssets?.ready && ready(packAssets.background) ? packAssets.background : null,
    packProps: packAssets?.ready && ready(packAssets.props) ? packAssets.props : null,
    packCorruption:
      packAssets?.ready && ready(packAssets.corruptionMask)
        ? packAssets.corruptionMask
        : null,
    packId: packAssets?.ready ? packAssets.id || null : null,
    driftTier,
  });

  // alerts
  for (const a of s.world.alerts) drawAlert(ctx, a, t);

  // enemies (living + dying) — env mirrors game.js melee targeting so V3
  // creature clips (advance / attack / hit / death / broken) track the domain
  const actorGeometries = new Map();
  show.forEach((e) => {
    const renderEnemy = {
      ...e,
      displayX: interpolateRootPosition(
        e.previousDisplayX,
        e.displayX,
        rootAlpha,
      ),
    };
    const geometry = drawEnemy(
      ctx,
      renderEnemy,
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
        retentionOwner: e,
      },
    );
    actorGeometries.set(e.id, geometry);
  });
  if (assetStore?.motionStore && packAssets?.pack?.motion?.characters) {
    pruneMotionClipResidency(
      assetStore.motionStore,
      motionClipKeepKeysForStage(
        show,
        motionInfoByEnemyId,
        packAssets.pack,
        s.route?.zone ?? 0,
      ),
    );
  }

  // hero
  const heroGeometry = drawHero(
    ctx,
    interpolateRootPosition(
      s.world.previousHeroDisplayX,
      s.world.heroDisplayX,
      rootAlpha,
    ),
    gy,
    s,
    t,
    stageFit,
  );
  const stagePresentation = retainStagePresentation(s, {
    groundY: gy,
    stageFit,
    heroGeometry,
    actorGeometries,
  });

  // particles
  for (const p of s.world.particles) {
    drawParticle(ctx, p, stagePresentation);
  }

  // shock rings (crit pops, death bursts, rank halo)
  for (const sh of s.world.shocks || []) {
    drawShock(ctx, sh, stagePresentation);
  }

  // Currency reward travels from the defeated target to its owning HUD chip.
  for (const flight of s.world.lootFlights || []) {
    drawLootFlight(ctx, flight, w, h, stagePresentation);
  }

  // confetti
  for (const c of s.world.confetti || []) {
    drawConfettiBit(ctx, c, stagePresentation);
  }

  // floaters
  ctx.textAlign = 'center';
  for (const f of s.world.floaters) {
    const origin = resolveEffectOrigin(f, stagePresentation, true);
    const life = f.life || 1;
    const u = clamp(f.t / life, 0, 1);
    const a = easeOutCubic(u);
    const pop = f.huge ? 1 + (1 - u) * 0.75 : f.big ? 1 + (1 - u) * 0.4 : 1 + (1 - u) * 0.2;
    // Centered milestone counters live at stage center, not at the kill point.
    const fx = f.center ? w / 2 : (origin?.x || 0) + f.x;
    const fy = f.center
      ? h * 0.42
      : (origin?.y || 0) + f.y - (f.anchorLift || 0);
    if (!f.center && (!Number.isFinite(fx) || !Number.isFinite(fy))) continue;
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
    } else if (fx.kind === 'patchline') {
      drawPatchlineFx(ctx, w, h, fx, motionReduced(s));
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
    const activeBoss = s.world.enemies.find(
      (e) => e.type === 'boss' && e.hp > 0,
    );
    const bossGeometry = activeBoss
      ? actorGeometries.get(activeBoss.id)
      : null;
    const timerLayout = stageFunctionalLayout({
      actorX: activeBoss ? activeBoss.displayX : w / 2,
      geometry: bossGeometry,
      fit: stageFit,
      stageClearance,
      stageWidth: w,
      stageHeight: h,
      includeBossTimer: true,
    }).timer;
    const bx = timerLayout.x;
    const bw = timerLayout.width;
    const by = timerLayout.y;
    ctx.fillStyle = 'rgba(10,14,19,0.8)';
    roundRect(ctx, bx, by, bw, timerLayout.barHeight, 5);
    ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#A3072F');
    g.addColorStop(1, '#FC1243');
    ctx.fillStyle = g;
    roundRect(ctx, bx, by, bw * ratio, timerLayout.barHeight, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(245,246,248,0.85)';
    ctx.font = '700 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    // Zone-boss variant: the banner names whichever boss is actually on stage
    const banner = bossBannerFor(activeBoss, s.route?.zone ?? 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(6,10,16,0.92)';
    ctx.strokeText(banner, timerLayout.labelX, timerLayout.labelY);
    ctx.fillText(banner, timerLayout.labelX, timerLayout.labelY);
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
  const selected = resolveHeroV3Frame(heroRuntimeSemantics(s, t).selector);
  if (!selected) {
    return { status: 'pending', clip: null, fps: null, frameIndex: null };
  }
  const clip = getV3Clip(selected.clip);
  return {
    status: selected.warming ? 'pending' : clip ? 'ready' : 'failed',
    clip: selected.requestedClip || selected.clip,
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

function heroIntrinsicGeometry(selected = null) {
  const geometry = getV3Geometry(selected);
  const presentation = geometry?.presentation || getV3Presentation();
  if (!geometry || !presentation) return LEGACY_HERO_INTRINSICS;
  const frameSize =
    typeof geometry.frameSize === 'number'
      ? { width: geometry.frameSize, height: geometry.frameSize }
      : geometry.frameSize;
  return {
    frameSize,
    trim: {
      x: geometry.trim.x,
      y: geometry.trim.y,
      width: geometry.trim.w,
      height: geometry.trim.h,
    },
    pivot: { x: geometry.anchor[0], y: geometry.anchor[1] },
    presentation,
  };
}

export function heroDrawOptions(actorX, groundY, fit = 1, selected = null) {
  const geometry = resolveActorGeometry({
    actorX,
    groundY,
    fit,
    role: 'hero',
    ...heroIntrinsicGeometry(selected),
  });
  return Object.freeze({
    drawTrimHeight: geometry.drawTrimHeight,
    pivotY: geometry.pivotY,
    geometry,
  });
}

/**
 * Off-stage Host preview (Gear sheet niche) under the stage scale contract.
 *
 * The preview is the same character, so it must obey the same rule: the
 * requested size names the neutral **visible body**, which becomes a hero-role
 * stage fit, and the authored clip is drawn through the resolved trim height and
 * pivot. Passing a bare `height` instead takes hero-v2's legacy trim-height
 * compatibility path, which grounds the Host on the wrong pivot and crops its
 * feet out of the niche.
 */
export function heroPreviewDrawOptions(
  actorX,
  groundY,
  visibleBodyHeight,
  time = 0,
) {
  const selector = Object.freeze({ t: time, pose: 'idle' });
  const options = heroDrawOptions(
    actorX,
    groundY,
    visibleBodyHeight / STAGE_ROLE_PRESENTATION.hero.visibleBodyHeight,
    resolveHeroV3Frame(selector),
  );
  return Object.freeze({
    height: options.geometry.targetBodyHeight,
    drawTrimHeight: options.drawTrimHeight,
    pivotY: options.pivotY,
    geometry: options.geometry,
    motionSelector: selector,
  });
}

export function drawHero(ctx, x, gy, s, t, fit = 1) {
  const semantics = heroRuntimeSemantics(s, t);
  const selected = resolveHeroV3Frame(semantics.selector);
  const h = semantics.hero;
  const attack = semantics.attack;
  const sprinting = semantics.sprinting;
  const overdrive = semantics.overdrive;
  const tracker = semantics.tracker;
  const hostPose = semantics.pose;
  const drawOptions = heroDrawOptions(x, gy, fit, selected);
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
  // Pack-level approval fact, reported in every load state so an identity's
  // stage scale never changes between warming, ready, and fallback frames.
  const consumerRole = source?.consumerScale?.role ?? null;
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
      consumerRole,
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
      consumerRole,
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
      consumerRole,
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
  if (
    assetStore?.motionStore &&
    typeof record.descriptor?.sourceFamily === 'string' &&
    [
      'authored-semantic-v3',
      'authored-semantic-v4',
    ].includes(record.descriptor.sourceFamily)
  ) {
    const clipRecord = getMotionClipRecord(
      assetStore.motionStore,
      pack.id,
      assetId,
      selection.clip,
    );
    if (!clipRecord || clipRecord.status === 'pending') {
      void warmMotionClip(
        assetStore.motionStore,
        pack,
        assetId,
        selection.clip,
      ).catch(() => {});
      const retained = retainedEnemyMotion(env?.retentionOwner || enemy);
      const retainedRecord =
        retained?.packId === pack.id &&
        retained.assetId === assetId &&
        typeof retained.clip === 'string'
          ? getMotionClipRecord(
              assetStore.motionStore,
              pack.id,
              assetId,
              retained.clip,
            )
          : null;
      if (
        retainedRecord?.status === 'ready' &&
        Number.isInteger(retained.frameIndex)
      ) {
        return {
          mode: 'motion',
          status: 'ready',
          assetId,
          clip: retained.clip,
          fps: retainedRecord.descriptor?.fps ?? null,
          frameIndex: retained.frameIndex,
          requestedClip: selection.clip,
          requestedStatus: 'pending',
          retained: true,
          fallbacks: fallbackCount,
          record: retainedRecord,
          target,
          consumerRole,
        };
      }
      return {
        mode: 'pending',
        status: 'pending',
        assetId,
        clip: selection.clip,
        requestedClip: selection.clip,
        requestedStatus: 'pending',
        frameIndex: null,
        fallbacks: fallbackCount,
        target,
        consumerRole,
      };
    }
    if (clipRecord.status === 'failed') {
      return {
        mode: 'static-fallback',
        status: 'failed',
        assetId,
        clip: selection.clip,
        frameIndex: null,
        fallbacks: fallbackCount,
        target,
        consumerRole,
      };
    }
    return {
      mode: 'motion',
      status: 'ready',
      assetId,
      clip: selection.clip,
      requestedClip: selection.clip,
      requestedStatus: 'ready',
      fps: clipRecord.descriptor?.fps ?? null,
      frameIndex: frameIndexForClip(clipRecord.descriptor, selection.value),
      fallbacks: fallbackCount,
      record: clipRecord,
      target,
      consumerRole,
    };
  }
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
      consumerRole,
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
    consumerRole,
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
      if (
        onStage &&
        motionInfo.record?.key?.includes('#')
      ) {
        retainEnemyMotion(env?.retentionOwner || e, {
          packId: packAssets.pack.id,
          assetId: motionInfo.assetId,
          clip: motionInfo.clip,
          frameIndex: motionInfo.frameIndex,
        });
      }
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
        motionInfo.record?.key?.includes('#') ? motionInfo.clip : null,
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
        presentationOwner: env?.retentionOwner || e,
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
      presentationOwner: env?.retentionOwner || e,
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

  const compact = fit < ENEMY_PLATE_COMPACT_FIT;
  const plate = stageFunctionalLayout({
    actorX: x,
    geometry,
    fit,
    stageClearance: env?.stageClearance,
  }).plate;
  const bannerH = plate.height;
  const plateW = plate.width;
  const plateX = plate.x;
  const barY = plate.y;
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
    presentationOwner,
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
    const pop = creatureSpawnScale(presentationOwner || e, t);
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

function drawLootFlight(ctx, flight, w, h, presentation) {
  const origin = resolveEffectOrigin(flight, presentation);
  const sourceX = (origin?.x || 0) + flight.x;
  const sourceY = (origin?.y || 0) + flight.y;
  if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) return;
  const u = easeOutCubic(1 - clamp(flight.t / flight.life, 0, 1));
  // Gear drops dive to the in-stage bag FAB (bottom-left); currency to the top chips.
  const isGear = flight.target === 'gear';
  const targetX = isGear ? 34 : flight.target === 'notes' ? w * 0.62 : w * 0.11;
  const targetY = isGear ? h - 38 : -56;
  const posAt = (uu) => ({
    x: sourceX + (targetX - sourceX) * uu,
    y: sourceY + (targetY - sourceY) * uu - Math.sin(uu * Math.PI) * 34,
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
function drawShock(ctx, sh, presentation) {
  if (sh.delay > 0) return;
  const origin = resolveEffectOrigin(sh, presentation);
  const x = (origin?.x || 0) + sh.x;
  const y = (origin?.y || 0) + sh.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const u = 1 - clamp(sh.t / (sh.life || 0.34), 0, 1);
  const r = 6 + easeOutCubic(u) * ((sh.r1 || 46) - 6);
  ctx.save();
  ctx.globalAlpha = (1 - u) * 0.85;
  ctx.strokeStyle = resolveCanvasPaint(sh.c);
  ctx.lineWidth = Math.max(1, (sh.w || 3) * (1 - u * 0.6));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
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

/**
 * Patchline Complete — the Go-Live-class finale beat, fired once ever when the
 * 100th Gate falls. Same structure as the Go Live cinematic (flash → centered
 * title card) with its own copy, and the same reduced-motion contract: no flash,
 * no pop, static final card.
 */
function drawPatchlineFx(ctx, w, h, fx, reduced) {
  const life = fx.life || 2.4;
  const u = 1 - clamp(fx.t / life, 0, 1);
  if (!reduced && u < 0.2) {
    ctx.fillStyle = `rgba(255,244,220,${0.5 * (1 - u / 0.2)})`;
    ctx.fillRect(0, 0, w, h);
  }
  const a = Math.min(clamp(u / 0.1, 0, 1), clamp(fx.t / 0.45, 0, 1));
  const pop = reduced ? 1 : 1 + Math.max(0, 1 - u / 0.28) * 0.45;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(w / 2, h * 0.34);
  ctx.scale(pop, pop);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.font = '800 13px system-ui, -apple-system, sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(6,8,10,0.9)';
  ctx.strokeText('PATCHLINE COMPLETE', 0, -34);
  ctx.fillStyle = '#FC1243';
  ctx.fillText('PATCHLINE COMPLETE', 0, -34);
  ctx.font = '900 30px system-ui, -apple-system, sans-serif';
  ctx.lineWidth = 5;
  const label = `ZONE ${fx.zone || 1000}`;
  ctx.strokeText(label, 0, 0);
  ctx.fillStyle = '#e6b84d';
  ctx.fillText(label, 0, 0);
  ctx.font = '800 12px system-ui, -apple-system, sans-serif';
  ctx.lineWidth = 3.5;
  ctx.strokeText('ENDLESS RATING BEGINS', 0, 26);
  ctx.fillStyle = '#3ecf8e';
  ctx.fillText('ENDLESS RATING BEGINS', 0, 26);
  ctx.restore();
}

function drawParticle(ctx, p, presentation) {
  const origin = resolveEffectOrigin(p, presentation);
  const x = (origin?.x || 0) + p.x;
  const y = (origin?.y || 0) + p.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const a = clamp(p.t / (p.life || 0.5), 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
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

function drawConfettiBit(ctx, c, presentation) {
  const origin = resolveEffectOrigin(c, presentation);
  const x = (origin?.x || 0) + c.x;
  const y = (origin?.y || 0) + c.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const a = clamp(c.t / (c.life || 1), 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
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
