from app.foods import get_food, match
from app.nutrition import calorie_target, default_goals, health_score, total


def test_calorie_target_mifflin_st_jeor():
    assert calorie_target("male", 28, 176, 72, "moderate", "maintain") == 2600
    assert calorie_target("male", 28, 176, 72, "moderate", "lose") == 2100
    # Never below the safety floor.
    assert calorie_target("female", 60, 150, 45, "sedentary", "lose") == 1200


def test_reference_intakes_differ_by_sex():
    m = default_goals("male", 30, 180, 80, "moderate", "maintain", "balanced")
    f = default_goals("female", 30, 165, 60, "moderate", "maintain", "balanced")
    assert m["iron"] == 8 and f["iron"] == 18
    assert m["protein"] == int(m["calories"] * 25 / 400 + 0.5)


def test_macro_rounding_matches_the_front_end():
    # 2,600 kcal × 35% / 4 = 227.5 — Math.round gives 228; Python's round() would give 228 here
    # but 226 for 226.5, so the backend must round halves up explicitly.
    g = default_goals("male", 28, 176, 72, "moderate", "maintain", "protein")
    assert g["calories"] == 2600 and g["protein"] == 228
    from app.nutrition import round_half_up

    assert round_half_up(226.5) == 227 and round_half_up(226.49) == 226


def test_health_score_prefers_nutrient_dense_meals():
    bowl = total(get_food(i).nutrients_for(g) for i, g in [("avocado", 100), ("chickpeas", 80), ("spinach", 60), ("sweet-potato", 120)])
    pizza = get_food("pizza").nutrients_for(300)
    assert health_score(bowl) > 75 > health_score(pizza)
    assert health_score({}) == 0


def test_match_requires_close_names():
    assert match("Grilled salmon").id == "salmon"
    assert match("unicorn stew") is None


def test_bodyweight_preset_matches_onboarding_rules():
    # 72 kg, losing weight: 2.0 g/kg protein, fat 27% of energy, carbs the remainder.
    g = default_goals("male", 28, 176, 72, "moderate", "lose", "bodyweight")
    assert g["calories"] == 2100
    assert g["protein"] == 144
    assert g["fat"] == int(2100 * 0.27 / 9 + 0.5)
    assert g["carbs"] == int((2100 - 144 * 4 - g["fat"] * 9) / 4 + 0.5)
    assert default_goals("male", 28, 176, 72, "moderate", "gain", "bodyweight")["protein"] == round(72 * 1.8)


def test_unspecified_sex_uses_midpoint_bmr_and_the_higher_rda():
    m = calorie_target("male", 30, 170, 70, "sedentary", "maintain")
    f = calorie_target("female", 30, 170, 70, "sedentary", "maintain")
    u = calorie_target("unspecified", 30, 170, 70, "sedentary", "maintain")
    assert f < u < m
    g = default_goals("unspecified", 30, 170, 70, "sedentary", "maintain", "balanced")
    assert g["iron"] == 18 and g["vitC"] == 90 and g["potassium"] == 3400
