# Publish Plate on Google Play

Plate ships as a **Capacitor** Android app (WebView + `www/`). All data stays on-device, like **solo-leveling-fitness** — Groq keys are user-supplied in Settings.

## One-time: Google Play Console

1. Create a [Google Play Console](https://play.google.com/console) developer account (one-time fee).
2. Create an app → **Plate** → default language English.
3. Complete **Store listing**: short description, screenshots, feature graphic, privacy policy URL.
4. **Privacy policy**: state that nutrition logs and API keys are stored only on the device and sent to `api.groq.com` when the user analyzes food or meal suggestions.

## Signing key (keep backups)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore plate-upload.keystore -alias plate -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/gradle.properties` (do **not** commit real passwords):

```properties
PLATE_RELEASE_STORE_FILE=../plate-upload.keystore
PLATE_RELEASE_STORE_PASSWORD=***
PLATE_RELEASE_KEY_ALIAS=plate
PLATE_RELEASE_KEY_PASSWORD=***
```

After `npx cap add android`, wire signing in `android/app/build.gradle` `signingConfigs { release { ... } }` and set `buildTypes.release.signingConfig signingConfigs.release`.

## Build a release bundle (AAB)

From the repo root on a machine with **JDK 17** and **Android SDK**:

```bash
npm install
npx cap add android   # first time only
npx cap sync android
cd android
./gradlew bundleRelease
```

Upload `android/app/build/outputs/bundle/release/app-release.aab` in Play Console → **Production** or **Internal testing**.

## CI (GitHub Actions)

- **Debug APK**: `.github/workflows/build-apk.yml` (existing).
- **Release AAB**: run **Build Play Store AAB** (`.github/workflows/build-play-aab.yml`) manually, download the `plate-release-aab` artifact, upload to Play Console.

## Versioning

Before each release, bump in `android/app/build.gradle`:

- `versionCode` — integer, must increase every upload
- `versionName` — user-visible string (match `package.json` if you like)

## Play compliance checklist

| Item | Notes |
| --- | --- |
| Target API | Use compile/target SDK 35 (workflow uses `setup-android`) |
| Data safety | Declare on-device storage; optional network to Groq if user adds key |
| Permissions | Default Capacitor app needs few; camera only if you add a Camera plugin for photos (file picker works without extra permission on many devices) |
| Content rating | Complete questionnaire (health/nutrition app) |

## Difference from solo-leveling-fitness (Expo)

| | Plate (this repo) | solo-leveling-fitness |
| --- | --- | --- |
| UI | Plate editorial design | Solo Leveling dark theme |
| Stack | Capacitor + static HTML | Expo Router + React Native |
| Play build | Gradle `bundleRelease` or GitHub Actions | EAS `eas build --platform android --profile production` |
| Backend | `www/lib/plate-backend.js` + localStorage | Zustand + AsyncStorage |

You can keep using EAS for the fitness app on `D:\Trial\...` and this repo for the Play-ready **Plate** nutrition app.