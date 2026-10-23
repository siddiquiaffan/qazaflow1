import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/components/theme';
import { ToastHost } from '@/components/Toast';
import '@/services/autoBackup';
import { syncReminders } from '@/services/reminders';
import { useLedger } from '@/store';

export default function RootLayout() {
  const t = useTheme();
  const refresh = useLedger((s) => s.refresh);

  useEffect(() => {
    refresh();
    // Keep scheduled notifications in line with the saved reminders (e.g. after an update or restore).
    syncReminders().catch(() => {});
  }, [refresh]);

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
