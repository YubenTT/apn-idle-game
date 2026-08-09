import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
);
const SOURCE_FILE = path.join(ROOT, 'qa/browser/chrome-motion-continuity.mjs');
const TMP_ROOT = fs.mkdtempSync(path.join(ROOT, '.tmp-motion-continuity-'));
const TMP_BASELINE = path.join(TMP_ROOT, 'baseline');
process.on('exit', () => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});
fs.mkdirSync(path.join(TMP_BASELINE, 'hero'), { recursive: true });
fs.writeFileSync(path.join(TMP_ROOT, 'index.html'), '<!doctype html>\n');
fs.writeFileSync(path.join(TMP_BASELINE, 'hero', 'run.webp'), 'fixture');
fs.writeFileSync(
  path.join(TMP_BASELINE, 'manifest.json'),
  `${JSON.stringify({ sourceFamily: 'authored-semantic-v3' })}\n`,
);

const assert = (condition, message) => {
  if (!condition) throw new Error(`Motion continuity: ${message}`);
  console.log(`OK ${message}`);
};

const source = fs.readFileSync(SOURCE_FILE, 'utf8');

assert(
  /process\.argv\[1\]|fileURLToPath|pathToFileURL/.test(source),
  'browser continuity harness exposes an import-safe entrypoint guard',
);
assert(
  /export const CONTINUITY_ARTIFACTS\b/.test(source),
  'browser continuity harness exports stable artifact names',
);
assert(
  /export function buildDeterministicContinuityReport\b/.test(source),
  'browser continuity harness exports deterministic report builder',
);
assert(
  /export function buildContinuityPerformanceArtifact\b/.test(source),
  'browser continuity harness exports separate performance artifact builder',
);
assert(
  /export function createPreviewOverlayServer\b/.test(source),
  'browser continuity harness exports a bounded V3 overlay server',
);
assert(
  /export function buildSameScaleComparisonArtifact\b/.test(source),
  'browser continuity harness exports a same-scale comparison artifact builder',
);
assert(
  /protocol-courier/.test(source) && /site-sentinel/.test(source),
  'browser continuity harness carries standard and elite witness coverage',
);
assert(
  /board\.width = 960/.test(source),
  'four-column witness board keeps the boss tile inside its backing store',
);
assert(
  /qa-same-scale-comparison/.test(source) &&
    /exact game scale/.test(source) &&
    /#f4efe4/.test(source) &&
    /#101316/.test(source),
  'same-scale screenshots render all four role witnesses on explicit light and dark backgrounds',
);
assert(
  /screenshot:\s*\$\{JSON\.stringify\(screenshotName\)\}/.test(source),
  'same-scale page evidence receives its screenshot name as a serialized browser literal',
);
assert(
  /const drawTrimHeight\s*=\s*scale\.cssBodyHeight\s*\*\s*runtime\.trim\.height\s*\/\s*scale\.sourceVisiblePixels/.test(
    source,
  ) &&
    /const centeredPivotY\s*=/.test(source) &&
    /sourceLabel\s*\+\s*' · exact game scale · DPR2'/.test(source),
  'same-scale page centers the complete trim at exact visible-body scale and keeps V3/V4 visible in its title',
);

