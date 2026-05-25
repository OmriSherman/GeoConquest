#!/usr/bin/env python3
"""
Two-step sprite sheet processor:
  Step 1 - preview: remove magenta chroma key and save a _nobg.png for inspection
  Step 2 - split:   load the verified _nobg.png, slice by grid, save to assets/avatars/

Usage:
  python remove_bg.py preview <sheet.png>
  python remove_bg.py split   <sheet.png> <cols> <rows> [name1] [name2] ...
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np

AVATARS_DIR = Path(__file__).parent / "assets" / "avatars"
MAX_SIZE = 200

def remove_magenta(img: Image.Image) -> Image.Image:
    data = np.array(img.convert("RGBA"), dtype=np.uint8)
    r = data[:, :, 0].astype(np.int16)
    g = data[:, :, 1].astype(np.int16)
    b = data[:, :, 2].astype(np.int16)

    # Pure magenta match with generous tolerance
    direct = (r >= 180) & (g <= 80) & (b >= 180)

    # Blended/anti-aliased edge pixels: both R and B dominate G by a large margin
    # Safe for red/orange sprite content because those have low B (B-G won't be large)
    blended = (r - g > 90) & (b - g > 90) & (r > 120) & (b > 120)

    mask = direct | blended
    data[mask, 3] = 0
    total = mask.size
    print(f"  Magenta pixels removed: {int(mask.sum()):,} / {total:,}  ({mask.sum()*100/total:.1f}%)")
    print(f"  Non-magenta pixels kept: {int((~mask).sum()):,}")
    return Image.fromarray(data, "RGBA")


def nobg_path(sheet: Path) -> Path:
    return sheet.parent / (sheet.stem + "_nobg.png")


def cmd_preview(sheet: Path) -> None:
    print(f"[preview] {sheet.name}  ({sheet.stat().st_size // 1024} KB)")
    img = Image.open(sheet).convert("RGBA")
    w, h = img.size
    print(f"  Dimensions: {w}x{h}")
    cleaned = remove_magenta(img)
    out = nobg_path(sheet)
    cleaned.save(out)
    print(f"  Saved: {out.name}")
    print("  Open that file and confirm the background is fully transparent, then run split.")


def cmd_split(sheet: Path, cols: int, rows: int, names: list[str]) -> None:
    src = nobg_path(sheet)
    if not src.exists():
        print(f"[split] _nobg.png not found — run 'preview' first: {src.name}")
        sys.exit(1)

    img = Image.open(src).convert("RGBA")
    w, h = img.size
    print(f"[split] {src.name}  {w}x{h}  grid {cols}x{rows}")

    name_idx = 0
    for row in range(rows):
        y0 = round(row * h / rows)
        y1 = round((row + 1) * h / rows)
        for col in range(cols):
            x0 = round(col * w / cols)
            x1 = round((col + 1) * w / cols)

            cell = img.crop((x0, y0, x1, y1))
            alpha = np.array(cell)[:, :, 3]

            if alpha.sum() == 0:
                print(f"  [{row},{col}] empty - skipped")
                continue

            # Trim transparent edges
            rows_hit = np.where(alpha.any(axis=1))[0]
            cols_hit = np.where(alpha.any(axis=0))[0]
            trimmed = cell.crop((
                int(cols_hit[0]), int(rows_hit[0]),
                int(cols_hit[-1]) + 1, int(rows_hit[-1]) + 1
            ))
            trimmed.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)

            name = names[name_idx] if name_idx < len(names) else f"sprite_{name_idx + 1}"
            out = AVATARS_DIR / f"{name}.png"
            trimmed.save(out)
            print(f"  [{row},{col}] -> {out.name}  ({trimmed.width}x{trimmed.height})")
            name_idx += 1

    print(f"Done. {name_idx} avatar(s) saved to assets/avatars/")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    sheet = Path(sys.argv[2])

    if cmd == "preview":
        cmd_preview(sheet)
    elif cmd == "split":
        if len(sys.argv) < 5:
            print("split requires: <sheet.png> <cols> <rows> [names...]")
            sys.exit(1)
        cmd_split(sheet, int(sys.argv[3]), int(sys.argv[4]), sys.argv[5:])
    else:
        print(f"Unknown command: {cmd}  (use 'preview' or 'split')")
        sys.exit(1)
