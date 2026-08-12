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
      `http://127.0.0.1:${appPort}/?autostart=1&mute=1&chrome-smoke=1&rights-fixture=${label}`,
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
  await delay(500);
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
  assert(unexpected.length === 0, `${label} has no unexpected console finding`);
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
  const fallback = structuredClone(production.packs);
  fallback[0].assets.background =
    'assets/game-packs/valorant/fixture-unavailable.webp';
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
