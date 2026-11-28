# Google Play — Plate

**Start here:** [store/CHECKLIST.md](../store/CHECKLIST.md) (step-by-step).

| What | Where |
| --- | --- |
| Privacy policy (host this URL in Play Console) | [store/privacy-policy.html](../store/privacy-policy.html) |
| Store listing copy | [store/listing/en-US/](../store/listing/en-US/) |
| Data safety form answers | [store/data-safety-answers.md](../store/data-safety-answers.md) |
| Screenshot / graphic specs | [store/graphics/README.md](../store/graphics/README.md) |
| Upload keystore script | [scripts/generate-upload-keystore.sh](../scripts/generate-upload-keystore.sh) |
| Local release AAB | [scripts/build-play-aab.sh](../scripts/build-play-aab.sh) |
| Version bumps | [android/version.properties](../android/version.properties) |
| Signing config sample | [android/keystore.properties.example](../android/keystore.properties.example) |

The **android/** project is in git with Play-ready `version.properties`, release signing hooks, and API 35 target. After `npm ci`, run `npx cap sync android` before every build so `www/` is copied into the native project.

**Package name:** `com.stockeasy.plate` (do not change after first Play upload).