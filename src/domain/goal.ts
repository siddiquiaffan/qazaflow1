export const MAX_DAILY_GOAL = 100;

/** Normalise a typed goal. 0 means "no goal". */
export function clampGoal(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_DAILY_GOAL, Math.max(0, Math.floor(value)));
}

/** True only on the log that carries today's total across the goal line. */
export function crossedGoal(before: number, after: number, goal: number): boolean {
  return goal > 0 && before < goal && after >= goal;
}

export function goalFraction(done: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(1, Math.max(0, done / goal));
}
