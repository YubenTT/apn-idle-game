/** APN Idle bootstrap */

import { C } from './formulas.js?v=gaf2d-motion-v1';
import { createState, step, collectAlert, simulateOffline, setSprint, isSprinting, goLive, canGoLive, goLiveAvailableZone } from './game.js?v=gaf2d-motion-v1';
import { sizeCanvas, draw, bossTimerYFor, enemyFrameFor, inspectEnemyMotion, inspectHeroMotion, inspectStagePresentation, legacyCreatureKindForStage } from './render.js?v=gaf2d-motion-v1';
import { createAssetStore, getCurrentPackAssets, preloadRouteAssets, packWindowForRoute } from './assets.js?v=gaf2d-motion-v1';
import { bindUI, renderHUD } from './ui.js?v=gaf2d-motion-v1';
import { save, load, apply } from './save.js?v=gaf2d-motion-v1';
import {
  heroV3AuthorityStatus,
  loadHeroV3,
} from './hero-v3.js?v=gaf2d-motion-v1';
import {
  createMotionPreferenceController,
  motionReduced,
} from './motion-preference.js?v=gaf2d-motion-v1';
import { setReducedMotion } from './sfx.js?v=gaf2d-motion-v1';
import {
  createMotionStore,
  getMotionClipRecord,
  getMotionRecord,
  motionClipSettled,
  motionDiagnostics,
  releaseColdMotion,
  warmMotionClip,
  warmMotionSet,
} from './motion-store.js?v=gaf2d-motion-v1';
import {
  packWaveIdentityIds,
  routeWaveIdentityUnion,
  routeWaveWindow,
} from './wave-roster.js?v=gaf2d-motion-v1';
import { GAME_PACKS } from './generated/game-packs.js?v=gaf2d-motion-v1';
import { routeJourney } from './route.js?v=gaf2d-motion-v1';
import {
  COVERAGE_MAX_LEVEL,
  COVERAGE_SETS,
  coverageMasteryLevel,
  coverageSetStatus,
  coverageYieldMultiplier,
} from './coverage.js?v=gaf2d-motion-v1';
import {
  createCreatureStore,
  releaseColdCreatureKinds,
  warmCreatureKind,
} from './creatures.js?v=gaf2d-motion-v1';
import {
  loadMotionPreview,
} from './motion-preview.js?v=gaf2d-motion-v1';
import {
  isMotionReviewRequested,
  mountMotionReviewSurface,
} from './motion-review.js?v=gaf2d-motion-v1';

const canvas = document.getElementById('game');
const s = createState();
const qaParams = new URLSearchParams(location.search);
const motionPreview = await loadMotionPreview({
  locationLike: location,
  packs: GAME_PACKS,
});
const productionHeroSource =
  GAME_PACKS.find((pack) => pack.id === 'valorant')
    ?.motion?.characters?.['apn-hero'] ?? null;
const heroRuntimeSource = motionPreview.active
  ? {
      basePath: motionPreview.heroBasePath,
      sourceFamily: motionPreview.manifest?.sourceFamily ?? null,
      setSha256: motionPreview.manifest?.hero?.setSha256 ?? null,
      consumerScale: motionPreview.manifest?.hero?.consumerScale ?? null,
      selectedProfileSha256:
        motionPreview.manifest?.toolchain?.profileSha256 ?? null,
    }
  : productionHeroSource;
