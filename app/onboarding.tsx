import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateTimeSheet } from '@/components/DateTimeSheet';
import { confirmRestore } from '@/components/restoreFlow';
import { spacing, useTheme } from '@/components/theme';
import { Button, Card, Field, IconBadge, SectionLabel, Segmented, T } from '@/components/ui';
import { estimateFromDates, estimateFromYearsMonths, normalizeManual } from '@/domain/estimate';
import { PRAYER_LABELS, PRAYERS, totalOf, type Prayer, type PrayerCounts } from '@/domain/prayers';
import { fetchRemoteSnapshot, signIn } from '@/services/drive';
import { saveInitialDebt } from '@/services/ledger';
import { useLedger } from '@/store';

type Method = 'dates' | 'span' | 'manual';

const METHODS: { key: Method; label: string }[] = [
  { key: 'dates', label: 'Start date' },
  { key: 'span', label: 'Years' },
  { key: 'manual', label: 'Exact counts' },
];

const HELP: Record<Method, string> = {
  dates: 'Pick the day you began praying regularly. Every day since then is counted.',
  span: 'Roughly how long were you not praying? An estimate is fine.',
  manual: 'Already know your numbers? Enter them for each prayer.',
};

const num = (s: string) => {
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function pairs<T>(list: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += 2) out.push(list.slice(i, i + 2));
  return out;
}

function fiveYearsAgo(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d;
}

export default function Onboarding() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refresh = useLedger((s) => s.refresh);

  const [method, setMethod] = useState<Method>('dates');
  const [startDate, setStartDate] = useState<Date>(fiveYearsAgo);
  const [showDate, setShowDate] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [excluded, setExcluded] = useState('');
  const [manual, setManual] = useState<Partial<Record<Prayer, string>>>({});
  // Edits made on the review card only apply to the estimate they were made against.
  const [edit, setEdit] = useState<{ sig: string; values: Partial<Record<Prayer, string>> }>({ sig: '', values: {} });

  const computed: PrayerCounts = useMemo(() => {
    const today = new Date();
    if (method === 'dates') return estimateFromDates(startDate, today, num(excluded));
    if (method === 'span') return estimateFromYearsMonths(num(years), num(months), today, num(excluded));
    return normalizeManual(Object.fromEntries(PRAYERS.map((p) => [p, Number(manual[p] ?? 0)])));
  }, [method, startDate, years, months, excluded, manual]);

  const sig = `${method}:${JSON.stringify(computed)}`;
  const edited = edit.sig === sig ? edit.values : {};

  const final: PrayerCounts = useMemo(
    () =>
      normalizeManual(
        Object.fromEntries(PRAYERS.map((p) => [p, edited[p] !== undefined ? Number(edited[p]) : computed[p]])),
      ),
    [computed, edited],
  );
  const total = totalOf(final);

  /** New phone? Sign in and pull the last backup instead of starting over. */
  const restoreFromDrive = async () => {
    setRestoring(true);
    try {
      await signIn();
      const snap = await fetchRemoteSnapshot();
      if (!snap) {
        Alert.alert('No backup found', 'There is no QazaFlow backup in this Google account. You can set things up below instead.');
        return;
      }
      confirmRestore(snap, () => {
        refresh();
        router.replace('/');
      });
    } catch (e) {
      Alert.alert('Backup', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setRestoring(false);
    }
  };

  const save = () => {
    saveInitialDebt(final);
    refresh();
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
      >
        <View style={{ gap: 12 }}>
          <IconBadge name="leaf-outline" size={56} />
          <T variant="title">Let’s set things up</T>
          <T color="muted">
            Tell us roughly how many prayers you have missed. An estimate is fine — you can change it at any time.
          </T>
        </View>

        <Card tone="tinted" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge name="cloud-download-outline" size={44} />
          <View style={{ flex: 1, gap: 8 }}>
            <View>
              <T variant="subheading">Already use QazaFlow?</T>
              <T variant="caption" color="muted">
                Bring your progress over from Google Drive.
              </T>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Button label="Restore backup" size="sm" icon="logo-google" loading={restoring} onPress={restoreFromDrive} />
            </View>
          </View>
        </Card>

        <SectionLabel>Or start fresh</SectionLabel>

        <Segmented options={METHODS} value={method} onChange={setMethod} />
        <T variant="caption" color="muted" style={{ marginTop: -4 }}>
          {HELP[method]}
        </T>

        {method === 'dates' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start date, ${startDate.toLocaleDateString()}. Tap to change.`}
            onPress={() => setShowDate(true)}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <IconBadge name="calendar-outline" size={44} />
              <View style={{ flex: 1 }}>
                <T variant="caption" color="muted">
                  Started praying regularly
                </T>
                <T variant="heading">
                  {startDate.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.muted} />
            </Card>
          </Pressable>
        )}

        {method === 'span' && (
          <Card style={{ flexDirection: 'row', gap: 12 }}>
            <Field label="Years" value={years} onChangeText={setYears} keyboardType="number-pad" maxLength={2} placeholder="0" />
            <Field label="Months" value={months} onChangeText={setMonths} keyboardType="number-pad" maxLength={2} placeholder="0" />
          </Card>
        )}

        {method !== 'manual' ? (
          <Card style={{ gap: 12 }}>
            <View>
              <T variant="subheading">Days to leave out</T>
              <T variant="caption" color="muted">
                Days you did pray, or were unable to (optional).
              </T>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Field label="Number of days" value={excluded} onChangeText={setExcluded} keyboardType="number-pad" placeholder="0" />
            </View>
          </Card>
        ) : (
          <Card style={{ gap: 12 }}>
            {pairs(PRAYERS).map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                {row.map((p) => (
                  <Field
                    key={p}
                    label={PRAYER_LABELS[p]}
                    value={manual[p] ?? ''}
                    onChangeText={(v) => setManual((m) => ({ ...m, [p]: v.replace(/[^0-9]/g, '') }))}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                ))}
              </View>
            ))}
          </Card>
        )}

        {method !== 'manual' && (
          <>
            <SectionLabel>Review</SectionLabel>
            <Card style={{ gap: 12 }}>
              <T variant="caption" color="muted">
                Here is what we estimate. Adjust any number if you know better.
              </T>
              {pairs(PRAYERS).map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  {row.map((p) => (
                    <Field
                      key={p}
                      label={PRAYER_LABELS[p]}
                      value={edited[p] ?? String(computed[p])}
                      onChangeText={(v) =>
                        setEdit((prev) => ({
                          sig,
                          values: { ...(prev.sig === sig ? prev.values : {}), [p]: v.replace(/[^0-9]/g, '') },
                        }))
                      }
                      keyboardType="number-pad"
                    />
                  ))}
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: t.surface,
          borderTopWidth: 1,
          borderTopColor: t.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <T variant="caption" color="muted">
            Total to make up
          </T>
          <T variant="title" adjustsFontSizeToFit numberOfLines={1}>
            {total.toLocaleString()}
          </T>
        </View>
        <Button label="Continue" icon="arrow-forward" disabled={total === 0} onPress={save} style={{ minWidth: 160 }} />
      </View>

      <DateTimeSheet
        visible={showDate}
        mode="date"
        title="When did you start praying regularly?"
        value={startDate}
        maximumDate={new Date()}
        onCancel={() => setShowDate(false)}
        onConfirm={(d) => {
          setStartDate(d);
          setShowDate(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}
