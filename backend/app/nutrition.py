"""Nutrient catalogue, daily reference intakes, goal calculation and meal scoring.

Keys match the front end (`frontend/src/data/nutrients.ts`).
"""

from collections.abc import Iterable, Mapping

NUTRIENT_UNITS: dict[str, str] = {
    "calories": "kcal",
    "protein": "g",
    "carbs": "g",
    "fat": "g",
    "fiber": "g",
    "sugar": "g",
    "satFat": "g",
    "omega3": "g",
    "cholesterol": "mg",
    "sodium": "mg",
    "vitA": "µg",
    "vitC": "mg",
    "vitD": "µg",
    "vitE": "mg",
    "vitK": "µg",
    "b1": "mg",
    "b2": "mg",
    "b3": "mg",
    "b6": "mg",
    "b12": "µg",
    "folate": "µg",
    "calcium": "mg",
    "iron": "mg",
    "magnesium": "mg",
    "potassium": "mg",
    "zinc": "mg",
    "selenium": "µg",
    "phosphorus": "mg",
}
NUTRIENT_KEYS = tuple(NUTRIENT_UNITS)
LIMIT_KEYS = ("sugar", "satFat", "cholesterol", "sodium")
VITAMIN_KEYS = ("vitA", "vitC", "vitD", "vitE", "vitK", "b1", "b2", "b3", "b6", "b12", "folate")
MINERAL_KEYS = ("calcium", "iron", "magnesium", "potassium", "zinc", "selenium", "phosphorus")
MICRO_KEYS = VITAMIN_KEYS + MINERAL_KEYS

ACTIVITY_FACTORS = {"sedentary": 1.2, "light": 1.375, "moderate": 1.55, "active": 1.725, "athlete": 1.9}
AIM_ADJUST = {"lose": -500, "maintain": 0, "gain": 300}
MACRO_PRESETS = {
    "balanced": (25, 45, 30),
    "protein": (35, 40, 25),
    "lowcarb": (30, 25, 45),
    "keto": (25, 5, 70),
}


def scale(nutrients: Mapping[str, float], factor: float) -> dict[str, float]:
    return {k: round(v * factor, 4) for k, v in nutrients.items()}


def total(items: Iterable[Mapping[str, float]]) -> dict[str, float]:
    out: dict[str, float] = {}
    for n in items:
        for k, v in n.items():
            out[k] = out.get(k, 0.0) + v
    return {k: round(v, 3) for k, v in out.items()}


def reference_intakes(sex: str, age: int) -> dict[str, float]:
    """US/Canada Dietary Reference Intakes (RDA or AI) for adults 19+."""
    male = sex == "male"
    older = age >= 51
    return {
        "omega3": 1.6 if male else 1.1,
        "vitA": 900 if male else 700,
        "vitC": 90 if male else 75,
        "vitD": 20 if age >= 71 else 15,
        "vitE": 15,
        "vitK": 120 if male else 90,
        "b1": 1.2 if male else 1.1,
        "b2": 1.3 if male else 1.1,
        "b3": 16 if male else 14,
        "b6": (1.7 if male else 1.5) if older else 1.3,
        "b12": 2.4,
        "folate": 400,
        "calcium": 1200 if (age >= 71 or (not male and older)) else 1000,
        "iron": 8 if (male or older) else 18,
        "magnesium": (400 if age <= 30 else 420) if male else (310 if age <= 30 else 320),
        "potassium": 3400 if male else 2600,
        "zinc": 11 if male else 8,
        "selenium": 55,
        "phosphorus": 700,
        "sodium": 2300,
        "cholesterol": 300,
    }


def calorie_target(sex: str, age: int, height_cm: float, weight_kg: float, activity: str, aim: str) -> int:
    """Mifflin-St Jeor BMR × activity factor, adjusted for the user's aim, rounded to 50 kcal."""
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + (5 if sex == "male" else -161)
    tdee = bmr * ACTIVITY_FACTORS.get(activity, 1.55)
    floor = 1500 if sex == "male" else 1200
    kcal = max(floor, tdee + AIM_ADJUST.get(aim, 0))
    return int(round(kcal / 50) * 50)


def default_goals(
    sex: str, age: int, height_cm: float, weight_kg: float, activity: str, aim: str, preset: str
) -> dict[str, float]:
    kcal = calorie_target(sex, age, height_cm, weight_kg, activity, aim)
    p, c, f = MACRO_PRESETS.get(preset, MACRO_PRESETS["balanced"])
    goals: dict[str, float] = {
        "calories": kcal,
        "protein": round(kcal * p / 100 / 4),
        "carbs": round(kcal * c / 100 / 4),
        "fat": round(kcal * f / 100 / 9),
        "fiber": round(kcal / 1000 * 14),  # 14 g per 1,000 kcal
        "sugar": round(kcal * 0.10 / 4),  # ≤10% of energy
        "satFat": round(kcal * 0.10 / 9),  # ≤10% of energy
    }
    goals.update(reference_intakes(sex, age))
    return goals


def health_score(n: Mapping[str, float]) -> int:
    """0–100 nutrient-density score for a meal.

    Rewards protein, fiber and micronutrients per 100 kcal; penalises sugar, saturated
    fat and sodium per 100 kcal. Deterministic so the same meal always scores the same.
    """
    kcal = n.get("calories", 0.0)
    if kcal <= 0:
        return 0
    per100 = 100 / kcal
    ref = reference_intakes("male", 30)
    protein = min(n.get("protein", 0) * per100 / 5, 1)  # 5 g / 100 kcal = full marks
    fiber = min(n.get("fiber", 0) * per100 / 3, 1)  # 3 g / 100 kcal
    micro = sum(min(n.get(k, 0) * per100 / (ref[k] * 0.1), 1) for k in MICRO_KEYS) / len(MICRO_KEYS)
    sugar = min(n.get("sugar", 0) * per100 / 10, 1)  # 10 g / 100 kcal = full penalty
    sat = min(n.get("satFat", 0) * per100 / 4, 1)
    sodium = min(n.get("sodium", 0) * per100 / 400, 1)
    raw = 40 + 15 * protein + 20 * fiber + 35 * micro - 15 * sugar - 10 * sat - 10 * sodium
    return int(max(0, min(100, round(raw))))
