"""Shared generated-sheet processing for APN asset pipelines.

The gpt_image_2 sheets arrive with a SOLID light-gray background (no alpha),
so each cell is background-keyed: border-connected flood fill in color
distance space (protects interior near-gray details like eye glints), soft
alpha ramp on the edge band, then largest-connected-component extraction to
drop faint keying residue and neighbour bleed.
"""
from collections import deque  # noqa: F401  (kept for external users)

import numpy as np
from PIL import Image

KEY_LO, KEY_HI = 26.0, 60.0  # color-distance band: <LO bg, >HI fg, ramp between


def key_background(cell: Image.Image) -> Image.Image:
    """Return RGBA copy with the border-connected near-gray bg keyed out."""
    arr = np.asarray(cell.convert("RGBA")).astype(np.float32)
    h, w = arr.shape[:2]
    rgb = arr[..., :3]
    border = np.concatenate([rgb[0, :], rgb[-1, :], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=-1))
    candidate = dist < KEY_HI

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

    alpha = np.clip((dist - KEY_LO) / (KEY_HI - KEY_LO), 0, 1)
    alpha = np.where(connected & (dist < KEY_LO), 0.0, alpha)
    alpha = np.where(connected, np.minimum(alpha, np.clip((dist - KEY_LO) / (KEY_HI - KEY_LO), 0, 1)), alpha)
    out = arr.copy()
    out[..., 3] = alpha * 255
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def largest_component(keyed: Image.Image) -> Image.Image:
    """Hard-cut faint residue; keep ONLY the largest alpha blob (the creature)."""
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


def alpha_bbox(img: Image.Image, threshold: int = 10):
    mask = img.getchannel("A").point(lambda a: 255 if a > threshold else 0)
    return mask.getbbox()


def slice_grid(sheet_path, cols, rows, names):
    """Slice a grid sheet -> [{name, img(keyed, trimmed), bbox}]."""
    simg = Image.open(sheet_path).convert("RGBA")
    sw, sh = simg.size
    cw, ch = sw // cols, sh // rows
    cells = []
    for i, name in enumerate(names):
        col, row = i % cols, i // cols
        cell = simg.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
        keyed = largest_component(key_background(cell))
        bbox = alpha_bbox(keyed)
        if not bbox:
            raise SystemExit(f"empty cell for {name} in {sheet_path}")
        cells.append({"name": name, "img": keyed.crop(bbox), "bbox": bbox})
    return cells


def fit_square(img: Image.Image, size: int, max_h: int, max_w: int, bottom: int | None = None) -> Image.Image:
    """Fit a trimmed creature into a square RGBA cell, feet on the bottom
    edge, horizontally centred. Returns a new size x size image."""
    bottom = size - 1 if bottom is None else bottom
    scale = min(max_h / img.height, max_w / img.width)
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    resized = img.resize((w, h), Image.LANCZOS)
    cell = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cell.paste(resized, ((size - w) // 2, bottom + 1 - h), resized)
    return cell
