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

const VISUAL_FIDELITY_SOURCE_FAMILY = 'authored-semantic-v4';
const VISUAL_FIDELITY_PROFILE_SHA256 =
  '76d15cc95e8a0bf2f40867abb09f375148679e71f3746e11d51130f83c463dd4';
const APPROVED_MOTION_SHA256 = Object.freeze({
  'entry-runner':
    '54b6fd43c60def0ce0d270bc91ec3729af7e16442d118a8ecaf953c9fc6f2425',
  'protocol-courier':
    '992f4cdb38d18833412fed6d33cca8359ad4c13031a70ddaa0825f51c87936f4',
  'signal-hunter':
    '2f128f8fb6851316092819213c82699ce82a23de01fd71007f4bc12bd015c881',
  'site-sentinel':
    '5e2416fdaf9b829c3ea4f26fa0a257f35d3e189c84cfc9f178ed47e2fa48ec8e',
  'site-warden':
    '707e53ae77c2c3a3f37cdec70ba35f59a710c690247b7b1365a49204ad39abae',
  'veil-operator':
    '29852c0f6bbdb5b40b4577eaaf088835c854bb5f73494bc357d68151ab521efa',
});

function screenshotFile(outputDir, viewportLabel, wave, suffix = '') {
  const waveLabel = String(wave).padStart(2, '0');
  return path.join(outputDir, `${viewportLabel}-wave-${waveLabel}${suffix}.png`);
}

async function captureScreenshot(cdp, outputPath) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(outputPath, Buffer.from(shot.result.data, 'base64'));
}

