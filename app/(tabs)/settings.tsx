import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, Share, View } from 'react-native';

import { DateTimeSheet } from '@/components/DateTimeSheet';
import { chooseLanguage, LanguageSheet } from '@/components/LanguageSheet';
import { NumberPrompt } from '@/components/NumberPrompt';
import { confirmRestore } from '@/components/restoreFlow';
import { PRAYER_ICONS } from '@/components/prayerMeta';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/components/theme';
import { Button, Card, Group, IconBadge, IconButton, ListRow, SectionLabel, Switch, T } from '@/components/ui';
import { completionsToCsv } from '@/domain/export';
import { clampGoal } from '@/domain/goal';
import { PRAYERS, type Prayer } from '@/domain/prayers';
import { dateToTime, timeToDate } from '@/domain/reminders';
import { setAutoBackup } from '@/services/autoBackup';
import {
  BackupError,
  backupNow,
  fetchRemoteSnapshot,
  getSignedInEmail,
  signIn,
  signOut,
} from '@/services/drive';
import { listAllCompletions, resetAll, setOwedTo } from '@/services/ledger';
import { ensurePermission } from '@/services/notifications';
import {
  addReminder,
  deleteReminder,
  listReminders,
  setReminderEnabled,
  syncReminders,
  updateReminderTime,
  type Reminder,
} from '@/services/reminders';
import { getBool, getDailyGoal, getNumber, setBool, setDailyGoal, SETTING_KEYS } from '@/services/settings';
import { NATIVE_NAMES, useI18n, useT, type Pref } from '@/i18n';
import { useLedger } from '@/store';

type PickerTarget = { kind: 'add' } | { kind: 'edit'; reminder: Reminder };

