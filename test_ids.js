const fs = require('fs');
const data = JSON.parse(fs.readFileSync('countries-50m.json', 'utf8'));
const features = data.objects.countries.geometries;

const targets = {
  "Guinea": "GN",
  "Turkey": "TR",
  "Australia": "AU",
  "Papua New Guinea": "PG",
  "North Korea": "KP",
  "Madagascar": "MG",
  "Mali": "ML",
  "Croatia": "HR",
  "Mauritania": "MR",
  "Svalbard": "SJ"
};

for (const [name, expectedA2] of Object.entries(targets)) {
   const match = features.find(f => f.properties.name.toLowerCase().includes(name.toLowerCase()));
   if (match) {
      console.log(`${name}: id=${match.id}, name=${match.properties.name}`);
   } else {
      console.log(`${name}: NOT FOUND`);
   }
}
