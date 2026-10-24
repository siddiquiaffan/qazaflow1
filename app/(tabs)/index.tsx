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
import { useT } from '@/i18n';
import { crossedGoal } from '@/domain/goal';
import { shiftDays } from '@/domain/history';
import { PRAYERS, type Prayer } from '@/domain/prayers';
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
  const { t: tx, n, prayer: pname, percent, date } = useT();
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

    const params = { prayer: pname(p), count: logged };
    const yesterday = day === 'yesterday';
    let message =
      logged > 1
        ? tx(yesterday ? 'today.loggedManyYesterday' : 'today.loggedMany', params)
        : tx(yesterday ? 'today.loggedYesterday' : 'today.logged', params);
    if (finishedAll) message = tx('today.allDoneToast');
    else if (hitGoal) message = tx('today.goalToast');
    else if (finishedPrayer) message = tx('today.complete', { prayer: pname(p) });
    if (finishedAll || hitGoal || finishedPrayer) success();

    refresh();
    showToast(message, { label: tx('common.undo'), onPress: undo });
  };

  const logDay = () => {
    const count = logFullDay();
    if (count === 0) return;
    const hitGoal = crossedGoal(today, today + count, goal);
    if (summary.totalRemaining - count === 0 || hitGoal) success();
    refresh();
    showToast(hitGoal ? tx('today.goalToast') : tx('today.fullDayLogged', { count }), {
      label: tx('common.undo'),
      // A full day writes one entry per prayer, so undo removes that many.
      onPress: () => {
        for (let i = 0; i < count; i += 1) undoLast();
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
      title={tx('tab.today')}
      subtitle={date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
    >
      <Card tone="hero" style={{ alignItems: 'center', paddingVertical: 28, gap: 20 }}>
        <ProgressRing size={216} stroke={18} fraction={fraction} color={t.accent} trackColor={t.heroTrack}>
          {allDone ? (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={56} color={t.accent} />
              <T variant="heading" color="onHero">
                {tx('today.allCaughtUp')}
              </T>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <T
                variant="display"
                color="onHero"
                accessibilityLabel={tx('today.remainingA11y', { count: summary.totalRemaining })}
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{ maxWidth: 160 }}
              >
                {n(summary.totalRemaining)}
              </T>
              <T variant="caption" color="onHeroMuted">
                {tx('today.toGo')}
              </T>
            </View>
          )}
        </ProgressRing>

        <T variant="caption" color="onHeroMuted">
          {tx('today.progress', { done, total: summary.totalOwed, percent: percent(fraction) })}
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
            <HeroStat value={`${n(today)} / ${n(goal)}`} label={today >= goal ? tx('today.goalReached') : tx('today.goalLabel')} />
          ) : (
            <HeroStat value={n(today)} label={tx('today.doneToday')} />
          )}
          <HeroStat value={tx('count.days', { count: streak })} label={tx('today.streak')} />
          <HeroStat value={n(pace, 1)} label={tx('today.perDay')} />
        </View>
      </Card>

      <Button
        label={tx('today.fullDay')}
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
              {tx('today.nudgeTitle')}
            </T>
            <T variant="caption" style={{ color: t.onAccentSoft }}>
              {tx('today.nudgeText')}
            </T>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Button label={tx('today.nudgeAction')} size="sm" onPress={() => router.push('/settings')} />
            </View>
          </View>
          <IconButton
            icon="close"
            label={tx('today.nudgeDismiss')}
            variant="ghost"
            size={36}
            onPress={() => {
              setBool(SETTING_KEYS.backupNudgeDismissed, true);
              setNudgeDismissed(true);
            }}
          />
        </Card>
      ) : null}

      <SectionLabel>{tx('today.prayers')}</SectionLabel>

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
                <T variant="heading">{pname(p)}</T>
                <T variant="caption" color="muted">
                  {left === 0 ? tx('today.allMadeUp') : tx('today.left', { count: left })}
                </T>
              </View>
              {left === 0 ? (
                <Ionicons name="checkmark-circle" size={32} color={t.success} accessibilityLabel={tx('today.complete', { prayer: pname(p) })} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <IconButton
                    icon="ellipsis-horizontal"
                    label={tx('today.logSeveral', { prayer: pname(p) })}
                    onPress={() => openMulti(p)}
                  />
                  <IconButton
                    icon="add"
                    label={tx('today.logOne', { prayer: pname(p) })}
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
        title={multi ? tx('today.multiTitle', { prayer: pname(multi) }) : ''}
        hint={tx('today.multiHint')}
        initial={1}
        max={multi ? summary.remaining[multi] : undefined}
        confirmLabel={tx('today.multiLog')}
        extra={
          <Segmented
            options={[
              { key: 'today' as const, label: tx('common.today') },
              { key: 'yesterday' as const, label: tx('common.yesterday') },
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
