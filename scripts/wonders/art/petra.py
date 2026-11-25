"""Petra: the Treasury (Al-Khazneh) seen from the Siq - 1600x1200, exactly 10 colors."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x14, 0x0A, 0x0C),  # 0 NIGHT    deepest shade
    (0x3A, 0x16, 0x12),  # 1 DEEPRED  canyon shadow
    (0x6E, 0x2A, 0x1E),  # 2 MAROON   shaded rock
    (0xA8, 0x46, 0x2C),  # 3 RUST     mid rock
    (0xD2, 0x70, 0x4A),  # 4 TERRA    lit rock
    (0xF2, 0xA8, 0x78),  # 5 PEACH    sunlit facade
    (0xFF, 0xE3, 0xB8),  # 6 CREAM    highlights, bright sky
    (0x7F, 0xB4, 0xD8),  # 7 SKY      sliver of sky
    (0xC8, 0x9A, 0x6A),  # 8 SAND     sand floor
    (0x5A, 0x3A, 0x4A),  # 9 DUSK     cool shadow (figures, ground shade)
]
NIGHT, DEEPRED, MAROON, RUST, TERRA, PEACH, CREAM, SKY, SAND, DUSK = range(10)
DARKER = {CREAM: PEACH, PEACH: TERRA, TERRA: RUST, RUST: MAROON, MAROON: DEEPRED, DEEPRED: NIGHT,
          NIGHT: NIGHT, SKY: DUSK, SAND: RUST, DUSK: NIGHT}
LIGHTER = {NIGHT: DEEPRED, DEEPRED: MAROON, MAROON: RUST, RUST: TERRA, TERRA: PEACH, PEACH: CREAM,
           SAND: PEACH, DUSK: MAROON}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
ALL = np.ones((H, W), bool)
ONE = np.ones((H, W), np.float32)
FN = cv.noise(5, 4, 77, 2)                        # carved-stone grain
LIT = [MAROON, RUST, TERRA, PEACH, CREAM]
ROCK = [NIGHT, DEEPRED, MAROON, RUST, TERRA, PEACH]

def swirl(seed, freq=0.10):
    """Petra's banded, swirling sandstone."""
    warp = cv.noise(60, 30, seed, 3) * 7 + cv.noise(14, 10, seed + 1, 2) * 1.5
    return np.sin(YY * freq + XX * 0.012 + warp)

# ---- sky sliver + the cliff the Treasury is carved into ---------------------------------
cv.ramp(ALL, 0.35 + 0.6 * np.clip(YY / 60, 0, 1), [SKY, CREAM])
cliff_top = 34 + 10 * np.sin(XX / 40) + 8 * cv.noise(30, 30, 5, 2)
cliff = YY >= cliff_top
sw = swirl(10)
v = 0.55 + 0.10 * sw + (FN - 0.5) * 0.15 - 0.15 * np.clip((np.abs(XX - 400) - 120) / 200, 0, 1)
cv.ramp(cliff, v, ROCK)

# ---- the Treasury facade -----------------------------------------------------------------
def stone(mask, v):
    cv.ramp(mask, np.asarray(v) + 0.10 + (FN - 0.5) * 0.14, LIT)

def column(cx, y0, y1, r, cap=True, base=True):
    m = cv.rect(cx - r, y0, cx + r + 1, y1)
    u = (XX - cx) / r
    stone(m, 0.62 - 0.28 * u - 0.12 * u * u)
    flute = m & ((XX.astype(int) - int(cx)) % 4 == 0) & (np.abs(u) < 0.8)
    cv.darken(flute, ONE * 0.5)
    if cap:
        cm = cv.rect(cx - r - 3, y0 - 12, cx + r + 4, y0)
        stone(cm, 0.74 - 0.2 * (XX - cx) / (r + 3) + (cv.noise(3, 3, int(cx), 1) - 0.5) * 0.3)
        cv.fill(cv.rect(cx - r - 3, y0 - 12, cx + r + 4, y0 - 11), CREAM)
    if base:
        stone(cv.rect(cx - r - 2, y1 - 6, cx + r + 3, y1), 0.7)

FX0, FX1 = 250, 550
carved = cv.ellipse(400, 330, 205, 300) & cliff
cv.ramp(carved, 0.62 + 0.10 * sw + (FN - 0.5) * 0.15, ROCK)   # sunlit rock the facade is cut into

# lower storey: dark portico behind six columns, with the great doorway
stone(cv.rect(256, 365, 545, 514), 0.10)
cv.fill(cv.rect(384, 400, 417, 514), NIGHT)
stone(cv.rect(380, 396, 421, 400), 0.6)
for sx in (282, 506):                                          # side chambers
    cv.fill(cv.rect(sx, 420, sx + 14, 514), NIGHT)
