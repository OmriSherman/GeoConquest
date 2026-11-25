export const QUIZ_EXCLUDED_CCA2 = new Set<string>(['PS']);

export function isQuizEligibleCca2(cca2: string): boolean {
  return !QUIZ_EXCLUDED_CCA2.has(cca2);
}
