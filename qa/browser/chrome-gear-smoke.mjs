import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9388;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-gear-chrome-'));
const output = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'apn-gear-evidence'));
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
  if (!condition) throw new Error(`Chrome Gear smoke: ${message}`);
  console.log(`OK ${message}`);
};

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
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Chrome evaluation failed');
  return result.result.value;
}

async function capture(cdp, name) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(output, name), Buffer.from(shot.data, 'base64'));
}

const item = (id, slot, name, rarity, ilvl, key, label, unit, value) => ({
  id, slot, name, rarity, ilvl, junk: false,
  affixes: [{ key, label, unit, value }],
});

const seedExpression = `(() => {
  const s = window.__APN_QA__.state;
  s.meta.gear = {
    weapon: ${JSON.stringify(item('eq-w', 'weapon', 'Live Tracker', 'blue', 42, 'dmg_pct', 'Damage', '%', 8))},
    chest: ${JSON.stringify(item('eq-c', 'chest', 'Verified Shell', 'green', 39, 'energy', 'Energy', '', 19))},
    legs: ${JSON.stringify(item('eq-l', 'legs', 'Season Greaves', 'yellow', 40, 'move_pct', 'Sprint', '%', 10))},
    visor: ${JSON.stringify(item('eq-v', 'visor', 'Trust Visor', 'blue', 41, 'crit_pct', 'Crit', '%', 4))},
    bag: [
      ${JSON.stringify(item('bag-w', 'weapon', 'Changelog', 'yellow', 58, 'dmg_pct', 'Damage', '%', 12))},
      ${JSON.stringify(item('bag-c', 'chest', 'Live Coat', 'green', 55, 'energy', 'Energy', '', 24))},
      ${JSON.stringify(item('bag-l', 'legs', 'Trust Plates', 'blue', 34, 'move_pct', 'Sprint', '%', 9))},
      ${JSON.stringify(item('bag-v', 'visor', 'Signal Visor', 'green', 48, 'crit_pct', 'Crit', '%', 6))},
      ${JSON.stringify(item('bag-w2', 'weapon', 'Host Beam', 'unique', 64, 'dmg_pct', 'Damage', '%', 18))},
      ${JSON.stringify(item('bag-c2', 'chest', 'Draft Vest', 'white', 22, 'energy', 'Energy', '', 12))},
      ${JSON.stringify(item('bag-l2', 'legs', 'Sprint Leggings', 'green', 44, 'move_pct', 'Sprint', '%', 13))},
      ${JSON.stringify(item('bag-v2', 'visor', 'Gate Lens', 'yellow', 52, 'crit_pct', 'Crit', '%', 7))}
    ]
  };
  s.settings.gearSort = 'power';
  s.settings.gearFilter = 'all';
  document.getElementById('btn-bag').click();
  return true;
})()`;