for cx in (268, 318, 368, 432, 482, 532):
    column(cx, 364, 514, 9)
stone(cv.rect(242, 512, 558, 532), 0.66)                        # steps
for k, yy in enumerate(range(518, 548, 6)):
    stone(cv.rect(238 - k * 4, yy, 562 + k * 4, yy + 6), 0.7 - k * 0.04)
    cv.fill(cv.rect(238 - k * 4, yy, 562 + k * 4, yy + 1), CREAM)

# entablature: cornice, frieze with rosettes, architrave
stone(cv.rect(252, 316, 548, 352), 0.66)
cv.fill(cv.rect(250, 314, 550, 317), CREAM)
for x in range(254, 548, 6):
    cv.fill(cv.rect(x, 318, x + 3, 321), MAROON)               # dentils
for x in range(262, 548, 16):
    cv.fill(cv.ellipse(x, 331, 3, 3), TERRA)
    cv.c[331, x] = CREAM
cv.fill(cv.rect(252, 340, 548, 341), MAROON)
cv.fill(cv.rect(252, 351, 548, 352), MAROON)

# pediment over the central columns
stone(cv.poly([(296, 316), (504, 316), (400, 270)]), 0.62)
stone(cv.poly([(312, 312), (488, 312), (400, 279)]), 0.45)
cv.fill(cv.lines([(296, 315), (400, 269), (504, 315)], 2), CREAM)
for (ax, ay) in ((296, 308), (504, 308), (400, 262)):        # acroteria
    stone(cv.rect(ax - 4, ay, ax + 5, ay + 8), 0.75)

# attic band between the storeys
stone(cv.rect(252, 256, 548, 272), 0.66)
cv.fill(cv.rect(250, 255, 550, 257), CREAM)

# upper storey: side pavilions with half (broken) pediments
for side in (-1, 1):
    x0, x1 = (252, 348) if side < 0 else (452, 548)
    stone(cv.rect(x0 + 12, 160, x1 - 12, 256), 0.22)          # niche
    fx = (x0 + x1) / 2
    fig = cv.ellipse(fx, 178, 6, 7) | cv.poly([(fx - 9, 250), (fx + 9, 250), (fx + 6, 186), (fx - 6, 186)])
    stone(fig, 0.5)                                            # weathered statue
    for cx in (x0 + 9, x1 - 9):
        column(cx, 160, 256, 7)
    stone(cv.rect(x0, 146, x1, 160), 0.72)
    inner = x1 if side < 0 else x0
    outer = x0 if side < 0 else x1
    stone(cv.poly([(outer, 146), (inner, 146), (inner, 116)]), 0.64)
    cv.fill(cv.lines([(outer, 145), (inner, 115)], 2), CREAM)

# central tholos: round kiosk, conical roof, the urn
stone(cv.rect(350, 136, 451, 256), 0.12)
for cx in (362, 386, 414, 438):
    column(cx, 152, 256, 6)
stone(cv.rect(354, 138, 447, 152), 0.74)
cv.fill(cv.rect(352, 136, 449, 138), CREAM)
roof = cv.poly([(356, 137), (444, 137), (400, 98)])
stone(roof, 0.66 - 0.25 * (XX - 400) / 44)
for k in range(1, 5):                                          # roof scales
    yy = 137 - k * 8
    cv.fill(roof & (np.abs(YY - yy) < 0.5), RUST)
stone(cv.rect(394, 90, 407, 99), 0.75)                          # capital
urn = cv.ellipse(400.5, 78, 7, 10) | cv.rect(397, 62, 404, 70)
stone(urn, 0.7 - 0.3 * (XX - 400) / 7)
cv.fill(cv.rect(395, 61, 406, 63), CREAM)

# ---- light: the morning beam + shadow of the Siq wall across the lower left ------------------
line = YY - (230 + 1.9 * (XX - 250))
shadow = line > 0
cv.darken(cliff & shadow, ONE)
cv.darken(cliff & (line > 30), ONE)
cv.darken(cliff & (line > -8) & ~shadow, ONE * 0.5)       # soft edge

# ---- sand floor ----------------------------------------------------------------------------
floor = YY >= 548 + 3 * np.sin(XX / 30)
lit_patch = np.exp(-(((XX - 470) / 190) ** 2 + ((YY - 575) / 40) ** 2))
cv.ramp(floor, 0.25 + 0.65 * lit_patch + (cv.noise(10, 3, 91, 2) - 0.5) * 0.15, [NIGHT, DEEPRED, MAROON, RUST, SAND, PEACH])

