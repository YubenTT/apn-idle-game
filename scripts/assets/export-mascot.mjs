import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { packAtlas } from './pack-atlas.mjs';
import { convertWebp } from './convert-webp.mjs';
import { stableJson } from './lib.mjs';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const masterRoot = path.join(root, 'assets/mascot/master');
const atlasRoot = path.join(root, 'assets/mascot/atlas');
const runtimeRoot = path.join(root, 'assets/mascot');
const poses = ['idle', 'run', 'scan', 'crit', 'loot', 'sprint', 'overdrive', 'damage', 'level', 'defeat'];

const unescapeHtml = (value) => value
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&amp;', '&')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>');

export async function exportMascot(baseUrl = 'http://localhost:8791') {
  fs.mkdirSync(masterRoot, { recursive: true });
  fs.mkdirSync(atlasRoot, { recursive: true });
  const url = `${baseUrl}/tools/mascot-render/?export=all&size=192`;
  const { stdout } = await run(chrome, [
    '--headless=new',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--hide-scrollbars',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=3000',
    '--dump-dom',
    url,
  ], { maxBuffer: 30 * 1024 * 1024 });
  const match = stdout.match(/<pre id="export-data">([\s\S]*?)<\/pre>/);
  if (!match) throw new Error('Host export data missing; ensure the local server and WebGL2 renderer are available');
  const frames = JSON.parse(unescapeHtml(match[1]));
  if (!frames.__stats || frames.__stats.alphaMax === 0) throw new Error(`Host renderer blank: ${JSON.stringify(frames.__stats)}`);
  for (const pose of poses) {
    const data = frames[pose];
    if (!data?.startsWith('data:image/png;base64,')) throw new Error(`Host ${pose}: missing PNG`);
    fs.writeFileSync(path.join(masterRoot, `${pose}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
  const spec = {
    image: 'apn-mascot-base.png',
    source: 'assets/apn-mascot-glb-host.glb',
    renderLock: { cameraY: 18, cameraX: 9, projection: 'orthographic', pivot: 'foot-center' },
    padding: 2,
    maxWidth: 2048,
    frames: poses.map((pose) => ({
      name: pose,
      file: `${pose}.png`,
      w: 192,
      h: 192,
      pivot: { x: 0.5, y: 1 },
      metrics: { footX: 96, footY: 184, headBodyRatio: 1.72, visorCoverage: 0.24 },
    })),
  };
  const specFile = path.join(masterRoot, 'atlas-spec.json');
  fs.writeFileSync(specFile, stableJson(spec));
  const atlasPng = path.join(masterRoot, 'apn-mascot-base.png');
  const atlasJson = path.join(atlasRoot, 'apn-mascot-base.json');
  await packAtlas(specFile, atlasPng, atlasJson);
  await convertWebp(atlasPng, path.join(runtimeRoot, 'apn-mascot-base.webp'), 'host');
  await convertWebp(path.join(masterRoot, 'idle.png'), path.join(runtimeRoot, 'apn-mascot-idle.webp'), 'host');

  const fxPng = path.join(masterRoot, 'apn-mascot-fx.png');
  await run('/opt/homebrew/bin/ffmpeg', [
    '-f', 'lavfi', '-i', 'color=c=black@0.0:s=64x64,format=rgba',
    '-frames:v', '1', '-y', fxPng,
  ]);
  await convertWebp(fxPng, path.join(runtimeRoot, 'apn-mascot-fx.webp'), 'host');
  return { poses: poses.length, atlasJson };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await exportMascot(process.argv[2]);
  console.log(`MASCOT ${result.poses} poses`);
}
