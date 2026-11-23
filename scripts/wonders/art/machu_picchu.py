"""Machu Picchu at sunrise - 1600x1200, exactly 10 colors."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x0F, 0x1A, 0x24),  # 0 NIGHT    deepest shade
    (0x2E, 0x4A, 0x66),  # 1 DUSK     upper sky, far shaded mountains
    (0x7A, 0x9A, 0xB0),  # 2 HAZE     hazy ranges, cloud shade
    (0xFF, 0xF4, 0xDC),  # 3 CREAM    sun, cloud tops
    (0xF4, 0xB8, 0x7E),  # 4 PEACH    sunrise glow, sunlit rims, thatch
    (0xC9, 0xBB, 0xA0),  # 5 GRANITE  lit stone
    (0x7E, 0x76, 0x6A),  # 6 STONE    stone in shade
    (0x1F, 0x3A, 0x2C),  # 7 JUNGLE   shaded jungle
    (0x3F, 0x6E, 0x3A),  # 8 GREEN    mid slopes
    (0x8D, 0xB0, 0x50),  # 9 LEAF     sunlit grass
]
NIGHT, DUSK, HAZE, CREAM, PEACH, GRANITE, STONE, JUNGLE, GREEN, LEAF = range(10)
DARKER = {CREAM: PEACH, PEACH: GRANITE, GRANITE: STONE, STONE: NIGHT, HAZE: DUSK,
          DUSK: NIGHT, NIGHT: NIGHT, LEAF: GREEN, GREEN: JUNGLE, JUNGLE: NIGHT}
LIGHTER = {NIGHT: DUSK, DUSK: HAZE, HAZE: GRANITE, GRANITE: CREAM, PEACH: CREAM,
           STONE: HAZE, JUNGLE: HAZE, GREEN: HAZE, LEAF: GRANITE}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
xs = np.arange(W, dtype=np.float32)
rng = np.random.default_rng(9)
SUNXY = (118.0, 188.0)
ALL = np.ones((H, W), bool)

def smooth(a, k):
    pad = np.pad(a, k, mode="edge")
    return np.convolve(pad, np.ones(2 * k + 1) / (2 * k + 1), mode="same")[k:-k]

def cloud_sea(y_top, y_bot, x0, x1, seed, thr=0.45, rough=14):
    """Bank of cumulus seen from above: lit tops, shaded undersides."""
    n = cv.noise(40, 14, seed, 4)
    edge = y_top + (cv.noise(50, 30, seed + 1, 3) - 0.5) * rough * 2
    xw = np.clip(np.minimum(XX - x0, x1 - XX) / 40, 0, 1)
    dens = np.clip((YY - edge) / 18, 0, 1) * xw * (0.5 + n)
    m = (dens > thr) & (YY < y_bot)
    top = np.clip(1 - (YY - edge) / 40, 0, 1)
    sun = np.clip(1 - (XX - SUNXY[0]) / 700, 0, 1)
    v = 0.45 + 0.4 * top * (0.6 + 0.4 * sun) + (n - 0.5) * 0.3 - 0.25 * np.clip((YY - edge - 30) / 60, 0, 1)
    cv.ramp(m, v, [DUSK, HAZE, GRANITE, CREAM])

def mist(yc, th, strength, seed, x0=-1e9, x1=1e9):
    n = cv.noise(110, 16, seed, 3)
    band = np.exp(-((YY - yc) / th) ** 2) * strength * (0.5 + n)
    band *= np.clip(np.minimum(XX - x0, x1 - XX) / 50, 0, 1)
    cv.remap(ALL, band, LIGHTER)

# ---- sky -----------------------------------------------------------------------------
yn = np.clip(YY / 360, 0, 1)
ds = np.hypot(XX - SUNXY[0], (YY - SUNXY[1]) * 1.2)
sky = 0.16 + 0.42 * yn ** 1.2 + 0.40 * np.exp(-ds / 210) + 0.2 * np.exp(-ds / 55)
sky += (cv.noise(260, 50, 1) - 0.5) * 0.05
cv.ramp(ALL, sky, [NIGHT, DUSK, HAZE, GRANITE, PEACH, CREAM])
d = np.hypot(XX - SUNXY[0], YY - SUNXY[1])
cv.fill(d <= 20, CREAM)
CL = [DUSK, HAZE, GRANITE, PEACH, CREAM]
cv.cloud(96, 300, 860, 10, 51, CL, SUNXY, 0.58)
cv.cloud(150, -40, 260, 9, 52, CL, SUNXY, 0.6)
cv.cloud(232, 560, 860, 8, 53, CL, SUNXY, 0.6)
for bx, by, s in [(225, 150, 4), (241, 143, 3), (254, 154, 3)]:
    for k in range(s + 1):
        cv.c[by - k // 2, bx - s + k] = NIGHT
        cv.c[by - k // 2, bx + s - k] = NIGHT

# ---- distant ranges --------------------------------------------------------------------
def ridge_line(base, amp, seed, n=6, width=(40, 110), rough=2.5):
    r = np.random.default_rng(seed)
    lift = np.zeros(W)
    for _ in range(n):
        c, w, a = r.uniform(-60, W + 60), r.uniform(*width), r.uniform(0.4, 1.0) * amp
        lift = np.maximum(lift, a * np.clip(1 - np.abs(xs - c) / w, 0, 1) ** 1.1)
    return base - lift + smooth(r.normal(0, 1, W), 3) * rough * 2.2 + smooth(r.normal(0, 1, W), 12) * rough * 3

def ridge_fill(y, v0, fade, ramp, seed, rim=None):
    m = YY >= y[None, :]
    slope = np.gradient(smooth(y, 8))[None, :]
    depth = np.clip((YY - y[None, :]) / fade, 0, 1)
    v = v0 - 0.18 * np.clip(slope * 2.0, -1, 1) * (1 - 0.7 * depth)   # sunrise side, fading lower down
    v = v + 0.3 * depth
    v = v + (cv.noise(10, 14, seed) - 0.5) * 0.16 + (cv.noise(3, 12, seed + 1, 2) - 0.5) * 0.08
    cv.ramp(m, v, ramp)
    if rim is not None:
        e = m & ~np.roll(m, 1, 0) & (slope < 0.05)
        cv.fill(e, rim)

L0 = ridge_line(318, 95, 61, n=10, width=(45, 95))
ridge_fill(L0, 0.45, 60, [DUSK, HAZE, GRANITE, PEACH], 62, rim=PEACH)
mist(338, 18, 0.5, 63)
L1 = ridge_line(372, 105, 71, n=9, width=(50, 110))
ridge_fill(L1, 0.30, 70, [NIGHT, DUSK, HAZE, GRANITE], 72, rim=PEACH)
mist(400, 22, 0.5, 73)

# ---- Putucusi (dark mass on the right) ----------------------------------------------------
put = YY >= (np.interp(xs, [600, 650, 700, 750, 800], [600, 420, 300, 230, 190])
             + smooth(np.random.default_rng(83).normal(0, 1, W), 3) * 4)[None, :]
put &= XX > 600
v = 0.30 + (cv.noise(4, 3, 81, 2) - 0.5) * 0.4 - 0.12 * np.clip((XX - 660) / 140, 0, 1)
v += 0.18 * np.clip((YY - 420) / 180, 0, 1) * 0
cv.ramp(put, v, [NIGHT, JUNGLE, GREEN])
cv.fill(put & ~np.roll(put, 1, 1) & ~np.roll(put, 1, 0), HAZE)
mist(470, 40, 0.45, 84, 600, 900)

# ---- Huayna Picchu -----------------------------------------------------------------------
def peak(cx, top, base, hl, hr, seed, p=0.62, ramp=None, bump=0.0):
    t = np.clip((YY - top) / (base - top), 0, 1)
    sh = t ** p
    jag_l = (cv.noise(3, 10, seed + 5, 2) - 0.5) * 16 * np.sqrt(t)
    jag_r = (cv.noise(3, 10, seed + 6, 2) - 0.5) * 16 * np.sqrt(t)
    xl = cx - hl * sh * (1 + bump * np.sin(t * 9)) + jag_l
    xr = cx + hr * sh * (1 + 0.6 * bump * np.sin(t * 7 + 1)) + jag_r
    m = (XX >= xl) & (XX <= xr) & (YY >= top) & (YY <= base)
    u = (XX - cx) / np.where(XX < cx, np.maximum(cx - xl, 1), np.maximum(xr - cx, 1))   # -1 left .. 1 right
    crowns = cv.noise(4, 3, seed, 2)
    cliffs = (cv.noise(6, 18, seed + 1, 2) > 0.74) & (cv.noise(3, 30, seed + 2, 1) > 0.45)
    v = 0.40 - 0.30 * u + (crowns - 0.5) * 0.36 - 0.10 * t
    cv.ramp(m, v, ramp or [NIGHT, JUNGLE, GREEN, LEAF])
    cv.ramp(m & cliffs, 0.5 - 0.35 * u + (crowns - 0.5) * 0.3, [NIGHT, STONE, GRANITE, PEACH])
    rim = m & ~np.roll(m, 1, 1) & (t < 0.85)
    cv.fill(rim, PEACH)
    cv.fill(rim & (t < 0.3), CREAM)
    return m

peak(505, 112, 470, 150, 135, 91, bump=0.04)
# tiny terraces near the summit
for k, yy in enumerate(range(132, 168, 5)):
    w = 6 + k * 2.2
    cv.fill(cv.rect(497 - w, yy, 497 + w * 0.6, yy + 1) & (cv.c != NIGHT), GRANITE if k % 2 else LEAF)
peak(418, 330, 470, 62, 58, 92, p=0.7)                     # Huchuy Picchu

# cloud sea wrapping the base of the peaks
cloud_sea(392, 470, 300, 820, 101, thr=0.45)
cloud_sea(420, 520, -40, 220, 102, thr=0.5)

# ---- the saddle with the citadel ------------------------------------------------------------
ytop = smooth(np.interp(xs, [60, 140, 230, 340, 470, 600, 690, 760], [520, 470, 418, 402, 398, 404, 450, 520]), 10)
saddle = YY >= ytop[None, :]
v = 0.55 + (cv.noise(8, 4, 111, 2) - 0.5) * 0.25 - 0.18 * np.clip((XX - 300) / 400, 0, 1)
cv.ramp(saddle, v, [JUNGLE, GREEN, LEAF])
cv.fill(saddle & ~np.roll(saddle, 1, 0), PEACH)

def stone_face(mask, v0, seed, rows=3.0):
    rowl = (YY % rows) < 1
    jit = cv.noise(4, 3, seed, 2)
    v = v0 + (jit - 0.5) * 0.35 - np.where(rowl, 0.18, 0)
    cv.ramp(mask, v, [NIGHT, STONE, GRANITE, PEACH])

def building(x, y, w, h, d, gable=False, thatch=False, seed=0):
    """Roofless Inca room seen from above-left: grass floor, stone walls."""
    dx = d * 0.45
    backf = cv.rect(x + dx, y - d - h, x + w + dx, y - d)                   # inner face of back wall
    floor = cv.poly([(x, y - h), (x + w, y - h), (x + w + dx, y - d), (x + dx, y - d)])
    side = cv.poly([(x, y), (x, y - h), (x + dx, y - h - d), (x + dx, y - d)])
    front = cv.rect(x, y - h, x + w, y)
    stone_face(backf, 0.62, seed)
    cv.ramp(floor, 0.62 + (cv.noise(5, 2, seed + 9, 2) - 0.5) * 0.3, [JUNGLE, GREEN, LEAF])
    cv.fill(cv.poly([(x, y - h), (x + dx, y - d), (x + dx + 2, y - d), (x + 2, y - h)]) & floor, JUNGLE)  # wall shadow
    stone_face(front, 0.45, seed + 1)
    stone_face(side, 0.78, seed + 2)
    cv.fill(cv.lines([(x, y - h), (x + w, y - h)], 1) | cv.lines([(x + dx, y - h - d), (x + w + dx, y - h - d)], 1)
            | cv.lines([(x + w, y - h), (x + w + dx, y - h - d)], 1), GRANITE)
    cv.fill(cv.lines([(x, y - h), (x + dx, y - h - d)], 1), CREAM)
    if w > 24 and (seed % 3 == 0):
        nx = x + w * 0.5
        cv.fill(cv.poly([(nx, y - h + 2), (nx + 2, y - h + 2), (nx + 3, y - 1), (nx - 1, y - 1)]), NIGHT)
    if gable or thatch:
        g = d * 0.8 + 3
        gm = cv.poly([(x, y - h), (x + dx, y - h - d), (x + dx * 0.5, y - h - d * 0.5 - g)])
        stone_face(gm, 0.8, seed + 3)
        gm2 = cv.poly([(x + w, y - h), (x + w + dx, y - h - d), (x + w + dx * 0.5, y - h - d * 0.5 - g)])
        stone_face(gm2, 0.5, seed + 4)
        if thatch:
            rp = [(x - 2, y - h + 1), (x + w + 2, y - h + 1), (x + w + dx * 0.5 + 2, y - h - d * 0.5 - g - 1),
                  (x + dx * 0.5 - 2, y - h - d * 0.5 - g - 1)]
            rm = cv.poly(rp)
            strands = ((XX.astype(int) + (YY.astype(int) // 3)) % 3) == 0
            cv.ramp(rm, 0.66 - 0.15 * (XX - x) / max(w, 1) + np.where(strands, -0.2, 0),
                    [STONE, GRANITE, PEACH, CREAM])
            cv.fill(cv.lines([rp[2], rp[3]], 1), CREAM)
            cv.fill(cv.lines([rp[0], rp[1]], 1), STONE)

def terrace_row(y, x0, x1, riser=4):
    tread = cv.rect(x0, y - 2, x1, y + 1)
    cv.ramp(tread, 0.75 + (cv.noise(6, 2, int(y), 2) - 0.5) * 0.3, [GREEN, LEAF, GRANITE])
    stone_face(cv.rect(x0, y + 1, x1, y + 1 + riser), 0.5, int(y) + 7)

def cluster(rows, seed):
    r = np.random.default_rng(seed)
    nthatch = 0
    for (y, x0, x1, sc) in rows:
        terrace_row(y + 1, x0 - 6, x1 + 8, riser=max(2, int(4 * sc)))
        x = x0 + r.uniform(0, 4)
        while x < x1 - 14 * sc:
            w = r.uniform(14, 32) * sc
            h = r.uniform(5, 8) * sc
            d = h * 1.6 + r.uniform(2, 5) * sc
            if r.random() < 0.18:              # gap: open terrace / stairs
                cv.fill(cv.rect(x + 2, y - 3, x + 6 * sc, y + 3), GRANITE)
                x += r.uniform(8, 16) * sc
                continue
            th = (r.random() < 0.25) and nthatch < 2 and w < 22
            nthatch += th
            building(x, y + r.uniform(-1.5, 1.5), w, h, d, gable=r.random() < 0.4, thatch=th, seed=int(x * 7 + y))
            x += w + r.uniform(3, 8) * sc

# plaza (open grass, centre)
pl = cv.poly([(338, 414), (472, 412), (480, 440), (330, 444)])
cv.ramp(pl, 0.85 + (cv.noise(10, 3, 121, 2) - 0.5) * 0.2, [GREEN, LEAF, GRANITE])
cv.fill(cv.lines([(330, 444), (480, 440)], 2), STONE)

def intihuatana(cx, by):
    for i, (w, hh) in enumerate([(46, 6), (34, 6), (22, 6), (12, 5)]):
        y = by - i * 6
        terrace_row(y, cx - w / 2, cx + w / 2, riser=3)
    cv.fill(cv.rect(cx - 2, by - 31, cx + 3, by - 24), GRANITE)
    cv.fill(cv.rect(cx - 2, by - 31, cx - 1, by - 24), CREAM)

def sun_temple(cx, by, r, h):
    wall = (np.hypot((XX - cx) / r, (YY - (by - h)) / (r * 0.45)) <= 1) | (
        (np.abs(XX - cx) <= r) & (YY >= by - h) & (YY <= by) & (np.hypot((XX - cx) / r, (YY - by) / (r * 0.45)) <= 1))
    body = (np.abs(XX - cx) <= r) & (YY >= by - h) & (YY <= by + r * 0.45 * np.sqrt(np.clip(1 - ((XX - cx) / r) ** 2, 0, 1)))
    stone_face(body, 0.7 - 0.35 * (XX - cx) / r, 191)
    topm = np.hypot((XX - cx) / r, (YY - (by - h)) / (r * 0.45)) <= 1
    cv.ramp(topm, 0.55, [JUNGLE, GREEN, LEAF])
    cv.fill(topm & ~(np.hypot((XX - cx) / (r - 1.5), (YY - (by - h)) / (r * 0.45 - 1.2)) <= 1), GRANITE)
    for wx in (cx - r * 0.45, cx + r * 0.2):
        cv.fill(cv.poly([(wx, by - h + 4), (wx + 2, by - h + 4), (wx + 3, by - h + 9), (wx - 1, by - h + 9)]), NIGHT)

# back rows first, front rows last
intihuatana(604, 408)
cluster([(410, 190, 330, 0.8), (414, 486, 572, 0.8)], 131)
cluster([(428, 168, 322, 0.9), (428, 492, 670, 0.9)], 132)
cluster([(447, 150, 318, 1.0), (446, 500, 690, 1.0)], 133)
sun_temple(222, 452, 14, 12)
cluster([(466, 140, 300, 1.05), (467, 516, 700, 1.05)], 134)
# terraces across the saddle below the plaza
for i, yy in enumerate((452, 461, 471, 482)):
    terrace_row(yy, 318 - i * 4, 512 + i * 6, riser=3 + i)

# ---- foreground terraces + the gorge on the right --------------------------------------------
cloud_sea(470, 620, 500, 860, 141, thr=0.42, rough=18)

edge_x = lambda k: 470 + k * 26                         # where each terrace drops into the gorge
for k in range(7):
    y0 = 478 + k * 18 + k * k * 1.2
    curve = lambda x, y0=y0: y0 + 0.00012 * (x - 520) ** 2 * (1 + k * 0.2)
    yy0 = np.array([curve(x) for x in xs])
    th = 6 + k * 1.6                                      # tread depth grows toward the viewer
    rs = 9 + k * 2.4                                      # riser height
    ex = edge_x(k)
    tread = (YY >= yy0[None, :]) & (YY < yy0[None, :] + th) & (XX < ex)
    riser = (YY >= yy0[None, :] + th) & (YY < yy0[None, :] + th + rs) & (XX < ex + 4)
    cv.ramp(tread, 0.72 + 0.18 * (1 - (YY - yy0[None, :]) / th) + (cv.noise(5, 2, 150 + k, 2) - 0.5) * 0.35
            - 0.1 * XX / W, [JUNGLE, GREEN, LEAF, GRANITE])
    blocks = ((XX.astype(int) + (((YY - yy0[None, :]) // 4).astype(int) % 2) * 5) % 10) < 1
    rowl = ((YY - yy0[None, :] - th) % 4) < 1
    v = 0.55 - 0.18 * (XX / W) + (cv.noise(4, 3, 160 + k, 2) - 0.5) * 0.3
    v = np.where(blocks | rowl, v - 0.22, v)
    v = np.where((YY - yy0[None, :] - th) < 2, v - 0.25, v)            # shadow under the lip
    cv.ramp(riser, v, [NIGHT, STONE, GRANITE, PEACH])

# a llama on a terrace
def llama(x, y, s=1.0, flip=1):
    def P(px, py):
        return (x + flip * px * s, y + py * s)
    body = cv.ellipse(*P(0, -9), 8 * s, 4.5 * s)
    neck = cv.poly([P(4, -11), P(8, -11), P(9, -24), P(6, -24)])
    head = cv.ellipse(*P(9, -24), 3.6 * s, 2.4 * s) | cv.poly([P(9, -26), P(15, -23), P(14, -21), P(9, -22)])
    ears = cv.poly([P(7, -26), P(8, -31), P(9, -26)]) | cv.poly([P(9, -26), P(11, -30), P(11, -25)])
    legs = np.zeros((H, W), bool)
    for lx in (-6, -3, 3, 6):
        legs |= cv.rect(*P(lx, -6), *P(lx + 1.6 * flip, 0)) if flip > 0 else cv.rect(*P(lx + 1.6, -6), *P(lx, 0))
    tail = cv.ellipse(*P(-8.5, -10), 1.8 * s, 2.4 * s)
    m = body | neck | head | ears | legs | tail
    cv.ramp(m, 0.62 + 0.28 * (-(YY - y + 9 * s) / (9 * s)), [STONE, GRANITE, CREAM])
    cv.fill(legs, STONE)
    cv.fill(m & ~np.roll(m, 1, 1) & (YY < y - 6 * s), PEACH)              # sunrise rim
    ex_, ey_ = P(10, -24.5)
    cv.c[int(ey_), int(ex_)] = NIGHT
    cv.darken(cv.ellipse(*P(1, 0.5), 10 * s, 1.6 * s) & ~m, np.full((H, W), 0.9))   # shadow

llama(300, 548, 1.25, flip=1)
llama(212, 513, 0.9, flip=-1)

# low mist drifting across the gorge, in front of everything on the right
mist(560, 30, 0.5, 181, 520, 900)

cv.vignette(1.0)
cv.save(sys.argv[1])
