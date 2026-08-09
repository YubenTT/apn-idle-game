"""Pack the APN Hero V2 pose sheet into the runtime sprite atlas.

The gpt_image_2 sheet arrives with a SOLID light-gray background (no alpha),
so each cell is background-keyed first: border-connected flood fill in color
distance space (protects interior near-gray details like visor glints), with a
soft alpha ramp on the edge band for anti-aliased silhouettes.

Pipeline: slice 3x3 -> key bg -> alpha-trim -> normalize with ONE shared scale
(tallest pose = 512px, crouched poses stay proportionally shorter) -> per-frame
pivot (x = original cell centre, y = feet) -> shelf-pack -> write:

  assets/mascot/v2/host.webp        runtime atlas (alpha, q90)
  assets/mascot/v2/host.json        { frames: { name: { rect, pivot } }, meta }
  assets/mascot/v2/master/<pose>.png  per-pose keyed masters
  refs/gen/hero-atlas-v1.png        review copy (dark-bg contact strip)
"""
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

SHEET = Path("refs/gen/hero-sheet-v1.png")
OUT_DIR = Path("assets/mascot/v2")
MASTER_DIR = OUT_DIR / "master"
REVIEW = Path("refs/gen/hero-atlas-v1.png")
OUT_DIR.mkdir(parents=True, exist_ok=True)
MASTER_DIR.mkdir(parents=True, exist_ok=True)

POSES = [
    "idle", "run-a", "run-b",
    "attack", "charge", "recoil",
    "level", "defeat", "walk",
]

# multi-source: main 3x3 pose sheet + dedicated 2x2 run-cycle sheet.
# The 4-phase cycle (contact/recoil/contact/push-off) replaced the jerky
# 2-frame run-a/run-b flipbook — user feedback: 2 hard-cut frames looked cheap.
SOURCES = [
    {"sheet": "refs/gen/hero-sheet-v1.png", "cols": 3, "rows": 3, "poses": POSES},
    {"sheet": "refs/gen/run-cycle-v1.png", "cols": 2, "rows": 2,
     "poses": ["run-1", "run-2", "run-3", "run-4"]},
]

TARGET_H = 512          # tallest pose maps to this; render scales 512 -> 130px
PAD = 4                 # atlas gutter
SHELF_W = 1200          # shelf pack row width
KEY_LO, KEY_HI = 26.0, 60.0  # color-distance band: <LO bg, >HI fg, ramp between


def key_background(cell: Image.Image) -> Image.Image:
    """Return RGBA copy with the border-connected near-gray bg keyed out."""
    arr = np.asarray(cell.convert("RGBA")).astype(np.float32)
    h, w = arr.shape[:2]
    rgb = arr[..., :3]
    border = np.concatenate([
        rgb[0, :], rgb[-1, :], rgb[:, 0], rgb[:, -1],
    ])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=-1))
    candidate = dist < KEY_HI  # possible bg

    # border-connected component of `candidate` (iterative dilation, no scipy)
    connected = np.zeros((h, w), dtype=bool)
    connected[0, :] = candidate[0, :]
    connected[-1, :] = candidate[-1, :]
    connected[:, 0] = candidate[:, 0]
    connected[:, -1] = candidate[:, -1]
    while True:
        grown = connected.copy()
        grown[1:, :] |= connected[:-1, :]
        grown[:-1, :] |= connected[1:, :]
        grown[:, 1:] |= connected[:, :-1]
        grown[:, :-1] |= connected[:, 1:]
        grown &= candidate
        if (grown == connected).all():
            break
        connected = grown

    # alpha: 0 inside connected bg, ramp on the edge band, 1 elsewhere
    alpha = np.clip((dist - KEY_LO) / (KEY_HI - KEY_LO), 0, 1)
    alpha = np.where(connected & (dist < KEY_LO), 0.0, alpha)
    alpha = np.where(connected, np.minimum(alpha, np.clip((dist - KEY_LO) / (KEY_HI - KEY_LO), 0, 1)), alpha)
    out = arr.copy()
    out[..., 3] = alpha * 255
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def largest_component(keyed: Image.Image) -> Image.Image:
    """Hard-cut faint keying residue, keep ONLY the largest alpha blob.

    The generated sheet carries a subtle bg texture: the soft alpha ramp leaves
    faint residue across whole cells (breaks trimming) and neighbour characters
    can bleed across grid lines. The hero is always one connected silhouette —
    keep that component, drop everything else.
    """
    arr = np.asarray(keyed).astype(np.float32)
    a = arr[..., 3] / 255.0
    a[a < 0.45] = 0.0
    remaining = a > 0.5
    best = np.zeros_like(remaining)
    while remaining.any():
        ys, xs = np.nonzero(remaining)
        comp = np.zeros_like(remaining)
        comp[ys[0], xs[0]] = True
        while True:
            grown = comp.copy()
            grown[1:, :] |= comp[:-1, :]
            grown[:-1, :] |= comp[1:, :]
            grown[:, 1:] |= comp[:, :-1]
            grown[:, :-1] |= comp[:, 1:]
            grown &= remaining
            if (grown == comp).all():
                break
            comp = grown
        if comp.sum() > best.sum():
            best = comp
        remaining &= ~comp
    out = arr.copy()
    out[..., 3] = a * best * 255
    return Image.fromarray(out.astype(np.uint8), "RGBA")


