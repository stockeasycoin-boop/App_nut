from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import current_user, goals_for
from ..models import User
from ..nutrition import NUTRIENT_KEYS, calorie_target
from ..schemas import GoalsOut, GoalsUpdate, ProfileIn, ProfileOut

router = APIRouter(prefix="/v1", tags=["profile & goals"])


def _profile_out(user: User) -> ProfileOut:
    p = user.profile
    return ProfileOut(
        name=user.name,
        sex=p.sex,
        age=p.age,
        height_cm=p.height_cm,
        weight_kg=p.weight_kg,
        target_kg=p.target_kg,
        activity=p.activity,
        aim=p.aim,
        macro_preset=p.macro_preset,
        diets=p.diets,
        maintenance_kcal=calorie_target(p.sex, p.age, p.height_cm, p.weight_kg, p.activity, "maintain"),
    )


@router.get("/profile", response_model=ProfileOut, response_model_by_alias=True)
def get_profile(user: User = Depends(current_user)):
    return _profile_out(user)


@router.put("/profile", response_model=ProfileOut, response_model_by_alias=True)
def update_profile(body: ProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for field, value in body.model_dump().items():
        setattr(user.profile, field, value)
    # Recompute every goal the user hasn't set by hand.
    fresh = goals_for(user.profile)
    user.goals.values = {**fresh, **{k: user.goals.values[k] for k in user.goals.custom if k in user.goals.values}}
    db.commit()
    return _profile_out(user)


@router.get("/goals", response_model=GoalsOut, response_model_by_alias=True)
def get_goals(user: User = Depends(current_user)):
    return GoalsOut(values=user.goals.values, custom=user.goals.custom)


@router.patch("/goals", response_model=GoalsOut, response_model_by_alias=True)
def update_goals(body: GoalsUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    unknown = set(body.values) - set(NUTRIENT_KEYS)
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown nutrients: {sorted(unknown)}")
    if any(v <= 0 for v in body.values.values()):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Goals must be positive.")
    user.goals.values = {**user.goals.values, **body.values}
    user.goals.custom = sorted(set(user.goals.custom) | set(body.values))
    db.commit()
    return GoalsOut(values=user.goals.values, custom=user.goals.custom)


@router.post("/goals/reset", response_model=GoalsOut, response_model_by_alias=True)
def reset_goals(user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.goals.values = goals_for(user.profile)
    user.goals.custom = []
    db.commit()
    return GoalsOut(values=user.goals.values, custom=user.goals.custom)
