import * as game from '../js/game.js';
import * as render from '../js/render.js';
import * as heroV2 from '../js/hero-v2.js';
import { resolveHostClip } from '../js/host-contract.js';
import { pickV3 } from '../js/hero-v3.js';
import { save, SAVE_KEY_V2 } from '../js/save.js';

let failures = 0;
const check = (condition, message) => {
  if (condition) {
    console.log(`OK HeroMotion: ${message}`);
    return;
  }
  console.error(`FAIL HeroMotion: ${message}`);
  failures += 1;
};

const authoredFrameCounts = {
  idle: 8,
  run: 10,
  attack: 8,
  crit: 8,
  sprint: 10,
  hit: 4,
  death: 8,
  celebrate: 8,
};
const fakeClips = Object.fromEntries(
  Object.entries(authoredFrameCounts).map(([name, frames]) => [
    name,
    {
      fps: name === 'sprint' ? 20 : name === 'idle' ? 12 : 16,
      frames: Array.from({ length: frames }, (_, index) => ({ index })),
    },
  ]),
);
const effectGeometry = Object.freeze({
  anchors: Object.freeze({
    floaterY: 211,
    hitX: 222,
    hitY: 233,
    lootX: 224,
    lootY: 247,
  }),
});

function stateAfterOutgoingAttack(randomValue) {
  const originalRandom = Math.random;
  Math.random = () => randomValue;
  try {
    const state = game.createState();
    state.settings.sfx = false;
    state.run.hero.skills.sharp_eye = 1;
    const enemy = game.spawnEnemy(state);
    enemy.hp = 1_000_000;
    enemy.hpMax = enemy.hp;
    enemy.x = state.world.heroX;
    enemy.displayX = enemy.x;
    state.world.enemies = [enemy];
    state.world.actorGeometries = new Map([[enemy.id, effectGeometry]]);
    state.world.attackCd = 0;
    game.step(state, 1 / 60, { allowSpawn: false });
    return state;
  } finally {
    Math.random = originalRandom;
  }
}

check(
  typeof render.heroRuntimeSemantics === 'function',
  'renderer exposes one testable Hero semantic projection',
);

const ordinaryState = stateAfterOutgoingAttack(1);
check(
  ordinaryState.run.hero.hitRecoil === 0,
  'outgoing damage never triggers the Hero incoming-hit reaction',
);
check(
  ordinaryState.run.hero.attackCrit === false,
  'ordinary RNG attack records an ordinary authored strike',
);
check(
  resolveHostClip({ attack: 1, crit: false }) === 'scan',
  'ordinary attack selects the non-crit Host pose',
);

const critState = stateAfterOutgoingAttack(0);
check(
  critState.run.hero.hitRecoil === 0,
  'outgoing critical damage never triggers the Hero incoming-hit reaction',
);
check(
  critState.run.hero.attackCrit === true,
  'actual RNG critical hit records a critical authored strike',
);
check(
  ordinaryState.world.floaters.at(-1)?.anchorId ===
      ordinaryState.world.enemies[0]?.id &&
    ordinaryState.world.floaters.at(-1)?.originX ===
      effectGeometry.anchors.hitX &&
    ordinaryState.world.floaters.at(-1)?.originY ===
      effectGeometry.anchors.floaterY,
  'ordinary damage floater snapshots the resolved enemy floater anchor',
);
check(
  critState.world.shocks.at(-1)?.anchorId ===
      critState.world.enemies[0]?.id &&
    critState.world.shocks.at(-1)?.x === effectGeometry.anchors.hitX &&
    critState.world.shocks.at(-1)?.y === effectGeometry.anchors.hitY,
  'critical shock ring snapshots the resolved enemy hit anchor',
);
check(
  resolveHostClip({ attack: 1, crit: true }) === 'crit',
  'only an actual critical hit selects the crit Host pose',
);

