"""Giza at golden hour - 1600x1200, EXACTLY 10 colors.
Painted on an 800x600 index canvas, then scaled x2 nearest-neighbor."""
import sys, math
import numpy as np
from PIL import Image, ImageDraw

W, H, S = 800, 600, 2
rng = np.random.default_rng(11)

# ---- the 10 colors (index -> rgb) -----------------------------------------
PAL = [
    (0x0A, 0x0A, 0x1A),  # 0 NAVY   app background, deepest shadow
    (0x1E, 0x18, 0x40),  # 1 INDIGO upper sky
    (0x4A, 0x28, 0x60),  # 2 PLUM   sky / distant shade / cool stone shadow
    (0xA8, 0x40, 0x6A),  # 3 ROSE   low sky, haze, far pyramids
    (0xF0, 0x7A, 0x4A),  # 4 ORANGE horizon glow, lit cloud undersides
    (0xFF, 0xC8, 0x60),  # 5 GOLD   sun halo, sunlit stone and sand
    (0xFF, 0xF2, 0xD0),  # 6 CREAM  sun core, highlights, stars
    (0xC9, 0x8A, 0x3A),  # 7 STONE  limestone mid-tone / sand
    (0x7A, 0x4A, 0x2A),  # 8 BROWN  stone shade / dune shade
    (0x3A, 0x1E, 0x2A),  # 9 DEEP   deep shade, joints, foreground
]
NAVY, INDIGO, PLUM, ROSE, ORANGE, GOLD, CREAM, STONE, BROWN, DEEP = range(10)
DARKER = {CREAM: GOLD, GOLD: STONE, ORANGE: ROSE, STONE: BROWN, ROSE: PLUM,
          BROWN: DEEP, PLUM: INDIGO, DEEP: NAVY, INDIGO: NAVY, NAVY: NAVY}

canvas = np.zeros((H, W), np.uint8)
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)

