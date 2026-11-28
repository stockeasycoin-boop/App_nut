#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/android/plate-upload.keystore"
if [[ -f "$OUT" ]]; then
  echo "Keystore already exists: $OUT"
  echo "Delete it first if you need a new one."
  exit 1
fi
keytool -genkeypair -v -storetype PKCS12 -keystore "$OUT" -alias plate \
  -keyalg RSA -keysize 2048 -validity 10000
echo ""
echo "Created $OUT"
echo "Copy android/keystore.properties.example to android/keystore.properties and fill passwords."