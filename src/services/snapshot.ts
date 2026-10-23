import { z } from 'zod';

import { db, schema } from '@/db/client';
import { SCHEMA_VERSION } from '@/db/migrations';
import { isPrayer, PRAYERS, type Prayer } from '@/domain/prayers';
import { remindersFromLegacy } from '@/domain/reminders';

import { getSetting, setBool, setSetting, SETTING_KEYS } from './settings';

const prayerSchema = z.enum(PRAYERS);

function known<T extends { prayer: string }>(rows: T[]): (T & { prayer: Prayer })[] {
  return rows.filter((r): r is T & { prayer: Prayer } => isPrayer(r.prayer));
}

export const snapshotSchema = z.object({
  app: z.literal('qazaflow'),
  schemaVersion: z.number().int().min(1),
  createdAt: z.number(),
  deviceId: z.string(),
  data: z.object({
    prayerDebt: z.array(z.object({ prayer: prayerSchema, totalOwed: z.number().int().min(0) })),
    adjustments: z.array(
      z.object({
        prayer: prayerSchema,
        delta: z.number().int(),
        reason: z.string().nullable(),
        createdAt: z.number(),
      }),
    ),
    completions: z.array(
      z.object({
        prayer: prayerSchema,
        count: z.number().int().min(1),
        completedAt: z.number(),
        note: z.string().nullable(),
      }),
    ),
    // Added in schema v2; older backups simply don't have it.
    reminders: z
      .array(z.object({ hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59), enabled: z.boolean() }))
      .default([]),
    settings: z.record(z.string(), z.string()),
  }),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

/** Settings that travel with a backup. Device-specific values (ids, backup state) do not. */
const PORTABLE_SETTINGS = [SETTING_KEYS.onboarded, SETTING_KEYS.dailyGoal] as const;

export function getDeviceId(): string {
  const existing = getSetting(SETTING_KEYS.deviceId);
  if (existing) return existing;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  setSetting(SETTING_KEYS.deviceId, id);
  return id;
}

export function createSnapshot(): Snapshot {
  const settingsData: Record<string, string> = {};
  for (const key of PORTABLE_SETTINGS) {
    const v = getSetting(key);
    if (v !== null) settingsData[key] = v;
  }
  return {
    app: 'qazaflow',
    schemaVersion: SCHEMA_VERSION,
    createdAt: Date.now(),
    deviceId: getDeviceId(),
    data: {
      prayerDebt: known(db.select().from(schema.prayerDebt).all()),
      adjustments: known(db.select().from(schema.adjustments).all()).map(({ prayer, delta, reason, createdAt }) => ({ prayer, delta, reason, createdAt })),
      completions: known(db.select().from(schema.completions).all()).map(({ prayer, count, completedAt, note }) => ({ prayer, count, completedAt, note })),
      reminders: db
        .select()
        .from(schema.reminders)
        .all()
        .map(({ hour, minute, enabled }) => ({ hour, minute, enabled })),
      settings: settingsData,
    },
  };
}

export class SnapshotError extends Error {}

/** Parse and validate raw backup JSON. Throws SnapshotError for anything unusable. */
export function parseSnapshot(raw: string): Snapshot {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new SnapshotError('The backup file is not valid.');
  }
  const result = snapshotSchema.safeParse(json);
  if (!result.success) throw new SnapshotError('The backup file is not valid.');
  if (result.data.schemaVersion > SCHEMA_VERSION) {
    throw new SnapshotError('This backup was made by a newer version of the app. Please update first.');
  }
  return result.data;
}

export function summarizeSnapshot(s: Snapshot) {
  const owed = s.data.prayerDebt.reduce((a, r) => a + r.totalOwed, 0);
  const adj = s.data.adjustments.reduce((a, r) => a + r.delta, 0);
  const done = s.data.completions.reduce((a, r) => a + r.count, 0);
  return {
    createdAt: s.createdAt,
    totalRemaining: Math.max(0, owed + adj - done),
    totalCompleted: done,
  };
}

/** Replace all local data with the snapshot, atomically. */
export function restoreSnapshot(s: Snapshot): void {
  db.transaction((tx) => {
    tx.delete(schema.completions).run();
    tx.delete(schema.adjustments).run();
    tx.delete(schema.prayerDebt).run();
    tx.delete(schema.reminders).run();

    for (const r of s.data.prayerDebt) tx.insert(schema.prayerDebt).values(r).run();
    for (const r of s.data.adjustments) tx.insert(schema.adjustments).values(r).run();
    for (const r of s.data.completions) tx.insert(schema.completions).values(r).run();
    const reminders = s.data.reminders.length > 0 ? s.data.reminders : remindersFromLegacy(s.data.settings);
    for (const r of reminders) tx.insert(schema.reminders).values(r).run();
  });

  for (const key of PORTABLE_SETTINGS) {
    const v = s.data.settings[key];
    if (v !== undefined) setSetting(key, v);
  }
  if (s.data.prayerDebt.length > 0) setBool(SETTING_KEYS.onboarded, true);
  setSetting(SETTING_KEYS.lastLocalChangeAt, String(Date.now()));
}
