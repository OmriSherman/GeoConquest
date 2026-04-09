import { QuizType } from '../types';

// ─── Level Curve ──────────────────────────────────────────────────────────────
// xpToNextLevel(n) = round(100 * 1.06^(n-1))  — +6% per level
// Level 1→2: 100 XP, Level 49→50: ~1,639 XP, Level 99→100: ~30,200 XP
// Total XP to reach level 100: ~532k XP

export function xpToNextLevel(n: number): number {
  return Math.round(100 * Math.pow(1.06, n - 1));
}

/** Given accumulated total XP, return current level, XP into that level, and XP needed for next. */
export function getLevelInfo(totalXP: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  let level = 1;
  let remaining = totalXP;
  while (level < 100) {
    const needed = xpToNextLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level++;
  }
  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: level < 100 ? xpToNextLevel(level) : 0,
  };
}

// ─── XP Per Correct Answer ───────────────────────────────────────────────────

const XP_PER_CORRECT: Partial<Record<QuizType, number>> = {
  flag: 5,
  shape: 7,
  capitals: 8,
  borders: 10,
};

/**
 * Calculate XP earned from a quiz result.
 *
 * Standard quizzes: score * xpPerCorrect, then apply accuracy multiplier.
 *   >85% accuracy → ×1.5 | 100% accuracy → ×2.0
 *
 * Millionaire: 1000 XP base if 15/15, ×2.0 for perfect = 2000 XP, else 0.
 *
 * Nightmare: 20000 XP if first-ever win (one-time), else 0.
 */
export function calcQuizXP(
  quizType: QuizType,
  score: number,
  total: number,
  isFirstNightmareWin: boolean,
): number {
  if (quizType === 'nightmare') {
    return isFirstNightmareWin ? 20000 : 0;
  }

  if (quizType === 'millionaire') {
    if (score < total) return 0;
    // 15/15 is always 100% → ×2.0 multiplier applied
    return 2000;
  }

  const xpPerCorrect = XP_PER_CORRECT[quizType] ?? 5;
  const base = score * xpPerCorrect;
  const accuracy = total > 0 ? score / total : 0;

  let multiplier = 1.0;
  if (accuracy === 1.0) multiplier = 2.0;
  else if (accuracy > 0.85) multiplier = 1.5;

  return Math.round(base * multiplier);
}
