import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { DateTimeSheet } from '@/components/DateTimeSheet';
import { NumberPrompt } from '@/components/NumberPrompt';
import { PRAYER_ICONS } from '@/components/prayerMeta';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { useTheme } from '@/components/theme';
import { Button, Card, Group, IconBadge, IconButton, ListRow, SectionLabel, Switch, T } from '@/components/ui';
import { PRAYER_LABELS, PRAYERS, type Prayer } from '@/domain/prayers';
import { dateToTime, formatTime, summarizeReminders, timeToDate } from '@/domain/reminders';
import { setAutoBackup } from '@/services/autoBackup';
import {
  applySnapshot,
  BackupError,
  backupNow,
  fetchRemoteSnapshot,
  getSignedInEmail,
  signIn,
  signOut,
} from '@/services/drive';
import { resetAll, setOwedTo } from '@/services/ledger';
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
import { getBool, getNumber, setBool, SETTING_KEYS } from '@/services/settings';
import { summarizeSnapshot } from '@/services/snapshot';
import { useLedger } from '@/store';

type PickerTarget = { kind: 'add' } | { kind: 'edit'; reminder: Reminder };

const fmt = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { summary, refresh } = useLedger();

  const [editing, setEditing] = useState<Prayer | null>(null);

  const [reminders, setReminders] = useState<Reminder[]>(listReminders());
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  const [email, setEmail] = useState(getSignedInEmail());
  const [autoOn, setAutoOn] = useState(getBool(SETTING_KEYS.autoBackup));
  const [lastBackup, setLastBackup] = useState(getNumber(SETTING_KEYS.lastBackupAt, 0));
  const [busy, setBusy] = useState<null | 'signin' | 'backup' | 'restore'>(null);

  /* ───────── Reminders ───────── */

  const reloadAndSync = async () => {
    setReminders(listReminders());
    try {
      const ok = await syncReminders();
      if (!ok) {
        Alert.alert(
          'Notifications are off',
          'Allow notifications for QazaFlow in your phone settings so reminders can reach you.',
        );
      }
    } catch {
      Alert.alert('Reminders', 'Could not schedule the reminder. Please try again.');
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
      Alert.alert('Already set', `You already have a reminder at ${formatTime(hour, minute)}.`);
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
    showToast(`Reminder at ${formatTime(r.hour, r.minute)} removed`, {
      label: 'Undo',
      onPress: () => {
        addReminder(r.hour, r.minute);
        reloadAndSync();
      },
    });
  };

  /* ───────── Backup ───────── */

  const run = async (kind: 'signin' | 'backup' | 'restore', fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Backup', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const restore = () =>
    run('restore', async () => {
      const snap = await fetchRemoteSnapshot();
      if (!snap) {
        Alert.alert('No backup found', 'There is no backup in this Google account yet.');
        return;
      }
      const info = summarizeSnapshot(snap);
      const newerLocal = getNumber(SETTING_KEYS.lastLocalChangeAt, 0) > info.createdAt;
      Alert.alert(
        'Restore this backup?',
        `Saved ${fmt(info.createdAt)}\n${info.totalRemaining.toLocaleString()} remaining · ${info.totalCompleted.toLocaleString()} completed` +
          (newerLocal ? '\n\nThis phone has newer changes that will be replaced.' : '') +
          '\n\nYour current data on this phone will be replaced.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              await applySnapshot(snap);
              refresh();
              setReminders(listReminders());
              router.replace('/');
              showToast('Backup restored');
            },
          },
        ],
      );
    });

  const version = Constants.expoConfig?.version ?? '';

  return (
    <Screen title="Settings" subtitle="Reminders, counts and backup">
      {/* Reminders */}
      <SectionLabel>Reminders</SectionLabel>
      <Group>
        <ListRow
          icon="notifications-outline"
          title="Daily reminders"
          subtitle={summarizeReminders(reminders)}
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
              accessibilityLabel={`Change reminder time, currently ${formatTime(r.hour, r.minute)}`}
              onPress={() => setPicker({ kind: 'edit', reminder: r })}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}
            >
              <Ionicons name="alarm-outline" size={26} color={r.enabled ? t.primary : t.muted} />
              <View>
                <T variant="heading" style={{ fontSize: 24, color: r.enabled ? t.text : t.muted }}>
                  {formatTime(r.hour, r.minute)}
                </T>
                <T variant="caption" color="muted">
                  Every day · tap to change
                </T>
              </View>
            </Pressable>
            <Switch
              value={r.enabled}
              label={`Reminder at ${formatTime(r.hour, r.minute)}`}
              onValueChange={(v) => toggleReminder(r, v)}
            />
            <IconButton
              icon="trash-outline"
              label={`Delete reminder at ${formatTime(r.hour, r.minute)}`}
              variant="danger"
              size={40}
              onPress={() => removeReminder(r)}
            />
          </View>
        ))}
        <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: t.border }}>
          <Button label="Add a reminder" icon="add" variant="tonal" onPress={() => setPicker({ kind: 'add' })} />
        </View>
      </Group>

      {/* Counts */}
      <SectionLabel>Adjust counts</SectionLabel>
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
            title={PRAYER_LABELS[p]}
            subtitle={`${summary.remaining[p].toLocaleString()} remaining`}
            onPress={() => setEditing(p)}
            last={i === PRAYERS.length - 1}
          />
        ))}
      </Group>

      {/* Backup */}
      <SectionLabel>Backup</SectionLabel>
      {email ? (
        <Group>
          <ListRow
            icon="person-circle-outline"
            title={email}
            subtitle={lastBackup ? `Last backup ${fmt(lastBackup)}` : 'No backup yet'}
          />
          <ListRow
            icon="cloud-upload-outline"
            title={busy === 'backup' ? 'Backing up…' : 'Back up now'}
            subtitle="Save your progress to Google Drive"
            onPress={() =>
              run('backup', async () => {
                setLastBackup(await backupNow());
                showToast('Backup saved to Google Drive');
              })
            }
          />
          <ListRow
            icon="cloud-download-outline"
            title={busy === 'restore' ? 'Checking…' : 'Restore from backup'}
            subtitle="Replace this phone's data with your last backup"
            onPress={restore}
          />
          <ListRow
            icon="sync-outline"
            title="Weekly automatic backup"
            subtitle="Runs in the background when something changed"
            right={
              <Switch
                label="Weekly automatic backup"
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
            title="Sign out"
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
              Keep your progress safe in your own Google Drive. Only this app can see the backup file.
            </T>
          </View>
          <Button
            label="Sign in with Google"
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
      <SectionLabel>Data</SectionLabel>
      <Group>
        <ListRow
          icon="refresh-outline"
          title="Start over"
          subtitle="Removes all counts and history from this phone"
          danger
          last
          onPress={() =>
            Alert.alert('Start over?', 'All counts and history on this phone will be removed. Google Drive backups are not touched.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove everything',
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
        QazaFlow {version}
      </T>

      <NumberPrompt
        visible={editing !== null}
        title={editing ? `${PRAYER_LABELS[editing]} remaining` : ''}
        hint="Set how many are still left to make up."
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

      <DateTimeSheet
        visible={picker !== null}
        mode="time"
        title={picker?.kind === 'edit' ? 'Change reminder time' : 'New reminder'}
        value={picker?.kind === 'edit' ? timeToDate(picker.reminder.hour, picker.reminder.minute) : timeToDate(20, 0)}
        onCancel={() => setPicker(null)}
        onConfirm={onTimePicked}
      />
    </Screen>
  );
}
