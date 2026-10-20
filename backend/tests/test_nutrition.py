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
    assert m["protein"] == round(m["calories"] * 0.25 / 4)


def test_health_score_prefers_nutrient_dense_meals():
    bowl = total(get_food(i).nutrients_for(g) for i, g in [("avocado", 100), ("chickpeas", 80), ("spinach", 60), ("sweet-potato", 120)])
    pizza = get_food("pizza").nutrients_for(300)
    assert health_score(bowl) > 75 > health_score(pizza)
    assert health_score({}) == 0


def test_match_requires_close_names():
    assert match("Grilled salmon").id == "salmon"
    assert match("unicorn stew") is None
