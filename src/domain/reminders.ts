export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface ReminderLike extends ReminderTime {
  id?: number;
  enabled: boolean;
}

export function isValidTime(hour: number, minute: number): boolean {
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** "8:05 PM" style, using a 12-hour clock. */
export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function sortByTime<T extends ReminderTime>(list: T[]): T[] {
  return [...list].sort((a, b) => a.hour - b.hour || a.minute - b.minute);
}

/** True when another reminder (ignoring `exceptId`) already uses this exact time. */
export function isDuplicate(list: ReminderLike[], hour: number, minute: number, exceptId?: number): boolean {
  return list.some((r) => r.id !== exceptId && r.hour === hour && r.minute === minute);
}

export function timeToDate(hour: number, minute: number, base = new Date()): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function dateToTime(d: Date): ReminderTime {
  return { hour: d.getHours(), minute: d.getMinutes() };
}

/**
 * Backups made before multiple reminders existed stored one reminder in settings.
 * Convert it into the new shape.
 */
export function remindersFromLegacy(settings: Record<string, string>): ReminderLike[] {
  if (settings['reminder_enabled'] !== '1') return [];
  const hour = Number(settings['reminder_hour'] ?? 20);
  const minute = Number(settings['reminder_minute'] ?? 0);
  return isValidTime(hour, minute) ? [{ hour, minute, enabled: true }] : [{ hour: 20, minute: 0, enabled: true }];
}

/** Human summary like "3 reminders on" for a list row subtitle. */
export function summarizeReminders(list: ReminderLike[]): string {
  const on = list.filter((r) => r.enabled).length;
  if (list.length === 0) return 'No reminders set';
  if (on === 0) return 'All reminders are off';
  return on === 1 ? '1 reminder on' : `${on} reminders on`;
}
