// Build-time generator: localized country names + capitals, keyed by cca2.
// Names  -> i18n-iso-countries (bundled CLDR data)
// Capitals -> one Wikidata SPARQL query, English offline value as fallback.
// Output ships as app/assets/data/country-i18n.json; this script and its
// dep (i18n-iso-countries) are NOT needed at runtime.
// Run: node scripts/gen-country-i18n.js
//
// ponytail: capitals via Wikidata label match on ISO alpha-2 (P297); any
// country/lang Wikidata can't resolve falls back to English. Re-run to refresh.

const fs = require('fs');
const path = require('path');
const countries = require('i18n-iso-countries');

// Wikidata/CLDR language tags (zh = Simplified in i18n-iso-countries).
const LOCALES = ['en', 'es', 'fr', 'hi', 'zh', 'he', 'ar'];
// App-facing locale codes, and their name-package locale.
const APP_LOCALES = ['en', 'es', 'fr', 'hi', 'zh-Hans', 'he', 'ar'];
const NAME_LOCALE = { 'zh-Hans': 'zh' };

const offline = require('../app/assets/data/countries-offline.json');

for (const l of LOCALES) {
  countries.registerLocale(require(`i18n-iso-countries/langs/${l}.json`));
}

// Common short name: shorter of official/alias, but never an all-caps
// abbreviation (keeps "United Kingdom", not "UK"). Falls back to offline English.
function commonName(cca2, nameLoc, fallback) {
  const official = countries.getName(cca2, nameLoc);
  const alias = countries.getName(cca2, nameLoc, { select: 'alias' });
  const cands = [official, alias].filter(Boolean);
  if (!cands.length) return fallback;
  const usable = cands.filter((n) => !/^[A-Z]{2,4}$/.test(n));
  return (usable.length ? usable : cands).sort((a, b) => a.length - b.length)[0];
}

async function fetchCapitals() {
  // capital (P36) of each country that has an ISO alpha-2 (P297),
  // with the capital's label in each target language. Also pull zh-hans/zh-cn
  // because plain "zh" labels are often Traditional characters.
  const capLangs = [...LOCALES, 'zh-hans', 'zh-cn'];
  const query = `
    SELECT ?iso ?capLabel WHERE {
      ?country wdt:P297 ?iso ; wdt:P36 ?cap .
      ?cap rdfs:label ?capLabel .
      FILTER(LANG(?capLabel) IN ("${capLangs.join('","')}"))
    }`;
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'GeoConquest-i18n/1.0 (build script)', Accept: 'application/sparql-results+json' },
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const json = await res.json();
  // { CCA2: { lang: capitalName } }
  const caps = {};
  for (const b of json.results.bindings) {
    const cca2 = b.iso.value.toUpperCase();
    const lang = b.capLabel['xml:lang'];
    (caps[cca2] ||= {})[lang] = b.capLabel.value;
  }
  return caps;
}

(async () => {
  const caps = await fetchCapitals();

  // out[locale][cca2] = { name, capital }
  const out = {};
  let missingName = 0, missingCap = 0;
  for (const appLocale of APP_LOCALES) {
    const nameLoc = NAME_LOCALE[appLocale] || appLocale;
    // Wikidata capital lang preference; Simplified Chinese prefers hans/cn over bare zh.
    const capLangs = appLocale === 'zh-Hans' ? ['zh-hans', 'zh-cn', 'zh'] : [nameLoc];
    out[appLocale] = {};
    for (const c of offline) {
      const cca2 = c.cca2;
      const name = commonName(cca2, nameLoc, c.name);
      if (!countries.getName(cca2, nameLoc)) missingName++;
      const capital = capLangs.map((l) => caps[cca2]?.[l]).find(Boolean) || c.capital || '';
      if (c.capital && !capLangs.some((l) => caps[cca2]?.[l])) missingCap++;
      out[appLocale][cca2] = { name, capital };
    }
  }

  const outPath = path.join(__dirname, '..', 'app', 'assets', 'data', 'country-i18n.json');
  fs.writeFileSync(outPath, JSON.stringify(out));
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`wrote ${outPath} (${kb} KB)`);
  console.log(`name fallbacks to English: ${missingName} (of ${offline.length * APP_LOCALES.length})`);
  console.log(`capital fallbacks to English: ${missingCap}`);
})();
