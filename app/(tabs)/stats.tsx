import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { spacing, useTheme } from '@/components/theme';
import { Body, Card, ProgressBar } from '@/components/ui';
import { PRAYER_LABELS, PRAYERS } from '@/domain/prayers';
import { averagePerDay, currentStreak, progressFraction, projectedFinish } from '@/domain/stats';
import { completionTimestamps } from '@/services/ledger';
import { useLedger } from '@/store';

function Stat({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <Card style={{ flex: 1, gap: spacing.xs }}>
      <Text style={{ color: t.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: t.text, fontSize: 24, fontWeight: '700' }}>{value}</Text>
    </Card>
  );
}

export default function StatsScreen() {
  const t = useTheme();
  const { summary, version } = useLedger();

  const stats = useMemo(() => {
    const now = Date.now();
    const entries = completionTimestamps();
    const pace7 = averagePerDay(entries, now, 7);
    const pace30 = averagePerDay(entries, now, 30);
    const pace = pace7 > 0 ? pace7 : pace30;
    return {
      streak: currentStreak(entries.map((e) => e.completedAt), now),
      pace7,
      pace30,
      finish: projectedFinish(summary.totalRemaining, pace, now),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, summary.totalRemaining]);

  const finishText =
    summary.totalRemaining === 0
      ? 'All done'
      : stats.finish
        ? stats.finish.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        : 'Log some to see';

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} style={{ backgroundColor: t.bg }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Stat label="Day streak" value={String(stats.streak)} />
        <Stat label="Per day (7d)" value={stats.pace7.toFixed(1)} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Stat label="Per day (30d)" value={stats.pace30.toFixed(1)} />
        <Stat label="Projected finish" value={finishText} />
      </View>

      <Card style={{ gap: spacing.md }}>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>By prayer</Text>
        {PRAYERS.map((p) => {
          const owed = Math.max(0, summary.owed[p] + summary.adjustments[p]);
          const f = progressFraction(summary.remaining[p], owed);
          return (
            <View key={p} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Body>{PRAYER_LABELS[p]}</Body>
                <Body muted>
                  {summary.remaining[p].toLocaleString()} left of {owed.toLocaleString()}
                </Body>
              </View>
              <ProgressBar fraction={f} />
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}
