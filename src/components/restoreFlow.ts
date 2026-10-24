import { Alert } from 'react-native';

import { tr } from '@/i18n';
import { applySnapshot } from '@/services/drive';
import { getNumber, SETTING_KEYS } from '@/services/settings';
import { summarizeSnapshot, type Snapshot } from '@/services/snapshot';

/**
 * Show what the backup contains and, if the person agrees, replace local data with it.
 * Shared by onboarding (new phone) and settings.
 */
export function confirmRestore(snapshot: Snapshot, onRestored: () => void): void {
  const { t, n, dateTime } = tr();
  const info = summarizeSnapshot(snapshot);
  const newerLocal = getNumber(SETTING_KEYS.lastLocalChangeAt, 0) > info.createdAt;
  const when = dateTime(new Date(info.createdAt), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  Alert.alert(
    t('restore.title'),
    `${t('restore.saved', { when })}\n${t('restore.summary', { remaining: n(info.totalRemaining), completed: n(info.totalCompleted) })}` +
      (newerLocal ? `\n\n${t('restore.newer')}` : '') +
      `\n\n${t('restore.replace')}`,
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('restore.confirm'),
        style: 'destructive',
        onPress: async () => {
          await applySnapshot(snapshot);
          onRestored();
        },
      },
    ],
  );
}
