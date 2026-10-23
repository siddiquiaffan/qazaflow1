import * as Haptics from 'expo-haptics';

/** Light tap feedback. Never throws; haptics are a nicety, not a requirement. */
export function tap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function success(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
