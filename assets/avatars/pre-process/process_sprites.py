from PIL import Image
import numpy as np
import os
from collections import deque

SCRIPT_DIR = os.path.dirname(__file__)
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..")   # assets/avatars/

COLS = 4
ROWS = 3
MARGIN_SIDE   = 10   # left/right trim
MARGIN_BOTTOM = 20   # bottom trim (kills bleed from next row)
MARGIN_TOP    = 0    # no top trim — open lids already clip at the cell boundary
OPEN_TOP_BONUS = 30  # extra pixels stolen upward from the row above for open-chest cells

# Cells marked True get OPEN_TOP_BONUS pixels of extra headroom above their row boundary
OPEN_CELLS = {
    "chests.png":       {(1, 2), (1, 3), (2, 0), (2, 1), (2, 2), (2, 3)},
    "mythic_batch.png": {(0, 1)},
}

# Per-sheet chroma key color: "magenta" or "green"
CHROMA = {
    "mythic_batch.png": "green",
}

SHEETS = {
    "batch.png": [
        ["mythic_xp_potion",   "mythic_gold_potion",  "mythic_xp_crystal",   "mythic_dust_crystal"],
        ["settings_wheel",     "language_translation", "border_drawing_quiz", "winner"],
        ["meme_emperor",       "gigachad_cartographer","surprised_explorer",  "wojak_wanderer"],
    ],
    "mythic_batch.png": [
        ["mythic_closed",       "mythic_open",      "worldbreaker_empress", "storm_navigator"],
        ["mapless_heroine",     "mapless_hero",     "longitude_ronin",      "meridian_oracle"],
        ["border_phantom",      "cosmic_pigeon",    "globe_eater",          "conquest_frog"],
    ],
    "chests.png": [
        ["wooden_closed",    "bronze_closed",       "silver_closed",        "gold_closed"],
        ["royal_closed",     "legendary_closed",    "wooden_open",          "bronze_open"],
        ["silver_open",      "gold_open",           "royal_open",           "legendary_open"],
    ],
    "potions and avatars.png": [
        ["xp_potion",        "gold_potion",         "map_mouse",            "compass_crow"],
        ["coin_crab",        "treasure_gecko",      "gilded_cartographer",  "ruby_scarab"],
        ["duchess",          "velvet_jackal",       "worldshell_turtle",    "eclipse_navigator"],
    ],
}


def build_chroma_mask(arr, color="magenta"):
    r, g, b = arr[:, :, 0].astype(np.int16), arr[:, :, 1].astype(np.int16), arr[:, :, 2].astype(np.int16)
    if color == "green":
        return (g > 160) & (r < 100) & (b < 100)
    return (r > 160) & (g < 100) & (b > 160)  # magenta


def flood_fill_from_edges(mask):
    H, W = mask.shape
    visited = np.zeros((H, W), dtype=bool)
    queue = deque()

    for x in range(W):
        if mask[0,   x] and not visited[0,   x]: visited[0,   x] = True; queue.append((0,   x))
        if mask[H-1, x] and not visited[H-1, x]: visited[H-1, x] = True; queue.append((H-1, x))
    for y in range(H):
        if mask[y,   0] and not visited[y,   0]: visited[y,   0] = True; queue.append((y,   0))
        if mask[y, W-1] and not visited[y, W-1]: visited[y, W-1] = True; queue.append((y, W-1))

    while queue:
        y, x = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and mask[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    return visited


def erode_chroma_fringe(arr, color="magenta", passes=3):
    for _ in range(passes):
        alpha = arr[:, :, 3]
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)

        transparent = alpha == 0
        adj_to_transparent = (
            np.roll(transparent,  1, axis=0) |
            np.roll(transparent, -1, axis=0) |
            np.roll(transparent,  1, axis=1) |
            np.roll(transparent, -1, axis=1)
        )
        if color == "green":
            tint = (g - r > 50) & (g - b > 50)
        else:
            tint = (r - g > 50) & (b - g > 50)

        fringed = (alpha > 0) & adj_to_transparent & tint
        arr[fringed, 3] = 0

    return arr


def remove_chroma(img, color="magenta"):
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    mask = build_chroma_mask(arr, color)
    bg_mask = flood_fill_from_edges(mask)
    arr[bg_mask | mask, 3] = 0
    arr = erode_chroma_fringe(arr, color, passes=3)
    return Image.fromarray(arr)


def process(filename, names):
    path = os.path.join(SCRIPT_DIR, filename)
    if not os.path.exists(path):
        print(f"  MISSING: {filename} — skipping")
        return

    print(f"\nLoading: {filename}")
    img = Image.open(path)
    W, H = img.size
    print(f"  Size: {W} x {H}  →  cells: {W // COLS} x {H // ROWS}")

    color = CHROMA.get(filename, "magenta")
    print(f"  Removing {color} background...")
    clean = remove_chroma(img, color)

    cell_w = W // COLS
    cell_h = H // ROWS

    for row in range(ROWS):
        for col in range(COLS):
            name = names[row][col]
            if name is None:
                continue
            open_set = OPEN_CELLS.get(filename, set())
            extra_top = OPEN_TOP_BONUS if (row, col) in open_set else 0
            box = (
                col * cell_w + MARGIN_SIDE,
                row * cell_h + MARGIN_TOP - extra_top,
                (col + 1) * cell_w - MARGIN_SIDE,
                (row + 1) * cell_h - MARGIN_BOTTOM,
            )
            cell = clean.crop(box)
            out = os.path.join(OUTPUT_DIR, f"{name}.png")
            cell.save(out, "PNG")
            print(f"  [{row},{col}] → {name}.png")


for filename, names in SHEETS.items():
    process(filename, names)

print("\nAll done.")
