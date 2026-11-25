"""Shared helpers for wonder art: an 800x600 palette-index canvas that exports a
1600x1200 PNG with EXACTLY 10 colors (nearest-neighbor 2x, no blending)."""
import numpy as np
from PIL import Image, ImageDraw

W, H, SCALE = 800, 600, 2


def _bayer(n):
    if n == 1:
        return np.array([[0]])
    b = _bayer(n // 2)
    return np.block([[4 * b, 4 * b + 2], [4 * b + 3, 4 * b + 1]])


class Canvas:
    def __init__(self, palette, darker):
        assert len(palette) == 10 and len(set(palette)) == 10
        self.pal = palette
        self.lut = np.array([darker[i] for i in range(10)], np.uint8)
        self.c = np.zeros((H, W), np.uint8)
        self.YY, self.XX = np.mgrid[0:H, 0:W].astype(np.float32)
        b = (_bayer(8) + 0.5) / 64.0
        self.THR = np.tile(b, (H // 8 + 1, W // 8 + 1))[:H, :W]

    # -- filling -------------------------------------------------------------
    def ramp(self, mask, val, ramp):
        """Dither val (0..1) across the ramp colors inside mask."""
        ramp = np.asarray(ramp, np.uint8)
        val = np.broadcast_to(np.asarray(val, np.float32), (H, W))
        f = np.clip(val, 0, 0.9999) * (len(ramp) - 1)
        i = np.floor(f).astype(int)
        idx = np.minimum(i + ((f - i) > self.THR), len(ramp) - 1)
        self.c[mask] = ramp[idx][mask]

    def fill(self, mask, color):
        self.c[mask] = color

    def darken(self, mask, strength):
        """One step darker (per the darker map), dithered by strength 0..1."""
        s = np.broadcast_to(np.asarray(strength, np.float32), (H, W))
        m = mask & (s > self.THR)
        self.c[m] = self.lut[self.c[m]]

    def remap(self, mask, strength, mapping):
        """Swap colors through an arbitrary {from: to} map (e.g. a 'lighter'
        map for mist), dithered by strength 0..1. Unmapped colors stay."""
        lut = np.array([mapping.get(i, i) for i in range(10)], np.uint8)
        s = np.broadcast_to(np.asarray(strength, np.float32), (H, W))
        m = mask & (s > self.THR)
        self.c[m] = lut[self.c[m]]

    # -- shapes --------------------------------------------------------------
    def poly(self, pts):
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in pts], fill=1)
        return np.array(m, bool)

    def ellipse(self, cx, cy, rx, ry):
        return ((self.XX - cx) / rx) ** 2 + ((self.YY - cy) / ry) ** 2 <= 1.0

    def rect(self, x0, y0, x1, y1):
        return (self.XX >= x0) & (self.XX < x1) & (self.YY >= y0) & (self.YY < y1)

    def arch(self, x0, x1, ys, yb, k=0.85):
        """Pointed (Islamic) arch: sides x0..x1, springs at ys, bottom at yb."""
        w = x1 - x0
        r = k * w
        XX, YY = self.XX, self.YY
        body = (XX >= x0) & (XX < x1) & (YY >= ys) & (YY < yb)
        top = (YY < ys) & (np.hypot(XX - (x0 + r), YY - ys) <= r) & (np.hypot(XX - (x1 - r), YY - ys) <= r)
        return body | top

    def lines(self, pts, width=1):
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).line([(float(x), float(y)) for x, y in pts], fill=1, width=width)
        return np.array(m, bool)

    # -- noise ---------------------------------------------------------------
    def noise(self, sx, sy, seed, octaves=3):
        r = np.random.default_rng(seed)
        out = np.zeros((H, W), np.float32)
        amp, tot = 1.0, 0.0
        for _ in range(octaves):
            gx, gy = max(2, int(W / sx) + 3), max(2, int(H / sy) + 3)
            small = r.random((gy, gx)).astype(np.float32)
            big = Image.fromarray(small, "F").resize((max(W, int(gx * sx)), max(H, int(gy * sy))), Image.BICUBIC)
            out += amp * np.array(big)[:H, :W]
            tot += amp
            amp *= 0.5
            sx, sy = max(1, sx / 2), max(1, sy / 2)
        out /= tot
        return (out - out.min()) / (out.max() - out.min() + 1e-6)

    def cloud(self, cy, x0, x1, th, seed, ramp, light_xy, thr=0.52):
        n = self.noise(90, 14, seed, 4)
        env = np.exp(-((self.YY - cy) / th) ** 2)
        xw = np.clip(np.minimum(self.XX - x0, x1 - self.XX) / 80, 0, 1)
        dens = n * env * xw
        m = dens > thr * 0.55
        rel = np.clip((self.YY - (cy - th)) / (2 * th), 0, 1)
        near = np.exp(-np.hypot(self.XX - light_xy[0], self.YY - light_xy[1]) / 260)
        v = 0.12 + 0.30 * rel + 0.55 * near + 0.25 * (dens - thr * 0.55)
        self.ramp(m, v, ramp)

    def vignette(self, strength=1.1):
        vx = (self.XX - W / 2) / (W / 2)
        vy = (self.YY - H * 0.45) / (H * 0.55)
        vig = np.clip((vx ** 2 * 0.9 + vy ** 2 * 0.8) - 0.55, 0, 1) * strength
        allm = np.ones((H, W), bool)
        self.darken(allm, vig)
        self.darken(allm, vig - 0.45)

    # -- export --------------------------------------------------------------
    def save(self, out):
        arr = np.array(self.pal, np.uint8)[self.c]
        big = Image.fromarray(arr, "RGB").resize((W * SCALE, H * SCALE), Image.NEAREST)
        big.save(out, optimize=True)
        chk = Image.open(out).convert("RGB")
        cols = chk.getcolors(1 << 20)
        assert chk.size == (1600, 1200)
        assert len(cols) == 10, f"must be exactly 10 colors, got {len(cols)}"
        tot = 1600 * 1200
        for n, c in sorted(cols, reverse=True):
            print("#%02X%02X%02X  %4.1f%%" % (*c, 100 * n / tot))
