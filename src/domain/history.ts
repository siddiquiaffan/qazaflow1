export interface LogEntry {
  id: number;
  prayer: string;
  count: number;
  completedAt: number;
}

export type HistoryItem<T extends LogEntry = LogEntry> =
  | { kind: 'single'; row: T }
  | { kind: 'batch'; rows: T[]; completedAt: number; total: number };

/**
 * Collapse entries that were logged in the same instant ("Log a full day" writes one row per
 * prayer with a shared timestamp) into a single batch item. Input order is preserved, so
 * pass rows already sorted newest first.
 */
export function groupEntries<T extends LogEntry>(rows: T[]): HistoryItem<T>[] {
  const out: HistoryItem<T>[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && rows[j].completedAt === rows[i].completedAt) j += 1;
    const group = rows.slice(i, j);
    if (group.length > 1) {
      out.push({
        kind: 'batch',
        rows: group,
        completedAt: group[0].completedAt,
        total: group.reduce((s, r) => s + r.count, 0),
      });
    } else {
      out.push({ kind: 'single', row: group[0] });
    }
    i = j;
  }
  return out;
}

/** Same time of day, `days` calendar days earlier (DST-safe). */
export function shiftDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() - days);
  return d.getTime();
}

export type EditProblem = 'invalid-count' | 'too-many' | 'future';

/**
 * Check an edit to a logged entry. `remaining` is what is still owed for that prayer *now*,
 * so the entry may grow by at most that much beyond its current count.
 */
export function validateEdit(input: {
  currentCount: number;
  remaining: number;
  newCount: number;
  newAt: number;
  now: number;
}): EditProblem | null {
  const { currentCount, remaining, newCount, newAt, now } = input;
  if (!Number.isInteger(newCount) || newCount < 1) return 'invalid-count';
  if (newCount > currentCount + Math.max(0, remaining)) return 'too-many';
  if (newAt > now) return 'future';
  return null;
}

/** Replace the date part of `ts` with the date of `day`, keeping the time of day. */
export function withDate(ts: number, day: Date): number {
  const d = new Date(ts);
  d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return d.getTime();
}

/** Replace the time of day of `ts` with the time of `clock`, keeping the date. */
export function withTime(ts: number, clock: Date): number {
  const d = new Date(ts);
  d.setHours(clock.getHours(), clock.getMinutes(), 0, 0);
  return d.getTime();
}
