import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

/** Resolve a Chrome/Chromium binary: CHROME_BIN → macOS app → Linux PATH names. */
function resolveChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  if (process.platform === 'darwin') {
    const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(mac)) return mac;
  }
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      const found = execFileSync('which', [name], { encoding: 'utf8' }).trim();
      if (found) return found;
    } catch {}
  }
  throw new Error('No Chrome/Chromium binary found (set CHROME_BIN)');
}

const CHROME = resolveChrome();
/** Viewports the smoke must stay console-clean and overflow-free at. */
const VIEWPORTS = [
  { label: 'mobile-428', width: 428, height: 926, mobile: true, scale: 2 },
  { label: 'mobile-375', width: 375, height: 812, mobile: true, scale: 2 },
  { label: 'landscape-844', width: 844, height: 390, mobile: true, scale: 2 },
  { label: 'desktop-1280', width: 1280, height: 800, mobile: false, scale: 1 },
];
const port = 9387;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-chrome-'));
const output = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'apn-route-evidence'));
fs.mkdirSync(output, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--no-first-run',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--disable-extensions',
  '--mute-audio',
  '--autoplay-policy=user-gesture-required',
  `--remote-debugging-port=${port}`,
  '--remote-allow-origins=*',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeStderr = '';
chrome.stderr?.on('data', (chunk) => { chromeStderr += chunk.toString(); });
const chromeExit = new Promise((resolve) => chrome.once('exit', resolve));

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForChrome() {
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Chrome DevTools endpoint did not start\n${chromeStderr}`);
}

async function createPage() {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Unable to create Chrome page: ${response.status}`);
  return response.json();
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
    } else events.push(message);
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

const assert = (condition, message) => {
  if (!condition) throw new Error(`Chrome Route smoke: ${message}`);
  console.log(`OK ${message}`);
};