const continuity = await import(pathToFileURL(SOURCE_FILE).href);
let rejectedEmptyBaseline = false;
try {
  continuity.buildSameScaleComparisonArtifact({
    viewport: 'mobile-428x926',
    dpr: 2,
    screenshots: {
      current: 'same-scale-current.png',
      baseline: 'same-scale-baseline.png',
    },
    pairs: [
      {
        role: 'hero',
        assetId: 'apn-hero',
        clipName: 'run',
        frameIndex: 0,
        cssBodyHeight: 96,
        current: {
          cssBodyHeight: 96,
          displayedDevicePixels: 192,
          sourceVisiblePixels: 219,
          alphaPixels: 3000,
        },
        baseline: {
          cssBodyHeight: 0,
          displayedDevicePixels: 0,
          sourceVisiblePixels: 0,
          alphaPixels: 0,
        },
      },
    ],
  });
} catch {
  rejectedEmptyBaseline = true;
}
assert(
  rejectedEmptyBaseline,
  'same-scale comparison rejects an empty or zero-sized V3 baseline witness',
);
const baselineInput = continuity.requireV3BaselineInput(
  { sourceFamily: 'authored-semantic-v4' },
  TMP_BASELINE,
);
assert(
  !JSON.stringify(baselineInput).includes(TMP_BASELINE),
  'deterministic baseline summary excludes machine-local preview paths',
);
assert(
  continuity.CONTINUITY_ARTIFACTS.waveScreenshots.wave1 === 'wave-1-gameplay.png' &&
    continuity.CONTINUITY_ARTIFACTS.performanceReport === 'performance.json' &&
    continuity.CONTINUITY_ARTIFACTS.sameScaleComparison === 'same-scale-comparison.json',
  'artifact names remain stable for deterministic and performance outputs',
);
const ledger = continuity.normalizeSelectedRequestLedger([
  {
    method: 'Network.responseReceived',
    params: {
      response: {
        url: 'http://127.0.0.1:8123/.gaf2d-preview/characters/protocol-courier/advance.webp?v=1',
        status: 200,
        headers: { 'content-length': '196370' },
      },
    },
  },
  {
    method: 'Network.responseReceived',
    params: {
      response: {
        url: 'http://127.0.0.1:8123/.gaf2d-preview/characters/site-sentinel/engaged.json?v=1',
        status: 200,
        headers: { 'content-length': '2048' },
      },
    },
  },
]);
assert(
  ledger.length === 2 &&
    ledger.some(
      (entry) =>
        entry.assetId === 'protocol-courier' && entry.kind === 'media',
    ) &&
    ledger.some(
      (entry) =>
        entry.assetId === 'site-sentinel' && entry.kind === 'descriptor',
    ),
  'selected-only request ledger normalizes standard and elite fetches',
);
const residency = continuity.summarizeResidencyCounters({
  snapshots: [
    {
      elapsedMs: 17,
      diagnostics: [{ reason: 'warm' }],
      coldState: {
        entries: [
          { key: 'valorant/site-sentinel', status: 'ready' },
          { key: 'valorant/site-sentinel#engaged', status: 'ready' },
          { key: 'valorant/protocol-courier#advance', status: 'pending' },
        ],
      },
    },
  ],
});
assert(
  residency[0].decodedReadyEntries === 2 &&
    residency[0].currentSetEntries === 1 &&
    residency[0].retainedClipEntries === 1,
  'cold-transition residency counters separate current sets from retained clips',
);
const report = continuity.buildDeterministicContinuityReport({
  browser: {
    product: 'Chrome/140.0.0.0',
    protocolVersion: '1.3',
    userAgent: 'Mozilla/5.0 HeadlessChrome/140.0.0.0',
    jsVersion: '14.0.0',
  },
  localPreview: { sourceFamily: 'authored-semantic-v3' },
  continuity: {
    catalogSize: 39,
    failures: [],
    witnessTileMetrics: [{ role: 'elite', assetId: 'site-sentinel', clipName: 'engaged' }],
    fullCycleCredit: { viewed: 39, total: 39, dpr: 2, mode: 'actual-game-size' },
  },
  selectedRequests: ledger,
  scaleMatrix: [
    { role: 'hero', dpr: 1, mode: 'actual-game-size' },
    { role: 'standard', dpr: 2, mode: 'inspection' },
    { role: 'elite', dpr: 1, mode: 'actual-game-size' },
    { role: 'boss', dpr: 2, mode: 'inspection' },
  ],
  waveEvidence: {
    wave1: { zone: 1, screenshot: 'wave-1-gameplay.png' },
    wave10: { zone: 10, screenshot: 'wave-10-gameplay.png' },
  },
  coldTransition: { snapshots: [] },
  baseline: {
    required: true,
    provided: true,
    baseline: { sourceFamily: 'authored-semantic-v3' },
    currentRequests: [{ path: '.gaf2d-preview/hero/run.webp', kind: 'media' }],
    baselineRequests: [{ path: '.gaf2d-preview/hero/run.webp', kind: 'media' }],
  },
  sameScaleComparison: continuity.buildSameScaleComparisonArtifact({
    viewport: 'mobile-428x926',
    dpr: 2,
    pairs: [
      {
        role: 'hero',
        assetId: 'apn-hero',
        clipName: 'run',
        frameIndex: 0,
        cssBodyHeight: 128,
        current: {
          cssBodyHeight: 128,
          sourceVisiblePixels: 256,
          displayedDevicePixels: 256,
          alphaPixels: 5000,
          screenshot: 'v4-hero.png',
        },
        baseline: {
          cssBodyHeight: 128,
          sourceVisiblePixels: 128,
          displayedDevicePixels: 256,
          alphaPixels: 2400,
          screenshot: 'v3-hero.png',
        },
      },
    ],
    screenshots: {
      current: 'same-scale-current.png',
      baseline: 'same-scale-baseline.png',
    },
  }),
});
assert(
  report.fullCycleCredit.viewed === 39 &&
    report.browser.product === 'Chrome/140.0.0.0' &&
    report.waveEvidence.wave10.zone === 10 &&
    report.scaleMatrix.length === 4 &&
    report.sameScaleComparison.summary.densityShortfallCount === 1 &&
    report.sameScaleComparison.screenshots.current ===
      'same-scale-current.png' &&
    report.sameScaleComparison.screenshots.baseline ===
      'same-scale-baseline.png' &&
    !('screenshot' in report.sameScaleComparison) &&
    report.baseline.currentRequests.length === 1 &&
    report.baseline.baselineRequests.length === 1,
  'deterministic report persists 39/39 credit, role scale matrix, wave evidence, and split V3/V4 same-scale summary',
);
const performance = continuity.buildContinuityPerformanceArtifact({
  browser: {
    product: 'Chrome/140.0.0.0',
    protocolVersion: '1.3',
    userAgent: 'Mozilla/5.0 HeadlessChrome/140.0.0.0',
    jsVersion: '14.0.0',
  },
  decodeTimings: [{ assetId: 'apn-hero', clipName: 'run', decodeMs: 3.141 }],
});
assert(
  Array.isArray(performance.decodeTimings) &&
    performance.browser.product === 'Chrome/140.0.0.0' &&
    performance.decodeTimings[0].decodeMs === 3.141 &&
    !('decodeTimings' in report),
  'volatile decode timings stay isolated from the deterministic report',
);
const server = continuity.createPreviewOverlayServer({
  root: TMP_ROOT,
  baselinePreviewRoot: TMP_BASELINE,
});
assert(
  typeof server.resolveRequestPath === 'function' &&
    server.resolveRequestPath('/.gaf2d-preview/hero/run.webp')?.root ===
      TMP_BASELINE &&
    server.resolveRequestPath('/index.html')?.root === TMP_ROOT &&
    server.resolveRequestPath('/.gaf2d-preview/../../secret.txt') === null,
  'overlay server resolves baseline preview requests path-bounded and rejects traversal',
);

console.log('MOTION CONTINUITY CHECK PASS');
