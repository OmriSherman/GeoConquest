"""Victoria Falls with a rainbow in the spray - 1600x1200, exactly 10 colors."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x0E, 0x24, 0x20),  # 0 DEEP    deepest jungle shade
    (0x1E, 0x52, 0x38),  # 1 FOREST  jungle
    (0x62, 0xA0, 0x3C),  # 2 LEAF    sunlit foliage
    (0x3E, 0x2C, 0x26),  # 3 BASALT  wet cliff rock
    (0xE8, 0x74, 0x5A),  # 4 CORAL   rainbow red, warm rock light
    (0x4C, 0x9C, 0xDC),  # 5 SKY     sky, rainbow blue
    (0xCF, 0xEA, 0xF6),  # 6 PALE    haze, mist
    (0xF8, 0xFD, 0xFF),  # 7 WHITE   foam, clouds
    (0x2E, 0x7C, 0x8C),  # 8 RIVER   Zambezi water
    (0xF6, 0xC2, 0x4A),  # 9 GOLD    rainbow yellow, sunlight
]
DEEP, FOREST, LEAF, BASALT, CORAL, SKY, PALE, WHITE, RIVER, GOLD = range(10)
DARKER = {WHITE: PALE, PALE: SKY, SKY: RIVER, RIVER: DEEP, GOLD: CORAL, CORAL: BASALT, BASALT: DEEP,
          LEAF: FOREST, FOREST: DEEP, DEEP: DEEP}
LIGHTER = {DEEP: FOREST, FOREST: LEAF, LEAF: PALE, BASALT: RIVER, RIVER: PALE, CORAL: GOLD, GOLD: PALE,
           SKY: PALE, PALE: WHITE}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
ALL = np.ones((H, W), bool)
ONE = np.ones((H, W), np.float32)
rng = np.random.default_rng(19)
LIP, BASE = 196, 372

# ---- sky -------------------------------------------------------------------------------------
yn = np.clip(YY / LIP, 0, 1)
cv.ramp(ALL, 0.10 + 0.55 * yn ** 1.5 + (cv.noise(240, 40, 1) - 0.5) * 0.04, [SKY, SKY, PALE, WHITE])
CL = [SKY, PALE, WHITE]
cv.cloud(44, 60, 420, 10, 91, CL, (200, 0), 0.56)
cv.cloud(78, 420, 860, 11, 92, CL, (600, 0), 0.54)
cv.cloud(120, -40, 300, 8, 93, CL, (100, 0), 0.6)
cv.cloud(140, 520, 860, 7, 94, CL, (700, 0), 0.62)

# ---- the far plateau forest ---------------------------------------------------------------------
tl = LIP - 36 + 10 * np.sin(XX[0] / 31) + 6 * np.sin(XX[0] / 13 + 1) + (cv.noise(8, 30, 5, 2)[0] - 0.5) * 24
forest = YY >= tl[None, :]
crowns = cv.noise(3.2, 3, 6, 2)
cv.ramp(forest, 0.28 + 0.34 * crowns + 0.1 * np.clip((YY - tl[None, :]) / 30, 0, 1) * 0 - 0.12 * np.clip((YY - tl[None, :]) / 36, 0, 1),
        [DEEP, FOREST, LEAF])
cv.fill(forest & ~np.roll(forest, 1, 0) & (cv.noise(3, 3, 7, 1) > 0.4), LEAF)

# ---- the cliff behind the falls ------------------------------------------------------------------
cliff = (YY >= LIP - 2) & (YY <= BASE + 6)
ridge = cv.noise(5, 60, 11, 3)
tex = cv.noise(2, 14, 12, 2)
v = 0.16 + 0.50 * ridge ** 1.3 + 0.22 * (tex - 0.5) - 0.10 * np.clip((YY - LIP) / (BASE - LIP), 0, 1)
v += 0.18 * np.exp(-((XX - 700) / 140) ** 2) * (1 - np.clip((YY - LIP) / 160, 0, 1))      # sun catches the right end
cv.ramp(cliff, v, [DEEP, BASALT, BASALT, CORAL])

# ---- the curtain of water ----------------------------------------------------------------------------
breaks = [(196, 238), (332, 352), (468, 512), (598, 622), (708, 746)]
streak = 0.55 * cv.noise(1.6, 90, 21, 3) + 0.45 * cv.noise(6, 140, 22, 3)
streak = np.clip((streak - 0.5) * 1.7 + 0.5, 0, 1)                       # more contrast
flow = 0.50 + 0.40 * np.exp(-((XX - 150) / 180) ** 2) + 0.22 * np.exp(-((XX - 560) / 110) ** 2)
curtain = (XX >= 28) & (XX <= 772) & (YY >= LIP + 2) & (YY <= BASE)
for (a_, b_) in breaks:
    wob = 6 * np.sin(YY / 21 + a_) + 3 * np.sin(YY / 7 + b_)
    curtain &= ~((XX >= a_ + wob) & (XX <= b_ + wob * 0.6))
fall_t = np.clip((YY - LIP) / (BASE - LIP), 0, 1)
body = 0.22 + 0.55 * streak * flow + 0.38 * np.clip((fall_t - 0.55) / 0.45, 0, 1) - 0.16 * np.clip(1 - fall_t / 0.18, 0, 1)
cv.ramp(curtain, body, [DEEP, RIVER, PALE, WHITE])
# dark gaps between the white strands where wet rock shows through
thin = curtain & (streak * flow < 0.18) & (fall_t > 0.1)
cv.ramp(thin, 0.25 + (tex - 0.5) * 0.4, [DEEP, BASALT, RIVER])
# smooth rolling water right at the lip, then it breaks into streaks
lipm = (XX >= 28) & (XX <= 772) & (YY >= LIP + 2) & (YY <= LIP + 7)
cv.ramp(lipm & curtain, 0.55 + 0.4 * (cv.noise(8, 2, 23, 2) - 0.5), [RIVER, PALE, WHITE])

# trees growing on the rock fingers that split the falls
def finger_trees(a, b, seed):
    r = np.random.default_rng(seed)
    for _ in range(int((b - a) / 3) + 3):
        x = r.uniform(a - 4, b + 4)
        top = LIP - r.uniform(4, 20)
        cv.fill(cv.ellipse(x, top, r.uniform(4, 8), r.uniform(5, 10)), FOREST)
        cv.fill(cv.ellipse(x - 1, top - 2, 3, 3), LEAF)
        cv.fill(cv.rect(x - 1, top, x + 1, LIP + 3), DEEP)
for k, (a, b) in enumerate(breaks):
    finger_trees(a, b, 300 + k)

# ---- the gorge floor: churning water below the falls ----------------------------------------------------
gorge = (YY > BASE) & (YY < 506)
gn = cv.noise(14, 5, 31, 3)
foam = cv.noise(5, 3, 32, 3)
gt = np.clip((YY - BASE) / 130, 0, 1)
cv.ramp(gorge, 0.15 + 0.5 * gt * gn + 0.5 * foam * (1 - gt) ** 1.5 + 0.1 * np.exp(-((XX - 330) / 260) ** 2), [DEEP, RIVER, PALE, WHITE])
# the far wall of the gorge below the lip, wet basalt
wall = (YY >= BASE - 2) & (YY < BASE + 14)
cv.ramp(wall & ~curtain, 0.2 + 0.2 * tex, [DEEP, BASALT])

# ---- the spray plume: a tall billowing column that rises from the foot of the falls past the lip -------------
PB = BASE + 18
envx = 0.35 + 0.65 * np.exp(-((XX[0] - 270) / 230) ** 2) + 0.25 * np.exp(-((XX[0] - 640) / 90) ** 2)
hx = 330 * envx * (0.65 + 0.7 * cv.noise(60, 20, 41, 3)[0])
rise = np.clip((PB - YY) / hx[None, :], 0, 1.2)                          # 0 at the base .. 1 at the top of the plume
below = np.clip(1 - (YY - PB) / 46, 0, 1)                                # boils out over the gorge too
face = 1 - 0.62 * np.clip((YY - (LIP + 30)) / 80, 0, 1) * np.clip((PB - 50 - YY) / 80, 0, 1)      # thinner over the curtain
shape = np.where(YY <= PB, np.clip(1 - rise, 0, 1) ** 0.7 * face, below ** 1.3)
billow = cv.noise(44, 34, 42, 4)
dens = shape * (0.40 + 0.95 * billow)
alpha = np.clip((dens - 0.16) / 0.55, 0, 1)
lit = 0.50 + 0.30 * (-(YY - PB) / 220) + 0.25 * (cv.noise(9, 7, 43, 3) - 0.5) - 0.18 * np.clip((YY - PB) / 40, 0, 1)
cv.ramp(alpha > cv.THR, lit + 0.12 * alpha, [SKY, PALE, WHITE])
cv.remap(ALL, np.clip(alpha * 0.3, 0, 1), LIGHTER)                         # haze washes the whole scene
D = np.clip(alpha, 0, 1.3)

# ---- the rainbow ----------------------------------------------------------------------------------------------
RCX, RCY, RR = 320.0, 560.0, 282.0
dist = np.hypot(XX - RCX, (YY - RCY))
bands = [(0, CORAL), (5, GOLD), (10, LEAF), (15, SKY)]
over_sky = YY < tl[None, :]
mist = np.clip(D * 1.3, 0, 1)
for off, col in bands:
    m = (np.abs(dist - (RR - off)) < 2.7) & (YY < 470)
    p = np.where(over_sky, 0.20, 0.30 + 0.65 * mist)
    p = np.where(YY < LIP, np.maximum(p, 0.28 + 0.35 * mist), p)
    cv.fill(m & (p > cv.THR), col)

# ---- foreground: our side of the gorge: stone viewpoint wall, jungle on both sides ------------------------------
def crown_blob(cx, cy, r, seed, ramp=(DEEP, FOREST, LEAF)):
    x0, x1 = int(max(0, cx - r - 1)), int(min(W, cx + r + 2))
    y0, y1 = int(max(0, cy - r - 1)), int(min(H, cy + r + 2))
    if x0 >= x1 or y0 >= y1:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1]
    dx, dy = (xx - cx) / r, (yy - cy) / (r * 0.85)
    m = dx * dx + dy * dy <= 1
    lit_ = 0.5 - 0.55 * dy + 0.25 * dx                          # sun from the upper right
    v = 0.30 + 0.45 * lit_ + (np.random.default_rng(seed).random(m.shape) - 0.5) * 0.25
    ramp_ = np.array(ramp, np.uint8)
    f = np.clip(v, 0, 0.9999) * (len(ramp_) - 1)
    i = np.floor(f).astype(int)
    idx = np.minimum(i + ((f - i) > cv.THR[y0:y1, x0:x1]), len(ramp_) - 1)
    sub = cv.c[y0:y1, x0:x1]
    sub[m] = ramp_[idx][m]

# jungle floor along the bottom
fr = np.random.default_rng(77)
k = 0
for y in np.arange(486, 640, 7):
    r_ = 11 + 0.18 * (y - 486)
    for x in np.arange(-10, W + 10, r_ * 1.3):
        k += 1
        crown_blob(x + fr.uniform(-r_ * 0.4, r_ * 0.4), y + fr.uniform(-3, 3), r_ * fr.uniform(0.85, 1.15), k)
# big framing masses in both corners, with hanging vines
for (cx, cy, r) in [(30, 330, 60), (84, 276, 52), (16, 430, 70), (118, 360, 54), (54, 220, 44),
                    (790, 350, 62), (742, 292, 50), (810, 446, 70), (704, 384, 54), (770, 236, 46)]:
    for j in range(5):
        k += 1
        crown_blob(cx + fr.uniform(-r * 0.5, r * 0.5), cy + fr.uniform(-r * 0.4, r * 0.4), r * fr.uniform(0.6, 1.0), k)
for (x0, x1, y0, y1) in [(0, 150, 300, 520), (690, 800, 300, 520)]:
    vines = (cv.noise(1.5, 20, 88 + x0, 2) > 0.62) & (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)
    cv.fill(vines & (cv.c != DEEP) & (YY > y0 + 40), DEEP)

# stone viewpoint wall with visitors behind it
def visitor(x, y, h, poncho):
    cv.fill(cv.ellipse(x, y - h + 3, 3.6, 4), DEEP)
    body = cv.poly([(x - 6.5, y), (x + 6.5, y), (x + 4.5, y - h + 7), (x - 4.5, y - h + 7)])
    cv.ramp(body, 0.45 + 0.4 * (XX - x) / 6, [BASALT, poncho, WHITE])
for (x, h, col) in ((600, 40, CORAL), (630, 36, SKY), (668, 38, GOLD), (700, 33, PALE)):
    visitor(x, 566, h, col)
wall = cv.rect(540, 548, 800, 600)
courses = ((YY.astype(int) % 9) == 0) | (((XX.astype(int) + (YY.astype(int) // 9) * 14) % 28) == 0)
cv.ramp(wall, 0.40 + 0.2 * (cv.noise(4, 3, 99, 2) - 0.5) - np.where(courses, 0.15, 0), [DEEP, BASALT, CORAL])
cv.fill(cv.rect(540, 546, 800, 551), CORAL)
cv.fill(cv.rect(540, 546, 800, 547), GOLD)
cv.fill(cv.rect(540, 551, 800, 553), DEEP)

# egrets over the spray
for bx, by, s in [(420, 160, 4), (438, 152, 3), (452, 164, 3), (402, 170, 2)]:
    for k in range(s + 1):
        cv.c[by - k // 2, bx - s + k] = DEEP
        cv.c[by - k // 2, bx + s - k] = DEEP

cv.vignette(0.8)
cv.save(sys.argv[1])
