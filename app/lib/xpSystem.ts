import { QuizType } from '../types';

// ─── Level Curve ──────────────────────────────────────────────────────────────
// xpToNextLevel(n) = round(100 * n^0.807)  — polynomial, naturally flattens
// L1: 100 XP | L50: ~2,347 XP | L100: ~4,112 XP | L300: ~10,000 XP

export function xpToNextLevel(n: number): number {
  return Math.round(100 * Math.pow(n, 0.807));
}

/** Given accumulated total XP, return current level, XP into that level, and XP needed for next. */
export function getLevelInfo(totalXP: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  let level = 1;
  let remaining = totalXP;
  while (true) {
    const needed = xpToNextLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level++;
  }
  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: xpToNextLevel(level),
  };
}

// ─── XP Per Correct Answer ───────────────────────────────────────────────────

const XP_PER_CORRECT: Partial<Record<QuizType, number>> = {
  flag: 5,
  shape: 7,
  capitals: 12,
  borders: 15,
  trail: 16,
};

/**
 * Calculate XP earned from a quiz result.
 *
 * Standard quizzes: score * xpPerCorrect, then apply accuracy multiplier.
 *   >85% accuracy → ×1.5 | 100% accuracy → ×2.0
 *
 * Millionaire: 1000 XP on 15/15, else 0.
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

  if (quizType === 'gauntlet') {
    return score * 25;
  }

  if (quizType === 'millionaire') {
    if (score < total) return 0;
    return 1000;
  }

  const xpPerCorrect = XP_PER_CORRECT[quizType] ?? 5;
  const base = score * xpPerCorrect;
  const accuracy = total > 0 ? score / total : 0;

  let multiplier = 1.0;
  if (accuracy === 1.0) multiplier = 2.0;
  else if (accuracy > 0.85) multiplier = 1.5;

  return Math.round(base * multiplier);
}
