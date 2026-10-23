import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const prayerDebt = sqliteTable('prayer_debt', {
  prayer: text('prayer').primaryKey(),
  totalOwed: integer('total_owed').notNull().default(0),
});

export const adjustments = sqliteTable('adjustments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prayer: text('prayer').notNull(),
  delta: integer('delta').notNull(),
  reason: text('reason'),
  createdAt: integer('created_at').notNull(),
});

export const completions = sqliteTable('completions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prayer: text('prayer').notNull(),
  count: integer('count').notNull(),
  completedAt: integer('completed_at').notNull(),
  note: text('note'),
});

export const reminders = sqliteTable('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hour: integer('hour').notNull(),
  minute: integer('minute').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type CompletionRow = typeof completions.$inferSelect;
export type AdjustmentRow = typeof adjustments.$inferSelect;
