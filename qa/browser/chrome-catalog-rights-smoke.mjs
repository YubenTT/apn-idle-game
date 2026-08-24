import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildCatalog,
  catalogModuleSource,
} from '../../scripts/assets/generate-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(
  process.argv[2] || path.join(os.tmpdir(), 'apn-catalog-rights-evidence'),
);
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-catalog-browser-'));
const chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-catalog-chrome-'));
const appPort = 8794;
const chromePort = 9388;

const assert = (condition, message) => {
  if (!condition) throw new Error(`Chrome catalog rights smoke: ${message}`);
  console.log(`OK ${message}`);
};
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function isCanvasReadbackInstrumentationWarning(event) {
  return (
    event.method === 'Log.entryAdded' &&
    event.params?.entry?.source === 'rendering' &&
    /Multiple readback operations using getImageData/.test(
      event.params?.entry?.text || '',
    )
  );
}

function resolveChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'darwin' && fs.existsSync(mac)) return mac;
  for (const name of [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ]) {
    try {
      const found = execFileSync('which', [name], { encoding: 'utf8' }).trim();
      if (found) return found;
    } catch {}
  }
  throw new Error('No Chrome/Chromium binary found (set CHROME_BIN)');
}

function copyFixtureShell() {
  fs.mkdirSync(output, { recursive: true });
  fs.copyFileSync(path.join(root, 'index.html'), path.join(fixtureRoot, 'index.html'));
  for (const directory of ['js', 'css', 'brand', 'tools']) {
    fs.cpSync(path.join(root, directory), path.join(fixtureRoot, directory), {
      recursive: true,
    });
  }
  fs.symlinkSync(path.join(root, 'assets'), path.join(fixtureRoot, 'assets'), 'dir');
}

function writeCatalog(packs, policy) {
  fs.writeFileSync(
    path.join(fixtureRoot, 'js/generated/game-packs.js'),
    catalogModuleSource(packs, policy),
  );
}

function connect(url) {
  const socket = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  const events = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else {
      events.push(message);
    }
  };
  const opened = new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  return {
    opened,
    events,
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close: () => socket.close(),
  };
}

async function waitFor(url, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`${label} did not start`);
}

async function createPage() {
  const response = await fetch(
    `http://127.0.0.1:${chromePort}/json/new?about:blank`,
    { method: 'PUT' },
  );
  if (!response.ok) throw new Error(`Unable to create Chrome page: ${response.status}`);
  return response.json();
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        'Chrome evaluation failed',
    );
  }
  return result.result.value;
}

async function waitForExpression(cdp, expression, label) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return;
    await delay(25);
  }
  throw new Error(`${label} did not settle`);
}

async function measureActorVisibility(cdp) {
  const value = await evaluate(cdp, `JSON.stringify((() => {
    const q = window.__APN_QA__;
    const enemy = q?.state?.world?.enemies?.find((candidate) => candidate.hp > 0);
    const actor = q?.presentation?.()?.actors?.find((entry) => entry.id === enemy?.id);
    const canvas = document.querySelector('#game');
    if (!enemy || !actor?.geometry?.body || !canvas) {
      return { error: 'missing live enemy geometry' };
    }
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const body = actor.geometry.body;
    const left = Math.max(0, Math.floor(body.left * scaleX));
    const top = Math.max(0, Math.floor(body.top * scaleY));
    const right = Math.min(canvas.width, Math.ceil(body.right * scaleX));
    const bottom = Math.min(canvas.height, Math.ceil(body.bottom * scaleY));
    const width = right - left;
    const height = bottom - top;
    const stateBefore = JSON.stringify(q.state);
    const textBefore = window.render_game_to_text();
    const withActor = context.getImageData(left, top, width, height).data.slice();
    const savedEnemies = q.state.world.enemies;
    let withoutActor;
    try {
      q.state.world.enemies = [];
      window.advanceTime(0);
      withoutActor = context.getImageData(left, top, width, height).data.slice();
    } finally {
      q.state.world.enemies = savedEnemies;
      window.advanceTime(0);
    }
    const stateAfter = JSON.stringify(q.state);
    const textAfter = window.render_game_to_text();
    let changed = 0;
    let strong = 0;
    let maximum = 0;
    for (let index = 0; index < withActor.length; index += 4) {
      const difference =
        Math.abs(withActor[index] - withoutActor[index]) +
        Math.abs(withActor[index + 1] - withoutActor[index + 1]) +
        Math.abs(withActor[index + 2] - withoutActor[index + 2]);
      if (difference > 18) changed += 1;
      if (difference > 90) strong += 1;
      maximum = Math.max(maximum, difference);
    }
    const text = JSON.parse(window.render_game_to_text());
    return {
      packId: text.packId,
      enemy: text.enemy,
      motion: text.motion,
      body,
      pixels: withActor.length / 4,
      changed,
      strong,
      maximum,
      stateStable: stateAfter === stateBefore,
      textStable: textAfter === textBefore,
      enemyIdentityStable:
        q.state.world.enemies === savedEnemies && savedEnemies.includes(enemy),
    };
  })())`);
  return JSON.parse(value);
}

