#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f android/keystore.properties ]]; then
  echo "Missing android/keystore.properties (see android/keystore.properties.example)."
  exit 1
fi

npm ci
npx cap sync android

if [[ -n "${ANDROID_HOME:-}" && ! -f android/local.properties ]]; then
  echo "sdk.dir=${ANDROID_HOME}" > android/local.properties
fi

cd android
chmod +x gradlew
./gradlew bundleRelease

AAB="app/build/outputs/bundle/release/app-release.aab"
if [[ -f "$AAB" ]]; then
  echo "Release bundle: android/${AAB}"
else
  echo "Bundle not found under android/${AAB}"
  exit 1
fi