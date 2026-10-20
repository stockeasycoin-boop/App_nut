from fastapi import APIRouter, Query

from ..foods import search
from ..schemas import FoodOut

router = APIRouter(prefix="/v1/foods", tags=["foods"])


@router.get("", response_model=list[FoodOut], response_model_by_alias=True)
def search_foods(q: str = Query("", max_length=80), limit: int = Query(10, ge=1, le=50)):
    return [FoodOut(id=f.id, name=f.name, emoji=f.emoji, serving_g=f.serving_g, per100g=f.per100g) for f in search(q, limit)]