function assertActorVisible(visibility, label) {
  assert(!visibility.error, `${label} exposes a live actor body envelope`);
  assert(
    visibility.stateStable &&
      visibility.textStable &&
      visibility.enemyIdentityStable,
    `${label} visibility measurement preserves exact domain state, text projection, and enemy identity`,
  );
  const minimumStrongPixels = Math.max(
    40,
    Math.min(100, Math.ceil(visibility.pixels * 0.005)),
  );
  assert(
    visibility.strong >= minimumStrongPixels && visibility.maximum > 90,
    `${label} paints a material body (${visibility.strong}/${visibility.pixels} strong-difference pixels, minimum ${minimumStrongPixels}, max ${visibility.maximum})`,
  );
}

async function capture(cdp, name) {
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  fs.writeFileSync(
    path.join(output, `${name}.png`),
    Buffer.from(screenshot.data, 'base64'),
  );
}

async function scenario({ label, packs, policy, expectedId, fallback = false }) {
  writeCatalog(packs, policy);
  const page = await createPage();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 428,
    height: 926,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp.send('Page.navigate', {
    url:
      `http://127.0.0.1:${appPort}/?autostart=1&mute=1&chrome-smoke=1&qa-manual=1&rights-fixture=${label}`,
  });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const q = window.__APN_QA__;
        const record = q?.assets?.packs?.get(q?.assets?.currentId);
        return Boolean(q?.assets?.currentId && record && (record.ready || record.error));
      })()`,
      returnByValue: true,
    });
    if (ready.result.value) break;
    await delay(100);
  }
  await waitForExpression(
    cdp,
    `document.documentElement.dataset.firstPlayable === 'ready'`,
    `${label} first playable`,
  );
  await evaluate(cdp, `(() => {
    Math.random = () => 0.9;
    window.__APN_QA__.state.world.spawnCd = 0;
    window.advanceTime(17);
    window.advanceTime(400);
    return true;
  })()`);
  await waitForExpression(
    cdp,
    `window.__APN_QA__.state.world.enemies.some((enemy) => enemy.hp > 0)`,
    `${label} enemy spawn`,
  );
  const visibility = await measureActorVisibility(cdp);
  await capture(cdp, `${label}-combat`);
  assertActorVisible(visibility, `${label} body path`);
  await cdp.send('Runtime.evaluate', {
    expression: `document.querySelector('.nav-btn[data-panel="hub"]')?.click()`,
    returnByValue: true,
  });
  await delay(150);
  const evaluation = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const q = window.__APN_QA__;
      const record = q.assets.packs.get(q.assets.currentId);
      const pack = q.assets.catalog.find((item) => item.id === q.assets.currentId);
      const canvas = document.querySelector('#game')?.getBoundingClientRect();
      return {
        ids: q.assets.catalog.map((item) => item.id),
        currentId: q.assets.currentId,
        routeCurrentId: q.state.route.currentPackId,
        ready: record?.ready === true,
        failed: Boolean(record?.error),
        fallback: pack?.fallback,
        routeTitle: document.querySelector('[data-route-current]')?.textContent.trim(),
        editorial: document.querySelector('#feed-game')?.textContent.trim(),
        notice: document.querySelector('#feed-disclaimer')?.textContent.trim(),
        noticeTitle: document.querySelector('#feed-disclaimer')?.title,
        titleHidden: document.querySelector('#title-screen')?.hidden,
        canvas: canvas && { width: canvas.width, height: canvas.height },
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    })())`,
    returnByValue: true,
  });
  const state = JSON.parse(evaluation.result.value);
  const findings = cdp.events.filter(
    (event) =>
      event.method === 'Runtime.exceptionThrown' ||
      (event.method === 'Log.entryAdded' &&
        ['error', 'warning'].includes(event.params?.entry?.level)),
  );
  const unexpected = findings.filter((event) => {
    if (isCanvasReadbackInstrumentationWarning(event)) return false;
    const text = JSON.stringify(event.params || {});
    return !(
      fallback &&
      /fixture-unavailable|required pack asset unavailable|failed to load resource|404/i.test(
        text,
      )
    );
  });

  assert(state.currentId === expectedId, `${label} selects ${expectedId}`);
  assert(
    state.routeCurrentId === expectedId,
    `${label} reconciles the save-stable current Pack to ${expectedId}`,
  );
  assert(
    state.routeTitle === packs.find((pack) => pack.id === expectedId)?.title,
    `${label} gameplay renders only the APN runtime title`,
  );
  assert(
    state.editorial === packs.find((pack) => pack.id === expectedId)?.editorialReference,
    `${label} ticker renders only the editorial reference`,
  );
  assert(
    state.notice.includes('not affiliated') && /not affiliated/i.test(state.noticeTitle),
    `${label} keeps the visible non-affiliation notice`,
  );
  assert(
    state.titleHidden && state.canvas?.width > 300 && state.canvas?.height > 300,
    `${label} remains a playable Canvas route`,
  );
  assert(state.overflow === 0, `${label} has zero horizontal overflow`);
  assert(
    unexpected.length === 0,
    `${label} has no unexpected console finding (${JSON.stringify(
      unexpected.map((event) => event.params),
    )})`,
  );
  if (fallback) {
    assert(!state.ready && state.failed, `${label} records the required-asset failure`);
    assert(
      state.fallback?.mode === 'procedural-canvas' &&
        state.fallback?.preserveProgress === true,
      `${label} exposes the progress-safe fallback contract`,
    );
  } else {
    assert(state.ready, `${label} loads the next active Pack assets`);
  }
  await capture(cdp, label);
  cdp.close();
  await fetch(`http://127.0.0.1:${chromePort}/json/close/${page.id}`);
}

