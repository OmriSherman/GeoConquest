// Display outlines: drop far-away overseas parts (French Guiana, Hawaii, Svalbard...)
// so single-country views fit the mainland. The full outline stays available for
// the world map / border mesh. Rules + decisions: planning/overseas_territories_audit.txt.

type Ring = number[][];
type Polygon = Ring[];

// Archipelago countries: the far islands ARE the country.
const KEEP_ALL = new Set(['242', '296', '583', '258', '584', '585', '090', '540', '458', '548', '776', '882', '010']);
// Max bbox gap (degrees) between a part and the mainland cluster for it to be kept.
const MAX_GAP_DEG = 4;

// Manual rules by numeric id; receive the polygon's bbox centre.
const PART_OVERRIDES: Record<string, (cx: number, cy: number) => boolean> = {
  '840': (cx, cy) => cx > -170 && cx < -60 && cy > 24, // keep Alaska + lower 48, drop Hawaii + date-line Aleutians
  '578': (cx, cy) => cx > 0 && cy < 73, // drop Svalbard + Jan Mayen
};

function bbox(poly: Polygon) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly[0]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

function ringArea(ring: Ring) {
  let a = 0;
  for (let i = 0, n = ring.length - 1; i < n; i += 1) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(a / 2);
}

// Russia: cut everything east of the date line (Chukotka's far tip). Dropping the vertices
// with negative longitude leaves a clean straight cut along 180E.
function cutRussiaAtDateLine(feat: any): any {
  const polys: Polygon[] = [];
  for (const poly of feat.geometry.coordinates as Polygon[]) {
    const rings = poly.map((r) => r.filter((c) => c[0] > 0)).filter((r) => r.length >= 3).map((r) => [...r, r[0]]);
    if (rings.length) polys.push(rings);
  }
  return { ...feat, geometry: { type: 'MultiPolygon', coordinates: polys } };
}

export function trimToMainland(numericId: string, feat: any): any {
  if (numericId === '643' && feat?.geometry?.type === 'MultiPolygon') feat = cutRussiaAtDateLine(feat);
  if (!feat || feat.geometry?.type !== 'MultiPolygon' || KEEP_ALL.has(numericId)) return feat;
  const polys: Polygon[] = feat.geometry.coordinates;
  const boxes = polys.map(bbox);
  let kept: number[];
  const override = PART_OVERRIDES[numericId];
  if (override) {
    kept = polys.map((_, i) => i).filter((i) => override((boxes[i].x0 + boxes[i].x1) / 2, (boxes[i].y0 + boxes[i].y1) / 2));
  } else {
    const areas = polys.map((p) => ringArea(p[0]));
    const seed = areas.indexOf(Math.max(...areas));
    kept = [seed];
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < polys.length; i += 1) {
        if (kept.includes(i)) continue;
        for (const j of kept) {
          const gx = Math.max(0, boxes[i].x0 - boxes[j].x1, boxes[j].x0 - boxes[i].x1);
          const gy = Math.max(0, boxes[i].y0 - boxes[j].y1, boxes[j].y0 - boxes[i].y1);
          if (Math.hypot(gx, gy) <= MAX_GAP_DEG) { kept.push(i); grew = true; break; }
        }
      }
    }
  }
  if (!kept.length || kept.length === polys.length) return feat;
  const coordinates = kept.map((i) => polys[i]);
  return { ...feat, geometry: kept.length === 1 ? { type: 'Polygon', coordinates: coordinates[0] } : { type: 'MultiPolygon', coordinates } };
}
