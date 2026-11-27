/**
 * Plate backend — adapted from solo-leveling-fitness (local-only, Groq, on-device store).
 * No cloud account; persists under localStorage key plate_player_v1.
 */
(function (global) {
  const STORE_KEY = 'plate_player_v1';
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const CHAT_MODEL = 'llama-3.1-8b-instant';

  const RANKS = [
    { rank: 'E', minXP: 0, maxXP: 500, multiplier: 1.0, title: 'Novice Hunter' },
    { rank: 'D', minXP: 500, maxXP: 1500, multiplier: 1.2, title: 'Iron Fist' },
    { rank: 'C', minXP: 1500, maxXP: 3500, multiplier: 1.5, title: 'Steel Body' },
    { rank: 'B', minXP: 3500, maxXP: 7000, multiplier: 1.8, title: 'Elite Hunter' },
    { rank: 'A', minXP: 7000, maxXP: 15000, multiplier: 2.2, title: 'Shadow Monarch' },
    { rank: 'S', minXP: 15000, maxXP: 999999, multiplier: 3.0, title: 'Arise' },
  ];

  const NUTRITION_DB = [
    {
      city: 'Hyderabad',
      topSources: [
        { name: 'Paneer (Cottage Cheese)', proteinPerServing: 18, isVegetarian: true, localTip: 'Amul or Heritage — widely available' },
        { name: 'Eggs (whole)', proteinPerServing: 8, isVegetarian: true, localTip: 'Country eggs ~₹7/egg' },
        { name: 'Moong Dal (cooked)', proteinPerServing: 18, isVegetarian: true, isVegan: true, localTip: 'Post-workout: add ghee and jeera' },
        { name: 'Roasted Chana', proteinPerServing: 6, isVegetarian: true, isVegan: true, localTip: 'Evening snack at local kirana' },
        { name: 'Soya Chunks (cooked)', proteinPerServing: 18, isVegetarian: true, isVegan: true, localTip: 'Nutrela — affordable' },
      ],
      localTips: [
        'Egg bhurji (3 eggs) ≈ 24g protein for under ₹30',
        'Budget paneer curry + roti is an easy high-protein dinner',
      ],
    },
    {
      city: 'Mumbai',
      topSources: [
        { name: 'Chicken Breast', proteinPerServing: 47, isVegetarian: false },
        { name: 'Paneer', proteinPerServing: 18, isVegetarian: true },
        { name: 'Eggs', proteinPerServing: 8, isVegetarian: true },
        { name: 'Legumes (mix dal)', proteinPerServing: 18, isVegetarian: true, isVegan: true },
      ],
      localTips: ['Egg bhurji pav ≈ 16g protein', 'Irani cafe keema dishes — affordable protein'],
    },
    {
      city: 'Default',
      topSources: [
        { name: 'Chicken Breast', proteinPerServing: 47, isVegetarian: false },
        { name: 'Eggs', proteinPerServing: 8, isVegetarian: true },
        { name: 'Greek Yogurt', proteinPerServing: 20, isVegetarian: true },
        { name: 'Lentils (cooked)', proteinPerServing: 18, isVegetarian: true, isVegan: true },
        { name: 'Whey Protein (1 scoop)', proteinPerServing: 22, isVegetarian: true },
      ],
      localTips: ['Aim for 1.6–2.2g protein per kg bodyweight', 'Spread protein across 4–5 meals'],
    },
  ];

  const MEAL_TYPE_LABELS = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };

  const PROTEIN_RANGE = {
    breakfast: { min: 12, max: 30, default: 20 },
    lunch: { min: 25, max: 50, default: 35 },
    dinner: { min: 25, max: 50, default: 35 },
    snack: { min: 8, max: 20, default: 12 },
  };

  const FALLBACK_MEAL = {
    breakfast: { mealName: 'Pesarattu with peanut chutney', proteinGrams: 18 },
    lunch: { mealName: 'Curd rice with dal & sambar', proteinGrams: 28 },
    dinner: { mealName: 'Paneer curry with roti', proteinGrams: 32 },
    snack: { mealName: 'Sprouts chaat with curd', proteinGrams: 12 },
  };

  function defaultStore() {
    return {
      stats: {
        totalXP: 0,
        streakDays: 0,
        lastActiveDate: null,
        rank: 'E',
      },
      lastRankUpMessage: null,
    };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(defaultStore(), JSON.parse(raw));
    } catch (e) {}
    return defaultStore();
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  let store = loadStore();

  function getRankForXP(totalXP) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (totalXP >= RANKS[i].minXP) return RANKS[i];
    }
    return RANKS[0];
  }

  function streakBonus(days) {
    if (days >= 30) return 2.0;
    if (days >= 14) return 1.75;
    if (days >= 7) return 1.5;
    if (days >= 3) return 1.25;
    return 1.0;
  }

  function xpWithBonuses(baseXP, rank, streakDays) {
    const rankDef = RANKS.find((r) => r.rank === rank) || RANKS[0];
    const mult = rankDef.multiplier * streakBonus(streakDays);
    return { total: Math.round(baseXP * mult), multiplier: mult };
  }

  function calculateStreak(lastActiveDate, currentStreak) {
    if (!lastActiveDate) return { newStreak: 1, streakBroken: false };
    const last = new Date(lastActiveDate);
    const today = new Date();
    const diffMs = today.setHours(0, 0, 0, 0) - last.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { newStreak: currentStreak, streakBroken: false };
    if (diffDays === 1) return { newStreak: currentStreak + 1, streakBroken: false };
    return { newStreak: 1, streakBroken: true };
  }

  function getNutritionProfile(city) {
    const found = NUTRITION_DB.find((p) => p.city.toLowerCase() === String(city || '').toLowerCase());
    return found || NUTRITION_DB.find((p) => p.city === 'Default');
  }

  function calculateDailyProteinTarget(weightKg, rank) {
    const mult = { E: 1.6, D: 1.8, C: 2.0, B: 2.2, A: 2.2, S: 2.2 }[rank] || 1.6;
    return Math.round((Number(weightKg) || 70) * mult);
  }

  function getXPProgress(totalXP) {
    const current = getRankForXP(totalXP);
    const idx = RANKS.findIndex((r) => r.rank === current.rank);
    const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
    const xpIntoRank = totalXP - current.minXP;
    const xpNeeded = next ? next.minXP - current.minXP : 0;
    const progressPct = xpNeeded > 0 ? Math.min((xpIntoRank / xpNeeded) * 100, 100) : 100;
    return { current, next, progressPct, xpIntoRank, xpNeeded };
  }

  function updateStreak() {
    const { newStreak } = calculateStreak(store.stats.lastActiveDate, store.stats.streakDays);
    store.stats.streakDays = newStreak;
    store.stats.lastActiveDate = new Date().toISOString().split('T')[0];
    saveStore(store);
  }

  function awardNutritionXP(proteinGrams) {
    const base = Math.min(80, Math.max(5, Math.round(Number(proteinGrams) * 2)));
    const prevXP = store.stats.totalXP;
    const { total } = xpWithBonuses(base, store.stats.rank, store.stats.streakDays);
    const newTotal = prevXP + total;
    const prevRank = getRankForXP(prevXP).rank;
    const newRankDef = getRankForXP(newTotal);
    const rankedUp = newRankDef.rank !== prevRank;
    store.stats.totalXP = newTotal;
    store.stats.rank = newRankDef.rank;
    if (rankedUp) {
      store.lastRankUpMessage = `Rank up: ${prevRank} → ${newRankDef.rank} · ${newRankDef.title}`;
    }
    saveStore(store);
    return { finalXP: total, rankedUp, message: store.lastRankUpMessage };
  }

  function clearRankUpMessage() {
    store.lastRankUpMessage = null;
    saveStore(store);
  }

  function guessMealTypeForNow() {
    const h = new Date().getHours();
    if (h < 11) return 'breakfast';
    if (h < 15) return 'lunch';
    if (h < 21) return 'dinner';
    return 'snack';
  }

  async function generateMealSuggestion(params, apiKey) {
    const mealType = params.mealType || 'lunch';
    const range = PROTEIN_RANGE[mealType];
    const fb = FALLBACK_MEAL[mealType];
    const fallback = {
      mealName: fb.mealName,
      proteinGrams: fb.proteinGrams,
      description: 'Add a Groq API key in Settings for personalized meal ideas.',
      mealType,
      isFallback: true,
    };
    if (!apiKey) return fallback;

    const remaining = Math.max(0, params.targetProtein - params.consumedToday);
    const dietBlock = params.isVegetarian
      ? 'Diet: VEGETARIAN (no meat, fish, or eggs). Dairy and legumes allowed.'
      : 'Diet: NON-VEGETARIAN. Rotate eggs, dairy, legumes, and meat.';

    const userPrompt = `Suggest ONE ${mealType} for:
- City: ${params.city}
- Rank: ${params.rank}
${dietBlock}
- Protein remaining today: ${remaining}g of ${params.targetProtein}g
Protein per serving roughly ${range.min}–${range.max}g. Real specific dish name.

Return ONLY JSON: {"mealName":"...","proteinGrams":number,"description":"..."}`;

    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: CHAT_MODEL,
          max_tokens: 280,
          temperature: 0.9,
          messages: [
            { role: 'system', content: 'Nutrition coach for an Indian fitness app. JSON only.' },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!response.ok) return { ...fallback, description: 'API error ' + response.status };
      const data = await response.json();
      const raw = (data.choices && data.choices[0] && data.choices[0].message.content) || '';
      const jsonMatch = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/);
      if (!jsonMatch) return fallback;
      const parsed = JSON.parse(jsonMatch[0]);
      const proteinGrams = Math.max(
        range.min,
        Math.min(range.max + 10, Math.round(Number(parsed.proteinGrams)) || fb.proteinGrams)
      );
      return {
        mealName: String(parsed.mealName || fb.mealName).trim(),
        proteinGrams,
        description: String(parsed.description || '').trim(),
        mealType,
      };
    } catch (e) {
      return { ...fallback, description: 'Could not reach nutrition AI.' };
    }
  }

  global.PlateBackend = {
    RANKS,
    MEAL_TYPE_LABELS,
    getStats: () => ({ ...store.stats }),
    getXPProgress,
    getNutritionProfile,
    calculateDailyProteinTarget,
    updateStreak,
    awardNutritionXP,
    clearRankUpMessage,
    getRankUpMessage: () => store.lastRankUpMessage,
    guessMealTypeForNow,
    generateMealSuggestion,
    reloadStore: () => {
      store = loadStore();
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);