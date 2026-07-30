// One-off layout probe: what overflows the right edge of the landscape dock?
import fs from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';

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

const PORT = 9392;
const URL_GAME = 'http://127.0.0.1:8791/?autostart=1&mute=1&chrome-smoke=1&zone=3';

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

const chrome = spawn(resolveChrome(), [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--window-size=844,390', 'about:blank',
], { stdio: 'ignore' });

try {
  let targets;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    targets = await getJson('/json/list').catch(() => null);
    if (targets?.length) break;
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };

  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await send('Page.enable');
  await send('Page.navigate', { url: URL_GAME });
  await new Promise((r) => setTimeout(r, 2500));
  // seed like the wave2 shots: focus full so chips render charged
  await evalJs(`(() => {
    const q = window.__APN_QA__; if (!q) return 'no qa';
    const s = q.state; s.run.hero.focus = 60;
    return 'ok';
  })()`);
  await new Promise((r) => setTimeout(r, 400));

  const report = await evalJs(`(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { l: +r.left.toFixed(1), r: +r.right.toFixed(1), w: +r.width.toFixed(1) };
    };
    const chips = [...document.querySelectorAll('.btn-chip')].map((c) => {
      const r = c.getBoundingClientRect();
      return { lab: c.querySelector('.chip-lab')?.textContent, l: +r.left.toFixed(1), r: +r.right.toFixed(1), w: +r.width.toFixed(1), scrollW: c.scrollWidth };
    });
    let chain = [];
    const chip = document.querySelector('.btn-chip:last-child');
    let n = chip;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      chain.push({ sel: n.className || n.id || n.tagName, ox: cs.overflowX, minW: cs.minWidth, w: +n.getBoundingClientRect().width.toFixed(1) });
      n = n.parentElement;
    }
    return {
      innerWidth,
      docScrollW: document.documentElement.scrollWidth,
      bodyScrollW: document.body.scrollWidth,
      hud: rect('.hud'),
      hudCta: rect('.hud-cta'),
      ctaRow: rect('.cta-row'),
      btnSkills: rect('.btn-skills'),
      chips,
      chain,
    };
  })()`);
  console.log(JSON.stringify(report, null, 1));
  ws.close();
} finally {
  chrome.kill('SIGKILL');
}
