"""Great Wall of China at a misty dawn - 1600x1200, exactly 10 colors."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x0B, 0x14, 0x20),  # 0 INK      deepest shade
    (0x16, 0x30, 0x3A),  # 1 TEAL     upper sky, dark slopes
    (0x2D, 0x54, 0x58),  # 2 SLATE    mid ridges, shade
    (0x5E, 0x8A, 0x7A),  # 3 SAGE     hazy ridges, glazed roof tiles
    (0xA9, 0xC6, 0xBC),  # 4 MIST     far ridges, mist
    (0xE8, 0xEE, 0xDC),  # 5 PALE     sky near the sun, mist highlights
    (0xF6, 0xC7, 0x7A),  # 6 SUN      sun, sunlit stone edges
    (0xB8, 0x8E, 0x62),  # 7 STONE    lit wall stone
    (0x6A, 0x54, 0x46),  # 8 SHADE    wall stone in shade
    (0x24, 0x46, 0x3A),  # 9 FOREST   forested slopes
]
INK, TEAL, SLATE, SAGE, MIST, PALE, SUN, STONE, SHADE, FOREST = range(10)
DARKER = {PALE: MIST, MIST: SAGE, SAGE: SLATE, SLATE: TEAL, TEAL: INK, INK: INK,
          SUN: STONE, STONE: SHADE, SHADE: TEAL, FOREST: TEAL}
LIGHTER = {INK: TEAL, TEAL: SLATE, SLATE: SAGE, SAGE: MIST, MIST: PALE, FOREST: SLATE,
           SHADE: SAGE, STONE: MIST, SUN: PALE}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
xs = np.arange(W, dtype=np.float32)
rng = np.random.default_rng(8)
SUNXY = (585.0, 160.0)

def smooth(a, k):
    pad = np.pad(a, k, mode="edge")
    return np.convolve(pad, np.ones(2 * k + 1) / (2 * k + 1), mode="same")[k:-k]

def mist(yc, th, strength, seed, x0=-1e9, x1=1e9):
    n = cv.noise(120, 18, seed, 3)
    band = np.exp(-((YY - yc) / th) ** 2) * strength * (0.55 + 0.9 * n)
    band *= np.clip(np.minimum(XX - x0, x1 - XX) / 60, 0, 1)
    allm = np.ones((H, W), bool)
    cv.remap(allm, band, LIGHTER)
    cv.remap(allm, band - 0.55, LIGHTER)

# ---- sky ---------------------------------------------------------------------
yn = np.clip(YY / 330, 0, 1)
ds = np.hypot(XX - SUNXY[0], (YY - SUNXY[1]) * 1.3)
sky = 0.10 + 0.55 * yn ** 1.1 + 0.30 * np.exp(-ds / 150) + 0.15 * np.exp(-ds / 50)
sky += (cv.noise(260, 50, 1) - 0.5) * 0.05
cv.ramp(np.ones((H, W), bool), sky, [TEAL, SLATE, SAGE, MIST, PALE, SUN])
d = np.hypot(XX - SUNXY[0], YY - SUNXY[1])
cv.fill(d <= 18, SUN)
CL = [TEAL, SLATE, SAGE, MIST, PALE]
cv.cloud(120, 380, 860, 9, 41, CL, SUNXY, 0.6)
cv.cloud(165, -40, 330, 8, 42, CL, SUNXY, 0.62)
cv.cloud(232, 470, 860, 6, 43, CL, SUNXY, 0.64)
for bx, by, s in [(520, 175, 4), (536, 168, 3), (549, 179, 3), (505, 186, 2)]:
    for k in range(s + 1):
        cv.c[by - k // 2, bx - s + k] = INK
        cv.c[by - k // 2, bx + s - k] = INK

# ---- ridges --------------------------------------------------------------------
def ridge_line(base, amp, seed, n=6, width=(50, 130), rough=3.0):
    r = np.random.default_rng(seed)
    y = np.full(W, float(base))
    for _ in range(n):
        c, w, a = r.uniform(-60, W + 60), r.uniform(*width), r.uniform(0.45, 1.0) * amp
        y -= a * np.exp(-((xs - c) / w) ** 2) ** 0.8
    y += smooth(r.normal(0, 1, W), 4) * rough
    return y

def ridge_fill(y, v0, fade, ramp, seed, tex=0.08):
    m = YY >= y[None, :]
    slope = np.gradient(smooth(y, 10))[None, :]
    v = v0 + 0.14 * np.clip(slope * 2.0, -1, 1)          # slopes facing the sun are lighter
    v = v + 0.32 * np.clip((YY - y[None, :]) / fade, 0, 1)  # mist pooling lower down
    v = v + (cv.noise(16, 6, seed) - 0.5) * tex
    cv.ramp(m, v, ramp)

def far_wall(y, x0, x1, h, color, tower_xs, tw, th, top=None):
    for x in range(max(0, x0), min(W, x1)):
        c = int(round(y[x]))
        cv.c[c - h:c, x] = color
        if (x // 2) % 2 == 0:
            cv.c[c - h - 1, x] = color
        if top is not None:
            cv.c[c - h, x] = top
    for tx in tower_xs:
        c = int(round(y[tx]))
        cv.c[c - h - th:c, tx - tw // 2:tx + tw // 2 + 1] = color
        cv.c[c - h - th - 1, tx - tw // 2:tx + tw // 2 + 1:2] = color
        if tw >= 6:
            cv.c[c - h - th + 3:c - h - th + 5, tx - 1:tx + 1] = INK

L0 = ridge_line(318, 80, 11, n=9, width=(30, 80))
ridge_fill(L0, 0.55, 50, [SAGE, MIST, PALE], 12, 0.04)
mist(322, 16, 0.5, 13)

L1 = ridge_line(352, 85, 21, n=8, width=(35, 90))
ridge_fill(L1, 0.40, 55, [SLATE, SAGE, MIST, PALE], 22, 0.05)
far_wall(L1, 80, 520, 2, PALE, [140, 262, 395], 4, 3, top=SUN)
mist(362, 18, 0.55, 23)

L2 = ridge_line(408, 95, 31, n=7, width=(45, 110))
ridge_fill(L2, 0.28, 60, [TEAL, SLATE, SAGE, MIST], 32, 0.07)
far_wall(L2, 0, 800, 4, STONE, [70, 215, 352, 470, 590, 735], 7, 6, top=SUN)
mist(452, 26, 0.6, 33)

# ---- foreground hill chain with the main wall --------------------------------------
cx_ = [-10, 60, 130, 175, 285, 330, 390, 440, 500, 560, 610, 628, 674, 720, 810]
cy_ = [452, 436, 424, 420, 420, 432, 495, 530, 516, 472, 418, 402, 402, 410, 418]
YG = smooth(np.interp(xs, cx_, cy_), 14)
SCALE = np.interp(xs, [0, 175, 285, 440, 628, 800], [1.0, 1.0, 0.95, 0.75, 0.6, 0.55])

# terrain below the wall: forested slopes
T = YG + 2
terr = YY >= T[None, :]
slope = np.gradient(YG)[None, :]
crowns = cv.noise(7, 6, 51, 2)
v = 0.40 + 0.16 * np.clip(slope * 1.6, -1, 1) - 0.22 * np.clip((YY - T[None, :]) / 200, 0, 1)
v = v + (crowns - 0.5) * 0.45
cv.ramp(terr, v, [INK, TEAL, FOREST, SLATE, SAGE])

def crown(cx, cy, r, seed):
    x0, x1 = int(max(0, cx - r - 1)), int(min(W, cx + r + 2))
    y0, y1 = int(max(0, cy - r - 1)), int(min(H, cy + r + 2))
    if x0 >= x1 or y0 >= y1:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1]
    dx, dy = (xx - cx) / r, (yy - cy) / (r * 0.85)
    m = dx * dx + dy * dy <= 1
    lit = dx * 0.35 - dy * 0.75                                # light from upper right
    rim = (dx * dx + dy * dy) > 0.72
    v = 0.40 + 0.34 * lit - np.where(rim & (dy > -0.2), 0.25, 0) + (np.random.default_rng(seed).random(m.shape) - 0.5) * 0.15
    thr = cv.THR[y0:y1, x0:x1]
    ramp = np.array([INK, TEAL, FOREST, SLATE, SAGE], np.uint8)
    f = np.clip(v, 0, 0.9999) * 4
    i = np.floor(f).astype(int)
    idx = np.minimum(i + ((f - i) > thr), 4)
    sub = cv.c[y0:y1, x0:x1]
    sub[m] = ramp[idx][m]

k = 0
y = float(YG.min()) + 6
while y < H + 20:
    r_ = 4.0 + 24 * max(0.0, (y - 410) / 190) ** 1.4
    y += max(3.5, r_ * 0.6)
    for x in np.arange(-10 - rng.uniform(0, r_), W + r_, max(5.0, r_ * 1.25)):
        xi = int(np.clip(x, 0, W - 1))
        if y < T[xi] + r_ * 0.6:
            continue
        k += 1
        crown(x + rng.uniform(-r_ * 0.5, r_ * 0.5), y + rng.uniform(-2, 2), r_ * rng.uniform(0.8, 1.2), k)

# tree tops poking above the slope just under the wall's foot
for x in range(0, W, 3):
    if rng.random() < 0.5:
        hgt = int(rng.integers(2, 6) * SCALE[x])
        cv.c[int(T[x]) - hgt:int(T[x]) + 1, x:x + 2] = FOREST if rng.random() < 0.6 else TEAL

def main_wall(x0, x1):
    for x in range(x0, x1):
        s = SCALE[x]
        g = YG[x]
        h = 30 * s
        tw = max(2, 4 * s)
        top_face = g - h
        y0, y1 = int(round(top_face)), int(round(g)) + 1
        col = np.arange(y0, y1)
        # face: brick rows following the slope, staggered joints
        row = ((g - col) / max(2.5, 3.2 * s)).astype(int)
        joint = ((x + (row % 2) * 4 * s) % (8 * s)) < 1
        rows = ((g - col) % max(2.5, 3.2 * s)) < 1
        v = 0.55 + 0.1 * np.clip(np.gradient(YG)[x] * -2, -1, 1) + (rng.random(len(col)) - 0.5) * 0.12
        v = np.where(rows | joint, v - 0.3, v)
        v = np.where(col > g - 4 * s, v - 0.12, v)        # foundation darker
        cv.c[col, x] = np.array([SHADE, STONE, SUN])[np.clip((v * 3).astype(int), 0, 2)]
        cv.c[y0, x] = SHADE                               # shadow line under walkway
        # walkway seen from slightly above
        wt0 = int(round(top_face - tw))
        cv.c[wt0:y0, x] = SUN if (x % 3) else STONE
        # crenellations (merlons) on the outer parapet
        per = max(4, 9 * s)
        if (x % per) < per * 0.55:
            mh = int(round(5 * s)) + 1
            cv.c[wt0 - mh:wt0, x] = STONE
            cv.c[wt0 - mh, x] = SUN
        else:
            cv.c[wt0 - 1, x] = SHADE

main_wall(0, 176)
main_wall(285, 629)
main_wall(673, 800)

# ---- watchtowers -----------------------------------------------------------------------
def tower(cx, g, w, h, s, roof=False):
    x0, x1 = int(cx - w / 2), int(cx + w / 2)
    top = int(g - h)
    face = cv.rect(x0, top, x1, g + 2)
    rowl = ((YY - top) % max(3, 4 * s)) < 1
    jl = ((XX + (((YY - top) // max(3, 4 * s)) % 2) * 5 * s) % (10 * s)) < 1
    v = 0.52 + 0.14 * (XX - x0) / w + (cv.noise(8, 4, int(cx)) - 0.5) * 0.15
    v = np.where(rowl | jl, v - 0.28, v)
    cv.ramp(face, v, [SHADE, STONE, SUN])
    # sunlit side face (sun is to the right)
    dpt = int(w * 0.22)
    side = cv.poly([(x1, top), (x1 + dpt, top - dpt * 0.45), (x1 + dpt, g - dpt * 0.45), (x1, g + 2)])
    cv.ramp(side, 0.8 + (cv.noise(8, 4, int(cx) + 1) - 0.5) * 0.2, [STONE, SUN])
    # cornice + crenellated top
    cv.fill(cv.rect(x0 - 2, top - 2, x1 + 2, top + 1), SHADE)
    cv.fill(cv.rect(x0 - 2, top - 3, x1 + 2, top - 2), SUN)
    per = max(5, int(10 * s))
    for mx in range(x0 - 2, x1 + 2, per):
        mh = max(3, int(7 * s))
        cv.fill(cv.rect(mx, top - 3 - mh, mx + per * 0.55, top - 3), STONE)
        cv.fill(cv.rect(mx, top - 3 - mh, mx + per * 0.55, top - 2 - mh), SUN)
    # arched windows + door
    n = 3 if w > 60 else 2
    for i in range(n):
        wx = x0 + (i + 1) * w / (n + 1)
        ww = max(3, 9 * s)
        cv.fill(cv.arch(wx - ww / 2, wx + ww / 2, top + h * 0.28, top + h * 0.45, k=0.5), INK)
    if w > 60:
        cv.fill(cv.arch(cx - 9 * s, cx + 9 * s, g - h * 0.32, g + 2, k=0.5), INK)
        cv.fill(cv.arch(x1 + dpt * 0.3, x1 + dpt * 0.75, top + h * 0.3, top + h * 0.45, k=0.5)
                & side, SHADE)
    if roof:
        # small pavilion with a green-glazed roof and upturned eaves
        s = s * 1.35
        px0, px1, pb = cx - w * 0.3, cx + w * 0.3, top - 3
        for px in np.linspace(px0 + 3, px1 - 3, 4):
            cv.fill(cv.rect(px - 1.5, pb - 18 * s, px + 1.5, pb), SHADE)
        cv.fill(cv.rect(px0 + 4, pb - 18 * s, px1 - 4, pb - 14 * s), TEAL)
        ey = pb - 18 * s
        roof_pts = [(px0 - 16 * s, ey - 6 * s), (px0 - 6 * s, ey - 2 * s), (px0 + 6 * s, ey - 13 * s),
                    (cx - 10 * s, ey - 26 * s), (cx + 10 * s, ey - 26 * s), (px1 - 6 * s, ey - 13 * s),
                    (px1 + 6 * s, ey - 2 * s), (px1 + 16 * s, ey - 6 * s), (px1 + 4 * s, ey + 1),
                    (px0 - 4 * s, ey + 1)]
        rm = cv.poly(roof_pts)
        tiles = ((XX.astype(int) // 3) % 2 == 0)
        cv.ramp(rm, 0.45 + 0.25 * (XX - cx) / (w * 0.5) + np.where(tiles, 0.12, 0) - 0.25 * ((YY - (ey - 26 * s)) / (26 * s)) ** 2,
                [INK, TEAL, SLATE, SAGE, MIST])
        cv.fill(cv.rect(px0 - 4 * s, ey, px1 + 4 * s, ey + 2) & ~rm, INK)     # eave shadow
        cv.fill(cv.rect(cx - 11 * s, ey - 28 * s, cx + 11 * s, ey - 25 * s), SAGE)  # ridge
        for ex, sg in ((cx - 11 * s, -1), (cx + 11 * s, 1)):                       # ridge ornaments
            cv.fill(cv.rect(ex + min(0, sg) * 3, ey - 31 * s, ex + max(0, sg) * 3 + 1, ey - 27 * s), SAGE)

tower(230, 420, 110, 118, 1.0, roof=True)
tower(651, 402, 46, 56, 0.6)

# valley mist drifting in front of the lower wall
mist(540, 22, 0.55, 61, 300, 600)

cv.vignette(1.0)
cv.save(sys.argv[1])
