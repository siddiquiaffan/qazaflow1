import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getBool, getNumber, setBool, setSetting, SETTING_KEYS } from './settings';

const CHANNEL_ID = 'daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function cancelReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleReminder(hour: number, minute: number): Promise<void> {
  await cancelReminder();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'QazaFlow',
      body: 'A small step today: log a prayer you have made up.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

export function getReminderConfig() {
  return {
    enabled: getBool(SETTING_KEYS.reminderEnabled, false),
    hour: getNumber(SETTING_KEYS.reminderHour, 20),
    minute: getNumber(SETTING_KEYS.reminderMinute, 0),
  };
}

/** Enable (or retime) the reminder. Returns false if notification permission was refused. */
export async function enableReminder(hour: number, minute: number): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  setBool(SETTING_KEYS.reminderEnabled, true);
  setSetting(SETTING_KEYS.reminderHour, String(hour));
  setSetting(SETTING_KEYS.reminderMinute, String(minute));
  await scheduleReminder(hour, minute);
  return true;
}

export async function disableReminder(): Promise<void> {
  setBool(SETTING_KEYS.reminderEnabled, false);
  await cancelReminder();
}
