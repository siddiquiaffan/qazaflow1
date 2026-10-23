import { Alert } from 'react-native';

import { applySnapshot } from '@/services/drive';
import { getNumber, SETTING_KEYS } from '@/services/settings';
import { summarizeSnapshot, type Snapshot } from '@/services/snapshot';

const fmt = (ts: number) =>
  new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Show what the backup contains and, if the person agrees, replace local data with it.
 * Shared by onboarding (new phone) and settings.
 */
export function confirmRestore(snapshot: Snapshot, onRestored: () => void): void {
  const info = summarizeSnapshot(snapshot);
  const newerLocal = getNumber(SETTING_KEYS.lastLocalChangeAt, 0) > info.createdAt;
  Alert.alert(
    'Restore this backup?',
    `Saved ${fmt(info.createdAt)}\n${info.totalRemaining.toLocaleString()} remaining · ${info.totalCompleted.toLocaleString()} completed` +
      (newerLocal ? '\n\nThis phone has newer changes that will be replaced.' : '') +
      '\n\nYour current data on this phone will be replaced.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: async () => {
          await applySnapshot(snapshot);
          onRestored();
        },
      },
    ],
  );
}