async function productionVisibilityScenario(packs, policy) {
  const label = 'runtime-pack-visibility';
  writeCatalog(packs, policy);
  const page = await createPage();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 428,
    height: 926,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp.send('Page.navigate', {
    url:
      `http://127.0.0.1:${appPort}/?autostart=1&mute=1&chrome-smoke=1&qa-manual=1&rights-fixture=${label}`,
  });
  await waitForExpression(
    cdp,
    `window.__APN_QA__ &&
      window.advanceTime &&
      document.documentElement.dataset.firstPlayable === 'ready'`,
    `${label} QA surface`,
  );
  await evaluate(
    cdp,
    `window.__APN_QA__.actions.setReducedMotion(true); true`,
  );

  async function selectPackAndSpawn(pack, packIndex, randomSetup, packWave = 1) {
    await evaluate(cdp, `(() => {
      const q = window.__APN_QA__;
      const state = q.state;
      state.route.zone = ${packIndex * 10 + (packWave - 1)};
      state.route.currentPackId = ${JSON.stringify(pack.id)};
      state.route.killsInZone = 0;
      state.world.enemies = [];
      state.world.spawnCd = 999;
      state.world.bossActive = false;
      state.world.bossTimer = 0;
      state.world.hitStopT = 0;
      state.world.slowMoT = 0;
      window.advanceTime(17);
      return true;
    })()`);
    await waitForExpression(
      cdp,
      `window.__APN_QA__.assets.currentId === ${JSON.stringify(pack.id)} &&
        window.__APN_QA__.assets.packs.get(${JSON.stringify(pack.id)})?.ready === true`,
      `${pack.id} Pack assets`,
    );
    await evaluate(cdp, `(() => {
      ${randomSetup}
      return true;
    })()`);
    let spawned = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      spawned = await evaluate(cdp, `(() => {
        const state = window.__APN_QA__.state;
        state.world.spawnCd = 0;
        window.advanceTime(17);
        return state.world.enemies.some((enemy) => enemy.hp > 0);
      })()`);
      if (spawned) break;
      await delay(25);
    }
    assert(spawned, `${pack.id} spawns one live runtime enemy`);
    await evaluate(cdp, `window.advanceTime(400); true`);
  }

  const visibilityResults = [];
  for (const [packIndex, pack] of packs.entries()) {
    await selectPackAndSpawn(pack, packIndex, `Math.random = () => 0.9;`);
    const visibility = await measureActorVisibility(cdp);
    assert(
      visibility.packId === pack.id,
      `${pack.id} visibility evidence is Pack-qualified`,
    );
    if (pack.id === 'valorant') {
      assert(
        visibility.motion?.status === 'ready' &&
          visibility.motion?.sourceFamily === 'authored-semantic-v4',
        'valorant keeps the approved V4 motion body path',
      );
    } else {
      assert(
        visibility.motion?.status === 'unmapped',
        `${pack.id} keeps the non-motion body path`,
      );
    }
    assertActorVisible(visibility, pack.id);
    visibilityResults.push(visibility);
    if (['valorant', 'fortnite', 'elden-ring'].includes(pack.id)) {
      await capture(cdp, `${label}-${pack.id}-mobile`);
    }
    if (pack.id === 'fortnite') {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 844,
        height: 390,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await delay(100);
      await evaluate(cdp, `window.advanceTime(0); true`);
      const landscapeVisibility = await measureActorVisibility(cdp);
      assertActorVisible(landscapeVisibility, 'fortnite landscape');
      await capture(cdp, `${label}-fortnite-landscape`);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 428,
        height: 926,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await delay(100);
      await evaluate(cdp, `window.advanceTime(0); true`);
    }
  }

  const leagueIndex = packs.findIndex((pack) => pack.id === 'league');
  assert(leagueIndex >= 0, 'runtime catalog contains the legacy-creature Pack');
  // The legacy creature rotation only mounts on an elite target, so this probe
  // must land on a wave whose authored composition rhythm actually carries
  // elite weight. League waves 1–4 are pure lane phase (zero elite), so the
  // probe sits on wave 7 and rolls into that wave's elite → lag branch.
  await selectPackAndSpawn(
    packs[leagueIndex],
    leagueIndex,
    `{
      const rolls = [0.35, 0.1, 0.5, 0.5];
      Math.random = () => rolls.length ? rolls.shift() : 0.5;
    }`,
    7,
  );
  await waitForExpression(
    cdp,
    `window.__APN_QA__.assets.creatureStore.pending.size === 0 &&
      window.__APN_QA__.assets.creatureStore.entries.size === 5`,
    'legacy creature media',
  );
  await evaluate(
    cdp,
    `window.advanceTime(17); window.advanceTime(400); true`,
  );
  const legacyVisibility = await measureActorVisibility(cdp);
  const legacyState = await evaluate(cdp, `(() => {
    const keys = [...window.__APN_QA__.assets.creatureStore.entries.keys()].sort();
    const pairs = keys.map((key) => key.split('/'));
    return {
      type: window.__APN_QA__.state.world.enemies.find((enemy) => enemy.hp > 0)?.type,
      keys,
      owners: [...new Set(pairs.map(([owner]) => owner))].sort(),
      clips: [...new Set(pairs.map(([, clip]) => clip))].sort(),
    };
  })()`);
  assert(
    legacyState.type === 'lag' &&
      legacyState.keys.length === 5 &&
      legacyState.owners.length === 1 &&
      ['hotshot', 'recon'].includes(legacyState.owners[0]) &&
      JSON.stringify(legacyState.clips) ===
        JSON.stringify(['advance', 'attack', 'death', 'hit', 'idle']),
    'league warms exactly one actual legacy creature owner',
  );
  await capture(cdp, `${label}-league-legacy-creature`);
  assertActorVisible(legacyVisibility, 'league legacy creature');

  const findings = cdp.events.filter(
    (event) =>
      !isCanvasReadbackInstrumentationWarning(event) &&
      (event.method === 'Runtime.exceptionThrown' ||
        (event.method === 'Log.entryAdded' &&
          ['error', 'warning'].includes(event.params?.entry?.level))),
  );
  const overflow = await evaluate(
    cdp,
    `Math.max(0, document.documentElement.scrollWidth - innerWidth)`,
  );
  assert(
    visibilityResults.length === packs.length &&
      new Set(visibilityResults.map((entry) => entry.packId)).size === packs.length,
    `${label} covers every runtime-safe Pack exactly once (${packs.length}/${packs.length})`,
  );
  assert(overflow === 0, `${label} has zero horizontal overflow`);
  assert(findings.length === 0, `${label} has no Chrome console finding`);
  fs.writeFileSync(
    path.join(output, `${label}.json`),
    `${JSON.stringify({ visibilityResults, legacyVisibility }, null, 2)}\n`,
  );
  cdp.close();
  await fetch(`http://127.0.0.1:${chromePort}/json/close/${page.id}`);
}

