// V2 Super Polish · Wave 3 — juice & feel evidence capture.
// Drives the live game on :8791 through Chrome CDP, seeds states through
// window.__APN_QA__, polls for the real juice moments (crit flash, death
// burst, zone-clear sweep, rank halo, Go Live cinematic), and screenshots
// them at 428×926. Usage: node qa/browser/chrome-wave3-shots.mjs [outputDir]
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
const VIEWPORT = { label: 'mobile-428', width: 428, height: 926, mobile: true, scale: 2 };
const port = 9393;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-wave3-chrome-'));
const output = path.resolve(process.argv[2] || 'qa/screenshots/v2-wave3');
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

async function evaluate(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(`page eval threw: ${res.exceptionDetails.text} in ${expression.slice(0, 90)}`);
  return res.result.value;
}
async function waitFor(cdp, expression, label, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return true;
    await delay(16);
  }
  throw new Error(`wave3 shots: timed out waiting for ${label}`);
}
const shoot = async (cdp, file) => {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(`SHOT ${path.basename(file)}`);
};

// Shared seed: a strong scanner so kills flow, crit-heavy build for crits.
const SEED = `(() => {
  const s = window.__APN_QA__.state;
  s.run.bytes = 86420;
  s.run.patches = 1325;
  s.run.hero.level = 9;
  s.run.hero.sp = 6;
  s.run.hero.scanner = 30;
  s.run.hero.focus = 60;
  s.run.hero.energy = 100;
  s.run.hero.skills = { hotfix: 3, summary_burst: 2, live_tracker: 4, sharp_eye: 40, scroll_speed: 2 };
  s.authority.amount = 140;
  s.ui.tips.coachUpgrade = true;
  return true;
})()`;

const problems = [];

async function scenario(sc) {
  const tag = `${VIEWPORT.label}/${sc.name}`;
  const page = await createPage();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: VIEWPORT.scale, mobile: VIEWPORT.mobile,
  });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:8791/?autostart=1&mute=1&chrome-smoke=1&zone=3` });
  try {
    await waitFor(cdp, `window.__APN_QA__?.state`, 'app ready');
    await evaluate(cdp, `localStorage.clear(); true`);
    await evaluate(cdp, sc.seed || SEED);
    if (sc.act) await evaluate(cdp, sc.act);
    await waitFor(cdp, sc.wait, sc.name, sc.timeoutMs || 6000);
    if (sc.freeze) await evaluate(cdp, sc.freeze); // hold the moment for the exposure
    if (sc.settle) await delay(sc.settle);
    await shoot(cdp, path.join(output, `${VIEWPORT.label}-${sc.name}.png`));
    const errors = cdp.events.filter((event) =>
      event.method === 'Runtime.exceptionThrown' ||
      (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params?.entry?.level))
    );
    for (const e of errors) {
      const text = e.params?.entry?.text || e.params?.exceptionDetails?.text || '';
      if (/favicon|net::ERR_/i.test(text)) continue;
      problems.push(`${tag}: console ${text.slice(0, 140)}`);
    }
  } catch (err) {
    problems.push(`${tag}: ${err.message}`);
    try { await shoot(cdp, path.join(output, `${VIEWPORT.label}-${sc.name}-FAIL.png`)); } catch {}
  }
  cdp.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`);
}

const SCENARIOS = [
  {
    name: 'crit-flash',
    // sharp_eye 40 → crit chance pinned at the 0.72 cap; poll the white-hot frame.
    wait: `window.__APN_QA__.state.world.enemies.some((e) => e.critFlash > 0.04)`,
    timeoutMs: 9000,
  },
  {
    name: 'death-burst',
    // No sharp_eye: plain kills, so the burst reads without the crit flash.
    // Hit stop freezes the shards + ring mid-flight for the exposure.
    seed: SEED.replace('sharp_eye: 40, ', ''),
    wait: `window.__APN_QA__.state.world.enemies.some((e) => e.killed && e.deathT > 0 && (e.deathMax - e.deathT) > 0.14)`,
    freeze: `(() => { window.__APN_QA__.state.world.hitStopT = 0.9; return true; })()`,
    timeoutMs: 9000,
  },
  {
    name: 'zone-clear',
    seed: SEED.replace('sharp_eye: 40, ', ''),
    act: `(() => {
      const s = window.__APN_QA__.state;
      s.route.killsInZone = 9; // zone 3 needs 10 — next kill clears it
      s.run.hero.xp = 0;
      s.ui.pendingTip = null;
      for (const k of ['start','kill','level','combo','patch','boss','gear','season','alert','ship','zone']) s.ui.tips[k] = true;
      return true;
    })()`,
    wait: `window.__APN_QA__.state.ui.fx?.kind === 'sweep'`,
    freeze: `(() => {
      const s = window.__APN_QA__.state;
      if (s.ui.fx?.kind === 'sweep') s.ui.fx.t = Math.max(s.ui.fx.t, 0.42);
      s.world.hitStopT = 0.6;
      return true;
    })()`,
    timeoutMs: 9000,
  },
  {
    name: 'rank-halo',
    seed: SEED.replace('sharp_eye: 40, ', ''),
    act: `(async () => {
      const s = window.__APN_QA__.state;
      const f = await import('./js/formulas.js?v=golive-pr5');
      s.run.hero.xp = f.xpToNext(s.run.hero.level) - 1;
      s.ui.pendingTip = null;
      for (const k of ['start','kill','level','combo','patch','boss','gear','season','alert','ship']) s.ui.tips[k] = true;
      return true;
    })()`,
    wait: `window.__APN_QA__.state.run.hero.levelT > 0.72`,
    timeoutMs: 9000,
  },
  {
    name: 'golive-cinematic',
    act: `(() => {
      const s = window.__APN_QA__.state;
      s.route.zone = 10;
      s.meta.pendingGoLiveZone = 10;
      s.meta.lastGoLiveZone = 0;
      s.authority.shippedThisSeason = 400;
      window.__APN_QA__.actions.goLive();
      return true;
    })()`,
    wait: `window.__APN_QA__.state.ui.fx?.kind === 'golive' && window.__APN_QA__.state.ui.fx.t < 1.1`,
    timeoutMs: 4000,
  },
  {
    name: 'combo-meter',
    act: `(() => {
      const s = window.__APN_QA__.state;
      s.stats.combo = 7;
      s.stats.comboT = 1.9;
      return true;
    })()`,
    wait: `window.__APN_QA__.state.stats.combo >= 3`,
    settle: 120,
    timeoutMs: 4000,
  },
];

try {
  await waitForChrome();
  for (const sc of SCENARIOS) {
    await scenario(sc);
  }
  if (problems.length) {
    console.log('PROBLEMS:');
    for (const p of problems) console.log(` - ${p}`);
    process.exitCode = 1;
  } else {
    console.log(`WAVE3 EVIDENCE CLEAN ${output}`);
  }
} finally {
  chrome.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
