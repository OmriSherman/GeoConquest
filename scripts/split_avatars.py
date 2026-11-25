#!/usr/bin/env python3
"""
split_avatars.py — Crop a GeoQuest sprite sheet into individual avatar PNGs
                   and remove the background.

Drop your Gemini-generated image into assets/avatars/pre-process/, then run:

  python3 scripts/split_avatars.py <name1> <name2> <name3> [options]

The script auto-detects the image in pre-process/, splits it, saves the
results to assets/avatars/, and deletes the source file when done.

You can also pass an explicit image path as the first positional argument
if it doesn't look like a name (contains '/' or ends in .png/.jpg).

Options:
  --cols N          Number of columns (default: auto from name count)
  --rows N          Number of rows (default: 1). Use with --cols for grid sheets.
  --output DIR      Output directory (default: assets/avatars/)
  --bg COLOR        Background color to remove: green (default), white, or hex #RRGGBB
  --threshold N     Removal tolerance 0-255 (default: 30)
  --no-rembg        Skip background removal entirely
  --no-delete       Keep the source image in pre-process/ after splitting
  --snippet         Print the customAvatars.tsx code snippet after saving

Examples:
  python3 scripts/split_avatars.py microwave couch conqueror --snippet
  python3 scripts/split_avatars.py microwave couch conqueror --bg white --snippet
  python3 scripts/split_avatars.py "path/to/sheet.png" microwave couch conqueror --snippet
  python3 scripts/split_avatars.py a b c d e f --cols 3 --rows 2 --snippet
"""

from __future__ import annotations
import argparse
import colorsys
import sys
from pathlib import Path
from PIL import Image


# ── Background removal ────────────────────────────────────────────────────────

def parse_bg_color(bg: str) -> tuple[int, int, int]:
    """Parse background color string to (R, G, B)."""
    if bg == "green":
        return (0, 255, 0)
    if bg == "white":
        return (255, 255, 255)
    if bg.startswith("#") and len(bg) == 7:
        return (int(bg[1:3], 16), int(bg[3:5], 16), int(bg[5:7], 16))
    raise ValueError(f"Unknown background color: {bg}. Use 'green', 'white', or '#RRGGBB'.")


def sample_bg_color(img: Image.Image, sample_radius: int = 5) -> tuple[int, int, int]:
    """
    Auto-detect background color by sampling the four corners of the image.
    Returns the average (R, G, B) of sampled corner pixels.
    """
    rgba = img.convert("RGBA")
    w, h = rgba.size
    samples = []
    for cx, cy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        for dy in range(sample_radius):
            for dx in range(sample_radius):
                x = min(cx + dx if cx == 0 else cx - dx, w - 1)
                y = min(cy + dy if cy == 0 else cy - dy, h - 1)
                r, g, b, a = rgba.getpixel((x, y))
                samples.append((r, g, b))
    avg = tuple(round(sum(c[i] for c in samples) / len(samples)) for i in range(3))
    return avg


def _is_green_hue(r: int, g: int, b: int, hue_lo: float = 0.22, hue_hi: float = 0.47,
                   min_sat: float = 0.30, min_val: float = 0.20) -> bool:
    """Return True if the pixel's hue falls in the green range with enough saturation."""
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return hue_lo <= h <= hue_hi and s >= min_sat and v >= min_val


def _is_magenta_spectrum(r: int, g: int, b: int, spread: int = 50) -> bool:
    """Return True if the pixel falls in the magenta spectrum (high R+B, low G)."""
    return (r - g) > spread and (b - g) > spread and r > 120 and b > 120


