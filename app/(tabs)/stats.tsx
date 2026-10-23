import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { View } from 'react-native';

import { PRAYER_ICONS } from '@/components/prayerMeta';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/components/theme';
import { Card, IconBadge, ProgressBar, SectionLabel, T, type IconName } from '@/components/ui';
import { PRAYER_LABELS, PRAYERS } from '@/domain/prayers';
import {
  averagePerDay,
  currentStreak,
  dailyTotals,
  progressFraction,
  projectedFinish,
} from '@/domain/stats';
import { completionTimestamps } from '@/services/ledger';
import { useLedger } from '@/store';

function Tile({ icon, label, value, note }: { icon: IconName; label: string; value: string; note?: string }) {
  return (
    <Card style={{ flex: 1, gap: 10 }}>
      <IconBadge name={icon} size={36} />
      <View>
        <T variant="heading" adjustsFontSizeToFit numberOfLines={1}>
          {value}
        </T>
        <T variant="caption" color="muted">
          {label}
        </T>
        {note ? (
          <T variant="caption" color="muted">
            {note}
          </T>
        ) : null}
      </View>
    </Card>
  );
}

const CHART_DAYS = 14;
const CHART_HEIGHT = 110;

export default function StatsScreen() {
  const t = useTheme();
  const { summary, version } = useLedger();

  const stats = useMemo(() => {
    const now = Date.now();
    const entries = completionTimestamps();
    const pace7 = averagePerDay(entries, now, 7);
    const pace30 = averagePerDay(entries, now, 30);
    return {
      streak: currentStreak(entries.map((e) => e.completedAt), now),
      pace7,
      finish: projectedFinish(summary.totalRemaining, pace7 > 0 ? pace7 : pace30, now),
      days: dailyTotals(entries, now, CHART_DAYS),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, summary.totalRemaining]);

  const peak = Math.max(1, ...stats.days.map((d) => d.count));
  const completed = summary.totalOwed - summary.totalRemaining;
  const finishText =
    summary.totalRemaining === 0
      ? 'Done'
      : stats.finish
        ? stats.finish.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        : '—';

  return (
    <Screen title="Progress" subtitle="Your pace and what is left">
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Tile icon="flame-outline" label="Day streak" value={String(stats.streak)} />
        <Tile icon="checkmark-done-outline" label="Completed" value={completed.toLocaleString()} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Tile icon="speedometer-outline" label="Per day this week" value={stats.pace7.toFixed(1)} />
        <Tile
          icon="calendar-outline"
          label="Projected finish"
          value={finishText}
          note={stats.finish || summary.totalRemaining === 0 ? undefined : 'Log some to see'}
        />
      </View>

      <SectionLabel>Last 14 days</SectionLabel>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap: 6 }}>
          {stats.days.map((d, i) => {
            const isToday = i === stats.days.length - 1;
            const h = d.count === 0 ? 4 : Math.max(8, (d.count / peak) * CHART_HEIGHT);
            return (
              <View
                key={d.key}
                accessible
                accessibilityLabel={`${d.date.toLocaleDateString(undefined, { weekday: 'long' })}: ${d.count} prayers`}
                style={{
                  flex: 1,
                  height: h,
                  borderRadius: 6,
                  backgroundColor: d.count === 0 ? t.track : t.primary,
                  opacity: d.count === 0 ? 1 : isToday ? 1 : 0.55,
                }}
              />
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {stats.days.map((d) => (
            <T key={d.key} variant="caption" color="muted" style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>
              {d.date.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </T>
          ))}
        </View>
        <T variant="caption" color="muted">
          {peak > 1 || stats.days.some((d) => d.count > 0)
            ? `Busiest day: ${peak} prayers`
            : 'Your daily totals will show up here.'}
        </T>
      </Card>

      <SectionLabel>By prayer</SectionLabel>
      <Card style={{ gap: 18 }}>
        {PRAYERS.map((p) => {
          const owed = Math.max(0, summary.owed[p] + summary.adjustments[p]);
          return (
            <View key={p} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialCommunityIcons name={PRAYER_ICONS[p]} size={20} color={t.primary} />
                <T variant="subheading" style={{ flex: 1 }}>
                  {PRAYER_LABELS[p]}
                </T>
                {summary.remaining[p] === 0 && owed > 0 ? (
                  <Ionicons name="checkmark-circle" size={18} color={t.success} />
                ) : null}
                <T variant="caption" color="muted">
                  {summary.remaining[p].toLocaleString()} left of {owed.toLocaleString()}
                </T>
              </View>
              <ProgressBar fraction={progressFraction(summary.remaining[p], owed)} height={8} />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
