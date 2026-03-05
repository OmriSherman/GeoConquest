const fs = require("fs");
const topojson = require("topojson-client");
const data = JSON.parse(fs.readFileSync("countries-50m.json", "utf8"));
const geojson = topojson.feature(data, data.objects.countries);
const targets = ["036", "792", "598", "408", "450", "466", "191", "478", "324"];

targets.forEach(id => {
  const feat = geojson.features.find(f => f.id === id);
  if (feat) {
     console.log(`Found ${id}: ${feat.properties.name}, coords length: ${feat.geometry.coordinates.length}`);
  } else {
     console.log(`Missing ${id}`);
  }
});