def remove_background(img: Image.Image, bg_color: tuple[int, int, int], threshold: int = 30) -> Image.Image:
    """
    Three-pass background removal applied to the full image before splitting:

    Pass 1 — Hue/spectrum sweep:
      Green backgrounds: HSV green-hue sweep.
      Magenta backgrounds: magenta spectrum sweep (high R+B, low G).
      Covers all chroma-key variants and compression artifacts.

    Pass 2 — Euclidean distance from the sampled corner colour:
      Catches remaining background tones not caught by Pass 1.

    Pass 3 — Edge expansion (multiple iterations):
      Walks outward from already-transparent pixels and removes any
      remaining fringe pixels that match the background spectrum.
      Eliminates the thin outline that distance-only removal leaves behind.
    """
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    tr, tg, tb = bg_color

    is_magenta_bg = _is_magenta_spectrum(tr, tg, tb, spread=30)
    is_green_bg   = _is_green_hue(tr, tg, tb)

    # ── Pass 1 + 2: full-image sweep ─────────────────────────────────────────
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]

            if is_green_bg and _is_green_hue(r, g, b):
                pixels[x, y] = (r, g, b, 0)
                continue

            if is_magenta_bg and _is_magenta_spectrum(r, g, b):
                pixels[x, y] = (r, g, b, 0)
                continue

            dist = ((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2) ** 0.5
            if dist <= threshold:
                pixels[x, y] = (r, g, b, 0)
            elif dist <= threshold * 2:
                alpha = int(255 * (dist - threshold) / threshold)
                pixels[x, y] = (r, g, b, alpha)

    # ── Pass 3: edge expansion — removes fringe pixels adjacent to transparent ─
    neighbors = [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)]
    for _ in range(6):
        to_clear = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                spectrum_hit = (
                    (is_magenta_bg and _is_magenta_spectrum(r, g, b, spread=30)) or
                    (is_green_bg   and _is_green_hue(r, g, b))
                )
                dist = ((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2) ** 0.5
                if spectrum_hit or dist <= threshold * 3:
                    for dx, dy in neighbors:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and pixels[nx, ny][3] < 128:
                            to_clear.append((x, y))
                            break
        if not to_clear:
            break
        for x, y in to_clear:
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)

    return img


# ── Aspect ratio helpers ──────────────────────────────────────────────────────

def format_ratio(w: int, h: int) -> str:
    from math import gcd
    g = gcd(w, h)
    return f"{w // g} / {h // g}"


# ── Snippet generation ────────────────────────────────────────────────────────

def print_snippet(names: list[str]):
    print("\n-- customAvatars.tsx snippet ---------------------------------------------\n")
    print("  // Add to CUSTOM_AVATAR_COMPONENTS in app/lib/customAvatars.tsx:")
    print()
    for name in names:
        key = f"png_{name}"
        path = f"../../assets/avatars/{name}.png"
        print(f"  {key}: require('{path}'),")
    print("\n  // Add to CUSTOM_AVATARS in app/lib/avatarData.ts:")
    print()
    for name in names:
        key = f"png_{name}"
        label = name.replace("_", " ").title()
        print(f"  {{ key: '{key}', label: '{label}', culture: '', price: 1000, isPremium: true }},")
    print("\n-------------------------------------------------------------------------\n")


# ── Image resolution ─────────────────────────────────────────────────────────

