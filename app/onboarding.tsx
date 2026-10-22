import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/components/theme';
import { Body, Button, Card, Field, Title } from '@/components/ui';
import { estimateFromDates, estimateFromYearsMonths, normalizeManual } from '@/domain/estimate';
import { PRAYER_LABELS, PRAYERS, totalOf, type PrayerCounts } from '@/domain/prayers';
import { saveInitialDebt } from '@/services/ledger';
import { useLedger } from '@/store';

type Method = 'dates' | 'span' | 'manual';

const METHODS: { key: Method; label: string }[] = [
  { key: 'dates', label: 'Start date' },
  { key: 'span', label: 'Years' },
  { key: 'manual', label: 'Manual' },
];

const num = (s: string) => {
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export default function Onboarding() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refresh = useLedger((s) => s.refresh);

  const [method, setMethod] = useState<Method>('dates');
  const [day, setDay] = useState('1');
  const [month, setMonth] = useState('1');
  const [year, setYear] = useState(String(new Date().getFullYear() - 5));
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [excluded, setExcluded] = useState('');
  const [manual, setManual] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Partial<Record<string, string>>>({});

  const computed: PrayerCounts = useMemo(() => {
    const today = new Date();
    if (method === 'dates') {
      const start = new Date(num(year), Math.max(0, num(month) - 1), Math.max(1, num(day)));
      return estimateFromDates(start, today, num(excluded));
    }
    if (method === 'span') return estimateFromYearsMonths(num(years), num(months), today, num(excluded));
    return normalizeManual(Object.fromEntries(PRAYERS.map((p) => [p, Number(manual[p] ?? 0)])));
  }, [method, day, month, year, years, months, excluded, manual]);

  // Per-prayer overrides typed on the review card win over the computed value.
  const final: PrayerCounts = useMemo(
    () => normalizeManual(Object.fromEntries(PRAYERS.map((p) => [p, edited[p] !== undefined ? Number(edited[p]) : computed[p]]))),
    [computed, edited],
  );
  const total = totalOf(final);

  const selectMethod = (m: Method) => {
    setMethod(m);
    setEdited({});
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.md, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
        style={{ backgroundColor: t.bg }}
      >
        <Title>Let’s set up</Title>
        <Body muted>
          Tell us roughly how many prayers you have missed. An estimate is fine, and you can change it any time.
        </Body>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {METHODS.map((m) => (
            <Pressable
              key={m.key}
              accessibilityRole="button"
              accessibilityState={{ selected: method === m.key }}
              onPress={() => selectMethod(m.key)}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 12,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: method === m.key ? t.primary : t.border,
                backgroundColor: method === m.key ? t.primary : 'transparent',
              }}
            >
              <Text style={{ color: method === m.key ? t.primaryText : t.text, fontWeight: '600' }}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {method === 'dates' && (
          <Card style={{ gap: spacing.md }}>
            <Body>When did you start praying regularly?</Body>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Field label="Day" value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} />
              <Field label="Month" value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} />
              <Field label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
            </View>
          </Card>
        )}

        {method === 'span' && (
          <Card style={{ gap: spacing.md }}>
            <Body>For how long did you miss prayers?</Body>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Field label="Years" value={years} onChangeText={setYears} keyboardType="number-pad" maxLength={2} />
              <Field label="Months" value={months} onChangeText={setMonths} keyboardType="number-pad" maxLength={2} />
            </View>
          </Card>
        )}

        {method !== 'manual' ? (
          <Card style={{ gap: spacing.md }}>
            <Body>Days to leave out (illness, travel, or days you did pray)</Body>
            <View style={{ flexDirection: 'row' }}>
              <Field label="Days" value={excluded} onChangeText={setExcluded} keyboardType="number-pad" placeholder="0" />
            </View>
          </Card>
        ) : (
          <Card style={{ gap: spacing.md }}>
            <Body>How many of each prayer are missed?</Body>
            {PRAYERS.map((p) => (
              <View key={p} style={{ flexDirection: 'row' }}>
                <Field
                  label={PRAYER_LABELS[p]}
                  value={manual[p] ?? ''}
                  onChangeText={(v) => setManual((m) => ({ ...m, [p]: v }))}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
            ))}
          </Card>
        )}

        {method !== 'manual' && (
          <Card style={{ gap: spacing.md }}>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Review</Text>
            <Body muted>You can adjust any number before saving.</Body>
            {PRAYERS.map((p) => (
              <View key={p} style={{ flexDirection: 'row' }}>
                <Field
                  label={PRAYER_LABELS[p]}
                  value={edited[p] ?? String(computed[p])}
                  onChangeText={(v) => setEdited((e) => ({ ...e, [p]: v }))}
                  keyboardType="number-pad"
                />
              </View>
            ))}
          </Card>
        )}

        <Card style={{ gap: spacing.xs }}>
          <Body muted>Total to make up</Body>
          <Text style={{ color: t.text, fontSize: 32, fontWeight: '800' }}>{total.toLocaleString()}</Text>
        </Card>

        <Button
          label="Save and continue"
          onPress={() => {
            saveInitialDebt(method === 'manual' ? computed : final);
            refresh();
            router.replace('/');
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
