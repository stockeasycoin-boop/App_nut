# Google Play launch checklist — Plate

## Before upload

- [ ] Bump `android/version.properties` (`versionCode` +1 every upload)
- [ ] Create upload keystore: `bash scripts/generate-upload-keystore.sh`
- [ ] Copy `android/keystore.properties.example` → `android/keystore.properties` (gitignored)
- [ ] Build AAB: `bash scripts/build-play-aab.sh` **or** GitHub Action **Build Play Store AAB** (with signing secrets)
- [ ] File: `android/app/build/outputs/bundle/release/app-release.aab`

## Play Console (one-time)

- [ ] [Developer account](https://play.google.com/console) ($25 one-time)
- [ ] Create app → package **com.stockeasy.plate**
- [ ] **Privacy policy URL** — host `store/privacy-policy.html` (GitHub Pages, your site, or raw gist); paste URL in Console
- [ ] **Store listing** — paste text from `store/listing/en-US/`
- [ ] **Graphics** — see `store/graphics/README.md`
- [ ] **Content rating** — questionnaire (health/fitness app)
- [ ] **Data safety** — use `store/data-safety-answers.md`
- [ ] **Target audience** — 13+ recommended

## Release track

1. **Internal testing** — upload AAB, add testers
2. **Production** — after testing, promote release

## GitHub Actions signing (optional)

Repository **Settings → Secrets**:

| Secret | Value |
| --- | --- |
| `PLAY_KEYSTORE_BASE64` | `base64 -w0 android/plate-upload.keystore` |
| `PLAY_KEYSTORE_PASSWORD` | store password |
| `PLAY_KEY_ALIAS` | `plate` |
| `PLAY_KEY_PASSWORD` | key password |

Run workflow **Build Play Store AAB** → download signed artifact.

## Keep your keystore safe

Losing the upload keystore means you cannot update the same Play listing. Back up `plate-upload.keystore` and passwords offline.