async function scenario(displayZone, viewport) {
  const tag = `Zone ${displayZone} @ ${viewport.label}`;
  const page = await createPage();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.scale, mobile: viewport.mobile });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:8791/?autostart=1&mute=1&zone=${displayZone}&chrome-smoke=1` });
  for (let attempt = 0; attempt < 50; attempt++) {
    const ready = await cdp.send('Runtime.evaluate', {
      expression: `Boolean(window.__APN_QA__?.assets.currentId && window.__APN_QA__.assets.packs.get(window.__APN_QA__.assets.currentId)?.ready && document.querySelector('#title-screen')?.hidden)`,
      returnByValue: true,
    });
    if (ready.result.value) break;
    await delay(100);
  }
  await delay(500);
  if (displayZone === 201) {
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const q = window.__APN_QA__;
        const ids = q.assets.catalog.map((pack) => pack.id);
        q.state.route.seenPackIds = [...ids];
        q.state.route.cleanCompletedPackIds = [...ids];
        q.state.route.packVisitCountById = Object.fromEntries(ids.map((id) => [id, 1]));
        q.state.route.echoProgressByPack = Object.fromEntries(ids.map((id) => [id, { found: 3, total: 3 }]));
        q.state.route.cleanEraCompleted = true;
        q.state.route.cleanEraCompletedAtZone = 200;
        q.state.route.history = [{ packId: 'elden-ring', visit: 1, tier: 0, completedAtZone: 200, clean: true }];
        q.state.ui.panelDirty = true;
        return true;
      })()`,
      returnByValue: true,
    });
    await delay(200);
  }
  const evaluation = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      zone: document.querySelector('#v-zone')?.textContent,
      packProgress: document.querySelector('#v-pack-progress')?.textContent,
      stageLabels: [...document.querySelectorAll('.stage-stat-lab')].map((node) => node.childNodes[0]?.textContent.trim()),
      focusHidden: document.querySelector('#bar-focus-wrap')?.hidden,
      echoHidden: document.querySelector('#patch-echo-chip')?.hidden,
      echoText: document.querySelector('#v-echo-progress')?.textContent,
      toast: (() => {
        const toast = document.querySelector('#toast');
        const hud = document.querySelector('.stage-hud');
        const tr = toast?.getBoundingClientRect();
        const hr = hud?.getBoundingClientRect();
        return tr && hr && { visible: !toast.hidden, top: tr.top, hudBottom: hr.bottom };
      })(),
      sound: document.querySelector('#chk-sfx')?.checked,
      canvas: (() => { const r = document.querySelector('#game')?.getBoundingClientRect(); return r && { width:r.width,height:r.height }; })(),
      overflow: document.documentElement.scrollWidth - innerWidth,
      titleHidden: document.querySelector('#title-screen')?.hidden,
      visible: !document.hidden,
      currentPack: window.__APN_QA__?.assets.currentId,
      nextPack: window.__APN_QA__?.assets.nextId,
      catalogCount: window.__APN_QA__?.assets.catalog.length,
      textJourney: window.render_game_to_text ? JSON.parse(window.render_game_to_text()).routeJourney : null,
      decodedPacks: window.__APN_QA__ ? [...window.__APN_QA__.assets.packs.keys()] : [],
      heroX: window.__APN_QA__?.state.world.heroDisplayX,
      targetX: window.__APN_QA__?.state.world.enemies.find((enemy) => enemy.hp > 0)?.displayX
    })`,
    returnByValue: true,
  });
  const result = JSON.parse(evaluation.result.value);
  const errors = cdp.events.filter((event) =>
    (event.method === 'Runtime.exceptionThrown') ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params?.entry?.level))
  );
  assert(result.zone === String(displayZone), `${tag} HUD matches Route`);
  assert(result.packProgress === `${((displayZone - 1) % 10) + 1}/10`, `${tag} HUD matches Pack progress`);
  assert(result.stageLabels.join('|') === 'CLEAR|RANK|LIVE', `${tag} keeps Clear / Rank / Live hierarchy uncluttered`);
  assert(result.focusHidden === true, `${tag} hides Focus before a Focus skill is learned`);
  assert(result.echoHidden === false, `${tag} exposes data-bound Patch Echo progress`);
  assert(result.echoText === (displayZone === 201 ? '3/3' : '0/3'), `${tag} Echo text comes from Route state (${result.echoText})`);
  if (result.toast?.visible) {
    assert(
      result.toast.top >= result.toast.hudBottom + 8,
      `${tag} tip never covers the stage telemetry (${result.toast.top}px ≥ ${result.toast.hudBottom + 8}px)`,
    );
  }
  assert(result.sound === false, `${tag} SFX is off`);
  // Proportional so a short landscape viewport still asserts a filled canvas.
  const minW = Math.min(300, viewport.width * 0.6);
  const minH = Math.min(300, viewport.height * 0.5);
  assert(result.canvas?.width > minW && result.canvas?.height > minH, `${tag} Canvas is visible (${result.canvas?.width}×${result.canvas?.height})`);
  assert(result.titleHidden === true && result.visible === true, `${tag} is playable`);
  assert(errors.length === 0, `${tag} has no Chrome console errors/warnings`);
  assert(result.currentPack && result.decodedPacks.includes(result.currentPack), `${tag} current pack is decoded (${result.currentPack})`);
  assert(result.decodedPacks.length > 0 && result.decodedPacks.length <= 2, `${tag} retains at most current + next packs (${result.decodedPacks.join(',')})`);
  assert(result.targetX == null || result.targetX > result.heroX, `${tag} target approaches from the right`);
  assert(
    result.textJourney?.currentPackId && result.textJourney?.echo?.total === 3,
    `${tag} render_game_to_text exposes Route/Echo truth`,
  );
  if (displayZone === 1 && viewport.label === 'mobile-428') {
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const q = window.__APN_QA__;
        window.__apnRouteSmokeSnapshot = {
          route: structuredClone(q.state.route),
          scanner: q.state.run.hero.scanner,
        };
        q.state.route.zone = 2;
        q.state.route.killsInZone = 999;
        q.state.run.hero.scanner = 40;
        q.state.world.enemies = [];
        q.state.world.bossActive = false;
        q.state.world.spawnCd = 0;
        return true;
      })()`,
      returnByValue: true,
    });
    for (let index = 0; index < 120; index += 1) {
      const tick = await cdp.send('Runtime.evaluate', {
        expression: `window.advanceTime(100); window.__APN_QA__.state.route.zone`,
        returnByValue: true,
      });
      if (tick.result.value > 2) break;
      await delay(20);
    }
    const discoveryEvaluation = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify((() => {
        const q = window.__APN_QA__;
        const proof = {
          zone: q.state.route.zone,
          found: q.state.route.echoProgressByPack?.valorant?.found,
          hud: document.querySelector('#v-echo-progress')?.textContent,
          text: JSON.parse(window.render_game_to_text()).routeJourney.echo.found,
        };
        q.state.route = window.__apnRouteSmokeSnapshot.route;
        q.state.run.hero.scanner = window.__apnRouteSmokeSnapshot.scanner;
        q.state.world.enemies = [];
        q.state.world.bossActive = false;
        q.state.world.spawnCd = 0;
        delete window.__apnRouteSmokeSnapshot;
        window.advanceTime(0);
        return proof;
      })())`,
      returnByValue: true,
    });
    const discovery = JSON.parse(discoveryEvaluation.result.value);
    assert(
      discovery.zone === 3 &&
        discovery.found === 1 &&
        discovery.hud === '1/3' &&
        discovery.text === 1,
      `${tag} real combat discovers and renders Echo 1/3 (${JSON.stringify(discovery)})`,
    );
  }
  if (displayZone === 1) {
    await cdp.send('Runtime.evaluate', {
      expression: `window.__APN_QA__.state.run.hero.skills.hotfix = 1`,
      returnByValue: true,
    });
    await delay(150);
    const focusLearned = await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('#bar-focus-wrap')?.hidden === false && document.querySelector('.hud-bars')?.classList.contains('has-focus')`,
      returnByValue: true,
    });
    assert(focusLearned.result.value === true, `${tag} reveals Focus after Hotfix is learned`);
    await cdp.send('Runtime.evaluate', {
      expression: `window.__APN_QA__.state.run.hero.skills.hotfix = 0`,
      returnByValue: true,
    });
    await delay(150);
  }
  if (displayZone === 1 || (displayZone === 201 && viewport.label === 'mobile-428')) {
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('.nav-btn[data-panel="hub"]')?.click()`,
      returnByValue: true,
    });
    await delay(200);
    const routeEvaluation = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify((() => {
        const journey = document.querySelector('[data-route-journey]');
        const season = document.querySelector('#hub-body .hub-season');
        const sheet = document.querySelector('.sheet');
        const sr = sheet?.getBoundingClientRect();
        return {
          visible: Boolean(journey && !document.querySelector('#panel-hub')?.hidden),
          beforeObjectives: Boolean(journey && season && (journey.compareDocumentPosition(season) & Node.DOCUMENT_POSITION_FOLLOWING)),
          current: journey?.querySelector('[data-route-current]')?.textContent.trim(),
          next: journey?.querySelector('[data-route-next]')?.textContent.trim(),
          clean: journey?.querySelector('[data-route-clean]')?.textContent.trim(),
          echo: journey?.querySelector('[data-route-echo]')?.textContent.trim(),
          drift: journey?.querySelector('[data-route-drift]')?.textContent.trim(),
          archiveCount: journey?.querySelectorAll('[data-echo-pack]').length || 0,
          historyCount: journey?.querySelectorAll('[data-route-history-entry]').length || 0,
          sheetInsideViewport: Boolean(sr && sr.left >= 0 && sr.right <= innerWidth && sr.top >= 0 && sr.bottom <= innerHeight),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      })())`,
      returnByValue: true,
    });
    const route = JSON.parse(routeEvaluation.result.value);
    assert(route.visible, `${tag} Route journey is visible`);
    assert(route.beforeObjectives, `${tag} Route journey precedes objectives`);
    assert(Boolean(route.current) && Boolean(route.next), `${tag} Route reveals current and next Pack`);
    assert(route.archiveCount === result.catalogCount, `${tag} Echo archive covers the active catalog`);
    assert(route.sheetInsideViewport && route.overflow === 0, `${tag} Route sheet stays inside the viewport`);
    if (displayZone === 1) {
      assert(route.clean.includes(`0/${result.catalogCount}`) && route.echo.includes('0/3'), `${tag} fresh Route shows honest Clean/Echo progress`);
    } else {
      assert(route.clean.includes('Clean Era Complete'), `${tag} renders the earned Clean Era result`);
      assert(route.drift.includes('Signal Drift 1'), `${tag} renders postgame Signal Drift tier`);
      assert(route.historyCount === 1, `${tag} renders exact persisted Pack history`);
    }
  }
  console.log(`INFO ${tag} viewport overflow ${result.overflow}px`);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(output, `${viewport.label}-zone-${String(displayZone).padStart(3, '0')}.png`), Buffer.from(shot.data, 'base64'));
  cdp.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`);
}

try {
  await waitForChrome();
  const [primary, ...secondary] = VIEWPORTS;
  for (const zone of [1, 10, 11, 20, 200, 201]) await scenario(zone, primary);
  // The added viewports (375×812 + landscape) cover a pack boundary each.
  for (const viewport of secondary) for (const zone of [1, 20]) await scenario(zone, viewport);
  console.log(`CHROME ROUTE PASS ${output}`);
} finally {
  chrome.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