async function emptyCatalogScenario(policy) {
  const label = 'all-packs-unavailable';
  writeCatalog([], policy);
  const page = await createPage();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 428,
    height: 926,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp.send('Page.navigate', {
    url:
      `http://127.0.0.1:${appPort}/?autostart=1&mute=1&chrome-smoke=1&rights-fixture=${label}`,
  });
  await delay(1000);
  const evaluation = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const q = window.__APN_QA__;
      let text = null;
      try { text = JSON.parse(window.render_game_to_text?.() || 'null'); } catch {}
      const canvas = document.querySelector('#game')?.getBoundingClientRect();
      return {
        catalogSize: q?.assets?.catalog?.length,
        currentId: q?.assets?.currentId,
        routePackId: text?.packId,
        routeTitle: text?.routeJourney?.currentPackTitle,
        notice: document.querySelector('#feed-disclaimer')?.textContent.trim(),
        titleHidden: document.querySelector('#title-screen')?.hidden,
        canvas: canvas && { width: canvas.width, height: canvas.height },
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    })())`,
    returnByValue: true,
  });
  const state = JSON.parse(evaluation.result.value);
  const findings = cdp.events.filter(
    (event) =>
      event.method === 'Runtime.exceptionThrown' ||
      (event.method === 'Log.entryAdded' &&
        ['error', 'warning'].includes(event.params?.entry?.level)),
  );
  assert(state.catalogSize === 0, `${label} keeps the filtered catalog empty`);
  assert(
    state.currentId === null && state.routeTitle === null,
    `${label} selects no active Pack while preserving save-stable Route state`,
  );
  assert(
    state.notice.includes('not affiliated'),
    `${label} keeps the rights notice`,
  );
  assert(
    state.titleHidden && state.canvas?.width > 300 && state.canvas?.height > 300,
    `${label} keeps a stable non-crashing game shell`,
  );
  assert(state.overflow === 0, `${label} has zero horizontal overflow`);
  assert(findings.length === 0, `${label} has no console finding`);
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  fs.writeFileSync(
    path.join(output, `${label}.png`),
    Buffer.from(screenshot.data, 'base64'),
  );
  cdp.close();
  await fetch(`http://127.0.0.1:${chromePort}/json/close/${page.id}`);
}

