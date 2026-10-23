import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Ordered, append-only list of migrations. The index + 1 is the schema version,
 * stored in `PRAGMA user_version`. Never edit a shipped migration; add a new one.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE prayer_debt (
    prayer TEXT PRIMARY KEY NOT NULL,
    total_owed INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    prayer TEXT NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    prayer TEXT NOT NULL,
    count INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    note TEXT
  );
  CREATE INDEX completions_completed_at_idx ON completions (completed_at);
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // v2: multiple reminders. Carries over the single reminder from v1 if it was enabled.
  `
  CREATE TABLE reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    hour INTEGER NOT NULL,
    minute INTEGER NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
  );
  INSERT INTO reminders (hour, minute, enabled)
  SELECT
    COALESCE((SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'reminder_hour'), 20),
    COALESCE((SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'reminder_minute'), 0),
    1
  WHERE EXISTS (SELECT 1 FROM settings WHERE key = 'reminder_enabled' AND value = '1');
  DELETE FROM settings WHERE key IN ('reminder_enabled', 'reminder_hour', 'reminder_minute');
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export function migrate(sqlite: SQLiteDatabase): void {
  const row = sqlite.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    sqlite.withTransactionSync(() => {
      sqlite.execSync(sql);
    });
    version += 1;
    sqlite.execSync(`PRAGMA user_version = ${version}`);
  }
}
