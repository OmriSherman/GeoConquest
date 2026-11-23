"""Ha Long Bay at golden sunset - 1600x1200, exactly 10 colors."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from pixkit import Canvas, W, H

PAL = [
    (0x0E, 0x1A, 0x1A),  # 0 NIGHT      nearest karst shade
    (0x1E, 0x3A, 0x34),  # 1 DEEPGREEN  jungle on the karsts
    (0x3E, 0x6A, 0x5A),  # 2 JADE       mid karsts, upper sky, water
    (0x8A, 0xA0, 0x8A),  # 3 HAZE       far karsts
    (0xE6, 0xD8, 0xB0),  # 4 MIST       sky near the sun, mist
    (0xF6, 0xC0, 0x60),  # 5 GOLD       sun glow
    (0xFF, 0xF2, 0xCE),  # 6 SUN        sun core, glints
    (0xE8, 0x95, 0x6A),  # 7 PEACH      warm sky, lit cloud
    (0xC0, 0x40, 0x2A),  # 8 SAIL       junk sails
    (0x5A, 0x32, 0x26),  # 9 WOOD       hulls, battens
]
NIGHT, DEEP, JADE, HAZE, MIST, GOLD, SUN, PEACH, SAIL, WOOD = range(10)
DARKER = {SUN: GOLD, GOLD: PEACH, PEACH: SAIL, SAIL: WOOD, WOOD: NIGHT, MIST: HAZE, HAZE: JADE,
          JADE: DEEP, DEEP: NIGHT, NIGHT: NIGHT}
LIGHTER = {NIGHT: DEEP, DEEP: JADE, JADE: HAZE, HAZE: MIST, MIST: SUN, PEACH: GOLD, GOLD: SUN,
           WOOD: SAIL, SAIL: PEACH}
cv = Canvas(PAL, DARKER)
XX, YY = cv.XX, cv.YY
ALL = np.ones((H, W), bool)
ONE = np.ones((H, W), np.float32)
rng = np.random.default_rng(18)
WATER = 404
SUNXY = (500.0, 268.0)

# ---- sky -------------------------------------------------------------------------------------
yn = np.clip(YY / WATER, 0, 1)
ds = np.hypot(XX - SUNXY[0], (YY - SUNXY[1]) * 1.4)
sky = 0.12 + 0.40 * yn ** 1.4 + 0.40 * np.exp(-ds / 230) + 0.2 * np.exp(-ds / 60)
cv.ramp(ALL, sky + (cv.noise(240, 40, 1) - 0.5) * 0.04, [DEEP, JADE, HAZE, MIST, GOLD, SUN])
d = np.hypot(XX - SUNXY[0], YY - SUNXY[1])
cv.fill(d <= 22, GOLD)
cv.fill(d <= 17, SUN)
CL = [JADE, HAZE, PEACH, GOLD, SUN]
cv.cloud(110, 300, 860, 10, 81, CL, SUNXY, 0.58)
cv.cloud(170, -40, 340, 8, 82, CL, SUNXY, 0.6)
cv.cloud(222, 560, 860, 7, 83, CL, SUNXY, 0.6)
for bx, by, s in [(610, 176, 4), (626, 169, 3), (640, 180, 3), (596, 186, 2)]:
    for k in range(s + 1):
        cv.c[by - k // 2, bx - s + k] = NIGHT
        cv.c[by - k // 2, bx + s - k] = NIGHT

# ---- karst towers, far to near ------------------------------------------------------------------
def karst(cx, w, h, ramp, v0, seed, lit=0.25, tex=0.2, undercut=0.18, lean=0.0):
    """Limestone tower: near-vertical cliffs, an irregular jungle-capped crown, a notch at the waterline."""
    r = np.random.default_rng(seed)
    xs = XX[0]
    rel = (xs - cx) / w
    inside = np.abs(rel) < 1
    bumps = cv.noise(max(2.5, w / 2.2), 40, seed, 3)[0]
    crown = np.clip(1 - np.abs(rel) ** r.uniform(1.8, 3.0), 0, 1) ** 0.26
    top_x = WATER - h * crown * (0.80 + 0.34 * (bumps - 0.5) + 0.14 * r.uniform(-1, 1) * rel)
    top_x = np.where(inside, top_x, H)[None, :]
    m = (YY >= top_x) & (YY <= WATER)
    base_zone = np.clip((YY - (WATER - h * 0.12)) / (h * 0.12), 0, 1)
    m &= np.abs((XX - cx) / w + lean * base_zone) < 1 - undercut * base_zone      # eroded notch
    side_jag = cv.noise(3, 6, seed + 3, 2)
    m &= ~((np.abs((XX - cx) / w) > 0.86) & (side_jag > 0.55))
    u = np.clip((XX - cx) / w, -1, 1)
    crowns = cv.noise(2.5, 2.5, seed + 1, 2)
    cliff = (cv.noise(2, 16, seed + 2, 2) > 0.6) & ((YY - top_x) > 8)
    cap = (YY - top_x) < 10 + 8 * crowns
    v = v0 - lit * u + (crowns - 0.5) * tex - 0.06 * np.clip((YY - top_x) / h, 0, 1)
    v = np.where(cliff, v + 0.14, v)
    v = np.where(cap, v - 0.06, v)
    cv.ramp(m, v, ramp)
    rim = m & ~np.roll(m, 1, 1) & (XX < SUNXY[0] + 60)
    rim |= m & ~np.roll(m, -1, 1) & (XX > SUNXY[0] - 60)
    rim |= m & ~np.roll(m, 1, 0)
    cv.fill(rim & ((YY - top_x) < h * 0.7), ramp[-1])
    return m

def layer(spec, ramp, v0, lit, tex, seed0):
    for i, (cx, w, h) in enumerate(spec):
        karst(cx, w, h, ramp, v0, seed0 + i, lit=lit, tex=tex)

# farthest, pale in the golden haze
layer([(40, 22, 56), (92, 16, 80), (140, 26, 48), (196, 12, 40), (300, 20, 66), (350, 14, 90), (398, 24, 52),
       (452, 10, 34), (612, 22, 76), (652, 14, 98), (700, 26, 60), (752, 18, 84), (790, 12, 50)],
      [HAZE, MIST, GOLD], 0.45, 0.10, 0.08, 100)
cv.remap(YY > WATER - 30, ONE * 0.45 * np.clip((YY - (WATER - 30)) / 30, 0, 1), LIGHTER)        # low mist
layer([(26, 30, 128), (88, 22, 162), (226, 30, 112), (276, 18, 146), (330, 14, 60), (470, 12, 44), (556, 26, 128),
       (628, 32, 160), (720, 26, 124), (770, 16, 70)], [JADE, HAZE, MIST, GOLD], 0.34, 0.18, 0.14, 200)
cv.remap(YY > WATER - 22, ONE * 0.35 * np.clip((YY - (WATER - 22)) / 22, 0, 1), LIGHTER)
layer([(170, 40, 206), (246, 26, 160), (300, 16, 74), (520, 14, 66), (596, 42, 214), (684, 34, 170)],
      [NIGHT, DEEP, JADE, HAZE, PEACH], 0.36, 0.24, 0.26, 300)

# ---- water: reflections, gold path, ripples ---------------------------------------------------------
pond = YY >= WATER
ys_, xs_ = np.nonzero(pond)
src_y = np.clip(2 * WATER - ys_, 0, H - 1)
calm = np.clip((ys_ - WATER) / 100, 0.2, 1)
wob = ((np.sin(ys_ * 0.6) * 1.2 + np.sin(ys_ * 0.17 + 1.3)) * calm).round().astype(int)
cv.c[ys_, xs_] = cv.c[src_y, np.clip(xs_ + wob, 0, W - 1)]
gt = np.clip((YY - WATER) / (H - WATER), 0, 1)
cv.darken(pond, 0.5 + 0.35 * gt)
for _ in range(320):
    yy = int(WATER + 2 + rng.random() ** 1.2 * (H - WATER - 4))
    spread = 10 + 90 * (yy - WATER) / (H - WATER)
    xx = int(SUNXY[0] + rng.normal(0, spread))
    ln = int(2 + 8 * rng.random() * (0.5 + gt[yy, 0]))
    if 0 <= xx < W - ln:
        cv.c[yy, xx:xx + ln] = SUN if rng.random() < 0.35 else GOLD
for _ in range(160):                                                     # ripple lines on the water
    yy = int(WATER + 6 + rng.random() * (H - WATER - 8))
    xx = int(rng.uniform(0, W))
    ln = int(4 + 18 * (yy - WATER) / (H - WATER))
    if xx + ln < W and cv.c[yy, xx] in (DEEP, JADE, NIGHT):
        cv.c[yy, xx:xx + ln] = JADE if cv.c[yy, xx] != JADE else HAZE
cv.fill(cv.rect(0, WATER, W, WATER + 1), HAZE)

# ---- junk boats with red batwing sails ----------------------------------------------------------------
def junk(x, y, s, flip=1):
    P = lambda px, py: (x + flip * px * s, y + py * s)
    hull = cv.poly([P(-24, -6), P(22, -6), P(30, -14), P(28, -4), P(18, 2), P(-18, 2), P(-26, -2), P(-32, -12)])
    cv.ramp(hull, 0.35 + 0.3 * (-(YY - y) / (8 * s)), [NIGHT, WOOD, SAIL])
    cv.fill(cv.lines([P(-26, -6), P(26, -6)], max(1, int(s))), GOLD)
    for (mx, mh, sw) in ((-12, 46, 13), (4, 56, 16), (18, 40, 11)):
        cv.fill(cv.lines([P(mx, -6), P(mx, -6 - mh)], max(1, int(s * 0.8))), NIGHT)
        top, bot = -6 - mh, -10
        sail = cv.poly([P(mx - sw * 0.35, top), P(mx + sw * 0.55, top + 2), P(mx + sw, bot - 2), P(mx - sw * 0.7, bot)])
        fan = np.clip((YY - (y + top * s)) / ((bot - top) * s), 0, 1)
        cv.ramp(sail, 0.45 + 0.35 * (1 - fan) * 0.6 + 0.15 * flip * (XX - x - mx * s * flip) / (sw * s), [WOOD, SAIL, PEACH, GOLD])
        for k in range(1, 7):                                            # battens fanning out
            yy = top + (bot - top) * k / 7
            cv.fill(cv.lines([P(mx - sw * (0.35 + 0.05 * k), yy), P(mx + sw * (0.55 + 0.065 * k), yy + 1)], 1) & sail, WOOD)
    # reflection of the boat
    refl = (np.abs(XX - x) < 34 * s) & (YY > y + 2) & (YY < y + 2 + 40 * s)
    cv.darken(refl & (cv.noise(3, 2, int(x), 1) > 0.45), ONE * 0.7)

junk(560, 470, 1.25, -1)
junk(214, 438, 0.8, 1)
junk(412, 416, 0.45, 1)

# small fishing boat in the foreground
fb = cv.poly([(320, 540), (380, 540), (372, 548), (328, 548)])
cv.fill(fb, NIGHT)
cv.fill(cv.lines([(330, 540), (370, 540)], 1), GOLD)
cv.fill(cv.ellipse(352, 532, 6, 5) & (YY < 536), NIGHT)                   # rower with a conical hat
cv.fill(cv.poly([(344, 528), (360, 528), (352, 522)]), WOOD)
cv.fill(cv.lines([(358, 534), (372, 554)], 1), NIGHT)

# ---- the near karst framing the left edge, with jungle and hanging vines ---------------------------------
near = karst(-6, 96, 310, [NIGHT, DEEP, JADE, PEACH], 0.30, 401, lit=0.3, tex=0.4, undercut=0.25, lean=0.1)
near |= karst(806, 70, 230, [NIGHT, DEEP, JADE, PEACH], 0.28, 402, lit=0.3, tex=0.4, undercut=0.25)
vines = near & (cv.noise(2, 14, 403, 2) > 0.7)
cv.fill(vines, DEEP)

cv.vignette(1.0)
cv.save(sys.argv[1])
