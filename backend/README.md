# NutriLens API

FastAPI service that turns a meal photo into foods, portions and 28 nutrients, logs meals, and tracks them against personal daily goals.

## Run it

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env            # set ANTHROPIC_API_KEY, or NUTRILENS_VISION_PROVIDER=mock
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs. Tests: `.venv/bin/python -m pytest`.

Point the front end at it with `VITE_API_URL=http://localhost:8000` in `frontend/.env`, or set it inside the app under **Goals → Server**. To use it from a phone on the same Wi‑Fi, start uvicorn with `--host 0.0.0.0`.

CORS allows the local dev servers, the Android app (`http://localhost`, `capacitor://localhost`) and private-network addresses. Restrict `NUTRILENS_CORS_ORIGIN_REGEX` when deploying publicly.

## How a photo becomes nutrients

1. `POST /v1/meals/analyze` takes the upload (max 10 MB), applies EXIF rotation, strips metadata (including GPS), downsizes to 1568 px and stores a JPEG.
2. **Claude Opus 5.5** (vision, structured output) names each food, estimates its weight in grams, marks where it sits on the photo, and picks the matching id from the food catalogue when one fits. Refusals fall back server-side (`fallbacks: "default"`); a refused, truncated or failed call returns a clear 502 instead of bad data.
3. Nutrients come from the **reference database** (`app/data/foods.json`, per 100 g), scaled by grams. The model's own rough estimate is used only for foods the database doesn't have, and those items are tagged `source: "estimate"`.
4. The analysis is stored. `POST /v1/meals` logs it by referencing analysis item ids plus portion multipliers, so nutrient values are always computed on the server, never trusted from the client.

## Endpoints

| Method | Path | |
|---|---|---|
| POST | `/v1/meals/analyze` | multipart `photo` → detected items, nutrients, health score |
| POST | `/v1/meals` | log a meal from an analysis (`analysisItemId` + `portion`) or database foods (`foodId` + `grams`) |
| GET / DELETE | `/v1/meals/{id}` | |
| GET | `/v1/days/{date}` | meals, totals, goals and water for a local date |
| PUT | `/v1/days/{date}/water` | glasses of water |
| GET | `/v1/insights?end=&days=` | per-day totals, averages, energy split, % of goal per nutrient |
| GET / PUT | `/v1/profile` | changing the profile recomputes every goal the user hasn't set by hand |
| GET / PATCH | `/v1/goals` · POST `/v1/goals/reset` | |
| GET | `/v1/foods?q=` | search the food database |

## Goals

Calories: Mifflin-St Jeor BMR × activity factor, −500 kcal to lose / +300 to gain (never below 1,500 men / 1,200 women), rounded to 50. Macros from the chosen split: **by body weight** (the onboarding default: protein 2.0 / 1.6 / 1.8 g per kg to lose / maintain / gain, fat 27% of energy, carbs the remainder), or balanced, high protein, low carb, keto. If sex isn't given, the BMR uses the midpoint of the two formulas (−78) and each vitamin/mineral target is the higher of the male and female values. Fiber 14 g per 1,000 kcal; sugar and saturated fat ≤10 % of energy. Vitamins and minerals use the US/Canada Dietary Reference Intakes for the user's age and sex.

## Known gaps

- **No authentication yet**: every request acts as one demo user (`app/deps.py`). Must be replaced before real users.
- **Tables are created at startup**: move to Alembic migrations before the first production deploy.
- **Food database is small** (53 foods, approximate USDA FoodData Central / IFCT 2017 values). Next step is an importer for the full USDA and IFCT datasets.
- Photos are stored on local disk; production should use object storage.
- The Claude path is covered by tests against a mocked HTTP transport; it has not yet been run against the live API with real photos.
