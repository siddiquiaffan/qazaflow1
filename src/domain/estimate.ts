import { emptyCounts, PRAYERS, type PrayerCounts } from './prayers';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDayUTC(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from `start` (inclusive) up to `end` (exclusive). Never negative. */
export function daysBetween(start: Date, end: Date): number {
  const diff = Math.round((startOfDayUTC(end) - startOfDayUTC(start)) / MS_PER_DAY);
  return Math.max(0, diff);
}

/** Same number of days owed for every prayer. */
export function countsForDays(days: number): PrayerCounts {
  const n = Math.max(0, Math.floor(days));
  return emptyCounts(n);
}

/** Estimate from the date the person started praying regularly until `today`. */
export function estimateFromDates(start: Date, today: Date, excludedDays = 0): PrayerCounts {
  const days = daysBetween(start, today) - Math.max(0, Math.floor(excludedDays));
  return countsForDays(days);
}

/** Estimate from a span expressed in years and months ending at `today`. */
export function estimateFromYearsMonths(
  years: number,
  months: number,
  today: Date,
  excludedDays = 0,
): PrayerCounts {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setFullYear(start.getFullYear() - Math.max(0, Math.floor(years)));
  start.setMonth(start.getMonth() - Math.max(0, Math.floor(months)));
  return estimateFromDates(start, today, excludedDays);
}

/** Sanitise manually typed counts (non-negative whole numbers). */
export function normalizeManual(input: Partial<Record<string, number>>): PrayerCounts {
  const out = emptyCounts();
  for (const p of PRAYERS) {
    const v = Number(input[p] ?? 0);
    out[p] = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  }
  return out;
}
