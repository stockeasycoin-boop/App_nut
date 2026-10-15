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

All data currently comes from `src/data/mock.ts` through `src/lib/api.ts`; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the planned backend.

Food photos: [Unsplash](https://unsplash.com/license).
