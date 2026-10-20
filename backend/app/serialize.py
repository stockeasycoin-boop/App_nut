from .config import get_settings
from .models import Meal
from .nutrition import total
from .schemas import MealItemOut, MealOut


def photo_url(path: str | None) -> str | None:
    return f"{get_settings().media_url}/{path}" if path else None


def meal_out(meal: Meal) -> MealOut:
    return MealOut(
        id=meal.id,
        type=meal.type,
        name=meal.name,
        local_date=meal.local_date,
        eaten_at=meal.eaten_at,
        photo_url=photo_url(meal.photo_path),
        score=meal.score,
        items=[MealItemOut.model_validate(i) for i in meal.items],
        totals=total(i.nutrients for i in meal.items),
    )