function stateAfterEnemyKill() {
  const originalRandom = Math.random;
  Math.random = () => 1;
  try {
    const state = game.createState();
    state.settings.sfx = false;
    const enemy = game.spawnEnemy(state);
    enemy.hp = 0.01;
    enemy.hpMax = 1;
    enemy.x = state.world.heroX;
    enemy.displayX = enemy.x;
    state.world.enemies = [enemy];
    state.world.actorGeometries = new Map([[enemy.id, effectGeometry]]);
    state.world.attackCd = 0;
    game.step(state, 1 / 60, { allowSpawn: false });
    return { state, enemy };
  } finally {
    Math.random = originalRandom;
  }
}
const killedEnemyEffects = stateAfterEnemyKill();
check(
  killedEnemyEffects.state.world.lootFlights.some(
    (flight) =>
      flight.enemyId === killedEnemyEffects.enemy.id &&
      flight.x === effectGeometry.anchors.lootX &&
      flight.y === effectGeometry.anchors.lootY,
  ),
  'loot flight snapshots the resolved enemy loot anchor',
);
check(
  killedEnemyEffects.state.world.particles.some(
    (particle) =>
      particle.anchorId === killedEnemyEffects.enemy.id &&
      particle.originX === effectGeometry.anchors.hitX &&
      particle.originY === effectGeometry.anchors.hitY,
  ) &&
    killedEnemyEffects.state.world.shocks.some(
      (shock) =>
        shock.anchorId === killedEnemyEffects.enemy.id &&
        shock.x === effectGeometry.anchors.hitX &&
        shock.y === effectGeometry.anchors.hitY,
    ),
  'death particles and rings share the resolved enemy hit anchor',
);

if (typeof render.heroRuntimeSemantics === 'function') {
  const ordinarySemantics = render.heroRuntimeSemantics(
    ordinaryState,
    ordinaryState.world.time,
  );
  const critSemantics = render.heroRuntimeSemantics(
    critState,
    critState.world.time,
  );
  check(
    ordinarySemantics.selector.crit === false &&
      pickV3(ordinarySemantics.selector, fakeClips)?.clip === 'attack',
    'ordinary combat state selects the authored attack clip',
  );
  check(
    critSemantics.selector.crit === true &&
      pickV3(critSemantics.selector, fakeClips)?.clip === 'crit',
    'actual RNG critical combat state exclusively selects the authored crit clip',
  );
}

for (const clip of ['attack', 'crit']) {
  const start = pickV3(
    { t: 0, attack: 1, crit: clip === 'crit', recoil: 0 },
    fakeClips,
  );
  const middle = pickV3(
    { t: 0, attack: 0.5, crit: clip === 'crit', recoil: 0 },
    fakeClips,
  );
  const end = pickV3(
    { t: 0, attack: 0.03, crit: clip === 'crit', recoil: 0 },
    fakeClips,
  );
  check(
    start?.clip === clip &&
      start.frame === 0 &&
      middle?.frame > start.frame &&
      end?.frame >= middle.frame,
    `${clip} authored frames advance from wind-up to follow-through`,
  );
}

function sampleFixedSimulation(state, refreshHz, seconds) {
  const samples = [];
  let accumulator = 0;
  const repaintSeconds = 1 / refreshHz;
  const fixedSeconds = 1 / 60;
  const repaintCount = Math.ceil(seconds * refreshHz);
  for (let repaint = 0; repaint < repaintCount; repaint += 1) {
    samples.push(
      pickV3(
        render.heroRuntimeSemantics(state, state.world.time).selector,
        fakeClips,
      ),
    );
    accumulator += repaintSeconds;
    while (accumulator + 1e-12 >= fixedSeconds) {
      game.step(state, fixedSeconds, { allowSpawn: false });
      accumulator -= fixedSeconds;
    }
  }
  return samples;
}

const uniqueFrames = (samples, clip) => {
  const frames = [];
  for (const selected of samples) {
    if (
      selected?.clip === clip &&
      Number.isInteger(selected.frame) &&
      frames.at(-1) !== selected.frame
    ) {
      frames.push(selected.frame);
    }
  }
  return frames;
};