copyFixtureShell();
const production = buildCatalog({ rootDir: root, write: false, warn: () => {} });
const server = spawn(
  process.execPath,
  [path.join(fixtureRoot, 'tools/dev-server.mjs'), '--port', String(appPort)],
  { cwd: fixtureRoot, stdio: ['ignore', 'ignore', 'pipe'] },
);
const chrome = spawn(resolveChrome(), [
  '--headless=new',
  '--no-first-run',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--disable-extensions',
  '--mute-audio',
  `--remote-debugging-port=${chromePort}`,
  '--remote-allow-origins=*',
  `--user-data-dir=${chromeProfile}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

try {
  await waitFor(`http://127.0.0.1:${appPort}/index.html`, 'fixture server');
  await waitFor(`http://127.0.0.1:${chromePort}/json/version`, 'Chrome');
  const killed = production.packs.filter((pack) => pack.id !== 'valorant');
  await scenario({
    label: 'kill-switch-valorant',
    packs: killed,
    policy: production.policy,
    expectedId: killed[0].id,
  });
  await productionVisibilityScenario(production.packs, production.policy);
  const fallback = structuredClone(
    production.packs.filter((pack) => pack.id !== 'valorant'),
  );
  fallback[0].assets.background =
    'assets/game-packs/league/fixture-unavailable.webp';
  await scenario({
    label: 'required-asset-fallback',
    packs: fallback,
    policy: production.policy,
    expectedId: fallback[0].id,
    fallback: true,
  });
  await emptyCatalogScenario(production.policy);
  console.log(`CHROME CATALOG RIGHTS PASS ${output}`);
} finally {
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
  await delay(300);
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  fs.rmSync(chromeProfile, { recursive: true, force: true, maxRetries: 5 });
}
