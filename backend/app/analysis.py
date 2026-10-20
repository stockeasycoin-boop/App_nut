"""Photo intake: validate and normalise the upload, run recognition, attach nutrients."""

import io
import uuid
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from .foods import get_food, match
from .nutrition import scale, total
from .vision import MealRecognition, Recognizer

MAX_SIDE = 1568  # longest edge sent to the model; larger images are downscaled by the API anyway


class InvalidImage(ValueError):
    pass


def normalise_image(data: bytes) -> bytes:
    """Decode, apply EXIF rotation, strip metadata (incl. GPS), downscale and re-encode as JPEG."""
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError) as e:
        raise InvalidImage("That file isn't a supported image.") from e
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85)
    return out.getvalue()


def save_photo(media_dir: Path, jpeg: bytes) -> str:
    media_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.jpg"
    (media_dir / name).write_bytes(jpeg)
    return name


def build_items(recognition: MealRecognition) -> list[dict]:
    items = []
    for i, d in enumerate(recognition.foods):
        grams = max(1.0, min(d.grams, 2000.0))
        food = get_food(d.database_id) if d.database_id else None
        food = food or match(d.name)
        if food:
            nutrients, source = food.nutrients_for(grams), "database"
        else:
            nutrients, source = scale(d.estimate_per_100g.model_dump(), grams / 100), "estimate"
        items.append(
            {
                "id": f"i{i}",
                "name": d.name,
                "emoji": d.emoji or (food.emoji if food else "🍽️"),
                "grams": round(grams, 1),
                "confidence": round(max(0.0, min(d.confidence, 1.0)), 2),
                "pin": {"x": max(0.0, min(d.x, 100.0)), "y": max(0.0, min(d.y, 100.0))},
                "foodId": food.id if food else None,
                "source": source,
                "nutrients": nutrients,
            }
        )
    return items


def analyse(recognizer: Recognizer, jpeg: bytes) -> tuple[MealRecognition, list[dict], dict[str, float]]:
    recognition = recognizer.recognize(jpeg, "image/jpeg")
    if not recognition.contains_food or not recognition.foods:
        raise InvalidImage("We couldn't spot any food in that photo. Try again with the plate in frame.")
    items = build_items(recognition)
    return recognition, items, total(i["nutrients"] for i in items)
