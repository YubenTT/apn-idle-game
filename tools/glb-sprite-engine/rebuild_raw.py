#!/usr/bin/env python3
"""Rebuild evidence raw-strips from packed atlases (no re-render needed).

pack.py trims every frame to the clip's UNION alpha bbox and records the trim
rect in atlas.json. Pasting each trimmed frame back at (trim.x, trim.y) on a
transparent frameSize canvas reconstructs the original raw strip 1:1.

Usage: python3 rebuild_raw.py --spec <spec.json> --out <atlas-dir>
Writes refs/gen/v3/<spec-file-basename>-raw.png
"""
import argparse, json, os, sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--spec', required=True)
ap.add_argument('--out', required=True)
a = ap.parse_args()

spec = json.load(open(a.spec))
name = spec.get('name') or os.path.splitext(os.path.basename(a.spec))[0]
meta = json.load(open(os.path.join(a.out, f'{name}.json')))
webp = Image.open(os.path.join(a.out, f'{name}.webp')).convert('RGBA')

S = meta.get('frameSize') or (spec.get('output') or {}).get('frame') or 256
trim = meta['trim']
frames = meta['frames']
strip = Image.new('RGBA', (S * len(frames), S), (0, 0, 0, 0))
for i, fr in enumerate(frames):
    cell = webp.crop((fr['x'], fr['y'], fr['x'] + fr['w'], fr['y'] + fr['h']))
    strip.paste(cell, (i * S + trim['x'], trim['y']), cell)

base = os.path.splitext(os.path.basename(a.spec))[0]
dst = os.path.join('refs/gen/v3', f'{base}-raw.png')
os.makedirs(os.path.dirname(dst), exist_ok=True)
strip.save(dst)
print(f'{dst}  ({strip.width}x{strip.height}, {len(frames)}f)')
