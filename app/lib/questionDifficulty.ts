import { Country, MillionaireQuestion, MILLIONAIRE_GOLD_LADDER } from '../types';
import { getCca3ToCca2Map } from './countryData';

// ─── Difficulty Tiers ─────────────────────────────────────────────────────────

// Tier 1: Iconic globally (score = 1)
const TIER_1 = new Set([
  'US', 'GB', 'CN', 'JP', 'DE', 'FR', 'IN', 'BR', 'CA', 'AU',
  'RU', 'IT', 'MX', 'KR', 'ES', 'SA', 'ZA', 'NG',
]);

// Tier 2: Very well-known (score = 2)
const TIER_2 = new Set([
  'AR', 'TR', 'EG', 'PK', 'ID', 'TH', 'NL', 'SE', 'NO', 'CH',
  'PT', 'PL', 'UA', 'IL', 'IR', 'IQ', 'AF', 'VN', 'MY', 'PH',
  'CL', 'CO', 'PE', 'VE', 'NZ', 'GR', 'AT', 'BE', 'DK', 'FI',
  'HU', 'CZ', 'RO', 'SG', 'KE', 'ET', 'GH', 'MA', 'TN', 'LY',
  'DZ', 'SD', 'KW', 'AE', 'QA', 'JO', 'SY', 'LB', 'BD', 'NP',
  'CU', 'DO', 'PR', 'BO', 'EC', 'PY', 'UY',
]);

export function getCountryDifficulty(country: Country): number {
  if (TIER_1.has(country.cca2)) return 1;
  if (TIER_2.has(country.cca2)) return 2;

  const pop = country.population;
  if (pop > 50_000_000) return 3;
  if (pop > 20_000_000) return 4;
  if (pop > 10_000_000) return 5;
  if (pop > 5_000_000) return 6;
  if (pop > 1_000_000) return 7;
  if (pop > 500_000) return 8;
  if (pop > 100_000) return 9;
  return 10;
}

// ─── Smart Distractors ────────────────────────────────────────────────────────

/**
 * Selects `count` distractor countries.
 * - difficulty 1–3: fully random
 * - difficulty 4–6: same region
 * - difficulty 7–10: same region + similar population tier
 */
