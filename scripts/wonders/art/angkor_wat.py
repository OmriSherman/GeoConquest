"""Angkor Wat at sunrise over the lotus pond - 1600x1200, exactly 10 colors."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x12, 0x0A, 0x1E),  # 0 NIGHT    silhouettes
    (0x2E, 0x1A, 0x3A),  # 1 PLUM     temple detail in shade
    (0x5A, 0x30, 0x58),  # 2 PURPLE   upper sky
    (0xA8, 0x46, 0x6A),  # 3 MAGENTA  sky, haze
    (0xF0, 0x8A, 0x48),  # 4 ORANGE   sunrise glow, rim light
    (0xFF, 0xD2, 0x7A),  # 5 YELLOW   sun, bright reflections
    (0xFF, 0xF4, 0xDA),  # 6 CREAM    sun core, flower highlights
    (0xE8, 0x9A, 0xB0),  # 7 LOTUS    lotus flowers
    (0x2E, 0x5A, 0x3A),  # 8 PAD      lotus pads
    (0x6E, 0x9A, 0x4A),  # 9 LEAF     sunlit pads and grass
]
NIGHT, PLUM, PURPLE, MAGENTA, ORANGE, YELLOW, CREAM, LOTUS, PAD, LEAF = range(10)
DARKER = {CREAM: YELLOW, YELLOW: ORANGE, ORANGE: MAGENTA, MAGENTA: PURPLE, PURPLE: PLUM, PLUM: NIGHT,
          NIGHT: NIGHT, LOTUS: MAGENTA, LEAF: PAD, PAD: NIGHT}
LIGHTER = {NIGHT: PLUM, PLUM: PURPLE, PURPLE: MAGENTA, MAGENTA: ORANGE, ORANGE: YELLOW, YELLOW: CREAM,
           PAD: LEAF, LOTUS: CREAM}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
ALL = np.ones((H, W), bool)
ONE = np.ones((H, W), np.float32)
rng = np.random.default_rng(16)
WATER = 362                      # water line / mirror axis
SUN = (468.0, 236.0)

# ---- sky ----------------------------------------------------------------------------------
yn = np.clip(YY / WATER, 0, 1)
ds = np.hypot(XX - SUN[0], (YY - SUN[1]) * 1.25)
sky = 0.10 + 0.45 * yn ** 1.3 + 0.38 * np.exp(-ds / 200) + 0.2 * np.exp(-ds / 55)
cv.ramp(ALL, sky + (cv.noise(240, 40, 1) - 0.5) * 0.04, [PLUM, PURPLE, MAGENTA, ORANGE, YELLOW, CREAM])
d = np.hypot(XX - SUN[0], YY - SUN[1])
cv.fill(d <= 21, YELLOW)
cv.fill(d <= 16, CREAM)
CL = [PURPLE, MAGENTA, ORANGE, YELLOW, CREAM]
cv.cloud(92, 260, 860, 9, 61, CL, SUN, 0.58)
cv.cloud(150, -40, 360, 8, 62, CL, SUN, 0.6)
cv.cloud(196, 540, 860, 7, 63, CL, SUN, 0.62)
for bx, by, s in [(300, 120, 4), (316, 113, 3), (330, 124, 3), (286, 129, 2)]:
    for k in range(s + 1):
        cv.c[by - k // 2, bx - s + k] = NIGHT
        cv.c[by - k // 2, bx + s - k] = NIGHT

# ---- far bank: jungle and sugar palms ----------------------------------------------------------
bank = YY >= 336 - 10 * cv.noise(18, 40, 71, 2)
cv.ramp(bank & (YY < WATER), 0.18 + 0.12 * (cv.noise(5, 4, 72, 2) - 0.5), [NIGHT, PLUM, PURPLE])

def sugar_palm(x, base, h, seed):
    r = np.random.default_rng(seed)
    cv.fill(cv.lines([(x, base), (x + r.uniform(-4, 4), base - h)], 2), NIGHT)
    cx, cy = x, base - h
    crown = np.zeros((H, W), bool)
    for a in np.linspace(0, 2 * np.pi, 22, endpoint=False):
        L = r.uniform(9, 14)
        crown |= cv.lines([(cx, cy), (cx + math.cos(a) * L, cy + math.sin(a) * L * 0.8)], 2)
    crown |= cv.ellipse(cx, cy, 6, 5)
    cv.fill(crown, NIGHT)

for (x, h) in [(40, 70), (62, 88), (96, 64), (128, 80), (668, 76), (700, 92), (736, 68), (770, 84), (152, 56), (646, 58)]:
    sugar_palm(x, 352, h, x)

# ---- the temple (backlit silhouette with rim light) ---------------------------------------------
temple = np.zeros((H, W), bool)

def tone(mask, v):
    cv.ramp(mask, np.asarray(v) + (cv.noise(3, 3, 81, 2) - 0.5) * 0.08, [NIGHT, PLUM, PURPLE])

def tower(cx, tip, base, hw, tiers=10):
    """Lotus-bud prang: stacked tiers swelling to a bulb, then tapering to a point."""
    global temple
    t = np.clip((YY - tip) / (base - tip), 0, 1)
    prof = hw * np.sin(np.pi / 2 * np.clip(t / 0.72, 0, 1)) ** 0.75
    prof = np.where(t > 0.72, hw * (1 - 0.10 * (t - 0.72) / 0.28), prof)
    k = t * tiers
    saw = 1 - 0.13 * (k % 1)                       # each tier wider at its bottom ledge
    w = prof * saw
    m = (np.abs(XX - cx) <= w) & (YY >= tip) & (YY <= base)
    tier_line = m & ((k % 1) > 0.86)
    tone(m, 0.32 - 0.18 * np.abs(XX - cx) / np.maximum(w, 1))
    cv.fill(tier_line, NIGHT)
    # antefixes: small flames poking out at each ledge
    for i in range(1, tiers):
        yy = tip + (base - tip) * i / tiers
        ww = hw * np.sin(np.pi / 2 * min(i / tiers / 0.72, 1)) ** 0.75 if i / tiers <= 0.72 else hw * 0.95
        for sx in (-1, 1):
            ax = cx + sx * ww
            sp = cv.poly([(ax, yy), (ax + sx * 2.5, yy - 4), (ax - sx * 1, yy - 2)])
            m |= sp
            cv.fill(sp, NIGHT)
    # sanctuary below the bud, with a little pediment
    sb = cv.rect(cx - hw * 1.15, base, cx + hw * 1.15, base + 16)
    tone(sb, 0.28)
    ped = cv.poly([(cx - hw * 0.55, base + 2), (cx + hw * 0.55, base + 2), (cx, base - 10)])
    tone(ped, 0.34)
    cv.fill(cv.rect(cx - 3, base + 5, cx + 4, base + 16), NIGHT)
    temple |= m | sb | ped

def gallery(x0, x1, y_roof, y_base, roof_h, seed, glow=True):
    """Gallery: curved tiled roof over a colonnade; dawn light shows between the columns."""
    global temple
    span = x1 - x0
    u = (XX - x0) / span
    roof_top = y_roof - roof_h * (1 - 0.25 * (2 * u - 1) ** 2)
    roof = (XX >= x0) & (XX < x1) & (YY >= roof_top) & (YY < y_roof + 3)
    tone(roof, 0.26 + 0.1 * ((YY.astype(int) % 3) == 0))
    body = cv.rect(x0 + 2, y_roof + 3, x1 - 2, y_base)
    tone(body, 0.2)
    if glow:
        cols = ((XX.astype(int) - x0) % 8) < 3
        open_ = body & cols & (YY > y_roof + 8) & (YY < y_base - 5)
        g = 0.25 + 0.55 * np.exp(-np.abs(XX - SUN[0]) / 120)
        cv.ramp(open_, g, [PLUM, PURPLE, MAGENTA, ORANGE])
    cv.fill(cv.rect(x0, y_base - 3, x1, y_base), NIGHT)          # plinth
    temple |= roof | body
    # pavilions with small towers at each end
    for px in (x0 + 10, x1 - 10):
        pav = cv.rect(px - 12, y_roof - roof_h - 8, px + 12, y_base)
        tone(pav, 0.24)
        tp = cv.poly([(px - 9, y_roof - roof_h - 8), (px + 9, y_roof - roof_h - 8), (px, y_roof - roof_h - 30)])
        tone(tp, 0.3)
        temple |= pav | tp

# back to front: top level and its five towers, then the lower galleries
gallery(262, 538, 262, 300, 10, 1)
tower(328, 146, 238, 22, 9)
tower(472, 146, 238, 22, 9)
def sanctuary_platform(cx):
    """Stepped terrace that carries the central tower down onto the top gallery."""
    global temple
    for (hw, y0, y1, v) in ((70, 248, 266, 0.24), (54, 236, 250, 0.28), (42, 226, 238, 0.3)):
        m = cv.rect(cx - hw, y0, cx + hw, y1)
        tone(m, v)
        cv.fill(cv.rect(cx - hw, y0, cx + hw, y0 + 1), PLUM)           # ledge
        cv.fill(cv.rect(cx - hw, y1 - 2, cx + hw, y1), NIGHT)          # shadow under the ledge
        for dx in (-hw * 0.62, hw * 0.62):                             # side doorways
            cv.fill(cv.rect(cx + dx - 2, y0 + 4, cx + dx + 3, y1 - 2), NIGHT)
        temple |= m
    stair = cv.poly([(cx - 9, 266), (cx + 9, 266), (cx + 5, 226), (cx - 5, 226)])
    tone(stair, 0.36)
    for yy in range(228, 266, 3):
        cv.fill(stair & (np.abs(YY - yy) < 0.5), NIGHT)
    temple |= stair

sanctuary_platform(400)
tower(400, 92, 222, 30, 11)
gallery(192, 608, 296, 330, 9, 2)
tower(252, 196, 278, 16, 7)
tower(548, 196, 278, 16, 7)
gallery(110, 690, 330, 358, 8, 3)

# rim light on every edge that faces the rising sun
rim_r = temple & ~np.roll(temple, -1, 1) & (XX < SUN[0] + 200)
rim_l = temple & ~np.roll(temple, 1, 1) & (XX > SUN[0] - 200)
rim_t = temple & ~np.roll(temple, 1, 0)
near = np.exp(-np.hypot(XX - SUN[0], YY - SUN[1]) / 190)
cv.ramp((rim_r & (XX < SUN[0])) | (rim_l & (XX > SUN[0])) | rim_t, 0.3 + 0.7 * near, [MAGENTA, ORANGE, YELLOW, CREAM])

# ---- the pond: the whole scene mirrored, with ripples and the sun's path ---------------------------
pond = YY >= WATER
ys_, xs_ = np.nonzero(pond)
src_y = np.clip(2 * WATER - ys_, 0, H - 1)
calm = np.clip((ys_ - WATER) / 120, 0.15, 1)
wob = ((np.sin(ys_ * 0.5) * 0.9 + np.sin(ys_ * 0.13 + 1.1) * 0.8) * calm).round().astype(int)
cv.c[ys_, xs_] = cv.c[src_y, np.clip(xs_ + wob, 0, W - 1)]
gt = np.clip((YY - WATER) / (H - WATER), 0, 1)
cv.darken(pond, 0.6 + 0.3 * gt)
for _ in range(240):                                           # sun path + glints
    yy = int(WATER + 3 + rng.random() ** 1.3 * (H - WATER - 5))
    spread = 8 + 60 * (yy - WATER) / (H - WATER)
    xx = int(SUN[0] + rng.normal(0, spread))
    ln = int(2 + 7 * rng.random())
    if 0 <= xx < W - ln:
        cv.c[yy, xx:xx + ln] = YELLOW if rng.random() < 0.6 else CREAM
cv.fill(cv.rect(0, WATER, W, WATER + 1), PLUM)

# ---- lotus pads and flowers in the foreground ---------------------------------------------------------
def pad(cx, cy, rx, seed):
    ry = rx * 0.32
    m = cv.ellipse(cx, cy, rx, ry)
    notch = cv.poly([(cx, cy), (cx + rx * 1.1, cy - ry * 0.2), (cx + rx * 1.1, cy + ry * 0.35)])
    m &= ~notch
    v = 0.45 + 0.35 * (-(YY - cy) / ry) * 0.5 + 0.2 * np.exp(-np.abs(XX - SUN[0]) / 200)
    cv.ramp(m, v + (cv.noise(3, 2, seed, 1) - 0.5) * 0.2, [NIGHT, PAD, LEAF, ORANGE])
    cv.fill(m & ~np.roll(m, 1, 0), LEAF)
    cv.fill(m & ~np.roll(m, -1, 0), NIGHT)

def lotus(x, y, s, open_=True):
    cv.fill(cv.lines([(x, y), (x + s * 0.3, y + s * 3.2)], max(1, int(s * 0.3))), PAD)
    if open_:
        for dx, dy, rx, ry in ((0, -s * 0.9, s * 0.45, s * 1.0), (-s * 0.7, -s * 0.5, s * 0.45, s * 0.8),
                               (s * 0.7, -s * 0.5, s * 0.45, s * 0.8), (-s * 1.1, -s * 0.15, s * 0.5, s * 0.45),
                               (s * 1.1, -s * 0.15, s * 0.5, s * 0.45)):
            m = cv.ellipse(x + dx, y + dy, rx, ry)
            cv.ramp(m, 0.55 + 0.3 * (-(YY - y) / (s * 2)), [MAGENTA, LOTUS, CREAM])
        cv.fill(cv.ellipse(x, y - s * 0.2, s * 0.35, s * 0.25), YELLOW)
    else:
        m = cv.ellipse(x, y - s * 0.8, s * 0.5, s * 1.1) & (YY > y - s * 2.0)
        cv.ramp(m, 0.5 + 0.3 * (XX - x) / s, [MAGENTA, LOTUS, CREAM])

for (cx, cy, rx) in [(60, 470, 34), (150, 500, 46), (30, 560, 60), (250, 590, 70), (700, 480, 38), (620, 520, 52),
                     (760, 560, 64), (540, 600, 72), (380, 470, 26), (470, 520, 34)]:
    pad(cx, cy, rx, cx)
for (x, y, s, o) in [(120, 470, 7, True), (200, 545, 9, True), (90, 520, 6, False), (660, 470, 7, True),
                     (720, 520, 9, False), (590, 560, 10, True), (340, 560, 8, False), (40, 590, 9, True)]:
    lotus(x, y, s, o)
# tall leaves and reeds at the very bottom corners
for (x0, sgn) in ((0, 1), (800, -1)):
    for i in range(7):
        bx = x0 + sgn * (6 + i * 14)
        h = 60 + 30 * math.sin(i * 1.7)
        leaf = cv.lines([(bx, 612), (bx + sgn * 10, 612 - h * 0.6), (bx + sgn * 18 + 4 * math.sin(i), 612 - h)], 3)
        cv.fill(leaf, NIGHT)
        cv.fill(leaf & (cv.noise(3, 3, i + 7, 1) > 0.6), PAD)

cv.vignette(1.0)
cv.save(sys.argv[1])