const runtimePacks = motionPreview.packs;
const activePackIds = new Set(runtimePacks.map((pack) => pack.id));
const banner = document.getElementById('motion-preview-banner');
const bannerTitle = document.getElementById('motion-preview-title');
const bannerDetail = document.getElementById('motion-preview-detail');
const motionReviewPanel = document.getElementById('motion-review-panel');
if (motionPreview.requested && banner && bannerTitle && bannerDetail) {
  const counts = motionPreview.manifest?.counts;
  banner.hidden = false;
  banner.dataset.state = motionPreview.active ? 'active' : 'failed';
  if (motionPreview.active) {
    bannerDetail.textContent =
      `${counts.assets} assets · ${counts.clips} clips · ${counts.frames} frames`;
  } else {
    bannerTitle.textContent = 'LOCAL MOTION PREVIEW BLOCKED';
    bannerDetail.textContent = 'SAFE FALLBACK · integrity check failed';
    banner.title = String(motionPreview.error || 'Preview activation failed');
  }
}
const assetStore = createAssetStore({
  catalog: runtimePacks,
  motionStore: createMotionStore({
    allowUnapprovedPreview: motionPreview.active,
  }),
  creatureStore: createCreatureStore(),
});
const qaMetricsEnabled = qaParams.has('qa_metrics');
const qaEnabled = qaParams.has('chrome-smoke');
const qaManualMode = qaEnabled && qaParams.has('qa-manual');

const saved = load();
if (saved) {
  const elapsed = apply(s, saved);
  if (elapsed > 5) {
    const summary = simulateOffline(s, elapsed);
    if (summary) s.ui.offline = summary;
  }
  s.ui.toast = 'Welcome back. Feed is live.';
  s.ui.toastT = 2.5;
  document.getElementById('title-screen').hidden = true;
} else {
  s.ui.pendingTip = 'start';
}
if (qaParams.has('autostart') && qaParams.has('zone')) {
  const displayZone = Math.max(1, Math.floor(Number(qaParams.get('zone')) || 1));
  s.route.zone = displayZone - 1;
  s.route.killsInZone = 0;
  s.world.enemies = [];
  s.world.spawnCd = 0;
  s.ui.pendingTip = null;
}
// Query override is applied after save hydration so QA can never emit audio.
if (qaParams.has('mute')) s.settings.sfx = false;

let view = sizeCanvas(canvas);
window.addEventListener('resize', () => {
  view = sizeCanvas(canvas);
});

const motionPreference = createMotionPreferenceController({
  state: s,
  applyReducedMotion: setReducedMotion,
  onEffectiveChange() {
    draw(view.ctx, view.w, view.h, s, assetStore, view.stageClearance);
    renderHUD(s, C.FIXED_DT);
  },
});

bindUI(s, motionPreference);
let assetWindowKey = '';
let assetSyncPromise = Promise.resolve();
function syncRouteAssets() {
  const key = packWindowForRoute(s.route, runtimePacks).map((pack) => pack.id).join(',');
  if (key === assetWindowKey) return assetSyncPromise;
  assetWindowKey = key;
  assetSyncPromise = preloadRouteAssets(assetStore, s.route).catch(() => []);
  return assetSyncPromise;
}

function motionAssetIdsForPackWave(pack, packWave) {
  return packWaveIdentityIds(pack, packWave).filter(
    (assetId) =>
      pack?.motion?.characters &&
      Object.hasOwn(pack.motion.characters, assetId),
  );
}

function groupMotionRequests(requests) {
  const grouped = new Map();
  for (const { pack, assetId } of requests) {
    const bucket = grouped.get(pack.id) || { pack, assetIds: [] };
    bucket.assetIds.push(assetId);
    grouped.set(pack.id, bucket);
  }
  return [...grouped.values()].map(({ pack, assetIds }) => ({
    pack,
    assetIds: [...new Set(assetIds)],
  }));
}

function currentMotionRequests(route = s.route) {
  const [current] = routeWaveWindow(route, runtimePacks);
  if (!current?.pack) return [];
  return motionAssetIdsForPackWave(current.pack, current.wave).map((assetId) => ({
    pack: current.pack,
    assetId,
  }));
}

function routeMotionRequests(route = s.route) {
  return routeWaveIdentityUnion(route, runtimePacks)
    .map(({ packId, assetId }) => ({
      pack: runtimePacks.find((candidate) => candidate.id === packId),
      assetId,
    }))
    .filter(
      ({ pack, assetId }) =>
        pack &&
        Object.hasOwn(pack?.motion?.characters || {}, assetId),
    );
}

