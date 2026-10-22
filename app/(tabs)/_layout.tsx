import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useTheme } from '@/components/theme';

function Glyph({ char, color }: { char: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{char}</Text>;
}

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTitleStyle: { color: t.text },
        headerShadowVisible: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Glyph char="◉" color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Glyph char="☰" color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Progress', tabBarIcon: ({ color }) => <Glyph char="▲" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Glyph char="⚙" color={color} /> }} />
    </Tabs>
  );
}
