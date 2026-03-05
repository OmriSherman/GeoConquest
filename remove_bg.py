#!/usr/bin/env python3
"""Split a multi-avatar PNG into individual low-res PNGs."""

from pathlib import Path
from PIL import Image
import numpy as np

AVATARS_DIR = Path(__file__).parent / "assets" / "avatars"

# Pixels with all RGB channels <= this are treated as black background
BG_THRESHOLD = 15

# Minimum gap (px) between avatars
MIN_GAP = 5

# Padding (px) around each crop
PADDING = 10

# Max size (px) of the longest side for output
MAX_SIZE = 200


def find_column_ranges(col_active: np.ndarray, min_gap: int = MIN_GAP) -> list[tuple[int, int]]:
    ranges = []
    in_region = False
    start = 0
    gap_start = None

    for x, active in enumerate(col_active):
        if active:
            if not in_region:
                in_region = True
                start = x
            gap_start = None
        else:
            if in_region and gap_start is None:
                gap_start = x
            if in_region and gap_start is not None and (x - gap_start) >= min_gap:
                ranges.append((start, gap_start))
                in_region = False
                gap_start = None

    if in_region:
        end = gap_start if gap_start is not None else len(col_active)
        ranges.append((start, end))

    return ranges


def split_avatars(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    data = np.array(img, dtype=np.uint8)

    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    is_content = (a > 0) & ~((r <= BG_THRESHOLD) & (g <= BG_THRESHOLD) & (b <= BG_THRESHOLD))

    col_active = is_content.any(axis=0)
    ranges = find_column_ranges(col_active)

    print(f"Found {len(ranges)} avatar(s) in {path.name}")

    h, w = data.shape[:2]

    for i, (x0, x1) in enumerate(ranges):
        x0p = max(0, x0 - PADDING)
        x1p = min(w, x1 + PADDING)

        col_slice = is_content[:, x0:x1]
        rows = np.where(col_slice.any(axis=1))[0]
        y0p = max(0, int(rows[0]) - PADDING)
        y1p = min(h, int(rows[-1]) + 1 + PADDING)

        cropped = img.crop((x0p, y0p, x1p, y1p))

        # Resize to low-res, preserving aspect ratio
        cropped.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)

        out_path = path.parent / f"avatar_{i + 1}.png"
        cropped.save(out_path)
        print(f"  Saved: {out_path.name}  ({cropped.width}x{cropped.height})")


if __name__ == "__main__":
    png_files = list(AVATARS_DIR.glob("*.png"))
    if not png_files:
        print("No PNG files found.")
    for path in png_files:
        split_avatars(path)
