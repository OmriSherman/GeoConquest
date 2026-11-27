import AsyncStorage from '@react-native-async-storage/async-storage';
import { Country } from '../types';
import { cfg } from './gameConfig';
import { getCountryDifficulty, getSmartDistractors } from './questionDifficulty';

// Easy / Medium / Hard for Flags, Shapes, Capitals and Borders.
// Two levers: WHICH countries are asked (1-10 score) and HOW CLOSE the wrong answers are.

export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: QuizDifficulty[] = ['easy', 'medium', 'hard'];

// Multipliers come from game_config (dashboard); built-in fallbacks live in gameConfig.ts.
export const DIFFICULTY_MULTIPLIER: Record<QuizDifficulty, number> = {
  get easy() { return cfg('quiz.mult.easy'); },
  get medium() { return cfg('quiz.mult.medium'); },
  get hard() { return cfg('quiz.mult.hard'); },
};

// getSmartDistractors levels: 1-3 random, 4-6 same region, 7-10 same region + similar size
const DISTRACTOR_LEVEL: Record<QuizDifficulty, number> = { easy: 1, medium: 5, hard: 8 };

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** Which countries get asked: Easy score 1-4, Medium 1-7, Hard mostly 6-10 (80%). Tops up from the rest if a pool is short. */
export function pickByDifficulty(pool: Country[], d: QuizDifficulty, count: number): Country[] {
  const score = getCountryDifficulty;
  const all = shuffle(pool);
  if (d === 'easy' || d === 'medium') {
    const max = d === 'easy' ? 4 : 7;
    const inRange = all.filter(c => score(c) <= max);
    return [...inRange, ...all.filter(c => score(c) > max)].slice(0, count);
  }
  const hard = all.filter(c => score(c) >= 6);
  const rest = all.filter(c => score(c) < 6);
  const hardCount = Math.min(hard.length, Math.ceil(count * 0.8));
  const picked = [...hard.slice(0, hardCount), ...rest.slice(0, count - hardCount)];
  return shuffle(picked.length >= count ? picked : [...picked, ...hard.slice(hardCount)].slice(0, count));
}

/** How close the wrong answers are. */
export function distractorsFor(correct: Country, pool: Country[], d: QuizDifficulty, count: number): Country[] {
  return getSmartDistractors(correct, pool, DISTRACTOR_LEVEL[d], count);
}

/** Hooks the question builders in countryData accept. */
export function difficultyHooks(d: QuizDifficulty) {
  return {
    pick: (pool: Country[], count: number) => pickByDifficulty(pool, d, count),
    distract: (correct: Country, pool: Country[], count: number) => distractorsFor(correct, pool, d, count),
    easyNonBorder: d === 'easy',
    sixOptions: d === 'hard',
  };
}

// ── Remembered choice (the start page is still always shown) ────────────────────

const key = (quiz: string) => `@geoconquest/difficulty/${quiz}`;

export async function loadDifficulty(quiz: string): Promise<QuizDifficulty> {
  try {
    const v = await AsyncStorage.getItem(key(quiz));
    if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  } catch {}
  return 'medium';
}

export function saveDifficulty(quiz: string, d: QuizDifficulty) {
  AsyncStorage.setItem(key(quiz), d).catch(() => {});
}
