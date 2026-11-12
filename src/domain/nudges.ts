/** How many different reminder messages exist (notif.1 … notif.8 in the catalogs). */
export const NUDGE_COUNT = 8;

/** How many days ahead notifications are scheduled; refreshed whenever the app runs. */
export const SCHEDULE_DAYS = 14;

export interface Occurrence {
  reminderId: number;
  at: Date;
  /** 0-based message index, 0 … NUDGE_COUNT-1 */
  message: number;
}

const DAY_MS = 86_400_000;

/** Whole days since 1970 for the local calendar date of `d` (stable across DST changes). */
export function localDayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/**
 * Which message to show: it changes every day, and two reminders on the same day get different
 * messages, so someone with several reminders never sees the same text twice in a row.
 */
export function nudgeIndex(day: Date, reminderId: number): number {
  const n = localDayNumber(day) + Math.max(0, reminderId);
  return ((n % NUDGE_COUNT) + NUDGE_COUNT) % NUDGE_COUNT;
}

/** Every upcoming notification for the next `days` days (today counts if its time has not passed). */
export function planOccurrences(
  reminders: readonly { id: number; hour: number; minute: number }[],
  now: Date,
  days = SCHEDULE_DAYS,
): Occurrence[] {
  const out: Occurrence[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    for (const r of reminders) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, r.hour, r.minute, 0, 0);
      if (at.getTime() <= now.getTime() + 5_000) continue;
      out.push({ reminderId: r.id, at, message: nudgeIndex(at, r.id) });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export const occurrenceId = (o: Occurrence): string =>
  `reminder-${o.reminderId}-${o.at.getFullYear()}${String(o.at.getMonth() + 1).padStart(2, '0')}${String(o.at.getDate()).padStart(2, '0')}`;
