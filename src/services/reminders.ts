import { asc, eq } from 'drizzle-orm';

import { db, schema } from '@/db/client';
import { isDuplicate, isValidTime } from '@/domain/reminders';

import { cancelAll, ensureChannel, hasPermission, scheduleDaily } from './notifications';
import { touchLocalChange } from './settings';

export type Reminder = typeof schema.reminders.$inferSelect;

export function listReminders(): Reminder[] {
  return db
    .select()
    .from(schema.reminders)
    .orderBy(asc(schema.reminders.hour), asc(schema.reminders.minute))
    .all();
}

export type MutationResult = { ok: true } | { ok: false; reason: 'invalid' | 'duplicate' };

export function addReminder(hour: number, minute: number): MutationResult {
  if (!isValidTime(hour, minute)) return { ok: false, reason: 'invalid' };
  if (isDuplicate(listReminders(), hour, minute)) return { ok: false, reason: 'duplicate' };
  db.insert(schema.reminders).values({ hour, minute, enabled: true }).run();
  touchLocalChange();
  return { ok: true };
}

export function updateReminderTime(id: number, hour: number, minute: number): MutationResult {
  if (!isValidTime(hour, minute)) return { ok: false, reason: 'invalid' };
  if (isDuplicate(listReminders(), hour, minute, id)) return { ok: false, reason: 'duplicate' };
  db.update(schema.reminders).set({ hour, minute }).where(eq(schema.reminders.id, id)).run();
  touchLocalChange();
  return { ok: true };
}

export function setReminderEnabled(id: number, enabled: boolean): void {
  db.update(schema.reminders).set({ enabled }).where(eq(schema.reminders.id, id)).run();
  touchLocalChange();
}

export function deleteReminder(id: number): void {
  db.delete(schema.reminders).where(eq(schema.reminders.id, id)).run();
  touchLocalChange();
}

/**
 * Make the scheduled notifications match the reminders table: cancel everything,
 * then schedule one daily notification per enabled reminder. Safe to call any time.
 * Returns false if there is something to schedule but notification permission is missing.
 */
export async function syncReminders(): Promise<boolean> {
  const enabled = listReminders().filter((r) => r.enabled);
  await cancelAll();
  if (enabled.length === 0) return true;
  if (!(await hasPermission())) return false;
  await ensureChannel();
  for (const r of enabled) await scheduleDaily(r.id, r.hour, r.minute);
  return true;
}
