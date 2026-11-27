// Builds app/assets/map/shape-overrides.json: detailed Natural Earth 1:10m outlines
// (world-atlas countries-10m.json, public domain) for countries whose 50m outline is
// missing or rough, keyed by the app's numeric id. Usage:
//   node scripts/build-shape-overrides.cjs path/to/countries-10m.json
const fs = require('fs');
const { feature } = require('topojson-client');
const { geoArea } = require('d3-geo');
const topo = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const f10 = feature(topo, topo.objects.countries).features;
const f50t = JSON.parse(fs.readFileSync(__dirname + '/../app/assets/map/countries-50m.json', 'utf8'));
const f50 = feature(f50t, f50t.objects.countries).features;

const pts = (g) => JSON.stringify(g.coordinates).split('],[').length;
const round = (c, k = 1000) => (typeof c[0] === 'number' ? c.map((v) => Math.round(v * k) / k) : c.map((x) => round(x, k)));
const out = {};
// Clean polygons: drop degenerate ones (e.g. the 10m Vatican is a zero-area sliver) and
// re-wind any whose ring order makes d3 treat it as 'the whole sphere minus the island',
// which fills the entire view (that was the Maldives / Vatican squares).
const cleanGeometry = (g) => {
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates)
    .filter((p) => new Set(p[0].map((c) => c.join())).size >= 4)
    .map((p) => (geoArea({ type: 'Polygon', coordinates: p }) > 2 * Math.PI ? p.map((r) => [...r].reverse()) : p))
    .filter((p) => { const a = geoArea({ type: 'Polygon', coordinates: p }); return a > 1e-12 && a < 2 * Math.PI; });
  return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
};
const put = (num, geometry, k = 1000) => { // round first, then clean: rounding can collapse tiny rings into degenerate ones
  const g = cleanGeometry({ ...geometry, coordinates: round(geometry.coordinates, k) });
  if (g.coordinates.length) out[num] = { type: 'Feature', properties: {}, geometry: g };
};

// 1) Same id in 10m: use it when it has clearly more detail than 50m.
for (const f of f10) {
  if (f.id === undefined && f.properties.name !== 'Kosovo') continue; // other id-less units (Somaliland...) are not app countries
  const id = f.id === undefined ? '-99' : String(f.id);
  const old = f50.find((g) => String(g.id) === id);
  if (!old || (pts(old.geometry) < 120 && pts(f.geometry) > pts(old.geometry) * 1.5)) put(id, f.geometry);
}
// 2) French overseas regions are polygons of France in the data: split by location.
const france = f10.find((f) => f.properties.name === 'France').geometry.coordinates;
const regions = { '254': (x, y) => x < -50 && y < 7 && y > 0, '474': (x, y) => y > 14 && y < 15 && x < -60.5,
  '312': (x, y) => y > 15.5 && y < 17 && x < -61, '638': (x) => x > 55 && x < 56, '175': (x) => x > 44 && x < 46 };
for (const [num, test] of Object.entries(regions)) {
  const parts = france.filter((p) => test(p[0][0][0], p[0][0][1]));
  put(num, { type: 'MultiPolygon', coordinates: parts });
}
// 3) Svalbard (SJ) is cropped from Norway's 10m outline: the polygons north of 73N.
const norway = f10.find((f) => f.properties.name === 'Norway').geometry.coordinates;
put('744', { type: 'MultiPolygon', coordinates: norway.filter((p) => p[0][0][1] > 73) });
// 4) 50m outlines with inverted winding (e.g. Vatican) would fill the whole view: re-wind them.
for (const f of f50) {
  const id = String(f.id);
  if (!out[id] && geoArea(f) > 2 * Math.PI) { put(id, f.geometry); console.log('re-wound 50m', f.properties.name); }
}
// 5) Vatican City: neither the 50m nor the 10m outline is usable (a 5-point trapezoid / a zero-area
// sliver). scripts/data/vatican-trace.json is the silhouette traced automatically from a reference
// outline image (image pixels); map it to lon/lat at one scale.
const VATICAN_PX = JSON.parse(fs.readFileSync(__dirname + '/data/vatican-trace.json', 'utf8'));
put('336', { type: 'Polygon', coordinates: [VATICAN_PX.map(([x, y]) => [12.4375 + x * 0.00004, 41.9055 - y * 0.00004])] }, 100000);

// 6) Singapore: the 10m outline is a plain blob. scripts/data/singapore-trace.json holds contours
// traced automatically (skimage find_contours) from a reference silhouette, in image pixels;
// map them to lon/lat at one scale (the whole shape spans ~0.45 degrees of longitude).
const SG_RINGS = JSON.parse(fs.readFileSync(__dirname + '/data/singapore-trace.json', 'utf8'));
const SG_SCALE = 0.45 / 127;
put('702', { type: 'MultiPolygon', coordinates: SG_RINGS.map((ring) => [ring.map(([x, y]) => [103.6 + (x - 14.7) * SG_SCALE, 1.47 - y * SG_SCALE])]) }, 100000);
fs.writeFileSync(__dirname + '/../app/assets/map/shape-overrides.json', JSON.stringify(out));
console.log(Object.keys(out).length, 'overrides:', Object.keys(out).join(' '));
