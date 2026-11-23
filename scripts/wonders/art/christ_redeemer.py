"""Christ the Redeemer above the clouds at sunset - 1600x1200, exactly 10 colors."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x0C, 0x14, 0x26),  # 0 NIGHT    top sky, deepest shade
    (0x1C, 0x35, 0x57),  # 1 OCEAN    upper sky, the bay, cloud shade
    (0x3C, 0x6E, 0x86),  # 2 TEAL     mid sky, cloud shade
    (0xD9, 0x73, 0x7A),  # 3 ROSE     sunset sky, lit clouds
    (0xF4, 0xA2, 0x73),  # 4 CORAL    glow, warm rims
    (0xFF, 0xD9, 0x8A),  # 5 GOLD     sun, rim light, city lights
    (0xFF, 0xF6, 0xE6),  # 6 WHITE    cloud tops, highlights
    (0x9A, 0xA3, 0xA0),  # 7 STONE    soapstone, lit
    (0x54, 0x5E, 0x66),  # 8 SLATE    soapstone, shade
    (0x1E, 0x3A, 0x2E),  # 9 FOREST   Corcovado jungle, peaks
]
NIGHT, OCEAN, TEAL, ROSE, CORAL, GOLD, WHITE, STONE, SLATE, FOREST = range(10)
DARKER = {WHITE: GOLD, GOLD: CORAL, CORAL: ROSE, ROSE: TEAL, TEAL: OCEAN, OCEAN: NIGHT, NIGHT: NIGHT,
          STONE: SLATE, SLATE: OCEAN, FOREST: NIGHT}
LIGHTER = {NIGHT: OCEAN, OCEAN: TEAL, TEAL: ROSE, ROSE: CORAL, CORAL: GOLD, GOLD: WHITE,
           SLATE: STONE, STONE: WHITE, FOREST: TEAL}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
ALL = np.ones((H, W), bool)
ONE = np.ones((H, W), np.float32)
rng = np.random.default_rng(15)
SUN = (640.0, 300.0)

# ---- sky ---------------------------------------------------------------------------------
yn = np.clip(YY / 440, 0, 1)
ds = np.hypot(XX - SUN[0], (YY - SUN[1]) * 1.3)
sky = 0.04 + 0.55 * yn ** 1.25 + 0.30 * np.exp(-ds / 220) + 0.15 * np.exp(-ds / 60)
cv.ramp(ALL, sky + (cv.noise(240, 40, 1) - 0.5) * 0.04, [NIGHT, OCEAN, TEAL, ROSE, CORAL, GOLD, WHITE])
for _ in range(60):
    x, y = rng.integers(4, W - 4), rng.integers(4, 130)
    if cv.c[y, x] in (NIGHT, OCEAN):
        cv.c[y, x] = WHITE if rng.random() < 0.5 else GOLD
d = np.hypot(XX - SUN[0], YY - SUN[1])
cv.fill(d <= 22, GOLD)
cv.fill(d <= 17, WHITE)
CL = [OCEAN, TEAL, ROSE, CORAL, GOLD]
cv.cloud(110, 420, 860, 9, 31, CL, SUN, 0.58)
cv.cloud(170, -40, 330, 8, 32, CL, SUN, 0.6)
cv.cloud(250, 470, 860, 7, 33, CL, SUN, 0.6)
cv.cloud(222, -40, 250, 6, 34, CL, SUN, 0.62)

# ---- distant peaks and Sugarloaf rising from the clouds ----------------------------------------
def peak_mask(cx, top, base, half, p=0.55):
    t = np.clip((YY - top) / (base - top), 0, 1)
    return (np.abs(XX - cx) <= half * t ** p) & (YY >= top) & (YY <= base)

def shade_peak(m, cx, half, v0=0.35):
    u = np.clip((XX - cx) / half, -1, 1)
    v = v0 + 0.25 * u + (cv.noise(4, 4, int(cx), 2) - 0.5) * 0.25
    cv.ramp(m, v, [NIGHT, FOREST, TEAL, CORAL])
    rim = m & ~np.roll(m, -1, 1) & (XX > cx)
    cv.fill(rim, CORAL)

far = YY >= 455 - 18 * cv.noise(60, 50, 41, 2) - 10 * np.sin(XX / 37)
cv.ramp(far, 0.32 + (cv.noise(8, 5, 42, 2) - 0.5) * 0.2, [OCEAN, TEAL, ROSE])
for (cx, top, half, base) in ((588, 430, 34, 500), (662, 392, 46, 500), (120, 440, 40, 500)):
    m = peak_mask(cx, top, base, half, 0.42)
    shade_peak(m, cx, half)

# ---- the sea of clouds, with Rio's lights in the gaps --------------------------------------------
gaps = YY >= 476
cv.ramp(gaps, 0.18 + (cv.noise(6, 3, 51, 2) - 0.5) * 0.15, [NIGHT, OCEAN, TEAL])
lights = gaps & (rng.random((H, W)) < 0.03)
cv.fill(lights, GOLD)
cv.fill(lights & (rng.random((H, W)) < 0.25), WHITE)

def cloud_sea(y_top, y_bot, seed, thr):
    n = cv.noise(46, 16, seed, 4)
    edge = y_top + (cv.noise(60, 30, seed + 1, 3) - 0.5) * 30
    dens = np.clip((YY - edge) / 18, 0, 1) * (0.45 + n)
    m = (dens > thr) & (YY < y_bot)
    top = np.clip(1 - (YY - edge) / 36, 0, 1)
    sunw = np.exp(-np.abs(XX - SUN[0]) / 340)
    v = 0.40 + 0.45 * top * (0.55 + 0.45 * sunw) + (n - 0.5) * 0.3 - 0.25 * np.clip((YY - edge - 30) / 60, 0, 1)
    cv.ramp(m, v, [OCEAN, TEAL, ROSE, CORAL, GOLD, WHITE])

cloud_sea(468, 600, 61, 0.5)
cloud_sea(520, 640, 62, 0.45)

# ---- Corcovado: the jungle peak under the statue ---------------------------------------------------
top_line = np.interp(XX[0], [0, 140, 260, 330, 372, 428, 470, 540, 660, 800],
                     [560, 520, 478, 446, 432, 432, 446, 480, 530, 572])
TL = top_line[None, :] + (cv.noise(4, 30, 71, 2)[0][None, :] - 0.5) * 6
hill = YY >= TL
u = (XX - 400) / 260
crowns = cv.noise(3.5, 3, 72, 2)
v = 0.30 + 0.22 * u - 0.25 * np.clip((YY - TL) / 160, 0, 1) + (crowns - 0.5) * 0.4
cv.ramp(hill, v, [NIGHT, FOREST, TEAL, CORAL])
rock = hill & (cv.noise(3, 14, 73, 2) > 0.72) & (YY < TL + 60)
cv.ramp(rock, 0.45 + 0.3 * u, [SLATE, STONE, CORAL])
cv.fill(hill & ~np.roll(hill, 1, 0) & (XX > 400), CORAL)                   # sunlit crest
cloud_sea(548, 640, 74, 0.55)                                               # low clouds drift over the slopes

# viewing terrace with its railing
terr = cv.rect(318, 430, 483, 440)
cv.ramp(terr, 0.55 + 0.3 * (XX - 318) / 165, [SLATE, STONE, CORAL])
for x in range(320, 482, 5):
    cv.fill(cv.rect(x, 423, x + 1, 430), SLATE)
cv.fill(cv.rect(318, 422, 483, 424), STONE)

# ---- the statue ---------------------------------------------------------------------------------------
def soap(mask, v):
    """Soapstone: lit from the right by the low sun."""
    cv.ramp(mask, v + (cv.noise(3, 3, 81, 2) - 0.5) * 0.1, [NIGHT, SLATE, STONE, CORAL, GOLD, WHITE])

CXS = 400
# pedestal
ped = cv.poly([(366, 430), (434, 430), (430, 368), (370, 368)])
soap(ped, 0.38 + 0.3 * (XX - 366) / 68)
cv.fill(cv.rect(362, 366, 438, 370), STONE)
cv.fill(cv.rect(372, 392, 428, 393), SLATE)

# robe (body), widening slightly toward the hem
robe = cv.poly([(374, 134), (426, 134), (433, 250), (440, 366), (360, 366), (367, 250)])
uu = (XX - CXS) / 40
v = 0.34 + 0.30 * uu + 0.06 * np.cos((XX - CXS) * 0.55)          # soft vertical folds
folds = ((XX.astype(int) - CXS) % 9 == 0) & (YY > 210)
v = np.where(folds, v - 0.15, v)
soap(robe, v)
cv.fill(robe & (np.abs(YY - 204) < 1.5), SLATE)                        # cord at the waist
cv.fill(cv.ellipse(398, 160, 4, 4), CORAL)                              # the heart
cv.fill(cv.rect(372, 362, 428, 367), SLATE)                             # hem shadow
cv.fill(cv.poly([(388, 366), (396, 366), (395, 370), (387, 370)]) | cv.poly([(404, 366), (412, 366), (413, 370), (405, 370)]), STONE)

# arms outstretched, with the hanging sleeve drapes
def arm(side):
    sx = CXS + side * 24
    hx = CXS + side * 142
    upper = cv.poly([(sx, 132), (hx, 141), (hx, 152), (sx, 156)])
    drape = cv.poly([(CXS + side * 52, 154), (hx - side * 14, 150), (CXS + side * 78, 186)])
    hand = cv.poly([(hx, 139), (hx + side * 13, 143), (hx + side * 13, 153), (hx, 154)])
    vv = 0.36 + 0.18 * side + 0.25 * (1 - (YY - 132) / 30)
    soap(upper | drape, vv)
    cv.fill(drape & ~np.roll(drape, -side, 1), SLATE)
    soap(hand, 0.45 + 0.2 * side)
    cv.fill(cv.lines([(sx, 132), (hx, 140)], 1), CORAL if side > 0 else STONE)   # top edge catches light

arm(-1)
arm(1)
# shoulders + neck + head with hair to the shoulders
soap(cv.ellipse(CXS, 138, 30, 9), 0.42 + 0.3 * (XX - CXS) / 30)
soap(cv.rect(392, 108, 409, 132), 0.36 + 0.3 * (XX - CXS) / 9)
hair = cv.ellipse(CXS, 100, 14, 22) & (YY < 124)
soap(hair, 0.30 + 0.35 * (XX - CXS) / 14)
face = cv.ellipse(CXS + 1, 98, 9, 14)
soap(face, 0.42 + 0.35 * (XX - CXS) / 9)
cv.fill(cv.rect(395, 96, 399, 97) | cv.rect(402, 96, 406, 97), SLATE)   # eyes, downcast
cv.fill(cv.rect(400, 98, 402, 104), STONE)                              # nose
cv.fill(cv.ellipse(CXS + 1, 109, 5, 3) & (YY > 107), SLATE)              # beard
# sunlit rim along the whole right edge of the statue
statue = robe | ped | face | hair | cv.ellipse(CXS, 138, 30, 9)
for side in (1,):
    pass
rim = statue & ~np.roll(statue, -1, 1)
cv.fill(rim, GOLD)
cv.fill(rim & (YY < 300), WHITE)
# halo of warm light behind the statue's head
dh = np.hypot(XX - CXS, YY - 100)
cv.remap((dh < 46) & ~statue & ~cv.ellipse(CXS, 100, 15, 23), ONE * np.clip(1 - dh / 46, 0, 1) * 0.5, LIGHTER)

# birds
for bx, by, s in [(520, 210, 4), (538, 203, 3), (552, 214, 3)]:
    for k in range(s + 1):
        cv.c[by - k // 2, bx - s + k] = NIGHT
        cv.c[by - k // 2, bx + s - k] = NIGHT

cv.vignette(1.0)
cv.save(sys.argv[1])
