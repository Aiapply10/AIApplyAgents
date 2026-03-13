"""Configuration loaded from .env, .env.local, and .env.production."""

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve env files: .env (base), .env.local (dev overrides), .env.production (prod)
_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILES: list[str] = [f for f in [str(_ROOT / ".env")] if Path(f).exists()]
if (local := _ROOT / ".env.local").exists():
    _ENV_FILES.append(str(local))
if os.getenv("ENVIRONMENT", "development") == "production" and (
    prod := _ROOT / ".env.production"
).exists():
    _ENV_FILES.append(str(prod))


class Settings(BaseSettings):
    """Service settings from environment and env files."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    mongodb_uri: str = "mongodb://localhost:27017"


settings = Settings()
