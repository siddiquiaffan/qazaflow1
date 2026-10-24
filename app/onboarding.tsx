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
import { PRAYERS, totalOf, type Prayer, type PrayerCounts } from '@/domain/prayers';
import { fetchRemoteSnapshot, signIn } from '@/services/drive';
import { saveInitialDebt } from '@/services/ledger';
import { isRtl, toAsciiDigits, useT, type Key } from '@/i18n';
import { useLedger } from '@/store';

type Method = 'dates' | 'span' | 'manual';

const METHODS: { key: Method; label: Key }[] = [
  { key: 'dates', label: 'onb.method.dates' },
  { key: 'span', label: 'onb.method.span' },
  { key: 'manual', label: 'onb.method.manual' },
];

const HELP: Record<Method, Key> = {
  dates: 'onb.help.dates',
  span: 'onb.help.span',
  manual: 'onb.help.manual',
};

/** What someone typed into a number field, as plain 0-9 digits (Arabic-Indic digits are accepted). */
const clean = (v: string) => toAsciiDigits(v).replace(/[^0-9]/g, '');

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
  const { t: tx, n, digits, prayer: pname, date, lang } = useT();
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
        Alert.alert(tx('backup.noneTitle'), tx('backup.noneOnboarding', { app: tx('app.name') }));
        return;
      }
      confirmRestore(snap, () => {
        refresh();
        router.replace('/');
      });
    } catch (e) {
      Alert.alert(tx('backup.alertTitle'), e instanceof Error ? e.message : tx('common.somethingWrong'));
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
          <T variant="title">{tx('onb.title')}</T>
          <T color="muted">{tx('onb.intro')}</T>
        </View>

        <Card tone="tinted" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge name="cloud-download-outline" size={44} />
          <View style={{ flex: 1, gap: 8 }}>
            <View>
              <T variant="subheading">{tx('onb.restoreTitle', { app: tx('app.name') })}</T>
              <T variant="caption" color="muted">
                {tx('onb.restoreText')}
              </T>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Button label={tx('onb.restoreBtn')} size="sm" icon="logo-google" loading={restoring} onPress={restoreFromDrive} />
            </View>
          </View>
        </Card>

        <SectionLabel>{tx('onb.fresh')}</SectionLabel>

        <Segmented options={METHODS.map((m) => ({ key: m.key, label: tx(m.label) }))} value={method} onChange={setMethod} />
        <T variant="caption" color="muted" style={{ marginTop: -4 }}>
          {tx(HELP[method])}
        </T>

        {method === 'dates' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx('onb.startA11y', { date: date(startDate, { day: 'numeric', month: 'long', year: 'numeric' }) })}
            onPress={() => setShowDate(true)}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <IconBadge name="calendar-outline" size={44} />
              <View style={{ flex: 1 }}>
                <T variant="caption" color="muted">
                  {tx('onb.started')}
                </T>
                <T variant="heading">
                  {date(startDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                </T>
              </View>
              <Ionicons name={isRtl(lang) ? 'chevron-back' : 'chevron-forward'} size={18} color={t.muted} />
            </Card>
          </Pressable>
        )}

        {method === 'span' && (
          <Card style={{ flexDirection: 'row', gap: 12 }}>
            <Field label={tx('onb.years')} value={digits(years)} onChangeText={(v) => setYears(clean(v))} keyboardType="number-pad" maxLength={2} placeholder="0" />
            <Field label={tx('onb.months')} value={digits(months)} onChangeText={(v) => setMonths(clean(v))} keyboardType="number-pad" maxLength={2} placeholder="0" />
          </Card>
        )}

        {method !== 'manual' ? (
          <Card style={{ gap: 12 }}>
            <View>
              <T variant="subheading">{tx('onb.excludeTitle')}</T>
              <T variant="caption" color="muted">
                {tx('onb.excludeText')}
              </T>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Field label={tx('onb.numDays')} value={digits(excluded)} onChangeText={(v) => setExcluded(clean(v))} keyboardType="number-pad" placeholder="0" />
            </View>
          </Card>
        ) : (
          <Card style={{ gap: 12 }}>
            {pairs(PRAYERS).map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                {row.map((p) => (
                  <Field
                    key={p}
                    label={pname(p)}
                    value={digits(manual[p] ?? '')}
                    onChangeText={(v) => setManual((m) => ({ ...m, [p]: clean(v) }))}
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
            <SectionLabel>{tx('onb.review')}</SectionLabel>
            <Card style={{ gap: 12 }}>
              <T variant="caption" color="muted">
                {tx('onb.reviewText')}
              </T>
              {pairs(PRAYERS).map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  {row.map((p) => (
                    <Field
                      key={p}
                      label={pname(p)}
                      value={digits(edited[p] ?? String(computed[p]))}
                      onChangeText={(v) =>
                        setEdit((prev) => ({
                          sig,
                          values: { ...(prev.sig === sig ? prev.values : {}), [p]: clean(v) },
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
            {tx('onb.total')}
          </T>
          <T variant="title" adjustsFontSizeToFit numberOfLines={1}>
            {n(total)}
          </T>
        </View>
        <Button label={tx('onb.continue')} icon={isRtl(lang) ? 'arrow-back' : 'arrow-forward'} disabled={total === 0} onPress={save} style={{ minWidth: 160 }} />
      </View>

      <DateTimeSheet
        visible={showDate}
        mode="date"
        title={tx('onb.dateTitle')}
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
