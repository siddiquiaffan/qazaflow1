import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { NumberPrompt } from '@/components/NumberPrompt';
import { PRAYER_ICONS } from '@/components/prayerMeta';
import { ProgressRing } from '@/components/ProgressRing';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/components/theme';
import { Button, Card, IconButton, ProgressBar, SectionLabel, T } from '@/components/ui';
import { pluralize } from '@/domain/format';
import { PRAYER_LABELS, PRAYERS, type Prayer } from '@/domain/prayers';
import { averagePerDay, completedToday, currentStreak, progressFraction } from '@/domain/stats';
import { completionTimestamps, logCompletion, logFullDay, undoLast } from '@/services/ledger';
import { useLedger } from '@/store';

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T variant="heading" color="onHero">
        {value}
      </T>
      <T variant="caption" color="onHeroMuted">
        {label}
      </T>
    </View>
  );
}

export default function HomeScreen() {
  const t = useTheme();
  const { summary, version, refresh } = useLedger();
  const showToast = useToast((s) => s.show);
  const [multi, setMulti] = useState<Prayer | null>(null);

  const done = summary.totalOwed - summary.totalRemaining;
  const fraction = progressFraction(summary.totalRemaining, summary.totalOwed);
  const allDone = summary.totalOwed > 0 && summary.totalRemaining === 0;

  const { today, streak, pace } = useMemo(() => {
    const now = Date.now();
    const entries = completionTimestamps();
    return {
      today: completedToday(entries, now),
      streak: currentStreak(entries.map((e) => e.completedAt), now),
      pace: averagePerDay(entries, now, 7),
    };
    // `version` changes whenever the ledger changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const undo = () => {
    undoLast();
    refresh();
  };

  const log = (p: Prayer, n: number) => {
    const logged = logCompletion(p, n);
    if (logged === 0) return;
    refresh();
    showToast(`${PRAYER_LABELS[p]}${logged > 1 ? ` × ${logged}` : ''} logged`, { label: 'Undo', onPress: undo });
  };

  const logDay = () => {
    const n = logFullDay();
    if (n === 0) return;
    refresh();
    showToast(`${pluralize(n, 'prayer')} logged`, { label: 'Undo', onPress: undoDay(n) });
  };

  // A full day logs up to six separate entries, so undo removes that many.
  const undoDay = (n: number) => () => {
    for (let i = 0; i < n; i += 1) undoLast();
    refresh();
  };

  return (
    <Screen
      title="Today"
      subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
    >
      <Card tone="hero" style={{ alignItems: 'center', paddingVertical: 28, gap: 20 }}>
        <ProgressRing size={216} stroke={18} fraction={fraction} color={t.accent} trackColor={t.heroTrack}>
          {allDone ? (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={56} color={t.accent} />
              <T variant="heading" color="onHero">
                All caught up
              </T>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <T
                variant="display"
                color="onHero"
                accessibilityLabel={`${summary.totalRemaining} prayers remaining`}
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{ maxWidth: 160 }}
              >
                {summary.totalRemaining.toLocaleString()}
              </T>
              <T variant="caption" color="onHeroMuted">
                prayers to go
              </T>
            </View>
          )}
        </ProgressRing>

        <T variant="caption" color="onHeroMuted">
          {done.toLocaleString()} of {summary.totalOwed.toLocaleString()} complete · {Math.round(fraction * 100)}%
        </T>

        <View
          style={{
            flexDirection: 'row',
            alignSelf: 'stretch',
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: t.heroTrack,
          }}
        >
          <HeroStat value={String(today)} label="Done today" />
          <HeroStat value={`${streak} ${streak === 1 ? 'day' : 'days'}`} label="Streak" />
          <HeroStat value={pace.toFixed(1)} label="Per day" />
        </View>
      </Card>

      <Button
        label="Log a full day"
        icon="checkmark-done"
        variant="tonal"
        disabled={summary.totalRemaining === 0}
        onPress={logDay}
      />

      <SectionLabel>Prayers</SectionLabel>

      {PRAYERS.map((p) => {
        const owed = Math.max(0, summary.owed[p] + summary.adjustments[p]);
        const left = summary.remaining[p];
        return (
          <Card key={p} style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: t.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name={PRAYER_ICONS[p]} size={26} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="heading">{PRAYER_LABELS[p]}</T>
                <T variant="caption" color="muted">
                  {left === 0 ? 'All made up' : `${left.toLocaleString()} left`}
                </T>
              </View>
              {left === 0 ? (
                <Ionicons name="checkmark-circle" size={32} color={t.success} accessibilityLabel={`${PRAYER_LABELS[p]} complete`} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <IconButton
                    icon="ellipsis-horizontal"
                    label={`Log several ${PRAYER_LABELS[p]}`}
                    onPress={() => setMulti(p)}
                  />
                  <IconButton
                    icon="add"
                    label={`Log one ${PRAYER_LABELS[p]}`}
                    variant="primary"
                    size={52}
                    onPress={() => log(p, 1)}
                  />
                </View>
              )}
            </View>
            <ProgressBar fraction={progressFraction(left, owed)} height={6} />
          </Card>
        );
      })}

      <NumberPrompt
        visible={multi !== null}
        title={multi ? `${PRAYER_LABELS[multi]} completed` : ''}
        hint="How many did you make up?"
        initial={1}
        max={multi ? summary.remaining[multi] : undefined}
        confirmLabel="Log"
        onCancel={() => setMulti(null)}
        onConfirm={(n) => {
          if (multi && n > 0) log(multi, n);
          setMulti(null);
        }}
      />
    </Screen>
  );
}
