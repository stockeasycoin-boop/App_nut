# Architecture

The front end talks to the backend only through `frontend/src/lib/api.ts` (mock data when `VITE_API_URL` is unset). The backend lives in `backend/`; see `backend/README.md` for the implemented endpoints. This document records the design and what is still planned.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/meals/analyze` | Multipart image → `{ name, confidence, score, items[] }` (each item has grams, nutrients for that portion, confidence, pin position) |
| `POST` | `/v1/meals` | Log a confirmed meal (items + portion multipliers + meal type) |
| `GET` | `/v1/days/:date` | Meals and nutrient totals for a day |
| `GET` | `/v1/insights?end=&days=` | Daily totals, averages, per-nutrient % of goal |
| `GET/PATCH` | `/v1/goals` | Calorie, macro and micronutrient targets |
| `GET/PUT` | `/v1/profile` | Age, sex, height, weight, activity, diet & allergies |

## Image → nutrients pipeline
1. **Upload** – client downsizes to ~1024px and uploads; the server stores the original in object storage (S3/GCS).
2. **Recognition** – a vision-language model identifies each food, estimates portion in grams (using plate/utensil size as scale) and returns a bounding point plus confidence.
3. **Nutrient lookup** – each food is matched to a nutrient database (USDA FoodData Central, plus IFCT 2017 for Indian foods) and scaled by grams. The model never invents nutrient values; it only names foods and portions.
4. **Review** – low-confidence items are flagged ("check me") in the UI; user corrections are stored to improve matching.

## Goals
Defaults come from Mifflin-St Jeor BMR × activity factor, adjusted for the chosen aim (lose / maintain / gain), and RDA tables by age and sex for micronutrients. Limits (sodium, added sugar, saturated fat, cholesterol) are tracked as "stay under" targets.

## Stack
Implemented: Python FastAPI · SQLAlchemy (SQLite in dev, Postgres in prod) · Claude Opus 5.5 vision with structured output · local photo storage.

Still planned: authentication (OAuth / passkeys), Alembic migrations, object storage for photos, a full USDA + IFCT food import, and a queue for analysis if latency grows.
