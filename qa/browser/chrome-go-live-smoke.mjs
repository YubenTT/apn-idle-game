// Direct Chrome CDP smoke for the Go Live sheet (PR-2 / ADR-0008).
// Opens the single Go Live sheet through the real nav, drives arm → confirm → receipt
// through the DOM, and asserts a valid receipt, a preserved Route, reset run power, an
// idempotent re-call, a clean console, and zero horizontal scroll at each viewport.
import fs from 'node:fs';
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

const CHROME = resolveChrome();
const VIEWPORTS = [
  { label: 'mobile-428', width: 428, height: 926, mobile: true, scale: 2 },
  { label: 'mobile-375', width: 375, height: 812, mobile: true, scale: 2 },
  { label: 'landscape-844', width: 844, height: 390, mobile: true, scale: 2 },
];
const port = 9389;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-go-live-chrome-'));
const output = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'apn-go-live-evidence'));
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
  if (!condition) throw new Error(`Chrome Go Live smoke: ${message}`);
  console.log(`OK ${message}`);
};

/** Evaluate an expression in the page and return its value (returnByValue). */
async function evaluate(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
  if (res.exceptionDetails) throw new Error(`page eval threw: ${res.exceptionDetails.text}`);
  return res.result.value;
}
/** Poll a boolean expression until it holds (or throw after ~5s). */
async function waitFor(cdp, expression, label) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return;
    await delay(100);
  }
  throw new Error(`Chrome Go Live smoke: timed out waiting for ${label}`);
}
const shoot = async (cdp, file) => {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
};

async function scenario(viewport) {
  const tag = `Go Live @ ${viewport.label}`;
  const page = await createPage();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.scale, mobile: viewport.mobile });
  // Zone 11 (route.zone 10) sits on the first Go Live boundary.
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:8791/?autostart=1&mute=1&zone=11&chrome-smoke=1` });
  await waitFor(cdp, `window.__APN_QA__?.actions && document.querySelector('#title-screen')?.hidden`, 'app ready');
  await delay(300);

  // Freeze the running sim (rAF no-op) so the Route zone stays put through the multi-step
  // DOM flow, and seed a live cycle: a pending checkpoint keeps Go Live available regardless
  // of timing, while unshipped Notes + banked cycle Rep make the sheet show real numbers.
  const before = await evaluate(cdp, `(() => {
    const q = window.__APN_QA__;
    window.requestAnimationFrame = () => 0;
    // Isolate this scenario from any Go Live state a prior viewport persisted to localStorage.
    q.state.meta.lastGoLiveZone = 0;
    q.state.meta.goLiveCount = 0;
    q.state.meta.lastGoLive = null;
    q.state.ui.goLiveReceipt = null;
    q.state.ui.goLiveArmed = false;
    q.state.run.patches = 60;
    q.state.authority.shippedThisSeason = 240;
    q.state.meta.pendingGoLiveZone = q.state.route.zone;
    return q.state.route.zone;
  })()`);
  await delay(150); // let any in-flight frame flush before asserting on a frozen Route

  // Open the Go Live sheet through the real navigation control.
  await evaluate(cdp, `document.querySelector('.nav-btn[data-panel="ship"]').click()`);
  await waitFor(cdp, `document.querySelector('#panel-ship [data-golive="arm"]')`, 'Go Live preview');
  const preview = JSON.parse(await evaluate(cdp, `(() => {
    const arm = document.querySelector('#panel-ship [data-golive="arm"]');
    return JSON.stringify({
      sheetOpen: !document.querySelector('#panel-ship')?.hidden,
      hasArm: !!arm,
      armReady: !!arm && !arm.disabled,
      armLabel: arm?.querySelector('.btn-primary-title')?.textContent,
      hasNotesRole: !!document.querySelector('#panel-ship .ship-row.t-notes'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    });
  })()`));
  assert(preview.sheetOpen, `${tag} Go Live sheet opens from the nav`);
  assert(preview.hasArm && preview.armReady && preview.armLabel === 'Go Live', `${tag} preview shows the ready Go Live CTA`);
  assert(preview.hasNotesRole, `${tag} preview banks Notes with the Notes color role`);
  assert(preview.overflow <= 0, `${tag} preview has no horizontal scroll (${preview.overflow}px)`);
  await shoot(cdp, path.join(output, `${viewport.label}-go-live-preview.png`));

  // Arm the inline confirm, then confirm — the atomic Go Live.
  await evaluate(cdp, `document.querySelector('#panel-ship [data-golive="arm"]').click()`);
  await waitFor(cdp, `document.querySelector('#panel-ship [data-golive="confirm"]')`, 'inline confirm');
  await evaluate(cdp, `document.querySelector('#panel-ship [data-golive="confirm"]').click()`);
  await waitFor(cdp, `document.querySelector('#panel-ship [data-golive="dismiss"]')`, 'receipt state');

  const result = JSON.parse(await evaluate(cdp, `(() => {
    const q = window.__APN_QA__;
    const receipt = q.state.meta.lastGoLive;
    const again = q.actions.goLive();               // idempotent re-call, no second prestige
    return JSON.stringify({
      receipt,
      idempotentId: again && receipt ? again.checkpointId === receipt.checkpointId : false,
      zoneAfter: q.state.route.zone,
      count: q.state.meta.goLiveCount,
      heroLevel: q.state.run.hero.level,
      hasReceiptUI: !!document.querySelector('#panel-ship [data-golive="dismiss"]'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    });
  })()`));
  const errors = cdp.events.filter((event) =>
    (event.method === 'Runtime.exceptionThrown') ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params?.entry?.level))
  );
  assert(result.receipt && result.receipt.schema === 'apn.go-live-receipt', `${tag} emits a Go Live receipt`);
  assert(result.receipt.goLiveCount === 1 && result.count === 1, `${tag} counts exactly one Go Live`);
  assert(result.receipt.notesBanked === 60 && result.receipt.repGained > 0, `${tag} banks the run's Notes into the receipt`);
  assert(result.zoneAfter === before, `${tag} keeps the Route zone (${result.zoneAfter})`);
  assert(result.heroLevel === 1, `${tag} resets temporary power`);
  assert(result.hasReceiptUI, `${tag} sheet swaps to the receipt state`);
  assert(result.idempotentId === true, `${tag} re-firing Go Live is idempotent`);
  assert(result.overflow <= 0, `${tag} receipt has no horizontal scroll (${result.overflow}px)`);
  assert(errors.length === 0, `${tag} has no Chrome console errors/warnings`);
  await shoot(cdp, path.join(output, `${viewport.label}-go-live-receipt.png`));
  cdp.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`);
}

try {
  await waitForChrome();
  for (const viewport of VIEWPORTS) await scenario(viewport);
  console.log(`CHROME GO LIVE PASS ${output}`);
} finally {
  chrome.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
