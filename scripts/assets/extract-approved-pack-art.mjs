import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { convertWebp } from './convert-webp.mjs';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const proofRoot = path.join(root, 'docs/art/proofs/2026-07-15');
const packsRoot = path.join(root, 'assets/game-packs');
const scriptRoot = path.join(root, 'scripts/assets');
const PYTHON = '/Users/talatongu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';

const row = (proof, rowIndex, ranges) => ({
  proof,
  boxes: ranges.map(([left, right]) => [left, right, rowIndex * 160 + 8, 152]),
});

const SOURCES = Object.freeze({
  valorant: row('game-pack-board-01.webp', 0, [[55, 190], [165, 315], [290, 445], [420, 575], [545, 710], [670, 960]]),
  league: { proof: 'game-pack-board-01.webp', boxes: [[55, 150, 180, 140], [135, 235, 180, 140], [225, 355, 180, 140], [335, 465, 180, 140], [445, 610, 180, 140], [650, 950, 180, 140]] },
  fortnite: row('game-pack-board-01.webp', 2, [[45, 175], [165, 300], [285, 430], [405, 555], [535, 700], [660, 960]]),
  'world-of-warcraft': row('game-pack-board-01.webp', 3, [[45, 180], [160, 300], [275, 425], [400, 560], [535, 705], [665, 960]]),
  'fc-26': row('game-pack-board-02.webp', 0, [[115, 255], [245, 385], [375, 520], [495, 640], [595, 725], [700, 960]]),
  minecraft: row('game-pack-board-02.webp', 1, [[70, 185], [170, 290], [275, 395], [375, 510], [495, 635], [620, 940]]),
  'counter-strike-2': row('game-pack-board-02.webp', 2, [[85, 220], [205, 345], [325, 470], [450, 595], [570, 705], [675, 930]]),
  'old-school-runescape': row('game-pack-board-02.webp', 3, [[45, 180], [165, 305], [285, 435], [415, 570], [545, 710], [670, 960]]),
  'nba-2k26': row('game-pack-board-03.webp', 0, [[55, 175], [145, 290], [265, 415], [390, 540], [510, 650], [610, 960]]),
  overwatch: row('game-pack-board-03.webp', 1, [[35, 175], [155, 305], [285, 440], [420, 575], [550, 710], [665, 960]]),
  'grand-theft-auto-v': row('game-pack-board-03.webp', 2, [[25, 165], [145, 290], [270, 420], [400, 555], [535, 695], [650, 960]]),
  'madden-nfl-26': row('game-pack-board-03.webp', 3, [[15, 150], [130, 270], [250, 390], [370, 510], [490, 635], [600, 960]]),
  'apex-legends': row('game-pack-board-04.webp', 0, [[20, 130], [275, 365], [360, 465], [455, 565], [550, 675], [700, 960]]),
  'dota-2': { proof: 'game-pack-board-04.webp', boxes: [[135, 245, 180, 140], [230, 345, 180, 140], [330, 445, 180, 140], [430, 540, 180, 140], [525, 665, 180, 140], [690, 960, 180, 140]] },
  'dead-by-daylight': row('game-pack-board-04.webp', 2, [[20, 160], [140, 285], [265, 410], [390, 540], [520, 680], [640, 960]]),
  'path-of-exile-2': row('game-pack-board-04.webp', 3, [[35, 175], [155, 300], [280, 430], [410, 565], [545, 705], [660, 960]]),
  'marvel-rivals': {
    urls: [
      'https://www.marvelrivals.com/pc/gw/5da825b19a6a/heros/kp_13.png',
      'https://www.marvelrivals.com/pc/gw/5da825b19a6a/heros/kp_8.png',
      'https://www.marvelrivals.com/pc/gw/5da825b19a6a/heros/kp_6.png',
      'https://www.marvelrivals.com/pc/gw/5da825b19a6a/heros/kp_12.png',
      'https://www.marvelrivals.com/pc/gw/5da825b19a6a/heros/kp_14.png',
      null, // The approved final encounter is vendored as master/source-6.png.
    ],
  },
  'escape-from-tarkov': {
    proof: 'tarkov-focus.webp',
    boxes: [[0, 170, 180, 400], [140, 315, 180, 400], [285, 460, 180, 400], [430, 600, 180, 400], [565, 735, 180, 400], [690, 960, 90, 500]],
  },
  'rocket-league': {
    proof: 'rocket-league-focus.webp',
    boxes: [[0, 145, 335, 235], [115, 270, 330, 240], [235, 390, 325, 245], [355, 510, 315, 255], [465, 610, 325, 245], [590, 960, 240, 360]],
  },
  'elden-ring': {
    proof: 'elden-ring-focus.webp',
    boxes: [[0, 165, 280, 350], [130, 285, 280, 350], [250, 400, 250, 380], [365, 525, 245, 385], [485, 665, 225, 405], [625, 960, 80, 550]],
  },
});

