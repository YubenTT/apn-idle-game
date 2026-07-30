"""Build the APN Hero skeletal rig from the generated A-pose source.

Why a rig, not flipbook frames: user review — the procedural Host animated
beautifully (60fps interpolated math) while AI flipbook frames strobed and
drifted. So the AI does what it's great at (ONE clean model sheet) and the
engine does the animating (skeletal parts driven by the proven gait math).

Cuts the A-pose into parts (head / torso / arm / leg), derives pivots and a
skeleton in design space (512 = full height, y measured up from the ground),
emits far-side darkened variants, and packs everything into:

  assets/mascot/v2/rig.webp   parts atlas (alpha, q90)
  assets/mascot/v2/rig.json   parts + pivots + skeleton + visor rect
  assets/mascot/v2/master/rig-<part>.png  editable masters
  refs/gen/rig-review.png     annotated cut review
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
from gen_lib import key_background, largest_component, alpha_bbox

SRC = Path("refs/gen/rig-source-v1.png")
OUT_DIR = Path("assets/mascot/v2")
MASTER_DIR = OUT_DIR / "master"
REVIEW = Path("refs/gen/rig-review.png")
TARGET_H = 512
PAD = 4

img = largest_component(key_background(Image.open(SRC).convert("RGBA")))
bbox = alpha_bbox(img)
img = img.crop(bbox)
arr = np.asarray(img).astype(np.float32)
alpha = arr[..., 3]
H, W = alpha.shape
rows = (alpha > 10).sum(axis=1)  # row width profile

# —— landmark rows ————————————————————————————————————————
head_max_row = int(np.argmax(rows[: int(H * 0.45)]))
neck_search = rows[head_max_row: int(H * 0.55)]
neck_row = head_max_row + int(np.argmin(neck_search)) + 2

# crotch: scanning up from the feet, first row where the inter-leg gap closes
def col_gap(y):
    occ = alpha[y] > 10
    if not occ.any():
        return None
    xs = np.nonzero(occ)[0]
    gaps = np.where(np.diff(xs) > 6)[0]
    return (xs[gaps[0]], xs[gaps[0] + 1]) if len(gaps) else None

crotch_row = int(H * 0.62)
for y in range(int(H * 0.94), int(H * 0.45), -1):
    if col_gap(y) is None:
        crotch_row = y
        break
# leg split column = middle of the gap just below the crotch
gap = col_gap(crotch_row + max(6, int(H * 0.02))) or col_gap(crotch_row + max(6, int(H * 0.05)))
gap_col = (gap[0] + gap[1]) // 2 if gap else W // 2

shoulder_row = neck_row + int((crotch_row - neck_row) * 0.12)
# torso columns measured at MID-TORSO (arms fully separated there); measuring
# near the shoulder catches the arm roots and overshoots the torso edge.
measure_row = neck_row + int((crotch_row - neck_row) * 0.6)
occ = alpha[measure_row] > 10
xs = np.nonzero(occ)[0]
runs = np.split(xs, np.where(np.diff(xs) > 6)[0] + 1)
runs = [r for r in runs if len(r) > 4]
torso_run = max(runs, key=len)  # widest central run = torso
torso_l, torso_r = int(torso_run[0]), int(torso_run[-1])
root_x = (torso_l + torso_r) // 2

M = 5  # overlap margin — parts share a few px so joints never gap

# —— part masks ———————————————————————————————————————————
Y, X = np.mgrid[0:H, 0:W]
solid = alpha > 10
masks = {
    "head": solid & (Y <= neck_row + M),
    "torso": solid & (Y > neck_row) & (Y < crotch_row + M) & (X >= torso_l - M) & (X <= torso_r + M),
    "arm": solid & (Y > neck_row) & (Y < crotch_row) & (X > torso_r + M),
    "leg": solid & (Y >= crotch_row + M) & (X >= gap_col),
}
# leg fallback: if the right side below crotch is empty (legs crossed), take left
if masks["leg"].sum() < 100:
    masks["leg"] = solid & (Y >= crotch_row + M) & (X < gap_col)

parts = {}
for name, mask in masks.items():
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    sub = arr[y0:y1, x0:x1].copy()
    sub[..., 3] = np.where(mask[y0:y1, x0:x1], sub[..., 3], 0)
    parts[name] = {"img": Image.fromarray(sub.astype(np.uint8), "RGBA"), "box": (x0, y0, x1, y1)}

# —— pivots (part-local 0..1) —————————————————————————————
hx0, hy0, hx1, hy1 = parts["head"]["box"]
neck_band = masks["head"] & (Y > neck_row - int(H * 0.02))
nxs = np.nonzero(neck_band)[1]
neck_cx = float(nxs.mean()) if len(nxs) else (hx0 + hx1) / 2

ax0, ay0, ax1, ay1 = parts["arm"]["box"]
ays, axs = np.nonzero(masks["arm"])
shoulder_pt = (axs[0], ays[0])  # topmost arm pixel ≈ shoulder root
d2 = (axs - torso_r) ** 2 + (ays - shoulder_row) ** 2
i = int(np.argmin(d2))
shoulder_pt = (int(axs[i]), int(ays[i]))

lx0, ly0, lx1, ly1 = parts["leg"]["box"]
lys, lxs = np.nonzero(masks["leg"])
top = np.nonzero(masks["leg"])[0].min()
hip_xs = np.nonzero(masks["leg"][top: top + int(H * 0.01)])[1]
hip_cx = float(hip_xs.mean()) if len(hip_xs) else (lx0 + lx1) / 2

# visor: dark AND low-saturation pixels inside the head (the crimson
# cel-shade is dark but saturated — only the visor is neutral charcoal)
head_rgb = arr[hy0:hy1, hx0:hx1, :3]
head_a = alpha[hy0:hy1, hx0:hx1]
lum = head_rgb.mean(axis=-1)
spread = head_rgb.max(axis=-1) - head_rgb.min(axis=-1)
solid_h = head_a > 128
visor_mask = solid_h & (lum < 100) & (spread < 30)
# erode the head silhouette first: the outline ring and the visor's edge
# contact strip are thin; the visor core (fat blob) survives ~8 erosions
eroded = solid_h.copy()
for _ in range(8):
    shrunk = eroded.copy()
    shrunk[1:, :] &= eroded[:-1, :]
    shrunk[:-1, :] &= eroded[1:, :]
    shrunk[:, 1:] &= eroded[:, :-1]
    shrunk[:, :-1] &= eroded[:, 1:]
    eroded = shrunk
remaining = visor_mask & eroded
best = np.zeros_like(visor_mask)
while remaining.any():
    ys0, xs0 = np.nonzero(remaining)
    comp = np.zeros_like(visor_mask)
    comp[ys0[0], xs0[0]] = True
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
# grow the core back once to re-approach the true visor extent
for _ in range(4):
    grown = best.copy()
    grown[1:, :] |= best[:-1, :]
    grown[:-1, :] |= best[1:, :]
    grown[:, 1:] |= best[:, :-1]
    grown[:, :-1] |= best[:, 1:]
    best = grown & visor_mask
visor_mask = best
vys, vxs = np.nonzero(visor_mask)
visor = None
if len(vxs) > 40:
    visor = {
        "x": round(float(vxs.min()) / (hx1 - hx0), 4),
        "y": round(float(vys.min()) / (hy1 - hy0), 4),
        "w": round(float(vxs.max() + 1 - vxs.min()) / (hx1 - hx0), 4),
        "h": round(float(vys.max() + 1 - vys.min()) / (hy1 - hy0), 4),
    }

# —— normalize to TARGET_H and pack atlas —————————————————————
scale = TARGET_H / H
far_tint = np.array([0.5, 0.4, 0.44])  # darker, cooler — depth cue for far limbs

def prep(name, pim, pivot, tint=None):
    w, h = round(pim.width * scale), round(pim.height * scale)
    p = pim.resize((w, h), Image.LANCZOS)
    if tint is not None:
        a = np.asarray(p).astype(np.float32)
        a[..., :3] *= tint
        p = Image.fromarray(a.astype(np.uint8), "RGBA")
    p.save(MASTER_DIR / f"rig-{name}.png")
    return {"name": name, "img": p, "w": w, "h": h, "pivot": pivot}

head_pivot = (round((neck_cx - hx0) / (hx1 - hx0), 4), round(min(1.0, (neck_row + M - hy0) / (hy1 - hy0)), 4))
arm_pivot = (round((shoulder_pt[0] - ax0) / (ax1 - ax0), 4), round((shoulder_pt[1] - ay0) / (ay1 - ay0), 4))
leg_pivot = (round((hip_cx - lx0) / (lx1 - lx0), 4), 0.0)

frames = [
    prep("head", parts["head"]["img"], head_pivot),
    prep("torso", parts["torso"]["img"], {"x": 0.5, "y": 1}),
    prep("arm", parts["arm"]["img"], arm_pivot),
    prep("arm-far", parts["arm"]["img"], arm_pivot, tint=far_tint),
    prep("leg", parts["leg"]["img"], leg_pivot),
    prep("leg-far", parts["leg"]["img"], leg_pivot, tint=far_tint),
]

frames.sort(key=lambda f: -f["h"])
x = y = PAD
row_h = 0
placed = []
SHELF_W = 900
for f in frames:
    if x + f["w"] + PAD > SHELF_W:
        x = PAD
        y += row_h + PAD
        row_h = 0
    placed.append((f, x, y))
    x += f["w"] + PAD
    row_h = max(row_h, f["h"])
aw = max(px + f["w"] for f, px, py in placed) + PAD
ah = max(py + f["h"] for f, px, py in placed) + PAD
atlas = Image.new("RGBA", (aw, ah), (0, 0, 0, 0))
out_parts = {}
for f, px, py in placed:
    atlas.paste(f["img"], (px, py), f["img"])
    out_parts[f["name"]] = {
        "rect": {"x": px, "y": py, "w": f["w"], "h": f["h"]},
        "pivot": f["pivot"] if isinstance(f["pivot"], dict) else {"x": f["pivot"][0], "y": f["pivot"][1]},
    }

skeleton = {
    "designHeight": TARGET_H,
    "rootX": round((root_x) * scale, 1),
    "hipY": round((H - crotch_row) * scale, 1),
    "shoulderY": round((H - shoulder_row) * scale, 1),
    "neckY": round((H - neck_row) * scale, 1),
    "neckCX": round((neck_cx - root_x) * scale, 1),
    "shoulderX": round((torso_r - root_x) * scale, 1),
    "legHipX": round((hip_cx - root_x) * scale, 1),
    "headR": round((hx1 - hx0) * scale * 0.5, 1),
}
rig = {
    "parts": out_parts,
    "skeleton": skeleton,
    "visor": visor,
    "meta": {"source": "refs/gen/rig-source-v1.png (gpt_image_2 A-pose, canon masters as refs)"},
}
atlas.save(OUT_DIR / "rig.webp", "WEBP", quality=90, method=6)
(OUT_DIR / "rig.json").write_text(json.dumps(rig, indent=1))

# —— annotated review ————————————————————————————————————
review = img.resize((round(W * scale), TARGET_H), Image.LANCZOS).convert("RGBA")
canvas = Image.new("RGBA", (review.width + 40, TARGET_H + 40), (20, 24, 32, 255))
canvas.paste(review, (20, 20), review)
d = ImageDraw.Draw(canvas)
for yy, c, label in [(neck_row, "#3ecf8e", "neck"), (shoulder_row, "#e6b84d", "shoulder"), (crotch_row, "#fc1243", "crotch")]:
    ys = round(yy * scale) + 20
    d.line([(4, ys), (canvas.width - 4, ys)], fill=c, width=2)
    d.text((6, ys - 12), label, fill=c)
d.line([(round(gap_col * scale) + 20, 20), (round(gap_col * scale) + 20, TARGET_H + 20)], fill="#79e6f2", width=2)
d.text((round(gap_col * scale) + 26, 24), "leg split", fill="#79e6f2")
canvas.save(REVIEW)

print(f"landmarks: neck={neck_row} shoulder={shoulder_row} crotch={crotch_row} gap_col={gap_col} torso=[{torso_l},{torso_r}]")
print(f"pivots: head={head_pivot} arm={arm_pivot} leg={leg_pivot}")
print("visor:", visor)
print("skeleton:", skeleton)
print("rig.webp:", (OUT_DIR / 'rig.webp').stat().st_size, "bytes", f"atlas {aw}x{ah}")
