// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  gold_balance: number;
  country: string | null;
  avatar_emoji: string; // character avatar emoji
  avatar_flag: string;  // flag/badge emoji
  max_quiz_turns?: number;
  login_streak?: number;
  last_reward_claim?: string;
  created_at: string;
}

// ─── Countries ────────────────────────────────────────────────────────────────

export interface Country {
  name: string;
  cca2: string; // ISO 3166-1 alpha-2
  cca3: string; // ISO 3166-1 alpha-3
  ccn3?: string; // ISO numeric code
  flagUrl: string;
  borders: string[]; // array of cca3 codes from RestCountries
  region: string;
  population: number;
  area: number; // km²
  capital: string; // capital city
}

/** Convert ISO 3166-1 alpha-2 code to flag emoji (e.g. 'IL' → 🇮🇱) */
export function cca2ToFlagEmoji(cca2: string): string {
  if (!cca2 || cca2.length !== 2) return '🏳️';
  const codePoints = cca2
    .toUpperCase()
    .split('')
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

/** Price to purchase a country = ceil(area / 100) gold */
export function getCountryPrice(area: number): number {
  return Math.ceil(area / 100);
}

export interface OwnedCountry {
  id: string;
  user_id: string;
  country_code: string; // cca2
  purchased_at: string;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export type QuizType = 'flag' | 'shape' | 'borders' | 'millionaire' | 'capitals' | 'nightmare';

export interface QuizResult {
  id: string;
  user_id: string;
  quiz_type: QuizType;
  score: number;
  gold_earned: number;
  played_at: string;
}

export interface QuizQuestion {
  country: Country;
  options: Country[]; // 4 options, includes correct answer
  correctIndex: number;
}

export interface QuizSession {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  goldEarned: number;
  answers: (number | null)[]; // index of selected answer per question
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_emoji: string;
  avatar_flag: string;
  owned_count: number;
  owned_area: number;   // km²
  conquest_pct: number; // % of Earth's land area owned
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  ChooseUsername: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  QuizMenu: undefined;
  Shop: undefined;
  Leaderboard: undefined;
  Achievements: undefined;
};

export type QuizStackParamList = {
  QuizMenu: undefined;
  FlagQuiz: undefined;
  ShapeQuiz: undefined;
  BordersQuiz: undefined;
  CapitalsQuiz: undefined;
  MillionaireQuiz: undefined;
  NightmareQuiz: undefined;
  QuizResults: {
    score: number;
    total: number;
    goldEarned: number;
    quizType: QuizType;
  };
};

// ─── Millionaire Quiz ─────────────────────────────────────────────────────────

export type MillionaireQuestionType = 'flag' | 'shape' | 'capital' | 'border_yes' | 'border_no' | 'area_largest';

export interface MillionaireQuestion {
  type: MillionaireQuestionType;
  difficulty: number;          // 1–10
  questionText: string;
  subjectCountry: Country;     // country the question is about
  options: string[];           // 4 text labels (country names)
  optionCountries: Country[];  // parallel array, used for flag display and 50/50
  correctIndex: number;
  flagUrl?: string;            // set when type === 'flag'
  goldReward: number;          // from the ladder
  rotation?: 0 | 90 | 180 | 270; // display rotation for nightmare mode
}

export const MILLIONAIRE_GOLD_LADDER: number[] = [
  50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 12000, 20000,
];

// 0-indexed: safe after correctly answering question at these indices (Q5 and Q10)
export const MILLIONAIRE_SAFE_ZONES: number[] = [4, 9];

// ─── Gold Economy ─────────────────────────────────────────────────────────────

export const GOLD_REWARDS: Record<QuizType, number> = {
  flag: 10,
  shape: 15,
  borders: 15,
  capitals: 15,
  millionaire: 50, // base; scales per level
  nightmare: 100000,
};