function motionKeepKeys(requests) {
  return new Set(requests.map(({ pack, assetId }) => `${pack.id}/${assetId}`));
}

async function warmMotionRequests(requests) {
  const groups = groupMotionRequests(requests);
  await Promise.all(groups.map(({ pack, assetIds }) => warmMotionSet(
    assetStore.motionStore,
    pack,
    assetIds,
  )));
}

async function warmCurrentAdvanceRequests(requests) {
  await Promise.all(
    requests.map(({ pack, assetId }) => {
      const source = pack?.motion?.characters?.[assetId];
      return source?.clips?.advance
        ? warmMotionClip(assetStore.motionStore, pack, assetId, 'advance')
        : Promise.resolve();
    }),
  );
}

function currentMotionSettled(route = s.route) {
  return currentMotionRequests(route).every(({ pack, assetId }) => {
    const record = getMotionRecord(assetStore.motionStore, pack.id, assetId);
    if (!record || record.status === 'pending') return false;
    if (
      record.status === 'ready' &&
      pack.motion.characters[assetId]?.clips?.advance &&
      !getMotionClipRecord(
        assetStore.motionStore,
        pack.id,
        assetId,
        'advance',
      )
    ) {
      void warmMotionClip(
        assetStore.motionStore,
        pack,
        assetId,
        'advance',
      ).catch(() => {});
    }
    return motionClipSettled(
      assetStore.motionStore,
      pack.id,
      assetId,
      'advance',
    );
  });
}

let motionWindowKey = '';
let motionSyncPromise = Promise.resolve();
function syncMotionWindow() {
  const requests = routeMotionRequests();
  releaseColdMotion(assetStore.motionStore, motionKeepKeys(requests));
  const key = requests.map(({ pack, assetId }) => `${pack.id}/${assetId}`).join(',');
  if (key === motionWindowKey) return motionSyncPromise;
  motionWindowKey = key;
  motionSyncPromise = warmMotionRequests(requests).catch(() => []);
  return motionSyncPromise;
}

let legacyCreatureOwner = null;
let legacyCreaturePromise = Promise.resolve();
function syncLegacyCreatureOwner() {
  const hasStageEnemy = s.world.enemies.some(
    (candidate) =>
      candidate.hp > 0 ||
      (candidate.deathT && candidate.deathT > 0),
  );
  if (!hasStageEnemy) return legacyCreaturePromise;
  const packAssets = getCurrentPackAssets(assetStore, s.route);
  const kind = legacyCreatureKindForStage(
    s.world.enemies,
    packAssets,
    assetStore,
    { zone: s.route?.zone ?? 0 },
  );
  if (kind === legacyCreatureOwner) return legacyCreaturePromise;
  legacyCreatureOwner = kind;
  releaseColdCreatureKinds(
    assetStore.creatureStore,
    kind ? new Set([kind]) : new Set(),
  );
  if (!kind) {
    legacyCreaturePromise = Promise.resolve();
    return legacyCreaturePromise;
  }
  legacyCreaturePromise = warmCreatureKind(
    assetStore.creatureStore,
    kind,
  ).catch(() => []);
  return legacyCreaturePromise;
}

