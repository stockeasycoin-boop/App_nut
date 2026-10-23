from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .db import Base, SessionLocal, engine
from .deps import build_recognizer, ensure_demo_user
from .routers import days, foods, meals, profile


@asynccontextmanager
async def lifespan(app: FastAPI):
    # TODO(migrations): switch to Alembic before the first production deploy.
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        ensure_demo_user(db)
    if not hasattr(app.state, "recognizer"):
        app.state.recognizer = build_recognizer()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="NutriLens API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for r in (meals.router, days.router, profile.router, foods.router):
        app.include_router(r)

    settings.media_dir.mkdir(parents=True, exist_ok=True)
    app.mount(settings.media_url, StaticFiles(directory=settings.media_dir), name="media")

    @app.get("/health", tags=["meta"])
    def health():
        return {"status": "ok"}

    return app


app = create_app()
