/**
 * Generates offline data files for GeoConquest:
 *   app/assets/data/flags-offline.json    — minimal flag data (~15KB, free offline for all)
 *   app/assets/data/countries-offline.json — full country data (~100KB, premium offline)
 *
 * Run once: node scripts/generate-offline-data.mjs
 * Commit the output files to the repo.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../app/assets/data');

mkdirSync(OUT_DIR, { recursive: true });

console.log('Fetching from RestCountries API...');
const res = await fetch(
  'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,ccn3,flags,borders,region,population,area,capital'
);
if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
const raw = await res.json();

// Filter out entries without required fields
const valid = raw.filter(c => c.cca2 && c.name?.common);

// ── flags-offline.json ─────────────────────────────────────────────────────
// Minimal: name + cca2 + flag emoji (enough for Flag Quiz)
const flagsData = valid
  .map(c => ({
    name: c.name.common,
    cca2: c.cca2,
    flag: c.flags?.alt ?? '',       // alt text as fallback label
    // Flag emoji is derived from cca2 at runtime (no storage needed)
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  join(OUT_DIR, 'flags-offline.json'),
  JSON.stringify(flagsData, null, 2),
  'utf8'
);
console.log(`flags-offline.json: ${flagsData.length} countries`);

// ── countries-offline.json ─────────────────────────────────────────────────
// Full data: everything needed for all quizzes
const countriesData = valid
  .filter(c => c.flags?.png)
  .map(c => ({
    name:       c.name.common,
    cca2:       c.cca2,
    cca3:       c.cca3 || '',
    ccn3:       c.ccn3 || '',
    flagUrl:    c.flags.png,
    borders:    c.borders ?? [],
    region:     c.region || '',
    population: c.population ?? 0,
    area:       c.area ?? 0,
    capital:    c.capital?.[0] ?? '',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  join(OUT_DIR, 'countries-offline.json'),
  JSON.stringify(countriesData, null, 2),
  'utf8'
);
console.log(`countries-offline.json: ${countriesData.length} countries`);

console.log('\nDone. Files written to app/assets/data/');