async function ensureSegmenter(temp) {
  const output = path.join(temp, 'segment-foreground');
  await run('xcrun', ['swiftc', '-O', path.join(scriptRoot, 'segment-foreground.swift'), '-o', output]);
  return output;
}

function boxesFor(source) {
  return source.boxes;
}

async function extractPack(pack, segmenter, temp) {
  const source = SOURCES[pack.id];
  if (!source) throw new Error(`No approved proof source: ${pack.id}`);
  const master = path.join(packsRoot, pack.id, 'master');
  if (source.urls) {
    const foregrounds = [];
    for (const [index, url] of source.urls.entries()) {
      const target = path.join(master, `source-${index + 1}.png`);
      if (!fs.existsSync(target)) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Source download failed ${response.status}: ${url}`);
        fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
      }
      foregrounds.push(target);
    }
    const atlasPng = path.join(master, 'targets-approved.png');
    await run(PYTHON, [path.join(scriptRoot, 'compose-target-atlas.py'), atlasPng, ...foregrounds]);
    await convertWebp(atlasPng, path.join(packsRoot, pack.id, 'targets.webp'), 'targets');
    const sourceBoardFile = path.join(packsRoot, pack.id, 'source-board.md');
    const sourceBoard = fs.readFileSync(sourceBoardFile, 'utf8');
    if (!sourceBoard.includes('## Focused proof closure')) {
      fs.writeFileSync(sourceBoardFile, `${sourceBoard}\n## Focused proof closure\n\nThe five target masters are official Marvel Rivals transparent character renders; the final encounter is the recorded Doom render above. All six are normalized into the APN outline, 128 px silhouette, right-to-left staging, foot pivot, and authored break-state contract. Source URLs are retained in \`scripts/assets/extract-approved-pack-art.mjs\`.\n`);
    }
    console.log(`APPROVED ART ${String(pack.order).padStart(2, '0')} ${pack.id}`);
    return;
  }
  const input = path.join(proofRoot, source.proof);
  const foregrounds = [];
  for (const [index, box] of boxesFor(source).entries()) {
    const [left, right, top, height] = box;
    const crop = path.join(temp, `${pack.id}-${index}-crop.png`);
    const foreground = path.join(temp, `${pack.id}-${index}-foreground.png`);
    const width = right - left;
    const scale = height <= 180 ? 4 : 2;
    await run(FFMPEG, ['-loglevel', 'error', '-i', input, '-vf', `crop=${width}:${height}:${left}:${top},scale=${width * scale}:${height * scale}:flags=lanczos`, '-y', crop]);
    try {
      await run(segmenter, [crop, foreground]);
    } catch {
      await run(PYTHON, [path.join(scriptRoot, 'fallback-segment.py'), crop, foreground]);
    }
    foregrounds.push(foreground);
  }
  const atlasPng = path.join(master, 'targets-approved.png');
  await run(PYTHON, [path.join(scriptRoot, 'compose-target-atlas.py'), atlasPng, ...foregrounds]);
  await convertWebp(atlasPng, path.join(packsRoot, pack.id, 'targets.webp'), 'targets');
  console.log(`APPROVED ART ${String(pack.order).padStart(2, '0')} ${pack.id}`);
}

export async function extractRange(start = 1, end = 20) {
  const catalog = JSON.parse(fs.readFileSync(path.join(packsRoot, 'catalog.json'), 'utf8'));
  const selected = catalog.filter((pack) => pack.order >= start && pack.order <= end && SOURCES[pack.id]);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'apn-approved-art-'));
  try {
    const segmenter = await ensureSegmenter(temp);
    for (const pack of selected) await extractPack(pack, segmenter, temp);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const start = Number(process.argv[2] || 1);
  const end = Number(process.argv[3] || start);
  await extractRange(start, end);
}
