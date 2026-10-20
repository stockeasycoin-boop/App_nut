"""Food recognition from a meal photo.

The model only *names* foods, estimates portion weight and points at them on the photo.
Nutrient values come from the reference database (`foods.py`); the model's own rough
per-100 g estimate is used only for foods the database doesn't contain, and those items
are marked as estimates.
"""

import base64
from typing import Protocol

import anthropic
from pydantic import BaseModel, ValidationError

from .config import Settings
from .foods import all_foods


class Per100gEstimate(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    sugar: float
    sodium: float


class DetectedFood(BaseModel):
    name: str
    database_id: str | None
    emoji: str
    grams: float
    confidence: float
    x: float
    y: float
    estimate_per_100g: Per100gEstimate


class MealRecognition(BaseModel):
    contains_food: bool
    meal_name: str
    foods: list[DetectedFood]


class RecognitionError(Exception):
    """The photo could not be analysed (refusal, malformed output, upstream error)."""


class Recognizer(Protocol):
    model_name: str

    def recognize(self, image: bytes, media_type: str) -> MealRecognition: ...


def _system_prompt() -> str:
    catalogue = "\n".join(f"- {f.id}: {f.name}" + (f" (also: {', '.join(f.aliases)})" if f.aliases else "") for f in all_foods().values())
    return f"""You analyse photos of meals for a nutrition-tracking app. Users rely on the result to track calories, macros and micronutrients, so portion estimates matter more than anything else.

For each distinct food or component visible on the plate:
- name: short, natural name a user would recognise (e.g. "Roasted sweet potato").
- database_id: the id from the catalogue below when the food is the same thing (same food, comparable preparation); otherwise null. Do not force a match: a different dish with a similar name should be null.
- emoji: one emoji for the food.
- grams: estimated edible weight in grams. Use the plate, bowl, cutlery and hands as scale references. Count sauces and dressings separately when they are visible.
- confidence: 0–1, how sure you are about both the identification and the portion.
- x, y: position of the food's centre as a percentage (0–100) of the image width and height, measured from the top-left corner.
- estimate_per_100g: your best per-100 g estimate of calories (kcal), protein, carbs, fat, fiber, sugar (g) and sodium (mg). This is only used when database_id is null, but always fill it in.

Set meal_name to a short, appetising name for the whole meal. If the photo contains no food, set contains_food to false and return an empty foods list.

Catalogue (id: name):
{catalogue}"""


class ClaudeRecognizer:
    def __init__(self, settings: Settings, client: anthropic.Anthropic | None = None):
        self.client = client or anthropic.Anthropic()
        self.model_name = settings.vision_model
        self.effort = settings.vision_effort
        self.system = _system_prompt()

    def recognize(self, image: bytes, media_type: str) -> MealRecognition:
        try:
            response = self.client.beta.messages.parse(
                model=self.model_name,
                max_tokens=16000,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                output_config={"effort": self.effort},
                system=[{"type": "text", "text": self.system, "cache_control": {"type": "ephemeral"}}],
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": base64.standard_b64encode(image).decode("ascii"),
                                },
                            },
                            {"type": "text", "text": "Identify the foods in this meal."},
                        ],
                    }
                ],
                output_format=MealRecognition,
            )
        except anthropic.RateLimitError as e:
            raise RecognitionError("The analysis service is busy. Please try again in a moment.") from e
        except anthropic.APIStatusError as e:
            raise RecognitionError(f"Analysis failed upstream (status {e.status_code}).") from e
        except anthropic.APIConnectionError as e:
            raise RecognitionError("Could not reach the analysis service.") from e
        except ValidationError as e:  # output cut off or not matching the schema
            raise RecognitionError("The analysis came back incomplete. Please try again.") from e

        if response.stop_reason == "refusal":
            raise RecognitionError("This photo couldn't be analysed.")
        if response.stop_reason == "max_tokens" or response.parsed_output is None:
            raise RecognitionError("The analysis came back incomplete. Please try again.")
        return response.parsed_output


def _est(cal, p, c, f, fib=0.0, sug=0.0, na=0.0) -> Per100gEstimate:
    return Per100gEstimate(calories=cal, protein=p, carbs=c, fat=f, fiber=fib, sugar=sug, sodium=na)


class MockRecognizer:
    """Returns the demo Buddha bowl for any image — for development without an API key, and tests."""

    model_name = "mock"

    def recognize(self, image: bytes, media_type: str) -> MealRecognition:
        foods = [
            ("Avocado", "avocado", "🥑", 100, 0.98, 40, 72),
            ("Chickpeas", "chickpeas", "🫘", 80, 0.95, 54, 50),
            ("Roasted sweet potato", "sweet-potato", "🍠", 120, 0.93, 80, 58),
            ("Cherry tomatoes", "tomato", "🍅", 90, 0.99, 36, 42),
            ("Red cabbage", "red-cabbage", "🥬", 50, 0.96, 83, 34),
            ("Yellow bell pepper", "bell-pepper", "🫑", 60, 0.92, 20, 20),
            ("Tahini dressing", "tahini", "🥄", 20, 0.81, 63, 37),
            ("Lettuce & microgreens", "lettuce", "🌱", 70, 0.9, 68, 16),
        ]
        return MealRecognition(
            contains_food=True,
            meal_name="Rainbow Buddha bowl",
            foods=[
                DetectedFood(name=n, database_id=i, emoji=e, grams=g, confidence=c, x=x, y=y, estimate_per_100g=_est(100, 3, 15, 3))
                for n, i, e, g, c, x, y in foods
            ],
        )


def make_recognizer(settings: Settings) -> Recognizer:
    if settings.vision_provider == "mock":
        return MockRecognizer()
    return ClaudeRecognizer(settings)
