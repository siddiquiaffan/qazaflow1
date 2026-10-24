import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/components/theme';
import { URDU_FONT, useT, type Key } from '@/i18n';
import { getBool, SETTING_KEYS } from '@/services/settings';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: Key; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'tab.today', icon: 'home-outline', iconActive: 'home' },
  { name: 'history', title: 'tab.history', icon: 'time-outline', iconActive: 'time' },
  { name: 'stats', title: 'tab.progress', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { name: 'settings', title: 'tab.settings', icon: 'settings-outline', iconActive: 'settings' },
];

export default function TabsLayout() {
  const t = useTheme();
  const { t: tx, lang } = useT();
  // Decided before the first frame so new users never see an empty Today screen.
  if (!getBool(SETTING_KEYS.onboarded)) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle:
          lang === 'ur' ? { fontSize: 12, fontFamily: URDU_FONT.bold, lineHeight: 26 } : { fontSize: 12, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tx(tab.title),
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size} color={color as string} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
