#!/usr/bin/env bash
# Usage: scripts/sign-apk.sh <input.apk> <output.apk>
#
# If ANDROID_KEYSTORE_BASE64 is set, zipaligns and re-signs the APK with that keystore.
# Otherwise the APK is copied unchanged (Gradle already signed it with the debug key,
# which is fine for sideloading but not for the Play Store).
#
# Optional env: ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
set -euo pipefail

in="$1"
out="$2"
mkdir -p "$(dirname "$out")"

if [ -z "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  echo "No release keystore configured; keeping the debug-signed APK."
  cp "$in" "$out"
  exit 0
fi

sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
build_tools="$(ls -1 "$sdk/build-tools" | sort -V | tail -n 1)"
bt="$sdk/build-tools/$build_tools"

ks="$(mktemp)"
trap 'rm -f "$ks"' EXIT
echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$ks"

aligned="$(mktemp -u).apk"
"$bt/zipalign" -f -p 4 "$in" "$aligned"
"$bt/apksigner" sign \
  --ks "$ks" \
  --ks-pass "pass:${ANDROID_KEYSTORE_PASSWORD:?ANDROID_KEYSTORE_PASSWORD is required}" \
  --ks-key-alias "${ANDROID_KEY_ALIAS:?ANDROID_KEY_ALIAS is required}" \
  --key-pass "pass:${ANDROID_KEY_PASSWORD:-$ANDROID_KEYSTORE_PASSWORD}" \
  --out "$out" \
  "$aligned"
"$bt/apksigner" verify "$out"
rm -f "$aligned"
