# NutriLens

Snap a photo of your meal → get calories, macros (protein, carbs, fat, fiber) and 19 vitamins & minerals, tracked against personal daily goals.

## Front end (`frontend/`)

React 19 + TypeScript + Vite, animated with Motion, icons from Lucide. Mobile-first; on desktop it renders inside a phone frame with a brand panel. Light & dark themes (follows the system, or set it under **Goals → Appearance**).

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build
```

### Screens
- **Today** – concentric calorie/macro rings, macro cards, vitamin & mineral spotlight, smart food suggestions, meal timeline, hydration, quick add.
- **Scan** (center button) – camera/gallery capture → AI analysis → detected items pinned on the photo, portion steppers, health score, "rich in" highlights, impact on your day, log to a meal.
- **Insights** – weekly calories vs goal, energy split, 14-day nutrient consistency heatmap, highlights.
- **Nutrients** – micronutrient score, every vitamin/mineral/limit with status, today's sources and foods that close the gap.
- **Goals** – profile, lose/maintain/gain, calorie slider, macro presets, micronutrient targets, diet & allergies, appearance.

Set `VITE_API_URL=http://localhost:8000` (see `frontend/.env.example`) to use the backend. Without it the front end runs on the mock data in `src/data/mock.ts`.

## Backend (`backend/`)

FastAPI + SQLAlchemy. Claude Opus 5.5 identifies foods and portions in the photo; nutrient values come from a reference food database. See [backend/README.md](backend/README.md) to run it, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

Food photos: [Unsplash](https://unsplash.com/license).

## Android app

The `frontend/android` project wraps the same web app with Capacitor.

```bash
cd frontend
npm run android:apk          # → android/app/build/outputs/apk/debug/app-debug.apk
```

Needs JDK 21 and the Android SDK (platform 36, build-tools 36). The app starts in **demo mode**: everything works on the phone, but photo analysis returns a labelled sample result. For real analysis, run the backend on your computer and connect the phone over the same Wi‑Fi:

```bash
cd backend && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then in the app: **Goals → Server**, enter your computer's address (e.g. `192.168.1.20:8000`) and tap **Test & connect**.

## Tests

```bash
cd backend && .venv/bin/python -m pytest     # API, nutrition maths, Claude request handling
cd frontend && npm run test:e2e              # browser tests against the real API with a fake camera
```

The end-to-end suite starts its own backend (mock recognizer, fresh database) and front end, then drives the app the way a person would: live-camera scan, editing portions, adding missed foods, quick add, water, deleting, goals and profile, insights, demo mode, switching servers, error handling, and layout in light and dark themes.

