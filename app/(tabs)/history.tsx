import { useMemo } from 'react';
import { Alert, SectionList, Text, View } from 'react-native';

import { spacing, useTheme } from '@/components/theme';
import { Body, Button, Card } from '@/components/ui';
import { isPrayer, PRAYER_LABELS } from '@/domain/prayers';
import { dayKey } from '@/domain/stats';
import { deleteCompletion, listCompletions } from '@/services/ledger';
import { useLedger } from '@/store';

type Row = ReturnType<typeof listCompletions>[number];

export default function HistoryScreen() {
  const t = useTheme();
  const { version, refresh } = useLedger();

  const sections = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const row of listCompletions()) {
      const key = dayKey(row.completedAt);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()].map(([title, data]) => ({
      title,
      total: data.reduce((s, r) => s + r.count, 0),
      data,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const confirmDelete = (row: Row) =>
    Alert.alert('Remove entry?', 'This adds the prayers back to what remains.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          deleteCompletion(row.id);
          refresh();
        },
      },
    ]);

  if (sections.length === 0) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center', backgroundColor: t.bg }}>
        <Body muted>Nothing logged yet. Prayers you complete will show up here.</Body>
      </View>
    );
  }

  return (
    <SectionList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      sections={sections}
      keyExtractor={(r) => String(r.id)}
      renderSectionHeader={({ section }) => (
        <Text style={{ color: t.muted, fontWeight: '600', paddingTop: spacing.sm }}>
          {section.title} · {section.total} completed
        </Text>
      )}
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>
              {isPrayer(item.prayer) ? PRAYER_LABELS[item.prayer] : item.prayer} × {item.count}
            </Text>
            <Body muted>{new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Body>
          </View>
          <Button label="Remove" variant="danger" onPress={() => confirmDelete(item)} />
        </Card>
      )}
    />
  );
}
