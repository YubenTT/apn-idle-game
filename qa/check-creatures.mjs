/**
 * V3 creature contract — Curator/Recon/Hotshot playable atlas enemies.
 *
 * Locks the integration surface:
 *  - all 16 clip atlases exist (webp + json), hotshot keeps its filename prefix
 *  - every json honors the shared atlas contract (frames, fps, frameSize,
 *    foot anchor [0.5,1], trim rect, in-bounds frames)
 *  - content.js registers the three kinds with APN labels and the rotation
 *    resolver outside the approved GAF2D first pack
 *  - creatures.js exports the loader/blitter; render.js stages them with the
 *    boss broken phase mirrored below 34% HP
 * Run: node qa/check-creatures.mjs (also wired into qa/run-tests.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as creatureRuntime from '../js/creatures.js';
import * as renderRuntime from '../js/render.js';
import { CREATURES, creatureKindFor } from '../js/content.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Creatures: ${message}`);
  console.log(`OK ${message}`);
};
const {
  createCreatureStore,
  creatureClipReady,
  creatureStoreDecodedBytes,
  drawCreature,
  releaseColdCreatureKinds,
  warmCreatureKind,
} = creatureRuntime;
const {
  legacyCreatureKindForEnemy,
  legacyCreatureKindForStage,
} = renderRuntime;

const MANIFEST = {
  curator: { prefix: '', clips: ['idle', 'advance', 'attack', 'hit', 'death', 'broken'] },
  recon: { prefix: '', clips: ['idle', 'advance', 'attack', 'hit', 'death'] },
  hotshot: { prefix: 'hotshot-', clips: ['idle', 'advance', 'attack', 'hit', 'death'] },
};

let atlasCount = 0;
for (const [kind, m] of Object.entries(MANIFEST)) {
  for (const clip of m.clips) {
    const base = `${m.prefix}${clip}`;
    const jsonPath = path.join(root, 'assets/creatures', kind, `${base}.json`);
    const webpPath = path.join(root, 'assets/creatures', kind, `${base}.webp`);
    assert(fs.existsSync(jsonPath), `${kind}/${base}.json exists`);
    assert(fs.existsSync(webpPath), `${kind}/${base}.webp exists`);
    atlasCount += 1;

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert(data.name === base, `${kind}/${base}: json name field matches filename`);
    assert(Array.isArray(data.frames) && data.frames.length > 0, `${kind}/${base}: frames non-empty (${data.frames?.length})`);
    for (const [i, f] of data.frames.entries()) {
      assert(
        Number.isFinite(f.x) && Number.isFinite(f.y) && f.w > 0 && f.h > 0,
        `${kind}/${base}: frame ${i} rect sane (${f?.w}x${f?.h})`
      );
      if (data.atlas) {
        assert(
          f.x + f.w <= data.atlas.w && f.y + f.h <= data.atlas.h,
          `${kind}/${base}: frame ${i} inside atlas bounds`
        );
      }
    }
    assert(Number.isFinite(data.fps) && data.fps > 0, `${kind}/${base}: fps ${data.fps} > 0`);
    assert(data.frameSize === 256, `${kind}/${base}: frameSize 256`);
    assert(
      Array.isArray(data.anchor) && data.anchor[0] === 0.5 && data.anchor[1] === 1,
      `${kind}/${base}: foot anchor [0.5,1]`
    );
    const tr = data.trim;
    assert(tr && tr.x >= 0 && tr.y >= 0 && tr.w > 0 && tr.h > 0, `${kind}/${base}: trim rect sane (${tr?.w}x${tr?.h})`);
  }
}
assert(atlasCount === 16, `16 clip atlases on disk (${atlasCount})`);

// content.js registers the three kinds (APN labels, homage — no trademarks)
const contentSrc = fs.readFileSync(path.join(root, 'js/content.js'), 'utf8');
for (const kind of ['curator', 'recon', 'hotshot']) {
  assert(contentSrc.includes(kind), `content.js references kind: ${kind}`);
}
for (const label of ['The Curator', 'The Recon', 'The Hotshot']) {
  assert(contentSrc.includes(label), `content.js names ${label}`);
}
assert(contentSrc.includes('creatureKindFor'), 'content.js exposes creatureKindFor');

// creatures.js owner-specific loader contract
const creaturesSrc = fs.readFileSync(path.join(root, 'js/creatures.js'), 'utf8');
for (const sym of [
  'createCreatureStore',
  'warmCreatureKind',
  'releaseColdCreatureKinds',
  'drawCreature',
]) {
  assert(creaturesSrc.includes(sym), `creatures.js exports ${sym}`);
}
assert(
  [
    createCreatureStore,
    creatureStoreDecodedBytes,
    releaseColdCreatureKinds,
    warmCreatureKind,
  ].every((value) => typeof value === 'function'),
  'owner-specific loader API is callable',
);
assert(
  typeof legacyCreatureKindForEnemy === 'function',
  'actual-unmapped-owner selector is callable',
);
assert(
  typeof legacyCreatureKindForStage === 'function',
  'stage selector can inspect every live owner instead of only the first enemy',
);
assert(
  creaturesSrc.includes('owner-specific') &&
    !creaturesSrc.includes('export function loadCreatures') &&
    !creaturesSrc.includes('ORCHESTRATOR'),
  'creatures.js exposes no eager global loader',
);

const imageRequests = [];
const jsonRequests = [];
const decodedImages = [];
const creatureStore = createCreatureStore({
  loadImage: async (src) => {
    imageRequests.push(src);
    const image = {
      width: 64,
      height: 32,
      closed: 0,
      close() {
        this.closed += 1;
      },
    };
    decodedImages.push(image);
    return image;
  },
  loadJson: async (src) => {
    jsonRequests.push(src);
    return JSON.parse(fs.readFileSync(path.join(root, src), 'utf8'));
  },
});
await Promise.all([
  warmCreatureKind(creatureStore, 'recon'),
  warmCreatureKind(creatureStore, 'recon'),
]);
assert(
  imageRequests.length === 5 &&
    jsonRequests.length === 5 &&
    [...imageRequests, ...jsonRequests].every((src) =>
      src.startsWith('assets/creatures/recon/'),
    ),
  'one actual recon owner fetches and decodes only its five clips once',
);
assert(
  creatureClipReady('recon', 'idle', creatureStore) &&
    !creatureClipReady('curator', 'idle', creatureStore),
  'owner-specific warm leaves every unrequested creature kind cold',
);
assert(
  creatureStoreDecodedBytes(creatureStore) === 64 * 32 * 4 * 5,
  'runtime decoded accounting reports exact resident owner bytes',
);
const reconIdle = JSON.parse(
  fs.readFileSync(path.join(root, 'assets/creatures/recon/idle.json'), 'utf8'),
);
let creatureDrawArguments = null;
assert(
  drawCreature(
    {
      drawImage(...arguments_) {
        creatureDrawArguments = arguments_;
      },
    },
    'recon',
    'idle',
    0,
    100,
    200,
    reconIdle.trim.h,
    creatureStore,
  ) &&
    creatureDrawArguments?.[5] ===
      100 + reconIdle.trim.x - reconIdle.frameSize * reconIdle.anchor[0] &&
    creatureDrawArguments?.[6] ===
      200 + reconIdle.trim.y - reconIdle.frameSize * reconIdle.anchor[1],
  'legacy fallback blit reconstructs its full-frame foot pivot after union trimming',
);
const reconEnemyId = Array.from({ length: 60 }, (_, index) => `legacy-${index}`)
  .find(
    (id) =>
      creatureKindFor({ type: 'lag', id, packId: 'league' }, 0) ===
      'recon',
  );
let stagedCreatureDraw = null;
const stagedCreatureContext = new Proxy(
  {},
  {
    get(_target, key) {
      if (key === 'drawImage') {
        return (...arguments_) => {
          stagedCreatureDraw = arguments_;
        };
      }
      if (
        key === 'createLinearGradient' ||
        key === 'createRadialGradient'
      ) {
        return () => ({ addColorStop() {} });
      }
      return () => {};
    },
    set() {
      return true;
    },
  },
);
const stagedCreatureGeometry = renderRuntime.drawEnemy(
  stagedCreatureContext,
  {
    id: reconEnemyId,
    type: 'lag',
    packId: 'league',
    label: 'Feed Noise',
    frame: 'common-c',
    x: 220,
    displayX: 220,
    hp: 10,
    hpMax: 10,
    deathT: 0,
    hurt: 0,
    killed: false,
    priorityTagRank: 0,
  },
  300,
  1,
  null,
  { creatureStore },
  true,
  1,
  { zone: 0, meleeStop: 170, engagedId: null },
);
assert(
  stagedCreatureGeometry.role === 'standard' &&
    stagedCreatureGeometry.body.height === 72 &&
    stagedCreatureGeometry.body.bottom === 298 &&
    stagedCreatureGeometry.visualGap === 2 &&
    stagedCreatureDraw?.[8] === 72,
  'legacy creature atlas consumes the standard 72 px geometry without auto-assigning elite scale',
);

function secondFrameBodyScale({ enemy, packAssets, store }) {
  const scales = [];
  const context = new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'scale') {
          return (x, y) => scales.push([x, y]);
        }
        if (
          key === 'createLinearGradient' ||
          key === 'createRadialGradient'
        ) {
          return () => ({ addColorStop() {} });
        }
        return () => {};
      },
      set() {
        return true;
      },
    },
  );
  const env = {
    zone: 23,
    meleeStop: 170,
    engagedId: null,
    retentionOwner: enemy,
  };
  for (const time of [2, 2.5]) {
    renderRuntime.drawEnemy(
      context,
      { ...enemy },
      300,
      time,
      packAssets,
      store,
      true,
      1,
      env,
    );
  }
  return scales.at(-1);
}

const persistentStaticEnemy = {
  id: 'storm-runner-visibility-regression',
  type: 'stale',
  packId: 'fortnite',
  label: 'Storm Runner',
  frame: 'common-a',
  x: 220,
  displayX: 220,
  hp: 10,
  hpMax: 10,
  deathT: 0,
  hurt: 0,
  killed: false,
  priorityTagRank: 0,
};
const staticPackAssets = {
  ready: true,
  pack: {
    id: 'fortnite',
    targets: [
      {
        id: 'storm-runner',
        role: 'common-a',
        label: 'Storm Runner',
        frame: 'common-a',
      },
    ],
    boss: { id: 'stormcore-warden', frame: 'boss' },
  },
  targets: {
    _ready: true,
    complete: true,
    naturalWidth: 896,
    naturalHeight: 128,
  },
  targetData: {
    frames: {
      'common-a': { rect: { x: 0, y: 0, w: 128, h: 128 } },
    },
  },
};
const visibilityMotionStore = {
  motionStore: { entries: new Map(), diagnostics: new Map() },
};
const staticSecondFrameScale = secondFrameBodyScale({
  enemy: persistentStaticEnemy,
  packAssets: staticPackAssets,
  store: visibilityMotionStore,
});
assert(
  staticSecondFrameScale?.[0] > 0.99 &&
    staticSecondFrameScale?.[1] > 0.99,
  'interpolated static Pack target completes spawn scale for one persistent actor',
);

const persistentLegacyEnemy = {
  ...persistentStaticEnemy,
  id: reconEnemyId,
  type: 'lag',
  packId: 'league',
  label: 'Lane Scout',
  frame: 'common-c',
};
const legacySecondFrameScale = secondFrameBodyScale({
  enemy: persistentLegacyEnemy,
  packAssets: {
    ready: true,
    pack: {
      id: 'league',
      targets: [{ id: 'lane-scout', role: 'common-c' }],
      boss: { id: 'lane-boss' },
    },
  },
  store: { ...visibilityMotionStore, creatureStore },
});
assert(
  legacySecondFrameScale?.[0] > 0.99 &&
    legacySecondFrameScale?.[1] > 0.99,
  'interpolated legacy creature completes spawn scale for one persistent actor',
);
releaseColdCreatureKinds(creatureStore, new Set(['hotshot']));
assert(
  creatureStoreDecodedBytes(creatureStore) === 0 &&
    decodedImages.every((image) => image.closed === 1),
  'releasing the owner closes every resident bitmap exactly once',
);

const legacyEnemy = {
  id: 'legacy-elite-1',
  type: 'lag',
  packId: 'league',
};
const legacyPack = {
  id: 'league',
  targets: [
    { id: 'lane-a', role: 'common-a' },
    { id: 'lane-b', role: 'common-b' },
    { id: 'lane-scout', role: 'common-c' },
    { id: 'lane-elite', role: 'elite' },
    { id: 'lane-event', role: 'event' },
  ],
  boss: { id: 'lane-boss' },
};
const emptyMotionStore = {
  motionStore: { entries: new Map(), diagnostics: new Map() },
};
assert(
  ['recon', 'hotshot'].includes(
    legacyCreatureKindForEnemy(
      legacyEnemy,
      { pack: legacyPack },
      emptyMotionStore,
      { zone: 10 },
    ),
  ),
  'actual unmapped legacy elite resolves exactly one owner-specific kind',
);
legacyPack.motion = {
  grammar: 'gaf2d-motion-bundle-v1',
  characters: {
    'lane-scout': {
      image: 'unused.webp',
      descriptor: 'unused.json',
      descriptorSha256: 'a'.repeat(64),
    },
  },
};
assert(
  legacyCreatureKindForEnemy(
    legacyEnemy,
    { pack: legacyPack },
    emptyMotionStore,
    { zone: 10 },
  ) === null,
  'mapped pack identity never requests a legacy creature owner',
);
const unmappedEvent = {
  id: 'legacy-event-2',
  type: 'event',
  packId: 'league',
  hp: 20,
};
assert(
  ['recon', 'hotshot'].includes(
    legacyCreatureKindForStage(
      [{ ...legacyEnemy, hp: 20 }, unmappedEvent],
      { pack: legacyPack },
      emptyMotionStore,
      { zone: 10 },
    ),
  ),
  'stage selector skips a mapped first enemy and finds a later live unmapped owner',
);

// render.js stages creature kinds + mirrors the boss broken phase
const renderSrc = fs.readFileSync(path.join(root, 'js/render.js'), 'utf8');
assert(renderSrc.includes('drawCreature') && renderSrc.includes('creatureKindFor'), 'render.js draws creature kinds');
assert(renderSrc.includes('broken') && renderSrc.includes('0.34'), 'render.js mirrors the <34% HP broken phase');
assert(
  !renderSrc.includes('warmCreatureKind('),
  'render hot path never starts a legacy creature fetch or decode',
);
const mainSrc = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
assert(
  mainSrc.includes('warmCreatureKind(') &&
    mainSrc.includes('legacyCreatureKindForStage(') &&
    !mainSrc.includes('loadCreatures('),
  'main warms only the actual unmapped owner outside draw and has no global boot loader',
);

// runtime rotation contract (pure, deterministic)
assert(
  CREATURES.curator.role === 'boss' && CREATURES.recon.role === 'elite' && CREATURES.hotshot.role === 'elite',
  'creature roles locked (boss + two elites)'
);
assert(
  creatureKindFor({ type: 'boss', id: 'b1', packId: 'league' }, 9) === 'curator',
  'legacy first boss ordinal can field The Curator outside Valorant',
);
assert(
  creatureKindFor({ type: 'boss', id: 'b1', packId: 'league' }, 19) === null,
  'legacy second boss ordinal keeps Version Gate',
);
for (const type of ['lag', 'spoiler', 'event']) {
  const kind = creatureKindFor({ type, id: `elite-${type}` }, 0);
  assert(kind === 'recon' || kind === 'hotshot', `elite ${type} rotates to a creature (${kind})`);
}
const seen = new Set();
for (let i = 0; i < 60; i += 1) seen.add(creatureKindFor({ type: 'lag', id: `spawn-${i}` }, 0));
assert(seen.has('recon') && seen.has('hotshot'), 'both elite creatures appear across spawns');
assert(creatureKindFor({ type: 'stale', id: 'n1' }, 0) === null, 'normal feed-noise kinds untouched');
assert(creatureKindFor({ type: 'rumor', id: 'n2' }, 0) === null, 'rumor stays procedural');
assert(creatureKindFor({ type: 'patch', id: 'n3' }, 0) === null, 'Patch Note stays procedural');
for (const type of ['boss', 'lag', 'spoiler', 'event']) {
  assert(
    creatureKindFor({ type, id: `gaf2d-${type}`, packId: 'valorant' }, 9) === null,
    `Valorant ${type} keeps its GAF2D pack body`,
  );
}

console.log('Creatures: ALL PASS');
