import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useTheme } from '@/components/theme';
import '@/services/autoBackup';
import { getBool, SETTING_KEYS } from '@/services/settings';
import { useLedger } from '@/store';

export default function RootLayout() {
  const t = useTheme();
  const router = useRouter();
  const refresh = useLedger((s) => s.refresh);

  useEffect(() => {
    refresh();
    if (!getBool(SETTING_KEYS.onboarded)) router.replace('/onboarding');
  }, [refresh, router]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