async function runViewport(cdp, width, height, seed) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Page.navigate', { url: 'http://127.0.0.1:8791/?autostart=1&mute=1&chrome-smoke=1' });
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate(cdp, 'Boolean(window.__APN_QA__)')) break;
    await delay(100);
  }
  if (seed) await evaluate(cdp, seedExpression);
  else await evaluate(cdp, `document.getElementById('btn-bag').click()`);
  await delay(250);
  return JSON.parse(await evaluate(cdp, `JSON.stringify({
    panel: document.getElementById('sheet-root').dataset.panel,
    sound: window.__APN_QA__.state.settings.sfx,
    overflow: document.documentElement.scrollWidth - innerWidth,
    cards: document.querySelectorAll('.inv-cards .icard').length,
    columns: [...document.querySelectorAll('.inv-cards .icard')].slice(0, 5).map((node) => Math.round(node.getBoundingClientRect().x)),
    minTouch: Math.min(...[...document.querySelectorAll('#panel-gear button, #panel-gear select, #sheet-close')].map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height)))
  })`));
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

  const portrait = await runViewport(cdp, 428, 926, true);
  assert(portrait.panel === 'gear' && portrait.sound === false, 'portrait Gear opens with SFX off');
  assert(portrait.cards === 24 && new Set(portrait.columns).size === 5, 'portrait inventory is a 24-slot, 5-column grid');
  assert(portrait.minTouch >= 43.9, `portrait controls meet 44pt touch (${portrait.minTouch})`);
  assert(portrait.overflow <= 1, 'portrait has no horizontal overflow');
  await capture(cdp, 'gear-428-inventory.png');

  await evaluate(cdp, `document.querySelector('[data-inv="bag-w"]').click()`);
  await delay(120);
  const selected = JSON.parse(await evaluate(cdp, `JSON.stringify({
    detail: document.querySelector('.gear-detail')?.getBoundingClientRect().height,
    compare: document.querySelector('.gd-compare')?.textContent,
    actions: [...document.querySelectorAll('.gd-actions button')].map((node) => node.textContent.trim()),
    minAction: Math.min(...[...document.querySelectorAll('.gd-actions button')].map((node) => node.getBoundingClientRect().height))
  })`));
  assert(selected.detail > 120 && selected.compare.includes('→'), 'selection shows anchored compare delta');
  assert(selected.actions.length === 3 && selected.actions.some((label) => label.startsWith('Scrap')), 'equip, junk, and scrap actions are explicit');
  assert(selected.minAction >= 43.9, 'selected actions meet 44pt touch');
  await capture(cdp, 'gear-428-selected.png');

  await evaluate(cdp, `document.querySelector('[data-junk="bag-w"]').click()`);
  await evaluate(cdp, `(() => {
    const sort = document.querySelector('[data-gear-sort]'); sort.value = 'rarity'; sort.dispatchEvent(new Event('change', { bubbles:true }));
    const filter = document.querySelector('[data-gear-filter]'); filter.value = 'junk'; filter.dispatchEvent(new Event('change', { bubbles:true }));
  })()`);
  await delay(120);
  assert(await evaluate(cdp, `document.querySelectorAll('.icard.junk').length === 1`), 'junk/filter state updates visibly');

  const persisted = await runViewport(cdp, 428, 926, false);
  assert(persisted.panel === 'gear' && persisted.sound === false, 'Gear reload remains muted and playable');
  assert(await evaluate(cdp, `document.querySelector('[data-gear-sort]').value === 'rarity' && document.querySelector('[data-gear-filter]').value === 'junk'`), 'sort and filter persist across reload');
  assert(await evaluate(cdp, `document.querySelector('[data-inv="bag-w"]')?.classList.contains('junk')`), 'junk mark persists across reload');
  await capture(cdp, 'gear-428-persisted.png');

  await evaluate(cdp, `(() => { const filter = document.querySelector('[data-gear-filter]'); filter.value = 'all'; filter.dispatchEvent(new Event('change', { bubbles:true })); })()`);
  await evaluate(cdp, `document.querySelector('[data-inv="bag-w2"]').click()`);
  await evaluate(cdp, `document.querySelector('[data-equip="bag-w2"]').click()`);
  assert(await evaluate(cdp, `window.__APN_QA__.state.meta.gear.weapon.id === 'bag-w2'`), 'Equip swaps the selected item into its slot');
  await evaluate(cdp, `document.querySelector('[data-inv="bag-c2"]').click()`);
  const beforeScrap = await evaluate(cdp, `window.__APN_QA__.state.meta.gear.bag.length`);
  await evaluate(cdp, `document.querySelector('[data-sell="bag-c2"]').click()`);
  assert(await evaluate(cdp, `window.__APN_QA__.state.meta.gear.bag.length === ${beforeScrap - 1} && window.__APN_QA__.state.run.bytes > 0`), 'Scrap removes the item and grants Signal');

  const small = await runViewport(cdp, 375, 812, false);
  assert(small.overflow <= 1 && small.minTouch >= 43.9, '375-wide Gear has no overflow and preserves touch size');
  await capture(cdp, 'gear-375.png');

  const landscape = await runViewport(cdp, 844, 390, false);
  assert(landscape.overflow <= 1 && landscape.panel === 'gear', 'landscape Gear opens full-screen without horizontal overflow');
  await capture(cdp, 'gear-844x390.png');

  const errors = cdp.events.filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params?.entry?.level))
  );
  assert(errors.length === 0, 'Gear flow has no Chrome console errors/warnings');
  cdp.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`);
  console.log(`CHROME GEAR PASS ${output}`);
} finally {
  chrome.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
