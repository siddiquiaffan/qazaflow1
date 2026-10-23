import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

import { syncReminders } from './reminders';
import { createSnapshot, parseSnapshot, restoreSnapshot, type Snapshot } from './snapshot';
import { deleteSetting, getSetting, setSetting, SETTING_KEYS } from './settings';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_NAME = 'qazaflow-backup.json';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

let configured = false;

function configure() {
  if (configured) return;
  GoogleSignin.configure({
    // Web client ID from Google Cloud Console (OAuth client of type "Web application").
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: [DRIVE_SCOPE],
    offlineAccess: false,
  });
  configured = true;
}

export class BackupError extends Error {}

export interface RemoteBackupInfo {
  fileId: string;
  modifiedTime: number;
}

export function getSignedInEmail(): string | null {
  return getSetting(SETTING_KEYS.lastBackupEmail);
}

export async function signIn(): Promise<string> {
  configure();
  try {
    await GoogleSignin.hasPlayServices();
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') throw new BackupError('Sign-in was cancelled.');
    const email = res.data.user.email;
    setSetting(SETTING_KEYS.lastBackupEmail, email);
    return email;
  } catch (e) {
    if (e instanceof BackupError) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new BackupError('Sign-in was cancelled.');
    }
    throw new BackupError('Could not sign in with Google.');
  }
}

export async function signOut(): Promise<void> {
  configure();
  try {
    await GoogleSignin.signOut();
  } finally {
    deleteSetting(SETTING_KEYS.lastBackupEmail);
  }
}

async function accessToken(): Promise<string> {
  configure();
  try {
    await GoogleSignin.signInSilently();
    const { accessToken: token } = await GoogleSignin.getTokens();
    return token;
  } catch {
    throw new BackupError('Please sign in with Google again.');
  }
}

async function driveFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  if (res.status === 401 || res.status === 403) {
    throw new BackupError('Google Drive access was denied. Please sign in again.');
  }
  if (!res.ok) throw new BackupError(`Google Drive error (${res.status}).`);
  return res;
}

async function findBackup(token: string): Promise<RemoteBackupInfo | null> {
  const q = encodeURIComponent(`name = '${BACKUP_NAME}' and trashed = false`);
  const url = `${API}/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`;
  const res = await driveFetch(token, url);
  const json = (await res.json()) as { files?: { id: string; modifiedTime: string }[] };
  const file = json.files?.[0];
  return file ? { fileId: file.id, modifiedTime: Date.parse(file.modifiedTime) } : null;
}

export async function getRemoteBackupInfo(): Promise<RemoteBackupInfo | null> {
  return findBackup(await accessToken());
}

/** Upload a fresh snapshot, replacing the existing backup file if there is one. */
export async function backupNow(): Promise<number> {
  const token = await accessToken();
  const snapshot = createSnapshot();
  const body = JSON.stringify(snapshot);
  const existing = await findBackup(token);

  if (existing) {
    await driveFetch(token, `${UPLOAD}/files/${existing.fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } else {
    const boundary = `qazaflow${Date.now()}`;
    const metadata = JSON.stringify({ name: BACKUP_NAME, parents: ['appDataFolder'], mimeType: 'application/json' });
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    await driveFetch(token, `${UPLOAD}/files?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    });
  }
  setSetting(SETTING_KEYS.lastBackupAt, String(snapshot.createdAt));
  return snapshot.createdAt;
}

/** Download and validate the remote backup without applying it. */
export async function fetchRemoteSnapshot(): Promise<Snapshot | null> {
  const token = await accessToken();
  const info = await findBackup(token);
  if (!info) return null;
  const res = await driveFetch(token, `${API}/files/${info.fileId}?alt=media`);
  return parseSnapshot(await res.text());
}

/** Replace local data with the snapshot and re-schedule its reminders. */
export async function applySnapshot(snapshot: Snapshot): Promise<void> {
  restoreSnapshot(snapshot);
  try {
    await syncReminders();
  } catch {
    // Reminders are re-synced on next launch; a failure here must not undo the restore.
  }
}
