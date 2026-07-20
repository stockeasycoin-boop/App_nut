# Plate — nutrition tracker Android APK (Groq-powered)

Photo-based nutrition tracker. Snap a picture of your food and the app estimates
calories, protein, carbs, fat, fiber, sugar, sodium, and key micronutrients, then
tracks everything against your daily goals. AI analysis runs on **Groq's free tier**
— no credit card required.

**Features**

- **Log by photo, description, or manual entry.** Photos and text descriptions are
  sent to Groq's vision model, which returns a full nutrient breakdown.
- **Portion slider.** Estimates come back for one portion — drag 0.25× to 3× and
  every nutrient rescales before you save.
- **Daily goals.** Calorie ring, macro rings (protein / carbs / fat / fiber),
  sugar + sodium as limits, and five micronutrients (vitamin C, vitamin A,
  calcium, iron, potassium). All targets editable in Settings.
- **7-day trend + streak.** Bar chart of the last week against your calorie goal.
  A day "hits" when calories land within 85–110% of goal *and* protein and fiber
  targets are met; consecutive hits build a streak.
- **Day-by-day history.** Arrow back through previous days; each day keeps its
  own log with photo thumbnails.

---

## Get the APK WITHOUT installing anything (recommended)

This project includes an automated build script. GitHub's servers compile the APK
for you, free:

1. Create a free account at https://github.com (if you don't have one).
2. Create a **new repository** (private is fine). Name it anything, e.g. `nutrition-app`.
3. Upload ALL files/folders from this zip into the repo (drag-and-drop works on
   the GitHub website — make sure the `.github` folder is included; enable
   "show hidden files" when selecting).
   - Easiest reliable way: install git, then in this folder run:
     ```
     git init
     git add .
     git commit -m "initial"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/nutrition-app.git
     git push -u origin main
     ```
4. On GitHub, open the **Actions** tab. A "Build Android APK" run starts
   automatically (or press "Run workflow"). It takes ~5-8 minutes.
5. When it finishes, click the run → scroll to **Artifacts** → download
   **plate-nutrition-apk** → unzip it → `app-debug.apk`.
6. Copy `app-debug.apk` to your Android phone and install it (allow
   "install from unknown sources" when prompted).

## OR build locally with Android Studio

1. Install Node.js (v18+) and Android Studio.
2. In this folder:
   ```
   npm install
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
3. In Android Studio: Build → Build APK(s).
   APK appears at `android/app/build/outputs/apk/debug/app-debug.apk`.

## First-run setup in the app

1. Get a free Groq API key: https://console.groq.com → API Keys → Create.
   No credit card needed. Free tier allows ~1,000 photo analyses per day —
   far more than any one person needs.
2. In the app, tap the gear icon, paste the key, adjust daily goals, Save.
3. Tap "Log food" → take a photo → review/adjust the estimate → Add to log.

Manual entry works without any key.

## Notes

- **Data** lives on the device only (localStorage, keyed by date). Uninstalling
  clears it.
- **The API key** is stored on-device and sent only to api.groq.com. Fine for
  personal/team use where each person adds their own free key. If you ever
  distribute the app publicly, put the key behind a small backend instead.
- **Model**: `qwen/qwen3.6-27b` — currently the only vision-capable model on
  Groq's lineup. Set near the top of `www/index.html`; swap it if Groq adds a
  better one. It's a reasoning model, so requests send `reasoning_effort: "none"`
  and `response_format: json_object` to get clean JSON back instead of a
  `<think>` preamble. If you change the model, re-check those two options.
- **Accuracy**: photo estimates are approximations; portion size and hidden
  oils affect real values. Every estimate opens an editable confirmation
  screen before saving. For medical diet management, pair with professional
  guidance.
- All app code is in one file: `www/index.html`. After edits, push to GitHub
  again (or re-run `npx cap sync android` locally) to rebuild.
