import {
  countsForDays,
  daysBetween,
  estimateFromDates,
  estimateFromYearsMonths,
  normalizeManual,
} from '../estimate';
import { totalOf } from '../prayers';

describe('estimate', () => {
  it('counts whole days and never goes negative', () => {
    expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 11))).toBe(10);
    expect(daysBetween(new Date(2026, 5, 1), new Date(2026, 0, 1))).toBe(0);
  });

  it('owes one of each prayer per day', () => {
    const c = countsForDays(10);
    expect(c.fajr).toBe(10);
    expect(c.witr).toBe(10);
    expect(totalOf(c)).toBe(60);
  });

  it('subtracts excluded days', () => {
    const c = estimateFromDates(new Date(2026, 0, 1), new Date(2026, 0, 31), 5);
    expect(c.asr).toBe(25);
  });

  it('does not go below zero when excluded days exceed the span', () => {
    const c = estimateFromDates(new Date(2026, 0, 1), new Date(2026, 0, 3), 10);
    expect(totalOf(c)).toBe(0);
  });

  it('estimates from years and months', () => {
    const today = new Date(2026, 9, 22);
    const c = estimateFromYearsMonths(1, 0, today);
    expect(c.fajr).toBe(365);
    expect(estimateFromYearsMonths(0, 1, today).fajr).toBe(30);
  });

  it('normalises manual input', () => {
    const c = normalizeManual({ fajr: 12.9, zuhr: -4, asr: NaN, maghrib: 3 });
    expect(c.fajr).toBe(12);
    expect(c.zuhr).toBe(0);
    expect(c.asr).toBe(0);
    expect(c.maghrib).toBe(3);
    expect(c.isha).toBe(0);
  });
});
