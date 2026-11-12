import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { tr, type Key } from '@/i18n';

export const REMINDER_CHANNEL_ID = 'daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: tr().t('notif.channel'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Android 12+ delivers alarms late (batched, often by many minutes) unless the person allows
 * "Alarms & reminders" for the app. Open that settings screen once if it is not allowed yet.
 */
export async function ensureExactAlarms(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if ((await Notifications.getExactAlarmPermissionsAsync()).granted) return;
    await Notifications.requestExactAlarmPermissionsAsync();
  } catch {
    // Older Android versions have nothing to ask; reminders still work.
  }
}

export async function ensurePermission(): Promise<boolean> {
  let granted = await hasPermission();
  if (!granted) {
    // On Android 13+ the system prompt only appears once a notification channel exists.
    await ensureChannel();
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (granted) await ensureExactAlarms();
  return granted;
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Schedule one notification at `at`, with the encouragement message numbered `message` (0-based). */
export async function scheduleNudge(identifier: string, at: Date, message: number): Promise<void> {
  const { t } = tr();
  const n = message + 1;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: t(`notif.${n}.title` as Key),
      body: t(`notif.${n}.body` as Key),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: REMINDER_CHANNEL_ID,
      // Delivered at the exact minute even when the phone is idle or battery-saving.
      delivery: 'alarmClock',
    },
  });
}
