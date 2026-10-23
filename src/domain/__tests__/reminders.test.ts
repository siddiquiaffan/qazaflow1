import {
  dateToTime,
  formatTime,
  isDuplicate,
  isValidTime,
  remindersFromLegacy,
  sortByTime,
  summarizeReminders,
  timeToDate,
} from '../reminders';

describe('reminders', () => {
  it('formats a 12-hour clock', () => {
    expect(formatTime(0, 0)).toBe('12:00 AM');
    expect(formatTime(5, 5)).toBe('5:05 AM');
    expect(formatTime(12, 30)).toBe('12:30 PM');
    expect(formatTime(20, 45)).toBe('8:45 PM');
    expect(formatTime(23, 59)).toBe('11:59 PM');
  });

  it('validates times', () => {
    expect(isValidTime(23, 59)).toBe(true);
    expect(isValidTime(24, 0)).toBe(false);
    expect(isValidTime(10, 60)).toBe(false);
    expect(isValidTime(1.5, 0)).toBe(false);
  });

  it('sorts by time without mutating the input', () => {
    const input = [
      { hour: 20, minute: 0 },
      { hour: 5, minute: 30 },
      { hour: 5, minute: 10 },
    ];
    expect(sortByTime(input).map((r) => `${r.hour}:${r.minute}`)).toEqual(['5:10', '5:30', '20:0']);
    expect(input[0].hour).toBe(20);
  });

  it('detects duplicates but ignores the reminder being edited', () => {
    const list = [
      { id: 1, hour: 6, minute: 0, enabled: true },
      { id: 2, hour: 20, minute: 0, enabled: false },
    ];
    expect(isDuplicate(list, 20, 0)).toBe(true);
    expect(isDuplicate(list, 20, 0, 2)).toBe(false);
    expect(isDuplicate(list, 21, 0)).toBe(false);
  });

  it('round-trips between Date and time', () => {
    const d = timeToDate(7, 15, new Date(2026, 9, 22, 1, 2, 3));
    expect(d.getHours()).toBe(7);
    expect(d.getMinutes()).toBe(15);
    expect(d.getSeconds()).toBe(0);
    expect(dateToTime(d)).toEqual({ hour: 7, minute: 15 });
  });

  it('converts the legacy single reminder', () => {
    expect(remindersFromLegacy({})).toEqual([]);
    expect(remindersFromLegacy({ reminder_enabled: '0', reminder_hour: '9' })).toEqual([]);
    expect(remindersFromLegacy({ reminder_enabled: '1', reminder_hour: '9', reminder_minute: '30' })).toEqual([
      { hour: 9, minute: 30, enabled: true },
    ]);
    expect(remindersFromLegacy({ reminder_enabled: '1', reminder_hour: '99' })).toEqual([
      { hour: 20, minute: 0, enabled: true },
    ]);
  });

  it('summarises the list', () => {
    expect(summarizeReminders([])).toBe('No reminders set');
    expect(summarizeReminders([{ hour: 1, minute: 0, enabled: false }])).toBe('All reminders are off');
    expect(summarizeReminders([{ hour: 1, minute: 0, enabled: true }])).toBe('1 reminder on');
    expect(
      summarizeReminders([
        { hour: 1, minute: 0, enabled: true },
        { hour: 2, minute: 0, enabled: true },
      ]),
    ).toBe('2 reminders on');
  });
});
