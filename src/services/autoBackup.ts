import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { backupNow, getSignedInEmail } from './drive';
import { getBool, getNumber, SETTING_KEYS } from './settings';

const TASK_NAME = 'qazaflow-auto-backup';
const WEEK_MINUTES = 7 * 24 * 60;

// Must be defined at module scope so it is registered before the app mounts.
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    if (!getBool(SETTING_KEYS.autoBackup) || !getSignedInEmail()) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    const changedAt = getNumber(SETTING_KEYS.lastLocalChangeAt, 0);
    const backedUpAt = getNumber(SETTING_KEYS.lastBackupAt, 0);
    if (changedAt > backedUpAt) await backupNow();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function setAutoBackup(enabled: boolean): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (enabled && !registered) {
    await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: WEEK_MINUTES });
  } else if (!enabled && registered) {
    await BackgroundTask.unregisterTaskAsync(TASK_NAME);
  }
}