function authoredAttackSamples(refreshHz, critical = false) {
  const state = stateAfterOutgoingAttack(critical ? 0 : 1);
  state.world.enemies = [];
  state.world.attackCd = 999;
  return sampleFixedSimulation(state, refreshHz, 8 / 16);
}

for (const [clip, critical] of [
  ['attack', false],
  ['crit', true],
]) {
  for (const refreshHz of [60, 120]) {
    check(
      uniqueFrames(
        authoredAttackSamples(refreshHz, critical),
        clip,
      ).join(',') === '0,1,2,3,4,5,6,7',
      `8-frame authored ${clip} advances once through every frame at ${refreshHz} Hz`,
    );
  }
  const at60 = authoredAttackSamples(60, critical);
  const at120On60HzTicks = authoredAttackSamples(
    120,
    critical,
  ).filter((_sample, index) => index % 2 === 0);
  check(
    at60.every(
      (sample, index) =>
        sample?.clip === at120On60HzTicks[index]?.clip &&
        sample?.frame === at120On60HzTicks[index]?.frame,
    ),
    `60 Hz and 120 Hz repaints observe the same authored ${clip} frame at equal fixed-simulation times`,
  );
}

function continuousCombatCycles(sprinting) {
  const originalRandom = Math.random;
  Math.random = () => 1;
  try {
    const state = game.createState();
    state.settings.sfx = false;
    state.world.sprinting = sprinting;
    state.ui.sprintWanted = sprinting;
    state.run.hero.energy = 1_000;
    const enemy = game.spawnEnemy(state);
    enemy.hp = 1_000_000_000;
    enemy.hpMax = enemy.hp;
    enemy.x = state.world.heroX;
    enemy.displayX = enemy.x;
    state.world.enemies = [enemy];
    state.world.spawnCd = 999;
    state.world.attackCd = 0;

    const cycles = [];
    let current = [];
    let previousFrame = null;
    for (let tick = 0; tick < 180; tick += 1) {
      const selected = pickV3(
        render.heroRuntimeSemantics(state, state.world.time).selector,
        fakeClips,
      );
      if (selected?.clip === 'attack') {
        if (
          Number.isInteger(previousFrame) &&
          selected.frame < previousFrame
        ) {
          cycles.push(current);
          current = [];
        }
        if (current.at(-1) !== selected.frame) current.push(selected.frame);
        previousFrame = selected.frame;
      }
      game.step(state, 1 / 60, { allowSpawn: false });
    }
    if (current.length > 0) cycles.push(current);
    return cycles;
  } finally {
    Math.random = originalRandom;
  }
}

for (const sprinting of [false, true]) {
  const cycles = continuousCombatCycles(sprinting);
  check(
    cycles.length >= 2 &&
      cycles
        .slice(0, 2)
        .every((frames) => frames.join(',') === '0,1,2,3,4,5,6,7'),
    `continuous ${sprinting ? 'sprint' : 'base'} combat never truncates an authored attack cycle`,
  );
}

function authoredProgressSamples(refreshHz, configure, durationSeconds) {
  const state = game.createState();
  state.world.enemies = [];
  state.world.spawnCd = 999;
  state.world.attackCd = 999;
  configure(state);
  return sampleFixedSimulation(
    state,
    refreshHz,
    durationSeconds,
  );
}

for (const refreshHz of [60, 120]) {
  check(
    uniqueFrames(
      authoredProgressSamples(
        refreshHz,
        (state) => game.triggerHeroHitReaction(state),
        4 / 16,
      ),
      'hit',
    ).join(',') === '0,1,2,3',
    `4-frame authored hit advances once through every frame at ${refreshHz} Hz`,
  );
  check(
    uniqueFrames(
      authoredProgressSamples(
        refreshHz,
        (state) => {
          state.run.hero.defeatT = 1;
        },
        8 / 16,
      ),
      'death',
    ).join(',') === '0,1,2,3,4,5,6,7',
    `8-frame authored death advances once through every frame at ${refreshHz} Hz`,
  );
}
for (const [clip, duration, configure] of [
  ['hit', 4 / 16, (state) => game.triggerHeroHitReaction(state)],
  [
    'death',
    8 / 16,
    (state) => {
      state.run.hero.defeatT = 1;
    },
  ],
]) {
  const at60 = authoredProgressSamples(60, configure, duration);
  const at120On60HzTicks = authoredProgressSamples(
    120,
    configure,
    duration,
  ).filter((_sample, index) => index % 2 === 0);
  check(
    at60.every(
      (sample, index) =>
        sample?.clip === at120On60HzTicks[index]?.clip &&
        sample?.frame === at120On60HzTicks[index]?.frame,
    ),
    `60 Hz and 120 Hz repaints observe the same authored ${clip} frame at equal fixed-simulation times`,
  );
}

