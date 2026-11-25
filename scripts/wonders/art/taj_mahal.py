"""Taj Mahal at pre-dawn - 1600x1200, exactly 10 colors."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x0E, 0x0B, 0x24),  # 0 NIGHT    top sky, deepest shade
    (0x2B, 0x21, 0x50),  # 1 VIOLET   upper sky, marble deep shade
    (0x5E, 0x3A, 0x6E),  # 2 MAUVE    mid sky, marble shadow
    (0xC2, 0x60, 0x7E),  # 3 PINK     low sky, marble mid-shade
    (0xF2, 0xA0, 0x7A),  # 4 PEACH    horizon glow, brass finials
    (0xF7, 0xD2, 0xC4),  # 5 BLUSH    lit marble
    (0xFF, 0xF8, 0xF0),  # 6 WHITE    brightest marble, moon, stars
    (0x10, 0x2C, 0x2A),  # 7 CYPRESS  dark foliage
    (0x2F, 0x5A, 0x48),  # 8 GREEN    lit foliage, lawn
    (0x8A, 0x3E, 0x3A),  # 9 SANDST   red sandstone
]
NIGHT, VIOLET, MAUVE, PINK, PEACH, BLUSH, WHITE, CYP, GREEN, SAND = range(10)
DARKER = {WHITE: BLUSH, BLUSH: PINK, PEACH: PINK, PINK: MAUVE, MAUVE: VIOLET,
          VIOLET: NIGHT, NIGHT: NIGHT, GREEN: CYP, CYP: NIGHT, SAND: MAUVE}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
rng = np.random.default_rng(5)
MARBLE = [VIOLET, MAUVE, PINK, BLUSH, WHITE]
GLOW = (560.0, 345.0)          # first light, low behind the right side
CX = 400                       # building axis
YV = 300                       # vanishing line for the garden perspective
BASE = 366                     # ground line under the plinth (mirror axis)

# ---- sky ---------------------------------------------------------------------
yn = np.clip(YY / 350, 0, 1)
dg = np.hypot(XX - GLOW[0], (YY - GLOW[1]) * 1.6)
sky = 0.04 + 0.55 * yn ** 1.8 + 0.30 * np.exp(-dg / 170) + 0.12 * np.exp(-dg / 60)
sky += (cv.noise(240, 40, 1) - 0.5) * 0.05
cv.ramp(np.ones((H, W), bool), sky, [NIGHT, VIOLET, MAUVE, PINK, PEACH, BLUSH])

for _ in range(80):                                   # stars
    x, y = rng.integers(4, W - 4), rng.integers(4, 170)
    if cv.c[y, x] in (NIGHT, VIOLET):
        cv.c[y, x] = WHITE if rng.random() < 0.6 else BLUSH
moon = cv.ellipse(150, 92, 17, 17) & ~cv.ellipse(158, 86, 15, 15)   # crescent
cv.fill(moon, WHITE)

CL = [VIOLET, MAUVE, PINK, PEACH, BLUSH]
cv.cloud(150, 420, 860, 10, 31, CL, GLOW, 0.58)
cv.cloud(205, -40, 330, 9, 32, CL, GLOW, 0.6)
cv.cloud(262, 470, 860, 8, 33, CL, GLOW, 0.6)
cv.cloud(285, -40, 250, 7, 34, CL, GLOW, 0.62)

# birds
for bx, by, s in [(250, 150, 4), (266, 143, 3), (281, 155, 3), (236, 160, 2)]:
    for k in range(s + 1):
        cv.c[by - k // 2, bx - s + k] = NIGHT
        cv.c[by - k // 2, bx + s - k] = NIGHT

# ---- distant tree line + flanking sandstone mosques -----------------------------
tl = YY >= 336 + 6 * np.sin(XX / 13) * np.sin(XX / 41) + 4 * cv.noise(30, 10, 2)
cv.ramp(tl & (YY < BASE + 6), 0.25 + 0.3 * (XX / W), [NIGHT, CYP, GREEN])

def mosque(x0, x1, top, flip):
    w = x1 - x0
    body = cv.rect(x0, top, x1, BASE + 4)
    lit = 0.55 + (0.2 if flip else -0.05) + (cv.noise(12, 4, 3) - 0.5) * 0.15
    cv.ramp(body, lit, [MAUVE, SAND, PINK])
    cv.fill(cv.rect(x0, top, x1, top + 2), PINK)                          # cornice
    for i in range(5):                                                    # arcades
        ax = x0 + 6 + i * (w - 12) / 5
        cv.ramp(cv.arch(ax + 3, ax + (w - 12) / 5 - 3, top + 18, BASE + 4), 0.3, [NIGHT, VIOLET])
    for dx, r in ((0.22, 10), (0.5, 14), (0.78, 10)):                     # white domes
        dc = x0 + dx * w
        dm = cv.ellipse(dc, top - r * 0.45, r, r * 1.05) & (YY < top)
        cv.ramp(dm, 0.55 + 0.35 * (XX - dc) / r, MARBLE)
        cv.fill(cv.rect(dc, top - r * 1.5 - 5, dc + 1, top - r * 1.5 + 1), PEACH)

mosque(18, 168, 318, False)
mosque(632, 782, 318, True)

# ---- the Taj ---------------------------------------------------------------------
def marble(mask, base, side_light=0.12, texture=0.08, seed=7):
    v = base + side_light * (XX - CX) / 260 + (cv.noise(20, 6, seed) - 0.5) * texture
    cv.ramp(mask, v, MARBLE)

def cylinder(cx, y0, y1, r0, r1, base=0.62):
    t = np.clip((YY - y0) / max(1, y1 - y0), 0, 1)
    r = r0 + (r1 - r0) * t
    m = (np.abs(XX - cx) <= r) & (YY >= y0) & (YY < y1)
    v = base + 0.32 * (XX - cx) / np.maximum(r, 1)
    cv.ramp(m, v, MARBLE)
    return m

def onion(cx, tip, base_y, R, base=0.6):
    """Onion dome. Profile from control points (t=0 tip .. 1 base)."""
    tp = [0, .06, .16, .3, .45, .6, .72, .84, .94, 1]
    rp = [0, .14, .40, .68, .88, .99, 1.0, .93, .82, .78]
    t = np.clip((YY - tip) / (base_y - tip), 0, 1)
    r = R * np.interp(t, tp, rp)
    m = (np.abs(XX - cx) <= r) & (YY >= tip) & (YY <= base_y)
    nx = (XX - cx) / np.maximum(r, 1)
    ny = 1 - t
    v = base + 0.30 * nx + 0.18 * ny - 0.22 * np.abs(nx) ** 3
    cv.ramp(m, v, MARBLE)
    # rim light on the glow side
    edge = m & ~np.roll(m, -1, 1)
    cv.fill(edge & (XX > cx), WHITE)
    return m

def finial(cx, y_top, y_bot):
    cv.fill(cv.rect(cx, y_top, cx + 1, y_bot), PEACH)
    for yy in range(y_top + 4, y_bot - 2, 6):
        cv.fill(cv.ellipse(cx + 0.5, yy, 2, 1.5), PEACH)
    cv.c[y_top, cx] = WHITE

def chhatri(cx, base_y, R, h):
    """Small domed kiosk: pillars + dome + finial."""
    body = cv.rect(cx - R, base_y - h, cx + R, base_y)
    marble(body, 0.62, 0.2)
    for i in range(3):                                   # openings between pillars
        ox = cx - R + 2 + i * (2 * R - 4) / 3
        cv.ramp(cv.arch(ox + 1, ox + (2 * R - 4) / 3 - 1, base_y - h + 6, base_y - 1), 0.25, [NIGHT, VIOLET])
    cv.fill(cv.rect(cx - R - 2, base_y - h - 2, cx + R + 2, base_y - h), BLUSH)   # eave
    cv.fill(cv.rect(cx - R - 2, base_y - h, cx + R + 2, base_y - h + 1), MAUVE)
    onion(cx, base_y - h - 2 * R - 2, base_y - h - 2, R + 1, 0.62)
    finial(cx, base_y - h - 2 * R - 9, base_y - h - 2 * R - 2)

# plinth (raised marble platform with a row of niches)
plinth = cv.rect(168, 340, 632, BASE)
marble(plinth, 0.66, 0.1, 0.06, 8)
cv.fill(cv.rect(168, 340, 632, 342), WHITE)
cv.fill(cv.rect(168, BASE - 2, 632, BASE), MAUVE)
for i in range(22):
    nx0 = 176 + i * 20.6
    cv.ramp(cv.arch(nx0 + 4, nx0 + 14, 350, BASE - 4), 0.28, [VIOLET, MAUVE, PINK])

# minarets (front pair), drawn before the main block
for mx in (196, 604):
    cylinder(mx, 150, 340, 7, 10, 0.6)
    for by_ in (292, 232, 176):                          # balconies
        cv.fill(cv.rect(mx - 12, by_, mx + 13, by_ + 3), BLUSH)
        cv.fill(cv.rect(mx - 11, by_ + 3, mx + 12, by_ + 5), MAUVE)
        cv.fill(cv.rect(mx + 4, by_, mx + 13, by_ + 3), WHITE)
    for yy in range(160, 340, 9):                        # stone courses
        cv.fill(cv.rect(mx - 9, yy, mx + 10, yy + 1) & (np.abs(XX - mx) <= 9), PINK)
    chhatri(mx, 150, 9, 12)

# main dome + drum (behind the block's top edge)
cylinder(CX, 214, 242, 56, 56, 0.6)
cv.fill(cv.rect(CX - 56, 214, CX + 57, 217), BLUSH)
onion(CX, 100, 216, 72, 0.6)
finial(CX, 70, 101)

# corner chhatris on the roof
for hx in (318, 482):
    chhatri(hx, 242, 15, 20)

# main block with chamfered corners
block = cv.rect(272, 240, 528, 340)
marble(block, 0.70, 0.12, 0.06, 9)
cv.ramp(cv.rect(272, 240, 284, 340), 0.42, MARBLE)       # left chamfer, away from the light
cv.ramp(cv.rect(516, 240, 528, 340), 0.92, MARBLE)       # right chamfer, toward it
cv.fill(cv.rect(272, 240, 528, 243), WHITE)              # parapet
cv.fill(cv.rect(272, 243, 528, 244), PINK)

# side bays: two stacked arches each side
for bx0 in (290, 458):
    for (ys, yb, ft) in ((276, 290, 248), (320, 338, 294)):
        frame = cv.rect(bx0 - 3, ft, bx0 + 55, yb)
        cv.fill(frame & ~cv.rect(bx0 - 2, ft + 1, bx0 + 54, yb), PINK)
        recess = cv.arch(bx0 + 4, bx0 + 48, ys, yb, k=0.6)
        cv.ramp(recess, 0.40 + 0.30 * (YY - ys + 14) / (yb - ys + 14) + 0.12 * (XX - bx0) / 48, [NIGHT, VIOLET, MAUVE, PINK])
        cv.ramp(cv.arch(bx0 + 14, bx0 + 38, ys + 6, yb) & (YY > ys + 2), 0.35 + 0.3 * (YY - ys) / (yb - ys), [VIOLET, MAUVE, PINK])
# chamfer arches
for cx0 in (274, 518):
    cv.ramp(cv.arch(cx0 + 2, cx0 + 8, 270, 290) | cv.arch(cx0 + 2, cx0 + 8, 314, 338), 0.2, [NIGHT, VIOLET])

# central pishtaq (tall framed portal)
pish = cv.rect(350, 226, 451, 340)
marble(pish, 0.80, 0.1, 0.05, 10)
cv.fill(pish & ~cv.rect(352, 228, 449, 340), PINK)
cv.fill(cv.rect(350, 226, 451, 228), WHITE)
for px_ in range(354, 448, 3):                           # calligraphy band
    cv.c[231 + (px_ // 3) % 2, px_] = MAUVE
band = cv.arch(358, 443, 282, 340, k=0.62) & ~cv.arch(364, 437, 282, 340, k=0.62)
for yy in range(236, 340, 3):
    cv.fill(band & (YY == yy) & ((XX.astype(int) // 2) % 2 == 0), MAUVE)
recess = cv.arch(364, 437, 282, 340, k=0.62)
cv.ramp(recess, 0.22 + 0.35 * np.clip((YY - 236) / 104, 0, 1) + 0.1 * (XX - 364) / 73, [NIGHT, VIOLET, MAUVE, PINK])
door = cv.arch(384, 417, 300, 340)
cv.ramp(door, 0.30 + 0.2 * (YY - 300) / 40, [VIOLET, MAUVE, PINK])
cv.fill(cv.arch(390, 411, 306, 340), NIGHT)
for gx in range(392, 410, 4):                            # jali screen
    cv.fill(cv.rect(gx, 312, gx + 1, 340) & cv.arch(390, 411, 306, 340), VIOLET)

# ---- garden in perspective ------------------------------------------------------------
def gx(world_x, y):
    return CX + world_x * (y - YV) / (H - YV)

ground = YY >= BASE
gt = np.clip((YY - BASE) / (H - BASE), 0, 1)
lawn = ground.copy()
near_path = np.exp(-np.maximum(np.abs(XX - CX) - 290 * (YY - YV) / (H - YV), 0) / (12 + 40 * gt))
cv.ramp(lawn, 0.16 + 0.22 * gt + 0.10 * (XX / W) + 0.28 * near_path + (cv.noise(14, 4, 11) - 0.5) * 0.3,
        [NIGHT, CYP, GREEN])
# stripes in the lawn
s = (YY - YV) / (H - YV)
for wx in (300, 380, 470):
    for sgn in (-1, 1):
        m = ground & (np.abs(XX - (CX + sgn * wx * s)) < 0.8 + 1.5 * gt)
        cv.darken(m, 0.9)

# walkways along the pool
for sgn in (-1, 1):
    inner, outer = 240, 290
    xa, xb = CX + sgn * inner * s, CX + sgn * outer * s
    m = ground & (XX >= np.minimum(xa, xb)) & (XX <= np.maximum(xa, xb))
    cv.ramp(m, 0.45 + 0.25 * gt + (0.12 if sgn > 0 else 0) + (cv.noise(10, 3, 12) - 0.5) * 0.2,
            [MAUVE, PINK, BLUSH])
    # paving joints: rows at geometric spacing (closer together far away)
    yy = BASE + 2.0
    step = 3.0
    while yy < H:
        cv.fill(m & (np.abs(YY - yy) < 0.5), MAUVE)
        step *= 1.12
        yy += step

# reflecting pool: mirror everything above the ground line
pool_mask = ground & (np.abs(XX - CX) <= 238 * s) & (YY >= BASE + 8)
ys_, xs_ = np.nonzero(pool_mask)
src_y = np.clip(2 * BASE - ys_, 0, H - 1)
wob = (np.sin(ys_ * 0.9) * 1.2 + np.sin(ys_ * 0.23 + 1.3)).round().astype(int)
src_x = np.clip(xs_ + wob, 0, W - 1)
cv.c[ys_, xs_] = cv.c[src_y, src_x]
cv.darken(pool_mask, 0.55 + 0.25 * gt)
# shimmering streaks
for _ in range(120):
    yy = int(BASE + 10 + rng.random() ** 1.4 * (H - BASE - 12))
    half = 238 * (yy - YV) / (H - YV)
    xx = int(CX + rng.uniform(-half * 0.9, half * 0.9))
    ln = int(2 + 8 * (yy - BASE) / (H - BASE) * rng.random())
    if cv.c[yy, xx] in (PINK, BLUSH, PEACH, MAUVE):
        cv.c[yy, xx:xx + ln] = BLUSH if rng.random() < 0.6 else WHITE
# marble pool edge
edge = ground & (np.abs(np.abs(XX - CX) - 238 * s) <= 0.6 + 1.6 * gt) & (YY >= BASE + 6)
cv.ramp(edge, 0.75 + 0.15 * np.sign(XX - CX), [MAUVE, PINK, BLUSH, WHITE])
cv.fill(cv.rect(gx(-238, BASE + 8), BASE + 6, gx(238, BASE + 8) + 1, BASE + 8), BLUSH)

# ---- cypress rows -----------------------------------------------------------------------
def cypress(cx, base_y, h, w, seed):
    t = np.clip((YY - (base_y - h)) / h, 0, 1)
    prof = w * (t ** 0.5) * (1 - 0.3 * t ** 6)
    jag = (cv.noise(6, 5, seed, 2) - 0.5) * w * 0.5
    m = (np.abs(XX - cx) <= prof + jag) & (YY >= base_y - h) & (YY < base_y)
    nx = (XX - cx) / np.maximum(prof, 1)
    v = 0.3 + 0.38 * nx + (cv.noise(5, 4, seed + 1, 2) - 0.5) * 0.5
    cv.ramp(m, v, [NIGHT, CYP, GREEN])

ds = np.arange(4.2, 0.9, -0.36)              # far to near
for i, d in enumerate(ds):
    by_ = YV + (H - YV) / d
    sc = 1 / d
    for sgn in (-1, 1):
        for row, wx in enumerate((330, 410)):
            if row == 1 and d < 1.3:
                continue
            cypress(CX + sgn * wx * sc, by_ + 2, 250 * sc, 22 * sc, 100 + i * 4 + row * 2 + (sgn > 0))

cv.vignette(1.0)
cv.save(sys.argv[1])
