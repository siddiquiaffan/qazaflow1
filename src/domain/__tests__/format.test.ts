import { dateFromKey, friendlyDay, pluralize } from '../format';

describe('format', () => {
  const now = new Date(2026, 9, 22, 15, 30);

  it('labels today and yesterday', () => {
    expect(friendlyDay(new Date(2026, 9, 22, 0, 5), now)).toBe('Today');
    expect(friendlyDay(new Date(2026, 9, 21, 23, 59), now)).toBe('Yesterday');
  });

  it('falls back to a short date', () => {
    const label = friendlyDay(new Date(2026, 9, 10), now);
    expect(label).not.toBe('Today');
    expect(label).toContain('10');
  });

  it('parses day keys at local noon', () => {
    const d = dateFromKey('2026-03-08');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 8, 12]);
  });

  it('pluralises', () => {
    expect(pluralize(1, 'prayer')).toBe('1 prayer');
    expect(pluralize(1200, 'prayer')).toMatch(/1.?200 prayers/);
  });
});
