#!/usr/bin/env node
/* ============================================================================
 * glb-sprite-engine · capture.mjs — node driver (ENGINE CONTRACT v1)
 *
 *   node capture.mjs --spec <spec.json> --out <dir> [--refs <dir>]
 *
 * Starts an ephemeral static server at the repo root (ES modules need http),
 * launches headless Chrome (retrying until document.title === 'render-ready'),
 * screenshots the strip with a transparent background, then calls pack.py to
 * crop frames, union-bbox trim (identical box across the clip so the feet
 * anchor stays consistent), and pack a webp atlas + atlas.json.
 * Also writes <name>-raw.png (untouched strip) and <name>-strip.png (contact
 * sheet for human review) into the refs dir (default refs/gen/v3).
 * ========================================================================== */

import { spawn, spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ENGINE_DIR = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function arg(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

const specPath = path.resolve(arg('--spec', ''));
const outDir = path.resolve(arg('--out', ''));
if (!specPath || !outDir) {
  console.error('usage: node capture.mjs --spec <spec.json> --out <dir> [--refs <dir>]');
  process.exit(2);
}
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const name = spec.name || path.basename(specPath, '.json');
const refsDir = path.resolve(arg('--refs', path.join(ENGINE_DIR, '..', '..', 'refs', 'gen', 'v3')));
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(refsDir, { recursive: true });

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: ENGINE_DIR, encoding: 'utf8' }).trim();
const frame = (spec.output && spec.output.frame) || 256;
const W = spec.clip.frames * frame;
const H = frame;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
    srv.on('error', reject);
  });
}

async function startServer(port) {
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '-d', repoRoot], {
    stdio: 'ignore',
  });
  // wait until the server answers
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const ok = await new Promise((resolve) => {
      const req = new net.Socket();
      req.once('connect', () => { req.end(); resolve(true); });
      req.once('error', () => resolve(false));
      req.connect(port, '127.0.0.1');
    });
    if (ok) return proc;
  }
  proc.kill();
  throw new Error('static server failed to start');
}

const port = await freePort();
const server = await startServer(port);
const relSpec = '/' + path.relative(repoRoot, specPath).split(path.sep).join('/');
const url = `http://127.0.0.1:${port}/tools/glb-sprite-engine/render.html?spec=${encodeURIComponent(relSpec)}`;
const rawPng = path.join(refsDir, `${name}-raw.png`);

try {
  let ready = false;
  for (let attempt = 1; attempt <= 4 && !ready; attempt++) {
    const res = spawnSync(CHROME, [
      '--headless=new',
      `--screenshot=${rawPng}`,
      `--window-size=${W},${H}`,
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      '--hide-scrollbars',
      '--use-angle=swiftshader',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${fs.mkdtempSync(path.join('/tmp', 'glb-sprite-'))}`,
      '--virtual-time-budget=30000',
      '--dump-dom',
      url,
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 240000 });
    const dom = res.stdout || '';
    if (res.error) console.error(`[capture] attempt ${attempt} chrome error:`, res.error.message);
    if (dom.includes('<title>render-ready</title>') && fs.existsSync(rawPng)) {
      ready = true;
    } else {
      const m = dom.match(/<title>([^<]*)<\/title>/);
      console.error(`[capture] attempt ${attempt} not ready (title=${m ? m[1] : '?'}); retrying`);
    }
  }
  if (!ready) {
    console.error('[capture] FAIL: render never reached title=render-ready');
    process.exit(1);
  }

  // --- pack: crop, union-bbox trim, webp atlas + atlas.json + contact strip ---
  const contactPng = path.join(refsDir, `${name}-strip.png`);
  const pack = spawnSync('python3', [
    path.join(ENGINE_DIR, 'pack.py'),
    '--strip', rawPng,
    '--frames', String(spec.clip.frames),
    '--frame', String(frame),
    '--fps', String(spec.clip.fps),
    '--name', name,
    '--out', outDir,
    '--contact', contactPng,
  ], { encoding: 'utf8' });
  process.stdout.write(pack.stdout || '');
  process.stderr.write(pack.stderr || '');
  if (pack.status !== 0) {
    console.error('[capture] FAIL: pack.py exited', pack.status);
    process.exit(1);
  }
  console.log(`[capture] OK ${name}: ${outDir}`);
} finally {
  server.kill();
}
