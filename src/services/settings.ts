import { eq } from 'drizzle-orm';

import { db, schema } from '@/db/client';

export const SETTING_KEYS = {
  onboarded: 'onboarded',
  reminderEnabled: 'reminder_enabled',
  reminderHour: 'reminder_hour',
  reminderMinute: 'reminder_minute',
  deviceId: 'device_id',
  autoBackup: 'auto_backup',
  lastBackupAt: 'last_backup_at',
  lastBackupEmail: 'last_backup_email',
  lastLocalChangeAt: 'last_local_change_at',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export function getSetting(key: SettingKey): string | null {
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  return row?.value ?? null;
}

export function setSetting(key: SettingKey, value: string): void {
  db.insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
    .run();
}

export function deleteSetting(key: SettingKey): void {
  db.delete(schema.settings).where(eq(schema.settings.key, key)).run();
}

export function getBool(key: SettingKey, fallback = false): boolean {
  const v = getSetting(key);
  return v === null ? fallback : v === '1';
}

export function setBool(key: SettingKey, value: boolean): void {
  setSetting(key, value ? '1' : '0');
}

export function getNumber(key: SettingKey, fallback: number): number {
  const v = getSetting(key);
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function touchLocalChange(): void {
  setSetting(SETTING_KEYS.lastLocalChangeAt, String(Date.now()));
}
