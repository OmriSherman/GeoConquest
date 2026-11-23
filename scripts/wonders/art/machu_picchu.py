"""Machu Picchu on a bright morning - 1600x1200, exactly 10 colors.
Composition follows the classic view from above the citadel: dense ruins with
gabled houses fill the lower half, the plaza and terraces lead to Huayna Picchu."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x0E, 0x1A, 0x1C),  # 0 NIGHT     deepest shade
    (0x1F, 0x4E, 0x8C),  # 1 DEEPBLUE  upper sky, far shaded ranges
    (0x4F, 0x8F, 0xD0),  # 2 SKY       sky, hazy ranges
    (0xF4, 0xF6, 0xF2),  # 3 CLOUD     clouds, brightest stone edges
    (0x5E, 0x8C, 0x86),  # 4 HAZE      hazy blue-green mountains
    (0x1F, 0x4A, 0x2A),  # 5 JUNGLE    dark green
    (0x4C, 0x8A, 0x32),  # 6 GREEN     mid green
    (0xA6, 0xC8, 0x4A),  # 7 LEAF      sunlit grass
    (0x7A, 0x6A, 0x52),  # 8 STONE     stone in shade
    (0xC8, 0xB0, 0x8A),  # 9 GRANITE   sunlit stone
]
NIGHT, DEEPBLUE, SKY, CLOUD, HAZE, JUNGLE, GREEN, LEAF, STONE, GRANITE = range(10)
DARKER = {CLOUD: GRANITE, SKY: DEEPBLUE, DEEPBLUE: NIGHT, NIGHT: NIGHT, HAZE: JUNGLE,
          LEAF: GREEN, GREEN: JUNGLE, JUNGLE: NIGHT, GRANITE: STONE, STONE: NIGHT}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
ALL = np.ones((H, W), bool)
rng = np.random.default_rng(12)
STN = cv.noise(3, 2, 500, 2)          # shared stone grain
GRN = cv.noise(4, 2, 501, 2)          # shared grass grain
STONE_RAMP = [NIGHT, STONE, GRANITE, CLOUD]
GRASS_RAMP = [NIGHT, JUNGLE, GREEN, LEAF]

# ---- sky + clouds ---------------------------------------------------------------------
sky = 0.12 + 0.75 * np.clip(YY / 260, 0, 1) ** 1.2 + (cv.noise(260, 60, 1) - 0.5) * 0.05
cv.ramp(ALL, sky, [DEEPBLUE, SKY, HAZE])

def cumulus(puffs, seed):
    m = np.zeros((H, W), bool)
    for (cx, cy, r) in puffs:
        m |= cv.ellipse(cx, cy, r, r * 0.8)
    base = max(cy + r * 0.45 for cx, cy, r in puffs)
    m &= YY <= base
    top = np.full(W, H, np.int32)
    ys_, xs_ = np.nonzero(m)
    np.minimum.at(top, xs_, ys_)
    dt = YY - top[None, :]
    v = 0.95 - 0.5 * np.clip(dt / 26, 0, 1) - 0.2 * np.clip((XX - 300) / 400, 0, 1) + (cv.noise(8, 6, seed) - 0.5) * 0.25
    cv.ramp(m, v, [SKY, CLOUD])

def cloud_band(x0, x1, ybase, hmax, n, seed):
    r = np.random.default_rng(seed)
    puffs = []
    for i in range(n):
        x = r.uniform(x0, x1)
        edge = min(x - x0, x1 - x) / ((x1 - x0) / 2)
        rad = r.uniform(5, 9) + hmax * edge * r.uniform(0.5, 1.0)
        puffs.append((x, ybase - rad * 0.5 - r.uniform(0, hmax * 0.35 * edge), rad))
    cumulus(puffs, seed)

cloud_band(110, 420, 70, 26, 40, 11)
cloud_band(540, 690, 44, 16, 18, 12)
cloud_band(370, 470, 104, 8, 10, 13)

# ---- mountains ----------------------------------------------------------------------------
def outline_mask(pts, jag=0.0, seed=0):
    m = cv.poly(pts)
    if jag:
        n = cv.noise(4, 4, seed, 2)
        edge = m ^ np.roll(m, 3, 1)
        m &= ~(edge & (n > 1 - jag))
    return m

HF = 0.55 * cv.noise(46, 30, 900, 3) + 0.30 * cv.noise(14, 22, 901, 2) + 0.15 * cv.noise(5, 9, 902, 2)
GX = np.roll(HF, -1, 1) - np.roll(HF, 1, 1)
GY = np.roll(HF, -1, 0) - np.roll(HF, 1, 0)
RELIEF = np.clip(-GX * 9 - GY * 4, -1, 1)          # light from the upper left

def mountain(m, v0, ramp, seed, streak=0.25, lit=0.3, rock=0.0, relief=0.35):
    rows = m.any(1)
    first = np.where(rows, m.argmax(1), 0)
    last = np.where(rows, W - 1 - m[:, ::-1].argmax(1), 0)
    cx = (first + last) / 2.0
    hw = np.maximum((last - first) / 2.0, 1)
    u = (XX - cx[:, None]) / hw[:, None]                   # -1 left .. 1 right
    st = cv.noise(2.5, 24, seed, 2)                        # vertical ravines
    cr = cv.noise(3, 3, seed + 1, 2)                       # tree crowns
    v = v0 - lit * u + relief * RELIEF + (st - 0.5) * streak + (cr - 0.5) * 0.22
    cv.ramp(m, v, ramp)
    if rock:
        rk = m & (cv.noise(3, 16, seed + 2, 2) > 1 - rock) & (RELIEF < 0.3)
        cv.ramp(rk, 0.42 - 0.3 * u + 0.3 * RELIEF + (st - 0.5) * 0.4, STONE_RAMP)

# far blue ranges
far = outline_mask([(0, 150), (60, 128), (110, 120), (170, 140), (230, 172), (300, 196), (360, 170),
                    (410, 140), (470, 110), (540, 80), (620, 58), (700, 40), (760, 26), (800, 22), (800, 600), (0, 600)])
mountain(far, 0.40, [DEEPBLUE, SKY, HAZE], 21, streak=0.2, lit=0.15, relief=0.45)
# right massif (green, behind Huayna Picchu)
rmas = outline_mask([(520, 200), (580, 186), (640, 176), (690, 186), (740, 206), (800, 228), (800, 600), (520, 600)], 0.2, 31)
mountain(rmas, 0.34, [NIGHT, JUNGLE, GREEN, LEAF], 32, streak=0.25, lit=0.2, rock=0.1, relief=0.5)
# left green mountain wall
lmnt = outline_mask([(0, 92), (40, 96), (90, 112), (140, 140), (190, 178), (240, 226), (290, 282), (330, 332),
                     (330, 600), (0, 600)], 0.2, 41)
mountain(lmnt, 0.40, [NIGHT, JUNGLE, GREEN, LEAF], 42, streak=0.25, lit=0.15, rock=0.08, relief=0.55)

# Huayna Picchu
hp = outline_mask([(300, 330), (330, 262), (358, 206), (384, 160), (404, 120), (424, 84), (442, 52), (456, 28),
                   (468, 12), (480, 8), (494, 20), (506, 46), (518, 80), (534, 118), (556, 156), (582, 186),
                   (612, 214), (650, 246), (700, 290), (720, 340), (300, 360)], 0.35, 51)
mountain(hp, 0.40, GRASS_RAMP, 52, streak=0.35, lit=0.32, rock=0.3, relief=0.45)
for k, yy in enumerate(range(20, 48, 4)):                  # tiny summit terraces
    cv.fill(cv.rect(466 - k * 1.6, yy, 484 + k * 1.2, yy + 1) & hp, GRANITE if k % 2 else LEAF)
# middle knoll and Huchuy Picchu in front
kn = outline_mask([(318, 340), (330, 262), (344, 214), (358, 190), (372, 200), (392, 238), (412, 290), (420, 340)], 0.3, 61)
mountain(kn, 0.48, GRASS_RAMP, 62, streak=0.3, lit=0.3, rock=0.08, relief=0.4)
hu = outline_mask([(150, 340), (182, 262), (204, 210), (222, 178), (236, 166), (250, 172), (266, 196),
                   (288, 236), (312, 282), (330, 340)], 0.3, 71)
mountain(hu, 0.48, GRASS_RAMP, 72, streak=0.3, lit=0.32, rock=0.12, relief=0.4)

# ---- valley slopes falling away around the citadel ridge ------------------------------------------
vs = outline_mask([(0, 300), (120, 330), (260, 300), (420, 290), (600, 280), (800, 300), (800, 600), (0, 600)])
mountain(vs, 0.32, [NIGHT, JUNGLE, GREEN, LEAF], 95, streak=0.3, lit=0.1, rock=0.05, relief=0.6)

# ---- 3D projection: camera turned 17 degrees, looking down the citadel's long axis ----------------
S0, Z0, YH, HC = 6.0, 120.0, -87.0, 114.5
YAW = np.radians(17.0)
CA, SA = np.cos(YAW), np.sin(YAW)
XC0, ZC0 = -14.0, -19.0
LIGHT = np.array([-0.82, -0.57])            # toward the sun, in camera (x, z): left and in front

def cam(X, Z):
    return X * CA - Z * SA - XC0, X * SA + Z * CA - ZC0

def SC(Z_cam):
    return S0 * Z0 / (Z_cam + Z0)

def P(X, Z, Y=0.0):
    xr, zr = cam(X, Z)
    s = SC(zr)
    return (400 + xr * s, YH + (HC - Y) * s)

def quad(*pts):
    return cv.poly([P(*p) for p in pts])

def nrm(nx, nz):
    return np.array([nx * CA - nz * SA, nx * SA + nz * CA])

def faces_cam(X, Z, nx, nz):
    xr, zr = cam(X, Z)
    n = nrm(nx, nz)
    return n[0] * (0 - xr) + n[1] * (-Z0 - zr) > 0

def shade(nx, nz, base=0.5):
    return base + 0.32 * float(nrm(nx, nz) @ LIGHT)

def stone(mask, v0, rows=3):
    rowl = (YY.astype(int) % rows) == 0
    jt = ((XX.astype(int) + ((YY.astype(int) // rows) % 2) * 3) % 6) == 0
    v = v0 + (STN - 0.5) * 0.35 - np.where(rowl | jt, 0.16, 0)
    cv.ramp(mask, v, [NIGHT, STONE, GRANITE])

def grass(mask, v0):
    cv.ramp(mask, v0 + (GRN - 0.5) * 0.3, GRASS_RAMP)

ONE = np.ones((H, W), np.float32)
SH = -LIGHT                                  # shadows fall away from the sun (camera coords)
def to_world(dx, dz):
    return dx * CA + dz * SA, -dx * SA + dz * CA

def cast_shadow(X0, X1, Za, Zb, h, base=0.0, k=0.75):
    ox, oz = to_world(*(SH * h * k))
    pts = [(X0, Za), (X1, Za), (X1, Zb), (X0, Zb)]
    m = quad(*[(x + ox, z + oz, base) for x, z in pts])
    for (x1, z1), (x2, z2) in zip(pts, pts[1:] + pts[:1]):
        m |= quad((x1, z1, base), (x2, z2, base), (x2 + ox, z2 + oz, base), (x1 + ox, z1 + oz, base))
    cv.darken(m, ONE * 0.9)

def room(X0, X1, Za, Zb, h, base=0.0, t=0.6, gable=False, door=False):
    top = base + h
    mid = (X0 + X1) / 2
    gh = (X1 - X0) * 0.8
    cast_shadow(X0, X1, Za, Zb, h + (gh * 0.5 if gable else 0), base)
    grass(quad((X0, Za, base), (X1, Za, base), (X1, Zb, base), (X0, Zb, base)), 0.36)
    # inner faces (back wall, side walls) where they face the camera
    stone(quad((X0, Zb - t, base), (X1, Zb - t, base), (X1, Zb - t, top), (X0, Zb - t, top)), shade(0, -1, 0.55))
    if gable:
        stone(quad((X0, Zb - t, top), (X1, Zb - t, top), (mid, Zb - t, top + gh)), shade(0, -1, 0.5))
    for xw, nx in ((X0 + t, 1), (X1 - t, -1)):
        if faces_cam(xw, (Za + Zb) / 2, nx, 0):
            stone(quad((xw, Za, base), (xw, Zb, base), (xw, Zb, top), (xw, Za, top)), shade(nx, 0, 0.52))
    cv.darken(quad((X0 + t, Za + t, base), (X0 + t + h * 0.5, Za + t, base), (X0 + t + h * 0.5, Zb - t, base),
                   (X0 + t, Zb - t, base)), ONE * 0.8)
    # outer faces
    stone(quad((X0, Za, base), (X1, Za, base), (X1, Za, top), (X0, Za, top)), shade(0, -1, 0.5))
    for xw, nx in ((X0, -1), (X1, 1)):
        if faces_cam(xw, (Za + Zb) / 2, nx, 0):
            stone(quad((xw, Za, base), (xw, Zb, base), (xw, Zb, top), (xw, Za, top)), shade(nx, 0, 0.5))
    if gable:
        stone(quad((X0, Za, top), (X1, Za, top), (mid, Za, top + gh)), shade(0, -1, 0.56))
        wx, wy = P(mid, Za, top + gh * 0.3)
        sc = SC(cam(mid, Za)[1])
        cv.fill(cv.poly([(wx - 0.35 * sc, wy - 0.55 * sc), (wx + 0.35 * sc, wy - 0.55 * sc),
                         (wx + 0.5 * sc, wy + 0.45 * sc), (wx - 0.5 * sc, wy + 0.45 * sc)]), NIGHT)
    if door:
        sc = SC(cam(mid, Za)[1])
        dx_, dy_ = P(mid, Za, base)
        cv.fill(cv.poly([(dx_ - 0.55 * sc, dy_), (dx_ + 0.55 * sc, dy_), (dx_ + 0.38 * sc, dy_ - h * 0.62 * sc),
                         (dx_ - 0.38 * sc, dy_ - h * 0.62 * sc)]), NIGHT)
    tops = (quad((X0, Za, top), (X1, Za, top), (X1, Za + t, top), (X0, Za + t, top))
            | quad((X0, Zb - t, top), (X1, Zb - t, top), (X1, Zb, top), (X0, Zb, top))
            | quad((X0, Za, top), (X0 + t, Za, top), (X0 + t, Zb, top), (X0, Zb, top))
            | quad((X1 - t, Za, top), (X1, Za, top), (X1, Zb, top), (X1 - t, Zb, top)))
    cv.ramp(tops, 0.78 + (STN - 0.5) * 0.3, [STONE, GRANITE])
    if gable:
        cv.fill(cv.lines([P(X0, Za, top), P(mid, Za, top + gh)], 1), GRANITE)

def platform(X0, X1, Za, Zb, base, rise):
    stone(quad((X0, Za, base), (X1, Za, base), (X1, Za, base + rise), (X0, Za, base + rise)), shade(0, -1, 0.46))
    for xw, nx in ((X0, -1), (X1, 1)):
        if faces_cam(xw, (Za + Zb) / 2, nx, 0):
            stone(quad((xw, Za, base), (xw, Zb, base), (xw, Zb, base + rise), (xw, Za, base + rise)), shade(nx, 0, 0.46))
    grass(quad((X0, Za, base + rise), (X1, Za, base + rise), (X1, Zb, base + rise), (X0, Zb, base + rise)), 0.6)
    cv.fill(cv.lines([P(X0, Za, base + rise), P(X1, Za, base + rise)], 1), GRANITE)

def tree(X, Z, hgt, r, base=0.0):
    sc = SC(cam(X, Z)[1])
    bx, by = P(X, Z, base)
    cast_shadow(X - r * 0.3, X + r * 0.3, Z - r * 0.3, Z + r * 0.3, hgt, base, k=0.6)
    cv.fill(cv.lines([(bx, by), (bx + sc * 0.3, by - hgt * sc)], max(1, int(sc * 0.4))), NIGHT)
    cx, cy = bx + sc * 0.3, by - hgt * sc
    m = cv.ellipse(cx, cy, r * sc, r * sc * 0.5) | cv.ellipse(cx - r * sc * 0.45, cy + r * sc * 0.25, r * sc * 0.55, r * sc * 0.35)
    grass(m, 0.5 - 0.4 * (YY - cy) / (r * sc) - 0.15 * (XX - cx) / (r * sc))


def thatch(mask, v0, along_x):
    """Steep straw roof: strands run down the slope."""
    if along_x:
        strands = ((XX.astype(int) * 3 + YY.astype(int)) % 4) == 0
    else:
        strands = ((XX.astype(int) + YY.astype(int) * 3) % 4) == 0
    v = v0 - 0.12 + (STN - 0.5) * 0.3 - np.where(strands, 0.25, 0)
    cv.ramp(mask, v, [NIGHT, JUNGLE, STONE, GRANITE])

def niche(X, Z, Y, w, hgt, along_x=True):
    """Trapezoid Inca niche/window on a wall facing -Z (along_x) or +-X."""
    if along_x:
        pts = [(X - w * 0.35, Z, Y + hgt), (X + w * 0.35, Z, Y + hgt), (X + w * 0.5, Z, Y), (X - w * 0.5, Z, Y)]
    else:
        pts = [(X, Z - w * 0.35, Y + hgt), (X, Z + w * 0.35, Y + hgt), (X, Z + w * 0.5, Y), (X, Z - w * 0.5, Y)]
    cv.fill(quad(*pts), NIGHT)

def house_z(X0, X1, Za, Zb, h, base=0.0, roof=False, t=0.5):
    """Long axis along Z: pointed gables at the front (Za) and back (Zb)."""
    top, mid, gh = base + h, (X0 + X1) / 2, (X1 - X0) * 0.62
    cast_shadow(X0, X1, Za, Zb, h + gh * 0.5, base)
    if not roof:
        grass(quad((X0, Za, base), (X1, Za, base), (X1, Zb, base), (X0, Zb, base)), 0.32)
        stone(quad((X0, Zb - t, base), (X1, Zb - t, base), (X1, Zb - t, top), (X0, Zb - t, top)), shade(0, -1, 0.5))
        stone(quad((X0, Zb - t, top), (X1, Zb - t, top), (mid, Zb - t, top + gh)), shade(0, -1, 0.46))
        niche(mid, Zb - t, top + gh * 0.2, 0.7, 0.9)
        for xw, nx in ((X0 + t, 1), (X1 - t, -1)):
            if faces_cam(xw, (Za + Zb) / 2, nx, 0):
                stone(quad((xw, Za, base), (xw, Zb, base), (xw, Zb, top), (xw, Za, top)), shade(nx, 0, 0.5))
    for xw, nx in ((X0, -1), (X1, 1)):
        if faces_cam(xw, (Za + Zb) / 2, nx, 0):
            m = quad((xw, Za, base), (xw, Zb, base), (xw, Zb, top), (xw, Za, top))
            stone(m, shade(nx, 0, 0.5))
            for zz in np.arange(Za + 1.5, Zb - 1, 2.2):
                niche(xw, zz, base + h * 0.45, 0.6, 0.9, along_x=False)
    if roof:
        o = 0.35
        planes = [((X0 - o, Za - o, top), (X0 - o, Zb + o, top), (mid, Zb + o, top + gh), (mid, Za - o, top + gh), -1),
                  ((X1 + o, Za - o, top), (X1 + o, Zb + o, top), (mid, Zb + o, top + gh), (mid, Za - o, top + gh), 1)]
        planes.sort(key=lambda pl: faces_cam(mid + pl[4] * 2, (Za + Zb) / 2, pl[4], 0))
        for a, b, c, d, nx in planes:
            thatch(quad(a, b, c, d), shade(nx, 0, 0.5) + 0.1, along_x=False)
        cv.fill(cv.lines([P(mid, Za - o, top + gh), P(mid, Zb + o, top + gh)], 1), STONE)
    # front wall + front gable
    stone(quad((X0, Za, base), (X1, Za, base), (X1, Za, top), (X0, Za, top)), shade(0, -1, 0.5))
    stone(quad((X0, Za, top), (X1, Za, top), (mid, Za, top + gh)), shade(0, -1, 0.56))
    niche(mid, Za, top + gh * 0.22, 0.7, 0.9)
    cv.fill(quad((mid - 0.55, Za, base), (mid + 0.55, Za, base), (mid + 0.4, Za, base + h * 0.7), (mid - 0.4, Za, base + h * 0.7)), NIGHT)
    if not roof:
        tops = (quad((X0, Za, top), (X0 + t, Za, top), (X0 + t, Zb, top), (X0, Zb, top))
                | quad((X1 - t, Za, top), (X1, Za, top), (X1, Zb, top), (X1 - t, Zb, top)))
        cv.ramp(tops, 0.8 + (STN - 0.5) * 0.3, [STONE, GRANITE])
    cv.fill(cv.lines([P(X0, Za, top), P(mid, Za, top + gh)], 1), GRANITE)

def house_x(X0, X1, Za, Zb, h, base=0.0, roof=False, t=0.5):
    """Long axis along X: gables on the left (X0) and right (X1) ends."""
    top, midz, gh = base + h, (Za + Zb) / 2, (Zb - Za) * 0.62
    cast_shadow(X0, X1, Za, Zb, h + gh * 0.5, base)
    if not roof:
        grass(quad((X0, Za, base), (X1, Za, base), (X1, Zb, base), (X0, Zb, base)), 0.32)
        stone(quad((X0, Zb - t, base), (X1, Zb - t, base), (X1, Zb - t, top), (X0, Zb - t, top)), shade(0, -1, 0.5))
        for zz in np.arange(X0 + 1.6, X1 - 1, 2.3):
            niche(zz, Zb - t, base + h * 0.4, 0.6, 1.0)
    for xw, nx in ((X0, -1), (X1, 1)):
        side_in = (xw + t * (-nx), nx * -1)
        if not roof and faces_cam(xw - nx * t, midz, -nx, 0):
            stone(quad((xw - nx * t, Za, base), (xw - nx * t, Zb, base), (xw - nx * t, Zb, top), (xw - nx * t, Za, top),
                       ), shade(-nx, 0, 0.5))
            stone(quad((xw - nx * t, Za, top), (xw - nx * t, Zb, top), (xw - nx * t, midz, top + gh)), shade(-nx, 0, 0.46))
    if roof:
        o = 0.35
        back = quad((X0 - o, Zb + o, top), (X1 + o, Zb + o, top), (X1 + o, midz, top + gh), (X0 - o, midz, top + gh))
        thatch(back, 0.42, along_x=True)
        front = quad((X0 - o, Za - o, top), (X1 + o, Za - o, top), (X1 + o, midz, top + gh), (X0 - o, midz, top + gh))
        thatch(front, 0.6, along_x=True)
        cv.fill(cv.lines([P(X0 - o, midz, top + gh), P(X1 + o, midz, top + gh)], 1), STONE)
    for xw, nx in ((X0, -1), (X1, 1)):
        if faces_cam(xw, midz, nx, 0):
            stone(quad((xw, Za, base), (xw, Zb, base), (xw, Zb, top), (xw, Za, top)), shade(nx, 0, 0.5))
            stone(quad((xw, Za, top), (xw, Zb, top), (xw, midz, top + gh)), shade(nx, 0, 0.54))
            niche(xw, midz, top + gh * 0.22, 0.7, 0.9, along_x=False)
            cv.fill(cv.lines([P(xw, Za, top), P(xw, midz, top + gh)], 1), GRANITE)
    stone(quad((X0, Za, base), (X1, Za, base), (X1, Za, top), (X0, Za, top)), shade(0, -1, 0.5))
    for zz in np.arange(X0 + 1.6, X1 - 1, 2.3):
        niche(zz, Za, base + h * 0.4, 0.6, 1.0)
    if not roof:
        tops = (quad((X0, Za, top), (X1, Za, top), (X1, Za + t, top), (X0, Za + t, top))
                | quad((X0, Zb - t, top), (X1, Zb - t, top), (X1, Zb, top), (X0, Zb, top)))
        cv.ramp(tops, 0.8 + (STN - 0.5) * 0.3, [STONE, GRANITE])

def wall(X0, X1, Za, Zb, h, base=0.0):
    """Free-standing enclosure wall segment (axis-aligned box)."""
    top = base + h
    for xw, nx in ((X0, -1), (X1, 1)):
        if faces_cam(xw, (Za + Zb) / 2, nx, 0):
            stone(quad((xw, Za, base), (xw, Zb, base), (xw, Zb, top), (xw, Za, top)), shade(nx, 0, 0.5))
    stone(quad((X0, Za, base), (X1, Za, base), (X1, Za, top), (X0, Za, top)), shade(0, -1, 0.5))
    cv.ramp(quad((X0, Za, top), (X1, Za, top), (X1, Zb, top), (X0, Zb, top)), 0.8 + (STN - 0.5) * 0.3, [STONE, GRANITE])

def compound(X0, X1, Za, Zb, base, seed):
    """Walled kancha: outer wall, courtyard, 2-3 gabled houses inside."""
    r = np.random.default_rng(seed)
    t, hw = 0.9, r.uniform(2.3, 2.8)
    cast_shadow(X0, X1, Za, Zb, hw, base)
    cv.ramp(quad((X0, Za, base), (X1, Za, base), (X1, Zb, base), (X0, Zb, base)), 0.5 + (STN - 0.5) * 0.3,
            [JUNGLE, STONE, GRANITE] if r.random() < 0.5 else GRASS_RAMP)
    wall(X0, X1, Zb - t, Zb, hw, base)                                  # back wall
    hd = r.uniform(4.2, 5.0)
    roofed = r.random() < 0.35
    # house along the back
    house_x(X0 + t, X1 - t - (r.uniform(0, 3) if r.random() < 0.5 else 0), Zb - t - hd, Zb - t,
            hw + r.uniform(0.6, 1.2), base, roof=roofed)
    # house along the left side
    if r.random() < 0.8:
        house_z(X0 + t, X0 + t + hd, Za + t + 1.5, Zb - t - hd - 0.6, hw + r.uniform(0.6, 1.2), base, roof=r.random() < 0.3)
    # house along the right side
    if r.random() < 0.5 and X1 - X0 > 16:
        house_z(X1 - t - hd, X1 - t, Za + t + 1.5, Zb - t - hd - 0.6, hw + r.uniform(0.6, 1.0), base, roof=r.random() < 0.3)
    wall(X0, X0 + t, Za, Zb, hw, base)                                  # side walls
    wall(X1 - t, X1, Za, Zb, hw, base)
    gate = X0 + (X1 - X0) * r.uniform(0.35, 0.65)                       # front wall with a gate
    wall(X0, gate - 1.0, Za, Za + t, hw * 0.85, base)
    wall(gate + 1.0, X1, Za, Za + t, hw * 0.85, base)
    cv.fill(cv.lines([P(gate - 1.0, Za, base + hw * 0.85), P(gate + 1.0, Za, base + hw * 0.85)], 2), STONE)

# the ridge top the citadel stands on
ground = quad((-120, -40), (84, -40), (90, 40), (78, 92), (10, 104), (-76, 100), (-118, 50))
grass(ground, 0.48)
edge = ground & ~np.roll(ground, 2, 0)
cv.fill(edge, GRANITE)

items = []
def depth_key(X0, X1, Za, Zb):
    return max(cam(x, z)[1] for x in (X0, X1) for z in (Za, Zb))

def block(Xa, Xb, Za, depth, base, gable_p=0.3, narrow=False, hmin=2.0, hmax=3.2, seed=0, plat=0.9, alley=0.22, rooms=True):
    r = np.random.default_rng(seed)
    items.append((depth_key(Xa, Xb, Za, Za + depth) + 0.5, "plat",
                  dict(X0=Xa - 1, X1=Xb + 1, Za=Za - 1, Zb=Za + depth + 1, base=base - plat, rise=plat)))
    if not rooms:
        return
    X = Xa
    while X < Xb - 2.5:
        w = r.uniform(3.4, 4.6) if narrow else r.uniform(4, 9)
        if r.random() < alley:
            X += r.uniform(2, 6)
            continue
        d = depth * r.uniform(0.7, 1.0)
        za = Za + (depth - d) * r.random()
        x1 = min(X + w, Xb)
        items.append((depth_key(X, x1, za, za + d), "room",
                      dict(X0=X, X1=x1, Za=za, Zb=za + d, h=r.uniform(hmin, hmax), base=base,
                           gable=r.random() < gable_p, door=r.random() < 0.35)))
        X += w + (0 if r.random() < 0.55 else r.uniform(0.5, 1.5))

# agricultural terraces at the far end, climbing toward Huchuy Picchu
for i in range(8):
    Z = 92 - i * 5
    items.append((depth_key(-72, -20, Z, Z + 5) + 1, "plat",
                  dict(X0=-76 + i * 2.5, X1=-26 + i * 1.5, Za=Z, Zb=Z + 5, base=(8 - i) * 1.3 + 1, rise=1.3)))
# west quarter: walled compounds on stepped terraces, split by alleys
def quarter(Xa, Xb, rows, seed, base0, dbase):
    r = np.random.default_rng(seed)
    for k, (Z, depth) in enumerate(rows):
        base = base0 + k * dbase
        items.append((depth_key(Xa, Xb, Z, Z + depth) + 0.5, "plat",
                      dict(X0=Xa - 1.5, X1=Xb + 1.5, Za=Z - 1.5, Zb=Z + depth + 1, base=base - 1.0, rise=1.0)))
        X = Xa
        while X < Xb - 10:
            w = r.uniform(14, 22)
            x1 = min(X + w, Xb)
            if x1 - X >= 10:
                items.append((depth_key(X, x1, Z, Z + depth), "compound", dict(X0=X, X1=x1, Za=Z, Zb=Z + depth, base=base, seed=int(r.integers(1e6)))))
            X = x1 + r.uniform(1.8, 3.0)

quarter(-112, -44, [(44, 15), (25, 15), (6, 15), (-13, 15), (-32, 15)], 41, 1.8, -0.3)
# rows of gabled houses between the west quarter and the plaza (some thatched)
rr = np.random.default_rng(61)
for k, Z in enumerate(range(44, -36, -12)):
    items.append((depth_key(-40, -5, Z, Z + 10) + 0.5, "plat", dict(X0=-41, X1=-4, Za=Z - 1, Zb=Z + 10.5, base=-0.4, rise=1.0)))
    X = -40.0
    while X < -9:
        w = rr.uniform(4.0, 5.0)
        items.append((depth_key(X, X + w, Z, Z + 9) + 0.01 * X, "house_z",
                      dict(X0=X, X1=X + w, Za=Z, Zb=Z + rr.uniform(8, 9.5), h=rr.uniform(2.6, 3.2), base=0.6, roof=rr.random() < 0.25)))
        X += w + rr.uniform(1.3, 2.6)
# east quarter: compounds on terraces stepping down toward the gorge
quarter(22, 76, [(76, 14), (58, 15), (40, 15), (22, 15), (4, 15), (-14, 14)], 81, 2.6, -0.3)

# the plaza: long lawn on stepped levels, with its lone trees
for k, (za, zb, b) in enumerate([(55, 82, 0.4), (25, 55, -0.3), (-5, 25, -1.0), (-32, -5, -1.7)]):
    items.append((depth_key(0, 16, za, zb) + 0.3, "lawn", dict(za=za, zb=zb, b=b)))
items.append((depth_key(4, 8, 70, 74) - 0.2, "tree", dict(X=6, Z=72, hgt=7, r=2.2, base=0.4)))
items.append((depth_key(10, 14, 4, 8) - 0.2, "tree", dict(X=12, Z=6, hgt=8, r=2.4, base=-1.0)))

items.sort(key=lambda it: -it[0])
for key, kind, kw in items:
    if kind == "room":
        room(**kw)
    elif kind == "compound":
        compound(**kw)
    elif kind == "house_z":
        house_z(**kw)
    elif kind == "plat":
        platform(**kw)
    elif kind == "lawn":
        za, zb, b = kw["za"], kw["zb"], kw["b"]
        platform(-1, 17, za, zb, b - 0.8, 0.8)
        lawn = quad((0, za, b), (16, za, b), (16, zb, b), (0, zb, b))
        cv.ramp(lawn, 0.8 + (GRN - 0.5) * 0.2, GRASS_RAMP)
    elif kind == "tree":
        tree(**kw)

# ---- foreground boulders + vignette ------------------------------------------------------------
def boulder(cx, cy, rx, ry, seed):
    n = cv.noise(5, 4, seed, 2)
    m = cv.ellipse(cx, cy, rx, ry) & ((n > 0.25) | cv.ellipse(cx, cy, rx * 0.8, ry * 0.8))
    m &= YY < cy + ry * 0.6
    v = 0.55 - 0.45 * (YY - cy) / ry - 0.15 * (XX - cx) / rx + (n - 0.5) * 0.3
    cv.ramp(m, v, STONE_RAMP)

boulder(30, 590, 60, 26, 81)
boulder(120, 602, 50, 22, 82)
boulder(-10, 520, 40, 30, 83)

cv.vignette(0.7)
cv.save(sys.argv[1])
