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
    db_name: str = "ai_apply_agents"

    # SuperTokens
    supertokens_connection_uri: str = "http://localhost:3567"
    supertokens_api_key: str = ""

    # Domains
    api_domain: str = "http://localhost:8000"
    website_domain: str = "http://localhost:5173"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Anthropic API key for AI resume extraction
    anthropic_api_key: str = ""

    # Admin bootstrap — set to promote a user to admin on startup
    admin_email: str = ""


settings = Settings()