def resolve_image(first_arg: str | None, project_root: Path) -> tuple[Path, bool]:
    """
    Returns (image_path, auto_detected).
    If first_arg looks like an image path, use it directly.
    Otherwise, auto-detect from the pre-process folder.
    """
    preprocess_dir = project_root / "assets" / "avatars" / "pre-process"

    if first_arg is not None:
        # Treat as explicit path if it contains a separator or has an image extension
        p = Path(first_arg)
        if "/" in first_arg or "\\" in first_arg or p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
            return p.expanduser().resolve(), False

    # Auto-detect from pre-process/
    if not preprocess_dir.exists():
        print(f"Error: pre-process directory not found: {preprocess_dir}")
        print("Create it with: mkdir -p assets/avatars/pre-process")
        sys.exit(1)

    candidates = [
        f for f in preprocess_dir.iterdir()
        if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp") and f.name != ".gitkeep"
    ]

    if len(candidates) == 0:
        print(f"Error: no image found in {preprocess_dir}")
        print("Drop your Gemini-generated image there, then re-run.")
        sys.exit(1)

    if len(candidates) > 1:
        names = [f.name for f in candidates]
        print(f"Error: multiple images in pre-process/: {names}")
        print("Pass the image path explicitly as the first argument.")
        sys.exit(1)

    return candidates[0], True


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Crop a GeoQuest avatar sprite sheet and remove background."
    )
    parser.add_argument("args", nargs="+",
                        help="Avatar key names (e.g. microwave couch conqueror), "
                             "optionally preceded by an image path")
    parser.add_argument("--cols", type=int, default=None,
                        help="Number of columns (default: number of names)")
    parser.add_argument("--rows", type=int, default=1,
                        help="Number of rows (default: 1)")
    parser.add_argument("--output", default=None,
                        help="Output directory (default: assets/avatars/ relative to project root)")
    parser.add_argument("--bg", default="green",
                        help="Background color to remove: green (default), white, or #RRGGBB hex")
    parser.add_argument("--threshold", type=int, default=30,
                        help="Removal tolerance 0-255 (default: 30)")
    parser.add_argument("--no-rembg", action="store_true",
                        help="Skip background removal")
    parser.add_argument("--no-delete", action="store_true",
                        help="Keep the source image in pre-process/ after splitting")
    parser.add_argument("--snippet", action="store_true",
                        help="Print customAvatars.tsx code snippet")

    parsed = parser.parse_args()

    project_root = Path(__file__).parent.parent

    # ── Resolve image path + names ────────────────────────────────────────────
    positional = parsed.args
    image_path, auto_detected = resolve_image(positional[0], project_root)

    # If first arg was used as the image path, names are the rest; otherwise all are names
    if not auto_detected and (
        "/" in positional[0] or "\\" in positional[0] or
        Path(positional[0]).suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")
    ):
        names = positional[1:]
    else:
        names = positional

    if not names:
        print("Error: no avatar names provided.")
        parser.print_help()
        sys.exit(1)

    if not image_path.exists():
        print(f"Error: image not found: {image_path}")
        sys.exit(1)

    # ── Resolve output directory ───────────────────────────────────────────────
    if parsed.output:
        output_dir = Path(parsed.output).expanduser().resolve()
    else:
        output_dir = project_root / "assets" / "avatars"

    output_dir.mkdir(parents=True, exist_ok=True)

    # ── Parse background color ────────────────────────────────────────────────
    if not parsed.no_rembg:
        try:
            bg_color = parse_bg_color(parsed.bg)
        except ValueError as e:
            print(f"Error: {e}")
            sys.exit(1)

    # ── Load image ────────────────────────────────────────────────────────────
    img = Image.open(image_path)
    full_w, full_h = img.size
    rows = parsed.rows
    cols = parsed.cols or (len(names) if rows == 1 else None)

    if cols is None:
        print("Error: --cols is required when --rows > 1.")
        sys.exit(1)

    total_cells = cols * rows
    if len(names) > total_cells:
        print(f"Error: {len(names)} names but grid is only {cols}×{rows} = {total_cells} cells.")
        sys.exit(1)

    cell_w = full_w // cols
    cell_h = full_h // rows

    source_label = f"pre-process/{image_path.name}" if auto_detected else str(image_path)
    print(f"\nSource:  {source_label}")
    print(f"Sheet:   {full_w}×{full_h}  |  {cols} cols × {rows} rows  |  cell: {cell_w}×{cell_h}px")
    if not parsed.no_rembg:
        print(f"BG removal: {parsed.bg}  (threshold: {parsed.threshold})")
    print(f"Output:  {output_dir}\n")

    # ── Remove background from the FULL sheet first, then split ──────────────
    if not parsed.no_rembg:
        # Auto-sample the actual background colour from the sheet corners so we
        # catch any chroma-key variant, not just pure (0, 255, 0).
        sampled_bg = sample_bg_color(img)
        print(f"  Sampled bg colour from corners: rgb{sampled_bg}")
        # If the caller passed an explicit colour, prefer that; otherwise use sampled.
        effective_bg = bg_color if parsed.bg != "green" else sampled_bg
        print(f"  Removing background from full sheet … ", end="", flush=True)
        img = remove_background(img, bg_color=effective_bg, threshold=parsed.threshold)
        print("done\n")

    # ── Crop each cell from the already-processed sheet ───────────────────────
    saved = []
    for i, name in enumerate(names):
        row_idx = i // cols
        col_idx = i % cols
        left  = col_idx * cell_w
        right = left + cell_w
        top   = row_idx * cell_h
        bottom = top + cell_h
        cropped = img.crop((left, top, right, bottom))

        if parsed.no_rembg:
            cropped = cropped.convert("RGBA")

        out_path = output_dir / f"{name}.png"
        cropped.save(out_path, "PNG")
        saved.append(out_path)
        tag = "transparent bg" if not parsed.no_rembg else "bg kept"
        print(f"  OK  png_{name}  ->  {out_path.name}  ({tag})")

    # ── Optional snippet ──────────────────────────────────────────────────────
    if parsed.snippet:
        print_snippet(names)

    # ── Clean up pre-process source ───────────────────────────────────────────
    if auto_detected and not parsed.no_delete:
        image_path.unlink()
        print(f"Cleaned up: {image_path.name} removed from pre-process/\n")

    print(f"Done. {len(saved)} file(s) saved to {output_dir}\n")


if __name__ == "__main__":
    main()
