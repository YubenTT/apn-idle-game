// V2 Super Polish · Wave 2 — chrome evidence capture.
// Drives the live game on :8791 through Chrome CDP, seeds states through
// window.__APN_QA__, and screenshots every chrome surface at three viewports.
// Usage: node qa/browser/chrome-wave2-shots.mjs [outputDir]
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
const port = 9391;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-wave2-chrome-'));
const output = path.resolve(process.argv[2] || 'qa/screenshots/v2-wave2');
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
  const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
  if (res.exceptionDetails) throw new Error(`page eval threw: ${res.exceptionDetails.text} in ${expression.slice(0, 80)}`);
  return res.result.value;
}
async function waitFor(cdp, expression, label) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return;
    await delay(100);
  }
  throw new Error(`wave2 shots: timed out waiting for ${label}`);
}
const shoot = async (cdp, file) => {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(`SHOT ${path.basename(file)}`);
};

// Fresh deterministic rich state: affordable CTA, four skills, Focus up, Rep
// for Boosts, a few gear pieces, hub progress — one seed for most surfaces.
const SEED = `(() => {
  const s = window.__APN_QA__.state;
  s.run.bytes = 86420;
  s.run.patches = 1325;
  s.run.hero.level = 9;
  s.run.hero.sp = 6;
  s.run.hero.scanner = 12;
  s.run.hero.focus = 60;
  s.run.hero.energy = 100;
  s.run.hero.skills = { hotfix: 3, summary_burst: 2, live_tracker: 4, deep_dive: 1, scroll_speed: 2, sharp_eye: 1 };
  s.authority.amount = 140;
  s.ui.tips.coachUpgrade = true;
  const mk = (id, slot, rarity, name, ilvl, key, value) => ({
    id, slot, rarity, name, ilvl, score: ilvl * 2,
    affixes: [{ key, label: key, unit: '%', value }],
  });
  s.meta.gear = {
    weapon: mk('w1', 'weapon', 'blue', 'Mod Stick', 11, 'dmg_pct', 18),
    chest: mk('c1', 'chest', 'green', 'Patch Mail', 9, 'energy', 12),
    legs: null,
    visor: mk('v1', 'visor', 'yellow', 'Signal Visor', 14, 'crit_pct', 9),
    bag: [
      mk('b1', 'legs', 'green', 'Sprint Leggings', 8, 'move_pct', 7),
      mk('b2', 'weapon', 'white', 'Scrap Mod', 4, 'flat_dmg', 5),
      mk('b3', 'chest', 'blue', 'Relay Vest', 12, 'notes_pct', 11),
    ],
  };
  return true;
})()`;

const SCENARIOS = [
  {
    name: 'run',
    seed: SEED,
    wait: `document.getElementById('v-bytes')?.textContent.length > 0`,
    settle: 900,
  },
  {
    name: 'build',
    seed: SEED,
    act: `document.querySelector('.nav-btn[data-panel="skills"]').click()`,
    wait: `document.querySelector('#panel-skills .build-skill-card')`,
    settle: 650,
  },
  {
    name: 'gear',
    seed: SEED,
    act: `document.getElementById('btn-bag').click()`,
    wait: `document.getElementById('gear-host-live')`,
    settle: 650,
  },
  {
    name: 'boosts',
    seed: SEED,
    act: `document.querySelector('.nav-btn[data-panel="meta"]').click()`,
    wait: `document.querySelector('#panel-meta .boost-row')`,
    settle: 650,
  },
  {
    name: 'menu',
    seed: SEED,
    act: `document.querySelector('.nav-btn[data-panel="settings"]').click()`,
    wait: `document.querySelector('#panel-settings .menu-section')`,
    settle: 650,
  },
  {
    name: 'golive',
    seed: `(() => {
      const s = window.__APN_QA__.state;
      ${SEED};
      s.route.zone = 10;
      s.meta.pendingGoLiveZone = 10;
      s.meta.lastGoLiveZone = 0;
      s.run.patches = 60;
      return true;
    })()`,
    act: `document.querySelector('.nav-btn[data-panel="ship"]').click()`,
    wait: `document.querySelector('#panel-ship [data-golive="arm"]')`,
    settle: 650,
  },
  {
    name: 'route',
    seed: SEED,
    act: `document.querySelector('.nav-btn[data-panel="hub"]').click()`,
    wait: `document.querySelector('#panel-hub .quest-row')`,
    settle: 650,
  },
  {
    name: 'run-coach',
    fresh: true,
    wait: `!document.getElementById('coach-hint')?.hidden`,
    settle: 700,
  },
];

const problems = [];

async function scenario(viewport, sc) {
  const tag = `${viewport.label}/${sc.name}`;
  const page = await createPage();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.scale, mobile: viewport.mobile,
  });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:8791/?autostart=1&mute=1&chrome-smoke=1&zone=3` });
  await waitFor(cdp, `window.__APN_QA__?.state`, 'app ready');
  // Isolate from anything a previous scenario persisted.
  await evaluate(cdp, `localStorage.clear(); true`);
  if (sc.fresh) {
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:8791/?autostart=1&mute=1&chrome-smoke=1` });
    await waitFor(cdp, `window.__APN_QA__?.state`, 'app ready (fresh)');
  }
  await evaluate(cdp, sc.fresh ? 'true' : sc.seed);
  if (sc.act) await evaluate(cdp, sc.act);
  await waitFor(cdp, sc.wait, sc.name);
  await delay(sc.settle || 500);
  const overflow = await evaluate(cdp, `document.documentElement.scrollWidth - window.innerWidth`);
  if (overflow > 0) problems.push(`${tag}: horizontal overflow ${overflow}px`);
  const errors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params?.entry?.level))
  );
  for (const e of errors) {
    const text = e.params?.entry?.text || e.params?.exceptionDetails?.text || '';
    if (/favicon|net::ERR_/i.test(text)) continue; // static-server noise, not app errors
    problems.push(`${tag}: console ${text.slice(0, 140)}`);
  }
  await shoot(cdp, path.join(output, `${viewport.label}-${sc.name}.png`));
  cdp.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`);
}

try {
  await waitForChrome();
  for (const viewport of VIEWPORTS) {
    for (const sc of SCENARIOS) {
      await scenario(viewport, sc);
    }
  }
  if (problems.length) {
    console.log('PROBLEMS:');
    for (const p of problems) console.log(` - ${p}`);
    process.exitCode = 1;
  } else {
    console.log(`WAVE2 EVIDENCE CLEAN ${output}`);
  }
} finally {
  chrome.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
