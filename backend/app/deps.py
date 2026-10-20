from fastapi import Depends, Request
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .db import get_db
from .models import Goals, Profile, User
from .nutrition import default_goals
from .vision import Recognizer, make_recognizer

DEMO_USER_ID = 1


def ensure_demo_user(db: Session) -> User:
    user = db.get(User, DEMO_USER_ID)
    if user:
        return user
    user = User(id=DEMO_USER_ID, name="Abhi")
    profile = Profile(user=user, target_kg=68, diets=["Eggetarian"])
    db.add_all([user, profile])
    db.flush()
    user.goals = Goals(values=goals_for(profile), custom=[])
    db.commit()
    return user


def goals_for(p: Profile) -> dict[str, float]:
    return default_goals(p.sex, p.age, p.height_cm, p.weight_kg, p.activity, p.aim, p.macro_preset)


def current_user(db: Session = Depends(get_db)) -> User:
    # TODO(auth): replace with real authentication (OAuth / passkeys) before multi-user use.
    # Until then every request acts as the single demo user.
    return ensure_demo_user(db)


def get_recognizer(request: Request) -> Recognizer:
    return request.app.state.recognizer


def build_recognizer(settings: Settings | None = None) -> Recognizer:
    return make_recognizer(settings or get_settings())
