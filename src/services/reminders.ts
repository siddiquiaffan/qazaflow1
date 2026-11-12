import { asc, eq } from 'drizzle-orm';

import { db, schema } from '@/db/client';
import { isDuplicate, isValidTime } from '@/domain/reminders';

import { occurrenceId, planOccurrences } from '@/domain/nudges';

import { cancelAll, ensureChannel, hasPermission, scheduleNudge } from './notifications';
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
 * then schedule the next two weeks of notifications for every enabled reminder, each day with a
 * different encouraging message. Called on launch, on returning to the app, after edits and from a
 * daily background task, so the window keeps rolling forward. Safe to call any time.
 * Returns false if there is something to schedule but notification permission is missing.
 */
export async function syncReminders(): Promise<boolean> {
  const enabled = listReminders().filter((r) => r.enabled);
  await cancelAll();
  if (enabled.length === 0) return true;
  if (!(await hasPermission())) return false;
  await ensureChannel();
  for (const o of planOccurrences(enabled, new Date())) await scheduleNudge(occurrenceId(o), o.at, o.message);
  return true;
}
