#!/usr/bin/env python3
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: fallback-segment.py <input> <output.png>")
    image = Image.open(sys.argv[1]).convert("RGBA")
    small = image.copy()
    small.thumbnail((220, 220), Image.Resampling.LANCZOS)
    rgb = np.asarray(small.convert("RGB"), dtype=np.float32)
    h, w, _ = rgb.shape
    border = np.concatenate((rgb[: max(2, h // 18)].reshape(-1, 3), rgb[:, : max(2, w // 18)].reshape(-1, 3), rgb[:, -max(2, w // 18):].reshape(-1, 3)))
    background = np.median(border, axis=0)
    distance = np.linalg.norm(rgb - background, axis=2)
    luma = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    background_luma = float(background @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))
    yy, xx = np.mgrid[0:h, 0:w]
    center = 1.0 - np.clip(((xx - w * .5) / (w * .53)) ** 2 + ((yy - h * .55) / (h * .62)) ** 2, 0, 1)
    raw = np.maximum((distance - 18) / 42, (luma - background_luma - 10) / 48)
    alpha = np.clip(raw, 0, 1) * np.clip(center * 2.2, 0, 1)
    alpha[yy > h * .96] = 0
    mask = Image.fromarray(np.uint8(alpha * 255), "L").filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2.0))
    mask = mask.resize(image.size, Image.Resampling.LANCZOS)
    image.putalpha(mask)
    image.save(Path(sys.argv[2]), optimize=True)


if __name__ == "__main__":
    main()
