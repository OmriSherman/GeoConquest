"""Uluru at dusk under the rising Milky Way - 1600x1200, exactly 10 colors."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x0A, 0x0C, 0x1E),  # 0 NIGHT     night sky, deepest shade
    (0x1C, 0x21, 0x48),  # 1 INDIGO    sky
    (0x4A, 0x3A, 0x6E),  # 2 VIOLET    lower sky, earth's shadow
    (0xB4, 0x56, 0x6A),  # 3 ROSE      afterglow band, warm haze
    (0xA8, 0x3A, 0x22),  # 4 RED       the rock, mid
    (0xE8, 0x74, 0x3A),  # 5 ORANGE    the rock, lit
    (0xFF, 0xC4, 0x6E),  # 6 GOLD      highlights, warm stars
    (0xF4, 0xF0, 0xFF),  # 7 WHITE     stars, the Milky Way
    (0x6E, 0x2E, 0x1E),  # 8 RUST      red sand, rock shade
    (0x7E, 0x8A, 0x4A),  # 9 SPINIFEX  desert grass
]
NIGHT, INDIGO, VIOLET, ROSE, RED, ORANGE, GOLD, WHITE, RUST, SPIN = range(10)
DARKER = {WHITE: VIOLET, GOLD: ORANGE, ORANGE: RED, RED: RUST, RUST: NIGHT, ROSE: VIOLET,
          VIOLET: INDIGO, INDIGO: NIGHT, NIGHT: NIGHT, SPIN: RUST}
LIGHTER = {NIGHT: INDIGO, INDIGO: VIOLET, VIOLET: ROSE, ROSE: ORANGE, RUST: RED, RED: ORANGE,
           ORANGE: GOLD, GOLD: WHITE, SPIN: GOLD}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
ALL = np.ones((H, W), bool)
ONE = np.ones((H, W), np.float32)
rng = np.random.default_rng(17)
HORIZON = 382

# ---- sky: night above, the pink belt of afterglow, earth's shadow at the horizon ----------------------
yn = np.clip(YY / HORIZON, 0, 1)
sky = 0.04 + 0.30 * yn ** 2.2
belt = np.exp(-((YY - (HORIZON - 62)) / 30) ** 2) * 0.28            # pink afterglow band
shadow = np.exp(-((YY - (HORIZON - 14)) / 16) ** 2) * -0.06         # bluish earth's shadow below it
cv.ramp(ALL, sky + belt + shadow + (cv.noise(240, 40, 1) - 0.5) * 0.03, [NIGHT, INDIGO, VIOLET, ROSE, ORANGE])

# the Milky Way: a diagonal band of dense stars with a dark dust lane
def band_dist(x, y, x0=60, y0=40, x1=760, y1=330):
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    return ((x - x0) * dy - (y - y0) * dx) / L

bd = band_dist(XX, YY)
glow = np.exp(-(bd / 42) ** 2) * np.clip((HORIZON - 50 - YY) / 60, 0, 1)
gn = cv.noise(24, 18, 5, 3)
cv.remap(ALL, glow * (0.55 + 0.6 * gn), LIGHTER)
cv.remap(ALL, glow * (0.6 * gn - 0.1), LIGHTER)
dust = (np.abs(bd - 4 + (cv.noise(40, 30, 6, 2) - 0.5) * 16) < 2.5) & (glow > 0.4)
cv.darken(dust, ONE * 0.6)
n_stars = 2200
sx = rng.integers(0, W, n_stars)
sy = (rng.random(n_stars) ** 1.4 * (HORIZON - 70)).astype(int)
for x, y in zip(sx, sy):
    g = math.exp(-(band_dist(x, y) / 60) ** 2)
    if rng.random() < 0.25 + 0.75 * g:
        cv.c[y, x] = WHITE if rng.random() < 0.7 else GOLD
for _ in range(14):                                                  # a few bright twinkling stars
    x, y = int(rng.integers(10, W - 10)), int(rng.integers(10, HORIZON - 110))
    cv.c[y, x - 1:x + 2] = WHITE
    cv.c[y - 1:y + 2, x] = WHITE

# ---- distant flat horizon + Kata Tjuta domes far to the left ----------------------------------------------
far = YY >= HORIZON - 4 + 2 * np.sin(XX / 40)
cv.ramp(far, 0.25, [NIGHT, VIOLET, ROSE])
for (cx, w, h) in ((40, 26, 22), (70, 20, 28), (96, 22, 18)):
    m = (((XX - cx) / w) ** 2 + ((YY - HORIZON) / h) ** 2 <= 1) & (YY < HORIZON)
    cv.ramp(m, 0.35 + 0.2 * (-(XX - cx) / w), [VIOLET, ROSE])

# ---- Uluru -----------------------------------------------------------------------------------------------
x0, x1 = 88, 714
u = np.clip((XX[0] - x0) / (x1 - x0), 0, 1)
prof = np.clip(np.sin(np.pi * u), 0, 1) ** 0.32 * (1 + 0.06 * np.sin(u * 7.5 + 0.6)) - 0.05 * (2 * u - 1) ** 2
top = HORIZON - 138 * prof - 3 * np.sin(u * 23 + 1) * (prof > 0.6)
top = np.where((XX[0] < x0) | (XX[0] > x1), H, top)
ROCK_TOP = top[None, :]
rock = (YY >= ROCK_TOP) & (YY < HORIZON + 2)
hgt = np.clip((HORIZON - YY) / 138, 0, 1)
edge = np.minimum(u / 0.16, (1 - u) / 0.16).clip(0, 1)[None, :]
flutes = np.sin((XX + 6 * np.sin(YY / 23)) * 0.42) * np.clip(1 - (YY - ROCK_TOP) / 120, 0.2, 1)
gully = cv.noise(2.5, 30, 41, 2)
v = 0.34 + 0.35 * hgt + 0.10 * flutes - 0.22 * (1 - edge) + (gully - 0.5) * 0.25
v -= 0.12 * np.clip((YY - (HORIZON - 30)) / 30, 0, 1)                # cool shade at the base
cv.ramp(rock, v, [NIGHT, RUST, RED, ORANGE, GOLD])
# deep vertical gullies and the caves near the base
deep = rock & (cv.noise(3, 26, 42, 2) > 0.74) & (YY > ROCK_TOP + 8)
cv.darken(deep, ONE)
for cx in np.linspace(x0 + 60, x1 - 60, 9) + rng.uniform(-25, 25, 9):
    cy = rng.uniform(HORIZON - 34, HORIZON - 10)
    cave = (cv.ellipse(cx, cy, rng.uniform(7, 14), rng.uniform(2, 3.5)) & (cv.noise(3, 2, int(cx), 1) > 0.3)) & rock
    cv.fill(cave, RUST)
    cv.fill(cave & (YY > cy), NIGHT)
# last sunlight catching the crest
crest = rock & (YY < ROCK_TOP + 3)
cv.fill(crest & (cv.noise(4, 4, 43, 2) > 0.3), GOLD)

# ---- the desert floor -----------------------------------------------------------------------------------
ground = YY >= HORIZON + 2
gt = np.clip((YY - HORIZON) / (H - HORIZON), 0, 1)
v = 0.30 + 0.25 * gt + (cv.noise(16, 4, 51, 3) - 0.5) * 0.25
cv.ramp(ground, v, [NIGHT, RUST, RED, ORANGE])

def spinifex(x, y, s, seed):
    r = np.random.default_rng(seed)
    m = np.zeros((H, W), bool)
    for _ in range(int(10 + 6 * s)):
        a = r.uniform(-2.6, -0.5)
        L = r.uniform(5, 11) * s
        m |= cv.lines([(x + r.uniform(-4, 4) * s, y), (x + math.cos(a) * L, y + math.sin(a) * L)], 1)
    m |= cv.ellipse(x, y - 1.5 * s, 7 * s, 2.5 * s)
    cv.ramp(m, 0.45 + 0.35 * (-(YY - y) / (10 * s)) + (cv.noise(2, 2, seed, 1) - 0.5) * 0.3, [RUST, SPIN, GOLD])
    cv.darken(cv.ellipse(x + 4 * s, y + 1, 8 * s, 1.6 * s), ONE * 0.8)

for i in range(70):
    y = HORIZON + 6 + (rng.random() ** 1.6) * (H - HORIZON - 10)
    s = 0.5 + 2.2 * (y - HORIZON) / (H - HORIZON)
    spinifex(rng.uniform(-10, W + 10), y, s, 200 + i)

def desert_oak(x, base, h, seed):
    """Casuarina: thin trunk and branches, wispy drooping needle-foliage."""
    r = np.random.default_rng(seed)
    tx = x + r.uniform(-5, 5)
    cv.fill(cv.lines([(x, base), (tx, base - h * 0.75)], max(2, int(h / 40))), NIGHT)
    for k in range(7):
        sy = base - h * r.uniform(0.45, 0.8)
        ex = x + r.uniform(-h * 0.3, h * 0.3)
        ey = base - h * r.uniform(0.7, 1.0)
        cv.fill(cv.lines([(x + (tx - x) * 0.6, sy), (ex, ey)], 1), NIGHT)
        for _ in range(int(14 + h / 6)):                         # drooping needles
            px = ex + r.uniform(-h * 0.12, h * 0.12)
            py = ey + r.uniform(-h * 0.06, h * 0.05)
            L = r.uniform(h * 0.06, h * 0.16)
            m = cv.lines([(px, py), (px + r.uniform(-1.5, 1.5), py + L)], 1)
            cv.fill(m, NIGHT)
            if r.random() < 0.3:
                cv.fill(m & (YY < py + 2), SPIN)

desert_oak(46, 560, 130, 301)
desert_oak(760, 545, 110, 302)
desert_oak(700, 420, 34, 303)
desert_oak(170, 418, 28, 304)

# ripples in the red sand of the foreground dune
dune = YY >= 520 + 18 * np.sin(XX / 120 + 1)
rip = np.sin((YY - 0.15 * XX) * 0.5 + cv.noise(40, 20, 61, 2) * 4) > 0.85
cv.darken(dune & rip, ONE * 0.8)
cv.remap(dune & ~rip & (np.sin((YY - 0.15 * XX) * 0.5 + 1.2) > 0.9), ONE * 0.5, LIGHTER)

cv.vignette(1.0)
cv.save(sys.argv[1])
