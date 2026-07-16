// Direct Chrome CDP smoke for the atomic Go Live checkpoint (PR-1 / ADR-0008).
// Drives the real in-browser goLive() through the __APN_QA__ action surface and
// asserts a valid receipt, a preserved Route, and a clean console at each viewport.
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
];
const port = 9389;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-go-live-chrome-'));
const output = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'apn-go-live-evidence'));
fs.mkdirSync(output, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--no-first-run',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--disable-extensions',
  '--mute-audio',
  '--autoplay-policy=user-gesture-required',
  `--remote-debugging-port=${port}`,
  '--remote-allow-origins=*',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' });
const chromeExit = new Promise((resolve) => chrome.once('exit', resolve));

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForChrome() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error('Chrome DevTools endpoint did not start');
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
  for (let attempt = 0; attempt < 50; attempt++) {
    const ready = await cdp.send('Runtime.evaluate', {
      expression: `Boolean(window.__APN_QA__?.actions && document.querySelector('#title-screen')?.hidden)`,
      returnByValue: true,
    });
    if (ready.result.value) break;
    await delay(100);
  }
  await delay(300);
  const evaluation = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const q = window.__APN_QA__;
      const before = q.state.route.zone;
      const availBefore = q.actions.goLiveAvailableZone();
      const receipt = q.actions.goLive();
      const again = q.actions.goLive();
      return JSON.stringify({
        before,
        availBefore,
        receipt,
        idempotentId: again && receipt ? again.checkpointId === receipt.checkpointId : false,
        zoneAfter: q.state.route.zone,
        count: q.state.meta.goLiveCount,
        live: q.state.meta.live,
        heroLevel: q.state.run.hero.level,
      });
    })()`,
    returnByValue: true,
  });
  const result = JSON.parse(evaluation.result.value);
  const errors = cdp.events.filter((event) =>
    (event.method === 'Runtime.exceptionThrown') ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params?.entry?.level))
  );
  assert(result.availBefore >= 10, `${tag} checkpoint available at the boundary (zone ${result.availBefore})`);
  assert(result.receipt && result.receipt.schema === 'apn.go-live-receipt', `${tag} emits a Go Live receipt`);
  assert(result.receipt.goLiveCount === 1 && result.count === 1, `${tag} counts exactly one Go Live`);
  assert(result.zoneAfter === result.before, `${tag} keeps the Route zone (${result.zoneAfter})`);
  assert(result.heroLevel === 1, `${tag} resets temporary power`);
  assert(result.idempotentId === true, `${tag} double-click is idempotent`);
  assert(errors.length === 0, `${tag} has no Chrome console errors/warnings`);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(output, `${viewport.label}-go-live.png`), Buffer.from(shot.data, 'base64'));
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
