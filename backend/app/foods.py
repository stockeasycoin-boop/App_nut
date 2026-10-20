"""Reference food database (per-100 g nutrient values) with lookup and search."""

import json
from dataclasses import dataclass
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path

from .nutrition import scale

DATA_FILE = Path(__file__).parent / "data" / "foods.json"


@dataclass(frozen=True)
class Food:
    id: str
    name: str
    emoji: str
    serving_g: float
    aliases: tuple[str, ...]
    per100g: dict[str, float]

    def nutrients_for(self, grams: float) -> dict[str, float]:
        return scale(self.per100g, grams / 100)

    @property
    def names(self) -> tuple[str, ...]:
        return (self.name.lower(), *(a.lower() for a in self.aliases))


@lru_cache
def all_foods() -> dict[str, Food]:
    raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))["foods"]
    return {
        f["id"]: Food(f["id"], f["name"], f["emoji"], f["serving_g"], tuple(f["aliases"]), f["per100g"]) for f in raw
    }


def get_food(food_id: str) -> Food | None:
    return all_foods().get(food_id)


def _score(query: str, food: Food) -> float:
    best = 0.0
    for name in food.names:
        if query == name:
            return 1.0
        if query in name or name in query:
            best = max(best, 0.9)
        best = max(best, SequenceMatcher(None, query, name).ratio())
    return best


def search(query: str, limit: int = 10) -> list[Food]:
    q = query.strip().lower()
    if not q:
        return list(all_foods().values())[:limit]
    scored = sorted(((_score(q, f), f) for f in all_foods().values()), key=lambda t: -t[0])
    return [f for s, f in scored if s >= 0.6][:limit]


def match(name: str, threshold: float = 0.82) -> Food | None:
    """Best database entry for a free-text food name, or None if nothing is close enough."""
    q = name.strip().lower()
    best = max(all_foods().values(), key=lambda f: _score(q, f))
    return best if _score(q, best) >= threshold else None
