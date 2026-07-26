import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

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

async function findUnusedPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      else resolve(message);
      return;
    }
    events.push(message);
  };
  const opened = new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  return {
    opened,
    events,
    async send(method, params = {}) {
      const id = ++nextId;
      const response = await new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
      return response;
    },
    close() {
      socket.close();
    },
  };
}

async function waitForChrome(port, chromeStderrRef) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Chrome DevTools endpoint did not start\n${chromeStderrRef.current}`);
}

async function createPage(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Unable to create Chrome page: ${response.status}`);
  return response.json();
}

async function closePage(port, id) {
  try {
    await fetch(`http://127.0.0.1:${port}/json/close/${id}`);
  } catch {}
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(`page eval threw: ${response.exceptionDetails.text}`);
  }
  return response.result?.result?.value;
}

async function waitFor(cdp, expression, label, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function screenshotFile(outputDir, viewportLabel, wave, suffix = '') {
  const waveLabel = String(wave).padStart(2, '0');
  return path.join(outputDir, `${viewportLabel}-wave-${waveLabel}${suffix}.png`);
}

async function captureScreenshot(cdp, outputPath) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(outputPath, Buffer.from(shot.result.data, 'base64'));
}

function consoleProblems(events) {
  return events
    .filter((event) => {
      if (event.method === 'Runtime.exceptionThrown') return true;
      if (event.method === 'Runtime.consoleAPICalled') {
        return ['warning', 'error'].includes(event.params?.type);
      }
      if (event.method === 'Network.loadingFailed') return true;
      if (event.method === 'Network.responseReceived') {
        return (event.params?.response?.status || 0) >= 400;
      }
      if (event.method !== 'Log.entryAdded') return false;
      return ['warning', 'error'].includes(event.params?.entry?.level);
    })
    .map((event) => {
      if (event.method === 'Runtime.consoleAPICalled') {
        return (event.params?.args || [])
          .map((argument) => argument.value ?? argument.description ?? argument.type)
          .join(' ');
      }
      if (event.method === 'Network.loadingFailed') {
        return `${event.params?.errorText || 'network load failed'} ${event.params?.blockedReason || ''}`.trim();
      }
      if (event.method === 'Network.responseReceived') {
        return `${event.params?.response?.status || 0} ${event.params?.response?.url || ''}`.trim();
      }
      return event.params?.entry?.text || event.params?.exceptionDetails?.text || 'Unknown console problem';
    })
    .filter((text) => !/favicon/i.test(text));
}

const CHROME = resolveChrome();
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8792';
const OUTPUT_DIR = path.resolve(process.argv[2] || 'qa/screenshots/gaf2d-creatures');
const VIEWPORTS = [
  { label: 'mobile-375', width: 375, height: 812, mobile: true, scale: 2 },
  { label: 'mobile-428', width: 428, height: 926, mobile: true, scale: 2 },
  { label: 'landscape-844', width: 844, height: 390, mobile: true, scale: 2 },
];
const WAVE_EXPECTATIONS = {
  1: [{ label: 'Entry Runner', frame: 'common-a' }],
  2: [{ label: 'Veil Operator', frame: 'common-b' }],
  3: [{ label: 'Signal Hunter', frame: 'common-c' }],
  4: [
    { label: 'Entry Runner', frame: 'common-a' },
    { label: 'Veil Operator', frame: 'common-b' },
  ],
  5: [{ label: 'Site Sentinel', frame: 'elite' }],
  6: [
    { label: 'Entry Runner', frame: 'common-a' },
    { label: 'Signal Hunter', frame: 'common-c' },
  ],
  7: [
    { label: 'Veil Operator', frame: 'common-b' },
    { label: 'Site Sentinel', frame: 'elite' },
  ],
  8: [
    { label: 'Entry Runner', frame: 'common-a' },
    { label: 'Veil Operator', frame: 'common-b' },
    { label: 'Signal Hunter', frame: 'common-c' },
    { label: 'Site Sentinel', frame: 'elite' },
  ],
  9: [{ label: 'Protocol Courier', frame: 'event' }],
  10: [{ label: 'Site Warden', frame: 'boss' }],
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function allowedLabelFrame(wave, label, frame) {
  return WAVE_EXPECTATIONS[wave]?.some((entry) => entry.label === label && entry.frame === frame) === true;
}

function smokeUrl(wave, includeQaGate = true) {
  const query = new URLSearchParams({
    autostart: '1',
    mute: '1',
    zone: String(wave),
  });
  if (includeQaGate) {
    query.set('chrome-smoke', '1');
    query.set('qa-manual', '1');
  }
  return `${BASE_URL}/?${query.toString()}`;
}

async function bootstrapPage(port, viewport, url) {
  const page = await createPage(port);
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.scale,
    mobile: viewport.mobile,
  });
  await cdp.send('Page.navigate', { url });
  return { cdp, page };
}