check(
  pickV3(
    { t: 0, attack: 0, crit: false, recoil: 0.8 },
    fakeClips,
  )?.frame === 0,
  'hit progress uses equal authored frame bins',
);
check(
  pickV3(
    { t: 0, attack: 0, crit: false, recoil: 0, defeatT: 0.9 },
    fakeClips,
  )?.frame === 0,
  'death progress uses equal authored frame bins',
);

function captureHeroShadow(options) {
  const stack = [];
  const state = {
    tx: 0,
    ty: 0,
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
  };
  const shadows = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    save() {
      stack.push({ ...state });
    },
    restore() {
      Object.assign(state, stack.pop());
    },
    translate(x, y) {
      state.tx += x;
      state.ty += y;
    },
    rotate() {},
    scale() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    arc() {},
    clip() {},
    fill() {},
    stroke() {},
    fillRect() {},
    createLinearGradient() {
      return gradient;
    },
    createRadialGradient() {
      return gradient;
    },
    ellipse(x, y, radiusX, radiusY) {
      if (state.fillStyle === 'rgba(4,8,12,0.2)') {
        shadows.push({
          x: state.tx + x,
          y: state.ty + y,
          radiusX,
          radiusY,
        });
      }
    },
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(value) {
      state.fillStyle = value;
    },
    get strokeStyle() {
      return state.strokeStyle;
    },
    set strokeStyle(value) {
      state.strokeStyle = value;
    },
    get globalAlpha() {
      return state.globalAlpha;
    },
    set globalAlpha(value) {
      state.globalAlpha = value;
    },
  };
  heroV2.drawHeroV2(ctx, 120, 300, {
    drawTrimHeight: 96,
    pivotY: 294,
    geometry: {
      anchors: { shadowX: 120, shadowY: 300 },
    },
    height: 96,
    time: 0.25,
    energy: 100,
    ...options,
  });
  return shadows;
}

const neutralShadow = captureHeroShadow({
  pose: 'run',
  motionSelector: { t: 0.25, pose: 'run' },
});
const jumpShadow = captureHeroShadow({
  pose: 'level',
  levelT: 0.5,
  motionSelector: { t: 0.25, levelT: 0.5, pose: 'level' },
});
const hoverShadow = captureHeroShadow({
  pose: 'overdrive',
  overdrive: true,
  motionSelector: { t: 0.25, overdrive: true, pose: 'overdrive' },
});
const strikeShadow = captureHeroShadow({
  pose: 'crit',
  attack: 0.8,
  crit: true,
  motionSelector: { t: 0.25, attack: 0.8, crit: true, pose: 'crit' },
});
check(
  [neutralShadow, jumpShadow, hoverShadow, strikeShadow].every(
    (calls) => calls.length === 1,
  ) &&
    [jumpShadow, hoverShadow, strikeShadow].every(
      (calls) => calls[0].y === neutralShadow[0].y,
    ),
  'renderer-owned Hero shadow keeps one fixed ground Y through jump, hover, and authored clip changes',
);

const floaterState = game.createState();
floaterState.world.groundY = 300;
floaterState.world.stageFit = 1;
floaterState.run.bytes = 1_000_000;
floaterState.settings.sfx = false;
check(
  game.buyScanner(floaterState) === true &&
    floaterState.world.floaters.at(-1)?.y === 180,
  'Hero floater clearance uses the 96 px role body plus the documented 24 px margin',
);

