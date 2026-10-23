import { clampGoal, crossedGoal, goalFraction } from '../goal';
import { groupEntries, shiftDays } from '../history';

const row = (id: number, prayer: string, completedAt: number, count = 1) => ({ id, prayer, count, completedAt });

describe('groupEntries', () => {
  it('keeps lone entries as singles', () => {
    const items = groupEntries([row(3, 'fajr', 300), row(2, 'zuhr', 200), row(1, 'asr', 100)]);
    expect(items.map((i) => i.kind)).toEqual(['single', 'single', 'single']);
  });

  it('collapses entries that share a timestamp into one batch', () => {
    const items = groupEntries([
      row(9, 'witr', 500),
      row(8, 'isha', 500),
      row(7, 'maghrib', 500),
      row(6, 'asr', 400),
      row(5, 'fajr', 300),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['batch', 'single', 'single']);
    const batch = items[0];
    expect(batch.kind === 'batch' && batch.total).toBe(3);
    expect(batch.kind === 'batch' && batch.rows.map((r) => r.id)).toEqual([9, 8, 7]);
  });

  it('only groups neighbours and sums counts', () => {
    const items = groupEntries([row(4, 'fajr', 100, 2), row(3, 'zuhr', 200), row(2, 'asr', 100, 3)]);
    expect(items.map((i) => i.kind)).toEqual(['single', 'single', 'single']);
    const merged = groupEntries([row(2, 'fajr', 100, 2), row(1, 'asr', 100, 3)]);
    expect(merged[0].kind === 'batch' && merged[0].total).toBe(5);
  });

  it('handles an empty list', () => {
    expect(groupEntries([])).toEqual([]);
  });
});

describe('shiftDays', () => {
  it('moves back whole calendar days and keeps the time of day', () => {
    const ts = new Date(2026, 2, 9, 14, 30).getTime(); // spans a DST change in some zones
    const back = new Date(shiftDays(ts, 1));
    expect([back.getDate(), back.getHours(), back.getMinutes()]).toEqual([8, 14, 30]);
  });
});

describe('daily goal', () => {
  it('clamps typed values', () => {
    expect(clampGoal(-3)).toBe(0);
    expect(clampGoal(7.9)).toBe(7);
    expect(clampGoal(5000)).toBe(100);
    expect(clampGoal(NaN)).toBe(0);
  });

  it('fires only on the log that crosses the line', () => {
    expect(crossedGoal(4, 5, 5)).toBe(true);
    expect(crossedGoal(2, 9, 5)).toBe(true);
    expect(crossedGoal(5, 6, 5)).toBe(false);
    expect(crossedGoal(0, 3, 5)).toBe(false);
    expect(crossedGoal(0, 3, 0)).toBe(false);
  });

  it('reports progress', () => {
    expect(goalFraction(3, 6)).toBe(0.5);
    expect(goalFraction(9, 6)).toBe(1);
    expect(goalFraction(3, 0)).toBe(0);
  });
});
