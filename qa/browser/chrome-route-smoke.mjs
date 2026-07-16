import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9387;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-chrome-'));
const output = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'apn-route-evidence'));
fs.mkdirSync(output, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--no-first-run',
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
  if (!condition) throw new Error(`Chrome Route smoke: ${message}`);
  console.log(`OK ${message}`);
};

async function scenario(displayZone) {
  const page = await createPage();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 428, height: 926, deviceScaleFactor: 2, mobile: true });
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
  const evaluation = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      zone: document.querySelector('#v-zone')?.textContent,
      sound: document.querySelector('#chk-sfx')?.checked,
      canvas: (() => { const r = document.querySelector('#game')?.getBoundingClientRect(); return r && { width:r.width,height:r.height }; })(),
      overflow: document.documentElement.scrollWidth - innerWidth,
      titleHidden: document.querySelector('#title-screen')?.hidden,
      visible: !document.hidden,
      currentPack: window.__APN_QA__?.assets.currentId,
      nextPack: window.__APN_QA__?.assets.nextId,
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
  assert(result.zone === String(displayZone), `Zone ${displayZone} HUD matches Route`);
  assert(result.sound === false, `Zone ${displayZone} SFX is off`);
  assert(result.canvas?.width > 300 && result.canvas?.height > 300, `Zone ${displayZone} Canvas is visible`);
  assert(result.titleHidden === true && result.visible === true, `Zone ${displayZone} is playable`);
  assert(errors.length === 0, `Zone ${displayZone} has no Chrome console errors/warnings`);
  assert(result.currentPack && result.decodedPacks.includes(result.currentPack), `Zone ${displayZone} current pack is decoded (${result.currentPack})`);
  assert(result.decodedPacks.length > 0 && result.decodedPacks.length <= 2, `Zone ${displayZone} retains at most current + next packs (${result.decodedPacks.join(',')})`);
  assert(result.targetX == null || result.targetX > result.heroX, `Zone ${displayZone} target approaches from the right`);
  console.log(`INFO Zone ${displayZone} viewport overflow ${result.overflow}px`);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(output, `zone-${String(displayZone).padStart(3, '0')}.png`), Buffer.from(shot.data, 'base64'));
  cdp.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`);
}

try {
  await waitForChrome();
  for (const zone of [1, 10, 11, 20, 200, 201]) await scenario(zone);
  console.log(`CHROME ROUTE PASS ${output}`);
} finally {
  chrome.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
