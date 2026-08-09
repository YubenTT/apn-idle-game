// Direct Google Chrome CDP smoke for Build V2 (PR-4b / issue #22).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9390;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-build-chrome-'));
const output = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'apn-build-evidence'));
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
const assert = (condition, message) => {
  if (!condition) throw new Error(`Chrome Build smoke: ${message}`);
  console.log(`OK ${message}`);
};

async function waitForChrome() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error('Chrome DevTools endpoint did not start');
}

function connect(url) {
  const socket = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  const events = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    } else events.push(message);
  };
  return {
    opened: new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    }),
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
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Chrome evaluation failed');
  return result.result.value;
}

async function waitFor(cdp, expression, label) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function scenario(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp.send('Page.navigate', { url: 'http://127.0.0.1:8791/?autostart=1&mute=1&chrome-smoke=1' });
  await waitFor(cdp, `window.__APN_QA__?.state && document.querySelector('#title-screen')?.hidden`, 'app ready');
  await evaluate(cdp, `(() => {
    const state = window.__APN_QA__.state;
    state.run.hero.sp = 18;
    state.run.hero.skills = { hotfix: 2, scroll_speed: 1, notify: 1, summary_burst: 2, deep_dive: 1 };
    document.querySelector('.nav-btn[data-panel="skills"]').click();
  })()`);
  await waitFor(cdp, `document.querySelectorAll('#panel-skills .build-branch').length === 3`, 'Build branches');
  await delay(250);

  const result = JSON.parse(await evaluate(cdp, `JSON.stringify({
    panel: document.querySelector('#sheet-root')?.dataset.panel,
    muted: window.__APN_QA__.state.settings.sfx === false,
    branchNames: [...document.querySelectorAll('#panel-skills .build-branch-copy strong')].map((node) => node.textContent.trim()),
    skillCount: document.querySelectorAll('#panel-skills .build-skill-card').length,
    masteryCount: document.querySelectorAll('#panel-skills .build-mastery-badge').length,
    spOutsideBuild: [...document.querySelectorAll('body *')].filter((node) => node.childElementCount === 0 && node.textContent.trim() === 'SP' && !node.closest('#panel-skills')).length,
    minTouch: Math.min(...[...document.querySelectorAll('#panel-skills button, #sheet-close')].map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height))),
    overflow: document.documentElement.scrollWidth - innerWidth,
  })`));
  const errors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params?.entry?.level))
  );
  assert(result.panel === 'skills' && result.muted, `${viewport.label} opens Build with SFX off`);
  assert(result.branchNames.join('|') === 'Scan|Verify|Relay', `${viewport.label} shows Scan / Verify / Relay`);
  assert(result.skillCount === 9 && result.masteryCount === 4, `${viewport.label} shows nine skills and four Mastery badges`);
  assert(result.spOutsideBuild === 0, `${viewport.label} keeps SP inside Build`);
  assert(result.minTouch >= 44, `${viewport.label} keeps controls at least 44 CSS px (${result.minTouch})`);
  assert(result.overflow <= 0, `${viewport.label} has no horizontal overflow (${result.overflow}px)`);
  assert(errors.length === 0, `${viewport.label} has no Chrome console errors/warnings`);

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(output, `${viewport.label}-build.png`), Buffer.from(shot.data, 'base64'));
}

try {
  await waitForChrome();
  const pageResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const page = await pageResponse.json();
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  for (const viewport of [
    { label: 'mobile-375', width: 375, height: 812 },
    { label: 'mobile-428', width: 428, height: 926 },
    { label: 'landscape-844', width: 844, height: 390 },
  ]) await scenario(cdp, viewport);
  console.log(`CHROME BUILD PASS ${output}`);
  cdp.close();
} finally {
  chrome.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
