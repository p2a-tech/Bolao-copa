export const POINTS_EXACT = 3;
export const POINTS_OUTCOME = 1;

/** Minutes before kickoff when predictions get locked. */
export const LOCK_MINUTES = 30;

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * Scoring rules:
 * - Exact score => 3 points
 * - Correct winner OR correctly predicted a draw (without exact score) => 1 point
 * - Otherwise => 0 points
 */
export function scorePrediction(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number
): number {
  if (predHome === realHome && predAway === realAway) return POINTS_EXACT;
  if (sign(predHome - predAway) === sign(realHome - realAway))
    return POINTS_OUTCOME;
  return 0;
}

/** A match locks LOCK_MINUTES before kickoff. */
export function lockTime(kickoff: Date): Date {
  return new Date(kickoff.getTime() - LOCK_MINUTES * 60 * 1000);
}

export function isLocked(kickoff: Date, now: Date = new Date()): boolean {
  return now.getTime() >= lockTime(kickoff).getTime();
}
