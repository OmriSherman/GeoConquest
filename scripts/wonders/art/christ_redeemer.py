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

# ---- the summit: jungle just beyond the terrace edges ----------------------------------------------
crowns = cv.noise(3.5, 3, 72, 2)
for (x0, x1, ytop) in ((0, 260, 470), (540, 800, 478)):
    m = (XX >= x0) & (XX < x1) & (YY >= ytop + (cv.noise(8, 20, x0 + 5, 2) - 0.5) * 24)
    u = (XX - 400) / 400
    cv.ramp(m, 0.30 + 0.25 * u + (crowns - 0.5) * 0.45, [NIGHT, FOREST, TEAL, CORAL])

# ---- the statue ---------------------------------------------------------------------------------------
def soap(mask, v):
    """Soapstone: lit from the right by the low sun."""
    v = -0.02 + 0.95 * np.asarray(v)                      # cool grey stone, deep shade on the left; only the rim glows
    cv.ramp(mask, v + (cv.noise(3, 3, 81, 2) - 0.5) * 0.1, [NIGHT, SLATE, STONE, STONE, CORAL])

CXS = 400
def lit(x, half):
    return np.clip((XX - x) / half, -1, 1)

# pedestal: dark granite block with a cornice
ped = cv.rect(352, 376, 449, 440)
cv.ramp(ped, 0.20 + 0.30 * np.clip((XX - 352) / 97, 0, 1) ** 2 + (cv.noise(3, 3, 83, 2) - 0.5) * 0.12, [NIGHT, SLATE, STONE])
cv.ramp(cv.rect(346, 366, 455, 377), 0.38 + 0.3 * (XX - 346) / 109, [NIGHT, SLATE, STONE, CORAL])
cv.fill(cv.rect(346, 366, 455, 367), STONE)
cv.fill(cv.rect(352, 377, 449, 379), NIGHT)
for yy in (398, 420):
    cv.fill(cv.rect(352, yy, 449, yy + 1), NIGHT)

# pleated tunic below the cloak
tunic = cv.poly([(371, 236), (429, 236), (427, 366), (373, 366)])
pleat = ((XX.astype(int) - CXS) % 5) == 0
soap(tunic, 0.32 + 0.34 * lit(CXS, 34) - np.where(pleat, 0.18, 0) + 0.06 * np.sin((XX - CXS) * 1.2))
cv.fill(cv.rect(373, 361, 427, 366), SLATE)

# cloak draped over the shoulders, ending at mid-thigh with an uneven hem
robe = cv.poly([(356, 124), (444, 124), (446, 150), (440, 180), (436, 238), (418, 250), (398, 258), (364, 244), (360, 180), (354, 150)])
v = 0.34 + 0.34 * lit(CXS, 46) + 0.05 * np.cos((XX - CXS) * 0.45)
soap(robe, v)
for (x0, y0, x1, y1) in ((400, 150, 392, 258), (414, 160, 424, 250), (382, 168, 372, 240)):   # long drape folds
    cv.fill(cv.lines([(x0, y0), (x1, y1)], 1) & robe, SLATE)
cv.fill(cv.lines([(364, 245), (398, 259), (436, 239)], 2) & ~robe, SLATE)   # hem shadow on the tunic
cv.fill(cv.ellipse(394, 162, 4, 4), CORAL)                                # the heart
robe = robe | tunic

# arms: one continuous limb from the shoulder to the fingertips, tapering like a real arm
def arm(side):
    t = np.linspace(0, 1, 60)
    xs_ = CXS + side * (34 + 112 * t)
    yc = 129 + 3.0 * np.sin(np.pi * np.clip(t / 0.85, 0, 1)) - 4.0 * t       # slight sag, hands lift a little
    th = np.interp(t, [0, 0.12, 0.32, 0.45, 0.62, 0.80, 0.86, 0.95, 1.0],
                      [24, 20, 17, 14, 13, 10, 12, 11, 7])                   # shoulder, upper arm, elbow, wrist, hand
    top = [(x, y - w / 2) for x, y, w in zip(xs_, yc, th)]
    bot = [(x, y + w / 2) for x, y, w in zip(xs_, yc, th)]
    limb = cv.poly(top + bot[::-1])
    order = np.argsort(xs_)
    yc_at = np.interp(XX, xs_[order], yc[order])
    th_at = np.interp(XX, xs_[order], th[order])
    across = np.clip((YY - yc_at) / (th_at / 2), -1, 1)                     # -1 top .. 1 underside
    shade = 0.34 + 0.22 * side
    soap(limb, shade + 0.22 * (1 - across) * 0.6 - 0.1 * np.clip(across, 0, 1))
    # elbow crease and the fingers of the open hand
    ex, ey = CXS + side * (34 + 112 * 0.46), 129 + 3.0 * np.sin(np.pi * 0.54) - 4.0 * 0.46
    cv.fill(cv.lines([(ex, ey + 2), (ex + side * 3, ey + 6)], 1) & limb, SLATE)
    for k in (-2, 1):
        hx0 = CXS + side * (34 + 112 * 0.88)
        cv.fill(cv.lines([(hx0, 125 + k + 4), (CXS + side * 144, 125 + k + 2.5)], 1) & limb, SLATE)
    # short sleeve hanging from the upper arm
    sleeve = cv.poly([(CXS + side * 40, 139), (CXS + side * 78, 140), (CXS + side * 72, 151), (CXS + side * 48, 176)])
    soap(sleeve, shade - 0.04 + 0.12 * (1 - (YY - 139) / 37))
    cv.fill(sleeve & ~np.roll(sleeve, -1, 0), SLATE)
    cv.fill(limb & ~np.roll(limb, 1, 0) & (XX * side > CXS * side + 36 * side * 0), GOLD if side > 0 else STONE)
    return limb | sleeve

