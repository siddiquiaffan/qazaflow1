import { desc, eq, sql } from 'drizzle-orm';

import { db, schema } from '@/db/client';
import { emptyCounts, PRAYERS, type Prayer, type PrayerCounts } from '@/domain/prayers';
import { remainingFor, sumByPrayer, totalOwed, type LedgerInput } from '@/domain/stats';

import { SETTING_KEYS, setBool, touchLocalChange } from './settings';

export interface LedgerSummary extends LedgerInput {
  remaining: PrayerCounts;
  totalOwed: number;
  totalRemaining: number;
}

export function loadSummary(): LedgerSummary {
  const owedRows = db.select().from(schema.prayerDebt).all();
  const owed = sumByPrayer(owedRows.map((r) => ({ prayer: r.prayer, value: r.totalOwed })));

  const adjRows = db
    .select({ prayer: schema.adjustments.prayer, value: sql<number>`sum(${schema.adjustments.delta})` })
    .from(schema.adjustments)
    .groupBy(schema.adjustments.prayer)
    .all();
  const adjustments = sumByPrayer(adjRows.map((r) => ({ prayer: r.prayer, value: Number(r.value) })));

  const doneRows = db
    .select({ prayer: schema.completions.prayer, value: sql<number>`sum(${schema.completions.count})` })
    .from(schema.completions)
    .groupBy(schema.completions.prayer)
    .all();
  const completed = sumByPrayer(doneRows.map((r) => ({ prayer: r.prayer, value: Number(r.value) })));

  const input: LedgerInput = { owed, adjustments, completed };
  const remaining = remainingFor(input);
  const totalRemaining = PRAYERS.reduce((s, p) => s + remaining[p], 0);
  return { ...input, remaining, totalOwed: totalOwed(input), totalRemaining };
}

/** Save the initial estimate and mark onboarding as done. Replaces any previous debt. */
export function saveInitialDebt(counts: PrayerCounts): void {
  db.transaction((tx) => {
    tx.delete(schema.prayerDebt).run();
    for (const p of PRAYERS) {
      tx.insert(schema.prayerDebt).values({ prayer: p, totalOwed: Math.max(0, Math.floor(counts[p])) }).run();
    }
  });
  setBool(SETTING_KEYS.onboarded, true);
  touchLocalChange();
}

/** Log completed prayers. Count is capped at what is still remaining. Returns how many were logged. */
export function logCompletion(prayer: Prayer, count = 1, at = Date.now()): number {
  const { remaining } = loadSummary();
  const n = Math.min(Math.max(0, Math.floor(count)), remaining[prayer]);
  if (n <= 0) return 0;
  db.insert(schema.completions).values({ prayer, count: n, completedAt: at }).run();
  touchLocalChange();
  return n;
}

/** Log one of every prayer that still has something remaining. */
export function logFullDay(at = Date.now()): number {
  let logged = 0;
  db.transaction(() => {
    const { remaining } = loadSummary();
    for (const p of PRAYERS) {
      if (remaining[p] > 0) {
        db.insert(schema.completions).values({ prayer: p, count: 1, completedAt: at }).run();
        logged += 1;
      }
    }
  });
  if (logged > 0) touchLocalChange();
  return logged;
}

/** Remove the most recent completion. Returns the removed row, if any. */
export function undoLast() {
  const last = db.select().from(schema.completions).orderBy(desc(schema.completions.id)).limit(1).get();
  if (!last) return null;
  db.delete(schema.completions).where(eq(schema.completions.id, last.id)).run();
  touchLocalChange();
  return last;
}

export function listCompletions(limit = 500) {
  return db
    .select()
    .from(schema.completions)
    .orderBy(desc(schema.completions.completedAt), desc(schema.completions.id))
    .limit(limit)
    .all();
}

export function deleteCompletion(id: number): void {
  db.delete(schema.completions).where(eq(schema.completions.id, id)).run();
  touchLocalChange();
}

/** Change the amount owed for a prayer by recording an adjustment, so history stays intact. */
export function setOwedTo(prayer: Prayer, newTotalRemaining: number, reason = 'Manual edit'): void {
  const target = Math.max(0, Math.floor(newTotalRemaining));
  const { remaining } = loadSummary();
  const delta = target - remaining[prayer];
  if (delta === 0) return;
  db.insert(schema.adjustments).values({ prayer, delta, reason, createdAt: Date.now() }).run();
  touchLocalChange();
}

export function resetAll(): void {
  db.transaction((tx) => {
    tx.delete(schema.completions).run();
    tx.delete(schema.adjustments).run();
    tx.delete(schema.prayerDebt).run();
  });
  setBool(SETTING_KEYS.onboarded, false);
  touchLocalChange();
}

export function completionTimestamps(): { completedAt: number; count: number }[] {
  return db
    .select({ completedAt: schema.completions.completedAt, count: schema.completions.count })
    .from(schema.completions)
    .all();
}

export { emptyCounts };
