/**
 * V3 creature contract — Curator/Recon/Hotshot playable atlas enemies.
 *
 * Locks the integration surface:
 *  - all 16 clip atlases exist (webp + json), hotshot keeps its filename prefix
 *  - every json honors the shared atlas contract (frames, fps, frameSize,
 *    foot anchor [0.5,1], trim rect, in-bounds frames)
 *  - content.js registers the three kinds with APN labels and the rotation
 *    resolver (elites → recon/hotshot, odd boss zones → curator, nothing removed)
 *  - creatures.js exports the loader/blitter; render.js stages them with the
 *    boss broken phase mirrored below 34% HP
 * Run: node qa/check-creatures.mjs (also wired into qa/run-tests.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Creatures: ${message}`);
  console.log(`OK ${message}`);
};

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

// creatures.js loader contract
const creaturesSrc = fs.readFileSync(path.join(root, 'js/creatures.js'), 'utf8');
for (const sym of ['loadCreatures', 'creaturesReady', 'drawCreature']) {
  assert(creaturesSrc.includes(sym), `creatures.js exports ${sym}`);
}
assert(creaturesSrc.includes('ORCHESTRATOR'), 'creatures.js carries the boot wiring note');

// render.js stages creature kinds + mirrors the boss broken phase
const renderSrc = fs.readFileSync(path.join(root, 'js/render.js'), 'utf8');
assert(renderSrc.includes('drawCreature') && renderSrc.includes('creatureKindFor'), 'render.js draws creature kinds');
assert(renderSrc.includes('broken') && renderSrc.includes('0.34'), 'render.js mirrors the <34% HP broken phase');

// runtime rotation contract (pure, deterministic)
const { CREATURES, creatureKindFor } = await import('../js/content.js');
assert(
  CREATURES.curator.role === 'boss' && CREATURES.recon.role === 'elite' && CREATURES.hotshot.role === 'elite',
  'creature roles locked (boss + two elites)'
);
assert(creatureKindFor({ type: 'boss', id: 'b1' }, 9) === 'curator', 'first boss zone fields The Curator');
assert(creatureKindFor({ type: 'boss', id: 'b1' }, 19) === null, 'second boss zone keeps Version Gate');
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

console.log('Creatures: ALL PASS');