let qaStepRemainderMs = 0;
let motionReviewSurface = null;
function renderGameToText() {
  const packId = assetStore.currentId || s.route.currentPackId;
  const packAssets = packId ? assetStore.packs.get(packId) : null;
  const enemy =
    s.world.enemies.find((candidate) => candidate.hp > 0) ||
    s.world.enemies.find(
      (candidate) => candidate.killed && candidate.deathT > 0,
    ) ||
    null;
  const frame = enemyFrameFor(enemy);
  const hpRatio = enemy?.hpMax > 0 ? enemy.hp / enemy.hpMax : null;
  const clientWidth = document.documentElement.clientWidth;
  const heroX = s.world.heroX;
  const motion = enemy
    ? inspectEnemyMotion(enemy, packAssets, assetStore, {
        zone: s.route?.zone ?? 0,
        meleeStop: heroX + C.MELEE_RANGE - 8,
        engagedId:
          s.world.enemies.find((candidate) => candidate.hp > 0 && candidate.x <= heroX + C.MELEE_RANGE)?.id || null,
        t: s.world.time,
      })
    : null;
  const heroMotion = inspectHeroMotion(s, s.world.time);
  const journey = routeJourney(s.route, runtimePacks);
  return JSON.stringify({
    coordinateSystem: 'Canvas origin top-left; +x right; +y down; enemy x is its foot-center.',
    routeZone: (s.route.zone | 0) + 1,
    packWave: ((s.route.zone | 0) % 10) + 1,
    packId,
    routeJourney: {
      currentPackId: journey.current?.id || null,
      currentPackTitle: journey.current?.title || null,
      nextPackId: journey.next?.id || null,
      nextPackTitle: journey.next?.title || null,
      packWave: journey.packWave,
      echo: journey.echo,
      cleanEra: journey.cleanEra,
      signalDrift: journey.signalDrift,
      historyCount: journey.history.length,
    },
    coverage: {
      currentMastery: {
        packId: journey.current?.id || null,
        level: coverageMasteryLevel(s, journey.current?.id),
        maxLevel: COVERAGE_MAX_LEVEL,
        yieldMultiplier: coverageYieldMultiplier(
          s,
          journey.current?.id,
          journey.current?.tier || 0,
        ),
      },
      sets: COVERAGE_SETS.map((set) => ({
        id: set.id,
        ...coverageSetStatus(
          s,
          s.route,
          set.id,
          COVERAGE_SETS,
          activePackIds,
        ),
      })),
    },
    pack: {
      ready: packAssets?.ready === true,
      atlas: {
        width: packAssets?.targets?.naturalWidth || 0,
        height: packAssets?.targets?.naturalHeight || 0,
      },
    },
    enemy: enemy
      ? {
          type: enemy.type,
          label: enemy.label,
          frame,
          x: Math.round(enemy.displayX),
          hpRatio: Math.round(hpRatio * 1000) / 1000,
        }
      : null,
    motion: motion
      ? {
          assetId: motion.assetId,
          clip: motion.clip,
          fps: motion.fps ?? null,
          frameIndex: motion.frameIndex,
          status: motion.status,
          fallbacks: motion.fallbacks,
          authority: motion.record?.descriptor?.authority ?? null,
          sourceFamily:
            motion.record?.descriptor?.sourceFamily ??
            motion.record?.set?.sourceFamily ??
            null,
          candidateSha256:
            motion.record?.descriptor?.previewLineage?.candidateSha256 ??
            motion.record?.set?.previewLineage?.candidateSha256 ??
            null,
          motionApprovalSha256:
            motion.record?.descriptor?.releaseLineage?.motionApprovalSha256 ??
            motion.record?.set?.releaseLineage?.motionApprovalSha256 ??
            null,
          runtimeLineageSha256:
            motion.record?.descriptor?.releaseLineage?.runtimeLineageSha256 ??
            motion.record?.set?.releaseLineage?.runtimeLineageSha256 ??
            null,
          derivativeSetSha256:
            motion.record?.descriptor?.releaseLineage?.derivativeSetSha256 ??
            motion.record?.set?.releaseLineage?.derivativeSetSha256 ??
            null,
          selectedProfileSha256:
            motion.record?.descriptor?.lineage?.selectedProfileSha256 ??
            motion.record?.set?.lineage?.selectedProfileSha256 ??
            null,
        }
      : {
          assetId: null,
          clip: null,
          fps: null,
          frameIndex: null,
          status: null,
          fallbacks: motionDiagnostics(assetStore.motionStore).length,
          authority: null,
          sourceFamily: null,
          candidateSha256: null,
          motionApprovalSha256: null,
          runtimeLineageSha256: null,
          derivativeSetSha256: null,
          selectedProfileSha256: null,
        },
    motionPreview: {
      requested: motionPreview.requested,
      active: motionPreview.active,
      authority: motionPreview.authority,
      batchSummarySha256: motionPreview.batchSummarySha256,
      error: motionPreview.error,
      reviewRequested: isMotionReviewRequested(location),
      heroStatus: heroV3AuthorityStatus(),
      heroAuthority: motionPreview.active
        ? motionPreview.manifest?.hero?.authority || null
        : null,
    },
    heroMotion: {
      ...heroMotion,
      authority: motionPreview.active
        ? motionPreview.manifest?.hero?.authority || null
        : null,
      candidateSha256: motionPreview.active
        ? motionPreview.manifest?.assets?.['apn-hero']?.candidateSha256 || null
        : null,
    },
    bossBreak: frame === 'boss-break',
    bossTimerY: s.world.bossActive ? bossTimerYFor(view.h) : null,
    muted: s.settings.sfx === false,
    reducedMotion: motionReduced(s),
    viewport: {
      width: view.w,
      height: view.h,
      overflowX: Math.max(0, document.documentElement.scrollWidth - clientWidth),
    },
  });
}

