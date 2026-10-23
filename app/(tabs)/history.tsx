import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Alert, SectionList, View } from 'react-native';

import { PRAYER_ICONS } from '@/components/prayerMeta';
import { ScreenHeader } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/components/theme';
import { EmptyState, Group, IconButton, T } from '@/components/ui';
import { dateFromKey, friendlyDay, pluralize } from '@/domain/format';
import { isPrayer, PRAYER_LABELS } from '@/domain/prayers';
import { dayKey } from '@/domain/stats';
import { deleteCompletion, listCompletions } from '@/services/ledger';
import { useLedger } from '@/store';

type Row = ReturnType<typeof listCompletions>[number];

export default function HistoryScreen() {
  const t = useTheme();
  const { version, refresh } = useLedger();
  const showToast = useToast((s) => s.show);

  const sections = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const row of listCompletions()) {
      const key = dayKey(row.completedAt);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    const now = new Date();
    return [...groups.entries()].map(([key, data]) => ({
      key,
      title: friendlyDay(dateFromKey(key), now),
      total: data.reduce((s, r) => s + r.count, 0),
      data: [data], // one item per day so each day renders as a single grouped card
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const confirmDelete = (row: Row) => {
    const name = isPrayer(row.prayer) ? PRAYER_LABELS[row.prayer] : row.prayer;
    Alert.alert(`Remove ${name} × ${row.count}?`, 'It will be added back to what remains.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          deleteCompletion(row.id);
          refresh();
          showToast('Entry removed');
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="History" subtitle="What you have made up" />
      {sections.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="Nothing logged yet"
          text="Prayers you make up will appear here, grouped by day."
        />
      ) : (
        <SectionList
          sections={sections}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          keyExtractor={(item) => String(item[0].id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                paddingTop: 20,
                paddingBottom: 8,
                paddingHorizontal: 4,
              }}
            >
              <T variant="heading">{section.title}</T>
              <T variant="caption" color="muted">
                {pluralize(section.total, 'prayer')}
              </T>
            </View>
          )}
          renderItem={({ item: rows }) => (
            <Group>
              {rows.map((row, i) => {
                const known = isPrayer(row.prayer);
                return (
                  <View
                    key={row.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                      borderBottomColor: t.border,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: t.primarySoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialCommunityIcons
                        name={known ? PRAYER_ICONS[row.prayer as keyof typeof PRAYER_ICONS] : 'help-circle-outline'}
                        size={22}
                        color={t.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T variant="subheading">
                        {known ? PRAYER_LABELS[row.prayer as keyof typeof PRAYER_LABELS] : row.prayer}
                        {row.count > 1 ? ` × ${row.count}` : ''}
                      </T>
                      <T variant="caption" color="muted">
                        {new Date(row.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </T>
                    </View>
                    <IconButton
                      icon="trash-outline"
                      label={`Remove ${known ? PRAYER_LABELS[row.prayer as keyof typeof PRAYER_LABELS] : row.prayer} entry`}
                      variant="danger"
                      size={40}
                      onPress={() => confirmDelete(row)}
                    />
                  </View>
                );
              })}
            </Group>
          )}
        />
      )}
    </View>
  );
}
