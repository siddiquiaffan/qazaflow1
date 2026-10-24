# QazaFlow

Track and complete your missed prayers. Offline-first, with multiple daily reminders and optional backup to your own Google Drive.

See [plan.md](plan.md) for the full plan.

## Develop

```sh
npm install
npm run typecheck
npm test
npx expo run:android     # needs the Android SDK; Google sign-in does not work in Expo Go
```

## Google Drive backup setup

1. In Google Cloud Console, enable the **Google Drive API**.
2. Configure the OAuth consent screen and add the scope `https://www.googleapis.com/auth/drive.appdata`.
3. Create two OAuth clients:
   - **Web application** — its client ID is `GOOGLE_WEB_CLIENT_ID`.
   - **Android** — package name `com.siddiquiaffan.qazaflow` plus the SHA-1 of the key that signs your APK.
4. Locally, put the web client ID in `.env.local` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...`.
5. In GitHub, add a repository **variable** `GOOGLE_WEB_CLIENT_ID` with the same value.

Backups are stored as a single JSON file in the hidden app data folder of the user's Drive.

## CI and releases

| Workflow | Trigger | Result |
| --- | --- | --- |
| `ci.yml` | push / PR to `dev` | typecheck, tests, **arm64-v8a** release APK as a build artifact |
| `release.yml` | push to `main` | APKs for arm64-v8a, armeabi-v7a, x86_64 and a universal build, published to a GitHub Release tagged `v<package.json version>` |

Bump `version` in `package.json` (and `app.json`) before merging to `main` to get a new release tag.

### Signing

Without secrets, APKs are signed with the debug key (fine for sideloading). To sign with your own key add these repository secrets:

- `ANDROID_KEYSTORE_BASE64` — `base64 -w0 release.keystore`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD` (optional; defaults to the keystore password)

## Languages

English, Hindi, Urdu and Arabic. Strings are in `src/i18n/catalogs/`; add a key to `en.ts` first and the other catalogs (and tests) will tell you what is missing. Regenerate the translator review sheet with `node --experimental-strip-types scripts/export-translations.mts`.
