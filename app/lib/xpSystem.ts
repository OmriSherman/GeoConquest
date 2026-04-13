import { QuizType } from '../types';

// ─── Level Curve ──────────────────────────────────────────────────────────────
// xpToNextLevel(n) = round((100 * 1.06^(n-1)) * 1.25)  — +25% tougher level-up curve
// Level 1→2: 125 XP, Level 49→50: ~2,049 XP, Level 99→100: ~37,750 XP

export function xpToNextLevel(n: number): number {
  return Math.round(100 * Math.pow(1.06, n - 1) * 1.25);
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
