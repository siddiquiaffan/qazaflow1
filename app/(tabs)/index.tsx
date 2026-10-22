import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { NumberPrompt } from '@/components/NumberPrompt';
import { spacing, useTheme } from '@/components/theme';
import { Body, Button, Card, ProgressBar } from '@/components/ui';
import { PRAYER_LABELS, PRAYERS, type Prayer } from '@/domain/prayers';
import { progressFraction } from '@/domain/stats';
import { logCompletion, logFullDay, undoLast } from '@/services/ledger';
import { useLedger } from '@/store';

export default function HomeScreen() {
  const t = useTheme();
  const { summary, refresh } = useLedger();
  const [multi, setMulti] = useState<Prayer | null>(null);

  const done = summary.totalOwed - summary.totalRemaining;
  const fraction = progressFraction(summary.totalRemaining, summary.totalOwed);
  const canUndo = done > 0;

  const log = (p: Prayer, n: number) => {
    logCompletion(p, n);
    refresh();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} style={{ backgroundColor: t.bg }}>
      <Card style={{ gap: spacing.sm }}>
        <Text style={{ color: t.muted, fontSize: 14 }}>Remaining</Text>
        <Text style={{ color: t.text, fontSize: 44, fontWeight: '800' }} accessibilityLabel={`${summary.totalRemaining} prayers remaining`}>
          {summary.totalRemaining.toLocaleString()}
        </Text>
        <ProgressBar fraction={fraction} />
        <Body muted>
          {done.toLocaleString()} of {summary.totalOwed.toLocaleString()} completed · {Math.round(fraction * 100)}%
        </Body>
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Completed a full day"
            disabled={summary.totalRemaining === 0}
            onPress={() => {
              logFullDay();
              refresh();
            }}
          />
        </View>
        <Button
          label="Undo"
          variant="secondary"
          disabled={!canUndo}
          onPress={() => {
            undoLast();
            refresh();
          }}
        />
      </View>

      {PRAYERS.map((p) => (
        <Card key={p} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>{PRAYER_LABELS[p]}</Text>
            <Body muted>{summary.remaining[p].toLocaleString()} remaining</Body>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="More" variant="secondary" disabled={summary.remaining[p] === 0} onPress={() => setMulti(p)} />
            <Button label="+1" disabled={summary.remaining[p] === 0} onPress={() => log(p, 1)} />
          </View>
        </Card>
      ))}

      <NumberPrompt
        visible={multi !== null}
        title={multi ? `${PRAYER_LABELS[multi]} completed` : ''}
        initial={1}
        max={multi ? summary.remaining[multi] : undefined}
        confirmLabel="Log"
        onCancel={() => setMulti(null)}
        onConfirm={(n) => {
          if (multi) log(multi, n);
          setMulti(null);
        }}
      />
    </ScrollView>
  );
}
