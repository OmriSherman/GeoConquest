// Self-check for the localization overlay logic (mirrors localizeCountries in countryData.ts).
// Run: node scripts/test-country-i18n.js
const assert = require('assert');
const table = require('../app/assets/data/country-i18n.json');
const offline = require('../app/assets/data/countries-offline.json');

function localize(list, locale) {
  const t = table[locale];
  if (!t || locale === 'en') return list;
  return list
    .map((c) => (t[c.cca2] ? { ...c, name: t[c.cca2].name || c.name, capital: t[c.cca2].capital || c.capital } : c))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

const base = offline.map((c) => ({ cca2: c.cca2, name: c.name, capital: c.capital }));
const byCca2 = (list) => Object.fromEntries(list.map((c) => [c.cca2, c]));

// en passes through unchanged (curated base names kept)
assert.strictEqual(localize(base, 'en'), base, 'en should be identity');

// Every locale covers all countries and swaps names
for (const loc of ['es', 'fr', 'hi', 'zh-Hans', 'he']) {
  const out = byCca2(localize(base, loc));
  assert.strictEqual(Object.keys(out).length, base.length, `${loc}: count mismatch`);
  for (const c of base) assert.ok(out[c.cca2].name, `${loc}: ${c.cca2} missing name`);
}

// Spot-check known translations (name / capital)
const cases = [
  ['fr', 'FR', 'France', 'Paris'],
  ['es', 'FR', 'Francia', 'París'],
  ['hi', 'IN', 'भारत', 'नई दिल्ली'],
  ['he', 'IL', 'ישראל', 'ירושלים'],
  ['zh-Hans', 'GB', '英国', '伦敦'],
  ['he', 'FR', 'צרפת', 'פריז'],
];
for (const [loc, cca2, name, capital] of cases) {
  const c = byCca2(localize(base, loc))[cca2];
  assert.strictEqual(c.name, name, `${loc}/${cca2} name: got ${c.name}`);
  assert.strictEqual(c.capital, capital, `${loc}/${cca2} capital: got ${c.capital}`);
}

// Answer-matching is index-based, so distractors must stay distinct after localization.
const sample = localize(base, 'hi').slice(0, 4).map((c) => c.name);
assert.strictEqual(new Set(sample).size, 4, 'localized names should stay unique');

console.log('OK — all localization checks passed');
