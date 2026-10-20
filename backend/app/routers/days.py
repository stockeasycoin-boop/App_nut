from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..deps import current_user
from ..models import Meal, User, WaterLog
from ..nutrition import MICRO_KEYS, total
from ..schemas import DayOut, InsightDay, InsightsOut, WaterIn
from ..serialize import meal_out

router = APIRouter(prefix="/v1", tags=["days"])


def _meals(db: Session, user_id: int, start: date, end: date) -> list[Meal]:
    stmt = (
        select(Meal)
        .where(Meal.user_id == user_id, Meal.local_date >= start, Meal.local_date <= end)
        .options(selectinload(Meal.items))
        .order_by(Meal.eaten_at)
    )
    return list(db.scalars(stmt))


def _meal_totals(meal: Meal) -> dict[str, float]:
    return total(i.nutrients for i in meal.items)


@router.get("/days/{day}", response_model=DayOut, response_model_by_alias=True)
def get_day(day: date, user: User = Depends(current_user), db: Session = Depends(get_db)):
    meals = _meals(db, user.id, day, day)
    water = db.scalar(select(WaterLog).where(WaterLog.user_id == user.id, WaterLog.local_date == day))
    return DayOut(
        date=day,
        meals=[meal_out(m) for m in meals],
        totals=total(_meal_totals(m) for m in meals),
        goals=user.goals.values,
        water_glasses=water.glasses if water else 0,
    )


@router.put("/days/{day}/water", response_model=WaterIn, response_model_by_alias=True)
def set_water(day: date, body: WaterIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    log = db.scalar(select(WaterLog).where(WaterLog.user_id == user.id, WaterLog.local_date == day))
    if not log:
        log = WaterLog(user_id=user.id, local_date=day)
        db.add(log)
    log.glasses = body.glasses
    db.commit()
    return body


@router.get("/insights", response_model=InsightsOut, response_model_by_alias=True)
def insights(
    end: date = Query(..., description="Last day of the range, in the user's local time"),
    days: int = Query(7, ge=1, le=90),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    start = end - timedelta(days=days - 1)
    goals = user.goals.values
    by_day: dict[date, list[Meal]] = {}
    for m in _meals(db, user.id, start, end):
        by_day.setdefault(m.local_date, []).append(m)

    rows: list[InsightDay] = []
    for offset in range(days):
        d = start + timedelta(days=offset)
        meals = by_day.get(d, [])
        t = total(_meal_totals(m) for m in meals)
        coverage = sum(min(1.0, t.get(k, 0) / goals[k]) for k in MICRO_KEYS) / len(MICRO_KEYS)
        rows.append(InsightDay(date=d, totals=t, micro_coverage=round(coverage, 3), meal_count=len(meals)))

    logged = [r for r in rows if r.meal_count]
    averages = {k: round(v / len(logged), 2) for k, v in total(r.totals for r in logged).items()} if logged else {}
    energy = {
        "protein": averages.get("protein", 0) * 4,
        "carbs": averages.get("carbs", 0) * 4,
        "fat": averages.get("fat", 0) * 9,
    }
    energy_sum = sum(energy.values()) or 1
    tracked = ("calories", "protein", "carbs", "fat", "fiber", *MICRO_KEYS)
    return InsightsOut(
        days=rows,
        averages=averages,
        macro_split={k: round(v / energy_sum, 3) for k, v in energy.items()},
        percent_of_goal={k: [round(100 * r.totals.get(k, 0) / goals[k]) for r in rows] for k in tracked if goals.get(k)},
    )
