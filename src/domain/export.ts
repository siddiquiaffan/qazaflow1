import { dayKey } from './stats';
import { isPrayer, PRAYER_LABELS } from './prayers';

export interface ExportRow {
  prayer: string;
  count: number;
  completedAt: number;
}

/** Quote a field only when it needs it (comma, quote or newline). */
export function csvField(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function timeOfDay(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** History as CSV, oldest first, with local dates and times. */
export function completionsToCsv(rows: ExportRow[]): string {
  const lines = ['date,time,prayer,count'];
  const sorted = [...rows].sort((a, b) => a.completedAt - b.completedAt);
  for (const r of sorted) {
    const name = isPrayer(r.prayer) ? PRAYER_LABELS[r.prayer] : r.prayer;
    lines.push([dayKey(r.completedAt), timeOfDay(r.completedAt), name, r.count].map(csvField).join(','));
  }
  return lines.join('\n') + '\n';
}
