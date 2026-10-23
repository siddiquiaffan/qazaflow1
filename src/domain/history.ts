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
