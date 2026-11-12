import { NUDGE_COUNT, SCHEDULE_DAYS, nudgeIndex, occurrenceId, planOccurrences } from '../nudges';

describe('nudges', () => {
  it('changes the message every day and cycles through all of them', () => {
    const seen = new Set<number>();
    let prev = -1;
    for (let d = 1; d <= NUDGE_COUNT; d += 1) {
      const idx = nudgeIndex(new Date(2026, 10, d, 20, 0), 1);
      expect(idx).not.toBe(prev);
      prev = idx;
      seen.add(idx);
    }
    expect(seen.size).toBe(NUDGE_COUNT);
  });

  it('gives two reminders on the same day different messages', () => {
    const day = new Date(2026, 10, 12, 8, 0);
    expect(nudgeIndex(day, 1)).not.toBe(nudgeIndex(day, 2));
  });

  it('plans the next days, skipping a time that already passed today', () => {
    const now = new Date(2026, 10, 12, 21, 0);
    const plan = planOccurrences([{ id: 1, hour: 20, minute: 0 }], now);
    expect(plan).toHaveLength(SCHEDULE_DAYS - 1);
    expect(plan[0].at).toEqual(new Date(2026, 10, 13, 20, 0));
  });

  it('includes today when the time is still ahead, in time order', () => {
    const now = new Date(2026, 10, 12, 6, 0);
    const plan = planOccurrences(
      [
        { id: 2, hour: 21, minute: 30 },
        { id: 1, hour: 7, minute: 15 },
      ],
      now,
      2,
    );
    expect(plan.map((p) => [p.reminderId, p.at.getDate(), p.at.getHours()])).toEqual([
      [1, 12, 7],
      [2, 12, 21],
      [1, 13, 7],
      [2, 13, 21],
    ]);
  });

  it('builds unique, readable ids per reminder and day', () => {
    const plan = planOccurrences([{ id: 3, hour: 9, minute: 0 }], new Date(2026, 10, 12, 8, 0), 3);
    expect(plan.map(occurrenceId)).toEqual(['reminder-3-20261112', 'reminder-3-20261113', 'reminder-3-20261114']);
  });
});