const sharedSelectorState = game.createState();
sharedSelectorState.run.hero.attackAnim = 0.25;
sharedSelectorState.run.hero.attackCrit = true;
const sharedSemantics = render.heroRuntimeSemantics(sharedSelectorState, 0.375);
const inspectedFrame = pickV3(sharedSemantics.selector, fakeClips);
check(
  typeof heroV2.selectHeroV3Frame === 'function',
  'V3 body exposes the selector path used by the visible renderer',
);
if (typeof heroV2.selectHeroV3Frame === 'function') {
  const renderedFrame = heroV2.selectHeroV3Frame(
    {
      time: 0.375,
      attack: sharedSemantics.attack,
      crit: sharedSemantics.pose === 'crit',
      motionSelector: sharedSemantics.selector,
    },
    {
      t: 0.375,
      attack: sharedSemantics.attack,
      crit: sharedSemantics.pose === 'crit',
      recoil: 0,
      over: false,
    },
    fakeClips,
  );
  check(
    inspectedFrame?.clip === 'crit' &&
      inspectedFrame.frame === 6 &&
      renderedFrame?.clip === inspectedFrame.clip &&
      renderedFrame.frame === inspectedFrame.frame,
    'visible V3 body and inspector share the exact late-strike selector semantics',
  );
}

check(
  typeof game.triggerHeroHitReaction === 'function',
  'game exposes an explicit incoming-hit reaction instead of reusing outgoing damage',
);
if (typeof game.triggerHeroHitReaction === 'function') {
  const incomingState = game.createState();
  game.triggerHeroHitReaction(incomingState);
  const semantics =
    typeof render.heroRuntimeSemantics === 'function'
      ? render.heroRuntimeSemantics(incomingState, 0)
      : null;
  check(
    incomingState.run.hero.hitRecoil === 1 &&
      semantics?.pose === 'damage' &&
      pickV3(semantics?.selector, fakeClips)?.clip === 'hit',
    'genuine Hero incoming damage selects the authored hit clip',
  );
  const reducedIncomingState = game.createState();
  reducedIncomingState.settings.reducedMotion = true;
  game.triggerHeroHitReaction(reducedIncomingState);
  check(
    reducedIncomingState.run.hero.hitRecoil === 1,
    'reduced motion preserves the incoming-hit semantic clock',
  );
}

const reducedDeathState = game.createState();
reducedDeathState.settings.reducedMotion = true;
reducedDeathState.route.zone = 9;
const reducedDeathBoss = game.spawnEnemy(reducedDeathState);
reducedDeathState.world.enemies = [reducedDeathBoss];
reducedDeathState.world.bossActive = true;
reducedDeathState.world.bossTimer = 0;
reducedDeathState.world.spawnCd = 999;
reducedDeathState.world.attackCd = 999;
game.step(reducedDeathState, 1 / 60, { allowSpawn: false });
check(
  reducedDeathState.run.hero.defeatT === 1,
  'reduced motion preserves the natural Hero death semantic clock',
);

let persisted = null;
globalThis.localStorage = {
  getItem: () => null,
  setItem: (key, value) => {
    if (key === SAVE_KEY_V2) persisted = value;
  },
};
const transientState = game.createState();
transientState.run.hero.attackAnim = 1;
transientState.run.hero.attackCrit = true;
transientState.run.hero.attackQueued = true;
transientState.run.hero.queuedAttackCrit = true;
transientState.run.hero.hitRecoil = 1;
check(
  save(transientState) === true,
  'transient Hero motion state can be normalized into a save',
);
const persistedHero = JSON.parse(persisted).run.hero;
check(
  persistedHero.attackAnim === 0 &&
    persistedHero.attackCrit === false &&
    persistedHero.attackQueued === false &&
    persistedHero.queuedAttackCrit === false &&
    persistedHero.hitRecoil === 0,
  'save normalization clears current, queued, crit, and incoming-hit transients together',
);

if (failures > 0) {
  console.error(`HeroMotion: ${failures} failure(s)`);
  process.exit(1);
}

console.log('HeroMotion: ALL PASS');
