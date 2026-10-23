import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { success } from '@/components/haptics';
import { NumberPrompt } from '@/components/NumberPrompt';
import { PRAYER_ICONS } from '@/components/prayerMeta';
import { ProgressRing } from '@/components/ProgressRing';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/components/theme';
import { Button, Card, IconBadge, IconButton, ProgressBar, SectionLabel, Segmented, T } from '@/components/ui';
import { crossedGoal } from '@/domain/goal';
import { shiftDays } from '@/domain/history';
import { pluralize } from '@/domain/format';
import { PRAYER_LABELS, PRAYERS, type Prayer } from '@/domain/prayers';
import { averagePerDay, completedToday, currentStreak, progressFraction } from '@/domain/stats';
import { getSignedInEmail } from '@/services/drive';
import { completionTimestamps, logCompletion, logFullDay, undoLast } from '@/services/ledger';
import { getBool, getDailyGoal, setBool, SETTING_KEYS } from '@/services/settings';
import { useLedger } from '@/store';

/** Show the backup reminder once someone has real progress worth protecting. */
const NUDGE_AFTER_PRAYERS = 10;

type When = 'today' | 'yesterday';

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
  const router = useRouter();
  const { summary, version, refresh } = useLedger();
  const showToast = useToast((s) => s.show);
  const [multi, setMulti] = useState<Prayer | null>(null);
  const [when, setWhen] = useState<When>('today');
  const [nudgeDismissed, setNudgeDismissed] = useState(() => getBool(SETTING_KEYS.backupNudgeDismissed));

  const done = summary.totalOwed - summary.totalRemaining;
  const fraction = progressFraction(summary.totalRemaining, summary.totalOwed);
  const allDone = summary.totalOwed > 0 && summary.totalRemaining === 0;

  const { today, streak, pace, goal, signedIn } = useMemo(() => {
    const now = Date.now();
    const entries = completionTimestamps();
    return {
      today: completedToday(entries, now),
      streak: currentStreak(entries.map((e) => e.completedAt), now),
      pace: averagePerDay(entries, now, 7),
      goal: getDailyGoal(),
      signedIn: getSignedInEmail() !== null,
    };
    // `version` changes whenever the ledger or settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const showNudge = !signedIn && !nudgeDismissed && done >= NUDGE_AFTER_PRAYERS;

  const undo = () => {
    undoLast();
    refresh();
  };

  /** Pick the most meaningful message for this log: finishing everything beats the goal beats a prayer. */
  const log = (p: Prayer, n: number, day: When = 'today') => {
    const at = day === 'yesterday' ? shiftDays(Date.now(), 1) : Date.now();
    const logged = logCompletion(p, n, at);
    if (logged === 0) return;

    const finishedAll = summary.totalRemaining - logged === 0;
    const finishedPrayer = summary.remaining[p] - logged === 0;
    const hitGoal = day === 'today' && crossedGoal(today, today + logged, goal);

    let message = `${PRAYER_LABELS[p]}${logged > 1 ? ` × ${logged}` : ''} logged${day === 'yesterday' ? ' for yesterday' : ''}`;
    if (finishedAll) message = 'All caught up. Well done.';
    else if (hitGoal) message = 'Daily goal reached';
    else if (finishedPrayer) message = `${PRAYER_LABELS[p]} complete`;
    if (finishedAll || hitGoal || finishedPrayer) success();

    refresh();
    showToast(message, { label: 'Undo', onPress: undo });
  };

  const logDay = () => {
    const n = logFullDay();
    if (n === 0) return;
    const hitGoal = crossedGoal(today, today + n, goal);
    if (summary.totalRemaining - n === 0 || hitGoal) success();
    refresh();
    showToast(hitGoal ? 'Daily goal reached' : `${pluralize(n, 'prayer')} logged`, {
      label: 'Undo',
      // A full day writes one entry per prayer, so undo removes that many.
      onPress: () => {
        for (let i = 0; i < n; i += 1) undoLast();
        refresh();
      },
    });
  };

  const openMulti = (p: Prayer) => {
    setWhen('today');
    setMulti(p);
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
          {goal > 0 ? (
            <HeroStat value={`${today} / ${goal}`} label={today >= goal ? 'Goal reached' : "Today's goal"} />
          ) : (
            <HeroStat value={String(today)} label="Done today" />
          )}
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

      {showNudge ? (
        <Card tone="accent" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge name="cloud-upload-outline" tone="accent" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="subheading" style={{ color: t.onAccentSoft }}>
              Protect your progress
            </T>
            <T variant="caption" style={{ color: t.onAccentSoft }}>
              Back up to Google Drive so a lost phone never costs you your count.
            </T>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Button label="Set up backup" size="sm" onPress={() => router.push('/settings')} />
            </View>
          </View>
          <IconButton
            icon="close"
            label="Dismiss backup reminder"
            variant="ghost"
            size={36}
            onPress={() => {
              setBool(SETTING_KEYS.backupNudgeDismissed, true);
              setNudgeDismissed(true);
            }}
          />
        </Card>
      ) : null}

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
                    onPress={() => openMulti(p)}
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
        hint="How many did you make up? Forgot to log earlier? Choose yesterday."
        initial={1}
        max={multi ? summary.remaining[multi] : undefined}
        confirmLabel="Log"
        extra={
          <Segmented
            options={[
              { key: 'today' as const, label: 'Today' },
              { key: 'yesterday' as const, label: 'Yesterday' },
            ]}
            value={when}
            onChange={setWhen}
          />
        }
        onCancel={() => setMulti(null)}
        onConfirm={(n) => {
          if (multi && n > 0) log(multi, n, when);
          setMulti(null);
        }}
      />
    </Screen>
  );
}
