import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { isMotionReviewSourceFamily } from '../../js/motion-review.js';

const OUTPUT_DIR = path.resolve(
  process.argv[2] || 'qa/screenshots/motion-continuity',
);
const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
);
const PREVIEW_ROOT = path.join(ROOT, '.gaf2d-preview');
const MANIFEST_FILE = path.join(PREVIEW_ROOT, 'manifest.json');
const REFRESH_RATES = Object.freeze([60, 90, 120, 144]);
const QA_RANDOM_SEED = 0x4_741_463;
const VIEWPORTS = Object.freeze([
  { label: 'mobile-375x812', width: 375, height: 812, mobile: true, scale: 2 },
  { label: 'mobile-390x844', width: 390, height: 844, mobile: true, scale: 2 },
  { label: 'mobile-428x926', width: 428, height: 926, mobile: true, scale: 2 },
  { label: 'landscape-844x390', width: 844, height: 390, mobile: true, scale: 2 },
]);
const EXPECTED_HERO_CLIPS = Object.freeze([
  'idle',
  'run',
  'attack',
  'crit',
  'sprint',
  'hit',
  'death',
  'celebrate',
]);
const EXPECTED_CHARACTER_CLIPS = Object.freeze([
  'idle',
  'advance',
  'engaged',
  'hit',
  'death',
]);
const EXPECTED_BOSS_CLIPS = Object.freeze([
  ...EXPECTED_CHARACTER_CLIPS,
  'broken',
]);
const EXPECTED_CHARACTER_IDS = Object.freeze([
  'entry-runner',
  'protocol-courier',
  'signal-hunter',
  'site-sentinel',
  'site-warden',
  'veil-operator',
]);
export const CONTINUITY_WITNESS_SPECS = Object.freeze([
  Object.freeze({
    role: 'hero',
    assetId: 'apn-hero',
    clipName: 'run',
    label: 'APN Hero · run',
  }),
  Object.freeze({
    role: 'standard',
    assetId: 'protocol-courier',
    clipName: 'advance',
    label: 'Protocol Courier · advance',
  }),
  Object.freeze({
    role: 'elite',
    assetId: 'site-sentinel',
    clipName: 'engaged',
    label: 'Site Sentinel · engaged',
  }),
  Object.freeze({
    role: 'boss',
    assetId: 'site-warden',
    clipName: 'broken',
    label: 'Site Warden · broken',
  }),
]);
export const CONTINUITY_ARTIFACTS = Object.freeze({
  deterministicReport: 'report.json',
  performanceReport: 'performance.json',
  sameScaleComparison: 'same-scale-comparison.json',
  reviewInitialScreenshot: 'review-surface-initial.png',
  reviewActiveScreenshot: 'review-surface-active.png',
  witnessesScreenshot: 'native-witnesses.png',
  waveScreenshots: Object.freeze({
    wave1: 'wave-1-gameplay.png',
    wave10: 'wave-10-gameplay.png',
  }),
  sameScaleScreenshots: Object.freeze({
    current: 'same-scale-current.png',
    baseline: 'same-scale-baseline.png',
  }),
});
const SAME_SCALE_VIEWPORT = VIEWPORTS[2];
const SAME_SCALE_DPR = 2;
const SAME_SCALE_CSS_BODY_HEIGHT = Object.freeze({
  hero: 96,
  standard: 72,
  elite: 84,
  boss: 112,
});
const SAME_SCALE_COMPARISON_SPECS = Object.freeze(
  CONTINUITY_WITNESS_SPECS.map((witness) =>
    Object.freeze({
      role: witness.role,
      assetId: witness.assetId,
      clipName: witness.clipName,
      frameIndex: 0,
      cssBodyHeight: SAME_SCALE_CSS_BODY_HEIGHT[witness.role],
    }),
  ),
);

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortObject(value[key])]),
  );
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  return 'application/octet-stream';
}

function safeResolvedFile(rootPath, requestPath) {
  const rootReal = fs.realpathSync(rootPath);
  const normalized = path.posix.normalize(requestPath);
  if (!normalized.startsWith('/')) return null;
  const relativePath = normalized.replace(/^\/+/, '');
  const filePath = path.resolve(rootReal, relativePath);
  if (!filePath.startsWith(rootReal + path.sep) && filePath !== rootReal) {
    return null;
  }
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile()) return null;
  const realFilePath = fs.realpathSync(filePath);
  if (
    !realFilePath.startsWith(rootReal + path.sep) &&
    realFilePath !== rootReal
  ) {
    return null;
  }
  return {
    root: rootPath,
    filePath,
    contentType: contentTypeFor(realFilePath),
  };
}

export function createPreviewOverlayServer({ root, baselinePreviewRoot }) {
  const resolveRequestPath = (requestPath) => {
    if (requestPath.startsWith('/.gaf2d-preview/')) {
      if (!baselinePreviewRoot) return null;
      return safeResolvedFile(
        baselinePreviewRoot,
        requestPath.replace('/.gaf2d-preview', ''),
      );
    }
    return safeResolvedFile(root, requestPath === '/' ? '/index.html' : requestPath);
  };
  return {
    resolveRequestPath,
    async listen(port) {
      const server = http.createServer((request, response) => {
        const pathname = new URL(
          request.url || '/',
          'http://127.0.0.1',
        ).pathname;
        const target = resolveRequestPath(pathname);
        if (!target) {
          response.writeHead(404, {
            'content-type': 'text/plain; charset=utf-8',
          });
          response.end('not found');
          return;
        }
        response.writeHead(200, {
          'content-type': target.contentType,
        });
        response.end(fs.readFileSync(target.filePath));
      });
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
      });
      return {
        close: () =>
          new Promise((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      };
    },
  };
}

function resolveChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  if (process.platform === 'darwin') {
    const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(mac)) return mac;
  }
  for (const name of [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ]) {
    try {
      const found = execFileSync('which', [name], {
        encoding: 'utf8',
      }).trim();
      if (found) return found;
    } catch {}
  }
  throw new Error('No Chrome/Chromium binary found (set CHROME_BIN)');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
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
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function waitForChrome(port, chromeStderr) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        const version = await response.json();
        const browser = {
          product: String(version.Browser || ''),
          protocolVersion: String(version['Protocol-Version'] || ''),
          userAgent: String(version['User-Agent'] || ''),
          jsVersion: String(version['V8-Version'] || ''),
        };
        assert(
          browser.product.includes('Chrome/') &&
            Object.values(browser).every((value) => value.length > 0),
          'Chrome version endpoint did not expose complete browser provenance',
        );
        return browser;
      }
    } catch {}
    await delay(100);
  }
  throw new Error(
    `Chrome DevTools endpoint did not start\n${chromeStderr.current}`,
  );
}

async function createPage(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: 'PUT',
  });
  if (!response.ok) {
    throw new Error(`Unable to create Chrome page: ${response.status}`);
  }
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
    const details = response.exceptionDetails;
    const description =
      details.exception?.description || details.text || 'unknown exception';
    const frame = details.stackTrace?.callFrames?.[0];
    const location = frame
      ? `${frame.url || '<anonymous>'}:${(frame.lineNumber || 0) + 1}:${(frame.columnNumber || 0) + 1}`
      : null;
    throw new Error(
      `page eval threw: ${description}${location ? ` @ ${location}` : ''}`,
    );
  }
  return response.result?.value;
}

async function waitFor(cdp, expression, label, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(cdp, `Boolean(${expression})`)) return;
    await delay(50);
  }
  const pageState = await evaluate(
    cdp,
    `(() => ({
      readyState: document.readyState,
      qaReady: Boolean(window.__APN_QA__),
      preview: window.__APN_QA__?.motionPreview || null,
      panelState: document.querySelector('#motion-review-panel')?.dataset?.state || null,
      panelStatus: document.querySelector('#motion-review-panel [data-role="review-status"]')?.textContent?.trim() || null,
    }))()`,
  );
  const problems = collectConsoleProblems(cdp.events);
  throw new Error(
    `Timed out waiting for ${label}; page=${JSON.stringify(pageState)}; problems=${JSON.stringify(problems)}`,
  );
}

