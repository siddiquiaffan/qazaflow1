import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/components/theme';
import { ToastHost } from '@/components/Toast';
import '@/services/autoBackup';
import { syncReminders } from '@/services/reminders';
import { getBool, SETTING_KEYS } from '@/services/settings';
import { useLedger } from '@/store';

export default function RootLayout() {
  const t = useTheme();
  const router = useRouter();
  const refresh = useLedger((s) => s.refresh);

  useEffect(() => {
    refresh();
    if (!getBool(SETTING_KEYS.onboarded)) router.replace('/onboarding');
    // Keep scheduled notifications in line with the saved reminders (e.g. after an update or restore).
    syncReminders().catch(() => {});
  }, [refresh, router]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack>
      <ToastHost />
    </SafeAreaProvider>
  );
}