async function waitForQaReady(cdp) {
  await waitFor(
    cdp,
    `Boolean(
      window.render_game_to_text &&
      window.advanceTime &&
      window.__APN_QA__?.assets?.currentId === 'valorant' &&
      window.__APN_QA__.assets.packs.get('valorant')?.ready &&
      window.__APN_QA__.assets.packs.get('valorant')?.targets?.naturalWidth === 896 &&
      window.__APN_QA__.assets.packs.get('valorant')?.targets?.naturalHeight === 128 &&
      document.querySelector('#title-screen')?.hidden
    )`,
    'GAF2D QA hooks and Valorant pack readiness',
  );
}

async function seedDeterministicRandom(cdp) {
  await evaluate(cdp, `(() => {
    let seed = 0x41504e >>> 0;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    Object.defineProperty(window, '__APN_RANDOM_SEED__', {
      value: seed,
      configurable: true,
      writable: true,
    });
    Math.random = () => {
      const value = next();
      window.__APN_RANDOM_SEED__ = seed;
      return value;
    };
    return window.__APN_RANDOM_SEED__;
  })()`);
}

async function prepareWave(cdp, wave) {
  await seedDeterministicRandom(cdp);
  await evaluate(cdp, `(() => {
    const q = window.__APN_QA__;
    const s = q.state;
    s.route.zone = ${wave - 1};
    s.route.killsInZone = 0;
    s.route.currentPackId = 'valorant';
    s.world.enemies = [];
    s.world.spawnCd = 0;
    s.world.bossActive = false;
    s.world.bossTimer = 0;
    s.world.hitStopT = 0;
    s.settings.sfx = false;
    return true;
  })()`);
}

async function readState(cdp) {
  const raw = await evaluate(cdp, `window.render_game_to_text()`);
  const parsed = JSON.parse(raw);
  const extra = await evaluate(cdp, `(() => {
    const pack = window.__APN_QA__?.assets?.packs?.get('valorant');
    const canvasRect = document.querySelector('#game')?.getBoundingClientRect();
    const stageHudRect = document.querySelector('.stage-hud')?.getBoundingClientRect();
    return {
      packId: window.__APN_QA__?.assets?.currentId,
      overflowY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      targetNaturalWidth: pack?.targets?.naturalWidth || 0,
      targetNaturalHeight: pack?.targets?.naturalHeight || 0,
      stageHudBottomY: canvasRect && stageHudRect ? stageHudRect.bottom - canvasRect.top : null,
    };
  })()`);
  return { ...parsed, extra };
}