async function captureScreenshot(cdp, file) {
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
}

function collectConsoleProblems(events) {
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
      if (event.method === 'Runtime.exceptionThrown') {
        const details = event.params?.exceptionDetails;
        const description = details?.exception?.description || details?.text;
        const frame = details?.stackTrace?.callFrames?.[0];
        return [
          description || 'Uncaught page exception',
          frame
            ? `${frame.url || '<anonymous>'}:${(frame.lineNumber || 0) + 1}:${(frame.columnNumber || 0) + 1}`
            : null,
        ]
          .filter(Boolean)
          .join(' @ ');
      }
      if (event.method === 'Runtime.consoleAPICalled') {
        return (event.params?.args || [])
          .map((argument) => argument.value ?? argument.description ?? argument.type)
          .join(' ');
      }
      if (event.method === 'Network.loadingFailed') {
        return `${event.params?.errorText || 'network load failed'} ${event.params?.blockedReason || ''}`.trim();
      }
      if (event.method === 'Network.responseReceived') {
        return `${event.params?.response?.status || 0} ${event.params?.response?.url || ''}`.trim();
      }
      return (
        event.params?.entry?.text ||
        event.params?.exceptionDetails?.text ||
        'Unknown console problem'
      );
    })
    .filter((text) => !/favicon/i.test(text));
}

function sameMembers(actual, expected) {
  return (
    actual.length === expected.length &&
    [...actual].sort().join('|') === [...expected].sort().join('|')
  );
}

function inspectLocalPreview() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    return {
      ok: false,
      reasons: ['missing .gaf2d-preview/manifest.json'],
      summary: null,
    };
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  const reasons = [];
  const hero = manifest.hero || {};
  const characters = manifest.characters || {};
  const counts = manifest.counts || {};

  if (!isMotionReviewSourceFamily(manifest.sourceFamily)) {
    reasons.push(`sourceFamily=${manifest.sourceFamily || 'missing'}`);
  }
  if (counts.assets !== 7 || counts.clips !== 39 || counts.frames !== 795) {
    reasons.push(
      `counts=${counts.assets || 0}/${counts.clips || 0}/${counts.frames || 0}`,
    );
  }
  if (
    hero.basePath !== '.gaf2d-preview/hero/' ||
    hero.set !== '.gaf2d-preview/hero/set.json'
  ) {
    reasons.push('hero preview is not bound to per-clip set.json authority');
  }
  const heroClipNames = Object.keys(hero.clips || {});
  if (!sameMembers(heroClipNames, EXPECTED_HERO_CLIPS)) {
    reasons.push(`hero clips=${heroClipNames.join(',') || 'missing'}`);
  }

  for (const assetId of EXPECTED_CHARACTER_IDS) {
    const entry = characters[assetId];
    if (!entry) {
      reasons.push(`${assetId}: missing character authority entry`);
      continue;
    }
    const expectedClips =
      assetId === 'site-warden' ? EXPECTED_BOSS_CLIPS : EXPECTED_CHARACTER_CLIPS;
    const clipNames = Object.keys(entry.clips || {});
    if (
      entry.basePath !== `.gaf2d-preview/characters/${assetId}/` ||
      entry.set !== `.gaf2d-preview/characters/${assetId}/set.json`
    ) {
      reasons.push(`${assetId}: legacy descriptor/image authority still active`);
    }
    if (!sameMembers(clipNames, expectedClips)) {
      reasons.push(`${assetId}: clips=${clipNames.join(',') || 'missing'}`);
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    summary: {
      sourceFamily: manifest.sourceFamily || null,
      counts,
      heroClipCount: heroClipNames.length,
      characterCount: Object.keys(characters).length,
    },
  };
}

