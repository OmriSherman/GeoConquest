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
top_line = np.interp(XX[0], [0, 120, 220, 290, 340, 370, 430, 462, 520, 600, 700, 800],
                     [600, 575, 530, 482, 448, 434, 434, 448, 488, 540, 585, 600])
TL = top_line[None, :] + (cv.noise(4, 30, 71, 2)[0][None, :] - 0.5) * 6
hill = YY >= TL
u = (XX - 400) / 260
crowns = cv.noise(3.5, 3, 72, 2)
v = 0.30 + 0.22 * u - 0.25 * np.clip((YY - TL) / 160, 0, 1) + (crowns - 0.5) * 0.4
cv.ramp(hill, v, [NIGHT, FOREST, TEAL, CORAL])
rock = hill & (cv.noise(4, 18, 73, 2) > 0.6) & (u > -0.05) & (YY < TL + 80)
cv.ramp(rock, 0.22 + 0.35 * np.clip(u, 0, 1) + (cv.noise(3, 3, 75, 2) - 0.5) * 0.35, [NIGHT, SLATE, STONE, CORAL])
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
    v = -0.02 + 0.95 * np.asarray(v)                      # cool grey stone, deep shade on the left; only the rim glows
    cv.ramp(mask, v + (cv.noise(3, 3, 81, 2) - 0.5) * 0.1, [NIGHT, SLATE, STONE, STONE, CORAL])

CXS = 400
def lit(x, half):
    return np.clip((XX - x) / half, -1, 1)

# pedestal
ped = cv.poly([(366, 430), (434, 430), (430, 370), (370, 370)])
soap(ped, 0.36 + 0.3 * (XX - 366) / 68)
cv.fill(cv.rect(362, 367, 438, 371), STONE)
cv.fill(cv.rect(370, 394, 430, 395), SLATE)

# robe: broad, falling straight to the feet
robe = cv.poly([(356, 124), (444, 124), (446, 160), (439, 368), (361, 368), (354, 160)])
v = 0.34 + 0.34 * lit(CXS, 46) + 0.06 * np.cos((XX - CXS) * 0.5)
folds = (((XX.astype(int) - CXS) % 10) == 0) & (YY > 215)
v = np.where(folds, v - 0.16, v)
v = np.where((np.abs(XX - CXS) < 1.2) & (YY > 215), v - 0.2, v)          # centre seam of the tunic
soap(robe, v)
cv.fill(robe & (np.abs(YY - 212) < 1.5), SLATE)                          # cord at the waist
cv.fill(cv.ellipse(394, 168, 4, 4), CORAL)                                # the heart
cv.fill(cv.rect(360, 362, 440, 368), SLATE)                               # hem shadow
cv.fill(cv.poly([(386, 368), (396, 368), (395, 372), (385, 372)]) | cv.poly([(404, 368), (414, 368), (415, 372), (405, 372)]), STONE)

# arms with long hanging sleeves, hands open
def arm(side):
    sh, wr, tip = CXS + side * 40, CXS + side * 124, CXS + side * 144
    upper = cv.poly([(sh, 118), (wr, 126), (wr, 142), (sh, 148)])
    sleeve = cv.poly([(sh, 146), (wr - side * 4, 142), (wr - side * 14, 156), (CXS + side * 46, 204)])
    hand = cv.poly([(wr, 126), (tip, 131), (tip, 141), (wr, 144)])
    shade = 0.34 + 0.22 * side
    soap(upper, shade + 0.18 * (1 - (YY - 118) / 28))
    soap(sleeve, shade - 0.06 + 0.12 * (1 - (YY - 146) / 58))
    cv.fill(sleeve & ~np.roll(sleeve, -1, 0), SLATE)                    # hem line
    cv.fill(cv.lines([(sh, 147), (wr, 142)], 1), SLATE)                  # fold under the forearm
    soap(hand, shade + 0.08)
    cv.fill(cv.lines([(wr + side * 3, 130), (tip - side * 2, 134)], 1) & hand, SLATE)  # fingers
    cv.fill(cv.lines([(sh, 118), (wr, 126)], 1), GOLD if side > 0 else STONE)
    return upper | sleeve | hand

arms = arm(-1) | arm(1)
# shoulders, neck, head
shoulders = cv.ellipse(CXS, 126, 44, 9)
soap(shoulders, 0.40 + 0.3 * lit(CXS, 44))
neck = cv.rect(393, 104, 408, 122)
soap(neck, 0.30 + 0.3 * lit(CXS, 8))
hair = (cv.ellipse(CXS, 88, 15, 18) | cv.poly([(386, 92), (414, 92), (417, 118), (383, 118)])) & (YY < 119)
soap(hair, 0.26 + 0.35 * lit(CXS, 15))
face = cv.ellipse(CXS + 1, 94, 9.5, 13)
soap(face, 0.44 + 0.32 * lit(CXS, 9))
beard = cv.ellipse(CXS + 1, 105, 7.5, 6) & (YY > 102)
soap(beard, 0.32 + 0.3 * lit(CXS, 8))
cv.fill(cv.rect(395, 92, 399, 93) | cv.rect(403, 92, 407, 93), SLATE)     # downcast eyes
cv.fill(cv.rect(400, 94, 402, 100), SLATE)                               # nose shadow
cv.fill(cv.rect(398, 101, 404, 102), SLATE)                              # mouth
cv.fill(hair & (np.abs(XX - CXS) < 1) & (YY < 80), SLATE)                 # parting

statue = robe | ped | face | hair | shoulders | arms | neck | beard
rim = statue & ~np.roll(statue, -1, 1)
cv.fill(rim, GOLD)
cv.fill(rim & (YY < 300), WHITE)
top = statue & ~np.roll(statue, 1, 0)
cv.fill(top & (XX > CXS), CORAL)
# warm glow behind the statue's head
dh = np.hypot(XX - CXS, YY - 92)
cv.remap((dh < 52) & ~statue, ONE * np.clip(1 - dh / 52, 0, 1) * 0.55, LIGHTER)

# birds
for bx, by, s in [(520, 210, 4), (538, 203, 3), (552, 214, 3)]:
    for k in range(s + 1):
        cv.c[by - k // 2, bx - s + k] = NIGHT
        cv.c[by - k // 2, bx + s - k] = NIGHT

cv.vignette(1.0)
cv.save(sys.argv[1])
