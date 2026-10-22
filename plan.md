# QazaFlow — Plan

A mobile app that helps people track and complete their missed daily prayers (qaza). Users enter an approximate date range or counts of what they missed; the app tracks what remains and what has been completed.

## Goals

- Offline-first, no account needed. All data lives in a local SQLite database.
- Fast logging: one tap to record a completed prayer, easy undo.
- Safe backup and restore through the user's own Google Drive.
- Simple, calm UI; works in light and dark mode.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Expo (React Native) + TypeScript, expo-router |
| Database | expo-sqlite + Drizzle ORM, drizzle-kit migrations |
| Validation | zod (backup snapshot validation) |
| UI state | zustand |
| Reminders | expo-notifications |
| Backup | `@react-native-google-signin/google-signin` + Drive REST API (`drive.appdata` scope) |
| Tests | Jest (domain logic) |
| CI/CD | GitHub Actions + local Gradle builds (no EAS dependency) |

## Prayer model

Six obligations per day: Fajr, Zuhr, Asr, Maghrib, Isha and Witr. The UI simply lists them as prayers; no further labelling is required.

## Data model

A ledger design so the remaining count is always derived and every action can be undone.

- `prayer_debt(prayer PK, total_owed)` — initial estimate per prayer.
- `adjustments(id, prayer, delta, reason, created_at)` — later corrections to the estimate.
- `completions(id, prayer, count, completed_at, note)` — each logged completion.
- `settings(key PK, value)` — onboarding inputs, reminder time, backup metadata, device id.

`remaining(prayer) = total_owed + sum(adjustments.delta) − sum(completions.count)`, never below zero.

## Estimate calculator

Inputs (any one of):
1. Start date → today, minus optional excluded days.
2. Years + months.
3. Manual count per prayer.

Output: owed count per prayer, shown on a review screen the user can edit before saving.

## Screens

1. **Onboarding** — choose estimate method, review counts, save.
2. **Home** — total remaining, progress ring, one card per prayer with "+1" (long press for multiple), "Complete a full day", undo last.
3. **History** — grouped by day; edit or delete entries.
4. **Stats** — streak, 7/30-day pace, projected finish date.
5. **Settings** — edit counts, daily reminder, backup/restore, reset.

## Backup and restore

- Google sign-in, then upload a versioned JSON snapshot to the hidden `appDataFolder`.
- Snapshot contains schema version, device id, timestamp and all tables.
- Restore previews the snapshot (timestamp, totals), then replaces local data in a single transaction. Older schema versions are migrated on import.
- Warn if local data is newer than the backup.
- Manual "Back up now" plus optional weekly auto-backup on Wi-Fi.

## Project layout

```
app/                 expo-router screens
src/db/              Drizzle schema, client, migrations
src/domain/          prayers, estimate calculator, stats (pure, tested)
src/services/        ledger queries, backup, notifications
src/components/      shared UI
.github/workflows/   ci.yml (dev), release.yml (main)
```

## CI/CD

- **`ci.yml`** — runs on pushes and PRs to `dev`: install, typecheck, test, then builds a release APK for **arm64-v8a only** and uploads it as a workflow artifact.
- **`release.yml`** — runs on pushes to `main`: builds release APKs for multiple ABIs (arm64-v8a, armeabi-v7a, x86_64) plus a universal APK, and publishes them to a GitHub Release tagged from `package.json` version.
- Signing: if keystore secrets are present they are used; otherwise the debug keystore signs the build (fine for sideloading, not for Play Store).

## Milestones

1. Scaffold, DB, CI, core screens and Drive backup (first commit)
2. Estimate calculator + tests
3. Home, logging, undo, history
4. Stats and reminders
5. Drive backup and restore
6. Polish: icons, accessibility, empty states, store assets

## Open questions

- Add an option to exclude days (e.g. illness) with a simple date-range picker? Included as a simple "excluded days" number for now.
- Localisation (Urdu, Hindi, Arabic) after the first release.
