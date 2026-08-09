#!/usr/bin/env python3
"""Collision-proof QA stats: measure per-frame alpha bbox directly from a packed
.webp atlas + .json (same math as validate.mjs but on the atlas, not the raw strip).
Also dumps a dark contact-sheet PNG for visual review."""
import json, sys
from PIL import Image

def stats(webp_path, json_path, sheet_path=None):
    im = Image.open(webp_path).convert('RGBA')
    meta = json.load(open(json_path))
    frames = meta['frames']
    boxes, thumbs = [], []
    for f in frames:
        c = im.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
        a = c.getchannel('A').point(lambda v: 255 if v > 8 else 0)
        b = a.getbbox()
        boxes.append(list(b) if b else None)
        thumbs.append(c)
    ws = [b[2] - b[0] for b in boxes if b]
    hs = [b[3] - b[1] for b in boxes if b]
    bottoms = [b[3] for b in boxes if b]
    var = lambda a: (max(a) - min(a)) / (sum(a) / len(a)) * 100
    print(f'{webp_path.split("/")[-1]}: frames={len(frames)}')
    print(f'  widths : {ws}')
    print(f'  heights: {hs}')
    print(f'  w_var={var(ws):.2f}%  h_var={var(hs):.2f}%  (gate <6%)')
    print(f'  feet drift={max(bottoms) - min(bottoms)}px  (gate <=4px, bottoms={bottoms})')
    if sheet_path:
        pad = 4
        W = sum(t.width for t in thumbs) + pad * (len(thumbs) + 1)
        H = max(t.height for t in thumbs) + pad * 2
        sheet = Image.new('RGBA', (W, H), (16, 18, 24, 255))
        x = pad
        for t in thumbs:
            sheet.alpha_composite(t, (x, pad))
            x += t.width + pad
        sheet.save(sheet_path)
        print(f'  sheet -> {sheet_path}')

if __name__ == '__main__':
    stats(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