export function getSmartDistractors(
  correct: Country,
  all: Country[],
  difficulty: number,
  count: number,
  exclude: Country[] = [],
): Country[] {
  const excludeSet = new Set([correct.cca2, ...exclude.map((c) => c.cca2)]);

  let pool = all.filter((c) => !excludeSet.has(c.cca2));

  if (difficulty >= 4) {
    const sameRegion = pool.filter((c) => c.region === correct.region);
    if (sameRegion.length >= count) pool = sameRegion;
  }

  if (difficulty >= 7) {
    const correctDiff = getCountryDifficulty(correct);
    const closePop = pool.filter((c) => Math.abs(getCountryDifficulty(c) - correctDiff) <= 2);
    if (closePop.length >= count) pool = closePop;
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Question Builders ────────────────────────────────────────────────────────

export function buildFlagQuestion(
  country: Country,
  all: Country[],
  difficulty: number,
  goldReward: number,
): MillionaireQuestion {
  const distractors = getSmartDistractors(country, all, difficulty, 3);
  const optionCountries = [...distractors, country].sort(() => Math.random() - 0.5);
  const correctIndex = optionCountries.findIndex((o) => o.cca2 === country.cca2);

  return {
    type: 'flag',
    difficulty,
    questionText: 'Which country does this flag belong to?',
    subjectCountry: country,
    options: optionCountries.map((c) => c.name),
    optionCountries,
    correctIndex,
    flagUrl: country.flagUrl,
    goldReward,
  };
}

export function buildCapitalQuestion(
  country: Country,
  all: Country[],
  difficulty: number,
  goldReward: number,
): MillionaireQuestion | null {
  if (!country.capital) return null;

  const distractors = getSmartDistractors(country, all, difficulty, 3);
  const optionCountries = [...distractors, country].sort(() => Math.random() - 0.5);
  const correctIndex = optionCountries.findIndex((o) => o.cca2 === country.cca2);

  return {
    type: 'capital',
    difficulty,
    questionText: `Which country has ${country.capital} as its capital?`,
    subjectCountry: country,
    options: optionCountries.map((c) => c.name),
    optionCountries,
    correctIndex,
    goldReward,
  };
}

export function buildBorderYesQuestion(
  country: Country,
  all: Country[],
  difficulty: number,
  goldReward: number,
): MillionaireQuestion | null {
  if (country.borders.length === 0) return null;

  const cca3Map = getCca3ToCca2Map();
  const neighborCca2s = country.borders.map((b) => cca3Map[b]).filter(Boolean);
  if (neighborCca2s.length === 0) return null;

  const randomNeighborCca2 = neighborCca2s[Math.floor(Math.random() * neighborCca2s.length)];
  const correctCountry = all.find((c) => c.cca2 === randomNeighborCca2);
  if (!correctCountry) return null;

  const neighborSet = new Set(neighborCca2s);
  const nonNeighbors = all.filter(
    (c) => c.cca2 !== country.cca2 && !neighborSet.has(c.cca2),
  );

  const distractors = getSmartDistractors(correctCountry, nonNeighbors, difficulty, 3);
  const optionCountries = [...distractors, correctCountry].sort(() => Math.random() - 0.5);
  const correctIndex = optionCountries.findIndex((c) => c.cca2 === correctCountry.cca2);

  return {
    type: 'border_yes',
    difficulty,
    questionText: `Which of these countries shares a border with ${country.name}?`,
    subjectCountry: country,
    options: optionCountries.map((c) => c.name),
    optionCountries,
    correctIndex,
    goldReward,
  };
}

export function buildBorderNoQuestion(
  country: Country,
  all: Country[],
  difficulty: number,
  goldReward: number,
): MillionaireQuestion | null {
  if (country.borders.length === 0) return null;

  const cca3Map = getCca3ToCca2Map();
  const neighborCca2s = country.borders.map((b) => cca3Map[b]).filter(Boolean);
  if (neighborCca2s.length < 3) return null;

  const validNeighbors = all.filter((c) => neighborCca2s.includes(c.cca2));
  if (validNeighbors.length < 3) return null;

  const distractors = [...validNeighbors].sort(() => Math.random() - 0.5).slice(0, 3);

  const neighborSet = new Set(neighborCca2s);
  const nonNeighbors = all.filter(
    (c) => c.cca2 !== country.cca2 && !neighborSet.has(c.cca2),
  );
  if (nonNeighbors.length === 0) return null;

  const smartNonNeighbors = getSmartDistractors(country, nonNeighbors, difficulty, 1);
  const correctCountry = smartNonNeighbors[0];

  const optionCountries = [...distractors, correctCountry].sort(() => Math.random() - 0.5);
  const correctIndex = optionCountries.findIndex((c) => c.cca2 === correctCountry.cca2);

  return {
    type: 'border_no',
    difficulty,
    questionText: `Which of these countries does NOT share a border with ${country.name}?`,
    subjectCountry: country,
    options: optionCountries.map((c) => c.name),
    optionCountries,
    correctIndex,
    goldReward,
  };
}

export function buildAreaQuestion(
  firstCountry: Country,
  all: Country[],
  difficulty: number,
  goldReward: number,
): MillionaireQuestion {
  const others = getSmartDistractors(firstCountry, all, difficulty, 3);
  const all4 = [firstCountry, ...others];
  // The country with the largest area is the correct answer
  all4.sort((a, b) => b.area - a.area);
  const correct = all4[0];
  const optionCountries = [...all4].sort(() => Math.random() - 0.5);
  const correctIndex = optionCountries.findIndex((c) => c.cca2 === correct.cca2);

  return {
    type: 'area_largest',
    difficulty,
    questionText: 'Which of these countries has the LARGEST area?',
    subjectCountry: correct,
    options: optionCountries.map((c) => c.name),
    optionCountries,
    correctIndex,
    goldReward,
  };
}

export function buildShapeQuestion(
  country: Country,
  all: Country[],
  difficulty: number,
  goldReward: number,
): MillionaireQuestion {
  // Try to use distractors that also have visible shapes
  const validDistractors = all.filter(c => c.area > 1000);
  const distractors = getSmartDistractors(country, validDistractors, difficulty, 3);
  const optionCountries = [...distractors, country].sort(() => Math.random() - 0.5);
  const correctIndex = optionCountries.findIndex((o) => o.cca2 === country.cca2);

  return {
    type: 'shape',
    difficulty,
    questionText: 'Which country has this shape?',
    subjectCountry: country,
    options: optionCountries.map((c) => c.name),
    optionCountries,
    correctIndex,
    goldReward,
  };
}

// ─── 15-Question Millionaire Builder ─────────────────────────────────────────

/**
 * Progression plan:
 *   Q1–3   (indices 0–2):  difficulty 1–2,  flag only
 *   Q4–6   (indices 3–5):  difficulty 3–4,  flag + capital + shape
 *   Q7–9   (indices 6–8):  difficulty 5–6,  capital + shape + population + area
 *   Q10–12 (indices 9–11): difficulty 7–8,  flag + shape + border + capital
 *   Q13–15 (indices 12–14):difficulty 9–10, all types, hardest distractors
 */
interface SlotPlan {
  minDiff: number;
  maxDiff: number;
  types: Array<'flag' | 'shape' | 'capital' | 'border_yes' | 'border_no'>;
}

const SLOT_PLANS: SlotPlan[] = [
  { minDiff: 1, maxDiff: 2, types: ['flag', 'shape'] },          // Q1
  { minDiff: 1, maxDiff: 2, types: ['shape', 'flag'] },          // Q2
  { minDiff: 2, maxDiff: 3, types: ['flag', 'shape'] },          // Q3
  { minDiff: 3, maxDiff: 4, types: ['shape', 'flag', 'capital'] }, // Q4
  { minDiff: 3, maxDiff: 4, types: ['flag', 'shape', 'capital'] }, // Q5
  { minDiff: 4, maxDiff: 5, types: ['shape', 'flag', 'capital'] }, // Q6
  { minDiff: 5, maxDiff: 6, types: ['shape', 'capital', 'border_yes', 'border_no'] }, // Q7
  { minDiff: 5, maxDiff: 6, types: ['capital', 'shape', 'border_yes', 'border_no'] }, // Q8
  { minDiff: 6, maxDiff: 7, types: ['shape', 'capital', 'border_yes', 'border_no'] }, // Q9
  { minDiff: 7, maxDiff: 8, types: ['shape', 'flag', 'border_yes', 'capital', 'border_no'] }, // Q10
  { minDiff: 7, maxDiff: 8, types: ['flag', 'shape', 'border_yes', 'capital', 'border_no'] }, // Q11
  { minDiff: 8, maxDiff: 9, types: ['shape', 'flag', 'border_yes', 'capital', 'border_no'] }, // Q12
  { minDiff: 9, maxDiff: 10, types: ['shape', 'flag', 'border_yes', 'capital', 'border_no'] }, // Q13
  { minDiff: 9, maxDiff: 10, types: ['flag', 'shape', 'border_yes', 'capital', 'border_no'] }, // Q14
  { minDiff: 9, maxDiff: 10, types: ['shape', 'flag', 'border_yes', 'capital', 'border_no'] }, // Q15
];
export function buildSingleMillionaireQuestion(
  all: Country[],
  index: number,
  usedCca2: Set<string>,
  buckets: Record<number, Country[]>
): MillionaireQuestion {
  const plan = SLOT_PLANS[index];
  const goldReward = MILLIONAIRE_GOLD_LADDER[index];
  const typeChoices = [...plan.types].sort(() => Math.random() - 0.5);

  let question: MillionaireQuestion | null = null;

  for (const type of typeChoices) {
    const diff = plan.minDiff + Math.floor(Math.random() * (plan.maxDiff - plan.minDiff + 1));

    const subjectPool = getCandidatesFromBuckets(buckets, diff, 20, usedCca2);
    if (subjectPool.length === 0) continue;

    const subject = subjectPool[Math.floor(Math.random() * subjectPool.length)];

    if (type === 'flag') {
      question = buildFlagQuestion(subject, all, diff, goldReward);
      usedCca2.add(subject.cca2);
      break;
    }

    if (type === 'shape') {
      question = buildShapeQuestion(subject, all, diff, goldReward);
      usedCca2.add(subject.cca2);
      break;
    }

    if (type === 'capital') {
      question = buildCapitalQuestion(subject, all, diff, goldReward);
      if (question) {
        usedCca2.add(subject.cca2);
        break;
      }
    }

    if (type === 'border_yes') {
      question = buildBorderYesQuestion(subject, all, diff, goldReward);
      if (question) {
        usedCca2.add(subject.cca2);
        break;
      }
    }

    if (type === 'border_no') {
      question = buildBorderNoQuestion(subject, all, diff, goldReward);
      if (question) {
        usedCca2.add(subject.cca2);
        break;
      }
    }
  }

  if (!question) {
    const fallbackPool = all.filter((c) => !usedCca2.has(c.cca2));
    const fallback = fallbackPool[Math.floor(Math.random() * fallbackPool.length)] ?? all[index % all.length];
    question = buildFlagQuestion(fallback, all, plan.minDiff, goldReward);
    usedCca2.add(fallback.cca2);
  }

  return question;
}

export function buildMillionaireQuestions(all: Country[]): MillionaireQuestion[] {
  // Pre-compute difficulties
  const withDiff = all.map((c) => ({ country: c, diff: getCountryDifficulty(c) }));

  // Build buckets: diff → countries[]
  const buckets: Record<number, Country[]> = {};
  for (let d = 1; d <= 10; d++) buckets[d] = [];
  for (const { country, diff } of withDiff) buckets[diff].push(country);

  const usedCca2 = new Set<string>();
  const questions: MillionaireQuestion[] = [];
  for (let i = 0; i < 15; i++) {
    questions.push(buildSingleMillionaireQuestion(all, i, usedCca2, buckets));
  }

  return questions;
}

/** Pick up to `count` unused countries from buckets near `targetDiff`. */
function getCandidatesFromBuckets(
  buckets: Record<number, Country[]>,
  targetDiff: number,
  count: number,
  used: Set<string>,
): Country[] {
  // Try expanding search radius until we have enough
  for (let radius = 0; radius <= 4; radius++) {
    const candidates: Country[] = [];
    for (let d = Math.max(1, targetDiff - radius); d <= Math.min(10, targetDiff + radius); d++) {
      for (const c of buckets[d]) {
        if (!used.has(c.cca2)) candidates.push(c);
      }
    }
    if (candidates.length >= count) {
      return [...candidates].sort(() => Math.random() - 0.5).slice(0, count);
    }
  }
  return [];
}

/**
 * 10-Question Nightmare Builder
 * 10 questions at difficulty 10, no repeats, randomly choosing types.
 */
export function buildNightmareQuestions(all: Country[]): MillionaireQuestion[] {
  const withDiff = all.map((c) => ({ country: c, diff: getCountryDifficulty(c) }));

  const buckets: Record<number, Country[]> = {};
  for (let d = 1; d <= 10; d++) buckets[d] = [];
  for (const { country, diff } of withDiff) buckets[diff].push(country);

  const usedCca2 = new Set<string>();
  const questions: MillionaireQuestion[] = [];

  const types: Array<'flag' | 'shape'> = ['flag', 'shape'];

  const SHAPE_ROTATIONS: Array<90 | 180 | 270> = [90, 180, 270];
  const goldReward = 100000;

  for (let i = 0; i < 10; i++) {
    const typeChoices = [...types].sort(() => Math.random() - 0.5);
    let question: MillionaireQuestion | null = null;
    const diff = 10;

    for (const type of typeChoices) {
      const subjectPool = getCandidatesFromBuckets(buckets, diff, 20, usedCca2);
      if (subjectPool.length === 0) continue;

      const subject = subjectPool[Math.floor(Math.random() * subjectPool.length)];

      if (type === 'flag') {
        question = buildFlagQuestion(subject, all, diff, goldReward);
        usedCca2.add(subject.cca2);
        break;
      }

      if (type === 'shape') {
        question = buildShapeQuestion(subject, all, diff, goldReward);
        usedCca2.add(subject.cca2);
        break;
      }
    }

    if (question && question.type === 'flag') {
      question.rotation = 180;
    } else if (question && question.type === 'shape') {
      question.rotation = SHAPE_ROTATIONS[Math.floor(Math.random() * SHAPE_ROTATIONS.length)];
    }

    if (!question) {
      const fallbackPool = all.filter((c) => !usedCca2.has(c.cca2));
      const fallback = fallbackPool[Math.floor(Math.random() * fallbackPool.length)] ?? all[i % all.length];
      question = buildFlagQuestion(fallback, all, diff, goldReward);
      usedCca2.add(fallback.cca2);
    }

    questions.push(question);
  }

  return questions;
}
