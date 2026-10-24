import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, SectionList, View } from 'react-native';

import { DateTimeSheet } from '@/components/DateTimeSheet';
import { NumberPrompt } from '@/components/NumberPrompt';

import { PRAYER_ICONS } from '@/components/prayerMeta';
import { ScreenHeader } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/components/theme';
import { Button, EmptyState, Group, IconBadge, IconButton, T } from '@/components/ui';
import { useT, type Key } from '@/i18n';
import { dateFromKey } from '@/domain/format';
import { groupEntries, withDate, withTime, type EditProblem, type HistoryItem } from '@/domain/history';
import { isPrayer, PRAYERS } from '@/domain/prayers';
import { dayKey } from '@/domain/stats';
import { deleteCompletions, listCompletions, updateCompletion } from '@/services/ledger';
import { useLedger } from '@/store';

type Row = ReturnType<typeof listCompletions>[number];

const PAGE = 300;

const EDIT_MESSAGES: Record<EditProblem | 'missing', Key> = {
  'invalid-count': 'history.err.invalidCount',
  'too-many': 'history.err.tooMany',
  future: 'history.err.future',
  missing: 'history.err.missing',
};

function EntryRow({
  leading,
  title,
  subtitle,
  deleteLabel,
  last,
  onEdit,
  onDelete,
}: {
  leading: React.ReactNode;
  title: string;
  subtitle: string;
  deleteLabel: string;
  last: boolean;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const t = useTheme();
  const { t: tx } = useT();
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
      {onEdit ? <IconButton icon="create-outline" label={tx('history.edit', { title })} size={40} onPress={onEdit} /> : null}
      <IconButton icon="trash-outline" label={deleteLabel} variant="danger" size={40} onPress={onDelete} />
    </View>
  );
}

export default function HistoryScreen() {
  const t = useTheme();
  const { t: tx, prayer: nameOf, prayers, friendlyDay, clock, date } = useT();
  const timeOf = (ts: number) => {
    const d = new Date(ts);
    return clock(d.getHours(), d.getMinutes());
  };
  const countedTitle = (prayer: string, count: number) =>
    count > 1 ? tx('entry.title', { prayer: nameOf(prayer), count }) : nameOf(prayer);
  const { version, refresh, summary } = useLedger();
  const showToast = useToast((s) => s.show);
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<{ row: Row; at: number } | null>(null);
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);

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
    Alert.alert(tx('history.removeTitle', { title }), tx('history.removeBody'), [
      { text: tx('history.keep'), style: 'cancel' },
      {
        text: tx('history.remove'),
        style: 'destructive',
        onPress: () => {
          deleteCompletions(ids);
          refresh();
          showToast(tx('history.removed'));
        },
      },
    ]);

  const saveEdit = (count: number) => {
    if (!editing) return;
    const result = updateCompletion(editing.row.id, { count, completedAt: editing.at });
    if (!result.ok) {
      Alert.alert(tx('history.couldNotSave'), tx(EDIT_MESSAGES[result.reason]));
      return;
    }
    setEditing(null);
    refresh();
    showToast(tx('history.updated'));
  };

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
          title={tx('history.fullDay', { prayers: prayers(item.total) })}
          subtitle={`${timeOf(item.completedAt)} · ${names}`}
          deleteLabel={tx('history.removeFullDay')}
          last={last}
          onDelete={() => confirmDelete(tx('history.thisFullDay'), item.rows.map((r) => r.id))}
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
        title={countedTitle(row.prayer, row.count)}
        subtitle={timeOf(row.completedAt)}
        deleteLabel={tx('history.removeEntry', { prayer: nameOf(row.prayer) })}
        last={last}
        onEdit={() => setEditing({ row, at: row.completedAt })}
        onDelete={() => confirmDelete(countedTitle(row.prayer, row.count), [row.id])}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title={tx('history.title')} subtitle={tx('history.subtitle')} />
      {sections.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title={tx('history.empty.title')}
          text={tx('history.empty.text')}
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
                {prayers(section.total)}
              </T>
            </View>
          )}
          renderItem={({ item: items }) => (
            <Group>{items.map((item, i) => renderItem(item, i === items.length - 1))}</Group>
          )}
        />
      )}

      <NumberPrompt
        visible={editing !== null}
        hidden={picking !== null}
        title={editing ? tx('history.editTitle', { prayer: nameOf(editing.row.prayer) }) : ''}
        hint={tx('history.editHint')}
        initial={editing?.row.count ?? 1}
        min={1}
        max={
          editing && isPrayer(editing.row.prayer)
            ? editing.row.count + summary.remaining[editing.row.prayer]
            : editing?.row.count
        }
        extra={
          editing ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                label={date(new Date(editing.at), { day: 'numeric', month: 'short', year: 'numeric' })}
                icon="calendar-outline"
                variant="tonal"
                size="sm"
                style={{ flex: 1 }}
                onPress={() => setPicking('date')}
              />
              <Button
                label={timeOf(editing.at)}
                icon="time-outline"
                variant="tonal"
                size="sm"
                style={{ flex: 1 }}
                onPress={() => setPicking('time')}
              />
            </View>
          ) : null
        }
        onCancel={() => setEditing(null)}
        onConfirm={saveEdit}
      />

      <DateTimeSheet
        visible={picking !== null && editing !== null}
        mode={picking ?? 'date'}
        title={picking === 'time' ? tx('history.pickTime') : tx('history.pickDate')}
        value={new Date(editing?.at ?? Date.now())}
        maximumDate={new Date()}
        onCancel={() => setPicking(null)}
        onConfirm={(d) => {
          const kind = picking;
          setEditing((e) => (e ? { ...e, at: kind === 'time' ? withTime(e.at, d) : withDate(e.at, d) } : e));
          setPicking(null);
        }}
      />
    </View>
  );
}
