import { emptyCounts, PRAYERS, type Prayer, type PrayerCounts } from './prayers';

export interface LedgerInput {
  owed: PrayerCounts;
  adjustments: PrayerCounts;
  completed: PrayerCounts;
}

export function remainingFor(input: LedgerInput): PrayerCounts {
  const out = emptyCounts();
  for (const p of PRAYERS) {
    out[p] = Math.max(0, input.owed[p] + input.adjustments[p] - input.completed[p]);
  }
  return out;
}

export function totalOwed(input: LedgerInput): number {
  return PRAYERS.reduce((s, p) => s + Math.max(0, input.owed[p] + input.adjustments[p]), 0);
}

export function progressFraction(remaining: number, total: number): number {
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (total - remaining) / total));
}

/** Local calendar day key, e.g. 2026-10-22. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Consecutive days (ending today, or yesterday if nothing today yet) with at least one completion. */
export function currentStreak(timestamps: number[], now: number): number {
  const days = new Set(timestamps.map(dayKey));
  const oneDay = 24 * 60 * 60 * 1000;
  let cursor = now;
  if (!days.has(dayKey(cursor))) cursor -= oneDay;
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor -= oneDay;
  }
  return streak;
}

/** Average prayers completed per day over the last `windowDays` days. */
export function averagePerDay(
  entries: { completedAt: number; count: number }[],
  now: number,
  windowDays: number,
): number {
  const since = now - windowDays * 24 * 60 * 60 * 1000;
  const sum = entries.filter((e) => e.completedAt >= since).reduce((s, e) => s + e.count, 0);
  return sum / windowDays;
}

/** Projected finish date, or null when there is no pace to project from. */
export function projectedFinish(remaining: number, perDay: number, now: number): Date | null {
  if (remaining <= 0) return new Date(now);
  if (perDay <= 0) return null;
  const days = Math.ceil(remaining / perDay);
  return new Date(now + days * 24 * 60 * 60 * 1000);
}

export function sumByPrayer(rows: { prayer: string; value: number }[]): PrayerCounts {
  const out = emptyCounts();
  for (const r of rows) {
    if ((PRAYERS as readonly string[]).includes(r.prayer)) out[r.prayer as Prayer] += r.value;
  }
  return out;
}

export interface DayTotal {
  key: string;
  date: Date;
  count: number;
}

/** Completions per calendar day for the last `days` days, oldest first, ending today. */
export function dailyTotals(entries: { completedAt: number; count: number }[], now: number, days: number): DayTotal[] {
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(dayKey(e.completedAt), (totals.get(dayKey(e.completedAt)) ?? 0) + e.count);
  const out: DayTotal[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    out.push({ key, date: d, count: totals.get(key) ?? 0 });
  }
  return out;
}

/** Sum of completions on the same calendar day as `now`. */
export function completedToday(entries: { completedAt: number; count: number }[], now: number): number {
  const key = dayKey(now);
  return entries.filter((e) => dayKey(e.completedAt) === key).reduce((s, e) => s + e.count, 0);
}
