import io
from datetime import datetime, timezone

from PIL import Image

from app.analysis import normalise_image

NOW = datetime(2026, 10, 20, 13, 0, tzinfo=timezone.utc).isoformat()


def meal(client, **body):
    return client.post("/v1/meals", json={"type": "lunch", "localDate": "2026-10-20", "eatenAt": NOW, **body})


def test_cors_allows_the_android_app_and_lan_dev_servers(client):
    for origin in ("http://localhost", "https://localhost", "capacitor://localhost", "http://192.168.1.20:5173"):
        r = client.options("/v1/foods", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
        assert r.headers.get("access-control-allow-origin") == origin, origin
    r = client.options("/v1/foods", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in r.headers


def test_uploaded_photos_lose_location_metadata_and_get_rotated():
    img = Image.new("RGB", (400, 200), (200, 50, 50))
    exif = Image.Exif()
    exif[0x0112] = 6  # orientation: rotate 90°
    exif[0x8825] = {2: (12.0, 58.0, 0.0)}  # GPS IFD
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    out = Image.open(io.BytesIO(normalise_image(buf.getvalue())))
    assert out.size == (200, 400)  # rotation applied
    assert not out.getexif()  # no EXIF (and so no GPS) left


def test_large_photos_are_downscaled():
    buf = io.BytesIO()
    Image.new("RGB", (4000, 3000)).save(buf, format="JPEG")
    out = Image.open(io.BytesIO(normalise_image(buf.getvalue())))
    assert max(out.size) == 1568


def test_meal_can_mix_detected_items_and_database_foods(client, jpeg_bytes):
    a = client.post("/v1/meals/analyze", files={"photo": ("m.jpg", jpeg_bytes, "image/jpeg")}).json()
    r = meal(client, analysisId=a["id"], items=[{"analysisItemId": a["items"][0]["id"], "portion": 1}, {"foodId": "roti", "grams": 80}])
    assert r.status_code == 201, r.text
    body = r.json()
    assert [i["source"] for i in body["items"]] == ["database", "database"]
    assert body["photoUrl"] == a["photoUrl"]


def test_meal_input_limits(client):
    assert meal(client, items=[]).status_code == 422
    assert meal(client, items=[{"foodId": "roti", "grams": 0}]).status_code == 422
    assert meal(client, items=[{"foodId": "roti", "grams": 5000}]).status_code == 422
    assert meal(client, items=[{"foodId": "nope", "grams": 10}]).status_code == 422
    assert meal(client, type="brunch", items=[{"foodId": "roti", "grams": 40}]).status_code == 422
    assert meal(client, analysisId="missing", items=[{"analysisItemId": "i0"}]).status_code == 404


def test_portion_limits(client, jpeg_bytes):
    a = client.post("/v1/meals/analyze", files={"photo": ("m.jpg", jpeg_bytes, "image/jpeg")}).json()
    item = a["items"][0]["id"]
    assert meal(client, analysisId=a["id"], items=[{"analysisItemId": item, "portion": 6}]).status_code == 422
    assert meal(client, analysisId=a["id"], items=[{"analysisItemId": item, "portion": 0}]).status_code == 422


def test_water_limits(client):
    assert client.put("/v1/days/2026-10-20/water", json={"glasses": -1}).status_code == 422
    assert client.put("/v1/days/2026-10-20/water", json={"glasses": 41}).status_code == 422
    assert client.put("/v1/days/2026-10-20/water", json={"glasses": 8}).status_code == 200
    assert client.put("/v1/days/2026-10-20/water", json={"glasses": 2}).status_code == 200
    assert client.get("/v1/days/2026-10-20").json()["waterGlasses"] == 2


def test_insights_with_nothing_logged(client):
    ins = client.get("/v1/insights", params={"end": "2026-10-20", "days": 30}).json()
    assert len(ins["days"]) == 30
    assert ins["averages"] == {}
    assert all(d["mealCount"] == 0 for d in ins["days"])


def test_profile_name_update_and_validation(client):
    p = client.get("/v1/profile").json()
    p["name"] = "  Priya  "
    assert client.put("/v1/profile", json=p).json()["name"] == "Priya"
    p["age"] = 12
    assert client.put("/v1/profile", json=p).status_code == 422
