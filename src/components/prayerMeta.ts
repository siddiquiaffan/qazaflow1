import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

import type { Prayer } from '@/domain/prayers';

export type PrayerIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const PRAYER_ICONS: Record<Prayer, PrayerIconName> = {
  fajr: 'weather-sunset-up',
  zuhr: 'white-balance-sunny',
  asr: 'weather-partly-cloudy',
  maghrib: 'weather-sunset-down',
  isha: 'weather-night',
  witr: 'star-four-points-outline',
};
