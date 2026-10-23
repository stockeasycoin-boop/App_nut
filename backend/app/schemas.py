from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

MealType = Literal["breakfast", "lunch", "snack", "dinner"]
Nutrients = dict[str, float]


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class Pin(Schema):
    x: float
    y: float


class AnalysisItem(Schema):
    id: str
    name: str
    emoji: str
    grams: float
    confidence: float
    pin: Pin
    food_id: str | None
    source: Literal["database", "estimate"]
    nutrients: Nutrients


class AnalysisOut(Schema):
    id: str
    name: str
    photo_url: str
    confidence: float
    score: int
    model: str
    items: list[AnalysisItem]
    totals: Nutrients


class FromAnalysis(Schema):
    analysis_item_id: str
    portion: float = Field(1.0, gt=0, le=5)


class FromFood(Schema):
    food_id: str
    grams: float = Field(gt=0, le=3000)


class MealCreate(Schema):
    type: MealType
    local_date: date
    eaten_at: datetime
    name: str | None = Field(None, max_length=120)
    analysis_id: str | None = None
    items: list[FromAnalysis | FromFood] = Field(min_length=1, max_length=40)


class MealItemOut(Schema):
    id: int
    name: str
    emoji: str
    grams: float
    food_id: str | None
    source: str
    nutrients: Nutrients


class MealOut(Schema):
    id: int
    type: MealType
    name: str
    local_date: date
    eaten_at: datetime
    photo_url: str | None
    score: int
    items: list[MealItemOut]
    totals: Nutrients


class GoalsOut(Schema):
    values: Nutrients
    custom: list[str]


class GoalsUpdate(Schema):
    values: Nutrients


class ProfileIn(Schema):
    name: str | None = Field(None, min_length=1, max_length=80)
    sex: Literal["male", "female"]
    age: int = Field(ge=19, le=110)
    height_cm: float = Field(ge=100, le=250)
    weight_kg: float = Field(ge=30, le=300)
    target_kg: float | None = Field(None, ge=30, le=300)
    activity: Literal["sedentary", "light", "moderate", "active", "athlete"]
    aim: Literal["lose", "maintain", "gain"]
    macro_preset: Literal["balanced", "protein", "lowcarb", "keto"]
    diets: list[str] = Field(default_factory=list, max_length=20)


class ProfileOut(ProfileIn):
    name: str  # type: ignore[assignment]
    maintenance_kcal: int


class DayOut(Schema):
    date: date
    meals: list[MealOut]
    totals: Nutrients
    goals: Nutrients
    water_glasses: int


class WaterIn(Schema):
    glasses: int = Field(ge=0, le=40)


class InsightDay(Schema):
    date: date
    totals: Nutrients
    micro_coverage: float
    meal_count: int


class InsightsOut(Schema):
    days: list[InsightDay]
    averages: Nutrients
    macro_split: dict[str, float]
    percent_of_goal: dict[str, list[float]]


class FoodOut(Schema):
    id: str
    name: str
    emoji: str
    serving_g: float
    per100g: Nutrients = Field(alias="per100g")  # the camel-case generator would emit "per100G"
