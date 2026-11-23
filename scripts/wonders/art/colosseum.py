"""The Colosseum at blue hour - 1600x1200, exactly 10 colors.
The outer wall is computed per pixel on the true ellipse, so the arches
foreshorten naturally toward the curved ends."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x0B, 0x0E, 0x24),  # 0 NIGHT    top sky, deepest shade
    (0x1E, 0x2E, 0x6A),  # 1 BLUE     blue-hour sky
    (0x4A, 0x3F, 0x86),  # 2 VIOLET   lower sky, cool shade
    (0x8C, 0x5E, 0x8A),  # 3 MAUVE    afterglow, haze
    (0xE8, 0x8A, 0x4A),  # 4 ORANGE   horizon glow, lit stone mid
    (0xF6, 0xC4, 0x6A),  # 5 GOLD     floodlit travertine
    (0xFF, 0xF0, 0xC8),  # 6 CREAM    brightest light, moon
    (0x6E, 0x4A, 0x3A),  # 7 UMBER    travertine in shade
    (0x2A, 0x1E, 0x2A),  # 8 DEEP     inside the arches
    (0x14, 0x20, 0x18),  # 9 PINE     umbrella pines
]
NIGHT, BLUE, VIOLET, MAUVE, ORANGE, GOLD, CREAM, UMBER, DEEP, PINE = range(10)
DARKER = {CREAM: GOLD, GOLD: ORANGE, ORANGE: UMBER, UMBER: DEEP, DEEP: NIGHT, MAUVE: VIOLET,
          VIOLET: BLUE, BLUE: NIGHT, NIGHT: NIGHT, PINE: NIGHT}
LIGHTER = {NIGHT: BLUE, BLUE: VIOLET, VIOLET: MAUVE, MAUVE: ORANGE, DEEP: UMBER, UMBER: ORANGE,
           ORANGE: GOLD, GOLD: CREAM, PINE: DEEP}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
ALL = np.ones((H, W), bool)
ONE = np.ones((H, W), np.float32)
rng = np.random.default_rng(14)
STONE = [DEEP, UMBER, ORANGE, GOLD, CREAM]
GRAIN = cv.noise(4, 3, 140, 2)

# ---- sky ----------------------------------------------------------------------------------
GLOW = (660.0, 430.0)
yn = np.clip(YY / 430, 0, 1)
dg = np.hypot(XX - GLOW[0], (YY - GLOW[1]) * 1.8)
sky = 0.05 + 0.45 * yn ** 1.6 + 0.35 * np.exp(-dg / 260)
cv.ramp(ALL, sky + (cv.noise(240, 40, 1) - 0.5) * 0.04, [NIGHT, BLUE, VIOLET, MAUVE, ORANGE])
for _ in range(70):
    x, y = rng.integers(4, W - 4), rng.integers(4, 200)
    if cv.c[y, x] in (NIGHT, BLUE):
        cv.c[y, x] = CREAM if rng.random() < 0.5 else GOLD
MOON = (560.0, 70.0)
dm = np.hypot(XX - MOON[0], YY - MOON[1])
cv.remap(dm < 40, ONE * np.clip(1 - dm / 40, 0, 1) * 0.6, LIGHTER)
cv.fill(dm <= 15, CREAM)
cv.fill((dm <= 15) & (cv.noise(5, 5, 7, 2) > 0.68), GOLD)                      # maria
CL = [BLUE, VIOLET, MAUVE, ORANGE, GOLD]
cv.cloud(300, 420, 860, 8, 21, CL, GLOW, 0.6)
cv.cloud(250, -40, 300, 7, 22, CL, GLOW, 0.62)

# ---- distant city silhouette ------------------------------------------------------------------
city = YY >= 412 - (cv.noise(14, 50, 3, 1) > 0.5) * 14 - (cv.noise(40, 50, 4, 1) > 0.6) * 10
cv.ramp(city, 0.25 + (cv.noise(3, 3, 5, 1) > 0.85) * 0.5, [NIGHT, DEEP, ORANGE])

# ---- the Colosseum ----------------------------------------------------------------------------
CX, YB = 400.0, 432.0
TIERS = [0, 62, 120, 176, 240]                    # tier boundaries (world height units)
N_ARCH = 80

def ring(RX, RY, yb, hmax_fn, arches=True, dark=0.0, seed=0):
    """Draw the front half of an elliptical arcaded wall."""
    c = (XX - CX) / RX
    inside = np.abs(c) < 1
    th = np.arccos(np.clip(c, -1, 1))             # 0 right .. pi left
    sn = np.sqrt(np.clip(1 - c * c, 0, 1))
    k = 1 + 0.12 * sn                             # nearer = a little larger
    base = yb + RY * sn
    h = (base - YY) / k                           # height above ground at this pixel
    hmax = hmax_fn(th)
    m = inside & (h >= 0) & (h <= hmax)
    arc = 2 * math.pi * RX / N_ARCH               # world width of one bay
    frac = (th * N_ARCH / (2 * math.pi)) % 1.0
    off = (frac - 0.5) * arc                      # offset from bay centre
    v = 0.42 + 0.36 * sn ** 0.7 - 0.16 * (h / 240) + (GRAIN - 0.5) * 0.14 - dark
    col = np.minimum(frac, 1 - frac) < 0.07
    v = np.where(col, v + 0.12 - 0.25 * (frac > 0.5) * (np.minimum(frac, 1 - frac) > 0.035), v)
    opening = np.zeros_like(m)
    glow_v = np.zeros((H, W), np.float32)
    if arches:
        for t in range(3):
            h0 = TIERS[t] + (0 if t == 0 else 8)
            T = TIERS[t + 1] - TIERS[t]
            spring = TIERS[t] + 0.70 * T
            r = 0.30 * arc
            body = (h >= h0) & (h <= spring) & (np.abs(off) <= r)
            top = (h > spring) & (np.abs(off) <= np.sqrt(np.clip(r * r - (h - spring) ** 2, 0, None)))
            o = (body | top) & m
            opening |= o
            g = 0.42 + 0.42 * (1 - np.abs(off) / r) * np.clip(1 - (h - h0) / (spring - h0 + r), 0, 1) - dark - 0.08 * t
            glow_v = np.where(o, g, glow_v)
            # balustrade line under each upper tier's openings
            if t > 0:
                v = np.where((h >= TIERS[t] + 2) & (h < TIERS[t] + 8) & ((XX.astype(int) % 3) == 0), v - 0.15, v)
        # attic: small square windows in every other bay
        win = (h > 196) & (h < 210) & (np.abs(off) < 0.12 * arc) & (((th * N_ARCH / (2 * math.pi)) // 1) % 2 == 0)
        opening |= win & m
        glow_v = np.where(win & m, 0.3 - dark, glow_v)
    # cornices between tiers
    for b in TIERS[1:]:
        v = np.where((h > b - 4) & (h <= b), v + 0.22, v)
        v = np.where((h > b - 7) & (h <= b - 4), v - 0.2, v)
    cv.ramp(m & ~opening, v, STONE)
    cv.ramp(m & opening, glow_v, STONE)
    return m, th, h, hmax

# ruin profile: the outer ring is complete on the left, broken on the right
TH_R = math.acos(0.40)
def outer_h(th):
    full = np.full_like(th, 240.0)
    t = np.clip(th / TH_R, 0, 1)
    jag = (cv.noise(3, 400, 31, 2)[0][None, :] - 0.5) * 18
    broken = 70 + 60 * t ** 2 + jag
    return np.where(th >= TH_R, full, broken)

def inner_h(th):
    jag = (cv.noise(4, 400, 32, 2)[0][None, :] - 0.5) * 16
    return np.where(th < TH_R + 0.1, 205 - 40 * (1 - np.clip(th / TH_R, 0, 1)) + jag, 0)

# inner ring (seen where the outer ring has fallen), a little darker and set back
ring(312, 36, YB - 10, inner_h, dark=0.12, seed=2)
mo, th, hh, _ = ring(340, 40, YB, outer_h, seed=1)

# the sloping brick buttress where the outer ring ends
c = (XX - CX) / 340
sn = np.sqrt(np.clip(1 - c * c, 0, 1))
thx = np.arccos(np.clip(c, -1, 1))
hx = (YB + 40 * sn - YY) / (1 + 0.12 * sn)
wedge = (thx < TH_R) & (thx > TH_R - 0.16) & (hx >= 0) & (hx <= 240 - (TH_R - thx) / 0.16 * 150)
bricks = ((YY.astype(int) % 3) == 0) | (((XX.astype(int) + (YY.astype(int) // 3) * 2) % 5) == 0)
cv.ramp(wedge, 0.62 - 0.2 * bricks + (GRAIN - 0.5) * 0.2, STONE)
edge = wedge & ~np.roll(wedge, -1, 0)
cv.fill(edge, CREAM)

# ---- piazza ---------------------------------------------------------------------------------
c2 = (XX - CX) / 340
foot = YB + 40 * np.sqrt(np.clip(1 - c2 * c2, 0, 1))
ground = (YY > np.where(np.abs(c2) < 1, foot, 414))
pool = np.exp(-(((XX - 400) / 320) ** 2) - ((YY - 480) / 60) ** 2)
v = 0.15 + 0.45 * pool + (cv.noise(6, 2, 50, 2) - 0.5) * 0.12
s = np.maximum((YY - 420) / 180, 0.05)
lines = (np.abs(((XX - 400) / s) % 60) < 2.5) | (np.abs((np.clip(YY - 420, 0, None) ** 0.7) % 6) < 0.6)
v = np.where(lines, v - 0.12, v)
cv.ramp(ground, v, [NIGHT, DEEP, UMBER, ORANGE, GOLD])

# street lamps with warm halos
def lamp(x, y, hgt):
    cv.fill(cv.rect(x - 1, y - hgt, x + 1, y), NIGHT)
    cv.fill(cv.rect(x - 3, y - 3, x + 3, y), NIGHT)
    lx, ly = x, y - hgt - 4
    dl = np.hypot(XX - lx, YY - ly)
    cv.remap(dl < 26, ONE * np.clip(1 - dl / 26, 0, 1) * 0.9, LIGHTER)
    cv.fill(cv.rect(lx - 3, ly - 3, lx + 4, ly + 4), GOLD)
    cv.fill(cv.rect(lx - 1, ly - 1, lx + 2, ly + 2), CREAM)
    cv.fill(cv.rect(lx - 4, ly - 5, lx + 5, ly - 3), NIGHT)
    cv.remap(cv.ellipse(x, y + 1, 18, 4), ONE * 0.6, LIGHTER)

def person(x, y, h):
    m = cv.ellipse(x, y - h + 2, 2.0, 2.2) | cv.poly([(x - 2.5, y), (x + 2.5, y), (x + 2, y - h + 4), (x - 2, y - h + 4)])
    cv.fill(m, NIGHT)

for (x, y, h) in ((150, 560, 70), (650, 560, 70), (300, 520, 46), (520, 520, 46)):
    lamp(x, y, h)
for (x, y, h) in ((232, 500, 14), (241, 502, 13), (452, 512, 14), (590, 506, 13), (380, 540, 16), (392, 542, 15)):
    person(x, y, h)

# ---- Roman umbrella pines framing the top ----------------------------------------------------
def umbrella_pine(tx, base_y, cx, cy, rx, ry, seed):
    """Stone pine: bare forked trunk, wide flat-bottomed lumpy canopy."""
    r = np.random.default_rng(seed)
    fork = (tx + (cx - tx) * 0.55, cy + ry * 1.6)
    trunk = cv.lines([(tx, base_y), ((tx + fork[0]) / 2 + 6, (base_y + fork[1]) / 2), fork], 9)
    for ex in (cx - rx * 0.45, cx + rx * 0.05, cx + rx * 0.5):
        trunk |= cv.lines([fork, (ex, cy + ry * 0.3)], 4)
    canopy = np.zeros((H, W), bool)
    for _ in range(14):
        px = cx + r.uniform(-rx * 0.85, rx * 0.85)
        edge = 1 - abs(px - cx) / rx
        py = cy - ry * 0.25 - r.uniform(0, ry * 0.5) * edge
        canopy |= cv.ellipse(px, py, r.uniform(0.22, 0.38) * rx, r.uniform(0.5, 0.8) * ry)
    canopy &= YY < cy + ry * 0.45
    n = cv.noise(4, 3, seed, 2)
    canopy &= ~((n > 0.8) & ~cv.ellipse(cx, cy - ry * 0.2, rx * 0.75, ry * 0.7))
    cv.fill(trunk, NIGHT)
    top = np.full(W, H, np.int32)
    ys_, xs_ = np.nonzero(canopy)
    np.minimum.at(top, xs_, ys_)
    dt = YY - top[None, :]
    cv.ramp(canopy, 0.42 - 0.35 * np.clip(dt / (ry * 1.2), 0, 1) + (n - 0.5) * 0.3, [NIGHT, PINE, VIOLET])
    cv.fill(canopy & (dt < 1.5) & (n > 0.45), MAUVE)                  # afterglow on the top

umbrella_pine(26, 620, 70, 96, 160, 38, 61)
umbrella_pine(792, 620, 770, 170, 125, 30, 62)

cv.vignette(1.0)
cv.save(sys.argv[1])
