import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { tr } from '@/i18n';

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

export async function ensurePermission(): Promise<boolean> {
  if (await hasPermission()) return true;
  // On Android 13+ the system prompt only appears once a notification channel exists.
  await ensureChannel();
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleDaily(id: number, hour: number, minute: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: `reminder-${id}`,
    content: {
      title: tr().t('notif.title'),
      body: tr().t('notif.body'),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}
