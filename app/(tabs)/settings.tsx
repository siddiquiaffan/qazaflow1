import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';

import { NumberPrompt } from '@/components/NumberPrompt';
import { spacing, useTheme } from '@/components/theme';
import { Body, Button, Card, Field } from '@/components/ui';
import { PRAYER_LABELS, PRAYERS, type Prayer } from '@/domain/prayers';
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
import { disableReminder, enableReminder, getReminderConfig } from '@/services/notifications';
import { getBool, getNumber, setBool, SETTING_KEYS } from '@/services/settings';
import { summarizeSnapshot } from '@/services/snapshot';
import { useLedger } from '@/store';

const fmt = (ts: number) => new Date(ts).toLocaleString();

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { summary, refresh } = useLedger();

  const [editing, setEditing] = useState<Prayer | null>(null);

  const initialReminder = getReminderConfig();
  const [reminderOn, setReminderOn] = useState(initialReminder.enabled);
  const [hour, setHour] = useState(String(initialReminder.hour));
  const [minute, setMinute] = useState(String(initialReminder.minute));

  const [email, setEmail] = useState(getSignedInEmail());
  const [autoOn, setAutoOn] = useState(getBool(SETTING_KEYS.autoBackup));
  const [lastBackup, setLastBackup] = useState(getNumber(SETTING_KEYS.lastBackupAt, 0));
  const [busy, setBusy] = useState<null | 'signin' | 'backup' | 'restore'>(null);

  const run = async (kind: 'signin' | 'backup' | 'restore', fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Backup', e instanceof BackupError || e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const applyReminder = async (on: boolean, h = hour, m = minute) => {
    const hh = Math.min(23, Math.max(0, Math.floor(Number(h)) || 0));
    const mm = Math.min(59, Math.max(0, Math.floor(Number(m)) || 0));
    if (!on) {
      await disableReminder();
      setReminderOn(false);
      return;
    }
    const ok = await enableReminder(hh, mm);
    setReminderOn(ok);
    if (!ok) Alert.alert('Notifications are off', 'Allow notifications for QazaFlow in system settings to get reminders.');
  };

  const restore = () =>
    run('restore', async () => {
      const snap = await fetchRemoteSnapshot();
      if (!snap) {
        Alert.alert('No backup found', 'There is no backup in this Google account yet.');
        return;
      }
      const info = summarizeSnapshot(snap);
      const localChanged = getNumber(SETTING_KEYS.lastLocalChangeAt, 0);
      const newerLocal = localChanged > info.createdAt;
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
            onPress: () => {
              applySnapshot(snap);
              refresh();
              router.replace('/');
            },
          },
        ],
      );
    });

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} style={{ backgroundColor: t.bg }}>
      <Card style={{ gap: spacing.md }}>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Edit remaining counts</Text>
        {PRAYERS.map((p) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Body>
              {PRAYER_LABELS[p]} · {summary.remaining[p].toLocaleString()}
            </Body>
            <Button label="Edit" variant="secondary" onPress={() => setEditing(p)} />
          </View>
        ))}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Daily reminder</Text>
          <Switch value={reminderOn} onValueChange={(v) => applyReminder(v)} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Field label="Hour (0–23)" value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} />
          <Field label="Minute" value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} />
        </View>
        {reminderOn && <Button label="Update time" variant="secondary" onPress={() => applyReminder(true)} />}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Backup</Text>
        {email ? (
          <>
            <Body muted>
              {email}
              {lastBackup ? `\nLast backup: ${fmt(lastBackup)}` : '\nNo backup yet'}
            </Body>
            <Button
              label="Back up now"
              loading={busy === 'backup'}
              onPress={() =>
                run('backup', async () => {
                  setLastBackup(await backupNow());
                })
              }
            />
            <Button label="Restore from backup" variant="secondary" loading={busy === 'restore'} onPress={restore} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Body>Weekly automatic backup</Body>
              <Switch
                value={autoOn}
                onValueChange={async (v) => {
                  setAutoOn(v);
                  setBool(SETTING_KEYS.autoBackup, v);
                  await setAutoBackup(v);
                }}
              />
            </View>
            <Button
              label="Sign out"
              variant="secondary"
              onPress={async () => {
                await signOut();
                setBool(SETTING_KEYS.autoBackup, false);
                await setAutoBackup(false);
                setAutoOn(false);
                setEmail(null);
              }}
            />
          </>
        ) : (
          <>
            <Body muted>Keep your progress safe in your own Google Drive. Only this app can see the backup file.</Body>
            <Button
              label="Sign in with Google"
              loading={busy === 'signin'}
              onPress={() =>
                run('signin', async () => {
                  setEmail(await signIn());
                })
              }
            />
          </>
        )}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>Start over</Text>
        <Body muted>Removes all counts and history from this phone. Backups in Google Drive are not touched.</Body>
        <Button
          label="Reset everything"
          variant="danger"
          onPress={() =>
            Alert.alert('Reset everything?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset',
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
      </Card>

      <NumberPrompt
        visible={editing !== null}
        title={editing ? `${PRAYER_LABELS[editing]} remaining` : ''}
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
    </ScrollView>
  );
}
