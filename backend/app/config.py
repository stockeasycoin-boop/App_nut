from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables or a `.env` file."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="NUTRILENS_", extra="ignore")

    database_url: str = "sqlite:///./nutrilens.db"
    media_dir: Path = Path("./media")
    media_url: str = "/media"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # "claude" calls the Claude API (needs ANTHROPIC_API_KEY or an `ant auth login` profile);
    # "mock" returns a fixed demo analysis — for local development and tests.
    vision_provider: str = "claude"
    vision_model: str = "claude-opus-5-5"
    vision_effort: str = "medium"
    max_upload_mb: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()
