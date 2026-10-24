import { completionsToCsv, csvField } from '../export';
import { clampGoal, crossedGoal, goalFraction } from '../goal';
import { groupEntries, shiftDays, validateEdit, withDate, withTime } from '../history';

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

describe('validateEdit', () => {
  const base = { currentCount: 3, remaining: 10, newCount: 3, newAt: 1000, now: 2000 };

  it('accepts a normal edit', () => {
    expect(validateEdit(base)).toBeNull();
    expect(validateEdit({ ...base, newCount: 13 })).toBeNull(); // 3 now + 10 still owed
  });

  it('rejects bad counts', () => {
    expect(validateEdit({ ...base, newCount: 0 })).toBe('invalid-count');
    expect(validateEdit({ ...base, newCount: 2.5 })).toBe('invalid-count');
    expect(validateEdit({ ...base, newCount: 14 })).toBe('too-many');
  });

  it('allows shrinking even when nothing remains', () => {
    expect(validateEdit({ ...base, remaining: 0, newCount: 2 })).toBeNull();
    expect(validateEdit({ ...base, remaining: 0, newCount: 4 })).toBe('too-many');
  });

  it('rejects the future', () => {
    expect(validateEdit({ ...base, newAt: 3000 })).toBe('future');
  });
});

describe('withDate / withTime', () => {
  it('changes only the requested part', () => {
    const ts = new Date(2026, 9, 24, 18, 45, 30).getTime();
    const d = new Date(withDate(ts, new Date(2026, 8, 3)));
    expect([d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([8, 3, 18, 45]);
    const t = new Date(withTime(ts, new Date(2000, 0, 1, 6, 5)));
    expect([t.getMonth(), t.getDate(), t.getHours(), t.getMinutes()]).toEqual([9, 24, 6, 5]);
  });
});

describe('csv export', () => {
  it('escapes only when needed', () => {
    expect(csvField('Fajr')).toBe('Fajr');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('writes a header and oldest-first rows with labels', () => {
    const a = new Date(2026, 9, 24, 7, 5).getTime();
    const b = new Date(2026, 9, 23, 21, 30).getTime();
    const csv = completionsToCsv([
      { prayer: 'fajr', count: 2, completedAt: a },
      { prayer: 'isha', count: 1, completedAt: b },
      { prayer: 'mystery', count: 1, completedAt: a + 1 },
    ]);
    expect(csv.split('\n')).toEqual([
      'date,time,prayer,count',
      '2026-10-23,21:30,Isha,1',
      '2026-10-24,07:05,Fajr,2',
      '2026-10-24,07:05,mystery,1',
      '',
    ]);
  });
});
