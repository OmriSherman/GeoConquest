import { Country } from '../types';
import { supabase } from './supabase';

// ─── Types (RestCountries API shape) ─────────────────────────────────────────

interface RestCountry {
  name: { common: string };
  cca2: string;
  cca3: string;
  ccn3?: string;
  flags: { png: string; svg: string };
  borders?: string[]; // cca3 codes
  region: string;
  population: number;
  area: number;
  capital?: string[];
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

let _cache: Country[] | null = null;

// CCA3 → CCA2 lookup for resolving neighbor codes
let _cca3ToCca2: Record<string, string> = {};
let _ccn3ToCca2: Record<string, string> = {};

export function getCca3ToCca2Map(): Record<string, string> {
  return _cca3ToCca2;
}

export function getCcn3ToCca2Map(): Record<string, string> {
  return _ccn3ToCca2;
}

// ─── Fetch & Transform ────────────────────────────────────────────────────────

export async function fetchCountries(): Promise<Country[]> {
  if (_cache) return _cache;

  // Try Supabase cache first
  const { data: cached } = await supabase
    .from('countries')
    .select('*')
    .order('name');

  if (cached && cached.length > 50) {
    // Check if cache has the new cca3 field — if not, it's stale
    const hasNewFields = cached.some((c: any) => c.cca3 && c.cca3.length > 0);
    const hasAfghanistan = cached.some((c: any) => c.cca2 === 'AF' && c.flag_url);

    if (!hasNewFields || !hasAfghanistan) {
      // console.log(`[Countries] Cache stale (missing cca3: ${!hasNewFields}, missing AF: ${!hasAfghanistan}), re-fetching from API...`);
      // Fall through to API fetch below
    } else {
      _cache = cached.map((c: any) => ({
        name: c.name,
        cca2: c.cca2,
        cca3: c.cca3 || '',
        ccn3: c.ccn3 || '',
        flagUrl: c.flag_url,
        borders: c.borders ?? [],
        region: c.region,
        population: c.population ?? 0,
        area: c.area ?? 0,
        capital: c.capital || '',
      }));

      // Build CCA3→CCA2 and CCN3→CCA2 map
      for (const c of _cache!) {
        if (c.cca3) _cca3ToCca2[c.cca3] = c.cca2;
        if (c.ccn3) _ccn3ToCca2[c.ccn3] = c.cca2;
      }

      return _cache;
    }
  }
  // Fetch from REST Countries API
  const res = await fetch(
    'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,ccn3,flags,borders,region,population,area,capital'
  );
  if (!res.ok) throw new Error(`RestCountries fetch failed: ${res.status}`);

  const raw: RestCountry[] = await res.json();

  _cache = raw
    .filter((c) => c.cca2 && c.name?.common && c.flags?.png)
    .map((c) => ({
      name: c.name.common,
      cca2: c.cca2,
      cca3: c.cca3 || '',
      ccn3: c.ccn3 || '',
      flagUrl: c.flags.png,
      borders: c.borders ?? [],
      region: c.region,
      population: c.population ?? 0,
      area: c.area ?? 0,
      capital: c.capital?.[0] || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Build CCA3→CCA2 and CCN3→CCA2 map
  for (const c of _cache) {
    if (c.cca3) _cca3ToCca2[c.cca3] = c.cca2;
    if (c.ccn3) _ccn3ToCca2[c.ccn3] = c.cca2;
  }

  // Seed Supabase cache in background (don't block)
  seedSupabaseCache(_cache).catch(console.warn);

  return _cache;
}

// ─── Seed Supabase ───────────────────────────────────────────────────────────

async function seedSupabaseCache(countries: Country[]) {
  const rows = countries.map((c) => ({
    cca2: c.cca2,
    cca3: c.cca3,
    ccn3: c.ccn3,
    name: c.name,
    flag_url: c.flagUrl,
    population: c.population,
    area: c.area,
    borders: c.borders,
    region: c.region,
    capital: c.capital,
    independent: true,
  }));

  // Upsert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    await supabase.from('countries').upsert(batch, { onConflict: 'cca2' });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns `count` random countries different from `exclude`. */
export function getRandomCountries(
  all: Country[],
  exclude: Country,
  count: number
): Country[] {
  const pool = all.filter((c) => c.cca2 !== exclude.cca2);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Builds an N-question session array (no repeats). */
export function buildQuizQuestions(countries: Country[], count: number = 10) {
  const shuffled = [...countries].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map((country) => {
    const wrong = getRandomCountries(countries, country, 3);
    const options = [...wrong, country].sort(() => Math.random() - 0.5);
    const correctIndex = options.findIndex((o) => o.cca2 === country.cca2);
    return { country, options, correctIndex };
  });
}

/** Builds an N-question session for the Capitals Quiz */
export function buildCapitalsQuizQuestions(countries: Country[], count: number = 10) {
  const validTargets = countries.filter(c => c.capital && c.capital.length > 0);
  const shuffled = [...validTargets].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map((country) => {
    const wrong = getRandomCountries(validTargets, country, 3);
    const options = [...wrong, country].sort(() => Math.random() - 0.5);
    const correctIndex = options.findIndex((o) => o.cca2 === country.cca2);
    return { country, options, correctIndex };
  });
}

/** Builds an N-question session for the Borders Quiz */
export function buildBordersQuizQuestions(countries: Country[], count: number = 10) {
  // Only target countries with at least 3 borders, so we can pick 3 real borders
  const validTargets = countries.filter(c => c.borders && c.borders.length >= 3);
  const shuffledTargets = [...validTargets].sort(() => Math.random() - 0.5);
  const selected = shuffledTargets.slice(0, count);

  const cca3Map = getCca3ToCca2Map();

  return selected.map((targetCountry) => {
    // 1. Get real borders
    const actualBorderCca2s = targetCountry.borders
      .map(b => cca3Map[b])
      .filter(Boolean); // some borders might not map correctly if they are missing

    // Choose 3 real borders
    const shuffledBorders = [...actualBorderCca2s].sort(() => Math.random() - 0.5);
    const threeBorders = shuffledBorders.slice(0, 3);
    const borderCountries = threeBorders
      .map(code => countries.find(c => c.cca2 === code))
      .filter((c): c is Country => c !== undefined);

    // 2. Choose 1 non-border that is proximal (neighbor of a neighbor)
    const neighborsOfNeighborsCca3 = new Set<string>();
    borderCountries.forEach(bc => {
      if (bc.borders) {
        bc.borders.forEach(b => neighborsOfNeighborsCca3.add(b));
      }
    });

    const neighborsOfNeighborsCca2 = Array.from(neighborsOfNeighborsCca3)
      .map(b => cca3Map[b])
      .filter(Boolean);

    let candidateProxys = countries.filter(
      c => c.cca2 !== targetCountry.cca2 &&
        !actualBorderCca2s.includes(c.cca2) &&
        neighborsOfNeighborsCca2.includes(c.cca2)
    );

    // Fallback if no neighbors of neighbors exist (e.g., small clusters)
    if (candidateProxys.length === 0) {
      candidateProxys = countries.filter(
        c => c.cca2 !== targetCountry.cca2 &&
          !actualBorderCca2s.includes(c.cca2) &&
          c.region === targetCountry.region
      );
    }

    // Deep fallback
    if (candidateProxys.length === 0) {
      candidateProxys = countries.filter(
        c => c.cca2 !== targetCountry.cca2 && !actualBorderCca2s.includes(c.cca2)
      );
    }

    const randomNonBorder = candidateProxys[Math.floor(Math.random() * candidateProxys.length)];

    // 3. Assemble and shuffle options
    const options = [...borderCountries, randomNonBorder].sort(() => Math.random() - 0.5);

    // The correct answer is the ONE THAT DOES NOT BORDER
    const correctIndex = options.findIndex((o) => o.cca2 === randomNonBorder.cca2);

    return { country: targetCountry, options, correctIndex };
  });
}
