#!/usr/bin/env python3
# ============================================================================
# glb-sprite-engine · pack.py — PIL atlas packer (ENGINE CONTRACT v1)
#
#   python3 pack.py --strip <raw.png> --frames N --frame S --fps F
#                   --name <clip> --out <dir> --contact <sheet.png>
#
# Crops the raw horizontal strip into frames, computes the UNION alpha bbox
# across all frames of the clip (identical trim box for every frame so the
# feet anchor stays consistent), trims, packs a webp atlas + atlas.json
# {frames:[{x,y,w,h}], fps, frameSize, anchor:[ax,ay]}, and writes a dark
# contact sheet for human review. Anchor = bottom-center of the union bbox
# (feet line), stored normalized.
# ============================================================================

import argparse
import json
import os
import sys

from PIL import Image

ALPHA_THRESHOLD = 8
PAD = 2
MAX_ATLAS_DIM = 4096
MAX_ATLAS_BYTES = int(1.5 * 1024 * 1024)


def alpha_bbox(im):
    a = im.getchannel("A").point(lambda v: 255 if v > ALPHA_THRESHOLD else 0)
    return a.getbbox()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strip", required=True)
    ap.add_argument("--frames", type=int, required=True)
    ap.add_argument("--frame", type=int, required=True)
    ap.add_argument("--fps", type=float, required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--contact", required=True)
    args = ap.parse_args()

    strip = Image.open(args.strip).convert("RGBA")
    expected_w = args.frames * args.frame
    if strip.width != expected_w or strip.height != args.frame:
        print(f"[pack] FAIL: strip is {strip.width}x{strip.height}, expected {expected_w}x{args.frame}", file=sys.stderr)
        sys.exit(1)

    crops, boxes = [], []
    for i in range(args.frames):
        c = strip.crop((i * args.frame, 0, (i + 1) * args.frame, args.frame))
        crops.append(c)
        boxes.append(alpha_bbox(c))

    empty = [i for i, b in enumerate(boxes) if b is None]
    if empty:
        print(f"[pack] WARN: frames with empty alpha: {empty}", file=sys.stderr)

    solid = [b for b in boxes if b is not None]
    if not solid:
        print("[pack] FAIL: every frame is fully transparent", file=sys.stderr)
        sys.exit(1)

    # union bbox across the clip — IDENTICAL trim box for all frames
    x0 = min(b[0] for b in solid)
    y0 = min(b[1] for b in solid)
    x1 = max(b[2] for b in solid)
    y1 = max(b[3] for b in solid)
    tw, th = x1 - x0, y1 - y0
    trimmed = [c.crop((x0, y0, x1, y1)) for c in crops]

    # pack in rows (single row while it fits the max atlas dimension)
    rows, cur, cur_w = [], [], 0
    for t in trimmed:
        w = t.width + (PAD if cur else 0)
        if cur and cur_w + w > MAX_ATLAS_DIM:
            rows.append(cur)
            cur, cur_w = [], 0
            w = t.width
        cur.append(t)
        cur_w += w
    if cur:
        rows.append(cur)

    atlas_w = max(sum(t.width for t in r) + PAD * (len(r) - 1) for r in rows)
    atlas_h = sum(r[0].height for r in rows) + PAD * (len(rows) - 1)
    if atlas_w > MAX_ATLAS_DIM or atlas_h > MAX_ATLAS_DIM:
        print(f"[pack] FAIL: atlas {atlas_w}x{atlas_h} exceeds {MAX_ATLAS_DIM}px", file=sys.stderr)
        sys.exit(1)

    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    frames_meta, y = [], 0
    for r in rows:
        x = 0
        for t in r:
            atlas.paste(t, (x, y), t)
            frames_meta.append({"x": x, "y": y, "w": t.width, "h": t.height})
            x += t.width + PAD
        y += r[0].height + PAD

    os.makedirs(args.out, exist_ok=True)
    webp_path = os.path.join(args.out, f"{args.name}.webp")
    atlas.save(webp_path, "WEBP", quality=92, method=6)
    size = os.path.getsize(webp_path)
    if size > MAX_ATLAS_BYTES:
        atlas.save(webp_path, "WEBP", quality=80, method=6)
        size = os.path.getsize(webp_path)
        if size > MAX_ATLAS_BYTES:
            print(f"[pack] FAIL: atlas {size} bytes exceeds 1.5MB even at q80", file=sys.stderr)
            sys.exit(1)

    meta = {
        "name": args.name,
        "fps": args.fps,
        "frameSize": args.frame,
        "frames": frames_meta,
        "anchor": [0.5, 1.0],  # normalized bottom-center = feet line of union bbox
        "anchorPx": [tw // 2, th],
        "trim": {"x": x0, "y": y0, "w": tw, "h": th},  # union bbox inside the raw frame
        "atlas": {"w": atlas_w, "h": atlas_h, "bytes": size},
        "source": os.path.abspath(args.strip),
    }
    json_path = os.path.join(args.out, f"{args.name}.json")
    with open(json_path, "w") as fh:
        json.dump(meta, fh, indent=2)

    # contact sheet: trimmed frames on a dark brand surface with a feet line
    gap = 8
    bg = (11, 22, 34, 255)  # --surface-900
    line = (252, 18, 67, 160)  # --apn-primary feet marker
    cw = sum(t.width for t in trimmed) + gap * (len(trimmed) + 1)
    ch = th + gap * 2
    sheet = Image.new("RGBA", (cw, ch), bg)
    x = gap
    for t in trimmed:
        sheet.paste(t, (x, gap), t)
        for px in range(x, x + t.width):  # feet anchor line
            sheet.putpixel((px, gap + th - 1), line)
        x += t.width + gap
    os.makedirs(os.path.dirname(args.contact), exist_ok=True)
    sheet.save(args.contact)

    print(f"[pack] OK {args.name}: {args.frames}f union=({x0},{y0},{tw}x{th}) "
          f"atlas={atlas_w}x{atlas_h} {size / 1024:.0f}KB -> {webp_path}")


if __name__ == "__main__":
    main()
