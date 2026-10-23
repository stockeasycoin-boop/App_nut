from datetime import date, datetime, timezone

import pytest

TODAY = date(2026, 10, 20)


def analyze(client, jpeg_bytes):
    r = client.post("/v1/meals/analyze", files={"photo": ("meal.jpg", jpeg_bytes, "image/jpeg")})
    assert r.status_code == 200, r.text
    return r.json()


def log_meal(client, **body):
    payload = {"type": "lunch", "localDate": TODAY.isoformat(), "eatenAt": datetime(2026, 10, 20, 13, 5, tzinfo=timezone.utc).isoformat(), **body}
    return client.post("/v1/meals", json=payload)


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_analyze_returns_items_with_database_nutrients(client, jpeg_bytes):
    a = analyze(client, jpeg_bytes)
    assert a["name"] == "Rainbow Buddha bowl"
    assert len(a["items"]) == 8
    avocado = next(i for i in a["items"] if i["foodId"] == "avocado")
    assert avocado["source"] == "database"
    assert avocado["grams"] == 100
    assert avocado["nutrients"]["calories"] == pytest.approx(160)
    assert a["totals"]["calories"] == pytest.approx(sum(i["nutrients"]["calories"] for i in a["items"]), rel=1e-3)
    assert 0 <= a["score"] <= 100
    photo = client.get(a["photoUrl"])
    assert photo.status_code == 200 and photo.headers["content-type"] == "image/jpeg"


def test_analyze_rejects_non_images(client):
    r = client.post("/v1/meals/analyze", files={"photo": ("x.jpg", b"not an image", "image/jpeg")})
    assert r.status_code == 422


def test_analyze_rejects_oversized_upload(client, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "max_upload_mb", 0)
    r = client.post("/v1/meals/analyze", files={"photo": ("x.jpg", b"0" * 10, "image/jpeg")})
    assert r.status_code == 413


def test_log_meal_from_analysis_scales_portions_server_side(client, jpeg_bytes):
    a = analyze(client, jpeg_bytes)
    avocado = next(i for i in a["items"] if i["foodId"] == "avocado")
    chickpeas = next(i for i in a["items"] if i["foodId"] == "chickpeas")
    r = log_meal(
        client,
        analysisId=a["id"],
        items=[{"analysisItemId": avocado["id"], "portion": 0.5}, {"analysisItemId": chickpeas["id"], "portion": 2}],
    )
    assert r.status_code == 201, r.text
    meal = r.json()
    assert meal["name"] == "Rainbow Buddha bowl"
    assert [i["grams"] for i in meal["items"]] == [50, 160]
    expected = avocado["nutrients"]["calories"] * 0.5 + chickpeas["nutrients"]["calories"] * 2
    assert meal["totals"]["calories"] == pytest.approx(expected, rel=1e-3)
    assert meal["photoUrl"] == a["photoUrl"]


def test_log_meal_rejects_unknown_analysis_item(client, jpeg_bytes):
    a = analyze(client, jpeg_bytes)
    r = log_meal(client, analysisId=a["id"], items=[{"analysisItemId": "nope"}])
    assert r.status_code == 422


def test_log_meal_from_database_food(client):
    r = log_meal(client, type="breakfast", items=[{"foodId": "egg-boiled", "grams": 100}, {"foodId": "roti", "grams": 40}])
    assert r.status_code == 201, r.text
    meal = r.json()
    assert meal["name"] == "Boiled egg"
    assert meal["totals"]["protein"] == pytest.approx(12.6 + 9.8 * 0.4, rel=1e-3)


def test_day_totals_water_and_delete(client):
    m1 = log_meal(client, items=[{"foodId": "salmon", "grams": 100}]).json()
    log_meal(client, type="dinner", items=[{"foodId": "dal", "grams": 200}])
    assert client.put(f"/v1/days/{TODAY}/water", json={"glasses": 6}).status_code == 200

    day = client.get(f"/v1/days/{TODAY}").json()
    assert len(day["meals"]) == 2
    assert day["totals"]["calories"] == pytest.approx(206 + 240, rel=1e-3)
    assert day["waterGlasses"] == 6
    assert day["goals"]["calories"] > 0

    assert client.delete(f"/v1/meals/{m1['id']}").status_code == 204
    assert len(client.get(f"/v1/days/{TODAY}").json()["meals"]) == 1
    assert client.get(f"/v1/meals/{m1['id']}").status_code == 404


def test_insights(client):
    log_meal(client, localDate="2026-10-19", items=[{"foodId": "chicken-breast", "grams": 200}])
    log_meal(client, items=[{"foodId": "white-rice", "grams": 300}])
    ins = client.get("/v1/insights", params={"end": TODAY.isoformat(), "days": 7}).json()
    assert len(ins["days"]) == 7
    assert [d["mealCount"] for d in ins["days"]][-2:] == [1, 1]
    assert ins["averages"]["calories"] == pytest.approx((330 + 390) / 2, rel=1e-3)
    assert sum(ins["macroSplit"].values()) == pytest.approx(1, abs=0.01)
    assert len(ins["percentOfGoal"]["protein"]) == 7


def test_goals_custom_values_survive_profile_changes(client):
    base = client.get("/v1/goals").json()
    assert base["custom"] == []
    assert base["values"]["calories"] == 2100  # demo profile: male, 28, 176 cm, 72 kg, moderate, lose

    client.patch("/v1/goals", json={"values": {"protein": 150}})
    profile = client.get("/v1/profile").json()
    profile.update(aim="maintain", weightKg=80)
    updated = client.put("/v1/profile", json=profile)
    assert updated.status_code == 200, updated.text

    goals = client.get("/v1/goals").json()
    assert goals["values"]["protein"] == 150
    assert goals["values"]["calories"] == 2750
    assert goals["custom"] == ["protein"]

    reset = client.post("/v1/goals/reset").json()
    assert reset["custom"] == [] and reset["values"]["protein"] != 150


def test_goals_reject_unknown_nutrients(client):
    assert client.patch("/v1/goals", json={"values": {"unobtainium": 3}}).status_code == 422


def test_food_search(client):
    foods = client.get("/v1/foods", params={"q": "biryani"}).json()
    assert foods[0]["id"] == "chicken-biryani"
    assert set(foods[0]) == {"id", "name", "emoji", "servingG", "per100g"}
    assert foods[0]["per100g"]["calories"] > 0
