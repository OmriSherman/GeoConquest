import { feature } from 'topojson-client';
import { geoPath, geoMercator } from 'd3-geo';

// We import the huge JSON directly so it bundles offline
import worldAtlas from '../assets/map/countries-50m.json';

let cachedFeatures: any[] | null = null;
let cachedBounds: Record<string, any> | null = null;

export function getMapFeatures() {
    if (cachedFeatures) return cachedFeatures;

    const topo = worldAtlas as any;
    const geojson = feature(topo, topo.objects.countries) as any;

    const filteredFeatures = geojson.features.filter((f: any) => f.properties.name !== 'Antarctica');
    const filteredGeojson = { type: 'FeatureCollection', features: filteredFeatures };

    // Use fitSize directly on the filtered feature collection, ensuring
    // that the map perfectly touches the 800x600 edges natively, so
    // scale=1.0 covers the exact bounding limits constraints natively.
    const projection = geoMercator()
        .fitSize([800, 600], filteredGeojson as any);

    const pathGenerator = geoPath().projection(projection);

    cachedFeatures = filteredFeatures.map((f: any) => {
        const svgPath = pathGenerator(f);
        return {
            name: f.properties.name,
            d: svgPath,
            bounds: pathGenerator.bounds(f),
            centroid: pathGenerator.centroid(f),
            rawFeature: f
        };
    });

    return cachedFeatures;
}

// Function to fetch bounds
export function getBoundsMap(features: any[], cca2Map: Record<string, string>) {
    if (cachedBounds) return cachedBounds;

    const bMap: Record<string, any> = {};
    features.forEach(f => {
        const cca2 = cca2Map[f.name];
        if (cca2) {
            bMap[cca2] = f.bounds;
        }
    });

    cachedBounds = bMap;
    return bMap;
}
