import { Country } from '../types';
import { hasCountryShape } from '../components/CountryShapeView';

export const QUIZ_EXCLUDED_CCA2 = new Set<string>(['PS']);

// Some territories technically exist in the atlas dataset but still render badly
// or not at all in the silhouette quiz flow.
export const SHAPE_QUESTION_EXCLUDED_CCA2 = new Set<string>([
  'GP', 'MQ', 'YT', 'RE', 'PM', 'BL', 'MF', 'CX', 'CC', 'HM', 'NF', 'CK',
  'NU', 'TK', 'WF', 'AX', 'SJ', 'BV', 'TF', 'UM', 'GG', 'JE', 'IM', 'GI',
  'FK', 'FJ', 'PS',
]);

export function isQuizEligibleCountry(country: Country): boolean {
  return !QUIZ_EXCLUDED_CCA2.has(country.cca2);
}

export function isShapeQuizEligibleCountry(country: Country): boolean {
  return (
    isQuizEligibleCountry(country) &&
    Number(country.area || 0) > 1000 &&
    !SHAPE_QUESTION_EXCLUDED_CCA2.has(country.cca2) &&
    hasCountryShape(country.cca2)
  );
}

export function filterQuizCountries(countries: Country[]): Country[] {
  return countries.filter(isQuizEligibleCountry);
}

export function filterShapeQuizCountries(countries: Country[]): Country[] {
  return countries.filter(isShapeQuizEligibleCountry);
}

export function buildEasyFlagQuizPool(countries: Country[]): Country[] {
  const base = filterQuizCountries(countries);
  const easyPool = base.filter(
    (country) =>
      Number(country.population || 0) >= 5_000_000 ||
      Number(country.area || 0) >= 50_000,
  );

  if (easyPool.length >= 40) {
    return easyPool;
  }

  return [...base]
    .sort((a, b) => {
      const popDelta = Number(b.population || 0) - Number(a.population || 0);
      if (popDelta !== 0) return popDelta;
      return Number(b.area || 0) - Number(a.area || 0);
    })
    .slice(0, Math.min(Math.max(40, easyPool.length), 80));
}
