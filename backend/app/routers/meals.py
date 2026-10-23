import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from ..analysis import InvalidImage, analyse, normalise_image, save_photo
from ..config import get_settings
from ..db import get_db
from ..deps import current_user, get_recognizer
from ..foods import get_food
from ..models import Analysis, Meal, MealItem, User
from ..nutrition import health_score, scale, total
from ..schemas import AnalysisOut, FromAnalysis, MealCreate, MealOut
from ..serialize import meal_out, photo_url
from ..vision import RecognitionError, Recognizer

router = APIRouter(prefix="/v1/meals", tags=["meals"])


@router.post("/analyze", response_model=AnalysisOut, response_model_by_alias=True)
async def analyze_photo(
    photo: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    recognizer: Recognizer = Depends(get_recognizer),
):
    settings = get_settings()
    limit = settings.max_upload_mb * 1024 * 1024
    data = await photo.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Photos must be under {settings.max_upload_mb} MB.")
    try:
        jpeg = await run_in_threadpool(normalise_image, data)
        recognition, items, totals = await run_in_threadpool(analyse, recognizer, jpeg)
    except InvalidImage as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from e
    except RecognitionError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e)) from e

    path = save_photo(settings.media_dir, jpeg)
    confidence = round(sum(i["confidence"] for i in items) / len(items), 2)
    analysis = Analysis(
        id=uuid.uuid4().hex,
        user_id=user.id,
        photo_path=path,
        name=recognition.meal_name[:120],
        confidence=confidence,
        items=items,
        model=recognizer.model_name,
    )
    db.add(analysis)
    db.commit()
    return AnalysisOut(
        id=analysis.id,
        name=analysis.name,
        photo_url=photo_url(path),
        confidence=confidence,
        score=health_score(totals),
        model=analysis.model,
        items=items,
        totals=totals,
    )


@router.post("", response_model=MealOut, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
def create_meal(body: MealCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    analysis = None
    if body.analysis_id:
        analysis = db.get(Analysis, body.analysis_id)
        if not analysis or analysis.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found.")
    by_id = {i["id"]: i for i in analysis.items} if analysis else {}

    items: list[MealItem] = []
    for pos, entry in enumerate(body.items):
        if isinstance(entry, FromAnalysis):
            src = by_id.get(entry.analysis_item_id)
            if not src:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown analysis item {entry.analysis_item_id!r}.")
            items.append(
                MealItem(
                    position=pos,
                    name=src["name"],
                    emoji=src["emoji"],
                    food_id=src["foodId"],
                    source=src["source"],
                    grams=round(src["grams"] * entry.portion, 1),
                    nutrients=scale(src["nutrients"], entry.portion),
                )
            )
        else:
            food = get_food(entry.food_id)
            if not food:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown food {entry.food_id!r}.")
            items.append(
                MealItem(
                    position=pos,
                    name=food.name,
                    emoji=food.emoji,
                    food_id=food.id,
                    source="database",
                    grams=entry.grams,
                    nutrients=food.nutrients_for(entry.grams),
                )
            )

    name = body.name or (analysis.name if analysis else items[0].name)
    meal = Meal(
        user_id=user.id,
        type=body.type,
        name=name,
        local_date=body.local_date,
        eaten_at=body.eaten_at,
        photo_path=analysis.photo_path if analysis else None,
        analysis_id=analysis.id if analysis else None,
        score=health_score(total(i.nutrients for i in items)),
        items=items,
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal_out(meal)


@router.get("/{meal_id}", response_model=MealOut, response_model_by_alias=True)
def get_meal(meal_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    meal = db.get(Meal, meal_id)
    if not meal or meal.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meal not found.")
    return meal_out(meal)


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(meal_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    meal = db.get(Meal, meal_id)
    if not meal or meal.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meal not found.")
    db.delete(meal)
    db.commit()
