import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, SectionList, View } from 'react-native';

import { PRAYER_ICONS } from '@/components/prayerMeta';
import { ScreenHeader } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/components/theme';
import { EmptyState, Group, IconBadge, IconButton, T } from '@/components/ui';
import { dateFromKey, friendlyDay, pluralize } from '@/domain/format';
import { groupEntries, type HistoryItem } from '@/domain/history';
import { isPrayer, PRAYER_LABELS, PRAYERS } from '@/domain/prayers';
import { dayKey } from '@/domain/stats';
import { deleteCompletions, listCompletions } from '@/services/ledger';
import { useLedger } from '@/store';

type Row = ReturnType<typeof listCompletions>[number];

const PAGE = 300;

const nameOf = (prayer: string) => (isPrayer(prayer) ? PRAYER_LABELS[prayer] : prayer);
const timeOf = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function EntryRow({
  leading,
  title,
  subtitle,
  deleteLabel,
  last,
  onDelete,
}: {
  leading: React.ReactNode;
  title: string;
  subtitle: string;
  deleteLabel: string;
  last: boolean;
  onDelete: () => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.border,
      }}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <T variant="subheading">{title}</T>
        <T variant="caption" color="muted" numberOfLines={2}>
          {subtitle}
        </T>
      </View>
      <IconButton icon="trash-outline" label={deleteLabel} variant="danger" size={40} onPress={onDelete} />
    </View>
  );
}

export default function HistoryScreen() {
  const t = useTheme();
  const { version, refresh } = useLedger();
  const showToast = useToast((s) => s.show);
  const [limit, setLimit] = useState(PAGE);

  const { sections, mayHaveMore } = useMemo(() => {
    const rows = listCompletions(limit);
    const byDay = new Map<string, Row[]>();
    for (const row of rows) {
      const key = dayKey(row.completedAt);
      byDay.set(key, [...(byDay.get(key) ?? []), row]);
    }
    const now = new Date();
    return {
      mayHaveMore: rows.length >= limit,
      sections: [...byDay.entries()].map(([key, dayRows]) => ({
        key,
        title: friendlyDay(dateFromKey(key), now),
        total: dayRows.reduce((s, r) => s + r.count, 0),
        data: [groupEntries(dayRows)], // one item per day so each day renders as a single grouped card
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, limit]);

  const confirmDelete = (title: string, ids: number[]) =>
    Alert.alert(`Remove ${title}?`, 'It will be added back to what remains.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          deleteCompletions(ids);
          refresh();
          showToast('Entry removed');
        },
      },
    ]);

  const renderItem = (item: HistoryItem<Row>, last: boolean) => {
    if (item.kind === 'batch') {
      const names = [...item.rows]
        .sort((a, b) => PRAYERS.indexOf(a.prayer as never) - PRAYERS.indexOf(b.prayer as never))
        .map((r) => nameOf(r.prayer))
        .join(', ');
      return (
        <EntryRow
          key={item.rows[0].id}
          leading={<IconBadge name="checkmark-done" size={40} />}
          title={`Full day · ${pluralize(item.total, 'prayer')}`}
          subtitle={`${timeOf(item.completedAt)} · ${names}`}
          deleteLabel="Remove full day entry"
          last={last}
          onDelete={() => confirmDelete('this full day', item.rows.map((r) => r.id))}
        />
      );
    }
    const { row } = item;
    const known = isPrayer(row.prayer);
    return (
      <EntryRow
        key={row.id}
        leading={
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
        }
        title={`${nameOf(row.prayer)}${row.count > 1 ? ` × ${row.count}` : ''}`}
        subtitle={timeOf(row.completedAt)}
        deleteLabel={`Remove ${nameOf(row.prayer)} entry`}
        last={last}
        onDelete={() => confirmDelete(`${nameOf(row.prayer)}${row.count > 1 ? ` × ${row.count}` : ''}`, [row.id])}
      />
    );
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
          keyExtractor={(items) => String(items[0].kind === 'batch' ? items[0].rows[0].id : items[0].row.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (mayHaveMore) setLimit((l) => l + PAGE);
          }}
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
          renderItem={({ item: items }) => (
            <Group>{items.map((item, i) => renderItem(item, i === items.length - 1))}</Group>
          )}
        />
      )}
    </View>
  );
}
