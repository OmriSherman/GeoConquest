from PIL import Image
import numpy as np
import os
from collections import deque

INPUT_PATH  = os.path.join(os.path.dirname(__file__), "Gemini_Generated_Image_h0cmxgh0cmxgh0cm.png")
OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), "..")   # assets/avatars/

COLS = 3
ROWS = 4

NAMES = [
    ["lich",            "plague_doctor",  "doge"],
    ["shocked_hamster", "void_eye",       "sextant"],
    ["caravel",         "cosmic_armor",   "hourglass"],
    ["world_ender",     "beast_mark",     None],   # last cell is empty
]


def build_magenta_mask(arr):
    """Return a boolean mask for all magenta-like pixels in the RGBA array."""
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # Magenta = high R, very low G, high B
    # Generous thresholds to catch anti-aliased edge fringing
    return (r.astype(np.int16) > 160) & (g.astype(np.int16) < 100) & (b.astype(np.int16) > 160)


def flood_fill_from_edges(mask):
    """
    BFS from every edge pixel that is magenta, spreading to all
    4-connected magenta neighbours.  Returns a visited mask covering
    the entire connected background region.
    """
    H, W = mask.shape
    visited = np.zeros((H, W), dtype=bool)
    queue = deque()

    # Seed from all four edges
    for x in range(W):
        if mask[0,     x] and not visited[0,     x]: visited[0,     x] = True; queue.append((0,     x))
        if mask[H-1,   x] and not visited[H-1,   x]: visited[H-1,   x] = True; queue.append((H-1,   x))
    for y in range(H):
        if mask[y,     0] and not visited[y,     0]: visited[y,     0] = True; queue.append((y,     0))
        if mask[y,   W-1] and not visited[y,   W-1]: visited[y,   W-1] = True; queue.append((y,   W-1))

    while queue:
        y, x = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and mask[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    return visited


def erode_magenta_fringe(arr, passes=3):
    """
    Iteratively removes edge pixels that have magenta color spill.
    Each pass peels off one layer of fringe pixels that are:
      - still opaque
      - adjacent to at least one transparent pixel
      - have R and B both significantly higher than G (magenta tint)
    """
    for _ in range(passes):
        alpha = arr[:, :, 3]
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)

        transparent = alpha == 0

        # Any opaque pixel that touches a transparent pixel
        adj_to_transparent = (
            np.roll(transparent,  1, axis=0) |
            np.roll(transparent, -1, axis=0) |
            np.roll(transparent,  1, axis=1) |
            np.roll(transparent, -1, axis=1)
        )

        # Magenta-tinted fringe: R and B both well above G
        magenta_tint = (r - g > 50) & (b - g > 50)

        fringed = (alpha > 0) & adj_to_transparent & magenta_tint
        arr[fringed, 3] = 0

    return arr


def remove_magenta(img):
    """
    Three-stage removal on the full image before any cropping:
      1. Flood-fill from edges  →  connected background region
      2. Global pass            →  isolated magenta pixels
      3. Edge erosion           →  magenta color-spill fringe pixels
    """
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    magenta_mask = build_magenta_mask(arr)

    bg_mask   = flood_fill_from_edges(magenta_mask)
    full_mask = bg_mask | magenta_mask
    arr[full_mask, 3] = 0

    arr = erode_magenta_fringe(arr, passes=3)

    return Image.fromarray(arr)


def main():
    print(f"Loading: {INPUT_PATH}")
    original = Image.open(INPUT_PATH)
    W, H = original.size
    print(f"Sprite sheet: {W} x {H}")

    print("Removing magenta from full sheet …")
    clean = remove_magenta(original)
    print("Done. Cropping cells …\n")

    cell_w = W // COLS
    cell_h = H // ROWS

    for row in range(ROWS):
        for col in range(COLS):
            name = NAMES[row][col]
            if name is None:
                print(f"  [{row},{col}] SKIP")
                continue

            left  = col * cell_w
            upper = row * cell_h
            cell  = clean.crop((left, upper, left + cell_w, upper + cell_h))

            out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
            cell.save(out_path, "PNG")
            print(f"  [{row},{col}] -> {name}.png  ({cell_w}x{cell_h})")

    print("\nAll done.")


if __name__ == "__main__":
    main()
