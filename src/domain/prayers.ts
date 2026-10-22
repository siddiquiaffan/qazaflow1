export const PRAYERS = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha', 'witr'] as const;

export type Prayer = (typeof PRAYERS)[number];

export const PRAYER_LABELS: Record<Prayer, string> = {
  fajr: 'Fajr',
  zuhr: 'Zuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  witr: 'Witr',
};

/** Number of prayers owed per missed day (one of each). */
export const PRAYERS_PER_DAY = PRAYERS.length;

export type PrayerCounts = Record<Prayer, number>;

export function emptyCounts(value = 0): PrayerCounts {
  return { fajr: value, zuhr: value, asr: value, maghrib: value, isha: value, witr: value };
}

export function totalOf(counts: PrayerCounts): number {
  return PRAYERS.reduce((sum, p) => sum + counts[p], 0);
}

export function isPrayer(value: string): value is Prayer {
  return (PRAYERS as readonly string[]).includes(value);
}