# 1) slice + key + largest-component + measure (all source sheets)
cells = []
for src in SOURCES:
    simg = Image.open(src["sheet"]).convert("RGBA")
    sw, sh = simg.size
    cw, ch = sw // src["cols"], sh // src["rows"]
    for i, name in enumerate(src["poses"]):
        col, row = i % src["cols"], i // src["cols"]
        cell = simg.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
        keyed = largest_component(key_background(cell))
        arr = np.asarray(keyed).astype(np.float32)
        alpha = arr[..., 3]
        mask = keyed.getchannel("A").point(lambda a: 255 if a > 10 else 0)
        bbox = mask.getbbox()
        if not bbox:
            raise SystemExit(f"empty cell for {name} in {src['sheet']}")
        # head pivot: alpha centroid of the top 32% band (the huge canon head).
        # Verified in refs/gen/cycle-test-*.png — head-anchoring is the only
        # rule that keeps the 4-phase run cycle glued to its anchor; pelvis
        # sampling lands on different anatomy per pose (bbox height varies).
        bx0, by0, bx1, by1 = bbox
        band = alpha[by0:by0 + max(4, round((by1 - by0) * 0.32)), bx0:bx1]
        xs = np.arange(bx0, bx1, dtype=np.float32)
        weights = band.sum(axis=0)
        head_x = float((xs * weights).sum() / weights.sum()) if weights.sum() > 0 else (bx0 + bx1) / 2
        pivot_x = (head_x - bx0) / (bx1 - bx0)
        cells.append({"name": name, "img": keyed, "bbox": bbox, "pivot_x": pivot_x})

# 2) ONE shared scale from the tallest pose
max_h = max(c["bbox"][3] - c["bbox"][1] for c in cells)
scale = TARGET_H / max_h

frames = []
for c in cells:
    pose = c["img"].crop(c["bbox"])
    w, h = round(pose.width * scale), round(pose.height * scale)
    pose = pose.resize((w, h), Image.LANCZOS)
    pose.save(MASTER_DIR / f"{c['name']}.png")
    frames.append({"name": c["name"], "img": pose, "w": w, "h": h, "pivot_x": c["pivot_x"]})

# 3) shelf pack (tallest first)
frames.sort(key=lambda f: -f["h"])
x = y = PAD
row_h = 0
placed = []
for f in frames:
    if x + f["w"] + PAD > SHELF_W:
        x = PAD
        y += row_h + PAD
        row_h = 0
    placed.append((f, x, y))
    x += f["w"] + PAD
    row_h = max(row_h, f["h"])
atlas_w = max(px + f["w"] for f, px, py in placed) + PAD
atlas_h = max(py + f["h"] for f, px, py in placed) + PAD

atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
out = {"frames": {}, "meta": {
    "designHeight": TARGET_H,
    "pivot": "pelvis-band-x, foot-bottom-y",
    "runCycle": ["run-1", "run-2", "run-3", "run-4"],
    "source": "refs/gen/hero-sheet-v1.png + run-cycle-v1.png (gpt_image_2, canon refs/hero-2d-reference.png)",
}}
for f, px, py in placed:
    atlas.paste(f["img"], (px, py), f["img"])
    out["frames"][f["name"]] = {
        "rect": {"x": px, "y": py, "w": f["w"], "h": f["h"]},
        "pivot": {"x": round(f["pivot_x"], 4), "y": 1},
    }

atlas.save(REVIEW)
atlas.save(OUT_DIR / "host.webp", "WEBP", quality=90, method=6)
(OUT_DIR / "host.json").write_text(json.dumps(out, indent=1))

# 4) dark-bg review contact strip (keyed poses at half scale, source order)
ORDER = [name for src in SOURCES for name in src["poses"]]
strip = Image.new("RGBA", (sum(f["w"] for f, _, _ in placed) // 2 + 40, TARGET_H // 2 + 20), (20, 24, 32, 255))
sx = 8
for f, _, _ in sorted(placed, key=lambda p: ORDER.index(p[0]["name"])):
    half = f["img"].resize((f["w"] // 2, f["h"] // 2), Image.LANCZOS)
    strip.paste(half, (sx, 10 + (TARGET_H // 2 - f["h"] // 2)), half)
    sx += f["w"] // 2 + 4
strip.save(Path("refs/gen/hero-atlas-v1-contact.png"))

print(f"atlas: {atlas_w}x{atlas_h}  frames: {len(placed)}")
for f, px, py in sorted(placed, key=lambda p: p[0]["name"]):
    print(f"  {f['name']}: {f['w']}x{f['h']} @({px},{py}) pivot.x={f['pivot_x']:.2f}")
print("webp:", (OUT_DIR / "host.webp").stat().st_size, "bytes")
print("review:", REVIEW, "+ hero-atlas-v1-contact.png")
