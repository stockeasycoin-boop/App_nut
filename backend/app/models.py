from datetime import date, datetime, timezone

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    profile: Mapped["Profile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    goals: Mapped["Goals"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    sex: Mapped[str] = mapped_column(String(10), default="male")
    age: Mapped[int] = mapped_column(Integer, default=28)
    height_cm: Mapped[float] = mapped_column(Float, default=176)
    weight_kg: Mapped[float] = mapped_column(Float, default=72)
    target_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    activity: Mapped[str] = mapped_column(String(20), default="moderate")
    aim: Mapped[str] = mapped_column(String(10), default="lose")
    macro_preset: Mapped[str] = mapped_column(String(20), default="balanced")
    diets: Mapped[list[str]] = mapped_column(JSON, default=list)

    user: Mapped[User] = relationship(back_populates="profile")


class Goals(Base):
    """Daily targets. `values` maps nutrient key → amount; `custom` lists keys the user overrode."""

    __tablename__ = "goals"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    values: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    custom: Mapped[list[str]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="goals")


class Analysis(Base):
    """A photo the vision model has looked at. Meals are logged from an analysis so the
    server, not the client, stays the source of truth for nutrient values."""

    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    photo_path: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    confidence: Mapped[float] = mapped_column(Float)
    items: Mapped[list[dict]] = mapped_column(JSON)
    model: Mapped[str] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(12))
    name: Mapped[str] = mapped_column(String(120))
    local_date: Mapped[date] = mapped_column(Date, index=True)
    eaten_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    photo_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    analysis_id: Mapped[str | None] = mapped_column(ForeignKey("analyses.id"), nullable=True)
    score: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    items: Mapped[list["MealItem"]] = relationship(
        back_populates="meal", cascade="all, delete-orphan", order_by="MealItem.position"
    )


class MealItem(Base):
    __tablename__ = "meal_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    meal_id: Mapped[int] = mapped_column(ForeignKey("meals.id"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(120))
    emoji: Mapped[str] = mapped_column(String(16), default="🍽️")
    food_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    source: Mapped[str] = mapped_column(String(12))  # "database" | "estimate"
    grams: Mapped[float] = mapped_column(Float)
    nutrients: Mapped[dict[str, float]] = mapped_column(JSON)  # absolute amounts for `grams`

    meal: Mapped[Meal] = relationship(back_populates="items")


class WaterLog(Base):
    __tablename__ = "water_logs"
    __table_args__ = (UniqueConstraint("user_id", "local_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    local_date: Mapped[date] = mapped_column(Date)
    glasses: Mapped[int] = mapped_column(Integer, default=0)
