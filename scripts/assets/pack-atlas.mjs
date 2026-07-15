import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readJson, stableJson, validateAtlasData } from './lib.mjs';

const run = promisify(execFile);
const FFMPEG = '/opt/homebrew/bin/ffmpeg';

export function layoutFrames(spec) {
  const padding = Math.max(0, spec.padding ?? 2);
  const maxWidth = Math.max(64, spec.maxWidth ?? 2048);
  let x = padding;
  let y = padding;
  let rowHeight = 0;
  let width = 0;
  const frames = {};
  for (const frame of [...spec.frames].sort((a, b) => a.name.localeCompare(b.name))) {
    if (x + frame.w + padding > maxWidth && x > padding) {
      x = padding;
      y += rowHeight + padding;
      rowHeight = 0;
    }
    frames[frame.name] = {
      rect: { x, y, w: frame.w, h: frame.h },
      sourceSize: { w: frame.sourceW ?? frame.w, h: frame.sourceH ?? frame.h },
      trimOffset: { x: frame.trimX ?? 0, y: frame.trimY ?? 0 },
      pivot: { x: frame.pivot?.x ?? 0.5, y: frame.pivot?.y ?? 1 },
    };
    x += frame.w + padding;
    rowHeight = Math.max(rowHeight, frame.h);
    width = Math.max(width, x);
  }
  const height = y + rowHeight + padding;
  return { frames, meta: { image: spec.image, size: { w: Math.min(maxWidth, width), h: height }, scale: 1 } };
}

export async function packAtlas(specFile, outputPng, outputJson) {
  const spec = readJson(specFile);
  const atlas = layoutFrames({ ...spec, image: path.basename(outputPng) });
  const errors = validateAtlasData(atlas, path.basename(outputJson));
  if (errors.length) throw new Error(errors.join('\n'));
  const ordered = [...spec.frames].sort((a, b) => a.name.localeCompare(b.name));
  const args = [];
  for (const frame of ordered) args.push('-i', path.resolve(path.dirname(specFile), frame.file));
  const { w, h } = atlas.meta.size;
  let filter = `color=c=black@0.0:s=${w}x${h},format=rgba[base]`;
  let previous = 'base';
  ordered.forEach((frame, index) => {
    const rect = atlas.frames[frame.name].rect;
    const next = `layer${index}`;
    filter += `;[${previous}][${index}:v]overlay=${rect.x}:${rect.y}:format=auto[${next}]`;
    previous = next;
  });
  args.push('-filter_complex', filter, '-map', `[${previous}]`, '-frames:v', '1', '-y', outputPng);
  await run(FFMPEG, args);
  fs.writeFileSync(outputJson, stableJson(atlas));
  return atlas;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [spec, png, json] = process.argv.slice(2);
  if (!spec || !png || !json) throw new Error('Usage: pack-atlas.mjs <spec.json> <atlas.png> <atlas.json>');
  await packAtlas(path.resolve(spec), path.resolve(png), path.resolve(json));
  console.log(`ATLAS ${png}`);
}