function advanceQaTime(milliseconds) {
  const amount = Number(milliseconds);
  if (!Number.isFinite(amount) || amount < 0 || amount > 10000) {
    throw new RangeError('advanceTime milliseconds must be finite and between 0 and 10000');
  }
  qaStepRemainderMs += amount;
  const fixedMs = C.FIXED_DT * 1000;
  const steps = Math.floor((qaStepRemainderMs + 1e-9) / fixedMs);
  qaStepRemainderMs -= steps * fixedMs;
  for (let index = 0; index < steps; index += 1) {
    step(s, C.FIXED_DT, { allowSpawn: currentMotionSettled() });
    syncRouteAssets();
    syncMotionWindow();
    syncLegacyCreatureOwner();
  }
  draw(
    view.ctx,
    view.w,
    view.h,
    s,
    assetStore,
    view.stageClearance,
    qaStepRemainderMs / fixedMs,
  );
  renderHUD(s, Math.max(C.FIXED_DT, amount / 1000));
  return renderGameToText();
}

if (qaEnabled) {
  // Query-gated deterministic surface for browser evidence. Production pages do
  // not expose state or stepping controls.
  window.__APN_QA__ = {
    state: s,
    assets: assetStore,
    motionPreview,
    motionReviewPanel,
    presentation: () => inspectStagePresentation(s),
    actions: {
      goLive: (id = null, opts = {}) => goLive(s, id, opts),
      canGoLive: () => canGoLive(s),
      goLiveAvailableZone: () => goLiveAvailableZone(s),
      setReducedMotion: (value) => motionPreference.setSaved(value),
    },
  };
  window.render_game_to_text = renderGameToText;
  window.advanceTime = advanceQaTime;
}

// The current approved Hero clip set is primary. A load failure stays on the
// explicit legless, identity-safe Canvas silhouette owned by hero-v2.js.
const heroV3Load = loadHeroV3(
  heroRuntimeSource?.basePath ?? motionPreview.heroBasePath,
  {
    allowUnapprovedPreview: motionPreview.active,
    sourceFamily: heroRuntimeSource?.sourceFamily ?? null,
    expectedSetSha256: heroRuntimeSource?.setSha256 ?? null,
    consumerScale: heroRuntimeSource?.consumerScale ?? null,
    selectedProfileSha256: heroRuntimeSource?.selectedProfileSha256 ?? null,
  },
)
  .catch(() => null); // identity-safe Canvas silhouette remains active

function pos(ev) {
  const r = canvas.getBoundingClientRect();
  const p = ev.touches ? ev.touches[0] : ev;
  return { x: p.clientX - r.left, y: p.clientY - r.top };
}

/** Hit radius for orb bubbles (hover + click) */
const ORB_HIT_R = 36;
const ORB_HIT_R2 = ORB_HIT_R * ORB_HIT_R;