async function validateWave(cdp, viewport, wave, outputDir) {
  await prepareWave(cdp, wave);
  await evaluate(cdp, `window.advanceTime(17)`);
  // Keep the actual spawn path under test, then dock the spawned target inside
  // the review-safe stage area so every captured viewport proves the art itself.
  await evaluate(cdp, `(() => {
    const state = window.__APN_QA__.state;
    const enemy = state.world.enemies.find((candidate) => candidate.hp > 0);
    if (!enemy) throw new Error('Enemy missing before review positioning');
    const canvasWidth = document.querySelector('#game')?.clientWidth || 375;
    const reviewX = Math.max(state.world.heroX + 170, Math.min(320, canvasWidth - 75));
    enemy.x = reviewX;
    enemy.displayX = reviewX;
    return true;
  })()`);
  // Let the shared spawn-pop settle before taking visual evidence.
  await evaluate(cdp, `window.advanceTime(400)`);
  const state = await readState(cdp);
  const problems = consoleProblems(cdp.events);
  const enemy = state.enemy;

  assert(state.routeZone === wave, `${viewport.label} wave ${wave}: route zone mismatch`);
  assert(state.packWave === wave, `${viewport.label} wave ${wave}: pack wave mismatch`);
  assert(state.packId === 'valorant', `${viewport.label} wave ${wave}: current pack is not valorant`);
  assert(state.pack?.ready === true, `${viewport.label} wave ${wave}: Valorant pack not ready`);
  assert(state.pack?.atlas?.width === 896 && state.pack?.atlas?.height === 128, `${viewport.label} wave ${wave}: atlas size mismatch`);
  assert(state.extra?.targetNaturalWidth === 896 && state.extra?.targetNaturalHeight === 128, `${viewport.label} wave ${wave}: natural atlas size mismatch`);
  assert(state.muted === true, `${viewport.label} wave ${wave}: audio not muted`);
  assert(state.viewport?.overflowX === 0, `${viewport.label} wave ${wave}: horizontal overflow detected`);
  assert(state.extra?.overflowY === 0, `${viewport.label} wave ${wave}: vertical overflow detected`);
  assert(enemy, `${viewport.label} wave ${wave}: no spawned enemy`);
  assert(allowedLabelFrame(wave, enemy.label, enemy.frame), `${viewport.label} wave ${wave}: unexpected ${enemy.label}/${enemy.frame}`);
  if (wave === 10) {
    assert(
      state.bossTimerY >= state.extra.stageHudBottomY + 2,
      `${viewport.label} wave 10: boss timer remains occluded by the stage HUD`,
    );
    await evaluate(cdp, `(() => {
      const state = window.__APN_QA__.state;
      state.ui.pendingTip = null;
      state.ui.toast = null;
      state.ui.toastT = 0;
      return window.advanceTime(0);
    })()`);
  }
  assert(problems.length === 0, `${viewport.label} wave ${wave}: console problems: ${problems.join(' | ')}`);

  await captureScreenshot(cdp, screenshotFile(outputDir, viewport.label, wave));

  const result = {
    viewport: viewport.label,
    wave,
    label: enemy.label,
    frame: enemy.frame,
    hpRatio: enemy.hpRatio,
    screenshot: path.relative(process.cwd(), screenshotFile(outputDir, viewport.label, wave)),
  };

  if (wave === 10) {
    await evaluate(cdp, `(() => {
      const enemy = window.__APN_QA__.state.world.enemies.find((candidate) => candidate.hp > 0);
      if (!enemy) throw new Error('Boss missing before break test');
      enemy.hp = enemy.hpMax * 0.33;
      return true;
    })()`);
    await evaluate(cdp, `window.advanceTime(0)`);
    const brokenState = await readState(cdp);
    const brokenEnemy = brokenState.enemy;
    assert(brokenEnemy, `${viewport.label} wave 10: boss missing after break test`);
    assert(brokenEnemy.frame === 'boss-break', `${viewport.label} wave 10: boss break frame missing`);
    assert(brokenState.bossBreak === true, `${viewport.label} wave 10: bossBreak flag missing`);
    await captureScreenshot(cdp, screenshotFile(outputDir, viewport.label, wave, '-boss-break'));
    result.bossBreak = {
      frame: brokenEnemy.frame,
      hpRatio: brokenEnemy.hpRatio,
      screenshot: path.relative(process.cwd(), screenshotFile(outputDir, viewport.label, wave, '-boss-break')),
    };
  }

  return result;
}

async function verifyNoGatePage(port, viewport) {
  const { cdp, page } = await bootstrapPage(port, viewport, smokeUrl(1, false));
  try {
    await waitFor(cdp, `document.querySelector('#title-screen')?.hidden === true`, 'production page autostart');
    await delay(250);
    const gateState = await evaluate(cdp, `({
      hasRender: typeof window.render_game_to_text !== 'undefined',
      hasAdvance: typeof window.advanceTime !== 'undefined',
      hasQa: typeof window.__APN_QA__ !== 'undefined'
    })`);
    const problems = consoleProblems(cdp.events);
    assert(gateState.hasRender === false, 'production page exposes render_game_to_text');
    assert(gateState.hasAdvance === false, 'production page exposes advanceTime');
    assert(gateState.hasQa === false, 'production page exposes __APN_QA__');
    assert(problems.length === 0, `production page console problems: ${problems.join(' | ')}`);
    return { checked: true };
  } finally {
    cdp.close();
    await closePage(port, page.id);
  }
}

const chromeStderrRef = { current: '' };
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-gaf2d-chrome-'));
let chrome;
let chromeExit = Promise.resolve();

try {
  const port = await findUnusedPort();
  chrome = spawn(CHROME, [
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
  chrome.stderr?.on('data', (chunk) => {
    chromeStderrRef.current += chunk.toString();
  });
  chromeExit = new Promise((resolve) => chrome.once('exit', resolve));

  await waitForChrome(port, chromeStderrRef);

  const findings = [];
  for (const viewport of VIEWPORTS) {
    const { cdp, page } = await bootstrapPage(port, viewport, smokeUrl(1, true));
    try {
      await waitForQaReady(cdp);
      for (let wave = 1; wave <= 10; wave += 1) {
        findings.push(await validateWave(cdp, viewport, wave, OUTPUT_DIR));
      }
    } finally {
      cdp.close();
      await closePage(port, page.id);
    }
  }

  const noGate = await verifyNoGatePage(port, VIEWPORTS[0]);
  console.log(JSON.stringify({
    status: 'ok',
    baseUrl: BASE_URL,
    outputDir: path.relative(process.cwd(), OUTPUT_DIR),
    verified: findings.length,
    findings,
    noGate,
  }, null, 2));
} finally {
  chrome?.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