function consoleProblems(events) {
  const requestUrls = new Map(
    events
      .filter((event) => event.method === 'Network.requestWillBeSent')
      .map((event) => [
        event.params?.requestId,
        event.params?.request?.url || 'unknown request',
      ]),
  );
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
        return `${event.params?.errorText || 'network load failed'} ${requestUrls.get(event.params?.requestId) || 'unknown request'} ${event.params?.blockedReason || ''}`.trim();
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
  1: [{ assetId: 'entry-runner', label: 'Entry Runner', frame: 'common-a' }],
  2: [{ assetId: 'veil-operator', label: 'Veil Operator', frame: 'common-b' }],
  3: [{ assetId: 'signal-hunter', label: 'Signal Hunter', frame: 'common-c' }],
  4: [
    { assetId: 'entry-runner', label: 'Entry Runner', frame: 'common-a' },
    { assetId: 'veil-operator', label: 'Veil Operator', frame: 'common-b' },
  ],
  5: [{ assetId: 'site-sentinel', label: 'Site Sentinel', frame: 'elite' }],
  6: [
    { assetId: 'entry-runner', label: 'Entry Runner', frame: 'common-a' },
    { assetId: 'signal-hunter', label: 'Signal Hunter', frame: 'common-c' },
  ],
  7: [
    { assetId: 'veil-operator', label: 'Veil Operator', frame: 'common-b' },
    { assetId: 'site-sentinel', label: 'Site Sentinel', frame: 'elite' },
  ],
  8: [
    { assetId: 'entry-runner', label: 'Entry Runner', frame: 'common-a' },
    { assetId: 'veil-operator', label: 'Veil Operator', frame: 'common-b' },
    { assetId: 'signal-hunter', label: 'Signal Hunter', frame: 'common-c' },
    { assetId: 'site-sentinel', label: 'Site Sentinel', frame: 'elite' },
  ],
  9: [{ assetId: 'protocol-courier', label: 'Protocol Courier', frame: 'event' }],
  10: [{ assetId: 'site-warden', label: 'Site Warden', frame: 'boss' }],
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function expectedWaveIdentity(wave, label, frame) {
  return WAVE_EXPECTATIONS[wave]?.find(
    (entry) => entry.label === label && entry.frame === frame,
  ) || null;
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

async function advanceUntilCurrentMotionCanSpawn(cdp) {
  return evaluate(cdp, `(async () => {
    const q = window.__APN_QA__;
    const store = q.assets.motionStore;
    const waitForPendingMotion = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const deadline = performance.now() + 3000;
      while (
        [...store.entries.values()].some((entry) => entry?.status === 'pending')
      ) {
        if (performance.now() >= deadline) {
          throw new Error('timed out waiting for current-wave motion');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    };
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      window.advanceTime(17);
      await waitForPendingMotion();
      if (q.state.world.enemies.some((candidate) => candidate.hp > 0)) {
        return attempt;
      }
    }
    return 0;
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

async function resetProductionMotionEvidence(cdp) {
  const expectedAssetIds = Object.keys(APPROVED_MOTION_SHA256).sort();
  return evaluate(cdp, `(async () => {
    const { releaseColdMotion } =
      await import('/js/motion-store.js?v=enhanced-v1');
    const q = window.__APN_QA__;
    const packAssets = q?.assets?.packs?.get('valorant');
    if (!packAssets?.pack || !q.assets.motionStore) {
      throw new Error('Production motion evidence requires the query-gated asset store');
    }
    const pack = packAssets.pack;
    const expectedAssetIds = ${JSON.stringify(expectedAssetIds)};
    const actualAssetIds = Object.keys(pack.motion?.characters || {}).sort();
    if (JSON.stringify(actualAssetIds) !== JSON.stringify(expectedAssetIds)) {
      throw new Error('Production motion mapping is not the exact approved six-asset set');
    }
    if (Object.hasOwn(pack.motion.characters, 'apn-hero')) {
      throw new Error('Hero entered production without the separate rig authority');
    }
    for (const [assetId, source] of Object.entries(pack.motion.characters)) {
      if (
        source.sourceFamily !== ${JSON.stringify(VISUAL_FIDELITY_SOURCE_FAMILY)} ||
        source.selectedProfileSha256 !== ${JSON.stringify(VISUAL_FIDELITY_PROFILE_SHA256)}
      ) {
        throw new Error(assetId + ': production V4 source/profile authority drift');
      }
    }
    releaseColdMotion(q.assets.motionStore, new Set());
    q.assets.motionStore.diagnostics.clear();
    performance.clearResourceTimings();
    for (const name of [
      'qa-motion-current-start',
      'qa-motion-current-ready',
      'qa-motion-first-frame',
      'qa-motion-next-start',
      'qa-motion-next-ready',
    ]) {
      performance.clearMarks(name);
    }
    return { assetIds: actualAssetIds };
  })()`);
}

async function productionMotionSnapshot(cdp) {
  return evaluate(cdp, `(async () => {
    const { motionDiagnostics } =
      await import('/js/motion-store.js?v=enhanced-v1');
    const q = window.__APN_QA__;
    const resources = performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('/assets/game-packs/valorant/characters/'))
      .map((entry) => ({
        name: entry.name,
        startTime: entry.startTime,
        responseEnd: entry.responseEnd,
        transferSize: entry.transferSize,
      }));
    const marks = Object.fromEntries(
      performance
        .getEntriesByType('mark')
        .filter((entry) => entry.name.startsWith('qa-motion-'))
        .map((entry) => [entry.name, entry.startTime]),
    );
    return {
      entries: Object.fromEntries(
        [...q.assets.motionStore.entries.entries()].map(([key, entry]) => [
          key,
          {
            status: entry?.status || null,
            authority: entry?.descriptor?.authority || null,
            sourceFamily:
              entry?.descriptor?.sourceFamily || entry?.set?.sourceFamily || null,
            clip: entry?.descriptor?.name || null,
          },
        ]),
      ),
      diagnostics: motionDiagnostics(q.assets.motionStore),
      resources,
      marks,
    };
  })()`);
}

async function observeProductionMotion(cdp, timestamp) {
  return evaluate(cdp, `(async () => {
    const q = window.__APN_QA__;
    const state = q.state;
    const enemy = state.world.enemies.find((candidate) => candidate.hp > 0);
    if (!enemy) throw new Error('Production motion enemy is missing');
    state.world.time = ${JSON.stringify(timestamp)};
    window.advanceTime(0);
    const text = JSON.parse(window.render_game_to_text());
    const canvas = document.querySelector('#game');
    // Canvas 2D uses one exact DPR transform. Parent layout width can straddle
    // a fractional CSS pixel on mobile Chrome, which would move the evidence
    // crop by one device pixel between otherwise identical fresh runs.
    const ratioX = window.devicePixelRatio;
    const ratioY = ratioX;
    const geometry = q.presentation?.()?.actors?.find(
      (actor) => actor.id === enemy.id,
    )?.geometry;
    if (!geometry) throw new Error('Production motion geometry is missing');
    const logicalBounds = geometry.motionEnvelope;
    const x = Math.max(0, Math.round(logicalBounds.left * ratioX));
    const y = Math.max(0, Math.round(logicalBounds.top * ratioY));
    const width = Math.max(
      1,
      Math.round((logicalBounds.right - logicalBounds.left) * ratioX),
    );
    const height = Math.max(1, Math.min(
      canvas.height - y,
      Math.round((logicalBounds.bottom - logicalBounds.top) * ratioY),
    ));
    const sampler = new OffscreenCanvas(width, height);
    const samplerContext = sampler.getContext('2d', { willReadFrequently: true });
    samplerContext.drawImage(
      canvas,
      x,
      y,
      width,
      height,
      0,
      0,
      width,
      height,
    );
    const pixels = samplerContext.getImageData(0, 0, width, height).data;
    const digest = await crypto.subtle.digest('SHA-256', pixels);
    const hash = [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
    const rgba = [0, 0, 0, 0];
    const pixelCount = pixels.length / 4;
    for (let index = 0; index < pixels.length; index += 4) {
      rgba[0] += pixels[index];
      rgba[1] += pixels[index + 1];
      rgba[2] += pixels[index + 2];
      rgba[3] += pixels[index + 3];
    }
    return {
      timestamp: state.world.time,
      motion: text.motion,
      geometry: {
        role: geometry.role,
        bodyTop: geometry.body.top,
        bodyBottom: geometry.body.bottom,
        bodyHeight: geometry.body.height,
        visualGap: geometry.visualGap,
        motionTop: geometry.motionEnvelope.top,
        hpY: geometry.anchors.hpY,
        shadowY: geometry.anchors.shadowY,
      },
      sample: {
        x,
        y,
        width,
        height,
        rgba: rgba.map((value) => Math.round(value / pixelCount)),
        sha256: hash,
      },
    };
  })()`);
}

async function validateReducedMotionAuthority(cdp) {
  const emulate = (value) =>
    cdp.send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [{ name: 'prefers-reduced-motion', value }],
    });
  const snapshot = () =>
    evaluate(cdp, `(async () => {
      const { motionReduced } =
        await import('/js/motion-preference.js?v=enhanced-v1');
      const state = window.__APN_QA__.state;
      const savedRaw = localStorage.getItem('apn_idle_save_v2');
      return {
        saved: state.settings.reducedMotion,
        os: state.runtime.osReducedMotion,
        effective: motionReduced(state),
        css: document.documentElement.classList.contains('reduce-motion'),
        media: matchMedia('(prefers-reduced-motion: reduce)').matches,
        checkbox: document.querySelector('#chk-motion')?.checked,
        savedRaw,
      };
    })()`);

  await emulate('no-preference');
  await waitFor(
    cdp,
    `window.__APN_QA__.state.runtime.osReducedMotion === false &&
      !document.documentElement.classList.contains('reduce-motion')`,
    'baseline motion preference',
  );
  const baseline = await snapshot();
  assert(
    baseline.saved === false &&
      baseline.os === false &&
      baseline.effective === false &&
      baseline.css === false &&
      baseline.media === false &&
      baseline.checkbox === false,
    'motion baseline is not unified',
  );

  await emulate('reduce');
  await waitFor(
    cdp,
    `window.__APN_QA__.state.runtime.osReducedMotion === true &&
      document.documentElement.classList.contains('reduce-motion')`,
    'OS reduced-motion activation',
  );
  const osReduced = await snapshot();
  assert(
    osReduced.saved === false &&
      osReduced.os === true &&
      osReduced.effective === true &&
      osReduced.css === true &&
      osReduced.media === true &&
      osReduced.checkbox === false &&
      osReduced.savedRaw === baseline.savedRaw,
    'OS reduced motion changed the saved in-app toggle or split state/CSS',
  );

  await emulate('no-preference');
  await waitFor(
    cdp,
    `window.__APN_QA__.state.runtime.osReducedMotion === false &&
      !document.documentElement.classList.contains('reduce-motion')`,
    'OS reduced-motion deactivation',
  );
  const osCleared = await snapshot();
  assert(
    osCleared.saved === false &&
      osCleared.effective === false &&
      osCleared.savedRaw === baseline.savedRaw,
    'clearing OS reduced motion changed the saved toggle',
  );

  await evaluate(cdp, `(() => {
    const checkbox = document.querySelector('#chk-motion');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await waitFor(
    cdp,
    `window.__APN_QA__.state.settings.reducedMotion === true &&
      document.documentElement.classList.contains('reduce-motion')`,
    'saved reduced-motion activation',
  );
  const savedReduced = await snapshot();
  assert(
    savedReduced.saved === true &&
      savedReduced.os === false &&
      savedReduced.effective === true &&
      savedReduced.css === true &&
      savedReduced.checkbox === true,
    'saved reduced motion is not the unified authority',
  );

  await emulate('reduce');
  await waitFor(cdp, `window.__APN_QA__.state.runtime.osReducedMotion === true`, 'saved + OS reduced motion');
  await emulate('no-preference');
  await waitFor(cdp, `window.__APN_QA__.state.runtime.osReducedMotion === false`, 'saved-only reduced motion');
  const savedAfterOsChanges = await snapshot();
  assert(
    savedAfterOsChanges.saved === true &&
      savedAfterOsChanges.effective === true &&
      savedAfterOsChanges.css === true &&
      savedAfterOsChanges.savedRaw === savedReduced.savedRaw,
    'OS media-query changes overwrote the saved reduced-motion toggle',
  );

  await evaluate(cdp, `(() => {
    const checkbox = document.querySelector('#chk-motion');
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await waitFor(
    cdp,
    `window.__APN_QA__.state.settings.reducedMotion === false &&
      !document.documentElement.classList.contains('reduce-motion')`,
    'reduced-motion cleanup',
  );

  return {
    baseline: {
      saved: baseline.saved,
      os: baseline.os,
      effective: baseline.effective,
      css: baseline.css,
    },
    osReduced: {
      saved: osReduced.saved,
      os: osReduced.os,
      effective: osReduced.effective,
      css: osReduced.css,
    },
    savedAfterOsChanges: {
      saved: savedAfterOsChanges.saved,
      os: savedAfterOsChanges.os,
      effective: savedAfterOsChanges.effective,
      css: savedAfterOsChanges.css,
    },
  };
}

async function validateProductionMotion(cdp, viewport, outputDir, port) {
  await prepareWave(cdp, 1);
  const reset = await resetProductionMotionEvidence(cdp);
  assert(
    JSON.stringify(reset.assetIds) ===
      JSON.stringify(Object.keys(APPROVED_MOTION_SHA256).sort()),
    `${viewport.label}: production motion mapping is not the approved six-asset set`,
  );
  await evaluate(cdp, `performance.mark('qa-motion-current-start')`);
  const spawnAttempt = await advanceUntilCurrentMotionCanSpawn(cdp);
  assert(
    spawnAttempt > 0,
    `${viewport.label}: production Entry Runner never opened the spawn gate`,
  );
  await evaluate(cdp, `(() => {
    performance.mark('qa-motion-current-ready');
    performance.mark('qa-motion-first-frame');
    const state = window.__APN_QA__.state;
    const enemy = state.world.enemies.find((candidate) => candidate.hp > 0);
    if (!enemy) throw new Error('Enemy missing before production motion observation');
    enemy.id = 'qa-production-entry';
    enemy.type = 'stale';
    enemy.label = 'Entry Runner';
    enemy.packId = 'valorant';
    enemy.frame = 'common-a';
    enemy.x = state.world.heroX + 150;
    enemy.displayX = enemy.x;
    enemy.hurt = 0;
    enemy.hitFlash = 0;
    enemy.critFlash = 0;
    state.world.shake = 0;
    state.world.alerts = [];
    state.world.floaters = [];
    state.world.particles = [];
    state.world.lootFlights = [];
    state.world.confetti = [];
    state.world.shocks = [];
    state.ui.toast = null;
    state.ui.toastT = 0;
    return true;
  })()`);

  const currentWarm = await productionMotionSnapshot(cdp);
  const currentResources = currentWarm.resources.filter((entry) =>
    entry.name.includes('/entry-runner/'),
  );
  const nextSetResources = currentWarm.resources.filter((entry) =>
    entry.name.includes('/veil-operator/'),
  );
  assert(
    currentWarm.entries['valorant/entry-runner']?.status === 'ready' &&
      currentWarm.entries['valorant/entry-runner#advance']?.status === 'ready' &&
      currentWarm.entries['valorant/veil-operator']?.status === 'ready' &&
      !Object.keys(currentWarm.entries).some((key) =>
        key.startsWith('valorant/veil-operator#'),
      ),
    `${viewport.label}: route window did not keep next-wave V4 metadata warm and its clip body cold`,
  );
  assert(
    currentResources.length === 3 &&
      currentResources.some((entry) => entry.name.includes('/set.json?')) &&
      currentResources.some((entry) => entry.name.includes('/advance.json?')) &&
      currentResources.some((entry) => entry.name.includes('/advance.webp?')) &&
      nextSetResources.length === 1 &&
      nextSetResources[0].name.includes('/set.json?'),
    `${viewport.label}: current/next production request partition is not set+selected-clip / set-only`,
  );
  assert(
    [...currentResources, ...nextSetResources].every((entry) =>
      entry.name.includes('sha256='),
    ) &&
      currentResources.every(
        (entry) =>
          entry.responseEnd <= currentWarm.marks['qa-motion-first-frame'],
      ),
    `${viewport.label}: production resources are not immutable and ready before first draw`,
  );
  assert(
    currentWarm.diagnostics.length === 0,
    `${viewport.label}: production warm recorded fallback diagnostics`,
  );

  const frame0 = await observeProductionMotion(cdp, 0);
  await captureScreenshot(cdp, screenshotFile(outputDir, viewport.label, 1, '-motion-frame-0'));
  assert(
    frame0.motion.status === 'ready' &&
      frame0.motion.assetId === 'entry-runner' &&
      frame0.motion.clip === 'advance' &&
      Number.isInteger(frame0.motion.frameIndex) &&
      frame0.motion.fallbacks === 0 &&
      frame0.motion.authority === 'approved_release' &&
      frame0.motion.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY &&
      frame0.motion.motionApprovalSha256 ===
        APPROVED_MOTION_SHA256['entry-runner'] &&
      frame0.motion.selectedProfileSha256 ===
        VISUAL_FIDELITY_PROFILE_SHA256 &&
      /^[a-f0-9]{64}$/.test(frame0.motion.candidateSha256 || '') &&
      /^[a-f0-9]{64}$/.test(frame0.motion.runtimeLineageSha256 || '') &&
      /^[a-f0-9]{64}$/.test(frame0.motion.derivativeSetSha256 || '') &&
      frame0.geometry.role === 'standard' &&
      Math.abs(
        frame0.geometry.visualGap / frame0.geometry.bodyHeight - 2 / 72,
      ) < 1e-9 &&
      Math.abs(
        frame0.geometry.shadowY -
          frame0.geometry.bodyBottom -
          frame0.geometry.visualGap,
      ) < 1e-9 &&
      Math.abs(
        frame0.geometry.hpY - frame0.geometry.motionTop + 10,
      ) < 1e-9 &&
      /^[a-f0-9]{64}$/.test(frame0.sample.sha256),
    `${viewport.label}: first production V4 frame lacks approved release authority, geometry, or pixels (${JSON.stringify(frame0)})`,
  );
  const frame1 = await observeProductionMotion(cdp, 0.13);
  assert(
      frame1.motion.status === 'ready' &&
      frame1.motion.clip === 'advance' &&
      frame1.motion.fallbacks === 0 &&
      frame1.motion.frameIndex !== frame0.motion.frameIndex,
    `${viewport.label}: production V4 advance did not change frame at timestamp 0.13 (${JSON.stringify(frame1)})`,
  );
  assert(
    frame0.sample.sha256 !== frame1.sample.sha256,
    `${viewport.label}: changing production V4 frame produced identical sampled pixels`,
  );
  await captureScreenshot(cdp, screenshotFile(outputDir, viewport.label, 1, '-motion-frame-1'));

  const replay0 = await observeProductionMotion(cdp, 0);
  assert(
    replay0.motion.frameIndex === frame0.motion.frameIndex &&
      replay0.sample.sha256 === frame0.sample.sha256,
    `${viewport.label}: fixed simulation timestamp did not reproduce exact production pixels`,
  );

  await evaluate(cdp, `(() => {
    window.__APN_QA_LIFECYCLE__ = [document.visibilityState];
    document.addEventListener('visibilitychange', () => {
      window.__APN_QA_LIFECYCLE__.push(document.visibilityState);
    });
    return true;
  })()`);
  const beforeLifecycle = await observeProductionMotion(cdp, 0.13);
  const coverPage = await createPage(port);
  try {
    await waitFor(cdp, `document.visibilityState === 'hidden'`, 'hidden-tab lifecycle state');
    await delay(120);
    await cdp.send('Page.bringToFront');
    await waitFor(cdp, `document.visibilityState === 'visible'`, 'page lifecycle resume');
  } finally {
    await closePage(port, coverPage.id);
  }
  const afterLifecycle = await observeProductionMotion(cdp, 0.13);
  const lifecycleStates = await evaluate(cdp, `window.__APN_QA_LIFECYCLE__`);
  assert(
    lifecycleStates.includes('hidden') && lifecycleStates.at(-1) === 'visible',
    `${viewport.label}: lifecycle did not traverse hidden → visible`,
  );
  assert(
    afterLifecycle.motion.status === 'ready' &&
      afterLifecycle.motion.frameIndex === beforeLifecycle.motion.frameIndex &&
      afterLifecycle.motion.fallbacks === 0 &&
      afterLifecycle.sample.sha256 === beforeLifecycle.sample.sha256,
    `${viewport.label}: lifecycle resume corrupted the fixed authored frame`,
  );
  const frame2 = await observeProductionMotion(cdp, 0.26);
  assert(
    frame2.motion.frameIndex !== frame1.motion.frameIndex &&
      frame2.motion.fallbacks === 0 &&
      frame2.sample.sha256 !== frame1.sample.sha256,
    `${viewport.label}: post-resume timestamp did not advance production V4 pixels (${JSON.stringify(frame2)})`,
  );

  const reducedMotion = await validateReducedMotionAuthority(cdp);
  await evaluate(cdp, `performance.mark('qa-motion-next-start')`);
  await prepareWave(cdp, 2);
  const nextSpawnAttempt = await advanceUntilCurrentMotionCanSpawn(cdp);
  assert(
    nextSpawnAttempt > 0,
    `${viewport.label}: production Veil Operator never opened the next-wave spawn gate`,
  );
  await evaluate(cdp, `performance.mark('qa-motion-next-ready')`);
  const nextState = await readState(cdp);
  const nextWarm = await productionMotionSnapshot(cdp);
  const nextStart = nextWarm.marks['qa-motion-next-start'];
  const transitionResources = nextWarm.resources.filter(
    (entry) => entry.startTime >= nextStart,
  );
  const veilTransitionResources = transitionResources.filter((entry) =>
    entry.name.includes('/veil-operator/'),
  );
  const signalTransitionResources = transitionResources.filter((entry) =>
    entry.name.includes('/signal-hunter/'),
  );
  assert(
    nextState.motion?.status === 'ready' &&
      nextState.motion?.assetId === 'veil-operator' &&
      nextState.motion?.clip === 'advance' &&
      nextState.motion?.authority === 'approved_release' &&
      nextState.motion?.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY &&
      nextState.motion?.motionApprovalSha256 ===
        APPROVED_MOTION_SHA256['veil-operator'] &&
      nextState.motion?.fallbacks === 0,
    `${viewport.label}: next route did not draw approved Veil Operator advance`,
  );
  assert(
    veilTransitionResources.length === 2 &&
      veilTransitionResources.some((entry) =>
        entry.name.includes('/advance.json?'),
      ) &&
      veilTransitionResources.some((entry) =>
        entry.name.includes('/advance.webp?'),
      ) &&
      signalTransitionResources.length === 1 &&
      signalTransitionResources[0].name.includes('/set.json?') &&
      transitionResources.every((entry) => entry.name.includes('sha256=')),
    `${viewport.label}: route transition fetched more than the selected Veil clip plus next Signal set`,
  );
  await captureScreenshot(
    cdp,
    screenshotFile(outputDir, viewport.label, 2, '-motion-next'),
  );
  const problems = consoleProblems(cdp.events);
  assert(problems.length === 0, `${viewport.label}: production-motion browser problems: ${problems.join(' | ')}`);

  const normalizeResources = (resources) =>
    resources
      .map((entry) => {
        const url = new URL(entry.name);
        return `${url.pathname}${url.search}`;
      })
      .sort();

  return {
    viewport: viewport.label,
    authority: frame2.motion.authority,
    sourceFamily: frame2.motion.sourceFamily,
    motionApprovalSha256: frame2.motion.motionApprovalSha256,
    runtimeLineageSha256: frame2.motion.runtimeLineageSha256,
    derivativeSetSha256: frame2.motion.derivativeSetSha256,
    selectedProfileSha256: frame2.motion.selectedProfileSha256,
    status: frame2.motion.status,
    clip: frame2.motion.clip,
    fallbacks: frame2.motion.fallbacks,
    frames: [frame0, frame1, frame2],
    lifecycle: lifecycleStates,
    reducedMotion,
    requests: {
      currentSetAndSelectedClip: normalizeResources(currentResources),
      nextSetOnly: normalizeResources(nextSetResources),
      routeTransitionSelectedClipAndNextSet:
        normalizeResources(transitionResources),
    },
    screenshots: [
      path.relative(process.cwd(), screenshotFile(outputDir, viewport.label, 1, '-motion-frame-0')),
      path.relative(process.cwd(), screenshotFile(outputDir, viewport.label, 1, '-motion-frame-1')),
      path.relative(process.cwd(), screenshotFile(outputDir, viewport.label, 2, '-motion-next')),
    ],
  };
}

async function setOsReducedMotion(cdp, enabled) {
  await cdp.send('Emulation.setEmulatedMedia', {
    media: 'screen',
    features: [
      {
        name: 'prefers-reduced-motion',
        value: enabled ? 'reduce' : 'no-preference',
      },
    ],
  });
  await waitFor(
    cdp,
    `window.__APN_QA__.state.runtime.osReducedMotion === ${enabled} &&
      document.documentElement.classList.contains('reduce-motion') === ${enabled}`,
    enabled ? 'reduced wave-matrix mode' : 'standard wave-matrix mode',
  );
}

async function validateWave(
  cdp,
  viewport,
  wave,
  outputDir,
  reducedMotion = false,
) {
  await prepareWave(cdp, wave);
  const spawnAttempt = await advanceUntilCurrentMotionCanSpawn(cdp);
  assert(
    spawnAttempt > 0,
    `${viewport.label} wave ${wave}: current-wave motion never opened the spawn gate`,
  );
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
  const expectedIdentity = enemy
    ? expectedWaveIdentity(wave, enemy.label, enemy.frame)
    : null;

  assert(state.routeZone === wave, `${viewport.label} wave ${wave}: route zone mismatch`);
  assert(state.packWave === wave, `${viewport.label} wave ${wave}: pack wave mismatch`);
  assert(state.packId === 'valorant', `${viewport.label} wave ${wave}: current pack is not valorant`);
  assert(state.pack?.ready === true, `${viewport.label} wave ${wave}: Valorant pack not ready`);
  assert(state.pack?.atlas?.width === 896 && state.pack?.atlas?.height === 128, `${viewport.label} wave ${wave}: atlas size mismatch`);
  assert(state.extra?.targetNaturalWidth === 896 && state.extra?.targetNaturalHeight === 128, `${viewport.label} wave ${wave}: natural atlas size mismatch`);
  assert(state.muted === true, `${viewport.label} wave ${wave}: audio not muted`);
  assert(
    state.reducedMotion === reducedMotion,
    `${viewport.label} wave ${wave}: expected ${reducedMotion ? 'reduced' : 'standard'} motion authority`,
  );
  assert(state.viewport?.overflowX === 0, `${viewport.label} wave ${wave}: horizontal overflow detected`);
  assert(state.extra?.overflowY === 0, `${viewport.label} wave ${wave}: vertical overflow detected`);
  assert(enemy, `${viewport.label} wave ${wave}: no spawned enemy`);
  assert(expectedIdentity, `${viewport.label} wave ${wave}: unexpected ${enemy.label}/${enemy.frame}`);
  assert(
    state.motion?.assetId === expectedIdentity.assetId &&
      state.motion?.status === 'ready' &&
      state.motion?.clip === 'advance' &&
      state.motion?.fallbacks === 0 &&
      state.motion?.authority === 'approved_release' &&
      state.motion?.sourceFamily === VISUAL_FIDELITY_SOURCE_FAMILY &&
      state.motion?.motionApprovalSha256 ===
        APPROVED_MOTION_SHA256[expectedIdentity.assetId] &&
      state.motion?.selectedProfileSha256 ===
        VISUAL_FIDELITY_PROFILE_SHA256 &&
      /^[a-f0-9]{64}$/.test(state.motion?.runtimeLineageSha256 || '') &&
      /^[a-f0-9]{64}$/.test(state.motion?.derivativeSetSha256 || ''),
    `${viewport.label} wave ${wave}: enemy is not backed by the approved V4 release (${JSON.stringify(state.motion)})`,
  );
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

  const modeSuffix = reducedMotion ? '-reduced' : '';
  await captureScreenshot(
    cdp,
    screenshotFile(outputDir, viewport.label, wave, modeSuffix),
  );

  const result = {
    viewport: viewport.label,
    wave,
    mode: reducedMotion ? 'reduced' : 'standard',
    label: enemy.label,
    frame: enemy.frame,
    assetId: state.motion.assetId,
    authority: state.motion.authority,
    motionApprovalSha256: state.motion.motionApprovalSha256,
    runtimeLineageSha256: state.motion.runtimeLineageSha256,
    hpRatio: enemy.hpRatio,
    screenshot: path.relative(
      process.cwd(),
      screenshotFile(outputDir, viewport.label, wave, modeSuffix),
    ),
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
    await captureScreenshot(
      cdp,
      screenshotFile(
        outputDir,
        viewport.label,
        wave,
        `${modeSuffix}-boss-break`,
      ),
    );
    result.bossBreak = {
      frame: brokenEnemy.frame,
      hpRatio: brokenEnemy.hpRatio,
      screenshot: path.relative(
        process.cwd(),
        screenshotFile(
          outputDir,
          viewport.label,
          wave,
          `${modeSuffix}-boss-break`,
        ),
      ),
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
  const productionMotionFindings = [];
  for (const viewport of VIEWPORTS) {
    const { cdp, page } = await bootstrapPage(port, viewport, smokeUrl(1, true));
    try {
      await waitForQaReady(cdp);
      await setOsReducedMotion(cdp, false);
      for (let wave = 1; wave <= 10; wave += 1) {
        findings.push(await validateWave(cdp, viewport, wave, OUTPUT_DIR));
      }
      await setOsReducedMotion(cdp, true);
      for (let wave = 1; wave <= 10; wave += 1) {
        findings.push(
          await validateWave(cdp, viewport, wave, OUTPUT_DIR, true),
        );
      }
      await setOsReducedMotion(cdp, false);
      productionMotionFindings.push(
        await validateProductionMotion(cdp, viewport, OUTPUT_DIR, port),
      );
    } finally {
      cdp.close();
      await closePage(port, page.id);
    }
  }

  const noGate = await verifyNoGatePage(port, VIEWPORTS[0]);
  const report = {
    grammar: 'apn-gaf2d-production-v4-browser-evidence-v1',
    status: 'ok',
    baseUrl: BASE_URL,
    outputDir: path.relative(process.cwd(), OUTPUT_DIR),
    verified: findings.length,
    findings,
    productionMotion: productionMotionFindings,
    noGate,
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  chrome?.kill('SIGTERM');
  await Promise.race([chromeExit, delay(3000)]);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