/** Collect any orbs under (x,y). Returns true if at least one was collected. */
function tryAlert(x, y) {
  let got = false;
  for (const a of [...s.world.alerts]) {
    const dx = a.x - x;
    const dy = a.y - y;
    if (dx * dx + dy * dy < ORB_HIT_R2) {
      collectAlert(s, a);
      got = true;
    }
  }
  return got;
}

function nearAlert(x, y) {
  for (const a of s.world.alerts) {
    const dx = a.x - x;
    const dy = a.y - y;
    if (dx * dx + dy * dy < (ORB_HIT_R + 6) ** 2) return true;
  }
  return false;
}

function updateOrbCursor(x, y) {
  canvas.style.cursor = nearAlert(x, y) ? 'pointer' : sprintHold.canvas ? 'grabbing' : 'crosshair';
}

/** Sprint sources (OR together — any hold keeps sprint on) */
const sprintHold = { canvas: false, button: false, space: false };

function syncSprint() {
  setSprint(s, sprintHold.canvas || sprintHold.button || sprintHold.space);
  const btn = document.getElementById('btn-sprint');
  if (btn) {
    const on = sprintHold.canvas || sprintHold.button || sprintHold.space;
    btn.classList.toggle('is-held', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  document.getElementById('app')?.classList.toggle('is-sprinting', sprintHold.canvas || sprintHold.button || sprintHold.space);
}

// Stage: hold to sprint · hover/click orbs to collect
canvas.addEventListener('pointerdown', (ev) => {
  ev.preventDefault();
  sprintHold.canvas = true;
  syncSprint();
  const p = pos(ev);
  tryAlert(p.x, p.y);
  updateOrbCursor(p.x, p.y);
  try {
    canvas.setPointerCapture(ev.pointerId);
  } catch {
    /* ignore */
  }
});
// Hover counts as collect (mouse) — also while dragging/sprinting
canvas.addEventListener('pointermove', (ev) => {
  const p = pos(ev);
  tryAlert(p.x, p.y);
  updateOrbCursor(p.x, p.y);
});
canvas.addEventListener('pointerenter', (ev) => {
  const p = pos(ev);
  tryAlert(p.x, p.y);
  updateOrbCursor(p.x, p.y);
});
function endCanvasSprint(ev) {
  sprintHold.canvas = false;
  syncSprint();
  if (ev?.pointerId != null) {
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
  }
  if (ev) {
    const p = pos(ev);
    updateOrbCursor(p.x, p.y);
  } else {
    canvas.style.cursor = 'crosshair';
  }
}
canvas.addEventListener('pointerup', endCanvasSprint);
canvas.addEventListener('pointercancel', endCanvasSprint);
canvas.addEventListener('lostpointercapture', () => {
  sprintHold.canvas = false;
  syncSprint();
  canvas.style.cursor = 'crosshair';
});
canvas.addEventListener('pointerleave', () => {
  if (!sprintHold.canvas) canvas.style.cursor = 'default';
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.style.cursor = 'crosshair';

// Big Sprint button — primary mobile control
const sprintBtn = document.getElementById('btn-sprint');
function bindHold(el, key) {
  if (!el) return;
  const start = (ev) => {
    ev.preventDefault();
    sprintHold[key] = true;
    syncSprint();
    try {
      el.setPointerCapture?.(ev.pointerId);
    } catch {
      /* ignore */
    }
  };
  const end = (ev) => {
    sprintHold[key] = false;
    syncSprint();
  };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', (ev) => {
    // only end if primary button released off-element without capture
    if (ev.buttons === 0) end(ev);
  });
  el.addEventListener('lostpointercapture', end);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
bindHold(sprintBtn, 'button');

// Global safety: pointer released anywhere
window.addEventListener('pointerup', () => {
  if (sprintHold.canvas || sprintHold.button) {
    // keep if still captured; if buttons=0 force clear button after a tick
  }
});
window.addEventListener('blur', () => {
  sprintHold.canvas = false;
  sprintHold.button = false;
  sprintHold.space = false;
  syncSprint();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    sprintHold.space = true;
    syncSprint();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    sprintHold.space = false;
    syncSprint();
  }
});

document.getElementById('btn-start')?.addEventListener('click', () => {
  document.getElementById('title-screen').hidden = true;
  save(s);
});

// QA: ?autostart=1 skips title for screenshots / smoke
if (qaParams.has('autostart')) {
  document.getElementById('title-screen').hidden = true;
}

document.getElementById('chk-motion').checked = s.settings.reducedMotion;

let last = performance.now();
let acc = 0;
let hudT = 0;
let saveT = 0;
let qaFrameCount = 0;
let qaFrameWindowStart = performance.now();

function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // Wave 3 juice: hit stop + Go Live slow-mo are cosmetic timescale dips on the
  // accumulator only — combat math, rewards, and kill timing in sim-time are
  // untouched. Both clocks are set exclusively under reduced-motion guards.
  if (s.world.hitStopT > 0) s.world.hitStopT = Math.max(0, s.world.hitStopT - dt);
  if (s.world.slowMoT > 0) s.world.slowMoT = Math.max(0, s.world.slowMoT - dt);
  const feelScale = s.world.hitStopT > 0 ? 0.08 : s.world.slowMoT > 0 ? 0.35 : 1;
  // Sprint multiplies sim speed — whole game (combat, spawn, regen) runs faster
  const sprintScale = isSprinting(s) ? C.SPRINT_TIME : 1;
  acc += dt * sprintScale * feelScale;
  // Cap catch-up so a long tab-hide doesn't explode
  let steps = 0;
  while (acc >= C.FIXED_DT && steps < 8) {
    step(s, C.FIXED_DT, { allowSpawn: currentMotionSettled() });
    acc -= C.FIXED_DT;
    steps++;
  }
  if (acc > C.FIXED_DT * 4) acc = 0;

  syncRouteAssets();
  syncMotionWindow();
  syncLegacyCreatureOwner();
  draw(
    view.ctx,
    view.w,
    view.h,
    s,
    assetStore,
    view.stageClearance,
    acc / C.FIXED_DT,
  );

  if (qaMetricsEnabled) {
    qaFrameCount += 1;
    if (!document.documentElement.dataset.qaReadyMs) {
      document.documentElement.dataset.qaReadyMs = String(Math.round(now));
    }
    const qaElapsed = now - qaFrameWindowStart;
    if (qaElapsed >= 1000) {
      document.documentElement.dataset.qaFps = (qaFrameCount * 1000 / qaElapsed).toFixed(1);
      const heap = performance.memory?.usedJSHeapSize;
      if (Number.isFinite(heap)) document.documentElement.dataset.qaHeapMb = (heap / 1048576).toFixed(1);
      qaFrameCount = 0;
      qaFrameWindowStart = now;
    }
  }

  hudT += dt;
  if (hudT > 0.08) {
    renderHUD(s, hudT);
    hudT = 0;
  }

  saveT += dt;
  if (saveT > 6) {
    saveT = 0;
    save(s);
  }

  requestAnimationFrame(frame);
}

async function boot() {
  await Promise.all([heroV3Load, syncRouteAssets()]);
  const currentRequests = currentMotionRequests();
  releaseColdMotion(assetStore.motionStore, motionKeepKeys(currentRequests));
  await warmMotionRequests(currentRequests);
  await warmCurrentAdvanceRequests(currentRequests);
  if (motionReviewPanel) {
    motionReviewSurface = mountMotionReviewSurface({
      panel: motionReviewPanel,
      motionPreview,
      locationLike: location,
    });
  }
  draw(view.ctx, view.w, view.h, s, assetStore, view.stageClearance);
  renderHUD(s, C.FIXED_DT);
  performance.mark?.('apn-first-playable');
  document.documentElement.dataset.firstPlayable = 'ready';
  if (!qaManualMode) requestAnimationFrame(frame);
  console.info('%cAPN Idle', 'color:#FC1243;font-weight:bold', '— All Patch Notes mini-game');
}

boot();