arms = arm(-1) | arm(1)
# shoulders, neck, head
shoulders = cv.poly([(386, 113), (414, 113), (426, 115), (438, 119), (446, 124), (448, 136), (352, 136), (354, 124), (362, 119), (374, 115)])
soap(shoulders, 0.40 + 0.3 * lit(CXS, 44) - 0.12 * np.clip((YY - 113) / 23, 0, 1))
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

# ---- the walkway up to the pedestal, between two balustrades ------------------------------------------
VPX, VPY = 400.0, 400.0
def along(p0, t):
    """Point a fraction t of the way from p0 toward the vanishing point."""
    return (p0[0] + (VPX - p0[0]) * t, p0[1] + (VPY - p0[1]) * t)

L0, R0 = (150.0, 600.0), (650.0, 600.0)
TF = 0.80                                            # walkway ends at the pedestal
floor = cv.poly([L0, R0, along(R0, TF), along(L0, TF)])
dist = np.clip((YY - 440) / 160, 0, 1)
v = 0.30 + 0.20 * dist + (cv.noise(6, 3, 91, 2) - 0.5) * 0.1
# paving joints converging on the vanishing point
ang = np.arctan2(YY - VPY, XX - VPX)
radial = (np.abs(((ang * 40) % 1.0) - 0.5) < 0.06)
rows = np.abs(((1 / np.maximum(YY - VPY, 1)) * 1600) % 1.0 - 0.5) < 0.06
v = np.where(radial | rows, v - 0.14, v)
cv.ramp(floor, v, [NIGHT, SLATE, STONE, CORAL])
# warm sunset sheen on the stones, and the statue's long shadow falling toward us
sheen = floor & (np.abs(XX - (440 + (YY - 440) * 0.9)) < 30 + (YY - 440) * 0.4)
cv.remap(sheen, ONE * 0.35, LIGHTER)
shadow = cv.poly([(388, 440), (412, 440), (330, 600), (250, 600)])
cv.darken(floor & shadow, ONE)

def balustrade(base0, side):
    """Balustrade along one edge of the walkway; side=-1 left, +1 right."""
    hb = 74.0
    base_far = along(base0, TF)
    s0, s1 = 1.0, 1.0 - TF
    def top_at(t):
        bx, by = along(base0, t)
        return bx, by - hb * (1 - t)
    face = cv.poly([base0, base_far, top_at(TF), top_at(0)])
    inner_lit = 0.62 if side < 0 else 0.30          # left railing faces the sun
    cv.ramp(face, inner_lit + (cv.noise(3, 3, 95 + side, 2) - 0.5) * 0.15, [NIGHT, SLATE, STONE, CORAL])
    # open band with balusters between the plinth and the top rail
    t = 0.0
    while t < TF:
        sc = 1 - t
        bx, by = along(base0, t)
        x_, y0 = bx, by - hb * sc * 0.22
        y1 = by - hb * sc * 0.80
        w = 6 * sc
        gap_w = 9 * sc
        gap = cv.rect(x_ + side * 0.0, y1, x_ + gap_w, y0) if side < 0 else cv.rect(x_ - gap_w, y1, x_, y0)
        cv.fill(gap & face, NIGHT if side > 0 else SLATE)
        # vase-shaped baluster
        cxb = x_ + (gap_w / 2 if side < 0 else -gap_w / 2)
        bal = cv.ellipse(cxb, (y0 + y1) / 2 + (y0 - y1) * 0.12, w * 0.42, (y0 - y1) * 0.36) | cv.rect(cxb - w * 0.2, y1, cxb + w * 0.2, y0)
        cv.ramp(bal & face, inner_lit + 0.12 + 0.2 * (XX - cxb) / max(w, 1), [NIGHT, SLATE, STONE, CORAL])
        t += 0.045 * (1 - t * 0.9)
    # top rail and plinth edges
    cv.fill(cv.lines([top_at(0), top_at(TF)], 4) | cv.lines([(top_at(0)[0], top_at(0)[1] + 4), (top_at(TF)[0], top_at(TF)[1] + 1)], 2), STONE)
    cv.fill(cv.lines([top_at(0), top_at(TF)], 1), GOLD if side < 0 else CORAL)
    cv.fill(cv.lines([along(base0, 0), along(base0, TF)], 2), NIGHT)

balustrade(L0, -1)
balustrade(R0, 1)

# a few visitors near the pedestal for scale
def person(x, y, h):
    m = cv.ellipse(x, y - h + 2, 1.6, 1.8) | cv.poly([(x - 2, y), (x + 2, y), (x + 1.6, y - h + 3.5), (x - 1.6, y - h + 3.5)])
    cv.fill(m, NIGHT)
for (x, y, h) in ((372, 452, 11), (380, 455, 12), (424, 458, 12)):
    person(x, y, h)

# birds
for bx, by, s in [(520, 210, 4), (538, 203, 3), (552, 214, 3)]:
    for k in range(s + 1):
        cv.c[by - k // 2, bx - s + k] = NIGHT
        cv.c[by - k // 2, bx + s - k] = NIGHT

cv.vignette(1.0)
cv.save(sys.argv[1])
