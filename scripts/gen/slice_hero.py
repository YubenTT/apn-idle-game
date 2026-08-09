"""Slice the APN Hero 3x3 pose sheet into normalized per-pose PNGs.

Grid-slices the sheet, alpha-trims each cell, normalizes pose height to a
shared target while preserving aspect, and writes refs/gen/hero-poses/<pose>.png
"""
from pathlib import Path
from PIL import Image

SHEET = Path("refs/gen/hero-sheet-v1.png")
OUT = Path("refs/gen/hero-poses")
OUT.mkdir(parents=True, exist_ok=True)

POSES = [
    "idle", "run-a", "run-b",
    "attack", "charge", "recoil",
    "level", "defeat", "walk",
]

img = Image.open(SHEET).convert("RGBA")
W, H = img.size
cw, ch = W // 3, H // 3
TARGET_H = 512  # normalize pose height; render scales to 130px at runtime

meta = []
for i, name in enumerate(POSES):
    col, row = i % 3, i // 3
    cell = img.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
    bbox = cell.getchannel("A").getbbox()
    if not bbox:
        raise SystemExit(f"empty cell for {name}")
    pose = cell.crop(bbox)
    scale = TARGET_H / pose.height
    pose = pose.resize((round(pose.width * scale), TARGET_H), Image.LANCZOS)
    pose.save(OUT / f"{name}.png")
    meta.append((name, pose.width, pose.height))
    print(f"{name}: {pose.width}x{pose.height}")

# contact sheet for review
sheet = Image.new("RGBA", (TARGET_H * 9 // 2, TARGET_H // 2 * 2 + 40), (20, 24, 32, 255))
x = y = 0
th = TARGET_H // 2
for name, w, h in meta:
    p = Image.open(OUT / f"{name}.png").resize((w // 2, th), Image.LANCZOS)
    sheet.paste(p, (x, y), p)
    x += TARGET_H // 2
    if x >= sheet.width:
        x = 0
        y += th + 40
sheet.save(OUT / "_contact.png")
print("contact:", OUT / "_contact.png")