export default function SettingsScreen() {
  const t = useTheme();
  const { t: tx, clock, dateTime, lang } = useT();
  const appName = tx('app.name');
  const pref = useI18n((s) => s.pref);
  const [pickingLanguage, setPickingLanguage] = useState(false);
  const fmt = (ts: number) => dateTime(new Date(ts), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const timeText = (hour: number, minute: number) => clock(hour, minute);
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { summary, refresh } = useLedger();

  const [editing, setEditing] = useState<Prayer | null>(null);
  const [goal, setGoal] = useState(getDailyGoal);
  const [editingGoal, setEditingGoal] = useState(false);

  const [reminders, setReminders] = useState<Reminder[]>(listReminders);
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  const [email, setEmail] = useState(getSignedInEmail);
  const [autoOn, setAutoOn] = useState(() => getBool(SETTING_KEYS.autoBackup));
  const [lastBackup, setLastBackup] = useState(() => getNumber(SETTING_KEYS.lastBackupAt, 0));
  const [busy, setBusy] = useState<null | 'signin' | 'backup' | 'restore'>(null);

  /* ───────── Reminders ───────── */

  const reloadAndSync = async () => {
    setReminders(listReminders());
    try {
      const ok = await syncReminders();
      if (!ok) {
        Alert.alert(tx('reminders.notifOffTitle'), tx('reminders.notifOffText', { app: appName }));
      }
    } catch {
      Alert.alert(tx('reminders.alertTitle'), tx('reminders.scheduleError'));
    }
  };

  const onTimePicked = async (d: Date) => {
    const target = picker;
    setPicker(null);
    if (!target) return;
    const { hour, minute } = dateToTime(d);
    if (target.kind === 'add') await ensurePermission();
    const result =
      target.kind === 'add' ? addReminder(hour, minute) : updateReminderTime(target.reminder.id, hour, minute);
    if (!result.ok) {
      Alert.alert(tx('reminders.dupTitle'), tx('reminders.dupText', { time: timeText(hour, minute) }));
      return;
    }
    await reloadAndSync();
  };

  const toggleReminder = async (r: Reminder, on: boolean) => {
    setReminderEnabled(r.id, on);
    if (on) await ensurePermission();
    await reloadAndSync();
  };

  const removeReminder = async (r: Reminder) => {
    deleteReminder(r.id);
    await reloadAndSync();
    showToast(tx('reminders.removed', { time: timeText(r.hour, r.minute) }), {
      label: tx('common.undo'),
      onPress: () => {
        addReminder(r.hour, r.minute);
        reloadAndSync();
      },
    });
  };

  /* ───────── Language ───────── */

  const pickLanguage = (next: Pref) => {
    setPickingLanguage(false);
    chooseLanguage(next);
  };

  /* ───────── Backup ───────── */

  const run = async (kind: 'signin' | 'backup' | 'restore', fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      Alert.alert(tx('backup.alertTitle'), e instanceof Error ? e.message : tx('common.somethingWrong'));
    } finally {
      setBusy(null);
    }
  };

  const restore = () =>
    run('restore', async () => {
      const snap = await fetchRemoteSnapshot();
      if (!snap) {
        Alert.alert(tx('backup.noneTitle'), tx('backup.noneText'));
        return;
      }
      confirmRestore(snap, () => {
        refresh();
        setReminders(listReminders());
        router.replace('/');
        showToast(tx('backup.restored'));
      });
    });

  /** Share the whole history as CSV text (opens the system share sheet). */
  const exportCsv = async () => {
    const rows = listAllCompletions();
    if (rows.length === 0) {
      Alert.alert(tx('data.exportEmptyTitle'), tx('data.exportEmptyText'));
      return;
    }
    try {
      await Share.share({ title: tx('data.exportShareTitle', { app: appName }), message: completionsToCsv(rows) });
    } catch {
      Alert.alert(tx('data.export'), tx('data.exportError'));
    }
  };

  const version = Constants.expoConfig?.version ?? '';

  return (
    <Screen title={tx('settings.title')} subtitle={tx('settings.subtitle')}>
      {/* Reminders */}
      <SectionLabel>{tx('settings.reminders')}</SectionLabel>
      <Group>
        <ListRow
          icon="notifications-outline"
          title={tx('reminders.title')}
          subtitle={
            reminders.length === 0
              ? tx('reminders.none')
              : reminders.some((r) => r.enabled)
                ? tx('count.reminders', { count: reminders.filter((r) => r.enabled).length })
                : tx('reminders.allOff')
          }
          last={reminders.length === 0}
        />
        {reminders.map((r) => (
          <View
            key={r.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderTopColor: t.border,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx('reminders.change', { time: timeText(r.hour, r.minute) })}
              onPress={() => setPicker({ kind: 'edit', reminder: r })}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}
            >
              <Ionicons name="alarm-outline" size={26} color={r.enabled ? t.primary : t.muted} />
              <View>
                <T variant="heading" style={{ fontSize: 24, color: r.enabled ? t.text : t.muted }}>
                  {timeText(r.hour, r.minute)}
                </T>
                <T variant="caption" color="muted">
                  {tx('reminders.everyDay')}
                </T>
              </View>
            </Pressable>
            <Switch
              value={r.enabled}
              label={tx('reminders.switch', { time: timeText(r.hour, r.minute) })}
              onValueChange={(v) => toggleReminder(r, v)}
            />
            <IconButton
              icon="trash-outline"
              label={tx('reminders.delete', { time: timeText(r.hour, r.minute) })}
              variant="danger"
              size={40}
              onPress={() => removeReminder(r)}
            />
          </View>
        ))}
        <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: t.border }}>
          <Button label={tx('reminders.add')} icon="add" variant="tonal" onPress={() => setPicker({ kind: 'add' })} />
        </View>
        <ListRow
          icon="help-circle-outline"
          title={tx('reminders.helpTitle')}
          subtitle={tx('reminders.helpText', { app: appName })}
          onPress={() => Linking.openSettings()}
          last
        />
      </Group>

      {/* Goal */}
      <SectionLabel>{tx('settings.dailyGoal')}</SectionLabel>
      <Group>
        <ListRow
          icon="flag-outline"
          title={tx('goal.title')}
          subtitle={goal > 0 ? tx('goal.on', { count: goal }) : tx('goal.off')}
          onPress={() => setEditingGoal(true)}
          last
        />
      </Group>

      {/* Language */}
      <SectionLabel>{tx('settings.language')}</SectionLabel>
      <Group>
        <ListRow
          icon="language-outline"
          title={tx('settings.language')}
          subtitle={pref === 'system' ? `${tx('lang.system')} · ${NATIVE_NAMES[lang]}` : NATIVE_NAMES[pref]}
          onPress={() => setPickingLanguage(true)}
          last
        />
      </Group>

      {/* Counts */}
      <SectionLabel>{tx('settings.adjust')}</SectionLabel>
      <Group>
        {PRAYERS.map((p, i) => (
          <ListRow
            key={p}
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
                <MaterialCommunityIcons name={PRAYER_ICONS[p]} size={22} color={t.primary} />
              </View>
            }
            title={tx(`prayer.${p}` as const)}
            subtitle={tx('counts.remaining', { count: summary.remaining[p] })}
            onPress={() => setEditing(p)}
            last={i === PRAYERS.length - 1}
          />
        ))}
      </Group>

      {/* Backup */}
      <SectionLabel>{tx('settings.backup')}</SectionLabel>
      {email ? (
        <Group>
          <ListRow
            icon="person-circle-outline"
            title={email}
            subtitle={lastBackup ? tx('backup.lastBackup', { when: fmt(lastBackup) }) : tx('backup.none')}
          />
          <ListRow
            icon="cloud-upload-outline"
            title={busy === 'backup' ? tx('backup.backingUp') : tx('backup.now')}
            subtitle={tx('backup.nowSub')}
            onPress={() =>
              run('backup', async () => {
                setLastBackup(await backupNow());
                showToast(tx('backup.saved'));
              })
            }
          />
          <ListRow
            icon="cloud-download-outline"
            title={busy === 'restore' ? tx('backup.checking') : tx('backup.restore')}
            subtitle={tx('backup.restoreSub')}
            onPress={restore}
          />
          <ListRow
            icon="sync-outline"
            title={tx('backup.weekly')}
            subtitle={tx('backup.weeklySub')}
            right={
              <Switch
                label={tx('backup.weekly')}
                value={autoOn}
                onValueChange={async (v) => {
                  setAutoOn(v);
                  setBool(SETTING_KEYS.autoBackup, v);
                  await setAutoBackup(v);
                }}
              />
            }
          />
          <ListRow
            icon="log-out-outline"
            title={tx('backup.signOut')}
            last
            onPress={async () => {
              await signOut();
              setBool(SETTING_KEYS.autoBackup, false);
              await setAutoBackup(false);
              setAutoOn(false);
              setEmail(null);
            }}
          />
        </Group>
      ) : (
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <IconBadge name="cloud-outline" size={48} />
            <T color="muted" style={{ flex: 1 }}>
              {tx('backup.intro')}
            </T>
          </View>
          <Button
            label={tx('backup.signIn')}
            icon="logo-google"
            loading={busy === 'signin'}
            onPress={() =>
              run('signin', async () => {
                setEmail(await signIn());
              })
            }
          />
        </Card>
      )}

      {/* Data */}
      <SectionLabel>{tx('settings.data')}</SectionLabel>
      <Group>
        <ListRow
          icon="download-outline"
          title={tx('data.export')}
          subtitle={tx('data.exportSub')}
          onPress={exportCsv}
        />
        <ListRow
          icon="refresh-outline"
          title={tx('data.reset')}
          subtitle={tx('data.resetSub')}
          danger
          last
          onPress={() =>
            Alert.alert(`${tx('data.reset')}?`, tx('data.resetBody'), [
              { text: tx('common.cancel'), style: 'cancel' },
              {
                text: tx('data.resetConfirm'),
                style: 'destructive',
                onPress: () => {
                  resetAll();
                  refresh();
                  router.replace('/onboarding');
                },
              },
            ])
          }
        />
      </Group>

      <T variant="caption" color="muted" style={{ textAlign: 'center', marginTop: 8 }}>
        {appName} {version}
      </T>

      <NumberPrompt
        visible={editing !== null}
        title={editing ? tx('counts.dialog', { prayer: tx(`prayer.${editing}` as const) }) : ''}
        hint={tx('counts.hint')}
        initial={editing ? summary.remaining[editing] : 0}
        onCancel={() => setEditing(null)}
        onConfirm={(n) => {
          if (editing) {
            setOwedTo(editing, n);
            refresh();
          }
          setEditing(null);
        }}
      />

      <NumberPrompt
        visible={editingGoal}
        title={tx('settings.dailyGoal')}
        hint={tx('goal.hint')}
        initial={goal}
        max={100}
        onCancel={() => setEditingGoal(false)}
        onConfirm={(n) => {
          const next = clampGoal(n);
          setDailyGoal(next);
          setGoal(next);
          refresh();
          setEditingGoal(false);
          showToast(next > 0 ? tx('goal.set', { count: next }) : tx('goal.turnedOff'));
        }}
      />

      <LanguageSheet visible={pickingLanguage} onClose={() => setPickingLanguage(false)} onPick={pickLanguage} />

      <DateTimeSheet
        visible={picker !== null}
        mode="time"
        title={picker?.kind === 'edit' ? tx('reminders.changeTitle') : tx('reminders.newTitle')}
        value={picker?.kind === 'edit' ? timeToDate(picker.reminder.hour, picker.reminder.minute) : timeToDate(20, 0)}
        onCancel={() => setPicker(null)}
        onConfirm={onTimePicked}
      />
    </Screen>
  );
}
