#!/usr/bin/env python3
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

CELL = 128
INK = (7, 17, 29, 255)
BREAK = (255, 18, 67, 255)


def normalize(source: Path, boss: bool = False) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 10 else 0).getbbox()
    if not bbox:
        raise RuntimeError(f"No foreground alpha: {source}")
    image = image.crop(bbox)
    max_width = 120 if boss else 108
    max_height = 120 if boss else 108
    image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return image


def place(cell: Image.Image, sprite: Image.Image, boss: bool = False) -> None:
    alpha = sprite.getchannel("A")
    outline_alpha = alpha.filter(ImageFilter.MaxFilter(7 if boss else 5))
    outline = Image.new("RGBA", sprite.size, INK)
    outline.putalpha(outline_alpha)
    x = (CELL - sprite.width) // 2
    y = 121 - sprite.height
    shadow = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse((max(8, x - 5), 113, min(120, x + sprite.width + 5), 124), fill=(3, 7, 13, 150))
    cell.alpha_composite(shadow)
    cell.alpha_composite(outline, (x, y))
    cell.alpha_composite(sprite, (x, y))


def broken(sprite: Image.Image) -> Image.Image:
    result = sprite.copy()
    draw = ImageDraw.Draw(result)
    w, h = result.size
    points = [
        [(w * .35, h * .12), (w * .48, h * .35), (w * .40, h * .55), (w * .56, h * .74)],
        [(w * .72, h * .22), (w * .58, h * .43), (w * .70, h * .62), (w * .62, h * .88)],
    ]
    for line in points:
        draw.line(line, fill=BREAK, width=max(2, w // 42), joint="curve")
    return result


def main() -> None:
    if len(sys.argv) != 8:
        raise SystemExit("Usage: compose-target-atlas.py <output.png> <target1> ... <target5> <boss>")
    output = Path(sys.argv[1])
    sources = [Path(item) for item in sys.argv[2:]]
    sprites = [normalize(source, index == 5) for index, source in enumerate(sources)]
    atlas = Image.new("RGBA", (CELL * 7, CELL), (0, 0, 0, 0))
    for index, sprite in enumerate(sprites):
        cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        place(cell, sprite, index == 5)
        atlas.alpha_composite(cell, (index * CELL, 0))
    break_cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    place(break_cell, broken(sprites[5]), True)
    atlas.alpha_composite(break_cell, (CELL * 6, 0))
    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output, optimize=True)


if __name__ == "__main__":
    main()