# a resting camel and two visitors for scale
def camel(x, y, s=1.0):
    """Couched camel in profile, facing right."""
    P = lambda px, py: (x + px * s, y + py * s)
    body = cv.ellipse(*P(0, -10), 19 * s, 9 * s) & (YY < y - 1 * s)
    hump = cv.ellipse(*P(-3, -18), 9 * s, 7 * s)
    legs = cv.ellipse(*P(-8, -2), 9 * s, 3 * s) | cv.ellipse(*P(10, -2), 8 * s, 3 * s)
    neck = cv.lines([P(15, -13), P(21, -18), P(25, -27), P(28, -34)], int(5 * s))
    head = cv.ellipse(*P(32, -35), 6 * s, 3.2 * s) | cv.ellipse(*P(36, -33), 3 * s, 2.2 * s)
    ear = cv.poly([P(28, -38), P(29, -42), P(31, -38)])
    tail = cv.lines([P(-19, -12), P(-22, -4)], max(1, int(1.5 * s)))
    m = body | hump | legs | neck | head | ear | tail
    v = 0.55 - 0.3 * (XX - x) / (20 * s) - 0.35 * (YY - (y - 30 * s)) / (30 * s) * 0.5
    cv.ramp(m, v, [DEEPRED, MAROON, RUST, TERRA, SAND])
    blanket = cv.ellipse(*P(-3, -17), 10 * s, 5 * s) & m & (YY > y - 21 * s)
    cv.fill(blanket, RUST)
    cv.fill(blanket & ((YY.astype(int) % 3) == 0), CREAM)
    cv.fill(m & ~np.roll(m, 1, 0), PEACH)                                 # sunlit top edge
    cv.c[int(y - 36 * s), int(x + 33 * s)] = NIGHT                         # eye
    cv.darken(cv.ellipse(*P(6, 0), 28 * s, 3 * s) & ~m, ONE * 0.9)

def person(x, y, h, cloak):
    m = cv.ellipse(x, y - h + 2, 2.2, 2.4) | cv.poly([(x - 3, y), (x + 3, y), (x + 2.5, y - h + 4), (x - 2.5, y - h + 4)])
    cv.fill(m, NIGHT)
    cv.fill(m & (YY > y - h + 5) & (XX < x), cloak)
    cv.darken(cv.ellipse(x + 6, y, 7, 1.5) & ~m, ONE * 0.9)

camel(470, 592, 1.45)
person(320, 560, 21, DUSK)
person(336, 562, 20, RUST)

# ---- the Siq: dark swirling canyon walls framing the view -----------------------------------
def siq(pts, side, seed):
    m = cv.poly(pts)
    rows = m.any(1)
    if side < 0:
        edge = np.where(rows, W - 1 - m[:, ::-1].argmax(1), 0)
        d = edge[:, None] - XX
    else:
        edge = np.where(rows, m.argmax(1), W)
        d = XX - edge[:, None]
    rim = np.exp(-np.clip(d, 0, None) / 14)
    v = 0.16 + 0.10 * swirl(seed, 0.13) + 0.42 * rim * (0.6 + 0.4 * np.clip(1 - YY / 600, 0, 1))
    v += (cv.noise(8, 5, seed + 2, 2) - 0.5) * 0.12
    cv.ramp(m, v, ROCK)
    cv.fill(m & (np.abs(d) < 1) & (YY < 520), TERRA)

siq([(0, 0), (160, 0), (196, 44), (222, 120), (210, 200), (236, 290), (226, 380), (248, 470), (232, 560),
     (240, 600), (0, 600)], -1, 31)
siq([(800, 0), (660, 0), (626, 60), (598, 150), (590, 240), (606, 330), (580, 420), (566, 500), (584, 560),
     (576, 600), (800, 600)], 1, 41)

# shafts of dusty light crossing the air
gap = ~(cv.poly([(0, 0), (160, 0), (196, 44), (222, 120), (210, 200), (236, 290), (226, 380), (248, 470), (232, 560), (240, 600), (0, 600)])
        | cv.poly([(800, 0), (660, 0), (626, 60), (598, 150), (590, 240), (606, 330), (580, 420), (566, 500), (584, 560), (576, 600), (800, 600)]))
phase = (XX - 0.52 * YY) % 64
shafts = gap & (phase < 18) & (YY > 120)
cv.remap(shafts, ONE * 0.22 * np.clip((YY - 120) / 200, 0, 1), LIGHTER)

cv.vignette(1.0)
cv.save(sys.argv[1])