function inspectPreviewRoot(previewRoot) {
  const manifestFile = path.join(previewRoot, 'manifest.json');
  if (!fs.existsSync(manifestFile)) {
    return {
      ok: false,
      reasons: [`missing ${path.relative(ROOT, manifestFile)}`],
      summary: null,
    };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  return {
    ok: isMotionReviewSourceFamily(manifest.sourceFamily),
    reasons: isMotionReviewSourceFamily(manifest.sourceFamily)
      ? []
      : [`sourceFamily=${manifest.sourceFamily || 'missing'}`],
    summary: {
      sourceFamily: manifest.sourceFamily || null,
      counts: manifest.counts || null,
      batchSummarySha256: manifest.source?.batchSummarySha256 || null,
    },
  };
}

export function requireV3BaselineInput(localPreviewSummary, v3PreviewRoot) {
  if (localPreviewSummary?.sourceFamily !== 'authored-semantic-v4') {
    return {
      required: false,
      provided: Boolean(v3PreviewRoot),
      baseline: v3PreviewRoot ? inspectPreviewRoot(v3PreviewRoot).summary : null,
    };
  }
  if (!v3PreviewRoot) {
    throw new Error(
      'V4 browser acceptance requires explicit V3_PREVIEW_ROOT for same-scale baseline evidence',
    );
  }
  const baseline = inspectPreviewRoot(v3PreviewRoot);
  assert(
    baseline.ok && baseline.summary?.sourceFamily === 'authored-semantic-v3',
    `V3_PREVIEW_ROOT is not a valid authored-semantic-v3 preview: ${baseline.reasons.join('; ') || 'unknown'}`,
  );
  return {
    required: true,
    provided: true,
    baseline: baseline.summary,
  };
}

function normalizeMotionAssetPath(urlString) {
  let pathname = null;
  try {
    pathname = new URL(urlString).pathname;
  } catch {
    pathname = String(urlString || '');
  }
  if (!pathname.includes('/.gaf2d-preview/')) return null;
  const previewPath = pathname.slice(pathname.indexOf('/.gaf2d-preview/') + 1);
  if (
    !previewPath.endsWith('.json') &&
    !previewPath.endsWith('.webp')
  ) {
    return null;
  }
  return previewPath;
}

function classifyMotionRequest(previewPath) {
  if (previewPath.endsWith('/set.json')) return 'set';
  if (previewPath.endsWith('.json')) return 'descriptor';
  if (previewPath.endsWith('.webp')) return 'media';
  return 'unknown';
}

function requestSubject(previewPath) {
  const parts = previewPath.split('/');
  if (parts[1] === 'hero') {
    const clipName = path.basename(previewPath, path.extname(previewPath));
    return {
      assetId: 'apn-hero',
      role: 'hero',
      clipName: clipName === 'set' ? null : clipName,
    };
  }
  const assetId = parts[2] || null;
  const clipName = path.basename(previewPath, path.extname(previewPath));
  return {
    assetId,
    role:
      assetId === 'site-warden'
        ? 'boss'
        : assetId === 'site-sentinel'
          ? 'elite'
          : 'standard',
    clipName: clipName === 'set' ? null : clipName,
  };
}

export function normalizeSelectedRequestLedger(events) {
  const ledger = new Map();
  for (const event of events || []) {
    if (event?.method !== 'Network.responseReceived') continue;
    const url = event.params?.response?.url;
    const previewPath = normalizeMotionAssetPath(url);
    if (!previewPath) continue;
    const kind = classifyMotionRequest(previewPath);
    const subject = requestSubject(previewPath);
    const key = `${kind}:${previewPath}`;
    const declaredBytes = Number(event.params?.response?.headers?.['content-length']);
    ledger.set(key, {
      kind,
      path: previewPath,
      ...subject,
      status: event.params?.response?.status || null,
      declaredBytes: Number.isFinite(declaredBytes) ? declaredBytes : null,
    });
  }
  return [...ledger.values()].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

export function mergeSelectedRequestLedgers(...ledgers) {
  const merged = new Map();
  for (const ledger of ledgers) {
    for (const entry of ledger || []) {
      merged.set(`${entry.kind}:${entry.path}`, sortObject(entry));
    }
  }
  return [...merged.values()].sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

export function splitSelectedRequestLedgers(currentLedger, baselineLedger) {
  return sortObject({
    currentRequests: currentLedger || [],
    baselineRequests: baselineLedger || [],
  });
}

export function summarizeResidencyCounters(coldTransition) {
  const snapshots = coldTransition?.snapshots || [];
  return snapshots.map((snapshot) => {
    const entries = snapshot.coldState?.entries || [];
    const readyEntries = entries.filter((entry) => entry.status === 'ready');
    const readyClipEntries = readyEntries.filter((entry) => entry.key.includes('#'));
    const readySetEntries = readyEntries.filter((entry) => !entry.key.includes('#'));
    return {
      elapsedMs: snapshot.elapsedMs,
      decodedReadyEntries: readyEntries.length,
      currentSetEntries: readySetEntries.length,
      retainedClipEntries: readyClipEntries.length,
      hotResidentEntries: readyEntries.length,
      diagnostics: (snapshot.diagnostics || []).length,
    };
  });
}

export function buildContinuityPerformanceArtifact({
  browser,
  decodeTimings = [],
} = {}) {
  return {
    browser: sortObject(browser),
    decodeTimings: decodeTimings.map((timing) => sortObject(timing)),
  };
}

export function buildSameScaleComparisonArtifact({
  viewport,
  dpr,
  pairs,
  screenshots,
}) {
  const normalizedPairs = (pairs || []).map((pair) => {
    for (const side of ['current', 'baseline']) {
      const facts = pair?.[side];
      assert(
        facts &&
          Number.isFinite(facts.cssBodyHeight) &&
          facts.cssBodyHeight > 0 &&
          Number.isFinite(facts.displayedDevicePixels) &&
          facts.displayedDevicePixels > 0 &&
          Number.isFinite(facts.sourceVisiblePixels) &&
          facts.sourceVisiblePixels > 0 &&
          Number.isInteger(facts.alphaPixels) &&
          facts.alphaPixels > 0,
        `same-scale ${side} witness must contain positive scale and visible-pixel facts`,
      );
    }
    assert(
      pair.current.cssBodyHeight === pair.baseline.cssBodyHeight &&
        pair.current.cssBodyHeight === pair.cssBodyHeight,
      'same-scale witnesses must use the exact same CSS body height',
    );
    const densityShortfall =
      Number(pair?.baseline?.sourceVisiblePixels) <
      Number(pair?.baseline?.displayedDevicePixels);
    return sortObject({
      ...pair,
      densityShortfall,
    });
  });
  return sortObject({
    viewport,
    dpr,
    screenshots,
    pairs: normalizedPairs,
    summary: {
      pairCount: normalizedPairs.length,
      densityShortfallCount: normalizedPairs.filter(
        (pair) => pair.densityShortfall,
      ).length,
    },
  });
}

export function buildDeterministicContinuityReport({
  browser,
  localPreview,
  continuity,
  selectedRequests,
  scaleMatrix,
  waveEvidence,
  coldTransition,
  baseline,
  sameScaleComparison,
}) {
  return sortObject({
    browser,
    localPreview,
    baseline,
    fullCycleCredit: {
      viewed: continuity?.fullCycleCredit?.viewed || 0,
      total: continuity?.fullCycleCredit?.total || 39,
      dpr: continuity?.fullCycleCredit?.dpr || 2,
      mode: continuity?.fullCycleCredit?.mode || 'actual-game-size',
    },
    selectedRequests,
    scaleMatrix,
    waveEvidence,
    sameScaleComparison,
    residency: summarizeResidencyCounters(coldTransition),
    witnesses: (continuity?.witnessTileMetrics || []).map((entry) =>
      sortObject(entry),
    ),
    continuity: {
      catalogSize: continuity?.catalogSize || 0,
      failures: continuity?.failures || [],
    },
  });
}

function previewUrl(baseUrl, viewport, zone = 1, { review = true } = {}) {
  const query = new URLSearchParams({
    'motion-preview': '1',
    'chrome-smoke': '1',
    'qa-manual': '1',
    autostart: '1',
    mute: '1',
    zone: String(zone),
    viewport: viewport.label,
  });
  if (review) query.set('motion-review', '1');
  return `${baseUrl}/?${query.toString()}`;
}

async function bootstrapPage(port, viewport, url) {
  const page = await createPage(port);
  const cdp = connect(page.webSocketDebuggerUrl);
  await cdp.opened;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      let state = ${QA_RANDOM_SEED} >>> 0;
      Object.defineProperty(Math, 'random', {
        configurable: false,
        writable: false,
        value: () => {
          state = (Math.imul(1664525, state) + 1013904223) >>> 0;
          return state / 0x100000000;
        },
      });
    })();`,
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.scale,
    mobile: viewport.mobile,
  });
  await cdp.send('Page.navigate', { url });
  return { cdp, page };
}

async function waitForReviewSurface(cdp) {
  await waitFor(
    cdp,
    `Boolean(
      window.__APN_QA__?.motionPreview &&
      document.querySelector('#motion-review-panel') &&
      document.querySelector('#motion-review-panel')?.dataset?.state
    )`,
    'motion review panel state',
  );
}

async function readReviewState(cdp) {
  return evaluate(
    cdp,
    `(() => {
      const panel = document.querySelector('#motion-review-panel');
      const statusNode = panel?.querySelector('[data-role="review-status"]');
      const viewedNode = panel?.querySelector('[data-role="review-viewed"]');
      const factsNode = panel?.querySelector('[data-role="review-facts"]');
      const text = window.render_game_to_text ? JSON.parse(window.render_game_to_text()) : null;
      return {
        panelState: panel?.dataset?.state || null,
        panelHidden: panel?.hidden ?? null,
        status: statusNode?.textContent?.trim() || '',
        viewed: viewedNode?.textContent?.trim() || '',
        facts: factsNode?.textContent?.trim() || '',
        motionPreview: text?.motionPreview || null,
        viewport: text?.viewport || null,
        pack: text?.pack || null,
      };
    })()`,
  );
}

async function collectContinuityMetrics(cdp) {
  const payload = {
    refreshRates: REFRESH_RATES,
  };
  return evaluate(
    cdp,
    `(async () => {
      const payload = ${JSON.stringify(payload)};
      const { createMotionReviewCatalog, loadMotionReviewClip } =
        await import('/js/motion-review.js?v=enhanced-v1');
      const {
        reviewScaleMetrics,
        reviewCycleComplete,
      } = await import('/js/motion-review.js?v=enhanced-v1');
      const { frameIndexForClip, drawMotionFrame } =
        await import('/js/motion-bundle.js?v=enhanced-v1');
      const manifest = window.__APN_QA__.motionPreview.manifest;
      const entries = createMotionReviewCatalog(manifest);
      const failures = [];
      const results = [];
      const witnessSpecs = ${JSON.stringify(CONTINUITY_WITNESS_SPECS)};
      const witnessTileMetrics = [];
      const decodeTimings = [];
      function cycleSeconds(runtime) {
        const frameSeconds = runtime.frameCount / runtime.fps;
        return runtime.playback === 'loop' ? frameSeconds : frameSeconds + 0.35;
      }
      function progressValue(runtime, elapsedSeconds) {
        if (runtime.playback === 'loop') return Math.max(0, elapsedSeconds);
        const frameSeconds = runtime.frameCount / runtime.fps;
        const cycle = cycleSeconds(runtime);
        const phase = Math.max(0, elapsedSeconds) % cycle;
        return Math.min(phase / frameSeconds, 1);
      }
      function continuityFor(runtime, hz) {
        const intervalMs = 1000 / hz;
        const activeDurationMs = (runtime.frameCount / runtime.fps) * 1000;
        const totalDurationMs = cycleSeconds(runtime) * 1000;
        const sequence = [];
        const runs = [];
        let lastFrame = null;
        let frameStartMs = 0;
        for (
          let elapsedMs = 0;
          elapsedMs < totalDurationMs - 0.000001;
          elapsedMs += intervalMs
        ) {
          const progress = progressValue(runtime, elapsedMs / 1000);
          const frameIndex = frameIndexForClip(
            {
              frames: runtime.descriptor.frames,
              fps: runtime.fps,
              playback: runtime.playback,
            },
            progress,
          );
          sequence.push(frameIndex);
          if (lastFrame === null) {
            lastFrame = frameIndex;
            frameStartMs = elapsedMs;
            continue;
          }
          if (frameIndex !== lastFrame) {
            runs.push({
              frameIndex: lastFrame,
              startMs: frameStartMs,
              endMs: elapsedMs,
              durationMs: elapsedMs - frameStartMs,
            });
            frameStartMs = elapsedMs;
            lastFrame = frameIndex;
          }
        }
        if (lastFrame !== null) {
          runs.push({
            frameIndex: lastFrame,
            startMs: frameStartMs,
            endMs: totalDurationMs,
            durationMs: totalDurationMs - frameStartMs,
          });
        }
        const distinct = [...new Set(sequence)];
        const distinctBodyPoseRate =
          distinct.length / (activeDurationMs / 1000);
        return {
          hz,
          intervalMs,
          activeDurationMs,
          distinctCount: distinct.length,
          distinctBodyPoseRate,
          runs,
          firstFrame: sequence[0],
          lastFrame: sequence[sequence.length - 1],
          sequence,
        };
      }
      function renderFrameMetrics(runtime, frameIndex, nativeHeight) {
        const trim = runtime.trim;
        const canvas = new OffscreenCanvas(trim.width + 48, trim.height + 48);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const pivotX = Math.round(canvas.width / 2);
        const pivotY = canvas.height - 12;
        drawMotionFrame(
          ctx,
          {
            descriptor: runtime.descriptor,
            set: {
              frameSize: runtime.frameSize,
              trim: runtime.trim,
              pivot: runtime.pivot,
            },
            image: runtime.image,
          },
          runtime.clipName,
          frameIndex,
          pivotX,
          pivotY,
          nativeHeight,
        );
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let alphaPixels = 0;
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = -1;
        let maxY = -1;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          const alpha = pixels[offset + 3];
          if (alpha < 24) continue;
          const pixelIndex = offset / 4;
          const x = pixelIndex % canvas.width;
          const y = Math.floor(pixelIndex / canvas.width);
          alphaPixels += 1;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
        return {
          frameIndex,
          alphaPixels,
          bounds:
            alphaPixels > 0
              ? {
                  minX,
                  minY,
                  maxX,
                  maxY,
                  width: maxX - minX + 1,
                  height: maxY - minY + 1,
                }
              : null,
        };
      }
      async function digestPixels(ctx, x, y, width, height) {
        const pixels = ctx.getImageData(x, y, width, height).data;
        const digest = await crypto.subtle.digest('SHA-256', pixels);
        return [...new Uint8Array(digest)]
          .map((value) => value.toString(16).padStart(2, '0'))
          .join('');
      }
      for (const entry of entries) {
        const decodeStartedAt = performance.now();
        const runtime = await loadMotionReviewClip(entry);
        decodeTimings.push({
          assetId: entry.assetId,
          clipName: entry.clipName,
          decodeMs: Number((performance.now() - decodeStartedAt).toFixed(3)),
        });
        try {
          const byRefresh = Object.fromEntries(
            payload.refreshRates.map((hz) => {
              const continuity = continuityFor(runtime, hz);
              return [hz, continuity];
            }),
          );
          const expectedFramePeriodMs = 1000 / runtime.fps;
          const entryFailures = [];
          const markerTerminal = runtime.descriptor.markers?.terminal;
          const declaredHoldTargets = new Set(
            (runtime.descriptor.holds || []).flatMap((hold) => {
              const indexes = [];
              for (let index = hold.startIndex + 1; index <= hold.endIndex; index += 1) {
                indexes.push(index);
              }
              return indexes;
            }),
          );
          const renderedFrames = [];
          for (let frameIndex = 0; frameIndex < runtime.frameCount; frameIndex += 1) {
            const metrics = renderFrameMetrics(runtime, frameIndex, runtime.trim.height);
            renderedFrames.push(metrics);
            if (metrics.alphaPixels <= 0 || !metrics.bounds) {
              entryFailures.push(
                entry.assetId +
                  '/' +
                  entry.clipName +
                  ' frame ' +
                  frameIndex +
                  ' renders blank alpha',
              );
              continue;
            }
            if (metrics.bounds.width <= 0 || metrics.bounds.height <= 0) {
              entryFailures.push(
                entry.assetId +
                  '/' +
                  entry.clipName +
                  ' frame ' +
                  frameIndex +
                  ' has empty rendered bounds',
              );
            }
          }
          for (const continuity of Object.values(byRefresh)) {
            if (continuity.distinctCount !== runtime.frameCount) {
              entryFailures.push(
                entry.assetId +
                  '/' +
                  entry.clipName +
                  '@' +
                  continuity.hz +
                  'Hz distinct=' +
                  continuity.distinctCount +
                  '/' +
                  runtime.frameCount,
              );
            }
            if (continuity.distinctBodyPoseRate + 0.001 < runtime.fps * 0.95) {
              entryFailures.push(
                entry.assetId +
                  '/' +
                  entry.clipName +
                  '@' +
                  continuity.hz +
                  'Hz poseRate=' +
                  continuity.distinctBodyPoseRate.toFixed(2) +
                  ' floor=' +
                  (runtime.fps * 0.95).toFixed(2),
              );
            }
            for (const run of continuity.runs) {
              const isTerminalFrame =
                runtime.playback === 'progress' &&
                Number.isInteger(markerTerminal) &&
                run.frameIndex === markerTerminal;
              const isDeclaredHoldFrame = declaredHoldTargets.has(run.frameIndex);
              if (!isTerminalFrame && !isDeclaredHoldFrame && run.durationMs > expectedFramePeriodMs + 18) {
                entryFailures.push(
                  entry.assetId +
                    '/' +
                    entry.clipName +
                    '@' +
                    continuity.hz +
                    'Hz frame ' +
                    run.frameIndex +
                    ' holds ' +
                    run.durationMs.toFixed(2) +
                    'ms expected<=' +
                    (expectedFramePeriodMs + 18).toFixed(2),
                );
              }
              if (
                isTerminalFrame &&
                run.endMs > continuity.activeDurationMs &&
                run.durationMs < expectedFramePeriodMs + 120
              ) {
                entryFailures.push(
                  entry.assetId +
                    '/' +
                    entry.clipName +
                    '@' +
                    continuity.hz +
                    'Hz terminal hold too short=' +
                    run.durationMs.toFixed(2) +
                    'ms',
                );
              }
            }
            if (runtime.playback === 'loop' && continuity.firstFrame !== 0) {
              entryFailures.push(
                entry.assetId +
                  '/' +
                  entry.clipName +
                  '@' +
                  continuity.hz +
                  'Hz does not start at frame 0',
              );
            }
            if (
              runtime.playback === 'progress' &&
              continuity.lastFrame !== runtime.frameCount - 1
            ) {
              entryFailures.push(
                entry.assetId +
                  '/' +
                  entry.clipName +
                  '@' +
                  continuity.hz +
                  'Hz terminal frame=' +
                  continuity.lastFrame,
              );
            }
          }
          results.push({
            assetId: entry.assetId,
            clipName: entry.clipName,
            role: entry.role,
            fps: runtime.fps,
            playback: runtime.playback,
            frameCount: runtime.frameCount,
            renderedFrames,
            byRefresh,
            failures: entryFailures,
          });
          failures.push(...entryFailures);
        } finally {
          runtime.image?.close?.();
        }
      }
      const fullCycleCredit = entries.reduce(
        (credit, entry) => {
          const [result] = results.filter(
            (candidate) =>
              candidate.assetId === entry.assetId &&
              candidate.clipName === entry.clipName,
          );
          if (!result) return credit;
          const metrics = reviewScaleMetrics(
            {
              ...entry,
              frameCount: result.frameCount,
              fps: result.fps,
              playback: result.playback,
            },
            { mode: 'actual-game-size', dpr: 2 },
          );
          if (
            metrics.viewCreditAllowed &&
            reviewCycleComplete(
              { frameCount: result.frameCount, fps: result.fps },
              result.frameCount / result.fps,
            )
          ) {
            credit.viewed += 1;
          }
          return credit;
        },
        { viewed: 0, total: entries.length, mode: 'actual-game-size', dpr: 2 },
      );

      const existing = document.querySelector('#qa-motion-continuity-witnesses');
      existing?.remove();
      const host = document.createElement('div');
      host.id = 'qa-motion-continuity-witnesses';
      host.style.position = 'fixed';
      host.style.inset = '12px';
      host.style.zIndex = '999999';
      host.style.display = 'grid';
      host.style.gridTemplateColumns = '1fr';
      host.style.gap = '12px';
      host.style.pointerEvents = 'none';
      document.body.appendChild(host);

      for (const theme of [
        { id: 'light', background: '#f4efe4', ink: '#111111', guide: '#d6c9b1' },
        { id: 'dark', background: '#101316', ink: '#f8f7f3', guide: '#44515c' },
      ]) {
        const board = document.createElement('canvas');
        board.width = 960;
        board.height = 540;
        board.id = 'qa-witness-' + theme.id;
        board.style.width = '100%';
        board.style.height = 'auto';
        board.style.border = '1px solid ' + theme.guide;
        host.appendChild(board);
        const ctx = board.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, board.width, board.height);
        ctx.fillStyle = theme.ink;
        ctx.font = '600 24px Georgia, serif';
        ctx.fillText('Native Witnesses · ' + theme.id, 24, 40);
        const sizes = [64, 80, 128];
        for (let column = 0; column < witnessSpecs.length; column += 1) {
          const spec = witnessSpecs[column];
          const entry = entries.find(
            (candidate) =>
              candidate.assetId === spec.assetId &&
              candidate.clipName === spec.clipName,
          );
          const runtime = await loadMotionReviewClip(entry);
          try {
            ctx.fillStyle = theme.ink;
            ctx.font = '500 16px Georgia, serif';
            ctx.fillText(spec.label, 24 + column * 228, 76);
            for (let row = 0; row < sizes.length; row += 1) {
              const nativeHeight = sizes[row];
              const pivotX = 100 + column * 228;
              const pivotY = 170 + row * 116;
              const tileX = 28 + column * 228;
              const tileY = 96 + row * 116;
              const tileWidth = 144;
              const tileHeight = 96;
              ctx.strokeStyle = theme.guide;
              ctx.strokeRect(tileX, tileY, tileWidth, tileHeight);
              ctx.fillStyle = theme.ink;
              ctx.font = '500 14px Georgia, serif';
              ctx.fillText(nativeHeight + 'px', 32 + column * 228, 114 + row * 116);
              const beforeHash = await digestPixels(ctx, tileX, tileY, tileWidth, tileHeight);
              drawMotionFrame(
                ctx,
                {
                  descriptor: runtime.descriptor,
                  set: {
                    frameSize: runtime.frameSize,
                    trim: runtime.trim,
                    pivot: runtime.pivot,
                  },
                  image: runtime.image,
                },
                runtime.clipName,
                0,
                pivotX,
                pivotY,
                nativeHeight,
              );
              const metrics = renderFrameMetrics(runtime, 0, nativeHeight);
              const afterHash = await digestPixels(ctx, tileX, tileY, tileWidth, tileHeight);
              witnessTileMetrics.push({
                theme: theme.id,
                assetId: spec.assetId,
                clipName: spec.clipName,
                nativeHeight,
                alphaPixels: metrics.alphaPixels,
                bounds: metrics.bounds,
                beforeHash,
                afterHash,
              });
              if (metrics.alphaPixels <= 0 || !metrics.bounds) {
                failures.push(
                  'witness ' +
                    theme.id +
                    ' ' +
                    spec.assetId +
                    '/' +
                    spec.clipName +
                    ' ' +
                    nativeHeight +
                    'px renders blank alpha',
                );
              }
              if (beforeHash === afterHash) {
                failures.push(
                  'witness ' +
                    theme.id +
                    ' ' +
                    spec.assetId +
                    '/' +
                    spec.clipName +
                    ' ' +
                    nativeHeight +
                    'px did not change tile pixels',
                );
              }
            }
          } finally {
            runtime.image?.close?.();
          }
        }
      }
      if (witnessTileMetrics.length !== witnessSpecs.length * 3 * 2) {
        failures.push(
          'witness tile count=' +
            witnessTileMetrics.length +
            ' expected=' +
            (witnessSpecs.length * 3 * 2),
        );
      }

      return {
        catalogSize: entries.length,
        failures,
        results,
        witnessTileMetrics,
        decodeTimings,
        fullCycleCredit,
      };
    })()`,
  );
}

async function collectScaleMatrix(cdp) {
  return evaluate(
    cdp,
    `(async () => {
      const { createMotionReviewCatalog, loadMotionReviewClip, reviewScaleMetrics } =
        await import('/js/motion-review.js?v=enhanced-v1');
      const manifest = window.__APN_QA__.motionPreview.manifest;
      const catalog = createMotionReviewCatalog(manifest);
      const witnesses = ${JSON.stringify(CONTINUITY_WITNESS_SPECS)};
      const rows = [];
      for (const witness of witnesses) {
        const entry = catalog.find(
          (candidate) =>
            candidate.assetId === witness.assetId &&
            candidate.clipName === witness.clipName,
        );
        const runtime = await loadMotionReviewClip(entry);
        try {
          for (const dpr of [1, 2]) {
            for (const mode of ['actual-game-size', 'inspection']) {
              rows.push({
                role: witness.role,
                assetId: witness.assetId,
                clipName: witness.clipName,
                mode,
                dpr,
                ...reviewScaleMetrics(runtime, { mode, dpr }),
              });
            }
          }
        } finally {
          runtime.image?.close?.();
        }
      }
      return rows;
    })()`,
  );
}

async function collectSameScalePageFacts(cdp, screenshotName) {
  return evaluate(
    cdp,
    `(async () => {
      const {
        createMotionReviewCatalog,
        loadMotionReviewClip,
        reviewScaleMetrics,
      } = await import('/js/motion-review.js?v=enhanced-v1');
      const { drawMotionFrame } =
        await import('/js/motion-bundle.js?v=enhanced-v1');
      const manifest = window.__APN_QA__.motionPreview.manifest;
      const catalog = createMotionReviewCatalog(manifest);
      const pairs = [];
      const specs = ${JSON.stringify(SAME_SCALE_COMPARISON_SPECS)};
      const sourceLabel =
        manifest.sourceFamily === 'authored-semantic-v4' ? 'V4' : 'V3';
      const centeredPivotY = (canvasHeight, runtime, drawTrimHeight) => {
        const trimScale = drawTrimHeight / runtime.trim.height;
        const topOffset =
          (runtime.trim.y -
            runtime.frameSize.height * runtime.pivot.y) * trimScale;
        return (canvasHeight - drawTrimHeight) / 2 - topOffset;
      };
      document.querySelector('#qa-same-scale-comparison')?.remove();
      const host = document.createElement('section');
      host.id = 'qa-same-scale-comparison';
      Object.assign(host.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        boxSizing: 'border-box',
        padding: '8px 14px',
        overflow: 'hidden',
        background: '#090c10',
        color: '#f8f7f3',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      });
      const title = document.createElement('div');
      title.textContent = sourceLabel + ' · exact game scale · DPR2';
      Object.assign(title.style, {
        height: '28px',
        fontSize: '13px',
        fontWeight: '700',
        lineHeight: '28px',
        letterSpacing: '0.03em',
      });
      const grid = document.createElement('div');
      Object.assign(grid.style, {
        display: 'grid',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: '4px',
        height: 'calc(100vh - 44px)',
      });
      host.append(title, grid);
      document.body.append(host);
      for (const spec of specs) {
        const entry = catalog.find(
          (candidate) =>
            candidate.assetId === spec.assetId &&
            candidate.clipName === spec.clipName,
        );
        const runtime = await loadMotionReviewClip(entry);
        try {
          const scale =
            manifest.sourceFamily === 'authored-semantic-v4'
              ? reviewScaleMetrics(runtime, {
                  mode: 'actual-game-size',
                  dpr: ${SAME_SCALE_DPR},
                })
              : {
                  mode: 'actual-game-size',
                  cssBodyHeight: spec.cssBodyHeight,
                  dpr: ${SAME_SCALE_DPR},
                  displayedDevicePixels:
                    spec.cssBodyHeight * ${SAME_SCALE_DPR},
                  sourceVisiblePixels:
                    runtime.presentation.visibleBounds.height,
                };
          const drawTrimHeight =
            scale.cssBodyHeight * runtime.trim.height /
            scale.sourceVisiblePixels;
          const tile = document.createElement('article');
          Object.assign(tile.style, {
            display: 'grid',
            gridTemplateRows: '20px 1fr',
            minHeight: '0',
            overflow: 'hidden',
            border: '1px solid #3a4652',
            borderRadius: '6px',
          });
          const label = document.createElement('div');
          label.textContent =
            spec.role + ' · ' + spec.assetId + ' · ' + spec.clipName +
            ' · body ' + scale.cssBodyHeight + ' CSS px · DPR2';
          Object.assign(label.style, {
            padding: '0 7px',
            fontSize: '10px',
            lineHeight: '20px',
            background: '#17202a',
            whiteSpace: 'nowrap',
          });
          const evidenceCanvas = document.createElement('canvas');
          const evidenceWidth = 400;
          const evidenceHeight = 170;
          evidenceCanvas.width = evidenceWidth * ${SAME_SCALE_DPR};
          evidenceCanvas.height = evidenceHeight * ${SAME_SCALE_DPR};
          evidenceCanvas.style.width = evidenceWidth + 'px';
          evidenceCanvas.style.height = evidenceHeight + 'px';
          evidenceCanvas.style.maxWidth = '100%';
          evidenceCanvas.style.justifySelf = 'center';
          const evidenceContext = evidenceCanvas.getContext('2d');
          evidenceContext.setTransform(
            ${SAME_SCALE_DPR}, 0, 0, ${SAME_SCALE_DPR}, 0, 0,
          );
          evidenceContext.fillStyle = '#f4efe4';
          evidenceContext.fillRect(0, 0, evidenceWidth / 2, evidenceHeight);
          evidenceContext.fillStyle = '#101316';
          evidenceContext.fillRect(
            evidenceWidth / 2,
            0,
            evidenceWidth / 2,
            evidenceHeight,
          );
          evidenceContext.fillStyle = '#111111';
          evidenceContext.font = '10px ui-monospace, monospace';
          evidenceContext.fillText('LIGHT', 6, 13);
          evidenceContext.fillStyle = '#f8f7f3';
          evidenceContext.fillText('DARK', evidenceWidth / 2 + 6, 13);
          const evidencePivotY = centeredPivotY(
            evidenceHeight,
            runtime,
            drawTrimHeight,
          );
          for (const x of [evidenceWidth / 4, (evidenceWidth * 3) / 4]) {
            drawMotionFrame(
              evidenceContext,
              {
                descriptor: runtime.descriptor,
                set: {
                  frameSize: runtime.frameSize,
                  trim: runtime.trim,
                  pivot: runtime.pivot,
                },
                image: runtime.image,
              },
              runtime.clipName,
              spec.frameIndex,
              x,
              evidencePivotY,
              drawTrimHeight,
            );
          }
          tile.append(label, evidenceCanvas);
          grid.append(tile);
          const canvas = new OffscreenCanvas(
            runtime.trim.width + 48,
            runtime.trim.height + 48,
          );
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          drawMotionFrame(
            ctx,
            {
              descriptor: runtime.descriptor,
              set: {
                frameSize: runtime.frameSize,
                trim: runtime.trim,
                pivot: runtime.pivot,
              },
              image: runtime.image,
            },
            runtime.clipName,
            spec.frameIndex,
            Math.round(canvas.width / 2),
            centeredPivotY(canvas.height, runtime, drawTrimHeight),
            drawTrimHeight,
          );
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let alphaPixels = 0;
          for (let offset = 0; offset < pixels.length; offset += 4) {
            if (pixels[offset + 3] >= 24) alphaPixels += 1;
          }
          pairs.push({
            role: spec.role,
            assetId: spec.assetId,
            clipName: spec.clipName,
            frameIndex: spec.frameIndex,
            cssBodyHeight: scale.cssBodyHeight,
            sourceVisiblePixels: scale.sourceVisiblePixels,
            displayedDevicePixels: scale.displayedDevicePixels,
            alphaPixels,
            screenshot: ${JSON.stringify(screenshotName)},
          });
        } finally {
          runtime.image?.close?.();
        }
      }
      return {
        viewport: '${SAME_SCALE_VIEWPORT.label}',
        dpr: ${SAME_SCALE_DPR},
        pairs,
      };
    })()`,
  );
}

async function collectColdTransitionProof(cdp) {
  return evaluate(
    cdp,
    `(async () => {
      const { releaseColdMotion, motionDiagnostics } =
        await import('/js/motion-store.js?v=enhanced-v1');
      const q = window.__APN_QA__;
      const store = q.assets?.motionStore;
      const packAssets = q.assets?.packs?.get('valorant');
      const hasPerClipMotion = Object.values(packAssets?.pack?.motion?.characters || {})
        .every((entry) => entry && typeof entry.set === 'string' && entry.clips);
      if (!store || !packAssets?.pack || !hasPerClipMotion) {
        return {
          applicable: false,
          reason: 'per-clip gameplay preview not active',
        };
      }
      const sampleActor = (actor) => {
        const canvas = document.querySelector('#game');
        const ratioX = canvas.width / canvas.parentElement.clientWidth;
        const ratioY = ratioX;
        const logicalBounds = actor.geometry.motionEnvelope;
        const x = Math.max(0, Math.round(logicalBounds.left * ratioX));
        const y = Math.max(0, Math.round(logicalBounds.top * ratioY));
        const width = Math.max(1, Math.round((logicalBounds.right - logicalBounds.left) * ratioX));
        const height = Math.max(1, Math.min(canvas.height - y, Math.round((logicalBounds.bottom - logicalBounds.top) * ratioY)));
        const sampler = new OffscreenCanvas(width, height);
        const ctx = sampler.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
        const pixels = ctx.getImageData(0, 0, width, height).data;
        let alphaPixels = 0;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (pixels[offset + 3] >= 24) alphaPixels += 1;
        }
        return {
          id: actor.id,
          role: actor.geometry.role,
          x,
          y,
          width,
          height,
          alphaPixels,
        };
      };
      const s = q.state;
      s.route.zone = 0;
      s.route.killsInZone = 0;
      s.route.currentPackId = 'valorant';
      s.world.enemies = [];
      s.world.spawnCd = 0;
      s.world.bossActive = false;
      s.world.bossTimer = 0;
      s.settings.sfx = false;
      releaseColdMotion(store, new Set());
      store.diagnostics.clear();
      const waitForPendingMotion = async () => {
        // warmMotionClip first awaits its already-ready set record, so give that
        // continuation one event-loop turn to publish the pending clip entry.
        await new Promise((resolve) => setTimeout(resolve, 0));
        const deadline = performance.now() + 3000;
        while (
          [...store.entries.values()].some((entry) => entry?.status === 'pending')
        ) {
          if (performance.now() >= deadline) {
            throw new Error('timed out waiting for cold motion request');
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      };
      const snapshots = [];
      const coldState = () => ({
        enemies: s.world.enemies.map((enemy) => ({
          id: enemy.id,
          hp: enemy.hp,
          type: enemy.type,
        })),
        spawnCd: s.world.spawnCd,
        entries: [...store.entries].map(([key, entry]) => ({
          key,
          status: entry?.status || null,
        })),
      });
      const checkpoints = [0, 17, 34, 51, 68, 102];
      let previousElapsedMs = 0;
      for (const elapsedMs of checkpoints) {
        const deltaMs = elapsedMs - previousElapsedMs;
        if (deltaMs > 0) {
          window.advanceTime(deltaMs);
          // Simulation time and local fetch/decode time are independent. Yield
          // between fixed steps so the next step observes a settled set/clip,
          // exactly as the real requestAnimationFrame loop would.
          await waitForPendingMotion();
        }
        previousElapsedMs = elapsedMs;
        const presentation = q.presentation?.();
        const enemyActor = presentation?.actors?.find((actor) => actor.role !== 'hero') || null;
        if (!enemyActor) {
          snapshots.push({
            elapsedMs,
            deltaMs,
            actorVisible: false,
            diagnostics: motionDiagnostics(store),
            coldState: coldState(),
          });
          continue;
        }
        const stateText = JSON.parse(window.render_game_to_text());
        snapshots.push({
          elapsedMs,
          deltaMs,
          actorVisible: true,
          actor: sampleActor(enemyActor),
          motion: stateText.motion,
          diagnostics: motionDiagnostics(store),
          coldState: coldState(),
        });
      }
      return {
        applicable: true,
        snapshots,
      };
    })()`,
  );
}

async function captureGameplayViewport(port, baseUrl, viewport, outputDir, options = {}) {
  const zone = options.zone ?? (viewport.label === 'landscape-844x390' ? 10 : 1);
  const screenshotName =
    options.screenshotName || `${viewport.label}-gameplay.png`;
  const { cdp, page } = await bootstrapPage(
    port,
    viewport,
    previewUrl(baseUrl, viewport, zone, { review: false }),
  );
  try {
    await waitFor(
      cdp,
      `Boolean(
        window.render_game_to_text &&
        document.documentElement.dataset.firstPlayable === 'ready' &&
        document.querySelector('#title-screen')?.hidden
      )`,
      `${viewport.label} QA gameplay hooks`,
    );
    await evaluate(cdp, `window.advanceTime(450)`);
    const state = await evaluate(
      cdp,
      `(() => {
        const text = JSON.parse(window.render_game_to_text());
        return {
          motionPreview: text.motionPreview,
          motion: text.motion,
          viewport: text.viewport,
          overflowY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
          reviewPanelHidden: document.querySelector('#motion-review-panel')?.hidden === true,
        };
      })()`,
    );
    const consoleProblems = collectConsoleProblems(cdp.events);
    assert(
      state.viewport?.overflowX === 0 && state.overflowY === 0,
      `${viewport.label}: gameplay viewport overflow detected`,
    );
    assert(
      state.motionPreview?.active === true,
      `${viewport.label}: motion preview is not active`,
    );
    assert(
      state.reviewPanelHidden === true,
      `${viewport.label}: review surface obscures gameplay evidence`,
    );
    assert(
      state.motion?.status === 'ready',
      `${viewport.label}: authored enemy motion is not visible`,
    );
    assert(
      consoleProblems.length === 0,
      `${viewport.label}: ${consoleProblems.join(' | ')}`,
    );
    await captureScreenshot(
      cdp,
      path.join(outputDir, screenshotName),
    );
    return {
      ...state,
      zone,
      screenshot: screenshotName,
      requestLedger: normalizeSelectedRequestLedger(cdp.events),
      consoleProblems,
    };
  } finally {
    cdp.close();
    await closePage(port, page.id);
  }
}

async function captureSameScaleComparison(
  chromePort,
  currentBaseUrl,
  baselineBaseUrl,
  outputDir,
) {
  const currentPage = await bootstrapPage(
    chromePort,
    SAME_SCALE_VIEWPORT,
    previewUrl(currentBaseUrl, SAME_SCALE_VIEWPORT),
  );
  const baselinePage = await bootstrapPage(
    chromePort,
    SAME_SCALE_VIEWPORT,
    previewUrl(baselineBaseUrl, SAME_SCALE_VIEWPORT),
  );
  try {
    await waitForReviewSurface(currentPage.cdp);
    await waitForReviewSurface(baselinePage.cdp);
    const currentFacts = await collectSameScalePageFacts(
      currentPage.cdp,
      CONTINUITY_ARTIFACTS.sameScaleScreenshots.current,
    );
    const baselineFacts = await collectSameScalePageFacts(
      baselinePage.cdp,
      CONTINUITY_ARTIFACTS.sameScaleScreenshots.baseline,
    );
    await captureScreenshot(
      currentPage.cdp,
      path.join(
        outputDir,
        CONTINUITY_ARTIFACTS.sameScaleScreenshots.current,
      ),
    );
    await captureScreenshot(
      baselinePage.cdp,
      path.join(
        outputDir,
        CONTINUITY_ARTIFACTS.sameScaleScreenshots.baseline,
      ),
    );
    const paired = SAME_SCALE_COMPARISON_SPECS.map((spec) => {
      const current = currentFacts.pairs.find(
        (pair) =>
          pair.assetId === spec.assetId && pair.clipName === spec.clipName,
      );
      const baseline = baselineFacts.pairs.find(
        (pair) =>
          pair.assetId === spec.assetId && pair.clipName === spec.clipName,
      );
      return {
        ...spec,
        cssBodyHeight: current?.cssBodyHeight ?? baseline?.cssBodyHeight ?? 0,
        current,
        baseline,
      };
    });
    return {
      currentRequests: normalizeSelectedRequestLedger(currentPage.cdp.events),
      baselineRequests: normalizeSelectedRequestLedger(baselinePage.cdp.events),
      artifact: buildSameScaleComparisonArtifact({
        viewport: currentFacts.viewport,
        dpr: currentFacts.dpr,
        pairs: paired,
        screenshots: CONTINUITY_ARTIFACTS.sameScaleScreenshots,
      }),
    };
  } finally {
    currentPage.cdp.close();
    baselinePage.cdp.close();
    await closePage(chromePort, currentPage.page.id);
    await closePage(chromePort, baselinePage.page.id);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const localPreview = inspectLocalPreview();
  const baselineInput = requireV3BaselineInput(
    localPreview.summary,
    process.env.V3_PREVIEW_ROOT || null,
  );
  const chromePort = await findUnusedPort();
  const chromeProfile = fs.mkdtempSync(
    path.join(os.tmpdir(), 'apn-motion-continuity-chrome-'),
  );
  const chromeStderr = { current: '' };
  const baseUrl =
    process.env.BASE_URL ||
    `http://127.0.0.1:${await findUnusedPort()}`;
  let server = null;
  let serverPid = null;
  let baselineOverlay = null;
  let baselineBaseUrl = null;
  if (!process.env.BASE_URL) {
    const serverPort = Number(new URL(baseUrl).port);
    server = spawn(
      'python3',
      ['-m', 'http.server', String(serverPort), '--bind', '127.0.0.1'],
      {
        cwd: ROOT,
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );
    serverPid = server.pid;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        const response = await fetch(`${baseUrl}/index.html`);
        if (response.ok) break;
      } catch {}
      await delay(100);
    }
  }
  if (baselineInput.required) {
    const baselinePort = await findUnusedPort();
    const overlayServer = createPreviewOverlayServer({
      root: ROOT,
      baselinePreviewRoot: process.env.V3_PREVIEW_ROOT,
    });
    baselineOverlay = await overlayServer.listen(baselinePort);
    baselineBaseUrl = `http://127.0.0.1:${baselinePort}`;
  }

  const chrome = spawn(
    resolveChrome(),
    [
      '--headless=new',
      '--no-first-run',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--disable-extensions',
      '--mute-audio',
      '--autoplay-policy=user-gesture-required',
      `--remote-debugging-port=${chromePort}`,
      '--remote-allow-origins=*',
      `--user-data-dir=${chromeProfile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  chrome.stderr?.on('data', (chunk) => {
    chromeStderr.current += chunk.toString();
  });

  try {
    const browser = await waitForChrome(chromePort, chromeStderr);
    const reviewViewport = VIEWPORTS[2];
    const { cdp, page } = await bootstrapPage(
      chromePort,
      reviewViewport,
      previewUrl(baseUrl, reviewViewport),
    );
    try {
      await waitForReviewSurface(cdp);
      const reviewState = await readReviewState(cdp);
      await captureScreenshot(
        cdp,
        path.join(OUTPUT_DIR, CONTINUITY_ARTIFACTS.reviewInitialScreenshot),
      );

      if (!localPreview.ok || reviewState.panelState !== 'active') {
        throw new Error(
          [
            'Motion continuity lane is intentionally RED until the real V3 preview exists.',
            `Local preview: ${localPreview.ok ? 'ready' : localPreview.reasons.join('; ')}`,
            `Review surface: state=${reviewState.panelState} status="${reviewState.status}"`,
            `Preview error: ${reviewState.motionPreview?.error || 'none'}`,
          ].join(' '),
        );
      }

      const continuity = await collectContinuityMetrics(cdp);
      assert(
        continuity.catalogSize === 39,
        `review catalog size=${continuity.catalogSize}, expected 39`,
      );
      assert(
        continuity.failures.length === 0,
        `continuity failures: ${continuity.failures.join(' | ')}`,
      );
      const coldTransition = await collectColdTransitionProof(cdp);
      if (coldTransition.applicable) {
        const visibleFrames = coldTransition.snapshots.filter(
          (snapshot) => snapshot.actorVisible && snapshot.actor?.alphaPixels > 0,
        );
        assert(
          visibleFrames.length >= 3,
          `cold transition visible frames=${visibleFrames.length}, expected at least 3; snapshots=${JSON.stringify(coldTransition.snapshots)}`,
        );
        assert(
          coldTransition.snapshots.every(
            (snapshot) =>
              !snapshot.actorVisible ||
              (
                snapshot.actor.alphaPixels > 0 &&
                (snapshot.motion?.status === 'ready' || snapshot.motion?.status === 'failed')
              ),
          ),
          'cold transition produced a blank first active gameplay frame',
        );
      }
      const scaleMatrix = await collectScaleMatrix(cdp);
      await captureScreenshot(
        cdp,
        path.join(OUTPUT_DIR, CONTINUITY_ARTIFACTS.witnessesScreenshot),
      );
      await evaluate(
        cdp,
        `document.querySelector('#qa-motion-continuity-witnesses')?.remove()`,
      );
      await captureScreenshot(
        cdp,
        path.join(OUTPUT_DIR, CONTINUITY_ARTIFACTS.reviewActiveScreenshot),
      );
      const gameplayFacts = [];
      for (const viewport of VIEWPORTS) {
        gameplayFacts.push(
          await captureGameplayViewport(chromePort, baseUrl, viewport, OUTPUT_DIR),
        );
      }
      const waveViewport = VIEWPORTS.find(
        (viewport) => viewport.label === 'landscape-844x390',
      );
      assert(waveViewport, 'wave evidence viewport is configured');
      const waveEvidence = {
        wave1: await captureGameplayViewport(
          chromePort,
          baseUrl,
          waveViewport,
          OUTPUT_DIR,
          {
            zone: 1,
            screenshotName: CONTINUITY_ARTIFACTS.waveScreenshots.wave1,
          },
        ),
        wave10: await captureGameplayViewport(
          chromePort,
          baseUrl,
          waveViewport,
          OUTPUT_DIR,
          {
            zone: 10,
            screenshotName: CONTINUITY_ARTIFACTS.waveScreenshots.wave10,
          },
        ),
      };
      const consoleProblems = collectConsoleProblems(cdp.events);
      assert(consoleProblems.length === 0, consoleProblems.join(' | '));
      let sameScaleComparison = null;
      let baselineRequests = [];
      if (baselineInput.required && baselineBaseUrl) {
        const comparison = await captureSameScaleComparison(
          chromePort,
          baseUrl,
          baselineBaseUrl,
          OUTPUT_DIR,
        );
        sameScaleComparison = comparison.artifact;
        baselineRequests = comparison.baselineRequests;
        fs.writeFileSync(
          path.join(OUTPUT_DIR, CONTINUITY_ARTIFACTS.sameScaleComparison),
          `${JSON.stringify(sameScaleComparison, null, 2)}\n`,
        );
      }
      const selectedRequests = mergeSelectedRequestLedgers(
        normalizeSelectedRequestLedger(cdp.events),
        ...gameplayFacts.map((fact) => fact.requestLedger || []),
        waveEvidence.wave1.requestLedger || [],
        waveEvidence.wave10.requestLedger || [],
      );
      const splitRequests = splitSelectedRequestLedgers(
        selectedRequests,
        baselineRequests,
      );
      const report = buildDeterministicContinuityReport({
        browser,
        localPreview: localPreview.summary,
        continuity,
        selectedRequests: splitRequests.currentRequests,
        scaleMatrix,
        waveEvidence,
        coldTransition,
        baseline: {
          ...baselineInput,
          ...splitRequests,
        },
        sameScaleComparison,
      });
      fs.writeFileSync(
        path.join(OUTPUT_DIR, CONTINUITY_ARTIFACTS.deterministicReport),
        `${JSON.stringify(report, null, 2)}\n`,
      );
      const performance = buildContinuityPerformanceArtifact({
        browser,
        decodeTimings: continuity.decodeTimings,
      });
      fs.writeFileSync(
        path.join(OUTPUT_DIR, CONTINUITY_ARTIFACTS.performanceReport),
        `${JSON.stringify(performance, null, 2)}\n`,
      );
      console.log(
        `PASS chrome-motion-continuity ${continuity.catalogSize}/39 clips across ${REFRESH_RATES.join('/') } Hz`,
      );
    } finally {
      cdp.close();
      await closePage(chromePort, page.id);
    }
  } finally {
    await baselineOverlay?.close?.();
    chrome.kill('SIGTERM');
    if (serverPid) server?.kill('SIGTERM');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`FAIL chrome-motion-continuity ${error.message}`);
    process.exitCode = 1;
  });
}
