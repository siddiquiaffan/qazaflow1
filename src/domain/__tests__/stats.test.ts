import { emptyCounts } from '../prayers';
import {
  averagePerDay,
  completedToday,
  dailyTotals,
  currentStreak,
  progressFraction,
  projectedFinish,
  remainingFor,
  totalOwed,
} from '../stats';

const DAY = 24 * 60 * 60 * 1000;

describe('stats', () => {
  it('derives remaining from owed, adjustments and completions', () => {
    const input = {
      owed: { ...emptyCounts(10) },
      adjustments: { ...emptyCounts(0), fajr: 5, asr: -3 },
      completed: { ...emptyCounts(0), fajr: 4, zuhr: 20 },
    };
    const r = remainingFor(input);
    expect(r.fajr).toBe(11);
    expect(r.zuhr).toBe(0);
    expect(r.asr).toBe(7);
    expect(totalOwed(input)).toBe(10 * 6 + 5 - 3);
  });

  it('computes progress', () => {
    expect(progressFraction(25, 100)).toBe(0.75);
    expect(progressFraction(0, 0)).toBe(1);
  });

  it('computes streaks', () => {
    const now = new Date(2026, 9, 22, 12).getTime();
    expect(currentStreak([now, now - DAY, now - 2 * DAY], now)).toBe(3);
    expect(currentStreak([now - DAY, now - 2 * DAY], now)).toBe(2);
    expect(currentStreak([now - 3 * DAY], now)).toBe(0);
  });

  it('computes pace and projection', () => {
    const now = new Date(2026, 9, 22, 12).getTime();
    const entries = [
      { completedAt: now - DAY, count: 6 },
      { completedAt: now - 2 * DAY, count: 8 },
      { completedAt: now - 40 * DAY, count: 100 },
    ];
    expect(averagePerDay(entries, now, 7)).toBe(2);
    const done = projectedFinish(20, 2, now);
    expect(done && Math.round((done.getTime() - now) / DAY)).toBe(10);
    expect(projectedFinish(20, 0, now)).toBeNull();
  });

  it('buckets completions per day, oldest first', () => {
    const now = new Date(2026, 9, 22, 12).getTime();
    const entries = [
      { completedAt: now, count: 2 },
      { completedAt: now - 1000, count: 1 },
      { completedAt: now - 2 * DAY, count: 5 },
      { completedAt: now - 30 * DAY, count: 9 },
    ];
    const days = dailyTotals(entries, now, 3);
    expect(days.map((d) => d.count)).toEqual([5, 0, 3]);
    expect(days).toHaveLength(3);
    expect(completedToday(entries, now)).toBe(3);
  });
});
