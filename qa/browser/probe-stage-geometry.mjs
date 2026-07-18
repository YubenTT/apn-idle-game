// One-off layout probe: stage geometry for floater anchoring (toast band vs ground line).
// Reports canvas-relative rects for .stage-context / .stage-hud / #toast plus groundY,
// at each smoke viewport, with a toast forced visible.
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
const port = 9393;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-geom-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--no-first-run', '--no-sandbox', '--disable-gpu',
  '--mute-audio', `--remote-debugging-port=${port}`, '--remote-allow-origins=*',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
const chromeExit = new Promise((resolve) => chrome.once('exit', resolve));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function connect(url) {
  const socket = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    }
  };
  return {
    opened: new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; }),
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

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'eval failed');
  return result.result.value;
}

async function waitFor(cdp, expression, label) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

try {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) break;
    } catch {}
    await delay(100);
  }
  const pageResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const page = await pageResponse.json();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  for (const viewport of [
    { label: 'mobile-375', width: 375, height: 812 },
    { label: 'mobile-428', width: 428, height: 926 },
    { label: 'landscape-844', width: 844, height: 390 },
  ]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 2, mobile: true,
    });
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:8791/?autostart=1&mute=1&chrome-smoke=1&zone=3' });
    await waitFor(cdp, `window.__APN_QA__?.state && document.querySelector('#title-screen')?.hidden`, 'app ready');
    await evaluate(cdp, `(() => { const s = window.__APN_QA__.state; s.ui.toast = 'Zone 3 cleared — on to Zone 4'; s.ui.toastT = 30; })()`);
    await delay(700); // let toast-drop animation settle + a few frames stamp groundY
    const report = JSON.parse(await evaluate(cdp, `JSON.stringify((() => {
      const s = window.__APN_QA__.state;
      const c = document.querySelector('#game').getBoundingClientRect();
      const rel = (sel) => {
        const n = document.querySelector(sel);
        if (!n || n.hidden) return null;
        const r = n.getBoundingClientRect();
        return { top: +(r.top - c.top).toFixed(1), bottom: +(r.bottom - c.top).toFixed(1) };
      };
      return {
        canvas: { w: +c.width.toFixed(1), h: +c.height.toFixed(1) },
        groundY: +((s.world.groundY || 0).toFixed(1)),
        context: rel('.stage-context'),
        hud: rel('.stage-hud'),
        toast: rel('#toast'),
        enemyHeads: s.world.enemies.map((e) => +(s.world.groundY - (e.type === 'boss' ? 136 : e.type === 'patch' ? 100 : 96) * 0.82).toFixed(1)),
      };
    })())`));
    console.log(viewport.label, JSON.stringify(report));
  }
  cdp.close();
} finally {
  chrome.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