# 8x8 Bayer matrix for ordered dithering (palette colors only, no blending)
def _bayer(n):
    if n == 1:
        return np.array([[0]])
    b = _bayer(n // 2)
    return np.block([[4 * b, 4 * b + 2], [4 * b + 3, 4 * b + 1]])
BAYER = (_bayer(8) + 0.5) / 64.0
THR = np.tile(BAYER, (H // 8 + 1, W // 8 + 1))[:H, :W]

def ramp_fill(mask, val, ramp):
    """Map val (0..1) across ramp colors with ordered dithering, inside mask."""
    ramp = np.asarray(ramp, np.uint8)
    f = np.clip(val, 0, 0.9999) * (len(ramp) - 1)
    i = np.floor(f).astype(int)
    idx = np.minimum(i + ((f - i) > THR), len(ramp) - 1)
    canvas[mask] = ramp[idx][mask]

def poly_mask(pts):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=1)
    return np.array(m, bool)

def ellipse_mask(cx, cy, rx, ry):
    return ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2 <= 1.0

def vnoise(sx, sy, seed, octaves=3):
    """Smooth value noise in 0..1, sx/sy = feature size in px."""
    r = np.random.default_rng(seed)
    out = np.zeros((H, W), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gx, gy = max(2, int(W / sx) + 3), max(2, int(H / sy) + 3)
        small = r.random((gy, gx)).astype(np.float32)
        big = Image.fromarray(small, "F").resize(
            (max(W, int(gx * sx)), max(H, int(gy * sy))), Image.BICUBIC)
        out += amp * np.array(big)[:H, :W]
        tot += amp
        amp *= 0.5
        sx, sy = max(1, sx / 2), max(1, sy / 2)
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-6)

def darken(mask, strength):
    """Shift colors one ramp step darker, dithered by strength (0..1)."""
    m = mask & (strength > THR)
    lut = np.array([DARKER[i] for i in range(10)], np.uint8)
    canvas[m] = lut[canvas[m]]

HORIZON = 402
SUN = (148.0, 248.0)
SUN_R = 30

# ---- sky -------------------------------------------------------------------
yn = np.clip(YY / HORIZON, 0, 1)
dsun = np.hypot(XX - SUN[0], (YY - SUN[1]) * 1.25)
sky = 0.05 + 0.58 * yn ** 1.7
sky += 0.40 * np.exp(-dsun / 120) + 0.22 * np.exp(-dsun / 45)
sky += 0.10 * np.exp(-(HORIZON - YY).clip(0) / 30)            # horizon haze
sky += (vnoise(220, 40, 1) - 0.5) * 0.06                       # subtle banding
SKY_RAMP = [NAVY, INDIGO, PLUM, ROSE, ORANGE, GOLD, CREAM]
ramp_fill(np.ones((H, W), bool), sky, SKY_RAMP)

# stars, only in the dark upper sky
for _ in range(90):
    x, y = rng.integers(4, W - 4), rng.integers(4, 150)
    if canvas[y, x] in (NAVY, INDIGO) and math.hypot(x - SUN[0], y - SUN[1]) > 140:
        canvas[y, x] = CREAM
        if rng.random() < 0.12:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                canvas[y + dy, x + dx] = GOLD

# sun: cream core, dithered gold rim
d = np.hypot(XX - SUN[0], YY - SUN[1])
canvas[d <= SUN_R] = CREAM
rim = (d > SUN_R - 5) & (d <= SUN_R)
ramp_fill(rim, (d - (SUN_R - 5)) / 5 * 0.9, [CREAM, GOLD])

# clouds: long golden-hour streaks, lit from below near the sun
def cloud(cy, x0, x1, th, seed, thr=0.52):
    n = vnoise(90, 14, seed, 4)
    env = np.exp(-((YY - cy) / th) ** 2)
    xw = np.clip(np.minimum(XX - x0, x1 - XX) / 80, 0, 1)
    dens = n * env * xw
    m = dens > thr * 0.55
    rel = np.clip((YY - (cy - th)) / (2 * th), 0, 1)           # 0 top .. 1 bottom
    near = np.exp(-np.hypot(XX - SUN[0], YY - SUN[1]) / 260)
    v = 0.12 + 0.30 * rel + 0.55 * near + 0.25 * (dens - thr * 0.55)
    ramp_fill(m, v, [INDIGO, PLUM, ROSE, ORANGE, GOLD, CREAM])

cloud(118, 260, 820, 16, 21)
cloud(182, -40, 520, 13, 22)
cloud(268, 40, 420, 9, 23, 0.6)       # thin streak crossing below the sun
cloud(214, 470, 860, 11, 24)
cloud(318, 420, 860, 8, 25, 0.62)

# birds
for bx, by, s in [(560, 168, 5), (582, 160, 4), (600, 175, 4), (536, 182, 3), (618, 152, 3)]:
    for k in range(s + 1):
        canvas[by - k // 2, bx - s + k] = NAVY
        canvas[by - k // 2, bx + s - k] = NAVY
    canvas[by, bx] = NAVY

# ---- distant plateau --------------------------------------------------------
far = (YY >= HORIZON - 2 + 3 * np.sin(XX / 70) + 2 * np.sin(XX / 23))
ramp_fill(far, 0.55 - (YY - HORIZON) / 120 + 0.15 * np.exp(-np.abs(XX - SUN[0]) / 200),
          [PLUM, ROSE, ORANGE, GOLD])

# ---- pyramids ------------------------------------------------------------------
def pyramid(ax, ay, by, xl, xr, xg, n, lit_ramp, shd_ramp, cap=0.0, rough=1.0, seed=0):
    """Stepped pyramid. Sun is to the left: the left face is lit.
    ax,ay apex; by base y; xl/xr base corners; xg ridge foot; n courses."""
    r = np.random.default_rng(seed)
    lit_v = np.full((H, W), -1.0, np.float32)
    shd_v = np.full((H, W), -1.0, np.float32)
    bounds = [ay + (by - ay) * (k / n) ** 1.12 for k in range(n + 1)]
    cap_y = ay + cap * (by - ay)
    for k in range(n):
        y0, y1 = int(round(bounds[k])), int(round(bounds[k + 1]))
        if y1 <= y0:
            continue
        f = (y1 - ay) / (by - ay)
        L = int(round(ax + (xl - ax) * f))
        R = int(round(ax + (xr - ax) * f))
        G = int(round(ax + (xg - ax) * f))
        h = y1 - y0
        smooth = (y1 <= cap_y + r.integers(-3, 4))
        for y in range(y0, y1):
            top = (y == y0)
            bot = (y == y1 - 1) and h > 2
            # lit face
            xs = np.arange(L, G)
            base = 0.62 + 0.14 * (1 - f) + 0.08 * (1 - (xs - L) / max(1, G - L))
            if smooth:
                v = base + 0.18
            else:
                v = base + (0.24 if top else 0) - (0.38 if bot else 0)
            lit_v[y, L:G] = v
            # shadow face
            xs2 = np.arange(G, R)
            sb = 0.55 - 0.12 * f
            if smooth:
                v2 = sb + 0.15
            else:
                v2 = sb + (0.2 if top else 0) - (0.32 if bot else 0)
            shd_v[y, G:R] = v2
        if smooth:
            continue
        # vertical block joints, staggered per course
        x = L + r.integers(0, 6)
        while x < R:
            w = int(r.integers(5, 12) * (0.5 + f))
            if x < G:
                lit_v[y0 + 1:y1 - 1, x] -= 0.32
            else:
                shd_v[y0 + 1:y1 - 1, x] -= 0.25
            # occasional eroded / missing block
            if r.random() < 0.025 * rough:
                xe = min(x + w, R)
                if x < G:
                    lit_v[y0:y1, x:min(xe, G)] -= 0.14
                else:
                    shd_v[y0:y1, x:xe] -= 0.15
            x += max(3, w)
    # weathering speckle
    sp = rng.random((H, W)) < 0.05 * rough
    lit_v[sp & (lit_v > 0)] -= 0.2
    shd_v[sp & (shd_v > 0)] -= 0.15
    ramp_fill(lit_v > -0.5, lit_v, lit_ramp)
    ramp_fill(shd_v > -0.5, shd_v, shd_ramp)

# Menkaure + queens' pyramids (far, left, hazy, under the sun)
for (ax, ay, by, xl, xr, xg, n) in [(66, 372, 404, 40, 92, 58, 6), (94, 380, 404, 78, 110, 88, 5),
                                    (178, 336, 406, 112, 238, 160, 10)]:
    pyramid(ax, ay, by, xl, xr, xg, n, [PLUM, ROSE, ORANGE, GOLD], [INDIGO, PLUM, ROSE],
            rough=0.4, seed=ax)

# Khafre (behind, right; smooth casing still on its cap)
pyramid(598, 146, 414, 448, 772, 636, 30, [ROSE, ORANGE, STONE, GOLD, CREAM],
        [INDIGO, PLUM, BROWN, ROSE], cap=0.2, rough=0.7, seed=2)

# mid ground sand (in front of Khafre, behind Khufu's base)
mid_top = 412 + 4 * np.sin(XX / 50 + 1) + 3 * np.sin(XX / 19)
mid = YY >= mid_top
mv = 0.78 - (YY - 412) / 260 + 0.12 * np.exp(-np.abs(XX - SUN[0]) / 260) - XX / 3000
ramp_fill(mid, mv + (vnoise(60, 10, 5) - 0.5) * 0.15, [DEEP, BROWN, STONE, GOLD, CREAM])

# Khafre's shadow, cast to the right
darken(poly_mask([(760, 414), (800, 420), (800, 432), (700, 426)]), np.full((H, W), 0.8))

# Khufu (front, the hero), with a slightly flattened summit
pyramid(352, 96, 446, 138, 566, 424, 46, [BROWN, STONE, GOLD, CREAM],
        [NAVY, DEEP, PLUM, BROWN], rough=1.0, seed=3)
canvas[96:99, 350:355] = BROWN   # truncated top

# Khufu's cast shadow on the sand to the right
sh = poly_mask([(560, 446), (566, 446), (760, 462), (720, 470), (470, 462)])
darken(sh, np.full((H, W), 0.9))
darken(sh, np.full((H, W), 0.35))

# sand drift banked against Khufu's base
drift = (YY >= 440 + 5 * np.sin(XX / 37) + 3 * np.sin(XX / 11))
ramp_fill(drift, 0.72 - (YY - 440) / 220 - XX / 2600 + (vnoise(40, 8, 6) - 0.5) * 0.2,
          [DEEP, BROWN, STONE, GOLD, CREAM])

# ---- foreground dunes ----------------------------------------------------------
def dune(top_fn, light_bias, depth_scale, seed):
    xs = np.arange(W, dtype=np.float32)
    top = top_fn(xs)
    slope = np.gradient(top)
    T = np.broadcast_to(top, (H, W))
    m = YY >= T
    depth = YY - T
    light = np.clip(0.55 - 6.0 * slope, 0.25, 1.0)[None, :]
    v = light_bias + 0.42 * light - depth / depth_scale
    # wind ripples
    rip = np.sin(depth * 0.55 + XX * 0.06 + vnoise(70, 20, seed) * 6) > 0.86
    v = np.where(rip & (depth > 3), v - 0.16, v)
    v += (vnoise(25, 6, seed + 1) - 0.5) * 0.08
    crest = (depth >= 0) & (depth < 1.5) & (slope[None, :] < 0.05)
    v = np.where(crest, v + 0.18, v)
    ramp_fill(m, v, [NAVY, DEEP, BROWN, STONE, GOLD, CREAM])

dune(lambda x: 486 + 16 * np.sin(x / 120 + 2.2) + 6 * np.sin(x / 41) - 12 * np.exp(-((x - 300) / 140) ** 2) + 18 * np.exp(-((x - 600) / 110) ** 2),
     0.44, 420, 30)
# ---- the Sphinx (foreground right, profile facing the sun) -------------------
def sphinx(ox, gy, k):
    P = lambda pts: [(ox + x * k, gy + y * k) for x, y in pts]
    outline = [
        (0, 0), (0, -9), (4, -13), (60, -15),                  # front paws
        (64, -22), (69, -40), (70, -52),                        # chest
        (66, -56), (64, -62), (61, -65), (61, -68), (58, -71),  # chin, mouth
        (58, -74), (55, -76), (58, -79), (59, -86),             # nose, brow
        (61, -90), (63, -95), (70, -100), (82, -102),           # headdress top
        (94, -99), (100, -91), (104, -78), (108, -64),          # headdress flare
        (101, -60), (108, -55), (140, -52), (188, -51),         # neck, back
        (212, -46), (223, -34), (226, -16), (234, 0),           # rump, haunch
    ]
    m = poly_mask(P(outline))
    ys, xs = np.nonzero(m)
    # distance from the silhouette's left edge (per row) and top edge (per column)
    first_x = np.full(H, W, np.int32)
    np.minimum.at(first_x, ys, xs)
    first_y = np.full(W, H, np.int32)
    np.minimum.at(first_y, xs, ys)
    dl = XX - first_x[:, None]
    dt = YY - first_y[None, :]
    rx, ry = (XX - ox) / k, (YY - gy) / k
    v = np.full((H, W), 0.44, np.float32)
    v += (vnoise(14, 5, 70) - 0.5) * 0.18
    v = np.where(dt < 4 * k, v + 0.22, v)                     # sky-lit top surfaces
    v = np.where(dl < 7 * k, v + 0.26, v)                     # sun-lit front faces
    paw_top = (ry > -15) & (ry < -11) & (rx < 62)
    v = np.where(paw_top, v + 0.24, v)
    # toes on the paw front
    v = np.where((ry > -9) & (rx < 6) & ((YY.astype(int) % 4) == 0), v - 0.2, v)
    # nemes headdress: stripes + a lit lappet hanging beside the face
    nemes = (rx > 64) & (ry < -56) & (ry > -101)
    stripes = nemes & (((ry * 2.2).astype(int) % 3) == 0)
    v = np.where(stripes, v - 0.2, v)
    lappet = (rx > 66) & (rx < 78) & (ry > -86) & (ry < -56)
    v = np.where(lappet, v + 0.14, v)
    # body erosion layers and a shaded belly line
    body = (rx > 108) & (ry > -50)
    layers = body & (np.sin(ry * 1.25 + np.sin(rx / 7) * 0.6) > 0.8)
    v = np.where(layers, v - 0.2, v)
    v = np.where((ry > -20) & (rx > 66) & (rx < 214), v - 0.16, v)   # under-body shade
    v = np.where((ry > -36) & (ry < -16) & (rx > 66) & (rx < 80), v - 0.14, v)  # leg
    ramp_fill(m, v, [NAVY, DEEP, BROWN, STONE, GOLD, CREAM])
    # 1px outline: DEEP on shadow sides, GOLD rim where the sun hits
    edge = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    canvas[edge] = DEEP
    canvas[edge & (dl < 2) & (ry < -10)] = GOLD
    canvas[edge & (dt < 1) & (rx < 110)] = GOLD
    # face: eye, nostril, mouth
    def px_(x, y, c, w=1):
        X, Y = int(round(ox + x * k)), int(round(gy + y * k))
        canvas[Y, X:X + max(1, int(round(w * k)))] = c
    px_(61.5, -83, DEEP, 2.5)
    px_(60, -82, BROWN, 1)
    px_(57, -75, DEEP, 1)
    px_(59, -68, BROWN, 2)
    return m

SPH = sphinx(468, 506, 1.12)
# Sphinx shadow on the sand, cast to the right
darken(poly_mask([(700, 506), (740, 506), (800, 516), (800, 524), (690, 514)]), np.full((H, W), 0.9))
darken(poly_mask([(600, 506), (720, 506), (690, 514), (560, 512)]), np.full((H, W), 0.6))

dune(lambda x: 548 + 22 * np.sin(x / 150 + 0.4) + 7 * np.sin(x / 47 + 1) + 0.03 * (x - 400),
     0.34, 300, 40)

# ---- palms (left foreground, silhouettes) ------------------------------------
def palm(bx, by, h, lean, seed):
    r = np.random.default_rng(seed)
    img_l = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(img_l)
    pts = [(bx + lean * (i / 40) ** 1.6, by - h * (i / 40)) for i in range(41)]
    for i in range(40):                      # tapered trunk
        d.line([pts[i], pts[i + 1]], fill=1, width=int(round(7 - 3.5 * i / 40)))
    cx, cy = pts[-1]
    for a_deg in [-184, -164, -142, -118, -96, -76, -52, -30, -8, 12, 196]:
        a = math.radians(a_deg + r.uniform(-7, 7))
        L = r.uniform(44, 60)
        droop = 10 + abs(math.cos(a)) * 22
        cl = []
        for j in range(17):
            t = j / 16
            cl.append((cx + math.cos(a) * L * t, cy + math.sin(a) * L * t * 0.75 + droop * t ** 2.2))
        top, bot = [], []
        for j, (x, y) in enumerate(cl):
            t = j / 16
            w = 5.5 * math.sin(math.pi * min(1, t * 1.1)) + 0.6
            serr = 2.2 if (j % 2 and 0.15 < t < 0.95) else 0.0   # leaflet teeth
            top.append((x, y - w * 0.5))
            bot.append((x, y + w + serr))
        d.polygon(top + bot[::-1], fill=1)
    for k in range(4):                        # coconuts
        d.ellipse((cx - 4 + k * 2, cy + 1, cx + 1 + k * 2, cy + 6), fill=1)
    m = np.array(img_l, bool)
    canvas[m] = NAVY
    for i in range(3, 38, 3):                 # sun-side rim light + trunk rings
        x, y = pts[i]
        xi, yi = int(round(x - (7 - 3.5 * i / 40) / 2)), int(round(y))
        if 0 <= xi < W and 0 <= yi < H and m[yi, xi]:
            canvas[yi, xi] = BROWN
            if xi + 1 < W:
                canvas[yi, xi + 1] = DEEP

palm(38, 600, 250, 30, 1)
palm(84, 600, 190, -18, 2)
palm(790, 600, 165, -14, 3)

# ---- vignette (darken toward corners, dithered) --------------------------------
vx = (XX - W / 2) / (W / 2)
vy = (YY - H * 0.45) / (H * 0.55)
vig = np.clip((vx ** 2 * 0.9 + vy ** 2 * 0.8) - 0.55, 0, 1) * 1.1
darken(np.ones((H, W), bool), vig)
darken(np.ones((H, W), bool), vig - 0.45)

# ---- export & verify -------------------------------------------------------------
pal_arr = np.array(PAL, np.uint8)
small = Image.fromarray(pal_arr[canvas], "RGB")
big = small.resize((W * S, H * S), Image.NEAREST)
out = sys.argv[1]
big.save(out, optimize=True)
chk = Image.open(out).convert("RGB").getcolors(maxcolors=1 << 20)
names = ["NAVY", "INDIGO", "PLUM", "ROSE", "ORANGE", "GOLD", "CREAM", "STONE", "BROWN", "DEEP"]
print("size:", Image.open(out).size, "unique colors:", len(chk))
for cnt, c in sorted(chk, reverse=True):
    print("#%02X%02X%02X" % c, names[PAL.index(c)], f"{100 * cnt / (W * H * S * S):.1f}%")
assert len(chk) == 10, "must be exactly 10 colors"
