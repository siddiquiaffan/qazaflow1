import { NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold } from '@expo-google-fonts/noto-nastaliq-urdu';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/components/theme';
import { ToastHost } from '@/components/Toast';
import '@/services/autoBackup';
import { syncReminders } from '@/services/reminders';
import { useI18n } from '@/i18n';
import { useLedger } from '@/store';

export default function RootLayout() {
  const t = useTheme();
  const refresh = useLedger((s) => s.refresh);
  const lang = useI18n((s) => s.lang);
  // The Nastaliq font is only needed (and only loaded) for Urdu.
  const [fontsReady] = useFonts(lang === 'ur' ? { NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold } : {});

  useEffect(() => {
    refresh();
    // Keep scheduled notifications in line with the saved reminders and the current language
    // (e.g. after an update, a restore or a language change).
    syncReminders().catch(() => {});
  }, [refresh, lang]);

  if (!fontsReady) return null;

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
